import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import imagesLoaded from 'imagesloaded';
import { createHeroDissolve } from '../hero-dissolve.js';
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
 * /about-3 hero image scroll — based on /about-2 initHeroImageScroll with
 * row layout + 80px start offsets (left → middle → right).
 *
 * A new Phase 0 is prepended: the images stay put while (a) the central
 * tagline slides right to its resting position, then (b) a new intro
 * paragraph reveals line by line. Only once Phase 0 completes does the
 * original staggered pin → fade → expand → dissolve sequence begin —
 * that sequence is otherwise untouched, just uniformly shifted later on
 * the scroll timeline by `sequenceOffset`.
 */
function initHeroImageScroll() {
  const spacer = document.querySelector('body.about-page-3 [data-about-hero-spacer]');
  const imgs = spacer
    ? Array.from(spacer.querySelectorAll('.about-hero__img'))
    : [];

  if (!spacer || imgs.length < 3) return () => {};

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const cardH = parseFloat(imgs[0].style.height || '0');
  const cardW = parseFloat(imgs[1].style.width || '0');

  const centreViewportY = (vh - cardH) / 2;

  // Row layout — all cards share the same document top.
  const pinScrollY = Math.max(0, parseFloat(imgs[0].style.top || '0') - centreViewportY);
  const startOffsets = [0, STAGGER_TRAVEL, STAGGER_TRAVEL * 2];

  // Right card pins last: starts at pinScrollY + 160, pins after pinScrollY travel.
  const lastPinScrollY = pinScrollY + startOffsets[2] + pinScrollY;

  const FADE_SIDE_START = lastPinScrollY + 80;
  const FADE_SIDE_DUR = 200;
  const EXPAND_START = FADE_SIDE_START + FADE_SIDE_DUR + 60;
  const EXPAND_DUR = 700;
  const EXPAND_END = EXPAND_START + EXPAND_DUR;

  const DISSOLVE_DUR = vh;
  const DISSOLVE_END = EXPAND_END + DISSOLVE_DUR;

  // ── Phase 0: tagline slides right, then intro paragraph reveals ──────────
  // Images are untouched throughout — every trigger below is scoped to
  // `sequenceOffset .. sequenceOffset + DISSOLVE_END`, so the existing
  // sequence's own internal choreography (pinScrollY, FADE_SIDE_START,
  // EXPAND_START/END, DISSOLVE_END) is completely unchanged — only its
  // start point on the scroll timeline moves later.
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

  const requiredHeight = sequenceOffset + DISSOLVE_END;
  spacer.style.height = `${requiredHeight}px`;

  // ── Phase 1: staggered scrub pin (left → middle → right) ───────────────
  // Images are absolutely positioned at a fixed document offset, so plain
  // scrolling alone would drift them upward during Phase 0 too. Each image
  // gets a single scrubbed timeline spanning the FULL range (0..sequenceOffset
  // +DISSOLVE_END) with two segments: a "hold" segment that counter-scrolls
  // 1:1 to cancel that drift during Phase 0, then a gap (left untouched, so
  // the image resumes its original natural rise), then the original
  // pin-catch-up segment — reproducing the exact pre-existing motion, just
  // shifted later by sequenceOffset.
  imgs.forEach((img, i) => {
    const startScroll = pinScrollY + startOffsets[i];
    const yTravel = DISSOLVE_END - startScroll;
    if (yTravel <= 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: spacer,
        start: 'top top',
        end: at(DISSOLVE_END),
        scrub: true,
      },
    });

    if (sequenceOffset > 0) {
      tl.fromTo(img, { y: 0 }, { y: sequenceOffset, ease: 'none', duration: sequenceOffset }, 0);
    }

    tl.fromTo(
      img,
      { y: sequenceOffset },
      {
        y: sequenceOffset + yTravel,
        ease: 'none',
        duration: yTravel,
        // Without this, GSAP's default immediateRender renders THIS tween's
        // `from` value (y: sequenceOffset) the instant it's added — even
        // though its start position is far later in the timeline — which
        // clobbers the hold tween's correct y:0 render at page load, before
        // any scroll has occurred.
        immediateRender: false,
      },
      sequenceOffset + startScroll,
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

  // ── Phase 2: fade side images (inner <img> only — same as /about-2) ────
  [imgs[0], imgs[2]].forEach((img) => {
    const innerImg = img.querySelector('img') ?? img;
    gsap.fromTo(
      innerImg,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: at(FADE_SIDE_START),
          end: at(FADE_SIDE_START + FADE_SIDE_DUR),
          scrub: true,
        },
      },
    );
  });

  const middleImg = imgs[1];
  const middleLeft = parseFloat(middleImg.style.left || '0');
  const docTopMiddle = parseFloat(middleImg.style.top || '0');

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  const pinScrollY1 = pinScrollY + startOffsets[1];
  const travelAfterPin1 = DISSOLVE_END - pinScrollY1;

  // Mirrors the per-image timeline above for the middle image: counter-scroll
  // hold during Phase 0, flat during its natural pre-pin rise, then catch-up.
  const getPhase1Y = () => {
    const scrollY = window.scrollY;
    if (scrollY <= sequenceOffset) return Math.max(0, scrollY);
    const effective = scrollY - sequenceOffset;
    return Math.min(
      sequenceOffset + Math.max(0, effective - pinScrollY1),
      sequenceOffset + travelAfterPin1,
    );
  };

  const getMiddlePinY = () => {
    const y = gsap.getProperty(middleImg, 'y');
    return typeof y === 'number' ? y : getPhase1Y();
  };

  const syncFullViewportFixed = () => {
    ensureMiddleInFlow();
    if (middleImg.style.position !== 'fixed') return;

    const pinY = getMiddlePinY();

    Object.assign(middleImg.style, {
      top: `${-pinY}px`,
      left: '0px',
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
    });
  };

  /** @type {ReturnType<typeof createHeroDissolve> | null} */
  let heroDissolve = null;

  const destroyHeroDissolve = () => {
    heroDissolve?.destroy();
    heroDissolve = null;
  };

  const getMiddleImageEl = () => {
    const img = middleImg.querySelector('img');
    return img instanceof HTMLImageElement ? img : null;
  };

  const restoreMiddleImageOpacity = () => {
    // Scoped to 'opacity' only — killTweensOf(middleImg) with no property
    // filter would also kill the per-image hold/catch-up y-scrub timeline
    // created in imgs.forEach, permanently freezing the middle image after
    // the first reverse-scroll past the expansion point.
    gsap.killTweensOf(middleImg, 'opacity');
    const innerImg = getMiddleImageEl();
    if (innerImg) gsap.killTweensOf(innerImg, 'opacity');

    middleImg.style.opacity = '';
    gsap.set(middleImg, { clearProps: 'opacity' });

    if (innerImg) {
      innerImg.style.opacity = '';
      gsap.set(innerImg, { clearProps: 'opacity' });
    }
  };

  const restoreMiddleToFlow = () => {
    if (middleImg.style.position !== 'fixed') return;

    restoreMiddleImageOpacity();

    Object.assign(middleImg.style, {
      position: 'absolute',
      top: `${docTopMiddle}px`,
      left: `${middleLeft}px`,
      width: `${cardW}px`,
      height: `${cardH}px`,
      zIndex: '',
      overflow: '',
    });

    gsap.set(middleImg, { y: getPhase1Y() });
  };

  const ensureMiddleInFlow = () => {
    if (window.scrollY < sequenceOffset + EXPAND_START && middleImg.style.position === 'fixed') {
      restoreMiddleToFlow();
    }
  };

  ScrollTrigger.create({
    trigger: spacer,
    start: at(pinScrollY1),
    end: at(EXPAND_START),
    onUpdate: () => {
      if (middleImg.style.position === 'fixed') return;
      gsap.set(middleImg, { y: getPhase1Y() });
    },
  });

  ScrollTrigger.create({
    trigger: spacer,
    start: at(EXPAND_START),
    onEnter() {
      const y = getMiddlePinY();
      Object.assign(middleImg.style, {
        position: 'fixed',
        top: `${centreViewportY - y}px`,
        left: `${middleLeft}px`,
        width: `${cardW}px`,
        height: `${cardH}px`,
        zIndex: '249',
        overflow: 'hidden',
      });
    },
    onLeaveBack() {
      restoreMiddleToFlow();
    },
  });

  ScrollTrigger.create({
    trigger: spacer,
    start: at(EXPAND_START),
    end: at(EXPAND_END),
    onUpdate(self) {
      ensureMiddleInFlow();
      if (middleImg.style.position !== 'fixed') return;

      const p = easeInOut(self.progress);
      const y = getMiddlePinY();
      const fixedTop = centreViewportY * (1 - p) - y;
      Object.assign(middleImg.style, {
        top: `${fixedTop}px`,
        left: `${middleLeft * (1 - p)}px`,
        width: `${cardW * (1 - p) + vw * p}px`,
        height: `${cardH * (1 - p) + vh * p}px`,
      });
    },
    onLeave() {
      syncFullViewportFixed();
    },
  });

  ScrollTrigger.create({
    trigger: spacer,
    start: at(EXPAND_END),
    end: at(DISSOLVE_END),
    onUpdate: syncFullViewportFixed,
    onEnter: syncFullViewportFixed,
    onEnterBack: syncFullViewportFixed,
    onLeaveBack() {
      if (window.scrollY < sequenceOffset + EXPAND_START) restoreMiddleToFlow();
    },
  });

  const handoffToDissolveCanvas = () => {
    if (heroDissolve) return;

    const imgEl = getMiddleImageEl();
    if (!imgEl) return;

    syncFullViewportFixed();
    restoreMiddleImageOpacity();

    heroDissolve = createHeroDissolve(imgEl);
    heroDissolve.reveal(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!heroDissolve) return;
        middleImg.style.opacity = '0';
      });
    });
  };

  /** @type {ScrollTrigger} */
  let dissolveTrigger;

  dissolveTrigger = ScrollTrigger.create({
    trigger: spacer,
    start: at(EXPAND_END),
    end: at(DISSOLVE_END),
    onEnter: syncFullViewportFixed,
    onUpdate(self) {
      syncFullViewportFixed();
      if (self.progress > 0) {
        handoffToDissolveCanvas();
        heroDissolve?.setProgress(self.progress);
      }
    },
    onLeave() {
      heroDissolve?.setProgress(1);
      destroyHeroDissolve();
      syncFullViewportFixed();
      middleImg.style.opacity = '0';
    },
    onEnterBack() {
      syncFullViewportFixed();
      if (dissolveTrigger.progress > 0) {
        handoffToDissolveCanvas();
        heroDissolve?.setProgress(dissolveTrigger.progress);
      } else {
        restoreMiddleImageOpacity();
      }
    },
    onLeaveBack() {
      destroyHeroDissolve();
      if (window.scrollY < sequenceOffset + EXPAND_START) {
        restoreMiddleToFlow();
      } else {
        restoreMiddleImageOpacity();
        syncFullViewportFixed();
      }
    },
  });

  const onDissolveResize = () => heroDissolve?.resize();

  window.addEventListener('resize', onDissolveResize);

  return () => {
    window.removeEventListener('resize', onDissolveResize);
    destroyHeroDissolve();
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
