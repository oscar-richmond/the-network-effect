/**
 * CLOSING SECTION + FOOTER entrances (/landing) — house vocabulary,
 * once-only scrolled-into-view reveals (no scrub), per the page's
 * entrance conventions.
 *
 * CLOSING (trigger 'top 65%'): headline line-reveals in reading
 * order (the established clip mechanism — it animates the blend
 * lines' DESCENDANTS, never wraps them in moving ancestors); the
 * intro paragraph blur-fades in behind; the tiles rise+fade
 * left-to-right on a 100ms stagger; the keyword blocks (word +
 * index + line) follow as a second wave.
 *
 * FOOTER (trigger 'top 75%'): index columns stagger-fade, the image
 * reveals, the big statement line-reveals (two staggered lines),
 * the bottom row fades last.
 *
 * BACK TO TOP + HOME: smooth scroll to the page top THROUGH Lenis
 * (the page's one scroll authority — the access-snap precedent).
 *
 * Reduced motion: no init — everything static (the hidden entrance
 * states are gated behind prefers-reduced-motion: no-preference in
 * landing.css).
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const TILE_STAGGER_MS = 100;
const TILES_AT_MS = 200;
const KEYWORDS_AT_MS = 600;
const KEYWORD_STAGGER_MS = 100;
const INTRO_AT_MS = 400;
const FOOTER_COL_STAGGER_MS = 120;
const FOOTER_IMG_AT_MS = 240;
const FOOTER_ROW_AT_MS = 900;

export function initLandingClosing() {
  const closing = document.querySelector('[data-landing-closing]');
  const footer = document.querySelector('[data-landing-footer]');
  if (!(closing instanceof HTMLElement) || !(footer instanceof HTMLElement)) return () => {};

  /* Back-to-top / home — wired in ALL modes (RM included: it's
     navigation, not decoration). Lenis when present, native fallback. */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    e.preventDefault();
    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));

  const cleanupBase = () => {
    topLinks.forEach((el) => el.removeEventListener('click', onTopClick));
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return cleanupBase;
  }

  const closingLines = Array.from(closing.querySelectorAll('[data-closing-line]'));
  const intro = closing.querySelector('[data-closing-intro]');
  const tiles = Array.from(closing.querySelectorAll('[data-closing-tile]'));
  const kws = Array.from(closing.querySelectorAll('[data-closing-kw]'));
  const footerCols = Array.from(footer.querySelectorAll('[data-footer-col]'));
  const footerImg = footer.querySelector('[data-footer-img]');
  const stLines = Array.from(footer.querySelectorAll('[data-footer-st-line]'));
  const footerRow = footer.querySelector('[data-footer-row]');

  const timeouts = [];
  const triggers = [];
  let disposed = false;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* Wrap AFTER fonts (line grouping), BEFORE the triggers. */
    closingLines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });
    stLines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });

    triggers.push(ScrollTrigger.create({
      trigger: closing,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        closingLines.forEach((line) => playLineRevealElement(line));
        timeouts.push(setTimeout(() => {
          if (intro) intro.classList.add('is-visible');
        }, INTRO_AT_MS));
        tiles.forEach((tile, i) => {
          timeouts.push(setTimeout(() => tile.classList.add('is-visible'), TILES_AT_MS + i * TILE_STAGGER_MS));
        });
        kws.forEach((kw, i) => {
          timeouts.push(setTimeout(() => kw.classList.add('is-visible'), KEYWORDS_AT_MS + i * KEYWORD_STAGGER_MS));
        });
      },
    }));

    triggers.push(ScrollTrigger.create({
      trigger: footer,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        footerCols.forEach((col, i) => {
          timeouts.push(setTimeout(() => col.classList.add('is-visible'), i * FOOTER_COL_STAGGER_MS));
        });
        timeouts.push(setTimeout(() => {
          if (footerImg) footerImg.classList.add('is-visible');
        }, FOOTER_IMG_AT_MS));
        stLines.forEach((line) => playLineRevealElement(line));
        timeouts.push(setTimeout(() => {
          if (footerRow) footerRow.classList.add('is-visible');
        }, FOOTER_ROW_AT_MS));
      },
    }));
  });

  return () => {
    disposed = true;
    cleanupBase();
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
  };
}
