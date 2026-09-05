/* ==========================================================================
   Shared domain types for the timer app.

   A session is a chain of `{seconds, label}` intervals (a pattern) that
   tiles until the session's total duration is consumed. Presets and the
   currently loaded session share the same shape.
   ========================================================================== */

export interface Interval {
  seconds: number;
  label: string;
}

export interface Preset {
  id: string;
  name: string;
  totalSeconds: number;
  intervals: Interval[];
}

/** The currently loaded preset; same shape as Preset. */
export type Session = Preset;

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED';
export type View = 'timer' | 'edit';
export type Theme = 'light' | 'dark';

export type Urgency = 'normal' | 'warning' | 'danger';

/** One interval mapped to the fraction of the pattern it occupies. */
export interface StripSegment {
  seconds: number;
  label: string;
  fraction: number;
}

/** A strip segment plus its stable hue, assigned by pattern position. */
export type PatternSegment = StripSegment & { hue: number };

export interface IntervalState {
  index: number;
  total: number;
  remaining: number;
}

export interface ProgressCount {
  current: number;
  total: number;
}