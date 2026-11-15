/* ==========================================================================
   seta — the Alpine component
   Three tabs, one save sheet. The component owns UI state only: the Go service
   owns the prompt, the direction, the HSK matching and persistence. Anything
   with a rule in it lives in a plain module (translate, library, speak) so it
   can be tested without a browser.
   ========================================================================== */

import type { AlpineComponent } from 'alpinejs';

import {
  EXPORT_PATH,
  createItem as apiCreateItem,
  deleteItem as apiDeleteItem,
  listItems as apiListItems,
  loadCoverage as apiLoadCoverage,
  updateItem as apiUpdateItem,
} from './api';
import { isAbortError } from './http';
import {
  addTags,
  emptySheet,
  filterItems,
  removeTag,
  sheetFromItem,
  sheetFromTranslation,
  sheetFromWord,
  sheetToInput,
} from './library';
import { pinyinFor } from './pinyin';
import type { Assessment } from './practice/grade';
import { startRecording, type Recorder } from './practice/recorder';
import { onAvailability, prime, speakChinese } from './speak';
import { MAX_TEXT_BYTES, countBytes, translateStream } from './translate';
import type { Verdict } from './practice/grade';
import type {
  CoverageReport,
  Direction,
  EngineStatus,
  HskWord,
  Item,
  LevelCoverage,
  SheetState,
  Tab,
  Theme,
} from './types';

export const THEME_KEY = 'seta-theme';
export const PINYIN_KEY = 'seta-pinyin';

const CJK = /[\u4e00-\u9fff]/;
const COPIED_MS = 1500;
const TOAST_MS = 1800;
const READY_POLL_MS = 10_000;
const GAP_PAGE = 50;

/* The assessment engine drags in onnxruntime (~2 MB of JS plus the wasm) for a
   feature most sessions never touch, so it is loaded on first use rather than
   with the app. */
let engine: Promise<typeof import('./practice/engine')> | null = null;
function practiceEngine() {
  engine ??= import('./practice/engine');
  return engine;
}

const EMPTY_COVERAGE: CoverageReport = {
  levels: [],
  current: 0,
  gaps: [],
  gap_total: 0,
  more: false,
};

