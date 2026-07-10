import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';

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
/** Gallery phase — the horizontal track scrub window. Sized to the
 * reference's ~1:0.75 scroll-to-travel ratio against the measured track
 * overflow (~1650px at 1728): travel distance is MEASURED at build,
 * this constant fixes the scroll length. Retunable. */
const GALLERY_SCROLL_PX = 2400;
/** Opening slice of the gallery window: the track rises from FULLY
 * BELOW the band's clip (yPercent 105 → 0, CSS-defaulted so nothing
 * paints during the settle/text phases) while x is already scrubbing
 * leftward from an off-right offset = the bottom-right entry
 * impression; the remainder is pure horizontal. Measured live: a
 * partial px rise left the first images visible in the band during the
 * text phases — the track must start clipped out entirely. */
const GALLERY_ENTER_PX = 420;
const GALLERY_RISE_YPERCENT = 105;
/** Off-right x offset at the window start — the first images enter from
 * the right edge (approved mechanism). Also part of the scroll-to-
 * travel ratio: (offset + measured overflow) / GALLERY_SCROLL_PX. */
const GALLERY_ENTER_X_OFFSET = 300;
/** Text columns' receded opacity during the gallery phase — scrubbed on
 * the blend columns THEMSELVES (self opacity never isolates a blend —
 * founders-exit precedent; the row wrapper must NEVER carry it). */
const LANDING_TEXT_RECEDE_OPACITY = 0.35;
/** Per-image parallax magnitude — xPercent of the img's own width; imgs
 * are 115% of their clip frame, so 13 is the exact full-coverage bound. */
const GALLERY_PARALLAX_PCT = 13;
/** Rest on the gallery's final frame before the stage tears down. */
const LANDING_TAIL_HOLD = 300;
/** Lead distance upstream of the landing boundary at which the gallery
 * images are force-fetched + decoded (mid-founders-exhale) — native
 * loading="lazy" alone is unreliable inside a hidden fixed stage. */
const GALLERY_PRELOAD_LEAD_PX = 1500;

const GALLERY_START = LANDING_SETTLE_BEAT + LANDING_TEXT_HOLD;
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
  const setStageVisible = (visible) => {
    if (stage instanceof HTMLElement) stage.style.visibility = visible ? 'visible' : 'hidden';
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

    // Runway height, padded by one extra vh — mirrors about-scroll.js's
    // hero `requiredHeight` idiom. Landing is currently the page's last
    // section, so without this the exit-end trigger below would sit
    // exactly at native max scroll (document.scrollHeight - vh), a
    // rounding hazard rather than real headroom. Self-contained: holds
    // regardless of what (if anything) follows.
    landing.style.height = `${LANDING_RUNWAY + window.innerHeight}px`;

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

      // Main horizontal scrub — the whole gallery window, starting from
      // the off-right entry offset.
      gsap.fromTo(
        track,
        { x: GALLERY_ENTER_X_OFFSET },
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

      // Text recession — SELF opacity on the blend columns, never the
      // row wrapper (see LANDING_TEXT_RECEDE_OPACITY's comment; the
      // requested "non-blend wrapper" placement is impossible — every
      // wrapper here is a blend ancestor). Owns only the columns'
      // opacity; the reveal timeline owns their .lr-inner descendants'
      // transforms — disjoint properties, disjoint scroll ranges.
      gsap.fromTo(
        columns,
        { opacity: 1 },
        {
          opacity: LANDING_TEXT_RECEDE_OPACITY,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: galleryScrub(
            GALLERY_START,
            GALLERY_START + GALLERY_ENTER_PX,
            'about-landing-text-recede',
          ),
        },
      );

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

      // Ahead-of-phase preload — one-shot, anchored upstream of the
      // boundary (mid-founders-exhale): force fetch + decode so the
      // images are painted-ready before the gallery window is
      // reachable. Native loading="lazy" in the markup is the
      // do-no-harm baseline (lazy heuristics are unreliable inside a
      // hidden fixed stage); an extreme fling can still outrun decode —
      // accepted, frames fill in.
      ScrollTrigger.create({
        trigger: landing,
        start: `top-=${GALLERY_PRELOAD_LEAD_PX} bottom`,
        end: `top-=${GALLERY_PRELOAD_LEAD_PX} bottom`,
        id: 'about-landing-gallery-preload',
        once: true,
        onEnter: () => {
          galleryImgs.forEach((img) => {
            img.loading = 'eager';
            img.decode?.().catch(() => {});
          });
        },
      });
    }

    // Teardown — hides the stage once the landing's own runway is
    // spent, handing off to whatever (currently nothing) follows next.
    // Any future section must gate its OWN fixed stage the same way —
    // see AboutScroll.astro's comment.
    const exitEnd = ScrollTrigger.create({
      trigger: landing,
      start: `top+=${LANDING_RUNWAY} bottom`,
      end: `top+=${LANDING_RUNWAY} bottom`,
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
        '[data-about-landing-gallery-track], [data-about-landing-gallery-img], [data-about-landing-col]',
      ),
    );
    setStageVisible(false);
  };
}
