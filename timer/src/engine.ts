/* ==========================================================================
   Timer engine — pure timer math.

   No DOM, no Alpine, no side effects: functions take a finite sequence of
   intervals (the whole session — nothing is tiled) plus elapsed time and
   return state. A session's duration is the sum of its intervals; every
   answer is derived from elapsed time rather than accumulated.
   ========================================================================== */

import type {
  Interval,
  IntervalKind,
  IntervalState,
  ProgressCount,
  StripSegment,
  Urgency,
} from './types';

/* Whether an interval is recovery. Untagged intervals count as work. */
export function isRest(iv: Interval): boolean {
  return iv.kind === 'rest';
}

/* The interval's effective kind (missing defaults to 'work'). */
export function kindOf(iv: Interval): IntervalKind {
  return iv.kind ?? 'work';
}

/* Total duration of the whole session, in seconds. */
export function totalDuration(intervals: Interval[]): number {
  return intervals.reduce((acc, iv) => acc + iv.seconds, 0);
}

/* Index of the interval `elapsed` falls in. Never wraps — the list is the
   whole session; a time past the end lands on the final interval. */
export function indexOfInterval(intervals: Interval[], elapsed: number): number {
  let acc = 0;
  for (let i = 0; i < intervals.length; i++) {
    if (elapsed < acc + intervals[i].seconds) return i;
    acc += intervals[i].seconds;
  }
  return intervals.length - 1;
}

/* `{index, total, remaining}` for the interval covering `elapsed`.
   `remaining` is clamped at 0. Returns null for an empty chain. */
export function intervalState(intervals: Interval[], elapsed: number): IntervalState | null {
  if (!intervals.length) return null;
  const index = indexOfInterval(intervals, elapsed);
  let acc = 0;
  for (let i = 0; i < index; i++) acc += intervals[i].seconds;
  const iv = intervals[index];
  return {
    index,
    total: iv.seconds,
    remaining: Math.max(0, iv.seconds - (elapsed - acc)),
  };
}

/* Work-interval count inside the session, e.g. {current: 3, total: 10}.
   Counts only work intervals — rest gaps are recovery, not units of work.
   Null for a session with fewer than two work intervals — nothing
   meaningful to count. */
export function progressCount(
  intervals: Interval[],
  elapsed: number
): ProgressCount | null {
  if (!intervals.length) return null;

  const work = intervals.map((iv) => !isRest(iv));
  const total = work.filter(Boolean).length;
  if (total <= 1) return null;

  const index = indexOfInterval(intervals, Math.max(0, elapsed));
  let current = 0;
  for (let i = 0; i <= index; i++) {
    if (work[i]) current++;
  }
  return { current: Math.min(total, Math.max(1, current)), total };
}

/* Whole-session work vs rest seconds, so the run screen can show the rest
   budget a session carries. Rest gaps between work are recovery time. */
export function kindSplit(intervals: Interval[]): { work: number; rest: number } {
  let work = 0;
  let rest = 0;
  for (const iv of intervals) {
    if (isRest(iv)) rest += iv.seconds;
    else work += iv.seconds;
  }
  return { work, rest };
}

/* M:SS, switching to H:MM:SS from one hour on. `s` is expected as an
   integer (callers ceil fractional remainders). */
export function formatClock(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

/* Fraction of time remaining for a progress ring, clamped to 0..1.
   A zero total renders as a full ring. */
export function ringProgress(remaining: number, total: number): number {
  return total ? Math.min(1, Math.max(0, remaining / total)) : 1;
}

/* 'normal' | 'warning' | 'danger' — thresholds shared by both rings. */
export function urgency(remaining: number): Urgency {
  if (remaining <= 10) return 'danger';
  if (remaining <= 60) return 'warning';
  return 'normal';
}

/* Minute-mark decision: how many minutes are left if that changed since
   the last announcement, else null. Intervals shorter than a minute never
   announce — the interval-change cue covers them. */
export function minuteMark(
  intervalTotal: number,
  intervalRemaining: number,
  lastSpokenMinute: number | null
): number | null {
  if (intervalTotal < 60) return null;
  const minutes = Math.ceil(intervalRemaining / 60);
  return minutes === lastSpokenMinute ? null : minutes;
}

/* Segment layout for a strip visualization: each interval mapped to the
   fraction of the whole session it occupies. Used for the run screen's
   plan strip and the mini pattern previews on preset picks. */
export function stripLayout(intervals: Interval[]): StripSegment[] {
  const total = totalDuration(intervals);
  return intervals.map((iv) => ({
    seconds: iv.seconds,
    label: iv.label,
    kind: kindOf(iv),
    fraction: total ? iv.seconds / total : 0,
  }));
}

/* Label of the upcoming interval, for the teaser in the final seconds of
   the current one (same window as the danger color). Empty when the window
   hasn't started, this is the session's final interval, or the next
   interval has no label. */
export function nextLabel(
  intervals: Interval[],
  index: number,
  intervalRemaining: number
): string {
  if (intervalRemaining > 10) return '';
  const next = intervals[index + 1];
  return (next?.label || '').trim();
}