export function setaApp(): SetaApp {
  return {
    tab: 'translate' as Tab,
    toast: null as string | null,
    theme: 'dark' as Theme,
    ttsAvailable: false,

    /* --- Translate ------------------------------------------------- */
    sourceText: '',
    translatedText: '',
    pinyinText: '',
    direction: 'en-zh' as Direction,
    isTranslating: false,
    error: null as string | null,
    announcement: '',
    showPinyin: true,
    copied: false,
    engineStatus: 'unknown' as EngineStatus,

    /* --- Library --------------------------------------------------- */
    items: [] as Item[],
    libraryQuery: '',
    expandedId: null as string | null,
    loadingItems: false,
    libraryError: null as string | null,

    /* --- HSK ------------------------------------------------------- */
    practiceAvailable: false,
    practice: {} as Record<string, PracticeState>,

    coverage: EMPTY_COVERAGE as CoverageReport,
    gapPage: GAP_PAGE,
    loadingCoverage: false,
    hskError: null as string | null,
    showAllLevels: false,

    /* --- Save sheet ------------------------------------------------ */
    sheet: emptySheet({ open: false }) as SheetState,
    tagDraft: '',

    _controller: null as AbortController | null,
    _readyTimer: null as number | null,
    _toastTimer: null as number | null,
    _copiedTimer: null as number | null,
    _unsubscribeVoices: null as (() => void) | null,
    _recorders: {} as Record<string, Recorder>,
    _practiceTimer: null as number | null,
    _pinyinCache: new Map<string, string>(),

    init() {
      const stored = window.localStorage.getItem(THEME_KEY);
      this.theme =
        stored === 'light' || stored === 'dark'
          ? stored
          : window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark';
      this.applyTheme();

      this.showPinyin = window.localStorage.getItem(PINYIN_KEY) !== '0';

      // Voices are an OS fact and arrive asynchronously; the speak buttons
      // appear only once a Chinese voice is actually installed.
      this.ttsAvailable = prime();
      this._unsubscribeVoices = onAvailability((available) => {
        this.ttsAvailable = available;
      });

      void this.checkEngine();
      void this.refreshLibrary();
      void this.checkPractice();
    },

    /* --- Derived state --------------------------------------------- */

    /** Tone-marked pinyin for any Chinese on screen: rows, sheets, lookups.
        Cached per text because Alpine re-renders often and the converter,
        while fast, is dictionary work. */
    pinyinOf(text: string): string {
      // Only Chinese has a reading: pinyin-pro hands Latin and punctuation
      // straight back, which would echo the English under the source box.
      if (!this.showPinyin || !CJK.test(text)) return '';
      const cached = this._pinyinCache.get(text);
      if (cached !== undefined) return cached;

      const reading = pinyinFor(text);
      this._pinyinCache.set(text, reading);
      return reading;
    },

    get sourceBytes(): number {
      return countBytes(this.sourceText);
    },

    get maxBytes(): number {
      return MAX_TEXT_BYTES;
    },

    get overLimit(): boolean {
      return this.sourceBytes > MAX_TEXT_BYTES;
    },

    get placeholder(): string {
      if (this.engineStatus === 'unavailable') return 'Translation engine is unreachable';
      if (this.engineStatus === 'warming') return 'Model is warming up…';
      return 'Translation appears here';
    },

    get visibleItems(): Item[] {
      return filterItems(this.items, this.libraryQuery);
    },

    get itemCount(): number {
      return this.items.length;
    },

    /** True when the translation output is Chinese (en→zh). */
    get outputIsChinese(): boolean {
      return this.direction === 'en-zh';
    },

    /** What the Translate tab's speak button reads: the Chinese side. */
    get spokenText(): string {
      return this.direction === 'zh-en' ? this.sourceText : this.translatedText;
    },

    get canSaveTranslation(): boolean {
      return this.translatedText.trim() !== '' && !this.isTranslating;
    },

    get visibleLevels(): LevelCoverage[] {
      return this.showAllLevels
        ? this.coverage.levels
        : this.coverage.levels.filter((row) => row.level <= 3);
    },

    get hiddenLevelCount(): number {
      return this.coverage.levels.filter((row) => row.level > 3).length;
    },

    /* --- Tabs ------------------------------------------------------ */

    setTab(tab: Tab) {
      if (tab !== 'library') this.cancelPractices();
      this.tab = tab;
      if (tab === 'hsk') void this.refreshCoverage();
    },

    /* --- Translate ------------------------------------------------- */

    async translate() {
      /* Abort first, unconditionally: clearing the textarea is also a new
         intent, and that stale generation must not paint over the empty panel
         or leave the run indicator spinning. */
      this._controller?.abort();
      this._controller = null;

      const tooLong = this.overLimit;
      if (!this.sourceText.trim() || tooLong) {
        this.translatedText = '';
        this.pinyinText = '';
        this.copied = false;
        this.isTranslating = false;
        this.error = tooLong ? `text exceeds limit (${MAX_TEXT_BYTES} bytes)` : null;
        return;
      }

      const controller = (this._controller = new AbortController());
      const isCurrent = () => this._controller === controller;

      this.translatedText = '';
      this.pinyinText = '';
      this.copied = false;
      this.announcement = '';
      this.isTranslating = true;
      this.error = null;

      try {
        await translateStream({
          text: this.sourceText,
          signal: controller.signal,
          onDirection: (direction) => {
            if (isCurrent()) this.direction = direction;
          },
          onDelta: (delta) => {
            if (!isCurrent()) return; // superseded — never touch the fresh state
            this.translatedText += delta;
            if (this.showPinyin && this.direction === 'en-zh') {
              this.pinyinText = pinyinFor(this.translatedText);
            }
          },
        });
        if (isCurrent()) this.announcement = 'Translation ready'; // one cue, not one per fragment
      } catch (e) {
        if (isAbortError(e) || !isCurrent()) return; // replaced mid-flight — exit silently
        this.error = e instanceof Error ? e.message : 'translation failed';
        void this.checkEngine(); // a 503 usually means the model is still loading
      } finally {
        if (isCurrent()) this.isTranslating = false;
      }
    },

    clear() {
      this.sourceText = '';
      void this.translate(); // aborts anything in flight, resets the panel
    },

    async copyTranslation() {
      if (!this.translatedText) return;
      try {
        await navigator.clipboard.writeText(this.translatedText);
        this.copied = true;
        if (this._copiedTimer !== null) window.clearTimeout(this._copiedTimer);
        this._copiedTimer = window.setTimeout(() => {
          this.copied = false;
        }, COPIED_MS);
      } catch {
        this.notify('copy failed — select the text instead');
      }
    },

    async copyText(text: string) {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        this.notify('Copied');
      } catch {
        this.notify('copy failed — select the text instead');
      }
    },

    /** Reads Chinese aloud; says so when the device has no zh voice. */
    speak(text: string) {
      if (!speakChinese(text)) this.notify('No Chinese voice installed on this device');
    },

    togglePinyin() {
      this.showPinyin = !this.showPinyin;
      window.localStorage.setItem(PINYIN_KEY, this.showPinyin ? '1' : '0');
      // Turning it back on mid-session must not wait for the next delta.
      if (this.showPinyin && this.translatedText) {
        this.pinyinText = pinyinFor(this.translatedText);
      }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(THEME_KEY, this.theme);
      this.applyTheme();
    },

    applyTheme() {
      const root = document.documentElement;
      root.classList.toggle('dark', this.theme === 'dark');
      root.classList.toggle('light', this.theme === 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', this.theme === 'dark' ? '#0B0C10' : '#F9F9FB');
    },

    /** Polls readiness until the model answers, so a cold start reads as
        "warming up" instead of a page that silently fails to translate. */
    async checkEngine() {
      try {
        const res = await fetch('/api/ready', { cache: 'no-store' });
        this.engineStatus = res.ok ? 'ready' : 'warming';
      } catch {
        this.engineStatus = 'unavailable';
      }

      if (this.engineStatus !== 'ready' && this._readyTimer === null) {
        this._readyTimer = window.setTimeout(() => {
          this._readyTimer = null;
          void this.checkEngine();
        }, READY_POLL_MS);
      }
    },

    /* --- Library --------------------------------------------------- */

    async refreshLibrary() {
      this.loadingItems = true;
      this.libraryError = null;
      try {
        this.items = await apiListItems();
        await this.refreshCoverage();
      } catch (e) {
        this.libraryError = e instanceof Error ? e.message : 'could not load the library';
      } finally {
        this.loadingItems = false;
      }
    },

    toggleItem(id: string) {
      this.expandedId = this.expandedId === id ? null : id;
    },

    /* --- Practice ---------------------------------------------------- */

    /** Practice needs the assessment model *and* a microphone: without either,
        the button is not rendered at all. */
    async checkPractice() {
      const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
      this.practiceAvailable = canRecord && (await (await practiceEngine()).modelAvailable());
    },

    async togglePractice(item: Item) {
      const state = this.practice[item.id] ?? { recording: false, busy: false, assessment: null, error: null };
      this.practice[item.id] = { ...state, error: null };

      if (state.recording) {
        await this.stopPractice(item);
        return;
      }

      try {
        this._recorders[item.id] = await startRecording({
          // Finish by itself when the learner stops talking: one press, no
          // guessing how long to leave it running.
          onFinished: () => {
            void this.stopPractice(item);
          },
        });
        this.practice[item.id] = { recording: true, busy: false, assessment: null, error: null };

        // A forgotten recording should end by itself rather than listen until
        // the tab closes.
        this._practiceTimer = window.setTimeout(() => {
          void this.stopPractice(item);
        }, 12_000);
      } catch (error) {
        this.practice[item.id] = {
          recording: false,
          busy: false,
          assessment: null,
          error: error instanceof Error ? error.message : 'could not start recording',
        };
      }
    },

    async stopPractice(item: Item) {
      if (this._practiceTimer !== null) {
        window.clearTimeout(this._practiceTimer);
        this._practiceTimer = null;
      }

      const recorder = this._recorders[item.id];
      delete this._recorders[item.id];
      if (!recorder) return;

      this.practice[item.id] = { recording: false, busy: true, assessment: null, error: null };
      try {
        const take = await recorder.stop();

        // A take with nothing in it is a microphone problem, not a
        // pronunciation one: say so instead of grading silence.
        if (take.seconds < 0.2 || take.peak < 0.01) {
          throw new Error('I did not hear anything — check which microphone is selected');
        }

        const assessment = await (await practiceEngine()).assessRecording(take.audio, item.chinese);
        this.practice[item.id] = { recording: false, busy: false, assessment, error: null };
      } catch (error) {
        this.practice[item.id] = {
          recording: false,
          busy: false,
          assessment: null,
          error: error instanceof Error ? error.message : 'could not check that recording',
        };
      }
    },

    /** Stops anything listening — used when leaving the tab. */
    cancelPractices() {
      if (this._practiceTimer !== null) {
        window.clearTimeout(this._practiceTimer);
        this._practiceTimer = null;
      }
      for (const [id, recorder] of Object.entries(this._recorders)) {
        recorder.cancel();
        delete this._recorders[id];
        this.practice[id] = { recording: false, busy: false, assessment: null, error: null };
      }
    },

    verdictLabel(verdict: Verdict): string {
      if (verdict === 'ok') return 'heard correctly';
      if (verdict === 'tone') return 'wrong tone';
      if (verdict === 'syllable') return 'different syllable';
      return 'not clear enough to judge';
    },

    async removeItem(item: Item) {
      try {
        await apiDeleteItem(item.id);
        if (this.expandedId === item.id) this.expandedId = null;
        this.notify('Deleted');
        await this.refreshLibrary();
      } catch (e) {
        this.notify(e instanceof Error ? e.message : 'could not delete');
      }
    },

    exportLibrary() {
      window.location.href = EXPORT_PATH;
    },

    /* --- HSK ------------------------------------------------------- */

    async refreshCoverage() {
      this.loadingCoverage = true;
      this.hskError = null;
      try {
        this.coverage = await apiLoadCoverage(this.gapPage);
      } catch (e) {
        this.hskError = e instanceof Error ? e.message : 'could not load HSK coverage';
      } finally {
        this.loadingCoverage = false;
      }
    },

    async loadMoreGaps() {
      if (this.loadingCoverage) return;
      this.gapPage += GAP_PAGE;
      await this.refreshCoverage();
    },

    percent(row: LevelCoverage): number {
      if (!row.total) return 0;
      return Math.round((row.seen / row.total) * 100);
    },

    /* --- Save sheet (shared by all three tabs) --------------------- */

    openSaveSheet(draft: Partial<SheetState> = {}) {
      this.sheet = emptySheet(draft);
      this.tagDraft = '';
    },

    /** From the Translate tab: direction decides what the item is. */
    openSaveFromTranslation() {
      this.openSaveSheet(sheetFromTranslation(this.direction, this.sourceText, this.translatedText));
    },

    openSaveFromWord(word: HskWord) {
      this.openSaveSheet(sheetFromWord(word));
    },

    openEditItem(item: Item) {
      this.openSaveSheet(sheetFromItem(item));
    },

    closeSheet() {
      this.sheet = emptySheet({ open: false });
      this.tagDraft = '';
    },

    addTag() {
      this.sheet.tags = addTags(this.sheet.tags, this.tagDraft);
      this.tagDraft = '';
    },

    /** Typing a comma or semicolon commits the tag, chip-editor style. */
    tagsChanged() {
      if (/[,;，、]/.test(this.tagDraft)) this.addTag();
    },

    /** Backspace on an empty input removes the last chip. */
    tagsBackspace() {
      if (this.tagDraft === '' && this.sheet.tags.length > 0) {
        this.sheet.tags = this.sheet.tags.slice(0, -1);
      }
    },

    removeTag(tag: string) {
      this.sheet.tags = removeTag(this.sheet.tags, tag);
    },

    async saveSheet() {
      if (this.sheet.saving) return;
      if (!this.sheet.chinese.trim()) {
        this.sheet.error = 'Chinese text is required';
        return;
      }

      this.sheet.saving = true;
      this.sheet.error = null;
      const editing = this.sheet.id !== null;

      try {
        const input = sheetToInput(this.sheet);
        if (editing && this.sheet.id) {
          await apiUpdateItem(this.sheet.id, input);
        } else {
          await apiCreateItem(input);
        }
        this.closeSheet();
        this.notify(editing ? 'Updated' : 'Saved');
        this.expandedId = null;
        await this.refreshLibrary();
      } catch (e) {
        this.sheet.error = e instanceof Error ? e.message : 'could not save';
      } finally {
        this.sheet.saving = false;
      }
    },

    /* --- Feedback -------------------------------------------------- */

    notify(message: string) {
      this.toast = message;
      if (this._toastTimer !== null) window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => {
        this._toastTimer = null;
        this.toast = null;
      }, TOAST_MS);
    },
  };
}

