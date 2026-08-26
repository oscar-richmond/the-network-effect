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
import { createAccessWave } from './access-wave.js';
import { ACCESS_PAIRS } from '../../data/landing/access-pairs.js';
import { isMobileViewport } from './viewport.js';
import { initMobileEntrance } from './m-entrance.js';

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
/* THE EXIT — sideways at 1:1 until the widest visible span clears
   (1858 at 1728) + margin. */
const EXIT_PX = 1900;
const TOTAL_RUNWAY_PX = RUNWAY_PX + EXIT_PX; // 3900
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

/* ── MOBILE ROWS (the 402-frame rebuild, 2026-08-13) ────────────────
   The desktop's opposed COLUMNS become two opposed horizontal ROWS:
   360×240 items on a 368px pitch (file 0:299-0:328 — the file's
   neighbour positions are exactly one pitch apart), top row
   travelling RIGHT, bottom LEFT, autonomously. ONE clock drives an
   offset both rows consume with opposite signs, and the top row's
   DOM order is reversed (Astro), so the centred pair is a desktop
   pair BY CONSTRUCTION — never by tuned coincidence. The highlight
   slots sit at 50vw+60 (top) and 50vw−60 (bottom), decoded from the
   file. Rhythm: pairs DWELL centred (words in), then TRAVEL one
   pitch on the holding curve (words retire at departure, the next
   pair's words rise on arrival). All tunables: */
const ACCESS_M_PITCH_PX = 368; // 360 item + 8 gap
const ACCESS_M_SET = 6; // pairs per row; rendered twice for the wrap
const ACCESS_M_DWELL_MS = 2200; // centred hold per pair
const ACCESS_M_TRAVEL_MS = 900; // one-pitch travel
const ACCESS_M_CENTRE_SHIFT_PX = 60; // highlight slots: 50vw ± this
const ACCESS_M_DIM_BLUR_PX = 4; // off-centre soften (desktop veil grammar)
const ACCESS_M_VEIL_ALPHA = 0.25; // off-centre white veil strength
const ACCESS_M_WORD_SWAP_MS = 450; // word retire/reveal transition (CSS twin)

