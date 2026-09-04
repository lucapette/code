# Roadmap

Known issues and candidate work items, to be tackled one at a time.
Priorities: **P1** = bug or core-use-case gap, **P2** = structure/a11y,
**P3** = polish.

## Known issues

### P1 — No alerts while the tab is hidden or the screen is off

The engine only runs inside `requestAnimationFrame` (`tick()`), which
browsers suspend in hidden tabs and when the screen locks. The wake lock
mitigates this while granted, but it is not universal (Firefox, older iOS
Safari, denied permission). If the screen goes dark mid-workout, "Time is
up!" only fires as a catch-up when the app becomes visible again — not on
time. Fix direction: a `setTimeout`/Web Worker heartbeat fallback, still
timestamp-corrected by the existing elapsed math.

### P2 — Timer engine is not unit-testable

Pattern tiling (`indexOfInterval`), partial-final-interval counting
(`intervalProgress`), and minute-mark logic are exactly the code that
regresses silently, and all of it is embedded in the Alpine component
object. Extract the engine into a pure module (elapsed in → state out) and
add tests.

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
2. **Extract + test the engine** — pure module with the tiling/minute-mark
   logic, covered by unit tests (same work as the P2 issue above).
3. **Announcement preferences** — toggles for voice / beeps / vibration,
   and distinct tones per interval so Work vs Rest is audible without
   looking.
4. **Preset import/export** — copy/paste a preset as JSON to share HIIT
   routines between devices.
5. **Explicitly out of scope** — accounts, server sync, session history.
   The app stays a single static page.

## Suggested order

1. Extract engine + tests (unblocks confident refactoring)
2. Background heartbeat fallback (core use case)
3. PWA (notification completes the background story)
4. A11y + polish batch (remaining P2/P3 items)

## Done

- **2026-09-04** — Removed all duration caps: sessions and intervals are
  unlimited (the old save path silently capped the total at 60 minutes
  while the UI allowed 120). Kept the sanity floors — 1 min session,
  5 s per interval — and added H:MM:SS formatting past one hour.
