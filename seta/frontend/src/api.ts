/* ==========================================================================
   seta — the library API
   Thin wrappers over the four item routes plus the HSK report. Everything goes
   through fetchJSON, so failures arrive as ApiError with the service's own
   wording.
   ========================================================================== */

import { fetchJSON } from './http';
import type { CoverageReport, Item, ItemInput, SearchResults } from './types';

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

/** Where the export button points: a download, not an API call. */
export const EXPORT_PATH = '/api/items/export';
