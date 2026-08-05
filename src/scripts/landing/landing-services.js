/**
 * SERVICES (/landing) — intro line, title morph, stacked pillar
 * cards, and the fade-to-black into Our Network. Figma 13:1729
 * (pre-stack internals/copy) + 13:2066 (post-stack geometry — the
 * authority; Oscar's call).
 *
 * SEQUENCE (one master ScrollTrigger, pinned at the section top,
 * scrubbed over RUNWAY_PX; every beat is a window on the same
 * timeline — the access-section single-progress discipline):
 *
 *   0 ....... 500    BEAT A — the centred title rises top-left and
 *                    MORPHS into the small OUR SERVICES: a
 *                    position-scrubbed cross-resolve (FLIP-style).
 *                    Two instances, because string/face/colour/blend
 *                    ALL change (Serrif "OUR SERVICES. FROM" 40px ink
 *                    -> Dazzed "OUR SERVICES" 16px white difference):
 *                    the large block travels+scales toward the small
 *                    box (origin = the serrif run's top-left, so
 *                    scaling pins that corner; scaling DOWN stays
 *                    sharp), FROM + line 2 fade/blur out over the
 *                    first half (Oscar-approved; line-wipe held in
 *                    reserve), and at 55-75% the large instance blurs
 *                    out while the small blurs in at its exact
 *                    anchor. Endpoints pixel-match both frames by
 *                    construction. The blend-bearing small instance
 *                    NEVER transforms.
 *   500 ..... 2900   BEATS B/C/D — each card rises from below the
 *                    viewport (800px each) and parks with its divider
 *                    at 158/308/458 (the post-stack 150px offsets).
 *                    Cards are opaque and rigid; occlusion is free.
 *   2900 .... 4254   BEAT F (Oscar's rev — the stack DEPARTS instead
 *                    of fading): after a 250px dwell the whole
 *                    assembly (three cards + the small title) scrolls
 *                    up and off the top at 1:1 scroll speed (travel =
 *                    card 3's parked y + card height = 1104px — the
 *                    exact distance for the bottom card to clear),
 *                    while the ground fades to #161616 over the final
 *                    500px. The scrub still ends exactly as Our
 *                    Network's top crosses the viewport bottom —
 *                    black-on-black preserved. The small title rides
 *                    via `top` (layout), never transform: it carries
 *                    the difference blend.
 *
 * SNAP (Oscar-approved scope): Lenis-idle mechanism (the access
 * section's proven single-authority pattern — never ScrollTrigger's
 * own snap) to the beat boundaries 0/500/1300/2100/2900, active only
 * while inside beats A-D; Beat F stays free (matching the live
 * fade's unsnapped behaviour).
 *
 * Also unchanged from the original module: the O-of-OUR onto
 * first-S-of-ACCESS glyph alignment (Range-derived, pre-wrap) and
 * the 65% entrance reveal.
 *
 * Reduced motion: static post-stack frame via CSS (cards' default
 * transform = parked, large title hidden, section 100dvh); JS does
 * alignment only.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;

/* Beat lengths (scroll px). */
const MORPH_PX = 500;
const CARD_PX = 800;
const CARD_COUNT = 3;
/* Beat F — dwell kept from the original transition; the fade is now
   a DEPARTURE (Oscar's rev): the assembly scrolls off at 1:1. */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_GROUND_FADE_PX = 500; // final-500px ground fade
const GROUND_DARK = '#161616';
const CARD_H = 646;

/* Post-stack parked divider positions (83px chrome offset removed). */
const PARKED_Y = [158, 308, 458];

const STACK_PX = MORPH_PX + CARD_COUNT * CARD_PX; // 2900 — snap ceiling
/* 1:1 departure travel: bottom card's parked top + its height. */
const EXIT_PX = PARKED_Y[CARD_COUNT - 1] + CARD_H; // 1104
const RUNWAY_PX = STACK_PX + TRANSITION_DWELL_PX + EXIT_PX; // 4254
/* Keep landing.css's .landing-outro height (100dvh + RUNWAY_PX) in step. */
const SMALL_SCALE = 16 / 40; // large 40px -> small 16px

/* Beat A choreography fractions (of MORPH_PX). The resolve windows
   OVERLAP (Oscar's rev: the text must always be present — the first
   cut faded large out then small in near-sequentially, which read as
   a disappear/reappear): the small instance is fully in BEFORE the
   large finishes leaving, so combined visibility never dips. */
