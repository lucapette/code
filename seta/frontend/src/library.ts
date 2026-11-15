/* ==========================================================================
   seta — library helpers
   Pure functions behind the list and the save sheet: search, tag wrangling,
   and the pre-fills each tab contributes. No DOM, no fetch — so the rules
   ("only Chinese is required", "direction decides what gets saved") are
   testable on their own.
   ========================================================================== */

import type { Direction, HskWord, Item, ItemInput, SheetState } from './types';

const MAX_TAGS = 20;

/** Case-insensitive search over Chinese, meaning, note and tags — the one
    filter v1 ships, exactly as scoped. */
export function filterItems(items: Item[], query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;

  return items.filter((item) =>
    [item.chinese, item.meaning, item.note, ...(item.tags ?? [])]
      .filter(Boolean)
      .join('\n')
      .toLowerCase()
      .includes(needle),
  );
}

/** A blank sheet, optionally pre-filled. */
export function emptySheet(draft: Partial<SheetState> = {}): SheetState {
  return {
    open: true,
    id: null,
    chinese: '',
    meaning: '',
    where: '',
    note: '',
    tags: [],
    error: null,
    saving: false,
    ...draft,
  };
}

/** What the Translate tab hands the sheet.
    en→zh: the user produced Chinese, so the translation is the item.
    zh→en: the user looked something up, so the text they pasted is the item and
    the English is context. */
export function sheetFromTranslation(
  direction: Direction,
  source: string,
  translated: string,
): Partial<SheetState> {
  if (direction === 'zh-en') {
    return { chinese: source.trim(), meaning: translated.trim() };
  }
  return { chinese: translated.trim(), meaning: source.trim() };
}

/** What an HSK gap row hands the sheet: the word, its gloss, and where it came
    from — all in free-text fields, no new columns. */
export function sheetFromWord(word: HskWord): Partial<SheetState> {
  return {
    chinese: word.s,
    meaning: word.m,
    where: `HSK ${word.lv}`,
  };
}

/** What the Library's edit action hands the sheet. */
export function sheetFromItem(item: Item): Partial<SheetState> {
  return {
    id: item.id,
    chinese: item.chinese,
    meaning: item.meaning ?? '',
    where: item.where ?? '',
    note: item.note ?? '',
    tags: [...(item.tags ?? [])],
  };
}

/** The sheet's values as an API payload. Optional fields are dropped when
    empty so the stored row stays honest about what the user filled in. */
export function sheetToInput(state: SheetState): ItemInput {
  const input: ItemInput = { chinese: state.chinese.trim() };
  const optional = [
    ['meaning', state.meaning],
    ['where', state.where],
    ['note', state.note],
  ] as const;

  for (const [field, value] of optional) {
    const trimmed = value.trim();
    if (trimmed) input[field] = trimmed;
  }
  if (state.tags.length) input.tags = state.tags;
  return input;
}

/** Adds whatever the chip input holds, splitting on commas/semicolons, trimming,
    dropping blanks and case-insensitive duplicates. Returns the new list. */
export function addTags(existing: string[], draft: string): string[] {
  const next = [...existing];
  const seen = new Set(next.map((tag) => tag.toLowerCase()));

  for (const raw of draft.split(/[,;，、]/)) {
    const tag = raw.trim().replace(/^#+/, '').trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    if (next.length >= MAX_TAGS) break;

    seen.add(key);
    next.push(tag);
  }
  return next;
}

/** Removes one tag by value. */
export function removeTag(existing: string[], tag: string): string[] {
  return existing.filter((candidate) => candidate !== tag);
}
