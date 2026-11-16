import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LEVELS,
  TOP_LEVEL,
  extraRefs,
  groupKnown,
  levelLabel,
  levelPercent,
  levelRow,
  showingLevel,
  textRefs,
  toggleLevel,
} from '../src/hsk';
import type { CoverageReport, KnownWord } from '../src/types';

const word = (overrides: Partial<KnownWord> = {}): KnownWord => ({
  s: '我',
  lv: 1,
  q: 2,
  py: 'wǒ',
  m: 'I',
  ...overrides,
});

const report = (overrides: Partial<CoverageReport> = {}): CoverageReport => ({
  levels: [
    { level: 1, seen: 2, total: 4 },
    { level: 2, seen: 0, total: 3 },
    { level: 7, seen: 1, total: 5606 },
  ],
  current: 2,
  known: {
    words: [
      word({ s: '的', q: 1 }),
      word({ s: '我', q: 2, refs: [{ id: 'a', text: '我去银行' }] }),
      word({ s: '银行', lv: 7, q: 300 }),
    ],
    total: 3,
    more: false,
  },
  gaps: { words: [], total: 0, more: false },
  ...overrides,
});

describe('levelLabel', () => {
  it('names bands 1–6 by number', () => {
    expect(levelLabel(1)).toBe('1');
    expect(levelLabel(6)).toBe('6');
  });

  it('names the 7–9 bucket for what it is', () => {
    expect(levelLabel(TOP_LEVEL)).toBe('7–9');
  });
});

describe('levelPercent', () => {
  it('rounds the ratio', () => {
    expect(levelPercent({ level: 1, seen: 1, total: 3 })).toBe(33);
    expect(levelPercent({ level: 1, seen: 4, total: 4 })).toBe(100);
  });

  it('never divides by zero', () => {
    expect(levelPercent({ level: 1, seen: 0, total: 0 })).toBe(0);
  });
});

describe('levelRow', () => {
  it('finds the band, and admits when it is missing', () => {
    expect(levelRow(report(), 2)).toEqual({ level: 2, seen: 0, total: 3 });
    expect(levelRow(report(), 4)).toBeUndefined();
  });
});

describe('showingLevel', () => {
  it('falls back to the map’s current level', () => {
    expect(showingLevel(report(), 0)).toBe(2);
  });

  it('prefers the band the user picked', () => {
    expect(showingLevel(report(), 7)).toBe(7);
  });
});

describe('extraRefs', () => {
  it('counts the references a row leaves out', () => {
    expect(extraRefs({ ...word(), refs: [{ id: 'a', text: '甲乙' }], ref_total: 9 })).toBe(8);
  });

  it('is zero when everything is shown, or when the server sent no total', () => {
    expect(extraRefs({ ...word(), refs: [{ id: 'a', text: '甲乙' }], ref_total: 1 })).toBe(0);
    expect(extraRefs({ ...word(), refs: [{ id: 'a', text: '甲乙' }] })).toBe(0);
  });

  it('is zero for a word with no references at all', () => {
    expect(extraRefs(word())).toBe(0);
  });
});

describe('textRefs', () => {
  it('keeps the sentences and drops the self reference', () => {
    const refs = textRefs(word({ refs: [{ id: 'a', text: '我' }, { id: 'b', text: '是我' }] }));

    expect(refs.map((ref) => ref.id)).toEqual(['b']);
  });

  it('is empty for a word with no references', () => {
    expect(textRefs(word())).toEqual([]);
  });
});

describe('groupKnown', () => {
  it('keeps one group per selected band, in band order', () => {
    const groups = groupKnown(report(), [2, 1]);

    expect(groups.map((group) => group.level)).toEqual([1, 2]);
    expect(groups.map((group) => group.label)).toEqual(['1', '2']);
  });

  it('buckets the words and carries their references through', () => {
    const groups = groupKnown(report(), DEFAULT_LEVELS);

    expect(groups[0].words.map((entry) => entry.s)).toEqual(['的', '我']);
    expect(groups[0].seen).toBe(2);
    expect(groups[0].percent).toBe(50);
    expect(groups[0].words[1].refs?.[0].id).toBe('a');
    expect(groups[1].words).toEqual([]);
  });

  it('shows the 7–9 bucket with its own label and no words for bands outside the selection', () => {
    const groups = groupKnown(report(), [7]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('7–9');
    expect(groups[0].total).toBe(5606);
    expect(groups[0].words.map((entry) => entry.s)).toEqual(['银行']);
  });

  it('survives a band the report does not know', () => {
    const groups = groupKnown(report(), [5]);

    expect(groups[0]).toMatchObject({ level: 5, seen: 0, total: 0, percent: 0, words: [] });
  });
});

describe('toggleLevel', () => {
  it('adds a band, keeping the selection sorted', () => {
    expect(toggleLevel([1, 3], 2)).toEqual([1, 2, 3]);
    expect(toggleLevel([2], 7)).toEqual([2, 7]);
  });

  it('removes a band', () => {
    expect(toggleLevel([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('refuses to empty the selection, returning the same array', () => {
    const levels = [1];
    expect(toggleLevel(levels, 1)).toBe(levels);
  });

  it('leaves the input alone', () => {
    const levels = [1, 2];
    toggleLevel(levels, 3);
    expect(levels).toEqual([1, 2]);
  });
});
