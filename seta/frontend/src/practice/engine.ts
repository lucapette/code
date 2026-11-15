/* ==========================================================================
   seta — the assessment engine
   Loads the pronunciation model once, runs it on a recording, and hands back
   per-syllable verdicts. Everything heavy lives behind this module so the
   component only deals with "start / stop / show results".

   The model is not committed (third-party weights, no stated licence): it is
   fetched by `make model` into a gitignored directory and embedded at build
   time. When it is missing the module reports unavailable and the practice
   buttons never appear.
   ========================================================================== */

// the wasm-only entry: the default one also pulls a 29 MB jsep/webgpu binary
// we never use
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';

import { prepareForAssessment } from './audio';
import { MEL, features } from './mel';
import { assess, type Assessment } from './grade';
import { expectedSyllables } from './tokens';

const MODEL_PATH = '/models/tiny_int8.onnx';
const VOCAB_PATH = '/models/vocab.json';

interface Loaded {
  session: ort.InferenceSession;
  vocab: string[];
}

let loading: Promise<Loaded> | null = null;

/** True when the model files are present in this build. */
export async function modelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(MODEL_PATH, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Loads (once) and caches the session and vocabulary. */
export function loadModel(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      // The wasm binary is emitted as a hashed asset by the bundler; tell the
      // runtime where to find it.
      if (typeof window !== 'undefined') {
        ort.env.wasm.wasmPaths = { wasm: wasmUrl };
      }

      const [model, vocab] = await Promise.all([
        fetch(MODEL_PATH).then((res) => {
          if (!res.ok) throw new Error('practice model is not installed');
          return res.arrayBuffer();
        }),
        fetch(VOCAB_PATH).then((res) => {
          if (!res.ok) throw new Error('practice vocabulary is not installed');
          return res.json() as Promise<string[]>;
        }),
      ]);

      const session = await ort.InferenceSession.create(model, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      return { session, vocab };
    })().catch((error: unknown) => {
      loading = null; // let the next attempt retry
      throw error;
    });
  }
  return loading;
}

/** Grades one recording of `chinese`. */
export async function assessRecording(audio: Float32Array, chinese: string): Promise<Assessment> {
  const { session, vocab } = await loadModel();

  const prepared = prepareForAssessment(audio);
  const { feats, frames } = features(prepared);
  if (frames === 0) throw new Error('nothing was recorded');

  const output = await session.run({
    feats: new ort.Tensor('float32', feats, [1, frames, MEL.N_MELS]),
    feat_lens: new ort.Tensor('int64', new BigInt64Array([BigInt(frames)]), [1]),
  });

  const logits = output.logits;
  const [, time, width] = logits.dims as number[];
  if (!time || !width) throw new Error('the model returned nothing');

  return assess({
    symbols: expectedSyllables(chinese),
    vocab,
    logits: Float32Array.from(logits.data as Float32Array),
    frames: time,
  });
}
