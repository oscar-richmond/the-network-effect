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
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;

/* Beat lengths (scroll px). */
const MORPH_PX = 500;
const CARD_PX = 800;
const CARD_COUNT = 3;
/* Beat E (Oscar's rev 7) — the settle: after Amplify parks, the
   remaining header bands (Connect's AND Amplify's own) compress
   slowly before the departure begins. Replaces the old 250 dwell. */
const BAND_SETTLE_PX = 500;
/* The fade-to-black formerly here now lives in landing-featured.js
   (Beat F relocated for the Featured Work insertion — the stack
   releases on LIGHT ground). */
const CARD_H = 646;

/* Parked divider positions — COMPRESSED stack (Oscar's revs 5+6):
   the peek strip is built from SYMMETRIC 24px gaps around the
   covered card's secondary title. The desc block sits 50..110
   inside its card; as the next card lands, the covered card's
   header band (title row + desc) eases UP by BAND_SHIFT so the
   divider->text gap lands at 24, and the covering divider parks
   24 below the text: strip = (110 - 26) + 24 = 108. Amplify's
   image bottom = 374 + 530 = 904 — well inside the viewport. */
const DESC_TOP_PX = 50; // desc block top inside the card (the rest gap)
const DESC_BOTTOM_PX = 110; // desc block bottom
const BAND_GAP_PX = 32; // the compressed symmetric gap (Oscar's rev 9 — was 24)
const BAND_SHIFT_PX = DESC_TOP_PX - BAND_GAP_PX; // 18
/* Two-stage stacking (Oscar's rev 8): a covering card FIRST lands
   rest-symmetric — 50 above and 50 below the covered title, the
   same air it had coming in (step 110 + 50 = 160) — and only when
   the NEXT row rises does the pair compress to 24/24: the covered
   band eases up 26 while the covering card slides up 52, in the
   same window, landing at the final 108 step. */
const STEP_REST_PX = DESC_BOTTOM_PX + DESC_TOP_PX; // 160 — first landing
const CARD_STEP_PX = DESC_BOTTOM_PX - BAND_SHIFT_PX + BAND_GAP_PX; // 124 — final
const FIRST_PARK_Y = [158, 158 + STEP_REST_PX, 158 + CARD_STEP_PX + STEP_REST_PX]; // 158/318/442
const PARKED_Y = [158, 158 + CARD_STEP_PX, 158 + 2 * CARD_STEP_PX]; // 158/282/406 — final
/* The header band = title row + image + secondary title (Oscar's
   rev 7: the image joins, ending BAND_GAP_PX from the line too).
   Targets = CSS tops minus BAND_SHIFT_PX. */
const BAND_TARGETS = [
  ['.landing-svc-card__titlerow', 56 - BAND_SHIFT_PX], // 38
  ['.landing-svc-card__desc', 80 - BAND_SHIFT_PX], // 62
  ['.landing-svc-card__img', 50 - BAND_SHIFT_PX], // 32
];
/* The lower right column rides UP with the band (Oscar's rev 10 —
   Amplify's visible list/button were drifting 18px further from the
   desc as the band compressed; now the 64/24/80 rhythm below the
   secondary title is preserved). These tops are per-card (inline
   vars), so they shift by transform — safe, no blends inside. */
const BAND_RIDERS = [
  '.landing-svc-card__listhead',
  '.landing-svc-card__lists',
  '.landing-svc-card__btn',
];

/* Cards start EARLY (Oscar's revs 4+11): IMMERSE begins rising at
   the morph's QUARTER point — while FROM/ACCESS fade and the title
   shrinks — and the others keep the same 800px spacing after it. */
const CARD_START_PX = MORPH_PX * 0.25; // 125
const STACK_PX = CARD_START_PX + CARD_COUNT * CARD_PX; // 2525 — snap ceiling
/* 1:1 departure travel: bottom card's parked top + its height. */
const EXIT_PX = PARKED_Y[CARD_COUNT - 1] + CARD_H; // 1104
const RUNWAY_PX = STACK_PX + BAND_SETTLE_PX + EXIT_PX; // 4077
/* Keep landing.css's .landing-outro height (100dvh + RUNWAY_PX) in step. */
const SMALL_SCALE = 16 / 40; // large 40px -> small 16px

