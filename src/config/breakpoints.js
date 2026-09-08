/**
 * THE SEAMS — the one source (mobile rebuild Part 1, 2026-09-08).
 *
 * Every media query in the stylesheets reads these through the generated
 * `src/styles/tokens/breakpoints.css` (@custom-media --phone / --tablet /
 * --mobile / --desktop — `node scripts/gen-breakpoints.mjs`), every script
 * through QUERIES below, and the two inline mirrors — the layout's boot
 * script and public/scale-shell.html — are stamped at build / generation
 * time from this file. No other file may carry these numbers: the literal
 * sweep (scripts/qa/literal-sweep.mjs) greps src/ for them and fails on any.
 *
 * Three zones, two seams:
 *   shell    1360 – 1727   the 1728 composition, transform-scaled
 *   tablet    768 – 1359   the tablet band (Part 4)
 *   phone       ≤ 767      the phone build, fluid 360 – 430
 *
 * 1360 is the type floor: the smallest interactive text is the 14px tier
 * and 14 × (w ÷ 1728) stays above 11px only from 1358 up. 768 is the
 * narrowest iPad in either orientation; no phone is wider than 430, so the
 * seam sits in a 338px gap no device occupies.
 */
export const DESIGN_WIDTH = 1728;
export const SHELL_MIN_WIDTH = 1360;
export const TABLET_MIN_WIDTH = 768;
export const PHONE_MAX_WIDTH = TABLET_MIN_WIDTH - 1;
export const MOBILE_MAX_WIDTH = SHELL_MIN_WIDTH - 1;
/** The phone frame's width and the fluid range it is designed across. */
export const PHONE_DESIGN_WIDTH = 402;
export const PHONE_FLUID_MIN = 360;
export const PHONE_FLUID_MAX = 430;

export const QUERIES = {
  phone: `(max-width: ${PHONE_MAX_WIDTH}px)`,
  tablet: `(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${MOBILE_MAX_WIDTH}px)`,
  mobile: `(max-width: ${MOBILE_MAX_WIDTH}px)`,
  desktop: `(min-width: ${SHELL_MIN_WIDTH}px)`,
};
