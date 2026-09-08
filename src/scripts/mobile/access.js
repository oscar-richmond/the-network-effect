/**
 * WE CREATE ACCESS below the seam (mobile rebuild Part 3 §2, 2026-09-08) —
 * the desktop's mechanic (landing-access.js) at the phone's geometry: two
 * tile rows travel in OPPOSITE directions on one scroll progress, the top
 * row left and the bottom right, so the k-th pair lands together after k
 * steps; the landed cells sit ±60 from the viewport's centre as the frame
 * draws them (1:89 at x81, 1:75 at x−39), their neighbours veiled (60% +
 * the frost, blurred), the pair's words on the landed cells (30 Serrif
 * Regular, difference white).
 *
 * The rows and the word layer are sticky (access.css) for the runway — five
 * steps of --m-access-step-px — and the stage's runway block is content, so
 * they hold and release with the section. One scrubbed ScrollTrigger over
 * the runway: the rows' x is tweened; the veils (a --m-veil per cell) and
 * the word slots (position + opacity by distance from the landing) are
 * written from the same progress in onUpdate. Pure functions of scroll,
 * measured from the rows' natural top with sticky off, so they reverse.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';

export function initMobileAccess() {
  return mobileMatch((ctx) => {
    const section = document.querySelector('[data-landing-access]');
    const rows = { top: document.querySelector('[data-access-row="top"]'), bottom: document.querySelector('[data-access-row="bottom"]') };
    const wraps = { top: section?.querySelector('.landing-access__rowwrap--top'), bottom: section?.querySelector('.landing-access__rowwrap--bottom') };
    if (!(section instanceof HTMLElement) || !(rows.top instanceof HTMLElement) || !(rows.bottom instanceof HTMLElement) || !(wraps.top instanceof HTMLElement)) return;
    const cells = { top: Array.from(rows.top.children), bottom: Array.from(rows.bottom.children) };
    const slots = Array.from(section.querySelectorAll('[data-access-wordslot]')).filter((s) => s instanceof HTMLElement);
    const tileW = tokenPx('--m-access-tile-w'), pitch = tokenPx('--m-access-tile-pitch'), steps = Math.round(tokenPx('--m-access-runway') / tokenPx('--m-access-step-px'));
    const runway = tokenPx('--m-access-runway'), landOff = tokenPx('--m-access-land-offset');
    const wordW = tokenPx('--m-access-word-w'), wordFull = tokenPx('--m-access-word-full'), wordWindow = tokenPx('--m-access-word-window'), veilDead = tokenPx('--m-access-veil-dead');
    const vw = () => window.innerWidth;
    /* the landed centres and the rows' rest x (their pair-0 cells: the top row's index 1, the bottom row's index 5) */
    const primeIdx = { top: cells.top.findIndex((c) => !c.hasAttribute('data-pad')), bottom: cells.bottom.length - 1 - [...cells.bottom].reverse().findIndex((c) => !c.hasAttribute('data-pad')) };
    const landed = { top: () => vw() / 2 + landOff, bottom: () => vw() / 2 - landOff };
    const restX = { top: () => landed.top() - tileW / 2 - primeIdx.top * pitch, bottom: () => landed.bottom() - tileW / 2 - primeIdx.bottom * pitch };
    const travel = steps * pitch;
    const naturalTop = () => { const prev = wraps.top.style.position; wraps.top.style.position = 'static'; const t = wraps.top.getBoundingClientRect().top + window.scrollY; wraps.top.style.position = prev; return t; };
    const pinTop = () => parseFloat(getComputedStyle(wraps.top).top) || 0;
    /* the idempotent re-entry reset: pair 0 landed, words on, neighbours veiled */
    const apply = (p) => {
      const shiftTop = -p * travel, shiftBottom = p * travel;
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
      for (const slot of slots) {
        const row = slot.dataset.row === 'bottom' ? 'bottom' : 'top';
        const k = Number(slot.dataset.pair) || 0;
        const idx = row === 'top' ? primeIdx.top + k : primeIdx.bottom - k;
        const centre = restX[row]() + (row === 'top' ? shiftTop : shiftBottom) + idx * pitch + tileW / 2;
        const dist = Math.abs(centre - landed[row]());
        const near = dist <= wordFull ? 1 : dist >= wordWindow ? 0 : 1 - (dist - wordFull) / (wordWindow - wordFull);
        slot.style.left = `${(centre - wordW / 2).toFixed(1)}px`;
        slot.style.opacity = near.toFixed(3);
      }
    };
    apply(0);
    ctx.add(() => {
      ScrollTrigger.create({
        start: () => naturalTop() - pinTop(),
        end: () => naturalTop() - pinTop() + runway,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (st) => apply(st.progress),
        onRefresh: (st) => apply(st.progress),
      });
    });
    if (import.meta.env.DEV) window.__mAccess = () => ({ natural: Math.round(naturalTop()), pin: Math.round(pinTop()), runway, primeIdx, rows: { top: gsap.getProperty(rows.top, 'x'), bottom: gsap.getProperty(rows.bottom, 'x') }, words: slots.map((s) => [s.dataset.row, s.dataset.pair, s.style.left, s.style.opacity]).filter((w) => Number(w[3]) > 0), veils: cells.top.map((c) => c.style.getPropertyValue('--m-veil')) });
    return () => { slots.forEach((s) => { s.style.left = ''; s.style.opacity = ''; }); [...cells.top, ...cells.bottom].forEach((c) => c.style.removeProperty('--m-veil')); if (import.meta.env.DEV) delete window.__mAccess; };
  });
}
