# Interval Timer

A zero-framework interval timer for workouts and focus sessions, built with
Vite and Alpine.js. A session is a finite sequence of intervals (Work,
Rest, …) run top to bottom — e.g. ten rounds of 40s + 20s is twenty
intervals. Presets are templates that store that fully-expanded sequence;
running one snapshots it into a Session.

Part of the [monorepo](../README.md). Successor in spirit to
[passata](../passata) (React Pomodoro app, on hold), rebuilt as a plain
TypeScript + Vite app.

## Features

- Plan strip: the session's intervals render as colored segments, current
  one highlighted and draining as it counts down — you can see the whole
  plan at a glance
- One big current-interval countdown, with a thin session progress bar and
  left-remaining label underneath
- Finite interval sequences: a preset is its fully-expanded run, no hidden
  repetition
- Three views: a compact **Library** launcher (pick a preset, no timers
  here), a dedicated **Timer** screen you land on when you pick one (it
  stages the plan, then runs the countdown), and the **Presets editor
- A preset **library**: read-only bundled built-ins (Mobility, Jump rope,
  Pomodoro classic, Focus, White rice) alongside your own presets, each in
  a high-level **category** (Workouts, Productivity, Cooking, …). Built-ins
  can't be deleted or corrupted; editing one forks it into an editable copy
- Announcement preferences (voice / tones / buzz) toggled in the editor:
  named intervals are spoken, and an interval with no label plays one fixed
  tone
- Voice announcements (Web Speech API) with beep/vibration fallbacks, and
  minute marks announced inside intervals of 60s or longer
- "Next interval" teaser in the final seconds of the current one
- Preset import/export: the whole list copies as pretty JSON and pastes
  right back in, validated and re-id'd on arrival
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
npm run type-check  # strict TypeScript check (tsc --noEmit)
```

The timer math — interval countdowns, work/rest accounting, minute marks,
ring/format helpers — lives in `src/engine.ts` as pure functions and is
covered by `tests/engine.test.ts`.

## How it works

All timing is derived from wall-clock elapsed time
(`baseElapsed + (Date.now() - startTimestamp) / 1000`), and the current
interval is *computed* from elapsed time rather than mutated per tick. This
keeps pause/resume and background-tab throttling drift-free: a single frame
after returning to the tab restores the correct state.

While the tab is hidden, `requestAnimationFrame` is suspended — a dedicated
Web Worker heartbeat (`src/heartbeat.ts`) keeps the state advancing on time
(Worker timers are not tab-throttled), falling back to `setInterval` where
Workers are unavailable. Beats only signal "time has passed"; all state is
recomputed from the wall clock. A locked screen suspends the page entirely
on some platforms — the wake lock covers that case where granted, and a
notification (see `docs/roadmap.md`) is the eventual fix.

State is held in a single Alpine.js component (`src/main.ts`) bound to the
DOM in `index.html`; shared types live in `src/types.ts`; `src/style.css`
implements a flat, minimal theme
(dark/light via CSS `light-dark()` on a dark-first base) with CSS custom
properties.

Persisted keys:

- `timer-presets` — array of user presets `{id, name, category, intervals[]}`
  (fully expanded; bundled built-ins are read-only and live in code)
- `timer-theme` — `light` or `dark`

Optional browser capabilities (speech synthesis, wake lock, vibration) are
used when available and silently skipped otherwise.

## Project layout

| File                  | Purpose                                    |
|-----------------------|--------------------------------------------|
| `index.html`          | Markup + Alpine bindings                    |
| `src/main.ts`         | Alpine component: state, presets, audio/voice, theme |
| `src/engine.ts`       | Pure timer math (countdowns, accounting, cues) |
| `src/types.ts`        | Shared `Interval` / `Preset` / `Session` types |
| `src/heartbeat.ts`    | Hidden-tab heartbeat (Worker + fallback)    |
| `src/style.css`       | Theming and layout                          |
| `tests/engine.test.ts`| Vitest coverage for the engine              |
| `package.json`        | Vite/Vitest tooling, Alpine.js dependency   |

See [docs/roadmap.md](docs/roadmap.md) for known issues and planned work.
