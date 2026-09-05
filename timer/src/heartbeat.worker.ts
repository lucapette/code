/* Worker-side heartbeat: plain timers in a dedicated Worker are not
   subject to the tab-hidden timer throttling that silences rAF and
   setTimeout on the main thread. Alive == beating; stopping = terminate.

   Only the postMessage surface is typed. `self` here is the Worker global,
   but the DOM lib (loaded for the rest of the app) types it as Window, so
   narrow it through an unknown cast at this one lib boundary. */
interface WorkerSelf {
  postMessage(message: unknown): void;
}

const SELF = self as unknown as WorkerSelf;

setInterval(() => SELF.postMessage('beat'), 500);