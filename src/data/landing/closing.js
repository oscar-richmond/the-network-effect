/**
 * MOST BRANDS STRUGGLE TO ACCESS CULTURE AUTHENTICALLY. — the tiles and
 * the four keywords (lifted out of LandingClosing.astro in Part 3 of the
 * mobile rebuild, 2026-09-08, so the phone's card rail renders from the
 * same source; the desktop's rendering is unchanged).
 *
 * TILES: the desktop's exact crops (window-relative image box); the phone
 * cover-fits the same images into its 280 squares (frame 1:343).
 * KEYWORDS: the desktop's column geometry (x, w, lw) and copy; the phone
 * reads word + line only. The /0N indexes no longer exist in the design.
 * PENDING SIGN-OFF: the four photographs are placeholders until approved.
 */
export const CLOSING_TILES = [
  { src: '/assets/landing/closing/tile-1.jpg', w: 417, h: 519, x: -3, y: -42 },
  { src: '/assets/landing/closing/tile-2.jpg', w: 421, h: 636, x: -5, y: -69 },
  { src: '/assets/landing/closing/tile-3.jpg', w: 422, h: 528, x: -5, y: -25 },
  { src: '/assets/landing/closing/tile-4.jpg', w: 425, h: 597, x: -6, y: -25 },
];

export const CLOSING_KEYWORDS = [
  { x: 24, w: 414, lw: 323, word: 'Trust', index: '/01', line: 'Audiences trust people more than institutions.' },
  { x: 446, w: 414, lw: 323, word: 'Behaviour', index: '/02', line: 'Communities shape behaviour.' },
  { x: 868, w: 414, lw: 406, word: 'Influence', index: '/03', line: 'Traditional campaigns create awareness, relationships create influence.' },
  { x: 1290, w: 414, lw: 406, word: 'Credibility', index: '/04', line: 'Brands need access, credibility and participation.' },
];
