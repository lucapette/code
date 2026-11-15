/* ==========================================================================
   seta — recording the learner
   MediaRecorder (widest browser support, no AudioWorklet plumbing) then decode
   and resample to the 16 kHz mono the model expects. Nothing leaves the page:
   the buffer goes straight into the model in this tab.
   ========================================================================== */

/** What the model was trained on. */
export const MODEL_RATE = 16000;

/** A permission prompt the user never answers must not leave the button dead
    forever; a browser that simply hangs is worse than one that refuses. */
const PERMISSION_TIMEOUT_MS = 10_000;

export interface Recorder {
  /** Stops recording and resolves the audio, resampled for the model. */
  stop(): Promise<Float32Array>;
  /** Stops and throws the audio away. */
  cancel(): void;
}

export async function startRecording(): Promise<Recorder> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('this browser cannot record audio');
  }

  const stream = await withTimeout(
    navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    }),
    PERMISSION_TIMEOUT_MS,
  );

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.start();

  const release = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  return {
    async stop() {
      const stopped = new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true });
      });
      recorder.stop();
      await stopped;
      release();

      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      return toModelAudio(await blob.arrayBuffer());
    },
    cancel() {
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('microphone permission was not granted')),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('could not start recording'));
      },
    );
  });
}

/** Decodes whatever the browser recorded and resamples it to 16 kHz mono. */
export async function toModelAudio(encoded: ArrayBuffer): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, 1, MODEL_RATE);

  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(encoded.slice(0));
  } catch {
    throw new Error('that recording could not be read — try again, a touch longer');
  }

  const channels = decoded.numberOfChannels;
  const length = decoded.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channels; channel++) {
    const data = decoded.getChannelData(channel);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }

  return resample(mono, decoded.sampleRate, MODEL_RATE);
}

/** Linear-interpolation resampling: mono speech, small ratios, good enough and
    easy to reason about. */
export function resample(input: Float32Array, fromRate: number, toRate = MODEL_RATE): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;

  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const fraction = position - left;
    const a = input[left] ?? 0;
    const b = input[left + 1] ?? a;
    out[i] = a + (b - a) * fraction;
  }
  return out;
}
