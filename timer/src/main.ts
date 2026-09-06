/* ==========================================================================
   Timer — Interval Timer
   Alpine.js state management, wiring the pure timer engine (engine.ts)
   to the DOM.

   A "session" is a sequence of intervals (a pattern). The pattern tiles
   until the session's total duration is consumed:
     - mobility routine -> 45s exercises, no rest intervals
   ========================================================================== */

import Alpine, { AlpineComponent } from 'alpinejs';

import * as TimerEngine from './engine';
import { createHeartbeat } from './heartbeat';
import type { HeartbeatController } from './heartbeat';
import type {
  AnnounceSettings,
  DraftInterval,
  Interval,
  PatternSegment,
  Preset,
  Session,
  StripSegment,
  Theme,
  TimerStatus,
  Tone,
  Urgency,
  View,
} from './types';
import { TONES } from './types';

const URGENCY_COLOR: Record<Urgency, string> = {
  normal: 'var(--accent)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

/* Distinct cue tone per interval (Work vs Rest). TONE_FREQ maps each of the
   three selectable tones to a frequency; intervals without an explicit tone
   fall back to a cyclical pattern so consecutive intervals stay distinct. */
const TONE_FREQ: Record<Tone, number> = { low: 330, mid: 520, high: 780 };

/* Explicit tone when the interval carries one, otherwise a pleasant cycle
   (low → mid → high → …) so adjacent Work/Rest pitches never collide. */
function toneForInterval(iv: Interval | undefined, index: number): Tone {
  return iv?.tone ?? TONES[index % TONES.length];
}

const DEFAULT_ANNOUNCE: AnnounceSettings = { voice: true, beeps: true, vibrate: true };

/* Monotonic id source for draft rows (stable x-for keys). */
let draftSeq = 0;
function nextDraftId(): number {
  return ++draftSeq;
}

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
        category: typeof value.category === 'string' && value.category ? value.category : 'Other',
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
      category: 'Other',
      totalSeconds: seconds,
      intervals: [{ seconds, label: '' }],
    };
  }
  return { id: `c-${Date.now()}`, name: 'Preset', category: 'Other', totalSeconds: 420, intervals: [{ seconds: 420, label: '' }] };
}

const MOBILITY_LABELS = [
  'body bounces',
  'neck circles',
  'arm swings',
  'full twists',
  'downward up dog',
  'deepsquat reaches',
  '90/90s',
  'bridge pose',
  'table top pose',
  'toe touches',
  'straddles',
  'cossack',
  'windshield wipers',
];

/* Read-only bundled presets. They never change and cannot be deleted — the
   saved (user) store holds only everything else. Editing one forks it into
   an editable user copy instead of mutating in place. */
const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'p-mobility',
    name: 'Mobility routine',
    category: 'Workouts',
    totalSeconds: MOBILITY_LABELS.length * 45,
    intervals: MOBILITY_LABELS.map((label) => ({ seconds: 45, label })),
  },
  {
    id: 'p-jumprope',
    name: 'Jump rope',
    category: 'Workouts',
    totalSeconds: 10 * 60,              // 10 rounds of (30s + 30s)
    intervals: [
      { seconds: 30, label: 'Jump' },
      { seconds: 30, label: 'Rest' },
    ],
  },
  {
    id: 'p-pomodoro',
    name: 'Pomodoro classic',
    category: 'Productivity',
    totalSeconds: 4 * (25 * 60 + 5 * 60) + 15 * 60, // 4× (25+5) + long break
    intervals: [
      { seconds: 25 * 60, label: 'Focus' },
      { seconds: 5 * 60, label: 'Break' },
      { seconds: 25 * 60, label: 'Focus' },
      { seconds: 5 * 60, label: 'Break' },
      { seconds: 25 * 60, label: 'Focus' },
      { seconds: 5 * 60, label: 'Break' },
      { seconds: 25 * 60, label: 'Focus' },
      { seconds: 5 * 60, label: 'Break' },
      { seconds: 15 * 60, label: 'Long break' },
    ],
  },
  {
    id: 'p-focus',
    name: 'Focus',
    category: 'Productivity',
    totalSeconds: 25 * 60 + 5 * 60,     // one pass of 25 + 5
    intervals: [
      { seconds: 25 * 60, label: 'Focus' },
      { seconds: 5 * 60, label: 'Break' },
    ],
  },
  {
    id: 'p-rice',
    name: 'White rice',
    category: 'Cooking',
    totalSeconds: 10 * 60 + 10 * 60,    // cook then rest, over
    intervals: [
      { seconds: 10 * 60, label: 'Cook' },
      { seconds: 10 * 60, label: 'Rest' },
    ],
  },
];

