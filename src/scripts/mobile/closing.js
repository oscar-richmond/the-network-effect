/**
 * THE CLOSING below the seam (mobile rebuild Part 3 §3–4, 2026-09-08).
 *
 * MOST BRANDS: the card rail's edges (rail.js) and its indicator's thumb on
 * the rail's scroll; the stage pins with the indicator 80 above the
 * viewport's bottom and the page's scroll travels the rail (rail-pin.js,
 * Oscar 2026-09-08). The four lines arrive on the word-clip rise, the cards
 * fade-rise behind them; the closing statement's lines rise as they pin.
 *
 * THE CLOSING STATEMENT: the statement is sticky (closing.css); the grey →
 * red scrub is the ground layer's anchored fade ("pin": it starts as the
 * statement's natural top reaches its sticky top and runs
 * --m-closing-red-px — ground.js, which paints the section in step). Here:
 * THE NAV OVERRIDE — the desktop rule adapted to the phone's bar: solid ink
 * with the blend off (nav.css .is-over-red) from the fade's midpoint, off
 * again as the footer's top crosses the bar's midpoint — two ScrollTriggers
 * with enter / leave-back, so it reverses.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';
import { bindRailEdges } from './rail.js';
import { bindRailPin } from './rail-pin.js';
import { bindTextReveal, bindMediaReveal } from './reveal.js';

const tokenRaw = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function initMobileClosing() {
  return mobileMatch((ctx) => {
    /* the brands rail */
    const rail = document.querySelector('[data-brands-rail]');
    const stage = document.querySelector('[data-closing-stage]');
    const section = document.querySelector('[data-landing-closing]');
    if (rail instanceof HTMLElement && stage instanceof HTMLElement) {
      bindRailEdges(ctx, rail, { left: document.querySelector('[data-brands-edge="l"]'), right: document.querySelector('[data-brands-edge="r"]'), endPad: tokenPx('--m-inset') });
      for (const line of stage.querySelectorAll('.m-brands-hl__line')) bindTextReveal(ctx, line);
      bindMediaReveal(ctx, Array.from(rail.querySelectorAll('[data-brands-card]')));
      if (section instanceof HTMLElement) bindRailPin(ctx, { section, stage, rail, runway: section.querySelector('[data-closing-runway-m]'), tail: '--m-brands-tail' });
      const trackW = tokenPx('--m-indicator-w'), thumbW = tokenPx('--m-indicator-thumb');
      const max = () => Math.max(1, rail.scrollWidth - rail.clientWidth);
      gsap.set(stage, { '--m-ind-x': '0px' });
      ctx.add(() => {
        gsap.fromTo(stage, { '--m-ind-x': '0px' }, { '--m-ind-x': `${trackW - thumbW}px`, ease: 'none', immediateRender: false, scrollTrigger: { scroller: rail, horizontal: true, start: 0, end: max, scrub: true, invalidateOnRefresh: true } });
      });
    }
    /* the nav over the red */
    const st = document.querySelector('[data-closing-st-m]');
    const footer = document.querySelector('.landing-footer');
    const bar = document.querySelector('.home__topbar');
    if (!(st instanceof HTMLElement) || !(bar instanceof HTMLElement)) return;
    for (const line of st.querySelectorAll('.m-closing-st__line')) bindTextReveal(ctx, line);
    const redPx = tokenPx('--m-closing-red-px'), switchT = parseFloat(tokenRaw('--m-closing-nav-switch-t')) || 0.5, navH = tokenPx('--m-nav-h');
    const naturalTop = () => { const prev = st.style.position; st.style.position = 'static'; const t = st.getBoundingClientRect().top + window.scrollY; st.style.position = prev; return t; };
    const pinTop = () => parseFloat(getComputedStyle(st).top) || 0;
    const setSolid = (on) => bar.classList.toggle('is-over-red', on);
    setSolid(false);
    ctx.add(() => {
      ScrollTrigger.create({ start: () => naturalTop() - pinTop() + redPx * switchT, end: () => naturalTop() - pinTop() + redPx * switchT + 1, invalidateOnRefresh: true, onEnter: () => setSolid(true), onLeaveBack: () => setSolid(false) });
      if (footer instanceof HTMLElement) ScrollTrigger.create({ trigger: footer, start: () => `top ${navH / 2}px`, end: () => `top ${navH / 2 - 1}px`, invalidateOnRefresh: true, onEnter: () => setSolid(false), onLeaveBack: () => setSolid(true) });
    });
    if (import.meta.env.DEV) window.__mClosing = () => ({ natural: Math.round(naturalTop()), pin: Math.round(pinTop()), redPx, solid: bar.classList.contains('is-over-red') });
    return () => { setSolid(false); if (import.meta.env.DEV) delete window.__mClosing; };
  });
}
