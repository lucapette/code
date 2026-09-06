import { describe, expect, it } from 'vitest';

import type { Interval } from '../src/types';
import {
  formatClock,
  indexOfInterval,
  intervalState,
  isRest,
  kindOf,
  kindSplit,
  minuteMark,
  nextLabel,
  progressCount,
  ringProgress,
  stripLayout,
  totalDuration,
  urgency,
} from '../src/engine';

/* Work 40s + Rest 20s — the canonical HIIT pair used across the suite. */
const hiit: Interval[] = [
  { seconds: 40, label: 'Work', kind: 'work' },
  { seconds: 20, label: 'Rest', kind: 'rest' },
];

/* The same pair repeated ten times — a fully-expanded 10-round session. */
const hiitx10: Interval[] = Array.from({ length: 10 }, () => hiit).flat();

/* Seven 60s intervals, all work. */
const seven: Interval[] = Array.from({ length: 7 }, (_, i) => ({ seconds: 60, label: `i${i}` }));

describe('totalDuration', () => {
  it('sums interval seconds', () => {
    expect(totalDuration(hiit)).toBe(60);
    expect(totalDuration(seven)).toBe(420);
    expect(totalDuration(hiitx10)).toBe(600);
  });

  it('is 0 for an empty chain', () => {
    expect(totalDuration([])).toBe(0);
  });
});

describe('indexOfInterval', () => {
  it('lands in the first interval before its boundary', () => {
    expect(indexOfInterval(hiit, 0)).toBe(0);
    expect(indexOfInterval(hiit, 39.9)).toBe(0);
  });

  it('crosses to the next interval exactly at the boundary', () => {
    expect(indexOfInterval(hiit, 40)).toBe(1);
    expect(indexOfInterval(hiit, 59.5)).toBe(1);
  });

  it('does not wrap a finite session', () => {
    // hiit has only two intervals — nothing tiles
    expect(indexOfInterval(hiit, 100)).toBe(1);
    expect(indexOfInterval(hiitx10, 60)).toBe(2);
    expect(indexOfInterval(hiitx10, 65)).toBe(2);
  });

  it('clamps past the end to the last interval', () => {
    expect(indexOfInterval(hiit, 400)).toBe(1);
  });
});

describe('intervalState', () => {
  it('counts down inside the first interval', () => {
    expect(intervalState(hiit, 0)).toEqual({ index: 0, total: 40, remaining: 40 });
    expect(intervalState(hiit, 10.5)).toEqual({ index: 0, total: 40, remaining: 29.5 });
  });

  it('crosses into the second interval at the boundary', () => {
    expect(intervalState(hiit, 40)).toEqual({ index: 1, total: 20, remaining: 20 });
    expect(intervalState(hiit, 55)).toEqual({ index: 1, total: 20, remaining: 5 });
  });

  it('walks a repeated pair without tiling math', () => {
    expect(intervalState(hiitx10, 60)).toEqual({ index: 2, total: 40, remaining: 40 });
    expect(intervalState(hiitx10, 99)).toEqual({ index: 2, total: 40, remaining: 1 });
  });

  it('handles a single long interval', () => {
    const single: Interval[] = [{ seconds: 5400, label: 'deep work' }];
    expect(intervalState(single, 0)).toEqual({ index: 0, total: 5400, remaining: 5400 });
    expect(intervalState(single, 2700)).toEqual({ index: 0, total: 5400, remaining: 2700 });
  });

  it('returns null for an empty chain', () => {
    expect(intervalState([], 10)).toBeNull();
  });
});

describe('progressCount', () => {
  it('counts work intervals in the finite session', () => {
    // 10 rounds = 10 work intervals
    expect(progressCount(hiitx10, 0)).toEqual({ current: 1, total: 10 });
    expect(progressCount(hiitx10, 300)).toEqual({ current: 6, total: 10 });
  });

  it('stays on the same work count through a rest gap', () => {
    // 45s in — 40s work done, 5s into rest: still on work unit 1
    expect(progressCount(hiitx10, 45)).toEqual({ current: 1, total: 10 });
    // 60s in — next work unit starts
    expect(progressCount(hiitx10, 60)).toEqual({ current: 2, total: 10 });
  });

  it('counts only work intervals, not rest gaps, in a mixed session', () => {
    // one Work + three Rest + one Work = 2 work units in 4 intervals
    const mixed: Interval[] = [
      { seconds: 40, label: 'Work', kind: 'work' },
      { seconds: 20, label: 'Rest', kind: 'rest' },
      { seconds: 30, label: 'Rest', kind: 'rest' },
      { seconds: 40, label: 'Work', kind: 'work' },
    ];
    expect(progressCount(mixed, 0)).toEqual({ current: 1, total: 2 });
    expect(progressCount(mixed, 45)).toEqual({ current: 1, total: 2 });
    expect(progressCount(mixed, 95)).toEqual({ current: 2, total: 2 });
  });

  it('returns null when there is nothing to count', () => {
    expect(progressCount([{ seconds: 600, label: '' }], 0)).toBeNull();
    expect(progressCount([], 0)).toBeNull();
    expect(progressCount([{ seconds: 0, label: '' }], 0)).toBeNull();
  });
});

