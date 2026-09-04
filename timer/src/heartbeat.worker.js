/* Worker-side heartbeat: plain timers in a dedicated Worker are not
   subject to the tab-hidden timer throttling that silences rAF and
   setTimeout on the main thread. Alive == beating; stopping = terminate. */
setInterval(() => self.postMessage('beat'), 500);
