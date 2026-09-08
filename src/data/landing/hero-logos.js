/**
 * HERO LOGO ROW (/landing desktop) — Figma L3MtStuayLmiag1JOIzDfJ
 * frame 0:91 "Landing Page - Hero", row 0:621 (extracted 2026-09-02,
 * chrome offset −83: the file's Header frame 0:678 measures 83 tall).
 *
 * ═══ PENDING FOUNDER SIGN-OFF — REAL BRAND CLAIMS, NOW ON THE FIRST
 * VIEWPORT OF THE SITE ═══
 * The same nine named companies as the (retired-from-desktop) Our
 * Network carousel: presenting them claims real client relationships.
 * The standing flags carry over in full and are ELEVATED by this
 * placement — the logo wall is a LAUNCH-GATER: explicit founder
 * confirmation of every relationship is required before launch, and
 * the marks must be replaced with properly licensed/sourced files —
 * these SVGs are the frame's own exports, placeholder only.
 *
 * DATA: the same logo set and data source as the network carousel
 * (network-brands.js: sizes verbatim), re-exported for the LIGHT
 * ground — the frame draws the marks in #161616 (white knockouts
 * inside the Nike / ITVX / Disney marks), the inverse of the network
 * row's white marks. Bentley/Samsung ship as 160×100-canvas cell
 * exports with the frame's panel rect + blur hack STRIPPED (Oscar's
 * network fix, applied again): the live CSS cell carries the panel
 * and backdrop blur, so no cell paints its own.
 *
 * ORDER = the frame's visible sequence (Bentley, adidas, Netflix,
 * ITVX, Nike, Disney, Burberry, GQ, Samsung). FLAG: the frame's
 * tenth cell (x1728) repeats adidas — a continuity illustration of
 * the overflow, not a tenth brand (a nine-cycle would show Bentley
 * there). The metadata shows three "empty" containers (0:624, 0:654,
 * 0:667): they are Bentley, Burberry and Samsung, whose marks sit in
 * the design-context asset list rather than as named child frames.
 */
import { asset } from '../../utils/asset.js';

/** @typedef {{ name: string, src: string, w: number, h: number }} HeroLogoBrand */

/** @type {HeroLogoBrand[]} */
export const HERO_LOGO_BRANDS = [
  { name: 'Bentley', src: asset('/assets/landing/hero/logos/cell-bentley.svg'), w: 160, h: 100 },
  { name: 'adidas', src: asset('/assets/landing/hero/logos/logo-adidas.svg'), w: 85.19, h: 42.6 },
  { name: 'Netflix', src: asset('/assets/landing/hero/logos/logo-netflix.svg'), w: 86.67, h: 23.5 },
  { name: 'ITVX', src: asset('/assets/landing/hero/logos/logo-itvx.svg'), w: 63.9, h: 63.9 },
  { name: 'Nike', src: asset('/assets/landing/hero/logos/logo-nike.svg'), w: 64, h: 33 },
  { name: 'Disney', src: asset('/assets/landing/hero/logos/logo-disney.svg'), w: 90.34, h: 38.19 },
  { name: 'Burberry', src: asset('/assets/landing/hero/logos/logo-burberry.svg'), w: 99.89, h: 16.11 },
  { name: 'GQ', src: asset('/assets/landing/hero/logos/logo-gq.svg'), w: 59, h: 37 },
  { name: 'Samsung', src: asset('/assets/landing/hero/logos/cell-samsung.svg'), w: 160, h: 100 },
];

/* ── THE ROW'S GRAMMAR — the retired Our Network TOP row's constants,
   named (landing.css --network-marquee-top-dur 48s; the top row
   drifted RIGHT; 160×100 cells on a 192 pitch = 32 gap). ─────────── */
/** Cell width / height / pitch (frame 0:621: 160 × 100, 192 pitch). */
export const HERO_LOGO_CELL_W = 160;
export const HERO_LOGO_CELL_H = 100;
export const HERO_LOGO_CELL_PITCH = 192;
/** One set's width: the translate distance of the seamless wrap. */
export const HERO_LOGO_SET_W = HERO_LOGO_CELL_PITCH * HERO_LOGO_BRANDS.length; /* 1728 */
/** Direction + speed: the retired top row (drifts RIGHT, 48s per set). */
export const HERO_LOGO_ROW_DIRECTION = 'right';
export const HERO_LOGO_ROW_DUR_S = 48;
/** The frame's resting phase: the first cell's left edge at x −68 (0:621
 *  at frame x −68). Expressed as a negative animation delay so the row
 *  loads on the frame's phase and rolls on from there. */
export const HERO_LOGO_ROW_PHASE_PX = -68;
/* THE PHONE'S ROW (mobile rebuild Part 2, frame GvANAN3kJOPV8AKOi3O9FF 1:213):
   102.4×64 cells on a 110.4 pitch — the desktop's cell at 0.64 with the
   frame's 8 gap. Same set, same order, same direction and duration; the
   set width is the wrap distance the phone's keyframe reads. */
export const HERO_LOGO_CELL_PITCH_M = 110.4;
export const HERO_LOGO_SET_W_M = HERO_LOGO_CELL_PITCH_M * HERO_LOGO_BRANDS.length; /* 993.6 */
export const HERO_LOGO_ROW_PHASE_DELAY_S =
  -((HERO_LOGO_SET_W + HERO_LOGO_ROW_PHASE_PX) / HERO_LOGO_SET_W) * HERO_LOGO_ROW_DUR_S; /* −46.11 */
