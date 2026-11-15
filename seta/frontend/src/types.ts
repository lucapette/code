/* ==========================================================================
   seta — shared types
   ========================================================================== */

export type Theme = 'light' | 'dark';

/** What the readiness probe says about the model behind the Go service. */
export type EngineStatus = 'unknown' | 'ready' | 'warming' | 'unavailable';
