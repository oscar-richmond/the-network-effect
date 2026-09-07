/**
 * /founders — the two-slide fixed-viewport driver.
 *
 * DRIVER LINEAGE: the /work page's virtual scroller PORTED — wheel
 * → target 1:1 (deltaMode-scaled), touch 1:1 with flick momentum
 * (0.95 decay), one owned rAF loop lerping pos → target at the
 * house 0.065 (= site-scroll's SCROLL_LERP — keep in step), a
 * stepScroll ref for the occluded-pane tickOnce convention, and
 * gsap-proxy glides for snaps/jumps (one writer).
 *
 * PHASE MAP (one axis, all windows px, everything a pure function
 * of pos — reversible by construction):
 *   P1 [0, T)            Robbo's name travels top→terminus: top
 *                        edge at the portrait's LIVE centre →
 *                        bottom edge 40px above its LIVE bottom
 *                        (layout `top`, never transform — the
 *                        landing-founders blend rule; the name is
 *                        difference). T = the travel distance (1:1).
 *   P2 [T, T+600)        the slide transition: slide-1 text
 *                        staggers OUT (blur+fade) over the first
 *                        half, slide-2 IN over the second; the
 *                        portrait blur-crossfades (the standard
 *                        house dissolve — the /old noise-dissolve
 *                        is a WebGL shader welded to the old hero,
 *                        not portable); the indicator label rides
 *                        its 64px and ROLLS 01→02 at the midpoint;
 *                        aria-live announces. SNAPPED: idle inside
 *                        the window glides the TARGET to the
 *                        nearest boundary (the access one-writer
 *                        lesson).
 *   P3 [.., +T)          Ashley's travel, same clamps.
 *   P4 [.., +156+830]    release: the stage rides up 156 (until
 *                        180px remains below the portrait — the
 *                        design rests at 24, so 156 more), then
 *                        the /work footer-reveal grammar: the
 *                        stage keeps riding up 830 over the fixed
 *                        footer wrap. Free (unsnapped), reversible.
 *
 * RM: the driver applies DISCRETE states — names pinned at their
 * termini, the transition swaps instantly past its midpoint, no
 * crossfade choreography (hard swap), release instant-follow (no
 * lerp). Touch keeps the /work handling.
 */