const BUILTIN_IDS = new Set(BUILTIN_PRESETS.map((p) => p.id));

const DEFAULT_PRESET = BUILTIN_PRESETS[0];

function timerApp(): TimerApp {
  return {
    /* --- Session definition (currently loaded) ----------------------- */
    session: {
      id: DEFAULT_PRESET.id,
      name: DEFAULT_PRESET.name,
      category: DEFAULT_PRESET.category,
      totalSeconds: DEFAULT_PRESET.totalSeconds,
      intervals: DEFAULT_PRESET.intervals.map((iv) => ({ ...iv })),
    },
    sessionRemaining: DEFAULT_PRESET.totalSeconds, // whole-session time left
    intervalIndex: 0,         // current interval in the tiled pattern
    intervalTotal: DEFAULT_PRESET.intervals[0].seconds, // duration of the current interval
    intervalRemaining: DEFAULT_PRESET.intervals[0].seconds, // time left in the current interval
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
    savedPresets: [],         // user presets only (built-ins live in code)
    view: 'timer',            // 'timer' | 'edit'
    categoryFilter: 'all',    // 'all' or a category name (run screen)
    draftPresetId: 'new',     // 'new' or an existing savedPresets id
    draftName: '',            // preset name being configured
    draftCategory: 'Other',   // preset category being configured
    draftTotalMinutes: 10,    // session total being configured (minutes, default 9:45)
    draftIntervals: [{ id: nextDraftId(), seconds: 585, label: '' }],

    /* --- Announcements & sharing --- */
    announce: { ...DEFAULT_ANNOUNCE },
    deleteTarget: null,       // preset id awaiting in-app delete confirmation
    copiedPresets: false,     // transient "copied to clipboard" feedback
    importOpen: false,        // whether the import textarea is shown
    importText: '',           // JSON pasted into the import box
    importError: '',

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

      /* Load user presets. Built-ins live in code and always appear; the
         store holds only user-created or imported presets. Migrates the old
         {id,name,minutes} schema and re-seeds nothing: a missing or corrupt
         store simply yields an empty user list — the bundled library keeps
         the picks populated, so one mangled payload can't wipe the app. */
      let loaded: Preset[] | null = null;
      try {
        const raw = localStorage.getItem('timer-presets');
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          loaded = Array.isArray(parsed) ? parsed.map(parsePreset) : null;
        }
      } catch {
        loaded = null;
      }
      /* Legacy stores had the default mobility routine persisted at
         p-mobility; it now ships as a built-in, so drop duplicates. */
      this.savedPresets = (loaded ?? []).filter((p) => !BUILTIN_IDS.has(p.id));

      /* Announcement preferences, with sensible defaults for first run. */
      try {
        const raw = localStorage.getItem('timer-announce');
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (isRecord(parsed)) {
            this.announce = {
              voice: typeof parsed.voice === 'boolean' ? parsed.voice : DEFAULT_ANNOUNCE.voice,
              beeps: typeof parsed.beeps === 'boolean' ? parsed.beeps : DEFAULT_ANNOUNCE.beeps,
              vibrate: typeof parsed.vibrate === 'boolean' ? parsed.vibrate : DEFAULT_ANNOUNCE.vibrate,
            };
          }
        }
      } catch { /* malformed prefs — defaults stand */ }

      /* Boot into a real preset: if the stored session id no longer exists
         (e.g. its preset was deleted), load the first one so the strip shows
         the first interval's label right away. */
      if (!this.presets.find((p) => p.id === this.session.id) && this.presets.length) {
        this.applyPreset(this.presets[0].id);
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

    /* All presets: built-ins first, then user presets in saved order. */
    get presets() {
      return [...BUILTIN_PRESETS, ...this.savedPresets];
    },

    /* Distinct visible categories in library order (built-ins define the
       leading order, then any user categories not already present). */
    get categories() {
      const seen = new Set<string>();
      for (const p of this.presets) {
        const cat = (p.category || '').trim() || 'Other';
        if (!seen.has(cat)) seen.add(cat);
      }
      return [...seen];
    },

    /* Category sections (unfiltered — the run screen applies the filter). */
    get presetGroups() {
      return this.categories.map((cat) => ({
        category: cat,
        presets: this.presets.filter((p) => ((p.category || '').trim() || 'Other') === cat),
      }));
    },

    get activePresetId() {
      const match = this.presets.find((p) => p.id === this.session.id);
      return match ? match.id : null;
    },

    /* True for built-in (bundled, read-only) presets. */
    isBuiltin(id: string) {
      return BUILTIN_IDS.has(id);
    },

    /* Normalize any (possibly missing) category for display/grouping. */
    presetCategory(preset: { category?: string }) {
      return (preset.category || '').trim() || 'Other';
    },

    /* Set the run-screen category filter. */
    setFilter(cat: string) {
      this.categoryFilter = cat;
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
        category: preset.category,
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

    /* Announce each interval as it starts. The channel used follows the
    announcement prefs: a spoken label when voice is on and the interval is
    named, otherwise a distinct per-interval tone (set in the editor, or
    derived cyclically by position so Work vs Rest stays audible). */
    onIntervalChange(idx: number) {
      this.announcedIntervalIndex = idx;
      this.intervalIndex = idx;
      const iv = this.session.intervals[idx];
      const label = (iv?.label || '').trim();

      const spoken = this.announce.voice && !!label;
      if (spoken) {
        this.speak(label);
      }
      if (this.announce.beeps && !spoken) {
        this.playBeep(TONE_FREQ[toneForInterval(iv, idx)], 130, 'sine', 0.45);
      }
      if (this.announce.vibrate && navigator.vibrate) navigator.vibrate(40);
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
      if (this.announce.voice) {
        const label = minutes === 1
          ? '1 minute remaining'
          : `${minutes} minutes remaining`;
        this.speak(label);
      }
      if (this.announce.beeps) this.playBeep(800, 150, 'sine', 0.4);
      if (this.announce.vibrate && navigator.vibrate) navigator.vibrate(50);
    },

    complete() {
      this.intervalRemaining = 0;
      this.sessionRemaining = 0;
      this.status = 'IDLE';
      cancelAnimationFrame(this.rafId ?? 0);
      this.rafId = null;
      this.heartbeat.stop();
      this.stopWakeLock();

      if (this.announce.voice) this.speak('Time is up!');
      if (this.announce.beeps) {
        this.playBeep(TONE_FREQ.mid, 160, 'sine', 0.5);
        this.playBeep(TONE_FREQ.high, 180, 'sine', 0.5);
      }
      if (this.announce.vibrate && navigator.vibrate) {
        navigator.vibrate([120, 80, 120, 80, 240]);
      }
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
      this.draftCategory = 'Other';
      this.draftTotalMinutes = 7;
      this.draftIntervals = [{ id: nextDraftId(), seconds: 60, label: '' }];
    },

    /* Open the config editor pre-loaded with an existing preset. User
       presets edit in place; built-ins are read-only, so editing one forks
       it into a new user copy (draftPresetId stays 'new'). */
    openConfigFor(id: string) {
      const preset = this.presets.find((p) => p.id === id);
      if (!preset) {
        this.newDraft();
        return;
      }
      const isBuiltin = BUILTIN_IDS.has(id);
      this.draftPresetId = isBuiltin ? 'new' : id;
      this.draftName = preset.name;
      this.draftCategory = preset.category;
      this.draftTotalMinutes = Math.round((preset.totalSeconds / 60) * 2) / 2;
      this.draftIntervals = preset.intervals.map((iv) => ({
        id: nextDraftId(),
        seconds: iv.seconds,
        label: iv.label,
        ...(iv.tone ? { tone: iv.tone } : {}),
      }));
      this.view = 'edit';
    },

    draftIntervalAdjust(index: number, delta: number) {
      const iv = this.draftIntervals[index];
      if (!iv) return;
      const cur = Number.isFinite(iv.seconds) ? iv.seconds : 60;
      iv.seconds = Math.max(5, cur + delta);
    },

    addDraftInterval() {
      this.draftIntervals.push({ id: nextDraftId(), seconds: 60, label: '' });
    },

    removeDraftInterval(index: number) {
      this.draftIntervals.splice(index, 1);
      if (!this.draftIntervals.length) {
        this.draftIntervals.push({ id: nextDraftId(), seconds: 60, label: '' });
      }
    },

    setDraftTone(index: number, tone: Tone | undefined) {
      const iv = this.draftIntervals[index];
      if (!iv) return;
      iv.tone = tone;
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
        ...(iv.tone ? { tone: iv.tone } : {}),
      }));

      const sum = intervals.reduce((acc, iv) => acc + iv.seconds, 0);
      const rawTotal = Math.round(this.draftTotalMinutes * 60);
      const totalSeconds = Math.max(
        sum,
        Number.isFinite(rawTotal) ? Math.max(60, rawTotal) : 60
      );
      const name = (this.draftName || '').trim() || `${Math.round(totalSeconds / 60)} min`;
      const category = (this.draftCategory || '').trim() || 'Other';

      if (this.draftPresetId !== 'new') {
        this.savedPresets = this.savedPresets.map((p) =>
          p.id === this.draftPresetId
            ? { id: p.id, name, category, totalSeconds, intervals }
            : p
        );
        this.applyPreset(this.draftPresetId);
      } else {
        const id = `c-${Date.now()}`;
        this.savedPresets = [
          ...this.savedPresets,
          { id, name, category, totalSeconds, intervals },
        ];
        this.applyPreset(id);
      }
      this.persistPresets();
      this.view = 'timer';
    },

    /* In-app delete confirmation (replaces the native window.confirm so the
       flow matches the rest of the UI and stays keyboard-accessible). */
    askDelete(id: string) {
      this.deleteTarget = id;
      this.$nextTick(() => {
        (this.$root as HTMLElement).querySelector<HTMLButtonElement>('.confirm-delete')?.focus();
      });
    },

    cancelDelete() {
      this.deleteTarget = null;
    },

    confirmDelete() {
      const id = this.deleteTarget;
      if (!id) return;

      const wasActive = this.session.id === id;
      this.savedPresets = this.savedPresets.filter((p) => p.id !== id);
      this.persistPresets();
      this.deleteTarget = null;

      if (wasActive && this.presets.length) {
        this.applyPreset(this.presets[0].id);
      } else if (wasActive) {
        this.reset();
      }
    },

    persistPresets() {
      localStorage.setItem('timer-presets', JSON.stringify(this.savedPresets));
    },

    /* Flip one announcement preference and keep it for next time. */
    setAnnounce(key: keyof AnnounceSettings, on: boolean) {
      this.announce[key] = on;
      localStorage.setItem('timer-announce', JSON.stringify(this.announce));
    },

    /* --- Import / export --------------------------------------------- */
    /* Copy the whole preset collection as pretty JSON, so a routine moves
       between devices by paste. Falls back to execCommand on http (clipboard
       API needs a secure context). */
    async copyPresets() {
      const json = JSON.stringify(this.savedPresets, null, 2);
      try {
        await navigator.clipboard.writeText(json);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = json;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      this.copiedPresets = true;
    },

    /* Parse and append whatever was pasted: a single preset object or an
       array of them. Invalid entries are dropped via parsePreset. */
    async importPresets() {
      this.importError = '';
      let parsed: unknown;
      try {
        parsed = JSON.parse(this.importText);
      } catch {
        this.importError = 'That is not valid JSON.';
        return;
      }
      const list = Array.isArray(parsed) ? parsed : [parsed];
      /* Only accept well-formed preset shapes; parsePreset's fallback would
         otherwise fabricate a default preset out of arbitrary JSON junk. */
      const incoming = list
        .filter(isRecord)
        .filter((item) => (
          Array.isArray(item.intervals) || typeof item.minutes === 'number'
        ))
        .map(parsePreset)
        .filter((p) => p.intervals.length);
      if (!incoming.length) {
        this.importError = 'No valid presets found in that JSON.';
        return;
      }
      this.savedPresets = [
        ...this.savedPresets,
        ...incoming.map((p, i) => ({
          ...p,
          id: `c-${Date.now()}-${i}`,
        })),
      ];
      this.persistPresets();
      this.importText = '';
      this.importOpen = false;
      this.copiedPresets = false;
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
  categoryFilter: string;
  draftPresetId: string;
  draftName: string;
  draftCategory: string;
  draftTotalMinutes: number;
  draftIntervals: DraftInterval[];
  announce: AnnounceSettings;
  deleteTarget: string | null;
  copiedPresets: boolean;
  importOpen: boolean;
  importText: string;
  importError: string;
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
  readonly categories: string[];
  readonly presetGroups: { category: string; presets: Preset[] }[];
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
  setDraftTone(index: number, tone: Tone | undefined): void;
  draftTotalAdjust(delta: number): void;
  savePreset(): void;
  askDelete(id: string): void;
  cancelDelete(): void;
  confirmDelete(): void;
  persistPresets(): void;
  isBuiltin(id: string): boolean;
  presetCategory(preset: { category?: string }): string;
  setFilter(cat: string): void;
  setAnnounce(key: keyof AnnounceSettings, on: boolean): void;
  copyPresets(): Promise<void>;
  importPresets(): Promise<void>;
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