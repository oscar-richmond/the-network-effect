import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';
import { EXIT_BEAT2_PX } from './founders-scroll.js';
import { createGalleryHoverBlur } from './gallery-hover-blur.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** Same curve as line-reveal.js / founders-scroll.js — matches the hero
 * tagline and intro line-reveal character. */
const LINE_REVEAL_EASE = CustomEase.create('landingLineReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/** Seconds between each column's first line starting (left → right). */
const LANDING_COL_STAGGER = 0.18;
/** Per-line stagger within a column — mirrors the hero tagline's 0.12s. */
const LANDING_LINE_STAGGER = 0.12;
/** Per-line reveal duration — mirrors line-reveal.js's 1.2s transition. */
const LANDING_LINE_DURATION = 1.2;
/** Footer label entry dissolve — rides ON TOP of the label's line-reveal
 * roll-up (it shares the reveal timeline beat): a concurrent blur+
 * opacity melt-in using the menu items' dissolve vocabulary (menu.js's
 * hover state, 4px), per explicit request "roll-up + fade/blur, same as
 * menu items". Applied to the label's `.lr-clip` — a DESCENDANT of the
 * difference-blend leaf <p>, blend-safe per the hero-wipe precedent. */
const FOOTER_LABEL_DISSOLVE_BLUR_PX = 4;

/** Runway segment constants (px of scroll past the founders boundary).
 *
 * SETTLE BEAT — dead scroll between the boundary crossing and the reveal
 * firing. Sized against the FELT dead distance, not just this constant:
 * founders' exhale beat 2 (its last 360px) is a veil ramp during which
 * all content has already departed, so the user is effectively staring
 * at settled #F9F9F9 well before the boundary. Felt dead scroll =
 * 360 + LANDING_SETTLE_BEAT. At 150 that's 510px — parity with the
 * pre-rearchitecture reveal trigger ('top 85%' fired 0.15vh ≈ 145px past
 * the boundary → 505px felt at a 966px viewport). The original 300 beat
 * measured exactly correct at the trigger level but FELT long live
 * (660px total) for exactly this double-counted-white reason. */
const LANDING_SETTLE_BEAT = 150;
/** Text alone on stage after its reveal fires (the reveal itself is the
 * existing timed play at the settle beat — untouched). */
const LANDING_TEXT_HOLD = 500;
/** Gallery phase — the horizontal track scrub window. The x travel
 * starts from FULLY OFF-RIGHT (offset = the gallery's own width,
 * measured at build — the corner entry), so total travel ≈ the track's
 * full width (~5850px at 1728 with the 12-slot composition). Sized for
 * the reference's ~1:0.75-0.8 scroll-to-travel ratio. Retunable. */
const GALLERY_SCROLL_PX = 7400;
/** Opening slice of the gallery window: the track rises from FULLY
 * BELOW the stage's clip (yPercent 105 → 0, CSS-defaulted so nothing
 * paints during the settle/text phases) while x is already scrubbing
 * leftward from fully off-right = the LEADING images appear in the
 * bottom-right corner region and travel diagonally up+left into the
 * middle band; nothing is pre-distributed across the left. DERIVED so
 * the rise completes exactly as the leading image's left edge crosses
 * the stage's centre line: Δx to centre ≈ (stageW − stageW/2 + track
 * padding) ≈ 904px at 1728, over the ~0.79 travel ratio ≈ 1100px of
 * scroll (measured live: leading edge at 897px vs centre 864 at rise
 * end). After this the motion is pure horizontal. */
const GALLERY_ENTER_PX = 1100;
const GALLERY_RISE_YPERCENT = 105;
/** Per-image parallax magnitude — xPercent of the img's own width; imgs
 * are 115% of their clip frame, so 13 is the exact full-coverage bound. */
const GALLERY_PARALLAX_PCT = 13;
/** Gallery lift-out + text-row swap — the beat where the gallery era
 * ends and the pillar era ("01 — IMMERSE") begins. The trigger point is
 * DERIVED, not hand-tuned: the scroll position at which the FIRST
 * image's left edge has travelled this fraction of its own width past
 * the viewport's left edge (computed at build from the live track
 * geometry and the x-scrub's endpoints — see the lift block in build()).
 * From there, over GALLERY_LIFT_PX of scroll: the track scrubs upward
 * out of the stage (x keeps scrubbing beneath it — later images stream
 * diagonally up-left rather than freezing), the intro text row exits
 * up, and the pillar row rises from below the viewport to dock at the
 * centred slot the intro row held. All pure scrubs on layout `top`/
 * GSAP y — reversal symmetric, fling-clamped, blend-safe (no transforms
 * on the rows, which are blend-leaf parents). */
const GALLERY_EXIT_TRIGGER_RATIO = 0.25;
const GALLERY_LIFT_PX = 900;
/** Row exit wipes — the hero "WE ARE A.." exit vocabulary
 * (about-scroll.js's buildExitWipe), re-expressed for the landing rows:
 * per-line bottom-up opacity+blur sweep, scrubbed against the COVERING
 * element's upward travel (pillar row 0 covering the intro row; each
 * wave's LAST image covering its pillar row). Same constants as the
 * hero: 10px blur endpoint, 120px of screen-space onset lead before the
 * coverer's top edge reaches the row's bottom, and a 0.5 stagger ratio
 * against 1s line durations (scrub normalizes the total to the trigger
 * window — only the ratio matters). Wipe windows END when the coverer's
 * top edge reaches the row's TOP: every line below the leading edge is
 * already gone (plus the lead margin), so covering text/imagery and the
 * wiped row can never visibly overlap, forward or reverse. */
const ROW_WIPE_BLUR_PX = 10;
const ROW_WIPE_LEAD_PX = 120;
const ROW_WIPE_STAGGER = 0.5;
/** Pillar cycle chain (all anchors DERIVED at build, nothing hand-timed
 * past these three rhythm constants): each pillar row holds alone on
 * stage for PILLAR_HOLD_PX before its wave begins; each wave's 6 images
 * travel straight up from below the stage over WAVE_SCROLL_PX (the
 * container scrubs as one sheet — arrival rhythm comes from the
 * composed per-item offsets in AboutScroll.astro). When a wave's LAST
 * image passes over the docked row, the NEXT row starts rising from
 * below the stage over PILLAR_RISE_PX, and the outgoing row wipes under
 * the RISING ROW's top edge — the exact intro → row 0 swap behaviour
 * (confirmed correct live), replayed per cycle. Three waves after
 * "01 — IMMERSE"; the third wipes "03 — AMPLIFY" with no successor
 * (its wave's last image is the coverer instead) — the stage empties
 * before the tail hold and teardown. */
const PILLAR_HOLD_PX = 600;
const PILLAR_RISE_PX = 700;
const WAVE_SCROLL_PX = 3000;
/** Section-progress indicator hide — house exit vocabulary (opacity +
 * blur together), reversed symmetrically on scroll-up. Window is
 * founders' own EXIT_BG (the veil-melt / background-fade-out beat),
 * NOT a landing-side offset: re-expressed relative to `landing`'s own
 * top-vs-viewport-bottom anchor (the SAME anchor the entry gate already
 * uses) as `top-=EXIT_BEAT2_PX bottom` .. `top bottom` — negative lead,
 * ending exactly at the boundary. This holds because landing.top is,
 * by plain document flow, exactly founders.top + TOTAL_RUNWAY (no gap,
 * founders' height set to that constant) — so EXIT_BG's absolute
 * position ([TOTAL_RUNWAY - EXIT_BEAT2_PX, TOTAL_RUNWAY] from the
 * founders handoff) maps to [-EXIT_BEAT2_PX, 0] from landing's own top,
 * with zero risk of drift and no need to import EXIT_START/TOTAL_RUNWAY
 * at all — same principle as the entry gate's own derivation. Result:
 * the indicator is fully gone by the moment founders' veil finishes
 * melting to #F9F9F9 — i.e. by the boundary handoff itself, not later
 * in the gallery phase. */
const INDICATOR_HIDE_BLUR_PX = 10;
/** Rest on the gallery's final frame before the stage tears down. */
const LANDING_TAIL_HOLD = 300;
/** Lead distance upstream of the landing boundary at which the gallery
 * images are force-fetched + decoded (mid-founders-exhale) — native
 * loading="lazy" alone is unreliable inside a hidden fixed stage. */
const GALLERY_PRELOAD_LEAD_PX = 1500;

const GALLERY_START = LANDING_SETTLE_BEAT + LANDING_TEXT_HOLD;
/** FALLBACK runway only — the real runway is BUILD-DERIVED (runwayPx in
 * build()): the pillar-cycle chain's end depends on live geometry (lift
 * trigger, wave travel distances), so the total can't be a constant.
 * This value covers the defensive no-gallery/no-rows paths, where the
 * gallery window is all there is. */
const LANDING_RUNWAY = GALLERY_START + GALLERY_SCROLL_PX + LANDING_TAIL_HOLD;

/**
 * Wrap each landing column's copy into line-reveal clips and collect the
 * per-line `.lr-inner` elements in reading order.
 * @param {HTMLElement} landing
 * @returns {HTMLElement[]}
 */
function wrapLandingColumns(landing) {
  const columns = Array.from(landing.querySelectorAll('[data-about-landing-col]'));
  /** @type {HTMLElement[]} */
  const inners = [];

  columns.forEach((col, colIndex) => {
    if (!(col instanceof HTMLElement)) return;
    if (col.dataset.origHtml === undefined) {
      col.dataset.origHtml = col.innerHTML;
    } else {
      col.innerHTML = col.dataset.origHtml;
    }
    col.dataset.revealDelay = String(colIndex * LANDING_COL_STAGGER);
    wrapLineRevealElement(col);
    col.querySelectorAll('.lr-inner').forEach((inner) => {
      if (inner instanceof HTMLElement) {
        inner.style.transition = 'none';
        inners.push(inner);
      }
    });
  });

  return inners;
}

/**
 * Line-wrap a pillar row's columns purely to obtain per-line `.lr-clip`
 * units for the exit wipes — NO reveal choreography: every clip is made
 * instantly visible (lr-visible + transitions off), because these rows
 * enter positionally (the rise scrubs) with their text plainly readable.
 * Same origHtml restore idiom as wrapLandingColumns, so rebuilds start
 * from clean markup (also discarding any inline opacity/filter a
 * previous build's wipe left on the old clips).
 * @param {HTMLElement} row
 * @returns {HTMLElement[]} the row's `.lr-clip` elements
 */
function wrapStaticRowLines(row) {
  /** @type {HTMLElement[]} */
  const clips = [];
  row.querySelectorAll('.about-landing__text').forEach((col) => {
    if (!(col instanceof HTMLElement)) return;
    if (col.dataset.origHtml === undefined) {
      col.dataset.origHtml = col.innerHTML;
    } else {
      col.innerHTML = col.dataset.origHtml;
    }
    wrapLineRevealElement(col);
    col.querySelectorAll('.lr-clip').forEach((clip) => {
      if (!(clip instanceof HTMLElement)) return;
      clip.classList.add('lr-visible');
      const inner = clip.querySelector('.lr-inner');
      if (inner instanceof HTMLElement) inner.style.transition = 'none';
      clips.push(clip);
    });
  });
  return clips;
}

/**
 * Group a row's line clips into bottom-up wipe units: clips whose
 * bottoms sit within a few px of each other (the same line band across
 * the row's four top-aligned columns) wipe together; bands are ordered
 * bottom-most first — the hero wipe's bottom-up sweep, widened across a
 * multi-column row. Positions are relative (rows may be measured while
 * parked offscreen at top:100% — band structure is position-independent).
 * @param {HTMLElement[]} clips
 * @returns {HTMLElement[][]} bottom-most band first
 */
function groupClipsBottomUp(clips) {
  const measured = clips
    .map((clip) => ({ clip, bottom: clip.getBoundingClientRect().bottom }))
    .sort((a, b) => b.bottom - a.bottom);
  /** @type {HTMLElement[][]} */
  const groups = [];
  let bandBottom = Infinity;
  measured.forEach(({ clip, bottom }) => {
    if (Math.abs(bottom - bandBottom) > 4) {
      groups.push([]);
      bandBottom = bottom;
    }
    groups[groups.length - 1].push(clip);
  });
  return groups;
}

/**
 * Boot the landing-section line reveal on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initLandingScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const landing = document.querySelector('body.about-page-3 [data-about-landing]');
  if (!(landing instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  const stage = document.querySelector('body.about-page-3 [data-about-landing-stage]');

  /**
   * Explicit visible/hidden, never a clear-to-CSS-default toggle — the
   * stage's CSS default IS hidden (about-page.css), by design: this
   * function is the ONLY thing that ever reveals it, and only in
   * response to a live scroll-position check. Fixing the missing half
   * of this contract (an entry gate, not just an exit gate, on an
   * opaque fixed layer) is the whole point of this rearchitecture — see
   * the regression note on `.about-landing__stage` in AboutScroll.astro.
   * @param {boolean} visible
   */
  // Created ONCE (module-instance scope, like founders-scroll.js's
  // dissolve/videoController) — the gallery markup is static (server-
  // rendered, never recreated by JS), so it doesn't need rebuilding on
  // resize, only re-pointing via resize()/setPaused(). Paused in lockstep
  // with the stage itself: gallery-hover-blur.js's tick loop (and its
  // per-frame mount/unmount reconciliation) has no reason to run while
  // the stage — and therefore the whole gallery — is invisible.
  const galleryEl = document.querySelector('body.about-page-3 [data-about-landing-gallery]');
  const hoverBlur = galleryEl instanceof HTMLElement ? createGalleryHoverBlur(galleryEl) : null;

  const setStageVisible = (visible) => {
    if (stage instanceof HTMLElement) stage.style.visibility = visible ? 'visible' : 'hidden';
    hoverBlur?.setPaused(!visible);
  };

  // Primary handoff signal — founders-scroll.js's applyExitState
  // dispatches this on the SAME state transition that hides its own
  // stage + the hero bg-fade, so landing's reveal becomes a direct
  // function of founders' actual exit state rather than a second,
  // independently-computed ScrollTrigger that only happens to land on
  // the same scroll position. Attached synchronously here (not inside
  // build()) so it's registered before founders' own build() — a
  // microtask scheduled after this module's synchronous init runs —
  // can ever dispatch it; see about-3.astro/AboutScroll.astro's script
  // order (FoundersSection's inline script runs first). The `entry`/
  // `reveal` ScrollTriggers created in build() below are kept as a
  // defensive backstop (same idempotent setStageVisible calls) in case
  // this event is ever missed — e.g. no founders section on the page.
  const onFoundersExitState = (event) => {
    setStageVisible(!!event.detail?.done);
  };
  document.addEventListener('about-founders:exit-state', onFoundersExitState);

  /** @type {gsap.core.Timeline | undefined} */
  let revealTl;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-landing-')) {
        trigger.kill();
      }
    });
    revealTl?.kill();

    const columns = Array.from(landing.querySelectorAll('[data-about-landing-col]'));
    if (!columns.length) return;

    const inners = wrapLandingColumns(landing);
    if (!inners.length) return;

    gsap.set(inners, { yPercent: 110, y: 0 });

    // Total runway — BUILD-DERIVED: starts at the constant fallback and
    // is extended by the pillar-cycle chain derivation in the gallery
    // block below (whose end depends on live geometry). The landing's
    // in-flow height and the exit-end trigger both read this AFTER the
    // chain is derived — see the height set just before exitEnd.
    let runwayPx = LANDING_RUNWAY;

    revealTl = gsap.timeline({ paused: true });

    columns.forEach((col, colIndex) => {
      if (!(col instanceof HTMLElement)) return;
      const colInners = Array.from(col.querySelectorAll('.lr-inner')).filter(
        (el) => el instanceof HTMLElement,
      );
      colInners.forEach((inner, lineIndex) => {
        revealTl.fromTo(
          inner,
          { yPercent: 110, y: 0 },
          {
            yPercent: 0,
            y: 0,
            duration: LANDING_LINE_DURATION,
            ease: LINE_REVEAL_EASE,
            immediateRender: false,
          },
          colIndex * LANDING_COL_STAGGER + lineIndex * LANDING_LINE_STAGGER,
        );
      });
    });

    // Footer label dissolve — same timeline, same beat, same ease as
    // the label's own roll-up tween above (the label is the last
    // wrapped column, so this sits at its column-stagger position):
    // blur+opacity melt-in on its clip, concurrent with the roll — the
    // "roll-up + fade/blur" entry. Reverses with the timeline on
    // scroll-back like everything else; the deep-scroll restoration
    // (progress(1) below) lands it crisp and full-strength. Targets the
    // `.lr-clip` (leaf-descendant, blend-safe), disjoint from both the
    // roll (`.lr-inner` transforms) and the intro wipes (intro-row
    // clips only — the label belongs to no row and is never wiped).
    const footerLabel = landing.querySelector('.about-footer-label');
    if (footerLabel instanceof HTMLElement) {
      const labelClips = Array.from(footerLabel.querySelectorAll('.lr-clip')).filter(
        (el) => el instanceof HTMLElement,
      );
      const labelIndex = columns.indexOf(footerLabel);
      if (labelClips.length && labelIndex !== -1) {
        revealTl.fromTo(
          labelClips,
          { opacity: 0, filter: `blur(${FOOTER_LABEL_DISSOLVE_BLUR_PX}px)` },
          {
            opacity: 1,
            filter: 'blur(0px)',
            duration: LANDING_LINE_DURATION,
            ease: LINE_REVEAL_EASE,
            immediateRender: false,
          },
          labelIndex * LANDING_COL_STAGGER,
        );
      }
    }

    // Entry gate — the stage's ONLY reveal mechanism. Anchored to the
    // landing section's own top-vs-viewport-bottom crossing, which by
    // plain document flow is identical to founders-scroll.js's own
    // exit-end anchor (founders' section height is set to its exact
    // runway constant, landing sits immediately after with no gap) — so
    // this fires in the same tick founders-scroll.js hides its own
    // stage + the hero bg-fade: a pixel-identical #F9F9F9-to-#F9F9F9
    // swap, with no duplicated constant and no coupling between the two
    // modules.
    const entry = ScrollTrigger.create({
      trigger: landing,
      start: 'top bottom',
      end: 'top bottom',
      id: 'about-landing-entry',
      onEnter: () => setStageVisible(true),
      onLeaveBack: () => setStageVisible(false),
    });

    // Reveal — timeline + resize-restoration logic reused unchanged
    // from 33d1601; only the trigger's anchor changes, from the old
    // in-flow 'top 85%' to a fixed px-from-handoff offset, since the
    // stage no longer scrolls with the page — timing must be driven by
    // scroll DISTANCE past the boundary, not the section's own on-
    // screen position.
    const reveal = ScrollTrigger.create({
      trigger: landing,
      start: `top+=${LANDING_SETTLE_BEAT} bottom`,
      end: 'bottom top',
      id: 'about-landing-reveal',
      onEnter: () => {
        // Defensive re-assert: makes it impossible for the reveal to
        // ever play while the stage is hidden, independent of GSAP's
        // trigger-processing order on a hard fling — the entry trigger
        // above is anchored earlier and should already have fired, but
        // this doesn't rely on that. Same defensive idiom as
        // founders-scroll.js's ensureSnapResolved.
        setStageVisible(true);
        revealTl?.play();
      },
      onLeaveBack: () => revealTl?.reverse(),
    });

    // Section-progress indicator hide — AUTHORIZED exception to the
    // SectionProgress guard, scoped to exactly this behaviour, and
    // implemented WITHOUT touching any SectionProgress file: driven
    // from the landing's own phase maths, anchored to the SAME
    // `landing`-top-vs-viewport-bottom point the entry gate above uses
    // (a negative lead, not a new independent trigger — see
    // INDICATOR_HIDE_BLUR_PX's comment for the exact derivation),
    // targeting the indicator's fixed CONTAINER with self opacity +
    // filter. The container carries the difference blend (see
    // section-progress.css's header for why it must live there), and
    // self-properties never isolate an element's own blend — the same
    // rule as the nav email link's 0.6-opacity hover and the founders
    // exit name fade. section-progress.js's own tweens touch only the
    // leaf elements — disjoint targets, no overwrite risk. Placed here
    // (not inside the gallery block below) because it's a function of
    // the founders/landing BOUNDARY, not the gallery feature — it must
    // still hide correctly even if the gallery markup is ever removed.
    // Under reduced motion none of this runs, matching the component's
    // existing RM handling (static, visible).
    const progressIndicator = document.querySelector(
      'body.about-page-3 [data-section-progress]',
    );
    if (progressIndicator instanceof HTMLElement) {
      gsap.fromTo(
        progressIndicator,
        { opacity: 1, filter: 'blur(0px)' },
        {
          opacity: 0,
          filter: `blur(${INDICATOR_HIDE_BLUR_PX}px)`,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: landing,
            start: `top-=${EXIT_BEAT2_PX} bottom`,
            end: 'top bottom',
            scrub: true,
            id: 'about-landing-progress-hide',
          },
        },
      );
    }

    // ── Gallery phase — all pure scrubs (ease none, ScrollTrigger
    // scrub), so reversal is inherently symmetric and hard flings clamp
    // to window edges in the same update pass the gates fire — no timed
    // elements, no guards needed. All ids carry the about-landing-
    // prefix so the existing kill/cleanup paths cover them.
    const gallery = landing.querySelector('[data-about-landing-gallery]');
    const track = landing.querySelector('[data-about-landing-gallery-track]');
    const galleryImgs = Array.from(
      landing.querySelectorAll('[data-about-landing-gallery-img]'),
    ).filter((el) => el instanceof HTMLImageElement);
    if (gallery instanceof HTMLElement && track instanceof HTMLElement) {
      // Re-sync screen/viewport dims + each item's frame-width-derived
      // blur radius — the module itself is NOT recreated (no texture
      // reload), only re-pointed, same as founders-scroll.js's
      // dissolve/videoController on their own resize path.
      hoverBlur?.resize();

      // Travel distance is MEASURED (track overflow beyond its clip
      // window); GALLERY_SCROLL_PX fixes the scroll length — viewport
      // changes alter speed slightly, never correctness. Rebuilds
      // re-measure.
      const galleryTravel = Math.max(0, track.scrollWidth - gallery.clientWidth);
      const galleryScrub = (startPx, endPx, id) => ({
        trigger: landing,
        start: `top+=${startPx} bottom`,
        end: `top+=${endPx} bottom`,
        scrub: true,
        id,
      });

      // Main horizontal scrub — the whole gallery window. The start
      // offset is the gallery's own width (measured, viewport-derived):
      // the track's leading edge sits exactly at the right edge of the
      // stage, so the first images enter FROM the corner — nothing is
      // on-stage horizontally until scroll brings it in.
      gsap.fromTo(
        track,
        { x: gallery.clientWidth },
        {
          x: -galleryTravel,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: galleryScrub(
            GALLERY_START,
            GALLERY_START + GALLERY_SCROLL_PX,
            'about-landing-gallery-x',
          ),
        },
      );

      // Diagonal rise — yPercent settles from fully-below-the-clip over
      // the opening slice while x is already moving (separate GSAP
      // transform channels compose), so entries travel up-and-left into
      // their bands: the bottom-right entry impression, symmetric in
      // reverse. The CSS default transform (about-page.css) holds the
      // same fully-clipped state before GSAP's first render, so the
      // track can never paint during the settle/text phases.
      // `y: 0` in from AND to: the CSS initial state is a % translate,
      // which GSAP's matrix parse bakes into a PIXEL `y` — left
      // unmanaged it would survive the yPercent tween and hold the
      // track below the clip forever (the same guard founders-scroll.js
      // documents on its entrance tweens; reproduced live here without
      // it: y stuck at +556px through the whole gallery).
      gsap.fromTo(
        track,
        { yPercent: GALLERY_RISE_YPERCENT, y: 0 },
        {
          yPercent: 0,
          y: 0,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: galleryScrub(
            GALLERY_START,
            GALLERY_START + GALLERY_ENTER_PX,
            'about-landing-gallery-rise',
          ),
        },
      );

      // NOTE: an earlier revision receded the text columns to partial
      // opacity here (self opacity on the blend <p>s — never the row,
      // which would isolate the blend). Removed: at low opacity,
      // mix-blend-mode: difference still composites correctly but the
      // inverted result is faint enough to read as "the blend is
      // broken" — this was the actual cause of three rounds of
      // structural blend-regression chasing (eeff4d8, e1c383b), not
      // the ancestor chain. Diagnosed live by Oscar in a real browser
      // (my occluded automation tab can't render blend compositing at
      // all — see feedback_blend_verification_manual_only.md). Text
      // now stays full-strength throughout the gallery phase; the
      // inversion-over-imagery moments this produces are the intended
      // reference feel, not recession.

      // Per-image parallax — one timeline off the same window; each img
      // (115% of its clip frame) drifts its own xPercent, magnitudes
      // alternating by position. Compositor-only, clipped by the frame.
      if (galleryImgs.length) {
        const parallaxTl = gsap.timeline({
          scrollTrigger: galleryScrub(
            GALLERY_START,
            GALLERY_START + GALLERY_SCROLL_PX,
            'about-landing-gallery-parallax',
          ),
        });
        galleryImgs.forEach((img, i) => {
          parallaxTl.fromTo(
            img,
            { xPercent: 0 },
            {
              xPercent: -(i % 2 === 0 ? 1 : 0.55) * GALLERY_PARALLAX_PCT,
              ease: 'none',
              duration: 1,
              immediateRender: false,
            },
            0,
          );
        });
      }

      // ── Gallery lift-out + pillar cycle chain ────────────────────
      // Lift trigger DERIVED from live geometry: the scroll px at which
      // the first image's left edge sits GALLERY_EXIT_TRIGGER_RATIO of
      // its own width past the viewport's left edge. rect.left =
      // itemOffset + trackX (the gallery spans the stage from x 0;
      // offsetLeft is transform-independent), and the x scrub maps
      // [GALLERY_START, GALLERY_START+GALLERY_SCROLL_PX] linearly onto
      // [+galleryWidth, -galleryTravel] — invert for the trigger px.
      const introRow = landing.querySelector('[data-about-landing-row-intro]');
      const pillarRows = Array.from(
        landing.querySelectorAll('[data-about-landing-pillar-row]'),
      ).filter((el) => el instanceof HTMLElement);
      const waves = Array.from(landing.querySelectorAll('[data-about-landing-wave]')).filter(
        (el) => el instanceof HTMLElement,
      );
      const firstItem = track.querySelector('.about-landing__gallery-item');
      const firstFrame = firstItem?.querySelector('.about-landing__gallery-frame');
      if (
        introRow instanceof HTMLElement &&
        pillarRows.length &&
        firstItem instanceof HTMLElement &&
        firstFrame instanceof HTMLElement
      ) {
        const stageH = gallery.clientHeight;
        const frameW = firstFrame.getBoundingClientRect().width;
        const xTrigger = -(GALLERY_EXIT_TRIGGER_RATIO * frameW) - firstItem.offsetLeft;
        const xStart = gallery.clientWidth;
        const liftStartPx =
          GALLERY_START + ((xStart - xTrigger) / (xStart + galleryTravel)) * GALLERY_SCROLL_PX;
        const liftEndPx = liftStartPx + GALLERY_LIFT_PX;

        // Track lifts fully out the top. Drives `y` (pixel channel) —
        // the rise tween above owns `yPercent`, a SEPARATE GSAP
        // transform channel, so the two never fight over a property
        // (rise holds yPercent at 0 up here; this holds y at 0 down
        // there — each clamps outside its own window). x keeps
        // scrubbing beneath the lift, so later images stream
        // diagonally up-left rather than freezing mid-frame.
        gsap.fromTo(
          track,
          { y: 0 },
          {
            y: -stageH,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: galleryScrub(liftStartPx, liftEndPx, 'about-landing-gallery-lift'),
          },
        );

        // Per-row prep — inline top reset BEFORE measuring (so resize
        // rebuilds re-derive from the true CSS top:100% initial state),
        // then line-wrap for wipe units, then measure. Dock slots are
        // each row's own centred position.
        const rowClips = pillarRows.map((row) => {
          row.style.top = '';
          return wrapStaticRowLines(row);
        });
        const dockTops = pillarRows.map(
          (row) => (stageH - row.getBoundingClientRect().height) / 2,
        );
        const rowBottoms = pillarRows.map(
          (row, i) => dockTops[i] + row.getBoundingClientRect().height,
        );

        // Row exit wipe — the hero exit vocabulary (about-scroll.js's
        // buildExitWipe): bottom-up per-line band sweep, each band a
        // 1s opacity+blur fromTo offset by the stagger ratio, scrub-
        // normalized across the derived window. Animates the `.lr-clip`
        // wrappers — DISJOINT from the reveal timeline (which drives
        // `.lr-inner` transforms) and blend-safe: the clips are
        // DESCENDANTS of the difference-blend leaf <p>s, and an
        // ancestor's blend flattens its subtree regardless of the
        // stacking contexts the per-line filters create (the hero
        // tagline precedent, verified live there).
        const buildRowWipe = (clips, startPx, endPx, id) => {
          const groups = groupClipsBottomUp(clips);
          if (!groups.length) return;
          const tl = gsap.timeline({ scrollTrigger: galleryScrub(startPx, endPx, id) });
          groups.forEach((group, i) => {
            tl.fromTo(
              group,
              { opacity: 1, filter: 'blur(0px)' },
              {
                opacity: 0,
                filter: `blur(${ROW_WIPE_BLUR_PX}px)`,
                ease: 'none',
                duration: 1,
                immediateRender: false,
              },
              i * ROW_WIPE_STAGGER,
            );
          });
        };

        // Intro exit — wiped by pillar row 0 scrolling over it (the
        // intro row itself never moves from its centred rest). The
        // rise scrub maps row-0-top linearly over [stageH → dockTop]
        // across the lift window — invert for the px at which the
        // row's top edge sits at a given stage-space y. Window: onset
        // when the row's top is ROW_WIPE_LEAD_PX below the intro's
        // bottom edge; complete when it reaches the intro's top (or at
        // dock, if the intro's top line sits above the dock slot —
        // possible when the intro is taller than the pillar row).
        const introRect = introRow.getBoundingClientRect();
        const pxAtRow0Top = (y) =>
          liftStartPx + ((stageH - y) / (stageH - dockTops[0])) * GALLERY_LIFT_PX;
        buildRowWipe(
          Array.from(introRow.querySelectorAll('.lr-clip')).filter(
            (el) => el instanceof HTMLElement,
          ),
          pxAtRow0Top(introRect.bottom + ROW_WIPE_LEAD_PX),
          pxAtRow0Top(Math.max(introRect.top, dockTops[0])),
          'about-landing-row-intro-wipe',
        );

        // Pillar row 0 rises with the gallery lift, docking at centre.
        // Layout `top`, never transform — blend-leaf parent (name-clip
        // idiom, applied to rows).
        gsap.fromTo(
          pillarRows[0],
          { top: stageH },
          {
            top: dockTops[0],
            ease: 'none',
            immediateRender: false,
            scrollTrigger: galleryScrub(liftStartPx, liftEndPx, 'about-landing-pillar-rise-0'),
          },
        );

        // ── Wave chain — 3 cycles, every anchor derived ─────────────
        // Each wave scrubs its container's y straight up (transform is
        // safe here: no blend text inside, sibling of the rows like the
        // gallery track) from its parked layout position (items at
        // top:100% + composed offset) until every item is fully above
        // the stage — travel measured from live layout. The wave's
        // LAST item (max composed offset, by contract in
        // AboutScroll.astro) is the swap trigger: as its top edge
        // reaches the docked row's bottom, the successor row starts
        // rising, and the outgoing row wipes under the riser exactly
        // like the intro under row 0 — see the swap block below. The
        // no-overlap guarantee is the same as the intro swap's: the
        // wipe completes as the riser's top reaches the outgoing row's
        // top, and every line below the riser's leading edge (plus the
        // lead margin) is already gone.
        let waveStartPx = liftEndPx + PILLAR_HOLD_PX;
        let chainEndPx = liftEndPx;
        waves.forEach((wave, i) => {
          const row = pillarRows[i];
          if (!(row instanceof HTMLElement)) return;
          const items = Array.from(wave.children).filter((el) => el instanceof HTMLElement);
          if (!items.length) return;

          // offsetTop is layout-only (transform-independent) and
          // resolves against the wave container = stage box: parked
          // item top = stageH + composed offset.
          let waveTravel = 0;
          let lastTopLocal = 0;
          items.forEach((item) => {
            waveTravel = Math.max(waveTravel, item.offsetTop + item.offsetHeight);
            lastTopLocal = Math.max(lastTopLocal, item.offsetTop);
          });

          const waveEndPx = waveStartPx + WAVE_SCROLL_PX;
          gsap.fromTo(
            wave,
            { y: 0 },
            {
              y: -waveTravel,
              ease: 'none',
              immediateRender: false,
              scrollTrigger: galleryScrub(waveStartPx, waveEndPx, `about-landing-wave-${i}`),
            },
          );

          // Last image's top edge at stage-space y ↔ scroll px — the
          // same linear inversion as the lift trigger, on this wave's
          // scrub mapping.
          const waveStart = waveStartPx;
          const pxAtLastTop = (y) => waveStart + ((lastTopLocal - y) / waveTravel) * WAVE_SCROLL_PX;

          // Row swap — the SAME behaviour as the intro → row 0 swap
          // (confirmed correct live): the last image's pass is only the
          // TRIGGER; the successor row rises from below the stage from
          // that moment, and the outgoing row wipes under the RISING
          // ROW's top edge — onset when the riser is ROW_WIPE_LEAD_PX
          // below the row's bottom, complete exactly as the riser
          // reaches the row's top (or its own dock, if higher) — so the
          // handoff reads as one continuous cover-and-replace, never a
          // wipe followed by a detached late arrival. The final row has
          // no successor to do the covering, so it alone keeps the
          // image-keyed wipe: the wave's last image is its coverer.
          let riseEndPx = pxAtLastTop(dockTops[i]);
          const next = pillarRows[i + 1];
          if (next instanceof HTMLElement) {
            const riseStartPx = pxAtLastTop(rowBottoms[i]);
            riseEndPx = riseStartPx + PILLAR_RISE_PX;
            gsap.fromTo(
              next,
              { top: stageH },
              {
                top: dockTops[i + 1],
                ease: 'none',
                immediateRender: false,
                scrollTrigger: galleryScrub(
                  riseStartPx,
                  riseEndPx,
                  `about-landing-pillar-rise-${i + 1}`,
                ),
              },
            );
            const pxAtRiserTop = (y) =>
              riseStartPx + ((stageH - y) / (stageH - dockTops[i + 1])) * PILLAR_RISE_PX;
            buildRowWipe(
              rowClips[i],
              pxAtRiserTop(rowBottoms[i] + ROW_WIPE_LEAD_PX),
              pxAtRiserTop(Math.max(dockTops[i], dockTops[i + 1])),
              `about-landing-pillar-wipe-${i}`,
            );
          } else {
            buildRowWipe(
              rowClips[i],
              pxAtLastTop(rowBottoms[i] + ROW_WIPE_LEAD_PX),
              riseEndPx,
              `about-landing-pillar-wipe-${i}`,
            );
          }

          chainEndPx = Math.max(waveEndPx, riseEndPx);
          waveStartPx = chainEndPx + PILLAR_HOLD_PX;
        });

        // The chain extends the runway past the gallery window's own
        // end when (as at any current viewport) the last wave resolves
        // after the horizontal scrub does.
        runwayPx = Math.max(runwayPx, chainEndPx + LANDING_TAIL_HOLD);
      }

      // Ahead-of-phase preload — one-shot, anchored upstream of the
      // boundary (mid-founders-exhale): force fetch + decode so the
      // images are painted-ready before the gallery window is
      // reachable. Native loading="lazy" in the markup is the
      // do-no-harm baseline (lazy heuristics are unreliable inside a
      // hidden fixed stage); an extreme fling can still outrun decode —
      // accepted, frames fill in. The wave images share the trigger:
      // their first window is thousands of px later, but they're the
      // same hidden-fixed-stage case and the whole pool is ~1.6MB.
      const waveImgs = Array.from(
        landing.querySelectorAll('[data-about-landing-wave-img]'),
      ).filter((el) => el instanceof HTMLImageElement);
      ScrollTrigger.create({
        trigger: landing,
        start: `top-=${GALLERY_PRELOAD_LEAD_PX} bottom`,
        end: `top-=${GALLERY_PRELOAD_LEAD_PX} bottom`,
        id: 'about-landing-gallery-preload',
        once: true,
        onEnter: () => {
          [...galleryImgs, ...waveImgs].forEach((img) => {
            img.loading = 'eager';
            img.decode?.().catch(() => {});
          });
        },
      });
    }

    // Runway height, padded by one extra vh — mirrors about-scroll.js's
    // hero `requiredHeight` idiom. Landing is currently the page's last
    // section, so without this the exit-end trigger below would sit
    // exactly at native max scroll (document.scrollHeight - vh), a
    // rounding hazard rather than real headroom. Self-contained: holds
    // regardless of what (if anything) follows. Set HERE — after the
    // gallery block has derived the pillar chain's end into runwayPx —
    // and before the final ScrollTrigger.refresh(), which recomputes
    // every trigger (including the earlier entry/reveal ones) against
    // the final document height.
    landing.style.height = `${runwayPx + window.innerHeight}px`;

    // Teardown — hides the stage once the landing's own runway is
    // spent, handing off to whatever (currently nothing) follows next.
    // Any future section must gate its OWN fixed stage the same way —
    // see AboutScroll.astro's comment.
    const exitEnd = ScrollTrigger.create({
      trigger: landing,
      start: `top+=${runwayPx} bottom`,
      end: `top+=${runwayPx} bottom`,
      id: 'about-landing-exit-end',
      onEnter: () => setStageVisible(false),
      onLeaveBack: () => setStageVisible(true),
    });

    // Rebuild state restoration (resize / late refresh while already
    // scrolled past some point). The reveal timeline's restoration is
    // unchanged from 33d1601. Stage-visibility restoration is new,
    // derived explicitly from live scrollY against the fresh triggers —
    // the same idiom founders-scroll.js's build() uses for its own
    // exitEnd (self-firing onEnter only covers "scrolled forward past",
    // not every rebuild ordering — e.g. resizing while between entry
    // and exitEnd needs the visible state derived, not assumed).
    if (window.scrollY >= reveal.start) {
      revealTl.progress(1).pause();
    }
    setStageVisible(window.scrollY >= entry.start && window.scrollY < exitEnd.start);

    ScrollTrigger.refresh();
  };

  let cancelled = false;
  // Same hero-settle gate as founders-scroll.js (see its comment for the
  // full mechanics): this section's trigger anchors depend on the document
  // height above it — the hero spacer's FINAL height (set at hero settle,
  // well after fonts.ready) AND the founders section's runway height.
  // Founders' own build waits on this same event and registered its
  // listener first (FoundersSection's script runs before AboutScroll's),
  // so it always builds before this does; even if that ordering ever
  // changed, both builds end in ScrollTrigger.refresh(), which recomputes
  // the other module's trigger positions from live layout.
  const whenHeroScrollReady = () =>
    new Promise((resolve) => {
      if (document.querySelector('body.about-page-3 [data-about-hero-spacer]')?.style.height) {
        resolve();
        return;
      }
      document.addEventListener('about-3:hero-scroll-ready', () => resolve(), { once: true });
    });
  Promise.all([document.fonts.ready, whenHeroScrollReady()]).then(() => {
    if (!cancelled) build();
  });

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
    document.removeEventListener('about-founders:exit-state', onFoundersExitState);
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-landing-')) {
        trigger.kill();
      }
    });
    revealTl?.kill();
    gsap.killTweensOf(
      landing.querySelectorAll(
        '[data-about-landing-gallery-track], [data-about-landing-gallery-img], [data-about-landing-col], [data-about-landing-row-intro], [data-about-landing-pillar-row], [data-about-landing-wave], [data-about-landing-col] .lr-clip, [data-about-landing-row-intro] .lr-clip, [data-about-landing-pillar-row] .lr-clip',
      ),
    );
    gsap.killTweensOf(document.querySelectorAll('body.about-page-3 [data-section-progress]'));
    hoverBlur?.destroy();
    setStageVisible(false);
  };
}
