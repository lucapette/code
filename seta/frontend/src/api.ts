/* ==========================================================================
   seta — the library API
   Thin wrappers over the four item routes plus the HSK report. Everything goes
   through fetchJSON, so failures arrive as ApiError with the service's own
   wording.
   ========================================================================== */

import { fetchJSON } from './http';
import type { CoverageReport, Item, ItemInput } from './types';

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

/** The HSK tab: coverage per level plus `gaps` rows of the current level. */
export function loadCoverage(gaps: number): Promise<CoverageReport> {
  return fetchJSON<CoverageReport>(`/api/hsk?gaps=${gaps}`, { cache: 'no-store' });
}

/** Where the export button points: a download, not an API call. */
export const EXPORT_PATH = '/api/items/export';
