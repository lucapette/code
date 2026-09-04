/* ==========================================================================
   Heartbeat — keeps the timer advancing while the tab is hidden.

   rAF is suspended in hidden tabs (and by a locked screen), so a dedicated
   Worker drives re-syncs: Worker timers are not throttled that way. When
   Workers are unavailable or fail, falls back to a plain setInterval
   (still better than nothing under mild throttling). Either way a beat
   only says "time has passed" — the caller recomputes true state from the
   wall clock.
   ========================================================================== */

const BEAT_MS = 500;

export function createHeartbeat(onBeat) {
  let worker = null;
  let fallbackTimer = null;
  let running = false;

  function startFallback() {
    fallbackTimer = setInterval(onBeat, BEAT_MS);
  }

  function stopWorker() {
    if (!worker) return;
    worker.terminate();
    worker = null;
  }

  return {
    start() {
      if (running) return;
      running = true;
      try {
        worker = new Worker(new URL('./heartbeat.worker.js', import.meta.url));
        worker.onmessage = () => onBeat();
        worker.onerror = () => {
          stopWorker();
          if (running && !fallbackTimer) startFallback();
        };
      } catch {
        worker = null;
        startFallback();
      }
    },

    stop() {
      if (!running) return;
      running = false;
      stopWorker();
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    },
  };
}
