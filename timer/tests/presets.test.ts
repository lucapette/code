import { describe, expect, it } from 'vitest';

import {
  BUILTIN_IDS,
  BUILTIN_PRESETS,
  DEFAULT_PRESET,
  roundPlan,
} from '../src/presets';
import { totalDuration } from '../src/engine';

describe('built-in presets', () => {
  it('ships the workout library only', () => {
    expect(BUILTIN_PRESETS.map((p) => p.name)).toEqual([
      'Mobility routine',
      'Running warmup',
      'Running cooldown',
      'Jump rope',
    ]);
    expect(BUILTIN_PRESETS.every((p) => p.category === 'Workouts')).toBe(true);
  });

  it('has unique ids that all belong to the built-in id set', () => {
    const ids = BUILTIN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => BUILTIN_IDS.has(id))).toBe(true);
    expect(BUILTIN_IDS.size).toBe(ids.length);
  });

  it('boots into a built-in preset', () => {
    expect(BUILTIN_IDS.has(DEFAULT_PRESET.id)).toBe(true);
    expect(DEFAULT_PRESET.name).toBe('Mobility routine');
  });

  it('every preset is a non-empty run of labelled, timed intervals', () => {
    for (const preset of BUILTIN_PRESETS) {
      expect(preset.intervals.length).toBeGreaterThan(0);
      for (const iv of preset.intervals) {
        expect(iv.seconds).toBeGreaterThan(0);
        expect(iv.label.trim()).not.toBe('');
      }
    }
  });

  it('keeps the routines at their known totals', () => {
    const minutes = BUILTIN_PRESETS.map((p) => totalDuration(p.intervals) / 60);
    expect(minutes).toEqual([9, 5, 7, 10]);
  });

  it('tags Jump rope recovery intervals as rest', () => {
    const jump = BUILTIN_PRESETS.find((p) => p.id === 'p-jumprope');
    expect(jump?.intervals).toHaveLength(20);
    expect(jump?.intervals.filter((iv) => iv.kind === 'rest')).toHaveLength(10);
    expect(jump?.intervals[1].kind).toBe('rest');
  });
});

describe('roundPlan', () => {
  it('expands work + rest into full rows', () => {
    const plan = roundPlan(30, 15, 3);
    expect(plan).toMatchObject({ work: 30, rest: 15, rounds: 3 });
    expect(plan.intervals).toHaveLength(6);
    expect(plan.intervals[0]).toEqual({ seconds: 30, label: 'Work' });
    expect(plan.intervals[1]).toEqual({
      seconds: 15,
      label: 'Rest',
      kind: 'rest',
    });
    expect(totalDuration(plan.intervals)).toBe(135);
  });

  it('treats rest 0 as "no rest row", not as the default', () => {
    const plan = roundPlan(40, 0, 10);
    expect(plan.rest).toBe(0);
    expect(plan.intervals).toHaveLength(10);
    expect(plan.intervals.every((iv) => iv.kind !== 'rest')).toBe(true);
    expect(totalDuration(plan.intervals)).toBe(400);
  });

  it('clamps inputs to the editor floors', () => {
    const plan = roundPlan(2, -15, 0);
    expect(plan.work).toBe(5);
    expect(plan.rest).toBe(0);
    expect(plan.rounds).toBe(1);
    expect(plan.intervals).toHaveLength(1);
  });

  it('falls back to defaults for empty or malformed inputs', () => {
    const blank = roundPlan('', null, undefined);
    expect(blank).toMatchObject({ work: 30, rest: 30, rounds: 1 });
    expect(blank.intervals).toHaveLength(2);

    const junk = roundPlan('abc', Number.NaN, {});
    expect(junk).toMatchObject({ work: 30, rest: 30, rounds: 1 });
  });
});
