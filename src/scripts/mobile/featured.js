/**
 * FEATURED WORK below the seam (mobile rebuild Part 3 §1, 2026-09-08 —
 * frame 1:280). The cards take the frame's sizes from their tokens (the
 * desktop's inline crops are written over with gsap.set, reverted with the
 * context); the indicator's thumb (the stage's pseudo-element) translates
 * with the rail's scroll fraction — a ScrollTrigger on the rail.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';

export function initMobileFeatured() {
  return mobileMatch((ctx) => {
    const stage = document.querySelector('[data-featured-stage]');
    const rail = document.querySelector('[data-featured-strip]');
    if (!(stage instanceof HTMLElement) || !(rail instanceof HTMLElement)) return;
    const cards = Array.from(rail.querySelectorAll('[data-featured-card]')).filter((c) => c instanceof HTMLElement);
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
