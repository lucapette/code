/* ==========================================================================
   seta — English → Simplified Chinese translator
   Alpine.js state: one textarea in, one streaming panel out. The component
   owns nothing but UI state and SSE consumption — the Go service owns the
   prompt, the upstream call, and error normalization.
   ========================================================================== */

import Alpine, { AlpineComponent } from 'alpinejs';

import { pinyinFor } from './pinyin';
import { isRecord, parseSSEBuffer } from './sse';
import type { Theme } from './types';

const THEME_KEY = 'seta-theme';

/* Keyboard bursts abort stale requests: each call owns the controller it
   started, so a superseded request never touches the fresh one's state. */

function translatorApp(): TranslatorApp {
  return {
    sourceText: '',
    translatedText: '',
    pinyinText: '',
    isTranslating: false,
    error: null,
    theme: 'dark' as Theme,
    _controller: null,

    init() {
      const stored = localStorage.getItem(THEME_KEY);
      this.theme =
        stored === 'light' || stored === 'dark'
          ? stored
          : window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark';
      this.applyTheme();
    },

    async translate() {
      if (!this.sourceText.trim()) {
        this.translatedText = '';
        this.pinyinText = '';
        this.error = null;
        return;
      }

      this._controller?.abort();
      const controller = (this._controller = new AbortController());
      this.translatedText = '';
      this.pinyinText = '';
      this.isTranslating = true;
      this.error = null;

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: this.sourceText }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(await errorMessage(res));
        if (!res.body) throw new Error('no response stream');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (done) buffer += decoder.decode(); // flush the decoder

          const parsed = parseSSEBuffer(buffer);
          buffer = parsed.rest;
          for (const delta of parsed.deltas) this.translatedText += delta;
          if (parsed.deltas.length) this.pinyinText = pinyinFor(this.translatedText);

          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done || done) break;
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // replaced mid-flight — exit silently
        if (this._controller === controller) {
          this.error = e instanceof Error ? e.message : 'translation failed';
        }
      } finally {
        if (this._controller === controller) this.isTranslating = false;
      }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, this.theme);
      this.applyTheme();
    },

    applyTheme() {
      const root = document.documentElement;
      root.classList.toggle('dark', this.theme === 'dark');
      root.classList.toggle('light', this.theme === 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', this.theme === 'dark' ? '#0B0C10' : '#F9F9FB');
    },
  };
}

/** Reads the Go service's normalized {"error":"…"} body, falling back to a
    generic message when there's nothing readable (e.g. a dead network). */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    /* no body or not JSON — fall through */
  }
  return 'translation failed';
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
  _controller: AbortController | null;

  init(): void;
  translate(): Promise<void>;
  toggleTheme(): void;
  applyTheme(): void;
}

document.addEventListener('alpine:init', () => {
  Alpine.data('translatorApp', translatorApp);
});

Alpine.start();
