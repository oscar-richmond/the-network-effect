/**
 * THE NAV'S SIZE BEHAVIOUR (mobile rebuild Part 1 D1, 2026-09-08; the
 * transform form, Oscar 2026-09-08).
 *
 * On landing the wordmark is --type-nav-size (24); as the page scrolls it
 * shrinks to --type-nav-size-scrolled (18) over --m-nav-shrink-scroll px of
 * scroll (the one tunable, tokens/motion.css) — a scrubbed tween, so the
 * size is a pure function of scrollY and reverses exactly.
 *
 * THE SHRINK IS A TRANSFORM, not a font-size scrub: scaling the font re-laid
 * the glyphs out on every frame (hinting, rounding and kerning shift at
 * each size), which read as a vibration as the wordmark shrank. The inner
 * link — a composited layer, transform-origin at its left edge — scales
 * from 1 to 18/24 instead, one smooth GPU transform; at the two rest states
 * the real font-size is set and the scale returns to 1, so the resting
 * wordmark is always true type at 24 or 18, never a scaled raster. The
 * transform sits INSIDE the blend element (the .home__logo carries the
 * difference), so the blend chain above it is untouched.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';

/* the wordmark (1:420). The served text is the spaced no-JS form on every
   width; the desktop's ensureLogoChars swaps it before its char wrap and
   this does the same below the seam — so the SSR DOM is one string for both. */
const WORDMARK = 'TheNetworkEffect';

export function initMobileNav() {
  return mobileMatch((ctx) => {
    const logo = document.querySelector('.home__topbar--about .home__logo');
    if (!(logo instanceof HTMLElement)) return;
    const link = logo.querySelector('.home__logo-link') ?? logo;
    if (!(link instanceof HTMLElement)) return;
    if (!link.querySelector('.cr-char') && link.textContent !== WORDMARK) link.textContent = WORDMARK;
    const from = tokenPx('--type-nav-size'), to = tokenPx('--type-nav-size-scrolled'), over = tokenPx('--m-nav-shrink-scroll');
    if (!(from > 0 && to > 0 && over > 0)) return;
    const ratio = to / from;
    /* p → the rest states are true type; between them the 24 face scales */
    const apply = (p) => {
      if (p >= 1) { gsap.set(logo, { fontSize: to }); gsap.set(link, { scaleX: 1, scaleY: 1 }); }
      else { gsap.set(logo, { fontSize: from }); const s = 1 - (1 - ratio) * p; gsap.set(link, { scaleX: s, scaleY: s }); }
    };
    /* the idempotent re-entry reset: the rest state first, every time */
    ctx.add(() => {
      apply(0);
      const state = { p: 0 };
      gsap.to(state, {
        p: 1,
        ease: 'none',
        onUpdate: () => apply(state.p),
        scrollTrigger: { start: 0, end: over, scrub: true, invalidateOnRefresh: true, onRefresh: (st) => apply(st.progress) },
      });
    });
    return () => { gsap.set(link, { clearProps: 'transform' }); };
  });
}
