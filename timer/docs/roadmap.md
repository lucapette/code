# Roadmap

Known issues and candidate work items, to be tackled one at a time.
Priorities: **P1** = bug or core-use-case gap, **P2** = structure/a11y,
**P3** = polish.

Direction (decided 2026-09-06): stay a single static page — zero backend.
Ship a curated library of read-only built-ins, model sessions as finite
sequences of work/rest intervals (presets store the fully-expanded run, not
opaque tiles + a total), and make the app shareable by link. Exercise
figures are deferred (roadmap below) until the core model is settled.

## Active

Nothing right now — next up is URL share + host (see Suggested order).

## Ideas (backlog)

1. **P2 — Exercise visuals** — optional `media` per interval (bundled
   figure id or image URL); run screen shows a figure/animation of the
   current move during its interval. Ship bundled silhouettes for the
   13 mobility moves; generic presets just don't set it. Deferred until the
   work/rest model is stable.
2. **P2 — Zero-backend URL share + public host** — compact-encode presets
   into the URL hash (upgrades the JSON copy/paste to a paste-able link),
   and deploy the static build on a free tier (Cloudflare Pages / Netlify /
   Vercel). Fold PWA in here: manifest, service worker, completion
   notification, offline. localStorage stays the per-browser store; a link
   shares a snapshot. No accounts, no server sync, no session history.
3. **Explicitly out of scope** — accounts, server sync, session history,
   server-side persistence. The app stays a single static page.

## Suggested order

1. ~~Library (categories + read-only built-ins)~~ — done 2026-09-06.
2. ~~Work/rest + round builder~~ — done 2026-09-06.
3. URL share + host — needs the settled preset shape to encode.
4. Exercise visuals — last; richest once the model is stable.

## Done

- **2026-09-06** — Model rework: a session is a finite sequence of
  intervals, and a preset is a template storing that fully-expanded run —
  no tiling, no `totalSeconds`, no hidden repetition. `Preset` (template)
  and `Session` (the concrete run, with `presetId` provenance and room for
  future notes/when/where) are now distinct types instead of an alias. The
  engine drops its whole tiling layer (`patternLength`, modulo indexing,
  tile-based progress) for a linear walk over the list; `progressCount`
  and `kindSplit` read the expanded sequence directly. The strip therefore
  shows every interval (Jump rope renders all 20 half-minutes). The editor
  holds expanded rows — the round builder writes each round's rows out, and
  the "total session" field is gone (duration is the sum of rows). Stored
  presets are validated strictly against the current expanded schema —
  legacy loaders were deleted, so anything that isn't that shape is simply
  dropped. Verified in-browser (run, accounting, round builder expansion,
  save/reload); type-check, 46 tests, build green.
- **2026-09-06** — Intervals express intent. `Interval` gained an optional
  `kind` ('work' default / 'rest'); the run screen renders rest dimmed and
  neutral on the plan strip and mini strips, keeps the clock calm while a
  rest interval runs, and skips minute-mark chatter during rest. The session
  meta shows the whole-session work/rest split, and `intervalProgress`
  counts work intervals only, not rest gaps. The editor gained a per-row
  Work/Rest toggle and quick-add rest (after a row or at the end). Built-in
  Jump rope / Pomodoro / Focus breaks are tagged rest (White rice left
  plain). `engine` got `isRest`, `kindOf` and `kindSplit`, and
  `progressCount` is rest-aware. Verified in-browser; type-check, tests,
  build green.
- **2026-09-06** — Design pass: split the two views into three. The timer
  no longer lives on the home screen — a compact **Library** launcher
  (single-row presets grouped by category, filter chips) is the landing
  view with no timers on it. Picking a preset goes to a dedicated
  **Timer** screen that stages the plan then runs; finishing or resetting
  returns to the Library. The running session got a proper header: a small
  category eyebrow above a larger, centered preset name with tuned spacing
  (title was small, left-aligned and crowding the clock).
- **2026-09-06** — Preset library with categories. `Preset` gained a
  `category`; the run screen groups picks under high-level, user-extensible
  categories (Workouts / Productivity / Cooking / …) with filter chips, the
  editor has a category field with suggestions, and a bundled library of
  read-only built-ins (Mobility, Jump rope, Pomodoro classic, Focus, White
  rice) now ships in code. `savedPresets` holds only user presets (built-ins
  survive deletes and re-seed on a wiped/corrupt store); editing a built-in
  forks it into an editable user copy. Legacy stores drop duplicate
  built-in ids at load. Verified in-browser (grouping, filter, fork-on-edit,
  delete user-only, timer smoke); type-check, 40 tests, build stay green.
- **2026-09-06** — Polish batch. Draft rows now carry stable per-row ids
  (`DraftInterval`) so splicing never rebinds x-for keys; `window.confirm`
  is gone — deleting a preset asks inline with keyboard-friendly, focused
  confirm/cancel. Announcement preferences (voice / tones / buzz) are
  toggleable in the editor and persist per-browser; a named interval is
  spoken, and one with no label plays a single fixed tone. Preset
  import/export lets the whole list be copied as pretty JSON with a
  same-view paste import that validates shapes (garbage is rejected) and
  re-ids on arrival. All verified in-browser; type-check, 40 tests, and the
  build stay green.
- **2026-09-06** — Corrupt-preset self-heal. A mangled `timer-presets`
  payload (invalid JSON, or parsed to a non-array) now reseeds the default
  preset instead of leaving `savedPresets = []`, so one bad payload
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
- **2026-09-04** — Extracted the timer math into `src/engine.ts`, a pure
  ES module (tiling, interval state, progress counting, minute marks,
  ring/format helpers), with 33 Vitest cases in `tests/engine.test.ts`.
  Introduced Vite along the way: `npm run dev|build|test`, Alpine.js from
  npm (vendored copy deleted), sources under `src/` — the codebase is now
  one rename away from TypeScript. `file://` double-click is replaced by
  `npm run dev` or the self-contained `dist/` build.
- **2026-09-04** — Removed all duration caps: sessions and intervals are
  unlimited (the old save path silently capped the total at 60 minutes
  while the UI allowed 120). Kept the sanity floors — 1 min session,
  5 s per interval — and added H:MM:SS formatting past one hour.