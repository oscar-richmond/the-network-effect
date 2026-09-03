/**
 * WHAT WE DO — THE SERVICES REEL (/landing; frames 29:859 expanded +
 * 30:1191 stacked, 2026-08-26). Desktop only (≤1024 keeps the
 * shipped mobile stack in landing-services.js, untouched).
 *
 * BASE = THE STAGING (8ec705a) STACK MECHANICS, carried over:
 *   · each pillar RISES RISE_PX from below the viewport (power1.out)
 *     and FIXES at its parked divider (184 / 280 / 422 — the
 *     Option-11 active position; Option-12 gives the stacked pitch);
 *   · the divider's FILL drains scaleX 1→0 across the rise — the
 *     progress bar;
 *   · ROLL-OVER WIPES: the covered pillar's lower content blurs and
 *     fades unit by unit at the derived edge-crossing as the next
 *     opaque panel rides over (occlusion free — panels are opaque);
 *   · GENTLE COMPACTION: pillar 1 eases from 184 to the stacked 138
 *     while its title row / desc close from +68/+66 to +44/+42 —
 *     layout `top` only (the titles carry difference blends);
 *   · Lenis-idle SNAP, single authority, active in rise windows.
 *
 * THE NEW REEL, between a pillar's fix and the next rise: the
 * services list translates up REEL_TRAVEL px behind the gradient
 * blur (top edge on the title's top), rows dissolving out through
 * it; the ACTIVE row is whichever sits level with the WE BUILD /
 * WE SHAPE / WE CREATE label (hysteresis at ±REEL_HYST_T of the
 * row pitch), and each landing swaps the image via THE CASE-STUDY
 * GALLERY treatment (two-phase L→R clip wipe, 450ms/phase, 6px
 * moving edge blur, house curve, pending-index latch — reused, not
 * reinvented). The reel completes when the list's bottom divider
 * reaches the label's bottom; the next pillar rises on that cue.
 * Fully scrubbed and reversible, image swaps included.
 *
 * THE FADE-TO-BLACK keeps its exact contract (constants verbatim —
 * its fourth home): the section's ground falls to GROUND_DARK over
 * the final TRANSITION_GROUND_FADE_PX, completing as Featured
 * Work's top crosses the viewport bottom.
 *
 * RM: no machinery — the markup + CSS render the full Option-11
 * expanded layout in flow, default image per pillar, no blur, no
 * swapping.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { isMobileViewport } from './viewport.js';
import { SERVICES_REEL_PILLARS } from '../../data/landing/services-reel.js';

gsap.registerPlugin(ScrollTrigger);

/* ── Geometry (frames 29:859 / 30:1191, −118 chrome, pillar-local
   offsets from each pillar's divider). ─────────────────────────── */
/* Stack geometry RE-DERIVED for the closed-state type drop (Oscar
   2026-08-26): the dropped desc block is 2×32 = 64 tall; the closed
   band equalises SYMMETRIC 32 above / 32 below (was 44 above, 24
   below at the frame's 142 pitch) → stacked pitch 128, which is
   what frees the vertical room AMPLIFY needed. */
/* R13 (Oscar, 2026-09-02): the closed desc is 24/28 → a 56px block
   (was 26/32 → 64), and the desc is CENTRED on the title in both
   states (descTopFor below), so the stacked pitch RE-DERIVES from
   the closed geometry: closed desc top + 56 + the 32 below. */
const TITLE_TOP = 68;              /* title row below the divider (expanded) */
const TITLE_TOP_STACKED = 34;      /* closed: block top 32 + the 2px optical */
const STACKED_Y1 = 138;            /* pillar 1's compacted Y (Option 12) */
/* Pillar 1's EXPANDED fix — welded 38 below the WHAT WE DO label's
   box top (146 + 38 = 184 before R13; the label now sits at 178.3 so
   the header row's ink tops 180 below the section boundary → 216).
   The stacked base (138, label 100) is unchanged: the compaction
   travel grows 46 → 78, the label riding the same distance. */
const PILLAR1_ACTIVE_Y = 216;
const LIST_TOP = 190;              /* list + label top below the divider */
const ROW_PITCH = 53;              /* divider + text row pitch */
const LABEL_H = 19;
const WWD_Y_STACKED = 100;         /* … once pillar 1 compacts (Option 12) */
/* ── THE INTRO (restored content, Oscar 2026-08-26): FROM ACCESS TO
   IMPACT + the pillars note rest 100 below the fixed WHAT WE DO
   label, then travel UP AND OUT past it over the head of the scrub.
   R2 (Oscar): the exit runs CONCURRENT with pillar 1's rise — the
   pin engages exactly as Our Network's bottom clears the viewport
   top (measured 0px adjacency, element-anchored 'top top'), and
   IMMERSE rises from that same scroll px: the statement exits
   upward while the opaque panel rises from below, passing in
   opposite directions (the panel paints over the intro). */
const INTRO_PX = 600;              /* the intro exit's scroll length */
const INTRO_EXIT_PX = 660;         /* clears the note past the stage top */
/* ── CLOSED-STATE TYPE DROP (guide Editorial / Lead; scrubbed CSS
   custom properties — see the plan note: exact end metrics incl.
   tracking, no box desync, no endpoint snap). */
const TTL_OPEN = { fs: 56, lh: 54, ls: -0.035 };
const TTL_CLOSED = { fs: 48, lh: 48, ls: -0.02 };
/* R13 (Oscar, 2026-09-02): desc 28/32 expanded → 24/28 closed
   (SUPERSEDES 34/38 → 26/32; tracking endpoints kept as they were —
   the brief set size and leading only). Both states are two
   AUTHORED lines (the data's desc[0] / desc[1] + the <br> — never
   container wrapping), so the break can't move mid-scrub. */
