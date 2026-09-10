/**
 * WE CREATE ACCESS — opposed HORIZONTAL rows (/landing; file
 * CpGcHLnIKga7iufELZpYQ5 frame 0:91, 2026-08-25 — the vertical
 * columns retire, the mechanism survives).
 *
 * THE MECHANISM (lockstep by construction, kept): one ScrollTrigger
 * scrub produces a single progress p; every moving part is a pure
 * function of it — top row x = −p·travel, bottom row +p·travel, the
 * veil strips mirror their rows, the word slots and the wave feeds
 * derive from the same number. The bottom strip's DOM runs pairs
 * 6→1 (the mobile rows' reversal device — the shipped right
 * column's own order), so the matched pair lands together BY
 * CONSTRUCTION. Top row travels LEFT, bottom RIGHT (the frame's
 * −374/−480 phase offsets only construct that way).
 *
 * LANDED GEOMETRY (frame): 640×340 cells on a 648 pitch; the landed
 * pair sits STAGGERED about the page centre — top cell centre at
 * 50% − 270, bottom at 50% + 272. Words: Serrif Regular 56, white
 * difference, centred 344 inside the landed cell.
 *
 * STAGE: 1446px, bottom-anchored sticky (the network pattern) — the
 * frame is taller than real viewports; you get its own window.
 *
 * SNAP: unchanged — Lenis-idle, one scroll authority.
 *
 * MEDIA SHADER: access-wave with axis "x" (the bow transposed onto
 * the travel axis; planes track rects, so placement is free).
 *
 * BLEND MAP (kept): difference word slots move by layout LEFT in an
 * untransformed layer (section > stage ancestors only); the
 * translated rows, canvas and veils are earlier siblings — backdrop,
 * never blend ancestors.
 *
 * ENTER/EXIT (the shipped character, rotated 90°): rows slide in
 * from the sides along their travel directions at the pin approach;
 * after pair 6 they continue out the sides at 1:1 over EXIT_PX,
 * words fading on the shipped constant.
 *
 * Reduced motion: no init — the authored markup + CSS is the static
 * pair-1 frame (landed pair sharp, neighbours veiled, words in).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { ACCESS_PAIRS } from '../../data/landing/access-pairs.js';
import { isMobileViewport, isPhoneViewport } from './viewport.js';
import { featuredUnitBottomCrossAt, featuredPhonePin } from './landing-featured.js';
import { trackVisibleBottom, smallViewportPx } from './m-viewport.js';

/* R27 item 2 (Oscar, 2026-09-03) — THE MUCH EARLIER ENTRANCE: this
   section begins entering AS FEATURED WORK IS LEAVING — its headline's
   top crosses the viewport bottom the moment the departing carousel
   unit's measured BOTTOM edge crosses the viewport at this fraction of
   its height (0.5 = the midpoint). A measured-edge trigger, never a
   fade percentage or offset (the Who We Are lesson). The section's
   overlap margin is derived from it (placeEntry below) and the
   headline reveal fires on the same scroll — supersedes the R6
   carousel-leaving-nav gate (featuredCarouselExitsNavAt). The ground
   is dark on both sides by construction: the stage is still #161616
   there, and this section's ground rides the featured tail fade
   (landing-featured.js, R27 item 1). The gap between the incoming
   headline and the departing metas is vh/2 at entry and constant
   through the overlap (both move 1:1). */
const ACCESS_ENTER_AT_CAROUSEL_BOTTOM_T = 0.5;

gsap.registerPlugin(ScrollTrigger);

/* ── Horizontal geometry (frame 0:91) ─────────────────────────── */
const CELL_W = 640;
const X_PITCH = 648; // 640 + 8 gap
const STEPS = 5; // six pairs, five transitions
const STEP_SCROLL_PX = 400; // scroll runway per pair transition (kept)
const RUNWAY_PX = STEPS * STEP_SCROLL_PX; // 2000
const X_TRAVEL_PX = STEPS * X_PITCH; // 3240
const STAGE_H_PX = 1446; // the frame's content height (bottom-anchored)
/* Landed pair, STAGGERED about the centre (frame): */
const LAND_OFFSET_TOP_PX = -270;
const LAND_OFFSET_BOTTOM_PX = 272;
/* Strip bases (frame −374/−480 at 1728, centre-anchored): the top
   strip's pair k sits at DOM index 1+k, the bottom's at 7−k. */
const TOP_PAIR_INDEX = (k) => 1 + k;
/* Bottom indices re-derived after the trailing-cell removal (Oscar
   2026-08-26): the two lead pads are gone, so pair k sits at 5−k and
   the base moves right by exactly two pitches (−4584 + 1296) — every
   pair still lands at shift 648·k, byte-identical scroll positions. */
const BOTTOM_PAIR_INDEX = (k) => 5 - k;
const baseTop = (vw) => vw / 2 - 1238;
const baseBottom = (vw) => vw / 2 - 3288;
/* THE EXIT — sideways at 1:1. 1650 (Oscar 2026-08-26, was 1900):
   with the row collapse finishing at exit-shift ~872, the old tail
   was dead scroll over an empty stage; 1650 brings the CLOSING
   section's arrival to when the final pair sits ~100px from fully
   leaving the viewport sides (arrival exit-shift = EXIT_PX − the
   closing's 50dvh+300 overlap ≈ 810 at 1080vh vs full exit at 914).
   Everything below rides up by the trimmed 250. */
