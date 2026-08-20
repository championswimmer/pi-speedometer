# @championswimmer/pi-speedometer

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that shows live LLM streaming performance in the status bar:

```
⚡ 42.1 t/s ⏱ 412ms
```

- **⚡ TPS** — output tokens per second (first content delta → now / stream end)
- **⏱ TTFT** — time to first token (provider request → first content delta)

Values update live while streaming (throttled to ~4/sec) and the final exact numbers remain displayed after the response finishes.

## Check out my other Pi extensions

- [![pi-auto-theme](https://img.shields.io/badge/🎨_pi--auto--theme-blue?style=flat-square)](https://github.com/championswimmer/pi-auto-theme) — Automatically syncs Pi's theme with your OS dark/light mode appearance in real-time.
- [![pi-cache-graph](https://img.shields.io/badge/📊_pi--cache--graph-orange?style=flat-square)](https://github.com/championswimmer/pi-cache-graph) — Visualizes LLM prompt cache hit rates and token statistics across turns in your TUI.
- [![pi-context-prune](https://img.shields.io/badge/✂️_pi--context--prune-green?style=flat-square)](https://github.com/championswimmer/pi-context-prune) — Automatically prunes verbose tool outputs from future LLM context while preserving full history.
- [![pi-context-usage](https://img.shields.io/badge/🪟_pi--context--usage-purple?style=flat-square)](https://github.com/championswimmer/pi-context-usage) — Visualizes context window token distribution (system prompt, tools, messages, buffer) in a dot-grid summary.
- [![pi-speedometer](https://img.shields.io/badge/⚡_pi--speedometer-yellow?style=flat-square)](https://github.com/championswimmer/pi-speedometer) — Displays live LLM generation speed (tokens/sec) and time-to-first-token (TTFT) in the status bar.
- [![pi-subscription-meter](https://img.shields.io/badge/💳_pi--subscription--meter-red?style=flat-square)](https://github.com/championswimmer/pi-subscription-meter) — Surfaces subscription tiers, rate limits, and quota consumption across AI providers in a tabbed dialog.

## Install

**Development (symlink into pi's global extensions dir):**

```sh
mkdir -p ~/.pi/agent/extensions
ln -s "$(pwd)/src/index.ts" ~/.pi/agent/extensions/pi-speedometer.ts
```

Hot-reload inside pi with `/reload`.

**Quick one-off test:**

```sh
pi -e ./src/index.ts
```

**As a package (published on npm under the scoped name):**

```sh
pi install npm:@championswimmer/pi-speedometer
```

## Usage

The `/speed` command controls what is shown and how it is labeled:

| Command | Effect |
|---|---|
| `/speed` | Show current settings summary |
| `/speed tps on\|off` | Toggle the tokens/sec readout |
| `/speed ttft on\|off` | Toggle the time-to-first-token readout |
| `/speed tps icon\|text` | Switch the TPS label between `⚡` and `TPS` |
| `/speed ttft icon\|text` | Switch the TTFT label between `⏱` and `TTFT` |

Settings persist globally at `~/.pi/agent/pi-speedometer.json`, with the shape:

```json
{
  "showTps": true,
  "showTtft": true,
  "tpsStyle": "icon",
  "ttftStyle": "icon"
}
```

With both metrics off, the status entry is cleared.

> Note: the npm package uses the scoped name `@championswimmer/pi-speedometer` because the unscoped `pi-speedometer` name is already taken on npm.

## Notes

- **Provider usage streaming differs.** Anthropic streams cumulative output-token counts mid-stream, so live TPS is exact. OpenAI chat-completions only send usage in the final chunk, so mid-stream TPS uses a `chars / 4` estimate and snaps to the exact value when the stream ends. Google usually reports per-chunk.
- Multiple LLM calls per agent run (tool loops) re-anchor the timing on each request, so the display always reflects the current call.
- No runtime dependencies — only Node builtins and type-only imports from pi packages.
