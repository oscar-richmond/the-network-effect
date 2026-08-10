/**
 * VIEWPORT SEAM — the ONE mobile/desktop boundary for the new build
 * (Oscar's mobile brief, 2026-08-10).
 *
 * <= 1024px viewport width  ->  native mobile: the scale shell never
 *   engages (BaseLayout boot + scale-shell.js), the max-width:1024px
 *   CSS blocks are the layout, and page drivers boot their mobile
 *   paths (or nothing) through the gates below.
 * 1025-1727  ->  the scale shell (interior always 1728 — code inside
 *   the frame sees a desktop viewport and never consults this).
 * >= 1728    ->  bare desktop.
 *
 * 1024 is the holding pages' proven MOBILE_MAX_WIDTH and the seam
 * every new-build stylesheet and driver was already written against.
 * A page asking "am I mobile?" asks HERE — a second constant
 * somewhere else is a bug by definition.
 *
 * matchMedia, not a cached innerWidth: the answer must track live
 * resizes (a desktop window dragged narrow before the shell's 300ms
 * settle fires, DevTools emulation toggles).
 */

export const MOBILE_MAX_WIDTH = 1024;

const query = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

/** True at and below the seam — the native-mobile regime. */
export const isMobileViewport = () => window.matchMedia(query).matches;

/**
 * True when the device's PRIMARY input can't hover (phones, tablets)
 * — the touch-affordance gate (A3 of the brief). Orthogonal to width:
 * a narrow desktop window is mobile-LAYOUT but keeps hover mechanics;
 * a touch device at any width needs the tap affordances.
 */
export const isTouchPrimary = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

/**
 * Run on crossings of the seam, debounced to the same 300ms settle
 * the shell handover uses. Returns the cleanup. Most pages never need
 * this (the shell handover is a full navigation, which reboots
 * everything); it exists for bare-window resizes across the seam in
 * desktop browsers, where the document persists.
 * @param {(mobile: boolean) => void} onChange
 */
export function onViewportSeamChange(onChange) {
  const mq = window.matchMedia(query);
  let timer = 0;
  const handle = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => onChange(mq.matches), 300);
  };
  mq.addEventListener('change', handle);
  return () => {
    window.clearTimeout(timer);
    mq.removeEventListener('change', handle);
  };
}
