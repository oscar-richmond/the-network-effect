/**
 * RAIL VEILS — the one source for every phone rail's edge gradients
 * (item 3, Oscar, 2026-09-09).
 *
 * Before this module each rail veiled its own edges its own way: the
 * founders rail 16 / 48 both always on; OUR NETWORK a 6% right veil
 * only; the WHAT WE DO lists 5% / 6% both always on; FEATURED WORK
 * 16 / 48 on its travel with both gone at the end (F3); the case
 * study's MORE WORK 16 / 48 both always on; MOST BRANDS and the
 * /services galleries none. Now every rail has the founders rail's
 * values — the host's ground over the LEFT margin (--m-margin, 16)
 * and 48 into the RIGHT edge, a 90° linear gradient from the ground
 * to clear, opacity 1 — and ONE behaviour:
 *
 *   at the START   the right veil only (there is nothing behind);
 *   once SCROLLED  both (content lies both ways);
 *   at the END     the left veil only (nothing further).
 *
 * The state is two custom properties on the host, `--m-veil-l` and
 * `--m-veil-r`, each 0…1 over a RAIL_VEIL_RAMP_PX ramp from the
 * rail's start / end, so a veil fades in over the first 24px of
 * travel rather than snapping. This module writes them for NATIVE
 * scrollers (a passive scroll listener, rAF-throttled, geometry read
 * fresh each frame, clamped for rubber-band overshoot); the pinned
 * FEATURED WORK rail's transform travel goes through the same
 * veilState() from landing-featured.js. The PAINT is one rule block
 * in shared-narrow.css (`.m-veils` — content, position, the widths,
 * the gradients, the opacities); each host anchors the band (top /
 * bottom / height) in its own sheet and sets `--m-veil-ink` where its
 * ground is not #161616 (a live variable where the ground fades).
 *
 * Hosts whose band cannot be derived in CSS (the rail's top depends
 * on a wrapped headline above it) pass `band`: an element inside the
 * rail whose box IS the band — its top and height, relative to the
 * host, are published as `--m-veil-top` / `--m-veil-h` and re-read
 * on resize.
 *
 * Phone only: every caller is inside its own isPhoneViewport() branch,
 * and the shared rule block sits under the phone media query. Reduced
 * motion: the state still tracks the scroll (there is no motion here
 * to remove — a veil is a static hint of what lies beyond the edge).
 */

/** the scroll distance, in px, over which a veil fades from 0 to 1 */
export const RAIL_VEIL_RAMP_PX = 24;

/**
 * @param {number} offset the rail's current travel (scrollLeft, or the pinned rail's -x)
 * @param {number} max    the rail's total travel (scrollWidth − clientWidth)
 * @returns {{ l: number, r: number }} the two veils' opacities, 0…1
 */
export function veilState(offset, max) {
  if (!(max > 0)) return { l: 0, r: 0 }; /* nothing to travel: no edge to hint */
  const ramp = Math.min(RAIL_VEIL_RAMP_PX, max / 2);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return { l: clamp01(offset / ramp), r: clamp01((max - offset) / ramp) };
}

/**
 * @param {HTMLElement} host the element carrying the ::before / ::after veils
 * @param {{ l: number, r: number }} state
 */
export function writeVeilState(host, { l, r }) {
  host.style.setProperty('--m-veil-l', l.toFixed(3));
  host.style.setProperty('--m-veil-r', r.toFixed(3));
}

/** @param {HTMLElement} host */
export function clearVeilState(host) {
  ['--m-veil-l', '--m-veil-r', '--m-veil-top', '--m-veil-h'].forEach((p) => host.style.removeProperty(p));
}

/**
 * Wire a native overflow-x scroller's veils.
 * @param {HTMLElement} host  the veils' host (the rail's positioned ancestor)
 * @param {HTMLElement} strip the scroller
 * @param {{ band?: HTMLElement | null }} [opts]
 * @returns {() => void} cleanup
 */
export function wireRailVeils(host, strip, { band = null } = {}) {
  let raf = 0;

  /* layout geometry (the offset chain), not the painted box — an
     entrance's transform on the band must not move the veils */
  const measureBand = () => {
    if (!(band instanceof HTMLElement)) return;
    let top = 0;
    let el = band;
    while (el instanceof HTMLElement && el !== host) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    if (el !== host) {
      /* the host is not in the band's offset chain: fall back to the boxes */
      top = band.getBoundingClientRect().top - host.getBoundingClientRect().top;
    }
    host.style.setProperty('--m-veil-top', `${Math.round(top)}px`);
    host.style.setProperty('--m-veil-h', `${Math.round(band.offsetHeight)}px`);
  };

  /* THE END is where the rail RESTS, not scrollWidth − clientWidth: a
     mandatory-snap rail whose last item aligns short of the scroll
     extent (the founders rail at 402: the photo card's start snaps at
     534 of a 558 extent) can be dragged to the extent but settles back
     on the last snap stop, and the right veil must be gone there. So
     the travel is measured to the last snapping child's aligned stop
     (its start on the scroll-padding line), clamped to the extent; a
     rail without snap, or whose last stop lies beyond the extent, ends
     at the extent as before. */
  const travelEnd = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    const cs = getComputedStyle(strip);
    if (!cs.scrollSnapType || cs.scrollSnapType === 'none') return max;
    const pad = parseFloat(cs.scrollPaddingLeft) || 0;
    const left = strip.getBoundingClientRect().left;
    let last = -Infinity;
    Array.from(strip.children).forEach((c) => {
      if (getComputedStyle(c).scrollSnapAlign === 'none') return;
      const stop = c.getBoundingClientRect().left - left + strip.scrollLeft - pad;
      if (stop > last) last = stop;
    });
    return last === -Infinity ? max : Math.min(max, Math.max(0, last));
  };

  const update = () => {
    raf = 0;
    writeVeilState(host, veilState(strip.scrollLeft, travelEnd()));
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  const onResize = () => {
    measureBand();
    schedule();
  };

  strip.addEventListener('scroll', schedule, { passive: true });
  /* the travel changes as the rail's images load and on resize: the
     strip's box and every item's box are observed */
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  ro?.observe(strip);
  Array.from(strip.children).forEach((c) => ro?.observe(c));
  if (band instanceof HTMLElement) ro?.observe(band);
  window.addEventListener('resize', onResize);

  measureBand();
  update();

  return () => {
    strip.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', onResize);
    ro?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    clearVeilState(host);
  };
}
