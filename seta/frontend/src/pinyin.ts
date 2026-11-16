/* ==========================================================================
   seta — pinyin annotation
   Tone-marked pinyin for the streamed translation, computed locally from the
   accumulated hanzi. pinyin-pro is word-aware: common polyphones (银行 yín
   háng, 音乐 yīn yuè, 来了 lái le) are resolved by context, which a
   per-character table gets wrong — the reason this lives here and not as a
   character-level pass in Go. Pure string in, string out; the tests pin the
   hard cases.
   ========================================================================== */

import { pinyin } from 'pinyin-pro';

/** CJK punctuation the converter pads with spaces; hugging it reads better. */
const CJK_PUNCT = '，。！？；：、…（）「」『』';

/** Sort keys are short and asked for on every render; the same handful of
    Chinese strings would otherwise be converted over and over. */
const sortKeys = new Map<string, string>();

/** Converts Chinese text to tone-marked pinyin. Non-Chinese characters
    (punctuation, latin) pass through; spaces the converter inserts around
    CJK punctuation are removed. */
export function pinyinFor(text: string): string {
  const raw = pinyin(text, { toneType: 'symbol', type: 'string', nonZh: 'consecutive' });
  return raw
    .replace(new RegExp(`\\s+([${CJK_PUNCT}])`, 'g'), '$1')
    .replace(new RegExp(`([${CJK_PUNCT}])\\s+`, 'g'), '$1')
    .trim();
}

/**
 * The key a list sorts on: pinyin without tone marks, ü written as u. Sorting
 * the tone-marked text itself would order by code point — "ài" after "zuò" —
 * which is not alphabetical to anyone reading it. Kept in step with the Go
 * side's foldTones, so the library and the HSK list agree on where a word goes.
 */
export function pinyinSortKey(text: string): string {
  const cached = sortKeys.get(text);
  if (cached !== undefined) return cached;

  const syllables = pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' });
  const key = syllables.join(' ').toLowerCase().replace(/ü/g, 'u');
  sortKeys.set(text, key);
  return key;
}
