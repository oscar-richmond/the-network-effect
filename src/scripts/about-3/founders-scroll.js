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
 *   600 … SNAP_THRESHOLD   slide 1 hold — Robbo's name travels down the
 *                          portrait, scroll-scrubbed (top+24 → bottom−24);
 *                          everything else stationary
 *   SNAP_THRESHOLD         name completes its travel — crossing plays the
 *                          dissolve + text swap (timed)
 *   … EXIT_START           slide 2 hold — Ashley's name runs the same
 *                          travel, but anchored to the snap's RESOLUTION
 *                          (not the threshold): pinned at top until the
 *                          timed transition completes, then the window's
 *                          remaining scroll maps onto the full travel
 *   EXIT_START … +BEAT1    exhale exit beat 1 — content departs (meta lines
 *                          bottom-up, name, index, portrait: blur+fade in
 *                          the hero-exit vocabulary, scrubbed)
 *   … TOTAL_RUNWAY         exhale exit beat 2 — the last slide's media
 *                          over-blurs while the #F9F9F9 veil ramps 0→1
 *   TOTAL_RUNWAY           teardown: stage + hero bg-fade visibility:hidden,
 *                          dissolve rAF idled (applyExitState); the in-flow
 *                          .about-landing section follows
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
/** End of the entrance choreography — slide 1's name-travel window opens
 * here (equals ENTRANCE_META's close). */
const ENTRANCE_END = 600;
/** Name travel margins — the name's top edge starts this far below the
 * portrait's top, and its bottom edge finishes this far above the
 * portrait's bottom. Travel distance is therefore viewport-derived:
 * portraitHeight − nameClipHeight − 2 × this. */
const NAME_TRAVEL_MARGIN_PX = 24;
/** Name-travel display smoothing — fraction of the remaining distance
 * to the scroll-derived target consumed per frame (lower = lazier),
 * same idiom as about-scroll.js's SCROLL_LERP. A SECOND, independent
 * smoothing layer on top of Lenis's own: Lenis (SCROLL_LERP) eases the
 * PAGE's scroll position; this eases the name clip's rendered position
 * toward whatever that (already-eased) scroll position implies, so the
 * clip visibly lags and catches up rather than tracking 1:1. 0.12 is a
 * starting point — noticeably softer than instant without reading
 * sluggish — a feel constant, retuned live same as SCROLL_LERP.
 * Boundary/threshold logic (snap firing, EXIT_START, reversal) is
 * unaffected by construction: every ScrollTrigger here keys off
 * window.scrollY, never off the clip's rendered/eased position. */
const NAME_TRAVEL_LERP = 0.12;
/** Snap-to-target threshold, px — below this the eased display jumps
 * the remaining (imperceptible) distance and stops writing to the DOM,
 * guaranteeing exact convergence (no perpetual asymptotic drift) and
 * skipping redundant per-frame writes once settled. */
const NAME_TRAVEL_LERP_EPSILON = 0.05;
/** Per-slide hold runway = each name's travel window. EQUAL for both
 * slides so the scroll-to-travel speed is identical for the identical
 * gesture (the old 700/500 split would have given Robbo a ~0.7 px/px
 * crawl and Ashley a ~0.97 near-1:1).
 *
 * EXTENDED from 600 — traced through applyTravel2/travel2PxNow: slide
 * 2's mapped span is (EXIT_START − anchor), and the anchor captures at
 * SNAP_THRESHOLD + lag, where lag ≈ scrollRate × TRANSITION_DURATION
 * (real seconds consumed by the timed dissolve before onComplete reads
 * scrollY — this shrinks the span symmetrically in both directions,
 * since reverse crawl runs the SAME anchor-to-boundary distance before
 * onLeaveBack/onReverseComplete ever fire). At the previous 600,
 * lag already exceeded half the window at a normal pace, compressing
 * the mapped span to a fraction of Robbo's full-window crawl — read as
 * "cut short," confirmed live both directions.
 *
 * Sized so the mapped span matches Robbo's original 600px crawl (the
 * already-approved reference) even after the lag, at an ASSUMED normal
 * continuous scroll rate of ~600px/sec (~1 viewport per 1.6s at this
 * page's ~962px height — a common comfortable-narrative-scroll pace;
 * this can't be measured from tooling with no working rAF, same
 * limitation as blend rendering — Oscar's real-browser number
 * recalibrates this exactly if it's still off):
 *   lag = 600 × TRANSITION_DURATION(0.7) = 420
 *   SLIDE_HOLD ≥ 600 (target span) + 420 (lag) = 1020
 * 1020 is the literal minimum from that assumption — used as-is, no
 * padding, so a shortfall directly tells us the real rate and lets the
 * next retune solve for it precisely rather than re-guessing.
 *
 * Real page-length cost, accepted: EXIT_START/TOTAL_RUNWAY grow with
 * it — see their comments for the resulting deltas. */
