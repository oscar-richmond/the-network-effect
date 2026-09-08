/**
 * FEATURED WORK below the seam (mobile rebuild Part 3 §1, 2026-09-08 —
 * frame 1:280). The cards take the frame's sizes from their tokens (the
 * desktop's inline crops are written over with gsap.set, reverted with the
 * context); the indicator's thumb (the stage's pseudo-element) translates
 * with the rail's scroll fraction — a ScrollTrigger on the rail.
 *
 * THE PIN (Oscar 2026-09-08): the stage fixes with the indicator 80 above
 * the viewport's bottom, the page's scroll travels the rail across, holds,
 * then continues (rail-pin.js). The title arrives on the word-clip rise,
 * the cards fade-rise behind it (reveal.js).
 *
 * THE FADE-TO-LIGHT (the desktop's R6 item 2, landing-featured.js): the
 * stage is transparent — the page's ground fades dark → light behind the
 * departing stage (ground.js, the Access section's window from the tail's
 * top) — and the LIGHT INK (the title, the card titles and descriptions,
 * the indicator) fades out in step with it, on the same window, so no
 * light text ever sits over a shifting ground. Scrubbed and reversible.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';
import { bindRailPin } from './rail-pin.js';
import { bindTextReveal, bindMediaReveal } from './reveal.js';
import { fadeWindow } from './ground.js';

export function initMobileFeatured() {
  return mobileMatch((ctx) => {
    const section = document.querySelector('[data-landing-featured]');
    const stage = document.querySelector('[data-featured-stage]');
    const rail = document.querySelector('[data-featured-strip]');
    if (!(section instanceof HTMLElement) || !(stage instanceof HTMLElement) || !(rail instanceof HTMLElement)) return;
    const cards = Array.from(rail.querySelectorAll('[data-featured-card]')).filter((c) => c instanceof HTMLElement);
    bindTextReveal(ctx, stage.querySelector('.landing-featured__header'));
    /* the drawn cards in their rendered order (featured.css orders them), so the stagger runs left → right */
    bindMediaReveal(ctx, cards.filter((c) => getComputedStyle(c).display !== 'none').sort((a, b) => (parseInt(getComputedStyle(a).order, 10) || 0) - (parseInt(getComputedStyle(b).order, 10) || 0)));
    bindRailPin(ctx, { section, stage, rail, runway: section.querySelector('[data-featured-runway-m]'), tail: '--m-fw-tail' });
    /* the light ink goes with the ground fade (the indicator through the stage's --m-ind-op) */
    const access = document.querySelector('[data-landing-access]');
    const ink = [stage.querySelector('.landing-featured__header'), ...stage.querySelectorAll('.landing-featured__titleblock, .landing-featured__desc')].filter((el) => el instanceof HTMLElement);
    if (access instanceof HTMLElement && 'groundFade' in access.dataset && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.add(() => {
        const tl = gsap.timeline({ scrollTrigger: { start: () => fadeWindow(access).start, end: () => fadeWindow(access).end, scrub: true, invalidateOnRefresh: true } });
        tl.fromTo(ink, { opacity: 1 }, { opacity: 0, ease: 'none', duration: 1, immediateRender: false }, 0);
        tl.fromTo(stage, { '--m-ind-op': 1 }, { '--m-ind-op': 0, ease: 'none', duration: 1, immediateRender: false }, 0);
        return () => { gsap.set(ink, { clearProps: 'opacity' }); gsap.set(stage, { clearProps: '--m-ind-op' }); };
      });
    }
    /* each card's size pair (--m-fw-card: "w h") into the two lengths its boxes read */
    const restore = [];
    for (const card of cards) {
      const pair = getComputedStyle(card).getPropertyValue('--m-fw-card').trim().split(/\s+/);
      if (pair.length === 2) gsap.set(card, { '--m-fw-w': pair[0], '--m-fw-h': pair[1] });
      const img = card.querySelector('img');
      if (img instanceof HTMLImageElement) {
        gsap.set(img, { width: '100%', height: '100%', left: 0, top: 0 });
        restore.push([img, img.getAttribute('src'), img.getAttribute('srcset'), img.getAttribute('sizes')]);
        /* the build-time srcset and sizes stay (the component's phone branch resolves the 600 variants under the
           density cap); the frame's own picture for this card where it differs from the landing's (the data's phoneImg, with the
           srcset the component built for it) */
        if (card.dataset.phoneImg) {
          if (card.dataset.phoneSrcset) img.setAttribute('srcset', card.dataset.phoneSrcset); else img.removeAttribute('srcset');
          img.src = card.dataset.phoneImg;
        }
      }
    }
    const trackW = tokenPx('--m-indicator-w'), thumbW = tokenPx('--m-indicator-thumb');
    const max = () => Math.max(1, rail.scrollWidth - rail.clientWidth);
    rail.scrollLeft = 0;
    gsap.set(stage, { '--m-ind-x': '0px' });
    ctx.add(() => {
      gsap.fromTo(stage, { '--m-ind-x': '0px' }, {
        '--m-ind-x': `${trackW - thumbW}px`, ease: 'none', immediateRender: false,
        scrollTrigger: { scroller: rail, horizontal: true, start: 0, end: max, scrub: true, invalidateOnRefresh: true },
      });
    });
    return () => { for (const [img, src, srcset, sizes] of restore) { if (src) img.setAttribute('src', src); if (srcset) img.setAttribute('srcset', srcset); if (sizes) img.setAttribute('sizes', sizes); } };
  });
}
