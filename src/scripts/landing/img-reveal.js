/**
 * THE IMAGE BLUR-IN — the /work grid's row reveal (R38 item 6, R41),
 * lifted out of work-grid.js so every mobile image can carry it
 * (Oscar, 2026-09-09: "the reveal I want everywhere").
 *
 * What it is, exactly as the grid does it:
 *   · the image sits under `filter: blur(IMG_REVEAL_BLUR_PX)` (12px)
 *     until its host is RESOLVED; resolving un-blurs it over
 *     IMG_REVEAL_MS (600ms) on the house ease cubic-bezier(0.42, 0,
 *     0.24, 1) — the CSS transition on the image, the vars written by
 *     the JS below so the constants have one home;
 *   · a host RESOLVES when a QUARTER of its measured height has
 *     entered the viewport — host top + height × IMG_REVEAL_THRESHOLD_T
 *     ≤ innerHeight — measured on scroll / resize (rAF-throttled),
 *     and MIRRORED: above the threshold again (the host leaves through
 *     the bottom) it un-resolves and blurs back the same way. Hosts
 *     already past the threshold at boot resolve on the spot — that is
 *     the first-load case: same blur, same duration, the trigger is
 *     the boot measurement rather than a scroll;
 *   · a host that has scrolled ABOVE the viewport stays resolved (its
 *     top is negative — the inequality holds);
 *   · RM: every host is marked resolved at boot and the stylesheet
 *     carries no blur rule under `reduce` — images are simply present.
 *
 * Two consumers:
 *   createImageReveal — the core (measure + toggle); work-grid.js keeps
 *     its own class name (`is-resolved` on the row), its own var names
 *     (`--work-reveal-*` on the grid) and its own height (the row's
 *     TALLEST tile), so the grid's DOM outcome is byte-for-byte what it
 *     was.
 *   initImageReveal — the site-wide wrapper for the phone: the hosts
 *     get `m-imgreveal` (shared-narrow.css holds the blur / transition,
 *     phone-gated, no-preference-gated) and toggle `is-img-resolved`;
 *     each host is its own measure (its box IS the image's box).
 */
import { isPhoneViewport } from './viewport.js';

export const IMG_REVEAL_THRESHOLD_T = 0.25; /* of the host's height entered */
export const IMG_REVEAL_MS = 600;           /* the un-blur */
export const IMG_REVEAL_BLUR_PX = 12;       /* the parked blur */

export const IMG_REVEAL_HOST_CLASS = 'm-imgreveal';
export const IMG_REVEAL_LIVE_CLASS = 'is-img-live';       /* the transition is armed */
export const IMG_REVEAL_RESOLVED_CLASS = 'is-img-resolved';

/**
 * Writes the two tunables as CSS custom properties on `el`
 * (`--<prefix>-s`, `--<prefix>-blur`). Returns the remover.
 */
export function writeRevealVars(el, prefix = 'img-reveal') {
  if (!(el instanceof HTMLElement)) return () => {};
  el.style.setProperty(`--${prefix}-s`, `${IMG_REVEAL_MS / 1000}s`);
  el.style.setProperty(`--${prefix}-blur`, `${IMG_REVEAL_BLUR_PX}px`);
  return () => {
    el.style.removeProperty(`--${prefix}-s`);
    el.style.removeProperty(`--${prefix}-blur`);
  };
}

/**
 * The core: toggles `className` on each host from its measured
 * geometry, on scroll and resize, mirrored.
 *
 * @param {{ hosts: HTMLElement[], reduced: boolean, className?: string,
 *   heightOf?: (host: HTMLElement) => number, threshold?: number }} opts
 * @returns {{ measure: () => void, cleanup: () => void }}
 */
