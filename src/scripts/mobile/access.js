/**
 * WE CREATE ACCESS below the seam (mobile rebuild Part 3 §2, 2026-09-08;
 * the pin, the held statement and the exit, Oscar 2026-09-08) — the
 * desktop's mechanic (landing-access.js) at the phone's geometry: two tile
 * rows travel in OPPOSITE directions on one scroll progress, the top row
 * left and the bottom right, so the k-th pair lands together after k steps;
 * the landed cells sit ±60 from the viewport's centre as the frame draws
 * them (1:89 at x81, 1:75 at x−39), their neighbours veiled (60% + the
 * frost, blurred), the pair's words on the landed cells (30 Serrif Regular,
 * difference white).
 *
 * THE PIN: the rows fix with their foot --m-access-pin-bottom above the
 * viewport's bottom (access.css, --m-access-pin-top); the statement above
 * them fixes at the same scroll, 80 above the rows (its height is measured
 * here into --m-access-st-h for its sticky top), and both hold through the
 * runway — five steps of --m-access-step-px, then --m-access-exit-px of
 * exit — and release with the stage. The scroll past the pin, in steps, is
 * the one progress: u pairs travelled; pair k lands at u = k.
 *
 * THE EXIT (the desktop's collapse, ACCESS_COLLAPSE_TRAVEL_PX): past the
 * fifth landing the rows keep travelling while c (0 → 1 over the exit)
 * shrinks them about the block's top centre, lifts them and fades them
 * out; the words are gone by --m-access-word-fade-t of it; the statement
 * blurs --m-access-exit-blur and fades with it. Every write is a pure
 * function of scroll, measured from the rows' natural top with sticky off,
 * so it reverses.
 *
 * THE ENTRANCES: the label and the lines arrive on the word-clip rise, the
 * tiles fade-rise behind them (reveal.js).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';
import { bindTextReveal, bindMediaReveal } from './reveal.js';

const tokenNum = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

export function initMobileAccess() {
  return mobileMatch((ctx) => {
    const section = document.querySelector('[data-landing-access]');
    const rows = { top: document.querySelector('[data-access-row="top"]'), bottom: document.querySelector('[data-access-row="bottom"]') };
    const wraps = { top: section?.querySelector('.landing-access__rowwrap--top'), bottom: section?.querySelector('.landing-access__rowwrap--bottom') };
    const words = section?.querySelector('.landing-access__words');
    const statement = section?.querySelector('[data-access-st-m]');
    if (!(section instanceof HTMLElement) || !(rows.top instanceof HTMLElement) || !(rows.bottom instanceof HTMLElement) || !(wraps.top instanceof HTMLElement) || !(wraps.bottom instanceof HTMLElement)) return;
    const cells = { top: Array.from(rows.top.children), bottom: Array.from(rows.bottom.children) };
    const slots = Array.from(section.querySelectorAll('[data-access-wordslot]')).filter((s) => s instanceof HTMLElement);
    const tileW = tokenPx('--m-access-tile-w'), pitch = tokenPx('--m-access-tile-pitch'), stepPx = tokenPx('--m-access-step-px');
    const runway = tokenPx('--m-access-runway'), exitPx = tokenPx('--m-access-exit-px'), steps = Math.round((runway - exitPx) / stepPx);
    const landOff = tokenPx('--m-access-land-offset');
    const wordW = tokenPx('--m-access-word-w'), wordFull = tokenPx('--m-access-word-full'), wordWindow = tokenPx('--m-access-word-window'), veilDead = tokenPx('--m-access-veil-dead');
    const exitBlur = tokenPx('--m-access-exit-blur'), wordFadeT = tokenNum('--m-access-word-fade-t') || 0.15;
    const exitScale = tokenNum('--m-access-exit-scale') || 0.6, exitLift = tokenPx('--m-access-exit-lift');
    const vw = () => window.innerWidth;
    /* the landed centres and the rows' rest x (their pair-0 cells: the top row's index 1, the bottom row's index 5) */
    const primeIdx = { top: cells.top.findIndex((c) => !c.hasAttribute('data-pad')), bottom: cells.bottom.length - 1 - [...cells.bottom].reverse().findIndex((c) => !c.hasAttribute('data-pad')) };
    const landed = { top: () => vw() / 2 + landOff, bottom: () => vw() / 2 - landOff };
    const restX = { top: () => landed.top() - tileW / 2 - primeIdx.top * pitch, bottom: () => landed.bottom() - tileW / 2 - primeIdx.bottom * pitch };
    const naturalTop = () => { const prev = wraps.top.style.position; wraps.top.style.position = 'static'; const t = wraps.top.getBoundingClientRect().top + window.scrollY; wraps.top.style.position = prev; return t; };
    const pinTop = () => parseFloat(getComputedStyle(wraps.top).top) || 0;

    /* the entrances */
    if (statement instanceof HTMLElement) {
      bindTextReveal(ctx, statement.querySelector('.m-access-st__label'));
      for (const line of statement.querySelectorAll('.m-access-st__line')) bindTextReveal(ctx, line);
    }
    bindMediaReveal(ctx, [...cells.top, ...cells.bottom].filter((c) => c instanceof HTMLElement && !c.hasAttribute('data-pad')));

    /* the statement's measured height, for its sticky top (its box is padded down to the rows' foot in access.css) */
    const measure = () => {
      if (!(statement instanceof HTMLElement)) return;
      const lines = statement.querySelector('.m-access-st__lines');
      /* the content's height (label top → lines bottom) — the box itself is taller by design */
      const h = lines instanceof HTMLElement ? lines.getBoundingClientRect().bottom - statement.getBoundingClientRect().top : statement.offsetHeight;
      section.style.setProperty('--m-access-st-h', `${Math.ceil(h)}px`);
    };
    measure();

    /* the idempotent re-entry reset: pair 0 landed, words on, neighbours veiled, nothing exiting */
    const apply = (scrollPast) => {
      const u = Math.max(0, scrollPast / stepPx);                                  /* pairs travelled */
      const c = Math.min(1, Math.max(0, (u - steps) * stepPx / exitPx));           /* the exit */
      const shiftTop = -u * pitch, shiftBottom = u * pitch;
      gsap.set(rows.top, { x: restX.top() + shiftTop });
      gsap.set(rows.bottom, { x: restX.bottom() + shiftBottom });
      for (const row of ['top', 'bottom']) {
        const base = restX[row]() + (row === 'top' ? shiftTop : shiftBottom);
        cells[row].forEach((cell, i) => {
          const centre = base + i * pitch + tileW / 2;
          const dist = Math.abs(centre - landed[row]());
          const veil = cell.hasAttribute('data-pad') ? 1 : Math.min(Math.max((dist - veilDead) / (pitch - veilDead), 0), 1);
          cell.style.setProperty('--m-veil', veil.toFixed(3));
        });
      }
      const wordsOn = 1 - Math.min(1, c / wordFadeT);
      for (const slot of slots) {
        const row = slot.dataset.row === 'bottom' ? 'bottom' : 'top';
        const k = Number(slot.dataset.pair) || 0;
        const idx = row === 'top' ? primeIdx.top + k : primeIdx.bottom - k;
        const centre = restX[row]() + (row === 'top' ? shiftTop : shiftBottom) + idx * pitch + tileW / 2;
        const dist = Math.abs(centre - landed[row]());
        const near = dist <= wordFull ? 1 : dist >= wordWindow ? 0 : 1 - (dist - wordFull) / (wordWindow - wordFull);
        slot.style.left = `${(centre - wordW / 2).toFixed(1)}px`;
        slot.style.opacity = (near * wordsOn).toFixed(3);
      }
      /* the exit: the rows as one block, the statement with them */
      const s = 1 - (1 - exitScale) * c;
      gsap.set([wraps.top, wraps.bottom], { scale: s, y: -exitLift * c, opacity: 1 - c });
      if (statement instanceof HTMLElement) gsap.set(statement, { filter: `blur(${(exitBlur * c).toFixed(2)}px)`, opacity: 1 - c });
      section.style.setProperty('--m-access-c', c.toFixed(3));
    };
    apply(0);
    ctx.add(() => {
      ScrollTrigger.addEventListener('refreshInit', measure);
      ScrollTrigger.create({
        start: () => naturalTop() - pinTop(),
        end: () => naturalTop() - pinTop() + runway,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (st) => apply(st.progress * runway),
        onRefresh: (st) => apply(st.progress * runway),
      });
      return () => ScrollTrigger.removeEventListener('refreshInit', measure);
    });
    if (import.meta.env.DEV) window.__mAccess = () => ({ natural: Math.round(naturalTop()), pin: Math.round(pinTop()), runway, steps, primeIdx, stH: section.style.getPropertyValue('--m-access-st-h'), c: section.style.getPropertyValue('--m-access-c'), rows: { top: gsap.getProperty(rows.top, 'x'), bottom: gsap.getProperty(rows.bottom, 'x') }, words: slots.map((s) => [s.dataset.row, s.dataset.pair, s.style.left, s.style.opacity]).filter((w) => Number(w[3]) > 0), veils: cells.top.map((c) => c.style.getPropertyValue('--m-veil')) });
    return () => {
      slots.forEach((s) => { s.style.left = ''; s.style.opacity = ''; });
      [...cells.top, ...cells.bottom].forEach((c) => c.style.removeProperty('--m-veil'));
      section.style.removeProperty('--m-access-st-h'); section.style.removeProperty('--m-access-c');
      if (import.meta.env.DEV) delete window.__mAccess;
    };
  });
}