const DESC_OPEN = { fs: 28, lh: 32, ls: -0.03 };
const DESC_CLOSED = { fs: 24, lh: 28, ls: -0.02 };
const DESC_LINES = 2;
/* ── DESC CENTRING (R13): the desc block sits vertically centred on
   the title THROUGH the scrub — one writer (applyTypeDrop), every
   frame, derived from BOTH elements' live line-heights (the boxes
   are leading-driven, so the interpolated leadings ARE the live
   heights) plus a small INK correction: Dazzed caps and Serrif
   mixed-case don't centre their ink where their boxes do. The
   correction is measured at each endpoint (pixel ink, 2026-09-02)
   and interpolated on the same t, so it scales with the sizes. */
/* Measured with the correction at 0 (pixel ink centres, desc minus
   title, 1728): open +3.5 / +4 / +2.5 across the three pillars,
   closed +1.5 / +3 — the desc's mixed-case ink (descenders on
   "Experiences"/"Strategy", none on "& Media") centres a little
   below the caps' ink. One mean correction per endpoint; the
   per-pillar residue (±0.8) is glyph-specific and reported. */
const DESC_INK_CORR_OPEN = -3.3;
const DESC_INK_CORR_CLOSED = -2.3;
const titleTopFor = (t) => TITLE_TOP + (TITLE_TOP_STACKED - TITLE_TOP) * t;
const descTopFor = (t) => {
  const ttlLh = TTL_OPEN.lh + (TTL_CLOSED.lh - TTL_OPEN.lh) * t;
  const descLh = DESC_OPEN.lh + (DESC_CLOSED.lh - DESC_OPEN.lh) * t;
  const corr = DESC_INK_CORR_OPEN + (DESC_INK_CORR_CLOSED - DESC_INK_CORR_OPEN) * t;
  return titleTopFor(t) + (ttlLh - descLh * DESC_LINES) / 2 + corr;
};
/* The stacked pitch, re-derived (see the geometry block above):
   closed desc top + the closed block + the 32 below it. */
const STACK_PITCH = Math.round(descTopFor(1) + DESC_CLOSED.lh * DESC_LINES + 32);
const ACTIVE_Y = [PILLAR1_ACTIVE_Y, STACKED_Y1 + STACK_PITCH, STACKED_Y1 + 2 * STACK_PITCH];

/* ── Beats (scroll px). ────────────────────────────────────────── */
const RISE_PX = 800;                    /* the staging card rise, kept */
const REEL_PX_PER_SERVICE = 220;        /* TUNABLE — reel pace per row */
const TRANSITION_DWELL_PX = 250;        /* verbatim through relocations */
/* R26 (Oscar, 2026-09-03): ⅔ of the shipped 500 — the grey → black
   scrub range, same start (the 75% gate below). Old 500 / new 333. */
const TRANSITION_GROUND_FADE_PX = 333;
const GROUND_DARK = '#161616';
const GROUND_LIGHT = '#eeeef0';

/* ── The reel fade (item: gradient + blur, named): top edge at the
   title top; fully opaque by there, clear by the list top. ─────── */

/* ── Image wipe — THE CASE-STUDY GALLERY TREATMENT, reused. ────── */
const IMG_WIPE_MS = 450;              /* per phase (the lightbox beat) */
const IMG_WIPE_EDGE_BLUR_PX = 6;
const IMG_WIPE_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';
const REEL_HYST_T = 0.35;             /* commit window around row centres */

/* Roll-over wipe (staging constants, kept). */
const WIPE_LEAD_PX = 40;
const WIPE_SPAN_PX = 120;
const WIPE_BLUR_PX = 6;

/* ── Divider-fill endpoint (Oscar R3, 2026-08-26): the fill's
   autoAlpha fades to 0 over the drain's final fraction, so the end
   state is exactly the grey track BY CONSTRUCTION — a 0-opacity,
   visibility-hidden layer cannot rasterise the near-zero-scaleX
   hairline some engines leave behind. Scrubbed on the same
   timeline; reversal restores. */
const FILL_TAIL_FADE_T = 0.1;

/* ── THE DEPARTURE EXIT CASCADE (Oscar R4, 2026-08-26 — supersedes
   the R3 image+CTA-only exit, extended to EVERY section element;
   see the departure timeline below). All positions are scroll px
   after the stage unpins; every element completes by
   SREEL_EXIT_HEADS_AT + SPAN = 600, far ahead of the ground fade's
   measured start (≥ the AMPLIFY clearing point, ~922). */
const SREEL_EXIT_BLUR_PX = 12;        /* the house blur-fade exit */
const SREEL_EXIT_SPAN_PX = 180;       /* one element's fade length */
const SREEL_EXIT_ROW_STAGGER_PX = 24; /* per-row cascade offset */
const SREEL_EXIT_ROWS_END_PX = 360;   /* rows all gone by here */
const SREEL_EXIT_FURNITURE_AT_PX = 240; /* descs/label/image/CTA */
const SREEL_EXIT_HEADS_AT_PX = 420;   /* titles//0N/dividers/WWD last */
/* R5 (Oscar 2026-08-27): the fraction of the blur-out span (heads-at
   + span = 600) at which the grey→black ground fade BEGINS — the
   earlier-handoff gate. 0.75 = the last quarter of the cascade
   overlaps the fade's start. */
const SREEL_HANDOFF_GATE_T = 0.75;

