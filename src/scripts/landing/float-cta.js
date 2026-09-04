/**
 * THE FLOATING CTA — R37 (Oscar, 2026-09-04): the case-study template's
 * fixed START A PROJECT chip (CtaChip.astro, variant `float`), 40 from
 * the right and bottom viewport edges.
 *
 * STATE, one axis, derived from structure — not scroll offsets:
 *   hidden   at the very top of the page (scrollY < FLOAT_SHOW_AT_PX);
 *   shown    from the first scroll until the LAST IMAGE IN THE STREAM
 *            has fully entered — its measured bottom edge crossing the
 *            viewport bottom (bottom ≤ innerHeight);
 *   hidden   from there on (the MORE WORK section, the footer).
 *   Symmetric both ways; the same predicate on every scroll/resize.
 *   suspend(true) (the lightbox open) forces hidden; suspend(false)
 *   re-evaluates.
 *
 * MOTION: the house blur-ripple, left to right, on the label's chars
 * and the arrow — the nav's own sweep applier (nav-motion.js
 * applyNavSweep: entry = cr-nav-in left→right, exit = cr-nav-out
 * right→left ... NOTE the exit direction: Oscar ruled "blur-out left
 * to right" for this element, so the exit here runs the applier's
 * ENTRY order with the OUT class — see applySweep). Visibility gates
 * the box outside the animations (no hidden-but-focusable element,
 * no flash before the first sweep); the applier already drops a
 * hidden part from the tab order and its pointer events. RM: instant
 * states at the same thresholds (the applier's reduced path).
 */
import { applyNavSweep, ensureRippleChars, sweepUnits, NAV_CHAR_STAGGER_S } from './nav-motion.js';

export const FLOAT_SHOW_AT_PX = 2;      /* "as soon as the user starts scrolling" */
export const FLOAT_HIDE_AFTER_MS = 800; /* the exit sweep's length: 0.3s + the stagger tail */
export const FLOAT_SETTLE_TICKS_MS = [200, 700, 1500]; /* the post-input re-evaluations (the Lenis tail settles late) */

/**
 * @param {{ reduced?: boolean, host: HTMLElement | null, cta: HTMLElement | null, lastImage: () => HTMLElement | null }} opts
 * @returns {{ suspend: (on: boolean) => void, state: () => string, cleanup: () => void }}
 */
export function initFloatCta({ reduced = false, host, cta, lastImage }) {
  if (!(host instanceof HTMLElement) || !(cta instanceof HTMLElement)) return { suspend() {}, state: () => 'absent', cleanup() {} };
  ensureRippleChars(cta.querySelector('[data-char-ripple]'));
  let shown = false;
  let suspended = false;
  let hideTimer = 0;
  let changedAt = 0; /* the last state change (the harness reads settledness from it) */
  const units = () => sweepUnits(cta);
  /* Both sweeps run LEFT TO RIGHT (Oscar's ruling for this element):
     the applier's entry order for the in, and the same order with the
     out class for the exit (the nav's exit runs right-to-left). */
  const applySweep = (hidden) => {
    if (reduced) { applyNavSweep(hidden, { reduced: true, parts: [cta] }); return; }
    applyNavSweep(hidden, { reduced: false, parts: [cta] });
    if (hidden) units().forEach((u, i) => { u.style.animationDelay = `${(i * NAV_CHAR_STAGGER_S).toFixed(2)}s`; });
  };
  const setShown = (next) => {
    if (next === shown) return;
    shown = next;
    changedAt = performance.now();
    window.clearTimeout(hideTimer);
    if (next) {
      host.dataset.floatState = 'shown';
      host.style.visibility = 'visible';
      applySweep(false);
    } else {
      host.dataset.floatState = 'hidden';
      applySweep(true);
      if (reduced) host.style.visibility = 'hidden';
      else hideTimer = window.setTimeout(() => { if (!shown) host.style.visibility = 'hidden'; }, FLOAT_HIDE_AFTER_MS);
    }
  };
  const inRange = () => {
    if (suspended) return false;
    const y = window.scrollY || 0;
    if (y < FLOAT_SHOW_AT_PX) return false;
    const last = lastImage();
    if (!(last instanceof HTMLElement)) return true;
    return last.getBoundingClientRect().bottom > (window.innerHeight || 0);
  };
  /* one extra evaluation after the input stops: a smooth scroll's last
     sub-pixel step can land without a scroll event (measured: the driver
     read 2.x on its last event while scrollY settled at 1) */
  let settleTimers = [];
  const evaluate = () => {
    setShown(inRange());
    /* the smooth scroll's sub-pixel tail can outlast one tick: re-read at three points after the last event */
    settleTimers.forEach(window.clearTimeout);
    settleTimers = FLOAT_SETTLE_TICKS_MS.map((ms) => window.setTimeout(() => setShown(inRange()), ms));
  };
  /* boot: hidden, no sweep (the box is visibility:hidden from CSS) */
  host.dataset.floatState = 'hidden';
  host.style.visibility = 'hidden';
  applyNavSweep(true, { reduced: true, parts: [cta] }); /* instant: the chars' opacity 0 for the first entry */
  units().forEach((u) => { u.style.opacity = ''; }); /* the entry animation owns opacity from here (its backwards fill) */
  cta.setAttribute('tabindex', '-1');
  window.addEventListener('scroll', evaluate, { passive: true });
  window.addEventListener('resize', evaluate);
  evaluate();
  return {
    suspend: (on) => { suspended = !!on; evaluate(); },
    state: () => (shown ? 'shown' : 'hidden'),
    since: () => performance.now() - changedAt,
    cleanup: () => {
      window.removeEventListener('scroll', evaluate);
      window.removeEventListener('resize', evaluate);
      window.clearTimeout(hideTimer);
      settleTimers.forEach(window.clearTimeout);
      host.style.visibility = '';
      delete host.dataset.floatState;
    },
  };
}
