/**
 * THE VIEWPORT SEAM — one gate for every script.
 *
 * The seams themselves live in src/config/breakpoints.js (the one source;
 * the stylesheets read them as @custom-media through the generated
 * tokens/breakpoints.css, the boot script and the scale shell are stamped
 * from it). This module is the runtime face of that file: the zone
 * predicates every driver gates on, as live matchMedia reads — the answer
 * must track live resizes (a desktop window dragged narrow before the
 * shell's settle fires, DevTools emulation toggles), never a cached width.
 *
 * Three zones, two seams: the shell (the 1728 composition, transform-
 * scaled), the tablet band (Part 4) and the phone build. The desktop
 * drivers return a no-op below the shell floor; the mobile layer owns that
 * width through gsap.matchMedia blocks keyed on the same QUERIES.
 */
import { SHELL_MIN_WIDTH, TABLET_MIN_WIDTH, MOBILE_MAX_WIDTH, PHONE_MAX_WIDTH, QUERIES } from '../../config/breakpoints.js';

export { SHELL_MIN_WIDTH, TABLET_MIN_WIDTH, MOBILE_MAX_WIDTH, PHONE_MAX_WIDTH, QUERIES };
export const isTabletViewport = () => window.matchMedia(QUERIES.tablet).matches;
export const isPhoneViewport = () => window.matchMedia(QUERIES.phone).matches;
/** The narrow-build query as a string, for scripts that used to inline it. */
export const NARROW_QUERY = QUERIES.mobile;
export const WIDE_QUERY = QUERIES.desktop;

/** True at and below the seam — the native-mobile regime. */
export const isMobileViewport = () => window.matchMedia(QUERIES.mobile).matches;

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
  const mq = window.matchMedia(QUERIES.mobile);
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
