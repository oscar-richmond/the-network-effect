/**
 * "Our Network" brand carousel — logo set and cell geometry, from
 * Figma n2cY4c7GnsR5MBx1PJoC97 node 3:68.
 *
 * ═══ PENDING FOUNDER SIGN-OFF — REAL BRAND CLAIMS ═══
 * These are named real companies (same standing as the client-wheel
 * list): presenting them here claims real client relationships.
 * Explicit founder confirmation is required BEFORE launch, and the
 * logo files must be replaced with properly-licensed/sourced marks —
 * the current SVGs are Figma exports, placeholder only.
 *
 * Bentley/Samsung ship as 160x100-canvas logo exports (their panel
 * and blur-hack markup stripped from the SVGs, Oscar's fix — every
 * cell now uses the live CSS panel + backdrop blur); the rest are
 * bare marks centred at their authored sizes.
 */
import { asset } from '../../utils/asset.js';

/** @typedef {{ name: string, src: string, w?: number, h?: number, cell?: boolean }} NetworkBrand */

/** @type {NetworkBrand[]} */
export const NETWORK_BRANDS = [
  { name: 'Bentley', src: asset('/assets/landing/network/cell-bentley.svg'), w: 160, h: 100 },
  { name: 'Netflix', src: asset('/assets/landing/network/logo-netflix.svg'), w: 86.67, h: 23.5 },
  { name: 'ITVX', src: asset('/assets/landing/network/logo-itvx.svg'), w: 63.9, h: 63.9 },
  { name: 'Nike', src: asset('/assets/landing/network/logo-nike.svg'), w: 64, h: 33 },
  { name: 'Disney', src: asset('/assets/landing/network/logo-disney.svg'), w: 90.34, h: 38.19 },
  { name: 'Burberry', src: asset('/assets/landing/network/logo-burberry.svg'), w: 99.89, h: 16.11 },
  { name: 'GQ', src: asset('/assets/landing/network/logo-gq.svg'), w: 59, h: 37 },
  { name: 'Samsung', src: asset('/assets/landing/network/cell-samsung.svg'), w: 160, h: 100 },
  { name: 'adidas', src: asset('/assets/landing/network/logo-adidas.svg'), w: 85.19, h: 42.6 },
];

/**
 * The eleven sector terms, exactly as rendered (keys below must match
 * these strings character-for-character).
 */
export const NETWORK_INDUSTRIES = [
  'Talent', 'Hospitality', 'TV & Film', 'Music',
  'Luxury', 'Fashion', 'Food & Beverage', 'Sports',
  'Production', 'Founders', 'Cultural Operators',
];

/**
 * ═══ THE SHAPE OSCAR POPULATES LATER ═══
 * Per-industry logo sets for the hover swap. `all` is the resting
 * state (the current mixed set). Every industry key maps to an array
 * of NetworkBrand entries ({ name, src, w, h }) — any length: the
 * marquee re-derives its wrap geometry per set (cell pitch 192px, so
 * a set's width is 192 x count, duplicated enough times to cover any
 * viewport). PLACEHOLDER: every industry currently points at the
 * full set so the machinery is proven; the real content drop is a
 * data-only edit here.
 */
export const NETWORK_BRAND_SETS = {
  all: NETWORK_BRANDS,
  ...Object.fromEntries(NETWORK_INDUSTRIES.map((k) => [k, NETWORK_BRANDS])),
};
