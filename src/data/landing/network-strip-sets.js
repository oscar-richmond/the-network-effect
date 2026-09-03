/**
 * OUR NETWORK — photo-strip sets for the industry hover (Oscar,
 * 2026-08-26): hovering a sector term swaps THE PHOTO STRIP (the
 * logo carousels no longer respond to hover).
 *
 * ══ ALL PLACEHOLDER CONTENT — PENDING OSCAR'S REAL IMAGERY ══
 * Every image is reused from elsewhere on the site (case-study
 * streams, founders page, services stack, the strip's own defaults)
 * purely so each industry's swap is VISIBLY different. Each inherits
 * the standing pending-sign-off + rights-confirmation flags from its
 * source. None of the elevated third-party-IP/named-person images
 * (Top Boy, Adolescence, adidas campaign, Depp, Lagerfeld, the
 * Louis Vuitton screenshot) are used.
 *
 * SHAPE: DEFAULT entries carry the strip's authored per-slot crops
 * ({ src, win, w, h, x, y } — win is the slot window width, the img
 * box is positioned inside it). Industry entries may carry just
 * { src } — the runtime renders those COVER-FIT in the slot — or the
 * full crop shape once real content lands.
 *
 * SET SIZE CONTRACT: every industry set must be EXACTLY
 * NETWORK_STRIP_SLOTS entries. Dev builds THROW on a mismatch (a bad
 * content drop should be loud); production normalises (truncate /
 * repeat) with a console error so the live strip degrades rather
 * than breaks. See assertStripSets() in landing-network.js.
 */

export const NETWORK_STRIP_SLOTS = 5;

/* The resting strip — the shipped five. The y values are the LIVE
   desktop crops (the 1:339 respec's per-slot 264-band tops, folded in
   here 2026-08-26 rev 2 from landing.css's retired !important
   overrides — inline styles own the crops so the hover swap's cover
   entries can't be dragged out of their windows). */
/* R9 (Oscar, 2026-09-02): the desktop strip grew by a third (264 ->
   352, landing.css). Each crop keeps its IMAGE SCALE (no stretch, no
   side-cropping) and the taller window is re-centred on the previous
   subject centre, clamped inside the image box: y' = 176 − (132 − y),
   clamped to [352 − h, 0]. Slot 1 clamps at 0 (its old crop already
   sat at the box top — the window simply reveals 88px more below,
   subject centre 34px higher in-window); slots 2–5 re-centre exactly.
   These render on DESKTOP only (mobile cover-fits the windows with
   its own !important rule), and the hover swap re-applies them on
   the way back to the resting set. */
export const NETWORK_STRIP_DEFAULT = [
  { src: '/assets/landing/network/strip-1.jpg', win: 345, w: 351.73, h: 439.92, x: -1.28, y: 0 },      /* was -10.04 (clamped) */
  { src: '/assets/landing/network/strip-2.jpg', win: 346, w: 346, h: 429, x: 0, y: -27.5 },             /* was -71.5 */
  { src: '/assets/landing/network/strip-3.jpg', win: 345, w: 355, h: 438, x: -10, y: -33.5 },           /* was -77.5 */
  { src: '/assets/landing/network/strip-4.jpg', win: 346, w: 367, h: 459, x: -18, y: -33.5 },           /* was -77.5 */
  { src: '/assets/landing/network/strip-5.jpg', win: 346, w: 349.01, h: 448.3, x: -2.01, y: -68.24 },   /* was -112.24 */
];

/* R23 (Oscar, 2026-09-03; Figma CijDb423viBXOwGJyPKwfb 1:67 → 0:279):
   THE LANDING'S resting strip at 421 tall — each slot is the frame's
   own image rect against its 345/346 mask (mask origin subtracted;
   the file's sub-px kept). Same five sources (their aspects match the
   file's uploads exactly). LandingNetwork.astro renders this set on
   the landing (entry 'pin') and the hover swap returns to it there
   (landing-network.js restingSet); /services keeps
   NETWORK_STRIP_DEFAULT untouched, and mobile cover-fits whichever it
   receives (its own !important rule), so its rendering is unchanged. */
export const NETWORK_STRIP_HOME = [
  { src: '/assets/landing/network/strip-1.jpg', win: 345, w: 387, h: 483, x: -37, y: -9 },
  { src: '/assets/landing/network/strip-2.jpg', win: 346, w: 358, h: 444, x: -11, y: -14 },
  { src: '/assets/landing/network/strip-3.jpg', win: 345, w: 355, h: 438, x: -10, y: -9.5 },
  { src: '/assets/landing/network/strip-4.jpg', win: 346, w: 367, h: 459, x: -18, y: -10 },
  { src: '/assets/landing/network/strip-5.jpg', win: 346, w: 348.74, h: 448.3, x: -2.01, y: -14.24 },
];

const pc = (n) => ({ src: `/assets/landing/case/pavilion-club/stream-${n}.jpg` });
const ps = (n) => ({ src: `/assets/landing/case/pavilion-summit/stream-${n}.jpg` });
const wr = (n) => ({ src: `/assets/landing/case/wilderness-reserve/stream-${n}.jpg` });
const yx = (n) => ({ src: `/assets/landing/case/yoxman/stream-${n}.jpg` });
const fp = (name) => ({ src: `/assets/landing/founders-page/${name}` });
const sv = (name) => ({ src: `/assets/landing/services-stack/${name}.jpg` });
const st = (n) => ({ src: `/assets/landing/network/strip-${n}.jpg` });

/* Keys = the sector terms verbatim (data-network-term). */
export const NETWORK_STRIP_SETS = {
  'Talent': [fp('col-1.png'), pc(1), fp('col-3.png'), wr(2), fp('col-4.png')],
  'Hospitality': [wr(1), wr(3), pc(2), wr(4), pc(5)],
  'TV & Film': [sv('immerse'), fp('robbo-2.jpg'), st(3), fp('ashley-2.jpg'), sv('amplify')],
  'Music': [pc(3), st(1), yx(1), pc(6), sv('connect')],
  'Luxury': [wr(5), pc(7), wr(6), st(4), pc(8)],
  'Fashion': [st(2), fp('col-2.png'), pc(9), sv('immerse'), st(5)],
  'Food & Beverage': [yx(1), yx(2), pc(4), wr(3), st(2)],
  'Sports': [ps(1), ps(3), sv('connect'), ps(4), wr(2)],
  'Production': [ps(2), sv('amplify'), ps(5), st(3), pc(1)],
  'Founders': [fp('robbo-2.jpg'), fp('col-2.png'), fp('ashley-2.jpg'), fp('col-1.png'), fp('col-3.png')],
  'Cultural Operators': [pc(5), yx(2), st(5), wr(1), ps(3)],
};
