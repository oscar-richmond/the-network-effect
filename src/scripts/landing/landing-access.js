/**
 * WE CREATE ACCESS — opposed-column pair travel (/landing).
 *
 * THE MECHANISM (lockstep by construction): one ScrollTrigger scrub
 * produces a single progress value p ∈ [0,1]; every moving part is a
 * pure function of that one number — left column y = -p·TRAVEL,
 * right column y = +p·TRAVEL, the veil columns mirror their image
 * columns with the same assignment, the warp instances' virtual
 * scroll positions are ±p·TRAVEL, and the word pair is
 * round(p·STEPS). Two tweens could drift by a frame; two
 * assignments from one number cannot.
 *
 * SNAP: on scroll-idle, THROUGH Lenis (lenis.scrollTo — the page's
 * one scroll authority). The first build used ScrollTrigger's own
 * snap, whose tween writes scrollTop in parallel with Lenis's lerp
 * loop — two writers alternating values at settle, which Oscar felt
 * as the columns "shaking before they stop". One writer, no fight.
 *
 * MEDIA SHADER: src/scripts/landing/access-wave.js — the about-3
 * pillar-wave treatment (velocity bow + hover grain, opaque output,
 * colours true) on ONE static full-stage canvas, each plane's
 * velocity signed by its column's own travel. Replaces the old
 * curve-media warp (Oscar: "remove the old one, use the latest").
 * The veil layer above the canvas carries the white + backdrop-blur
 * treatment, scrubbed per-frame from the same p.
 *
 * BLEND MAP: difference words sit at z4 with ancestor chain
 * section > stage only (sticky, no transform/filter/opacity/mask);
 * the transformed columns and the canvases are earlier SIBLINGS, so
 * they are backdrop, never blend ancestors. Veils use
 * backdrop-filter, so their own wrappers must stay unmasked (a mask
 * would form a backdrop root and cut them off from the canvas).
 *
 * Reduced motion: no init at all — the authored markup + CSS is the
 * static pair-1 frame (centre sharp, neighbours veiled, words set).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { createAccessWave } from './access-wave.js';

gsap.registerPlugin(ScrollTrigger);

const ITEM_H = 500;
const PITCH = 524; // 500 image + 24 gap
const STEPS = 5; // six pairs, five transitions
const STEP_SCROLL_PX = 400; // scroll runway per pair transition
const RUNWAY_PX = STEPS * STEP_SCROLL_PX; // the pair travel (2000)
const TRAVEL_PX = STEPS * PITCH;
/* THE EXIT (Oscar's rev): after Corporate/Community land, both
   columns ride up and out the top at 1:1 (one viewport of travel);
   the words fade fast; the BOTTOM blur band holds then fades (radii
   drained — the opacity-wrapper/backdrop-root lesson); the centre
   headline holds until the bottom pair-images pass it on their way
   up, then un-reveals (the reverse of FEATURED WORK's entrance),
   re-revealing symmetrically on the way back down. */
/* Exit distance = what the VISIBLE images need to reach the TOP
   BLUR BAND (Oscar's rev 3 — "off or into the blur overlay"): the
   below-partial's bottom (centerY + 250 + 524 = 1274 at the 1000
   design viewport) minus the band's 192px depth. The section
   releases the moment the last images are dissolving in the band,
   and the closing section enters immediately (its top = the scrub
   end by construction). */
const TOP_BAND_PX = 192; // the 12rem GradualBlur band
const EXIT_PX = 1274 - TOP_BAND_PX; // 1082
const TOTAL_RUNWAY_PX = RUNWAY_PX + EXIT_PX; // 3082
const EXIT_WORD_FADE_T = 0.15; // words gone by 15% of the exit
const EXIT_BAND_FADE_START_T = 0.25;
const EXIT_BAND_FADE_END_T = 0.65;
/* Headline pass point: the centred images' bottom (centerY + 250)
   crosses the headline block's top (centerY - 64). */
