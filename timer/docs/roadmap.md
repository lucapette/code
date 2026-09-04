# Roadmap

Known issues and candidate work items, to be tackled one at a time.
Priorities: **P1** = bug or core-use-case gap, **P2** = structure/a11y,
**P3** = polish.

## Known issues

### P2 — Screen-reader noise from per-second `aria-live`

Both countdown elements use `role="timer" aria-live="polite"` and re-render
every second. The speech announcements already cover non-visual users; the
visual ticking should stay silent (drop `aria-live`, keep `role="timer"`).

### P3 — Touch targets below 44px

The per-chip edit/delete buttons are 26×26px (`chip-edit`, `chip-del`) —
hard to hit on a phone for a phone-first app.

### P3 — `adjust()` while paused leaves the total display stale

Adjusting ±1m while PAUSED updates `session.totalSeconds` but not
`sessionRemaining`, so the total ring and countdown only correct themselves
on resume.

### P3 — Idle state paints a fresh 60s interval in warning amber

`ringColor` maps `≤ 60s` to `--warning`, so an untouched 60s interval shows
the "almost up" color before anything has started. Skip warning/danger
coloring while `IDLE`.

### P3 — Corrupt localStorage silently drops all presets

The `JSON.parse` failure path sets `savedPresets = []` and never reseeds,
so a single corrupted payload permanently empties the preset list. Reseed
the default on empty/corrupt.

### P3 — Draft interval rows use index keys

`x-for :key="i"` on the draft interval list: splicing a row shifts bindings
and focus. Use a stable per-row id.

### P3 — Modal focus management

The settings dialog handles Escape and click-outside but never moves focus
into the dialog on open, traps focus, or restores it on close. Also the
delete confirmation uses the native `window.confirm`, which clashes with
the rest of the UI.

### P3 — Housekeeping

- `ringCircumference` duplicates the `138` radius literal instead of
  deriving from `ringRadius`
- `x-init="init()"` is redundant (Alpine auto-invokes `init()`)
- Dead style: `.ring-content { transform: rotate(0deg) }`
- Root README does not list the project yet

## Ideas

1. **PWA** — manifest, service worker, and a completion notification.
   Makes the app installable, fully offline, and lets "Time is up!" land on
   time even when the tab is hidden (pairs with the heartbeat fallback).
2. **Announcement preferences** — toggles for voice / beeps / vibration,
   and distinct tones per interval so Work vs Rest is audible without
   looking.
3. **Preset import/export** — copy/paste a preset as JSON to share HIIT
   routines between devices.
4. **TypeScript** — the Vite + ES-module structure is in place; rename
   `src/*.js` → `.ts` and tighten types.
5. **Explicitly out of scope** — accounts, server sync, session history.
   The app stays a single static page.

## Suggested order

1. PWA (installable, offline; a notification also hardens the
   locked-screen case the heartbeat can't reach)
2. A11y + polish batch (remaining P2/P3 items)

## Done

- **2026-09-04** — Hidden-tab reliability: a dedicated Web Worker
  heartbeat (worker timers escape tab throttling) now drives state
  re-syncs while `requestAnimationFrame` is suspended, with a
  `setInterval` fallback where Workers are unavailable. Beats only say
  "time has passed" — all state stays derived from the wall clock. The
  tick loop split into `advance()` (recompute) and `tick()` (advance +
  schedule rAF). Verified by completing a session with rAF disabled.
- **2026-09-04** — Extracted the timer math into `src/engine.js`, a pure
  ES module (tiling, interval state, progress counting, minute marks,
  ring/format helpers), with 33 Vitest cases in `tests/engine.test.js`.
  Introduced Vite along the way: `npm run dev|build|test`, Alpine.js from
  npm (vendored copy deleted), sources under `src/` — the codebase is now
  one rename away from TypeScript. `file://` double-click is replaced by
  `npm run dev` or the self-contained `dist/` build.
- **2026-09-04** — Removed all duration caps: sessions and intervals are
  unlimited (the old save path silently capped the total at 60 minutes
  while the UI allowed 120). Kept the sanity floors — 1 min session,
  5 s per interval — and added H:MM:SS formatting past one hour.
