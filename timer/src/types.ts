/* ==========================================================================
   Shared domain types for the timer app.

   A session is a chain of `{seconds, label}` intervals (a pattern) that
   tiles until the session's total duration is consumed. Presets and the
   currently loaded session share the same shape.
   ========================================================================== */

export const TONES = ['low', 'mid', 'high'] as const;
export type Tone = (typeof TONES)[number];

export interface Interval {
  seconds: number;
  label: string;
  /** Optional per-interval cue tone; absent means "derive by position". */
  tone?: Tone;
}

/** A draft row in the editor carries a stable id so x-for keys survive
    splicing without rebinding focus. */
export interface DraftInterval extends Interval {
  id: number;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  totalSeconds: number;
  intervals: Interval[];
}

/** The currently loaded preset; same shape as Preset. */
export type Session = Preset;

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED';
export type View = 'timer' | 'edit';
export type Theme = 'light' | 'dark';

export type Urgency = 'normal' | 'warning' | 'danger';

/** Which alert channels are active: spoken voice, beeps/tone cues, buzzing. */
export interface AnnounceSettings {
  voice: boolean;
  beeps: boolean;
  vibrate: boolean;
}

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