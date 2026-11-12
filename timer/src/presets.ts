/* ==========================================================================
   Built-in preset library.

   Read-only bundled presets. They never change and cannot be deleted — the
   saved (user) store holds only everything else. Editing one forks it into
   an editable user copy instead of mutating in place. Each preset stores a
   fully-expanded finite sequence — nothing repeats implicitly.

   The bundled library is workouts-only on purpose: those are the routines
   actually used. Authoring other presets (focus, cooking, …) is what the
   user store and the editor are for.
   ========================================================================== */

import type { Interval, Preset } from './types';

/* Standing warm-up first (top-down), then descend once for the floor
   block, and finish seated. Each move preps the next. Durations follow
   the move, not one clock: rhythmic moves get 30s (clean reps through
   range do the work, not time), the two marinate holds get 45s, and
   the one truly one-sided hold (hip flexor stretch) splits into
   left/right intervals at 30s a side — the spoken label doubles as the
   switch cue. Cossack and 90/90s stay one flowing block each: they
   switch side to side in motion, they don't hold per side. */
const MOBILITY_INTERVALS: Interval[] = [
  { seconds: 30, label: 'body bounces' },
  { seconds: 30, label: 'neck circles' },
  { seconds: 30, label: 'arm swings' },
  { seconds: 30, label: 'full twists' },
  { seconds: 45, label: 'deepsquat reaches' },
  { seconds: 45, label: 'cossack' },
  { seconds: 30, label: 'hip flexor stretch left' },
  { seconds: 30, label: 'hip flexor stretch right' },
  { seconds: 30, label: 'cat-cow' },
  { seconds: 30, label: 'downward up dog' },
  { seconds: 30, label: 'table top pose' },
  { seconds: 30, label: 'bridge pose' },
  { seconds: 30, label: 'windshield wipers' },
  { seconds: 45, label: '90/90s' },
  { seconds: 45, label: 'straddles' },
  { seconds: 30, label: 'toe touches' },
];

export const BUILTIN_PRESETS: readonly Preset[] = [
  {
    id: 'p-mobility',
    name: 'Mobility routine',
    category: 'Workouts',
    intervals: MOBILITY_INTERVALS.map((iv) => ({ ...iv })),
  },
  /* Chapter list of the follow-along video it came from, squeezed to a
     flat five minutes: ankles and hips first, leg swing runs longest,
     then stretch, open up, and finish with the final burst. */
  {
    id: 'p-running-warmup',
    name: 'Running warmup',
    category: 'Workouts',
    intervals: [
      { seconds: 30, label: 'roll ankle in and out' },
      { seconds: 30, label: 'forward and back' },
      { seconds: 30, label: 'hip flexion' },
      { seconds: 30, label: 'hip rotation' },
      { seconds: 50, label: 'leg swing' },
      { seconds: 30, label: 'side swing' },
      { seconds: 35, label: 'ankle stretch' },
      { seconds: 35, label: 'arm circles' },
      { seconds: 30, label: 'final warmup' },
    ],
  },
  /* The warmup's cooldown sibling from the same channel: eight stretches
     at 30s a hold, the one-sided ones split left/right so the spoken
     label calls the switch — seven minutes flat. */
  {
    id: 'p-running-cooldown',
    name: 'Running cooldown',
    category: 'Workouts',
    intervals: [
      { seconds: 30, label: 'side stretch left' },
      { seconds: 30, label: 'side stretch right' },
      { seconds: 30, label: 'calf stretch left' },
      { seconds: 30, label: 'calf stretch right' },
      { seconds: 30, label: 'hamstring stretch left' },
      { seconds: 30, label: 'hamstring stretch right' },
      { seconds: 30, label: 'quad stretch left' },
      { seconds: 30, label: 'quad stretch right' },
      { seconds: 30, label: 'cross leg fold left' },
      { seconds: 30, label: 'cross leg fold right' },
      { seconds: 30, label: 'wide legged flat back stretch' },
      { seconds: 30, label: 'wide legged forward fold' },
      { seconds: 30, label: 'glute & piriformis left' },
      { seconds: 30, label: 'glute & piriformis right' },
    ],
  },
  {
    id: 'p-jumprope',
    name: 'Jump rope',
    category: 'Workouts',
    intervals: Array.from({ length: 10 }, () => [
      { seconds: 30, label: 'Jump' },
      { seconds: 30, label: 'Rest', kind: 'rest' as const },
    ]).flat(),
  },
];

export const BUILTIN_IDS: ReadonlySet<string> = new Set(BUILTIN_PRESETS.map((p) => p.id));

export const DEFAULT_PRESET: Preset = BUILTIN_PRESETS[0];

/* --- Round builder ---------------------------------------------------- */
/* "X rounds of N-s work + M-s rest" expanded into full rows. The stored
   preset is the finite sequence — the round count is authoring input, not
   model state. Numbers are clamped the way the editor's inputs are: work
   at 5s, rest at 0s, rounds at 1. Rest 0 is a real value (no rest row), so
   it must not be swallowed by a falsy fallback. */

export interface RoundPlan {
  work: number;
  rest: number;
  rounds: number;
  intervals: Interval[];
}

/* x-model.number yields '' for an emptied input, and junk for a malformed
   one; both fall back to the field's default rather than becoming 0. */
function inputNumber(value: unknown, fallback: number): number {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundPlan(
  workInput: unknown,
  restInput: unknown,
  roundsInput: unknown
): RoundPlan {
  const work = Math.max(5, Math.round(inputNumber(workInput, 30)));
  const rest = Math.max(0, Math.round(inputNumber(restInput, 30)));
  const rounds = Math.max(1, Math.round(inputNumber(roundsInput, 1)));
  const intervals: Interval[] = Array.from({ length: rounds }, () => [
    { seconds: work, label: 'Work' },
    ...(rest > 0
      ? [{ seconds: rest, label: 'Rest', kind: 'rest' as const }]
      : []),
  ]).flat();
  return { work, rest, rounds, intervals };
}
