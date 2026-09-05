import { describe, expect, it } from 'vitest';

import type { Interval } from '../src/types';
import {
  formatClock,
  indexOfInterval,
  intervalState,
  minuteMark,
  nextLabel,
  patternLength,
  progressCount,
  ringProgress,
  stripLayout,
  urgency,
} from '../src/engine';

/* Work 40s + Rest 20s — the canonical HIIT tile used across the suite. */
const hiit: Interval[] = [
  { seconds: 40, label: 'Work' },
  { seconds: 20, label: 'Rest' },
];

const seven: Interval[] = Array.from({ length: 7 }, (_, i) => ({ seconds: 60, label: `i${i}` }));

describe('patternLength', () => {
  it('sums interval seconds', () => {
    expect(patternLength(hiit)).toBe(60);
    expect(patternLength(seven)).toBe(420);
  });

  it('is 0 for an empty chain', () => {
    expect(patternLength([])).toBe(0);
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

  it('wraps into the next tile with no gap', () => {
    expect(indexOfInterval(hiit, 60)).toBe(0);
    expect(indexOfInterval(hiit, 100)).toBe(1);
    expect(indexOfInterval(hiit, 60 * 11 + 5)).toBe(0);
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

  it('tiles the pattern indefinitely', () => {
    expect(intervalState(hiit, 60)).toEqual({ index: 0, total: 40, remaining: 40 });
    expect(intervalState(hiit, 130)).toEqual({ index: 0, total: 40, remaining: 30 });
    expect(intervalState(hiit, 180)).toEqual({ index: 0, total: 40, remaining: 40 });
  });

  it('wraps to the next tile at the exact end of the pattern', () => {
    // pos = 90 % 90 = 0 -> the boundary instant is the next tile's start
    expect(intervalState([{ seconds: 90, label: '' }], 90)).toEqual({
      index: 0, total: 90, remaining: 90,
    });
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
  it('counts full tiles for an exact multiple', () => {
    // 25 min of a 60s pattern = 25 tiles = 50 intervals
    expect(progressCount(hiit, 1500, 1500)).toEqual({ current: 1, total: 50 });
    expect(progressCount(hiit, 1500, 750)).toEqual({ current: 25, total: 50 });
  });

  it('counts the partial final tile', () => {
    // 400s of a 420s pattern (7x60) still fits 7 intervals
    expect(progressCount(seven, 400, 400)).toEqual({ current: 1, total: 7 });
    expect(progressCount(seven, 400, 340)).toEqual({ current: 2, total: 7 });
  });

  it('counts a truncated mixed pattern', () => {
    // 90s of 40+20: full tile (2) + Work only (1) = 3
    expect(progressCount(hiit, 90, 90)).toEqual({ current: 1, total: 3 });
    expect(progressCount(hiit, 90, 70)).toEqual({ current: 1, total: 3 });
    expect(progressCount(hiit, 90, 20)).toEqual({ current: 3, total: 3 });
  });

  it('returns null when there is nothing to count', () => {
    expect(progressCount([{ seconds: 600, label: '' }], 600, 600)).toBeNull();
    expect(progressCount([{ seconds: 300, label: '' }], 240, 240)).toBeNull();
    expect(progressCount([], 600, 600)).toBeNull();
    expect(progressCount([{ seconds: 0, label: '' }], 0, 0)).toBeNull();
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
  it('maps each interval to its share of the pattern', () => {
    expect(stripLayout(hiit)).toEqual([
      { seconds: 40, label: 'Work', fraction: 2 / 3 },
      { seconds: 20, label: 'Rest', fraction: 1 / 3 },
    ]);
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
    expect(nextLabel(labeled, 0, 11, 100)).toBe('');
  });

  it('teases the next interval in the final 10 seconds', () => {
    expect(nextLabel(labeled, 0, 10, 100)).toBe('Rest');
    expect(nextLabel(labeled, 0, 0.5, 100)).toBe('Rest');
  });

  it('wraps the pattern for the teaser', () => {
    expect(nextLabel(labeled, 1, 8, 80)).toBe('Work');
  });

  it('is hidden when the session ends with this interval', () => {
    expect(nextLabel(labeled, 1, 5, 5)).toBe('');
    expect(nextLabel(labeled, 0, 5, 5)).toBe('');
  });

  it('is hidden when the next interval has no label', () => {
    const unlabeled: Interval[] = [{ seconds: 40, label: 'Work' }, { seconds: 20, label: '' }];
    expect(nextLabel(unlabeled, 0, 5, 100)).toBe('');
  });

  it('survives an empty chain', () => {
    expect(nextLabel([], 0, 5, 100)).toBe('');
  });
});