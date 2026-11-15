import { describe, expect, it } from 'vitest';

import { MEL, features, melFrames, normalise } from '../src/practice/mel';

const sine = (hz: number, seconds: number, sampleRate = 16000, amplitude = 0.5) => {
  const samples = Math.round(seconds * sampleRate);
  const audio = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    audio[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  }
  return audio;
};

describe('mel frontend', () => {
  it('frames a second of audio the way torchaudio does', () => {
    // reflect padding of 200 samples each side, then hop 160:
    // floor((16000 + 400 - 400) / 160) + 1 = 101
    expect(melFrames(sine(440, 1))).toHaveLength(101);
  });

  it('reports silence at the dB floor', () => {
    const frames = melFrames(new Float32Array(16000));

    expect(frames).toHaveLength(101);
    for (const frame of frames) {
      expect(frame).toHaveLength(MEL.N_MELS);
      for (const value of frame) expect(value).toBeCloseTo(-100, 5); // 10·log10(1e-10)
    }
  });

  it('puts a sine tone in the mel bins around its frequency', () => {
    const frames = normalise(melFrames(sine(1000, 0.5)));
    const middle = frames[Math.floor(frames.length / 2)];

    let loudest = 0;
    for (let m = 1; m < MEL.N_MELS; m++) {
      if (middle[m] > middle[loudest]) loudest = m;
    }

    // 80 mel bins over 0–8 kHz put 1 kHz near bin 28 (mel(1 kHz)/mel(8 kHz)
    // ≈ 0.35 of the range). Anything near that means the filterbank is sane.
    expect(loudest).toBeGreaterThanOrEqual(25);
    expect(loudest).toBeLessThanOrEqual(31);
  });

  it('normalises every bin to zero mean and unit variance', () => {
    const frames = normalise(melFrames(sine(300, 0.4)));

    for (let m = 0; m < MEL.N_MELS; m++) {
      const values = frames.map((frame) => frame[m]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;

      expect(mean).toBeCloseTo(0, 4);
      // bins the tone never reaches sit at the dB floor: std stays tiny
      if (variance > 1e-6) expect(Math.sqrt(variance)).toBeCloseTo(1, 3);
    }
  });

  it('flattens to the model input shape', () => {
    const { feats, frames } = features(sine(440, 0.2));

    expect(frames).toBeGreaterThan(10);
    expect(feats).toHaveLength(frames * MEL.N_MELS);
  });

  it('handles empty audio without throwing', () => {
    expect(melFrames(new Float32Array(0))).toEqual([]);
    expect(features(new Float32Array(0))).toEqual({ feats: new Float32Array(0), frames: 0 });
  });
});