const EXIT_PX = 1650;
const TOTAL_RUNWAY_PX = RUNWAY_PX + EXIT_PX; // 3650
const EXIT_WORD_FADE_T = 0.15; // words gone by 15% of the exit (kept)
/* Off-centre treatment (frame): 60%-over-ground dim ≡ ground veil at
   0.4 + the drawn 10px blur; dead zone as shipped. */
const BLUR_DEAD_FRACTION = 0.5;
const VEIL_BLUR_PX = 10;
const VEIL_RGB = '238,238,240';
const VEIL_ALPHA = 0.4;
/* Words: centred 344 in the cell (x148). THE WINDOW (Oscar,
   2026-08-26 — was a bare ramp to 0.35×pitch, full only at dead
   centre): a TRAPEZOID of distance-from-the-landed-slot — solid
   within WORD_FULL_PX, ramping out to WORD_WINDOW_PX. Adjacent
   pair cells sit one 648 pitch apart, so two words share a row iff
   the window exceeds HALF A PITCH (324) — the hard maximum. 290
   keeps a guaranteed 68px word-free band between neighbours; both
   rows read the same progress, so a pair's words stay in lockstep
   at every position. Tune these two by feel. */
const WORD_X_IN_CELL_PX = 148;
const WORD_WINDOW_PX = 290; // opacity reaches 0 here (max safe: 324)
const WORD_FULL_PX = 140;   // fully solid within this distance
const LINE_STAGGER_S = 0.12;
const WORDS_AT_MS = 700;
const ENTRY_CURVE = 'transform 1.2s cubic-bezier(0.42, 0, 0.24, 1)';
const SNAP_IDLE_MS = 150;
const SNAP_DURATION_S = 0.6;
/* ── THE READ-HOLD (Oscar 2026-08-26, scroll-past fix): the stage
   pins TOP-anchored first — the label + headline fully visible —
   for ACCESS_READ_HOLD_PX of scroll, then its sticky `top` SCRUBS
   from 0 down to (vh − stage) over the stage overflow (identical
   motion to the old un-pinned flow-through, now scrub-owned), and
   the travel begins. Layout property only (sticky top) — the
   difference words never gain a transformed ancestor. The section
   is 600 taller (landing.css); the main trigger starts later by
   the same amount. Reversible by construction. */
const ACCESS_READ_HOLD_PX = 600;
/* (R5's ACCESS_ARRIVAL_FADE_T retired 2026-08-27 — the arrival now
   anchors to featuredCarouselExitsNavAt; see the trigger below.) */
/* ── ROW COLLAPSE (Oscar 2026-08-26): BOTH rows' heights shrink
   TOGETHER during the exit, starting the moment the first landed
   cell's edge crosses a viewport edge — derived from geometry per
   frame (min of: top cell's left edge → viewport left = vw/2 − 590;
   bottom cell's right edge → viewport right = vw/2 − 592), never a
   fixed scroll offset. Height is layout (no transforms); the cells
   and imgs shrink WITH the wraps so the GL wave planes (which track
   img rects) collapse in lockstep. */
const ACCESS_COLLAPSE_TRAVEL_PX = 600; /* exit px over which 340 → 0 */
/* HEADLINE EXIT (Oscar 2026-08-26): the label + fragmented lines
   blur-and-fade on EXACTLY the collapse's progress (same cT — they
   can never desync): opacity 1−cT, blur ramping to the site's exit
   blur. Self filters/opacity on plain-ink lines — no blend in this
   text (the difference word slots are a separate layer). */
const ACCESS_HEADLINE_EXIT_BLUR_PX = 12;
const ROW_H_PX = 340;
const collapseStartExitPx = (vw) => Math.min(
  vw / 2 + LAND_OFFSET_TOP_PX - CELL_W / 2,   /* top: vw/2 − 590 */
  vw / 2 - (LAND_OFFSET_BOTTOM_PX + CELL_W / 2), /* bottom: vw/2 − 592 */
);

/** Word pairs — shared source (mobile renders all six statically). */
const PAIRS = ACCESS_PAIRS;

/* THE REBUILD (2026-09-07): below the seam the section runs THIS
   choreography at phone geometry — see buildNarrow at the end of the
   file. The retired mobile design's clock-driven rows (and their
   ACCESS_M_* constants) are gone. The narrow build's runway and exit
   are tokens (landing-narrow.css: --ac-step, --ac-exit). */

/* A1 (Oscar, 2026-09-09) — THE PHONE's ARRIVAL: the section BEGINS
   ENTERING (its top edge at the fold, the label and the seven lines'
   reveal firing) when the departing FEATURED WORK stage's top edge is
   this many px above the top of the viewport — a measured edge: the
   pinned stage releases at landing-featured's releaseAt and leaves at
   1:1, so its top is −150 at releaseAt + 150. Before this the section
   sat after the featured band's 474 tail, so its top reached the fold
   at releaseAt + 474 and its reveal fired at the 70% line, releaseAt +
   736 at 874. The ground module's fade-to-light is sized to this lead
   (m-ground.js), so the light section arrives on a light ground. */
export const ACCESS_ENTER_AFTER_FEATURED_TOP_PX = 150;

