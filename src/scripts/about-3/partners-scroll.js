import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PARTNERS } from '../../data/partners.js';
import { createPartnersImageDissolve } from './partners-image-dissolve.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * /about-3 "Partners / They trust us" — scroll module.
 *
 * STAGE 2 (approved staged split — see PartnersSection.astro): the
 * shell (entry/exit gates, runway, entry crossfade, video play/pause
 * discipline) plus the LIVE WHEEL — one scrub window drives the UL's
 * `--progress` through all 45 names (all poses derive in CSS from that
 * single value), with per-write active/cull class derivation, the
 * active-satellite toggle (its dissolve is CSS — partners.css), and
 * the approved scroll-settle snap: when input goes quiet the display
 * progress eases to the nearest exact index in a TIMED content tween
 * (founders precedent — never a scrollTo, which would fight Lenis), so
 * a name is always flat/active at rest. Stage 3 adds the knockout
 * treatment for the active name. Server markup carries the progress-0
 * rest state for correct pre-JS paint.
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
/** The #F9F9F9->dark entry melt LENGTH (Stage-1 amendment, fix 1: the
 * melt is now a crossfade of the whole stage OVER the still-running
 * landing beneath, and it STARTS at a landing-derived anchor — the
 * final wave's last image crossing the viewport's vertical centre —
 * read from landing's dataset in build(), not at the runway head). The
 * runway keeps a same-sized head segment as a rest beat before the
 * Stage-2 scrub window, so page totals are unchanged. */
export const PARTNERS_ENTRY_FADE_PX = 400;
/** Rest on the final name before teardown. */
export const PARTNERS_TAIL_HOLD_PX = 300;
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
/** Indicator re-show — the house exit vocabulary reversed (opacity +
 * blur together), landing-scroll.js's INDICATOR_HIDE_BLUR_PX mirrored. */
