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

/**
 * The travelled headline's final left margin (Oscar's rev — was a
 * 290px rest-left). BOTH lines end at this x: each line gets its own
 * x tween over the same scroll range, so the centre-aligned pair
 * converges into a left-aligned stack DURING the travel — one
 * continuous motion, no mid-flight alignment switch to snap.
 */
const HEADLINE_LEFT_MARGIN = 24;

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
 * The video band's top edge as a fraction of viewport height. This is
 * now INDEPENDENT of the headline (previously it was derived from the
 * headline's bottom edge — but Oscar's centring rev makes the headline
 * centre against the video, so that derivation would be circular).
 * 0.625 reproduces the previous rendered geometry at 1728x1000
 * exactly (625px), so the video's opening state is unchanged there.
 */
const VIDEO_BAND_TOP_FRACTION = 0.625;

/** The band's side margins, matching --landing-video-margin. */
const VIDEO_MARGIN_PX = 24;

/** Lenis smoothing — the house value (see about-scroll.js). */
const SCROLL_LERP = 0.065;

/**
 * Copy-leading bonus (Oscar's rev): the copy's line-height gets this
 * many px MORE than the equal-solve against the headline span, and
 * the paragraph gap shrinks to fund it — "by half, or as much as
 * needed" — so the block still spans exactly from BUILT's cap top to
 * POWERED's baseline. With 4 lines (3 steps) on a 24px base gap,
 * +4px/step lands the gap at exactly half (12px). The gap floors at
 * 0: if the bonus ever over-eats it, the pins win and the leading
 * gives back the difference.
 */
const INTRO_LEADING_BONUS_PX = 4;

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

/**
 * Vertically centres the headline block in the band between the nav
 * bar's measured bottom edge and the video band's top (Oscar's rev —
 * not viewport centring). CSS carries a calc() approximation of the
 * same midpoint for first paint; this refines it from the MEASURED
 * rects so it holds if either element moves, and the resize rebuild
 * re-derives it. The block keeps its CSS translateY(-50%), so only
 * the midpoint needs computing here.
 */
function refineHeadlineCentring(headlineText) {
  if (!(headlineText instanceof HTMLElement)) return;
  const topbar = document.querySelector('.home__topbar');
  const navBottom = topbar instanceof HTMLElement
    ? topbar.getBoundingClientRect().bottom
    : 0;
  const videoTop = Math.round(window.innerHeight * VIDEO_BAND_TOP_FRACTION);
  const bandCentre = navBottom + (videoTop - navBottom) / 2;
  headlineText.style.marginTop = `${bandCentre}px`;
}

/**
 * Baseline of a line box, in page coords: CSS centres the font's
 * ascent+descent inside the line-height, so
 * baseline = boxTop + (lineHeight - (ascent + descent)) / 2 + ascent.
 * Metrics come from canvas for the element's computed font.
 */
function lineBaseline(boxTop, lineHeightPx, font) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const m = ctx.measureText('Hy');
  const half = (lineHeightPx - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
  return boxTop + half + m.fontBoundingBoxAscent;
}

/**
 * Derives the copy's line-height so the block spans EXACTLY from the
 * cap top of "BUILT ON TRUST." to the baseline of "POWERED BY
 * ACCESS." (Oscar's rev — the bottom is already pinned by
 * alignIntroToHeadline; shortening the leading is what brings the
 * first line's top up to the headline's top). Geometry:
 *
 *   span = capAscent + (N - 1) * lh + paragraphGap
 *
 * where N is the copy's rendered line count and the paragraph gap is
 * the second <p>'s margin (one of the N-1 baseline steps crosses it).
 * Solving for lh gives the exact leading; everything is measured, so
 * it re-derives on resize.
 *
 * CLIP-WINDOW COMPENSATION: the derived lh sits BELOW the font's
 * ascent+descent box, so line boxes no longer contain the full ink —
 * and the reveal wraps lines in overflow:hidden clips, which would
 * shave ascenders/descenders. --landing-copy-clip-pad expands each
 * clip's window by the overhang (padding) while cancelling the layout
 * growth (negative margin), so spacing is unchanged but ink never
 * clips. The pad is capped at 9% of the line-height: the hidden
 * reveal state offsets lines by 110%, so a pad beyond 10% would let
 * hidden text peek through the expanded window.
 */
