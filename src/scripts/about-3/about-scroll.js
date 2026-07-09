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

  // ── Phase C exit: bottom-up blur/fade wipe over both text blocks ─────────
  // REPLACES the old whole-block tagline opacity fade (previously keyed to
  // the middle image starting to move) — this is now the only exit
  // animation on the tagline block, and gives the intro block (which
  // previously had no exit) the same treatment. Visual character sampled
  // from the rolling word's own exit
  // (.about-hero__tagline-rotate-inner.is-exiting in about-hero.css):
  // filter: blur(10px) + fade to opacity 0, both animated together. Here
  // that endpoint is scroll-scrubbed per line, bottom line first, timed
  // against the covering image's upward travel so each block is fully
  // gone by the time the image's leading (top) edge reaches the block's
  // top. Scrubbing means reverse scroll runs the same wipe backwards
  // (un-blur, fade-in, bottom-up in reverse) back to fully crisp.
  //
  // The word roll keeps running inside its line until that line fades —
  // nothing internal to the roll (or to the intro's line-reveal entrance,
  // which drives .lr-inner transforms while this drives .lr-clip
  // opacity/filter) is touched. Blur is applied per-line (the minimum
  // sweep unit), no will-change: at most ~9 small elements filter only
  // while the wipe window is active. The filters create stacking contexts
  // on the LINE elements only — z-order between the blocks (z 100) and
  // the images/canvas (z 110) lives on their fixed-position ancestors, so
  // layering is unaffected, as is the difference-blend on the tagline
  // wrapper (an ancestor's blend flattens its subtree regardless of
  // descendant stacking contexts — same reason the rolling word's own
  // blur already works inside it).
  const EXIT_BLUR_PX = 10;
  /** Scroll-px of onset before the covering image's top edge reaches the
   * block's bottom — the text is visibly disappearing just before the
   * image arrives, not only once it overlaps. */
  const WIPE_LEAD = 120;
  /** Per-line stagger in timeline-seconds (scrub normalizes the total to
   * the trigger window, so only the ratio to the 1s line duration
   * matters — 0.5 gives an overlapping, continuous bottom-up sweep). */
  const WIPE_STAGGER = 0.5;

  // scrollY at which image i's top edge sits at screen-space `y` during
  // its exit travel — inverse of the per-image tween above:
  // screenTop = restTop + (sequenceOffset + pinScrollY + startOffsets[i]) - scrollY.
  const scrollWhenImageTopAt = (i, y) =>
    restTop + sequenceOffset + pinScrollY + startOffsets[i] - y;

  /**
   * @param {(HTMLElement | HTMLElement[])[]} lineGroups bottom-most line first
   * @param {number} imgIndex index of the covering image the wipe tracks
   * @param {DOMRect} rect the block's viewport rect (both blocks are
   *   position: fixed, so this is scroll-stable)
   */
  const buildExitWipe = (lineGroups, imgIndex, rect) => {
    const groups = lineGroups.filter((g) => (Array.isArray(g) ? g.length > 0 : !!g));
    if (!groups.length) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: spacer,
        start: `top+=${scrollWhenImageTopAt(imgIndex, rect.bottom + WIPE_LEAD)} top`,
        end: `top+=${scrollWhenImageTopAt(imgIndex, rect.top)} top`,
        scrub: true,
      },
    });

    groups.forEach((group, i) => {
      tl.fromTo(
        group,
        { opacity: 1, filter: 'blur(0px)' },
        {
          opacity: 0,
          filter: `blur(${EXIT_BLUR_PX}px)`,
          ease: 'none',
          duration: 1,
          immediateRender: false,
        },
        i * WIPE_STAGGER,
      );
    });
  };

  if (taglineText instanceof HTMLElement) {
    // Bottom-up: reverse DOM order (rotate line first, "WE ARE A" last).
    const taglineLines = Array.from(
      taglineText.querySelectorAll('.about-hero__tagline-line'),
    ).reverse();
    // The visible video is a position-synced SIBLING of the tagline (kept
    // outside the difference-blend subtree — see AboutHero.astro), so it
    // must be wiped explicitly, grouped with its host "CULTURAL & " line
    // (2nd from top = 2nd-from-last bottom-up).
    const videoOverlay = document.querySelector('[data-about-hero-tagline-img-overlay]');
    const taglineGroups = taglineLines.map((line, i) =>
      videoOverlay instanceof HTMLElement && i === taglineLines.length - 2
        ? [line, videoOverlay]
        : line,
    );
    // After the Phase-A slide (to left: 290px) the block sits almost
    // entirely under the LEFT image's column — and the left image is also
    // the first mover, so tracking it guarantees the text is gone before
    // any of the three images reaches it.
    buildExitWipe(taglineGroups, 0, taglineText.getBoundingClientRect());
  }

  if (introText instanceof HTMLElement) {
    // Per-line clips (bottom-up). The exit animates the .lr-clip wrappers;
    // the phase-B entrance animates the .lr-inner children's transforms —
    // separate elements and properties, so the entrance is untouched.
    const introClips = Array.from(introText.querySelectorAll('.lr-clip')).reverse();
    // The block sits mostly under the RIGHT image, but the MIDDLE image's
    // right edge grazes its left edge ~80px of travel earlier — track the
    // middle image so the text is gone before ANY coverage begins.
    buildExitWipe(introClips, 1, introText.getBoundingClientRect());
  }

  // ── Scroll-scrubbed background-image fade (Phase C backdrop) ────────────
  // Fades the fixed full-viewport backdrop image (see AboutScroll.astro /
  // about-hero.css, z-index 50 — above the #F9F9F9 base, below everything
  // else) from 0 → 1, scrubbed linearly to scroll. Both thresholds are
  // derived from the same per-image exit maths as EXIT_END above — no
  // hand-tuned scroll numbers:
  // START — the left image (i = 0, first to travel) has 2/3 of its height
  //   above the viewport top, i.e. its screen top sits at -cardH * 2/3,
  //   which is cardH / 3 of scroll before its full exit point exitAt(0).
  // END — the right image (i = 2, last to travel) has fully cleared the
  //   top, i.e. exactly its exit point exitAt(2).
  const BG_FADE_START = exitAt(0) - cardH / 3;
  const BG_FADE_END = exitAt(2);

  const bgFade = document.querySelector('body.about-page-3 [data-about-hero-bg-fade]');
  if (bgFade instanceof HTMLElement) {
    gsap.fromTo(
      bgFade,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: at(BG_FADE_START),
          end: at(BG_FADE_END),
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

  // initHeroImageScroll's own cleanup doesn't kill the ScrollTriggers it
  // creates, so a re-run (settle, then a resize shortly after) would
  // otherwise stack duplicate/orphaned triggers on top of each other.
  // The Founders section's triggers (founders-scroll.js, id-prefixed
  // 'founders-') and the section-progress indicator's (section-progress.js,
  // id-prefixed 'section-progress-') share this page and manage their own
  // lifecycles — spare them, kill everything else (it all belongs to this
  // hero sequence).
  const SPARED_TRIGGER_PREFIXES = ['founders-', 'section-progress-', 'about-landing-'];
  const killHeroTriggers = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (
        typeof trigger.vars.id === 'string' &&
        SPARED_TRIGGER_PREFIXES.some((prefix) => trigger.vars.id.startsWith(prefix))
      ) return;
      trigger.kill();
    });
  };

  const bootHeroScroll = () => {
    if (cancelled) return;
    cleanupHero();
    killHeroTriggers();
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
    killHeroTriggers();
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
