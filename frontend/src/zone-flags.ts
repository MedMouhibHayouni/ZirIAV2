/**
 * Zone.js Performance Flags
 * ─────────────────────────────────────────────────────────────────────────────
 * These flags MUST be set BEFORE zone.js is imported (before main.ts).
 * They prevent Zone.js from patching high-frequency browser APIs that would
 * otherwise trigger Angular change detection on every scroll, mouse move,
 * touch event, etc. — which causes jank on 60Hz and complete stuttering on
 * high-refresh-rate (120Hz/144Hz) monitors.
 *
 * Reference: https://angular.io/guide/zone#disabling-zone-apis
 */

// ── Disable patching of passive event APIs (scroll, touch, wheel, mousemove)
// These events fire 60–144 times per second. We NEVER need CD triggered by them.
(window as any).__Zone_disable_requestAnimationFrame = true; // Leaflet/Charts rAF must NOT trigger Angular CD (major CPU win)
(window as any).__Zone_disable_on_property = false;

// Disable scroll and touch patching — the single biggest win on 144Hz screens
(window as any).__zone_symbol__UNPATCHED_EVENTS = [
  'scroll',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'wheel',
  'resize',
  'pointerover',
  'pointerenter',
  'pointermove',
  'pointerout',
  'pointerleave',
];
