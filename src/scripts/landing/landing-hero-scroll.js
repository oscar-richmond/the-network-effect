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
import { DRIFT_HEADLINE_PX } from './landing-founders.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSiteScroll } from './site-scroll.js';
/* playLineRevealElement: the R7 static-arrival path (loads the splash
   does not own — return visits, ?splash=0) calls it; it was never
   imported, so build() threw there and the whole hero choreography
   (triggers, runway, cards placement, GL) was dead on every return
   visit. Found 2026-09-02 by the logo-row probe; fixed in place. */
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { createHeroRotatingGallery } from './hero-rotating-gallery.js';
import { isMobileViewport } from './viewport.js';

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
const REVEAL_LINE_PX = 130; /* retired for the intro (R7) — kept for the beats' history */
/* R7 (Oscar, 2026-09-02): the intro joins the headline's splash
   entrance a slight beat behind it. The headline's lines stagger at
   the founders' 0.12s (splash.js); the intro starts this much after
   the LAST headline line begins — 0.15 = "a very slight delay". */
const HEADLINE_LINE_STAGGER_S = 0.12;
const INTRO_AFTER_HEADLINE_S = 0.15;

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
 *
 * R3 (Oscar, 2026-08-26): the DESKTOP band top is now PX-ANCHORED —
 * the foot of the rest chain — so the authored gaps hold at ANY
 * viewport height, including the scale shell's short interiors. The
 * fraction remains for MOBILE only (its own 0.5 constant below).
 * (The chain's VALUES are R20's — Oscar's ruling 2026-09-02, the one
 * set: wordmark → cap 120, headline → intro 48, intro → logo row
 * 120, row → cards 80 — see HERO_INTRO_TO_LOGOS_PX and the intro rule
 * in landing.css; the R3/R4/R7/R14 numbers this note used to carry
 * are superseded.)
 */
const VIDEO_BAND_TOP_FRACTION = 0.625; /* mobile-path denominator only */
/* R5 (Oscar, 2026-09-02): the foot of the chain is now MEASURED —
   see bandTopFor: intro rest bottom + HERO_INTRO_TO_BAND_PX. The
   659.6 (= 389.6 + the old 3×50 intro + 120) is the fallback only. */
/* R14 (Oscar, 2026-09-02): THE LOGO ROW sits between the intro and
   the cards — frame 0:621 (offset −83): intro bottom → the row → 80
   → the cards. R20 (Oscar's ruling, 2026-09-02 — the ONE set of hero
   gaps, superseding R14's 80 here and R7's 80 above the intro): the
   intro's bottom → the logo row is 120 (the headline → intro 48
   lives in landing.css). The band/cards rest top is the sum (300). */
const HERO_INTRO_TO_LOGOS_PX = 120;
const HERO_LOGO_ROW_H_PX = 100;
const HERO_LOGOS_TO_CARDS_PX = 80;
const HERO_INTRO_TO_BAND_PX = HERO_INTRO_TO_LOGOS_PX + HERO_LOGO_ROW_H_PX + HERO_LOGOS_TO_CARDS_PX; /* 300 (was 260 / 120) */
const VIDEO_BAND_TOP_PX = 807.6; /* fallback only: 507.6 + 300 */

/* ── THE THREE-IMAGE HERO (R8, Oscar 2026-09-02) — the /old hero's
   scroll mechanic (about-3/about-scroll.js), ported to the desktop
   landing in place of the video. Geometry verbatim from
   AboutHero.astro: a row of three cards, 24px margins, 8px gaps,
   600/533.33 aspect. Rest top = the intro's bottom + 120 (the
   spacing ruling — /old peeked the row 120 above the viewport
   bottom; the deliberate deviation). Choreography verbatim from
   about-scroll.js: the row holds until pinScrollY = restTop −
   (vh − cardH)/2, then the LEFT card rises at scroll speed, the
   middle 80px later, the right 160 later, each until fully clear;
   EXIT_BUFFER 60 after the last; runway = that + vh. The text
   blur-outs are the shipped wipe vocabulary re-keyed to the covering
   cards (headline ← the middle card, intro ← the left: each block's
   FIRST coverer). The ground scrub-fades from the light ground to
   the founders section's #161616 over [left card two-thirds out,
   right card fully out] — /old's own anchors — so the founders
   arrive dark-on-dark 60px later. hero-rotating-gallery.js takes
   the cards over in WebGL once they've entered. */
