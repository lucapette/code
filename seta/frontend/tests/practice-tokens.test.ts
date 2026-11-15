import { describe, expect, it } from 'vitest';

import { applyThirdToneSandhi, expectedSyllables, normaliseToken } from '../src/practice/tokens';

const tokens = (text: string) => expectedSyllables(text).map((syllable) => syllable.token);

describe('normaliseToken', () => {
  it('keeps pinyin with a tone number', () => {
    expect(normaliseToken('ni3')).toBe('ni3');
    expect(normaliseToken('lv4')).toBe('lv4');
  });

  it('rewrites the neutral tone the way the model spells it', () => {
    expect(normaliseToken('le0')).toBe('le5');
    expect(normaliseToken('de0')).toBe('de5');
  });

  it('rejects anything that is not a syllable', () => {
    expect(normaliseToken('，')).toBeNull();
    expect(normaliseToken('world')).toBeNull();
    expect(normaliseToken('ni')).toBeNull();
    expect(normaliseToken('')).toBeNull();
  });
});

describe('expectedSyllables', () => {
  it('reads one token per character with its tone', () => {
    expect(tokens('你好')).toEqual(['ni3', 'hao3']);
    expect(tokens('谢谢')).toEqual(['xie4', 'xie4']);
    expect(tokens('绿色')).toEqual(['lv4', 'se4']);
  });

  it('records third-tone sandhi as a surface form, keeping the citation tone', () => {
    // 我很好: three third tones in a row → said wo2 hen2 hao3, written wo3 hen3 hao3
    const syllables = expectedSyllables('我很好');
    expect(syllables.map((syllable) => syllable.token)).toEqual(['wo3', 'hen3', 'hao3']);
    expect(syllables.map((syllable) => syllable.surface)).toEqual(['wo2', 'hen2', 'hao3']);
    expect(syllables.map((syllable) => syllable.accepted)).toEqual([
      ['wo3', 'wo2'],
      ['hen3', 'hen2'],
      ['hao3'],
    ]);
    // a single third tone is untouched
    expect(tokens('好')).toEqual(['hao3']);
  });

  it('leaves the neutral tone alone and out of sandhi runs', () => {
    expect(tokens('我来了')).toEqual(['wo3', 'lai2', 'le5']);
    expect(tokens('漂亮')).toEqual(['piao4', 'liang5']);
  });

  it('trusts pinyin-pro for the 不 and 一 rules', () => {
    // 不 bù → bú before a fourth tone; 一 yī → yí before a fourth tone.
    expect(tokens('不是')).toEqual(['bu2', 'shi4']);
    expect(tokens('一个')).toEqual(['yi2', 'ge4']);
  });

  it('skips punctuation, latin and digits but keeps character positions', () => {
    const syllables = expectedSyllables('你好，world');

    // citation tones are kept; the sandhi form is what `surface` carries
    expect(syllables.map((syllable) => syllable.token)).toEqual(['ni3', 'hao3']);
    expect(syllables.map((syllable) => syllable.surface)).toEqual(['ni2', 'hao3']);
    expect(syllables.map((syllable) => syllable.index)).toEqual([0, 1]);
    expect(syllables.map((syllable) => syllable.text)).toEqual(['你', '好']);
  });

  it('does not carry a sandhi run across punctuation', () => {
    expect(tokens('好。好')).toEqual(['hao3', 'hao3']);
  });

  it('returns nothing for text with no pinyin', () => {
    expect(expectedSyllables('hello world')).toEqual([]);
    expect(expectedSyllables('')).toEqual([]);
  });
});

describe('applyThirdToneSandhi', () => {
  it('only rewrites the tones before the last of a run', () => {
    const input = [0, 1, 2].map((index) => ({
      token: 'hao3',
      surface: 'hao3',
      accepted: ['hao3'],
      text: '好',
      index,
    }));

    const sandhi = applyThirdToneSandhi(input);
    expect(sandhi.map((syllable) => syllable.surface)).toEqual(['hao2', 'hao2', 'hao3']);
    expect(sandhi.map((syllable) => syllable.token)).toEqual(['hao3', 'hao3', 'hao3']);
    expect(sandhi[0].accepted).toEqual(['hao3', 'hao2']);

    // the input is not mutated
    expect(input.map((syllable) => syllable.surface)).toEqual(['hao3', 'hao3', 'hao3']);
  });

  it('does not touch syllables separated by a gap', () => {
    const input = [0, 5].map((index) => ({
      token: 'hao3',
      surface: 'hao3',
      accepted: ['hao3'],
      text: '好',
      index,
    }));

    expect(applyThirdToneSandhi(input).map((syllable) => syllable.surface)).toEqual(['hao3', 'hao3']);
  });
});
