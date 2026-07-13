import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PARTNERS } from '../../data/partners.js';

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
 * the last wheel update before the snap fires. */
const PARTNERS_SNAP_DELAY_S = 0.15;
/** Snap transition — a timed CONTENT tween easing the wheel's display
 * progress to the nearest exact index. NEVER a scrollTo: founders'
 * own snap note applies verbatim (animating the scroll position fights
 * Lenis). Retarget-safe by construction: any new scroll update kills
 * both the pending settle call and a mid-flight snap, and raw scrub
 * takes back over. Duration/ease are feel-tunables (Oscar's pass). */
const PARTNERS_SNAP_DURATION_S = 0.5;
const PARTNERS_SNAP_EASE = 'power2.out';

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
  };

  // ── Stage 2: wheel state ─────────────────────────────────────────────
  // ONE display value drives everything: `wheel.p` is written to the
  // UL's --progress (all 45 poses derive in CSS from it), and the same
  // write derives the active/cull classes and the active satellite (its
  // dissolve is a CSS transition on .is-active — partners.css). applyWheel
  // paints RAW scrub progress while scrolling and the snap tween's eased
  // values while settling, so the active handoff and satellite dissolve
  // follow the snap too. Active = NEAREST name (Math.round), the
  // reference's own behaviour: the handoff fires at the half-step point
  // as a name approaches flat.
  const sats = Array.from(section.querySelectorAll('[data-about-partners-sat]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const wheel = { p: 0 };
  const applyWheel = () => {
    const exact = wheel.p * (PARTNERS.length - 1);
    const idx = Math.round(exact);
    arc.style.setProperty('--progress', String(wheel.p));
    names.forEach((el, i) => {
      el.classList.toggle('is-active', i === idx);
      el.classList.toggle('is-culled', Math.abs(i - exact) > PARTNERS_CULL_WINDOW);
    });
    sats.forEach((el, i) => el.classList.toggle('is-active', i === idx));
  };

  /** @type {gsap.core.Tween | undefined} */
  let snapTween;
  /** @type {gsap.core.Tween | undefined} */
  let settleCall;
  const settleSnap = () => {
    const target = Math.round(wheel.p * (PARTNERS.length - 1)) / (PARTNERS.length - 1);
    if (Math.abs(target - wheel.p) < 1e-4) return;
    snapTween = gsap.to(wheel, {
      p: target,
      duration: PARTNERS_SNAP_DURATION_S,
      ease: PARTNERS_SNAP_EASE,
      onUpdate: applyWheel,
    });
  };
  /** Re-arm the settle timer, killing any pending/mid-flight snap — the
   * retarget-safety choke point: called on EVERY wheel update before the
   * raw write, so live input always wins instantly. */
  const armSettle = () => {
    snapTween?.kill();
    settleCall?.kill();
    settleCall = gsap.delayedCall(PARTNERS_SNAP_DELAY_S, settleSnap);
  };

  /** @type {gsap.core.Tween | undefined} */
  let meltTween;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-partners-')) {
        trigger.kill();
      }
    });
    meltTween?.kill();
    snapTween?.kill();
    settleCall?.kill();

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
    // runway's head rest beat. Raw progress paints straight through
    // applyWheel (linear by construction — scrub semantics without a
    // tween middleman), and every update re-arms the settle timer;
    // when input goes quiet the snap eases the display to the nearest
    // exact index. Fling-safe with no extra guards: progress clamps to
    // [0,1] in the same update pass the gates fire, and 0/1 are
    // themselves exact indices (names 0 and 44), so window-edge rests
    // are already flat. Reversal-symmetric: nothing here is direction-
    // aware.
    const wheelTrig = ScrollTrigger.create({
      trigger: section,
      start: `top+=${PARTNERS_ENTRY_FADE_PX} bottom`,
      end: `top+=${PARTNERS_ENTRY_FADE_PX + PARTNERS_SCRUB_PX} bottom`,
      id: 'about-partners-wheel',
      onUpdate: (self) => {
        armSettle();
        wheel.p = self.progress;
        applyWheel();
      },
    });

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
    // meaningful once every anchor above is final): paint the raw value
    // at the live position, then arm the settle — a rebuild that lands
    // mid-step (resize while resting between names) squares itself to
    // the nearest index the same way a scroll-stop does.
    wheel.p = wheelTrig.progress;
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
    snapTween?.kill();
    settleCall?.kill();
    gsap.killTweensOf(stage);
    gsap.killTweensOf(wheel);
    if (video instanceof HTMLVideoElement) video.pause();
    setStageVisible(false);
  };
}
