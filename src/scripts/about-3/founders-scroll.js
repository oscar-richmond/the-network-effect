import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement } from '../line-reveal.js';
import { createFoundersDissolve } from './founders-dissolve.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * /about-3 Founders section — two-slide carousel: scroll-scrubbed entrance,
 * scroll-SNAPPED slide transition.
 *
 * Follows the hero's convention (no GSAP pin): the section is an in-flow
 * runway of `TOTAL_RUNWAY` px whose fixed stage holds the visuals. The
 * ENTRANCE tweens are scrubbed ScrollTriggers anchored to the section's
 * document position ('top+=X bottom' = X px of scroll after the section's
 * top crosses the viewport bottom — which is EXIT_BUFFER (60px) after the
 * hero's bg-fade completes, making that the natural handoff point).
 *
 * The slide 1 → 2 TRANSITION is NOT scrubbed: a callback-only ScrollTrigger
 * at SNAP_THRESHOLD plays/reverses a single paused timeline (time-based,
 * TRANSITION_DURATION). play()/reverse() on one persistent timeline
 * retargets natively from the current playhead on rapid direction flips —
 * never stacks or double-fires. Scroll position itself is never touched
 * (no hijacking; Lenis unaffected) — the stage being position: fixed means
 * a slide is always full-frame, and the timeline always completes to a
 * fully-resolved endpoint.
 *
 * Scroll map (px from handoff):
 *   0 … 600                slide 1 entrance (bg, portrait, name, meta, index)
 *   600 … SNAP_THRESHOLD   hold — slide 1 fully shown
 *   SNAP_THRESHOLD         crossing plays the dissolve + text swap (timed)
 *   … TOTAL_RUNWAY         hold — slide 2 fully shown; end of page
 *
 * Imagery: the WebGL noise dissolve (founders-dissolve.js) supersedes the
 * DOM image crossfade — the timeline drives its uProgress via a proxy
 * tween. If WebGL is unavailable the module returns null and the timeline
 * carries DOM opacity tweens instead (today's crossfade as degradation).
 *
 * Blend safety (see founders.css): all transition opacity animates on each
 * slide's individual children — never on a wrapper above the name — so the
 * name's mix-blend-mode: difference keeps compositing against the full
 * backgrounds (now canvas content, still ordinary paintable content in the
 * stage's isolated stacking context) throughout.
 */

/** Entrance sub-windows (px from handoff). */
const ENTRANCE_BG = [0, 300];
const ENTRANCE_PORTRAIT = [60, 360];
const ENTRANCE_INDEX = [150, 450];
const ENTRANCE_NAME = [180, 480];
const ENTRANCE_META = [240, 600];
/** Scroll position (px from handoff) whose crossing triggers the snap
 * transition — down past it plays 0→1, back up past it plays 1→0. */
const SNAP_THRESHOLD = 1300;
/** Total runway — also the section's in-flow height. The transition no
 * longer consumes scroll distance (was a 900px scrubbed window), so the
 * runway is SNAP_THRESHOLD + a 500px hold on slide 2. */
const TOTAL_RUNWAY = 1800;
/** Snap transition length, seconds. Text phasing mirrors the old scrubbed
 * midpoint: outgoing text in the first half, incoming from the midpoint. */
const TRANSITION_DURATION = 1.2;
const TRANSITION_EASE = 'power2.inOut';
/** Marker travel between thumb centres: 48px thumb + 16px gap. */
const MARKER_TRAVEL = 64;

/**
 * Wrap slide-1's meta paragraphs into line-reveal clips (same technique
 * as the hero intro), resetting to original text first so re-wrapping on
 * resize re-measures line breaks cleanly.
 * @param {HTMLElement} meta
 * @returns {HTMLElement[]} per-line `.lr-inner` elements, reading order
 */
function wrapMetaLines(meta) {
  const paragraphs = Array.from(meta.querySelectorAll('p'));
  paragraphs.forEach((p) => {
    if (p.dataset.origHtml === undefined) {
      p.dataset.origHtml = p.innerHTML;
    } else {
      p.innerHTML = p.dataset.origHtml;
    }
    wrapLineRevealElement(p);
  });
  const inners = Array.from(meta.querySelectorAll('.lr-inner'));
  // wrapLineRevealElement leaves an inline `transition: transform` meant
  // for its class-toggle reveal; that fights GSAP's continuous scrub.
  inners.forEach((el) => {
    el.style.transition = 'none';
  });
  return inners;
}

/**
 * Build all triggers for the section. Assumes fonts are ready (line
 * wrapping measures rendered text).
 * @param {HTMLElement} section
 * @param {ReturnType<typeof createFoundersDissolve>} dissolve WebGL module, or null (DOM fallback)
 * @returns {gsap.core.Timeline | undefined} the snap transition timeline (kill on rebuild)
 */
function buildFoundersTriggers(section, dissolve) {
  const slides = Array.from(section.querySelectorAll('[data-founder-slide]'));
  if (slides.length < 2) return;
  const [slide1, slide2] = slides;

  section.style.height = `${TOTAL_RUNWAY}px`;

  /** ScrollTrigger positions: X px of scroll after section top crosses
   * the viewport bottom. Recomputed from the live DOM on every
   * ScrollTrigger.refresh(), so the hero setting its spacer height later
   * (post-settle) self-corrects these. */
  const at = (px) => `top+=${px} bottom`;
  const scrub = (start, end, id) => ({
    trigger: section,
    start: at(start),
    end: at(end),
    scrub: true,
    id: `founders-${id}`,
  });

  const q1 = (sel) => slide1.querySelector(sel);
  const q2 = (sel) => slide2.querySelector(sel);

  // ── Slide 1 entrance ─────────────────────────────────────────────────
  const bg1 = q1('[data-founder-bg]');
  if (bg1) {
    gsap.fromTo(
      bg1,
      { opacity: 0 },
      { opacity: 1, ease: 'none', scrollTrigger: scrub(...ENTRANCE_BG, 'bg1') },
    );
  }

  const portrait1 = q1('[data-founder-portrait]');
  if (portrait1) {
    gsap.fromTo(
      portrait1,
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, ease: 'none', scrollTrigger: scrub(...ENTRANCE_PORTRAIT, 'portrait1') },
    );
  }

  // `y: 0` in from AND to on the yPercent tweens below: the CSS initial
  // hidden state is a % translate, which GSAP's matrix parse bakes into a
  // PIXEL `y` — left unmanaged it would survive the tween and hold the
  // element offscreen at progress 1 (the hero's intro tween guards the
  // same way).
  const name1 = q1('[data-founder-name]');
  if (name1) {
    gsap.fromTo(
      name1,
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, ease: 'none', scrollTrigger: scrub(...ENTRANCE_NAME, 'name1') },
    );
  }

  const meta1 = q1('[data-founder-meta]');
  const metaLines = meta1 instanceof HTMLElement ? wrapMetaLines(meta1) : [];
  if (metaLines.length) {
    gsap
      .timeline({ scrollTrigger: scrub(...ENTRANCE_META, 'meta1') })
      .fromTo(
        metaLines,
        { yPercent: 110, y: 0 },
        { yPercent: 0, y: 0, ease: 'none', duration: 1, stagger: 0.35 },
      );
  }

  const index = section.querySelector('[data-founders-index]');
  if (index) {
    gsap.fromTo(
      index,
      { opacity: 0 },
      { opacity: 1, ease: 'none', scrollTrigger: scrub(...ENTRANCE_INDEX, 'index') },
    );
  }

  // ── Slide 1 → slide 2: snap transition timeline ──────────────────────
  // One persistent PAUSED timeline holds the dissolve progress AND all the
  // DOM text tweens — a single driver keeps them in sync by construction,
  // and play()/reverse() retargets cleanly from the current playhead on
  // rapid direction flips (never stacks). immediateRender: false on every
  // fromTo — the timeline is built paused, and rendering "from" values at
  // build time would stamp over the entrance tweens' initial CSS states
  // (same guard as the hero's buildExitWipe).
  const half = TRANSITION_DURATION / 2;
  const tl = gsap.timeline({ paused: true });

  if (dissolve) {
    const progress = { value: 0 };
    tl.to(
      progress,
      {
        value: 1,
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
        onUpdate: () => dissolve.setProgress(progress.value),
      },
      0,
    );
  } else {
    // DOM fallback (WebGL unavailable): the pre-dissolve opacity crossfade.
    // Slide 1's background stays opaque underneath — slide 2's fades in
    // over it (z-index 2 in CSS), no mid-fade dip to the layers below.
    tl.fromTo(
      portrait1,
      { opacity: 1 },
      { opacity: 0, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
    tl.fromTo(
      [q2('[data-founder-bg]'), q2('[data-founder-portrait]')].filter(Boolean),
      { opacity: 0 },
      { opacity: 1, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
  }

  // Text swaps sequentially around the midpoint — the slides' meta blocks
  // and names occupy the same positions, so overlapping fades would
  // double-expose the copy.
  const textOut = [
    meta1,
    name1,
    section.querySelector('[data-founders-thumb-border="0"]'),
    section.querySelector('[data-founders-label="0"]'),
  ].filter(Boolean);
  if (textOut.length) {
    tl.fromTo(
      textOut,
      { opacity: 1 },
      { opacity: 0, duration: half, ease: 'power2.in', immediateRender: false },
      0,
    );
  }

  const textIn = [
    q2('[data-founder-meta]'),
    q2('[data-founder-name]'),
    section.querySelector('[data-founders-thumb-border="1"]'),
    section.querySelector('[data-founders-label="1"]'),
  ].filter(Boolean);
  if (textIn.length) {
    tl.fromTo(
      textIn,
      { opacity: 0 },
      { opacity: 1, duration: half, ease: 'power2.out', immediateRender: false },
      half,
    );
  }

  // Slide 2's name arrives already risen — the transition is opacity-only.
  const name2 = q2('[data-founder-name]');
  if (name2) gsap.set(name2, { yPercent: 0 });

  const marker = section.querySelector('[data-founders-marker]');
  if (marker) {
    tl.fromTo(
      marker,
      { y: 0 },
      { y: MARKER_TRAVEL, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
  }

  // Threshold trigger — callbacks only, no scrub, scroll position never
  // touched (no ScrollTrigger snap config — that animates scrollTo and
  // would fight Lenis).
  ScrollTrigger.create({
    trigger: section,
    start: at(SNAP_THRESHOLD),
    end: at(SNAP_THRESHOLD),
    id: 'founders-snap',
    onEnter: () => tl.play(),
    onLeaveBack: () => tl.reverse(),
  });

  return tl;
}

/** Kill only this module's triggers (all carry a `founders-` id). */
function killFoundersTriggers() {
  ScrollTrigger.getAll().forEach((trigger) => {
    if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('founders-')) {
      trigger.kill();
    }
  });
}

/**
 * Boot the Founders section on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initFoundersScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const section = document.querySelector('body.about-page-3 [data-founders-section]');
  if (!(section instanceof HTMLElement)) return () => {};

  // WebGL dissolve — created ONCE (persists across trigger rebuilds; only
  // torn down with the module). null → the timeline builds the DOM
  // crossfade fallback instead.
  const stage = section.querySelector('[data-founders-stage]');
  const dissolve = stage instanceof HTMLElement ? createFoundersDissolve(stage) : null;

  let cancelled = false;
  /** @type {gsap.core.Timeline | undefined} */
  let transitionTl;

  const build = () => {
    if (cancelled) return;
    // If a resize lands mid-transition, the outgoing timeline dies with
    // partial values stamped on its targets — remember that so the fresh
    // timeline can be force-rendered to a resolved endpoint below.
    const prevProgress = transitionTl ? transitionTl.progress() : 0;
    killFoundersTriggers();
    transitionTl?.kill();
    transitionTl = buildFoundersTriggers(section, dissolve);
    ScrollTrigger.refresh();
    // State restoration: rebuilding (resize / late refresh) while already
    // past the threshold must resolve to slide 2 INSTANTLY — never replay
    // the transition. (The fresh trigger's onEnter may also have fired
    // during the refresh above, starting a play from 0 — this overrides
    // it in the same frame.) Below the threshold, only force-render the
    // slide-1 endpoint when the previous timeline died mid-flight — on a
    // clean build the paused-at-0 timeline must NOT render, so the
    // entrance tweens' initial CSS states stay untouched.
    // NOTE: these are playhead JUMPS — GSAP suppresses events (including the
    // proxy tween's onUpdate) on jump-renders, so the dissolve uniform must
    // be written explicitly alongside each jump; only live play()/reverse()
    // ticks fire onUpdate.
    const snap = ScrollTrigger.getById('founders-snap');
    if (snap && transitionTl) {
      if (window.scrollY >= snap.start) {
        transitionTl.progress(1).pause();
        dissolve?.setProgress(1);
      } else if (prevProgress > 0) {
        transitionTl.progress(1).progress(0).pause();
        dissolve?.setProgress(0);
      }
    }
  };

  // Fonts must be ready before line-reveal wrapping measures line breaks
  // (same gate the hero uses).
  document.fonts.ready.then(build);

  // Own resize handling — deliberately separate from about-scroll.js's
  // handler (which rebuilds only the hero's triggers). Line breaks and
  // trigger positions both depend on viewport size.
  //
  // Guarded against no-op resize events (same window dimensions): a rebuild
  // mid-transition instantly resolves the snap timeline to an endpoint, so
  // spurious resize events — e.g. mobile URL-bar show/hide re-firing with
  // an unchanged width — must not tear down a playing transition.
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  const onResize = () => {
    if (window.innerWidth === lastW && window.innerHeight === lastH) return;
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    build();
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelled = true;
    window.removeEventListener('resize', onResize);
    killFoundersTriggers();
    transitionTl?.kill();
    transitionTl = undefined;
    dissolve?.destroy();
    gsap.killTweensOf(
      section.querySelectorAll(
        '[data-founder-bg], [data-founder-portrait], [data-founder-meta], [data-founder-name], [data-founders-index], [data-founders-marker], [data-founders-thumb-border], [data-founders-label], .lr-inner',
      ),
    );
  };
}
