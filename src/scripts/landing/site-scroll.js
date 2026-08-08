/**
 * SITE SCROLL — the house scroll feel, ONE source of truth
 * (Oscar's mandate 2026-08-08: the same lazy-load/resistance on
 * every page, uniform across the site, current and future).
 *
 * Lenis at lerp 0.065 (the about-scroll.js value the whole family
 * inherited), smoothWheel, ScrollTrigger wired to its scroll
 * events, one rAF loop. Every NATIVE-SCROLL page boots this and
 * nothing else: /landing (via landing-hero-scroll), the case-study
 * template, /services — and any page to come. Change the feel
 * HERE and every page follows; a page hand-rolling its own boot is
 * a bug by definition.
 *
 * THE ONE EXCEPTION: /work is a fixed-viewport page — the document
 * never scrolls, so document Lenis cannot drive it. Its virtual
 * scroller re-implements this exact feel (work-page.js,
 * SCROLL_SMOOTH_LERP = the same 0.065 against wheel deltas) — keep
 * that constant in step with SCROLL_LERP here.
 *
 * getLenisInstance(): the page's one smooth-scroll authority —
 * programmatic scrolls go THROUGH it (lenis.scrollTo), never
 * against it via scrollTop writes, which oscillate (the access
 * snap lesson). Null before boot / after cleanup / under RM.
 *
 * RM: callers gate — reduced-motion pages never boot Lenis (native
 * instant scroll is the accessible behaviour).
 */
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** The house smoothing — see about-scroll.js lineage. */
export const SCROLL_LERP = 0.065;

/** @type {Lenis | null} */
let lenis = null;

export const getLenisInstance = () => lenis;

/**
 * Boot the shared scroll. Returns the cleanup; register it with the
 * page's cleanup set. Idempotent per page life (a second call while
 * live returns a no-op cleanup so a double-boot can't double-raf).
 */
export function initSiteScroll() {
  if (lenis) return () => {};
  document.documentElement.classList.add('lenis');
  lenis = new Lenis({ lerp: SCROLL_LERP, smoothWheel: true });
  lenis.on('scroll', () => ScrollTrigger.update());
  let rafId = 0;
  const raf = (time) => {
    lenis?.raf(time);
    rafId = window.requestAnimationFrame(raf);
  };
  rafId = window.requestAnimationFrame(raf);
  return () => {
    window.cancelAnimationFrame(rafId);
    lenis?.destroy();
    lenis = null;
    document.documentElement.classList.remove('lenis');
  };
}