import { NARROW_QUERY } from './viewport.js';
import gsap from 'gsap';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { createNavSweep } from './nav-motion.js';
import { wrapWordRevealElement, wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { FOUNDERS_SLIDES } from '../../data/landing/founders-page.js';
import { getLenisInstance } from './site-scroll.js';

const SCROLL_SMOOTH_LERP = 0.065; /* = site-scroll SCROLL_LERP */
/* ── R2b PHASE MAP (Oscar, 2026-08-26 — the page now STARTS at
   Robbo's rest: no entry travel; the carousel strip begins flush
   with the top of the page):
     HOLD    [0, FD_HOLD_PX)           the composition rests; only
                                       the carousel rolls.
     TEXT    [.., + FD_TEXT_PX)        Robbo's block rides up and
                                       out (FD_TEXT_EXIT_PX),
                                       Ashley's rides up from below
                                       (one viewport) into the SAME
                                       slot; the portrait reveal
                                       runs over the tail
                                       (FD_REVEAL_*).
     RELEASE [.., +96+830]             unchanged grammar.
   THE CAROUSEL is a BOUNDED roll over [0, textEnd]: track top at
   page top at pos 0, track bottom on the PORTRAIT'S BOTTOM edge at
   Ashley's rest — travel = trackH − portraitBottom, derived from
   the live geometry (rate = travel / textEnd, no longer a fixed
   constant). Scroll-driven, reversible; holds through the release. */
const FD_HOLD_PX = 360;
const FD_TEXT_PX = 900;
const FD_TEXT_EXIT_PX = 800; /* clears the text block's 245..752 span */
const FD_REVEAL_START_T = 0.55; /* of the text phase */
const FD_REVEAL_END_T = 0.95;   /* Ashley fully there as his text lands */
const FD_REVEAL_BLUR_PX = 6;    /* the lightbox edge blur, kept */
/* R32 item 5 (Oscar, 2026-09-03): the 96px release rise is RETIRED.
   It was the rev-2 grammar's "white gap grows below the portrait" —
   96 more px of stage ground exposed under the content before the
   footer reveal. With the closing sweep the band is the last thing on
   the stage, and that rise was the WHITE BLOCK leading it over the
   footer (measured: the ground band below the image grew from the
   deliberate 196 strip to 292 at 1728 / 73 to 169 in the shell). The
   reveal now begins the moment the sweep is edge to edge, and only
   the strip leads the band. (Was 96 = the 120 white gap − the 24
   rest.) */
const RELEASE_RISE_PX = 0;
const FOOTER_REVEAL_PX = 830; /* frame 13:381 (was 811) */
const NAV_EXIT_EPSILON_PX = 2;

/* ══ R30 (Oscar, 2026-09-03) — THE FOUNDERS CHOREOGRAPHY PASS ══════
   Five rulings, all desktop; mobile (initFoundersMobile) untouched.

   1 THE COLUMN BUILDS IN on load, one image at a time, and the slide
     transition's trigger moves off its scroll constant onto the
     column's own measured edge.
   2 The Robbo → Ashley TEXT no longer swaps: it blur-fades across on
     the phase's own progress (see the diagnosis note at applyText).
   3 Every text row ENTERS on the landing hero's word-clip vocabulary
     (line-reveal.js — the same wrap and the same 1.2s curve), row by
     row from the top.
   4 Both blocks land BLOCK-CENTRE on the PORTRAIT'S CENTRE (measured,
     per slide), and the landing is followed by one slot of column
     travel before anything else moves.
   5 THE CLOSING SWEEP replaces the old "release straight to footer":
     Ashley's text and the column leave upward while the WHO WE ARE
     sofa shot sweeps in from the left on the PORTRAIT TRANSITION'S
     mechanism, past the portrait's edge to the full viewport width,
     the indicator blurring out with it; the release follows only
     once the image is edge to edge. */
/* The column build — load-time (nothing here is scroll-driven): one
   image every STAGGER, each taking BUILD_S; the third slot is already
   there, so the build is (visible slots − 1) staggers long. */
const FD_COL_BUILD_AT_MS = 300;
const FD_COL_BUILD_STAGGER_MS = 120;
const FD_COL_BUILD_S = 0.52;
/* The text entrance's per-ROW delay. The hero's own 0.12 between line
   groups would run this block 2.52s (11 rows) and read as waiting;
   0.05 lands the last row's start at 0.50 and the block completes in
   1.70s (Robbo, 11 rows) / 1.60s (Ashley, 9). The 1.2s reveal curve
   itself is the hero's, untouched. */
const FD_ROW_STAGGER_S = 0.05;
/* The slide transition — ONE crossfade ramp on the text phase's own
   progress, spanning [0.15, 0.85]: Robbo's blur-fade out and Ashley's
   blur-fade in run on the SAME t, so their opacities sum to exactly 1
   at every frame. Sequenced windows (the first build: out by 0.55, in
   from 0.45) were measured dipping to 0.09 + 0.09 across the middle —
   a near-empty screen, the very thing this ruling removes. 12px is the
   house blur-fade exit (the services reel's own value). */
const FD_XFADE_START_T = 0.15;
const FD_XFADE_END_T = 0.85;
const FD_TEXT_BLUR_PX = 12;
/* Ashley's ROWS ride the arrival itself: they play just after her
   block's top crosses the viewport bottom (measured at t = 0.24, so
   0.30 clears it), and the 1.55s reveal runs through her travel —
   one arrival, not a second animation stacked on the landing. The
   reverse pass rewinds them without animating (the mobile swap's own
   resetSlide pattern, which this page already uses). */
const FD_ASHLEY_REVEAL_AT_T = 0.3;
/* THE SWEEP — TUNABLE. The portrait wipe covers its 630px box over
   0.4 × FD_TEXT_PX = 360px of scroll (1.75px of travel per px of
   scroll); carrying that exact rate across the 1728 viewport gives
   988. Raise it to slow the sweep, lower it to quicken. */
const FD_SWEEP_PX = 988;
/* The COLUMN is clear by 70% of the sweep (its window rides up and
   out); the indicator has blurred out by 35%. R32 item 3: Ashley's
   TEXT no longer rides up — the sweep owns its exit (see applyTextWipe):
   measured at 1728 the up-exit had already carried the block's upper
   rows off screen (role/name at −200 by the time the edge reached the
   block's left extent at 41% of the sweep) while the relationship rows
   were still on screen, so the two effects were stacking and the text
   vanished before, not under, the image. */
const FD_SWEEP_EXIT_T = 0.7;
const FD_IND_FADE_T = 0.35;
/* R32 item 3 — THE TEXT WIPE under the passing edge: the landing hero's
   own treatment (landing-hero-scroll.js buildExitWipe — opacity 1 → 0
   with blur 0 → EXIT_BLUR_PX 10, ease none, per line), keyed here to
   the sweep's LEADING-EDGE X against each rendered line's measured
   x-range: a line starts blurring as the edge reaches its left extent
   and is gone as the edge passes its right — it disappears UNDER the
   image, never before or after. Pure f(edge x): reversible. */
const FD_WIPE_BLUR_PX = 10;
/* R32 item 5 — THE FOOTER'S BOTTOM ROW enters from the reveal's own
   progress (/founders only: the band-carried reveal exposes the row
   at ~40px, long before the 200px one-shot). Each item takes the
   footer's media-entrance vocabulary — the fade-rise (opacity 0 → 1,
   translateY 24 → 0) the chip and image use — scrubbed, staggered
   across the row: item i runs over [exposeAt + i·STAGGER, +SPAN] of
   the reveal, where exposeAt is the row's MEASURED first exposure
   (the viewport bottom minus the fixed row's bottom). Reverses. */
const FD_FOOTER_ROW_STAGGER_PX = 40;
const FD_FOOTER_ROW_SPAN_PX = 160;
const FD_FOOTER_ROW_RISE_PX = 24;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function initFoundersPage() {
  const stage = document.querySelector('[data-founders-stage]');
  if (!(stage instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia(NARROW_QUERY).matches;
  if (narrow) {
    /* MOBILE (frame 13:948 rev 2, 2026-08-14): normal document
       scroll — none of the driver below engages. One profile at a
       time; the narrow branch owns the swap + entrance replay. */
    return initFoundersMobile(stage, reduced);
  }

  const content = stage.querySelector('[data-fd-content]');
  const portrait = stage.querySelector('[data-fd-portrait]');
  const imgOver = stage.querySelector('[data-fd-img-over]'); /* Robbo, above; Ashley full beneath */
  const colWrap = stage.querySelector('.fd-col');
  const colTrack = stage.querySelector('[data-fd-coltrack]');
  const slides = Array.from(stage.querySelectorAll('[data-fd-slide]'));
  const thumbs = Array.from(stage.querySelectorAll('[data-fd-thumb]'));
  const labelRow = stage.querySelector('[data-fd-labelrow]');
  const label = stage.querySelector('[data-fd-label]');
  const live = stage.querySelector('[data-fd-live]');
  const footerWrap = document.querySelector('[data-fd-footer]');

  const sweep = stage.querySelector('[data-fd-sweep]');
  const indThumbs = stage.querySelector('.fd-ind__thumbs');
  const indDivider = stage.querySelector('.fd-ind__divider');
  const indLabel = stage.querySelector('[data-fd-label]');

  /* ── Anchors. R30 item 1: the TEXT PHASE'S START is no longer the
     FD_HOLD_PX scroll constant — it is the scroll at which the NEW TOP
     IMAGE'S top edge reaches the viewport top, i.e. exactly one slot
     pitch of column roll (the roll is 1:1 through the hold, see
     colRoll). Measured from the live slots, so it re-derives with the
     geometry instead of coinciding with 360 by luck. */
  let colRollMax = 0;
  let slotPitch = 212.4;
  let colBuildOrder = [];
  const measureCol = () => {
    if (!(colWrap instanceof HTMLElement) || !(colTrack instanceof HTMLElement)
      || !(portrait instanceof HTMLElement)) return;
    const portBottom = portrait.getBoundingClientRect().bottom
      - colWrap.getBoundingClientRect().top;
    colRollMax = Math.max(0, colTrack.offsetHeight - portBottom);
    const slots = Array.from(colTrack.querySelectorAll('.fd-col__slot'));
    if (slots.length > 1) slotPitch = slots[1].offsetTop - slots[0].offsetTop;
    /* THE BUILD ORDER, derived from the LIVE window (Oscar's ruling):
       the THIRD slot is already there; then the TOP, then the BOTTOM
       (the last slot whose box fits the window), then the remaining
       ones top to bottom. Four visible slots in the 1512 shell give
       3-1-4-2; five at 1728 give 3-1-5-2-4. Slots below the fold are
       not in the build (nothing to watch) — they are simply shown. */
    const winH = colWrap.clientHeight || 0;
    const visible = slots
      .map((s, i) => ({ i, top: s.offsetTop, bottom: s.offsetTop + s.offsetHeight }))
      .filter((s) => s.bottom <= winH + 1);
    if (!visible.length) { colBuildOrder = slots.map((_, i) => i); return; }
    const idx = visible.map((s) => s.i);
    const third = idx[Math.min(2, idx.length - 1)];
    const top = idx[0];
    const bottom = idx[idx.length - 1];
    const rest = idx.filter((i) => i !== third && i !== top && i !== bottom);
    colBuildOrder = [third, top, bottom, ...rest].filter((v, i, a) => a.indexOf(v) === i);
  };
  measureCol();

  /* ── R30 item 4: each slide's BLOCK CENTRE lands on the PORTRAIT'S
     CENTRE (Oscar: both slides, the same rule). Measured from layout
     offsets — never rects — so the live travel transforms cancel out
     of the derivation entirely. */
  const blockShift = [0, 0];
  const measureBlocks = () => {
    if (!(portrait instanceof HTMLElement)) return;
    const portraitCentre = portrait.offsetTop + portrait.offsetHeight / 2;
    slides.forEach((slide, i) => {
      const els = Array.from(slide.querySelectorAll('[data-fd-el]'))
        .filter((el) => el instanceof HTMLElement && getComputedStyle(el).display !== 'none');
      if (!els.length) return;
      const top = Math.min(...els.map((el) => el.offsetTop));
      const bottom = Math.max(...els.map((el) => el.offsetTop + el.offsetHeight));
      blockShift[i] = portraitCentre - (top + bottom) / 2;
    });
  };
  measureBlocks();

  const textStart = () => slotPitch;
  const textEnd = () => textStart() + FD_TEXT_PX;
  const dwellEnd = () => textEnd() + slotPitch;   /* item 4: one more image of column travel */
  const sweepStart = () => dwellEnd();
  const sweepEnd = () => sweepStart() + FD_SWEEP_PX;
  const releaseStart = () => sweepEnd();
  const footerStart = () => releaseStart() + RELEASE_RISE_PX;
  const maxPos = () => footerStart() + FOOTER_REVEAL_PX;
  /* The roll: 1:1 through the hold (so the trigger IS one pitch), the
     remainder over the text phase (track bottom on the portrait's
     bottom at Ashley's rest — the bound is unchanged), then exactly
     one more pitch over the post-landing dwell. */
  const colRoll = (p) => {
    if (p <= textStart()) return Math.max(0, Math.min(p, slotPitch));
    const t = clamp((p - textStart()) / FD_TEXT_PX, 0, 1);
    const base = slotPitch + (colRollMax - slotPitch) * t;
    if (p <= textEnd()) return base;
    return colRollMax + clamp(p - textEnd(), 0, slotPitch);
  };
  /* ── Indicator anchor (Oscar, 2026-08-26): bottom edge 32px above
     the PORTRAIT'S measured bottom, derived live (offset box — the
     shared containing block, so release/reveal transforms cancel).
     A fixed top would drift with viewport height and in-shell. */
  const FD_IND_GAP_PX = 32;
  const indWrap = stage.querySelector('[data-fd-ind]');
  const placeIndicator = () => {
    if (!(indWrap instanceof HTMLElement) || !(portrait instanceof HTMLElement)) return;
    const portBottom = portrait.offsetTop + portrait.offsetHeight;
    indWrap.style.top = `${portBottom - FD_IND_GAP_PX - indWrap.offsetHeight}px`;
  };
  placeIndicator();

  /* ── State. */
  /* R21 (Oscar, 2026-09-02): DEEP LINK — /founders#ashley boots
     SETTLED on Ashley's rest (the text phase's end), never animating
     through Robbo's; #robbo / no hash = the page's own start. The
     page-transition wipe covers the boot, so the landed state is the
     first frame seen. */
  const wantAshley = /^#ashley$/i.test(window.location.hash || '');
  let pos = wantAshley ? textEnd() : 0;
  let targetPos = pos;
  let flickVel = 0;
  let activeSlide = 0;
  let announced = 0;
  let snapTween = null;
  let footerPlayed = false;
  let wrappedFooter = null;
  let disposed = false;
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));

  const announce = (i) => {
    if (announced === i || !(live instanceof HTMLElement)) return;
    announced = i;
    live.textContent = `Founder ${FOUNDERS_SLIDES[i].number} of 02: ${FOUNDERS_SLIDES[i].name}`;
  };

  const setActiveSlide = (i) => {
    if (activeSlide === i) return;
    activeSlide = i;
    thumbs.forEach((t, j) => t.setAttribute('aria-current', j === i ? 'true' : 'false'));
    slides.forEach((s, j) => { s.dataset.active = j === i ? 'true' : 'false'; });
    /* Only the active slide's button is tabbable. */
    slides.forEach((s, j) => {
      const btn = s.querySelector('.fd-slide__btn');
      if (btn instanceof HTMLElement) btn.tabIndex = j === i ? 0 : -1;
    });
    label?.classList.toggle('is-second', i === 1);
    announce(i);
  };

  /* ── R30 item 3 — THE TEXT ENTRANCE: the landing hero's OWN
     vocabulary, reused wholesale — line-reveal.js's word wrap and its
     1.2s cubic-bezier(0.42,0,0.24,1) clip reveal, the same call the
     hero headline and intro make. ORDER: top-left, row by row down the
     block. Only the CADENCE is this page's: the wrapper's own 0.12
     between line groups would run Robbo's 11 rows for 2.52s, so the
     delays are rewritten across the whole block at FD_ROW_STAGGER_S
     (the vocabulary itself is untouched — same wrap, same curve). */
  /* The reveal targets are the LEAF text elements, never the four
     [data-fd-el] containers: the wrapper tokenises an element's DIRECT
     children, so wrapping a container turns its <p> children into
     inline atoms — measured, that collapsed the bio's 28px paragraph
     gap and the relationships rows' 32px pitch (block 245..740 became
     245..676). The leaves keep every container rule intact. */
  const REVEAL_TEXT_SEL = '.fd-slide__role, .fd-slide__staticname, .fd-slide__bio2-para, .fd-slide__rel-label';
  const REVEAL_ROW_SEL = '.fd-slide__rel-row';
  /* A relationships ROW is authored with NO whitespace between its item
     and separator spans, and the tokeniser re-joins atoms with a space
     — which would widen every separator gap on a nowrap line. A row is
     a single line, so the word wrap's own result for it IS one clip:
     build that clip directly with the module's classes and its exact
     transition, and the shared stylesheet drives it identically. */
  const LR_TRANSITION = 'transform 1.2s cubic-bezier(0.42,0,0.24,1)';
  const wrapSingleClip = (el) => {
    if (el.querySelector(':scope > .lr-clip')) return;
    const clip = document.createElement('span');
    clip.className = 'lr-clip';
    const inner = document.createElement('span');
    inner.className = 'lr-inner';
    inner.style.transition = `${LR_TRANSITION} 0s`;
    while (el.firstChild) inner.appendChild(el.firstChild);
    clip.appendChild(inner);
    el.appendChild(clip);
  };
  const slideParts = slides.map((slide) => Array.from(slide.querySelectorAll(`${REVEAL_TEXT_SEL}, ${REVEAL_ROW_SEL}`))
    .filter((el) => el instanceof HTMLElement && getComputedStyle(el).display !== 'none')
    .map((el) => ({ el, single: el.matches(REVEAL_ROW_SEL) }))
    /* top to bottom — the rows share the slide's transform, so the
       rects order them exactly as the reader sees them */
    .sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top));
  const wrappedSlide = [false, false];
  const rowCount = [0, 0];
  const ensureWrapped = (i) => {
    if (wrappedSlide[i] || reduced) return;
    wrappedSlide[i] = true;
    /* wrapLineRevealElement — the LANDING HERO'S own call (BUILT ON
       TRUST / POWERED BY ACCESS and the "We connect…" intro go through
       exactly this one, landing-hero-scroll.js): one clip per RENDERED
       LINE, the 1.2s house curve. The word variant is the mobile
       swap's, and would make the stagger per word (53 of them here),
       not per row. */
    slideParts[i].forEach(({ el, single }) => {
      if (single) wrapSingleClip(el); else wrapLineRevealElement(el);
    });
    let row = 0;
    slideParts[i].forEach(({ el }) => {
      el.querySelectorAll('.lr-inner').forEach((inner) => {
        if (inner instanceof HTMLElement) inner.style.transitionDelay = `${(row * FD_ROW_STAGGER_S).toFixed(2)}s`;
        row += 1;
      });
    });
    rowCount[i] = row;
  };
  const playSlideRows = (i) => { slideParts[i].forEach(({ el }) => playLineRevealElement(el)); };
  /* The rewind for the reverse pass — the mobile swap's own pattern,
     already proven on this page: the inner transitions (which carry the
     per-row delays) are suppressed for the flip and restored verbatim,
     so nothing animates backwards and the next forward pass replays
     from the top. */
  const resetSlideRows = (i) => {
    slideParts[i].forEach(({ el }) => {
      el.querySelectorAll('.lr-clip').forEach((clip) => {
        const inner = clip.querySelector('.lr-inner');
        if (inner instanceof HTMLElement) {
          const t = inner.style.transition;
          inner.style.transition = 'none';
          clip.classList.remove('lr-visible');
          void inner.offsetHeight;
          inner.style.transition = t;
        } else {
          clip.classList.remove('lr-visible');
        }
      });
    });
  };
  /* Ashley's rows ride the slide-in itself (item 2 × item 3): they play
     once the transition is FD_ASHLEY_REVEAL_AT_T through, so the reveal
     finishes as her block lands — one arrival, not two. */
  let ashleyRowsPlayed = false;
  const applyAshleyRows = (textTe) => {
    if (reduced || !wrappedSlide[1]) return;
    const want = textTe >= FD_ASHLEY_REVEAL_AT_T;
    if (want === ashleyRowsPlayed) return;
    ashleyRowsPlayed = want;
    if (want) playSlideRows(1); else resetSlideRows(1);
  };

  /* ── R30 item 1 — THE COLUMN BUILD (load-time, nothing scroll-driven).
     The third slot is already there; the rest arrive one at a time in
     the order measureCol derived from the live window. Slots below the
     fold are shown at once — there is nothing to watch. */
  const colSlots = colTrack instanceof HTMLElement
    ? Array.from(colTrack.querySelectorAll('.fd-col__slot')).filter((el) => el instanceof HTMLElement)
    : [];
  colSlots.forEach((s) => s.style.setProperty('--fd-build-s', `${FD_COL_BUILD_S}s`));
  const buildColumn = () => {
    if (!colSlots.length) return;
    if (reduced) { colSlots.forEach((s) => s.classList.add('is-visible')); return; }
    const inBuild = new Set(colBuildOrder);
    colSlots.forEach((s, i) => { if (!inBuild.has(i)) s.classList.add('is-visible'); });
    colBuildOrder.forEach((slotIdx, k) => {
      const el = colSlots[slotIdx];
      if (!(el instanceof HTMLElement)) return;
      if (k === 0) { el.classList.add('is-visible'); return; }
      schedule(() => el.classList.add('is-visible'), FD_COL_BUILD_AT_MS + (k - 1) * FD_COL_BUILD_STAGGER_MS);
    });
  };

  /* ── R32 item 5 — the footer bottom row's scrubbed entrance. */
  const footerRowItems = Array.from(footerWrap?.querySelectorAll('[data-footer-row-scrub] .landing-footer__ritem') ?? [])
    .filter((el) => el instanceof HTMLElement);
  const footerRowEl = footerWrap?.querySelector('[data-footer-row-scrub]') ?? null;
  const applyFooterRow = (reveal, vh) => {
    if (!footerRowItems.length) return;
    if (reduced) { footerRowItems.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; }); return; }
    /* the row is fixed with the footer: its bottom never moves, so the
       exposure point is the same measurement at every frame */
    const rowBottom = footerRowEl instanceof HTMLElement ? footerRowEl.getBoundingClientRect().bottom : vh;
    const exposeAt = Math.max(0, vh - rowBottom);
    footerRowItems.forEach((el, i) => {
      const t = clamp((reveal - exposeAt - i * FD_FOOTER_ROW_STAGGER_PX) / FD_FOOTER_ROW_SPAN_PX, 0, 1);
      el.style.opacity = t >= 0.999 ? '' : t.toFixed(3);
      el.style.transform = t >= 0.999 ? '' : `translate3d(0, ${(FD_FOOTER_ROW_RISE_PX * (1 - t)).toFixed(1)}px, 0)`;
    });
  };

  /* ── R32 item 3 — THE TEXT WIPE under the sweep's leading edge (the
     hero's buildExitWipe treatment: opacity → 0 with blur → 10, ease
     none, one line at a time). Each rendered line of Ashley's block —
     the wrap's .lr-clip groups, so a two-line paragraph is two rows —
     is measured LIVE (its rect; the block no longer moves during the
     sweep, and the measurement is cheap: eight rects) and driven from
     the edge's x: t = (edgeX − line.left) / line.width. Below its left
     extent a line is untouched; past its right it is gone. */
  const wipeLines = () => (wrappedSlide[1]
    ? slideParts[1].flatMap(({ el }) => Array.from(el.querySelectorAll(':scope > .lr-clip')))
    : slideParts[1].map(({ el }) => el)).filter((el) => el instanceof HTMLElement);
  let wipeActive = false;
  const applyTextWipe = (sweepT) => {
    if (!(sweep instanceof HTMLElement)) return;
    if (sweepT <= 0) {
      if (!wipeActive) return;
      wipeActive = false;
      wipeLines().forEach((el) => { el.style.opacity = ''; el.style.filter = ''; });
      return;
    }
    wipeActive = true;
    const edgeX = sweepT * (sweep.offsetWidth || window.innerWidth || 1728);
    wipeLines().forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      const t = reduced ? (edgeX >= r.right ? 1 : 0) : clamp((edgeX - r.left) / r.width, 0, 1);
      el.style.opacity = t <= 0 ? '' : (1 - t).toFixed(3);
      el.style.filter = t <= 0 ? '' : `blur(${(FD_WIPE_BLUR_PX * t).toFixed(2)}px)`;
    });
  };

  /* ── R30 item 2 — THE SLIDE-CHANGE TEXT TRANSITION.
     THE DEFECT (measured at nine points, both sizes): the text had NO
     transition of any kind. Both blocks travelled the whole phase, but
     each was only VISIBLE for half of it — the stylesheet hides the
     inactive slide outright (.fd-slide[data-active='false']) and the
     driver flipped which slide was active at the phase's midpoint, so
     at 0.49 Robbo was visible and Ashley hidden and at 0.50 that
     reversed in one frame. Robbo therefore vanished 400px into an
     800px exit and Ashley appeared mid-flight: the instant
     disappear / flash Oscar reported.
     THE FIX: opacity and blur are written here from the phase's own
     progress (the inline visibility overrides the class rule, so the
     data-active swap keeps driving aria/tab state only). Both are pure
     f(pos) — the reversal is arithmetic. */
  const applySlideState = (el, op, blurT) => {
    const o = reduced ? (op >= 0.5 ? 1 : 0) : clamp(op, 0, 1);
    el.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
    const bl = reduced ? 0 : FD_TEXT_BLUR_PX * clamp(blurT, 0, 1);
    el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : '';
    el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
  };

  /* ── The frame — every visual is a pure function of pos. */
  const frame = () => {
    const textT = clamp((pos - textStart()) / FD_TEXT_PX, 0, 1);
    const textTe = reduced ? (textT < 0.5 ? 0 : 1) : textT;
    const sweepRaw = clamp((pos - sweepStart()) / FD_SWEEP_PX, 0, 1);
    const sweepT = reduced ? (sweepRaw < 0.5 ? 0 : 1) : sweepRaw;
    const sweepExit = clamp(sweepT / FD_SWEEP_EXIT_T, 0, 1);
    const rise = clamp(pos - releaseStart(), 0, RELEASE_RISE_PX);
    const reveal = clamp(pos - footerStart(), 0, FOOTER_REVEAL_PX);
    const vh = window.innerHeight || 1080;

    /* TEXT TRAVEL — Robbo up and out; Ashley up and in, landing on her
       measured centring offset (R30 item 4), then leaving upward with
       the closing sweep (item 5). The portrait never travels: the page
       starts at Robbo's rest. */
    const xf = clamp((textTe - FD_XFADE_START_T) / (FD_XFADE_END_T - FD_XFADE_START_T), 0, 1);
    if (slides[0] instanceof HTMLElement) {
      const y = blockShift[0] - FD_TEXT_EXIT_PX * textTe;
      slides[0].style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      applySlideState(slides[0], 1 - xf, xf);
    }
    if (slides[1] instanceof HTMLElement) {
      /* R32 item 3: no up-exit for the text — it stays put and the
         sweep's edge wipes it (applyTextWipe below). */
      const y = blockShift[1] + vh * (1 - textTe);
      slides[1].style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      applySlideState(slides[1], xf, 1 - xf);
    }
    applyAshleyRows(textTe);

    /* PORTRAIT REVEAL-BEHIND over the travel's tail: Ashley is fully
       opaque beneath at all times; Robbo's layer wipes L→R off him —
       combined coverage never below full (the white-flash fix). */
    const rT = reduced
      ? (textTe >= 1 ? 1 : 0)
      : clamp((textT - FD_REVEAL_START_T) / (FD_REVEAL_END_T - FD_REVEAL_START_T), 0, 1);
    if (imgOver instanceof HTMLElement) {
      imgOver.style.clipPath = rT <= 0 ? '' : `inset(0 0 0 ${(rT * 100).toFixed(2)}%)`;
      imgOver.style.visibility = rT >= 1 ? 'hidden' : '';
      imgOver.style.filter = rT > 0.001 && rT < 0.999
        ? `blur(${(FD_REVEAL_BLUR_PX * Math.sin(Math.PI * rT)).toFixed(2)}px)`
        : '';
    }

    /* THE ROLLING CAROUSEL — bounded, scroll-driven: top of the strip
       at the page top at pos 0, bottom on the portrait's bottom edge
       from Ashley's rest on; stops with the scroll, reverses. R30: 1:1
       through the hold (so the slide trigger IS one slot pitch), then
       ONE MORE PITCH over the post-landing dwell (item 4). */
    if (colTrack instanceof HTMLElement) {
      const roll = reduced ? (textTe >= 1 ? colRollMax : 0) : colRoll(pos);
      colTrack.style.transform = roll > 0.01 ? `translate3d(0, ${(-roll).toFixed(2)}px, 0)` : '';
    }
    /* R30 item 5 — the column leaves upward WITH Ashley's text as the
       sweep comes in (the window itself travels; the roll inside it is
       untouched, so the reverse restores both by arithmetic). */
    if (colWrap instanceof HTMLElement) {
      const out = (colWrap.offsetHeight || vh) * sweepExit;
      colWrap.style.transform = out > 0.01 ? `translate3d(0, ${(-out).toFixed(1)}px, 0)` : '';
    }

    /* Indicator — the label row rides its 64px with the text travel. */
    if (labelRow instanceof HTMLElement) {
      labelRow.style.top = `${(19 + 64 * textTe).toFixed(1)}px`;
    }
    /* R30 item 5c — the indicator BLURS AND FADES OUT with the sweep's
       first FD_IND_FADE_T. BLEND SAFETY: the divider and the label
       carry mix-blend-mode difference, so they are faded as DIRECT
       targets (self-opacity/filter keeps an element's own blend; a
       wrapper-level fade on .fd-ind would isolate them and flip their
       contrast mid-sweep — the established rule on this site). */
    const indT = clamp(sweepT / FD_IND_FADE_T, 0, 1);
    const indBlur = FD_REVEAL_BLUR_PX * indT;
    [indThumbs, indDivider, indLabel].forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.opacity = indT <= 0.001 ? '' : (1 - indT).toFixed(3);
      el.style.filter = indBlur > 0.05 ? `blur(${indBlur.toFixed(2)}px)` : '';
    });

    /* R30 item 5 — THE SWEEP: the portrait transition's clip mechanism
       (the inset wipe), revealing the INCOMING image left to right and
       running past the portrait's edge to the full viewport width.
       R32 item 4 — CRISP: the portrait wipe's travelling blur
       (filter: blur(6·sin πt) on the whole layer) is NOT carried here.
       DIAGNOSED: a filter on the sweeping element blurs its content
       right up to its own box, so the band's top and bottom edges
       feathered semi-transparent and the clip edge showed soft
       content — the "blurred / semi-transparent leading side and top".
       On the 630px portrait that blur is the intentional lightbox
       edge vocabulary (R2, kept there); at full-bleed it read as a
       defect. The sweep is now clip-only: hard edges, full opacity,
       every frame. */
    if (sweep instanceof HTMLElement) {
      if (sweepT <= 0.0001) {
        sweep.style.visibility = 'hidden';
        sweep.style.clipPath = 'inset(0 100% 0 0)';
      } else {
        sweep.style.visibility = 'visible';
        sweep.style.clipPath = `inset(0 ${((1 - sweepT) * 100).toFixed(3)}% 0 0)`;
      }
      sweep.style.filter = '';
    }
    applyTextWipe(sweepT);
    setActiveSlide(textTe >= 0.5 ? 1 : 0);

    /* Release + footer reveal. */
    if (content instanceof HTMLElement) {
      content.style.transform = `translate3d(0, ${(-rise).toFixed(1)}px, 0)`;
    }
    /* R36 item 3 (Oscar, 2026-09-04): THE BAND'S BOTTOM EDGE IS THE
       REVEAL LINE. DIAGNOSED: the stage (100dvh, its own #eeeef0
       ground) rode up as one block, so the ground strip below the
       band — the portrait's deliberate bottom margin (196 at 1728, 73
       in the shell) — travelled with it and led the footer as a white
       block for the whole 830. Now the reveal has two legs on one
       axis: first the stage's bottom edge is CLIPPED upward through
       the strip (the band holds still, the footer appears beneath the
       shrinking strip), then, once the clip line reaches the band's
       bottom, the stage rides up with that clip held — the band's
       bottom edge IS the moving edge over the footer. The footer's
       exposure equals `reveal` in both legs (continuous, 1:1,
       reversible); the end state exposes the same 830. The strip is
       measured live from the two rects (both ride the transform, so
       the difference is invariant). */
    const strip = Math.max(0, stage.getBoundingClientRect().bottom
      - (sweep instanceof HTMLElement ? sweep.getBoundingClientRect().bottom : stage.getBoundingClientRect().bottom));
    const clipB = Math.min(reveal, strip);
    const rideUp = Math.max(0, reveal - strip);
    stage.style.clipPath = reveal > 0.01 ? `inset(0 0 ${clipB.toFixed(1)}px 0)` : '';
    stage.style.transform = `translate3d(0, ${(-rideUp).toFixed(1)}px, 0)`;
    applyFooterRow(reveal, vh);
    setNav(reveal >= FOOTER_REVEAL_PX - NAV_EXIT_EPSILON_PX);
    maybePlayFooter();
  };

  /* ── Nav exit (the /work bottom behaviour). */
  /* R36 (Oscar, 2026-09-04): the SHARED sweep applier (nav-motion.js). */
  const { setNav } = createNavSweep({ reduced });

  /* ── Input (the /work port). ROOT-CAUSE FIX (Oscar's report: the
     reveal stalls partway, footer top items cut off): wheel/touch
     capture must cover the WHOLE page — once the stage rides up,
     the revealed footer is a SIBLING fixed layer, so events over
     it never bubble through the stage. The input surface is
     document.body (the /work fix, ported). */
  const inputRegion = document.body;
  const setPosClamped = (raw) => {
    targetPos = clamp(raw, 0, maxPos());
  };
  const onWheel = (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    snapTween?.kill();
    setPosClamped(targetPos + e.deltaY * unit);
    markInput();
  };
  inputRegion.addEventListener('wheel', onWheel, { passive: false });
  cleanups.push(() => inputRegion.removeEventListener('wheel', onWheel));

  /* A2c (2026-08-27): keyboard focus must never land on invisible
     UI. The footer is a sibling fixed layer behind the stage — its
     links are real, reachable tab stops while fully covered.
     Native browsers scroll a focused element into view; this
     fixed-viewport driver defeats that, so restore the semantic:
     focusing INTO the footer drives the page to the footer reveal
     (and the existing driver handles the rest). */
  const fdFooterWrap = document.querySelector('[data-fd-footer]');
  if (fdFooterWrap instanceof HTMLElement) {
    const onFooterFocus = () => {
      if (targetPos < maxPos() - 1) {
        snapTween?.kill();
        setPosClamped(maxPos());
      }
    };
    fdFooterWrap.addEventListener('focusin', onFooterFocus);
    cleanups.push(() => fdFooterWrap.removeEventListener('focusin', onFooterFocus));
  }

  let touchY = 0;
  let touchT = 0;
  let touchVel = 0;
  const onTouchStart = (e) => {
    if (!e.touches.length) return;
    touchY = e.touches[0].clientY;
    touchT = performance.now();
    touchVel = 0;
    flickVel = 0;
    snapTween?.kill();
  };
  const onTouchMove = (e) => {
    if (!e.touches.length) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = performance.now();
    const dy = touchY - y;
    const dt = Math.max((now - touchT) / 1000, 0.001);
    setPosClamped(targetPos + dy);
    touchVel = touchVel * 0.6 + (dy / dt) * 0.4;
    touchY = y;
    touchT = now;
    markInput();
  };
  const onTouchEnd = () => {
    flickVel = touchVel;
    touchVel = 0;
    markInput();
  };
  inputRegion.addEventListener('touchstart', onTouchStart, { passive: true });
  inputRegion.addEventListener('touchmove', onTouchMove, { passive: false });
  inputRegion.addEventListener('touchend', onTouchEnd, { passive: true });
  cleanups.push(() => {
    inputRegion.removeEventListener('touchstart', onTouchStart);
    inputRegion.removeEventListener('touchmove', onTouchMove);
    inputRegion.removeEventListener('touchend', onTouchEnd);
  });

  /* R2: the boundary snap is REMOVED — under the normal-scroll
     grammar a half-travelled text state is ordinary mid-scroll
     content (reported). glideTo survives for the indicator thumbs. */
  const markInput = () => {};
  const glideTo = (to, duration = 0.8) => {
    snapTween?.kill();
    const proxy = { p: targetPos };
    snapTween = gsap.to(proxy, {
      p: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => { setPosClamped(proxy.p); },
    });
  };
  cleanups.push(() => {
    snapTween?.kill();
  });

  /* ── Thumbs — glide the driver to the slide's rest position. */
  thumbs.forEach((thumb, i) => {
    const onClick = () => {
      glideTo(i === 0 ? textStart() : textEnd(), 1.0);
    };
    thumb.addEventListener('click', onClick);
    cleanups.push(() => thumb.removeEventListener('click', onClick));
  });

  /* ── The owned loop (the /work shape; tickOnce for the pane). */
  const stepScroll = (dtMs) => {
    const dt = Math.min(dtMs, 100) / 1000;
    if (flickVel !== 0) {
      setPosClamped(targetPos + flickVel * dt);
      flickVel *= 0.95;
      if (Math.abs(flickVel) < 20) flickVel = 0;
    }
    if (reduced) {
      if (pos !== targetPos) { pos = targetPos; frame(); }
      return;
    }
    if (Math.abs(targetPos - pos) > 0.05) {
      pos += (targetPos - pos) * SCROLL_SMOOTH_LERP;
      if (Math.abs(targetPos - pos) < 0.05) pos = targetPos;
      frame();
    }
  };
  let rafId = 0;
  let lastT = 0;
  const loop = (t) => {
    stepScroll(lastT ? t - lastT : 16.7);
    lastT = t;
    rafId = window.requestAnimationFrame(loop);
  };
  rafId = window.requestAnimationFrame(loop);
  cleanups.push(() => window.cancelAnimationFrame(rafId));

  const onResize = () => {
    measureCol();
    measureBlocks(); /* R30 item 4: the centring re-derives with the geometry */
    placeIndicator();
    frame();
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ── Footer reveal choreography — wrapped once, played when the
     reveal begins (the covered-trigger idea expressed in driver
     space: the footer is fixed UNDER the stage, so viewport
     triggers can't see it — the driver knows exactly when it
     shows). */
  const footerEl = footerWrap?.querySelector('[data-landing-footer]');
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    /* R30: the wrap needs settled metrics (line grouping reads live
       offsets — the house order), then the block geometry is measured
       from the wrapped elements and the entrance plays. */
    ensureWrapped(0);
    ensureWrapped(1);
    measureBlocks();
    playSlideRows(0);
    if (wantAshley) { playSlideRows(1); ashleyRowsPlayed = true; }
    buildColumn();
    frame();
    if (!(footerEl instanceof HTMLElement)) return;
    wrappedFooter = wrapFooterReveals(footerEl);
  });
  function maybePlayFooter() {
    if (footerPlayed || !wrappedFooter) return;
    if (pos - footerStart() > 200) {
      footerPlayed = true;
      playFooterReveals(wrappedFooter, schedule);
    }
  }
  frame();
  announce(activeSlide);

  if (import.meta.env.DEV) {
    window.__founders = {
      gsap,
      tick: (dt) => stepScroll(dt ?? 16.7),
      setPos: (p) => { setPosClamped(p); },
      state: () => ({
        pos, targetPos, textStart: textStart(), textEnd: textEnd(),
        dwellEnd: dwellEnd(), sweepStart: sweepStart(), sweepEnd: sweepEnd(),
        releaseStart: releaseStart(), footerStart: footerStart(), maxPos: maxPos(),
        activeSlide, slotPitch, colRollMax, blockShift: [...blockShift],
        strip: Math.max(0, stage.getBoundingClientRect().bottom - (sweep instanceof HTMLElement ? sweep.getBoundingClientRect().bottom : stage.getBoundingClientRect().bottom)),
        colBuildOrder: [...colBuildOrder], rowCount: [...rowCount],
      }),
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
    setNav(false);
  };
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE (≤1024) — frame 13:948 rev 4 (2026-08-14): one founder
   profile shown at a time (data-m-active; Ashley lands), swapped via
   the fixed thumb dock or the CTA-row name chip. Every swap scrolls
   home and REPLAYS the entrance vocabulary (word-reveal on the
   blended lines, staggered fade-rise on the media) — the same
   grammar the m-entrance one-shot used, owned here because replays
   need resets.

   The name labels' pin behaviour (24px under the image top → pinned
   at the viewport middle → parked 24px above the image bottom) and
   their copy (name LEFT, "Founder 0N" RIGHT, the data numbering)
   are pure CSS/markup — baked per slide. This controller toggles
   slides, follows the dock's active stroke, wires thumbs + chips to
   swapTo, and blurs the dock out over the footer (IO below).

   WRAP TIMING: the word wrap groups lines from live offsetTop, so a
   display:none slide can't be wrapped — each slide wraps lazily the
   first time it is shown (post fonts.ready, pre-play). A swap that
   lands before fonts resolve shows that slide statically (media
   forced visible, lines never wrapped) rather than risking
   fallback-metric grouping. */

