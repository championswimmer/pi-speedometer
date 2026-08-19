# Plan 002 — add TPS/TTFT text-vs-icon toggle

**Status:** done
**Goal:** Add per-metric display styles to the speedometer so each metric can render as either an icon label or a text label, while keeping the existing on/off toggles and persisted settings.

## Design

### Settings model

Extend the persisted settings file with two style fields:

- `tpsStyle: "icon" | "text"`
- `ttftStyle: "icon" | "text"`

Defaults remain backward-compatible:

```json
{
  "showTps": true,
  "showTtft": true,
  "tpsStyle": "icon",
  "ttftStyle": "icon"
}
```

These values are loaded lazily from `~/.pi/agent/pi-speedometer.json` and default safely when missing or corrupt.

### Display semantics

- `icon` style: `⚡ 42.1 t/s` and `⏱ 412ms`
- `text` style: `TPS 42.1 t/s` and `TTFT 412ms`

This makes the existing status bar output still compact while allowing a fully text-based view for users who prefer it.

### Slash command behavior

Keep the existing `/speed` command and expand it to support styles:

- `/speed` → show current settings summary
- `/speed tps on|off` → enable/disable TPS
- `/speed ttft on|off` → enable/disable TTFT
- `/speed tps icon|text` → set TPS display mode
- `/speed ttft icon|text` → set TTFT display mode

The command persists immediately and re-renders the current status bar if data is already available.

### Implementation notes

- Centralize label formatting in a helper that builds a metric line from the active style.
- Preserve existing `showTps` / `showTtft` logic and just swap the text prefix when rendering.
- Keep command parsing explicit and tolerant of unknown entries so we continue to show a helpful usage hint instead of throwing.

## Verification

1. `pi -e ./src/index.ts` should still load without errors.
2. `/speed tps text` and `/speed ttft text` should update the persisted settings file and re-render the current status label.
3. `/speed` should print both on/off and icon/text settings in a compact summary.
4. Existing icon-mode output remains unchanged when styles are left at the defaults.