const SLIDE_HOLD = 1020;
/** Scroll position (px from handoff) whose crossing triggers the snap
 * transition — down past it plays 0→1, back up past it plays 1→0.
 * DERIVED, not hand-tuned: it is slide 1's travel-window close, so "the
 * name completes its travel" and "scroll crosses this point" are the
 * same event by construction. */
const SNAP_THRESHOLD = ENTRANCE_END + SLIDE_HOLD;
/** Exhale exit start (px from handoff) — slide 2's travel-window close,
 * same derivation as SNAP_THRESHOLD above. */
const EXIT_START = SNAP_THRESHOLD + SLIDE_HOLD;
/** Exit beat 1 — content departs (meta, name, index, portrait). */
const EXIT_BEAT1_PX = 420;
/** Exit beat 2 — background over-blur + #F9F9F9 veil melt. Exported (the
 * only exported constant besides initFoundersScroll): landing-scroll.js's
 * indicator-hide window mirrors this exact span, anchored backwards from
 * the shared founders/landing boundary — importing it here avoids
 * duplicating the value where a future beat-2 retune could silently
 * desync the two, the same no-duplicated-constant principle the
 * boundary's own entry gate already relies on (see landing-scroll.js). */
export const EXIT_BEAT2_PX = 360;
/** Total runway — also the section's in-flow height. */
const TOTAL_RUNWAY = EXIT_START + EXIT_BEAT1_PX + EXIT_BEAT2_PX;
/** Beat-1 sub-windows (px from handoff) — the entrance stagger mirrored:
 * meta leaves first (its lines bottom-up), name and index next, the
 * portrait last; each window overlaps the next like the entrance does. */
const EXIT_META = [EXIT_START, EXIT_START + 260];
const EXIT_NAME = [EXIT_START + 80, EXIT_START + 320];
const EXIT_INDEX = [EXIT_START + 80, EXIT_START + 320];
const EXIT_PORTRAIT = [EXIT_START + 140, EXIT_START + EXIT_BEAT1_PX];
/** Beat-2 window (px from handoff). */
const EXIT_BG = [EXIT_START + EXIT_BEAT1_PX, TOTAL_RUNWAY];
/** Blur endpoint for the departing text/name/index — the same 10px the
 * hero's phase-C exit wipe uses (about-scroll.js's EXIT_BLUR_PX, itself
 * sampled from the rolling word's .is-exiting treatment). */
const EXIT_TEXT_BLUR_PX = 10;
/** Beat-2 target radius for the last slide's media — deepens from the
 * resting --founders-blur-px (125, read live from the CSS custom
 * property) so the image melts into the veil rather than being covered
 * by it. SAFETY VALVE: set equal to the resting value (125) to make the
 * radius animation a no-op (veil-only melt) if beat-2 frame timing ever
 * measures poorly — the visual delta is small at this baseline blur. */
const EXIT_MEDIA_BLUR_PX = 250;
/** Per-line stagger for the beat-1 meta wipe, in timeline-seconds (scrub
 * normalizes the total to the trigger window; only the ratio to the 1s
 * line duration matters — 0.5 = overlapping bottom-up sweep, same as the
 * hero's WIPE_STAGGER). */
