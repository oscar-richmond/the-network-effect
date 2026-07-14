import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** The site-wide line-reveal curve (line-reveal.js's CSS ease) — the
 * footer label's roll must match the landing label's exactly. */
const LABEL_REVEAL_EASE = CustomEase.create('rotatingLabelReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/**
 * /about-3 rotating gallery — scroll module. Port of the Codrops
 * "Rotating On-Scroll Animations" DEMO 4 mechanism
 * (src/_reference/rotating-on-scroll/js/index4.js, MIT), integrated
 * into the house architecture rather than transplanted:
 *
 * - NO Lenis/ticker re-init: the reference's initSmoothScrolling is not
 *   ported — our page already runs Lenis + the ScrollTrigger bridge
 *   (about-scroll.js). The demo-4 velocity layer reads scroll velocity
 *   as a per-gsap-tick scrollY delta (the same px-per-frame units
 *   Lenis's own velocity reports), so it needs no handle on the Lenis
 *   instance at all.
 * - Wrapper divs are server-rendered (RotatingSection.astro), not
 *   insertBefore'd at runtime.
 * - Triggers carry the `about-rotating-` prefix: killed on rebuild and
 *   cleanup here, and SPARED by the hero's resize rebuild
 *   (about-scroll.js SPARED_TRIGGER_PREFIXES — the kill-on-resize bug
 *   class found and fixed during partners Stage 1).
 * - Per-item triggers anchor on the untransformed WRAP, not the item
 *   (deliberate deviation, documented: the reference triggers on the
 *   rotating item itself, whose getBoundingClientRect drifts with its
 *   own rotation at refresh time; the wrap has identical vertical
 *   geometry and is deterministic at any refresh moment — our
 *   both-viewport anchor verification depends on that).
 * - Per-item random orientations are generated ONCE at init and reused
 *   across resize rebuilds (the reference only re-randomizes on full
 *   page load; a resize must not reshuffle the wall).
 *
 * BOUNDARY MAP (this is the page's first IN-FLOW section between fixed
 * stages — no stage, no gates, ordinary scrolling content):
 * - IN (landing -> here): landing's exit-end fires exactly as this
 *   section's top crosses the viewport bottom; the landing stage is
 *   empty by then (post-AMPLIFY wipe + tail hold) AND already faded to
 *   #161616 (landing-scroll.js's exit ground fade, anchored to the
 *   AMPLIFY wave's last image leaving the viewport and completing at
 *   this boundary) — a DARK-to-dark pixel swap onto this section's
 *   static #161616, then normal scrolling.
 * - OUT (here -> partners): partners' entry/melt anchors ride this
 *   section's bottom by document flow. The MELT-LEAD PUBLISHER moved
 *   here from landing-scroll.js: the melt should begin when this
 *   section's LAST image's centre crosses the viewport's vertical
 *   middle — lead = sectionHeight − lastItemCentreOffset − vh/2,
 *   published on this section's dataset (same attribute contract;
 *   partners-scroll.js reads its predecessor). The crossfade now melts
 *   over this scrolling content instead of the frozen last wave.
 */

/** Sine distribution (demo 4): x = sin(i · STEP) · innerWidth · AMP.
 * Demo 4 uses sin(i) directly — step 1.0 (demo 1's is 0.45). */
const ROTATING_SINE_AMP = 0.2;
const ROTATING_SINE_STEP = 1;
/** Per-item start orientations (demo 4): the big flip lives on Y;
 * X/Z are gentle tilts. Each scrubs to its own negative. */
const ROTATING_ROT_X_RANGE = [-10, 10];
const ROTATING_ROT_Y_RANGE = [200, 290];
const ROTATING_ROT_Z_RANGE = [-10, 10];
/** Mid-crossing z dip: z = sin(progress · π) · this (demo 4). */
const ROTATING_Z_DIP_PX = -150;
/** Per-item scrub window (all demos). */
const ROTATING_ITEM_START = 'top bottom+=20%';
const ROTATING_ITEM_END = 'bottom top-=20%';
/** Velocity->blur layer (demo 4): norm = min(|v|/NORM, 1) with v in px
 * per gsap tick; blur eases toward norm·MAX by LERP each tick;
 * saturate = 1 − norm (instantaneous, as the reference). */
const ROTATING_VELOCITY_NORM = 40;
const ROTATING_VELOCITY_BLUR_MAX_PX = 15;
const ROTATING_VELOCITY_LERP = 0.45;
/** Ahead-of-section eager-fetch lead (the landing gallery preload
 * convention — lazy imgs are unreliable below the fold on this page). */
const ROTATING_PRELOAD_LEAD_PX = 1500;
/** Footer label reveal — the landing footer label's exact vocabulary
 * (landing-scroll.js's LANDING_SETTLE_BEAT / LANDING_LINE_DURATION /
 * FOOTER_LABEL_DISSOLVE_BLUR_PX): a settle beat past the section's
 * arrival, then a 1.2s roll-up with a concurrent 4px blur dissolve,
 * reversed symmetrically on scroll-back. */
const ROTATING_LABEL_SETTLE_PX = 150;
const ROTATING_LABEL_DURATION_S = 1.2;
const ROTATING_LABEL_DISSOLVE_BLUR_PX = 4;
// NOTE: the light-to-dark ground fade that briefly lived here (an
// entry scrub at 'top top') MOVED UPSTREAM at the image round: it now
// runs inside landing-scroll.js, anchored to the AMPLIFY wave's last
// image leaving the viewport and completing at the boundary — so this
// section's ground is statically #161616 (rotating.css) and the
// handoff is dark-to-dark by the time it scrolls in.

/**
 * Boot the rotating gallery on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initRotatingScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const section = document.querySelector('body.about-page-3 [data-about-rotating]');
  if (!(section instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  const wraps = Array.from(section.querySelectorAll('[data-about-rotating-wrap]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const items = Array.from(section.querySelectorAll('[data-about-rotating-item]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const mark = section.querySelector('[data-about-rotating-mark]');
  const markInner = section.querySelector('[data-about-rotating-mark-inner]');
  const label = section.querySelector('[data-about-rotating-label]');
  if (!wraps.length || wraps.length !== items.length) return () => {};

  // Footer label reveal timeline — wrapped ONCE at init (the landing
  // wrapLandingColumns idiom, single static line): the roll-up drives
  // the .lr-inner transform, the dissolve rides the .lr-clip — the same
  // disjoint-target split the landing label documents.
  /** @type {gsap.core.Timeline | undefined} */
  let labelTl;
  if (label instanceof HTMLElement) {
    wrapLineRevealElement(label);
    const labelInner = label.querySelector('.lr-inner');
    const labelClip = label.querySelector('.lr-clip');
    if (labelInner instanceof HTMLElement && labelClip instanceof HTMLElement) {
      labelInner.style.transition = 'none';
      labelTl = gsap.timeline({ paused: true });
      labelTl.fromTo(
        labelInner,
        { yPercent: 110, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: ROTATING_LABEL_DURATION_S,
          ease: LABEL_REVEAL_EASE,
          immediateRender: true,
        },
        0,
      );
      labelTl.fromTo(
        labelClip,
        { opacity: 0, filter: `blur(${ROTATING_LABEL_DISSOLVE_BLUR_PX}px)` },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: ROTATING_LABEL_DURATION_S,
          ease: LABEL_REVEAL_EASE,
          immediateRender: true,
        },
        0,
      );
    }
  }

  // Once-per-init orientations + setters (see header note on randoms).
  const rigs = items.map((item) => ({
    rotationX: gsap.utils.random(ROTATING_ROT_X_RANGE[0], ROTATING_ROT_X_RANGE[1]),
    rotationY: gsap.utils.random(ROTATING_ROT_Y_RANGE[0], ROTATING_ROT_Y_RANGE[1]),
    rotationZ: gsap.utils.random(ROTATING_ROT_Z_RANGE[0], ROTATING_ROT_Z_RANGE[1]),
    setTransform: gsap.quickSetter(item, 'css'),
    setFilter: gsap.quickSetter(item, 'filter'),
  }));

  // ── Demo-4 velocity layer — module-lifetime gsap.ticker fn ──────────
  // Perf-gated to the section window (sectionActive, toggled by the
  // marquee trigger below): outside it, writes stop once the blur has
  // decayed to nothing, so the rest of the page never pays for it.
  let sectionActive = false;
  let lastScrollY = window.scrollY;
  let blurAmount = 0;
  const tickVelocity = () => {
    const y = window.scrollY;
    const velocity = Math.abs(y - lastScrollY);
    lastScrollY = y;
    if (!sectionActive && blurAmount < 0.01) return;
    const norm = sectionActive ? Math.min(velocity / ROTATING_VELOCITY_NORM, 1) : 0;
    blurAmount = gsap.utils.interpolate(
      blurAmount,
      norm * ROTATING_VELOCITY_BLUR_MAX_PX,
      ROTATING_VELOCITY_LERP,
    );
    const filter = `blur(${blurAmount}px) saturate(${1 - norm})`;
    rigs.forEach((rig) => rig.setFilter(filter));
  };
  gsap.ticker.add(tickVelocity);

  // One gate for everything fixed in this section: marquee, footer
  // label, and the velocity layer's perf flag ride the same window
  // trigger — which now ENDS at the content-clear point (see build), so
  // every piece of text is gone before the partners melt can begin.
  const setWindowVisible = (visible) => {
    if (mark instanceof HTMLElement) mark.style.visibility = visible ? 'visible' : 'hidden';
    if (label instanceof HTMLElement) label.style.visibility = visible ? 'visible' : 'hidden';
    sectionActive = visible;
  };

  /** @type {gsap.core.Timeline | undefined} */
  let markTl;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-rotating-')) {
        trigger.kill();
      }
    });
    markTl?.kill();

    // Sine distribution on the WRAPS (demo 4: sin(i) · innerWidth·0.2).
    const amplitude = window.innerWidth * ROTATING_SINE_AMP;
    wraps.forEach((wrap, i) => {
      gsap.set(wrap, { x: Math.sin(i * ROTATING_SINE_STEP) * amplitude });
    });

    // Per-item rotation scrub — demo 4's manual onUpdate interpolation
    // (each item flips from its orientation to the exact negative, with
    // the sin(pπ) z dip written through the same quickSetter).
    items.forEach((item, i) => {
      const rig = rigs[i];
      ScrollTrigger.create({
        trigger: wraps[i],
        start: ROTATING_ITEM_START,
        end: ROTATING_ITEM_END,
        scrub: true,
        id: `about-rotating-item-${i}`,
        onUpdate(self) {
          const p = self.progress;
          rig.setTransform({
            rotationX: gsap.utils.interpolate(rig.rotationX, -rig.rotationX, p),
            rotationY: gsap.utils.interpolate(rig.rotationY, -rig.rotationY, p),
            rotationZ: gsap.utils.interpolate(rig.rotationZ, -rig.rotationZ, p),
            z: Math.sin(p * Math.PI) * ROTATING_Z_DIP_PX,
          });
        },
      });
    });

    // Content-clear point — the scroll offset (within the section's own
    // travel) at which the LAST image's bottom passes the viewport top.
    // Everything text-shaped ends with it: the marquee window (below)
    // and the label/mark visibility gate both close here, so by the
    // time the partners melt can begin (see the publisher) the viewport
    // holds nothing but the empty #161616 tail. Sine x offsets don't
    // affect vertical layout, so offsetTop is authoritative.
    const lastWrap = wraps[wraps.length - 1];
    const lastBottom = lastWrap.offsetTop + lastWrap.offsetHeight;

    // Marquee — one trigger doubles as the scrub (x: 100vw -> -100%)
    // and the section-window gate (marquee + footer-label visibility +
    // the velocity layer's perf gate). The window's END is the
    // content-clear point (was the reference's 'bottom top'): the strip
    // completes its full run exactly as the last image exits, per
    // Oscar's melt-clearance spec.
    if (mark instanceof HTMLElement && markInner instanceof HTMLElement) {
      markTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: `top+=${lastBottom} top`,
          scrub: true,
          id: 'about-rotating-mark',
          onToggle: (self) => setWindowVisible(self.isActive),
        },
      });
      markTl.fromTo(
        markInner,
        { x: '100vw' },
        { x: '-100%', ease: 'none', immediateRender: false },
      );
    }

    // Footer label play/reverse trigger — the landing reveal idiom: a
    // settle beat past the section's arrival plays the timed roll-up;
    // scrolling back above it reverses symmetrically. The far-end hide
    // is the window gate above (instant, the landing stage-swap
    // precedent).
    if (labelTl) {
      ScrollTrigger.create({
        trigger: section,
        start: `top+=${ROTATING_LABEL_SETTLE_PX} bottom`,
        end: `top+=${lastBottom} top`,
        id: 'about-rotating-label',
        onEnter: () => labelTl.play(),
        onLeaveBack: () => labelTl.reverse(),
      });
    }

    // Melt-lead publisher (see BOUNDARY MAP in the header): the melt
    // may only begin once ALL content — images, marquee text, footer
    // label — has fully left the viewport (Oscar's spec). The published
    // lead is the boundary-to-clear gap: sectionHeight − lastBottom −
    // vh. The CSS tail (100vh + 500px, rotating.css) makes this 555px
    // at any viewport height, so the consumer's 400px clamp always
    // lands the melt strictly inside the cleared, empty tail.
    section.dataset.partnersMeltLeadPx = String(
      Math.max(0, Math.round(section.offsetHeight - lastBottom - window.innerHeight)),
    );

    // One-shot eager fetch ahead of the section (landing preload idiom —
    // these pool files are usually cached from the waves already; belt).
    // Lives INSIDE build(): it carries the killed prefix, so a resize
    // rebuild must recreate it (re-arming after it fired is idempotent —
    // the eager upgrade is a no-op the second time).
    ScrollTrigger.create({
      trigger: section,
      start: `top-=${ROTATING_PRELOAD_LEAD_PX} bottom`,
      end: `top-=${ROTATING_PRELOAD_LEAD_PX} bottom`,
      id: 'about-rotating-preload',
      once: true,
      onEnter: () => {
        section.querySelectorAll('[data-about-rotating-img]').forEach((img) => {
          if (img instanceof HTMLImageElement) {
            img.loading = 'eager';
            img.decode?.().catch(() => {});
          }
        });
      },
    });

    ScrollTrigger.refresh();

    // Rebuild restoration — window gate + label playhead derived from
    // the fresh triggers (callbacks only fire on change; a rebuild
    // mid-section needs the state read explicitly — the landing
    // revealTl restoration idiom).
    const markTrigger = markTl?.scrollTrigger;
    if (markTrigger) setWindowVisible(markTrigger.isActive);
    if (labelTl) {
      const labelTrigger = ScrollTrigger.getById('about-rotating-label');
      if (labelTrigger && window.scrollY >= labelTrigger.start) {
        labelTl.progress(1).pause();
      } else {
        labelTl.progress(0).pause();
      }
    }
  };

  let cancelled = false;
  // Same hero-settle gate as the neighbouring modules (see
  // landing-scroll.js): anchors depend on every runway above being
  // final. Registered BEFORE partners-scroll.js's listener (AboutScroll
  // init order), so this build publishes the melt lead before partners'
  // build reads it — and partners' trailing refresh re-anchors
  // everything regardless.
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
    gsap.ticker.remove(tickVelocity);
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-rotating-')) {
        trigger.kill();
      }
    });
    markTl?.kill();
    labelTl?.kill();
    gsap.killTweensOf([...items, ...wraps]);
    if (markInner instanceof HTMLElement) gsap.killTweensOf(markInner);
    if (label instanceof HTMLElement) gsap.killTweensOf(label.querySelectorAll('.lr-inner, .lr-clip'));
    setWindowVisible(false);
  };
}