const EXIT_END = 0.5; // FROM + line 2 gone by here
const SMALL_IN_START = 0.45;
const SMALL_IN_END = 0.7;
const LARGE_OUT_START = 0.6;
const LARGE_OUT_END = 0.85;
const MORPH_BLUR_PX = 4;

/* Snap — the access section's Lenis-idle constants. */
const SNAP_IDLE_MS = 150;
const SNAP_DURATION_S = 0.6;
const SNAP_TARGETS = [0, 500, 1300, 2100, 2900];

/** Index of the alignment glyph — the first S of "ACCESS. TO IMPACT.". */
const ALIGN_CHAR_INDEX = 4;

function alignServicesLines(line1, line2) {
  if (!(line1 instanceof HTMLElement) || !(line2 instanceof HTMLElement)) return;
  const textNode = line2.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

  line1.style.marginLeft = '0px';
  const range = document.createRange();
  range.setStart(textNode, ALIGN_CHAR_INDEX);
  range.setEnd(textNode, ALIGN_CHAR_INDEX + 1);
  const sRect = range.getBoundingClientRect();
  if (sRect.width === 0) return;
  const offset = sRect.left - line2.getBoundingClientRect().left;
  line1.style.marginLeft = `${offset.toFixed(2)}px`;
}

export function initLandingServices() {
  const section = document.querySelector('[data-landing-services]');
  const line1 = document.querySelector('[data-landing-services-line1]');
  const line2 = document.querySelector('[data-landing-services-line2]');
  if (!(section instanceof HTMLElement)) return () => {};

  const stage = section.querySelector('[data-services-stage]');
  const title = section.querySelector('[data-landing-services-title]');
  const small = section.querySelector('[data-services-small]');
  const cards = Array.from(section.querySelectorAll('[data-services-card]'));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  let disposed = false;
  let trigger = null;
  let masterTl = null;
  let snapTimer = 0;
  let lastSnapTarget = null;

  /* Non-RM: park the cards below the viewport and hide the small
     instance NOW (before fonts/paint) — the CSS default is the
     parked RM frame. */
  if (!reduced && stage instanceof HTMLElement) {
    const stageH = () => stage.clientHeight || window.innerHeight;
    cards.forEach((card) => gsap.set(card, { y: stageH() }));
    if (small instanceof HTMLElement) {
      gsap.set(small, { opacity: 0, filter: `blur(${MORPH_BLUR_PX}px)` });
    }
  }

  const onResize = () => alignServicesLines(line1, line2);

  fontsReady.then(() => {
    if (disposed) return;

    /* Alignment first — the Range measure needs line 2's raw text
       node, which the reveal wrap replaces. */
    alignServicesLines(line1, line2);
    window.addEventListener('resize', onResize);

    if (reduced) return;

    /* Wrap BEFORE building the morph: the wrap clones line children
       (outerHTML atoms), so refs must be queried post-wrap. */
    const lines = [line1, line2].filter((el) => el instanceof HTMLElement);
    lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });

    const serrifSpan = line1?.querySelector('.landing-services__serrif');
    const fromSpan = line1?.querySelector('[data-services-from]');

    if (!(stage instanceof HTMLElement) || !(title instanceof HTMLElement) || !(small instanceof HTMLElement)) {
      return;
    }

    /* ── The morph's FLIP measure: transform-origin = the serrif
       run's top-left within the title block (so the scale pins that
       corner), delta = small box top-left minus that corner. Re-run
       on every refresh with the transform cleared. */
    const morph = { dx: 0, dy: 0 };
    const measureMorph = () => {
      const saved = title.style.transform;
      title.style.transform = 'none';
      /* Neutralise the reveal state for the measure: pre-reveal the
         lr-inners sit at translateY(110%) inside their clips, which
         would leak ~44px into the serrif rect. */
      const inners = Array.from(title.querySelectorAll('.lr-inner'));
      const savedInners = inners.map((el) => el.style.transform);
      inners.forEach((el) => { el.style.transform = 'translateY(0)'; });
      const titleRect = title.getBoundingClientRect();
      const srcRect = (serrifSpan ?? title).getBoundingClientRect();
      const smallRect = small.getBoundingClientRect();
      title.style.transformOrigin = `${(srcRect.left - titleRect.left).toFixed(2)}px ${(srcRect.top - titleRect.top).toFixed(2)}px`;
      morph.dx = smallRect.left - srcRect.left;
      morph.dy = smallRect.top + smallRect.height / 2 - (srcRect.top + (srcRect.height * SMALL_SCALE) / 2);
      inners.forEach((el, i) => { el.style.transform = savedInners[i]; });
      title.style.transform = saved;
    };
    measureMorph();

    /* ── Snap (beats A-D only; Beat F free). Single authority:
       through Lenis, the access pattern. */
    const trySnap = () => {
      if (!trigger) return;
      const rel = (window.scrollY || 0) - trigger.start;
      if (rel <= 0.5 || rel >= STACK_PX - 0.5) return;
      let nearest = SNAP_TARGETS[0];
      for (const t of SNAP_TARGETS) {
        if (Math.abs(rel - t) < Math.abs(rel - nearest)) nearest = t;
      }
      if (Math.abs(rel - nearest) < 1) return;
      const lenis = getLenisInstance();
      if (!lenis) return;
      lastSnapTarget = trigger.start + nearest;
      lenis.scrollTo(lastSnapTarget, {
        duration: SNAP_DURATION_S,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    };

    /* ── The master timeline. Duration units = scroll px (1:1). */
    const stageH = () => stage.clientHeight || window.innerHeight;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${RUNWAY_PX}`,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: () => measureMorph(),
        onUpdate: () => {
          window.clearTimeout(snapTimer);
          snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
        },
      },
    });

    /* BEAT A — rise + morph. */
    tl.to(title, {
      x: () => morph.dx,
      y: () => morph.dy,
      scale: SMALL_SCALE,
      duration: MORPH_PX,
    }, 0);
    const exitTargets = [fromSpan, line2].filter((el) => el instanceof HTMLElement);
    if (exitTargets.length) {
      tl.to(exitTargets, {
        opacity: 0,
        filter: `blur(${MORPH_BLUR_PX}px)`,
        duration: MORPH_PX * EXIT_END,
      }, 0);
    }
    tl.to(small, {
      opacity: 1,
      filter: 'blur(0px)',
      duration: MORPH_PX * (SMALL_IN_END - SMALL_IN_START),
    }, MORPH_PX * SMALL_IN_START);
    tl.to(title, {
      opacity: 0,
      filter: `blur(${MORPH_BLUR_PX}px)`,
      duration: MORPH_PX * (LARGE_OUT_END - LARGE_OUT_START),
    }, MORPH_PX * LARGE_OUT_START);

    /* BEATS B/C/D — the cards. fromTo with function-based starts so
       refresh re-derives the below-viewport park. */
    cards.forEach((card, i) => {
      tl.fromTo(card,
        { y: () => stageH() },
        { y: PARKED_Y[i], duration: CARD_PX, ease: 'power1.out', immediateRender: false },
        MORPH_PX + i * CARD_PX,
      );
    });

    /* BEAT F — the departure (Oscar's rev): the whole assembly
       scrolls up and off at 1:1 after the dwell. Cards ride their
       transform (safe — their difference titles blend inside the
       card's own context); the small title rides `top` (layout),
       NEVER transform — it carries the difference blend itself. */
    cards.forEach((card, i) => {
      tl.to(card, {
        y: PARKED_Y[i] - EXIT_PX,
        duration: EXIT_PX,
      }, STACK_PX + TRANSITION_DWELL_PX);
    });
    tl.to(small, {
      top: `-=${EXIT_PX}`,
      duration: EXIT_PX,
    }, STACK_PX + TRANSITION_DWELL_PX);
    tl.to(stage, {
      backgroundColor: GROUND_DARK,
      duration: TRANSITION_GROUND_FADE_PX,
    }, RUNWAY_PX - TRANSITION_GROUND_FADE_PX);

    masterTl = tl;
    trigger = tl.scrollTrigger ?? null;

    /* Entrance reveal — unchanged. */
    const revealTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        lines.forEach((line) => playLineRevealElement(line));
      },
    });
    cleanupExtra.push(() => revealTrigger.kill());

    if (import.meta.env.DEV) {
      window.__landingServices = {
        trigger: () => trigger,
        morph: () => ({ ...morph, origin: title.style.transformOrigin }),
        lastSnapTarget: () => lastSnapTarget,
        runway: { RUNWAY_PX, STACK_PX, PARKED_Y, SNAP_TARGETS },
      };
    }
  });

  const cleanupExtra = [];

  return () => {
    disposed = true;
    window.clearTimeout(snapTimer);
    window.removeEventListener('resize', onResize);
    cleanupExtra.forEach((fn) => fn());
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
