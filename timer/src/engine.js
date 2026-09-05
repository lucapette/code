/* ==========================================================================
   Timer engine — pure timer math.

   No DOM, no Alpine, no side effects: functions take the session shape
   (a chain of `{seconds, label}` intervals) and elapsed time and return
   state. The pattern tiles until the session's total duration is consumed,
   so every answer is derived from elapsed time rather than accumulated.
   ========================================================================== */

/* Total length of one pattern tile, in seconds. */
export function patternLength(intervals) {
  return intervals.reduce((acc, iv) => acc + iv.seconds, 0);
}

/* Index of the interval `elapsed` falls in, across all tiles. */
export function indexOfInterval(intervals, elapsed) {
  const p = patternLength(intervals);
  const pos = p ? elapsed % p : 0;
  let acc = 0;
  for (let i = 0; i < intervals.length; i++) {
    if (pos < acc + intervals[i].seconds) return i;
    acc += intervals[i].seconds;
  }
  return intervals.length - 1;
}

/* `{index, total, remaining}` for the interval covering `elapsed`.
   `remaining` is clamped at 0. Returns null for an empty chain. */
export function intervalState(intervals, elapsed) {
  if (!intervals.length) return null;
  const p = patternLength(intervals);
  const index = indexOfInterval(intervals, elapsed);
  const pos = p ? elapsed % p : 0;
  let acc = 0;
  for (let i = 0; i < index; i++) acc += intervals[i].seconds;
  const tileStart = (p ? elapsed - pos : 0) + acc;
  return {
    index,
    total: intervals[index].seconds,
    remaining: Math.max(0, intervals[index].seconds - (elapsed - tileStart)),
  };
}

/* Interval count inside the tiled session, e.g. {current: 3, total: 14}.
   Full tiles plus the partial one at the end. Null for a single-interval
   session — a plain countdown has nothing to count. */
export function progressCount(intervals, totalSeconds, sessionRemaining) {
  const len = intervals.length;
  const p = patternLength(intervals);
  if (!len || !p) return null;

  let total = Math.floor(totalSeconds / p) * len;
  const rem = totalSeconds % p;
  if (rem > 0) {
    let acc = 0;
    for (let i = 0; i < len; i++) {
      acc += intervals[i].seconds;
      if (rem <= acc) { total += i + 1; break; }
    }
  }
  if (total <= 1) return null;

  const elapsed = Math.min(
    totalSeconds,
    Math.max(0, totalSeconds - sessionRemaining)
  );
  const current = Math.min(
    total,
    Math.floor(elapsed / p) * len + indexOfInterval(intervals, elapsed) + 1
  );
  return { current, total };
}

/* M:SS, switching to H:MM:SS from one hour on. `s` is expected as an
   integer (callers ceil fractional remainders). */
export function formatClock(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

/* Fraction of time remaining for a progress ring, clamped to 0..1.
   A zero total renders as a full ring. */
export function ringProgress(remaining, total) {
  return total ? Math.min(1, Math.max(0, remaining / total)) : 1;
}

/* 'normal' | 'warning' | 'danger' — thresholds shared by both rings. */
export function urgency(remaining) {
  if (remaining <= 10) return 'danger';
  if (remaining <= 60) return 'warning';
  return 'normal';
}

/* Minute-mark decision: how many minutes are left if that changed since
   the last announcement, else null. Intervals shorter than a minute never
   announce — the interval-change cue covers them. */
export function minuteMark(intervalTotal, intervalRemaining, lastSpokenMinute) {
  if (intervalTotal < 60) return null;
  const minutes = Math.ceil(intervalRemaining / 60);
  return minutes === lastSpokenMinute ? null : minutes;
}

/* Segment layout for a strip visualization: each interval mapped to the
   fraction of the pattern it occupies. Used for the run screen's plan
   strip and the mini pattern previews on preset picks. */
export function stripLayout(intervals) {
  const p = patternLength(intervals);
  return intervals.map((iv) => ({
    seconds: iv.seconds,
    label: iv.label,
    fraction: p ? iv.seconds / p : 0,
  }));
}

/* Label of the upcoming interval, for the teaser in the final seconds of
   the current one (same window as the danger color). Empty when the window
   hasn't started, the session ends with this interval, or the next
   interval has no label. */
export function nextLabel(intervals, index, intervalRemaining, sessionRemaining) {
  if (intervalRemaining > 10) return '';
  if (sessionRemaining <= intervalRemaining) return '';
  const next = intervals[(index + 1) % intervals.length];
  return (next?.label || '').trim();
}
