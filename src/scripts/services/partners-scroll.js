import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PARTNERS } from '../../data/partners.js';
import { createPartnersImageDissolve } from './partners-image-dissolve.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * /services "Partners / They trust us" wheel — scroll module.
 *
 * RELOCATED from /about-3 (services-page split), where it was the
 * scroll chain's last section. Standalone it is the page's FIRST AND
 * ONLY section, so every predecessor coupling died with the move:
 * no entry/exit gates (the stage lives for the page's lifetime), no
 * predecessor-anchored entry melt (rotating's data-partners-melt-lead-px
 * publisher stayed behind and was removed as dead code), no
 * about-3:hero-scroll-ready settle gate (build waits on fonts only —
 * there are no upstream runways whose heights could move our anchors),
 * and no SectionProgress re-show (that indicator is /about-3's).
 *
 * ENTRY (approved: on-load reveal): the stage is made visible at init
 * and fades/blurs in over REVEAL_S — the house exit vocabulary
 * reversed — while the site-wide page-cover transition provides the
 * navigation sweep above it. The wheel scrub window is anchored to the
 * absolute top of the page ('top top'), so progress 0 = scroll 0.
 *
 * THE WHEEL (unchanged from the /about-3 build): one scrub window
 * drives the UL's `--progress` through all 45 names (all poses derive
 * in CSS from that single value), per-write active/cull class
 * derivation, the active-satellite toggle (its dissolve is CSS —
 * partners.css), goal/display lerp split, and the scroll-settle snap
 * (never a scrollTo — it would fight Lenis, owned page-wide by
 * services-scroll.js). Server markup carries the progress-0 rest state
 * for correct pre-JS paint; under reduced motion this module never
 * boots and the CSS base rules render the static column.
 *
 * As the page's only section it carries the +1-viewport headroom pad
 * (the exit-end-at-native-max-scroll rounding hazard, inherited
 * last-section contract).
 */

/** Scroll px per wheel step (name-to-name). The fromanother reference
 * paces ~192px/step; slightly tighter here because 45 names at 192
 * would push an 8.5k+ runway (feel constant, Oscar's tuning pass). The
 * full Stage-2 scrub window is STEP_PX * (N-1). */
export const PARTNERS_STEP_PX = 165;
/** Rest on the final name at the end of the runway. */
export const PARTNERS_TAIL_HOLD_PX = 300;
/** On-load reveal duration — the /about-3-era scroll-scrubbed entry
 * melt (400px, predecessor-anchored) is replaced standalone by this
 * timed fade/blur-in at boot (approved: on-load reveal). */
const PARTNERS_REVEAL_S = 0.85;
/** Reveal starting blur — the house exit vocabulary (opacity + blur
 * together) reversed; landing-scroll.js's INDICATOR_HIDE_BLUR_PX
 * lineage. Cleared (clearProps) at the end so the settled stage keeps
 * no filter and creates no stacking context (Stage-3 blend planning
 * unaffected — the old melt's own rest-state rule). */
const PARTNERS_REVEAL_BLUR_PX = 10;
/** Names beyond this |rel-index| are culled (visibility:hidden, skip
 * writes) — 45 names span 484° of arc and would wrap the full circle
 * back on-screen without it. 10 ≈ 110°, the reference's own visible
 * span. Mirrors CULL_WINDOW in PartnersSection.astro's server render. */
export const PARTNERS_CULL_WINDOW = 10;
/** Scroll-settle snap (Stage 2, approved decision 1): quiet time after
 * the last wheel update before the goal snaps to the nearest name. */
const PARTNERS_SNAP_DELAY_S = 0.15;
/** Wheel laziness (Stage-2 amendment 1) — the founders NAME_TRAVEL_LERP
 * idiom, applied to the wheel: scroll writes a GOAL progress 1:1; the
 * DISPLAYED progress catches up by this fraction per gsap.ticker tick,
 * so each input turns the wheel with a deliberate trailing ease instead
 * of tracking raw scroll. Founders runs 0.12; the wheel starts
 * noticeably lazier BY REQUEST — a feel constant, Oscar iterates live.
 * The settle snap now RIDES this same layer: after the quiet delay the
 * goal is reassigned to the nearest exact index (computed from the
 * TRUE scroll-derived value) and the display converges through the
 * identical lerp — one motion system, no second tween to race it
 * (NEVER a scrollTo either way: founders' snap note — animating the
 * scroll position fights Lenis). */
const PARTNERS_WHEEL_LERP = 0.05;
/** Below this goal/display gap (progress units — ~0.2% of one 11°
 * step, sub-pixel on the arc) the display JUMPS exactly onto the goal:
 * full resolution at rest, no perpetual drift, exact index values at
 * settle (the founders NAME_TRAVEL_LERP_EPSILON contract). */
const PARTNERS_WHEEL_LERP_EPSILON = 0.00005;

const PARTNERS_SCRUB_PX = PARTNERS_STEP_PX * (PARTNERS.length - 1);
const PARTNERS_RUNWAY_PX = PARTNERS_SCRUB_PX + PARTNERS_TAIL_HOLD_PX;

/**
 * Boot the partners wheel on /services only.
 * @returns {() => void} cleanup
 */
export function initPartnersScroll() {
  if (!document.body.classList.contains('services-page')) return () => {};

  const section = document.querySelector('body.services-page [data-about-partners]');
  if (!(section instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  const stage = section.querySelector('[data-about-partners-stage]');
  const arc = section.querySelector('[data-about-partners-arc]');
  const video = section.querySelector('[data-about-partners-video]');
  const names = Array.from(section.querySelectorAll('[data-about-partners-name]')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (
    !(stage instanceof HTMLElement) ||
    !(arc instanceof HTMLElement) ||
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
    // GL image loop idles with the stage (founders setPaused contract).
    // imageDissolve is declared after this function but initialized in
    // the same synchronous init pass — and this function is only ever
    // CALLED from gates/build/cleanup, all of which run strictly later.
    imageDissolve?.setPaused(!visible);
  };

  // ── Stage 2 wheel state (amendment 1: goal/display split) ───────────
  // The founders NameTravel architecture, one value instead of px: the
  // GOAL is 1:1 scroll truth (written only by the trigger's onUpdate and
  // the settle snap); the DISPLAY is what actually paints — --progress
  // on the UL (all 45 poses derive in CSS from it), the active/cull
  // classes, and the active satellite — and only tickWheel/the rebuild
  // force-sync ever write it. Deriving classes from the DISPLAY keeps
  // the handoff visually coherent with the lazy wheel (they converge to
  // the true value through the same lerp — the sanctioned alternative
  // in Oscar's constraint). Active = NEAREST name (Math.round), the
  // reference's own half-step handoff.
  const sats = Array.from(section.querySelectorAll('[data-about-partners-sat]')).filter(
    (el) => el instanceof HTMLElement,
  );

  // Satellite-image noise dissolve (amendment 5) — created ONCE,
  // module-instance lifetime (the landing waveShader idiom): the GL
  // module holds one plane + one tween slot for the whole section and
  // is only ever re-POINTED (setActive) / re-sized, never recreated.
  // URLs come from the server-rendered per-brand <img>s (every brand
  // carries one from amendment 4). On successful boot the stage gains
  // has-gl-image (CSS hides the DOM image slots); on null (no WebGL)
  // the CSS blur-dissolve path stands untouched.
  const glMount = section.querySelector('[data-about-partners-image-gl]');
  const satImageUrls = sats.map(
    (sat) => sat.querySelector('.about-partners__sat-image img')?.getAttribute('src') ?? '',
  );
  const imageDissolve =
    glMount instanceof HTMLElement
      ? createPartnersImageDissolve(glMount, satImageUrls, 0)
      : null;
  if (imageDissolve) stage.classList.add('has-gl-image');

  const wheel = { goal: 0, display: 0 };
  let lastActiveIdx = -1;
  const applyWheel = () => {
    const exact = wheel.display * (PARTNERS.length - 1);
    const idx = Math.round(exact);
    arc.style.setProperty('--progress', String(wheel.display));
    names.forEach((el, i) => {
      el.classList.toggle('is-active', i === idx);
      // Passed the spotlight: above the middle (rel-index < 0) a name
      // stays solid white — see .is-passed in partners.css.
      el.classList.toggle('is-passed', i < exact);
      el.classList.toggle('is-culled', Math.abs(i - exact) > PARTNERS_CULL_WINDOW);
    });
    sats.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    if (idx !== lastActiveIdx) {
      lastActiveIdx = idx;
      imageDissolve?.setActive(idx);
    }
  };

  /** @type {gsap.core.Tween | undefined} */
  let settleCall;
  /** Settle: reassign the GOAL to the nearest exact index of the TRUE
   * scroll-derived value (the goal is scroll truth by construction —
   * only onUpdate writes it before this). No tween: the display
   * converges through the standing lerp, and any new scroll input
   * retargets instantly because onUpdate overwrites the goal — the
   * retarget-safety choke point is the goal assignment itself. */
  const settleSnap = () => {
    wheel.goal = Math.round(wheel.goal * (PARTNERS.length - 1)) / (PARTNERS.length - 1);
  };
  const armSettle = () => {
    settleCall?.kill();
    settleCall = gsap.delayedCall(PARTNERS_SNAP_DELAY_S, settleSnap);
  };

  /** Display easing — registered ONCE, module-instance lifetime (the
   * founders tickNameTravel idiom, same per-tick lerp + epsilon-jump
   * shape): eases the display toward the goal every gsap.ticker tick,
   * jumping exactly onto it inside the epsilon so rest states are
   * EXACT index values with zero residual churn (the loop early-returns
   * with no DOM writes once resolved). */
  const tickWheel = () => {
    const delta = wheel.goal - wheel.display;
    if (Math.abs(delta) < PARTNERS_WHEEL_LERP_EPSILON) {
      if (wheel.display !== wheel.goal) {
        wheel.display = wheel.goal;
        applyWheel();
      }
      return;
    }
    wheel.display += delta * PARTNERS_WHEEL_LERP;
    applyWheel();
  };
  gsap.ticker.add(tickWheel);

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-partners-')) {
        trigger.kill();
      }
    });
    settleCall?.kill();

    // Re-size the GL image slot (vw-derived geometry) — re-pointed, not
    // recreated, the landing waveShader resize idiom.
    imageDissolve?.resize();

    // ── The wheel scrub ──────────────────────────────────────────────
    // One trigger owns the whole 44-step window. STANDALONE ANCHORING:
    // this section starts at document top, so the window is anchored
    // 'top top' — wheel progress 0 IS scroll 0 (the /about-3 build
    // anchored to the section's top-vs-viewport-BOTTOM crossing, which
    // for a first section would sit a whole viewport before scroll 0
    // and pre-advance the wheel ~13% on load). onUpdate writes ONLY the
    // goal (scroll truth, 1:1) and re-arms the settle timer; the
    // standing tickWheel lerp is the sole painter (amendment 1).
    // Fling-safe with no extra guards: goal clamps to [0,1] in the same
    // update pass, 0/1 are themselves exact indices (names 0 and 44),
    // and the display converges + epsilon-jumps exact.
    // Reversal-symmetric: nothing here is direction-aware.
    const wheelTrig = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: `top+=${PARTNERS_SCRUB_PX} top`,
      id: 'about-partners-wheel',
      onUpdate: (self) => {
        armSettle();
        wheel.goal = self.progress;
      },
    });

    // Runway — the page's only section carries the +1-viewport headroom
    // pad (the exit-end-at-native-max-scroll rounding hazard, the
    // inherited last-section contract).
    section.style.height = `${PARTNERS_RUNWAY_PX + window.innerHeight}px`;

    // Stage visibility — standalone there are no gates: the stage is
    // simply on for the module's lifetime (visibility + video play +
    // GL loop), from init until cleanup.
    setStageVisible(true);

    ScrollTrigger.refresh();

    // Wheel restoration AFTER the refresh (trigger progress is only
    // meaningful once every anchor above is final): FORCE-SYNC display
    // onto the raw value at the live position (the founders
    // forceSyncNameTravel contract — the eased catch-up must never be
    // visible on top of an instant state resolution like a rebuild),
    // then arm the settle — a rebuild landing mid-step squares itself
    // to the nearest name the same way a scroll-stop does.
    wheel.goal = wheelTrig.progress;
    wheel.display = wheel.goal;
    applyWheel();
    armSettle();
  };

  let cancelled = false;
  /** @type {gsap.core.Tween | undefined} */
  let revealTween;
  // Fonts-only gate: standalone there are no upstream runways whose
  // heights could move this section's anchors (the /about-3 build
  // waited on about-3:hero-scroll-ready here — that event does not
  // exist on this page and the listener left with it). Fonts still
  // gate so the server-rendered arc measures with the real faces.
  document.fonts.ready.then(() => {
    if (cancelled) return;
    build();
    // On-load reveal (approved: Option 1) — runs ONCE, after the first
    // build has the stage visible at wheel progress 0: the house exit
    // vocabulary reversed (opacity + blur in together). clearProps
    // drops the inline filter at the end so the settled stage keeps no
    // stacking context; opacity parks at 1 inline (identical rest state
    // to the old melt's). Resize rebuilds never re-run it.
    revealTween = gsap.fromTo(
      stage,
      { opacity: 0, filter: `blur(${PARTNERS_REVEAL_BLUR_PX}px)` },
      {
        opacity: 1,
        filter: 'blur(0px)',
        duration: PARTNERS_REVEAL_S,
        ease: 'power3.out',
        clearProps: 'filter',
      },
    );
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
    revealTween?.kill();
    settleCall?.kill();
    gsap.ticker.remove(tickWheel);
    gsap.killTweensOf(stage);
    if (video instanceof HTMLVideoElement) video.pause();
    setStageVisible(false);
    imageDissolve?.destroy();
  };
}
