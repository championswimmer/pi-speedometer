/**
 * pi-speedometer — live LLM streaming speed in pi's status bar.
 *
 * Measures:
 *  - TPS  : output tokens / generation duration (first delta -> now / message_end)
 *  - TTFT : time from provider request to first content delta
 *
 * Timing model:
 *   before_provider_request ──► first *_delta ──► ...deltas... ──► message_end
 *           │ requestStart           │ firstDeltaTime                    │ end
 *           └───────── TTFT ─────────┘
 *                                 └───── generation duration ──────┘  TPS = tokens / duration
 *
 * Mid-stream token count uses partial.usage.output when the provider streams
 * cumulative usage (Anthropic, Google); OpenAI only sends usage in the final
 * chunk, so we fall back to a chars/4 estimate until message_end snaps to exact.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AssistantMessage, AssistantMessageEvent } from "@earendil-works/pi-ai";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

type SpeedStyle = "icon" | "text";

interface SpeedSettings {
	showTps: boolean;
	showTtft: boolean;
	tpsStyle: SpeedStyle;
	ttftStyle: SpeedStyle;
}

const DEFAULTS: SpeedSettings = {
	showTps: true,
	showTtft: true,
	tpsStyle: "icon",
	ttftStyle: "icon",
};
const SETTINGS_PATH = join(homedir(), ".pi", "agent", "pi-speedometer.json");

function coerceStyle(raw: unknown, fallback: SpeedStyle): SpeedStyle {
	return raw === "text" || raw === "icon" ? raw : fallback;
}

function loadSettings(): SpeedSettings {
	try {
		const raw = JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
		return {
			showTps: typeof raw.showTps === "boolean" ? raw.showTps : DEFAULTS.showTps,
			showTtft: typeof raw.showTtft === "boolean" ? raw.showTtft : DEFAULTS.showTtft,
			tpsStyle: coerceStyle(raw.tpsStyle, DEFAULTS.tpsStyle),
			ttftStyle: coerceStyle(raw.ttftStyle, DEFAULTS.ttftStyle),
		};
	} catch {
		return { ...DEFAULTS }; // missing or corrupt file -> defaults
	}
}

function saveSettings(s: SpeedSettings): void {
	try {
		mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
		writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2) + "\n");
	} catch {
		// Persistence is best-effort; don't break the session on write failure.
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTENT_DELTAS = new Set(["text_delta", "thinking_delta", "toolcall_delta"]);
const STATUS_KEY = "speedometer";
const THROTTLE_MS = 250;

/** Sum character lengths of all text/thinking/toolcall content (for chars/4 estimate). */
function contentChars(message: AssistantMessage): number {
	let chars = 0;
	for (const block of message.content) {
		if (block.type === "text") chars += block.text.length;
		else if (block.type === "thinking") chars += block.thinking.length;
		else if (block.type === "toolCall") chars += JSON.stringify(block.arguments).length;
	}
	return chars;
}

/** Cumulative output token count: exact if the provider streams usage, else chars/4 estimate. */
function tokenCount(message: AssistantMessage): number {
	if (message.usage && message.usage.output > 0) return message.usage.output;
	return Math.ceil(contentChars(message) / 4);
}

function formatTps(tps: number): string {
	return tps >= 100 ? String(Math.round(tps)) : tps.toFixed(1);
}

function formatMetricLabel(metric: "tps" | "ttft", style: SpeedStyle): string {
	if (style === "icon") return metric === "tps" ? "⚡" : "⏱";
	return metric === "tps" ? "TPS" : "TTFT";
}

