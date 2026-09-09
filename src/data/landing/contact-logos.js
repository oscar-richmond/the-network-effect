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

/* ═══ THE PHONE'S ROW (Figma vq7hl5Q9TMPyD7ghw6iXTd frame 1:11 "Contact",
   group 1:44, extracted 2026-09-09) — the same nine marks and the same
   machinery (the doubled track, the network marquee keyframes on the
   --marquee-set-w contract), the frame's own geometry: 128 × 80 cells
   (the hero row's 160 × 100 at 0.8 — every mark measures exactly 0.8 of
   its hero size: adidas 68.15 × 34.08, Netflix 69.33 × 18.80, ITVX
   51.12, Nike 51.2 × 26.4, Disney 72.27 × 30.55, Burberry 79.91 × 12.89,
   GQ 47.2 × 29.6) on a 152 pitch (24 gap — the frame's, not 0.8 × 32),
   the band 86 tall with the 80 track 1 below its top (1:45 at y636
   under 1:94 at 635), bleeding both viewport edges. contact.js writes
   the set width / duration / phase onto the track on the phone (the
   desktop's inline values stand everywhere else). The frame's three
   "empty" containers (1:47, 1:77, 1:90) are the Bentley, Burberry and
   Samsung marks (rendered from the frame's own SVG exports to confirm),
   so the sequence IS the hero order — Bentley · adidas · Netflix · ITVX
   · Nike · Disney · Burberry · GQ · Samsung. RIGHTS: the same unverified
   client logos, on the phone's contact page as well now — every flag
   above carries. */
export const CT_LOGO_ROW_PHONE = {
  /** the cell (1:50 … 1:90) */
  CELL_W: 128,
  CELL_H: 80,
  /** the gap between cells (1:46's item gap) → the 152 pitch */
  GAP: 24,
  PITCH: 152,
  /** one set's width — the translate distance of the seamless wrap */
  SET_W: 152 * HERO_LOGO_BRANDS.length, /* 1368 */
  /** the band (1:94) and the track's offset inside it (1:45 − 1:94) */
  BAND_H: 86,
  TRACK_TOP: 1,
  /** the marks' scale against the hero assets (128 / 160) */
  MARK_ZOOM: 0.8,
  /** TUNABLE — direction of travel: 'right' (the hero row's) or 'left' */
  DIRECTION: 'right',
  /** TUNABLE — seconds per set (one full 1368px cycle): the hero row's
   *  48 → 28.5 px/s */
  DUR_S: HERO_LOGO_ROW_DUR_S,
  /** the frame's resting phase: the track (1:46) at x −146 — Bentley
   *  wholly off the left edge (−146 … −18), adidas at x6, Netflix 158,
   *  ITVX cut at 310. The roll starts here, on the row's arrival. */
  PHASE_PX: -146,
};
/** the phase as a negative animation delay (the hero row's construction) */
export const CT_LOGO_ROW_PHONE_DELAY_S =
  -((CT_LOGO_ROW_PHONE.SET_W + CT_LOGO_ROW_PHONE.PHASE_PX) / CT_LOGO_ROW_PHONE.SET_W) * CT_LOGO_ROW_PHONE.DUR_S; /* −42.88 */
/** the roll's speed, px/s — the veils' left ramp reads it */
export const CT_LOGO_ROW_PHONE_SPEED_PX_S = CT_LOGO_ROW_PHONE.SET_W / CT_LOGO_ROW_PHONE.DUR_S; /* 28.5 */

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
