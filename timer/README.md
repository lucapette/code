# Interval Timer

A zero-framework interval timer for workouts and focus sessions, built with
Vite and Alpine.js. A session is a
chain of named intervals (Work, Rest, …) that repeats until the session's
total duration is consumed — e.g. 40s + 20s tiled for 25 minutes is HIIT.

Part of the [monorepo](../README.md). Successor in spirit to
[passata](../passata) (React Pomodoro app, on hold), rebuilt as plain
vanilla JavaScript.

## Features

- Plan strip: the session's intervals render as colored segments, current
  one highlighted and draining as it counts down — you can see the whole
  pattern at a glance
- One big current-interval countdown, with a thin session progress bar and
  left-remaining label underneath
- Interval chains that tile until the session total is used up
- Timer and preset editor as two in-app views; presets are picked from the
  run screen (each showing a mini preview of its plan) and managed
  (create, edit, delete) in the editor
- Voice announcements (Web Speech API) with beep/vibration fallbacks
- Minute marks announced inside intervals of 60s or longer
- "Next interval" teaser in the final seconds of the current one
- Screen wake lock while running, plus a Web Worker heartbeat that keeps
  timing on time while the tab is hidden
- Dark and light themes (follows `prefers-color-scheme` on first run)

## Run it

```sh
npm install
npm run dev        # dev server
npm run build      # production build → dist/ (self-contained, offline)
npm run preview    # serve the build
```

The build bundles everything (Alpine.js included), so `dist/` works offline
and from any static file host.

## Test it

```sh
npm test            # run once (Vitest)
npm run test:watch  # watch mode
```

The timer math — pattern tiling, interval countdowns, minute marks,
ring/format helpers — lives in `src/engine.js` as pure functions and is
covered by `tests/engine.test.js`.

## How it works

All timing is derived from wall-clock elapsed time
(`baseElapsed + (Date.now() - startTimestamp) / 1000`), and the current
interval is *computed* from elapsed time rather than mutated per tick. This
keeps pause/resume and background-tab throttling drift-free: a single frame
after returning to the tab restores the correct state.

While the tab is hidden, `requestAnimationFrame` is suspended — a dedicated
Web Worker heartbeat (`src/heartbeat.js`) keeps the state advancing on time
(Worker timers are not tab-throttled), falling back to `setInterval` where
Workers are unavailable. Beats only signal "time has passed"; all state is
recomputed from the wall clock. A locked screen suspends the page entirely
on some platforms — the wake lock covers that case where granted, and a
notification (see `docs/roadmap.md`) is the eventual fix.

State is held in a single Alpine.js component (`src/main.js`) bound to the
DOM in `index.html`; `src/style.css` implements a flat, minimal theme
(dark/light via CSS `light-dark()` on a dark-first base) with CSS custom
properties.

Persisted keys:

- `timer-presets` — array of `{id, name, totalSeconds, intervals[]}`
- `timer-theme` — `light` or `dark`

Optional browser capabilities (speech synthesis, wake lock, vibration) are
used when available and silently skipped otherwise.

## Project layout

| File                  | Purpose                                    |
|-----------------------|--------------------------------------------|
| `index.html`          | Markup + Alpine bindings                    |
| `src/main.js`         | Alpine component: state, presets, audio/voice, theme |
| `src/engine.js`       | Pure timer math (tiling, countdowns, cues)  |
| `src/style.css`       | Theming and layout                          |
| `tests/engine.test.js`| Vitest coverage for the engine              |
| `package.json`        | Vite/Vitest tooling, Alpine.js dependency   |

See [docs/roadmap.md](docs/roadmap.md) for known issues and planned work.
