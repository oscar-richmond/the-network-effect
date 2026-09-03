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
import { measureStatementInk } from './statement-bar.js';

export const ST_DWELL_HOLD_PX = 300;

/**
 * @param {HTMLElement} section the dwell box (pads + slack live here)
 * @param {HTMLElement} stage   the statement block wrapper (pins)
 * @param {{ topBound?: number | (() => number), inkLines?: () => HTMLElement[], holdPx?: number, bottomClear?: boolean }} [opts]
 *   topBound (R5, Oscar 2026-08-27): the centring REGION's top edge
 *   in px from the viewport top — the block centres between it and
 *   the viewport bottom (equal gaps to both). 0 (the default) is
 *   the original full-viewport centring, so existing callers are
 *   byte-identical. A function re-derives on every apply/resize
 *   (the landing passes the measured nav bottom).
 *   inkLines (R6, Oscar 2026-08-27 — the twice-missed centring's
 *   mechanism): the statement's line elements. When present the
 *   dwell centres the text's RENDERED INK (first line's cap top to
 *   last line's ink bottom, statement-bar's shared measurement)
 *   instead of the stage box — a stage whose own internal padding
 *   is asymmetric (the closing stage bakes 54px above the lines and
 *   a 180px legacy allowance below) centres its BOX perfectly while
 *   the visible text rides high; anchoring to ink is the fix, and
 *   the same measurement drives every instance so they cannot
 *   drift apart. Fonts-gated internally (the metrics need real
 *   faces).
 *   holdPx (R23, Oscar 2026-09-03): this instance's hold — the
 *   sticky slack in px. Defaults to ST_DWELL_HOLD_PX (the shared
 *   "one more scroll"); the landing closing passes its red fade's
 *   scrub range so the text stays fixed for exactly the fade.
 *   bottomClear (R23): false drops the neighbour-clearing padding
 *   below the stage's box. The default (true) keeps the neighbour
 *   below out until release; the landing closing's neighbour is its
 *   own red tail — the same band — so the strip was only stacking
 *   ground between the statement's ink and the footer's reveal.
 * @returns {() => void} cleanup
 */
export function initStatementDwell(section, stage, opts = {}) {
  if (!(section instanceof HTMLElement) || !(stage instanceof HTMLElement)) return () => {};
  if (isMobileViewport()) return () => {};
  const holdPx = Number.isFinite(opts.holdPx) ? Math.max(0, opts.holdPx) : ST_DWELL_HOLD_PX;
  const bottomClear = opts.bottomClear !== false;
  const topBoundOf = () => {
    const tb = typeof opts.topBound === 'function' ? opts.topBound() : (opts.topBound || 0);
    return Number.isFinite(tb) ? Math.max(0, tb) : 0;
  };

  /* The anchor: the distance from the stage's top to the point the
     centring aligns with the region's centre. Box mode = h/2; ink
     mode = the ink extent's midpoint (measured with the dwell
     styles off, same pass as h). */
  const inkAnchor = (h) => {
    const lines = (typeof opts.inkLines === 'function' ? opts.inkLines() : [])
      .filter((el) => el instanceof HTMLElement)
      .sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top);
    if (!lines.length) return h / 2;
    const first = measureStatementInk(lines[0]);
    const last = measureStatementInk(lines[lines.length - 1]);
    if (!first || !last || !(last.inkBottom > first.inkTop)) return h / 2;
    const stageTop = stage.getBoundingClientRect().top;
    return ((first.inkTop - stageTop) + (last.inkBottom - stageTop)) / 2;
  };

  const apply = () => {
    /* Measure the natural block height with the dwell styles off. */
    stage.style.position = '';
    stage.style.top = '';
    stage.style.height = '';
    section.style.height = '';
    const h = stage.offsetHeight;
    const m = inkAnchor(h);
    const anchor = m.toFixed(1);
    const rest = (h - m).toFixed(1);
    const tbHalf = (topBoundOf() / 2).toFixed(1);
    /* Region [topBound, 100dvh]: sticky/pad-top places the ANCHOR
       (box middle, or the ink midpoint) on the region's centre —
       the gaps from topBound to the ink top and from the ink bottom
       to the viewport bottom are equal by construction. pad-bottom
       keeps the neighbour-clearing strip below the stage's box. */
    stage.style.position = 'sticky';
    stage.style.top = `calc(50dvh + ${tbHalf}px - ${anchor}px)`;
    stage.style.height = `${h}px`;
    section.style.boxSizing = 'content-box';
    section.style.paddingTop = `calc(50dvh + ${tbHalf}px - ${anchor}px)`;
    section.style.paddingBottom = bottomClear ? `calc(50dvh - ${tbHalf}px - ${rest}px)` : '0px';
    section.style.height = `${h + holdPx}px`;
  };
  apply();
  /* Ink metrics need the real faces — re-derive once fonts settle
     (idempotent; box-mode callers are already fonts-gated). */
  let disposed = false;
  if (typeof opts.inkLines === 'function') {
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!disposed) apply();
    });
  }
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  return () => {
    disposed = true;
    window.removeEventListener('resize', onResize);
    ['position', 'top', 'height'].forEach((k) => { stage.style[k] = ''; });
    ['boxSizing', 'paddingTop', 'paddingBottom', 'height'].forEach((k) => { section.style[k] = ''; });
  };
}