/** One recording's state, keyed by item id. */
export interface PracticeState {
  recording: boolean;
  busy: boolean;
  assessment: Assessment | null;
  error: string | null;
}

/** The Alpine component's full reactive surface. */
export type SetaApp = AlpineComponent<SetaAppState>;

interface SetaAppState {
  tab: Tab;
  toast: string | null;
  theme: Theme;
  ttsAvailable: boolean;

  sourceText: string;
  translatedText: string;
  pinyinText: string;
  direction: Direction;
  isTranslating: boolean;
  error: string | null;
  announcement: string;
  showPinyin: boolean;
  copied: boolean;
  engineStatus: EngineStatus;

  items: Item[];
  libraryQuery: string;
  expandedId: string | null;
  loadingItems: boolean;
  libraryError: string | null;

  practiceAvailable: boolean;
  practice: Record<string, PracticeState>;

  coverage: CoverageReport;
  gapPage: number;
  loadingCoverage: boolean;
  hskError: string | null;
  showAllLevels: boolean;

  sheet: SheetState;
  tagDraft: string;

  _controller: AbortController | null;
  _readyTimer: number | null;
  _toastTimer: number | null;
  _copiedTimer: number | null;
  _unsubscribeVoices: (() => void) | null;
  _recorders: Record<string, Recorder>;
  _practiceTimer: number | null;
  _pinyinCache: Map<string, string>;