const EXIT_WIPE_STAGGER = 0.5;
/** Snap transition length, seconds. Text phasing mirrors the old scrubbed
 * midpoint: outgoing text in the first half, incoming from the midpoint.
 *
 * Lowered from 1.2: this is TIME consumed in real seconds while
 * SLIDE_HOLD (the scroll-px window either name's travel maps onto) stays
 * fixed. Slide 2's travel is anchored to the transition's RESOLUTION
 * (see travel2AnchorPx below) — at any continuous scroll speed, real
 * scroll distance keeps accruing for the full TRANSITION_DURATION before
 * the anchor is captured, and that consumed distance is what's left
 * over for visible mapped travel in the remaining
 * [anchor, EXIT_START] window. A shorter duration leaves more of
 * SLIDE_HOLD's 600px for travel at any given scroll speed — zero
 * scroll-px/page-length cost, since duration is a time value, not a
 * position. Symmetric for the reverse case (onReverseComplete gates the
 * same way). Cheapest fix for the travel-runway-timing bug; if 0.7s
 * doesn't give comfortable travel visibility at normal scroll speed,
 * the next lever is extending SLIDE_HOLD (real page-length cost). */
const TRANSITION_DURATION = 0.7;
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
 * A name-travel clip's scroll-derived TARGET (`target.top`, written by the
 * scrub tween or applyTravel2 — unchanged, still 1:1 with scroll) versus
 * its eased DISPLAY (`display`/`clip.style.top`, written only by
 * tickNameTravel or forceSyncNameTravel below). Kept as separate numbers
 * so easing the render never touches what the scroll-position math reads.
 * @typedef {{ clip: HTMLElement, topStart: number, topEnd: number, target: { top: number }, display: number }} NameTravel
 */

/**
 * Snaps a name-travel clip's DISPLAY straight to its current TARGET,
 * bypassing the per-frame lerp — for every context that already does an
 * instant jump elsewhere (hard-fling resolution, rebuild/resize
 * restoration): the eased catch-up must never be visible on top of an
 * otherwise-instant state resolution.
 * @param {NameTravel | null | undefined} travel
 */
