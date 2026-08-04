/**
 * NEW LANDING HERO — scroll choreography.
 *
 * The mechanism is PORTED, not reinvented: it is the /about-3 hero's
 * "Phase 0" (see src/scripts/about-3/about-scroll.js), which is the
 * house pattern for this kind of sequence —
 *
 *   - a fixed stage plus an empty in-flow SPACER whose height is
 *     computed from the sequence's total scroll distance (no GSAP pin,
 *     so there is no pin-spacer to fight and no reflow on refresh);
 *   - every trigger anchored to an ABSOLUTE scroll distance from the
 *     spacer's top (`top+=N top`) rather than chained relative starts,
 *     so inserting or retuning one beat cannot silently shift the rest;
 *   - `scrub: true` throughout, `ease: 'none'` where the motion must
 *     track the finger 1:1.
 *
 * The port keeps the original's constants and geometry (400px of
 * travel, rest at x=290, 130px of scroll per revealed line, the
 * yPercent 110 -> 0 line reveal with a 0.6 stagger) so the new page
 * moves like the old one. What is NEW is the third beat: the video's
 * expansion, and the way it is deliberately overlapped with the tail of
 * the second so the whole thing reads as one gesture.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { wrapLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

/* ── Ported constants (values from the /about-3 hero) ──────────────── */

/** Scroll px over which the headline travels from centre to rest. */
const HEADLINE_MOVE_PX = 400;

/** Headline's resting left edge, in px, at the 1728 design width. */
const HEADLINE_REST_LEFT = 290;

/** Scroll px consumed per revealed line of the secondary copy. */
const REVEAL_LINE_PX = 130;

/* ── New constants (the video beat) ───────────────────────────────── */

/**
 * Dead scroll after the copy finishes revealing, before the video beat
 * would begin — the "settles" in Oscar's spec. Kept SHORT, and then
 * deliberately eaten into by VIDEO_LEAD_IN below: a true pause reads as
 * two separate moves, which is the one thing the brief rules out.
 */
const SETTLE_PX = 150;

/**
 * How far the video's expansion starts BEFORE the settle ends. The
 * overlap is what makes the sequence read as one continuous gesture
 * rather than "text finishes, then video starts": the frame is already
 * opening while the last line is still landing.
 */
const VIDEO_LEAD_IN = 120;

/** Scroll px over which the video opens from band to full screen. */
const VIDEO_EXPAND_PX = 700;

/** Scroll px the video holds at full screen before the hero ends. */
const VIDEO_HOLD_PX = 300;

/**
 * Clear air between the bottom of the centred headline and the top of
 * the video band, at rest. The band's top is DERIVED from the measured
 * headline rather than set as a fraction of viewport height: a fixed
 * fraction (0.55vh) put the band's edge straight through "POWERED BY
 * ACCESS." at 1728x1000 — the two-line headline is ~105px tall and
 * centred, so its lower edge and a 55% band edge land on top of each
 * other. Measuring means the gap holds at any viewport height.
 */
const VIDEO_BAND_GAP = 72;

/**
 * Floor for the opening band's visible height. Guards the measured
 * band-top above: on a short viewport, headline-bottom + gap could push
 * the band down to a sliver (or off-screen entirely), so it is never
 * allowed to start lower than this many px from the bottom.
 */
const VIDEO_BAND_MIN_HEIGHT = 240;

/** The band's side margins, matching --landing-video-margin. */
const VIDEO_MARGIN_PX = 24;

/** Lenis smoothing — the house value (see about-scroll.js). */
const SCROLL_LERP = 0.065;

/**
 * Wraps each <p> of the secondary copy into line-reveal clip spans,
 * resetting to the original markup first so a re-init on resize
 * re-measures the line breaks cleanly instead of double-wrapping.
 * Identical to the /about-3 helper.
 * @param {Element | null} introTextEl
 * @returns {HTMLElement[]} per-line `.lr-inner` elements, in reading order
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

/** Builds a clip-path inset string in pure px (never mixed units —
 * GSAP interpolates a single consistent format cleanly). */
