import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * /about-3 Founders section — scroll-driven two-slide carousel.
 *
 * Follows the hero's convention (no GSAP pin): the section is an in-flow
 * runway of `TOTAL_RUNWAY` px whose fixed stage holds the visuals; every
 * tween is a scrubbed ScrollTrigger anchored to the section's document
 * position ('top+=X bottom' = X px of scroll after the section's top
 * crosses the viewport bottom — which is EXIT_BUFFER (60px) after the
 * hero's bg-fade completes, making that the natural handoff point).
 *
 * Scroll map (px from handoff):
 *   0 … ENTRANCE_END        slide 1 entrance (bg, portrait, name, meta, index)
 *   ENTRANCE_END … CROSS_START   hold — slide 1 fully shown
 *   CROSS_START … CROSS_END      crossfade slide 1 → slide 2 (all elements)
 *   CROSS_END … TOTAL_RUNWAY     hold — slide 2 fully shown; end of page
 *
 * Blend safety (see founders.css): the crossfade animates opacity on each
 * slide's individual children — backgrounds, portraits, meta blocks, and
 * the name spans themselves — never on a wrapper above the name, so the
 * name's mix-blend-mode: difference keeps compositing against the full
 * backgrounds throughout the transition.
 */

/** Entrance sub-windows (px from handoff). */
const ENTRANCE_BG = [0, 300];
const ENTRANCE_PORTRAIT = [60, 360];
const ENTRANCE_INDEX = [150, 450];
const ENTRANCE_NAME = [180, 480];
const ENTRANCE_META = [240, 600];
/** Crossfade window (px from handoff). Backgrounds/portraits crossfade
 * across the full window; TEXT (meta, name, index labels) is phased —
 * out by the midpoint, in from the midpoint — so the two slides' text
 * never double-exposes at the same position. */
const CROSS_START = 1300;
const CROSS_MID = 1750;
const CROSS_END = 2200;
/** Total runway — also the section's in-flow height. */
const TOTAL_RUNWAY = 2700;
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
 */
function buildFoundersTriggers(section) {
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

  // ── Crossfade slide 1 → slide 2 ──────────────────────────────────────
  // immediateRender: false on every 1→0 tween — their targets share
  // properties with the entrance tweens above, and rendering the "from"
  // value at build time would stamp opacity 1 over the entrance's initial
  // 0 (same pattern as the hero's buildExitWipe).
  const fadeOut = (targets, start, end, id) => {
    const els = targets.filter(Boolean);
    if (!els.length) return;
    gsap.fromTo(
      els,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: scrub(start, end, id),
      },
    );
  };
  const fadeIn = (targets, start, end, id) => {
    const els = targets.filter(Boolean);
    if (!els.length) return;
    gsap.fromTo(
      els,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: scrub(start, end, id),
      },
    );
  };

  // Imagery crossfades across the full window; slide 1's background stays
  // opaque underneath — slide 2's simply fades in over it (z-index 2 in
  // CSS), avoiding any mid-fade dip to the layers below the stage.
  fadeOut([portrait1], CROSS_START, CROSS_END, 'cross-out-img');
  fadeIn(
    [q2('[data-founder-bg]'), q2('[data-founder-portrait]')],
    CROSS_START,
    CROSS_END,
    'cross-in-img',
  );

  // Text swaps sequentially around the midpoint — the slides' meta blocks
  // and names occupy the same positions, so overlapping fades would
  // double-expose the copy.
  fadeOut(
    [meta1, name1, section.querySelector('[data-founders-thumb-border="0"]'), section.querySelector('[data-founders-label="0"]')],
    CROSS_START,
    CROSS_MID,
    'cross-out-text',
  );
  fadeIn(
    [
      q2('[data-founder-meta]'),
      q2('[data-founder-name]'),
      section.querySelector('[data-founders-thumb-border="1"]'),
      section.querySelector('[data-founders-label="1"]'),
    ],
    CROSS_MID,
    CROSS_END,
    'cross-in-text',
  );

  // Slide 2's name arrives already risen — the crossfade is opacity-only.
  const name2 = q2('[data-founder-name]');
  if (name2) gsap.set(name2, { yPercent: 0 });

  const marker = section.querySelector('[data-founders-marker]');
  if (marker) {
    gsap.fromTo(
      marker,
      { y: 0 },
      {
        y: MARKER_TRAVEL,
        ease: 'none',
        scrollTrigger: scrub(CROSS_START, CROSS_END, 'marker'),
      },
    );
  }
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

  let cancelled = false;

  const build = () => {
    if (cancelled) return;
    killFoundersTriggers();
    buildFoundersTriggers(section);
    ScrollTrigger.refresh();
  };

  // Fonts must be ready before line-reveal wrapping measures line breaks
  // (same gate the hero uses).
  document.fonts.ready.then(build);

  // Own resize handling — deliberately separate from about-scroll.js's
  // handler (which rebuilds only the hero's triggers). Line breaks and
  // trigger positions both depend on viewport size.
  const onResize = () => build();
  window.addEventListener('resize', onResize);

  return () => {
    cancelled = true;
    window.removeEventListener('resize', onResize);
    killFoundersTriggers();
    gsap.killTweensOf(
      section.querySelectorAll(
        '[data-founder-bg], [data-founder-portrait], [data-founder-meta], [data-founder-name], [data-founders-index], [data-founders-marker], [data-founders-thumb-border], [data-founders-label], .lr-inner',
      ),
    );
  };
}
