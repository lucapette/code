import { describe, expect, it } from 'vitest';

import { pinyinFor, pinyinSortKey } from '../src/pinyin';

describe('pinyinFor', () => {
  it('converts plain hanzi with tone marks', () => {
    expect(pinyinFor('丝绸之路')).toBe('sī chóu zhī lù');
  });

  it('resolves polyphones by word context', () => {
    expect(pinyinFor('银行')).toBe('yín háng'); // not xíng
    expect(pinyinFor('音乐')).toBe('yīn yuè'); // not lè
    expect(pinyinFor('快乐')).toBe('kuài lè');
    expect(pinyinFor('来了')).toBe('lái le'); // not liǎo
    expect(pinyinFor('行动')).toBe('xíng dòng'); // not háng
    expect(pinyinFor('长城')).toBe('cháng chéng'); // not zhǎng
  });

  it('converts a full sentence and hugs its punctuation', () => {
    expect(pinyinFor('我需要去银行。')).toBe('wǒ xū yào qù yín háng。');
  });

  it('passes latin and mixed text through', () => {
    expect(pinyinFor('Hello，世界！AI is great')).toBe('Hello，shì jiè！AI is great');
  });

  it('returns an empty string for no Chinese', () => {
    expect(pinyinFor('')).toBe('');
    expect(pinyinFor('plain english')).toBe('plain english');
  });
});

describe('pinyinSortKey', () => {
  it('drops the tone marks, so alphabetical is actually alphabetical', () => {
    expect(pinyinSortKey('我')).toBe('wo');
    expect(pinyinSortKey('爱')).toBe('ai');
    expect(pinyinSortKey('银行')).toBe('yin hang');
  });

  it('writes ü as u, matching the vocabulary list', () => {
    expect(pinyinSortKey('女')).toBe('nu');
    expect(pinyinSortKey('绿色')).toBe('lu se');
  });

  it('orders hanzi the way a dictionary would', () => {
    const words = ['我', '爱', '的', '银行', '你好'];
    const sorted = [...words].sort((a, b) => pinyinSortKey(a).localeCompare(pinyinSortKey(b)));

    expect(sorted).toEqual(['爱', '的', '你好', '我', '银行']);
  });
});