function insetPx(top, right, bottom, left) {
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

/** @type {Lenis | null} */
let lenis = null;

function initSmoothScrolling() {
  document.documentElement.classList.add('lenis');

  lenis = new Lenis({
    lerp: SCROLL_LERP,
    smoothWheel: true,
  });

  lenis.on('scroll', () => ScrollTrigger.update());

  const scrollFn = (time) => {
    lenis?.raf(time);
    requestAnimationFrame(scrollFn);
  };

  requestAnimationFrame(scrollFn);
}

export function initLandingHeroScroll() {
  const hero = document.querySelector('[data-landing-hero]');
  const spacer = document.querySelector('[data-landing-hero-spacer]');
  const headlineText = document.querySelector('[data-landing-hero-headline-text]');
  const intro = document.querySelector('[data-landing-hero-intro]');
  const introText = document.querySelector('[data-landing-hero-intro-text]');
  const video = document.querySelector('[data-landing-hero-video]');

  if (!(hero instanceof HTMLElement) || !(spacer instanceof HTMLElement)) {
    return () => {};
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* EVERYTHING below measures rendered text — the headline's travel is
     the distance from its laid-out left edge, and the copy's reveal
     clips are grouped by each word's offsetTop. Both are wrong if they
     run against fallback metrics: with the fallback the copy fits in
     two lines per paragraph, so the wrap builds two clips, and when
     Serrif then loads each clip reflows to two visual lines and the
     "line reveal" moves lines in pairs. Measured and confirmed — hence
     the fonts.ready gate, the same one holding-entry.js uses. */
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  /* Reduced motion: keep the STATES, drop the MOTION (house rule). The
     sequence's END state is rendered immediately — headline at rest,
     copy complete and visible, video fully open — and no trigger, no
     Lenis, and no spacer runway is created. CSS already opens the clip
     and collapses the spacer under `reduce`; this positions the text. */
  if (reduced) {
    let disposed = false;
    fontsReady.then(() => {
      if (disposed) return;
      if (headlineText instanceof HTMLElement) {
        const restLeft = headlineText.getBoundingClientRect().left;
        gsap.set(headlineText, { x: HEADLINE_REST_LEFT - restLeft });
      }
      intro?.classList.add('is-armed');
    });
    return () => {
      disposed = true;
    };
  }

  initSmoothScrolling();

  /** Everything created here, torn down together on cleanup. */
  const triggers = [];
  const tweens = [];

  const build = () => {
    const vh = window.innerHeight;

    /* ── Beat 1: the headline slides to its rest position ──────────
       Measured, not assumed: the block is centred by flexbox, so its
       travel is the difference between where it currently sits and the
       target — which keeps the rest position exact at any width. */
    let sequenceEnd = 0;

    if (headlineText instanceof HTMLElement) {
      gsap.set(headlineText, { x: 0 });
      const restLeft = headlineText.getBoundingClientRect().left;
      const moveDeltaX = HEADLINE_REST_LEFT - restLeft;

      const tween = gsap.fromTo(
        headlineText,
        { x: 0 },
        {
          x: moveDeltaX,
          ease: 'none',
          scrollTrigger: {
            trigger: spacer,
            start: 'top top',
            end: `top+=${HEADLINE_MOVE_PX} top`,
            scrub: true,
          },
        },
      );
      tweens.push(tween);
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);

      sequenceEnd = HEADLINE_MOVE_PX;
    }

    /* ── Beat 2: the secondary copy reveals, line by line ───────────
       Match the copy block's width to the headline's so the two sides
       of the split are visually the same measure — the old hero does
       exactly this. */
    let revealEnd = sequenceEnd;

    if (introText instanceof HTMLElement && headlineText instanceof HTMLElement) {
      introText.style.width = `${headlineText.getBoundingClientRect().width}px`;

      const introLines = wrapIntroLines(introText);
      /* wrapLineRevealElement leaves an inline `transition: transform`
         intended for its own class-toggle reveal; that fights a
         continuous scrub, so GSAP takes sole control of the transform. */
      introLines.forEach((el) => {
        el.style.transition = 'none';
      });

      /* Armed only now — the lines exist and are positioned offscreen,
         so making the block visible can no longer flash complete text. */
      intro?.classList.add('is-armed');

      if (introLines.length) {
        const revealStart = sequenceEnd;
        revealEnd = revealStart + introLines.length * REVEAL_LINE_PX;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: spacer,
            start: `top+=${revealStart} top`,
            end: `top+=${revealEnd} top`,
            scrub: true,
          },
        });
        tl.fromTo(
          introLines,
          { yPercent: 110, y: 0 },
          { yPercent: 0, y: 0, ease: 'none', duration: 1, stagger: 0.6 },
        );
        tweens.push(tl);
        if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
      }
    }

    /* ── Beat 3: the video opens to full screen ─────────────────────
       Starts VIDEO_LEAD_IN before the settle ends, so the frame is
       already moving while the last line lands — the overlap is what
       joins the two beats into one gesture.

       The tween drives the clip inset from the opening band to zero.
       Because the element is always laid out full-viewport, driving the
       TOP inset to 0 both fills the screen AND walks the visible band's
       centre onto the viewport centre — they arrive together, which is
       the "centred as it covers everything" the brief describes.

       ease power1.inOut INSIDE a scrub: scroll still maps linearly to
       progress (the finger stays in control), while the ease shapes the
       motion so the frame leaves and arrives softly rather than
       starting and stopping abruptly. */
    let videoEnd = revealEnd;

    if (video instanceof HTMLElement) {
      /* Band top: below the headline by VIDEO_BAND_GAP, but never so
         low that the opening band collapses to a sliver. Measured with
         the headline at x=0 (build() resets it), so this is its resting
         centred geometry regardless of scroll position at rebuild. */
      const headlineBottom =
        headlineText instanceof HTMLElement
          ? headlineText.getBoundingClientRect().bottom
          : vh * 0.55;
      const bandTop = Math.round(
        Math.min(headlineBottom + VIDEO_BAND_GAP, vh - VIDEO_BAND_MIN_HEIGHT),
      );
      const videoStart = Math.max(0, revealEnd + SETTLE_PX - VIDEO_LEAD_IN);
      videoEnd = videoStart + VIDEO_EXPAND_PX;

      const tween = gsap.fromTo(
        video,
        { clipPath: insetPx(bandTop, VIDEO_MARGIN_PX, 0, VIDEO_MARGIN_PX) },
        {
          clipPath: insetPx(0, 0, 0, 0),
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: spacer,
            start: `top+=${videoStart} top`,
            end: `top+=${videoEnd} top`,
            scrub: true,
          },
        },
      );
      tweens.push(tween);
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    }

    /* ── The runway ────────────────────────────────────────────────
       Native max scroll is `scrollHeight - vh`, not `scrollHeight`, so
       the spacer needs an extra viewport height on top of the raw
       trigger distance or the final beat can never be scrolled to.
       (The /about-3 hero learned this the hard way; same correction.) */
    const total = videoEnd + VIDEO_HOLD_PX;
    spacer.style.height = `${total + vh}px`;

    /* Dev-only verification handle (same convention as the holding
       page's gallery handles). Two jobs: publish the derived beat
       boundaries so a structural check can assert against the real
       numbers rather than re-deriving them, and expose ScrollTrigger's
       update so a check can drive the sequence deterministically —
       Lenis advances it from a rAF loop, which a background/occluded
       tab freezes. Never shipped: stripped from production builds. */
    if (import.meta.env.DEV) {
      window.__landingHero = {
        beats: {
          headlineEnd: HEADLINE_MOVE_PX,
          revealEnd,
          videoStart: Math.max(0, revealEnd + SETTLE_PX - VIDEO_LEAD_IN),
          videoEnd,
          total,
          spacerHeight: total + vh,
        },
        /** Jump to an absolute scroll position and settle ScrollTrigger. */
        seek(y) {
          document.documentElement.scrollTop = y;
          ScrollTrigger.update();
        },
      };
    }
  };

  let disposed = false;
  let resizeTimer;

  const rebuild = () => {
    triggers.forEach((t) => t.kill());
    tweens.forEach((t) => t.kill());
    triggers.length = 0;
    tweens.length = 0;
    build();
    ScrollTrigger.refresh();
  };

  /* Rebuild on resize: the headline's travel, the copy's line breaks and
     the video's band are all measured from the viewport, so a resize
     invalidates all three. Debounced — this tears down and re-measures,
     which is far too heavy to run per event. */
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 200);
  };

  fontsReady.then(() => {
    if (disposed) return;
    build();
    ScrollTrigger.refresh();
    window.addEventListener('resize', onResize);
  });

  return () => {
    disposed = true;
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    triggers.forEach((t) => t.kill());
    tweens.forEach((t) => t.kill());
    lenis?.destroy();
    lenis = null;
    document.documentElement.classList.remove('lenis');
  };
}
