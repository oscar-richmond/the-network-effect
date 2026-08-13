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
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { initViewCaseCursor } from './view-case-cursor.js';
import { isMobileViewport } from './viewport.js';
import { initCarouselIndicators } from './carousel-indicator.js';
import { initMobileEntrance } from './m-entrance.js';

gsap.registerPlugin(ScrollTrigger);

/* The exit (Oscar's rev — no fades): after the travel, the whole
   gallery (strip + FEATURED/WORK + VIEW ALL) DEPARTS upward at 1:1
   scroll speed — one viewport of travel clears everything — while
   the ground falls to #161616 over the final 500px. The services
   departure treatment, here. */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_GROUND_FADE_PX = 500;
const GROUND_DARK = '#161616';
/* Header geometry (Oscar's rev): WORK's bottom and VIEW ALL's
   bottom sit HEADER_GAP above the image tops; FEATURED sits one
   line above WORK; WORK's W aligns under FEATURED's A. All derived
   in place() since the strip top is itself content-derived. The
   difference-blend lines depart via layout `top`, never transform. */
const HEADER_GAP_PX = 80;
const HL_LINE_PX = 40;
const VIEWALL_H_PX = 32; /* CTA height = the pager circles (Oscar's rev) */
const DESC_CLEAR_PX = 40; // longest desc bottom above viewport bottom

const RIGHT_MARGIN_PX = 24;
/* Right-edge blur band fade (Oscar's rev): the band dissolves over
   the last card-pitch of travel, so it's gone exactly when the
   carousel reaches its end — scrubbed, so scrolling back rebuilds
   it symmetrically. Implemented by draining the layers' backdrop
   blur radii to 0 (NOT opacity — an opacity wrapper would become a
   backdrop root and cut the layers off from the strip beneath). */
const BAND_FADE_PX = 384;
const LINE_STAGGER_S = 0.12;
const CARD_STAGGER_MS = 100;
const CARDS_AT_MS = 200;
const VIEWALL_AT_MS = 400;

