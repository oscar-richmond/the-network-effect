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

/**
 * Read a px token from :root (the mobile layer's geometry lives in the tokens, never in scripts).
 * A plain length, number or percentage parses directly; an EXPRESSION (calc(), min(), max(), clamp(),
 * viewport units — an unregistered custom property's computed value is its text, unevaluated) is
 * resolved by the engine through a probe element's margin, which takes negatives and resolves to px.
 */
let probe = null;
export const tokenPx = (name) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return 0;
  if (/^-?(\d+\.?\d*|\.\d+)(px|%)?$/.test(raw)) return parseFloat(raw) || 0;
  if (!probe || !probe.isConnected) {
    probe = document.createElement('div');
    probe.setAttribute('data-m-token-probe', '');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;';
    document.body.appendChild(probe);
  }
  probe.style.setProperty('margin-left', `var(${name})`);
  const px = parseFloat(getComputedStyle(probe).marginLeft);
  return Number.isFinite(px) ? px : 0;
};
