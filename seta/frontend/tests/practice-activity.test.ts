import { describe, expect, it } from 'vitest';

import {
  MAX_TAKE_MS,
  SILENCE_TAIL_MS,
  initialActivity,
  observe,
  peak,
  rms,
  shouldFinish,
} from '../src/practice/activity';

const fold = (levels: number[], frameMs = 10) =>
  levels.reduce((state, level) => observe(state, level, frameMs), initialActivity());

describe('voice activity', () => {
  it('measures level the way the watcher does', () => {
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5, 5);
    expect(peak(new Float32Array([0.1, -0.7, 0.3]))).toBeCloseTo(0.7, 5);
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it('only finishes after speech followed by a pause', () => {
    // silence alone never triggers a finish: the learner may not have started
    const waiting = fold(Array(SILENCE_TAIL_MS).fill(0));
    expect(waiting.heardSpeech).toBe(false);
    expect(shouldFinish(waiting)).toBe(false);

    const spoke = fold([0, 0, 0.4, 0.5, 0.4, ...Array(20).fill(0)]);
    expect(spoke.heardSpeech).toBe(true);
    expect(shouldFinish(spoke)).toBe(false); // 200 ms of quiet is not a pause

    const finished = fold([0, 0.4, 0.5, 0.3, ...Array(SILENCE_TAIL_MS / 10 + 1).fill(0)]);
    expect(shouldFinish(finished)).toBe(true);
  });

  it('never runs past the maximum take', () => {
    const endless = fold(Array(MAX_TAKE_MS / 10).fill(0.3));
    expect(endless.silenceMs).toBe(0);
    expect(shouldFinish(endless)).toBe(true);
  });

  it('resets the quiet counter when speech resumes', () => {
    const state = fold([0.4, 0, 0, 0.4, 0]);
    expect(state.silenceMs).toBe(10);
    expect(state.heardSpeech).toBe(true);
  });
});
