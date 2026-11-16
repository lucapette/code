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
  startRecording: vi.fn<() => Promise<Recorder>>(async () => ({
    stop: async () => ({ audio: new Float32Array(16000), seconds: 1, peak: 0.4 }),
    cancel: () => {},
  })),
}));

vi.mock('../src/practice/engine', () => ({
  modelAvailable: mocks.modelAvailable,
  assessRecording: mocks.assessRecording,
}));

vi.mock('../src/practice/recorder', () => ({ startRecording: mocks.startRecording }));
import type { Recorder } from '../src/practice/recorder';
import { MAX_TEXT_BYTES } from '../src/translate';
import type { CoverageReport, Item, SearchResults } from '../src/types';

const encoder = new TextEncoder();
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const delta = (text: string) => `data: {"delta":"${text}"}\n\n`;

const EMPTY_COVERAGE: CoverageReport = {
  levels: [],
  current: 0,
  known: { words: [], total: 0, more: false },
  gaps: { words: [], total: 0, more: false },
};

const EMPTY_SEARCH: SearchResults = { words: [], total: 0, more: false };

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

  const scrolled: string[] = [];

  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      },
    },
    querySelector: () => ({ setAttribute: () => {} }),
    getElementById: (id: string) => ({ id, scrollIntoView: () => scrolled.push(id) }),
  });

  return { store, classes, spoken, location, clipboard, scrolled };
}

