/**
 * THE STATEMENT DWELL — the one mechanism for every large-statement
 * centred hold (Oscar R4, 2026-08-26; consolidates the closing-st
 * sticky built 2026-08-26 and extends it to the /services
 * statements).
 *
 * MECHANISM (the closing section's sticky-slack hold, generalised):
 *   - the statement block sits in a STICKY STAGE whose `top` is
 *     calc(50dvh − h/2) — the pin engages EXACTLY as the block's
 *     centre crosses the viewport centre, at any viewport height;
 *   - the section's CONTENT height is h + ST_DWELL_HOLD_PX, so the
 *     sticky slack IS the hold (scrub-native, reversible, RM-safe:
 *     it is layout, not motion);
 *   - the section's symmetric PADDINGS are calc(50dvh − h/2) — the
 *     clear-space strips. Padding sits OUTSIDE the sticky element's
 *     containing block (the CONTENT box bounds sticky travel), so
 *     it paints neighbour-clearing ground above and below without
 *     extending the hold: at engage the neighbour above sits
 *     exactly at the viewport top, and the neighbour below cannot
 *     enter until release.
 *
 * DERIVED, NOT HARDCODED: h is the stage's measured rendered height
 * (fonts-gated by the caller; re-derived on resize), so the
 * centring holds at 1728, in the 1512 shell (~994 interior), and at
 * any window size. DESKTOP ONLY — callers gate on the seam; the
 * stage wrappers are display:contents below it (layout-inert,
 * geometry-invisible).
 */
import { isMobileViewport } from './viewport.js';

export const ST_DWELL_HOLD_PX = 300;

/**
 * @param {HTMLElement} section the dwell box (pads + slack live here)
 * @param {HTMLElement} stage   the statement block wrapper (pins)
 * @param {{ topBound?: number | (() => number) }} [opts]
 *   topBound (R5, Oscar 2026-08-27): the centring REGION's top edge
 *   in px from the viewport top — the block centres between it and
 *   the viewport bottom (equal gaps to both). 0 (the default) is
 *   the original full-viewport centring, so existing callers are
 *   byte-identical. A function re-derives on every apply/resize
 *   (the landing passes the measured nav bottom).
 * @returns {() => void} cleanup
 */
export function initStatementDwell(section, stage, opts = {}) {
  if (!(section instanceof HTMLElement) || !(stage instanceof HTMLElement)) return () => {};
  if (isMobileViewport()) return () => {};
  const topBoundOf = () => {
    const tb = typeof opts.topBound === 'function' ? opts.topBound() : (opts.topBound || 0);
    return Number.isFinite(tb) ? Math.max(0, tb) : 0;
  };

  const apply = () => {
    /* Measure the natural block height with the dwell styles off. */
    stage.style.position = '';
    stage.style.top = '';
    stage.style.height = '';
    section.style.height = '';
    const h = stage.offsetHeight;
    const half = (h / 2).toFixed(1);
    const tbHalf = (topBoundOf() / 2).toFixed(1);
    /* Region [topBound, 100dvh]: sticky/pad-top = 50dvh + tb/2 −
       h/2; pad-bottom = 50dvh − tb/2 − h/2 — at settle the gap
       below the block equals the gap from topBound to its top. */
    stage.style.position = 'sticky';
    stage.style.top = `calc(50dvh + ${tbHalf}px - ${half}px)`;
    stage.style.height = `${h}px`;
    section.style.boxSizing = 'content-box';
    section.style.paddingTop = `calc(50dvh + ${tbHalf}px - ${half}px)`;
    section.style.paddingBottom = `calc(50dvh - ${tbHalf}px - ${half}px)`;
    section.style.height = `${h + ST_DWELL_HOLD_PX}px`;
  };
  apply();
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    ['position', 'top', 'height'].forEach((k) => { stage.style[k] = ''; });
    ['boxSizing', 'paddingTop', 'paddingBottom', 'height'].forEach((k) => { section.style[k] = ''; });
  };
}
