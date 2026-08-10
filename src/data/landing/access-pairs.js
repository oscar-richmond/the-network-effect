/**
 * WE CREATE ACCESS — the six word pairs (sentence case per the Figma;
 * pair 2 is deliberately the same word both sides — deck-sourced
 * brand-to-brand).
 *
 * Extracted from landing-access.js (mobile brief, 2026-08-10) so the
 * MOBILE composition can render all six pairs statically in
 * LandingAccess.astro while the desktop scrub keeps swapping one pair
 * at a time — ONE source for the content, two renderings of it.
 */
export const ACCESS_PAIRS = [
  ['Talent', 'Brands'],
  ['Brands', 'Brands'],
  ['Talent', 'Business'],
  ['Hospitality', 'Culture'],
  ['Media', 'Commerce'],
  ['Corporate', 'Community'],
];
