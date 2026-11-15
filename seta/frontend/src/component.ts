/* ==========================================================================
   seta — the Alpine component
   One textarea in, one streaming panel out. The component owns nothing but UI
   state: the Go service owns the prompt, the upstream call, and error
   normalization; translate.ts owns the wire. Exported as a plain factory (no
   side effects) so the state machine can be tested without a browser.
   ========================================================================== */

import type { AlpineComponent } from 'alpinejs';

import { pinyinFor } from './pinyin';
import { MAX_TEXT_BYTES, countBytes, isAbortError, translateStream } from './translate';
import type { EngineStatus, Theme } from './types';

export const THEME_KEY = 'seta-theme';
export const PINYIN_KEY = 'seta-pinyin';
const COPIED_MS = 1500;
const READY_POLL_MS = 10_000;

export function translatorApp(): TranslatorApp {
  return {
    sourceText: '',
    translatedText: '',
    pinyinText: '',
    isTranslating: false,
    error: null,
    theme: 'dark' as Theme,
    showPinyin: true,
    copied: false,
    announcement: '',
    engineStatus: 'unknown' as EngineStatus,
    _controller: null,
    _readyTimer: null,

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
      void this.checkEngine();
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

    /** What the empty output panel says while nothing is being translated. */
    get placeholder(): string {
      if (this.engineStatus === 'unavailable') return 'Translation engine is unreachable';
      if (this.engineStatus === 'warming') return 'Model is warming up…';
      return 'Translation appears here';
    },

    async translate() {
      /* Abort first, unconditionally: clearing the textarea is also a new
         intent, and that stale generation must not paint over the empty
         panel or leave the run indicator spinning. */
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
          onDelta: (delta) => {
            if (!isCurrent()) return; // superseded — never touch the fresh state
            this.translatedText += delta;
            if (this.showPinyin) this.pinyinText = pinyinFor(this.translatedText);
          },
        });
        if (isCurrent()) this.announcement = 'Translation ready'; // one screen-reader cue, not one per fragment
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
        window.setTimeout(() => {
          this.copied = false;
        }, COPIED_MS);
      } catch {
        this.error = 'copy failed — select the text instead';
      }
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
  };
}

/** The Alpine component's full reactive surface. */
export type TranslatorApp = AlpineComponent<TranslatorAppState>;

interface TranslatorAppState {
  sourceText: string;
  translatedText: string;
  pinyinText: string;
  isTranslating: boolean;
  error: string | null;
  theme: Theme;
  showPinyin: boolean;
  copied: boolean;
  announcement: string;
  engineStatus: EngineStatus;
  _controller: AbortController | null;
  _readyTimer: number | null;

  readonly sourceBytes: number;
  readonly maxBytes: number;
  readonly overLimit: boolean;
  readonly placeholder: string;

  init(): void;
  translate(): Promise<void>;
  clear(): void;
  copyTranslation(): Promise<void>;
  togglePinyin(): void;
  toggleTheme(): void;
  applyTheme(): void;
  checkEngine(): Promise<void>;
}
