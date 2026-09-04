/**
 * /contact — "WE'VE WORKED WITH" LOGO ROW (R58, Oscar 2026-09-04) —
 * Figma TYVUPMVruMzSWOxL9tyIlM frame 1:90 "Contact", group 1:157
 * (extracted 2026-09-04, chrome offset −83).
 *
 * ═══ RIGHTS — THE SAME UNVERIFIED CLIENT LOGOS, NOW ON A SECOND PAGE ═══
 * These are the hero row's marks (hero-logos.js), placed here in the
 * frame's own order. Every standing flag carries over in full: the
 * nine named companies are REAL BRAND CLAIMS pending explicit founder
 * confirmation of each relationship, the SVGs are the frame's exports
 * (placeholders, not licensed files), and the wall is a LAUNCH-GATER.
 * This instance raises the exposure — the claim now appears on the
 * contact page as well as the first viewport.
 *
 * SEQUENCE (frame 1:159, from x −82 on the 192 pitch): the two
 * containers the metadata shows "empty" (1:160, 1:203) are the Bentley
 * and Samsung cells — their marks sit in the design-context asset list
 * as whole-cell SVGs, exactly as in the hero frame — so the visible
 * order is Bentley, adidas, Netflix, ITVX, Nike, Disney, Burberry, GQ,
 * Samsung: HERO_LOGO_BRANDS verbatim. The marks are #161616 (the
 * frame's fills), on rgba(255,255,255,.04) panels over a 12px backdrop
 * blur — the hero row's panel is rgba(22,22,22,.04): the inverse tint
 * for the red ground.
 *
 * MACHINERY: the hero row's — the network marquee keyframes on the
 * --marquee-set-w contract, the hero's 48s-per-set pace, drifting RIGHT
 * (so the cells travel towards, and vanish behind, the image on the
 * right). Speed, direction and phase are the tunables below.
 */
import {
  HERO_LOGO_BRANDS,
  HERO_LOGO_CELL_PITCH,
  HERO_LOGO_SET_W,
  HERO_LOGO_ROW_DUR_S,
} from './hero-logos.js';

export { HERO_LOGO_BRANDS as CT_LOGO_BRANDS, HERO_LOGO_CELL_PITCH as CT_LOGO_CELL_PITCH, HERO_LOGO_SET_W as CT_LOGO_SET_W };

/** Direction of travel: 'right' (the hero row's; towards the image). */
export const CT_LOGO_ROW_DIRECTION = 'right';
/** Seconds per set (one full 1728px cycle) — the hero row's 48. */
export const CT_LOGO_ROW_DUR_S = HERO_LOGO_ROW_DUR_S;
/** The frame's resting phase: the first cell's left edge at x −82. */
export const CT_LOGO_ROW_PHASE_PX = -82;
export const CT_LOGO_ROW_PHASE_DELAY_S =
  -((HERO_LOGO_SET_W + CT_LOGO_ROW_PHASE_PX) / HERO_LOGO_SET_W) * CT_LOGO_ROW_DUR_S; /* −45.72 */

/* R60 item 3 — THE VERTICAL RHYTHM'S CONSTANTS (Oscar, 2026-09-04).
   The page's rhythm is anchored to the VIEWPORT BOTTOM at the resting
   state, not to the frame's absolute y positions, so it holds at 1728,
   in the 1512 shell and at the shorter interiors. contact.js derives
   every position from these three numbers and from measured INK. */
/** The carousel's own height (frame 1:157). */
export const CT_ROW_H = 100;
/** The carousel's bottom edge above the viewport's bottom, at rest. */
export const CT_ROW_BOTTOM_GAP = 80;
/** The label's INK BOTTOM above the carousel's TOP edge. */
export const CT_LABEL_GAP = 48;

/** The band (frame 1:207): 0–1048 wide, the ground fading in over the
 *  first and last 10% (104.8px each). */
export const CT_LOGO_BAND_W = 1048;
export const CT_LOGO_BAND_FADE = 0.1;

/* Footer interaction (R58 item 8) — the trigger is the footer's MEASURED
   reveal: p = the uncovered height over the footer's 830. NOTE the range
   p actually travels: the footer is STICKY, so it is not revealed by the
   content moving past it — it is uncovered as the viewport reaches the
   document's end, and at rest a tall viewport already shows some of it
   (1117 - the section's 1037 = 80px, p 0.10). p therefore runs ~0.10 -> 1.0
   across the whole scroll, which is why the fade cannot start at p 0: the
   row would load at 0.8 opacity (measured, first cut). It runs over the
   reveal's LAST HALF instead - full while the page scrolls, clear by the
   time the footer has landed. */
export const CT_LOGOS_FADE_START = 0.55;
export const CT_LOGOS_FADE_END = 0.95;
