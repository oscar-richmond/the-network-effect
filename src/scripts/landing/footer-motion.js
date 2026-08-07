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

/** @returns {{ wordEls: HTMLElement[], img: Element | null }} */
export function wrapFooterReveals(footer) {
  const wordEls = [];
  if (!(footer instanceof HTMLElement)) return { wordEls, img: null };
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
  return { wordEls, img: footer.querySelector('[data-footer-img]') };
}

/** @param {{ wordEls: HTMLElement[], img: Element | null }} wrapped
 *  @param {(fn: () => void, ms: number) => void} schedule — the
 *  caller's timeout book-keeping (cleared on dispose). */
export function playFooterReveals(wrapped, schedule) {
  wrapped.wordEls.forEach((el) => playLineRevealElement(el));
  schedule(() => {
    wrapped.img?.classList.add('is-visible');
  }, 240);
}
