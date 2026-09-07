/**
 * COVER-THEN-RETIRE image swap — the /services hover-rows grammar,
 * extracted (Oscar's rev: the main menu's hover image now reads the
 * same as the We Build / We Shape rows).
 *
 * THE READ: the NEW image wipes in OVER the old, left to right,
 * with its blur settling 6 -> 0, while the OLD blurs UP 0 -> 6
 * beneath it (`.is-covering` on the wrap — one-sided blur wasn't
 * legible). Once the cover completes, the BASE adopts the new src
 * and un-blurs TRANSITION-FREE under the overlay, then the overlay
 * retires. The frame is never empty at any point, and the old image
 * is never wiped away before the new one is there.
 *
 * RAPID HOPS never stack: one run is in flight at a time, and its
 * completion re-checks the LATEST pending src (the lightbox latch),
 * so a fast sweep across items always lands on the newest.
 *
 * The two callers share these constants, so the feel can only ever
 * be changed in ONE place.
 */

/** Duration of each phase (the lightbox constant). */
export const SWAP_PHASE_MS = 450;

/** The house swap curve. */
export const SWAP_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';

/**
 * @param {{
 *   wrap: HTMLElement,
 *   baseEl: HTMLImageElement,
 *   overEl: HTMLImageElement,
 *   onCoverStart?: (src: string) => void,
 * }} opts
 */
/* THE MOBILE PASS (2026-09-07): an image that carries the narrow-build
   gate (thumb-srcset.js — a srcset whose phone candidate is a 1×1 GIF)
   ignores src assignments while the srcset stands, so the runner drops
   the srcset before it writes a src. Above the seam the srcset had
   resolved to the very file src names, so nothing visible changes. */
const assignSrc = (el, url) => {
  if (el.hasAttribute('srcset')) { el.removeAttribute('srcset'); el.removeAttribute('sizes'); }
  el.src = url;
};
export function createCoverSwap(opts = {}) {
  const { wrap, baseEl, overEl, onCoverStart } = opts;
  const noop = { swapTo() {}, showInstant() {}, reset() {} };
  if (
    !(wrap instanceof HTMLElement) ||
    !(baseEl instanceof HTMLImageElement) ||
    !(overEl instanceof HTMLImageElement)
  ) return noop;

  let shownSrc = baseEl.getAttribute('src') || '';
  let pendingSrc = null;
  let running = false;
  const timers = [];

  const reset = () => {
    timers.forEach(window.clearTimeout);
    timers.length = 0;
    running = false;
    wrap.classList.remove('is-covering');
    overEl.hidden = true;
    overEl.style.transition = '';
    overEl.style.clipPath = '';
    overEl.style.filter = '';
  };

  const run = () => {
    const target = pendingSrc;
    if (!target || target === shownSrc) return;
    running = true;
    onCoverStart?.(target);
    wrap.classList.add('is-covering');
    assignSrc(overEl, target);
    overEl.hidden = false;
    overEl.style.transition = 'none';
    overEl.style.clipPath = 'inset(0 100% 0 0)';
    overEl.style.filter = 'blur(6px)';
    void overEl.offsetWidth; /* commit the start state */
    overEl.style.transition =
      `clip-path ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}, filter ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}`;
    overEl.style.clipPath = 'inset(0 0 0 0)';
    overEl.style.filter = 'blur(0px)';
    timers.push(window.setTimeout(() => {
      /* Fully covered — hand the image to the base and drop the
         blur class with transitions OFF, so no visible un-blur
         follows; only then retire the overlay. */
      assignSrc(baseEl, overEl.src);
      baseEl.style.transition = 'none';
      wrap.classList.remove('is-covering');
      void baseEl.offsetWidth;
      baseEl.style.transition = '';
      shownSrc = target;
      reset();
      if (pendingSrc && pendingSrc !== shownSrc) run();
    }, SWAP_PHASE_MS + 30));
  };

  return {
    /** Animate to `src` (no-op if it is already showing). */
    swapTo(src) {
      if (!src) return;
      pendingSrc = src;
      if (!running) run();
    },
    /** Place `src` with NO animation — the fresh-entrance path.
        Transitions are suppressed across the change so dropping
        `.is-covering` mid-run can't leave a visible un-blur. */
    showInstant(src) {
      if (!src) return;
      reset();
      pendingSrc = null;
      shownSrc = src;
      baseEl.style.transition = 'none';
      assignSrc(baseEl, src);
      void baseEl.offsetWidth;
      baseEl.style.transition = '';
    },
    reset,
  };
}
