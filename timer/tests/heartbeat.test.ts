import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHeartbeat } from '../src/heartbeat';

/* Node has no Worker global, so these exercise the setInterval fallback;
   the Worker path differs only in transport. */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createHeartbeat', () => {
  it('beats every 500ms while running', () => {
    const onBeat = vi.fn();
    const hb = createHeartbeat(onBeat);

    hb.start();
    vi.advanceTimersByTime(2000);

    expect(onBeat).toHaveBeenCalledTimes(4);
    hb.stop();
  });

  it('stops beating after stop()', () => {
    const onBeat = vi.fn();
    const hb = createHeartbeat(onBeat);

    hb.start();
    vi.advanceTimersByTime(1000);
    hb.stop();

    const count = onBeat.mock.calls.length;
    vi.advanceTimersByTime(5000);

    expect(onBeat).toHaveBeenCalledTimes(count);
  });

  it('start is idempotent — no double beats', () => {
    const onBeat = vi.fn();
    const hb = createHeartbeat(onBeat);

    hb.start();
    hb.start();
    vi.advanceTimersByTime(1000);

    expect(onBeat).toHaveBeenCalledTimes(2);
    hb.stop();
  });

  it('stop is idempotent and restart works', () => {
    const onBeat = vi.fn();
    const hb = createHeartbeat(onBeat);

    hb.start();
    vi.advanceTimersByTime(500);
    hb.stop();
    hb.stop();

    onBeat.mockClear();
    hb.start();
    vi.advanceTimersByTime(1000);

    expect(onBeat).toHaveBeenCalledTimes(2);
    hb.stop();
  });
});