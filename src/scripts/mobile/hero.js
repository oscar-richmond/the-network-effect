/**
 * THE HERO'S RISE (mobile rebuild Part 2, 2026-09-08).
 *
 * The copy and the logo row are sticky at their frame positions (hero.css);
 * the image is in flow and scrolls 1:1, so it rises up and OVER them. Each
 * block dissolves in the hero vocabulary — opacity and a blur, never a bare
 * clip — over --m-hero-text-out-px of scroll, ENDING as the image's top
 * reaches the block's top (the block is then fully covered). The windows are
 * absolute scroll positions measured from the image's rest top at refresh,
 * so they are a pure function of scroll and reverse exactly.
 *
 * The blocks: the headline (180), the intro (399), the logo row (585). The
 * logo row sits 48 below the image, so its window is clipped at scroll 0.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';

export function initMobileHero() {
  return mobileMatch((ctx) => {
    const hero = document.querySelector('[data-landing-hero]');
    const img = document.querySelector('[data-hero-image-m]');
    if (!(hero instanceof HTMLElement) || !(img instanceof HTMLElement)) return;
    const blocks = [
      hero.querySelector('[data-landing-hero-headline]'),
      hero.querySelector('[data-landing-hero-intro]'),
      hero.querySelector('[data-landing-hero-logos]'),
    ].filter((el) => el instanceof HTMLElement);
    /* 1:270 is one paragraph: the desktop's authored <br> (a hard line separator for its reveal wrap) becomes a space here, and comes back on revert */
    const brs = Array.from(hero.querySelectorAll('[data-landing-hero-intro-text] br'));
    const spaces = brs.map((br) => { const t = document.createTextNode(' '); br.replaceWith(t); return [br, t]; });
    const outPx = tokenPx('--m-hero-text-out-px');
    const blur = tokenPx('--m-hero-out-blur');
    /* the idempotent re-entry reset */
    gsap.set(blocks, { opacity: 1, filter: 'blur(0px)' });
    const imgTop = () => img.getBoundingClientRect().top + window.scrollY;
    const stickyTop = (el) => parseFloat(getComputedStyle(el).top) || 0;
    ctx.add(() => {
      for (const block of blocks) {
        const end = () => imgTop() - stickyTop(block);        /* the image's top reaches the block's top */
        const start = () => Math.max(0, end() - outPx);
        gsap.fromTo(block, { opacity: 1, filter: 'blur(0px)' }, {
          opacity: 0, filter: `blur(${blur}px)`, ease: 'none', immediateRender: false,
          scrollTrigger: { start, end, scrub: true, invalidateOnRefresh: true },
        });
      }
    });
    return () => { for (const [br, t] of spaces) t.replaceWith(br); };
  });
}
