/**
 * THE NAV'S SIZE BEHAVIOUR (mobile rebuild Part 1 D1, 2026-09-08).
 *
 * On landing the wordmark is --type-nav-size (24); as the page scrolls it
 * shrinks to --type-nav-size-scrolled (18) over --m-nav-shrink-scroll px of
 * scroll (the one tunable, tokens/motion.css) — a scrubbed tween, so the
 * size is a pure function of scrollY and reverses exactly. It animates the
 * wordmark's own font-size: no transform, no ancestor touched, so the bar's
 * difference blend is never broken and the burger, centred in the bar's
 * fixed-height grid row, stays centred to the wordmark at every size.
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
    if (!link.querySelector('.cr-char') && link.textContent !== WORDMARK) link.textContent = WORDMARK;
    const from = tokenPx('--type-nav-size'), to = tokenPx('--type-nav-size-scrolled'), over = tokenPx('--m-nav-shrink-scroll');
    if (!(from > 0 && to > 0 && over > 0)) return;
    /* the idempotent re-entry reset: the rest state first, every time */
    ctx.add(() => {
      gsap.set(logo, { fontSize: from });
      gsap.to(logo, {
        fontSize: to,
        ease: 'none',
        scrollTrigger: { start: 0, end: over, scrub: true, invalidateOnRefresh: true },
      });
    });
  });
}