export function initLandingFeatured() {
  const section = document.querySelector('[data-landing-featured]');
  if (!(section instanceof HTMLElement)) return () => {};

  /* Card links navigate only for LIVE studies; everything else stays
     an inert placeholder (/work's rule). Bound on the SECTION, not
     document, so it preventDefaults BEFORE page-transition's
     document-level interceptor sees the click (bubble order) — and
     bound BEFORE the reduced-motion return, because the gate is
     behaviour, not motion. */
  const onCardClick = (e) => {
    const card = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
    if (card instanceof HTMLElement && card.dataset.live !== 'true') e.preventDefault();
  };
  section.addEventListener('click', onCardClick);
  const removeGate = () => section.removeEventListener('click', onCardClick);

  /* MOBILE (the viewport.js seam) — the 402-frame rebuild: a native
     swipe carousel with the shared 200px indicator, plus the section's
     one-shot arrival (header line-reveals + card fade-rises, the
     founders slots). BEFORE the RM return: the indicator follows the
     user's own swipe (feedback, not motion), so RM keeps it; the
     entrance module gates itself on RM internally. */
  if (isMobileViewport()) {
    const cleanupInd = initCarouselIndicators(section);
    const header = Array.from(section.querySelectorAll('[data-featured-line]'));
    const media = [
      section.querySelector('[data-featured-viewall]'),
      ...section.querySelectorAll('[data-featured-card]'),
      section.querySelector('[data-carousel-ind]'),
    ].filter((el) => el instanceof HTMLElement);
    const cleanupEnt = initMobileEntrance(section, { lines: header, media });
    return () => {
      removeGate();
      cleanupInd();
      cleanupEnt();
    };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return removeGate;

  /* The [ VIEW CASE STUDY + ] cursor — the shared module, so this
     carousel reads exactly like /work's tiles. */
  const cleanupCursor = initViewCaseCursor({
    cursorEl: section.querySelector('[data-featured-cursor]'),
    linkSelector: '[data-work-link]',
    reduced: reducedMotion,
  });

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
     content (the 324px desc width re-wraps some copy): keep the
     lowest desc bottom DESC_CLEAR_PX above the viewport bottom,
     capped at the file's 352. The header hangs off the same
     derivation (WORK/VIEW ALL bottoms HEADER_GAP above the images,
     FEATURED a line above WORK). */
  const hls = Array.from(section.querySelectorAll('.landing-featured__hl'));
  const hlTops = [0, 0];
  const place = () => {
    const maxBottom = Math.max(...cards.map((c) => {
      const d = c.querySelector('.landing-featured__desc');
      return d instanceof HTMLElement ? d.offsetTop + d.offsetHeight : 0;
    }), 0);
    const stripTop = Math.min(352, stageH() - maxBottom - DESC_CLEAR_PX);
    strip.style.top = `${stripTop.toFixed(0)}px`;
    hlTops[1] = stripTop - HEADER_GAP_PX - HL_LINE_PX; // WORK
    hlTops[0] = hlTops[1] - HL_LINE_PX; // FEATURED, one line above
    hls.forEach((hl, i) => { hl.style.top = `${hlTops[i]}px`; });
    if (viewall instanceof HTMLElement) {
      viewall.style.top = `${stripTop - HEADER_GAP_PX - VIEWALL_H_PX}px`;
    }
  };

  /* W-under-A (the O-over-S mechanism): Range around FEATURED's A —
     runs pre-wrap (needs the raw text node). */
  const alignWork = () => {
    const featured = hls[0];
    const work = hls[1];
    if (!(featured instanceof HTMLElement) || !(work instanceof HTMLElement)) return;
    const tn = featured.firstChild;
    if (!tn || tn.nodeType !== Node.TEXT_NODE) return;
    const range = document.createRange();
    range.setStart(tn, 2); // FE[A]TURED
    range.setEnd(tn, 3);
    const aRect = range.getBoundingClientRect();
    if (aRect.width === 0) return;
    const stageRect = stage.getBoundingClientRect();
    work.style.left = `${(aRect.left - stageRect.left).toFixed(2)}px`;
  };

  const timeouts = [];
  let masterTl = null;
  let revealTrigger = null;
  let disposed = false;
  /* Set once fonts are ready (the wraps exist) — reveals cards'
     texts as the travel brings them into the viewport. */
  let revealOnTravel = null;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${Math.round(runway())}`,
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: applyHeight,
      onUpdate: () => revealOnTravel?.(),
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
    tl.to(hl, { top: () => hlTops[i] - stageH(), duration: stageH() }, exitAt());
  });
  /* NUMERIC position (a function here is silently coerced to 0 —
     caught in verification: the fade ran at the travel's start). */
  tl.to(stage, {
    backgroundColor: GROUND_DARK,
    duration: TRANSITION_GROUND_FADE_PX,
  }, runway() - TRANSITION_GROUND_FADE_PX);
  /* Blur-band dissolve over the final card pitch (see BAND_FADE_PX):
     radii drain to 0 with the scrub; reversal rebuilds them. */
  const blurLayers = Array.from(section.querySelectorAll('[data-gradual-blur-layer]'));
  const blurBases = blurLayers.map((l) => {
    const m = /([\d.]+)rem/.exec(l.style.backdropFilter || '');
    return m ? parseFloat(m[1]) : 0;
  });
  const bandFade = { t: 0 };
  const edgeTint = section.querySelector('[data-featured-edge-tint]');
  tl.to(bandFade, {
    t: 1,
    duration: BAND_FADE_PX,
    onUpdate: () => {
      blurLayers.forEach((l, i) => {
        const v = `blur(${(blurBases[i] * (1 - bandFade.t)).toFixed(3)}rem)`;
        l.style.backdropFilter = v;
        l.style.webkitBackdropFilter = v;
      });
      /* The tint drains with the radii (the access-exit pairing) —
         plain gradient div, opacity is safe (no backdrop root). */
      if (edgeTint instanceof HTMLElement) {
        edgeTint.style.opacity = (1 - bandFade.t).toFixed(3);
      }
    },
  }, (travel() || 1) - BAND_FADE_PX);
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
    alignWork(); /* pre-wrap — the Range needs the raw text node */
    /* Card titles + descs take the word reveal (Oscar's rev):
       initially-visible cards play with their entrance stagger; the
       rest stay clipped until they ENTER during the travel (the
       master scrub's onUpdate below). Wrapped before place() — it
       measures the rendered descs. */
    const cardTexts = cards.map((card) => {
      const parts = [];
      const titleLines = Array.from(card.querySelectorAll('.landing-featured__titleline'));
      titleLines.forEach((tline, j) => {
        if (!(tline instanceof HTMLElement)) return;
        wrapWordRevealElement(tline, { baseDelay: j * LINE_STAGGER_S });
        parts.push(tline);
      });
      const desc = card.querySelector('.landing-featured__desc');
      if (desc instanceof HTMLElement) {
        wrapWordRevealElement(desc, { baseDelay: titleLines.length * LINE_STAGGER_S });
        parts.push(desc);
      }
      return parts;
    });
    const cardRevealed = cards.map(() => false);
    const revealCardText = (i) => {
      if (cardRevealed[i]) return;
      cardRevealed[i] = true;
      cardTexts[i].forEach((el) => playLineRevealElement(el));
    };
    revealOnTravel = () => {
      if (cardRevealed.every(Boolean)) return;
      const vw = window.innerWidth || 1728;
      cards.forEach((card, i) => {
        if (!cardRevealed[i] && card.getBoundingClientRect().left < vw) revealCardText(i);
      });
    };
    place();
    lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
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
            timeouts.push(setTimeout(() => {
              card.classList.add('is-visible');
              revealCardText(i);
            }, CARDS_AT_MS + i * CARD_STAGGER_MS));
          } else {
            /* Composed for the travel — its TEXT stays clipped until
               the card enters (revealOnTravel). */
            card.classList.add('is-visible');
          }
        });
      },
    });
  });

  const onResize = () => {
    applyHeight();
    place();
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
    removeGate();
    cleanupCursor();
    timeouts.forEach(clearTimeout);
    window.removeEventListener('resize', onResize);
    revealTrigger?.kill();
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
