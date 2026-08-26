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

/* The resting strip — the shipped five (exact Figma crops). */
export const NETWORK_STRIP_DEFAULT = [
  { src: '/assets/landing/network/strip-1.jpg', win: 345, w: 351.73, h: 439.92, x: -1.28, y: -1.54 },
  { src: '/assets/landing/network/strip-2.jpg', win: 346, w: 346, h: 429, x: 0, y: -63 },
  { src: '/assets/landing/network/strip-3.jpg', win: 345, w: 355, h: 438, x: -10, y: -69 },
  { src: '/assets/landing/network/strip-4.jpg', win: 346, w: 367, h: 459, x: -18, y: -69 },
  { src: '/assets/landing/network/strip-5.jpg', win: 346, w: 349.01, h: 448.3, x: -2.01, y: -104.3 },
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
