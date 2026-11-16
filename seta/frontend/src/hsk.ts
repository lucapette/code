/* ==========================================================================
   seta — the HSK tab's view model
   Pure helpers: which bands are selected, how met words group by band, and the
   labels the tab shows. No Alpine, no fetch — the rules are testable alone.
   ========================================================================== */

import type { CoverageReport, KnownWord, LevelCoverage, WordRef } from './types';

/** HSK 3.0 folds bands 7, 8 and 9 into one; the data calls that bucket 7. */
export const TOP_LEVEL = 7;

/** The bands the known list covers until the user picks others. */
export const DEFAULT_LEVELS: readonly number[] = [1, 2, 3];

/** One page of rows, matching the service's default. */
export const WORD_PAGE = 50;

/** "1"…"6", and "7–9" for the bucket that holds three bands. */
export function levelLabel(level: number): string {
  return level === TOP_LEVEL ? '7–9' : String(level);
}

export function levelPercent(row: LevelCoverage): number {
  if (!row.total) return 0;
  return Math.round((row.seen / row.total) * 100);
}

/** The bar row for one band, if the map has it. */
export function levelRow(report: CoverageReport, level: number): LevelCoverage | undefined {
  return report.levels.find((row) => row.level === level);
}

/** The band the gap list is showing: the one picked, else the map's current. */
export function showingLevel(report: CoverageReport, picked: number): number {
  return picked || report.current;
}

/** The references worth a chip: the sentences the word was met in. A word saved
    as an item of its own has a reference whose text is the word itself, and
    that chip said "saved" on nearly every row without adding anything the row
    does not already show. */
export function textRefs(word: KnownWord): WordRef[] {
  return (word.refs ?? []).filter((ref) => ref.text !== word.s);
}

/** How many references the row is not showing, if any. */
export function extraRefs(word: KnownWord): number {
  const shown = word.refs?.length ?? 0;
  return Math.max(0, (word.ref_total ?? shown) - shown);
}

export interface KnownGroup {
  level: number;
  label: string;
  seen: number;
  total: number;
  percent: number;
  words: KnownWord[];
}

/**
 * Group the met words by band, in band order. One group per selected band even
 * when nothing was met there: an empty band is information ("nothing yet"),
 * not a reason to hide the row.
 */
export function groupKnown(report: CoverageReport, levels: readonly number[]): KnownGroup[] {
  const words = report.known.words;

  return [...levels]
    .sort((a, b) => a - b)
    .map((level) => {
      const row = levelRow(report, level);
      return {
        level,
        label: levelLabel(level),
        seen: row?.seen ?? 0,
        total: row?.total ?? 0,
        percent: row ? levelPercent(row) : 0,
        words: words.filter((word) => word.lv === level),
      };
    });
}

/** Toggle one band in the selection. The selection never goes empty — an empty
    list would ask the service for nothing at all — so refusing a toggle returns
    the very same array and the caller can skip the request. */
export function toggleLevel(levels: number[], level: number): number[] {
  if (!levels.includes(level)) {
    return [...levels, level].sort((a, b) => a - b);
  }
  if (levels.length === 1) return levels;
  return levels.filter((row) => row !== level);
}
