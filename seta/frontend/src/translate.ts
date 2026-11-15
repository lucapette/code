/* ==========================================================================
   seta — translation requests
   The one place that talks HTTP: POST the source text, consume the Go
   service's SSE contract (data: {"delta"} / {"error"} / [DONE]), and hand each
   fragment to the caller as it lands. No DOM, no Alpine, no globals — the
   fetch is injectable, so the whole streaming path is testable.
   ========================================================================== */

import { isRecord, parseSSEBuffer } from './sse';

/** Mirrors maxTextBytes in the Go service: the cap the server enforces. */
export const MAX_TEXT_BYTES = 5000;

/** A failure with a message the UI can show as-is. */
export class TranslateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslateError';
  }
}

export interface TranslateOptions {
  text: string;
  signal: AbortSignal;
  /** Called for every fragment, in arrival order. */
  onDelta: (delta: string) => void;
  /** Injected by tests. */
  fetchImpl?: typeof fetch;
}

/** UTF-8 length, which is what the server's byte cap counts. */
export function countBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Streams one translation, calling `onDelta` as fragments arrive. Resolves
    when the service sends [DONE]; rejects with a TranslateError carrying the
    service's own message on any clean failure. */
export async function translateStream({
  text,
  signal,
  onDelta,
  fetchImpl = fetch,
}: TranslateOptions): Promise<void> {
  const res = await fetchImpl('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) throw new TranslateError(await errorMessage(res));
  if (!res.body) throw new TranslateError('no response stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) buffer += decoder.decode(); // flush the decoder

    const parsed = parseSSEBuffer(buffer);
    buffer = parsed.rest;
    for (const delta of parsed.deltas) onDelta(delta);

    if (parsed.error) throw new TranslateError(parsed.error);
    if (parsed.done || done) break;
  }

  // We may stop at the terminator while the socket is still open; releasing
  // the reader frees it instead of leaving the body dangling until GC.
  await reader.cancel().catch(() => undefined);
}

/** Reads the Go service's normalized {"error":"…"} body, falling back to a
    generic message when there is nothing readable (a dead network, or a proxy
    answering with HTML). */
export async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    /* no body or not JSON — fall through */
  }
  return 'translation failed';
}

/** Whether a thrown value is the abort the app itself triggered. */
export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === 'AbortError';
}
