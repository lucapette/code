# Interval Timer

A zero-framework interval timer for workouts and focus sessions, built with
Vite and Alpine.js. A session is a
chain of named intervals (Work, Rest, …) that repeats until the session's
total duration is consumed — e.g. 40s + 20s tiled for 25 minutes is HIIT.

Part of the [monorepo](../README.md). Successor in spirit to
[passata](../passata) (React Pomodoro app, on hold), rebuilt as plain
vanilla JavaScript.

## Features

- Two progress rings: current interval and total session, with countdowns
- Interval chains that tile until the session total is used up
- Editable, deletable presets persisted to `localStorage`
- Voice announcements (Web Speech API) with beep/vibration fallbacks
- Minute marks announced inside intervals of 60s or longer
- "Next interval" teaser in the final seconds of the current one
- Screen wake lock while running (re-acquired when the tab becomes visible)
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

State is held in a single Alpine.js component (`src/main.js`) bound to the
DOM in `index.html`; `src/style.css` implements the dark-first
glassmorphism theme with CSS custom properties.

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
