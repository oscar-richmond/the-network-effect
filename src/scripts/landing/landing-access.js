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
 * SNAP: ScrollTrigger snap to 1/STEPS — a pair half-shown reads as
 * broken (two half-words), so the columns settle onto the nearest
 * pair on scroll-stop. Feel (duration/ease) is Oscar's in a real tab.
 *
 * WARP: src/scripts/curve-media.js — the services pop-up gallery's
 * treatment (about-3 detail view: default config + a virtual
 * getScrollPosition feed). One instance per column so the velocity
 * sign follows each column's own direction; the shader's uFocus
 * (via --slide-focus on each [data-carousel-slide] figure) carries
 * the scrubbed centre-sharp/edges-dim falloff, and the veil layer
 * above the canvas carries the white + backdrop-blur treatment,
 * scrubbed per-frame from the same p.
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
import { playLineRevealElement } from '../line-reveal.js';
import { initCurveMedia } from '../curve-media.js';

gsap.registerPlugin(ScrollTrigger);

const ITEM_H = 500;
const PITCH = 524; // 500 image + 24 gap
const STEPS = 5; // six pairs, five transitions
const STEP_SCROLL_PX = 400; // scroll runway per pair transition
const RUNWAY_PX = STEPS * STEP_SCROLL_PX;
const TRAVEL_PX = STEPS * PITCH;
const CENTER_FRACTION = 0.5; // pair band dead-centre (Oscar's rev; file had 580/1029)
const DIM_RANGE = 0.8; // focus floor 0.2 -> shader alpha 0.6 (file: opacity .6)
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

/** Child-preserving exact line wrap — the established pattern for
 *  mixed-face lines (services/network): clip + inner, children MOVED
 *  so the face spans survive. */
function wrapLineExact(el, delaySeconds) {
  const clip = document.createElement('span');
  clip.className = 'lr-clip';
  const inner = document.createElement('span');
  inner.className = 'lr-inner';
  inner.style.transition = `transform 1.2s cubic-bezier(0.42,0,0.24,1) ${delaySeconds.toFixed(2)}s`;
  while (el.firstChild) inner.appendChild(el.firstChild);
  clip.appendChild(inner);
  el.appendChild(clip);
}

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
  const canvases = {
    left: section.querySelector('[data-access-canvas="left"]'),
    right: section.querySelector('[data-access-canvas="right"]'),
  };
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
  const entryGroups = {
    left: [
      section.querySelector('.landing-access__colmask--left'),
      canvases.left,
      section.querySelector('.landing-access__veilwrap--left'),
    ].filter((el) => el instanceof HTMLElement),
    right: [
      section.querySelector('.landing-access__colmask--right'),
      canvases.right,
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
  const state = { p: 0, leftVirtual: 0, rightVirtual: 0 };

  const updateSide = (side, translate) => {
    const top = colTops[side];
    items[side].forEach((fig, i) => {
      if (!(fig instanceof HTMLElement)) return;
      const isPad = i === 0 || i === items[side].length - 1;
      const itemCenter = top + i * PITCH + ITEM_H / 2 + translate;
      const t = isPad ? 1 : Math.min(Math.abs(itemCenter - centerY) / PITCH, 1);
      /* Shader dim (curve-media reads --slide-focus off the figure)
         + DOM fallback opacity for the no-WebGL path. */
      fig.style.setProperty('--slide-focus', (1 - DIM_RANGE * t).toFixed(3));
      fig.style.opacity = (1 - 0.4 * t).toFixed(3);
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

  const applyProgress = (p) => {
    state.p = p;
    const y = p * TRAVEL_PX;
    state.leftVirtual = y;
    state.rightVirtual = -y;
    gsap.set([cols.left, veilcols.left].filter(Boolean), { y: -y });
    gsap.set([cols.right, veilcols.right].filter(Boolean), { y });
    updateSide('left', -y);
    updateSide('right', y);
    const idx = Math.max(0, Math.min(Math.round(p * STEPS), STEPS));
    if (idx !== wordIdx) {
      wordIdx = idx;
      swapWord(wordInners.left, PAIRS[idx][0]);
      swapWord(wordInners.right, PAIRS[idx][1]);
    }
  };

  measure();
  applyProgress(0);

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${RUNWAY_PX}`,
    scrub: true,
    snap: {
      snapTo: 1 / STEPS,
      duration: { min: 0.25, max: 0.6 },
      delay: 0.08,
      ease: 'power2.out',
    },
    onUpdate: (self) => applyProgress(self.progress),
  });

  /* ── Warp: one curve-media instance per column so the bend and
     aberration follow each column's own direction. Services-popup
     parity: default config, virtual scroll feed. Null/throw →
     DOM images (with the CSS/JS opacity falloff) are the fallback. */
  const curves = [];
  try {
    const left = initCurveMedia(
      canvases.left,
      canvases.left,
      items.left.map((f) => f.querySelector('img')).filter(Boolean),
      { getScrollPosition: () => state.leftVirtual },
    );
    if (left) curves.push(left);
    const right = initCurveMedia(
      canvases.right,
      canvases.right,
      items.right.map((f) => f.querySelector('img')).filter(Boolean),
      { getScrollPosition: () => state.rightVirtual },
    );
    if (right) curves.push(right);
  } catch (error) {
    console.warn('[landing-access] curve-media init failed — DOM image fallback.', error);
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
      wrapLineExact(line, i * LINE_STAGGER_S);
    });
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
    window.removeEventListener('resize', onResize);
    trigger.kill();
    revealTrigger?.kill();
    curves.forEach((c) => c.destroy());
    wordTls.forEach((tl) => tl.kill());
    innersList.forEach((el) => gsap.killTweensOf(el));
  };
}
