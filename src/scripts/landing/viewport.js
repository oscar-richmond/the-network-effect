/**
 * VIEWPORT SEAM — the ONE mobile/desktop boundary for the new build
 * (Oscar's mobile brief, 2026-08-10).
 *
 * <= MOBILE_MAX_WIDTH (1359 since R83)  ->  the NARROW build: the scale
 *   shell never engages (BaseLayout boot + scale-shell.html), the
 *   max-width:1359px CSS blocks are the layout, and page drivers boot
 *   their narrow paths (or nothing) through the gates below. Inside
 *   that, 768–1359 is the TABLET band (the same structure at tablet
 *   proportions) and <= 767 is the phone build proper.
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

/* R83 (Oscar, 2026-09-06) — THE ZONING, ONE SOURCE.
   Three zones, two seams (see the Phase 0 strategy):
     shell   1360 – 1727   the 1728 composition, transform-scaled
     tablet   768 – 1359   the narrow build's structure at tablet proportions
     mobile      ≤ 767     the phone build, byte-identical
   SHELL_MIN_WIDTH is the type-floor number: the smallest interactive
   text on every page is the 14px tier, and 14 × (w ÷ 1728) stays above
   11px only from 1358 up — so the shell must not scale below 0.786. 1360
   is that threshold rounded to a width no real device has, so nothing
   sits on the seam. TABLET_MIN_WIDTH is 768 because no iPad is narrower
   in either orientation and no phone is wider than 430: the seam falls
   in a 338px gap no device occupies, and an iPad rotating 1024 ↔ 768
   stays in one zone.
   MOBILE_MAX_WIDTH keeps its name and its meaning — "the narrow build
   applies" — because 97 stylesheet queries and a dozen scripts were
   written against it; it is now the shell floor minus one. The layout's
   boot script and scale-shell.html mirror these as inline literals
   (they cannot import); those three numbers must move together. */
export const SHELL_MIN_WIDTH = 1360;
export const TABLET_MIN_WIDTH = 768;
export const MOBILE_MAX_WIDTH = SHELL_MIN_WIDTH - 1;
export const isTabletViewport = () =>
  window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
export const isPhoneViewport = () =>
  window.matchMedia(`(max-width: ${TABLET_MIN_WIDTH - 1}px)`).matches;
/** The narrow-build query as a string, for scripts that used to inline it. */
export const NARROW_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;
export const WIDE_QUERY = `(min-width: ${SHELL_MIN_WIDTH}px)`;

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
