/**
 * THE MOBILE LAYER'S SCROLL CONTRACT (mobile rebuild Part 1 B4, 2026-09-08).
 *
 * Every scroll-driven behaviour below the seam is a pure function of scroll
 * position: a ScrollTrigger (scrub, no tweened state) created inside a
 * gsap.matchMedia() block keyed on the one seam source, so it exists only at
 * its breakpoint and reverts itself — every property it set is restored by
 * the context when the query stops matching — and is killed on the Astro
 * page transition through the same cleanup hook every driver uses.
 *
 *   const off = mobileMatch((ctx) => {
 *     ScrollTrigger.create({ … });            // owned by ctx, reverted with it
 *     return () => { … };                     // optional extra cleanup
 *   });
 *
 * RE-ENTRY: a block must be idempotent — it runs again on every crossing
 * back into the query and after every page transition. Reset every property
 * the block animates at its start (the "idempotent re-entry reset"), never
 * rely on the previous run's end state. No IntersectionObserver for
 * anything that must reverse.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { QUERIES } from '../../config/breakpoints.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * @param {(ctx: gsap.Context) => (void | (() => void))} build  runs when the mobile query matches
 * @param {{ query?: string }} [opts]  a different QUERIES entry (the phone alone, the band alone)
 * @returns {() => void} cleanup — reverts the context; also bound to astro:before-swap
 */
export function mobileMatch(build, opts = {}) {
  const mm = gsap.matchMedia();
  mm.add(opts.query || QUERIES.mobile, (ctx) => {
    const extra = build(ctx);
    return () => { if (typeof extra === 'function') extra(); };
  });
  const off = () => mm.revert();
  document.addEventListener('astro:before-swap', off, { once: true });
  return () => { document.removeEventListener('astro:before-swap', off); off(); };
}

/** Read a px token from :root (the mobile layer's geometry lives in the tokens, never in scripts). */
export const tokenPx = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
