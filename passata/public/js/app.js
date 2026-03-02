const API_BASE = '';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

window['pomodoroApp'] = function () {
  return {
    task: '',
    pomodoros: [],
    isRunning: false,
    isDone: false,
    phase: 'work',
    elapsed: 0,
    duration: WORK_DURATION,
    interval: null,
    completedPomodoros: 0,

    get displayTime() {
      const remaining = this.duration - this.elapsed;
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    get progress() {
      return Math.floor((this.elapsed / this.duration) * 100);
    },

    async init() {
      await this.loadPomodoros();
    },

    async loadPomodoros() {
      const res = await fetch(`${API_BASE}/api/pomodoros`);
      this.pomodoros = await res.json();
    },

    async startPomodoro() {
      this.phase = 'work';
      this.duration = WORK_DURATION;
      this.isRunning = true;
      this.isDone = false;
      this.elapsed = 0;
      this.startTimer();

      await fetch(`${API_BASE}/api/pomodoros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: this.task || null,
          duration: this.duration,
        }),
      });

      this.task = '';
      await this.loadPomodoros();
    },

    startTimer() {
      this.interval = setInterval(() => {
        this.elapsed++;
        if (this.elapsed >= this.duration) {
          this.timerDone();
        }
      }, 1000);
    },

    stopPomodoro() {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      this.isDone = false;
      this.elapsed = 0;
    },

    async timerDone() {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      this.isDone = true;

      if (this.phase === 'work') {
        this.completedPomodoros++;
      }
    },

    startBreak() {
      this.phase = 'break';
      if (this.completedPomodoros % 4 === 0) {
        this.duration = LONG_BREAK;
      } else {
        this.duration = SHORT_BREAK;
      }
      this.isRunning = true;
      this.isDone = false;
      this.elapsed = 0;
      this.startTimer();
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'just now';
    },
  };
};

window['tagsApp'] = function () {
  return {
    tags: [],
    value: '',

    async init() {
      await this.loadTags();
    },

    async loadTags() {
      const res = await fetch(`${API_BASE}/api/tags`);
      this.tags = await res.json();
    },

    async addTag() {
      if (this.value.length === 0) return;

      await fetch(`${API_BASE}/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: this.value }),
      });

      this.value = '';
      await this.loadTags();
    },

    async deleteTag(id) {
      await fetch(`${API_BASE}/api/tags/${id}`, {
        method: 'DELETE',
      });
      await this.loadTags();
    },
  };
};

window['statsApp'] = function () {
  return {
    stats: { total: 0, byDay: {}, byTag: {} },

    async init() {
      await this.loadStats();
    },

    async loadStats() {
      const res = await fetch(`${API_BASE}/api/stats`);
      this.stats = await res.json();
    },
  };
};
