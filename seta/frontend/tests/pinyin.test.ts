import { describe, expect, it } from 'vitest';

import { pinyinFor } from '../src/pinyin';

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
