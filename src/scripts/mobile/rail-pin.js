/**
 * THE PINNED RAIL (Oscar 2026-09-08) — Featured Work and MOST BRANDS: the
 * stage fixes with its indicator --m-rail-pin-bottom above the viewport's
 * bottom, the page's scroll then travels the cards across, holds
 * --m-rail-hold, and the page continues.
 *
 * The stage is made sticky in its section at --m-rail-pin-top (written on
 * the section from its own geometry: the viewport less the pin-bottom less
 * the stage's height above its indicator's foot, floored at
 * --m-rail-pin-floor so the title never goes under the bar). A runway
 * element after the stage (the section's content, so the sticky is
 * constrained by it) is the rail's travel plus the hold: the stage holds
 * through it and lets go as it ends. Over the travel the rail's scrollLeft
 * is the page scroll past the pin, 1:1 — a scrubbed ScrollTrigger, so the
 * rail's position is a pure function of the page's and the existing
 * rail-scroller triggers (edges, indicator) read it as their own scroll.
 * The rail's snap is off while it is driven (a mandatory snap would re-snap
 * behind the write); a finger on the rail still scrolls it directly.
 * Reduced motion: no pin — the rail is a plain touch rail in flow.
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tokenPx } from './match.js';

/* an element's document top, sticky measured off */
const naturalTop = (el) => { const prev = el.style.position; el.style.position = 'static'; const t = el.getBoundingClientRect().top + window.scrollY; el.style.position = prev; return t; };

/**
 * @param {gsap.Context} ctx
 * @param {{ section: HTMLElement, stage: HTMLElement, rail: HTMLElement, runway: HTMLElement, tail: string, endPad?: number }} o
 *   tail: the token of the stage's padding below its indicator's foot; endPad: trailing inset after the last card (not travel)
 */
export function bindRailPin(ctx, { section, stage, rail, runway, tail, endPad = 0 }) {
  if (![section, stage, rail, runway].every((el) => el instanceof HTMLElement)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pinBottom = tokenPx('--m-rail-pin-bottom'), hold = tokenPx('--m-rail-hold'), floor = tokenPx('--m-rail-pin-floor');
  const travel = () => Math.max(0, rail.scrollWidth - rail.clientWidth - endPad);
  const measure = () => {
    const tailPx = tokenPx(tail);
    const pinTop = Math.max(floor, window.innerHeight - pinBottom - (stage.offsetHeight - tailPx));
    section.style.setProperty('--m-rail-pin-top', `${Math.round(pinTop)}px`);
    section.style.setProperty('--m-rail-runway', `${Math.round(travel() + hold)}px`);
  };
  /* the idempotent re-entry reset */
  rail.scrollLeft = 0;
  stage.classList.add('is-rail-pinned'); rail.classList.add('is-rail-driven');
  measure();
  const pinScroll = () => naturalTop(stage) - (parseFloat(getComputedStyle(stage).top) || 0);
  ctx.add(() => {
    /* the geometry is re-measured at the head of every refresh, before ANY trigger reads the layout (the runway moves everything below) */
    ScrollTrigger.addEventListener('refreshInit', measure);
    ScrollTrigger.create({
      start: pinScroll, end: () => pinScroll() + travel(), scrub: true, invalidateOnRefresh: true,
      onUpdate: (st) => { rail.scrollLeft = st.progress * travel(); },
    });
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      stage.classList.remove('is-rail-pinned'); rail.classList.remove('is-rail-driven');
      section.style.removeProperty('--m-rail-pin-top'); section.style.removeProperty('--m-rail-runway');
    };
  });
  if (import.meta.env.DEV) stage.__mRailPin = () => ({ pinTop: section.style.getPropertyValue('--m-rail-pin-top'), runway: section.style.getPropertyValue('--m-rail-runway'), travel: travel(), pinScroll: Math.round(pinScroll()), scrollLeft: rail.scrollLeft });
}
