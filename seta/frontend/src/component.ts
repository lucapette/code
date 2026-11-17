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
  gradeReview as apiGradeReview,
  listItems as apiListItems,
  loadCoverage as apiLoadCoverage,
  loadReviewQueue as apiLoadReviewQueue,
  searchVocabulary as apiSearchVocabulary,
  updateItem as apiUpdateItem,
} from './api';
import { isAbortError } from './http';
import {
  DEFAULT_LEVELS,
  WORD_PAGE,
  extraRefs,
  groupKnown,
  levelLabel as hskLevelLabel,
  levelPercent,
  showingLevel,
  textRefs,
  toggleLevel,
  type KnownGroup,
} from './hsk';
import {
  addTags,
  emptySheet,
  filterItems,
  removeTag,
  sheetFromItem,
  sheetFromTranslation,
  sheetFromWord,
  sheetToInput,
  sortByPinyin,
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
  HskView,
  HskWord,
  Item,
  KnownWord,
  LevelCoverage,
  ReviewScope,
  SearchResults,
  SheetState,
  Tab,
  Theme,
  WordRef,
} from './types';

export const THEME_KEY = 'seta-theme';
export const PINYIN_KEY = 'seta-pinyin';

const CJK = /[\u4e00-\u9fff]/;
const COPIED_MS = 1500;
const TOAST_MS = 1800;
const READY_POLL_MS = 10_000;
const GAP_PAGE = WORD_PAGE;

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
  known: { words: [], total: 0, more: false },
  gaps: { words: [], total: 0, more: false },
};

