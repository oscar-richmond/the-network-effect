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
/* TRANSITION_GROUND_FADE_PX / GROUND_DARK moved WITH the fade to
   landing-services.js (2026-08-24) — never duplicated. */
/* THE FADE-TO-LIGHT (Oscar, 2026-08-26) — the MIRROR of that beat,
   on THIS section's tail: featured's dark ground falls to the page
   grey over the final 500px, completing exactly as What We Do's top
   crosses the viewport bottom (the same contract, inverted), so the
   light section arrives light-on-light with no hard line. The tail
   gives the fade an EMPTY ground — the gallery has departed (the
   services-fade lesson: never fade under live content). */
const TAIL_LIGHT_FADE_PX = 500;
/* R5 (Oscar 2026-08-27, the earlier fade): the fade-to-light BEGINS
   when the departing carousel is this fraction off the top of the
   viewport — its measured midpoint crossing the viewport top at
   0.5. Derived from the strip's live top/height (never an offset);
   featuredTailFadeWindow() below is the ONE derivation, consumed by
   this module's fade AND landing-access's arrival gate so the two
   can never desync. */
const FEATURED_TAIL_FADE_AT_T = 0.5;

/** The fade-to-light window, absolute scroll px — derived live from
 *  the featured DOM (self-contained: callable from other modules).
 *  start = the scroll where FEATURED_TAIL_FADE_AT_T of the carousel
 *  has exited the viewport top; span = TAIL_LIGHT_FADE_PX. Null
 *  when the section isn't in its desktop pinned regime. */
export function featuredTailFadeWindow() {
  const section = document.querySelector('[data-landing-featured]');
  const strip = document.querySelector('[data-featured-strip]');
  if (!(section instanceof HTMLElement) || !(strip instanceof HTMLElement)) return null;
  if (isMobileViewport()) return null;
  const sectionTop = section.getBoundingClientRect().top + (window.scrollY || 0);
  const travel = Math.max(strip.scrollWidth + RIGHT_MARGIN_PX - (window.innerWidth || 1728), 0);
  const departAt = sectionTop + travel + TRANSITION_DWELL_PX;
  const stripTop = parseFloat(strip.style.top) || strip.getBoundingClientRect().top;
  const stripH = strip.getBoundingClientRect().height;
  return {
    start: Math.round(departAt + stripTop + stripH * FEATURED_TAIL_FADE_AT_T),
    span: TAIL_LIGHT_FADE_PX,
  };
}
/** R6 item 3 (Oscar 2026-08-27, supersedes the fade-50% arrival
 *  gate): the scroll at which the departing carousel's measured TOP
 *  edge crosses the NAV WORDMARK's measured bottom — the moment the
 *  carousel starts leaving under the nav. landing-access anchors
 *  its arrival here; same self-contained shape as the fade window
 *  above, so the derivations share their measurements. Null outside
 *  the desktop pinned regime. */