const HEADLINE_PASS_T = (ITEM_H / 2 + 64) / EXIT_PX; // 0.314
const CENTER_FRACTION = 0.5; // pair band dead-centre (Oscar's rev; file had 580/1029)
/* No image dim (Oscar's rev 3): the old shader-alpha 0.6 + white wash
   read as CLOUDY, not like a Figma background blur — Figma keeps the
   image at full strength behind the translucent fill. Planes render
   at focus 1 (full alpha); the veil (white 0.1 + blur) is the only
   off-centre treatment. */
const BLUR_DEAD_FRACTION = 0.5; // sharp until half a pitch off-centre
const VEIL_BLUR_PX = 30; // Oscar's rev 2: stronger than the Figma 20
const VEIL_BG_ALPHA = 0.1;
const LINE_STAGGER_S = 0.12;
const WORDS_AT_MS = 700;
/* Entrance (Oscar's rev): the section greets as a PLAIN light ground
   at the pin; then the headline reveals (hero-copy line mechanism)
   while the left column slides up from the bottom edge and the right
   slides down from the top — the house reveal curve, all at once.
   The slide lives on the STATIC wrappers (colmask/canvas/veilwrap),
   so it composes independently with the scroll travel on the inner
   columns, and the warp planes follow the image rects wherever both
   transforms put them. */
const ENTRY_CURVE = 'transform 1.2s cubic-bezier(0.42, 0, 0.24, 1)';
const WORD_SWAP_OUT_S = 0.12;
const WORD_SWAP_IN_S = 0.22;
const WORD_SWAP_BLUR_PX = 6;
const SNAP_IDLE_MS = 150; // scroll quiet time before the pair snap fires
const SNAP_DURATION_S = 0.6;

/** Word pairs, sentence case per the Figma. Pair 2 is deliberately
 *  the same word both sides (deck-sourced brand-to-brand). */
const PAIRS = [
  ['Talent', 'Brands'],
  ['Brands', 'Brands'],
  ['Talent', 'Business'],
  ['Hospitality', 'Culture'],
  ['Media', 'Commerce'],
  ['Corporate', 'Community'],
];

/** Column stack shapes (must match LandingAccess.astro): index of the
 *  pair-1 (rest-centred) item in each 8-item stack. */
const PRIME_LEFT = 1;
const PRIME_RIGHT = 6;

