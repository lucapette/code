import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PINYIN_KEY, THEME_KEY, setaApp } from '../src/component';

const mocks = vi.hoisted(() => ({
  modelAvailable: vi.fn(async () => true),
  assessRecording: vi.fn(async () => ({
    syllables: [
      { expected: 'xie4', surface: 'xie4', heard: 'xie4', text: '谢', index: 0, confidence: 0.9, verdict: 'ok' },
      { expected: 'xie4', surface: 'xie4', heard: 'shi4', text: '谢', index: 1, confidence: 0.8, verdict: 'syllable' },
    ],
    score: 50,
    unclear: 0,
    heardText: 'xie4 shi4',
  })),
  startRecording: vi.fn(async () => ({
    stop: vi.fn(async () => ({
      audio: new Float32Array(16000),
      seconds: 1,
      peak: 0.4,
    })),
    cancel: vi.fn(),
  })),
}));

vi.mock('../src/practice/engine', () => ({
  modelAvailable: mocks.modelAvailable,
  assessRecording: mocks.assessRecording,
}));

vi.mock('../src/practice/recorder', () => ({ startRecording: mocks.startRecording }));
import { MAX_TEXT_BYTES } from '../src/translate';
import type { CoverageReport, Item } from '../src/types';

const encoder = new TextEncoder();
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const delta = (text: string) => `data: {"delta":"${text}"}\n\n`;

const EMPTY_COVERAGE: CoverageReport = { levels: [], current: 0, gaps: [], gap_total: 0, more: false };

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  chinese: '你好',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

/** The component's browser surface: storage, matchMedia, the theme classes, the
    clipboard, a Chinese voice and a settable location. */
function stubBrowser({ prefersLight = false, chineseVoice = true } = {}) {
  const store = new Map<string, string>();
  const classes = new Set<string>();
  const spoken: string[] = [];
  const location = { href: '' };
  const clipboard = { writeText: vi.fn(async () => {}) };

  const voices = chineseVoice
    ? [{ lang: 'zh-CN', name: 'Tingting' }]
    : [{ lang: 'en-US', name: 'Samantha' }];

  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
    matchMedia: () => ({ matches: prefersLight }),
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    location,
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener: () => {},
      cancel: () => {},
      speak: (utterance: { text: string }) => spoken.push(utterance.text),
    },
  });

  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    lang = '';
    rate = 1;
    voice: unknown = null;
    constructor(text: string) {
      this.text = text;
    }
  });

  vi.stubGlobal('navigator', { clipboard });

  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      },
    },
    querySelector: () => ({ setAttribute: () => {} }),
  });

  return { store, classes, spoken, location, clipboard };
}

/** An in-memory stand-in for the Go service's item and HSK routes. */
function fakeServer(
  init: {
    items?: Item[];
    coverage?: CoverageReport;
    direction?: 'en-zh' | 'zh-en';
    translateError?: { status: number; message: string };
  } = {},
) {
  const state = {
    items: [...(init.items ?? [])],
    coverage: init.coverage ?? EMPTY_COVERAGE,
    direction: init.direction ?? 'en-zh',
  };
  const calls: { url: string; method: string; body: Record<string, unknown> | undefined }[] = [];
  const streams: { push: (chunk: string) => void }[] = [];

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

  const impl = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input);
    const method = options?.method ?? 'GET';
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    calls.push({ url, method, body });

    if (url.startsWith('/api/ready')) return json({ status: 'ready' });

    if (url.startsWith('/api/translate')) {
      if (init.translateError) {
        return json({ error: init.translateError.message }, init.translateError.status);
      }
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          options?.signal?.addEventListener('abort', () => {
            try {
              c.error(new DOMException('The operation was aborted.', 'AbortError'));
            } catch {
              /* already closed */
            }
          });
        },
      });
      streams.push({ push: (chunk) => controller.enqueue(encoder.encode(chunk)) });
      return new Response(stream, {
        status: 200,
        headers: { 'X-Seta-Direction': state.direction },
      });
    }

    if (url.startsWith('/api/hsk')) return json(state.coverage);

    if (url.startsWith('/api/items/export')) return json({ version: 1, items: state.items });

    if (url === '/api/items' && method === 'GET') return json({ items: state.items });

    if (url === '/api/items' && method === 'POST') {
      const created = makeItem({ id: 'created-1', ...body });
      state.items = [created, ...state.items];
      return json(created, 201);
    }

    if (url.startsWith('/api/items/')) {
      const id = decodeURIComponent(url.slice('/api/items/'.length));
      if (method === 'DELETE') {
        state.items = state.items.filter((item) => item.id !== id);
        return new Response(null, { status: 204 });
      }
      state.items = state.items.map((item) => (item.id === id ? { ...item, ...body } : item));
      return json(state.items.find((item) => item.id === id));
    }

    return json({});
  });

  return {
    state,
    calls,
    streams,
    impl: impl as unknown as typeof fetch,
    callsTo: (prefix: string) => calls.filter((call) => call.url.startsWith(prefix)),
  };
}