export function featuredCarouselExitsNavAt() {
  const section = document.querySelector('[data-landing-featured]');
  const strip = document.querySelector('[data-featured-strip]');
  if (!(section instanceof HTMLElement) || !(strip instanceof HTMLElement)) return null;
  if (isMobileViewport()) return null;
  const sectionTop = section.getBoundingClientRect().top + (window.scrollY || 0);
  const travel = Math.max(strip.scrollWidth + RIGHT_MARGIN_PX - (window.innerWidth || 1728), 0);
  const departAt = sectionTop + travel + TRANSITION_DWELL_PX;
  const stripTop = parseFloat(strip.style.top) || strip.getBoundingClientRect().top;
  const topbar = document.querySelector('.home__topbar');
  const navBottom = topbar instanceof HTMLElement ? topbar.getBoundingClientRect().bottom : 0;
  return Math.round(departAt + stripTop - navBottom);
}
const TAIL_CLEAR_PX = 100;
const GROUND_LIGHT = '#eeeef0';
/* Header geometry (Oscar's rev): WORK's bottom and VIEW ALL's
   bottom sit HEADER_GAP above the image tops; FEATURED sits one
   line above WORK; WORK's W aligns under FEATURED's A. All derived
   in place() since the strip top is itself content-derived. The
   difference-blend lines depart via layout `top`, never transform. */

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
  /* (The R2 sentence-caser is GONE — card titles now carry their
     NATURAL capitalisation in the data itself; guide Heading/Section
     is not-uppercase and 'Wilderness Reserve' beats 'Wilderness
     reserve'. Data is rendered verbatim.) */
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
    /* R5: the fade now runs INSIDE the exit window (it begins at
       the carousel's midpoint crossing the top and completes before
       the departure ends), so the section no longer carries the
       fade's own 500px tail — only TAIL_CLEAR_PX of light hold. */
    section.style.height = `calc(100dvh + ${Math.round(runway() + TAIL_CLEAR_PX)}px)`;
  };
  applyHeight();

  /* Clip-safe strip top, DERIVED from the tallest card's real
     content (the 324px desc width re-wraps some copy): keep the
     lowest desc bottom clear of the viewport bottom,
     capped at the file's 352. The header hangs off the same
     derivation (WORK/VIEW ALL bottoms HEADER_GAP above the images,
     FEATURED a line above WORK). */
  const hls = Array.from(section.querySelectorAll('.landing-featured__hl'));
  /* R2 (Oscar, 2026-08-24): the whole composition — header + the
     carousel block — centres VERTICALLY on the stage, with a fixed
     64px between the header and the image tops (his call: the
     frame's 89/191 put the header behind the tall images on short
     viewports). With the descriptions gone the block is header 50 +
     64 + tallest image 450 + 24 + one 50px title line = 638. */
  const HL_H_PX = 50;
  const HEADER_IMG_GAP_PX = 64;
  const META_GAP_PX = 24;
  const TITLE_H_PX = 50;
  const MAX_IMG_H_PX = 450;
  /* R2 fit rule (Oscar's Adolescence call, generalised): a card
     whose single-line sentence-case title outgrows its cycle width
     WIDENS to the title (image follows at width:100%) — measured
     live, so copy changes self-maintain. Runs before the layout
     derivations; the travel re-derives from the wider strip. */
  const fitCards = () => {
    cards.forEach((c) => {
      const t = c.querySelector('.landing-featured__titleblock');
      if (!(t instanceof HTMLElement)) return;
      c.style.width = '';
      /* scrollWidth ≥ clientWidth always — only STRICT overflow
         widens, so in-cycle cards keep their exact cycle width. */
      if (t.scrollWidth > t.clientWidth + 1) c.style.width = `${t.scrollWidth + 2}px`;
    });
  };

  /* R15 (Oscar 2026-09-02) — THE NEW CENTRING DEFINITION (supersedes
     R5's whole-block rule of 2026-08-27): the carousel UNIT alone —
     the images + client names, NOT the label, NOT VIEW ALL — centres
     between the NAV WORDMARK's measured bottom and the viewport
     bottom, equal gaps. The unit's height is MEASURED at the fix
     moment (min image top → max title bottom across the cards; the
     strip's own box is the fixed 653 card height, taller than the
     unit). The header sits at a FIXED top (its ink 180 below the
     section above's bottom = this stage's top at the pin; R25: the
     LARGE SANS 56/50's cap top sits 2 below its own 50px line box,
     pixel-measured on this header → 178), and VIEW ALL WORK
     (R25, Oscar 2026-09-03 — supersedes R15's 80-below-the-unit,
     centred placement) sits ON THE HEADER'S ROW: its bottom on the
     header's ink bottom (HEADER_INK_BOTTOM_PX below the header top,
     pixel-measured), its right edge 24 from the viewport (CSS).
     Same mechanism as the R6 fix — place() is the ONE writer of
     --lf-header-top / --lf-viewall-top / the strip top; the
     departure rides --lf-depart, composed in the calc. The 24px
     floor stays as the too-tall guard (flagged in the gap report,
     never a silent compression). */
  const LABEL_TOP_PX = 178;
  const HEADER_INK_BOTTOM_PX = 46; /* the caps' baseline below the header's line-box top at 56/50 (measured) */
  let lastPlacement = null;
  const place = () => {
    fitCards();
    const wordmark = document.querySelector('.home__logo');
    const wm = wordmark instanceof HTMLElement ? wordmark.getBoundingClientRect().bottom : 0;
    /* The unit, measured relative to the strip's box top — LAYOUT
       offsets (offsetTop through the card), never client rects: at
       place() time the cards still carry their entrance's 24px
       pre-rise transform, and a rect-based read baked that 24 into
       the strip top (measured: the landed unit sat 24 high). */
    const stripRect = strip.getBoundingClientRect();
    let unitTopOff = Infinity;
    let unitBottomOff = -Infinity;
    cards.forEach((c) => {
      const win = c.querySelector('.landing-featured__imgwin');
      const tb = c.querySelector('.landing-featured__titleblock');
      if (win instanceof HTMLElement) unitTopOff = Math.min(unitTopOff, c.offsetTop + win.offsetTop);
      if (tb instanceof HTMLElement) unitBottomOff = Math.max(unitBottomOff, c.offsetTop + tb.offsetTop + tb.offsetHeight);
    });
    if (!Number.isFinite(unitTopOff) || !Number.isFinite(unitBottomOff)) {
      unitTopOff = 0;
      unitBottomOff = stripRect.height || (MAX_IMG_H_PX + META_GAP_PX + TITLE_H_PX);
    }
    const unitH = unitBottomOff - unitTopOff;
    const unitTop = Math.max(24 + wm, wm + (stageH() - wm - unitH) / 2);
    const stripTop = unitTop - unitTopOff;
    strip.style.top = `${stripTop.toFixed(1)}px`;
    const viewallH = viewall instanceof HTMLElement ? viewall.getBoundingClientRect().height || 38 : 38;
    const viewallTop = LABEL_TOP_PX + HEADER_INK_BOTTOM_PX - viewallH;
    section.style.setProperty('--lf-header-top', `${LABEL_TOP_PX}px`);
    section.style.setProperty('--lf-viewall-top', `${viewallTop.toFixed(1)}px`);
    lastPlacement = {
      wordmarkBottom: +wm.toFixed(2),
      unitH: +unitH.toFixed(2),
      unitTop: +unitTop.toFixed(2),
      gapAbove: +(unitTop - wm).toFixed(2),
      gapBelow: +(stageH() - (unitTop + unitH)).toFixed(2),
      viewallTop: +viewallTop.toFixed(2),
      viewallBottom: +(viewallTop + (viewall instanceof HTMLElement ? viewall.getBoundingClientRect().height : 38)).toFixed(2),
      stageH: stageH(),
      floorHit: unitTop === 24 + wm,
    };
  };
  const positionViaVars = () => {
    hls.forEach((hl) => { hl.style.top = 'calc(var(--lf-header-top, 177.6px) + var(--lf-depart, 0px))'; });
    if (viewall instanceof HTMLElement) {
      viewall.style.top = 'calc(var(--lf-viewall-top, 900px) + var(--lf-depart, 0px))';
    }
  };
  positionViaVars();

  /* The WELD (supersedes W-under-A): WORK follows FEATURED on the
     same line at one word-space — measured from FEATURED's live box
     so the pair reads as a single headline. */
  const alignWork = () => {
    const featured = hls[0];
    const work = hls[1];
    if (!(featured instanceof HTMLElement) || !(work instanceof HTMLElement)) return;
    const stageRect = stage.getBoundingClientRect();
    const fRect = featured.getBoundingClientRect();
    if (fRect.width === 0) return;
    const wordSpace = parseFloat(getComputedStyle(featured).fontSize) * 0.25;
    work.style.left = `${(fRect.right - stageRect.left + wordSpace).toFixed(2)}px`;
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
  /* R6 (the shared-root fix): the header lines + VIEW ALL depart via
     ONE tween on the section's --lf-depart variable — layout `top`
     through the calc (the blend rule holds: no transforms on the
     difference lines), start structurally 0px so gsap's cached
     start can never resurrect a stale position, and place()'s
     --lf-header-top is composed live on every frame. This also
     welds the pair's spacing (the old per-element tweens rounded
     viewall with toFixed(0) and left the hls unrounded — the 1px
     mid-departure divergence). */
  tl.to(section, { '--lf-depart': () => `-${stageH()}px`, duration: stageH() }, exitAt());
  /* THE FADE-TO-LIGHT (R5, retimed — was `bottom bottom+=500` on
     the section's empty tail): begins the moment the departing
     carousel's midpoint crosses the viewport top, derived live
     (featuredTailFadeWindow — the same derivation landing-access
     anchors its arrival to). It completes inside the exit window,
     so the section no longer carries the fade's own 500px tail. */
  /* R6 item 2 (Oscar 2026-08-27): the CARD METAS (titleblocks +
     descs — the light-ink text) fade out WITH the ground fade — a
     second tween in the SAME timeline on the SAME trigger, so both
     read one progress value and cannot desync (the standing
     no-light-over-shifting-ground guarantee at this boundary).
     Scrubbed and reversible: they return as the ground darkens on
     the way back. Plain-ink elements — autoAlpha is blend-safe. */
  const metaEls = cards.flatMap((c) => [
    c.querySelector('.landing-featured__titleblock'),
    c.querySelector('.landing-featured__desc'),
  ]).filter((el) => el instanceof HTMLElement);
  const lightFade = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: () => featuredTailFadeWindow()?.start ?? `bottom bottom+=${TAIL_LIGHT_FADE_PX}`,
      end: () => `+=${TAIL_LIGHT_FADE_PX}`,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  lightFade.fromTo(stage,
    { backgroundColor: '#161616' },
    { backgroundColor: GROUND_LIGHT, ease: 'none', duration: 1, immediateRender: false }, 0);
  if (metaEls.length) {
    lightFade.fromTo(metaEls,
      { autoAlpha: 1 },
      { autoAlpha: 0, ease: 'none', duration: 1, immediateRender: false }, 0);
  }
  /* THE FADE-TO-BLACK moved on again (2026-08-24, its third home):
     it now rides the SERVICES section's tail — the one light→dark
     boundary in the current order — in landing-services.js,
     constants verbatim. This section is DARK now (frame 18:1694)
     and arrives black-over-black behind that fade. */
  /* Blur-band dissolve over the final card pitch (see BAND_FADE_PX):
     radii drain to 0 with the scrub; reversal rebuilds them. */
  const blurLayers = Array.from(section.querySelectorAll('[data-gradual-blur-layer]'));
  const blurBases = blurLayers.map((l) => {
    const m = /([\d.]+)rem/.exec(l.style.backdropFilter || '');
    return m ? parseFloat(m[1]) : 0;
  });
  const bandFade = { t: 0 };
  const edgeTint = section.querySelector('[data-featured-edge-tint]');
  const bandEl = section.querySelector('.gradual-blur');
  tl.to(bandFade, {
    t: 1,
    duration: BAND_FADE_PX,
    onUpdate: () => {
      /* R6 item 4 (Oscar 2026-08-27, the escaped-gradient class):
         a fully-drained band previously kept blur(0rem) — two
         stacked layers remaining ACTIVE BACKDROP ROOTS through the
         whole departure/boundary, the window where Chrome's
         backdrop sampling under sticky ancestors is known to paint
         the blur detached from its element (the element itself
         never moves — verified over randomised passes — and the
         stage clips overflow; the artifact is compositing-level).
         Drained now means NO backdrop root anywhere: filters go
         'none' and the band goes visibility-hidden, both pure
         functions of the same scrubbed value — reversal rebuilds
         them exactly. */
      const drained = bandFade.t >= 0.999;
      blurLayers.forEach((l, i) => {
        const r = blurBases[i] * (1 - bandFade.t);
        const v = drained || r < 0.004 ? 'none' : `blur(${r.toFixed(3)}rem)`;
        l.style.backdropFilter = v;
        l.style.webkitBackdropFilter = v;
      });
      if (bandEl instanceof HTMLElement) {
        bandEl.style.visibility = drained ? 'hidden' : '';
      }
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
      placement: () => lastPlacement,
    };
  }

  return () => {
    disposed = true;
    removeGate();
    cleanupCursor();
    timeouts.forEach(clearTimeout);
    window.removeEventListener('resize', onResize);
    revealTrigger?.kill();
    lightFade.scrollTrigger?.kill();
    lightFade.kill();
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