function deriveIntroLineHeight(headlineText, introText) {
  if (!(headlineText instanceof HTMLElement) || !(introText instanceof HTMLElement)) return;
  const line1 = headlineText.querySelector('.landing-hero__headline-line--dazzed');
  const line2 = headlineText.querySelector('.landing-hero__headline-line--serrif');
  const paragraphs = introText.querySelectorAll('p');
  if (!(line1 instanceof HTMLElement) || !(line2 instanceof HTMLElement) || paragraphs.length < 2) return;

  introText.style.lineHeight = '';
  introText.style.removeProperty('--landing-copy-clip-pad');
  if (paragraphs[1] instanceof HTMLElement) paragraphs[1].style.marginTop = '';

  const ctx = document.createElement('canvas').getContext('2d');

  const h1cs = getComputedStyle(line1);
  ctx.font = `${h1cs.fontWeight} ${h1cs.fontSize} ${h1cs.fontFamily}`;
  const h1m = ctx.measureText('B');
  const h1lh = parseFloat(h1cs.lineHeight);
  const h1rect = line1.getBoundingClientRect();
  const h1baseline = h1rect.top
    + (h1lh - (h1m.fontBoundingBoxAscent + h1m.fontBoundingBoxDescent)) / 2
    + h1m.fontBoundingBoxAscent;
  const headlineCapTop = h1baseline - h1m.actualBoundingBoxAscent;

  const h2cs = getComputedStyle(line2);
  const targetBaseline = lineBaseline(
    line2.getBoundingClientRect().top,
    parseFloat(h2cs.lineHeight),
    `${h2cs.fontWeight} ${h2cs.fontSize} ${h2cs.fontFamily}`,
  );

  const spanNeeded = targetBaseline - headlineCapTop;
  const gap = parseFloat(getComputedStyle(paragraphs[1]).marginTop);

  const ics = getComputedStyle(introText);
  ctx.font = `${ics.fontWeight} ${ics.fontSize} ${ics.fontFamily}`;
  const cm = ctx.measureText('N');
  const fontBox = cm.fontBoundingBoxAscent + cm.fontBoundingBoxDescent;

  const applyLh = (lh) => {
    introText.style.lineHeight = `${lh.toFixed(3)}px`;
    const overhang = Math.max(0, (fontBox - lh) / 2 + 0.5);
    const pad = Math.min(overhang, lh * 0.09);
    introText.style.setProperty('--landing-copy-clip-pad', `${pad.toFixed(2)}px`);
    return pad;
  };

  /* Leading bonus + gap trade (see INTRO_LEADING_BONUS_PX): given the
     line count, bump the equal-solve leading by the bonus and shrink
     the paragraph gap to keep the span; the gap is written inline so
     the correction loop (fixed-gap) still converges on the pins. */
  const applyLeadingTrade = (lhBase, lineCount) => {
    let lh = lhBase + INTRO_LEADING_BONUS_PX;
    let newGap = spanNeeded - cm.actualBoundingBoxAscent - (lineCount - 1) * lh;
    if (newGap < 0) {
      newGap = 0;
      lh = (spanNeeded - cm.actualBoundingBoxAscent) / (lineCount - 1);
    }
    paragraphs[1].style.marginTop = `${newGap.toFixed(2)}px`;
    return lh;
  };

  const clips = Array.from(introText.querySelectorAll('.lr-clip'));

  if (clips.length >= 2) {
    /* Wrapped (normal path): iterate against the RENDERED span from
       the first/last clip rects. This absorbs whatever the clip pads'
       sibling-margin collapse does to the real spacing — no modelling,
       just measure-and-correct; converges in one step for a linear
       system, capped at three for safety. */
    const N = clips.length;
    let lh = applyLeadingTrade(
      (spanNeeded - cm.actualBoundingBoxAscent - gap) / (N - 1),
      N,
    );
    for (let i = 0; i < 3; i += 1) {
      const pad = applyLh(lh);
      const half = (lh - fontBox) / 2;
      const firstBaseline = clips[0].getBoundingClientRect().top + pad + half
        + cm.fontBoundingBoxAscent;
      const capTop = firstBaseline - cm.actualBoundingBoxAscent;
      const lastBaseline = clips[N - 1].getBoundingClientRect().bottom - pad
        - half - cm.fontBoundingBoxDescent;
      const err = (lastBaseline - capTop) - spanNeeded;
      if (Math.abs(err) < 0.05) break;
      lh -= err / (N - 1);
    }
  } else {
    /* Unwrapped (reduced-motion path — no clips, no pads, no collapse):
       the closed-form solve is exact. */
    const baseLh = parseFloat(ics.lineHeight);
    const lineCount = Math.round(
      (introText.getBoundingClientRect().height - gap) / baseLh,
    );
    if (lineCount < 2) return;
    applyLh(applyLeadingTrade(
      (spanNeeded - cm.actualBoundingBoxAscent - gap) / (lineCount - 1),
      lineCount,
    ));
  }
}