const EMPTY_SEARCH: SearchResults = { words: [], total: 0, more: false };

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

    /* --- Review (one overlay, one card at a time) ------------------- */
    reviewOpen: false,
    reviewScope: 'due' as ReviewScope,
    reviewCards: [] as Item[],
    reviewIndex: 0,
    reviewRevealed: false,
    reviewDone: 0,
    reviewLoading: false,
    reviewError: null as string | null,
    reviewDue: 0,
    reviewTotal: 0,

    /* --- HSK ------------------------------------------------------- */
    practiceAvailable: false,
    practice: {} as Record<string, PracticeState>,

    coverage: EMPTY_COVERAGE as CoverageReport,
    hskView: 'known' as HskView,
    knownLevels: [...DEFAULT_LEVELS],
    knownPage: WORD_PAGE,
    gapLevel: 0,
    gapPage: GAP_PAGE,
    loadingCoverage: false,
    hskError: null as string | null,

    /* --- HSK search (every band, known and missing) ---------------- */
    hskQuery: '',
    hskResults: EMPTY_SEARCH as SearchResults,
    loadingSearch: false,
    searchError: null as string | null,
    searchPage: WORD_PAGE,

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
    _searchSeq: 0,

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

    /** What the rail says about the model, in the same words everywhere. */
    get statusLabel(): string {
      if (this.engineStatus === 'ready') return 'model ready';
      if (this.engineStatus === 'warming') return 'model warming up';
      if (this.engineStatus === 'unavailable') return 'model unreachable';
      return 'checking model…';
    },

    get placeholder(): string {
      if (this.engineStatus === 'unavailable') return 'Translation engine is unreachable';
      if (this.engineStatus === 'warming') return 'Model is warming up…';
      return 'Translation appears here';
    },

    get visibleItems(): Item[] {
      return sortByPinyin(filterItems(this.items, this.libraryQuery));
    },

    get itemCount(): number {
      return this.items.length;
    },

    /** The card being reviewed, or null on an empty or finished session. */
    get currentReviewCard(): Item | null {
      return this.reviewCards[this.reviewIndex] ?? null;
    },

    get reviewRemaining(): number {
      return Math.max(0, this.reviewCards.length - this.reviewIndex);
    },

    get reviewProgress(): string {
      if (!this.currentReviewCard) return '';
      return `${this.reviewRemaining} left · ${this.reviewDone} done`;
    },

    get reviewButtonLabel(): string {
      return this.reviewDue > 0 ? `review ${this.reviewDue}` : 'review';
    },

    /** Every HSK word met, across all bands, not just the ones on screen. */
    get metCount(): number {
      return this.coverage.levels.reduce((sum, row) => sum + row.seen, 0);
    },

    /** A query turns the HSK tab into a search across every band. */
    get hskSearchActive(): boolean {
      return this.hskQuery.trim() !== '';
    },

    /** One Latin letter is not a search: the vocabulary would answer with
        hundreds of partial pinyin matches. A single Chinese character is fine. */
    get hskQueryTooShort(): boolean {
      const query = this.hskQuery.trim();
      return query.length === 1 && !CJK.test(query);
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

    /** The met words, bucketed by band, one group per selected band. */
    get knownGroups(): KnownGroup[] {
      return groupKnown(this.coverage, this.knownLevels);
    },

    /** The band whose unseen words the explore view is listing. */
    get gapLevelShown(): number {
      return showingLevel(this.coverage, this.gapLevel);
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
        // Saving or deleting an item changes what counts as met, and a running
        // HSK search labels every hit with exactly that.
        if (this.hskSearchActive) await this.searchVocabulary();
        await this.refreshReviewDue();
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

    /* --- Review ----------------------------------------------------- */

    /** The due badge on the library header, nothing more. A failure here is not
        worth a banner: the overlay reports its own errors. */
    async refreshReviewDue() {
      try {
        const queue = await apiLoadReviewQueue('due', 1);
        this.reviewDue = queue.due;
        this.reviewTotal = queue.total;
      } catch {
        /* leave the count as it was */
      }
    },

    async openReview(scope: ReviewScope = 'due') {
      this.reviewOpen = true;
      this.reviewScope = scope;
      this.reviewCards = [];
      this.reviewIndex = 0;
      this.reviewRevealed = false;
      this.reviewDone = 0;
      this.reviewError = null;
      this.reviewLoading = true;

      try {
        const queue = await apiLoadReviewQueue(scope);
        this.reviewCards = queue.cards;
        this.reviewDue = queue.due;
        this.reviewTotal = queue.total;
      } catch (e) {
        this.reviewError = e instanceof Error ? e.message : 'could not load the review queue';
      } finally {
        this.reviewLoading = false;
      }
    },

    closeReview() {
      this.reviewOpen = false;
      this.reviewCards = [];
      this.reviewIndex = 0;
      this.reviewRevealed = false;
      this.reviewDone = 0;
      this.reviewError = null;
      void this.refreshReviewDue();
    },

    revealReview() {
      if (this.currentReviewCard) this.reviewRevealed = true;
    },

    async gradeReview(grade: 0 | 1 | 2) {
      const card = this.currentReviewCard;
      if (!card || !this.reviewRevealed) return;

      this.reviewError = null;
      try {
        await apiGradeReview(card.id, grade);
      } catch (e) {
        this.reviewError = e instanceof Error ? e.message : 'could not save the grade';
        return;
      }

      this.reviewDone += 1;
      if (grade === 0) {
        // "Again" comes back at the end of this session, not tomorrow.
        this.reviewCards = [...this.reviewCards, card];
      }
      this.reviewIndex += 1;
      this.reviewRevealed = false;

      if (!this.currentReviewCard) void this.refreshReviewDue();
    },

    /** Space reveals, 1/2/3 grade, Escape closes. The card has no fields, so
        there is nothing to distract a keyboard shortcut. */
    handleReviewKey(event: KeyboardEvent) {
      if (!this.reviewOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeReview();
        return;
      }
      if (!this.currentReviewCard) return;

      if (event.key === ' ' && !this.reviewRevealed) {
        event.preventDefault();
        this.revealReview();
        return;
      }
      if (!this.reviewRevealed) return;

      if (event.key === '1') {
        event.preventDefault();
        void this.gradeReview(0);
      }
      if (event.key === '2') {
        event.preventDefault();
        void this.gradeReview(1);
      }
      if (event.key === '3') {
        event.preventDefault();
        void this.gradeReview(2);
      }
    },

    /* --- HSK ------------------------------------------------------- */

    async refreshCoverage() {
      this.loadingCoverage = true;
      this.hskError = null;
      try {
        this.coverage = await apiLoadCoverage({
          levels: this.knownLevels,
          known: this.knownPage,
          level: this.gapLevel,
          gaps: this.gapPage,
        });
      } catch (e) {
        this.hskError = e instanceof Error ? e.message : 'could not load HSK coverage';
      } finally {
        this.loadingCoverage = false;
      }
    },

    /** Add or remove one band from the known list. The last band stays. */
    async toggleKnownLevel(level: number) {
      const next = toggleLevel(this.knownLevels, level);
      if (next === this.knownLevels) return;
      this.knownLevels = next;
      this.knownPage = WORD_PAGE;
      await this.refreshCoverage();
    },

    /** Point the gap list at one band instead of the map's current level. */
    async showLevel(level: number) {
      const target = level === this.coverage.current ? 0 : level;
      if (target === this.gapLevel) return;
      this.gapLevel = target;
      this.gapPage = GAP_PAGE;
      await this.refreshCoverage();
    },

    /** Typing in the HSK search box: a new query starts a new page. */
    startHskSearch() {
      this.searchPage = WORD_PAGE;
      void this.searchVocabulary();
    },

    /** Searches the whole vocabulary — Chinese, pinyin with or without tones,
        or English — and marks each hit as met or missing. */
    async searchVocabulary() {
      const query = this.hskQuery.trim();
      const seq = ++this._searchSeq;

      if (!query) {
        this.hskResults = EMPTY_SEARCH;
        this.loadingSearch = false;
        this.searchError = null;
        return;
      }

      this.loadingSearch = true;
      this.searchError = null;
      try {
        const results = await apiSearchVocabulary(query, this.searchPage);
        if (seq !== this._searchSeq) return; // a newer keystroke won
        this.hskResults = results;
      } catch (e) {
        if (seq !== this._searchSeq) return;
        this.searchError = e instanceof Error ? e.message : 'could not search the HSK vocabulary';
      } finally {
        if (seq === this._searchSeq) this.loadingSearch = false;
      }
    },

    async loadMoreSearch() {
      if (this.loadingSearch) return;
      this.searchPage += WORD_PAGE;
      await this.searchVocabulary();
    },

    clearHskSearch() {
      this.hskQuery = '';
      this.searchPage = WORD_PAGE;
      void this.searchVocabulary();
    },

    async loadMoreKnown() {
      if (this.loadingCoverage) return;
      this.knownPage += WORD_PAGE;
      await this.refreshCoverage();
    },

    async loadMoreGaps() {
      if (this.loadingCoverage) return;
      this.gapPage += GAP_PAGE;
      await this.refreshCoverage();
    },

    percent(row: LevelCoverage): number {
      return levelPercent(row);
    },

    levelLabel(level: number): string {
      return hskLevelLabel(level);
    },

    /** How many of a word's references the row had to leave out. */
    extraRefs(word: KnownWord): number {
      return extraRefs(word);
    },


    /** The sentence references a word carries: the chips on the row. */
    textRefs(word: KnownWord) {
      return textRefs(word);
    },


    /** Where a truncated reference list goes: the library, searching the word. */
    searchLibrary(text: string) {
      this.setTab('library');
      this.libraryQuery = text;
    },

    /** Follow a word's reference into the library and open that item. */
    openItem(id: string) {
      this.setTab('library');
      this.expandedId = id;
      this.scrollToItem(id);
    },

    scrollToItem(id: string) {
      const el = document.getElementById(`item-${id}`);
      el?.scrollIntoView({ block: 'center' });
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

  reviewOpen: boolean;
  reviewScope: ReviewScope;
  reviewCards: Item[];
  reviewIndex: number;
  reviewRevealed: boolean;
  reviewDone: number;
  reviewLoading: boolean;
  reviewError: string | null;
  reviewDue: number;
  reviewTotal: number;

  practiceAvailable: boolean;
  practice: Record<string, PracticeState>;

  coverage: CoverageReport;
  hskView: HskView;
  knownLevels: number[];
  knownPage: number;
  gapLevel: number;
  gapPage: number;
  loadingCoverage: boolean;
  hskError: string | null;

  hskQuery: string;
  hskResults: SearchResults;
  loadingSearch: boolean;
  searchError: string | null;
  searchPage: number;

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
  _searchSeq: number;

  pinyinOf(text: string): string;
  readonly sourceBytes: number;
  readonly maxBytes: number;
  readonly overLimit: boolean;
  readonly statusLabel: string;
  readonly placeholder: string;
  readonly visibleItems: Item[];
  readonly itemCount: number;
  readonly currentReviewCard: Item | null;
  readonly reviewRemaining: number;
  readonly reviewProgress: string;
  readonly reviewButtonLabel: string;
  readonly metCount: number;
  readonly outputIsChinese: boolean;
  readonly spokenText: string;
  readonly canSaveTranslation: boolean;
  readonly knownGroups: KnownGroup[];
  readonly gapLevelShown: number;
  readonly hskSearchActive: boolean;
  readonly hskQueryTooShort: boolean;

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

  refreshReviewDue(): Promise<void>;
  openReview(scope?: ReviewScope): Promise<void>;
  closeReview(): void;
  revealReview(): void;
  gradeReview(grade: 0 | 1 | 2): Promise<void>;
  handleReviewKey(event: KeyboardEvent): void;

  refreshCoverage(): Promise<void>;
  toggleKnownLevel(level: number): Promise<void>;
  showLevel(level: number): Promise<void>;
  loadMoreKnown(): Promise<void>;
  loadMoreGaps(): Promise<void>;
  startHskSearch(): void;
  searchVocabulary(): Promise<void>;
  loadMoreSearch(): Promise<void>;
  clearHskSearch(): void;
  percent(row: LevelCoverage): number;
  levelLabel(level: number): string;
  extraRefs(word: KnownWord): number;
  textRefs(word: KnownWord): WordRef[];
  searchLibrary(text: string): void;
  openItem(id: string): void;
  scrollToItem(id: string): void;

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
