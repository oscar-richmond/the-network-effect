import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
 *   empty by then (post-AMPLIFY wipe + tail hold) over its own in-flow
 *   --about3-ground wrapper, and this section shares that ground — a
 *   ground-to-ground pixel swap, then normal scrolling.
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
  if (!wraps.length || wraps.length !== items.length) return () => {};

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

  const setMarkVisible = (visible) => {
    if (mark instanceof HTMLElement) mark.style.visibility = visible ? 'visible' : 'hidden';
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

    // Marquee — one trigger doubles as the scrub (x: 100vw -> -100%
    // across the section's full range, the reference window) and the
    // section-window gate (marquee visibility + the velocity layer's
    // perf gate).
    if (mark instanceof HTMLElement && markInner instanceof HTMLElement) {
      markTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          id: 'about-rotating-mark',
          onToggle: (self) => setMarkVisible(self.isActive),
        },
      });
      markTl.fromTo(
        markInner,
        { x: '100vw' },
        { x: '-100%', ease: 'none', immediateRender: false },
      );
    }

    // Melt-lead publisher (see BOUNDARY MAP in the header): the melt
    // should begin when the LAST image's centre crosses the viewport's
    // vertical middle. Sine x offsets don't affect vertical layout, so
    // offsetTop is authoritative here.
    const lastWrap = wraps[wraps.length - 1];
    const lastCentre = lastWrap.offsetTop + lastWrap.offsetHeight / 2;
    section.dataset.partnersMeltLeadPx = String(
      Math.max(0, Math.round(section.offsetHeight - lastCentre - window.innerHeight / 2)),
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

    // Rebuild restoration — marquee gate derived from the fresh trigger
    // (onToggle only fires on change; a rebuild mid-section needs the
    // state read explicitly).
    const markTrigger = markTl?.scrollTrigger;
    if (markTrigger) setMarkVisible(markTrigger.isActive);
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
    gsap.killTweensOf([...items, ...wraps]);
    if (markInner instanceof HTMLElement) gsap.killTweensOf(markInner);
    setMarkVisible(false);
  };
}
