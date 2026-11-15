/* ==========================================================================
   seta — HTTP plumbing
   The bits every JSON call needs: read the service's normalized error body,
   and a typed fetch that fails with a message the UI can show as-is.
   ========================================================================== */

import { isRecord } from './sse';

/** A failure the UI can show verbatim. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Reads the Go service's normalized {"error":"…"} body, falling back to the
    caller's generic message when there is nothing readable (a dead network, or
    a proxy answering with HTML). */
export async function errorMessage(res: Response, fallback = 'request failed'): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    /* no body or not JSON — fall through */
  }
  return fallback;
}

/** Fetches JSON, or throws an ApiError carrying the service's own message. */
export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);

  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Whether a thrown value is the abort the app itself triggered. */
export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError';
}
