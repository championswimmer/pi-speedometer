# AGENTS.md — pi-speedometer

Project context for AI coding agents working in this repo. Keep this file up to date as the project evolves.

## What this project is

`pi-speedometer` is a **pi extension** (for the pi coding agent, `@earendil-works/pi-coding-agent`) that measures and displays live LLM streaming performance:

- **TPS** — tokens per second of the assistant response stream
- **TTFT** — time to first token (request sent → first content delta)

The metrics are shown in the pi status bar, and a `/speed` command configures what is displayed.

## Housekeeping rules (follow these)

1. **Keep this AGENTS.md current.** When you learn something durable about the codebase, pi APIs, or project decisions, record it here.
2. **Plans live in `.agents/plans/`.** Before any non-trivial task, write a numbered plan file (e.g. `.agents/plans/001-speedometer-extension.md`) describing scope, design decisions, and verification steps. Update the plan's status when done.
3. **Delegate subtasks to subagents.** Use the `Agent` tool for self-contained implementation/research subtasks instead of doing everything in the main loop. Verify subagent output before accepting it.

## Repo layout

```
pi-speedometer/
├── AGENTS.md                  ← this file
├── package.json               ← pi package manifest ("pi": { "extensions": ["./src/index.ts"] })
├── README.md                  ← user-facing docs
├── src/
│   └── index.ts               ← the extension (single file, TypeScript, no build step)
└── .agents/
    └── plans/                 ← task plans (see housekeeping rules)
```

## Key technical facts (researched, don't re-derive)

### How pi extensions work

- Extensions are TypeScript files executed via jiti — **no build step**. Type-only imports are erased.
- Entry point: `export default function (pi: ExtensionAPI) { ... }`.
- Available imports without installing deps: `@earendil-works/pi-coding-agent` (ExtensionAPI types), `@earendil-works/pi-ai` (model types), `@earendil-works/pi-tui`, `typebox`. Import **types only** — runtime imports of pi internals are fragile.
- Status bar: `ctx.ui.setStatus(key: string, text: string | undefined)`. Pass `undefined` to clear. Works in TUI + RPC modes, no-op elsewhere.
- Commands: `pi.registerCommand("speed", { description, handler: async (args: string, ctx) => {...} })`. The handler receives raw args string; parse subcommands manually.
- Local testing: `pi -e ./src/index.ts` for quick tests, or symlink/copy into `~/.pi/agent/extensions/` (global, hot-reloadable with `/reload`) or `.pi/extensions/` (project-local, requires project trust).
- Package distribution: `package.json` with `"pi": { "extensions": ["./src/index.ts"] }`, installable via `pi install <pkg>`.

### Where the measurements come from

Relevant pi-ai reference: `~/.nvm/versions/node/v22.21.1/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/types.d.ts` (AssistantMessage, Usage, AssistantMessageEvent types).

- **Request anchor (TTFT start):** `pi.on("before_provider_request", ...)` — fires right before the HTTP request is sent, once per LLM call.
- **Stream events:** `pi.on("message_update", (event) => ...)` — `event.assistantMessageEvent` is the pi-ai stream event. Content-bearing deltas have types `text_delta`, `thinking_delta`, `toolcall_delta`. Every event carries `partial: AssistantMessage` whose `partial.usage.output` is the **cumulative output token count**.
- **Stream end:** `pi.on("message_end", ...)` (assistant message) — final `message.usage.output` for exact totals.

### Provider differences in streamed usage (important!)

- **Anthropic:** `partial.usage.output` grows cumulatively during streaming (from `message_delta` events). Live TPS is exact.
- **OpenAI (chat completions):** usage usually arrives only in the **final** chunk (`stream_options.include_usage`). Mid-stream `usage.output` stays 0 → use a character-based estimate (chars / 4) for the live readout, snap to real value at `message_end`.
- **Google:** `usageMetadata` is often sent per chunk (cumulative).

### Timing model

```
before_provider_request ──► first *_delta ──► ...deltas... ──► message_end
        │                        │                                  │
        └──────── TTFT ──────────┘                                  │
                              └────── generation duration ──────────┘
                                      TPS = output tokens / duration
```

- Multiple LLM calls happen per agent run (tool loop) → re-anchor state on each `before_provider_request`.
- Throttle `setStatus` calls during streaming (~4/sec) — deltas arrive fast.
- Aborted/error streams: keep whatever partial metrics exist; don't crash on missing data.

## Publishing / release notes

- The unscoped npm package name **`pi-speedometer` is already taken** by another package.
- Chosen npm package name: **`@championswimmer/pi-speedometer`**
- `package.json` should keep `publishConfig.access = "public"` so the scoped package publishes publicly.
- Current GitHub repo: `https://github.com/championswimmer/pi-speedometer`
- `npm pack --dry-run` should include only:
  - `README.md`
  - `package.json`
  - `src/index.ts`

## Settings

- Stored globally at `~/.pi/agent/pi-speedometer.json` (created on first write), shape: `{ "showTps": boolean, "showTtft": boolean }` (both default `true`).
- `/speed` command: no args → show current settings; `tps on|off` / `ttft on|off` → toggle + persist.

## Status

- [x] Research pi extension API + measurement anchors
- [x] Plan written (`.agents/plans/001-speedometer-extension.md`)
- [x] Extension implemented (`src/index.ts`, `package.json`, `README.md`)
- [x] Smoke-tested with `pi -e ./src/index.ts -p "..."` (loads clean, LLM call succeeded)
- [x] End-to-end verified via RPC mode (`pi --mode rpc -e ./src/index.ts`): live `setStatus` stream (⚡ t/s + ⏱ ttft), `/speed tps off` toggle + re-render, `/speed` status notify, settings persisted to `~/.pi/agent/pi-speedometer.json`
- [x] Git repo initialized, `.gitignore` + `.npmignore` added, GitHub repo created and pushed: `championswimmer/pi-speedometer`
- [x] npm package contents verified with `npm pack --dry-run` (only runtime files included)
- [x] Package renamed to scoped npm name: `@championswimmer/pi-speedometer`
- [x] Git tag `v0.1.0` created and pushed to GitHub
- [ ] Publish to npm (attempted; blocked by npm registry auth/scope access — `npm publish` returned 404 for `@championswimmer/pi-speedometer` and `npm whoami` was unauthorized)
