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
