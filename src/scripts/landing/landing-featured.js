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
 * BEAT F, RELOCATED (moved from the services module, constants
 * VERBATIM — 250 dwell, 400 content fade, ground fade 500 starting
 * at +450): after the last card, the strip/header/button fade and
 * the stage ground falls to #161616, the scrub ending exactly as
 * Our Network's top crosses the viewport bottom — the identical
 * black-on-black contract Network's overlap/pin/entrance already
 * consume, one section later.
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

/* Beat F — the services transition's original constants, verbatim. */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_TEXT_FADE_PX = 400;
const TRANSITION_GROUND_DELAY_PX = 200;
const TRANSITION_GROUND_FADE_PX = 500;
const FADE_TOTAL_PX =
  TRANSITION_DWELL_PX + TRANSITION_GROUND_DELAY_PX + TRANSITION_GROUND_FADE_PX; // 950
const GROUND_DARK = '#161616';

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
  const runway = () => travel() + FADE_TOTAL_PX;

  /* The section's own height carries the runway (content-derived, so
     it can't live in static CSS). Set before triggers measure. */
  const applyHeight = () => {
    section.style.height = `calc(100dvh + ${Math.round(runway())}px)`;
  };
  applyHeight();

  const timeouts = [];
  let masterTl = null;
  let revealTrigger = null;
  let disposed = false;

  const fadeTargets = [strip, section.querySelector('.landing-featured__header'), viewall]
    .filter((el) => el instanceof HTMLElement);

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
  /* Beat F, relocated verbatim. */
  tl.to(fadeTargets, {
    opacity: 0,
    duration: TRANSITION_TEXT_FADE_PX,
  }, (travel() || 1) + TRANSITION_DWELL_PX);
  tl.to(stage, {
    backgroundColor: GROUND_DARK,
    duration: TRANSITION_GROUND_FADE_PX,
  }, (travel() || 1) + TRANSITION_DWELL_PX + TRANSITION_GROUND_DELAY_PX);
  masterTl = tl;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
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
          if (viewall) viewall.classList.add('is-visible');
        }, VIEWALL_AT_MS));
        /* Stagger only the initially-visible cards; the rest arrive
           already composed as the strip travels. */
        const visibleCount = Math.ceil((window.innerWidth || 1728) / 414);
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

  const onResize = () => applyHeight();
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
