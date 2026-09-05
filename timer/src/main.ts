/* ==========================================================================
   Timer — Interval Timer
   Alpine.js state management, wiring the pure timer engine (engine.ts)
   to the DOM.

   A "session" is a sequence of intervals (a pattern). The pattern tiles
   until the session's total duration is consumed:
     - 7 min preset  -> seven 1-minute intervals
   ========================================================================== */

import Alpine, { AlpineComponent } from 'alpinejs';

import * as TimerEngine from './engine';
import { createHeartbeat } from './heartbeat';
import type { HeartbeatController } from './heartbeat';
import type {
  Interval,
  PatternSegment,
  Preset,
  Session,
  StripSegment,
  Theme,
  TimerStatus,
  Urgency,
  View,
} from './types';

const URGENCY_COLOR: Record<Urgency, string> = {
  normal: 'var(--accent)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

/* Stable hue per pattern position (golden-angle spacing keeps adjacent
   segments distinct). Same position across presets → same hue. */
const GOLDEN = 137.508;
function segmentHue(index: number): number {
  return Math.round((index * GOLDEN) % 360);
}

/* Safari exposes the audio context under a vendor prefix. */
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/* Type guards for the localStorage preset payload (user-writable data). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInterval(value: unknown): value is Interval {
  return isRecord(value) && typeof value.seconds === 'number';
}

/** Migrates a stored preset payload (new or legacy {id,name,minutes}
    schema) into a well-formed Preset. */
function parsePreset(value: unknown): Preset {
  if (isRecord(value)) {
    if (typeof value.totalSeconds === 'number' && Array.isArray(value.intervals)) {
      return {
        id: typeof value.id === 'string' ? value.id : `c-${Date.now()}`,
        name: typeof value.name === 'string' ? value.name : 'Preset',
        totalSeconds: value.totalSeconds,
        intervals: value.intervals.filter(isInterval),
      };
    }
    /* Legacy {id, name, minutes} schema. */
    const minutes = typeof value.minutes === 'number' ? value.minutes : 7;
    const seconds = minutes * 60;
    return {
      id: typeof value.id === 'string' ? value.id : `c-${Date.now()}`,
      name: typeof value.name === 'string' ? value.name : 'Preset',
      totalSeconds: seconds,
      intervals: [{ seconds, label: '' }],
    };
  }
  return { id: `c-${Date.now()}`, name: 'Preset', totalSeconds: 420, intervals: [{ seconds: 420, label: '' }] };
}

const DEFAULT_7_MIN: Preset = {
  id: 'p7',
  name: '7 min',
  totalSeconds: 420,
  intervals: Array.from({ length: 7 }, () => ({ seconds: 60, label: '' })),
};

function timerApp(): TimerApp {
  return {
    /* --- Session definition (currently loaded) ----------------------- */
    session: {
      id: DEFAULT_7_MIN.id,
      name: DEFAULT_7_MIN.name,
      totalSeconds: DEFAULT_7_MIN.totalSeconds,
      intervals: DEFAULT_7_MIN.intervals.map((iv) => ({ ...iv })),
    },
    sessionRemaining: 420,    // whole-session time left
    intervalIndex: 0,         // current interval in the tiled pattern
    intervalTotal: 60,        // duration of the current interval
    intervalRemaining: 60,    // time left in the current interval
    announcedIntervalIndex: null, // last interval index whose start was announced

    /* --- Timer state --- */
    status: 'IDLE',           // IDLE | RUNNING | PAUSED
    rafId: null,              // requestAnimationFrame id
    heartbeat: { start() {}, stop() {} }, // replaced by init()'s real heartbeat
    startTimestamp: null,     // Date.now() baseline for elapsed math
    baseElapsed: 0,           // seconds elapsed, frozen at pause
    lastSpokenMinute: null,   // last minute boundary already announced
    wakeLock: null,           // screen wake lock handle
    theme: 'dark',

    /* --- Presets & configuration --- */
    savedPresets: [],         // all presets (seeded with 7 min on first run)
    view: 'timer',            // 'timer' | 'edit'
    draftPresetId: 'new',     // 'new' or an existing savedPresets id
    draftName: '',            // preset name being configured
    draftTotalMinutes: 7,     // session total being configured (minutes)
    draftIntervals: [{ seconds: 420, label: 'until break' }],

    /* --- Audio (lazily created) -------------------------------------- */
    audioCtx: null,

    /* ------------------------------------------------------------------ */
    init() {
      const saved = localStorage.getItem('timer-theme');
      if (saved === 'light' || saved === 'dark') {
        this.theme = saved;
      } else {
        this.theme = window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light' : 'dark';
      }
      this.applyTheme();

      /* Load presets. On the very first run there is no stored data, so seed
         the default 7 min preset. After that presets are fully user-managed:
         editable and deletable like any other. Also migrates the old
         {id,name,minutes} schema to {id,name,totalSeconds,intervals[]}. */
      try {
        const raw = localStorage.getItem('timer-presets');
        if (raw === null) {
          this.savedPresets = [DEFAULT_7_MIN];
          localStorage.setItem('timer-presets', JSON.stringify(this.savedPresets));
        } else {
          const parsed: unknown = JSON.parse(raw);
          this.savedPresets = Array.isArray(parsed)
            ? parsed.map(parsePreset)
            : [];
        }
      } catch (err) {
        this.savedPresets = [];
      }

      /* Boot into a real preset: if the stored session id no longer exists
         (e.g. first run, or its preset was deleted), load the first one so the
         strip shows the first interval's label right away. */
      if (!this.savedPresets.find((p) => p.id === this.session.id) && this.savedPresets.length) {
        this.applyPreset(this.savedPresets[0].id);
      }

      /* Page visibility: recompute from the wall clock and re-acquire the
         wake lock when the tab becomes visible again (mobile drops it).
         While hidden, the heartbeat keeps advancing instead of rAF. */
      this.heartbeat = createHeartbeat(() => this.advance());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          if (this.status === 'RUNNING') {
            this.requestWakeLock();
            this.advance();
          }
        }
      });
    },

    /* --- Pattern helpers ---------------------------------------------- */
    updateIntervalFromElapsed(elapsed: number) {
      const st = TimerEngine.intervalState(this.session.intervals, elapsed);
      if (!st) return;
      this.intervalIndex = st.index;
      this.intervalTotal = st.total;
      this.intervalRemaining = st.remaining;
    },

    /* --- Getters (reactively bound to the DOM) ------------------------ */
    get displayTime() {
      return TimerEngine.formatClock(Math.ceil(Math.max(0, this.intervalRemaining)));
    },

    get sessionDisplay() {
      return TimerEngine.formatClock(Math.ceil(Math.max(0, this.sessionRemaining)));
    },

    get intervalCaption() {
      if (this.status === 'PAUSED') return 'paused';
      if (this.status === 'IDLE') {
        const first = (this.session.intervals[0]?.label || '').trim();
        return first || 'ready to start';
      }
      const label = (this.session.intervals[this.intervalIndex]?.label || '').trim();
      return label ? label : 'interval';
    },

    /* Color for the big countdown: urgency-driven, idle stays calm. */
    get clockColor() {
      return URGENCY_COLOR[TimerEngine.urgency(this.intervalRemaining)];
    },

    /* Position within one pattern tile — the strip repeats the tile, so the
       current interval's index wraps modulo the chain length. */
    get patternIndex() {
      return this.intervalIndex % Math.max(1, this.session.intervals.length);
    },

    /* The plan strip: one segment per interval, labelled and hue-assigned by
       pattern position so Work→Rest stays visually distinct. */
    get patternStrip() {
      return TimerEngine.stripLayout(this.session.intervals)
        .map((seg, i) => ({ ...seg, hue: segmentHue(i) }));
    },

    /* Accessible description of the plan for the strip's aria-label. */
    get patternStripCaption() {
      return this.session.intervals
        .map((iv) => `${(iv.label || 'interval').trim()} ${iv.seconds}s`)
        .join(', ');
    },

    /* Percent of the whole session already elapsed, for the thin bar. */
    get sessionPercent() {
      const total = this.session.totalSeconds;
      return total ? 100 * (1 - this.sessionRemaining / total) : 0;
    },

    get playLabel() {
      if (this.status === 'RUNNING') return 'Pause';
      return this.status === 'PAUSED' ? 'Resume' : 'Start';
    },

    /* True while a session is active on the timer view — the whole app
       recedes and the running timer takes the stage. Not on the edit view,
       which still needs its topbar. */
    get sessionMode() {
      return this.view === 'timer' && this.status !== 'IDLE';
    },

    /* --- Strip styling -------------------------------------------------- */
    /* The strip segment for the current interval drains left-to-right as it
       counts down (its bright fill is the portion remaining). Colors are
       theme-explicit so a theme toggle re-resolves them deterministically. */
    segColor(hue: number) {
      return {
        base: this.theme === 'light' ? `hsl(${hue} 55% 34% / 0.26)` : `hsl(${hue} 40% 52% / 0.20)`,
        fill: this.theme === 'light' ? `hsl(${hue} 70% 42%)` : `hsl(${hue} 75% 62%)`,
        future: this.theme === 'light' ? `hsl(${hue} 55% 34% / 0.10)` : `hsl(${hue} 40% 52% / 0.09)`,
      };
    },

    segStyle(seg: PatternSegment, i: number) {
      const c = this.segColor(seg.hue);
      const running = this.status !== 'IDLE';
      const current = i === this.patternIndex;
      return {
        width: `${(seg.fraction * 100).toFixed(3)}%`,
        /* Idle segments show the full fill color, matching the mini strips
           on the preset picks; while running the current segment drains
           from its fill down to the dim base. */
        '--seg-base': running ? c.base : c.fill,
        '--seg-fill': c.fill,
        '--seg-future': c.future,
        '--fill': current && running
          ? (this.intervalTotal ? this.intervalRemaining / this.intervalTotal : 0)
          : 0,
      };
    },

    /* Mini strip for preset picks and editor previews. */
    miniStrip(preset: { intervals: Interval[] }): StripSegment[] {
      return TimerEngine.stripLayout(preset.intervals);
    },

    miniSegStyle(seg: StripSegment, i: number) {
      return {
        width: `${(seg.fraction * 100).toFixed(3)}%`,
        backgroundColor: this.segColor(segmentHue(i)).fill,
      };
    },

    get draftStrip() {
      return this.miniStrip({ intervals: this.draftIntervals });
    },

    /* Label of the upcoming interval, shown as a teaser in the final
       seconds of the current one. Decision lives in the engine. */
    get nextLabel() {
      return TimerEngine.nextLabel(
        this.session.intervals,
        this.intervalIndex,
        this.intervalRemaining,
        this.sessionRemaining
      );
    },

    /* Interval count inside the tiled session, e.g. "3 / 14", delegated
       to the engine. Empty for a single-interval session — a plain
       countdown has nothing to count. */
    get intervalProgress() {
      const count = TimerEngine.progressCount(
        this.session.intervals,
        this.session.totalSeconds,
        this.sessionRemaining
      );
      return count ? `${count.current} / ${count.total}` : '';
    },

    get presets() {
      return this.savedPresets;
    },

    get activePresetId() {
      const match = this.presets.find((p) => p.id === this.session.id);
      return match ? match.id : null;
    },

    /* --- Controls ------------------------------------------------------ */
    togglePlay() {
      if (this.status === 'RUNNING') {
        this.pause();
      } else {
        this.start();
      }
    },

    start() {
      if (this.status === 'RUNNING') return;
      if (this.sessionRemaining <= 0) {
        this.baseElapsed = 0;
        this.sessionRemaining = this.session.totalSeconds;
      }

      /* Baseline at the moment we (re)start: tick() computes elapsed as
         baseElapsed + time-since-this-timestamp, so pausing freezes progress
         and resuming must not double-count the paused time. */
      this.startTimestamp = Date.now();
      this.updateIntervalFromElapsed(this.baseElapsed);
      /* A fresh start (elapsed 0) must announce the first interval; on resume
         the current interval was already announced, so skip it. */
      this.announcedIntervalIndex = this.baseElapsed > 0 ? this.intervalIndex : null;
      this.lastSpokenMinute = Math.ceil(this.intervalRemaining / 60);
      this.status = 'RUNNING';
      this.requestWakeLock();
      this.heartbeat.start();
      this.tick();
    },

    pause() {
      if (this.status !== 'RUNNING') return;
      this.status = 'PAUSED';
      cancelAnimationFrame(this.rafId ?? 0);
      this.rafId = null;
      /* Accumulate, don't overwrite: baseElapsed already holds every run
         before this one after a previous pause, so counting only since the
         last resume would lose it and the session would run too long. */
      this.baseElapsed += (Date.now() - (this.startTimestamp ?? Date.now())) / 1000;
      this.updateIntervalFromElapsed(this.baseElapsed);
      this.sessionRemaining = Math.max(0, this.session.totalSeconds - this.baseElapsed);
      this.heartbeat.stop();
      this.stopWakeLock();
    },

    reset() {
      this.status = 'IDLE';
      cancelAnimationFrame(this.rafId ?? 0);
      this.rafId = null;
      this.baseElapsed = 0;
      this.sessionRemaining = this.session.totalSeconds;
      const first = this.session.intervals[0];
      this.intervalIndex = 0;
      this.intervalTotal = first ? first.seconds : this.session.totalSeconds;
      this.intervalRemaining = this.intervalTotal;
      this.lastSpokenMinute = null;
      this.announcedIntervalIndex = null;
      this.heartbeat.stop();
      this.stopWakeLock();
    },

    applyPreset(id: string) {
      if (this.status === 'RUNNING') return;
      const preset = this.presets.find((p) => p.id === id);
      if (!preset) return;
      this.session = {
        id: preset.id,
        name: preset.name,
        totalSeconds: preset.totalSeconds,
        intervals: preset.intervals.map((iv) => ({ ...iv })),
      };
      this.status = 'IDLE';
      this.baseElapsed = 0;
      this.sessionRemaining = this.session.totalSeconds;
      const first = this.session.intervals[0];
      this.intervalIndex = 0;
      this.intervalTotal = first ? first.seconds : this.session.totalSeconds;
      this.intervalRemaining = this.intervalTotal;
      this.lastSpokenMinute = null;
      this.announcedIntervalIndex = null;
    },

    /* --- Engine -------------------------------------------------------- */
    /* Recompute all state from the wall clock. Idempotent: announcement
       guards (announcedIntervalIndex, lastSpokenMinute) make repeated
       calls safe, whether driven by rAF or by the heartbeat. The RUNNING
       guard makes stray beats harmless — a worker beat posted right before
       termination can still arrive after pause(), and without the guard it
       would compute a huge elapsed (startTimestamp is old) and complete() a
       session that was only paused. */
    advance() {
      if (this.status !== 'RUNNING') return;
      const elapsed = this.baseElapsed + (Date.now() - (this.startTimestamp ?? Date.now())) / 1000;
      this.sessionRemaining = Math.max(0, this.session.totalSeconds - elapsed);

      if (this.sessionRemaining <= 0) {
        this.complete();
        return;
      }

      const idx = TimerEngine.indexOfInterval(this.session.intervals, elapsed);
      if (idx !== this.announcedIntervalIndex) this.onIntervalChange(idx);

      this.updateIntervalFromElapsed(elapsed);
      if (this.intervalTotal >= 60) this.checkMinuteMark(this.intervalRemaining);
    },

    tick() {
      if (this.status !== 'RUNNING') return;
      this.advance();
      if (this.status !== 'RUNNING') return;
      this.rafId = requestAnimationFrame(() => this.tick());
    },

    /* Announce each interval as it starts (Work / Rest / …). */
    onIntervalChange(idx: number) {
      this.announcedIntervalIndex = idx;
      this.intervalIndex = idx;
      const label = (this.session.intervals[idx].label || '').trim();
      if (label) {
        this.speak(label);
      } else {
        this.playBeep(700, 130, 'sine', 0.45);
        if (navigator.vibrate) navigator.vibrate(40);
      }
      this.lastSpokenMinute = Math.ceil(this.intervalTotal / 60);
    },

    /* Announce minute marks only inside intervals >= 60s. */
    checkMinuteMark(intervalRemaining: number) {
      const minutes = TimerEngine.minuteMark(
        this.intervalTotal,
        intervalRemaining,
        this.lastSpokenMinute
      );
      if (minutes === null) return;

      this.lastSpokenMinute = minutes;
      const label = minutes === 1
        ? '1 minute remaining'
        : `${minutes} minutes remaining`;

      this.speak(label);
      this.playBeep(800, 150, 'sine', 0.4);
      if (navigator.vibrate) navigator.vibrate(50);
    },

    complete() {
      this.intervalRemaining = 0;
      this.sessionRemaining = 0;
      this.status = 'IDLE';
      cancelAnimationFrame(this.rafId ?? 0);
      this.rafId = null;
      this.heartbeat.stop();
      this.stopWakeLock();

      this.speak('Time is up!');
      if (navigator.vibrate) navigator.vibrate([120, 80, 120, 80, 240]);
    },

    /* --- Presets & configuration -------------------------------------- */
    /* Open the edit view with a fresh draft. */
    openEdit() {
      this.newDraft();
      this.view = 'edit';
    },

    /* Reset the draft form to a blank preset. */
    newDraft() {
      this.draftPresetId = 'new';
      this.draftName = '';
      this.draftTotalMinutes = 7;
      this.draftIntervals = [{ seconds: 60, label: '' }];
    },

    /* Open the config editor pre-loaded with an existing preset. Editing
       always happens in place — there are no locked built-ins. */
    openConfigFor(id: string) {
      const preset = this.savedPresets.find((p) => p.id === id);
      if (!preset) {
        this.newDraft();
        return;
      }
      this.draftPresetId = id;
      this.draftName = preset.name;
      this.draftTotalMinutes = Math.round((preset.totalSeconds / 60) * 2) / 2;
      this.draftIntervals = preset.intervals.map((iv) => ({ seconds: iv.seconds, label: iv.label }));
      this.view = 'edit';
    },

    draftIntervalAdjust(index: number, delta: number) {
      const iv = this.draftIntervals[index];
      if (!iv) return;
      const cur = Number.isFinite(iv.seconds) ? iv.seconds : 60;
      iv.seconds = Math.max(5, cur + delta);
    },

    addDraftInterval() {
      this.draftIntervals.push({ seconds: 60, label: '' });
    },

    removeDraftInterval(index: number) {
      this.draftIntervals.splice(index, 1);
      if (!this.draftIntervals.length) {
        this.draftIntervals.push({ seconds: 60, label: '' });
      }
    },

    draftTotalAdjust(delta: number) {
      const cur = Number.isFinite(this.draftTotalMinutes) ? this.draftTotalMinutes : 7;
      this.draftTotalMinutes = Math.max(1, cur + delta);
    },

    get draftSum() {
      return this.draftIntervals.reduce((acc, iv) => acc + iv.seconds, 0);
    },

    savePreset() {
      const intervals = this.draftIntervals.map((iv) => ({
        seconds: Number.isFinite(+iv.seconds)
          ? Math.max(5, Math.round(iv.seconds))
          : 60,
        label: (iv.label || '').trim(),
      }));

      const sum = intervals.reduce((acc, iv) => acc + iv.seconds, 0);
      const rawTotal = Math.round(this.draftTotalMinutes * 60);
      const totalSeconds = Math.max(
        sum,
        Number.isFinite(rawTotal) ? Math.max(60, rawTotal) : 60
      );
      const name = (this.draftName || '').trim() || `${Math.round(totalSeconds / 60)} min`;

      if (this.draftPresetId !== 'new') {
        this.savedPresets = this.savedPresets.map((p) =>
          p.id === this.draftPresetId
            ? { id: p.id, name, totalSeconds, intervals }
            : p
        );
        this.applyPreset(this.draftPresetId);
      } else {
        const id = `c-${Date.now()}`;
        this.savedPresets = [
          ...this.savedPresets,
          { id, name, totalSeconds, intervals },
        ];
        this.applyPreset(id);
      }
      this.persistPresets();
      this.view = 'timer';
    },

    deletePreset(id: string) {
      const preset = this.savedPresets.find((p) => p.id === id);
      const name = preset ? `"${preset.name}"` : 'this preset';
      if (!window.confirm(`Delete ${name}?`)) return;

      const wasActive = this.session.id === id;
      this.savedPresets = this.savedPresets.filter((p) => p.id !== id);
      this.persistPresets();

      if (wasActive && this.savedPresets.length) {
        this.applyPreset(this.savedPresets[0].id);
      } else if (wasActive) {
        this.reset();
      }
    },

    persistPresets() {
      localStorage.setItem('timer-presets', JSON.stringify(this.savedPresets));
    },

    /* --- Audio --------------------------------------------------------- */
    playBeep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.5) {
      try {
        const webkitWindow = window as WebkitWindow;
        const Ctx = window.AudioContext || webkitWindow.webkitAudioContext;
        if (!Ctx) return;
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const t = this.audioCtx.currentTime;

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration / 1000);

        osc.connect(gain).connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + duration / 1000);
      } catch (err) {
        console.warn('Audio failed:', err);
      }
    },

    /* --- Voice --------------------------------------------------------- */
    speak(text: string) {
      try {
        if (!('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.pitch = 1;
        synth.speak(utter);
      } catch (err) {
        console.warn('Speech failed:', err);
      }
    },

    /* --- Wake lock ----------------------------------------------------- */
    async requestWakeLock() {
      try {
        if (!('wakeLock' in navigator) || this.wakeLock) return;
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (err) {
        // Unsupported or denied — non-fatal, timer keeps running.
        this.wakeLock = null;
      }
    },

    async stopWakeLock() {
      try {
        if (this.wakeLock) {
          await this.wakeLock.release();
          this.wakeLock = null;
        }
      } catch (err) {
        this.wakeLock = null;
      }
    },

    /* --- Theme --------------------------------------------------------- */
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('timer-theme', this.theme);
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

/** The Alpine component's full reactive surface: state, getters and methods. */
export type TimerApp = AlpineComponent<TimerAppState>;

type TimerAppState = {
  session: Session;
  sessionRemaining: number;
  intervalIndex: number;
  intervalTotal: number;
  intervalRemaining: number;
  announcedIntervalIndex: number | null;
  status: TimerStatus;
  rafId: number | null;
  heartbeat: HeartbeatController;
  startTimestamp: number | null;
  baseElapsed: number;
  lastSpokenMinute: number | null;
  wakeLock: WakeLockSentinel | null;
  theme: Theme;
  savedPresets: Preset[];
  view: View;
  draftPresetId: string;
  draftName: string;
  draftTotalMinutes: number;
  draftIntervals: Interval[];
  audioCtx: AudioContext | null;

  /* Getters (readonly, reactively bound). */
  readonly displayTime: string;
  readonly sessionDisplay: string;
  readonly intervalCaption: string;
  readonly clockColor: string;
  readonly patternIndex: number;
  readonly patternStrip: PatternSegment[];
  readonly patternStripCaption: string;
  readonly sessionPercent: number;
  readonly playLabel: string;
  readonly sessionMode: boolean;
  readonly draftStrip: StripSegment[];
  readonly nextLabel: string;
  readonly intervalProgress: string;
  readonly presets: Preset[];
  readonly activePresetId: string | null;
  readonly draftSum: number;

  /* Methods. */
  init(): void;
  updateIntervalFromElapsed(elapsed: number): void;
  segColor(hue: number): { base: string; fill: string; future: string };
  segStyle(seg: PatternSegment, i: number): Record<string, string | number>;
  miniStrip(preset: { intervals: Interval[] }): StripSegment[];
  miniSegStyle(seg: StripSegment, i: number): Record<string, string>;
  togglePlay(): void;
  start(): void;
  pause(): void;
  reset(): void;
  applyPreset(id: string): void;
  advance(): void;
  tick(): void;
  onIntervalChange(idx: number): void;
  checkMinuteMark(intervalRemaining: number): void;
  complete(): void;
  openEdit(): void;
  newDraft(): void;
  openConfigFor(id: string): void;
  draftIntervalAdjust(index: number, delta: number): void;
  addDraftInterval(): void;
  removeDraftInterval(index: number): void;
  draftTotalAdjust(delta: number): void;
  savePreset(): void;
  deletePreset(id: string): void;
  persistPresets(): void;
  playBeep(freq: number, duration: number, type?: OscillatorType, volume?: number): void;
  speak(text: string): void;
  requestWakeLock(): Promise<void>;
  stopWakeLock(): Promise<void>;
  toggleTheme(): void;
  applyTheme(): void;
};

document.addEventListener('alpine:init', () => {
  Alpine.data('timerApp', timerApp);
});

Alpine.start();