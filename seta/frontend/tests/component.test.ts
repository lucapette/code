import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PINYIN_KEY, THEME_KEY, translatorApp } from '../src/component';
import { MAX_TEXT_BYTES } from '../src/translate';

const encoder = new TextEncoder();

/** The component's whole browser surface — storage, matchMedia, the theme
    class list and the theme-color meta tag — stubbed, so the state machine can
    be driven in plain Node. */
function stubBrowser({ prefersLight = false } = {}) {
  const store = new Map<string, string>();
  const classes = new Set<string>();
  const meta = { setAttribute: vi.fn() };

  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
    matchMedia: () => ({ matches: prefersLight }),
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
  });

  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      },
    },
    querySelector: (selector: string) =>
      selector === 'meta[name="theme-color"]' ? meta : null,
  });

  return { store, classes, meta };
}

/** A fetch double whose response body the test drives fragment by fragment,
    and which rejects with AbortError when the caller's signal aborts — like a
    real fetch. */
function fakeFetch() {
  const calls: {
    url: string;
    signal: AbortSignal | null;
    push: (chunk: string) => void;
  }[] = [];

  const impl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        init?.signal?.addEventListener('abort', () => {
          try {
            c.error(new DOMException('The operation was aborted.', 'AbortError'));
          } catch {
            /* already closed */
          }
        });
      },
    });

    calls.push({
      url: String(input),
      signal: init?.signal ?? null,
      push: (chunk) => controller.enqueue(encoder.encode(chunk)),
    });

    return Promise.resolve(new Response(body, { status: 200 }));
  });

  return { impl: impl as unknown as typeof fetch, calls };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const delta = (text: string) => `data: {"delta":"${text}"}\n\n`;

describe('translatorApp', () => {
  let fetcher: ReturnType<typeof fakeFetch>;

  beforeEach(() => {
    stubBrowser();
    fetcher = fakeFetch();
    vi.stubGlobal('fetch', fetcher.impl);
  });

  it('streams fragments into the panel, with pinyin and one announcement', async () => {
    const app = translatorApp();
    app.sourceText = 'hello';

    const run = app.translate();
    await tick();

    fetcher.calls[0].push(delta('你好'));
    await tick();

    expect(app.translatedText).toBe('你好');
    expect(app.pinyinText).toBe('nǐ hǎo');
    expect(app.isTranslating).toBe(true);

    fetcher.calls[0].push('data: [DONE]\n\n');
    await run;

    expect(app.isTranslating).toBe(false);
    expect(app.announcement).toBe('Translation ready');
    expect(app.error).toBeNull();
  });

  it('aborts and stays empty when the textarea is cleared mid-stream', async () => {
    // Regression: clearing used to leave the request running, so stale
    // fragments refilled the panel the user had just emptied and the run
    // indicator kept spinning.
    const app = translatorApp();
    app.sourceText = 'hello';

    const run = app.translate();
    await tick();

    fetcher.calls[0].push(delta('你'));
    await tick();
    expect(app.translatedText).toBe('你');

    app.clear();
    await run;

    expect(fetcher.calls[0].signal?.aborted).toBe(true);
    expect(app.sourceText).toBe('');
    expect(app.translatedText).toBe('');
    expect(app.pinyinText).toBe('');
    expect(app.isTranslating).toBe(false);
    expect(app.error).toBeNull();
  });

  it('drops fragments from a superseded request', async () => {
    const app = translatorApp();
    app.sourceText = 'first';

    const first = app.translate();
    await tick();

    // A fragment arrives and is buffered, but is not consumed yet...
    fetcher.calls[0].push(delta('旧'));
    // ...and the user types again before the loop resumes.
    app.sourceText = 'second';
    const second = app.translate();
    await tick();

    expect(app.translatedText).toBe(''); // the stale '旧' must not land
    expect(app.isTranslating).toBe(true); // the fresh request is running

    fetcher.calls[1].push(delta('新'));
    await tick();
    expect(app.translatedText).toBe('新');

    fetcher.calls[1].push('data: [DONE]\n\n');
    await Promise.all([first, second]);
    expect(app.translatedText).toBe('新');
  });

  it('refuses text over the byte cap without calling the service', async () => {
    const app = translatorApp();
    app.sourceText = 'x'.repeat(MAX_TEXT_BYTES + 1);

    expect(app.overLimit).toBe(true);
    await app.translate();

    expect(fetcher.calls).toHaveLength(0);
    expect(app.error).toContain('text exceeds limit');
    expect(app.translatedText).toBe('');
  });

  it('shows the service error and stops the indicator', async () => {
    vi.stubGlobal('fetch', (async () =>
      new Response(JSON.stringify({ error: 'translation engine unavailable' }), {
        status: 503,
      })) as unknown as typeof fetch);

    const app = translatorApp();
    app.sourceText = 'hello';
    await app.translate();

    expect(app.error).toBe('translation engine unavailable');
    expect(app.isTranslating).toBe(false);
  });

  it('keeps partial output and reports a mid-stream failure', async () => {
    const app = translatorApp();
    app.sourceText = 'hello';

    const run = app.translate();
    await tick();
    fetcher.calls[0].push(delta('你好'));
    await tick();
    fetcher.calls[0].push('data: {"error":"invalid upstream response"}\n\n');
    await run;

    expect(app.translatedText).toBe('你好'); // fragments already shown stand
    expect(app.error).toBe('invalid upstream response');
    expect(app.isTranslating).toBe(false);
  });

  it('copies the translation and confirms it briefly', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const app = translatorApp();
    app.translatedText = '你好';
    await app.copyTranslation();

    expect(writeText).toHaveBeenCalledWith('你好');
    expect(app.copied).toBe(true);
  });

  it('reports a clipboard refusal instead of failing silently', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    });

    const app = translatorApp();
    app.translatedText = '你好';
    await app.copyTranslation();

    expect(app.copied).toBe(false);
    expect(app.error).toContain('copy failed');
  });

  it('toggles pinyin off and back on, recomputing without a new fragment', () => {
    const app = translatorApp();
    app.translatedText = '你好';

    app.togglePinyin();
    expect(app.showPinyin).toBe(false);
    expect(window.localStorage.getItem(PINYIN_KEY)).toBe('0');

    app.togglePinyin();
    expect(app.showPinyin).toBe(true);
    expect(window.localStorage.getItem(PINYIN_KEY)).toBe('1');
    expect(app.pinyinText).toBe('nǐ hǎo');
  });

  it('describes engine readiness where the translation would appear', () => {
    const app = translatorApp();

    app.engineStatus = 'ready';
    expect(app.placeholder).toBe('Translation appears here');

    app.engineStatus = 'warming';
    expect(app.placeholder).toBe('Model is warming up…');

    app.engineStatus = 'unavailable';
    expect(app.placeholder).toBe('Translation engine is unreachable');
  });

  it('restores theme and pinyin preferences on init and probes readiness', async () => {
    const { classes } = stubBrowser();
    window.localStorage.setItem(THEME_KEY, 'dark');
    window.localStorage.setItem(PINYIN_KEY, '0');

    const app = translatorApp();
    app.init();
    await tick();

    expect(app.theme).toBe('dark');
    expect(classes.has('dark')).toBe(true);
    expect(app.showPinyin).toBe(false);
    expect(fetcher.calls[0].url).toBe('/api/ready');
  });
});