/** An in-memory stand-in for the Go service's item and HSK routes. */
function fakeServer(
  init: {
    items?: Item[];
    coverage?: CoverageReport;
    search?: SearchResults;
    searchByQuery?: Record<string, SearchResults>;
    slowQuery?: string;
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

    if (url.startsWith('/api/hsk/search')) {
      const query = new URL(url, 'http://seta.local').searchParams.get('q') ?? '';
      // One query can be made slow, to exercise stale-response handling.
      if (query === init.slowQuery) await new Promise((resolve) => setTimeout(resolve, 10));
      return json(init.searchByQuery?.[query] ?? init.search ?? EMPTY_SEARCH);
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

  let browser: ReturnType<typeof stubBrowser>;

  beforeEach(() => {
    browser = stubBrowser();
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

  it('lists the library alphabetically by pinyin, not by save order', async () => {
    const app = mount({
      items: [
        makeItem({ id: 'wo', chinese: '我' }),
        makeItem({ id: 'ai', chinese: '爱' }),
        makeItem({ id: 'de', chinese: '的' }),
      ],
    });
    app.init();
    await tick();

    expect(app.visibleItems.map((item) => item.chinese)).toEqual(['爱', '的', '我']);
  });

  it('keeps the search filter and the alphabetical order together', async () => {
    const app = mount({
      items: [
        makeItem({ id: 'wo', chinese: '我们', meaning: 'we' }),
        makeItem({ id: 'ai', chinese: '爱好', meaning: 'hobby' }),
        makeItem({ id: 'de', chinese: '的', meaning: 'of' }),
      ],
    });
    app.init();
    await tick();

    app.libraryQuery = 'o';
    // "hobby" and "of" match; ài hào still sorts before de.
    expect(app.visibleItems.map((item) => item.chinese)).toEqual(['爱好', '的']);
  });

  it('names the model state for the rail', async () => {
    const app = mount();
    app.init();
    await tick();

    expect(app.statusLabel).toBe('model ready');
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

  /** A report shaped like the service's: two bands met, one with refs, one gap
      page with more behind it. */
  const coverageReport = (overrides: Partial<CoverageReport> = {}): CoverageReport => ({
    levels: [
      { level: 1, seen: 2, total: 4 },
      { level: 2, seen: 1, total: 4 },
      { level: 3, seen: 0, total: 4 },
      { level: 4, seen: 0, total: 4 },
    ],
    current: 2,
    known: {
      words: [
        { s: '的', lv: 1, q: 1, py: 'de', m: 'of' },
        { s: '我', lv: 1, q: 2, py: 'wǒ', m: 'I', refs: [{ id: 'i1', text: '我去银行' }] },
        { s: '行', lv: 2, q: 100, py: 'háng', m: 'row' },
      ],
      total: 3,
      more: false,
    },
    gaps: {
      words: [{ s: '银行', lv: 3, q: 300, py: 'yín háng', m: 'bank' }],
      total: 20,
      more: true,
    },
    ...overrides,
  });

  it('counts every met word, not only the bands on screen', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    expect(app.metCount).toBe(3);
  });

  /* --- HSK search -------------------------------------------------- */

  const searchResults = (overrides: Partial<SearchResults> = {}): SearchResults => ({
    words: [
      {
        s: '银行',
        lv: 3,
        q: 300,
        py: 'yín háng',
        m: 'bank',
        known: true,
        refs: [{ id: 'i1', text: '我去银行' }],
      },
      { s: '银', lv: 5, q: 500, py: 'yín', m: 'silver', known: false },
    ],
    total: 2,
    more: false,
    ...overrides,
  });

  it('searches the whole vocabulary and labels each hit', async () => {
    const app = mount({ search: searchResults() });
    app.init();
    await tick();

    app.hskQuery = 'yin';
    await app.searchVocabulary();

    expect(server.callsTo('/api/hsk/search')).toHaveLength(1);
    expect(server.callsTo('/api/hsk/search')[0].url).toContain('q=yin');
    expect(app.hskSearchActive).toBe(true);
    expect(app.hskResults.words.map((word) => word.s)).toEqual(['银行', '银']);
    expect(app.hskResults.words[0].known).toBe(true);
    expect(app.hskResults.words[1].known).toBe(false);
  });

  it('clears the search and hands the tab back to the bands', async () => {
    const app = mount({ search: searchResults() });
    app.init();
    await tick();

    app.hskQuery = 'yin';
    await app.searchVocabulary();
    expect(app.hskSearchActive).toBe(true);

    app.clearHskSearch();
    await tick();

    expect(app.hskQuery).toBe('');
    expect(app.hskSearchActive).toBe(false);
    expect(app.hskResults.words).toEqual([]);
  });

  it('asks for another page of search results', async () => {
    const app = mount({ search: searchResults({ total: 60, more: true }) });
    app.init();
    await tick();

    app.hskQuery = 'yin';
    await app.searchVocabulary();
    await app.loadMoreSearch();

    const calls = server.callsTo('/api/hsk/search');
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain('limit=100');
  });

  it('refreshes the search after saving a word from the results', async () => {
    const app = mount({ search: searchResults() });
    app.init();
    await tick();

    app.hskQuery = 'yin';
    await app.searchVocabulary();
    const before = server.callsTo('/api/hsk/search').length;

    app.openSaveFromWord({ s: '银', lv: 5, q: 500, py: 'yín', m: 'silver' });
    await app.saveSheet();

    expect(server.callsTo('/api/hsk/search').length).toBe(before + 1);
  });

  it('ignores a search response that a newer keystroke already replaced', async () => {
    const app = mount({
      slowQuery: 'yin',
      searchByQuery: {
        yin: { words: [{ s: '银', lv: 5, q: 500, py: 'yín', m: 'silver', known: false }], total: 1, more: false },
        yinhang: searchResults(),
      },
    });
    app.init();
    await tick();

    app.hskQuery = 'yin';
    const stale = app.searchVocabulary();
    app.hskQuery = 'yinhang';
    await app.searchVocabulary();
    await stale; // the first response lands after the second, and is dropped

    expect(server.callsTo('/api/hsk/search')).toHaveLength(2);
    expect(app.hskResults.words.map((word) => word.s)).toEqual(['银行', '银']);
  });

  it('treats one Latin letter as too short, not as a query', async () => {
    const app = mount();
    app.init();
    await tick();

    app.hskQuery = 'a';
    expect(app.hskQueryTooShort).toBe(true);
    app.hskQuery = '爱';
    expect(app.hskQueryTooShort).toBe(false);
    app.hskQuery = 'ai';
    expect(app.hskQueryTooShort).toBe(false);
  });

  it('opens on the words you know, over the first three bands', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    expect(app.hskView).toBe('known');
    expect(app.knownLevels).toEqual([1, 2, 3]);
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,2,3&known=50&gaps=50');
  });

  it('groups the met words by band and keeps their library references', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    const groups = app.knownGroups;
    expect(groups.map((group) => group.label)).toEqual(['1', '2', '3']);
    expect(groups[0].words.map((word) => word.s)).toEqual(['的', '我']);
    expect(groups[0].words[1].refs?.[0].id).toBe('i1');
    expect(groups[1].words.map((word) => word.s)).toEqual(['行']);
    expect(groups[2].words).toEqual([]);
    expect(groups[2].seen).toBe(0);
  });

  it('asks for the bands the user picks, starting from the first page', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    app.knownPage = 100;
    await app.toggleKnownLevel(2);

    expect(app.knownLevels).toEqual([1, 3]);
    expect(app.knownPage).toBe(50);
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,3&known=50&gaps=50');

    await app.toggleKnownLevel(4);
    expect(app.knownLevels).toEqual([1, 3, 4]);
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,3,4&known=50&gaps=50');
  });

  it('never lets the band selection go empty', async () => {
    const app = mount({ coverage: coverageReport() });
    app.knownLevels = [1];

    await app.toggleKnownLevel(1);

    expect(app.knownLevels).toEqual([1]);
    expect(server.callsTo('/api/hsk')).toHaveLength(0);
  });

  it('grows the known page and the gap page separately', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    await app.loadMoreKnown();
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,2,3&known=100&gaps=50');

    await app.loadMoreGaps();
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,2,3&known=100&gaps=100');
  });

  it('points the gap list at a band, and back at the map', async () => {
    const app = mount({ coverage: coverageReport() });
    app.init();
    await tick();

    await app.showLevel(4);
    expect(app.gapLevel).toBe(4);
    expect(app.gapLevelShown).toBe(4);
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe(
      '/api/hsk?levels=1,2,3&known=50&level=4&gaps=50',
    );

    // The map's own level needs no explicit band.
    await app.showLevel(2);
    expect(app.gapLevel).toBe(0);
    expect(app.gapLevelShown).toBe(2);
    expect(server.callsTo('/api/hsk').at(-1)?.url).toBe('/api/hsk?levels=1,2,3&known=50&gaps=50');

    const calls = server.callsTo('/api/hsk').length;
    await app.showLevel(2);
    expect(server.callsTo('/api/hsk')).toHaveLength(calls); // the band is already showing
  });

  it('hands a truncated reference list to the library search', async () => {
    const app = mount({
      items: [makeItem({ id: 'i1', chinese: '我去银行' }), makeItem({ id: 'i2', chinese: '我去学校' })],
      coverage: coverageReport({
        known: {
          words: [
            {
              s: '我',
              lv: 1,
              q: 2,
              py: 'wǒ',
              m: 'I',
              refs: [{ id: 'i1', text: '我去银行' }],
              ref_total: 2,
            },
          ],
          total: 1,
          more: false,
        },
      }),
    });
    app.init();
    await tick();

    const word = app.coverage.known.words[0];
    expect(app.extraRefs(word)).toBe(1);

    app.searchLibrary(word.s);

    expect(app.tab).toBe('library');
    expect(app.libraryQuery).toBe('我');
    // The library reads alphabetically: xué (i2) before yín (i1).
    expect(app.visibleItems.map((item) => item.id)).toEqual(['i2', 'i1']);
  });

  it('follows a reference into the library and opens that item', async () => {
    const app = mount({ items: [makeItem({ id: 'i1', chinese: '我去银行' })] });
    app.init();
    await tick();

    app.openItem('i1');

    expect(app.tab).toBe('library');
    expect(app.expandedId).toBe('i1');
    expect(browser.scrolled).toEqual(['item-i1']);
  });

  it('formats a band as a percentage and survives an empty one', () => {
    const app = mount();
    expect(app.percent({ level: 1, seen: 1, total: 4 })).toBe(25);
    expect(app.percent({ level: 1, seen: 0, total: 0 })).toBe(0);
    expect(app.levelLabel(2)).toBe('2');
    expect(app.levelLabel(7)).toBe('7–9');
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
