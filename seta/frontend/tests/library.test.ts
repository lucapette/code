import { describe, expect, it } from 'vitest';

import {
  addTags,
  emptySheet,
  filterItems,
  removeTag,
  sheetFromItem,
  sheetFromTranslation,
  sheetFromWord,
  sheetToInput,
} from '../src/library';
import type { Item } from '../src/types';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'id',
  chinese: '你好',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('filterItems', () => {
  const items = [
    item({ id: '1', chinese: '你好', meaning: 'hello', tags: ['greeting'] }),
    item({ id: '2', chinese: '银行', meaning: 'bank', note: 'the one by the mall', tags: ['money', 'sign'] }),
    item({ id: '3', chinese: '丝绸之路', where: 'a museum label' }),
  ];

  it('returns everything for an empty query', () => {
    expect(filterItems(items, '   ')).toHaveLength(3);
  });

  it('matches Chinese text', () => {
    expect(filterItems(items, '银行').map((i) => i.id)).toEqual(['2']);
  });

  it('matches meaning, case-insensitively', () => {
    expect(filterItems(items, 'BANK').map((i) => i.id)).toEqual(['2']);
  });

  it('matches notes and tags', () => {
    expect(filterItems(items, 'mall').map((i) => i.id)).toEqual(['2']);
    expect(filterItems(items, 'greeting').map((i) => i.id)).toEqual(['1']);
  });

  it('does not match the "where I found it" field — v1 scope', () => {
    expect(filterItems(items, 'museum')).toHaveLength(0);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterItems(items, 'zzz')).toEqual([]);
  });
});

describe('sheet pre-fills', () => {
  it('saves the translation when the user produced Chinese', () => {
    expect(sheetFromTranslation('en-zh', 'silk road', '丝绸之路')).toEqual({
      chinese: '丝绸之路',
      meaning: 'silk road',
    });
  });

  it('saves the pasted text when the user looked Chinese up', () => {
    expect(sheetFromTranslation('zh-en', '丝绸之路', 'the Silk Road')).toEqual({
      chinese: '丝绸之路',
      meaning: 'the Silk Road',
    });
  });

  it('pre-fills a gap row with its word, gloss and level', () => {
    expect(sheetFromWord({ s: '银行', lv: 3, q: 300, py: 'yín háng', m: 'bank' })).toEqual({
      chinese: '银行',
      meaning: 'bank',
      where: 'HSK 3',
    });
  });

  it('pre-fills every field when editing an existing item', () => {
    const existing = item({ id: 'abc', meaning: 'hello', where: 'tutor', note: 'said fast', tags: ['hi'] });
    expect(sheetFromItem(existing)).toEqual({
      id: 'abc',
      chinese: '你好',
      meaning: 'hello',
      where: 'tutor',
      note: 'said fast',
      tags: ['hi'],
    });
  });
});

describe('sheetToInput', () => {
  it('keeps only Chinese when nothing else was filled in', () => {
    const sheet = emptySheet({ chinese: '  你好  ' });
    expect(sheetToInput(sheet)).toEqual({ chinese: '你好' });
  });

  it('trims and passes the optional fields that have content', () => {
    const sheet = emptySheet({
      chinese: '你好',
      meaning: ' hello ',
      where: '  ',
      note: 'note',
      tags: ['greeting'],
    });
    expect(sheetToInput(sheet)).toEqual({
      chinese: '你好',
      meaning: 'hello',
      note: 'note',
      tags: ['greeting'],
    });
  });
});

describe('addTags / removeTag', () => {
  it('splits a pasted list on commas and semicolons', () => {
    expect(addTags([], 'food, tutor; 天气')).toEqual(['food', 'tutor', '天气']);
  });

  it('strips the # people write out of habit', () => {
    expect(addTags([], '#food, ##tutor')).toEqual(['food', 'tutor']);
  });

  it('drops blanks and case-insensitive duplicates', () => {
    expect(addTags(['food'], ' , FOOD , Food, drink ')).toEqual(['food', 'drink']);
  });

  it('caps the tag count', () => {
    const many = Array.from({ length: 25 }, (_, index) => `t${index}`);
    expect(addTags([], many.join(','))).toHaveLength(20);
  });

  it('removes by value', () => {
    expect(removeTag(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});