const PARTNERS_INDICATOR_SHOW_BLUR_PX = 10;

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
  // module-instance lifetime (the landing hoverBlur idiom): the GL
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

  /** @type {gsap.core.Tween | undefined} */
  let meltTween;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-partners-')) {
        trigger.kill();
      }
    });
    meltTween?.kill();
    settleCall?.kill();

    // Re-size the GL image slot (vw-derived geometry) — re-pointed, not
    // recreated, the landing hoverBlur resize idiom.
    imageDissolve?.resize();

    // Melt lead (fix 1, re-tuned at Oscar's re-pass) — how many scroll px
    // BEFORE this section's own top-vs-viewport-bottom crossing the entry
    // crossfade starts. The landing publishes the FULL derived lead (the
    // final wave's last image's centre crossing the viewport's vertical
    // centre — see the dataset publish in landing-scroll.js's wave
    // chain); Oscar's split-the-difference call halves it here as
    // composition POLICY on the consumer side, keeping the published
    // value a pure mechanical fact of the gallery maths. The clamp keeps
    // the confirmed completes-at-or-before-the-boundary behaviour at any
    // viewport (lead never shorter than the melt itself). Re-read every
    // build so resize re-derivations flow through; landing always builds
    // first (its settle-gate listener and resize handler are both
    // registered before ours — AboutScroll.astro init order). Missing
    // dataset (no landing/waves on the page, defensive only) degrades to
    // a boundary-completing melt.
    const PARTNERS_MELT_LEAD_RATIO = 0.5;
    const landing = document.querySelector('body.about-page-3 [data-about-landing]');
    const fullMeltLead =
      landing instanceof HTMLElement
        ? Math.max(0, parseFloat(landing.dataset.partnersMeltLeadPx || '0') || 0)
        : 0;
    const meltLead = Math.max(
      PARTNERS_ENTRY_FADE_PX,
      Math.round(fullMeltLead * PARTNERS_MELT_LEAD_RATIO),
    );
    /** Trigger anchor at a signed px offset from `section top bottom`. */
    const anchorAt = (relPx) =>
      relPx >= 0 ? `top+=${relPx} bottom` : `top-=${-relPx} bottom`;

    // Entry gate — moves WITH the melt (the stage must exist on screen,
    // at scrubbed opacity, for the crossfade to show). Both stages are
    // deliberately live between here and landing's own exit-end: landing
    // (z 140) keeps playing its final wave beneath this stage (z 145)
    // while the crossfade darkens over it.
    const entry = ScrollTrigger.create({
      trigger: section,
      start: anchorAt(-meltLead),
      end: anchorAt(-meltLead),
      id: 'about-partners-entry',
      onEnter: () => setStageVisible(true),
      onLeaveBack: () => setStageVisible(false),
    });

    // Entry melt — the #F9F9F9->dark transition as a whole-stage
    // crossfade over the running landing (CSS defaults the stage to
    // opacity 0 — see partners.css). Starts exactly at the derived
    // anchor, runs PARTNERS_ENTRY_FADE_PX. Pure scrub, ease:none,
    // reversal-symmetric: scrolling back re-melts to reveal the landing
    // beneath before the entry gate hides the stage. opacity:1 at rest
    // creates no stacking context, so the settled stage composites
    // exactly as before (Stage-3 blend planning unaffected).
    meltTween = gsap.fromTo(
      stage,
      { opacity: 0 },
      {
        opacity: 1,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: anchorAt(-meltLead),
          end: anchorAt(-meltLead + PARTNERS_ENTRY_FADE_PX),
          scrub: true,
          id: 'about-partners-melt',
        },
      },
    );

    // ── Stage 2: the wheel scrub ─────────────────────────────────────
    // One trigger owns the whole 44-step window, sitting after the
    // runway's head rest beat. onUpdate writes ONLY the goal (scroll
    // truth, 1:1) and re-arms the settle timer; the standing tickWheel
    // lerp is the sole painter (amendment 1). Fling-safe with no extra
    // guards: goal clamps to [0,1] in the same update pass the gates
    // fire, 0/1 are themselves exact indices (names 0 and 44), and the
    // display converges + epsilon-jumps exact. Reversal-symmetric:
    // nothing here is direction-aware.
    const wheelTrig = ScrollTrigger.create({
      trigger: section,
      start: `top+=${PARTNERS_ENTRY_FADE_PX} bottom`,
      end: `top+=${PARTNERS_ENTRY_FADE_PX + PARTNERS_SCRUB_PX} bottom`,
      id: 'about-partners-wheel',
      onUpdate: (self) => {
        armSettle();
        wheel.goal = self.progress;
      },
    });

    // Section-progress indicator RE-SHOW — the second half of the
    // AUTHORIZED SectionProgress exception (Stage-2 amendments; the
    // first half is row 3's anchor in section-progress.js). Exact
    // mirror of landing-scroll.js's authorized hide: driven from this
    // section's own phase maths, targeting the indicator CONTAINER with
    // self opacity + filter (self-properties never isolate the
    // container's difference blend — same rule as the hide), disjoint
    // from section-progress.js's own leaf tweens. Window = the runway's
    // head rest beat [boundary, boundary + PARTNERS_ENTRY_FADE_PX]:
    // starts exactly where the melt crossfade has already completed
    // (the melt's clamp guarantees it) AND where row 04 has just
    // activated ('top bottom' anchor, see REAL_ANCHORS) — so the
    // indicator only ever gains opacity already reading "04 — our
    // partners" over the settled dark stage, and on reverse it is fully
    // gone again before the row could swap back. From-values match the
    // hide's parked end state (opacity 0 / blur 10) exactly. BLEND NOTE:
    // the difference read over the dark video is Oscar's manual item —
    // unverifiable here (occluded tab cannot composite blends).
    const progressIndicator = document.querySelector(
      'body.about-page-3 [data-section-progress]',
    );
    if (progressIndicator instanceof HTMLElement) {
      gsap.fromTo(
        progressIndicator,
        { opacity: 0, filter: `blur(${PARTNERS_INDICATOR_SHOW_BLUR_PX}px)` },
        {
          opacity: 1,
          filter: 'blur(0px)',
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: `top+=${PARTNERS_ENTRY_FADE_PX} bottom`,
            scrub: true,
            id: 'about-partners-progress-show',
          },
        },
      );
    }

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
    // against the fresh triggers (the landing build() idiom); the melt
    // scrub self-syncs via ScrollTrigger.refresh() (scrub jump on
    // update), landing the stage's inline opacity wherever the live
    // scroll position sits in the crossfade window.
    setStageVisible(window.scrollY >= entry.start && window.scrollY < exitEnd.start);

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
    meltTween?.kill();
    settleCall?.kill();
    gsap.ticker.remove(tickWheel);
    gsap.killTweensOf(stage);
    if (video instanceof HTMLVideoElement) video.pause();
    setStageVisible(false);
    imageDissolve?.destroy();
  };
}