function forceSyncNameTravel(travel) {
  if (!travel) return;
  travel.display = travel.target.top;
  travel.clip.style.top = `${travel.display}px`;
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
 * @param {(done: boolean) => void} applyExitState exit-completion teardown/restore (owned by initFoundersScroll)
 * @returns {{ tl: gsap.core.Timeline | undefined, travel1: NameTravel | null, travel2: NameTravel | null } | undefined}
 *   tl: the snap transition timeline (kill on rebuild). travel1/travel2:
 *   fresh name-travel refs for initFoundersScroll's ticker/force-sync
 *   (undefined, not this shape, if the section has fewer than 2 slides).
 */
function buildFoundersTriggers(section, dissolve, videoController, applyExitState) {
  const slides = Array.from(section.querySelectorAll('[data-founder-slide]'));
  if (slides.length < 2) return;
  const [slide1, slide2] = slides;
  // The exhale exit always targets the FINAL slide, whatever it is — a
  // third founder changes the snap logic (future work), not the exit.
  const lastSlide = slides.at(-1);
  const qLast = (sel) => lastSlide.querySelector(sel);

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

  // ── Scroll-scrubbed name travel (both slides' hold windows) ──────────
  // Each name rides its hold window down the portrait: top edge starting
  // NAME_TRAVEL_MARGIN_PX below the portrait's top, bottom edge finishing
  // the same margin above its bottom. Endpoints derived live from rects
  // (same pattern as centerNameOnPortrait), so they hold for any name/
  // portrait size and self-correct on resize rebuilds.
  //
  // BLEND SAFETY — the travel drives `top` (px) on the NAME-CLIP, the
  // exact element+property-class centerNameOnPortrait already uses for
  // `left`: layout properties never create a stacking context on this
  // blend ancestor, unlike transform (see centerNameOnPortrait's doc
  // comment and founders.css's name-clip z-index note). Ownership stays
  // disjoint: clip left = centering, clip top = this travel, span
  // transform = entrance rise, span opacity/filter = snap timeline +
  // exhale exit. The blend visibly shifting as the name traverses image
  // tones is intentional and accepted, not a defect.
  //
  // Fling behaviour needs no guard of its own: these are plain scrubs,
  // so a hard jump clamps them to the window edge in the same update
  // pass that ensureSnapResolved stamps the snap's endpoint — the names
  // land exactly where the resolved state expects them.
  const measureNameTravel = (slide) => {
    if (!(slide instanceof HTMLElement)) return null;
    const clip = slide.querySelector('[data-founder-name-clip]');
    const portrait = slide.querySelector('[data-founder-portrait]');
    if (!(clip instanceof HTMLElement) || !(portrait instanceof HTMLElement)) return null;
    const slideRect = slide.getBoundingClientRect();
    const portraitRect = portrait.getBoundingClientRect();
    const clipHeight = clip.getBoundingClientRect().height;
    // The travel windows open only after the entrance completes, so the
    // endpoints must be derived from the portrait's SETTLED layout
    // position — but slide 1's entrance tween stamps its from-state
    // (y: 48) the moment it's created just above, and a rebuild can land
    // mid-scrub at any y. Subtracting the live GSAP y at measurement
    // time yields the y-0 layout rect in every case (slide 2's portrait
    // has no y tween; subtracting its 0 is a no-op). Measured live:
    // without this, slide 1's endpoints sat exactly 48px low — a 72px
    // top margin and a 24px overshoot past the portrait's bottom.
    const portraitY = Number(gsap.getProperty(portrait, 'y')) || 0;
    const topStart = portraitRect.top - portraitY - slideRect.top + NAME_TRAVEL_MARGIN_PX;
    const topEnd =
      portraitRect.bottom - portraitY - slideRect.top - NAME_TRAVEL_MARGIN_PX - clipHeight;
    // Inline start position immediately (replacing the CSS resting top,
    // which remains the reduced-motion/static state) — the name is still
    // invisible pre-entrance, and on mid-travel resize rebuilds the
    // refresh at the end of build() re-renders the correct value in the
    // same frame, so neither path can paint a wrong-position frame.
    clip.style.top = `${topStart}px`;
    return { clip, topStart, topEnd, target: { top: topStart }, display: topStart };
  };

  // Slide 1 — a plain scrub: his travel window IS the hold window by
  // construction (its close defines SNAP_THRESHOLD). Targets `target`
  // (a plain object), NOT the clip directly — the scroll-to-target
  // mapping stays exactly 1:1/instant as before; only the RENDER of
  // `target.top` onto the clip is eased, by the shared tickNameTravel
  // ticker below (registered once in initFoundersScroll).
  const travel1 = measureNameTravel(slide1);
  if (travel1) {
    gsap.fromTo(
      travel1.target,
      { top: travel1.topStart },
      {
        top: travel1.topEnd,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: scrub(ENTRANCE_END, SNAP_THRESHOLD, 'name-travel-1'),
      },
    );
  }

  // Slide 2's travel is NOT a plain scrub — it's anchored to the snap's
  // RESOLUTION, created after the snap timeline below so it can observe
  // it. See the "slide 2 name travel" block after the snap trigger.
  const travel2 = measureNameTravel(lastSlide);

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

  // ── Slide 2 name travel — anchored to the snap's RESOLUTION ─────────
  // A plain [SNAP_THRESHOLD, EXIT_START] scrub would let scroll consumed
  // DURING the 1.2s timed transition eat into the travel window, so the
  // name would fade in already mid-portrait. Instead the outer trigger
  // window stays static (EXIT_START and everything downstream untouched)
  // and position is a pure function of (scroll px, anchor):
  //
  //   anchor == null   → snap unresolved → pinned at topStart. This is
  //                      what guarantees the name is AT the top whenever
  //                      it becomes visible — the fade-in happens while
  //                      the transition plays, i.e. strictly pre-anchor.
  //   anchor == px₀    → the px-from-handoff at which the snap RESOLVED;
  //                      the window's remaining scroll [px₀, EXIT_START]
  //                      maps linearly onto the full travel (slightly
  //                      faster than slide 1's — accepted trade).
  //
  // Anchor lifecycle: set from live scroll on the timeline's natural
  // onComplete; set to the CANONICAL SNAP_THRESHOLD by ensureSnapResolved
  // (hard flings — full-window mapping, so a reverse walk out of the
  // exit range travels smoothly bottom → top) and by onRefresh on
  // rebuild-restoration when already past the threshold (same canonical
  // rule build()'s tl.progress(1) restoration implies; playhead JUMPS
  // suppress onComplete, so those sites must set it explicitly — same
  // GSAP rule the dissolve-uniform resyncs follow). Cleared on
  // onReverseComplete so the next forward pass re-anchors fresh.
  //
  // Reversal symmetry: scrolling up, the mapping returns the name to
  // topStart at px₀ — above SNAP_THRESHOLD by construction — so it is
  // already at the top BEFORE the reverse transition can play.
  //
  // Same blend-safety contract as slide 1: a plain `top` number, no
  // transforms, no new properties on any blend ancestor. Writes
  // travel2.target ONLY (the eased render is tickNameTravel's job) —
  // EXCEPT the two rebuild/fling call sites below, which force-sync the
  // display too: those are already-instant jumps elsewhere in this
  // function, and the eased catch-up must never be visible on top of one.
  let travel2AnchorPx = null;
  /** @type {ScrollTrigger | undefined} */
  let travel2Trigger;
  const travel2PxNow = () =>
    travel2Trigger ? SNAP_THRESHOLD + (window.scrollY - travel2Trigger.start) : SNAP_THRESHOLD;
  const applyTravel2 = (px) => {
    if (!travel2) return;
    let progress = 0;
    if (travel2AnchorPx !== null) {
      const start = Math.min(Math.max(travel2AnchorPx, SNAP_THRESHOLD), EXIT_START);
      const span = EXIT_START - start;
      progress = span > 0 ? Math.min(Math.max((px - start) / span, 0), 1) : 1;
    }
    travel2.target.top = travel2.topStart + progress * (travel2.topEnd - travel2.topStart);
  };
  if (travel2) {
    tl.eventCallback('onComplete', () => {
      // Clamp the capture: a completion registered at/past EXIT_START
      // (fling-adjacent paths — measured live: ensureSnapResolved's
      // progress(1) jump CAN fire this with the deep-exit px, despite
      // jumps suppressing onUpdate) would leave a degenerate zero-width
      // window that maps the whole hold to the bottom position and
      // breaks the reverse walk. Fall back to the canonical full-window
      // anchor in that case, same as the fling guard.
      const px = travel2PxNow();
      travel2AnchorPx = px < EXIT_START ? px : SNAP_THRESHOLD;
      applyTravel2(travel2PxNow());
    });
    tl.eventCallback('onReverseComplete', () => {
      travel2AnchorPx = null;
      applyTravel2(travel2PxNow());
    });
    travel2Trigger = ScrollTrigger.create({
      trigger: section,
      start: at(SNAP_THRESHOLD),
      end: at(EXIT_START),
      id: 'founders-name-travel-2',
      onUpdate: () => applyTravel2(travel2PxNow()),
      onRefresh: (self) => {
        const px = SNAP_THRESHOLD + (window.scrollY - self.start);
        // Rebuild/reload restoration: past the threshold with no anchor
        // means build() is about to (or just did) stamp the snap
        // resolved — adopt the canonical full-window mapping. (A live
        // refresh mid-transition would adopt it a beat early; only
        // reachable via a resize burst mid-snap, which rebuilds this
        // whole module anyway.)
        if (travel2AnchorPx === null && px >= SNAP_THRESHOLD) travel2AnchorPx = SNAP_THRESHOLD;
        applyTravel2(px);
      },
    });
  }

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

  // ── Exhale exit: beat 1 (content departs) + beat 2 (melt to #F9F9F9) ──
  // All scrubbed, fully reversible. Every exit trigger runs the fling
  // guard on entry: a hard fling from slide 1 can land scroll in the exit
  // range while the snap timeline is still mid-play — the exit tweens
  // assume the resolved slide-2 endpoint (name/meta at their snap end
  // values, video paused via the progress gate), so the snap is force-
  // resolved before any exit tween paints. Idempotent; a no-op in every
  // ordinary crossing (the snap resolved ~500px of scroll earlier).
  const ensureSnapResolved = () => {
    if (tl.progress() < 0.999) {
      // Whether the anchor was set before this jump must be read BEFORE
      // progress(1): the jump suppresses onUpdate but (measured live)
      // CAN fire onComplete, whose handler writes the anchor — reading
      // afterwards would mistake that side effect for a real pre-fling
      // resolution.
      const hadAnchor = travel2AnchorPx !== null;
      tl.progress(1).pause();
      // Write the dissolve uniform and resync the video's play/pause
      // gate explicitly (jump-suppressed onUpdate — same rule as
      // build()'s state restoration), and anchor slide 2's name travel
      // canonically: the fling landed deep, so the full-window mapping
      // puts the name at the bottom here (consistent with the resolved
      // endpoint the exit tweens assume) and gives a smooth
      // bottom → top reverse walk.
      dissolve?.setProgress(1);
      videoController?.setTimeline(tl);
      if (!hadAnchor) travel2AnchorPx = SNAP_THRESHOLD;
      applyTravel2(travel2PxNow());
      // Force the DISPLAY to the resolved endpoint too — a hard fling is
      // an instant state resolution everywhere else (dissolve, video,
      // exit tweens all snap); the eased catch-up must not be visibly
      // lagging behind that on top of it.
      forceSyncNameTravel(travel2);
    }
  };
  const exitScrub = (start, end, id) => ({
    ...scrub(start, end, id),
    onEnter: ensureSnapResolved,
  });

  // Beat 1a — the last slide's meta lines, bottom-up, in the hero-exit
  // vocabulary (about-scroll.js's buildExitWipe: opacity + blur(10px)
  // together per line, reversed order, overlapping stagger, ease none).
  // Targets the .lr-clip wrappers while the snap timeline owns the
  // .lr-inner transforms — the same clip/inner property split the hero
  // uses between its exit wipe and the line-reveal entrance, so the two
  // never fight over a property.
  const lastMeta = qLast('[data-founder-meta]');
  const exitMetaClips =
    lastMeta instanceof HTMLElement
      ? Array.from(lastMeta.querySelectorAll('.lr-clip')).reverse()
      : [];
  if (exitMetaClips.length) {
    const exitMetaTl = gsap.timeline({
      scrollTrigger: exitScrub(...EXIT_META, 'exit-meta'),
    });
    exitMetaClips.forEach((clip, i) => {
      exitMetaTl.fromTo(
        clip,
        { opacity: 1, filter: 'blur(0px)' },
        {
          opacity: 0,
          filter: `blur(${EXIT_TEXT_BLUR_PX}px)`,
          ease: 'none',
          duration: 1,
          immediateRender: false,
        },
        i * EXIT_WIPE_STAGGER,
      );
    });
  }

  // Beat 1b — the name departs on SELF properties only (it carries the
  // difference blend; self opacity/filter never isolate a blend from its
  // backdrop, unlike an animated ancestor — the filtered result still
  // composites difference against the media+overlay beneath until it's
  // fully gone). Shares its opacity with the snap timeline's textIn tween
  // — safe: non-overlapping scroll ranges, and the fling guard stamps the
  // snap's end value before this scrub's window can paint.
  const lastName = qLast('[data-founder-name]');
  if (lastName) {
    gsap.fromTo(
      lastName,
      { opacity: 1, filter: 'blur(0px)' },
      {
        opacity: 0,
        filter: `blur(${EXIT_TEXT_BLUR_PX}px)`,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: exitScrub(...EXIT_NAME, 'exit-name'),
      },
    );
  }

  // Beat 1c — the index block as one unit.
  if (index) {
    gsap.fromTo(
      index,
      { opacity: 1, filter: 'blur(0px)' },
      {
        opacity: 0,
        filter: `blur(${EXIT_TEXT_BLUR_PX}px)`,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: exitScrub(...EXIT_INDEX, 'exit-index'),
      },
    );
  }

  // Beat 1d — the portrait exits blur-to-soft + fade: the entrance's
  // blur-to-sharp mirrored (same 10px endpoint). WHICH element carries it
  // depends on the path: with WebGL, slide 1's wrapper — the plane's
  // per-frame PROXY (founders-dissolve.js mirrors its computed opacity
  // into uAlpha and its blur into uBlurPx; at uProgress 1 the amended
  // shader applies those taps to the TO texture, i.e. the portrait
  // actually showing). Its own opacity is still 1 here (the WebGL snap
  // path never touches it), so fromTo { opacity: 1 } matches. On the DOM
  // fallback the visible portrait is the LAST slide's (crossfaded to 1
  // by the snap timeline), so the tween targets that instead — targeting
  // both unconditionally would stamp opacity 1 back onto slide 1's
  // crossfaded-out portrait on the fallback path.
  const exitPortrait = dissolve ? portrait1 : qLast('[data-founder-portrait]');
  if (exitPortrait) {
    gsap.fromTo(
      exitPortrait,
      { opacity: 1, filter: 'blur(0px)' },
      {
        opacity: 0,
        filter: `blur(${PORTRAIT_ENTRANCE_BLUR_PX}px)`,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: exitScrub(...EXIT_PORTRAIT, 'exit-portrait'),
      },
    );
  }

  // Beat 2 — the last slide's media over-blurs (resting radius → target,
  // read live from --founders-blur-px so the from-value always equals the
  // CSS resting state) while the #F9F9F9 veil ramps over it: the image
  // melts into the base colour rather than being covered by a shape. Only
  // THIS media animates — slide 1's stays at its static (cached) blur,
  // paused video beneath, fully occluded. By beat 2 all content is gone
  // (beat 1), so the veil never covers or blend-isolates anything visible.
  const lastMedia = qLast('[data-founder-media]');
  const veil = section.querySelector('[data-founders-exit-veil]');
  if (lastMedia && veil) {
    const restingBlurPx =
      parseFloat(getComputedStyle(section).getPropertyValue('--founders-blur-px')) || 125;
    const exitBgTl = gsap.timeline({
      scrollTrigger: exitScrub(...EXIT_BG, 'exit-bg'),
    });
    exitBgTl.fromTo(
      lastMedia,
      { filter: `blur(${restingBlurPx}px)` },
      { filter: `blur(${EXIT_MEDIA_BLUR_PX}px)`, ease: 'none', duration: 1, immediateRender: false },
      0,
    );
    exitBgTl.fromTo(
      veil,
      { opacity: 0 },
      { opacity: 1, ease: 'none', duration: 1, immediateRender: false },
      0,
    );
  }

  // Exit completion — point trigger at the runway's end. Teardown going
  // down; restore going up. Flash-free by construction: at this anchor
  // the veil is at opacity 1 (its scrub ends exactly here), so hidden
  // stage (body #F9F9F9 shows) and restored stage (veil #F9F9F9 shows)
  // are pixel-identical, and both the visibility flip and any first veil
  // scrub-back happen in the same frame's style flush. onEnter also
  // self-fires during build()'s refresh when the page loads/rebuilds
  // already past this point; the stale-hidden inverse case (rebuild below
  // the anchor) is handled by build()'s explicit applyExitState call.
  ScrollTrigger.create({
    trigger: section,
    start: at(TOTAL_RUNWAY),
    end: at(TOTAL_RUNWAY),
    id: 'founders-exit-end',
    onEnter: () => applyExitState(true),
    onLeaveBack: () => applyExitState(false),
  });

  return { tl, travel1, travel2 };
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

  // Exit-completion teardown/restore — idempotent both ways, owned here
  // (not per-build) because it touches module-lifetime objects: the
  // stage, the dissolve's rAF loop, and the hero's fixed bg-fade (z 50),
  // which would otherwise paint its blurred frame over the in-flow
  // landing once the stage hides (finding confirmed in the exit plan —
  // the hero never fades it back out; hiding it here is invisible
  // because the stage's opaque media covers it everywhere near the
  // exit). No hero logic changes: visibility only, on the element.
  // The video needs nothing here — it's already paused by the progress
  // gate (tl.progress() === 1) long before the exit range.
  const bgFade = document.querySelector('body.about-page-3 [data-about-hero-bg-fade]');
  const applyExitState = (done) => {
    if (stage instanceof HTMLElement) stage.style.visibility = done ? 'hidden' : '';
    if (bgFade instanceof HTMLElement) bgFade.style.visibility = done ? 'hidden' : '';
    dissolve?.setPaused(done);
    // Broadcasts this exact state transition so a downstream section (the
    // /about-3 landing stage) can make its own reveal a direct function
    // of THIS one, rather than a second, independently-computed
    // ScrollTrigger that merely happens to land on the same scroll
    // position — closing off any risk of the two ever firing a tick
    // apart. See landing-scroll.js's listener for the consumer side.
    document.dispatchEvent(new CustomEvent('about-founders:exit-state', { detail: { done } }));
  };

  let cancelled = false;
  /** @type {gsap.core.Timeline | undefined} */
  let transitionTl;
  /** @type {NameTravel | null} */
  let travel1Ref = null;
  /** @type {NameTravel | null} */
  let travel2Ref = null;

  // Name-travel display easing — registered ONCE, module-instance
  // lifetime (like dissolve/videoController below), not per-build: it
  // reads travel1Ref/travel2Ref through this closure, so build()
  // re-pointing those on every rebuild is all a resize needs — no
  // duplicate/stale ticker registrations to manage. See
  // NAME_TRAVEL_LERP's comment for why this exists (a second, secondary
  // smoothing layer on top of Lenis's own) and forceSyncNameTravel's
  // comment for the instant-jump contexts this does NOT apply to.
  const tickNameTravel = () => {
    [travel1Ref, travel2Ref].forEach((travel) => {
      if (!travel) return;
      const delta = travel.target.top - travel.display;
      if (Math.abs(delta) < NAME_TRAVEL_LERP_EPSILON) {
        if (travel.display !== travel.target.top) forceSyncNameTravel(travel);
        return;
      }
      travel.display += delta * NAME_TRAVEL_LERP;
      travel.clip.style.top = `${travel.display}px`;
    });
  };
  gsap.ticker.add(tickNameTravel);

  const build = () => {
    if (cancelled) return;
    // If a resize lands mid-transition, the outgoing timeline dies with
    // partial values stamped on its targets — remember that so the fresh
    // timeline can be force-rendered to a resolved endpoint below.
    const prevProgress = transitionTl ? transitionTl.progress() : 0;
    killFoundersTriggers();
    transitionTl?.kill();
    const built = buildFoundersTriggers(section, dissolve, videoController, applyExitState);
    transitionTl = built?.tl;
    travel1Ref = built?.travel1 ?? null;
    travel2Ref = built?.travel2 ?? null;
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
    // Exit-state restoration, both directions: the fresh exit-end trigger
    // self-fires onEnter during the refresh above when already past it,
    // but the inverse (rebuilding BELOW the anchor while the stage carries
    // a stale visibility:hidden from before the rebuild) fires nothing —
    // derive the correct state from the live scroll position explicitly.
    const exitEnd = ScrollTrigger.getById('founders-exit-end');
    if (exitEnd) applyExitState(window.scrollY >= exitEnd.start);
    // Force both name-travel displays to their (by-now-correct, per the
    // refresh + restoration above) targets — a rebuild must never show
    // the eased ticker visibly re-animating toward the fresh position;
    // it should already just BE there, same as every other element here.
    forceSyncNameTravel(travel1Ref);
    forceSyncNameTravel(travel2Ref);
  };

  // Fonts must be ready before line-reveal wrapping measures line breaks
  // (same gate the hero uses) — AND the hero's own scroll sequence must
  // have set its FINAL spacer height before this section's entrance
  // ScrollTriggers are built: their `top+=X bottom` positions are computed
  // relative to the document height above this section, which is still the
  // hero spacer's small `100vh` CSS default at fonts.ready time (the hero's
  // multi-second reveal timeline — and the resize-triggered
  // initHeroImageScroll() that sizes the spacer to the full scroll-sequence
  // height, about-scroll.js — both finish well after fonts load). Building
  // against that placeholder height can compute a start/end pair already
  // behind scroll 0, which renders the entrance tweens at full opacity
  // immediately — flashing this section's content over the hero until a
  // later refresh recomputes the (by-then-correct, much taller) positions
  // and snaps it back to hidden. `about-3:hero-scroll-ready`
  // (about-scroll.js) fires right after it sets that final height; the
  // existing-height check covers this script attaching after that already
  // happened.
  const whenHeroScrollReady = () =>
    new Promise((resolve) => {
      if (document.querySelector('body.about-page-3 [data-about-hero-spacer]')?.style.height) {
        resolve();
        return;
      }
      document.addEventListener('about-3:hero-scroll-ready', () => resolve(), { once: true });
    });
  Promise.all([document.fonts.ready, whenHeroScrollReady()]).then(build);

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
    // Restore before teardown — clears the stage/bg-fade inline
    // visibility and resumes the rAF so dissolve.destroy() below runs
    // against a live module (also leaves no stale styles for a future
    // re-init to trip over).
    applyExitState(false);
    killFoundersTriggers();
    transitionTl?.kill();
    transitionTl = undefined;
    gsap.ticker.remove(tickNameTravel);
    travel1Ref = null;
    travel2Ref = null;
    dissolve?.destroy();
    videoController?.destroy();
    gsap.killTweensOf(
      section.querySelectorAll(
        '[data-founder-media-group], [data-founders-overlay], [data-founder-portrait], [data-founder-meta], [data-founder-name], [data-founder-name-clip], [data-founder-media], [data-founders-index], [data-founders-marker], [data-founders-thumb-border], [data-founders-label], [data-founders-exit-veil], .lr-inner, .lr-clip',
      ),
    );
  };
}
