/* ==========================================================================
   seta — CTC alignment and scoring
   The model emits one distribution per 10 ms frame; this module turns that into
   "which frames were this syllable, and how sure was the model about it".
   Two pieces:

   - forced alignment (Viterbi over the collapsed pinyin+tone sequence) — where
     each expected syllable sits in time;
   - span confidence — how strongly the model believed that syllable, computed
     over the frames that are actually speech. Averaging the whole span is the
     bug the model's author hit: a pause before the first word is all <blank>,
     which drags a perfectly good syllable down to 0.0.
   ========================================================================== */

export interface Span {
  /** First frame of the syllable. */
  start: number;
  /** One past the last frame. */
  end: number;
}

export interface Alignment {
  spans: Span[];
  /** Log-probability of the best path through the target sequence. */
  score: number;
}

/** Row-wise log-softmax over (frames × vocab) logits. */
export function logSoftmax(logits: Float32Array, frames: number, vocab: number): Float32Array {
  const out = new Float32Array(frames * vocab);
  for (let t = 0; t < frames; t++) {
    const row = t * vocab;
    let max = logits[row];
    for (let v = 1; v < vocab; v++) max = Math.max(max, logits[row + v]);

    let sum = 0;
    for (let v = 0; v < vocab; v++) sum += Math.exp(logits[row + v] - max);
    const logSum = Math.log(sum);

    for (let v = 0; v < vocab; v++) out[row + v] = logits[row + v] - max - logSum;
  }
  return out;
}

/** Viterbi forced alignment of `targets` (token ids, no blanks) to the frames. */
export function forcedAlign(
  logProbs: Float32Array,
  frames: number,
  vocab: number,
  targets: number[],
  blank = 0,
): Alignment {
  if (targets.length === 0 || frames === 0) return { spans: [], score: 0 };

  const states = targets.length * 2 + 1;
  const stateLabel = (state: number) => (state % 2 === 0 ? blank : targets[(state - 1) / 2]);

  const NEG = -Infinity;
  const alpha = new Float32Array(frames * states).fill(NEG);

  alpha[stateLabel(0)] = logProbs[stateLabel(0)];
  if (states > 1) alpha[1] = logProbs[stateLabel(1)];

  for (let t = 1; t < frames; t++) {
    const row = t * states;
    const previous = (t - 1) * states;
    for (let s = 0; s < states; s++) {
      let best = alpha[previous + s];
      if (s >= 1) best = Math.max(best, alpha[previous + s - 1]);
      // A repeated label needs a blank between its two emissions.
      if (s >= 2 && stateLabel(s) !== blank && stateLabel(s) !== stateLabel(s - 2)) {
        best = Math.max(best, alpha[previous + s - 2]);
      }
      if (best === NEG) continue;
      alpha[row + s] = best + logProbs[t * vocab + stateLabel(s)];
    }
  }

  const last = (frames - 1) * states;
  let finalState = states - 1;
  let finalScore = alpha[last + states - 1];
  if (states > 1 && alpha[last + states - 2] > finalScore) {
    finalState = states - 2;
    finalScore = alpha[last + states - 2];
  }

  // Walk back to recover which frames each state owns.
  const spans: Span[] = targets.map(() => ({ start: frames, end: 0 }));
  let state = finalState;
  for (let t = frames - 1; t >= 0; t--) {
    if (state % 2 === 1) {
      const index = (state - 1) / 2;
      spans[index].start = Math.min(spans[index].start, t);
      spans[index].end = Math.max(spans[index].end, t + 1);
    }

    if (t === 0) break;
    const previous = (t - 1) * states;
    const stay = alpha[previous + state];
    const back = state >= 1 ? alpha[previous + state - 1] : NEG;

    let skip = NEG;
    if (state >= 2 && stateLabel(state) !== blank && stateLabel(state) !== stateLabel(state - 2)) {
      skip = alpha[previous + state - 2];
    }

    const choice = Math.max(stay, back, skip);
    if (choice === back) state -= 1;
    else if (choice === skip) state -= 2;
  }

  return { spans, score: finalScore };
}

/** Collapses the argmax path: what the model thinks it heard, in order. */
export function greedyDecode(
  logProbs: Float32Array,
  frames: number,
  vocab: number,
  blank = 0,
): number[] {
  const tokens: number[] = [];
  let previous = -1;

  for (let t = 0; t < frames; t++) {
    let best = 0;
    let bestValue = logProbs[t * vocab];
    for (let v = 1; v < vocab; v++) {
      const value = logProbs[t * vocab + v];
      if (value > bestValue) {
        bestValue = value;
        best = v;
      }
    }
    if (best !== blank && best !== previous) tokens.push(best);
    previous = best;
  }

  return tokens;
}

/** Frames of a span that are actually speech: those the model does not think
    are silence. Falls back to the whole span when the span is all pause. */
export function speechFrames(
  logProbs: Float32Array,
  vocab: number,
  span: Span,
  blank = 0,
  threshold = 0.7,
): number[] {
  const kept: number[] = [];
  for (let t = span.start; t < span.end; t++) {
    if (Math.exp(logProbs[t * vocab + blank]) < threshold) kept.push(t);
  }
  if (kept.length > 0) return kept;

  const all: number[] = [];
  for (let t = span.start; t < span.end; t++) all.push(t);
  return all;
}

/** How sure the model was about `target` across the speech frames of a span. */
export function spanConfidence(
  logProbs: Float32Array,
  vocab: number,
  span: Span,
  target: number,
  blank = 0,
): number {
  const frames = speechFrames(logProbs, vocab, span, blank);
  if (frames.length === 0) return 0;

  let total = 0;
  for (const t of frames) total += logProbs[t * vocab + target];
  return Math.exp(total / frames.length);
}

/** The token the model would assign to a span: "what it heard". */
export function heardToken(
  logProbs: Float32Array,
  vocab: number,
  span: Span,
  blank = 0,
): number {
  const frames = speechFrames(logProbs, vocab, span, blank);
  if (frames.length === 0) return blank;

  const totals = new Float64Array(vocab);
  for (const t of frames) {
    for (let v = 0; v < vocab; v++) totals[v] += logProbs[t * vocab + v];
  }
  totals[blank] = -Infinity; // "silence" is never the answer to "what did you say"

  let best = blank;
  let bestValue = -Infinity;
  for (let v = 0; v < vocab; v++) {
    if (totals[v] > bestValue) {
      bestValue = totals[v];
      best = v;
    }
  }
  return best;
}
