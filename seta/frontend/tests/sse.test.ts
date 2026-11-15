import { describe, expect, it } from 'vitest';

import { parseSSEBuffer } from '../src/sse';

describe('parseSSEBuffer', () => {
  it('collects deltas from complete events in order', () => {
    const buffer = 'data: {"delta":"你"}\n\ndata: {"delta":"好"}\n\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['你', '好']);
    expect(parsed.done).toBe(false);
    expect(parsed.error).toBeNull();
    expect(parsed.rest).toBe('');
  });

  it('keeps an incomplete trailing event as the rest', () => {
    const buffer = 'data: {"delta":"你好"}\n\ndata: {"del';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['你好']);
    expect(parsed.rest).toBe('data: {"del');
  });

  it('marks done on [DONE] and ignores events after it', () => {
    const buffer = 'data: {"delta":"好"}\n\ndata: [DONE]\n\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['好']);
    expect(parsed.done).toBe(true);
  });

  it('surfaces a mid-stream error event', () => {
    const buffer = 'data: {"delta":"你好"}\n\ndata: {"error":"invalid upstream response"}\n\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['你好']);
    expect(parsed.error).toBe('invalid upstream response');
  });

  it('skips comments and non-data lines without failing', () => {
    const buffer = ': keep-alive\n\nevent: ping\nirrelevant\n\ndata: {"delta":"丝"}\n\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['丝']);
    expect(parsed.error).toBeNull();
  });

  it('skips payloads that are not JSON objects', () => {
    const buffer = 'data: not-json\n\ndata: 42\n\ndata: {"delta":"绸"}\n\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['绸']);
  });

  it('tolerates CRLF line endings', () => {
    const buffer = 'data: {"delta":"丝绸"}\r\n\r\ndata: [DONE]\r\n\r\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual(['丝绸']);
    expect(parsed.done).toBe(true);
  });

  it('returns everything empty for an empty buffer', () => {
    const parsed = parseSSEBuffer('');

    expect(parsed.deltas).toEqual([]);
    expect(parsed.done).toBe(false);
    expect(parsed.error).toBeNull();
    expect(parsed.rest).toBe('');
  });

  it('does not mistake a bare newline for an event boundary', () => {
    // One event split mid-line by a read: the first newline inside the JSON
    // must not split the block early.
    const buffer = 'data: {"delta":"line one\\n';
    const parsed = parseSSEBuffer(buffer);

    expect(parsed.deltas).toEqual([]);
    expect(parsed.rest).toBe(buffer);
  });
});