describe('setaApp', () => {
  let server: ReturnType<typeof fakeServer>;

  function mount(options: Parameters<typeof fakeServer>[0] = {}) {
    server = fakeServer(options);
    vi.stubGlobal('fetch', server.impl);
    return setaApp();
  }

  beforeEach(() => {
    stubBrowser();
  });

  /* --- translate ------------------------------------------------- */

  it('streams fragments, learns the direction and announces once', async () => {
    const app = mount();
    app.sourceText = 'hello';
    const run = app.translate();
    await tick();

    server.streams[0].push(delta('你好'));
    await tick();
    expect(app.translatedText).toBe('你好');
    expect(app.direction).toBe('en-zh');
    expect(app.pinyinText).toBe('nǐ hǎo');

    server.streams[0].push('data: [DONE]\n\n');
    await run;
    expect(app.isTranslating).toBe(false);
    expect(app.announcement).toBe('Translation ready');
  });

  it('keeps pinyin out of the way when looking Chinese up', async () => {
    const app = mount({ direction: 'zh-en' });
    app.sourceText = '你好';
    const run = app.translate();
    await tick();

    expect(app.direction).toBe('zh-en');
    expect(app.outputIsChinese).toBe(false);
    expect(app.spokenText).toBe('你好');

    server.streams[0].push(delta('hello'));
    await tick();
    expect(app.pinyinText, 'no pinyin for English output').toBe('');

    server.streams[0].push('data: [DONE]\n\n');
    await run;
  });

  it('aborts and stays empty when the textarea is cleared mid-stream', async () => {
    // Regression: clearing used to leave the request running.
    const app = mount();
    app.sourceText = 'hello';
    const run = app.translate();
    await tick();

    server.streams[0].push(delta('你'));
    await tick();
    expect(app.translatedText).toBe('你');

    app.clear();
    await run;

    expect(app.sourceText).toBe('');
    expect(app.translatedText).toBe('');
    expect(app.pinyinText).toBe('');
    expect(app.isTranslating).toBe(false);
  });

  it('drops fragments from a superseded request', async () => {
    const app = mount();
    app.sourceText = 'first';
    const first = app.translate();
    await tick();

    server.streams[0].push(delta('旧')); // buffered, not yet consumed
    app.sourceText = 'second';
    const second = app.translate();
    await tick();

    expect(app.translatedText).toBe('');

    server.streams[1].push(delta('新'));
    await tick();
    expect(app.translatedText).toBe('新');

    server.streams[1].push('data: [DONE]\n\n');
    await Promise.all([first, second]);
  });

  it('refuses text over the byte cap without calling the service', async () => {
    const app = mount();
    app.sourceText = 'x'.repeat(MAX_TEXT_BYTES + 1);

    await app.translate();

    expect(server.callsTo('/api/translate')).toHaveLength(0);
    expect(app.error).toContain('text exceeds limit');
  });

  it('shows the service error and stops the indicator', async () => {
    const app = mount({ translateError: { status: 503, message: 'translation engine unavailable' } });
    app.sourceText = 'hello';

    await app.translate();

    expect(app.error).toBe('translation engine unavailable');
    expect(app.isTranslating).toBe(false);
  });

  /* --- library ---------------------------------------------------- */

  it('loads the library and coverage on init', async () => {
    const app = mount({ items: [makeItem()] });
    app.init();
    await tick();

    expect(app.items).toHaveLength(1);
    expect(server.callsTo('/api/items')).not.toHaveLength(0);
    expect(server.callsTo('/api/hsk')).not.toHaveLength(0);
    expect(app.engineStatus).toBe('ready');
  });

  it('searches across Chinese, meaning, note and tags', async () => {
    const app = mount({
      items: [
        makeItem({ id: 'a', chinese: '你好', meaning: 'hello' }),
        makeItem({ id: 'b', chinese: '银行', meaning: 'bank', tags: ['money'] }),
      ],
    });
    app.init();
    await tick();

    app.libraryQuery = 'bank';
    expect(app.visibleItems.map((item) => item.id)).toEqual(['b']);

    app.libraryQuery = '';
    expect(app.visibleItems).toHaveLength(2);
  });

  it('deletes an item and refreshes the map', async () => {
    const app = mount({ items: [makeItem()] });
    app.init();
    await tick();

    await app.removeItem(app.items[0]);

    expect(server.callsTo('/api/items/item-1').some((call) => call.method === 'DELETE')).toBe(true);
    expect(app.items).toHaveLength(0);
    expect(app.toast).toBe('Deleted');
  });

  it('exports by navigating to the download route', async () => {
    const view = stubBrowser();
    const app = mount();

    app.exportLibrary();

    expect(view.location.href).toBe('/api/items/export');
  });

  /* --- save sheet -------------------------------------------------- */

  it('prefills the sheet from a translation, per direction', () => {
    const app = mount();
    app.sourceText = 'silk road';
    app.translatedText = '丝绸之路';
    app.direction = 'en-zh';

    app.openSaveFromTranslation();
    expect(app.sheet).toMatchObject({ open: true, chinese: '丝绸之路', meaning: 'silk road' });

    app.closeSheet();
    app.sourceText = '丝绸之路';
    app.translatedText = 'the Silk Road';
    app.direction = 'zh-en';

    app.openSaveFromTranslation();
    expect(app.sheet).toMatchObject({ chinese: '丝绸之路', meaning: 'the Silk Road' });
  });

  it('prefills the sheet from an HSK gap row', () => {
    const app = mount();
    app.openSaveFromWord({ s: '银行', lv: 3, q: 300, py: 'yín háng', m: 'bank' });

    expect(app.sheet).toMatchObject({ chinese: '银行', meaning: 'bank', where: 'HSK 3' });
  });

  it('saves a new item, closes the sheet and refreshes', async () => {
    const app = mount();
    app.init();
    await tick();

    app.openSaveSheet({ chinese: '你好', tags: ['greeting'] });
    await app.saveSheet();

    const post = server.calls.find((call) => call.method === 'POST');
    expect(post?.body).toEqual({ chinese: '你好', tags: ['greeting'] });
    expect(app.sheet.open).toBe(false);
    expect(app.toast).toBe('Saved');
    expect(app.items).toHaveLength(1);
  });

  it('refuses to save without Chinese text', async () => {
    const app = mount();
    app.openSaveSheet({ chinese: '   ' });

    await app.saveSheet();

    expect(app.sheet.error).toBe('Chinese text is required');
    expect(server.calls.some((call) => call.method === 'POST')).toBe(false);
    expect(app.sheet.open).toBe(true);
  });

  it('surfaces a save failure inside the sheet', async () => {
    const app = mount();
    vi.stubGlobal(
      'fetch',
      (async () => new Response(JSON.stringify({ error: 'chinese is required' }), { status: 400 })) as unknown as typeof fetch,
    );

    app.openSaveSheet({ chinese: '你好' });
    await app.saveSheet();

    expect(app.sheet.error).toBe('chinese is required');
    expect(app.sheet.open).toBe(true);
    expect(app.sheet.saving).toBe(false);
  });

  it('edits an existing item in the same sheet', async () => {
    const app = mount({ items: [makeItem({ meaning: 'hello' })] });
    app.init();
    await tick();

    app.openEditItem(app.items[0]);
    expect(app.sheet.id).toBe('item-1');
    expect(app.sheet.chinese).toBe('你好');

    app.sheet.meaning = 'hello there';
    await app.saveSheet();

    const patch = server.calls.find((call) => call.method === 'PATCH');
    expect(patch?.url).toBe('/api/items/item-1');
    expect(patch?.body).toMatchObject({ chinese: '你好', meaning: 'hello there' });
    expect(app.toast).toBe('Updated');
  });

  it('edits tags with the chip editor', () => {
    const app = mount();
    app.openSaveSheet({ chinese: '你好' });

    app.tagDraft = 'greeting, tutor';
    app.tagsChanged();
    expect(app.sheet.tags).toEqual(['greeting', 'tutor']);
    expect(app.tagDraft).toBe('');

    app.tagDraft = 'food';
    app.addTag();
    expect(app.sheet.tags).toEqual(['greeting', 'tutor', 'food']);

    app.tagDraft = '';
    app.tagsBackspace();
    expect(app.sheet.tags).toEqual(['greeting', 'tutor']);

    app.removeTag('greeting');
    expect(app.sheet.tags).toEqual(['tutor']);
  });

  it('copies text and says so', async () => {
    const view = stubBrowser();
    const app = mount();

    await app.copyText('银行');

    expect(view.clipboard.writeText).toHaveBeenCalledWith('银行');
    expect(app.toast).toBe('Copied');
  });

  it('reports a clipboard refusal instead of failing silently', async () => {
    const view = stubBrowser();
    view.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    const app = mount();

    await app.copyText('银行');

    expect(app.toast).toContain('copy failed');
  });

  it('shows a reading only for Chinese, never for English', () => {
    const app = mount();

    expect(app.pinyinOf('你好')).toBe('nǐ hǎo');
    expect(app.pinyinOf('The caravan carried silk west.')).toBe('');
    expect(app.pinyinOf('')).toBe('');

    app.showPinyin = false;
    expect(app.pinyinOf('你好')).toBe('');
  });

  it('caches readings per text', () => {
    const app = mount();
    expect(app.pinyinOf('银行')).toBe('yín háng');
    expect(app._pinyinCache.get('银行')).toBe('yín háng');
  });

  /* --- practice ---------------------------------------------------- */

  it('offers practice only when the model and a microphone are both there', async () => {
    const app = mount();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } }); // no mediaDevices
    await app.checkPractice();
    expect(app.practiceAvailable).toBe(false);

    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    mocks.modelAvailable.mockResolvedValueOnce(false);
    await app.checkPractice();
    expect(app.practiceAvailable).toBe(false);

    mocks.modelAvailable.mockResolvedValueOnce(true);
    await app.checkPractice();
    expect(app.practiceAvailable).toBe(true);
  });

  it('records, grades, and keeps the verdicts per item', async () => {
    const app = mount({ items: [makeItem({ id: 'x1', chinese: '谢谢' })] });
    app.init();
    await tick();

    await app.togglePractice(app.items[0]);
    expect(app.practice.x1).toMatchObject({ recording: true, busy: false });

    await app.stopPractice(app.items[0]);

    expect(mocks.startRecording).toHaveBeenCalled();
    expect(mocks.assessRecording).toHaveBeenCalledWith(expect.any(Float32Array), '谢谢');
    expect(app.practice.x1.recording).toBe(false);
    expect(app.practice.x1.assessment?.score).toBe(50);
  });

  it('refuses to grade a take that contains nothing', async () => {
    mocks.startRecording.mockResolvedValueOnce({
      stop: async () => ({ audio: new Float32Array(16000), seconds: 1, peak: 0.0001 }),
      cancel: () => {},
    });
    const app = mount({ items: [makeItem({ id: 'silent' })] });
    app.init();
    await tick();

    await app.togglePractice(app.items[0]);
    await app.stopPractice(app.items[0]);

    expect(app.practice.silent.assessment).toBeNull();
    expect(app.practice.silent.error).toContain('did not hear anything');
    expect(mocks.assessRecording).not.toHaveBeenCalledWith(
      expect.anything(),
      '你好',
    );
  });

  it('surfaces a microphone that never grants permission', async () => {
    mocks.startRecording.mockRejectedValueOnce(new Error('microphone permission was not granted'));
    const app = mount({ items: [makeItem({ id: 'x2' })] });
    app.init();
    await tick();

    await app.togglePractice(app.items[0]);

    expect(app.practice.x2).toMatchObject({ recording: false, assessment: null });
    expect(app.practice.x2.error).toContain('microphone');
  });

  it('stops listening when the user leaves the library', async () => {
    const app = mount({ items: [makeItem({ id: 'x3' })] });
    app.init();
    await tick();

    await app.togglePractice(app.items[0]);
    expect(app.practice.x3.recording).toBe(true);

    app.setTab('translate');

    expect(app.practice.x3.recording).toBe(false);
  });

  it('names each verdict for tooltips', () => {
    const app = mount();
    expect(app.verdictLabel('ok')).toBe('heard correctly');
    expect(app.verdictLabel('tone')).toBe('wrong tone');
    expect(app.verdictLabel('syllable')).toBe('different syllable');
    expect(app.verdictLabel('unclear')).toContain('not clear');
  });

  /* --- HSK --------------------------------------------------------- */

  it('shows the first three levels by default and the rest on demand', async () => {
    const coverage: CoverageReport = {
      levels: [
        { level: 1, seen: 10, total: 20 },
        { level: 2, seen: 0, total: 20 },
        { level: 3, seen: 0, total: 20 },
        { level: 4, seen: 0, total: 20 },
      ],
      current: 2,
      gaps: [{ s: '银行', lv: 2, q: 300, py: 'yín háng', m: 'bank' }],
      gap_total: 20,
      more: true,
    };
    const app = mount({ coverage });
    app.init();
    await tick();

    expect(app.visibleLevels.map((row) => row.level)).toEqual([1, 2, 3]);
    expect(app.hiddenLevelCount).toBe(1);

    app.showAllLevels = true;
    expect(app.visibleLevels).toHaveLength(4);
  });

  it('formats coverage as a percentage and survives an empty level', () => {
    const app = mount();
    expect(app.percent({ level: 1, seen: 1, total: 4 })).toBe(25);
    expect(app.percent({ level: 1, seen: 0, total: 0 })).toBe(0);
  });

  it('asks for more gap rows by growing the page', async () => {
    const app = mount({ coverage: { ...EMPTY_COVERAGE, gap_total: 200, more: true } });
    app.init();
    await tick();

    await app.loadMoreGaps();

    const last = server.callsTo('/api/hsk').at(-1);
    expect(last?.url).toBe('/api/hsk?gaps=100');
  });

  /* --- preferences and speech -------------------------------------- */

  it('toggles pinyin off and back on, recomputing without a new fragment', () => {
    const app = mount();
    app.translatedText = '你好';

    app.togglePinyin();
    expect(app.showPinyin).toBe(false);
    expect(window.localStorage.getItem(PINYIN_KEY)).toBe('0');

    app.togglePinyin();
    expect(window.localStorage.getItem(PINYIN_KEY)).toBe('1');
    expect(app.pinyinText).toBe('nǐ hǎo');
  });

  it('restores theme and pinyin on init and marks a Chinese voice as available', async () => {
    const view = stubBrowser();
    window.localStorage.setItem(THEME_KEY, 'dark');
    window.localStorage.setItem(PINYIN_KEY, '0');

    const app = mount();
    app.init();
    await tick();

    expect(app.theme).toBe('dark');
    expect(view.classes.has('dark')).toBe(true);
    expect(app.showPinyin).toBe(false);
    expect(app.ttsAvailable).toBe(true);
  });

  it('hides speak when the device has no Chinese voice', async () => {
    stubBrowser({ chineseVoice: false });
    const app = mount();
    app.init();
    await tick();

    expect(app.ttsAvailable).toBe(false);

    app.speak('你好');
    expect(app.toast).toContain('No Chinese voice');
  });

  it('speaks the Chinese side of a translation', async () => {
    const view = stubBrowser();
    const app = mount();
    app.init();
    await tick();

    app.speak('你好');
    expect(view.spoken).toEqual(['你好']);
  });

  it('describes engine readiness where the translation would appear', () => {
    const app = mount();
    app.engineStatus = 'warming';
    expect(app.placeholder).toBe('Model is warming up…');
    app.engineStatus = 'unavailable';
    expect(app.placeholder).toBe('Translation engine is unreachable');
  });
});