describe('isRest / kindOf', () => {
  it('defaults untagged intervals to work', () => {
    expect(kindOf({ seconds: 40, label: '' })).toBe('work');
    expect(isRest({ seconds: 40, label: '' })).toBe(false);
  });

  it('reads an explicit rest kind', () => {
    expect(kindOf({ seconds: 20, label: 'Rest', kind: 'rest' })).toBe('rest');
    expect(isRest({ seconds: 20, label: 'Rest', kind: 'rest' })).toBe(true);
  });

  it('treats an explicit work kind as work', () => {
    expect(kindOf({ seconds: 40, label: 'Work', kind: 'work' })).toBe('work');
    expect(isRest({ seconds: 40, label: 'Work', kind: 'work' })).toBe(false);
  });
});

describe('kindSplit', () => {
  it('splits an untagged session as all work', () => {
    expect(kindSplit(seven)).toEqual({ work: 420, rest: 0 });
  });

  it('accounts rest across an expanded session', () => {
    // 10 rounds of 40 work + 20 rest = 400 work + 200 rest
    expect(kindSplit(hiitx10)).toEqual({ work: 400, rest: 200 });
  });

  it('handles empty and zero-length inputs', () => {
    expect(kindSplit([])).toEqual({ work: 0, rest: 0 });
    expect(kindSplit([{ seconds: 0, label: '' }])).toEqual({ work: 0, rest: 0 });
  });
});

describe('formatClock', () => {
  it('formats M:SS below an hour', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(599)).toBe('9:59');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('switches to H:MM:SS from one hour on', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(5400)).toBe('1:30:00');
    expect(formatClock(10800)).toBe('3:00:00');
  });
});

describe('stripLayout', () => {
  it('maps each interval to its share of the session', () => {
    expect(stripLayout(hiit)).toEqual([
      { seconds: 40, label: 'Work', kind: 'work', fraction: 2 / 3 },
      { seconds: 20, label: 'Rest', kind: 'rest', fraction: 1 / 3 },
    ]);
  });

  it('shares the strip across every expanded interval', () => {
    const segs = stripLayout(hiitx10);
    expect(segs).toHaveLength(20);
    segs.forEach((s, i) => {
      expect(s.kind).toBe(i % 2 === 0 ? 'work' : 'rest');
    });
  });

  it('returns equal fractions for identical intervals', () => {
    const segs = stripLayout(seven);
    segs.forEach((s) => expect(s.fraction).toBeCloseTo(1 / 7));
  });

  it('handles an empty chain with zero fractions', () => {
    expect(stripLayout([])).toEqual([]);
  });
});

describe('ringProgress', () => {
  it('is the remaining fraction', () => {
    expect(ringProgress(30, 60)).toBe(0.5);
    expect(ringProgress(0, 60)).toBe(0);
    expect(ringProgress(60, 60)).toBe(1);
  });

  it('clamps out-of-range remainders', () => {
    expect(ringProgress(70, 60)).toBe(1);
    expect(ringProgress(-5, 60)).toBe(0);
  });

  it('renders a zero total as a full ring', () => {
    expect(ringProgress(0, 0)).toBe(1);
  });
});

describe('urgency', () => {
  it('is normal above a minute', () => {
    expect(urgency(61)).toBe('normal');
    expect(urgency(600)).toBe('normal');
  });

  it('warns inside the last minute', () => {
    expect(urgency(60)).toBe('warning');
    expect(urgency(11)).toBe('warning');
    expect(urgency(10.5)).toBe('warning');
  });

  it('turns dangerous inside the last 10 seconds', () => {
    expect(urgency(10)).toBe('danger');
    expect(urgency(0)).toBe('danger');
  });
});

describe('minuteMark', () => {
  it('does not announce inside short intervals', () => {
    expect(minuteMark(45, 30, null)).toBeNull();
    expect(minuteMark(30, 29.9, 1)).toBeNull();
  });

  it('suppresses repeated announcements of the same minute', () => {
    const total = 300;
    expect(minuteMark(total, total, 5)).toBeNull();
    expect(minuteMark(total, 240.1, 5)).toBeNull();
  });

  it('announces when a boundary is crossed', () => {
    expect(minuteMark(300, 239.9, 5)).toBe(4);
    expect(minuteMark(300, 120, 4)).toBe(2);
    expect(minuteMark(90, 59.9, 2)).toBe(1);
  });

  it('keeps quiet in a 60s interval — the change cue covers it', () => {
    expect(minuteMark(60, 59.9, 1)).toBeNull();
    expect(minuteMark(60, 0.5, 1)).toBeNull();
  });
});

describe('nextLabel', () => {
  const labeled: Interval[] = [
    { seconds: 40, label: 'Work' },
    { seconds: 20, label: 'Rest' },
  ];

  it('is hidden outside the final 10 seconds', () => {
    expect(nextLabel(labeled, 0, 11)).toBe('');
  });

  it('teases the next interval in the final 10 seconds', () => {
    expect(nextLabel(labeled, 0, 10)).toBe('Rest');
    expect(nextLabel(labeled, 0, 0.5)).toBe('Rest');
  });

  it('is hidden when this is the session final interval', () => {
    expect(nextLabel(labeled, 1, 5)).toBe('');
  });

  it('is hidden when the next interval has no label', () => {
    const unlabeled: Interval[] = [{ seconds: 40, label: 'Work' }, { seconds: 20, label: '' }];
    expect(nextLabel(unlabeled, 0, 5)).toBe('');
  });

  it('survives an empty chain', () => {
    expect(nextLabel([], 0, 5)).toBe('');
  });
});
