/* ==========================================================================
   seta — Alpine wiring
   The component itself lives in component.ts; this file only registers it with
   Alpine and boots. Keeping the two apart is what lets the state machine be
   tested without a browser.
   ========================================================================== */

import Alpine from 'alpinejs';

import { setaApp } from './component';

document.addEventListener('alpine:init', () => {
  Alpine.data('setaApp', setaApp);
});

Alpine.start();