const HERO_CARD_MARGIN_PX = 24;
const HERO_CARD_GAP_PX = 8;
const HERO_CARD_ASPECT = 600 / 533.33;
const HERO_CARD_STAGGER_PX = 80;
const HERO_CARD_EXIT_BUFFER_PX = 60;
const HERO_GROUND_LIGHT = '#eeeef0';
const HERO_GROUND_DARK = '#161616'; /* the founders section's ground */
/* R21 (Oscar, 2026-09-02) — THE FADE starts where it did (the left
   card two-thirds out) and ends at HERO_GROUND_FADE_END_CARD's full
   exit — the LEFT card (0): span cardH/3 = 208 at 1728.
   R26 (Oscar, 2026-09-03) — THE ARRIVAL, keyed to an IMAGE EDGE
   (supersedes R21's exitAt(2) − 111 lead and R18's 90%-of-fade gate):
   WHO WE ARE's FIRST INK — its label, 200 into the section + the 60
   entry drift it still carries as the section's top crosses the
   viewport bottom = 260 — crosses the viewport bottom EXACTLY as the
   SECOND image to clear has its bottom edge cross y=0. The stagger
   leaves the cards left / middle / right, 80 apart, so that is the
   MIDDLE card (slot 1), exitAt(1). WHY THE EARLIER RULINGS LANDED
   LATE: both were scroll offsets hung off the fade or the LAST card,
   not the images — R18 put the section's top at 90% of a fade that
   itself ended at card 2; R21 put it 111 before card 2's clear; in
   both the visible arrival (the ink, 260 later) came 229–300 after
   the middle card had cleared. WHO WE ARE is in flow after this
   runway spacer, so its entry scroll IS the spacer's end. The fade
   keeps its start and now completes 180 AFTER the section's top has
   crossed the viewport bottom (the overlap window is in the report;
   the fade rate is Oscar's to rule). The GL pause gate stays at
   exitEnd.
   R31 (Oscar, 2026-09-03) — ONE ANCHOR FOR BOTH EVENTS (supersedes
   R21's fade start and R26's entrance): the moment the THIRD image to
   clear — the RIGHT card, slot 2 — has its bottom edge cross y=0,
   the ground fade STARTS and WHO WE ARE's top crosses the viewport
   bottom, together. Both derive from that card's edge: exitAt(2) is
   the scroll at which its scrubbed y reaches −(restTop + cardH), i.e.
   its measured bottom at 0 (verified 0.1 at 1117 / 994 / 942 and in
   the 1512 shell). It IS the last to clear: the stagger starts the
   cards left / middle / right 80 apart at one speed to one height,
   and only at exitAt(2) do all three bottoms read 0. The fade keeps
   its RATE (span cardH/3 = 208 at 1728) so it completes 208 after
   the boundary; the section's own ground rides the same tween (R27),
   and its first ink — the label, ~246 in — crosses the viewport
   bottom 38 after the fade completes, so no light ground ever sits
   under it in either direction. The fade is long complete by the time
   the section is fully in (a viewport later). Old → new, 1728:
   entrance 1716.6 → 2043.3, fade 1675.3..1883.3 → 2043.3..2251.3.
   R32 (Oscar, 2026-09-04) — THE ANCHOR IS THE MIDDLE IMAGE'S CENTRE
   (supersedes R31's right-card edge, and with it R26/R21/R18):
   the moment the MIDDLE card — slot 1 — is HALFWAY off the top, i.e.
   its vertical CENTRE crosses y=0, the ground fade STARTS and WHO WE
   ARE begins entering, together.
   WHY THE FOUR EARLIER RULINGS MISSED, measured at the 1117 interior
   by binary search on the live rects (each commit's own code, the
   middle centre crossing at 1651.5 throughout):
     49b5457 before  fade +24    entrance +452
     120d988 (R18)   fade +24    entrance +355
     b0fff11 (R21)   fade +24    entrance +281
     21cd0e9 (R26)   fade +24    entrance +65
     50eb6af (R31)   fade +392   entrance +392
   Every edit DID move the live numbers — there is no dead path, no
   cached geometry, no owning outer timeline and no clamp: the fade is
   this trigger's start and the entrance IS the runway's end (the
   section is in flow after the spacer, so `total` places it). What
   the rulings kept missing is the ANCHOR ITSELF: each named a card
   EXIT — a bottom edge crossing y=0 — and never the middle card's
   CENTRE. R31 read "the last to clear" as the boundary and moved both
   events 368 later than R26 had them, which is the regression Oscar
   is looking at. The gap is structural, not incidental:
     exitAt(2) − centreAt(1) = 80 (the stagger) + cardH/2 = 392 at 1728.
   So the anchor is now taken from the SAME tween inverse the exit
   wipes use (scrollWhenCardCentreAt), not from an exit or an offset:
   if the stagger, the rest top or the card aspect ever change, the
   boundary follows them. New, 1728: entrance and fade start 1651.3
   (was 2043.3), fade 1651.3..1859.3. CONSEQUENCE, reported not hidden:
   the runway ends 392 earlier, so the spacer and the document are 392
   shorter and every section below shifts up by exactly that (their
   spacing to each other is untouched). The fade keeps its RATE
   (cardH/3 = 208) and the entrance keeps its own choreography — only
   the trigger moved. The cards still finish their exits after the
   boundary (the last at +392); the section rises over them as they
   go, on the darkening ground, which is what "begins entering" means
   here. The GL pause gate stays at exitEnd — by then all three cards
   are long clear.
   R33 (Oscar, 2026-09-04) — THE ANCHOR MOVES TO THE TOP EDGE
   (supersedes R32's centre; the card is the same one): both events
   fire the moment the SECOND CARD TO LEAVE first begins to go off
   the top — its TOP EDGE crossing y=0, the instant any part of it is
   off-screen.
   WHICH CARD, stated once so it cannot cost another round: the cards
   start left / middle / right, 80 apart, and run at one speed to one
   height, so they BEGIN and FINISH in that order. The second to leave
   is therefore slot 1 — the MIDDLE card — which is also what a viewer
   reading left to right calls "the second image". The two readings
   name the same card here; there is no second candidate to flag.
   (Top-edge crossings at the 1117 interior: left 1259.3, middle
   1339.3, right 1419.3.)
   The derivation stays the tween inverse — scrollWhenCardTopAt, the
   sibling of R32's centre helper and the same function the exit wipes
   use — so the boundary still follows the stagger, the rest top and
   the card aspect. New, 1728: both events at 1339.3 (R32: 1651.3,
   R31: 2043.3); the move is exactly −cardH/2 = −312 from R32.
   THE OVERLAP GROWS, reported not hidden: the last card now finishes
   its exit 80 + cardH = 704 after the boundary (was 392), so the
   arriving section rides up over a hero that is still leaving for
   about two thirds of a viewport. The fade's RATE is untouched
   (cardH/3 = 208), and because the fade and the entrance still start
   together the ink margin is unchanged: the ground reaches #161616 at
   +208 and WHO WE ARE's first ink crosses the viewport bottom at
   +246.7 (1117) / +245.5 (994, 942) — 38 clear, measured both
   directions. The runway ends 312 earlier again: the document is 312
   shorter and every section below shifts up by exactly that. */
