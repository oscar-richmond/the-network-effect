/**
 * THE PHONE WORDMARK'S SHRINK — 24 at rest → 18 scrolled (Oscar's
 * instruction against the 402 frame, 2026-09-09: frames 1:11 and 1:426
 * draw the wordmark 130 and 151 wide with no scrolled state; the shrink
 * is his ruling). Phone only (≤ 767): the band shows the desktop's bar.
 *
 * A SCRUBBED TRANSFORM, not a font-size scrub: scaling the font re-lays
 * the glyphs out on every frame (hinting, rounding and kerning shift at
 * each size), which reads as a vibration as the wordmark shrinks. The
 * inner link — its transform-origin at the wordmark's left edge on the
 * bar's centre line (shared-narrow.css) — scales from 1 to 18/24 over
 * --m-nav-shrink-scroll px of scroll, one GPU transform; at the two
 * rest states the real font-size is set and the scale returns to 1, so
 * the resting wordmark is always true type at 24 or 18, never a scaled
 * raster. The transform sits INSIDE the blend element (.home__logo
 * carries the difference), so the blend chain above it is untouched,
 * and the burger — centred by the bar's grid — never moves.
 *
 * Pure function of scrollY (ScrollTrigger scrub, no smoothing), so it
 * reverses exactly and survives a refresh. gsap.matchMedia adds it at
 * the phone query and reverts it (clearing the transform and the
 * font-size) above it and on the page transition.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TABLET_MIN_WIDTH } from './viewport.js';

gsap.registerPlugin(ScrollTrigger);

const PHONE_QUERY = `(max-width: ${TABLET_MIN_WIDTH - 1}px)`;

const tokenPx = (name, fallback) => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
    || parseFloat(getComputedStyle(document.body).getPropertyValue(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export function initNavShrink() {
  const mm = gsap.matchMedia();
  mm.add(PHONE_QUERY, () => {
    const logo = document.querySelector('.home__topbar--about .home__logo');
    if (!(logo instanceof HTMLElement)) return;
    const link = logo.querySelector('.home__logo-link');
    if (!(link instanceof HTMLElement)) return;
    const from = tokenPx('--type-nav-size', 24);
    const to = tokenPx('--type-nav-size-scrolled', 18);
    const over = tokenPx('--m-nav-shrink-scroll', 120);
    const ratio = to / from;
    /* p → the rest states are true type; between them the 24 face scales */
    const apply = (p) => {
      if (p >= 1) {
        logo.style.fontSize = `${to}px`;
        link.style.transform = '';
      } else {
        logo.style.fontSize = '';
        const s = 1 - (1 - ratio) * p;
        link.style.transform = p <= 0 ? '' : `scale(${s.toFixed(4)})`;
      }
    };
    apply(0);
    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => apply(state.p),
      scrollTrigger: {
        start: 0,
        end: over,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: (st) => apply(st.progress),
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      logo.style.fontSize = '';
      link.style.transform = '';
    };
  });
  return () => mm.revert();
}
