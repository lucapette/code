/* ==========================================================================
   seta — expected pronunciation
   Turns the Chinese of a saved item into the token sequence the assessment
   model expects: one token per syllable, pinyin plus tone, in the vocabulary's
   spelling (lv4, le5 — not lü4 or le0).

   Two things here are language, not plumbing:

   - the neutral tone. pinyin-pro spells it `0` (le0); the model was trained
     with it forced to `5` (le5).
   - third-tone sandhi. 你好 is written ni3 hao3 and *said* ni2 hao3, and the
     model grades what was said. Without this every 3+3 phrase would be marked
     wrong, which is exactly the kind of false feedback that makes a learner
     distrust the tool.
   ========================================================================== */

import { pinyin } from 'pinyin-pro';

/** One expected syllable. `token` is the dictionary tone (what the character
    says); `surface` is what is actually pronounced after sandhi. Grading
    accepts either, because a beginner reading 你好 slowly will say nǐ hǎo and a
    fluent speaker will say ní hǎo — neither is a mistake worth flagging. */
export interface ExpectedSyllable {
  token: string;
  surface: string;
  accepted: string[];
  text: string;
  index: number;
}

const SYLLABLE = /^[a-z]+[1-5]$/;

/** Reads a Chinese string into expected syllables, sandhi applied. */
export function expectedSyllables(chinese: string): ExpectedSyllable[] {
  const characters = Array.from(chinese);
  if (characters.length === 0) return [];

  const raw = pinyin(chinese, { type: 'array', toneType: 'num', v: true });

  const syllables: ExpectedSyllable[] = [];
  raw.forEach((value, index) => {
    const token = normaliseToken(value);
    if (!token) return; // punctuation, latin, anything the model cannot grade
    syllables.push({
      token,
      surface: token,
      accepted: [token],
      text: characters[index] ?? '',
      index,
    });
  });

  return applyThirdToneSandhi(syllables);
}

/** pinyin-pro writes neutral tone as `0`; the model's vocabulary uses `5`.
    Returns null for anything that is not a pinyin syllable. */
export function normaliseToken(raw: string): string | null {
  const token = raw.trim().toLowerCase();
  if (/^[a-z]+0$/.test(token)) return `${token.slice(0, -1)}5`;
  return SYLLABLE.test(token) ? token : null;
}

/** 3+3 → 2+3 across a run of adjacent third tones: all but the last rise, which
    is how 我很好 (wo3 hen3 hao3) is actually pronounced. Both the dictionary tone
    and the sandhi form stay acceptable. */
export function applyThirdToneSandhi(syllables: ExpectedSyllable[]): ExpectedSyllable[] {
  const out = syllables.map((syllable) => ({ ...syllable, accepted: [...syllable.accepted] }));

  let start = 0;
  while (start < out.length) {
    if (!isThirdTone(out[start])) {
      start++;
      continue;
    }

    let end = start + 1;
    while (end < out.length && isThirdTone(out[end]) && out[end].index === out[end - 1].index + 1) {
      end++;
    }

    for (let i = start; i < end - 1; i++) {
      out[i].surface = `${out[i].token.slice(0, -1)}2`;
      if (!out[i].accepted.includes(out[i].surface)) out[i].accepted.push(out[i].surface);
    }
    start = end;
  }

  return out;
}

function isThirdTone(syllable: ExpectedSyllable): boolean {
  return syllable.token.endsWith('3');
}
