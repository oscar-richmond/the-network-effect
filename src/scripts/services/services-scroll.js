import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * /services page plumbing — Lenis smooth scrolling wired to
 * ScrollTrigger, extracted from about-scroll.js's initSmoothScrolling
 * pattern (that module owns /about-3's instance; pages own their own).
 * The wheel module (partners-scroll.js) never touches the instance —
 * its settle snap deliberately retargets content, never the scroll
 * position (fighting Lenis is the founders-era prohibition).
 */

/** Same feel constant as /about-3 (about-scroll.js SCROLL_LERP). */
const SCROLL_LERP = 0.065;

/** @type {Lenis | null} */
let lenis = null;

/**
 * Boot smooth scrolling on /services only. Under reduced motion the
 * page stays on native scrolling (the wheel module doesn't boot either
 * — the CSS base rules render the static column).
 * @returns {() => void} cleanup
 */
export function initServicesScroll() {
  if (!document.body.classList.contains('services-page')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  document.documentElement.classList.add('lenis');

  lenis = new Lenis({
    lerp: SCROLL_LERP,
    smoothWheel: true,
  });

  lenis.on('scroll', () => ScrollTrigger.update());

  let rafId = 0;
  const scrollFn = (time) => {
    lenis?.raf(time);
    rafId = requestAnimationFrame(scrollFn);
  };
  rafId = requestAnimationFrame(scrollFn);

  return () => {
    cancelAnimationFrame(rafId);
    lenis?.destroy();
    lenis = null;
    document.documentElement.classList.remove('lenis');
  };
}
