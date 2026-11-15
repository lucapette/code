import { describe, expect, it, vi } from 'vitest';

import {
  MAX_TEXT_BYTES,
  TranslateError,
  countBytes,
  errorMessage,
  isAbortError,
  translateStream,
} from '../src/translate';

const encoder = new TextEncoder();

/** A Response whose body arrives as the given chunks, in order. */
function sseResponse(chunks: string[], init: ResponseInit = {}): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, ...init });
}

const opts = (overrides: Partial<Parameters<typeof translateStream>[0]> = {}) => ({
  text: 'hello',
  signal: new AbortController().signal,
  onDelta: () => {},
  ...overrides,
});

describe('translateStream', () => {
  it('delivers fragments in arrival order, across split events', async () => {
    const deltas: string[] = [];
    const fetchImpl: typeof fetch = async () =>
      sseResponse([
        'data: {"del', // an event split mid-JSON by the network
        'ta":"你"}\n\n',
        'data: {"delta":"好"}\n\n',
        'data: [DONE]\n\n',
      ]);

    await translateStream(opts({ onDelta: (d) => deltas.push(d), fetchImpl }));

    // One call per fragment: the split event is buffered, not dropped, and the
    // second event is kept separate.
    expect(deltas).toEqual(['你', '好']);
  });

  it('rejects with the service error, keeping fragments already delivered', async () => {
    const deltas: string[] = [];
    const fetchImpl: typeof fetch = async () =>
      sseResponse([
        'data: {"delta":"你好"}\n\n',
        'data: {"error":"invalid upstream response"}\n\n',
        'data: [DONE]\n\n',
      ]);

    const failure = translateStream(opts({ onDelta: (d) => deltas.push(d), fetchImpl }));

    await expect(failure).rejects.toBeInstanceOf(TranslateError);
    await expect(failure).rejects.toThrow('invalid upstream response');
    expect(deltas).toEqual(['你好']);
  });

  it('surfaces the clean status body for a non-ok response', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'text exceeds limit' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });

    await expect(translateStream(opts({ fetchImpl }))).rejects.toThrow('text exceeds limit');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('<html>proxy error</html>', { status: 502 });

    await expect(translateStream(opts({ fetchImpl }))).rejects.toThrow('translation failed');
  });

  it('refuses a response with no body', async () => {
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 200 });

    await expect(translateStream(opts({ fetchImpl }))).rejects.toThrow('no response stream');
  });

  it('stops at [DONE] even if the stream stays open', async () => {
    const deltas: string[] = [];
    const fetchImpl: typeof fetch = async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"delta":"丝"}\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            // ...and never closes: the terminator is the contract, not EOF.
          },
        }),
        { status: 200 },
      );

    await translateStream(opts({ onDelta: (d) => deltas.push(d), fetchImpl }));

    expect(deltas).toEqual(['丝']);
  });

  it('posts the source text and forwards the abort signal', async () => {
    const controller = new AbortController();
    let captured: RequestInit | undefined;

    const fetchImpl: typeof fetch = async (_input, init) => {
      captured = init;
      return sseResponse(['data: [DONE]\n\n']);
    };

    await translateStream(opts({ text: '丝绸', signal: controller.signal, fetchImpl }));

    expect(captured?.method).toBe('POST');
    expect(captured?.signal).toBe(controller.signal);
    expect(JSON.parse(String(captured?.body))).toEqual({ text: '丝绸' });
  });

  it('propagates an abort as an abort error', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: typeof fetch = async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    };

    let caught: unknown;
    try {
      await translateStream(opts({ signal: controller.signal, fetchImpl }));
    } catch (e) {
      caught = e;
    }

    expect(isAbortError(caught)).toBe(true);
  });
});

describe('countBytes', () => {
  it('counts UTF-8 bytes, which is what the server cap measures', () => {
    expect(countBytes('hello')).toBe(5);
    expect(countBytes('丝绸')).toBe(6); // three bytes per hanzi
    expect(countBytes('')).toBe(0);
  });

  it('matches the server-side cap', () => {
    expect(MAX_TEXT_BYTES).toBe(5000);
    expect(countBytes('a'.repeat(MAX_TEXT_BYTES))).toBe(MAX_TEXT_BYTES);
  });
});

describe('errorMessage', () => {
  it('reads the normalized error body', async () => {
    const res = new Response(JSON.stringify({ error: 'translation engine unavailable' }), {
      status: 503,
    });
    await expect(errorMessage(res)).resolves.toBe('translation engine unavailable');
  });

  it('ignores a JSON body without an error string', async () => {
    const res = new Response(JSON.stringify({ status: 'ok' }), { status: 500 });
    await expect(errorMessage(res)).resolves.toBe('translation failed');
  });
});

describe('isAbortError', () => {
  it('recognizes aborts and nothing else', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError('boom')).toBe(false);
    vi.restoreAllMocks();
  });
});
