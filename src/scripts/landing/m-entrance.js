/**
 * MOBILE SECTION ENTRANCE — the shared one-shot arrival used by the
 * Part-2 rebuilt sections (Figma 402-frame rebuild, 2026-08-13).
 * The vocabulary is the page's own, nothing new: difference-blended
 * text lines get the line-reveal (clip + rise on the INNER spans —
 * the blend stays on the static outer, the six-regression rule),
 * everything else fades-rises via `.is-visible` (the founders
 * media/button treatment; CSS states live in the landing-home
 * mobile block, no-preference gated). One-shot ScrollTrigger at the
 * house 65% band, 120ms stagger — the hero's entry-slot rhythm.
 *
 * Reduced motion: no trigger, no wraps — CSS renders the sections
 * complete and static (the hidden states are no-preference-only).
 *
 * @param {HTMLElement} section trigger element
 * @param {{ lines?: Element[], media?: Element[], start?: string }} opts
 *   lines — difference-safe line-reveal targets (each becomes a clip)
 *   media — plain fade-rise targets (get .is-visible, staggered)
 * @returns {() => void} cleanup
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
/* WORD-level wrap (the founders headline mechanism), NOT the line
   wrap: the mobile headers weld mixed-face spans into flowing
   paragraphs, and the line wrap splits fragments at span boundaries
   (re-blocking the flow — caught in R1). The word wrap preserves
   children and the natural line breaks exactly. */
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const MEDIA_AT_MS = 400;
const MEDIA_STAGGER_MS = 120;

export function initMobileEntrance(section, { lines = [], media = [], start = 'top 65%' } = {}) {
  if (!(section instanceof HTMLElement)) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const timeouts = [];
  let trigger = null;
  let disposed = false;

  /* fonts.ready before wrapping — the established gate (wrapping
     against fallback metrics mis-groups lines). */
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });

    trigger = ScrollTrigger.create({
      trigger: section,
      start,
      once: true,
      onEnter: () => {
        lines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
        media.forEach((el, i) => {
          if (!(el instanceof HTMLElement)) return;
          timeouts.push(
            setTimeout(() => el.classList.add('is-visible'), MEDIA_AT_MS + i * MEDIA_STAGGER_MS),
          );
        });
      },
    });
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    trigger?.kill();
  };
}
