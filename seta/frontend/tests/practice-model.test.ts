import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as ort from 'onnxruntime-web';

import { prepareForAssessment } from '../src/practice/audio';
import { assess } from '../src/practice/grade';
import { features } from '../src/practice/mel';
import { expectedSyllables } from '../src/practice/tokens';

const MODEL = 'public/models/tiny_int8.onnx';
const VOCAB = 'public/models/vocab.json';
const NIHAO = 'tests/fixtures/nihao.wav';
const PHRASE = 'tests/fixtures/wohenhao.wav';
const THANKS = 'tests/fixtures/thx.wav';
const WRONG_TONE = 'tests/fixtures/wrongtone.wav';
const SENTENCE = 'tests/fixtures/long.wav';
const ready =
  existsSync(MODEL) &&
  existsSync(VOCAB) &&
  [NIHAO, PHRASE, THANKS, WRONG_TONE, SENTENCE].every((path) => existsSync(path));

const readWav = (path: string): Float32Array => {
  const buf = readFileSync(path);
  const start = buf.indexOf('data') + 8;
  const samples = new Float32Array((buf.length - start) / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(start + i * 2) / 32768;
  return samples;
};

describe.skipIf(!ready)('pronunciation model, end to end', () => {
  const vocab: string[] = JSON.parse(readFileSync(VOCAB, 'utf8'));
  let session: ort.InferenceSession | null = null;

  const load = async () => {
    if (!session) {
      ort.env.wasm.wasmBinary = readFileSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm');
      session = await ort.InferenceSession.create(readFileSync(MODEL));
    }
    return session;
  };

  const assessAudio = async (wav: string, text: string) => {
    const audio = prepareForAssessment(readWav(wav));
    const { feats, frames } = features(audio);
    const net = await load();
    const out = await net.run({
      feats: new ort.Tensor('float32', feats, [1, frames, 80]),
      feat_lens: new ort.Tensor('int64', new BigInt64Array([BigInt(frames)]), [1]),
    });
    const [logits] = [out.logits];
    const [, time] = logits.dims as number[];
    return assess({
      symbols: expectedSyllables(text),
      vocab,
      logits: Float32Array.from(logits.data as Float32Array),
      frames: time,
    });
  };

  it('grades a correctly spoken 你好, sandhi form included', async () => {
    const result = await assessAudio(NIHAO, '你好');

    // The voice says nǐ hǎo; the dictionary says ni3 hao3 and sandhi says ni2.
    // Either is accepted, so this must not be reported as a mistake.
    expect(result.syllables.map((syllable) => syllable.verdict)).toEqual(['ok', 'ok']);
    expect(result.score).toBe(100);
  });

  it('grades a two-syllable word with identical tones', async () => {
    const result = await assessAudio(THANKS, '谢谢');
    expect(result.syllables.map((syllable) => syllable.verdict)).toEqual(['ok', 'ok']);
  });

  it('grades a longer sentence perfectly', async () => {
    const result = await assessAudio(SENTENCE, '这个东西太贵了');

    expect(result.syllables.map((syllable) => syllable.verdict)).toEqual(Array(7).fill('ok'));
    expect(result.score).toBe(100);
    expect(result.heardText).toBe('zhe4 ge5 dong1 xi1 tai4 gui4 le5');
  });

  it('never accuses a correct phrase of a mistake, even when it cannot judge it', async () => {
    const result = await assessAudio(PHRASE, '我很好，谢谢');

    console.log('sandhi phrase heard:', result.heardText, 'score:', result.score, result.syllables.map((s) => `${s.expected}/${s.heard}/${s.verdict}`).join(' '));

    const accusations = result.syllables.filter((syllable) => syllable.verdict === 'tone' || syllable.verdict === 'syllable');
    expect(accusations).toEqual([]);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('does flag a syllable that was actually wrong', async () => {
    // The clip says 你号 (nǐ hào); graded against 你号 the first syllable is still
    // mangled by the model, but the second must not be reported as fine when
    // the expectation is 你好 (hǎo).
    const asSaid = await assessAudio(WRONG_TONE, '你号');
    const asIntended = await assessAudio(WRONG_TONE, '你好');

    expect(asIntended.syllables[1].verdict).not.toBe('ok');
    expect(asSaid.syllables[1].verdict).toBe('ok');
    expect(asIntended.score).toBeLessThan(100);
  });
});