export function initLandingAccess() {
  const section = document.querySelector('[data-landing-access]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const stage = section.querySelector('[data-access-stage]');
  const cols = {
    left: section.querySelector('[data-access-col="left"]'),
    right: section.querySelector('[data-access-col="right"]'),
  };
  const veilcols = {
    left: section.querySelector('[data-access-veils="left"]'),
    right: section.querySelector('[data-access-veils="right"]'),
  };
  const canvas = section.querySelector('[data-access-canvas]');
  const wordInners = {
    left: section.querySelector('[data-access-word="left"] .landing-access__word-inner'),
    right: section.querySelector('[data-access-word="right"] .landing-access__word-inner'),
  };
  if (!(stage instanceof HTMLElement) || !cols.left || !cols.right) return () => {};

  const items = {
    left: Array.from(cols.left.children),
    right: Array.from(cols.right.children),
  };
  const veils = {
    left: Array.from(veilcols.left?.children ?? []),
    right: Array.from(veilcols.right?.children ?? []),
  };

  /* ── Geometry: derived, not hand-tuned. Column tops place the prime
     item's centre on the pair band; item centres re-derive per frame
     from p alone. CSS carries matching dvh defaults for the no-JS/RM
     frame; JS overwrites with measured px. */
  let centerY = 0;
  const colTops = { left: 0, right: 0 };
  const measure = () => {
    const stageH = stage.clientHeight || window.innerHeight;
    centerY = stageH * CENTER_FRACTION;
    colTops.left = centerY - ITEM_H / 2 - PRIME_LEFT * PITCH;
    colTops.right = centerY - ITEM_H / 2 - PRIME_RIGHT * PITCH;
    stage.style.setProperty('--access-center-y', `${centerY.toFixed(1)}px`);
    [cols.left, veilcols.left].forEach((el) => {
      if (el instanceof HTMLElement) el.style.top = `${colTops.left.toFixed(1)}px`;
    });
    [cols.right, veilcols.right].forEach((el) => {
      if (el instanceof HTMLElement) el.style.top = `${colTops.right.toFixed(1)}px`;
    });
  };

  /* ── Entrance: park each side's static wrappers offscreen (left
     below, right above) until the pin. Set NOW, before fonts/paint —
     the arrival ground must be plain. RM never reaches this (early
     return above keeps the static frame). */
  /* The shader canvas is NOT parked: planes track the image rects, so
     they ride the wrappers' entrance slide automatically. */
  const entryGroups = {
    left: [
      section.querySelector('.landing-access__colmask--left'),
      section.querySelector('.landing-access__veilwrap--left'),
    ].filter((el) => el instanceof HTMLElement),
    right: [
      section.querySelector('.landing-access__colmask--right'),
      section.querySelector('.landing-access__veilwrap--right'),
    ].filter((el) => el instanceof HTMLElement),
  };
  entryGroups.left.forEach((el) => { el.style.transform = 'translateY(100dvh)'; });
  entryGroups.right.forEach((el) => { el.style.transform = 'translateY(-100dvh)'; });

  let entered = false;
  const playEntrance = () => {
    if (entered) return;
    entered = true;
    /* Same-tick handoff via forced reflow (no rAF dependency): commit
       the parked position under the new transition, then retarget. */
    [...entryGroups.left, ...entryGroups.right].forEach((el) => {
      el.style.transition = ENTRY_CURVE;
    });
    void section.offsetWidth;
    [...entryGroups.left, ...entryGroups.right].forEach((el) => {
      el.style.transform = 'translateY(0px)';
    });
    timeouts.push(setTimeout(() => {
      [...entryGroups.left, ...entryGroups.right].forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
      });
    }, 1400));
  };

  /* ── The single shared progress. Everything below is f(p). */
  const state = { p: 0, travelP: 0, exitT: 0, leftVirtual: 0, rightVirtual: 0 };

  /* Exit-phase fixtures: the word layers, the bottom blur band's
     layers + tint, and the headline un-reveal hooks (assigned after
     the wrap, inside fonts.ready). */
  const wordEls = ['left', 'right']
    .map((s) => section.querySelector(`[data-access-word="${s}"]`))
    .filter((el) => el instanceof HTMLElement);
  const bottomBandLayers = Array.from(
    section.querySelectorAll('.gradual-blur[data-gradual-blur-position="bottom"] [data-gradual-blur-layer]'),
  );
  const bottomBandBases = bottomBandLayers.map((l) => {
    const m = /([\d.]+)rem/.exec(l.style.backdropFilter || '');
    return m ? parseFloat(m[1]) : 0;
  });
  const bottomTint = section.querySelector('.landing-access__edge-tint--bottom');
  let headlineHidden = false;
  let hideHeadline = null;
  let showHeadline = null;
  /* The right column's below-viewport tail (indices 3+ at p=1 — the
     items hanging under the centred pair after its downward travel).
     Hidden the instant the exit begins (they're offscreen then, so
     the toggle is invisible) so only the three in-view images are
     seen leaving; restored at exit zero. Their veils and GL planes
     follow (access-wave skips hidden frames). */
  let tailHidden = false;
  const rightTail = [
    ...items.right.slice(3),
    ...veils.right.slice(3),
  ].filter((el) => el instanceof HTMLElement);
  const setTailHidden = (hidden) => {
    tailHidden = hidden;
    rightTail.forEach((el) => { el.style.visibility = hidden ? 'hidden' : ''; });
  };

  const updateSide = (side, translate) => {
    const top = colTops[side];
    items[side].forEach((fig, i) => {
      if (!(fig instanceof HTMLElement)) return;
      const isPad = i === 0 || i === items[side].length - 1;
      const itemCenter = top + i * PITCH + ITEM_H / 2 + translate;
      const dist = Math.abs(itemCenter - centerY);
      /* Dead zone (Oscar's rev 3 — "blur set in too early"): an image
         stays fully sharp until it's half a pitch off-centre (well on
         its way out), then the veil ramps over the remaining half. At
         snapped positions this still gives centre-sharp / neighbours
         fully veiled. */
      const dead = PITCH * BLUR_DEAD_FRACTION;
      const t = isPad ? 1 : Math.min(Math.max((dist - dead) / (PITCH - dead), 0), 1);
      const veil = veils[side][i];
      if (veil instanceof HTMLElement) {
        const blur = VEIL_BLUR_PX * t;
        veil.style.backdropFilter = blur < 0.2 ? 'none' : `blur(${blur.toFixed(1)}px)`;
        veil.style.webkitBackdropFilter = veil.style.backdropFilter;
        veil.style.background = `rgba(255,255,255,${(VEIL_BG_ALPHA * t).toFixed(3)})`;
      }
    });
  };

  let wordIdx = 0;
  /* One live swap timeline per word — a new swap KILLS the previous
     timeline whole (including its pending set-text callback), so
     rapid boundary crossings always land on the latest word. */
  const wordTls = new Map();
  const swapWord = (inner, text) => {
    if (!(inner instanceof HTMLElement)) return;
    /* Pair 2 keeps 'Brands' on the right on purpose — an unchanged
       word holds steady rather than dipping (reads as continuity). */
    if (inner.textContent === text) return;
    wordTls.get(inner)?.kill();
    const tl = gsap.timeline()
      .to(inner, { opacity: 0, filter: `blur(${WORD_SWAP_BLUR_PX}px)`, duration: WORD_SWAP_OUT_S, ease: 'power1.in' })
      .add(() => { inner.textContent = text; })
      .to(inner, { opacity: 1, filter: 'blur(0px)', duration: WORD_SWAP_IN_S, ease: 'power1.out' });
    wordTls.set(inner, tl);
  };

  const applyProgress = (rawP) => {
    state.p = rawP;
    const rel = rawP * TOTAL_RUNWAY_PX;
    const travelP = Math.min(rel / RUNWAY_PX, 1);
    const exitT = Math.max(0, (rel - RUNWAY_PX) / EXIT_PX);
    state.travelP = travelP;
    state.exitT = exitT;
    const y = travelP * TRAVEL_PX;
    const exitY = exitT * EXIT_PX;
    /* Both columns ride UP together during the exit (the shader's
       virtual feeds see the same rise, so both bow upward). */
    state.leftVirtual = y + exitY;
    state.rightVirtual = -y + exitY;
    gsap.set([cols.left, veilcols.left].filter(Boolean), { y: -y - exitY });
    gsap.set([cols.right, veilcols.right].filter(Boolean), { y: y - exitY });
    updateSide('left', -y - exitY);
    updateSide('right', y - exitY);
    if (exitT > 0 && !tailHidden) setTailHidden(true);
    else if (exitT === 0 && tailHidden) setTailHidden(false);
    /* Words vanish fast as the exit begins (container opacity — the
       entrance drives the INNER spans, no conflict). */
    const wordAlpha = Math.max(0, 1 - exitT / EXIT_WORD_FADE_T);
    wordEls.forEach((el) => { el.style.opacity = exitT > 0 ? wordAlpha.toFixed(3) : ''; });
    /* Bottom band: holds, then fades (radii drained + tint). */
    const bandT = Math.min(Math.max((exitT - EXIT_BAND_FADE_START_T) / (EXIT_BAND_FADE_END_T - EXIT_BAND_FADE_START_T), 0), 1);
    bottomBandLayers.forEach((l, i) => {
      const v = `blur(${(bottomBandBases[i] * (1 - bandT)).toFixed(3)}rem)`;
      l.style.backdropFilter = v;
      l.style.webkitBackdropFilter = v;
    });
    if (bottomTint instanceof HTMLElement) bottomTint.style.opacity = (1 - bandT).toFixed(3);
    /* Headline: holds until the bottom images pass it, then
       un-reveals (reverse of FEATURED WORK's entrance); symmetric
       on the way back. */
    if (exitT >= HEADLINE_PASS_T && !headlineHidden) {
      headlineHidden = true;
      hideHeadline?.();
    } else if (exitT < HEADLINE_PASS_T && headlineHidden) {
      headlineHidden = false;
      showHeadline?.();
    }
    const idx = Math.max(0, Math.min(Math.round(travelP * STEPS), STEPS));
    if (idx !== wordIdx) {
      wordIdx = idx;
      swapWord(wordInners.left, PAIRS[idx][0]);
      swapWord(wordInners.right, PAIRS[idx][1]);
    }
  };

  measure();
  applyProgress(0);

  /* ── Pair snap, single-authority: after SNAP_IDLE_MS of scroll
     quiet inside the runway, glide to the nearest pair THROUGH
     Lenis. Every onUpdate (including those from the snap's own
     glide) resets the timer; when the glide lands, the final idle
     check is within a pixel of target and no-ops — no loops, and a
     user wheel during the glide simply retargets Lenis. */
  let snapTimer = 0;
  let lastSnapTarget = null;
  const trySnap = () => {
    const rel = (window.scrollY || 0) - trigger.start;
    /* Pairs only — the exit phase (rel > RUNWAY_PX) is free. */
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

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${TOTAL_RUNWAY_PX}`,
    scrub: true,
    onUpdate: (self) => {
      applyProgress(self.progress);
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
    },
  });

  /* ── Media shader (access-wave.js): one instance, both columns,
     per-plane velocity signed by column. Null/throw → plain DOM
     images are the fallback. */
  let wave = null;
  if (canvas instanceof HTMLCanvasElement) {
    try {
      wave = createAccessWave(
        stage,
        canvas,
        {
          left: items.left.map((f) => f.querySelector('img')).filter(Boolean),
          right: items.right.map((f) => f.querySelector('img')).filter(Boolean),
        },
        () => ({ left: state.leftVirtual, right: state.rightVirtual }),
      );
    } catch (error) {
      console.warn('[landing-access] access-wave init failed — DOM image fallback.', error);
    }
  }

  /* ── Arrival reveal: headline lines founders-style (exact wrap —
     mixed faces inside lines), words blur in on the image slot. */
  const lines = Array.from(section.querySelectorAll('[data-access-line]'));
  const innersList = [wordInners.left, wordInners.right].filter((el) => el instanceof HTMLElement);
  gsap.set(innersList, { opacity: 0, filter: `blur(${WORD_SWAP_BLUR_PX}px)` });

  const timeouts = [];
  let revealTrigger = null;
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });

    /* Headline exit hooks (the network-exit pattern): un-reveal with
       zeroed stagger delays — the reverse of FEATURED WORK's
       entrance — and restore the delays on re-reveal. */
    const hlDelays = new Map();
    lines.forEach((line) => {
      line.querySelectorAll('.lr-inner').forEach((inner) => {
        hlDelays.set(inner, getComputedStyle(inner).transitionDelay);
      });
    });
    hideHeadline = () => {
      lines.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = '0s';
        });
        line.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
          clip.classList.remove('lr-visible');
        });
      });
    };
    showHeadline = () => {
      lines.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = hlDelays.get(inner) ?? '';
        });
        if (line instanceof HTMLElement) playLineRevealElement(line);
      });
    };

    revealTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      once: true,
      onEnter: () => {
        /* One moment, three movements: headline lines (hero-copy
           reveal), both columns sliding in, words on the image slot. */
        playEntrance();
        lines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
        timeouts.push(setTimeout(() => {
          gsap.to(innersList, {
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.6,
            ease: 'power1.out',
          });
        }, WORDS_AT_MS));
      },
    });
  });

  const onResize = () => {
    measure();
    applyProgress(state.p);
  };
  window.addEventListener('resize', onResize);

  if (import.meta.env.DEV) {
    window.__landingAccess = {
      state: () => ({ ...state, wordIdx }),
      wave: () => wave,
      lastSnapTarget: () => lastSnapTarget,
      geometry: () => ({ centerY, colTops: { ...colTops } }),
      trigger: () => trigger,
      /* Occluded-pane harness: rAF (and so gsap playback) can be
         frozen — this force-completes any live word-swap timelines
         so the set-text path is verifiable. Dev only. */
      completeWordSwaps: () => wordTls.forEach((tl) => tl.progress(1)),
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    window.clearTimeout(snapTimer);
    window.removeEventListener('resize', onResize);
    trigger.kill();
    revealTrigger?.kill();
    wave?.destroy();
    wordTls.forEach((tl) => tl.kill());
    innersList.forEach((el) => gsap.killTweensOf(el));
  };
}
