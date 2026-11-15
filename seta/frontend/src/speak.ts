/* ==========================================================================
   seta — speech synthesis
   Reads Chinese aloud with the browser's own voices. Availability is an OS
   fact, not a browser fact: on a machine with no zh voice installed there is
   nothing to offer, and an English voice reading hanzi is worse than silence —
   so this module reports availability and every speak button hides itself when
   it is false. Nothing here touches the network or the Go service.
   ========================================================================== */

/** Slightly slower than native: a learner is following along. */
const RATE = 0.85;

const listeners = new Set<(available: boolean) => void>();

/** The synthesis object the change listener is bound to, so prime() can be
    called repeatedly without stacking listeners (and re-binds if the object is
    ever replaced). */
let boundSynth: SpeechSynthesis | null = null;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

function chineseVoice(): SpeechSynthesisVoice | null {
  const voices = synth()?.getVoices() ?? [];
  return voices.find((voice) => (voice.lang ?? '').toLowerCase().startsWith('zh')) ?? null;
}

/** Re-reads availability and tells subscribers, so the late-arriving voice list
    still turns the speak buttons on. */
function refresh(): boolean {
  const available = chineseVoice() !== null;
  for (const listener of listeners) listener(available);
  return available;
}

/** Reads the current voice list and starts listening for changes — voices are
    often delivered asynchronously, after first paint. */
export function prime(): boolean {
  const speech = synth();
  if (!speech) return false;

  if (boundSynth !== speech) {
    boundSynth = speech;
    speech.addEventListener('voiceschanged', () => {
      refresh();
    });
  }
  return refresh();
}

/** Subscribes to availability changes; returns an unsubscribe function. */
export function onAvailability(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  listener(chineseVoice() !== null);
  return () => {
    listeners.delete(listener);
  };
}

export function canSpeak(): boolean {
  return chineseVoice() !== null;
}

/** Speaks Chinese with the installed zh voice. Returns false when there is
    none, so callers can explain instead of playing the wrong language. */
export function speakChinese(text: string): boolean {
  const speech = synth();
  if (!speech || !text.trim()) return false;

  const voice = chineseVoice();
  if (!voice) return false;

  speech.cancel(); // one utterance at a time: tapping again restarts, never stacks
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang || 'zh-CN';
  utterance.voice = voice;
  utterance.rate = RATE;
  speech.speak(utterance);
  return true;
}
