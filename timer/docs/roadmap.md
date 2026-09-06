# Roadmap

Known issues and candidate work items, to be tackled one at a time.
Priorities: **P1** = bug or core-use-case gap, **P2** = structure/a11y,
**P3** = polish.

## Known issues

### P3 — Draft interval rows use index keys

`x-for :key="i"` on the draft interval list: splicing a row shifts bindings
and focus. Use a stable per-row id.

### P3 — Modal focus management

The delete confirmation uses the native `window.confirm`, which clashes
with the rest of the UI.

### P3 — Housekeeping

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
5. **Explicitly out of scope** — accounts, server sync, session history.
   The app stays a single static page.

## Suggested order

1. PWA (installable, offline; a notification also hardens the
   locked-screen case the heartbeat can't reach)
2. A11y + polish batch (remaining P2/P3 items)

## Done

- **2026-09-06** — Corrupt-preset self-heal. A mangled `timer-presets`
  payload (invalid JSON, or parsed to a non-array) now reseeds the default
  7 min preset instead of leaving `savedPresets = []`, so one bad payload
  can no longer permanently wipe the list. Deliberately empty arrays are
  preserved — deleting every preset stays possible. Verified in-browser.
- **2026-09-05** — TypeScript. Renamed `src/*.js` → `.ts`, strict
  `tsconfig.json` (`noEmit` + `moduleResolution: bundler`), new
  `src/types.ts` with the shared `Interval`/`Preset`/`Session` shapes, and a
  `npm run type-check` script (runs `tsc --noEmit`). The Alpine component is
  now `function timerApp(): TimerApp` (`AlpineComponent<T>`), engine and
  heartbeat got real signatures, and the localStorage preset payload is
  validated with type guards instead of `any`. Behavior-identical: 40 tests
  pass, build emits the worker chunk, and the dev server smoke-tested
  start/pause/accumulate/reset/editor end-to-end.
- **2026-09-05** — Pause/resume fidelity. `advance()` now bails out unless
  the status is `RUNNING`, so a worker beat posted just before
  `heartbeat.stop()`'s terminate cannot land on a paused timer, compute a
  huge elapsed from the stale `startTimestamp`, and fire a spurious
  "Time is up!". Also fixed pause/resume accumulation: `pause()` was
  overwriting `baseElapsed` with only the time since the last resume,
  dropping all previously elapsed time on the second pause (sessions ran
  long). It now adds to the running total. Both verified in-browser.
- **2026-09-05** — UI rethink. Dropped the two competing progress rings for
  a single focused run screen: one big interval countdown, a plan strip
  (the interval pattern rendered as colored segments — current one drains
  as it counts down), and a thin session progress bar with time left.
  Controls are now a rectangular text Start/Pause plus a Reset ghost button
  (the ±1m steppers are gone — adjust duration in the editor). Preset
  picking moved to the run screen as cards with a mini pattern preview;
  the settings modal/split became a flat two-section editor (draft form +
  pattern preview + saved preset list, each row showing its mini strip).
  Removed glassmorphism, glow blobs, round control buttons and the ring
  math; replaced with a flat minimal theme using `light-dark()`.
  Fixed along the way: the P3 "adjust while paused" bug is moot (steppers
  removed), and the dropdown preset picker was deleted.
- **2026-09-05** — Look rework, same palette: one shape grammar (circles
  for icon-only controls, rounded rects from a two-step radius scale for
  anything with text — `--radius-sm` 12px / `--radius-lg` 20px). The play
  button is a true circle echoing the rings; ±1m and reset are icon
  circles in the controls row (reset disabled while IDLE); preset chips
  are rounded rects that only apply — managing happens in settings. The
  settings modal became a dedicated view (topbar swaps between timer and
  settings, with a live remaining-time indicator while a session is
  active); overlay, focus-trap and Escape handling deleted along with it.
  Also fixed: idle rings no longer render in warning amber, footer
  dropped as redundant, gear entry point disabled while running, spacing
  normalized to a 4px rhythm, and the ringCircumference/x-init/dead-CSS
  housekeeping items.
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
