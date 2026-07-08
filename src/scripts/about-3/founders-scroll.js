import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';
import { createFoundersDissolve } from './founders-dissolve.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** The site-wide line-reveal curve (line-reveal.js's CSS transition ease),
 * registered as a GSAP ease so slide 2's timeline-driven line reveal matches
 * the class-toggle reveals' visual character exactly. */
const LINE_REVEAL_EASE = CustomEase.create('foundersLineReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/**
 * /about-3 Founders section — two-slide carousel: scroll-scrubbed entrance,
 * scroll-SNAPPED slide transition.
 *
 * Follows the hero's convention (no GSAP pin): the section is an in-flow
 * runway of `TOTAL_RUNWAY` px whose fixed stage holds the visuals. The
 * ENTRANCE tweens are scrubbed ScrollTriggers anchored to the section's
 * document position ('top+=X bottom' = X px of scroll after the section's
 * top crosses the viewport bottom — which is EXIT_BUFFER (60px) after the
 * hero's bg-fade completes, making that the natural handoff point).
 *
 * The slide 1 → 2 TRANSITION is NOT scrubbed: a callback-only ScrollTrigger
 * at SNAP_THRESHOLD plays/reverses a single paused timeline (time-based,
 * TRANSITION_DURATION). play()/reverse() on one persistent timeline
 * retargets natively from the current playhead on rapid direction flips —
 * never stacks or double-fires. Scroll position itself is never touched
 * (no hijacking; Lenis unaffected) — the stage being position: fixed means
 * a slide is always full-frame, and the timeline always completes to a
 * fully-resolved endpoint.
 *
 * Scroll map (px from handoff):
 *   0 … 600                slide 1 entrance (bg, portrait, name, meta, index)
 *   600 … SNAP_THRESHOLD   hold — slide 1 fully shown
 *   SNAP_THRESHOLD         crossing plays the dissolve + text swap (timed)
 *   … TOTAL_RUNWAY         hold — slide 2 fully shown; end of page
 *
 * Imagery: backgrounds are a DOM media-group crossfade (slide 2's group
 * fades in on top of slide 1's, which stays opaque beneath — single fade,
 * no mid-fade dip). The portrait uses the WebGL noise dissolve
 * (founders-dissolve.js), which supersedes the DOM portrait crossfade —
 * the timeline drives its uProgress via a proxy tween. If WebGL is
 * unavailable the module returns null and the timeline carries a DOM
 * portrait opacity crossfade instead (today's crossfade as degradation);
 * the background media crossfade is unconditional either way.
 *
 * Slide 1's media is a raw (untreated) video; the visual treatment
 * (blur + darken) lives in ONE persistent `.founders__overlay` layer
 * above both media groups, revealed by the same entrance tween as the
 * media group itself and never touched again — see buildFoundersTriggers.
 * Playback lifecycle (play only while the section is active AND slide 1
 * is showing or the transition is in progress; pause otherwise/on
 * cleanup/never under reduced motion) is managed by
 * initFoundersVideoLifecycle below.
 *
 * Blend safety (see founders.css): all transition opacity animates on each
 * slide's individual children — never on a wrapper above the name — so the
 * name's mix-blend-mode: difference keeps compositing against the full
 * backgrounds (media + overlay + canvas, still ordinary paintable content
 * in the stage's isolated stacking context) throughout.
 */

/** Entrance sub-windows (px from handoff). */
const ENTRANCE_BG = [0, 300];
const ENTRANCE_PORTRAIT = [60, 360];
const ENTRANCE_INDEX = [150, 450];
const ENTRANCE_NAME = [180, 480];
const ENTRANCE_META = [240, 600];
/** Scroll position (px from handoff) whose crossing triggers the snap
 * transition — down past it plays 0→1, back up past it plays 1→0. */
const SNAP_THRESHOLD = 1300;
/** Total runway — also the section's in-flow height. The transition no
 * longer consumes scroll distance (was a 900px scrubbed window), so the
 * runway is SNAP_THRESHOLD + a 500px hold on slide 2. */
const TOTAL_RUNWAY = 1800;
/** Snap transition length, seconds. Text phasing mirrors the old scrubbed
 * midpoint: outgoing text in the first half, incoming from the midpoint. */
const TRANSITION_DURATION = 1.2;
const TRANSITION_EASE = 'power2.inOut';
/** Marker travel between thumb centres: 48px thumb + 16px gap. */
const MARKER_TRAVEL = 64;
/** Slide 1 portrait's blur-to-sharp entrance — value sampled from the
 * hero's rolling-word swap (.about-hero__tagline-rotate-inner.is-entering
 * / .is-exiting: filter: blur(10px), about-hero.css), the same reference
 * the hero text's phase-C exit wipe reuses. The reference's 1s CSS ease
 * becomes scrub-synced linear here so the blur resolves exactly with the
 * rise movement, and reverses symmetrically with it. */
const PORTRAIT_ENTRANCE_BLUR_PX = 10;

/**
 * Horizontally centre a slide's name on its own portrait — derived live
 * from both elements' rects (never two hand-tuned per-slide offsets), so
 * it holds for any name width and self-corrects on resize/font-load.
 * Sets `left` in px on the CLIP (never `transform`: a transform here
 * would create a new stacking context on this blend ancestor and
 * isolate the name from everything painted beneath it — see
 * founders.css's blend-safety note. `left` has no such effect).
 * @param {HTMLElement} nameClip the `.founders__name-clip` (h2)
 * @param {HTMLElement} portrait the same slide's `.founders__portrait`
 */
function centerNameOnPortrait(nameClip, portrait) {
  const slide = nameClip.closest('[data-founder-slide]');
  if (!(slide instanceof HTMLElement)) return;
  const slideRect = slide.getBoundingClientRect();
  const portraitRect = portrait.getBoundingClientRect();
  const nameWidth = nameClip.getBoundingClientRect().width;
  const portraitCenter = portraitRect.left + portraitRect.width / 2;
  nameClip.style.left = `${portraitCenter - slideRect.left - nameWidth / 2}px`;
}

/**
 * Wrap slide-1's meta paragraphs into line-reveal clips (same technique
 * as the hero intro), resetting to original text first so re-wrapping on
 * resize re-measures line breaks cleanly.
 * @param {HTMLElement} meta
 * @returns {HTMLElement[]} per-line `.lr-inner` elements, reading order
 */
function wrapMetaLines(meta) {
  const paragraphs = Array.from(meta.querySelectorAll('p'));
  paragraphs.forEach((p) => {
    if (p.dataset.origHtml === undefined) {
      p.dataset.origHtml = p.innerHTML;
    } else {
      p.innerHTML = p.dataset.origHtml;
    }
    wrapLineRevealElement(p);
  });
  const inners = Array.from(meta.querySelectorAll('.lr-inner'));
  // wrapLineRevealElement leaves an inline `transition: transform` meant
  // for its class-toggle reveal; that fights GSAP's continuous scrub.
  inners.forEach((el) => {
    el.style.transition = 'none';
  });
  return inners;
}

/**
 * One-time video playback lifecycle controller for slide 1's raw video
 * media. Constructed once in initFoundersScroll (never under reduced
 * motion — see its early return) and reused across resize rebuilds: the
 * video element itself never changes, so its one-time setup (preload
 * upgrade, error listener) must not repeat on every rebuild the way the
 * scrubbed triggers do. Per-build wiring (the section-active window, the
 * snap timeline reference) is supplied separately by buildFoundersTriggers
 * / initFoundersScroll's build() via setActive/setTimeline.
 *
 * Fallback contract: any video load/play failure (network error, decode
 * error, or a rejected play() promise — e.g. an autoplay policy block)
 * permanently swaps to the raw poster image already sitting in the same
 * media-group (see FoundersSection.astro) via a CSS class — the poster
 * still sits UNDER the live overlay, so the treatment is unaffected.
 * @param {HTMLElement} section
 * @returns {{ setActive: (v: boolean) => void, setTimeline: (tl: gsap.core.Timeline | undefined) => void, destroy: () => void } | null}
 */
function createFoundersVideoController(section) {
  const video = section.querySelector('[data-founder-media][data-founder-media-type="video"]');
  const mediaGroup = video?.closest('[data-founder-media-group]');
  if (!(video instanceof HTMLVideoElement) || !(mediaGroup instanceof HTMLElement)) return null;

  let failed = false;
  let sectionActive = false;
  /** @type {gsap.core.Timeline | undefined} */
  let tl;

  const updatePlayback = () => {
    if (failed) return;
    const shouldPlay = sectionActive && (!tl || tl.progress() < 1);
    if (shouldPlay) {
      if (video.paused) video.play().catch(handleFailure);
    } else if (!video.paused) {
      video.pause();
    }
  };

  function handleFailure() {
    if (failed) return;
    failed = true;
    mediaGroup.classList.add('is-video-fallback');
    video.pause();
  }

  video.addEventListener('error', handleFailure);
  // Upgrade from the reduced-motion-safe `preload="none"` server default
  // (FoundersSection.astro) — reaching this module at all already means
  // reduced motion is off, so it's safe to start buffering now.
  video.preload = 'auto';
  video.load();

  return {
    setActive(value) {
      sectionActive = value;
      updatePlayback();
    },
    setTimeline(nextTl) {
      tl = nextTl;
      // onUpdate only fires on live play()/reverse() ticks, not on the
      // playhead-jump renders build()'s state-restoration uses — callers
      // re-invoke setTimeline after any such jump to resync explicitly.
      tl?.eventCallback('onUpdate', updatePlayback);
      updatePlayback();
    },
    destroy() {
      video.removeEventListener('error', handleFailure);
      video.pause();
    },
  };
}

/**
 * Build all triggers for the section. Assumes fonts are ready (line
 * wrapping measures rendered text).
 * @param {HTMLElement} section
 * @param {ReturnType<typeof createFoundersDissolve>} dissolve WebGL module, or null (DOM fallback)
 * @param {ReturnType<typeof createFoundersVideoController>} videoController null when slide 1 has no video
 * @returns {gsap.core.Timeline | undefined} the snap transition timeline (kill on rebuild)
 */
function buildFoundersTriggers(section, dissolve, videoController) {
  const slides = Array.from(section.querySelectorAll('[data-founder-slide]'));
  if (slides.length < 2) return;
  const [slide1, slide2] = slides;

  section.style.height = `${TOTAL_RUNWAY}px`;

  /** ScrollTrigger positions: X px of scroll after section top crosses
   * the viewport bottom. Recomputed from the live DOM on every
   * ScrollTrigger.refresh(), so the hero setting its spacer height later
   * (post-settle) self-corrects these. */
  const at = (px) => `top+=${px} bottom`;
  const scrub = (start, end, id) => ({
    trigger: section,
    start: at(start),
    end: at(end),
    scrub: true,
    id: `founders-${id}`,
  });

  const q1 = (sel) => slide1.querySelector(sel);
  const q2 = (sel) => slide2.querySelector(sel);

  // Name centering is handled unconditionally in initFoundersScroll
  // (runs under reduced motion too, where this function never executes)
  // — not repeated here.

  // ── Slide 1 entrance ─────────────────────────────────────────────────
  // Media group and the shared treatment overlay fade in together, same
  // window — the overlay has no CSS default-visible state (see founders.css
  // initial-hidden-states), so nothing paints before this crossing (closes
  // the hero-leak gap the same way the old bg1 entrance did).
  const mediaGroup1 = q1('[data-founder-media-group]');
  const overlay = section.querySelector('[data-founders-overlay]');
  const bgEntranceTargets = [mediaGroup1, overlay].filter(Boolean);
  if (bgEntranceTargets.length) {
    gsap.fromTo(
      bgEntranceTargets,
      { opacity: 0 },
      { opacity: 1, ease: 'none', scrollTrigger: scrub(...ENTRANCE_BG, 'media1') },
    );
  }

  const portrait1 = q1('[data-founder-portrait]');
  if (portrait1) {
    // filter rides the SAME tween/trigger as the rise (movement values,
    // window and ease unchanged) so blur-to-sharp is frame-locked to the
    // motion in both directions. It lives on the portrait wrapper only —
    // never a shared ancestor — so the stacking context filter creates
    // can't isolate the name's difference blend (the name is a sibling).
    // With WebGL active this DOM element doesn't paint (img visibility:
    // hidden); founders-dissolve.js mirrors the computed blur into the
    // portrait plane's shader each frame. On the no-WebGL fallback the
    // CSS blur itself is the visible effect.
    gsap.fromTo(
      portrait1,
      { opacity: 0, y: 48, filter: `blur(${PORTRAIT_ENTRANCE_BLUR_PX}px)` },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        ease: 'none',
        scrollTrigger: scrub(...ENTRANCE_PORTRAIT, 'portrait1'),
      },
    );
  }

  // `y: 0` in from AND to on the yPercent tweens below: the CSS initial
  // hidden state is a % translate, which GSAP's matrix parse bakes into a
  // PIXEL `y` — left unmanaged it would survive the tween and hold the
  // element offscreen at progress 1 (the hero's intro tween guards the
  // same way).
  const name1 = q1('[data-founder-name]');
  if (name1) {
    gsap.fromTo(
      name1,
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, ease: 'none', scrollTrigger: scrub(...ENTRANCE_NAME, 'name1') },
    );
  }

  const meta1 = q1('[data-founder-meta]');
  const metaLines = meta1 instanceof HTMLElement ? wrapMetaLines(meta1) : [];
  if (metaLines.length) {
    gsap
      .timeline({ scrollTrigger: scrub(...ENTRANCE_META, 'meta1') })
      .fromTo(
        metaLines,
        { yPercent: 110, y: 0 },
        { yPercent: 0, y: 0, ease: 'none', duration: 1, stagger: 0.35 },
      );
  }

  const index = section.querySelector('[data-founders-index]');
  if (index) {
    gsap.fromTo(
      index,
      { opacity: 0 },
      { opacity: 1, ease: 'none', scrollTrigger: scrub(...ENTRANCE_INDEX, 'index') },
    );
  }

  // ── Slide 1 → slide 2: snap transition timeline ──────────────────────
  // One persistent PAUSED timeline holds the dissolve progress AND all the
  // DOM text tweens — a single driver keeps them in sync by construction,
  // and play()/reverse() retargets cleanly from the current playhead on
  // rapid direction flips (never stacks). immediateRender: false on every
  // fromTo — the timeline is built paused, and rendering "from" values at
  // build time would stamp over the entrance tweens' initial CSS states
  // (same guard as the hero's buildExitWipe).
  const half = TRANSITION_DURATION / 2;
  const tl = gsap.timeline({ paused: true });

  // Background media crossfade — ALWAYS DOM now (the background WebGL
  // plane is gone; live video can't be a shader texture cheaply). Slide 1's
  // media-group stays opaque underneath (untouched here) — slide 2's fades
  // in over it (z-index 2 in CSS), the same single-fade/no-dip trick the
  // old bg crossfade used.
  const mediaGroup2 = q2('[data-founder-media-group]');
  if (mediaGroup2) {
    tl.fromTo(
      mediaGroup2,
      { opacity: 0 },
      { opacity: 1, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
  }

  if (dissolve) {
    const progress = { value: 0 };
    tl.to(
      progress,
      {
        value: 1,
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
        onUpdate: () => dissolve.setProgress(progress.value),
      },
      0,
    );
  } else {
    // DOM fallback (WebGL unavailable): the pre-dissolve portrait opacity
    // crossfade only — background media crossfade above is unconditional.
    tl.fromTo(
      portrait1,
      { opacity: 1 },
      { opacity: 0, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
    tl.fromTo(
      q2('[data-founder-portrait]'),
      { opacity: 0 },
      { opacity: 1, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
  }

  // Text swaps sequentially around the midpoint — the slides' meta blocks
  // and names occupy the same positions, so overlapping fades would
  // double-expose the copy.
  const textOut = [
    meta1,
    name1,
    section.querySelector('[data-founders-thumb-border="0"]'),
    section.querySelector('[data-founders-label="0"]'),
  ].filter(Boolean);
  if (textOut.length) {
    tl.fromTo(
      textOut,
      { opacity: 1 },
      { opacity: 0, duration: half, ease: 'power2.in', immediateRender: false },
      0,
    );
  }

  const textIn = [
    q2('[data-founder-name]'),
    section.querySelector('[data-founders-thumb-border="1"]'),
    section.querySelector('[data-founders-label="1"]'),
  ].filter(Boolean);
  if (textIn.length) {
    tl.fromTo(
      textIn,
      { opacity: 0 },
      { opacity: 1, duration: half, ease: 'power2.out', immediateRender: false },
      half,
    );
  }

  // Slide 2's bio + tags arrive as a LINE REVEAL (masked upward rise, site
  // curve, per-line stagger) rather than a block fade — but as tweens ON
  // this timeline, NOT line-reveal.js's class-toggle transitions (a CSS
  // transition can't be scrubbed backwards by reverse(); wrapMetaLines
  // strips the inline transition for exactly this reason). Starts at the
  // midpoint — mirroring slide 1's text-out/text-in phasing — and the
  // stagger is sized so the LAST line lands exactly at the timeline's end.
  const meta2 = q2('[data-founder-meta]');
  // The container itself is gated opacity: 0 at rest (closes a first-paint
  // leak — see founders.css); only the .lr-inner children are ever
  // animated, so the container needs a one-time release here, same as
  // name2's yPercent release below.
  if (meta2 instanceof HTMLElement) gsap.set(meta2, { opacity: 1 });
  const meta2Lines = meta2 instanceof HTMLElement ? wrapMetaLines(meta2) : [];
  if (meta2Lines.length) {
    const lineDuration = half * 0.7;
    const staggerSpread = half - lineDuration;
    tl.fromTo(
      meta2Lines,
      { yPercent: 110, y: 0 },
      {
        yPercent: 0,
        y: 0,
        duration: lineDuration,
        ease: LINE_REVEAL_EASE,
        stagger: meta2Lines.length > 1 ? staggerSpread / (meta2Lines.length - 1) : 0,
        immediateRender: false,
      },
      half,
    );
  }

  // Slide 2's name arrives already risen — the transition is opacity-only.
  const name2 = q2('[data-founder-name]');
  if (name2) gsap.set(name2, { yPercent: 0 });

  const marker = section.querySelector('[data-founders-marker]');
  if (marker) {
    tl.fromTo(
      marker,
      { y: 0 },
      { y: MARKER_TRAVEL, duration: TRANSITION_DURATION, ease: TRANSITION_EASE, immediateRender: false },
      0,
    );
  }

  // Threshold trigger — callbacks only, no scrub, scroll position never
  // touched (no ScrollTrigger snap config — that animates scrollTo and
  // would fight Lenis).
  ScrollTrigger.create({
    trigger: section,
    start: at(SNAP_THRESHOLD),
    end: at(SNAP_THRESHOLD),
    id: 'founders-snap',
    onEnter: () => tl.play(),
    onLeaveBack: () => tl.reverse(),
  });

  // Video lifecycle — "section active" half of the play/pause gate (the
  // other half, "slide 1 showing or transition in progress", reads tl's
  // own progress — see createFoundersVideoController's updatePlayback).
  // Rebuilt every call (like founders-snap above) so it survives
  // killFoundersTriggers(); the controller itself is NOT rebuilt (see its
  // own doc comment) — only re-pointed at the fresh section-active state.
  if (videoController) {
    const activeTrigger = ScrollTrigger.create({
      trigger: section,
      start: at(0),
      end: at(TOTAL_RUNWAY),
      id: 'founders-video-active',
      onToggle: (self) => videoController.setActive(self.isActive),
    });
    videoController.setActive(activeTrigger.isActive);
  }

  return tl;
}

/** Kill only this module's triggers (all carry a `founders-` id). */
function killFoundersTriggers() {
  ScrollTrigger.getAll().forEach((trigger) => {
    if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('founders-')) {
      trigger.kill();
    }
  });
}

/**
 * Boot the Founders section on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initFoundersScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const section = document.querySelector('body.about-page-3 [data-founders-section]');
  if (!(section instanceof HTMLElement)) return () => {};

  // Name centering is a static layout correction (derived from the
  // portrait's live rect — see centerNameOnPortrait), not a scroll
  // animation, so it runs REGARDLESS of reduced motion — including in
  // the static stacked layout below, where a slide's portrait can sit
  // at a different width/position than the scroll build assumes.
  let centeringCancelled = false;
  const runCentering = () => {
    if (centeringCancelled) return;
    section.querySelectorAll('[data-founder-slide]').forEach((slide) => {
      const clip = slide.querySelector('[data-founder-name-clip]');
      const portrait = slide.querySelector('[data-founder-portrait]');
      if (clip instanceof HTMLElement && portrait instanceof HTMLElement) {
        centerNameOnPortrait(clip, portrait);
      }
    });
  };
  document.fonts.ready.then(runCentering);
  let centeringLastW = window.innerWidth;
  const onCenteringResize = () => {
    if (window.innerWidth === centeringLastW) return;
    centeringLastW = window.innerWidth;
    runCentering();
  };
  window.addEventListener('resize', onCenteringResize);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {
      centeringCancelled = true;
      window.removeEventListener('resize', onCenteringResize);
    };
  }

  // WebGL dissolve — created ONCE (persists across trigger rebuilds; only
  // torn down with the module). null → the timeline builds the DOM
  // crossfade fallback instead.
  const stage = section.querySelector('[data-founders-stage]');
  const dissolve = stage instanceof HTMLElement ? createFoundersDissolve(stage) : null;

  // Video controller — also created ONCE, same reasoning (see its doc
  // comment). null when slide 1 has no video element.
  const videoController = createFoundersVideoController(section);

  let cancelled = false;
  /** @type {gsap.core.Timeline | undefined} */
  let transitionTl;

  const build = () => {
    if (cancelled) return;
    // If a resize lands mid-transition, the outgoing timeline dies with
    // partial values stamped on its targets — remember that so the fresh
    // timeline can be force-rendered to a resolved endpoint below.
    const prevProgress = transitionTl ? transitionTl.progress() : 0;
    killFoundersTriggers();
    transitionTl?.kill();
    transitionTl = buildFoundersTriggers(section, dissolve, videoController);
    ScrollTrigger.refresh();
    // State restoration: rebuilding (resize / late refresh) while already
    // past the threshold must resolve to slide 2 INSTANTLY — never replay
    // the transition. (The fresh trigger's onEnter may also have fired
    // during the refresh above, starting a play from 0 — this overrides
    // it in the same frame.) Below the threshold, only force-render the
    // slide-1 endpoint when the previous timeline died mid-flight — on a
    // clean build the paused-at-0 timeline must NOT render, so the
    // entrance tweens' initial CSS states stay untouched.
    // NOTE: these are playhead JUMPS — GSAP suppresses events (including the
    // proxy tween's onUpdate) on jump-renders, so the dissolve uniform must
    // be written explicitly alongside each jump; only live play()/reverse()
    // ticks fire onUpdate.
    const snap = ScrollTrigger.getById('founders-snap');
    if (snap && transitionTl) {
      if (window.scrollY >= snap.start) {
        transitionTl.progress(1).pause();
        dissolve?.setProgress(1);
      } else if (prevProgress > 0) {
        transitionTl.progress(1).progress(0).pause();
        dissolve?.setProgress(0);
      }
    }
    // Resync AFTER the state-restoration jumps above — jump-renders don't
    // fire onUpdate (see createFoundersVideoController's doc comment), so
    // without this the video could be left playing/paused against a
    // stale progress reading from before the jump.
    videoController?.setTimeline(transitionTl);
  };

  // Fonts must be ready before line-reveal wrapping measures line breaks
  // (same gate the hero uses).
  document.fonts.ready.then(build);

  // Own resize handling — deliberately separate from about-scroll.js's
  // handler (which rebuilds only the hero's triggers). Line breaks and
  // trigger positions both depend on viewport size.
  //
  // Guarded against no-op resize events (same window dimensions): a rebuild
  // mid-transition instantly resolves the snap timeline to an endpoint, so
  // spurious resize events — e.g. mobile URL-bar show/hide re-firing with
  // an unchanged width — must not tear down a playing transition.
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
    centeringCancelled = true;
    window.removeEventListener('resize', onCenteringResize);
    cancelled = true;
    window.removeEventListener('resize', onResize);
    killFoundersTriggers();
    transitionTl?.kill();
    transitionTl = undefined;
    dissolve?.destroy();
    videoController?.destroy();
    gsap.killTweensOf(
      section.querySelectorAll(
        '[data-founder-media-group], [data-founders-overlay], [data-founder-portrait], [data-founder-meta], [data-founder-name], [data-founders-index], [data-founders-marker], [data-founders-thumb-border], [data-founders-label], .lr-inner',
      ),
    );
  };
}