/**
 * Final-position top-skew correction: after the bottom pin, measures
 * the RENDERED gap between the copy's first-line cap top and the
 * headline's cap top and folds any residual into the line-height,
 * re-pinning the bottom each pass. The pre-align span iteration gets
 * within a px; this loop closes the rest because its acceptance
 * metric IS the final on-screen skew — whatever sub-pixel or
 * margin-collapse behaviour produced the residual is corrected by
 * construction. No-op when the copy is unwrapped (reduced motion —
 * the closed-form solve is exact there).
 */
function correctIntroTop(headlineText, introText) {
  if (!(headlineText instanceof HTMLElement) || !(introText instanceof HTMLElement)) return;
  const line1 = headlineText.querySelector('.landing-hero__headline-line--dazzed');
  const clips = Array.from(introText.querySelectorAll('.lr-clip'));
  if (!(line1 instanceof HTMLElement) || clips.length < 2) return;

  const ctx = document.createElement('canvas').getContext('2d');
  const h1cs = getComputedStyle(line1);
  ctx.font = `${h1cs.fontWeight} ${h1cs.fontSize} ${h1cs.fontFamily}`;
  const h1m = ctx.measureText('B');
  const h1lh = parseFloat(h1cs.lineHeight);
  const headCapTop = line1.getBoundingClientRect().top
    + (h1lh - (h1m.fontBoundingBoxAscent + h1m.fontBoundingBoxDescent)) / 2
    + h1m.fontBoundingBoxAscent - h1m.actualBoundingBoxAscent;

  const ics = getComputedStyle(introText);
  ctx.font = `${ics.fontWeight} ${ics.fontSize} ${ics.fontFamily}`;
  const cm = ctx.measureText('N');
  const fontBox = cm.fontBoundingBoxAscent + cm.fontBoundingBoxDescent;

  for (let i = 0; i < 3; i += 1) {
    const lh = parseFloat(getComputedStyle(introText).lineHeight);
    const pad = parseFloat(
      getComputedStyle(introText).getPropertyValue('--landing-copy-clip-pad'),
    ) || 0;
    const half = (lh - fontBox) / 2;
    const copyCapTop = clips[0].getBoundingClientRect().top + pad + half
      + cm.fontBoundingBoxAscent - cm.actualBoundingBoxAscent;
    const skew = copyCapTop - headCapTop;
    if (Math.abs(skew) < 0.05) break;
    const next = lh + skew / (clips.length - 1);
    introText.style.lineHeight = `${next.toFixed(3)}px`;
    const overhang = Math.max(0, (fontBox - next) / 2 + 0.5);
    introText.style.setProperty(
      '--landing-copy-clip-pad',
      `${Math.min(overhang, next * 0.09).toFixed(2)}px`,
    );
    alignIntroToHeadline(headlineText, introText);
  }
}

/**
 * Vertically aligns the copy block so its LAST line's baseline sits on
 * the baseline of "POWERED BY ACCESS." (Oscar's rev). Horizontal
 * position is untouched — only the translateY changes, as a measured
 * delta added to the CSS -50%. Baselines, not box bottoms: the 48px
 * and 16px lines carry very different descender space, so box-bottom
 * alignment would visibly miss. Idempotent (resets the transform
 * before measuring) — safe on every rebuild/resize.
 */