export function initLandingAccess() {
  const section = document.querySelector('[data-landing-access]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /* MOBILE (the viewport.js seam): the opposed-column scrub, veils
     and the GL wave never boot (zero WebGL contexts on phones, A4) —
     the ROWS mechanic runs instead (constants block above). The
     reduced-motion return upstream means this code never runs under
     RM: the static markup/CSS frame (pair 1 centred, words in) is
     the RM rendering. */
  if (isMobileViewport()) {
    const tracks = {
      top: section.querySelector('[data-access-mtrack="top"]'),
      bottom: section.querySelector('[data-access-mtrack="bottom"]'),
    };
    const inners = {
      top: section.querySelector('[data-access-mword-inner="top"]'),
      bottom: section.querySelector('[data-access-mword-inner="bottom"]'),
    };
    const mrows = section.querySelector('[data-access-mrows]');

    /* Entrance (R1 revision): the welded mixed-face headline takes
       the fade-rise — it's PLAIN INK on mobile (the interim block
       already flattened its blend for the flat ground), and no
       reveal wrap survives welded spans. The rows block fade-rises
       too (its words blend against the row's own imagery, inside
       the risen group — safe). */
    const cleanupEnt = initMobileEntrance(section, {
      media: [
        section.querySelector('[data-access-headline]'),
        mrows,
      ].filter((el) => el instanceof HTMLElement),
    });

    if (!(tracks.top instanceof HTMLElement) || !(tracks.bottom instanceof HTMLElement) || !(mrows instanceof HTMLElement)) {
      return cleanupEnt;
    }

    const setW = ACCESS_M_PITCH_PX * ACCESS_M_SET;
    const mod = (v) => ((v % setW) + setW) % setW;
    const items = {
      top: Array.from(tracks.top.children).filter((el) => el instanceof HTMLElement),
      bottom: Array.from(tracks.bottom.children).filter((el) => el instanceof HTMLElement),
    };
    const ease = gsap.parseEase('power2.inOut');

    /* Track x for a continuous rightward offset (top) / leftward
       (bottom), wrapped so the doubled strip always covers the
       viewport. Derivations in the constants block; the centre reads
       live, so resize needs no rebuild. */
    const xTop = (off) => {
      const rest = window.innerWidth / 2 + ACCESS_M_CENTRE_SHIFT_PX - 180 - (ACCESS_M_SET - 1) * ACCESS_M_PITCH_PX;
      return -setW + mod(rest + off);
    };
    const xBottom = (off) => {
      const rest = window.innerWidth / 2 - ACCESS_M_CENTRE_SHIFT_PX - 180;
      return -setW + mod(rest - off);
    };

    const applyX = (off) => {
      tracks.top.style.transform = `translateX(${xTop(off).toFixed(2)}px)`;
      tracks.bottom.style.transform = `translateX(${xBottom(off).toFixed(2)}px)`;
    };

    /* Continuous dim: veil/blur proportional to each item's distance
       from its row's highlight slot (the desktop veil grammar). */
    const applyDim = () => {
      ['top', 'bottom'].forEach((key) => {
        const centre = window.innerWidth / 2 + (key === 'top' ? 1 : -1) * ACCESS_M_CENTRE_SHIFT_PX;
        items[key].forEach((item) => {
          const r = item.getBoundingClientRect();
          const t = Math.min(1, Math.abs(r.left + r.width / 2 - centre) / ACCESS_M_PITCH_PX);
          const veil = item.lastElementChild;
          if (veil instanceof HTMLElement) veil.style.opacity = t.toFixed(3);
          const img = item.firstElementChild;
          if (img instanceof HTMLElement) {
            img.style.filter = t > 0.02 ? `blur(${(t * ACCESS_M_DIM_BLUR_PX).toFixed(2)}px)` : 'none';
          }
        });
      });
    };

    const setWords = (pairIdx) => {
      if (inners.top instanceof HTMLElement) inners.top.textContent = PAIRS[pairIdx][0];
      if (inners.bottom instanceof HTMLElement) inners.bottom.textContent = PAIRS[pairIdx][1];
    };
    const retireWords = () => {
      [inners.top, inners.bottom].forEach((el) => el?.classList.add('is-out'));
    };
    const revealWords = (pairIdx) => {
      setWords(pairIdx);
      [inners.top, inners.bottom].forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        void el.offsetHeight; /* commit the swapped text while hidden */
        el.classList.remove('is-out');
      });
    };

    /* The clock: dwell → travel(+1 pitch, eased) → dwell…; only ticks
       while the rows are on screen (IntersectionObserver). */
    let steps = 0;
    let phase = 'dwell';
    let phaseStart = 0;
    let raf = 0;

    const tick = (now) => {
      if (!phaseStart) phaseStart = now;
      const elapsed = now - phaseStart;
      if (phase === 'dwell') {
        if (elapsed >= ACCESS_M_DWELL_MS) {
          phase = 'travel';
          phaseStart = now;
          retireWords();
        }
        applyX(steps * ACCESS_M_PITCH_PX);
      } else {
        const p = Math.min(elapsed / ACCESS_M_TRAVEL_MS, 1);
        applyX((steps + ease(p)) * ACCESS_M_PITCH_PX);
        applyDim();
        if (p >= 1) {
          steps += 1;
          phase = 'dwell';
          phaseStart = now;
          revealWords(steps % ACCESS_M_SET);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf) {
        phaseStart = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    applyX(0);
    applyDim();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      },
      { rootMargin: '10% 0px' },
    );
    io.observe(mrows);

    if (import.meta.env.DEV) {
      window.__landingAccessM = {
        state: () => ({ steps, phase, pair: steps % ACCESS_M_SET, running: !!raf }),
        constants: {
          pitch: ACCESS_M_PITCH_PX,
          dwellMs: ACCESS_M_DWELL_MS,
          travelMs: ACCESS_M_TRAVEL_MS,
          centreShift: ACCESS_M_CENTRE_SHIFT_PX,
        },
      };
    }

    return () => {
      stop();
      io.disconnect();
      cleanupEnt();
    };
  }

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
  const canvas = section.querySelector('[data-access-canvas]');
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

  /* ── Media shader — axis X (the transposed bow). */
  let wave = null;
  if (canvas instanceof HTMLCanvasElement) {
    try {
      wave = createAccessWave(
        stage,
        canvas,
        {
          left: cells.top.map((f) => f.querySelector('img')).filter(Boolean),
          right: cells.bottom.map((f) => f.querySelector('img')).filter(Boolean),
        },
        () => ({ left: state.topVirtual, right: state.bottomVirtual }),
        { axis: 'x' },
      );
    } catch (error) {
      console.warn('[landing-access] access-wave init failed — DOM image fallback.', error);
    }
  }

  /* ── Arrival: the fragmented headline lines on the house reveal
     (reading order, the established 0.12s stagger); rows slide in
     from the sides as they reach the viewport; words fade up via
     the state gate. */
  const dlines = Array.from(section.querySelectorAll('[data-access-dline]'));
  const timeouts = [];
  let revealTrigger = null;
  let headlineTrigger = null;
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    dlines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    /* SPLIT TRIGGERS (Oscar 2026-08-26, dead-space fix): the label +
       headline arrive as soon as THEIR position (stage y100) meets
       the viewport bottom — while the featured carousel is still
       leaving — instead of waiting for the rows' y718. The rows keep
       the shipped threshold and character. */
    headlineTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top+=100 bottom',
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
      wave: () => wave,
      lastSnapTarget: () => lastSnapTarget,
      trigger: () => trigger,
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    window.clearTimeout(snapTimer);
    window.removeEventListener('resize', onResize);
    trigger.kill();
    holdTrigger.kill();
    revealTrigger?.kill();
    headlineTrigger?.kill();
    if (stage instanceof HTMLElement) stage.style.top = '';
    wave?.destroy();
    gsap.killTweensOf(state);
  };
}
