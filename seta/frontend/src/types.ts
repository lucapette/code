/* ==========================================================================
   seta — shared types
   The wire shapes mirror the Go structs one for one; keep them in step.
   ========================================================================== */

export type Theme = 'light' | 'dark';

/** What the readiness probe says about the model behind the Go service. */
export type EngineStatus = 'unknown' | 'ready' | 'warming' | 'unavailable';

/** Which way the translation went. Inferred by the Go service, never chosen. */
export type Direction = 'en-zh' | 'zh-en';

export type Tab = 'translate' | 'library' | 'hsk';

/** One saved thing. Only `chinese` is required; the rest have defaults. */
export interface Item {
  id: string;
  chinese: string;
  meaning?: string;
  where?: string;
  note?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

/** Fields a save/edit can set. Chinese is required on create. */
export interface ItemInput {
  chinese: string;
  meaning?: string;
  where?: string;
  note?: string;
  tags?: string[];
}

/** One HSK vocabulary row, as embedded in the binary. */
export interface HskWord {
  s: string;
  lv: number;
  q: number;
  py: string;
  m: string;
}

/** A library item a vocabulary word was met in. */
export interface WordRef {
  id: string;
  text: string;
}

/** A word the user has met, with the items that taught it. `ref_total` counts
    every item, while `refs` carries only the few the row shows. */
export interface KnownWord extends HskWord {
  refs?: WordRef[];
  ref_total?: number;
}

/** One page of vocabulary rows, with the total behind it. */
export interface WordPage {
  words: KnownWord[];
  total: number;
  more: boolean;
}

/** A vocabulary search hit: a row plus whether the user has met it. */
export interface SearchHit extends KnownWord {
  known: boolean;
}

/** One page of search hits across every HSK band. */
export interface SearchResults {
  words: SearchHit[];
  total: number;
  more: boolean;
}

export interface LevelCoverage {
  level: number;
  seen: number;
  total: number;
}

/** The whole HSK tab payload. */
export interface CoverageReport {
  levels: LevelCoverage[];
  current: number;
  known: WordPage;
  gaps: WordPage;
}

/** The HSK tab's two views: what you have met, and the map behind it. */
export type HskView = 'known' | 'explore';

/** The save sheet's working state, shared by all three tabs. */
export interface SheetState {
  open: boolean;
  id: string | null;
  chinese: string;
  meaning: string;
  where: string;
  note: string;
  tags: string[];
  error: string | null;
  saving: boolean;
}

/** Review scope: what the ladder says is due, or the whole library. */
export type ReviewScope = 'due' | 'all';

/** One page of review cards plus the counts behind it. */
export interface ReviewQueue {
  cards: Item[];
  due: number;
  total: number;
  new: number;
  more: boolean;
}

/** The schedule one graded card came away with. */
export interface ReviewState {
  item_id: string;
  due_at: string;
  interval_days: number;
  streak: number;
  lapses: number;
  reviewed_at: string;
}
