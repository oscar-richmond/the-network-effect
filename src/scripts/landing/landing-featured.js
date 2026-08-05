/**
 * FEATURED WORK — horizontal gallery scrub + the relocated
 * fade-to-black (/landing).
 *
 * MECHANISM (the house pattern, fresh minimal build — the /old
 * horizontal galleries are welded to their pages' pin systems, so
 * the pattern is reused and the code is not): sticky stage +
 * vertical runway mapped 1:1 to horizontal travel. One master
 * pinned scrub; the strip's x is a pure function of the single
 * progress (the page-wide discipline). FREE travel — no snap
 * (Oscar's call: in a browsing gallery the half-visible card is the
 * invitation, unlike the pair/stack sections where half-states read
 * broken; the Lenis-idle machinery stays on the shelf).
 *
 * TRAVEL = strip content width + right margin - viewport, derived
 * live (function-based, invalidateOnRefresh) so the /06-/08 content
 * drop or any card-count change re-derives everything. The section
 * height is set from the same derivation.
 *
 * THE EXIT (Oscar's rev 2 — the departure, no fades): after the
 * last card and a 250px dwell, the whole gallery (strip + the
 * difference header lines + VIEW ALL) rides up one viewport at 1:1
 * scroll speed while the ground falls to #161616 over the final
 * 500px — the services-departure treatment. The scrub still ends
 * fully black exactly as Our Network's top crosses the viewport
 * bottom: the same contract its overlap/pin/entrance consume.
 *
 * ENTRANCE (once, 'top 65%'): FEATURED/WORK line-reveal, VIEW ALL
 * on the founders-button vocabulary, the initially-visible cards
 * rise+fade left-to-right at 100ms (the closing-tiles treatment).
 *
 * RM: no init — static first cards, no pin (CSS collapses the
 * runway), no fade; Network follows on its RM hard boundary.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

/* The exit (Oscar's rev — no fades): after the travel, the whole
   gallery (strip + FEATURED/WORK + VIEW ALL) DEPARTS upward at 1:1
   scroll speed — one viewport of travel clears everything — while
   the ground falls to #161616 over the final 500px. The services
   departure treatment, here. */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_GROUND_FADE_PX = 500;
const GROUND_DARK = '#161616';
/* Header line base tops (landing.css) — the difference-blend lines
   depart via layout `top`, never transform. */
const HL_BASE_TOPS = [177, 225];

const RIGHT_MARGIN_PX = 24;
const LINE_STAGGER_S = 0.12;
const CARD_STAGGER_MS = 100;
const CARDS_AT_MS = 200;
const VIEWALL_AT_MS = 400;

export function initLandingFeatured() {
  const section = document.querySelector('[data-landing-featured]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const stage = section.querySelector('[data-featured-stage]');
  const strip = section.querySelector('[data-featured-strip]');
  const lines = Array.from(section.querySelectorAll('[data-featured-line]'));
  const viewall = section.querySelector('[data-featured-viewall]');
  const cards = Array.from(section.querySelectorAll('[data-featured-card]'));
  if (!(stage instanceof HTMLElement) || !(strip instanceof HTMLElement)) return () => {};

  /* Travel derived live: strip scrollWidth already includes its
     24px lead-in padding; the tail matches with RIGHT_MARGIN_PX. */
  const travel = () =>
    Math.max(strip.scrollWidth + RIGHT_MARGIN_PX - (window.innerWidth || 1728), 0);
  const stageH = () => stage.clientHeight || window.innerHeight;
  const runway = () => travel() + TRANSITION_DWELL_PX + stageH();

  /* The section's own height carries the runway (content-derived, so
     it can't live in static CSS). Set before triggers measure. */
  const applyHeight = () => {
    section.style.height = `calc(100dvh + ${Math.round(runway())}px)`;
  };
  applyHeight();

  /* Clip-safe strip top, DERIVED from the tallest card's real
     content (the 324px desc width re-wraps some copy taller than
     any fixed budget — caught in verification): keep the lowest
     desc bottom >= 24px above the viewport bottom, capped at the
     file's 352. */
  const placeStrip = () => {
    const maxBottom = Math.max(...cards.map((c) => {
      const d = c.querySelector('.landing-featured__desc');
      return d instanceof HTMLElement ? d.offsetTop + d.offsetHeight : 0;
    }), 0);
    strip.style.top = `${Math.min(352, stageH() - maxBottom - 24).toFixed(0)}px`;
  };

  const timeouts = [];
  let masterTl = null;
  let revealTrigger = null;
  let disposed = false;

  const hls = Array.from(section.querySelectorAll('.landing-featured__hl'));

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${Math.round(runway())}`,
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: applyHeight,
    },
  });
  /* The horizontal travel — 1:1, reversible, free (no snap). */
  tl.to(strip, { x: () => -travel(), duration: travel() || 1 }, 0);
  /* THE DEPARTURE (no fades): after a 250px dwell everything rides
     up one viewport at 1:1 — strip and VIEW ALL by transform, the
     difference header lines by layout `top` (blend rule) — while
     the ground falls to dark over the final 500px. */
  const exitAt = () => (travel() || 1) + TRANSITION_DWELL_PX;
  tl.to(strip, { y: () => -stageH(), duration: stageH() }, exitAt());
  if (viewall instanceof HTMLElement) {
    tl.to(viewall, { y: () => -stageH(), duration: stageH() }, exitAt());
  }
  hls.forEach((hl, i) => {
    tl.to(hl, { top: () => HL_BASE_TOPS[i] - stageH(), duration: stageH() }, exitAt());
  });
  /* NUMERIC position (a function here is silently coerced to 0 —
     caught in verification: the fade ran at the travel's start). */
  tl.to(stage, {
    backgroundColor: GROUND_DARK,
    duration: TRANSITION_GROUND_FADE_PX,
  }, runway() - TRANSITION_GROUND_FADE_PX);
  masterTl = tl;

  /* VIEW ALL's entrance is gsap-driven (NOT the CSS hidden-state
     class): its departure is a scrubbed gsap transform, and a CSS
     transition on `transform` would intercept those per-frame
     writes (caught in verification). Cards keep the CSS entrance —
     the departure moves their CONTAINER, never them. */
  if (viewall instanceof HTMLElement) {
    gsap.set(viewall, { opacity: 0, y: 24 });
  }

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    placeStrip();
    lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });
    revealTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        lines.forEach((line) => playLineRevealElement(line));
        timeouts.push(setTimeout(() => {
          if (viewall instanceof HTMLElement) {
            gsap.to(viewall, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
          }
        }, VIEWALL_AT_MS));
        /* Stagger only the initially-visible cards; the rest arrive
           already composed as the strip travels. */
        const visibleCount = Math.ceil((window.innerWidth || 1728) / 384);
        cards.forEach((card, i) => {
          if (i < visibleCount) {
            timeouts.push(setTimeout(() => card.classList.add('is-visible'), CARDS_AT_MS + i * CARD_STAGGER_MS));
          } else {
            card.classList.add('is-visible');
          }
        });
      },
    });
  });

  const onResize = () => {
    applyHeight();
    placeStrip();
  };
  window.addEventListener('resize', onResize);

  if (import.meta.env.DEV) {
    window.__landingFeatured = {
      trigger: () => masterTl?.scrollTrigger ?? null,
      travel,
      runway,
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    window.removeEventListener('resize', onResize);
    revealTrigger?.kill();
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