export function initLandingAccess() {
  const section = document.querySelector('[data-landing-access]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /* NARROW (the rebuild, 2026-09-07): the same build at phone geometry. */
  if (isMobileViewport()) return buildNarrow(section);

  /* ── DESKTOP — the horizontal rows build. ─────────────────────── */
  const stage = section.querySelector('[data-access-stage]');
  const rows = {
    top: section.querySelector('[data-access-row="top"]'),
    bottom: section.querySelector('[data-access-row="bottom"]'),
  };
  const veilrows = {
    top: section.querySelector('[data-access-veils="top"]'),
    bottom: section.querySelector('[data-access-veils="bottom"]'),
  };
  if (!(stage instanceof HTMLElement) || !rows.top || !rows.bottom) return () => {};

  const cells = {
    top: Array.from(rows.top.children),
    bottom: Array.from(rows.bottom.children),
  };
  const veils = {
    top: Array.from(veilrows.top?.children ?? []),
    bottom: Array.from(veilrows.bottom?.children ?? []),
  };
  const wordSlots = Array.from(section.querySelectorAll('[data-access-wordslot]')).filter(
    (el) => el instanceof HTMLElement,
  );

  const vw = () => window.innerWidth || 1728;
  const landedCentre = (row) =>
    vw() / 2 + (row === 'top' ? LAND_OFFSET_TOP_PX : LAND_OFFSET_BOTTOM_PX);

  /* ── Entrance: park each row's wrappers offscreen ALONG its travel
     direction (top from the right, bottom from the left), measured
     so nothing peeks; slide in on the house curve at the reveal. */
  const entryGroups = {
    top: [
      section.querySelector('.landing-access__rowwrap--top'),
      section.querySelector('.landing-access__veilwrap--top'),
    ].filter((el) => el instanceof HTMLElement),
    bottom: [
      section.querySelector('.landing-access__rowwrap--bottom'),
      section.querySelector('.landing-access__veilwrap--bottom'),
    ].filter((el) => el instanceof HTMLElement),
  };
  const parkOffscreen = () => {
    const w = vw();
    const pad = 24;
    /* Top strip's leftmost cell sits at baseTop; push right until it
       clears the viewport. Bottom strip's rightmost cell ends at
       base + 8·pitch + cell; push left until clear. */
    const parkTop = w - baseTop(w) + pad;
    const parkBottom = -(baseBottom(w) + (cells.bottom.length - 1) * X_PITCH + CELL_W + pad);
    entryGroups.top.forEach((el) => { el.style.transform = `translateX(${parkTop.toFixed(1)}px)`; });
    entryGroups.bottom.forEach((el) => { el.style.transform = `translateX(${parkBottom.toFixed(1)}px)`; });
  };
  parkOffscreen();

  let entered = false;
  const playEntrance = () => {
    if (entered) return;
    entered = true;
    [...entryGroups.top, ...entryGroups.bottom].forEach((el) => {
      el.style.transition = ENTRY_CURVE;
    });
    void section.offsetWidth;
    [...entryGroups.top, ...entryGroups.bottom].forEach((el) => {
      el.style.transform = 'translateX(0px)';
    });
    timeouts.push(setTimeout(() => {
      [...entryGroups.top, ...entryGroups.bottom].forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
      });
    }, 1400));
  };

  /* ── The single shared progress. Everything below is f(p). The
     wordFactor gates the slots' entrance fade WITHOUT a container
     opacity (an opacity ancestor would isolate the blend). */
  const state = { p: 0, travelP: 0, exitT: 0, topVirtual: 0, bottomVirtual: 0, wordFactor: 0 };

  const updateRow = (row, shift) => {
    const base = row === 'top' ? baseTop(vw()) : baseBottom(vw());
    const landed = landedCentre(row);
    const dead = X_PITCH * BLUR_DEAD_FRACTION;
    cells[row].forEach((cell, i) => {
      if (!(cell instanceof HTMLElement)) return;
      const centre = base + i * X_PITCH + CELL_W / 2 + shift;
      const isPad = cell.hasAttribute('data-pad');
      const dist = Math.abs(centre - landed);
      const t = isPad ? 1 : Math.min(Math.max((dist - dead) / (X_PITCH - dead), 0), 1);
      const veil = veils[row][i];
      if (veil instanceof HTMLElement) {
        const blur = VEIL_BLUR_PX * t;
        veil.style.backdropFilter = blur < 0.2 ? 'none' : `blur(${blur.toFixed(1)}px)`;
        veil.style.webkitBackdropFilter = veil.style.backdropFilter;
        veil.style.background = `rgba(${VEIL_RGB},${(VEIL_ALPHA * t).toFixed(3)})`;
      }
    });
  };

  const updateWords = (shiftTop, shiftBottom) => {
    const w = vw();
    const exitFade = Math.max(0, 1 - state.exitT / EXIT_WORD_FADE_T);
    wordSlots.forEach((slot) => {
      const row = slot.dataset.row;
      const k = Number(slot.dataset.pair) || 0;
      const idx = row === 'top' ? TOP_PAIR_INDEX(k) : BOTTOM_PAIR_INDEX(k);
      const base = row === 'top' ? baseTop(w) : baseBottom(w);
      const shift = row === 'top' ? shiftTop : shiftBottom;
      const left = base + idx * X_PITCH + WORD_X_IN_CELL_PX + shift;
      slot.style.left = `${left.toFixed(1)}px`;
      const centre = left - WORD_X_IN_CELL_PX + CELL_W / 2;
      const dist = Math.abs(centre - landedCentre(row));
      const near = dist <= WORD_FULL_PX
        ? 1
        : dist >= WORD_WINDOW_PX
          ? 0
          : 1 - (dist - WORD_FULL_PX) / (WORD_WINDOW_PX - WORD_FULL_PX);
      slot.style.opacity = (near * exitFade * state.wordFactor).toFixed(3);
    });
  };

  const applyProgress = (rawP) => {
    state.p = rawP;
    const rel = rawP * TOTAL_RUNWAY_PX;
    const travelP = Math.min(rel / RUNWAY_PX, 1);
    const exitT = Math.max(0, (rel - RUNWAY_PX) / EXIT_PX);
    state.travelP = travelP;
    state.exitT = exitT;
    const shift = travelP * X_TRAVEL_PX + exitT * EXIT_PX;
    const shiftTop = -shift;
    const shiftBottom = shift;
    state.topVirtual = shift;
    state.bottomVirtual = -shift;
    gsap.set([rows.top, veilrows.top].filter(Boolean), { x: shiftTop });
    gsap.set([rows.bottom, veilrows.bottom].filter(Boolean), { x: shiftBottom });
    updateRow('top', shiftTop);
    updateRow('bottom', shiftBottom);
    updateWords(shiftTop, shiftBottom);
    applyCollapse(exitT * EXIT_PX);
  };

  /* BOTH rows collapse together — see the constants block. Pure
     f(progress): fully reversible on scroll-up. */
  const collapseEls = [
    ...Object.values(entryGroups).flat(),
  ];
  const collapseCells = [...cells.top, ...cells.bottom].filter((c) => c instanceof HTMLElement);
  const collapseImgs = collapseCells.map((c) => c.querySelector('img')).filter((el) => el instanceof HTMLElement);
  const collapseVeils = [...veils.top, ...veils.bottom].filter((v) => v instanceof HTMLElement);
  const headlineEls = [
    section.querySelector('.landing-access__dlabel'),
    ...section.querySelectorAll('[data-access-dline]'),
  ].filter((el) => el instanceof HTMLElement);
  let lastCollapseH = ROW_H_PX;
  const applyCollapse = (exitShiftPx) => {
    const cT = Math.min(Math.max((exitShiftPx - collapseStartExitPx(vw())) / ACCESS_COLLAPSE_TRAVEL_PX, 0), 1);
    const h = ROW_H_PX * (1 - cT);
    if (Math.abs(h - lastCollapseH) < 0.05) return;
    lastCollapseH = h;
    /* Headline exit — the same cT (starts and finishes with the
       collapse; reversible). */
    headlineEls.forEach((el) => {
      el.style.opacity = cT <= 0 ? '' : (1 - cT).toFixed(3);
      el.style.filter = cT <= 0 ? '' : `blur(${(ACCESS_HEADLINE_EXIT_BLUR_PX * cT).toFixed(2)}px)`;
      el.style.visibility = cT >= 1 ? 'hidden' : '';
    });
    const px = h <= 0.05 ? '0px' : `${h.toFixed(1)}px`;
    const clear = h >= ROW_H_PX - 0.05;
    collapseEls.forEach((el) => { el.style.height = clear ? '' : px; });
    collapseCells.forEach((el) => { el.style.height = clear ? '' : px; });
    collapseImgs.forEach((el) => { el.style.height = clear ? '' : px; });
    collapseVeils.forEach((el) => { el.style.height = clear ? '' : px; });
  };

  /* RM statics are CSS (.is-on / .is-prime); live values take over
     now. Clear the authored word states so f(p) owns them. */
  wordSlots.forEach((slot) => slot.classList.remove('is-on'));
  applyProgress(0);

  /* ── Pair snap — the shipped single-authority machinery, verbatim. */
  let snapTimer = 0;
  let lastSnapTarget = null;
  const trySnap = () => {
    const rel = (window.scrollY || 0) - trigger.start;
    if (rel <= 0.5 || rel >= RUNWAY_PX - 0.5) return;
    const target = trigger.start + Math.round(rel / STEP_SCROLL_PX) * STEP_SCROLL_PX;
    if (Math.abs((window.scrollY || 0) - target) < 1) return;
    const lenis = getLenisInstance();
    if (!lenis) return;
    lastSnapTarget = target;
    lenis.scrollTo(target, {
      duration: SNAP_DURATION_S,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  /* Bottom-anchored pin: the sticky engages when the stage bottom
     meets the viewport bottom — section top at (vh − STAGE_H). */
  const trigger = ScrollTrigger.create({
    trigger: section,
    /* +READ_HOLD: the travel begins after the read-hold has consumed
       its extra section scroll (the stage reaches the bottom anchor
       exactly then — see the hold trigger below). */
    start: () => `top+=${ACCESS_READ_HOLD_PX} ${Math.round((window.innerHeight || 1080) - STAGE_H_PX)}px`,
    end: `+=${TOTAL_RUNWAY_PX}`,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      applyProgress(self.progress);
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
    },
  });

  /* ── THE READ-HOLD DRIVER: scrubs the stage's sticky `top` from 0
     (top-anchored — label + headline in full view) through the hold,
     then down to (vh − stage) over the stage overflow so the stage
     rises exactly as the old flow-through did. Set as layout, never
     transform (the blend map holds). Cleared on dispose. */
  const stageOverflow = () => Math.max(STAGE_H_PX - (window.innerHeight || 1080), 0);
  const applyHold = (rel) => {
    if (!(stage instanceof HTMLElement)) return;
    const t = Math.min(Math.max((rel - ACCESS_READ_HOLD_PX) / stageOverflow(), 0), 1);
    stage.style.top = `${(-t * stageOverflow()).toFixed(1)}px`;
  };
  applyHold(-1);
  const holdTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${ACCESS_READ_HOLD_PX + stageOverflow()}`,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      applyHold(self.progress * (ACCESS_READ_HOLD_PX + stageOverflow()));
    },
  });

  /* ── Media shader: REMOVED (A5, 2026-08-27). Its plane query
     targeted a class the rows rebuild retired, so the canvas
     mounted a live GL context and rendered ZERO planes on every
     load — the plain DOM images (the approved staging look) were
     doing all the work. Restoring a warp is a design decision for
     later, not a cleanup. (access-wave.js was kept for the mobile
     /services legacy hero wave; that build retired 2026-09-07 and
     both modules were deleted 2026-09-10 — see git history.) */

  /* ── Arrival: the fragmented headline lines on the house reveal
     (reading order, the established 0.12s stagger); rows slide in
     from the sides as they reach the viewport; words fade up via
     the state gate. */
  const dlines = Array.from(section.querySelectorAll('[data-access-dline]'));
  const timeouts = [];
  let revealTrigger = null;
  let headlineTrigger = null;
  let disposed = false;
  /* R27 item 2: the overlap margin — the headline's top (the label and
     line 1 share it) meets the viewport bottom at the carousel unit's
     bottom-edge crossing. Re-derived with the featured placement
     (fonts, resize); ScrollTrigger refreshes on change since every
     trigger below this section moves with it. */
  const dlabel = section.querySelector('.landing-access__dlabel');
  let lastEntryMargin = null;
  const placeEntry = () => {
    const cross = featuredUnitBottomCrossAt(ACCESS_ENTER_AT_CAROUSEL_BOTTOM_T);
    const featured = document.querySelector('[data-landing-featured]');
    if (cross == null || !(featured instanceof HTMLElement)) return;
    const natural = featured.offsetTop + featured.offsetHeight; /* the flow position: right after Featured */
    const headlineTop = dlabel instanceof HTMLElement && dlabel.offsetTop > 0 ? dlabel.offsetTop : 100;
    const wanted = cross + (window.innerHeight || 1080) - headlineTop;
    const margin = Math.round(wanted - natural);
    if (margin === lastEntryMargin) return;
    lastEntryMargin = margin;
    section.style.marginTop = `${margin}px`;
    ScrollTrigger.refresh();
  };
  const onEntryResize = () => placeEntry();
  window.addEventListener('resize', onEntryResize);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    placeEntry();
    dlines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    /* RE-ANCHORED AGAIN (R6, Oscar 2026-08-27 — supersedes the R5
       fade-50% gate): the label + headline arrival begins AS THE
       FEATURED CAROUSEL'S TOP CROSSES THE NAV WORDMARK'S BOTTOM —
       the carousel starting to leave under the nav, derived from
       its measured top edge against the measured nav bottom
       (featuredCarouselExitsNavAt, the featured module's own
       derivation — shared measurements, no desync). ~650px earlier
       than the fade-50% gate. The rows keep the shipped positional
       threshold; fallback = the pre-R5 positional anchor for any
       regime without the featured pin. */
    headlineTrigger = ScrollTrigger.create({
      trigger: section,
      /* R27 item 2: the reveal fires as the headline enters — the same
         measured crossing that placed the section. */
      start: () => featuredUnitBottomCrossAt(ACCESS_ENTER_AT_CAROUSEL_BOTTOM_T) ?? 'top+=100 bottom',
      once: true,
      onEnter: () => {
        dlines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
      },
    });
    revealTrigger = ScrollTrigger.create({
      trigger: section,
      /* The rows' top edge (stage y718) reaching the viewport bottom
         — the composition is entering. */
      start: 'top+=718 bottom',
      once: true,
      onEnter: () => {
        playEntrance();
        timeouts.push(setTimeout(() => {
          gsap.to(state, {
            wordFactor: 1,
            duration: 0.6,
            ease: 'power1.out',
            onUpdate: () => updateWords(
              -(state.travelP * X_TRAVEL_PX + state.exitT * EXIT_PX),
              state.travelP * X_TRAVEL_PX + state.exitT * EXIT_PX,
            ),
          });
        }, WORDS_AT_MS));
      },
    });
  });

  const onResize = () => {
    if (!entered) parkOffscreen();
    applyProgress(state.p);
  };
  window.addEventListener('resize', onResize);

  if (import.meta.env.DEV) {
    window.__landingAccess = {
      state: () => ({ ...state }),
      lastSnapTarget: () => lastSnapTarget,
      trigger: () => trigger,
    };
  }

  return () => {
    disposed = true;
    window.removeEventListener('resize', onEntryResize);
    section.style.marginTop = '';
    timeouts.forEach(clearTimeout);
    window.clearTimeout(snapTimer);
    window.removeEventListener('resize', onResize);
    trigger.kill();
    holdTrigger.kill();
    revealTrigger?.kill();
    headlineTrigger?.kill();
    if (stage instanceof HTMLElement) stage.style.top = '';
    gsap.killTweensOf(state);
  };
}

/* ═══════════════════════════════════════════════════════════════════
   THE NARROW BUILD (the mobile + tablet rebuild, 2026-09-07) — the
   desktop's composition and choreography at the phone's geometry. ONE
   shared progress drives everything, exactly as above: two rows travel
   in opposite directions and land on the six pairs together, the
   landed cells sharp and the rest veiled, the difference words riding
   the landed cells; then the exit — the words fade, the rows collapse
   to nothing and the fragmented headline blurs out.

   WHAT DIFFERS, and why (each logged in the rebuild report):
   - GEOMETRY from the stylesheet: the cell width, pitch and the landed
     offsets are the rendered cells' (landing-narrow.css sets them per
     band); the runway and the exit are tokens (--ac-step, --ac-exit —
     300 for the desktop's 400 and 1650, retimed for the shorter
     travel). The rows' base positions are measured, not authored.
   - THE PIN is top-anchored (the stage is 100svh and the whole
     composition fits it), so the desktop's read-hold and bottom-
     anchored rise — devices for a stage taller than the viewport —
     are not needed.
   - THE VEILS tint without a backdrop blur; the dim is a filter on the
     cell's own image (cheaper on a phone's GPU than fourteen backdrop
     filters, and the same read: sharp when landed, soft otherwise).
   - NO SNAP: the desktop's idle snap to pair rests rides Lenis's
     wheel scroll; under touch momentum it fights the finger. The pairs
     still land — the scrub is 1:1 — they simply need no assist.
   - THE ENTRANCE is the desktop's: the label and the seven lines
     word-reveal in reading order as the section enters; the rows slide
     in from the sides; the words fade up through the state gate.
   ═══════════════════════════════════════════════════════════════════ */
const NARROW_DIM_BLUR_PX = 4;
const NARROW_WORD_FULL_T = 140 / 648;   /* the desktop's WORD_FULL_PX as a pitch fraction */
const NARROW_WORD_WINDOW_T = 290 / 648; /* the desktop's WORD_WINDOW_PX as a pitch fraction */

function buildNarrow(section) {
  const stage = section.querySelector('[data-access-stage]');
  const rows = {
    top: section.querySelector('[data-access-row="top"]'),
    bottom: section.querySelector('[data-access-row="bottom"]'),
  };
  const veilrows = {
    top: section.querySelector('[data-access-veils="top"]'),
    bottom: section.querySelector('[data-access-veils="bottom"]'),
  };
  if (!(stage instanceof HTMLElement) || !(rows.top instanceof HTMLElement) || !(rows.bottom instanceof HTMLElement)) return () => {};
  const cells = {
    top: Array.from(rows.top.children).filter((el) => el instanceof HTMLElement),
    bottom: Array.from(rows.bottom.children).filter((el) => el instanceof HTMLElement),
  };
  const veils = {
    top: Array.from(veilrows.top?.children ?? []),
    bottom: Array.from(veilrows.bottom?.children ?? []),
  };
  const wordSlots = Array.from(section.querySelectorAll('[data-access-wordslot]')).filter((el) => el instanceof HTMLElement);
  const readPx = (prop, fallback) => {
    const v = parseFloat(getComputedStyle(document.body).getPropertyValue(prop));
    return Number.isFinite(v) ? v : fallback;
  };
  const STEP_PX = readPx('--ac-step', 300);
  const EXIT_PX_N = readPx('--ac-exit', 300);
  const RUNWAY = STEPS * STEP_PX;
  const TOTAL = RUNWAY + EXIT_PX_N;
  const vw = () => window.innerWidth || 390;
  const movers = [rows.top, rows.bottom, veilrows.top, veilrows.bottom].filter((el) => el instanceof HTMLElement);

  /* the geometry, measured from the rendered cells with the rows at rest */
  const g = { cellW: 0, pitch: 0, rowH: 0, landTop: 0, landBottom: 0, baseTop: 0, baseBottom: 0 };
  const measure = () => {
    gsap.set(movers, { x: 0 });
    const c0 = cells.top[0].getBoundingClientRect();
    const c1 = cells.top[1]?.getBoundingClientRect();
    g.cellW = c0.width;
    g.pitch = c1 ? c1.left - c0.left : c0.width + 8;
    g.rowH = c0.height;
    const shift = readPx('--ac-land-shift', vw() * 0.11);
    g.landTop = vw() / 2 - shift;
    g.landBottom = vw() / 2 + shift;
    const sl = stage.getBoundingClientRect().left;
    g.baseTop = rows.top.getBoundingClientRect().left - sl;
    g.baseBottom = rows.bottom.getBoundingClientRect().left - sl;
  };
  measure();

  const state = { p: 0, travelP: 0, exitT: 0, wordFactor: 0 };
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  const updateRow = (row, shift) => {
    const base = row === 'top' ? g.baseTop : g.baseBottom;
    const landed = row === 'top' ? g.landTop : g.landBottom;
    const dead = g.pitch * BLUR_DEAD_FRACTION;
    cells[row].forEach((cell, i) => {
      const centre = base + i * g.pitch + g.cellW / 2 + shift;
      const isPad = cell.hasAttribute('data-pad');
      const t = isPad ? 1 : clamp01((Math.abs(centre - landed) - dead) / (g.pitch - dead));
      const veil = veils[row][i];
      if (veil instanceof HTMLElement) veil.style.background = `rgba(${VEIL_RGB},${(VEIL_ALPHA * t).toFixed(3)})`;
      const img = cell.querySelector('img');
      if (img instanceof HTMLElement) img.style.filter = t < 0.05 ? '' : `blur(${(NARROW_DIM_BLUR_PX * t).toFixed(2)}px)`;
    });
  };
  const updateWords = (shiftTop, shiftBottom) => {
    const exitFade = Math.max(0, 1 - state.exitT / EXIT_WORD_FADE_T);
    const full = g.pitch * NARROW_WORD_FULL_T;
    const win = g.pitch * NARROW_WORD_WINDOW_T;
    wordSlots.forEach((slot) => {
      const row = slot.dataset.row;
      const k = Number(slot.dataset.pair) || 0;
      const idx = row === 'top' ? TOP_PAIR_INDEX(k) : BOTTOM_PAIR_INDEX(k);
      const base = row === 'top' ? g.baseTop : g.baseBottom;
      const shift = row === 'top' ? shiftTop : shiftBottom;
      const left = base + idx * g.pitch + shift;
      slot.style.left = `${left.toFixed(1)}px`;
      const dist = Math.abs(left + g.cellW / 2 - (row === 'top' ? g.landTop : g.landBottom));
      const near = dist <= full ? 1 : dist >= win ? 0 : 1 - (dist - full) / (win - full);
      slot.style.opacity = (near * exitFade * state.wordFactor).toFixed(3);
    });
  };
  const collapseEls = [
    ...section.querySelectorAll('.landing-access__rowwrap, .landing-access__veilwrap'),
    ...cells.top, ...cells.bottom,
    ...veils.top, ...veils.bottom,
  ].filter((el) => el instanceof HTMLElement);
  const collapseImgs = [...cells.top, ...cells.bottom].map((c) => c.querySelector('img')).filter((el) => el instanceof HTMLElement);
  const headlineEls = [
    section.querySelector('.landing-access__dlabel'),
    ...section.querySelectorAll('[data-access-dline]'),
  ].filter((el) => el instanceof HTMLElement);
  let lastCollapseH = -1;
  const applyCollapse = (exitPx) => {
    const cT = clamp01(exitPx / EXIT_PX_N);
    const h = g.rowH * (1 - cT);
    if (Math.abs(h - lastCollapseH) < 0.05) return;
    lastCollapseH = h;
    headlineEls.forEach((el) => {
      el.style.opacity = cT <= 0 ? '' : (1 - cT).toFixed(3);
      el.style.filter = cT <= 0 ? '' : `blur(${(ACCESS_HEADLINE_EXIT_BLUR_PX * cT).toFixed(2)}px)`;
      el.style.visibility = cT >= 1 ? 'hidden' : '';
    });
    const clear = h >= g.rowH - 0.05;
    const px = h <= 0.05 ? '0px' : `${h.toFixed(1)}px`;
    [...collapseEls, ...collapseImgs].forEach((el) => { el.style.height = clear ? '' : px; });
  };
  const applyProgress = (rawP) => {
    state.p = rawP;
    const rel = rawP * TOTAL;
    state.travelP = Math.min(rel / RUNWAY, 1);
    state.exitT = Math.max(0, (rel - RUNWAY) / EXIT_PX_N);
    const shift = state.travelP * STEPS * g.pitch + state.exitT * EXIT_PX_N;
    gsap.set([rows.top, veilrows.top].filter(Boolean), { x: -shift });
    gsap.set([rows.bottom, veilrows.bottom].filter(Boolean), { x: shift });
    updateRow('top', -shift);
    updateRow('bottom', shift);
    updateWords(-shift, shift);
    applyCollapse(state.exitT * EXIT_PX_N);
  };
  wordSlots.forEach((slot) => slot.classList.remove('is-on'));
  applyProgress(0);

  /* the entrance: the rows park offscreen along their travel and slide
     in on the house curve as the composition enters */
  const entryGroups = {
    top: [section.querySelector('.landing-access__rowwrap--top'), section.querySelector('.landing-access__veilwrap--top')].filter((el) => el instanceof HTMLElement),
    bottom: [section.querySelector('.landing-access__rowwrap--bottom'), section.querySelector('.landing-access__veilwrap--bottom')].filter((el) => el instanceof HTMLElement),
  };
  let entered = false;
  const parkOffscreen = () => {
    const pad = 24;
    const parkTop = vw() - g.baseTop + pad;
    const parkBottom = -(g.baseBottom + (cells.bottom.length - 1) * g.pitch + g.cellW + pad);
    entryGroups.top.forEach((el) => { el.style.transform = `translateX(${parkTop.toFixed(1)}px)`; });
    entryGroups.bottom.forEach((el) => { el.style.transform = `translateX(${parkBottom.toFixed(1)}px)`; });
  };
  parkOffscreen();
  const timeouts = [];
  const playEntrance = () => {
    if (entered) return;
    entered = true;
    const all = [...entryGroups.top, ...entryGroups.bottom];
    all.forEach((el) => { el.style.transition = ENTRY_CURVE; });
    void section.offsetWidth;
    all.forEach((el) => { el.style.transform = 'translateX(0px)'; });
    timeouts.push(setTimeout(() => { all.forEach((el) => { el.style.transition = ''; el.style.transform = ''; }); }, 1400));
  };

  /* THE PHONE (2026-09-09): the stage may be taller than the viewport
     (the frame's label + eight lines + 360×240 rows) and pins with the
     ROWS at the bottom — its sticky top sits below zero by the
     overflow (landing-narrow.css). The scrub starts where the sticky
     engages: the section's top at that offset, not at the viewport's
     top. Where the stage is the viewport (the tablet, the old phone
     values) the offset is 0 and this is 'top top' as before. */
  const stickyOffset = () => {
    const t = parseFloat(getComputedStyle(stage).top);
    return Number.isFinite(t) && t < 0 ? -t : 0;
  };

  /* A1 — the phone's arrival scroll: the featured stage's top edge
     ACCESS_ENTER_AFTER_FEATURED_TOP_PX above the viewport top. Null off
     the phone or without the pinned rail (reduced motion never gets
     here). */
  const phone = isPhoneViewport();
  /* item 6: the stage follows the live visible bottom edge where it is
     bottom-flush (--m-vv-dy on the section, m-viewport.js; the translate
     is landing-narrow.css's) — the phone's pinned path only */
  const cleanupVv = phone ? trackVisibleBottom(section) : () => {};
  const arrivalAt = () => {
    if (!phone) return null;
    const fp = featuredPhonePin();
    return fp ? fp.releaseAt + ACCESS_ENTER_AFTER_FEATURED_TOP_PX : null;
  };
  /* the ride: the section's top edge crosses the fold at the arrival —
     --ac-ride (landing-narrow.css folds it into the section's margin);
     re-derived on the global refreshInit, after the featured's own */
  const applyArrival = () => {
    const at = arrivalAt();
    if (at === null) { section.style.removeProperty('--ac-ride'); return; }
    const current = parseFloat(getComputedStyle(section).getPropertyValue('--ac-ride')) || 0;
    const naturalTop = section.getBoundingClientRect().top + (window.scrollY || 0) + current;
    /* item 6: the fold is the SMALL viewport's (--m-svh), as every other pin's */
    const foldCross = naturalTop - (smallViewportPx() || window.innerHeight || 0);
    const ride = Math.round(foldCross - at);
    if (ride > 0) section.style.setProperty('--ac-ride', `${ride}px`);
    else section.style.removeProperty('--ac-ride');
  };
  applyArrival();
  ScrollTrigger.addEventListener('refreshInit', applyArrival);

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: () => `top+=${Math.round(stickyOffset())} top`,
    end: `+=${TOTAL}`,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => applyProgress(self.progress),
  });

  const dlines = Array.from(section.querySelectorAll('[data-access-dline]'));
  let headlineTrigger = null;
  let revealTrigger = null;
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    dlines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    headlineTrigger = ScrollTrigger.create({
      trigger: section,
      /* A1: the phone reveals as the section begins entering — the
         measured arrival; the band keeps the 70% line */
      start: () => arrivalAt() ?? 'top 70%',
      once: true,
      onEnter: () => { dlines.forEach((line) => { if (line instanceof HTMLElement) playLineRevealElement(line); }); },
    });
    /* the rows' slide-in fires as the rows reach the viewport's bottom
       edge: with the stage the viewport's height that is the section's
       top at 45%; with the taller phone stage the rows sit further down
       the section, so the anchor is the rows themselves (their top at
       the viewport's bottom) — the same moment, re-anchored. */
    const tallStage = stickyOffset() > 0;
    const rowsAnchor = entryGroups.top[0] ?? rows.top;
    revealTrigger = ScrollTrigger.create({
      trigger: section,
      start: tallStage ? () => `top+=${Math.round(rowsAnchor.offsetTop)} bottom` : 'top 45%',
      once: true,
      onEnter: () => {
        playEntrance();
        timeouts.push(setTimeout(() => {
          gsap.to(state, {
            wordFactor: 1,
            duration: 0.6,
            ease: 'power1.out',
            onUpdate: () => {
              const shift = state.travelP * STEPS * g.pitch + state.exitT * EXIT_PX_N;
              updateWords(-shift, shift);
            },
          });
        }, WORDS_AT_MS));
      },
    });
  });

  let lastW = vw();
  const onResize = () => {
    if (vw() === lastW) return; /* the URL bar's height-only resizes */
    lastW = vw();
    lastCollapseH = -1;
    measure();
    if (!entered) parkOffscreen();
    applyProgress(state.p);
  };
  window.addEventListener('resize', onResize);

  if (import.meta.env.DEV) {
    window.__landingAccess = { state: () => ({ ...state }), geo: () => ({ ...g, STEP_PX, EXIT_PX_N, TOTAL }), trigger: () => trigger };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    window.removeEventListener('resize', onResize);
    ScrollTrigger.removeEventListener('refreshInit', applyArrival);
    section.style.removeProperty('--ac-ride');
    cleanupVv();
    trigger.kill();
    headlineTrigger?.kill();
    revealTrigger?.kill();
    gsap.killTweensOf(state);
  };
}
