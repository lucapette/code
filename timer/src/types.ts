/* ==========================================================================
   Shared domain types for the timer app.

   A preset is a template: a finite, fully-expanded sequence of intervals
   (`{seconds, label, kind}`). Nothing is tiled and no total duration is
   stored — a session's length is the sum of its intervals. Running one
   snapshots that sequence into a Session, which is a concrete run (not a
   template) and can later carry when/where it happened, notes, and so on.
   ========================================================================== */

/** What an interval is for: effort ('work', the default) or recovery
    ('rest'). Rest renders dimmed and is excluded from work accounting. */
export type IntervalKind = 'work' | 'rest';

export interface Interval {
  seconds: number;
  label: string;
  /** 'work' is the default; only 'rest' needs to be stored. */
  kind?: IntervalKind;
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
  /** The whole run as a finite, fully-expanded sequence. */
  intervals: Interval[];
}

/** A concrete run, snapshotted from a preset when it's picked. Distinct
    from a Preset: it is what's actually running, so it can later carry
    run-specific data (when/where it happened, notes, …) without polluting
    the reusable template. */
export interface Session {
  /** The preset this run came from ('' for an ad-hoc session). */
  presetId: string;
  name: string;
  category: string;
  /** Snapshot of the finite sequence being run. */
  intervals: Interval[];
}

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

/** App screens: the Library launcher (pick a preset), the Timer (run it),
    and the Presets editor. */
export type View = 'library' | 'timer' | 'edit';
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
  kind: IntervalKind;
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