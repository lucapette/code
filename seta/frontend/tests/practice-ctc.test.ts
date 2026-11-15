import { describe, expect, it } from 'vitest';

import {
  forcedAlign,
  greedyDecode,
  heardToken,
  logSoftmax,
  spanConfidence,
  speechFrames,
} from '../src/practice/ctc';

const vocab = ['<blank>', '<unk>', 'ni2', 'ni3', 'hao3', 'ma1'];
const id = (token: string) => vocab.indexOf(token);

/** Builds logits where each token owns a run of frames, with blank elsewhere. */
function logitsFor(segments: { token: string; frames: number }[], leadBlank = 5, trailBlank = 5) {
  const rows: number[][] = [];
  const row = (winner: number) => vocab.map((_, v) => (v === winner ? 8 : 0));

  for (let i = 0; i < leadBlank; i++) rows.push(row(id('<blank>')));
  for (const segment of segments) {
    for (let i = 0; i < segment.frames; i++) rows.push(row(id(segment.token)));
  }
  for (let i = 0; i < trailBlank; i++) rows.push(row(id('<blank>')));

  const frames = rows.length;
  const logits = new Float32Array(frames * vocab.length);
  rows.forEach((values, t) => logits.set(values, t * vocab.length));
  return { logits, frames };
}

describe('logSoftmax', () => {
  it('turns each frame into a distribution', () => {
    const { logits, frames } = logitsFor([{ token: 'ni2', frames: 3 }]);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    for (let t = 0; t < frames; t++) {
      let sum = 0;
      for (let v = 0; v < vocab.length; v++) sum += Math.exp(logProbs[t * vocab.length + v]);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});

describe('forcedAlign', () => {
  it('gives each expected syllable its own span', () => {
    const { logits, frames } = logitsFor([
      { token: 'ni2', frames: 10 },
      { token: 'hao3', frames: 12 },
    ]);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    const { spans } = forcedAlign(logProbs, frames, vocab.length, [id('ni2'), id('hao3')]);

    expect(spans).toHaveLength(2);
    expect(spans[0].start).toBeLessThan(spans[1].start);
    expect(spans[0].end).toBeLessThanOrEqual(spans[1].start + 1);
    expect(spans[1].end).toBeGreaterThan(spans[1].start);
    // the first span must cover the ni2 run, not the leading silence
    expect(spans[0].start).toBeGreaterThanOrEqual(4);
  });

  it('aligns a repeated syllable through a blank', () => {
    const { logits, frames } = logitsFor([
      { token: 'hao3', frames: 6 },
      { token: 'hao3', frames: 6 },
    ]);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    const { spans } = forcedAlign(logProbs, frames, vocab.length, [id('hao3'), id('hao3')]);

    expect(spans).toHaveLength(2);
    expect(spans[0].end).toBeLessThanOrEqual(spans[1].start + 1);
  });

  it('returns nothing for an empty target list', () => {
    const { logits, frames } = logitsFor([{ token: 'ni2', frames: 4 }]);
    expect(forcedAlign(logits, frames, vocab.length, [])).toEqual({ spans: [], score: 0 });
  });
});

describe('span confidence', () => {
  it('ignores a pause in front of the syllable', () => {
    // Two seconds of pause before the syllable: averaging the whole span would
    // bury the score, which is the bug this filtering exists for.
    const { logits, frames } = logitsFor([{ token: 'ni2', frames: 8 }], 40, 2);
    const logProbs = logSoftmax(logits, frames, vocab.length);
    const span = { start: 0, end: 48 };

    const naive = (() => {
      let total = 0;
      for (let t = span.start; t < span.end; t++) total += logProbs[t * vocab.length + id('ni2')];
      return Math.exp(total / (span.end - span.start));
    })();

    expect(naive).toBeLessThan(0.5);
    expect(spanConfidence(logProbs, vocab.length, span, id('ni2'))).toBeGreaterThan(0.95);
    expect(speechFrames(logProbs, vocab.length, span)).toHaveLength(8);
  });

  it('falls back to the whole span when it is pure silence', () => {
    const { logits, frames } = logitsFor([], 10, 0);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    expect(speechFrames(logProbs, vocab.length, { start: 0, end: 10 })).toHaveLength(10);
  });
});

describe('greedyDecode', () => {
  it('collapses repeats and drops blanks', () => {
    const { logits, frames } = logitsFor([
      { token: 'ni2', frames: 8 },
      { token: 'hao3', frames: 8 },
    ]);

    expect(greedyDecode(logSoftmax(logits, frames, vocab.length), frames, vocab.length)).toEqual([
      id('ni2'),
      id('hao3'),
    ]);
  });
});

describe('heardToken', () => {
  it('reports the syllable the model heard for a span', () => {
    const { logits, frames } = logitsFor([{ token: 'ni3', frames: 10 }], 6, 4);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    expect(heardToken(logProbs, vocab.length, { start: 0, end: frames })).toBe(id('ni3'));
  });

  it('never answers "silence"', () => {
    const { logits, frames } = logitsFor([], 10, 0);
    const logProbs = logSoftmax(logits, frames, vocab.length);

    expect(heardToken(logProbs, vocab.length, { start: 0, end: frames })).toBe(id('<unk>'));
  });
});