/* Beat A choreography fractions (of MORPH_PX). SINGLE INSTANCE
   (Oscar's rev 3): no cross-resolve at all — the Serrif OUR
   SERVICES. itself travels to the corner and scales to the small
   size, staying Serrif throughout. The old Dazzed twin survives
   only as the invisible position anchor (and the RM corner title,
   restyled Serrif to match). */
const EXIT_END = 0.5; // FROM + line 2 gone by here
const MORPH_BLUR_PX = 4; // the FROM/line-2 exit blur

/* Snap — the access section's Lenis-idle constants. */
const SNAP_IDLE_MS = 150;
const SNAP_DURATION_S = 0.6;
/* Rest points: section top + each card fully parked (morph-end is no
   longer a boundary — card 1 is mid-flight there). */
const SNAP_TARGETS = [0, 925, 1725, 2525];

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
      wrapWordRevealElement(line);
    });

    /* Stack-card text word-reveals (Oscar's rev): every text on the
       cards takes the entry transition, fired as each card's rise
       window begins (master onUpdate below). BLEND: title + /0N are
       difference INSIDE the card — the clips go INSIDE those spans
       (descendant transforms are blend-safe); wrapping the row
       would put the blend elements under moving ancestors. */
    const svcCardTexts = cards.map((card) => {
      const parts = [];
      const add = (el, baseDelay) => {
        if (!(el instanceof HTMLElement)) return;
        wrapWordRevealElement(el, { baseDelay });
        parts.push(el);
      };
      add(card.querySelector('.landing-svc-card__title'), 0);
      add(card.querySelector('.landing-svc-card__index'), 0.04);
      /* Desc = 2 authored lines (data contract), so the head lands
         one line-step after them; items row-by-row, columns nudged
         L->R; MORE INFO after the deepest column. */
      add(card.querySelector('.landing-svc-card__desc'), LINE_STAGGER_S);
      add(card.querySelector('.landing-svc-card__listhead'), 3 * LINE_STAGGER_S);
      let maxRows = 0;
      Array.from(card.querySelectorAll('.landing-svc-card__col')).forEach((col, c) => {
        Array.from(col.children).forEach((li, r) => {
          maxRows = Math.max(maxRows, r + 1);
          add(li, 4 * LINE_STAGGER_S + r * LINE_STAGGER_S + c * 0.04);
        });
      });
      add(card.querySelector('.landing-svc-card__btn'), (4 + maxRows) * LINE_STAGGER_S);
      return parts;
    });
    const svcCardPlayed = cards.map(() => false);
    const playCardTexts = (i) => {
      if (svcCardPlayed[i]) return;
      svcCardPlayed[i] = true;
      svcCardTexts[i].forEach((el) => playLineRevealElement(el));
    };

    const serrifSpan = line1?.querySelector('.landing-services__serrif');
    const fromSpan = line1?.querySelector('[data-services-from]');
    const stopSpan = line1?.querySelector('[data-services-stop]');

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
        onUpdate: (self) => {
          window.clearTimeout(snapTimer);
          snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
          /* Card text reveals — as each rise window begins. */
          const px = self.progress * RUNWAY_PX;
          for (let i = 0; i < cards.length; i += 1) {
            if (px >= CARD_START_PX + i * CARD_PX) playCardTexts(i);
          }
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
    /* The exit text (". FROM" + line 2) leaves LEFT-TO-RIGHT per
       char — the nav-entrance vocabulary, scrub-driven (Oscar's
       rev): each char is its own blur/fade, staggered in reading
       order across the same exit window. Chars are wrapped INSIDE
       the reveal inners (safe descendants; kerning loss accepted —
       the nav ripple's own trade). */
    const charWrapText = (el) => {
      const out = [];
      if (!(el instanceof HTMLElement)) return out;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let tn;
      while ((tn = walker.nextNode())) textNodes.push(tn);
      textNodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        for (const ch of node.textContent ?? '') {
          const s = document.createElement('span');
          s.className = 'svc-exit-char';
          s.style.whiteSpace = 'pre';
          s.textContent = ch;
          frag.appendChild(s);
          out.push(s);
        }
        node.parentNode?.replaceChild(frag, node);
      });
      return out;
    };
    const exitChars = [
      ...charWrapText(stopSpan),
      ...charWrapText(fromSpan),
      ...(line2 instanceof HTMLElement
        ? Array.from(line2.querySelectorAll('.lr-inner')).flatMap((inn) => charWrapText(inn))
        : []),
    ];
    if (exitChars.length) {
      const EXIT_WINDOW_PX = MORPH_PX * EXIT_END;
      const CHAR_SPAN_PX = 80;
      tl.fromTo(exitChars,
        { opacity: 1, filter: 'blur(0px)' },
        {
          opacity: 0,
          filter: `blur(${MORPH_BLUR_PX}px)`,
          duration: CHAR_SPAN_PX,
          ease: 'none',
          immediateRender: false,
          stagger: { each: (EXIT_WINDOW_PX - CHAR_SPAN_PX) / Math.max(exitChars.length - 1, 1) },
        }, 0);
    }
    /* No resolve: the title simply IS the corner text once parked
       (the anchor stays hidden — it only supplies the FLIP target). */

    /* BEATS B/C/D — the cards. fromTo with function-based starts so
       refresh re-derives the below-viewport park. Each card's
       divider FILL drains scaleX 1 -> 0 across the SAME beat window
       (linear on the beat progress), completing exactly at park —
       pure f(master progress), reversible like everything else. */
    cards.forEach((card, i) => {
      tl.fromTo(card,
        { y: () => stageH() },
        { y: FIRST_PARK_Y[i], duration: CARD_PX, ease: 'power1.out', immediateRender: false },
        CARD_START_PX + i * CARD_PX,
      );
      const fill = card.querySelector('[data-services-divider-fill]');
      if (fill instanceof HTMLElement) {
        tl.fromTo(fill,
          { scaleX: 1 },
          { scaleX: 0, duration: CARD_PX, ease: 'none', immediateRender: false },
          CARD_START_PX + i * CARD_PX,
        );
      }

    });

    /* BAND COMPRESSIONS (Oscar's rev 7): each header band (title
       row + image + secondary title) moves ONLY AFTER the line
       below it has landed, then eases up slowly — card 1 during
       Amplify's rise, cards 2 and 3 (Amplify settles its own
       header for the uniform 24px look) during the settle window
       after the stack completes. All via layout `top` (the title
       rows carry difference blends — never transform); the moment
       between a cover landing and its band compressing carries a
       ~2px transient kiss of the covered text against the divider,
       by construction. */
    const addBandTweens = (card, at, dur) => {
      BAND_TARGETS.forEach(([sel, top]) => {
        const el = card.querySelector(sel);
        if (el instanceof HTMLElement) {
          tl.to(el, { top, duration: dur, ease: 'power1.inOut' }, at);
        }
      });
      BAND_RIDERS.forEach((sel) => {
        const el = card.querySelector(sel);
        if (el instanceof HTMLElement) {
          tl.to(el, { y: -BAND_SHIFT_PX, duration: dur, ease: 'power1.inOut' }, at);
        }
      });
    };
    addBandTweens(cards[0], CARD_START_PX + 2 * CARD_PX, CARD_PX);
    addBandTweens(cards[1], STACK_PX, BAND_SETTLE_PX);
    addBandTweens(cards[2], STACK_PX, BAND_SETTLE_PX);
    /* The covering cards' compression slides (rest 160 step -> final
       108): Connect closes over Immerse while Amplify rises; Amplify
       closes over Connect during the settle — same windows and ease
       as the band compressions they pair with. */
    tl.to(cards[1], {
      y: PARKED_Y[1], duration: CARD_PX, ease: 'power1.inOut', immediateRender: false,
    }, CARD_START_PX + 2 * CARD_PX);
    tl.to(cards[2], {
      y: PARKED_Y[2], duration: BAND_SETTLE_PX, ease: 'power1.inOut', immediateRender: false,
    }, STACK_PX);

    /* ROLL-OVER WIPES (Oscar's rev — the hero exit-wipe brought to
       the stack): as an incoming card's top edge rides over the
       card beneath, the covered card's lower column blurs out
       piece by piece at the moment the edge reaches it — MORE INFO
       first, then each list row bottom-up, then the list head. The
       image and the secondary title stay (the surviving band; the
       image is simply covered). Each wipe is a scrubbed fromTo
       positioned at the DERIVED edge-crossing: the incoming rise
       (power1.out from stageH) sampled against the covered card's
       own slide — constructional sync, reversible like everything
       else. Wipes ride opacity/filter; the riders' y tweens on the
       same elements are separate properties, no conflict. */
    const WIPE_LEAD_PX = 40;
    const WIPE_SPAN_PX = 120;
    const WIPE_BLUR_PX = 6;
    const coverPairs = [
      { covered: 0, incoming: 1, coveredFrom: FIRST_PARK_Y[0], coveredTo: FIRST_PARK_Y[0] },
      { covered: 1, incoming: 2, coveredFrom: FIRST_PARK_Y[1], coveredTo: PARKED_Y[1] },
    ];
    coverPairs.forEach(({ covered, incoming, coveredFrom, coveredTo }) => {
      const card = cards[covered];
      if (!(card instanceof HTMLElement)) return;
      const windowStart = CARD_START_PX + incoming * CARD_PX;
      const cardRect = card.getBoundingClientRect();
      const offsetBottom = (el) => el.getBoundingClientRect().bottom - cardRect.top;
      /* Wipe units: MORE INFO, the list rows (lis grouped by row
         across columns), the list head. */
      const units = [];
      const btn = card.querySelector('.landing-svc-card__btn');
      if (btn instanceof HTMLElement) units.push({ els: [btn], bottom: offsetBottom(btn) });
      const rowMap = new Map();
      card.querySelectorAll('.landing-svc-card__col > li').forEach((li) => {
        if (!(li instanceof HTMLElement)) return;
        const b = offsetBottom(li);
        const key = Math.round(b / 8);
        if (!rowMap.has(key)) rowMap.set(key, { els: [], bottom: 0 });
        const g = rowMap.get(key);
        g.els.push(li);
        g.bottom = Math.max(g.bottom, b);
      });
      units.push(...rowMap.values());
      const listhead = card.querySelector('.landing-svc-card__listhead');
      if (listhead instanceof HTMLElement) units.push({ els: [listhead], bottom: offsetBottom(listhead) });
      /* Edge-crossing solve: incoming top vs unit bottom (+lead). */
      const S = stageH();
      const F = FIRST_PARK_Y[incoming];
      const solveT = (bottom) => {
        for (let k = 0; k <= 400; k += 1) {
          const t = k / 400;
          const yIn = S + (F - S) * (1 - (1 - t) * (1 - t));
          const yCov = coveredFrom + (coveredTo - coveredFrom) * t;
          if (yIn <= yCov + bottom + WIPE_LEAD_PX) return t;
        }
        return 1;
      };
      units.forEach(({ els, bottom }) => {
        tl.fromTo(els,
          { opacity: 1, filter: 'blur(0px)' },
          {
            opacity: 0,
            filter: `blur(${WIPE_BLUR_PX}px)`,
            duration: WIPE_SPAN_PX,
            ease: 'none',
            immediateRender: false,
          }, windowStart + solveT(bottom) * CARD_PX);
      });
    });

    /* BEAT F — the departure (Oscar's rev): the whole assembly
       scrolls up and off at 1:1 after the settle. Cards ride their
       transform (safe — their difference titles blend inside the
       card's own context); the small title rides `top` (layout),
       NEVER transform — it carries the difference blend itself. */
    cards.forEach((card, i) => {
      tl.to(card, {
        y: PARKED_Y[i] - EXIT_PX,
        duration: EXIT_PX,
      }, STACK_PX + BAND_SETTLE_PX);
    });
    /* The corner title (the travelled Serrif instance) departs with
       the assembly — transform is fine, it carries no blend. */
    tl.to(title, {
      y: () => morph.dy - EXIT_PX,
      duration: EXIT_PX,
    }, STACK_PX + BAND_SETTLE_PX);
    /* NO FADE (the Featured Work insertion): the stack departs on
       the LIGHT ground and the fade-to-black lives in
       landing-featured.js now (Beat F relocated, constants
       verbatim, moved not duplicated). The departure itself is
       unchanged. */

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
