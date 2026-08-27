/**
 * FOOTER MOTION — the landing footer's entrance choreography as a
 * shared helper (extracted from work-page.js so /work and the case
 * studies carry ONE copy): column/row/statement word reveals on the
 * landing-closing stagger bases, the image rise.
 *
 * wrapFooterReveals(footer): call AFTER fonts are ready (line
 * grouping). playFooterReveals(...): fire once at the reveal moment
 * the page defines (the ~200px-into-the-reveal convention on
 * /work; a scroll trigger on flow pages).
 */
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

const LINE_STAGGER_S = 0.12;

/** @returns {{ wordEls: HTMLElement[], img: Element | null, chip: { el: HTMLElement, atMs: number } | null }} */
export function wrapFooterReveals(footer) {
  const wordEls = [];
  /* The START A PROJECT chip's painted pill — the one footer surface
     the word wrap can't cover; it rises via the tile/image class
     family on the same beat as its own words. */
  let chip = null;
  if (!(footer instanceof HTMLElement)) return { wordEls, img: null, chip };
  Array.from(footer.querySelectorAll('[data-footer-st-line]')).forEach((line, i) => {
    if (!(line instanceof HTMLElement)) return;
    line.dataset.revealDelay = String(i * LINE_STAGGER_S);
    wrapWordRevealElement(line);
    wordEls.push(line);
  });
  Array.from(footer.querySelectorAll('[data-footer-col]')).forEach((col, i) => {
    const base = i * 0.12;
    if (col.matches('a, button')) {
      if (col instanceof HTMLElement) {
        wrapWordRevealElement(col, { baseDelay: base });
        wordEls.push(col);
        if (col.classList.contains('landing-footer__dchip')) {
          chip = { el: col, atMs: Math.round(base * 1000) };
        }
      }
    } else {
      Array.from(col.children).forEach((child, j) => {
        if (!(child instanceof HTMLElement)) return;
        wrapWordRevealElement(child, { baseDelay: base + j * 0.06 });
        wordEls.push(child);
      });
    }
  });
  Array.from(footer.querySelectorAll('.landing-footer__rowitem')).forEach((item, i) => {
    if (!(item instanceof HTMLElement)) return;
    wrapWordRevealElement(item, { baseDelay: 0.9 + i * 0.04 });
    wordEls.push(item);
  });
  return { wordEls, img: footer.querySelector('[data-footer-img]'), chip };
}

/** @param {{ wordEls: HTMLElement[], img: Element | null }} wrapped
 *  @param {(fn: () => void, ms: number) => void} schedule — the
 *  caller's timeout book-keeping (cleared on dispose). */
export function playFooterReveals(wrapped, schedule) {
  wrapped.wordEls.forEach((el) => playLineRevealElement(el));
  if (wrapped.chip) {
    const { el, atMs } = wrapped.chip;
    schedule(() => el.classList.add('is-visible'), atMs);
  }
  schedule(() => {
    wrapped.img?.classList.add('is-visible');
  }, 240);
}