const M_LINE_STAGGER_S = 0.12; /* = m-entrance LINE_STAGGER_S */
const M_MEDIA_AT_MS = 400; /* = m-entrance MEDIA_AT_MS */
const M_MEDIA_STAGGER_MS = 120; /* = m-entrance MEDIA_STAGGER_MS */

/**
 * @param {HTMLElement} stage
 * @param {boolean} reduced
 * @returns {() => void}
 */
function initFoundersMobile(stage, reduced) {
  const slides = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-slide]')));
  const thumbs = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-m-thumb]')));
  const dock = stage.querySelector('[data-fd-m-dock]');
  const cluster = stage.querySelector('[data-fd-m-switch]');
  const swapBtns = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-m-swap]')));
  const live = stage.querySelector('[data-fd-live]');

  /* The desktop SSR gives the inactive slide's link tabindex=-1 —
     meaningless here (the inactive slide is display:none, out of the
     tab order by itself) and it would lock Ashley's landing CTA out
     of keyboard reach. */
  stage.querySelectorAll('.fd-slide__btn').forEach((btn) => btn.removeAttribute('tabindex'));

  const lineSels = ['.fd-slide__m-label', '.fd-slide__bio-text--bold', '.fd-slide__m-serif'];
  /* VISUAL top-to-bottom order (the CTA row sits after the list in
     flex order but before it in the DOM) — the stagger reads down
     the page. The name labels ride with the portrait; the thumb
     dock is NOT here — it's shared, enters once, persists. */
  const mediaSels = [
    '.fd-slide__m-portrait',
    '.fd-m-switch-label--l',
    '.fd-m-switch-label--r',
    '.fd-slide__m-img2',
    '.fd-slide__listlabel',
    '.fd-slide__list',
    '.fd-slide__m-ctarow',
  ];
  const parts = slides.map((slide) => ({
    lines: /** @type {HTMLElement[]} */ (
      lineSels.map((sel) => slide.querySelector(sel)).filter((el) => el instanceof HTMLElement)
    ),
    media: /** @type {HTMLElement[]} */ (
      mediaSels.map((sel) => slide.querySelector(sel)).filter((el) => el instanceof HTMLElement)
    ),
  }));

  /* R21: the deep link on mobile — #robbo shows Robbo's profile;
     #ashley / no hash = the file's landing state (Ashley). */
  let active = /^#robbo$/i.test(window.location.hash || '') ? 0 : 1; /* Ashley lands (the file's state; SSR matches) */
  let disposed = false;
  let fontsDone = false;
  /** @type {ReturnType<typeof setTimeout>[]} */
  const timeouts = [];
  /** @type {(() => void)[]} */
  const cleanups = [];

  /* BACK TO TOP (2026-08-27): this page was the one script that never
     wired [data-footer-top], so the mobile legacy footer's button was
     inert here while every other page scrolled home. The established
     handler, verbatim (case-study.js / contact.js): real route
     anchors — the footer's HOME, href="/" — navigate untouched; the
     back-to-top BUTTON carries no href and gets the smooth scroll.
     Mobile-only: desktop /founders is a fixed-viewport driver whose
     footer family has no back-to-top at all. */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    const lenis = getLenisInstance();
    if (lenis) lenis.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  const wrappedSlides = new Set();
  const staticSlides = new Set();

  const applyActive = (idx) => {
    active = idx;
    slides.forEach((s) => {
      s.dataset.mActive = s.dataset.slide === String(idx) ? 'true' : 'false';
    });
    /* The dock is shared across slides — the stroke follows here. */
    thumbs.forEach((t) => {
      t.setAttribute('aria-current', t.dataset.slide === String(idx) ? 'true' : 'false');
    });
    if (live instanceof HTMLElement) {
      live.textContent = `Founder: ${FOUNDERS_SLIDES[idx].name}`;
    }
  };

  const ensureWrapped = (idx) => {
    if (wrappedSlides.has(idx) || staticSlides.has(idx)) return;
    wrappedSlides.add(idx);
    parts[idx].lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * M_LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
  };

  /* Rewind a slide's revealed state without animating: the inner
     transitions (which carry the wrap's per-word delays) are
     suppressed for the flip and restored verbatim. Runs in the same
     task as the show — no paintable revealed frame. */
  const resetSlide = (idx) => {
    parts[idx].lines.forEach((line) => {
      line.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
        const inner = clip.querySelector('.lr-inner');
        if (inner instanceof HTMLElement) {
          const t = inner.style.transition;
          inner.style.transition = 'none';
          clip.classList.remove('lr-visible');
          void inner.offsetHeight;
          inner.style.transition = t;
        } else {
          clip.classList.remove('lr-visible');
        }
      });
    });
    parts[idx].media.forEach((el) => {
      el.style.transition = 'none';
      el.classList.remove('is-visible');
      void el.offsetHeight;
      el.style.transition = '';
    });
  };

  /* SYNCHRONOUS play — the pre-reveal state is committed with a
     forced reflow first, so the class flips transition from it.
     Deliberately NOT rAF-scheduled: throttled/embedded contexts
     starve rAF entirely (caught live — the replay silently never
     ran), while a reflow is deterministic everywhere. */
  const playSlide = (idx) => {
    void stage.offsetHeight;
    parts[idx].lines.forEach((line) => playLineRevealElement(line));
    parts[idx].media.forEach((el, i) => {
      timeouts.push(
        setTimeout(() => el.classList.add('is-visible'), M_MEDIA_AT_MS + i * M_MEDIA_STAGGER_MS),
      );
    });
  };

  const swapTo = (idx) => {
    if (disposed || idx === active || !slides[idx]) return;
    applyActive(idx);
    window.scrollTo(0, 0);
    if (reduced) return;
    if (!fontsDone) {
      /* Pre-fonts tap (sub-100ms window): show statically rather
         than wrap against fallback metrics. */
      staticSlides.add(idx);
      parts[idx].media.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    ensureWrapped(idx); /* needs the slide VISIBLE — after applyActive */
    resetSlide(idx);
    playSlide(idx);
  };

  /* ── Wire the CTAs (the thumbs ARE the CTAs, plus the name chip). */
  thumbs.forEach((t) => {
    const onClick = () => swapTo(Number(t.dataset.slide));
    t.addEventListener('click', onClick);
    cleanups.push(() => t.removeEventListener('click', onClick));
  });
  swapBtns.forEach((b) => {
    const onClick = () => swapTo(Number(b.dataset.target));
    b.addEventListener('click', onClick);
    cleanups.push(() => b.removeEventListener('click', onClick));
  });

  applyActive(active);

  /* ── Footer clearance: the dock blurs out (the site's exit
     vocabulary) as soon as the footer enters the viewport, and
     blurs back in when it leaves on the way up — it must never
     block the footer. Applies under reduced motion too (it's an
     occlusion fix, not theatre). */
  if (dock instanceof HTMLElement) {
    const footer = document.querySelector('[data-landing-footer]');
    if (footer && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            dock.classList.toggle('is-footer-hidden', entry.isIntersecting);
          });
        },
        { threshold: 0 },
      );
      io.observe(footer);
      cleanups.push(() => io.disconnect());
    }
  }

  if (reduced) {
    /* Hidden states are no-preference-gated; the classes keep the
       DOM state coherent (the /work rule). Swaps still work — they
       just cut, no theatre. */
    parts.forEach((p) => p.media.forEach((el) => el.classList.add('is-visible')));
    if (cluster instanceof HTMLElement) cluster.classList.add('is-visible');
  } else {
    /* Landing entrance: the section owns the first viewport, so it
       plays on arrival (fonts-gated wrap first — the established
       order). The dock enters ONCE at the media stagger's tail and
       persists across swaps. */
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (disposed) return;
      fontsDone = true;
      if (!staticSlides.has(active)) ensureWrapped(active);
      playSlide(active);
      if (cluster instanceof HTMLElement) {
        timeouts.push(
          setTimeout(
            () => cluster.classList.add('is-visible'),
            M_MEDIA_AT_MS + parts[active].media.length * M_MEDIA_STAGGER_MS,
          ),
        );
      }
    });
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
  };
}
