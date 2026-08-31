/* ==========================================================================
   Timer — Interval Timer
   Alpine.js state management + timer engine.

   A "session" is a sequence of intervals (a pattern). The pattern tiles
   until the session's total duration is consumed:
     - 7 min preset  -> seven 1-minute intervals
   No external libraries beyond Alpine (vendored locally for offline use).
   ========================================================================== */

document.addEventListener('alpine:init', () => {
  Alpine.data('timerApp', () => ({
    /* --- Session definition (currently loaded) ----------------------- */
    session: {
      id: 'p7',
      name: '7 min',
      totalSeconds: 420,
      intervals: Array.from({ length: 7 }, () => ({ seconds: 60, label: '' })),
    },
    sessionRemaining: 420,    // whole-session time left
    intervalIndex: 0,         // current interval in the tiled pattern
    intervalTotal: 60,        // duration of the current interval
    intervalRemaining: 60,    // time left in the current interval
    announcedIntervalIndex: null, // last interval index whose start was announced

    /* --- Timer state --- */
    status: 'IDLE',           // IDLE | RUNNING | PAUSED
    rafId: null,              // requestAnimationFrame id
    startTimestamp: null,     // Date.now() baseline for elapsed math
    baseElapsed: 0,           // seconds elapsed, frozen at pause
    lastSpokenMinute: null,   // last minute boundary already announced
    wakeLock: null,           // screen wake lock handle
    theme: 'dark',

    /* --- Presets & configuration --- */
    savedPresets: [],         // all presets (seeded with 7 min on first run)
    configOpen: false,        // settings modal visibility
    draftPresetId: 'new',     // 'new' or an existing savedPresets id
    draftName: '',            // preset name being configured
    draftTotalMinutes: 7,     // session total being configured (minutes)
    draftIntervals: [{ seconds: 420, label: 'until break' }],

    /* --- Ring geometry --- */
    ringRadius: 138,
    ringCircumference: 2 * Math.PI * 138,

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
          this.savedPresets = [
            { id: 'p7', name: '7 min', totalSeconds: 420, intervals: Array.from({ length: 7 }, () => ({ seconds: 60, label: '' })) },
          ];
          localStorage.setItem('timer-presets', JSON.stringify(this.savedPresets));
        } else {
          const parsed = JSON.parse(raw);
          this.savedPresets = Array.isArray(parsed)
            ? parsed.map((p) => {
                if (p.totalSeconds && p.intervals) return p;
                const seconds = (p.minutes || 7) * 60;
                return { id: p.id, name: p.name, totalSeconds: seconds, intervals: [{ seconds, label: '' }] };
              })
            : [];
        }
      } catch (err) {
        this.savedPresets = [];
      }

      /* Boot into a real preset: if the stored session id no longer exists
         (e.g. first run, or its preset was deleted), load the first one so the
         ring shows the first interval's label right away. */
      if (!this.savedPresets.find((p) => p.id === this.session.id) && this.savedPresets.length) {
        this.applyPreset(this.savedPresets[0].id);
      }

      /* Page visibility: keep timestamp-corrected timing; re-acquire the
         wake lock when the tab becomes visible again (mobile drops it). */
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          if (this.status === 'RUNNING') {
            this.requestWakeLock();
            this.tick();
          }
        }
      });
    },

    /* --- Pattern helpers ---------------------------------------------- */
    get patternLength() {
      return this.session.intervals.reduce((acc, iv) => acc + iv.seconds, 0);
    },

    indexOfInterval(elapsed) {
      const intervals = this.session.intervals;
      const p = this.patternLength;
      const pos = p ? elapsed % p : 0;
      let acc = 0;
      for (let i = 0; i < intervals.length; i++) {
        if (pos < acc + intervals[i].seconds) return i;
        acc += intervals[i].seconds;
      }
      return intervals.length - 1;
    },

    updateIntervalFromElapsed(elapsed) {
      const intervals = this.session.intervals;
      if (!intervals.length) return;
      const p = this.patternLength;
      const idx = this.indexOfInterval(elapsed);
      const pos = p ? elapsed % p : 0;
      let acc = 0;
      for (let i = 0; i < idx; i++) acc += intervals[i].seconds;
      const intervalStartElapsed = (p ? elapsed - pos : 0) + acc;
      this.intervalIndex = idx;
      this.intervalTotal = intervals[idx].seconds;
      this.intervalRemaining = Math.max(0, this.intervalTotal - (elapsed - intervalStartElapsed));
    },

    /* --- Getters (reactively bound to the DOM) ------------------------ */
    get displayTime() {
      const s = Math.ceil(Math.max(0, this.intervalRemaining));
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, '0')}`;
    },

    get sessionDisplay() {
      const s = Math.ceil(Math.max(0, this.sessionRemaining));
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, '0')}`;
    },

    get ringOffset() {
      const progress = this.intervalTotal
        ? Math.min(1, Math.max(0, this.intervalRemaining / this.intervalTotal))
        : 1;
      return this.ringCircumference * (1 - progress);
    },

    get ringColor() {
      if (this.intervalRemaining <= 10) return 'var(--danger)';
      if (this.intervalRemaining <= 60) return 'var(--warning)';
      return 'var(--accent)';
    },

    get sessionRingOffset() {
      const progress = this.session.totalSeconds
        ? Math.min(1, Math.max(0, this.sessionRemaining / this.session.totalSeconds))
        : 1;
      return this.ringCircumference * (1 - progress);
    },

    get totalRingColor() {
      if (this.sessionRemaining <= 10) return 'var(--danger)';
      if (this.sessionRemaining <= 60) return 'var(--warning)';
      return 'var(--accent)';
    },

    get totalMinutes() {
      return Math.round(this.session.totalSeconds / 60);
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
      this.tick();
    },

    pause() {
      if (this.status !== 'RUNNING') return;
      this.status = 'PAUSED';
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.baseElapsed = (Date.now() - this.startTimestamp) / 1000;
      this.updateIntervalFromElapsed(this.baseElapsed);
      this.sessionRemaining = Math.max(0, this.session.totalSeconds - this.baseElapsed);
      this.stopWakeLock();
    },

    reset() {
      this.status = 'IDLE';
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.baseElapsed = 0;
      this.sessionRemaining = this.session.totalSeconds;
      const first = this.session.intervals[0];
      this.intervalIndex = 0;
      this.intervalTotal = first ? first.seconds : this.session.totalSeconds;
      this.intervalRemaining = this.intervalTotal;
      this.lastSpokenMinute = null;
      this.announcedIntervalIndex = null;
      this.stopWakeLock();
    },

    adjust(delta) {
      if (this.status === 'RUNNING') return;
      const next = Math.min(3600, Math.max(60, this.session.totalSeconds + delta));
      this.session.totalSeconds = next;
      if (this.session.intervals.length === 1) {
        this.session.intervals[0].seconds = next;
        if (this.status === 'IDLE') {
          this.intervalTotal = next;
          this.intervalRemaining = next;
        }
      }
      if (this.status === 'IDLE') this.sessionRemaining = next;
    },

    applyPreset(id) {
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
    tick() {
      if (this.status !== 'RUNNING') return;

      /* Timestamp compensation: elapsed is computed from wall-clock time, so
         background throttling of the animation frame cannot cause drift. */
      const elapsed = this.baseElapsed + (Date.now() - this.startTimestamp) / 1000;
      this.sessionRemaining = Math.max(0, this.session.totalSeconds - elapsed);

      if (this.sessionRemaining <= 0) {
        this.complete();
        return;
      }

      const idx = this.indexOfInterval(elapsed);
      if (idx !== this.announcedIntervalIndex) this.onIntervalChange(idx);

      this.updateIntervalFromElapsed(elapsed);
      if (this.intervalTotal >= 60) this.checkMinuteMark(this.intervalRemaining);

      this.rafId = requestAnimationFrame(() => this.tick());
    },

    /* Announce each interval as it starts (Work / Rest / …). */
    onIntervalChange(idx) {
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
    checkMinuteMark(intervalRemaining) {
      const minutes = Math.ceil(intervalRemaining / 60);
      if (minutes === this.lastSpokenMinute) return;

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
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.stopWakeLock();

      this.speak('Time is up!');
      if (navigator.vibrate) navigator.vibrate([120, 80, 120, 80, 240]);
    },

    /* --- Presets & configuration -------------------------------------- */
    openConfig() {
      this.draftPresetId = 'new';
      this.draftName = '';
      this.draftTotalMinutes = 7;
      this.draftIntervals = [{ seconds: 60, label: '' }];
      this.configOpen = true;
    },

    /* Open the config editor pre-loaded with an existing preset. Editing
       always happens in place — there are no locked built-ins. */
    openConfigFor(id) {
      const preset = this.savedPresets.find((p) => p.id === id);
      if (!preset) {
        this.openConfig();
        return;
      }
      this.draftPresetId = id;
      this.draftName = preset.name;
      this.draftTotalMinutes = Math.round((preset.totalSeconds / 60) * 2) / 2;
      this.draftIntervals = preset.intervals.map((iv) => ({ seconds: iv.seconds, label: iv.label }));
      this.configOpen = true;
    },

    loadDraftPreset(id) {
      if (id === 'new') {
        this.draftName = '';
        this.draftTotalMinutes = 7;
        this.draftIntervals = [{ seconds: 60, label: '' }];
        return;
      }
      const preset = this.savedPresets.find((p) => p.id === id);
      if (!preset) return;
      this.draftName = preset.name;
      this.draftTotalMinutes = Math.round((preset.totalSeconds / 60) * 2) / 2;
      this.draftIntervals = preset.intervals.map((iv) => ({ seconds: iv.seconds, label: iv.label }));
    },

    draftIntervalAdjust(index, delta) {
      const iv = this.draftIntervals[index];
      if (!iv) return;
      const cur = Number.isFinite(iv.seconds) ? iv.seconds : 60;
      iv.seconds = Math.min(3600, Math.max(5, cur + delta));
    },

    addDraftInterval() {
      this.draftIntervals.push({ seconds: 60, label: '' });
    },

    removeDraftInterval(index) {
      this.draftIntervals.splice(index, 1);
      if (!this.draftIntervals.length) {
        this.draftIntervals.push({ seconds: 60, label: '' });
      }
    },

    draftTotalAdjust(delta) {
      const cur = Number.isFinite(this.draftTotalMinutes) ? this.draftTotalMinutes : 7;
      this.draftTotalMinutes = Math.min(120, Math.max(1, cur + delta));
    },

    get draftSum() {
      return this.draftIntervals.reduce((acc, iv) => acc + iv.seconds, 0);
    },

    savePreset() {
      const intervals = this.draftIntervals.map((iv) => ({
        seconds: Number.isFinite(+iv.seconds)
          ? Math.min(3600, Math.max(5, Math.round(iv.seconds)))
          : 60,
        label: (iv.label || '').trim(),
      }));

      const sum = intervals.reduce((acc, iv) => acc + iv.seconds, 0);
      const rawTotal = Math.round(this.draftTotalMinutes * 60);
      const totalSeconds = Math.max(
        sum,
        Number.isFinite(rawTotal)
          ? Math.min(3600, Math.max(60, rawTotal))
          : 60
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
      this.configOpen = false;
    },

    deletePreset(id) {
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
    playBeep(freq, duration, type = 'sine', volume = 0.5) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

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
    speak(text) {
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
  }));
});
