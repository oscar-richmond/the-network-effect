import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import imagesLoaded from 'imagesloaded';
import { createRotatingGallery } from './rotating-gallery.js';
import { wrapLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

/** 80px travel on the leading card before the next card begins moving. */
const STAGGER_TRAVEL = 80;

/**
 * Wrap each <p> in the intro block into line-reveal clip spans (same
 * technique used site-wide via line-reveal.js), resetting to original
 * text first so re-wrapping on resize/reinit re-measures line breaks
 * cleanly rather than double-wrapping already-wrapped markup.
 * @param {Element | null} introTextEl
 * @returns {HTMLElement[]} the per-line `.lr-inner` elements, in reading order
 */
function wrapIntroLines(introTextEl) {
  if (!(introTextEl instanceof HTMLElement)) return [];

  const paragraphs = Array.from(introTextEl.querySelectorAll('p'));
  paragraphs.forEach((p) => {
    if (p.dataset.origHtml === undefined) {
      p.dataset.origHtml = p.innerHTML;
    } else {
      p.innerHTML = p.dataset.origHtml;
    }
    wrapLineRevealElement(p);
  });

  return Array.from(introTextEl.querySelectorAll('.lr-inner'));
}

/**
 * /about-3 hero image scroll — row layout + 80px start offsets
 * (left → middle → right).
 *
 * Phase 0 is prepended: the images stay put while (a) the central tagline
 * slides right to its resting position, then (b) a new intro paragraph
 * reveals line by line. Only once Phase 0 completes does Phase 1 begin:
 * the staggered upward exit, handled by the WebGL rotating-gallery module
 * (see `rotating-gallery.js`) — this function's own job for Phase 1 is
 * just to drive each `.about-hero__img`'s `y` (DOM position, which the
 * gallery module reads back every frame via `getBoundingClientRect`) from
 * its rest position up until it fully clears the top of the viewport.
 * There is no pin, no middle-image expansion, and no dissolve handoff —
 * those were removed for the WebGL takeover, per the approved plan.
 */
function initHeroImageScroll() {
  const spacer = document.querySelector('body.about-page-3 [data-about-hero-spacer]');
  const imgs = spacer
    ? Array.from(spacer.querySelectorAll('.about-hero__img'))
    : [];

  if (!spacer || imgs.length < 3) return () => {};

  const vh = window.innerHeight;

  const cardH = parseFloat(imgs[0].style.height || '0');
  const cardW = parseFloat(imgs[1].style.width || '0');

  const centreViewportY = (vh - cardH) / 2;

  // Row layout — all cards share the same document top.
  const restTop = parseFloat(imgs[0].style.top || '0');
  const pinScrollY = Math.max(0, restTop - centreViewportY);
  const startOffsets = [0, STAGGER_TRAVEL, STAGGER_TRAVEL * 2];

  // Scroll distance (relative to Phase 0's end) for each image to travel
  // from its rest position to fully clear the top of the viewport, i.e.
  // until its screen-space top reaches -cardH. Derived from how the
  // per-image tween below moves `y`: screenTop = restTop - scrollY + y,
  // and y is held at `startScroll[i]` for all scrollY > startScroll[i], so
  // screenTop = restTop + startScroll[i] - scrollY. Solving
  // restTop + startScroll[i] - scrollY <= -cardH for scrollY gives the
  // per-image exit point below; the last (right) image's is the max and
  // sizes the required scroll runway, with a small settle buffer.
  const EXIT_BUFFER = 60;
  const exitAt = (i) => restTop + pinScrollY + startOffsets[i] + cardH;
  const EXIT_END = exitAt(2) + EXIT_BUFFER;

  // ── Phase 0: tagline slides right, then intro paragraph reveals ──────────
  // Images are untouched throughout — every trigger below is scoped to
  // `sequenceOffset .. sequenceOffset + EXIT_END`, so Phase 1's own internal
  // choreography (pinScrollY, startOffsets, EXIT_END) is unaffected by
  // Phase 0 — only its start point on the scroll timeline moves later.
  const PRE_MOVE_DUR = 400; // scroll px for tagline rightward travel — not specified, interpreted
  const PRE_MOVE_TARGET_LEFT = 290; // exact at 1728px viewport per spec
  const PRE_REVEAL_LINE_PX = 130; // scroll px per revealed line — not specified, interpreted

  const taglineText = spacer.querySelector('[data-about-hero-tagline-text]');
  const introText = spacer.querySelector('[data-about-hero-intro-text]');

  let sequenceOffset = 0;

  if (taglineText instanceof HTMLElement) {
    if (introText instanceof HTMLElement) {
      introText.style.width = `${taglineText.getBoundingClientRect().width}px`;
    }

    const restLeft = taglineText.getBoundingClientRect().left;
    const moveDeltaX = PRE_MOVE_TARGET_LEFT - restLeft;

    const preMoveStart = 0;
    const preMoveEnd = preMoveStart + PRE_MOVE_DUR;

    gsap.fromTo(
      taglineText,
      { x: 0 },
      {
        x: moveDeltaX,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: `top+=${preMoveStart} top`,
          end: `top+=${preMoveEnd} top`,
          scrub: true,
        },
      },
    );

    const introLines = wrapIntroLines(introText);
    // wrapLineRevealElement leaves an inline `transition: transform` intended
    // for its default class-toggle reveal; that fights GSAP's continuous
    // scrub here, so give GSAP sole control of the transform.
    introLines.forEach((el) => {
      el.style.transition = 'none';
    });
    const preRevealStart = preMoveEnd;
    const preRevealDur = Math.max(introLines.length, 1) * PRE_REVEAL_LINE_PX;
    const preRevealEnd = preRevealStart + preRevealDur;

    if (introLines.length) {
      gsap.timeline({
        scrollTrigger: {
          trigger: spacer,
          start: `top+=${preRevealStart} top`,
          end: `top+=${preRevealEnd} top`,
          scrub: true,
        },
      }).fromTo(
        introLines,
        { yPercent: 110, y: 0 },
        { yPercent: 0, y: 0, ease: 'none', duration: 1, stagger: 0.6 },
      );
    }

    sequenceOffset = preRevealEnd;
  }

  /** Converts an existing-sequence scroll offset to an absolute one. */
  const at = (px) => `top+=${sequenceOffset + px} top`;

  // Every trigger above is anchored by absolute scroll-distance-from-top
  // ('top+=N top'), so the last one (at scroll position `sequenceOffset +
  // EXIT_END`) must actually be *reachable* by native scroll. Native max
  // scroll is `document.scrollHeight - vh`, not `scrollHeight` itself — so
  // the spacer needs an extra `vh` of height on top of the raw trigger
  // distance, or the final ~viewport-height of triggers (here, the last
  // image's exit) can never be scrolled to.
  const requiredHeight = sequenceOffset + EXIT_END + vh;
  spacer.style.height = `${requiredHeight}px`;

  // ── Phase 1: staggered upward exit (left → middle → right) ─────────────
  // Images are absolutely positioned at a fixed document offset, so plain
  // scrolling alone would drift them upward during Phase 0 too. Each image
  // gets a single scrubbed tween counter-scrolling `y` 1:1 to cancel that
  // drift, holding flat until its own start offset is reached; once the
  // tween's range ends the ScrollTrigger clamps at progress 1 and `y` stays
  // frozen at that value, so the image's screen position then falls purely
  // from natural document scroll — rising, and eventually exiting, with no
  // further JS driving it. The rotating-gallery module (see
  // `rotating-gallery.js`) reads this resulting screen position back every
  // frame via `getBoundingClientRect` to drive the WebGL planes; nothing
  // here needs to know about WebGL at all.
  imgs.forEach((img, i) => {
    const startScroll = pinScrollY + startOffsets[i];
    const holdEnd = sequenceOffset + startScroll;
    if (holdEnd <= 0) return;

    gsap.fromTo(
      img,
      { y: 0 },
      {
        y: holdEnd,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: 'top top',
          end: at(startScroll),
          scrub: true,
        },
      },
    );
  });

  // ── Tagline fade (opacity on wrapper — not internal rotate code) ─────────
  const tagline = spacer.querySelector('[data-about-hero-tagline]');
  const middleMoveStart = pinScrollY + STAGGER_TRAVEL;
  const FADE_TAGLINE_DUR = 200;

  if (tagline instanceof HTMLElement) {
    gsap.fromTo(
      tagline,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: at(middleMoveStart),
          end: at(middleMoveStart + FADE_TAGLINE_DUR),
          scrub: true,
        },
      },
    );
  }

  // ── WebGL takeover ───────────────────────────────────────────────────────
  // Swaps in once the DOM entrance (stack → sort) has fully settled — this
  // function only ever runs post-settle (see initAbout3Scroll below) — so
  // there is no visible seam between the DOM entrance and the WebGL planes.
  const gallery = createRotatingGallery(imgs);
  gallery?.ready.then(() => {
    imgs.forEach((img) => {
      const innerImg = img.querySelector('img');
      if (innerImg) innerImg.style.opacity = '0';
    });
  });

  return () => {
    gallery?.destroy();
  };
}