const HERO_BOUNDARY_CARD = 1;         /* the SECOND CARD TO LEAVE — the middle image */
/* The first ink's crossing is DERIVED, not the static 260: the label
   sits 200 into the section and lags by DRIFT_HEADLINE_PX (60) as the
   section's top enters, but that lag DECAYS over the section's entry
   (it lands at 200 as the section fills the viewport), so the label
   travels faster than the scroll — measured: 274 of travel for 260 of
   scroll, 14 early. Solving labelTop = vh gives
     d = (200 + 60) · entryPx / (entryPx + 60)
   with entryPx = max(vh, section height), the founders entry window
   (246.7 at 1117, 245.5 at the 994/942 interiors). */
const HERO_FOUNDERS_LABEL_TOP_FALLBACK_PX = 200;

/** The band's side margins, matching --landing-video-margin. */
const VIDEO_MARGIN_PX = 24;

/* ── Mobile values (the Figma 402-frame rebuild, 2026-08-13) ──────────
   The frame's grammar is 16px side margins (landing.css sets
   --landing-video-margin to match on .landing-home), and the file
   drops the intro copy entirely — Beat 2 is skipped below, and the
   tagline travels to the 16px margin. The file only draws the
   EXPANDED video keyframe (402×874 full-bleed), so the REST band's
   top fraction is the build's call: 0.5 places the band across the
   lower half — clear of the two-line tagline with the file's
   breathing room — and is flagged as such in the build report. */
const VIDEO_BAND_TOP_FRACTION_M = 0.5;
const VIDEO_MARGIN_PX_M = 16;
const HEADLINE_LEFT_MARGIN_M = 16;

/* Lenis smoothing now lives in site-scroll.js (SCROLL_LERP 0.065,
   the house value) — ONE source of truth for every native-scroll
   page (Oscar's uniform-feel mandate, 2026-08-08). */

/* ── Text exit wipe — PORTED from the /old hero's Phase C
   (about-scroll.js), constants verbatim: as the covering element
   rises over a text block, its lines blur+fade away bottom-up,
   scrubbed so reverse scroll runs the wipe backwards to crisp. Here
   the covering element is the VIDEO's top clip edge during its
   expansion (the images played that role on the old hero). Each
   block's window: covering edge at block.bottom + WIPE_LEAD (onset
   just before arrival) -> covering edge at block.top (block fully
   covered). */
const EXIT_BLUR_PX = 10;
/** Scroll-px of onset before the video's edge reaches the block. */
const WIPE_LEAD = 120;
/** Per-line stagger in timeline-seconds against 1s line durations —
 * 0.5 gives the reference's overlapping, continuous bottom-up sweep. */
