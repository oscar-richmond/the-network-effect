import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PARTNERS } from '../../data/partners.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * /about-3 "Partners / They trust us" — scroll module.
 *
 * STAGE 1 (approved staged split — see PartnersSection.astro): the
 * section shell only. Owns the entry/exit gates, the runway (sized for
 * the FULL Stage-2 wheel scrub already, so page totals don't move
 * between stages), the #F9F9F9->dark entry-veil scrub, and video
 * play/pause discipline. The wheel itself is STATIC at progress 0 —
 * Stage 2 adds the scrubbed `--progress` write + per-tick active/cull
 * derivation + the approved scroll-settle snap (founders snap
 * precedent); Stage 3 adds the knockout treatment + satellite dissolve
 * swaps. The active/cull/satellite state is server-rendered for rest
 * and only re-asserted here for rebuild safety.
 *
 * ARCHITECTURE: the FUTURE SECTIONS contract, third application
 * (founders -> landing -> here): own fixed stage, CSS-default hidden,
 * revealed exclusively by this section's own top-vs-viewport-bottom
 * gate, which by plain document flow lands exactly where landing's
 * runway is exhausted (landing's height drops its last-section pad in
 * lockstep — see the paired comment in landing-scroll.js). This section
 * is now the page's last, so IT carries the +1-viewport headroom pad.
 */

/** Scroll px per wheel step (name-to-name). The fromanother reference
 * paces ~192px/step; slightly tighter here because 45 names at 192
 * would push an 8.5k+ runway (feel constant, Oscar's tuning pass). The
 * full Stage-2 scrub window is STEP_PX * (N-1). */
export const PARTNERS_STEP_PX = 165;
/** The #F9F9F9->dark entry melt — the veil scrubs out over this many px
 * at the head of the runway (approved plan item 5; flagged for Oscar's
 * judgment pass vs a hard cut). */
export const PARTNERS_ENTRY_FADE_PX = 400;
/** Rest on the final name before teardown. */
export const PARTNERS_TAIL_HOLD_PX = 300;
/** Names beyond this |rel-index| are culled (visibility:hidden, skip
 * writes) — 45 names span 484° of arc and would wrap the full circle
 * back on-screen without it. 10 ≈ 110°, the reference's own visible
 * span. Mirrors CULL_WINDOW in PartnersSection.astro's server render. */
export const PARTNERS_CULL_WINDOW = 10;

const PARTNERS_SCRUB_PX = PARTNERS_STEP_PX * (PARTNERS.length - 1);
const PARTNERS_RUNWAY_PX = PARTNERS_ENTRY_FADE_PX + PARTNERS_SCRUB_PX + PARTNERS_TAIL_HOLD_PX;

/**
 * Boot the partners section on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initPartnersScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const section = document.querySelector('body.about-page-3 [data-about-partners]');
  if (!(section instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  const stage = section.querySelector('[data-about-partners-stage]');
  const arc = section.querySelector('[data-about-partners-arc]');
  const veil = section.querySelector('[data-about-partners-veil]');
  const video = section.querySelector('[data-about-partners-video]');
  const names = Array.from(section.querySelectorAll('[data-about-partners-name]')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (
    !(stage instanceof HTMLElement) ||
    !(arc instanceof HTMLElement) ||
    !(veil instanceof HTMLElement) ||
    names.length !== PARTNERS.length
  ) {
    return () => {};
  }

  // Video play/pause rides stage visibility — no reason to decode video
  // while the stage is hidden (founders' videoController discipline,
  // lean version: this clip is ambient-only, no snap coupling). play()
  // rejection (autoplay policy, decode failure) degrades to the poster
  // frame — acceptable static backdrop, matching founders' fallback
  // philosophy.
  const setStageVisible = (visible) => {
    stage.style.visibility = visible ? 'visible' : 'hidden';
    if (video instanceof HTMLVideoElement) {
      if (visible) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  };

  /** Stage-1 static wheel assert (rebuild safety — server markup already
   * carries this state): progress 0, name 0 active, cull window from
   * rest. Stage 2 replaces this with the per-tick derivation. */
  const assertRestState = () => {
    arc.style.setProperty('--progress', '0');
    names.forEach((el, i) => {
      el.classList.toggle('is-active', i === 0);
      el.classList.toggle('is-culled', i > PARTNERS_CULL_WINDOW);
    });
  };

  /** @type {gsap.core.Tween | undefined} */
  let veilTween;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-partners-')) {
        trigger.kill();
      }
    });
    veilTween?.kill();

    // Entry gate — fires exactly where landing's exit-end fires (the
    // handoff contract; see landing-scroll.js's height comment).
    const entry = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'top bottom',
      id: 'about-partners-entry',
      onEnter: () => setStageVisible(true),
      onLeaveBack: () => setStageVisible(false),
    });

    // Entry veil melt — #F9F9F9 (the landing's ground) -> transparent
    // over the runway's first PARTNERS_ENTRY_FADE_PX. Pure scrub,
    // ease:none, reversal-symmetric: scrolling back re-wears the light
    // ground before the gate swaps stages, so the boundary reads as one
    // continuous surface in both directions.
    veilTween = gsap.fromTo(
      veil,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: `top+=${PARTNERS_ENTRY_FADE_PX} bottom`,
          scrub: true,
          id: 'about-partners-veil',
        },
      },
    );

    // Runway — this is now the page's LAST section: it carries the
    // +1-viewport headroom pad (the exit-end-at-native-max-scroll
    // rounding hazard, same as landing carried before it).
    section.style.height = `${PARTNERS_RUNWAY_PX + window.innerHeight}px`;

    const exitEnd = ScrollTrigger.create({
      trigger: section,
      start: `top+=${PARTNERS_RUNWAY_PX} bottom`,
      end: `top+=${PARTNERS_RUNWAY_PX} bottom`,
      id: 'about-partners-exit-end',
      onEnter: () => setStageVisible(false),
      onLeaveBack: () => setStageVisible(true),
    });

    // Rebuild restoration — stage visibility derived from live scrollY
    // against the fresh triggers (the landing build() idiom); the veil
    // scrub self-syncs via ScrollTrigger.refresh().
    assertRestState();
    setStageVisible(window.scrollY >= entry.start && window.scrollY < exitEnd.start);

    ScrollTrigger.refresh();
  };

  let cancelled = false;
  // Hero-settle gate — same as landing-scroll.js (see its comment): this
  // section's anchors depend on every runway above it being stable;
  // whichever module builds last refreshes all trigger positions.
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
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-partners-')) {
        trigger.kill();
      }
    });
    veilTween?.kill();
    gsap.killTweensOf(veil);
    if (video instanceof HTMLVideoElement) video.pause();
    setStageVisible(false);
  };
}
