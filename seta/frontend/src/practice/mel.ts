/* ==========================================================================
   seta — log-mel frontend for the pronunciation model
   The assessment model was trained on torchaudio's Kaldi-style features, so the
   numbers here are not arbitrary: 16 kHz mono, 25 ms frames every 10 ms, 80
   mel bins, HTK mel scale, *no* Slaney area normalisation, power → dB with an
   amin floor, and per-utterance mean/std normalisation (CMVN).

   Get any of those wrong and nothing throws — the grades just quietly get
   worse, which is the worst failure mode a study tool can have. Hence the
   constants being spelled out and the tests pinning frame counts and
   normalisation.
   ========================================================================== */

const SAMPLE_RATE = 16000;
const N_FFT = 400;
const HOP = 160;
const N_MELS = 80;
const F_MIN = 0;
const F_MAX = SAMPLE_RATE / 2;
const AMIN = 1e-10;
const STD_FLOOR = 1e-4;

const N_BINS = N_FFT / 2 + 1;

let window: Float32Array | null = null;
let filterbank: Float32Array[] | null = null;
let cosTable: Float32Array | null = null;
let sinTable: Float32Array | null = null;

function hzToMel(hz: number): number {
  return 2595.0 * Math.log10(1.0 + hz / 700.0);
}

function melToHz(mel: number): number {
  return 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);
}

function tables() {
  if (window && filterbank && cosTable && sinTable) return { window, filterbank, cosTable, sinTable };

  // Periodic Hann, as torch.hann_window(400) gives it.
  const w = new Float32Array(N_FFT);
  for (let i = 0; i < N_FFT; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N_FFT));

  // Triangular filters evenly spaced on the mel scale between F_MIN and F_MAX.
  const melMin = hzToMel(F_MIN);
  const melMax = hzToMel(F_MAX);
  const hz: number[] = [];
  for (let i = 0; i < N_MELS + 2; i++) {
    hz.push(melToHz(melMin + ((melMax - melMin) * i) / (N_MELS + 1)));
  }

  const bank: Float32Array[] = [];
  for (let m = 0; m < N_MELS; m++) {
    const filter = new Float32Array(N_BINS);
    const [left, centre, right] = [hz[m], hz[m + 1], hz[m + 2]];
    for (let k = 0; k < N_BINS; k++) {
      const freq = (k * SAMPLE_RATE) / N_FFT;
      if (freq >= left && freq <= centre) filter[k] = (freq - left) / (centre - left);
      else if (freq > centre && freq <= right) filter[k] = (right - freq) / (right - centre);
    }
    bank.push(filter);
  }

  // A direct DFT at 400 points is what the training pipeline did (400 is not a
  // power of two), so precompute its twiddles rather than pad the frame.
  const cos = new Float32Array(N_BINS * N_FFT);
  const sin = new Float32Array(N_BINS * N_FFT);
  for (let k = 0; k < N_BINS; k++) {
    for (let t = 0; t < N_FFT; t++) {
      const angle = (-2 * Math.PI * k * t) / N_FFT;
      cos[k * N_FFT + t] = Math.cos(angle);
      sin[k * N_FFT + t] = Math.sin(angle);
    }
  }

  window = w;
  filterbank = bank;
  cosTable = cos;
  sinTable = sin;
  return { window, filterbank, cosTable, sinTable };
}

/** Reflect-pads and frames the signal the way `torch.stft(center=True)` does. */
function frame(audio: Float32Array): Float32Array[] {
  const pad = Math.floor(N_FFT / 2);
  const padded = new Float32Array(audio.length + 2 * pad);

  for (let i = 0; i < pad; i++) {
    padded[pad - 1 - i] = audio[Math.min(i + 1, audio.length - 1)] ?? 0;
    padded[pad + audio.length + i] = audio[Math.max(audio.length - 2 - i, 0)] ?? 0;
  }
  padded.set(audio, pad);

  const count = Math.floor((padded.length - N_FFT) / HOP) + 1;
  const frames: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(padded.subarray(i * HOP, i * HOP + N_FFT));
  }
  return frames;
}

/** Raw log-mel frames (dB), before normalisation. Rows are time, columns mel. */
export function melFrames(audio: Float32Array): Float32Array[] {
  if (audio.length === 0) return [];
  const { window: w, filterbank: bank, cosTable: cos, sinTable: sin } = tables();

  const frames = frame(audio);
  const out: Float32Array[] = [];

  for (const raw of frames) {
    const windowed = new Float32Array(N_FFT);
    for (let i = 0; i < N_FFT; i++) windowed[i] = raw[i] * w[i];

    const power = new Float32Array(N_BINS);
    for (let k = 0; k < N_BINS; k++) {
      let re = 0;
      let im = 0;
      const offset = k * N_FFT;
      for (let t = 0; t < N_FFT; t++) {
        re += windowed[t] * cos[offset + t];
        im += windowed[t] * sin[offset + t];
      }
      power[k] = re * re + im * im;
    }

    const mel = new Float32Array(N_MELS);
    for (let m = 0; m < N_MELS; m++) {
      let sum = 0;
      const filter = bank[m];
      for (let k = 0; k < N_BINS; k++) sum += power[k] * filter[k];
      mel[m] = 10.0 * Math.log10(Math.max(sum, AMIN));
    }
    out.push(mel);
  }

  return out;
}

/** Per-utterance mean/std normalisation, in place on a copy. */
export function normalise(frames: Float32Array[]): Float32Array[] {
  if (frames.length === 0) return frames;

  for (let m = 0; m < N_MELS; m++) {
    let sum = 0;
    let squares = 0;
    for (const row of frames) sum += row[m];
    const mean = sum / frames.length;
    for (const row of frames) squares += (row[m] - mean) ** 2;
    const std = Math.max(Math.sqrt(squares / frames.length), STD_FLOOR);
    for (const row of frames) row[m] = (row[m] - mean) / std;
  }
  return frames;
}

/** The model's input: normalised log-mel, flattened row-major, plus frame count. */
export function features(audio: Float32Array): { feats: Float32Array; frames: number } {
  const frames = normalise(melFrames(audio));
  const feats = new Float32Array(frames.length * N_MELS);
  frames.forEach((row, index) => feats.set(row, index * N_MELS));
  return { feats, frames: frames.length };
}

export const MEL = { SAMPLE_RATE, N_FFT, HOP, N_MELS, N_BINS } as const;