function alignIntroToHeadline(headlineText, introText) {
  if (!(headlineText instanceof HTMLElement) || !(introText instanceof HTMLElement)) return;
  const line2 = headlineText.querySelector('.landing-hero__headline-line--serrif');
  if (!(line2 instanceof HTMLElement)) return;

  introText.style.transform = 'translateY(-50%)';

  const hcs = getComputedStyle(line2);
  const targetBaseline = lineBaseline(
    line2.getBoundingClientRect().top,
    parseFloat(hcs.lineHeight),
    `${hcs.fontWeight} ${hcs.fontSize} ${hcs.fontFamily}`,
  );

  /* The block's last line box ends at the block's content bottom, so
     its baseline derives from the block rect regardless of whether the
     lines are wrapped in reveal clips yet. */
  const ics = getComputedStyle(introText);
  const lh = parseFloat(ics.lineHeight);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${ics.fontWeight} ${ics.fontSize} ${ics.fontFamily}`;
  const m = ctx.measureText('Hy');
  const half = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
  const currentBaseline =
    introText.getBoundingClientRect().bottom - half - m.fontBoundingBoxDescent;

  const delta = targetBaseline - currentBaseline;
  introText.style.transform = `translateY(calc(-50% + ${delta.toFixed(2)}px))`;
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
      refineHeadlineCentring(headlineText);
      if (introText instanceof HTMLElement && headlineText instanceof HTMLElement) {
        introText.style.width = `${headlineText.getBoundingClientRect().width}px`;
        deriveIntroLineHeight(headlineText, introText);
        alignIntroToHeadline(headlineText, introText);
      }
      if (headlineText instanceof HTMLElement) {
        const lines = headlineText.querySelectorAll('.landing-hero__headline-line');
        lines.forEach((line) => {
          if (!(line instanceof HTMLElement)) return;
          gsap.set(line, { x: 0 });
          gsap.set(line, { x: HEADLINE_LEFT_MARGIN - line.getBoundingClientRect().left });
        });
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

    /* ── Beat 1: travel left AND converge to a left-aligned stack ──
       (Oscar's rev.) Each LINE gets its own x tween to the shared
       24px target over the SAME scroll range: the wider line travels
       less, the narrower line travels more, and both arrive together
       — so the centre-aligned pair resolves into a left-aligned stack
       continuously DURING the travel. No text-align switch, nothing
       to snap. Deltas are measured from each line's rendered left
       edge (x reset first), so the end state is exact at any width. */
    let sequenceEnd = 0;

    if (headlineText instanceof HTMLElement) {
      refineHeadlineCentring(headlineText);
      const lines = Array.from(
        headlineText.querySelectorAll('.landing-hero__headline-line'),
      ).filter((el) => el instanceof HTMLElement);

      lines.forEach((line) => gsap.set(line, { x: 0 }));
      const deltas = lines.map(
        (line) => HEADLINE_LEFT_MARGIN - line.getBoundingClientRect().left,
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: spacer,
          start: 'top top',
          end: `top+=${HEADLINE_MOVE_PX} top`,
          scrub: true,
        },
      });
      lines.forEach((line, i) => {
        tl.fromTo(line, { x: 0 }, { x: deltas[i], ease: 'none', duration: 1 }, 0);
      });
      tweens.push(tl);
      if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);

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
      deriveIntroLineHeight(headlineText, introText);
      alignIntroToHeadline(headlineText, introText);
      correctIntroTop(headlineText, introText);
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
      const bandTop = Math.round(vh * VIDEO_BAND_TOP_FRACTION);
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
        derived: (() => {
          const topbar = document.querySelector('.home__topbar');
          const navBottom = topbar ? topbar.getBoundingClientRect().bottom : 0;
          const videoTop = Math.round(vh * VIDEO_BAND_TOP_FRACTION);
          return {
            navBottom,
            videoTop,
            bandCentre: navBottom + (videoTop - navBottom) / 2,
            headlineMarginTop: headlineText instanceof HTMLElement
              ? headlineText.style.marginTop
              : null,
          };
        })(),
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
