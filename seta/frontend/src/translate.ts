/* ==========================================================================
   seta — translation requests
   The one place that streams: POST the text, consume the Go service's SSE
   contract (data: {"delta"} / {"error"} / [DONE]), and hand each fragment to
   the caller as it lands. The service infers the direction and reports it in a
   response header, so the UI never keeps its own copy of that heuristic.
   ========================================================================== */

import { errorMessage } from './http';
import { parseSSEBuffer } from './sse';
import type { Direction } from './types';

/** Mirrors maxTextBytes in the Go service: the cap the server enforces. */
export const MAX_TEXT_BYTES = 5000;

/** The header the service uses to answer "which way did this go?". */
export const DIRECTION_HEADER = 'X-Seta-Direction';

/** A streaming failure with a message the UI can show as-is. */
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
  /** Called as soon as the response headers land, before any fragment: the UI
      needs to know whether the output is Chinese while it is still streaming. */
  onDirection?: (direction: Direction) => void;
  /** Injected by tests. */
  fetchImpl?: typeof fetch;
}

export interface TranslateResult {
  /** Which way the service translated: 'en-zh' when the output is Chinese. */
  direction: Direction;
}

/** UTF-8 length, which is what the server's byte cap counts. */
export function countBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The direction the service reported, defaulting to en→zh for an older build. */
export function readDirection(res: Response): Direction {
  return res.headers.get(DIRECTION_HEADER) === 'zh-en' ? 'zh-en' : 'en-zh';
}

/** Streams one translation, calling `onDelta` as fragments arrive. Resolves
    when the service sends [DONE]; rejects with a TranslateError carrying the
    service's own message on any clean failure. */
export async function translateStream({
  text,
  signal,
  onDelta,
  onDirection,
  fetchImpl = fetch,
}: TranslateOptions): Promise<TranslateResult> {
  const res = await fetchImpl('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) throw new TranslateError(await errorMessage(res, 'translation failed'));
  if (!res.body) throw new TranslateError('no response stream');

  const direction = readDirection(res);
  onDirection?.(direction);

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

  return { direction };
}

export { errorMessage };