export function createImageReveal({
  hosts,
  reduced,
  className = IMG_REVEAL_RESOLVED_CLASS,
  heightOf = (host) => host.getBoundingClientRect().height,
  threshold = IMG_REVEAL_THRESHOLD_T,
  ready = () => true,
}) {
  const measure = () => {
    const vh = window.innerHeight || 0;
    hosts.forEach((host) => {
      const top = host.getBoundingClientRect().top;
      const on = reduced || (ready(host) && top + heightOf(host) * threshold <= vh);
      host.classList.toggle(className, on);
    });
  };
  let raf = 0;
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); });
  };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  return {
    measure,
    cleanup: () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.cancelAnimationFrame(raf);
      /* once per BOOT: the next boot replays from the parked state */
      hosts.forEach((host) => host.classList.remove(className));
    },
  };
}

/**
 * The site-wide phone wrapper. `hosts` are the image WRAPPERS (the
 * figure / window whose box is the image's box); each is its own
 * measure. Nothing happens above the phone seam — the desktop and the
 * tablet band keep their bytes and their motion.
 *
 * THE COMPOSITION RULE (`entranceOf`): a host that already carries an
 * entrance — the case study's rise+fade on the row / card / hero
 * figure, the /work rows' fade-rise on the figure — resolves no
 * earlier than that entrance fires (`.is-visible` on the element
 * `entranceOf(host)` returns). Why: the grid's images are opaque, so
 * its resolve is SEEN; a composed image is at opacity 0 until its fade
 * begins, and an un-blur that ran under that would be spent before
 * anything showed. Measured at 402 the entrance line (70–85% of the
 * viewport = 131–262px in) is always DEEPER than the quarter line
 * (58–125px in for these images), so a composed image's FIRST un-blur
 * starts with its rise — one movement — and the quarter geometry
 * governs the mirror: leaving through the bottom blurs it back, and
 * re-entering (the entrance is once-only, so the gate now holds)
 * un-blurs it at the quarter line, exactly as the grid.
 *
 * THE PARK (Oscar's ruling, 2026-09-10): the host class is AUTHORED IN
 * THE MARKUP (`m-imgreveal` on every host's figure / window, phone-
 * gated by the stylesheet's media query), so the park is painted from
 * the first frame and never depends on this module having run; the
 * `classList.add` below is idempotent cover for a host built without
 * it. The un-blur transition is armed (`is-img-live`) only after one
 * forced style pass, so an added park could never itself transition in
 * (0 → 12px) from the stylesheet's `none`. Cleanup leaves an authored
 * class in place (the next boot's park) and removes only one it added.
 * No-JS: SiteShell's <noscript> style clears every park (and the
 * grid's), so a visitor without scripts sees sharp images.
 *
 * @param {Iterable<Element>} hosts
 * @param {{ entranceOf?: (host: HTMLElement) => Element | null }} [opts]
 * @returns {() => void} cleanup
 */
export function initImageReveal(hosts, { entranceOf } = {}) {
  if (!isPhoneViewport()) return () => {};
  const list = Array.from(hosts).filter((el) => el instanceof HTMLElement);
  if (!list.length) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const added = list.filter((host) => !host.classList.contains(IMG_REVEAL_HOST_CLASS));
  const unwrite = list.map((host) => {
    host.classList.add(IMG_REVEAL_HOST_CLASS);
    return writeRevealVars(host);
  });
  /* one style pass with the park in place and no transition armed */
  void document.body.offsetWidth;
  list.forEach((host) => host.classList.add(IMG_REVEAL_LIVE_CLASS));
  const ready = entranceOf
    ? (host) => { const el = entranceOf(host); return !el || el.classList.contains('is-visible'); }
    : () => true;
  const reveal = createImageReveal({ hosts: list, reduced, ready });
  /* the entrance's class change is the boot-case cue — re-measure on it */
  let mo = null;
  if (entranceOf && !reduced && typeof MutationObserver === 'function') {
    const watched = new Set(list.map(entranceOf).filter((el) => el instanceof Element));
    if (watched.size) {
      mo = new MutationObserver(() => reveal.measure());
      watched.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
    }
  }
  return () => {
    mo?.disconnect();
    reveal.cleanup();
    unwrite.forEach((fn) => fn());
    list.forEach((host) => host.classList.remove(IMG_REVEAL_LIVE_CLASS));
    added.forEach((host) => host.classList.remove(IMG_REVEAL_HOST_CLASS));
  };
}
