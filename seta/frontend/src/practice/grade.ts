/* ==========================================================================
   seta — grading a spoken attempt
   Ties the pieces together: expected syllables in, per-syllable verdicts out.
   The verdicts are deliberately three-way rather than right/wrong:

     ok        the model heard the syllable you were meant to say
     tone      same syllable, wrong tone — the thing this app exists for
     syllable  a different syllable entirely (a consonant or vowel problem)
     unclear   the model was not confident enough to accuse you of anything

   "unclear" matters. A tool that marks a correct attempt wrong because the room
   was noisy teaches the learner to ignore it.
   ========================================================================== */

import { forcedAlign, heardToken, logSoftmax, spanConfidence } from './ctc';
import type { ExpectedSyllable } from './tokens';

export type Verdict = 'ok' | 'tone' | 'syllable' | 'unclear';

/** The model is only believed when it was at least this sure. */
const CONFIDENT = 0.5;

export interface SyllableResult {
  /** The dictionary tone, e.g. "ni3". */
  expected: string;
  /** The sandhi form when it differs, e.g. "ni2" for 你好. */
  surface: string;
  /** What the model heard, e.g. "ni3". Null when the syllable is not in the vocabulary. */
  heard: string | null;
  /** The character this syllable belongs to, for highlighting. */
  text: string;
  index: number;
  /** 0–1: how strongly the model believed this span. */
  confidence: number;
  verdict: Verdict;
}

export interface Assessment {
  syllables: SyllableResult[];
  /** Share of gradeable syllables confirmed right, 0–100. */
  score: number;
  /** How many syllables the model could not judge — never counted as correct. */
  unclear: number;
  /** The pinyin the model actually heard, for the "I heard …" line. */
  heardText: string;
}

export interface AssessOptions {
  symbols: ExpectedSyllable[];
  /** vocabulary, index = token id */
  vocab: string[];
  /** model output: frames × vocab, flattened */
  logits: Float32Array;
  frames: number;
}

export function assess({ symbols, vocab, logits, frames }: AssessOptions): Assessment {
  const empty: Assessment = { syllables: [], score: 0, unclear: 0, heardText: '' };
  if (symbols.length === 0 || frames === 0) return empty;

  const ids = new Map<string, number>();
  vocab.forEach((token, id) => ids.set(token, id));

  const gradeable = symbols.filter((symbol) => ids.has(symbol.token));
  const skipped: SyllableResult[] = symbols
    .filter((symbol) => !ids.has(symbol.token))
    .map((symbol) => ({
      expected: symbol.token,
      surface: symbol.surface,
      heard: null,
      text: symbol.text,
      index: symbol.index,
      confidence: 0,
      verdict: 'unclear' as Verdict,
    }));

  if (gradeable.length === 0) {
    return { syllables: skipped, score: 0, unclear: skipped.length, heardText: '' };
  }

  const logProbs = logSoftmax(logits, frames, vocab.length);
  const targets = gradeable.map((symbol) => ids.get(symbol.token) as number);
  const alignment = forcedAlign(logProbs, frames, vocab.length, targets);

  const results: SyllableResult[] = gradeable.map((symbol, i) => {
    const span = alignment.spans[i];
    const confidence = spanConfidence(logProbs, vocab.length, span, targets[i]);
    const heardId = heardToken(logProbs, vocab.length, span);
    const heard = vocab[heardId] ?? null;

    return {
      expected: symbol.token,
      surface: symbol.surface,
      heard,
      text: symbol.text,
      index: symbol.index,
      confidence,
      verdict: verdictFor(symbol, heard, confidence),
    };
  });

  const ok = results.filter((result) => result.verdict === 'ok').length;

  return {
    syllables: mergeByIndex(results, skipped),
    // Unclear syllables stay in the denominator: "we could not judge it" is not
    // the same as "you said it right", and a score that quietly counts them as
    // correct teaches the learner nothing.
    score: Math.round((ok / (results.length + skipped.length)) * 100),
    unclear: results.filter((result) => result.verdict === 'unclear').length + skipped.length,
    heardText: results.map((result) => result.heard ?? '?').join(' '),
  };
}

function verdictFor(expected: ExpectedSyllable, heard: string | null, confidence: number): Verdict {
  if (heard === null) return 'unclear';
  // Either the dictionary tone or its sandhi form counts as correct, and a
  // confirmation needs no confidence: the model agreed, that is that.
  if (expected.accepted.includes(heard)) return 'ok';
  if (confidence < CONFIDENT) return 'unclear';
  return base(heard) === base(expected.token) ? 'tone' : 'syllable';
}

/** "ni3" → "ni": the part that is not the tone. */
function base(token: string): string {
  return token.replace(/[1-5]$/, '');
}

/** Keep the results in the order the characters appear. */
function mergeByIndex(gradeable: SyllableResult[], skipped: SyllableResult[]): SyllableResult[] {
  return [...gradeable, ...skipped].sort((a, b) => a.index - b.index);
}
