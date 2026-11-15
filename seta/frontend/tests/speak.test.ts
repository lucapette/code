import { afterEach, describe, expect, it, vi } from 'vitest';

import { canSpeak, onAvailability, prime, speakChinese } from '../src/speak';

interface FakeVoice {
  lang: string;
  name: string;
}

/** A stand-in for window.speechSynthesis with a controllable voice list. */
function stubSpeech(voices: FakeVoice[]) {
  const spoken: { text: string; lang?: string; rate?: number }[] = [];
  const listeners: (() => void)[] = [];

  const synth = {
    getVoices: () => voices,
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'voiceschanged') listeners.push(listener);
    },
    cancel: vi.fn(),
    speak: (utterance: { text: string; lang?: string; rate?: number }) => {
      spoken.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate });
    },
  };

  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );

  return {
    spoken,
    synth,
    /** Simulates the OS handing over voices after first paint. */
    deliver(newVoices: FakeVoice[]) {
      voices = newVoices;
      for (const listener of listeners) listener();
    },
  };
}

describe('speak', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports no Chinese voice when none is installed', () => {
    stubSpeech([{ lang: 'en-US', name: 'Samantha' }]);

    expect(prime()).toBe(false);
    expect(canSpeak()).toBe(false);
    expect(speakChinese('你好')).toBe(false);
  });

  it('hides itself when the browser has no speech support at all', () => {
    vi.stubGlobal('window', {});
    expect(prime()).toBe(false);
    expect(speakChinese('你好')).toBe(false);
  });

  it('speaks with a zh voice, slowly, and never in English', () => {
    const fake = stubSpeech([{ lang: 'en-US', name: 'Samantha' }, { lang: 'zh-CN', name: 'Tingting' }]);

    expect(prime()).toBe(true);
    expect(speakChinese('你好')).toBe(true);

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0].text).toBe('你好');
    expect(fake.spoken[0].lang).toBe('zh-CN');
    expect(fake.spoken[0].rate).toBe(0.85);
    expect(fake.synth.cancel).toHaveBeenCalled();
  });

  it('notices voices that arrive after first paint', () => {
    const fake = stubSpeech([{ lang: 'en-US', name: 'Samantha' }]);
    const seen: boolean[] = [];
    const unsubscribe = onAvailability((available) => seen.push(available));

    expect(prime()).toBe(false);
    fake.deliver([{ lang: 'zh-TW', name: 'Meijia' }]);

    expect(seen[0]).toBe(false);
    expect(seen.at(-1)).toBe(true);
    expect(canSpeak()).toBe(true);
    expect(speakChinese('謝謝')).toBe(true);

    unsubscribe();
  });

  it('refuses empty text rather than speaking nothing', () => {
    const fake = stubSpeech([{ lang: 'zh-CN', name: 'Tingting' }]);
    prime();

    expect(speakChinese('   ')).toBe(false);
    expect(fake.spoken).toHaveLength(0);
  });
});

describe('voice choice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers Tingting over the novelty voices that sort first', () => {
    const fake = stubSpeech([
      { lang: 'zh-CN', name: 'Eddy (Chinese (China mainland))' },
      { lang: 'zh-CN', name: 'Flo (Chinese (China mainland))' },
      { lang: 'zh-CN', name: 'Tingting' },
    ]);

    expect(prime()).toBe(true);
    speakChinese('你好');

    expect(fake.spoken[0].lang).toBe('zh-CN');
  });

  it('falls back to a novelty voice rather than nothing when it is all there is', () => {
    const fake = stubSpeech([{ lang: 'zh-CN', name: 'Grandma (Chinese (China mainland))' }]);

    expect(prime()).toBe(true);
    expect(speakChinese('你好')).toBe(true);
    expect(fake.spoken).toHaveLength(1);
  });
});
