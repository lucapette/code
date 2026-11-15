/* ==========================================================================
   seta — SSE stream parsing
   The Go proxy normalizes the upstream model stream into a simple contract:

     data: {"delta":"…"}   a piece of the translation
     data: {"error":"…"}   a mid-stream failure (already-sent deltas stand)
     data: [DONE]          the terminator

   Everything here is pure string work so it can be tested without a server.
   ========================================================================== */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface ParseResult {
  /** Translation fragments in arrival order. */
  deltas: string[];
  /** True once the [DONE] terminator was seen. */
  done: boolean;
  /** A mid-stream error message, if the stream sent one. */
  error: string | null;
  /** The unconsumed tail (an event still arriving) to feed the next call. */
  rest: string;
}

/** Parses every complete event out of the receive buffer and returns the
    fragments found plus the partial tail to carry into the next read.
    Unparseable lines are skipped, not fatal: keep-alives and stray comments
    are not ours to fail on. */
export function parseSSEBuffer(buffer: string): ParseResult {
  const result: ParseResult = { deltas: [], done: false, error: null, rest: '' };

  const blocks = buffer.split(/\r?\n\r?\n/);
  result.rest = blocks.pop() ?? '';

  for (const block of blocks) {
    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine;
      if (!line.startsWith('data:')) continue; // comments (":") and field lines

      const payload = line.slice('data:'.length).replace(/^ /, '');
      if (payload === '[DONE]') {
        result.done = true;
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }
      if (!isRecord(parsed)) continue;

      if (typeof parsed.error === 'string') {
        result.error = parsed.error;
      } else if (typeof parsed.delta === 'string') {
        result.deltas.push(parsed.delta);
      }
    }
  }

  return result;
}