  pinyinOf(text: string): string;
  readonly sourceBytes: number;
  readonly maxBytes: number;
  readonly overLimit: boolean;
  readonly placeholder: string;
  readonly visibleItems: Item[];
  readonly itemCount: number;
  readonly outputIsChinese: boolean;
  readonly spokenText: string;
  readonly canSaveTranslation: boolean;
  readonly visibleLevels: LevelCoverage[];
  readonly hiddenLevelCount: number;

  init(): void;
  setTab(tab: Tab): void;

  translate(): Promise<void>;
  clear(): void;
  copyTranslation(): Promise<void>;
  copyText(text: string): Promise<void>;
  speak(text: string): void;
  togglePinyin(): void;
  toggleTheme(): void;
  applyTheme(): void;
  checkEngine(): Promise<void>;

  checkPractice(): Promise<void>;
  togglePractice(item: Item): Promise<void>;
  stopPractice(item: Item): Promise<void>;
  cancelPractices(): void;
  verdictLabel(verdict: Verdict): string;

  refreshLibrary(): Promise<void>;
  toggleItem(id: string): void;
  removeItem(item: Item): Promise<void>;
  exportLibrary(): void;

  refreshCoverage(): Promise<void>;
  loadMoreGaps(): Promise<void>;
  percent(row: LevelCoverage): number;

  openSaveSheet(draft?: Partial<SheetState>): void;
  openSaveFromTranslation(): void;
  openSaveFromWord(word: HskWord): void;
  openEditItem(item: Item): void;
  closeSheet(): void;
  addTag(): void;
  tagsChanged(): void;
  tagsBackspace(): void;
  removeTag(tag: string): void;
  saveSheet(): Promise<void>;

  notify(message: string): void;
}
