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
const LANDING_HOLD = 1000;
const LANDING_RUNWAY = LANDING_SETTLE_BEAT + LANDING_HOLD;

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
    setStageVisible(false);
  };
}