/* R26 (Oscar, 2026-09-03) — THE FEATURED HAND-OFF, exported: the
   progress (px into the depart timeline) at which AMPLIFY's right-hand
   IMAGE is FULLY blurred out — it rides the furniture group, so
   furniture-at + one span (240 + 180 = 420) — and the live depart pad.
   landing-featured.js derives its overlap from these so the FEATURED
   WORK heading's top crosses the viewport bottom at exactly that
   moment (supersedes the 75%-gate arrival contract). */
export const SREEL_IMAGE_BLUR_OUT_PX = SREEL_EXIT_FURNITURE_AT_PX + SREEL_EXIT_SPAN_PX;
let lastDepartPad = 0;
let departTrigger = null;
export function sreelHandoff() {
  return lastDepartPad > 0 ? { departPad: lastDepartPad, imageBlurOutPx: SREEL_IMAGE_BLUR_OUT_PX } : null;
}
/** R28 (Oscar, 2026-09-03): HOW DARK IS THE GROUND — 0 (light) → 1
 *  (#161616), a pure function of the depart scrub's progress (the
 *  same value that drives the ground tween, so it can never disagree
 *  with the painted colour). 1 when there is no reel on the page.
 *  landing-featured.js gates its edge gradient on it. */
export function sreelGroundDarkness() {
  if (!departTrigger || !lastDepartPad) return 1;
  /* From the scroller's CURRENT position against the trigger's start,
     not from the trigger's cached progress: ScrollTrigger updates its
     triggers in sequence, so a reader running earlier in the same
     tick would see the previous frame's progress — a one-step lag at
     rest that the scroll position itself never has. */
  const px = Math.min(Math.max(departTrigger.scroll() - departTrigger.start, 0), lastDepartPad);
  const fadeGateAt = Math.round((SREEL_EXIT_HEADS_AT_PX + SREEL_EXIT_SPAN_PX) * SREEL_HANDOFF_GATE_T);
  return Math.min(Math.max((px - fadeGateAt) / TRANSITION_GROUND_FADE_PX, 0), 1);
}

/* ── SCROLL-MODE TEXT SLIDE (Oscar 2026-08-27) — the scroll-active
   row's text slides right; tune here (pushed to CSS as
   --sreel-slide-x / -s / -ease). Ease = the house state-transition
   curve (the holding ease, same family as the sv-rows fill). */
const SREEL_SLIDE_PX = 40;
const SREEL_SLIDE_S = 0.5;
const SREEL_SLIDE_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
/* The slide ARMS per pillar only once its rise is nearly home
   (Oscar 2026-08-27: row 1 must arrive LEFT-ALIGNED and indent just
   before the row lands / the divider fill is ~5% from completing —
   both run the same [riseStart, +RISE_PX] window). Pure f(scrub px)
   in the master onUpdate, so reversal un-arms by arithmetic. */
const SREEL_SLIDE_ARM_T = 0.95;

const SNAP_IDLE_MS = 150;
const SNAP_DURATION_S = 0.6;
const LINE_STAGGER_S = 0.12;

