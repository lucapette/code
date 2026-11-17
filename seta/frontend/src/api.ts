/* ==========================================================================
   seta — the library API
   Thin wrappers over the four item routes plus the HSK report. Everything goes
   through fetchJSON, so failures arrive as ApiError with the service's own
   wording.
   ========================================================================== */

import { fetchJSON } from './http';
import type {
  CoverageReport,
  Item,
  ItemInput,
  ReviewQueue,
  ReviewScope,
  ReviewState,
  SearchResults,
} from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Every saved item, newest first. */
export async function listItems(): Promise<Item[]> {
  const body = await fetchJSON<{ items: Item[] }>('/api/items');
  return body.items ?? [];
}

export function createItem(input: ItemInput): Promise<Item> {
  return fetchJSON<Item>('/api/items', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateItem(id: string, input: ItemInput): Promise<Item> {
  return fetchJSON<Item>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function deleteItem(id: string): Promise<void> {
  return fetchJSON<void>(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** What the HSK tab asks for: bands, gap level, and the two page sizes. */
export interface CoverageQuery {
  levels?: readonly number[];
  known?: number;
  level?: number;
  gaps?: number;
}

/** The HSK tab: coverage per level, the words met, and one page of gaps.
    Built by hand so ?levels=1,2,3 stays readable in the network panel. */
export function loadCoverage(query: CoverageQuery = {}): Promise<CoverageReport> {
  const search = [
    query.levels?.length ? `levels=${query.levels.join(',')}` : '',
    query.known ? `known=${query.known}` : '',
    query.level ? `level=${query.level}` : '',
    query.gaps ? `gaps=${query.gaps}` : '',
  ]
    .filter(Boolean)
    .join('&');

  return fetchJSON<CoverageReport>(`/api/hsk${search ? `?${search}` : ''}`, { cache: 'no-store' });
}

/** The whole vocabulary, not one band: Chinese, pinyin or English. Every hit
    says whether it is already in the library. */
export function searchVocabulary(query: string, limit: number): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return fetchJSON<SearchResults>(`/api/hsk/search?${params}`, { cache: 'no-store' });
}

/** The review session: due cards, or the whole library on demand. */
export function loadReviewQueue(scope: ReviewScope = 'due', limit?: number): Promise<ReviewQueue> {
  const params = new URLSearchParams({ scope });
  if (limit !== undefined) params.set('limit', String(limit));
  return fetchJSON<ReviewQueue>(`/api/review?${params}`, { cache: 'no-store' });
}

/** One grade: the ladder answers with the card's next due date. */
export function gradeReview(itemID: string, grade: 0 | 1 | 2): Promise<ReviewState> {
  return fetchJSON<ReviewState>('/api/review', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ item_id: itemID, grade }),
  });
}

/** Where the export button points: a download, not an API call. */
export const EXPORT_PATH = '/api/items/export';