/** @type {Lenis | null} */
let lenis = null;

function initSmoothScrolling() {
  document.documentElement.classList.add('lenis');

  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  lenis.on('scroll', () => ScrollTrigger.update());

  const scrollFn = (time) => {
    lenis?.raf(time);
    requestAnimationFrame(scrollFn);
  };

  requestAnimationFrame(scrollFn);
}

function destroySmoothScrolling() {
  lenis?.destroy();
  lenis = null;
  document.documentElement.classList.remove('lenis');
}

/**
 * Boot scroll-driven hero sequence on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initAbout3Scroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let cancelled = false;
  let cleanupHero = () => {};

  /** @type {(() => void) | null} */
  let onResize = null;

  initSmoothScrolling();

  const bootHeroScroll = () => {
    if (cancelled) return;
    cleanupHero();
    // initHeroImageScroll's own cleanup doesn't kill the ScrollTriggers it
    // creates, so a re-run (settle, then a resize shortly after) would
    // otherwise stack duplicate/orphaned triggers on top of each other.
    // Every ScrollTrigger on this page belongs to this sequence, so it's
    // safe to clear all of them before rebuilding.
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    cleanupHero = initHeroImageScroll();
    ScrollTrigger.refresh();
  };

  const onHeroSettled = () => {
    if (cancelled) return;

    const imgEls = document.querySelectorAll(
      'body.about-page-3 [data-about-hero-spacer] .about-hero__img img',
    );

    if (!imgEls.length) {
      bootHeroScroll();
      return;
    }

    imagesLoaded(Array.from(imgEls), () => {
      if (cancelled) return;
      bootHeroScroll();
    });
  };

  onResize = () => {
    if (cancelled) return;
    cleanupHero();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    cleanupHero = initHeroImageScroll();
    ScrollTrigger.refresh();
  };

  window.addEventListener('resize', onResize);

  if (document.querySelector('body.about-page-3 [data-about-hero-spacer] .about-hero__img')) {
    onHeroSettled();
  } else {
    document.addEventListener('about-hero:settled', onHeroSettled, { once: true });
  }

  return () => {
    cancelled = true;
    if (onResize) window.removeEventListener('resize', onResize);
    cleanupHero();
    destroySmoothScrolling();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  };
}
