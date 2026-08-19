# Plan 001 — pi-speedometer extension implementation

**Status:** done
**Goal:** A pi extension that measures tokens/sec (TPS) and time-to-first-token (TTFT) of LLM streaming responses, shows them in the status bar, and is configurable via a `/speed` command.

## Design

### Measurement

| Metric | Formula | Anchors |
|---|---|---|
| TTFT | `firstDeltaTime - requestStartTime` | `before_provider_request` → first `text_delta`/`thinking_delta`/`toolcall_delta` in `message_update` |
| TPS (live) | `tokenCount / (now - firstDeltaTime)` | tokenCount = `partial.usage.output` if > 0, else `ceil(totalContentChars / 4)` estimate |
| TPS (final) | `message.usage.output / (messageEndTime - firstDeltaTime)` | `message_end` (assistant) |

Notes:
- OpenAI-compatible providers only send usage in the final chunk → mid-stream estimate is expected and fine; snap to exact numbers at `message_end`.
- Re-anchor all per-call state on every `before_provider_request` (agent tool loops make multiple LLM calls).
- `firstDeltaTime` may never be set (empty response / error) — guard against NaN/division by zero everywhere.

### Status bar display

- Key: `"speedometer"`. Compact format, e.g. `⚡ 42.1 t/s ⏱ 0.42s` (⚡ = speed, ⏱ = TTFT latency).
- While streaming: live values, throttled to one `setStatus` per ~250 ms.
- After stream end: final values remain displayed (dimmed if the theme API makes that easy — optional).
- Respect toggles: if only one metric is enabled, show only that one; if both off, clear the status (`setStatus("speedometer", undefined)`).

### `/speed` command

- `/speed` (no args) → `ctx.ui.notify` with current settings (e.g. `TPS: on, TTFT: on`).
- `/speed tps on|off`, `/speed ttft on|off` → update + persist + notify confirmation + refresh status bar immediately.
- Unknown args → notify usage hint: `Usage: /speed [tps|ttft] [on|off]`.

### Settings persistence

- Global JSON file: `~/.pi/agent/pi-speedometer.json`, shape `{ showTps: boolean, showTtft: boolean }`, defaults both `true`.
- Load lazily on session start / first use; tolerate missing or corrupt file (fall back to defaults). Write with `node:fs` (mkdirSync recursive first).

## Files to create

1. `package.json` — `{ "name": "pi-speedometer", "version": "0.1.0", "type": "module", "pi": { "extensions": ["./src/index.ts"] } }` (+ description/license).
2. `src/index.ts` — the extension, single file. Structure:
   - `interface SpeedSettings { showTps: boolean; showTtft: boolean }` + load/save helpers.
   - Per-call state object: `requestStart`, `firstDeltaTime`, `lastStatusUpdate`, `streaming` flag.
   - `pi.on("before_provider_request", ...)` → reset state, record `requestStart`.
   - `pi.on("message_update", (event, ctx) => ...)` → for content-bearing deltas: set `firstDeltaTime` if unset, compute TTFT/TPS, throttled `renderStatus(ctx)`.
   - `pi.on("message_end", ...)` → final render with exact `usage.output`.
   - `pi.on("agent_end"/"session_shutdown", ...)` → stop timers, leave final values.
   - `pi.registerCommand("speed", ...)` → subcommand parsing as above.
   - A `renderStatus(ctx, tokens, ttftMs)` helper that builds the display string from enabled toggles.
3. `README.md` — what it does, install (`pi install` / symlink into `~/.pi/agent/extensions/`), `/speed` usage, screenshot placeholder.

## Verification

1. `pi -e ./src/index.ts -p "say hello"` (print mode) — must not error on load.
2. Manual TUI run (`pi -e ./src/index.ts`): status bar shows live `⚡ t/s` and `⏱ ttft` while streaming.
3. `/speed tps off` → only ⏱ shown; persists across restart (check `~/.pi/agent/pi-speedometer.json`).
4. TypeScript sanity: `npx tsc --noEmit` with pi type packages available (optional; jiti strips types anyway).