export function initLandingServicesReel() {
  const root = document.querySelector('[data-sreel]');
  const section = document.querySelector('[data-landing-services]');
  if (!(root instanceof HTMLElement) || !(section instanceof HTMLElement)) return () => {};
  if (isMobileViewport()) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = root.querySelector('[data-sreel-stage]');
  const wwd = root.querySelector('[data-sreel-wwd]');
  const pillars = Array.from(root.querySelectorAll('[data-sreel-pillar]'));
  if (!(stage instanceof HTMLElement) || pillars.length !== 3) return () => {};

  const P = SERVICES_REEL_PILLARS;
  const listTravel = (i) => {
    /* Bottom divider (listH − 2 below the list top) down to the
       label bottom: travel = listH − 2 − LABEL_H. listH = rows on
       the 53 pitch + closing divider. */
    const listH = P[i].services.length * ROW_PITCH + 2;
    return listH - 2 - LABEL_H;
  };
  const reelPx = (i) => P[i].services.length * REEL_PX_PER_SERVICE;

  /* Beat map. Rise 1 begins at px 0 — the moment Our Network's
     bottom crosses the viewport top (the pin start; see INTRO_PX). */
  const riseStart = [];
  const reelStart = [];
  let cursor = 0;
  for (let i = 0; i < 3; i += 1) {
    riseStart[i] = cursor;
    cursor += RISE_PX;
    reelStart[i] = cursor;
    cursor += reelPx(i);
  }
  const RUNWAY_PX = cursor + TRANSITION_DWELL_PX;

  const cleanups = [];
  let disposed = false;
  let trigger = null;
  let masterTl = null;
  let snapTimer = 0;

  if (reduced) {
    /* RM: static expanded flow layout — CSS owns it entirely. */
    root.classList.add('is-reduced');
    return () => {};
  }

  root.classList.add('is-live');
  root.style.setProperty('--sreel-runway', `${RUNWAY_PX}px`);
  root.style.setProperty('--sreel-slide-x', `${SREEL_SLIDE_PX}px`);
  root.style.setProperty('--sreel-slide-s', `${SREEL_SLIDE_S}s`);
  root.style.setProperty('--sreel-slide-ease', SREEL_SLIDE_EASE);

  /* Park pillars below the stage before paint. */
  const stageH = () => stage.clientHeight || window.innerHeight;
  pillars.forEach((p2) => gsap.set(p2, { y: stageH() }));

  /* ── The image swap — REVEAL-BEHIND (Oscar R3, 2026-08-26): the
     FOUNDERS main-portrait mechanism, shared not diverged. The old
     two-phase wipe clipped the only img fully away before swapping —
     the ground showed mid-transition. Now an UNDER layer is cloned
     beneath each img at init: the incoming image loads there FULLY
     OPAQUE (decode-gated, the white-flash lesson), and the outgoing
     over layer clips away L→R with the travelling edge blur —
     combined coverage never below full, the ground can never show.
     Pending-index latch kept (rapid retargets settle on the LATEST). */
  const imgState = pillars.map((pillar, i) => {
    const over = pillar.querySelector('[data-sreel-img]');
    let under = null;
    if (over instanceof HTMLElement) {
      under = over.cloneNode(false);
      under.removeAttribute('data-sreel-img');
      under.classList.add('landing-sreel__img-under');
      under.setAttribute('aria-hidden', 'true');
      over.parentElement?.insertBefore(under, over);
    }
    return {
      el: over,
      under,
      current: -1,       /* -1 = the pillar default */
      pending: null,
      busy: false,
    };
  });
  const srcFor = (i, idx) => {
    const base = idx < 0 ? P[i].img : P[i].services[idx].img;
    const el = imgState[i].el;
    /* Resolve like asset(): the astro rendered the default through
       asset(); data paths are root-relative and served as-is. */
    return base;
  };
  const playWipe = (i) => {
    const st = imgState[i];
    if (!(st.el instanceof HTMLElement) || !(st.under instanceof HTMLElement) || st.busy || st.pending === null) return;
    const target = st.pending;
    st.pending = null;
    if (target === st.current) return;
    st.busy = true;
    /* The incoming image sits fully opaque BENEATH first — decode-
       gated (bounded: a slow network degrades to a plain swap). */
    st.under.src = srcFor(i, target);
    const ready = st.under.decode ? st.under.decode().catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 600))]).then(() => {
      const out = st.el.animate(
        [
          { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
          { clipPath: 'inset(0 0 0 50%)', filter: `blur(${IMG_WIPE_EDGE_BLUR_PX}px)`, offset: 0.5 },
          { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
        ],
        { duration: IMG_WIPE_MS, easing: IMG_WIPE_CURVE, fill: 'forwards' },
      );
      out.onfinish = () => {
        /* The over layer adopts the settled image before its clip is
           released — full coverage throughout. */
        st.el.src = srcFor(i, target);
        const overReady = st.el.decode ? st.el.decode().catch(() => {}) : Promise.resolve();
        Promise.race([overReady, new Promise((r) => setTimeout(r, 600))]).then(() => {
          if (disposed) return; /* an in-flight wipe must not keep mutating srcs post-teardown */
          out.cancel();
          st.current = target;
          st.busy = false;
          playWipe(i); /* chase the latest latched target */
        });
      };
    });
  };
  const requestImage = (i, idx) => {
    const st = imgState[i];
    if (idx === st.current && st.pending === null) return;
    st.pending = idx;
    playWipe(i);
  };

  /* Active-row selection with hysteresis: commit only within
     ±REEL_HYST_T of a row centre; between centres the previous
     active holds — no boundary flutter. */
  const activeIdx = pillars.map(() => 0);

  /* ── TWO-SOURCE ACTIVE STATE (Oscar 2026-08-27; simplified R10,
     2026-09-02): scroll drives the text slide; a pointer (or focus)
     over the list takes the SAME slide over — hover no longer hands
     the row to the /services fill/marquee machinery (sv-rows.js is
     detached from this page; /services untouched). One class
     (.is-sactive), one set of constants (SREEL_SLIDE_*), one writer
     (setSlide) for both sources, so the two modes are visually
     identical and the handoff between them is a no-op when they
     agree. activeIdx keeps updating UNDERNEATH a hover so release
     always lands on the row the current scroll position dictates.
     The pillar image follows the TREATED row in both modes (one
     authority: requestImage's latch), so the row and the image can
     never disagree. */
  const rowEls = pillars.map((pillar) => Array.from(pillar.querySelectorAll('[data-sreel-row]')));
  const hoverMode = pillars.map(() => false);
  const slideIdx = pillars.map(() => -1);
  const setSlide = (i, idx) => {
    if (slideIdx[i] === idx) return;
    if (slideIdx[i] >= 0) rowEls[i][slideIdx[i]]?.classList.remove('is-sactive');
    slideIdx[i] = idx;
    if (idx >= 0) rowEls[i][idx]?.classList.add('is-sactive');
  };
  /* No slide at init: each pillar's row 1 arrives left-aligned and
     the slide arms at SREEL_SLIDE_ARM_T of its rise (see the
     constant). Driven from the master scrub px below. */
  const risen = pillars.map(() => false);
  const applyslideArm = (px) => {
    for (let i = 0; i < 3; i += 1) {
      const armed = (px - riseStart[i]) / RISE_PX >= SREEL_SLIDE_ARM_T;
      if (armed === risen[i]) continue;
      risen[i] = armed;
      if (!hoverMode[i]) setSlide(i, armed ? activeIdx[i] : -1);
    }
  };

  const updateActive = (i, translatePx) => {
    const n = P[i].services.length;
    const cand = Math.min(Math.max(Math.round(translatePx / ROW_PITCH), 0), n - 1);
    if (cand === activeIdx[i]) return;
    /* Schmitt hysteresis: switch only when the candidate row is
       meaningfully NEARER than the held one (REEL_HYST_T of the
       pitch as the deadband) — boundary flutter can't switch, and
       any large scrub jump still commits immediately. */
    const dCand = Math.abs(translatePx - cand * ROW_PITCH);
    const dHeld = Math.abs(translatePx - activeIdx[i] * ROW_PITCH);
    if (dCand + ROW_PITCH * REEL_HYST_T < dHeld) {
      activeIdx[i] = cand;
      if (!hoverMode[i]) {
        requestImage(i, cand);
        if (risen[i]) setSlide(i, cand);
      }
    }
  };

  /* HOVER MODE — gated (hover:hover)/(pointer:fine) with the site's
     ?forcehover escape (services-6's formula; Oscar's machine
     reports the media query false). On touch nothing binds: the
     scroll slide is the only behaviour. Keyboard rides the same
     path (focus = hover, blur = release). While the pointer is over
     the list, hover WINS: the hovered row takes the slide (setSlide
     retargets it as one continuous movement — the outgoing row
     returns on the same curve) and the image follows; entering the
     list changes nothing until a row is actually under the pointer,
     so landing on the already-active row is a no-op (setSlide's
     same-index early-out: no re-trigger, no double indent). */
  const fineHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');
  if (fineHover) {
    pillars.forEach((pillar, i) => {
      const list = pillar.querySelector('[data-sreel-list]');
      if (!(list instanceof HTMLElement)) return;
      const enterMode = () => {
        hoverMode[i] = true;
      };
      const releaseMode = () => {
        hoverMode[i] = false;
        setSlide(i, risen[i] ? activeIdx[i] : -1);
        requestImage(i, activeIdx[i]);
      };
      const followRow = (target) => {
        const row = target instanceof Element ? target.closest('[data-sreel-row]') : null;
        if (!(row instanceof HTMLElement) || !list.contains(row)) return;
        const idx = rowEls[i].indexOf(row);
        if (idx < 0) return;
        setSlide(i, idx);
        requestImage(i, idx);
      };
      const onEnter = () => enterMode();
      const onOver = (e) => followRow(e.target);
      const onLeave = () => releaseMode();
      const onFocusIn = (e) => {
        enterMode();
        followRow(e.target);
      };
      const onFocusOut = (e) => {
        const next = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-sreel-row]') : null;
        if (!next || !list.contains(next)) releaseMode();
      };
      list.addEventListener('pointerenter', onEnter);
      list.addEventListener('pointerover', onOver);
      list.addEventListener('pointerleave', onLeave);
      list.addEventListener('focusin', onFocusIn);
      list.addEventListener('focusout', onFocusOut);
      cleanups.push(() => {
        list.removeEventListener('pointerenter', onEnter);
        list.removeEventListener('pointerover', onOver);
        list.removeEventListener('pointerleave', onLeave);
        list.removeEventListener('focusin', onFocusIn);
        list.removeEventListener('focusout', onFocusOut);
      });
    });
  }

  /* ── Entrances: pillar texts word-reveal as each rise begins (the
     staging playCardTexts pattern; live vocabulary only). ───────── */
  const played = pillars.map(() => false);
  const parts = pillars.map(() => []);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    pillars.forEach((pillar, i) => {
      Array.from(pillar.querySelectorAll('[data-sreel-text]')).forEach((el, j) => {
        if (!(el instanceof HTMLElement)) return;
        wrapWordRevealElement(el, { baseDelay: Math.min(j, 6) * 0.06 });
        parts[i].push(el);
      });
      const btn = pillar.querySelector('[data-sreel-btn]');
      if (btn instanceof HTMLElement) {
        wrapWordRevealElement(btn, { baseDelay: 0.5 });
        parts[i].push(btn);
      }
    });
    /* WHAT WE DO reveals with the INTRO trigger below (Oscar R2:
       present at its final top-left from section entry, animating in
       there — not deferred to pillar 1's rise). */
    if (wwd instanceof HTMLElement) wrapWordRevealElement(wwd);
  });
  const playTexts = (i) => {
    if (played[i]) return;
    played[i] = true;
    parts[i].forEach((el) => playLineRevealElement(el));
  };

  /* Restored-intro entrance — the house vocabulary: word reveals on
     the 0.12 stagger, one-shot as the section approaches (65%). */
  let introTrigger = null;
  fontsReady.then(() => {
    if (disposed) return;
    const introLines = Array.from(root.querySelectorAll('[data-sreel-introline]'));
    introLines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    if (!introLines.length && !(wwd instanceof HTMLElement)) return;
    introTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        introPlayed = true;
        if (wwd instanceof HTMLElement) playLineRevealElement(wwd);
        introLines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
      },
    });
  });

  /* ── Snap — rise windows only (the reel stays free). ──────────── */
  const trySnap = () => {
    if (!trigger) return;
    const rel = (window.scrollY || 0) - trigger.start;
    for (let i = 0; i < 3; i += 1) {
      if (rel > riseStart[i] + 0.5 && rel < reelStart[i] - 0.5) {
        const lenis = getLenisInstance();
        if (!lenis) return;
        lenis.scrollTo(trigger.start + reelStart[i], {
          duration: SNAP_DURATION_S,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
        return;
      }
    }
  };

  /* R28 (Oscar, 2026-09-03) — THE RE-ENTRY SAFETY NET: every visual
     property this section's scrubs and exits touch is re-asserted
     deterministically for the CURRENT progress whenever the section is
     re-entered (from either direction) or its exit cascade is reversed
     out of. Idempotent and cheap: (1) the word-reveal state — a played
     pillar's clips carry lr-visible (a played entrance never un-plays;
     re-adding is a no-op when present); (2) the scrubbed timelines are
     re-rendered at their own current time with force, so any inline
     opacity / filter / transform / visibility a tween owns is rewritten
     from the timeline's authority, whatever interrupted it; (3) the
     type-drop cache is cleared so its next frame rewrites from px.
     Nothing here can desync from scroll — it only re-applies f(scroll). */
  let masterTlRef = null;
  let departTlRef = null;
  let introPlayed = false;
  const lastDropT = [-1, -1, -1]; // R28: hoisted above the safety net (it clears the cache)
  const reassertTexts = () => {
    pillars.forEach((pillar, i) => {
      if (!played[i]) return;
      parts[i].forEach((el) => { if (el instanceof HTMLElement) playLineRevealElement(el); });
    });
    if (wwd instanceof HTMLElement && introPlayed) playLineRevealElement(wwd);
    lastDropT.fill(-1);
    if (masterTlRef) masterTlRef.render(masterTlRef.time(), false, true);
    if (departTlRef) departTlRef.render(departTlRef.time(), false, true);
  };

  /* ── The master timeline (duration units = scroll px). ────────── */
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: `+=${RUNWAY_PX}`,
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => reassertTexts(),
      onEnterBack: () => reassertTexts(),
      onLeaveBack: () => reassertTexts(),
      onUpdate: (self) => {
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
        const px = self.progress * RUNWAY_PX;
        for (let i = 0; i < 3; i += 1) {
          if (px >= riseStart[i]) playTexts(i);
        }
        applyslideArm(px);
        applyTypeDrop(px);
      },
    },
  });

  /* ── THE TYPE DROP — pure f(scrub px), written every frame for the
     two covered pillars on EXACTLY their incoming rise's window
     (same progress; desync impossible; reversal is arithmetic). */
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  masterTlRef = tl;
  const descEls = pillars.map((pl) => pl.querySelector('[data-sreel-desc]'));
  const applyTypeDrop = (px) => {
    /* All three pillars: the two that close scrub on their incoming
       rise's window; AMPLIFY never closes (t = 0) but its desc is
       centred by the same writer (R13) — one authority for the desc
       top, so it can never fight the compaction tweens. */
    for (let k = 0; k < 3; k += 1) {
      let t = 0;
      if (k < 2) {
        const start = riseStart[k + 1];
        const raw = Math.min(Math.max((px - start) / RISE_PX, 0), 1);
        t = easeInOut(raw);
      }
      if (Math.abs(t - lastDropT[k]) < 0.0005) continue;
      lastDropT[k] = t;
      const m = (a, b2) => a + (b2 - a) * t;
      const st = pillars[k].style;
      st.setProperty('--sreel-ttl-fs', `${m(TTL_OPEN.fs, TTL_CLOSED.fs).toFixed(2)}px`);
      st.setProperty('--sreel-ttl-lh', `${m(TTL_OPEN.lh, TTL_CLOSED.lh).toFixed(2)}px`);
      st.setProperty('--sreel-ttl-ls', `${m(TTL_OPEN.ls, TTL_CLOSED.ls).toFixed(4)}em`);
      st.setProperty('--sreel-desc-fs', `${m(DESC_OPEN.fs, DESC_CLOSED.fs).toFixed(2)}px`);
      st.setProperty('--sreel-desc-lh', `${m(DESC_OPEN.lh, DESC_CLOSED.lh).toFixed(2)}px`);
      st.setProperty('--sreel-desc-ls', `${m(DESC_OPEN.ls, DESC_CLOSED.ls).toFixed(4)}em`);
      /* The desc top — centred on the title from both live leadings
         (descTopFor), written here and nowhere else. */
      const desc = descEls[k];
      if (desc instanceof HTMLElement) desc.style.top = `${descTopFor(t).toFixed(2)}px`;
    }
  };
  applyTypeDrop(0);

  /* THE INTRO — the restored statement + note travel up and out past
     the fixed label over [0, INTRO_PX). Plain-ink elements (no
     difference) — transform is safe. */
  const intro = root.querySelector('[data-sreel-intro]');
  if (intro instanceof HTMLElement) {
    tl.fromTo(intro, { y: 0 }, { y: -INTRO_EXIT_PX, duration: INTRO_PX, immediateRender: false }, 0);
  }

  /* RISES + FILLS + REELS per pillar. */
  pillars.forEach((pillar, i) => {
    tl.fromTo(pillar,
      { y: () => stageH() },
      { y: ACTIVE_Y[i], duration: RISE_PX, ease: 'power1.out', immediateRender: i !== 0 ? false : true },
      riseStart[i]);
    const fill = pillar.querySelector('[data-sreel-fill]');
    if (fill instanceof HTMLElement) {
      tl.fromTo(fill, { scaleX: 1 }, { scaleX: 0, duration: RISE_PX, immediateRender: false }, riseStart[i]);
      /* Endpoint belt (FILL_TAIL_FADE_T): see the constant. */
      tl.fromTo(fill, { autoAlpha: 1 },
        { autoAlpha: 0, duration: RISE_PX * FILL_TAIL_FADE_T, immediateRender: false },
        riseStart[i] + RISE_PX * (1 - FILL_TAIL_FADE_T));
    }
    /* THE REEL — list translate with active-row tracking. */
    const list = pillar.querySelector('[data-sreel-list]');
    if (list instanceof HTMLElement) {
      const proxy = { t: 0 };
      tl.to(proxy, {
        t: listTravel(i),
        duration: reelPx(i),
        onUpdate: () => {
          gsap.set(list, { y: -proxy.t });
          updateActive(i, proxy.t);
        },
      }, reelStart[i]);
    }
  });

  /* COMPACTION (pillar 1, during pillar 2's rise — Option 12): the
     panel eases 184→138 while title/desc close 68/66→44/42, all
     layout `top` on the inner elements (difference titles — never
     transform them via an ancestor... the pillar itself transforms,
     but the title blends against the pillar's own opaque ground:
     the staging card contract, kept). */
  const compact = (i, at, dur, toY) => {
    if (toY !== null) tl.to(pillars[i], { y: toY, duration: dur, ease: 'power1.inOut', immediateRender: false }, at);
    const titlerow = pillars[i].querySelector('[data-sreel-titlerow]');
    if (titlerow instanceof HTMLElement) tl.to(titlerow, { top: TITLE_TOP_STACKED, duration: dur, ease: 'power1.inOut' }, at);
    /* (The desc's top is NOT tweened here any more — R13: applyTypeDrop
       centres it on the title every frame from the same t; power1.inOut
       is the identical quadratic in-out, so the title tween and the
       derived desc top move in lock-step.)
       (The type drop is driven from the MASTER onUpdate below as a
       pure function of the scrub position — the house single-progress
       discipline. Tween-based variants — a proxy onUpdate and GSAP's
       native var plugin — both misbehaved under backwards seeks.) */
  };
  compact(0, riseStart[1], RISE_PX, STACKED_Y1);
  /* Pillar 2's active Y IS its stacked Y (266); only its band closes
     (type drop + offsets) as pillar 3 rises. */
  compact(1, riseStart[2], RISE_PX, null);
  /* WHAT WE DO rides pillar 1's compaction (146 → 100). */
  if (wwd instanceof HTMLElement) {
    tl.to(wwd, { top: WWD_Y_STACKED, duration: RISE_PX, ease: 'power1.inOut' }, riseStart[1]);
  }

  /* ROLL-OVER WIPES (staging, kept): as the incoming opaque panel's
     top edge crosses each unit of the covered pillar's lower
     content, that unit blurs/fades. Edge-crossing solved against
     the rise ease + the covered pillar's own compaction slide. */
  const coverPairs = [
    { covered: 0, incoming: 1, fromY: ACTIVE_Y[0], toY: STACKED_Y1 },
    { covered: 1, incoming: 2, fromY: ACTIVE_Y[1], toY: ACTIVE_Y[1] },
  ];
  fontsReady.then(() => {
    if (disposed) return;
    coverPairs.forEach(({ covered, incoming, fromY, toY }) => {
      const pillar = pillars[covered];
      const units = [];
      const push = (sel) => {
        const el = pillar.querySelector(sel);
        if (el instanceof HTMLElement) units.push({ els: [el], bottom: el.offsetTop + el.offsetHeight });
      };
      push('[data-sreel-btn]');
      push('[data-sreel-imgwin]');
      push('[data-sreel-listwin]');
      push('[data-sreel-wlabel]');
      const S = stageH();
      const F = ACTIVE_Y[incoming];
      const windowStart = riseStart[incoming];
      const solveT = (bottom) => {
        for (let k = 0; k <= 400; k += 1) {
          const t = k / 400;
          const yIn = S + (F - S) * (1 - (1 - t) * (1 - t));
          const yCov = fromY + (toY - fromY) * t;
          if (yIn <= yCov + bottom + WIPE_LEAD_PX) return t;
        }
        return 1;
      };
      units.forEach(({ els, bottom }) => {
        tl.fromTo(els,
          { opacity: 1, filter: 'blur(0px)' },
          { opacity: 0, filter: `blur(${WIPE_BLUR_PX}px)`, duration: WIPE_SPAN_PX, immediateRender: false },
          windowStart + solveT(bottom) * RISE_PX);
      });
    });
  });

  /* Dwell placeholder — pins the timeline's total duration to
     RUNWAY_PX so scroll px == timeline time exactly (without it the
     scrub squeezes every beat by cursor/RUNWAY). */
  tl.to({}, { duration: TRANSITION_DWELL_PX }, cursor);

  /* ═══ THE DEPARTURE (Oscar R4, 2026-08-26 — replaces the old
     fade-to-black window, which darkened the ground while the reel's
     text was still visible: the inverse-contrast defect). ONE
     timeline scrubbed over the whole departure phase (unpin →
     Featured's entry), so ordering and reversal are STRUCTURAL:

       [0 … 600]                      every section element blur-
                                      fades out (the cascade below);
       [exitClear … exitClear + 500]  the ground fades to black —
                                      exitClear is AMPLIFY's MEASURED
                                      deepest content edge (pillar y +
                                      image bottom, clamped to the
                                      stage height), i.e. the scroll
                                      at which its bottom edge clears
                                      the viewport top during the
                                      scroll-off. The outro's bottom
                                      pad is exitClear + 500, so the
                                      element-anchored window starts
                                      AT the clearing point and
                                      completes exactly as Featured's
                                      top crosses the viewport bottom
                                      (the contract, verbatim).

     The ground fade starts long after the cascade's end on the same
     scrub — the "gate" is numeric ordering on one progress value, so
     the two can never desync, and scrolling back runs the exact
     inverse (ground lightens fully before any element returns).

     CASCADE CHOREOGRAPHY (the considered stagger): the reel rows +
     their dividers cascade first in list order, then the supporting
     furniture (descriptions, WE CREATE label, image, MORE INFO),
     then the section's skeleton last (pillar titles + /0N indexes,
     the full-width dividers, WHAT WE DO). BLEND SAFETY: the titles
     and indexes carry mix-blend-mode difference — they are faded as
     DIRECT tween targets (self-opacity on a blend element keeps its
     blend while it fades); a wrapper-level fade would isolate the
     blend mid-fade and flash the exact inverse-contrast this task
     removes. The progress fill is already autoAlpha 0 from its
     drain-tail belt and rides its divider; the travelled intro is
     clipped out of the stage (positionally gone). */
  /* R5 (Oscar 2026-08-27, the EARLIER HANDOFF — supersedes the
     exitClear gating, which held the fade until the cascade had
     fully finished): the ground fade now begins when the BLUR-OUT
     reaches SREEL_HANDOFF_GATE_T of its span (0 = unblurred, 1 =
     gone; the span is derived from the cascade's own constants so
     the gate can never drift from the choreography), and the pad
     shrinks so the fade still completes exactly as Featured's top
     crosses the viewport bottom — the black-over-black arrival
     contract, everything ~472px earlier. Blur, fade and the
     arrival boundary all ride THIS one scrubbed timeline. The last
     quarter of the blur-out overlaps the fade's start — the
     departure-vs-ground safety table re-proved on the pass. */
  const blurOutSpan = SREEL_EXIT_HEADS_AT_PX + SREEL_EXIT_SPAN_PX; /* 600 */
  const fadeGateAt = Math.round(blurOutSpan * SREEL_HANDOFF_GATE_T); /* 450 */
  const departPad = fadeGateAt + TRANSITION_GROUND_FADE_PX; /* 783 (R26; was 950) */
  lastDepartPad = departPad;
  section.style.setProperty('--sreel-outro-pad', `${departPad}px`);

  const depart = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: () => `bottom bottom+=${departPad}`,
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      /* R28: reversing out of the cascade (scroll-up) and re-entering
         it both re-assert the texts (the safety net above). */
      onLeaveBack: () => reassertTexts(),
      onEnterBack: () => reassertTexts(),
    },
  });
  departTlRef = depart;
  const exitTween = (els, at, dur = SREEL_EXIT_SPAN_PX) => {
    const list = (Array.isArray(els) ? els : [els]).filter((el) => el instanceof HTMLElement);
    if (list.length) {
      depart.fromTo(list,
        { autoAlpha: 1, filter: 'blur(0px)' },
        { autoAlpha: 0, filter: `blur(${SREEL_EXIT_BLUR_PX}px)`, ease: 'none', duration: dur, immediateRender: false },
        at);
    }
  };
  /* 1 — rows + the reel fade band, cascading in list order. */
  const exitRows = Array.from(pillars[2].querySelectorAll('.landing-sreel__row, .landing-sreel__rowline--end'));
  exitRows.forEach((row, i) => {
    exitTween(row, Math.min(i * SREEL_EXIT_ROW_STAGGER_PX, SREEL_EXIT_ROWS_END_PX - SREEL_EXIT_SPAN_PX));
  });
  exitTween(pillars[2].querySelector('.landing-sreel__listfade'), 0);
  /* 2 — furniture. */
  exitTween([
    pillars[2].querySelector('[data-sreel-desc]'),
    pillars[2].querySelector('[data-sreel-wlabel]'),
    pillars[2].querySelector('[data-sreel-imgwin]'),
    pillars[2].querySelector('[data-sreel-btn]'),
    pillars[0].querySelector('[data-sreel-desc]'),
    pillars[1].querySelector('[data-sreel-desc]'),
  ], SREEL_EXIT_FURNITURE_AT_PX);
  /* 3 — the skeleton: titles + indexes (DIRECT blend targets),
     full-width dividers, WHAT WE DO. */
  exitTween([
    ...pillars.flatMap((p2) => [
      p2.querySelector('.landing-sreel__title'),
      p2.querySelector('.landing-sreel__num'),
      p2.querySelector('.landing-sreel__divider'),
    ]),
    wwd,
  ], SREEL_EXIT_HEADS_AT_PX);
  /* THE GROUND — light → dark over the final 500, starting at the
     blur-out's 75% gate (R5 — see fadeGateAt above; was the
     measured clearing point ~922). */
  depart.fromTo([section, ...pillars],
    { backgroundColor: GROUND_LIGHT },
    { backgroundColor: GROUND_DARK, ease: 'none', duration: TRANSITION_GROUND_FADE_PX, immediateRender: false },
    fadeGateAt);
  /* R27 (Oscar, 2026-09-03) — THE SEAM CLASS: the incoming FEATURED
     stage used to sit at its fixed #161616 while this ground faded
     beneath its top edge (measured: a 216-luminance step at the seam
     mid-fade). It now rides THIS timeline at the same position and
     length, so the two are the identical colour every frame.
     immediateRender: the stage is LIGHT from load (the from state) —
     it enters the viewport 30px before the fade begins (R26: at the
     Amplify image's blur-out), over the still-light ground, and only
     the landing hosts it (null on /services). Reduced motion never
     reaches here (the stage keeps its CSS #161616). */
  const featuredStage = document.querySelector('.landing-featured__stage');
  if (featuredStage instanceof HTMLElement) {
    depart.fromTo(featuredStage,
      { backgroundColor: GROUND_LIGHT },
      { backgroundColor: GROUND_DARK, ease: 'none', duration: TRANSITION_GROUND_FADE_PX, immediateRender: true },
      fadeGateAt);
  }
  departTrigger = depart.scrollTrigger ?? null;
  cleanups.push(() => { departTrigger = null; depart.scrollTrigger?.kill(); depart.kill(); });

  masterTl = tl;
  trigger = tl.scrollTrigger ?? null;

  if (import.meta.env.DEV) {
    window.__landingReel = {
      trigger: () => trigger,
      map: { riseStart, reelStart, RUNWAY_PX, REEL_PX_PER_SERVICE },
      active: () => [...activeIdx],
      img: (i) => ({ current: imgState[i].current, pending: imgState[i].pending, busy: imgState[i].busy, src: imgState[i].el?.src.split('/').pop() }),
    };
  }

  return () => {
    disposed = true;
    window.clearTimeout(snapTimer);
    cleanups.forEach((fn) => fn());
    introTrigger?.kill();
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
