/* ==========================================================================
   seta — voice activity
   Two jobs while the learner talks: notice that they have started, and notice
   that they have stopped. Without the second one "practice" needs two presses
   and a guess about how long to leave it running, which is exactly the kind of
   thing that makes a button feel broken.
   ========================================================================== */

/** Below this RMS a frame is silence. Quiet rooms and laptop mics sit far
    lower; speech rarely dips this far for long. */
export const SPEECH_RMS = 0.012;

/** How long a pause has to last before the take is considered finished. */
export const SILENCE_TAIL_MS = 900;

/** Hard stop, so a forgotten take cannot record forever. */
export const MAX_TAKE_MS = 10_000;

export interface ActivityState {
  heardSpeech: boolean;
  silenceMs: number;
  elapsedMs: number;
}

export function initialActivity(): ActivityState {
  return { heardSpeech: false, silenceMs: 0, elapsedMs: 0 };
}

/** Folds one 10 ms frame of RMS into the activity state. */
export function observe(state: ActivityState, rms: number, frameMs = 10): ActivityState {
  const voiced = rms >= SPEECH_RMS;
  return {
    heardSpeech: state.heardSpeech || voiced,
    silenceMs: voiced ? 0 : state.silenceMs + frameMs,
    elapsedMs: state.elapsedMs + frameMs,
  };
}

/** True when the take should end by itself. */
export function shouldFinish(state: ActivityState): boolean {
  if (state.elapsedMs >= MAX_TAKE_MS) return true;
  return state.heardSpeech && state.silenceMs >= SILENCE_TAIL_MS;
}

/** Root mean square of a buffer, the same measure the watcher uses. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

/** Peak absolute amplitude, for "did we record anything at all?". */
export function peak(samples: Float32Array): number {
  let loudest = 0;
  for (const sample of samples) loudest = Math.max(loudest, Math.abs(sample));
  return loudest;
}