/** Compact duration: "412ms" under a second, "1.23s" above. */
function formatDuration(ms: number): string {
	return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	let settings = loadSettings();

	// Per-LLM-call state, re-anchored on every before_provider_request.
	let requestStart = 0;
	let firstDeltaTime: number | null = null;
	let lastStatusUpdate = 0;
	let streaming = false;
	// Last computed metrics, kept so /speed toggles can re-render immediately.
	let lastTokens = 0;
	let lastTtftMs: number | null = null;

	function renderStatus(ctx: any, tokens: number, ttftMs: number | null, endTime: number) {
		const parts: string[] = [];
		if (settings.showTps && firstDeltaTime !== null) {
			const durationSec = (endTime - firstDeltaTime) / 1000;
			if (durationSec > 0 && tokens > 0) {
				const label = formatMetricLabel("tps", settings.tpsStyle);
				parts.push(`${label} ${formatTps(tokens / durationSec)} t/s`);
			}
		}
		if (settings.showTtft && ttftMs !== null) {
			const label = formatMetricLabel("ttft", settings.ttftStyle);
			parts.push(`${label} ${formatDuration(ttftMs)}`);
		}
		ctx.ui.setStatus(STATUS_KEY, parts.length > 0 ? parts.join(" ") : undefined);
	}

	pi.on("before_provider_request", () => {
		requestStart = performance.now();
		firstDeltaTime = null;
		lastStatusUpdate = 0;
		streaming = true;
		lastTokens = 0;
		lastTtftMs = null;
	});

	pi.on("message_update", (event, ctx) => {
		if (!streaming) return;
		const streamEvent = event.assistantMessageEvent as AssistantMessageEvent | undefined;
		if (!streamEvent || !CONTENT_DELTAS.has(streamEvent.type)) return;

		const now = performance.now();
		if (firstDeltaTime === null) {
			firstDeltaTime = now;
			lastTtftMs = requestStart > 0 ? now - requestStart : null;
		}
		lastTokens = tokenCount(streamEvent.partial);

		// Throttle status writes: deltas arrive far faster than the UI needs.
		if (now - lastStatusUpdate >= THROTTLE_MS) {
			lastStatusUpdate = now;
			renderStatus(ctx, lastTokens, lastTtftMs, now);
		}
	});

	pi.on("message_end", (event, ctx) => {
		if (!streaming) return;
		const message = event.message;
		if (!message || message.role !== "assistant") return;
		streaming = false;

		const now = performance.now();
		// Snap to exact final usage when available; otherwise keep the estimate.
		if (message.usage && message.usage.output > 0) lastTokens = message.usage.output;
		// Guard: empty/error streams may never produce a first delta.
		if (firstDeltaTime === null) return;
		renderStatus(ctx, lastTokens, lastTtftMs, now);
	});

	function settle() {
		streaming = false;
		lastStatusUpdate = 0;
		// Final values stay in the status bar; nothing else to clean up.
	}
	pi.on("agent_end", settle);
	pi.on("session_shutdown", settle);

	pi.registerCommand("speed", {
		description: "Configure pi-speedometer display: /speed [tps|ttft] [on|off|icon|text]",
		handler: async (args, ctx) => {
			const [sub, value] = args.trim().toLowerCase().split(/\s+/);

			if (!sub) {
				ctx.ui.notify(
					`pi-speedometer: tps=${settings.showTps ? "on" : "off"}(${settings.tpsStyle}) ttft=${settings.showTtft ? "on" : "off"}(${settings.ttftStyle})`,
					"info",
				);
				return;
			}

			if (sub === "tps" || sub === "ttft") {
				if (value === "on" || value === "off") {
					const on = value === "on";
					if (sub === "tps") settings.showTps = on;
					else settings.showTtft = on;
					saveSettings(settings);
					ctx.ui.notify(`pi-speedometer: ${sub} ${value}`, "info");
					if (lastTokens > 0 || lastTtftMs !== null) renderStatus(ctx, lastTokens, lastTtftMs, performance.now());
					else ctx.ui.setStatus(STATUS_KEY, undefined);
					return;
				}

				if (value === "icon" || value === "text") {
					if (sub === "tps") settings.tpsStyle = value;
					else settings.ttftStyle = value;
					saveSettings(settings);
					ctx.ui.notify(`pi-speedometer: ${sub} ${value}`, "info");
					if (lastTokens > 0 || lastTtftMs !== null) renderStatus(ctx, lastTokens, lastTtftMs, performance.now());
					else ctx.ui.setStatus(STATUS_KEY, undefined);
					return;
				}
			}

			ctx.ui.notify("Usage: /speed [tps|ttft] [on|off|icon|text]", "warning");
		},
	});
}
