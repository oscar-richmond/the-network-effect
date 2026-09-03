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

/* R35 (/work views, 2026-09-03): the wrap is IDEMPOTENT per footer —
   a page that boots a view more than once in one page life (the /work
   list ↔ grid switch tears each view down and boots the other) must
   not re-wrap already-wrapped lines: wrapWordRevealElement nests new
   clips inside the old ones and the text never reveals (the What We Do
   R28 finding). The first call's result is cached on the element. */
const wrappedFooters = new WeakMap();

/** @returns {{ wordEls: HTMLElement[], img: Element | null, chip: { el: HTMLElement, atMs: number } | null }} */
export function wrapFooterReveals(footer) {
  if (footer instanceof HTMLElement && wrappedFooters.has(footer)) return wrappedFooters.get(footer);
  const result = wrapFooterRevealsOnce(footer);
  if (footer instanceof HTMLElement) wrappedFooters.set(footer, result);
  return result;
}

function wrapFooterRevealsOnce(footer) {
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
    /* R32 (founders): a row the hosting page scrubs from its own reveal
       progress (data-footer-row-scrub) is not wrapped here — the page
       owns those items' entrance. The index still advances, so every
       other column keeps its exact base delay. No page without the
       attribute is affected. */
    if (col.closest('[data-footer-row-scrub]')) return;
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