const WIPE_STAGGER = 0.5;

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
function refineHeadlineCentring(
  headlineText,
  bandFrac = VIDEO_BAND_TOP_FRACTION,
  vh = window.innerHeight,
  wordmarkAnchor = false,
) {
  if (!(headlineText instanceof HTMLElement)) return;
  /* Desktop: the topbar box bottom (shipped derivation, untouched).
     Mobile (R1 item 1): the WORDMARK'S OWN bottom — Oscar's spec is
     "between the bottom of the nav wordmark and the top of the
     video", measured live so it holds across widths and dvh. */
  const anchorEl = wordmarkAnchor
    ? document.querySelector('.home__logo')
    : document.querySelector('.home__topbar');
  const navBottom = anchorEl instanceof HTMLElement
    ? anchorEl.getBoundingClientRect().bottom
    : 0;
  const videoTop = Math.round(vh * bandFrac);
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

/* The smooth-scroll boot + instance moved to site-scroll.js (the
   shared house feel). getLenisInstance is RE-EXPORTED below so the
   landing modules that import it from here (access snap, closing,
   services) stay untouched. */
export { getLenisInstance } from './site-scroll.js';

export function initLandingHeroScroll() {
  const hero = document.querySelector('[data-landing-hero]');
  const spacer = document.querySelector('[data-landing-hero-spacer]');
  const headlineText = document.querySelector('[data-landing-hero-headline-text]');
  const intro = document.querySelector('[data-landing-hero-intro]');
  const introText = document.querySelector('[data-landing-hero-intro-text]');
  const video = document.querySelector('[data-landing-hero-video]');
  const cards = Array.from(document.querySelectorAll('[data-landing-hero-card]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const heroBg = document.querySelector('[data-landing-hero] .landing-hero__bg');
  const logos = document.querySelector('[data-landing-hero-logos]');

  if (!(hero instanceof HTMLElement) || !(spacer instanceof HTMLElement)) {
    return () => {};
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* NARROW (≤ MOBILE_MAX_WIDTH, the viewport.js seam): the SAME machine runs —
     headline travel, line reveals, exit wipes, video expansion are all
     measurement-driven, so they follow the mobile CSS composition.
     What differs is ownership of the DERIVED layout: on mobile the
     headline sits under the topbar and the intro flows BELOW it
     (landing.css owns both), so refineHeadlineCentring, the intro
     width-match and the headline-span-pinned leading (derive/align/
     correct) are skipped — they encode the desktop side-by-side
     composition. vh comes from the stage's rendered height (100svh on
     mobile) so the band and runway never re-derive on URL-bar
     collapse; the resize rebuild fires on WIDTH change only for the
     same reason. */
  const isMob = isMobileViewport();

  /* Regime-resolved geometry (mobile constants block above). Desktop
     resolves to the shipped values — bit-identical behaviour. */
  const bandFrac = isMob ? VIDEO_BAND_TOP_FRACTION_M : VIDEO_BAND_TOP_FRACTION;
  /* Desktop: the band top is DERIVED (R5, Oscar 2026-09-02) — the
     intro's measured rest bottom + HERO_INTRO_TO_BAND_PX, so the
     authored 120 below the intro holds through type changes (the
     38px intro is 66px shorter than the 48px block the old constant
     encoded). Measured inside the fonts-gated build (the intro is
     laid out — visibility:hidden, not display:none — and its <p>
     box carries no transform on desktop), re-derived by the resize
     rebuild; VIDEO_BAND_TOP_PX remains only as the fallback when
     nothing measurable exists. Mobile keeps its fraction of the
     stage height. */
  const bandTopFor = (vh) => {
    if (isMob) return Math.round(vh * bandFrac);
    if (introText instanceof HTMLElement && hero instanceof HTMLElement) {
      const bottom = introText.getBoundingClientRect().bottom - hero.getBoundingClientRect().top;
      if (Number.isFinite(bottom) && bottom > 0) {
        return Math.round((bottom + HERO_INTRO_TO_BAND_PX) * 10) / 10;
      }
    }
    return VIDEO_BAND_TOP_PX;
  };
  const vMargin = isMob ? VIDEO_MARGIN_PX_M : VIDEO_MARGIN_PX;
  const headlineLeft = isMob ? HEADLINE_LEFT_MARGIN_M : HEADLINE_LEFT_MARGIN;

  /* R8: the cards' rest geometry — written as inline layout (top/left/
     width/height) so the GL planes can read the rest top back from
     the element itself (/old's own source), y reset for the scrub. */
  /* R14: the logo row's rest — intro bottom + HERO_INTRO_TO_LOGOS_PX,
     written inline (the same measured foot the cards derive from);
     the flash guard lifts with it. Desktop only. */
  const placeLogos = () => {
    if (isMob || !(logos instanceof HTMLElement)) return null;
    const bottom = introText instanceof HTMLElement
      ? introText.getBoundingClientRect().bottom - hero.getBoundingClientRect().top
      : VIDEO_BAND_TOP_PX - HERO_INTRO_TO_BAND_PX;
    const top = Math.round((bottom + HERO_INTRO_TO_LOGOS_PX) * 10) / 10;
    logos.style.top = `${top}px`;
    logos.classList.add('is-placed');
    return top;
  };

  const placeCards = (vh) => {
    if (isMob || cards.length !== 3) return null;
    placeLogos();
    const vw = window.innerWidth || 1728;
    const cardW = (vw - 2 * HERO_CARD_MARGIN_PX - 2 * HERO_CARD_GAP_PX) / 3;
    const cardH = cardW * HERO_CARD_ASPECT;
    const restTop = bandTopFor(vh);
    gsap.set(cards, {
      top: restTop,
      left: (i) => HERO_CARD_MARGIN_PX + i * (cardW + HERO_CARD_GAP_PX),
      width: cardW,
      height: cardH,
      y: 0,
    });
    /* The flash guard lifts only now — the cards were visibility:
       hidden from first paint (landing.css) so the pre-fonts window
       can never show them unsized. */
    cards[0].parentElement?.classList.add('is-placed');
    return { cardW, cardH, restTop };
  };

  /* R8: the WebGL takeover — created once the DOM cards have entered
     (the splash's cards-entered event; immediately on a load the
     splash does not own), destroyed with the module. The planes
     mirror the cards' rects, so a takeover mid-scroll is seamless by
     construction. Paused while the hero is scrolled past. */
  let gallery = null;
  let galleryDisposed = false;
  const startGallery = () => {
    if (gallery || galleryDisposed || isMob || cards.length !== 3) return;
    gallery = createHeroRotatingGallery(cards, {
      mount: hero,
      restTopOf: (el) => parseFloat(el.style.top) || 0,
    });
    gallery?.ready.then(() => {
      if (galleryDisposed) return;
      cards.forEach((card) => {
        const img = card.querySelector('img');
        if (img instanceof HTMLElement) img.style.opacity = '0';
      });
    });
  };
  const onCardsEntered = () => startGallery();
  document.addEventListener('landing-hero:cards-entered', onCardsEntered, { once: true });

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
      if (isMob) {
        refineHeadlineCentring(
          headlineText,
          bandFrac,
          hero.clientHeight || window.innerHeight,
          true,
        );
      }
      if (!isMob && introText instanceof HTMLElement && headlineText instanceof HTMLElement) {
        introText.style.width = `${headlineText.getBoundingClientRect().width}px`;
        deriveIntroLineHeight(headlineText, introText);
        alignIntroToHeadline(headlineText, introText);
      }
      if (headlineText instanceof HTMLElement) {
        const lines = headlineText.querySelectorAll('.landing-hero__headline-line');
        lines.forEach((line) => {
          if (!(line instanceof HTMLElement)) return;
          gsap.set(line, { x: 0 });
          gsap.set(line, { x: headlineLeft - line.getBoundingClientRect().left });
        });
      }
      intro?.classList.add('is-armed');
      /* R8: the cards at rest — the static composition (no rise, no
         GL, no wipes; the ground stays light and the founders section
         slides over it — the instant boundary). */
      placeCards(hero.clientHeight || window.innerHeight);
    });
    return () => {
      disposed = true;
      document.removeEventListener('landing-hero:cards-entered', onCardsEntered);
    };
  }

  const cleanupScroll = initSiteScroll();

  /** Everything created here, torn down together on cleanup. */
  const triggers = [];
  const tweens = [];

  const build = () => {
    /* Mobile: the stage's rendered height (100svh) — stable under
       URL-bar collapse; desktop keeps the shipped innerHeight read. */
    const vh = isMob ? hero.clientHeight || window.innerHeight : window.innerHeight;

    /* ── Beat 1: travel left AND converge to a left-aligned stack ──
       (Oscar's rev.) Each LINE gets its own x tween to the shared
       24px target over the SAME scroll range: the wider line travels
       less, the narrower line travels more, and both arrive together
       — so the centre-aligned pair resolves into a left-aligned stack
       continuously DURING the travel. No text-align switch, nothing
       to snap. Deltas are measured from each line's rendered left
       edge (x reset first), so the end state is exact at any width. */
    let sequenceEnd = 0;

    /* R2 (Oscar, 2026-08-24): the DESKTOP headline no longer moves —
       the frame's offset composition IS the resting state, start to
       finish (Beat 1 skipped whole, sequenceEnd stays 0 so the intro
       reveal begins with the first scroll). MOBILE keeps the shipped
       travel to the 16px margin. */
    if (headlineText instanceof HTMLElement && isMob) {
      /* MOBILE too (R1 item 1): centre the tagline between the
         measured nav bottom and the band top — live-derived, so it
         holds across widths and dvh (the stage's svh height is the
         band's own denominator). */
      refineHeadlineCentring(headlineText, bandFrac, vh, isMob);
      const lines = Array.from(
        headlineText.querySelectorAll('.landing-hero__headline-line'),
      ).filter((el) => el instanceof HTMLElement);

      lines.forEach((line) => gsap.set(line, { x: 0 }));
      const deltas = lines.map(
        (line) => headlineLeft - line.getBoundingClientRect().left,
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

    /* MOBILE: the 402 frame has NO intro copy — the element is
       display:none (landing.css .landing-home) and Beat 2 is skipped
       whole: wrapping/revealing a hidden block would measure zero
       rects and pad the runway with dead scroll. */
    if (!isMob && introText instanceof HTMLElement && headlineText instanceof HTMLElement) {
      /* Frame 16:113: the intro is its own fixed 452px block at x225
         (CSS) — the old width-match + derived leading + alignment trio
         encoded the retired side-by-side composition and no longer
         runs. (deriveIntroLineHeight / alignIntroToHeadline /
         correctIntroTop retained above, unreferenced, for history.) */
      /* R7 (Oscar, 2026-09-02): the SCROLL reveal is retired — the
         intro arrives with the HEADLINE's own entrance (the splash's
         founders-style clip rise, playPageEntrance in splash.js) a
         slight beat behind it: the paragraph's reveal delay is the
         headline's two-line stagger plus INTRO_AFTER_HEADLINE_S, so
         the wrap's own per-line transitions carry the timing. On a
         load the splash does not own (return visits, ?splash=0) the
         headline is static, so the intro is made visible statically
         too — no scroll gate, no runway. The clips still exist for
         the text exit wipes below. Beat 2's REVEAL_LINE_PX runway
         is gone with it (revealEnd stays at sequenceEnd). */
      introText.querySelectorAll('p').forEach((p) => {
        p.dataset.revealDelay = String(
          headlineText.querySelectorAll('.landing-hero__headline-line').length * HEADLINE_LINE_STAGGER_S
            + INTRO_AFTER_HEADLINE_S,
        );
      });
      const introLines = wrapIntroLines(introText);

      /* Armed only now — the lines exist and are clipped, so making
         the block visible can no longer flash complete text. */
      intro?.classList.add('is-armed');

      if (introLines.length && document.documentElement.getAttribute('data-ne-splash') !== 'on') {
        /* Static arrival, matching the un-splashed headline: reveal
           with the transitions suppressed for one frame. */
        const paragraphs = Array.from(introText.querySelectorAll('p'));
        introLines.forEach((el) => { el.style.transition = 'none'; });
        paragraphs.forEach((p) => playLineRevealElement(p));
        introLines.forEach((el) => { el.parentElement?.classList.add('lr-done'); });
        requestAnimationFrame(() => {
          introLines.forEach((el) => { el.style.transition = ''; });
        });
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
    /** The last scroll px of the hero's own choreography (before the
     *  +vh runway pad): mobile = the video hold's end; desktop = the
     *  cards' EXIT_END. */
    let total = revealEnd;
    /** Desktop beat map for the DEV handle. */
    let cardBeats = null;

    /* ── Text exit wipes (see the ported constants above) ──────────
       The shipped bottom-up blur+fade per line, keyed to a COVERING
       edge: `coverAt(y)` returns the scroll position at which that
       edge sits at screen y. Mobile keys it to the video's clip-top
       (inverting the expansion's power1.inOut analytically); desktop
       to the covering CARD's top edge (R8 — /old's own keying: the
       block's first coverer). Two cascades, one per block. The wipes
       touch only opacity/filter: the reveal owns the .lr-inner
       transforms, so nothing contests. No blends in this text. */
    const buildExitWipe = (lines, rect, coverAt) => {
      const groups = lines.filter((l) => l instanceof HTMLElement);
      if (!groups.length) return;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: spacer,
          start: `top+=${coverAt(rect.bottom + WIPE_LEAD)} top`,
          end: `top+=${coverAt(rect.top)} top`,
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
      tweens.push(tl);
      if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);
      return tl;
    };
    const headlineLines = headlineText instanceof HTMLElement
      ? Array.from(headlineText.querySelectorAll('.landing-hero__headline-line')).reverse()
      : [];
    const introClips = !isMob && introText instanceof HTMLElement
      ? Array.from(introText.querySelectorAll('.lr-clip')).reverse()
      : [];

    if (isMob && video instanceof HTMLElement) {
      /* ── Beat 3 (MOBILE): the video opens to full screen ───────────
         Untouched by R8 — mobile keeps its video hero until the new
         mobile designs land. Starts VIDEO_LEAD_IN before the settle
         ends; the tween drives the clip inset from the opening band
         to zero with power1.inOut INSIDE the scrub. */
      const bandTop = bandTopFor(vh);
      const videoStart = Math.max(0, revealEnd + SETTLE_PX - VIDEO_LEAD_IN);
      videoEnd = videoStart + VIDEO_EXPAND_PX;

      const tween = gsap.fromTo(
        video,
        { clipPath: insetPx(bandTop, vMargin, 0, vMargin) },
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

      const invertPower1InOut = (e) =>
        e < 0.5 ? Math.sqrt(e / 2) : 1 - Math.sqrt((1 - e) / 2);
      /** Scroll position at which the video's top edge sits at screen y. */
      const scrollWhenVideoTopAt = (y) => {
        const clamped = Math.min(Math.max(y, 0), bandTop);
        const eased = 1 - clamped / bandTop;
        return videoStart + invertPower1InOut(eased) * VIDEO_EXPAND_PX;
      };
      if (headlineText instanceof HTMLElement) {
        buildExitWipe(headlineLines, headlineText.getBoundingClientRect(), scrollWhenVideoTopAt);
      }
      total = videoEnd + VIDEO_HOLD_PX;
    } else if (!isMob && cards.length === 3) {
      /* ── Beat 3 (DESKTOP, R8): THE THREE-IMAGE HERO ──────────────
         /old's about-scroll.js Phase 1, verbatim in structure. The
         row rests (placeCards) until pinScrollY, then each card's y
         scrubs from 0 to −(restTop + cardH) — fully clear of the
         viewport top — at exactly scroll speed over its own window:
         [start_i, exit_i], start_i = pinScrollY + i·80. The stage is
         fixed, so the hold needs no counter-scroll (on /old the cards
         were in-flow and a 1:1 y tween cancelled document drift —
         the same screen motion, one fewer moving part). */
      const geo = placeCards(vh);
      const { cardH, restTop } = geo;
      const pinScrollY = Math.max(0, restTop - (vh - cardH) / 2);
      const startOffsets = [0, HERO_CARD_STAGGER_PX, HERO_CARD_STAGGER_PX * 2];
      const startAt = (i) => revealEnd + pinScrollY + startOffsets[i];
      const exitAt = (i) => startAt(i) + restTop + cardH;
      const exitEnd = exitAt(2) + HERO_CARD_EXIT_BUFFER_PX;

      cards.forEach((card, i) => {
        const tween = gsap.fromTo(
          card,
          { y: 0 },
          {
            y: -(restTop + cardH),
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: spacer,
              start: `top+=${startAt(i)} top`,
              end: `top+=${exitAt(i)} top`,
              scrub: true,
            },
          },
        );
        tweens.push(tween);
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      /** Scroll position at which card i's top edge sits at screen y
       *  during its rise (the inverse of the tween above). */
      const scrollWhenCardTopAt = (i, y) => startAt(i) + (restTop - y);
      /** Scroll position at which card i's CENTRE sits at screen y —
       *  the same inverse, half a card up (R32's anchor). */
      const scrollWhenCardCentreAt = (i, y) => scrollWhenCardTopAt(i, y - cardH / 2);
      /* Headline (right-anchored, 408..1548): first covered by the
         MIDDLE card (587..1142, starts 80 after the left); intro
         (180..903): first covered by the LEFT card (24..579). Each
         block is gone before ANY card reaches it — /old's rule. */
      if (headlineText instanceof HTMLElement) {
        buildExitWipe(headlineLines, headlineText.getBoundingClientRect(), (y) => scrollWhenCardTopAt(1, y));
      }
      if (introText instanceof HTMLElement) {
        buildExitWipe(introClips, introText.getBoundingClientRect(), (y) => scrollWhenCardTopAt(0, y));
      }
      /* R14 — THE LOGO ROW'S EXIT (proposal, flagged for review): the
         row leaves WITH the hero content, on the text-wipe vocabulary
         (WIPE_LEAD onset, EXIT_BLUR_PX, scrubbed → reversible), keyed
         to the LEFT card — its first coverer — as ONE group (the band
         and every cell fade together, never a cell-by-cell cascade).
         By construction it is fully gone when the card's top reaches
         the row's top, i.e. long before the ground fade begins at the
         left card two-thirds out: no light band or light cell can
         ever sit over dark ground. Tunables: WIPE_LEAD / EXIT_BLUR_PX
         (shared with the text — one vocabulary). */
      if (logos instanceof HTMLElement) {
        buildExitWipe([logos], logos.getBoundingClientRect(), (y) => scrollWhenCardTopAt(0, y));
      }

      /* THE BOUNDARY (R33) — the second card to leave (the middle image)
         FIRST GOING OFF the top: its TOP EDGE crossing y=0, read from
         the cards' own tween inverse. Both events hang on this one
         number. (R32 used the same card's CENTRE, cardH/2 later.) */
      const boundaryAt = scrollWhenCardTopAt(HERO_BOUNDARY_CARD, 0);

      /* THE GROUND — light → the founders' #161616, scrubbed on the
         cards' own mapping. R33: it STARTS at the boundary above and
         keeps its R21 rate, the cardH/3 span (/old's two-thirds-out →
         full-exit length), so it completes 208 after the boundary at
         1728. The founders section (z 260 over this fixed stage)
         enters at the SAME scroll, its ground riding this tween (R27
         below). backgroundColor on the ground layer isolates nothing. */
      const fadeStart = boundaryAt;
      const fadeEnd = fadeStart + cardH / 3;
      /* R27 (Oscar, 2026-09-03) — THE SEAM CLASS, fixed at the mechanism:
         an incoming section that paints its OWN opaque ground at a fixed
         colour over a fading layer draws a hard line at its top edge
         (measured mid-fade: hero ground rgb(130) above the seam, the
         section's #161616 below — a 108-luminance step). The incoming
         ground now rides THIS tween — same targets array, same scrub,
         same colours — so at every frame WHO WE ARE's section and track
         are the identical colour to the hero ground beneath them. Both
         rest at #161616 once the fade completes (their CSS value).
         R31: the section's top now crosses the viewport bottom at the
         SAME scroll the fade begins, so the from state is written at
         creation (immediateRender — the featured stage's own R27
         shape): measured with it false, the first arrival frame in the
         994 / 942 interiors showed 0.2px of the section's stylesheet
         #161616 over the still-light hero (the spacer's integer height
         against the trigger's float start) — a one-frame hairline the
         light from state removes. Off-screen until the boundary, the
         light state is never seen; on refresh the scrub sets the
         correct progress for any load position. */
      const foundersGround = [
        document.querySelector('[data-landing-founders]'),
        document.querySelector('[data-landing-founders-track]'),
      ].filter((el) => el instanceof HTMLElement);
      if (heroBg instanceof HTMLElement) {
        const fade = gsap.fromTo(
          [heroBg, ...foundersGround],
          { backgroundColor: HERO_GROUND_LIGHT },
          {
            backgroundColor: HERO_GROUND_DARK,
            ease: 'none',
            immediateRender: true,
            scrollTrigger: {
              trigger: spacer,
              start: `top+=${fadeStart} top`,
              end: `top+=${fadeEnd} top`,
              scrub: true,
            },
          },
        );
        tweens.push(fade);
        if (fade.scrollTrigger) triggers.push(fade.scrollTrigger);
      }

      /* The GL canvas has nothing to draw past exitEnd (the founders
         section covers the stage) — park its tick there, resume on
         the way back. */
      const gate = ScrollTrigger.create({
        trigger: spacer,
        start: `top+=${exitEnd} top`,
        end: 'max',
        onEnter: () => gallery?.setPaused(true),
        onLeaveBack: () => gallery?.setPaused(false),
      });
      triggers.push(gate);

      /* R33: the runway ends AT the boundary — WHO WE ARE's top crosses
         the viewport bottom as the middle card's TOP EDGE crosses y=0,
         the same scroll the fade starts (R32's centre of the same card,
         R31's right-card edge, R26's
         ink-at-the-middle-card, R21's −111 lead, R18's 0.9-of-fade
         gate: all superseded). The first-ink distance is still derived
         (the label's offset + the decaying entry drift) — for the
         report and the safety table, not as an anchor. */
      const foundersSection = document.querySelector('[data-landing-founders]');
      const foundersLabel = document.querySelector('[data-landing-founders-label]');
      const foundersLabelTop = foundersLabel instanceof HTMLElement && foundersLabel.offsetTop > 0
        ? foundersLabel.offsetTop : HERO_FOUNDERS_LABEL_TOP_FALLBACK_PX;
      const foundersEntryPx = Math.max(vh, foundersSection instanceof HTMLElement ? foundersSection.offsetHeight : 0);
      const foundersFirstInkPx = (foundersLabelTop + DRIFT_HEADLINE_PX) * foundersEntryPx / (foundersEntryPx + DRIFT_HEADLINE_PX);
      const foundersEnterAt = boundaryAt;
      total = foundersEnterAt;
      cardBeats = {
        foundersEnterAt: +foundersEnterAt.toFixed(1),
        boundaryAt: +boundaryAt.toFixed(1),
        boundaryCard: HERO_BOUNDARY_CARD,
        topAt: [0, 1, 2].map((i) => +scrollWhenCardTopAt(i, 0).toFixed(1)),
        centreAt: [0, 1, 2].map((i) => +scrollWhenCardCentreAt(i, 0).toFixed(1)),
        foundersFirstInkPx: +foundersFirstInkPx.toFixed(1),
        restTop,
        cardH: +cardH.toFixed(1),
        pinScrollY: +pinScrollY.toFixed(1),
        startAt: [0, 1, 2].map((i) => +startAt(i).toFixed(1)),
        exitAt: [0, 1, 2].map((i) => +exitAt(i).toFixed(1)),
        fade: [+fadeStart.toFixed(1), +fadeEnd.toFixed(1)],
        exitEnd: +exitEnd.toFixed(1),
        wipes: {
          headline: headlineText instanceof HTMLElement ? [
            +scrollWhenCardTopAt(1, headlineText.getBoundingClientRect().bottom + WIPE_LEAD).toFixed(1),
            +scrollWhenCardTopAt(1, headlineText.getBoundingClientRect().top).toFixed(1),
          ] : null,
          intro: introText instanceof HTMLElement ? [
            +scrollWhenCardTopAt(0, introText.getBoundingClientRect().bottom + WIPE_LEAD).toFixed(1),
            +scrollWhenCardTopAt(0, introText.getBoundingClientRect().top).toFixed(1),
          ] : null,
          logos: logos instanceof HTMLElement ? [
            +scrollWhenCardTopAt(0, logos.getBoundingClientRect().bottom + WIPE_LEAD).toFixed(1),
            +scrollWhenCardTopAt(0, logos.getBoundingClientRect().top).toFixed(1),
          ] : null,
        },
        logosTop: logos instanceof HTMLElement ? parseFloat(logos.style.top) : null,
      };
    }

    /* ── The runway ────────────────────────────────────────────────
       Native max scroll is `scrollHeight - vh`, not `scrollHeight`, so
       the spacer needs an extra viewport height on top of the raw
       trigger distance or the final beat can never be scrolled to.
       (The /about-3 hero learned this the hard way; same correction.) */
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
          const videoTop = bandTopFor(vh);
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
          videoStart: isMob ? Math.max(0, revealEnd + SETTLE_PX - VIDEO_LEAD_IN) : null,
          videoEnd: isMob ? videoEnd : null,
          cards: cardBeats,
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
     which is far too heavy to run per event. On MOBILE, width-change
     only: the URL bar collapsing fires height-only resizes mid-scroll,
     and a rebuild there re-derives the runway under the user's finger. */
  let lastW = window.innerWidth;
  const onResize = () => {
    if (isMob && window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 200);
  };

  fontsReady.then(() => {
    if (disposed) return;
    build();
    ScrollTrigger.refresh();
    window.addEventListener('resize', onResize);
    /* R8: a load the splash does not own has no cards entrance — the
       GL takeover follows the build straight away. (Under the splash
       it waits for landing-hero:cards-entered.) */
    if (document.documentElement.getAttribute('data-ne-splash') !== 'on') startGallery();
  });

  return () => {
    disposed = true;
    galleryDisposed = true;
    document.removeEventListener('landing-hero:cards-entered', onCardsEntered);
    gallery?.destroy();
    gallery = null;
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    triggers.forEach((t) => t.kill());
    tweens.forEach((t) => t.kill());
    cleanupScroll();
  };
}
