/* ==========================================================================
   seta — preparing a recording for assessment
   The model wants a bit of silence in front of the speech. Measured, not
   guessed: on macOS-synthesised clips with no lead-in, 你好 came back as
   "mei3 hao3" and 谢谢 as "shi4 shi4"; with ~0.5 s of lead silence both are
   recognised, and short clips stay stable across 0.4–0.6 s.

   A microphone recording usually has some of that silence already (press
   record, then speak), so this pads rather than replaces: half a second in
   front, a hair behind, and never trims what the learner actually said.
   ========================================================================== */

const LEAD_SECONDS = 0.5;
const TRAIL_SECONDS = 0.1;

export const PADDING = { lead: LEAD_SECONDS, trail: TRAIL_SECONDS } as const;

/** Pads the recording with silence, without changing its contents. */
export function prepareForAssessment(
  audio: Float32Array,
  { lead = LEAD_SECONDS, trail = TRAIL_SECONDS } = PADDING,
): Float32Array {
  if (audio.length === 0) return audio;

  const before = Math.round(lead * 16000);
  const after = Math.round(trail * 16000);
  const padded = new Float32Array(audio.length + before + after);
  padded.set(audio, before);
  return padded;
}
