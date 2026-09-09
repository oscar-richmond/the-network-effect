/**
 * FOUNDERS SECTION — entrance choreography (/landing).
 *
 * The page's established vocabulary only, nothing new: the headline
 * lines get the site-wide line-reveal (clip + rise, 120ms stagger —
 * the same mechanism the hero copy uses), the buttons fade-rise like
 * the chrome items across the site, and the images plain-fade like
 * the photo slots. The relative timings are the hero's own entry
 * slots (lines at 0, buttons at 680ms + 120ms stagger, images at
 * 1040ms), re-anchored to the moment the section scrolls into view.
 *
 * The trigger is a one-shot ScrollTrigger (enter at 65% viewport) —
 * an ENTRANCE, not a scrub: it plays once, like the hero's load
 * choreography, and never reverses.
 *
 * Reduced motion: no triggers, no hidden states (CSS gates those
 * under no-preference) — the section renders complete and static.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { isMobileViewport, isPhoneViewport } from './viewport.js';
import { getLenisInstance } from './site-scroll.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const BUTTONS_AT_MS = 680;
const BUTTONS_STAGGER_MS = 120;
const IMAGES_AT_MS = 1040;

/**
 * Entry drift (Oscar's rev): while the section scrolls up over the
 * held video, each item lags behind at its own pace and lands on its
 * design position exactly as the section becomes fully visible
 * (section top reaching the viewport top — the same scroll position
 * where the crossing runway ends). Values are the per-item drift in
 * px at the moment the section's top edge enters the viewport;
 * larger = lazier. Tunables.
 *
 * The two PORTRAITS drift via `top` (layout), NOT transform: they
 * contain the difference-blended hover names, and a transformed
 * ancestor creates a stacking context that isolates a blend — the
 * codebase's six-regression class. The blend-free layers use
 * transforms as normal.
 */
/* R26 (Oscar, 2026-09-03): exported — landing-hero-scroll.js derives
   WHO WE ARE's first-ink crossing from this drift (the label rides it). */
export const DRIFT_HEADLINE_PX = 60;
const DRIFT_CTAS_PX = 110;
const DRIFT_ROBBO_PX = 140;
const DRIFT_ASHLEY_PX = 170;
const DRIFT_PHOTO_PX = 200;

/**
 * The landed dwell and the exit (Oscar's rev): once the items land
 * (section fully in view, sticky engaged) the page "resists" for
 * FOUNDERS_HOLD_PX of scroll — nothing moves, the catch — then over
 * FOUNDERS_EXIT_PX every item scrolls up and off at its own pace
 * (each travels exactly its own clearance over the same window, so
 * they leave together at different speeds — the entry mirrored) and
 * the ground fades #161616 -> the hero grey. R22: the sticky RELEASES
 * at FOUNDERS_RELEASE_PX (760) into the exit, when the photo has
 * cleared — keep HOLD/RELEASE in step with the track height in
 * landing.css.
 */
const FOUNDERS_HOLD_PX = 250;
const FOUNDERS_EXIT_PX = 900;
const SECTION_ENTRY_PX_FALLBACK = 1049; // section height fallback

/**
 * Exit travels (Oscar's rev of the rev — the clearance-based exit was
 * too strong, the bottom items overtook everything and overlapped).
 * Fixed, gentler distances over the exit window, ordered so HIGHER
 * items move FASTER — the only ordering that can never overlap while
 * exiting upward: the headline leads, buttons follow, the two
 * portraits at their own paces, the big photo slowest. Items no
 * longer need to clear the screen inside the window: the sticky
 * release carries the section (and whatever is still visible) off
 * naturally, with the headline dissolving into the by-then matching
 * ground. Tunables.
 */
const EXIT_HEADLINE_PX = 420;
const EXIT_CTAS_PX = 300;
const EXIT_ROBBO_PX = 220;
const EXIT_ASHLEY_PX = 180;
/* R22 (Oscar, 2026-09-03): the big photo LEAVES WITH THE OTHERS — its
   rise is triggered at the same exit start (holdEnd) as every other
   item, at its own pace: the lowest item, so the slowest (the
   never-overlap ordering above), a touch under Ashley's 180. Tunable.
   Before R22 it stayed fixed through the whole 900 exit and only
   moved when the sticky released (trigger holdEnd + 900); now the
   trigger is holdEnd itself, the shared 250 hold. */
const EXIT_PHOTO_PX = 150;

/**
 * Exit blur (Oscar's rev): as each LEFT item starts its exit travel it
 * blurs away — the portrait names' blur vocabulary (the shared 3px),
 * scrubbed against scroll rather than clocked, each over its own
 * scroll distance so the speeds differ with the travel paces (the
 * faster the mover, the quicker the dissolve). The ground fade is
 * gone (stays #161616). Portrait blurs target the CROP spans, never
 * the figures: a filtered/faded ancestor would isolate the
 * difference-blended names (the six-regression class).
 *
 * R22 (Oscar, 2026-09-03): the big PHOTO blurs too, in the same
 * vocabulary, slightly later than the rest: it stays SHARP until the
 * headline's ("NEARLY 20 YEARS…") TOP INK reaches the BOTTOM OF THE
 * NAV, then blur-fades, and is the LAST element to clear — fully out
 * EXIT_PHOTO_BLUR_LAG_PX after the slowest other blur (Ashley's 700)
 * completes. The start is DERIVED from measured geometry at init, not
 * a scroll offset: the headline's first line box top within the
 * section (the section pins at viewport top 0) + the face's ink inset
 * (HEADLINE_INK_INSET_PX — Dazzed 56/50's cap top sits 8 below the
 * line box, pixel-measured at 1728; the in-shell 1512 renders the
 * same px grammar) against the nav bar's live bottom, converted to
 * exit progress through the headline's own EXIT travel:
 *   blurStart = (inkTop − navBottom) / EXIT_HEADLINE_PX × EXIT_PX
 * Both the rise and the blur sit on the section's one scrub timeline,
 * so they cannot desync and reverse mirrored (last to leave, first
 * to return). The photo has no blended descendants (a bare <img>),
 * so filtering it isolates nothing.
 */
const EXIT_BLUR_PX = 3;
const EXIT_BLUR_HEADLINE_PX = 450;
const EXIT_BLUR_CTAS_PX = 550;
const EXIT_BLUR_ROBBO_PX = 650;
const EXIT_BLUR_ASHLEY_PX = 700;
const EXIT_PHOTO_BLUR_LAG_PX = 60;
const HEADLINE_INK_INSET_PX = 8;

/**
 * THE RELEASE (Oscar, 2026-09-03: "once the photo clears, bring the
 * section below in so it's seamless"): the sticky pin lets go the
 * moment the photo — the last element — is fully out, not at the end
 * of the 900 exit window. The track is section + HOLD + RELEASE
 * (landing.css keeps the same three numbers); the exit window stays
 * 900 so every other item's pace is untouched — its last 140 play
 * after the release, on items that are all invisible by 700. The
 * handoff settle's back target is this release point too (the
 * section flush, everything cleared), so no partially-faded image can
 * ever be a resting state.
 */
export const FOUNDERS_RELEASE_PX = EXIT_BLUR_ASHLEY_PX + EXIT_PHOTO_BLUR_LAG_PX;

/* THE REBUILD (2026-09-07): below the seam the section runs the desktop's
   ENTRY DRIFT only (see the narrow branch in init) — the amplitudes above,
   scaled to the phone's shorter travel. The retired mobile design's photo
   expansion (its FD_M_* constants) is gone. */
const DRIFT_SCALE_NARROW = 0.6;

/**
 * WHO WE ARE → OUR NETWORK handoff (Oscar, 2026-08-27). ONE line
 * governs both halves of the rule: the departing image's bottom
 * edge crossing the viewport's lower-third line. Above it (bottom
 * < ⅔vh) the network's entrance may play and an idle settle
 * completes the handoff forward; below it, the settle returns the
 * image fully into view. FOUNDERS_HANDOFF_T is the fraction of
 * viewport height that line sits above the bottom edge — the
 * natural candidate per the ruling, and the one knob to move it.
 * landing-network.js imports it so the entrance gate and the
 * settle threshold can never drift apart. Idle/duration follow
 * the reel snap grammar (SNAP_IDLE_MS / SNAP_DURATION_S).
 */
export const FOUNDERS_HANDOFF_T = 1 / 3;

/** R21 (Oscar, 2026-09-02): the departing IMAGE's bottom edge in
 *  viewport px. R22: the photo now rises and blur-fades out with the
 *  exit (it is transparent by the release), so its LIVE rect would
 *  read 150 high and describe an invisible element — the edge is the
 *  photo's LAYOUT SLOT instead: the section's bottom edge minus the
 *  photo's inset (24), the same document anchor landing-network.js
 *  derives its entrance gate from, so the two can never drift. The
 *  track's bottom is the fallback when the section is missing. */
export function foundersDepartingEdge() {
  const section = document.querySelector('[data-landing-founders]');
  if (section instanceof HTMLElement) {
    return section.getBoundingClientRect().bottom - foundersDepartingEdgeInsetPx();
  }
  const track = document.querySelector('[data-landing-founders-track]');
  return track instanceof HTMLElement ? track.getBoundingClientRect().bottom : 0;
}

/** The photo's bottom edge measured UP from the section's (and so the
 *  track's) bottom edge, in layout px — 24 in the frame's geometry. A
 *  ScrollTrigger start must be a DOCUMENT position: while the section
 *  is pinned the photo's viewport rect does not move with scroll, so
 *  the network's gate derives its scroll anchor from the track's edge
 *  (in flow, scroll-linear) minus this inset — the photo's edge is
 *  exactly there once the section has released. */
export function foundersDepartingEdgeInsetPx() {
  const section = document.querySelector('[data-landing-founders]');
  const photo = section?.querySelector('.landing-founders__photo');
  if (!(section instanceof HTMLElement) || !(photo instanceof HTMLElement)) return 0;
  return Math.max(0, section.offsetHeight - (photo.offsetTop + photo.offsetHeight));
}
/** The phone pin's sticky top in px at the last build (W1: the centred
 *  block's top, clamped at the nav) — landing-network.js derives its
 *  overlap from it so its stage pins beneath at the same scroll. 0 until
 *  the phone branch has run. */
let lastPhonePinTopPx = 0;
export function foundersPhonePinTopPx() {
  return lastPhonePinTopPx;
}
const FOUNDERS_HANDOFF_IDLE_MS = 150;
const FOUNDERS_HANDOFF_SETTLE_S = 0.6;

export function initLandingFounders() {
  const section = document.querySelector('[data-landing-founders]');
  if (!(section instanceof HTMLElement)) return () => {};

  const lines = Array.from(section.querySelectorAll('.landing-founders__line'));
  const buttons = Array.from(section.querySelectorAll('.landing-founders__btn'));
  const images = Array.from(section.querySelectorAll('[data-landing-founders-img]'));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── WHO WE ARE → OUR NETWORK handoff settle (Oscar 2026-08-27):
     the boundary may never REST mid-viewport — stopped past the
     third-line threshold the page settles forward (image out, Our
     Network full-viewport); stopped below it, back to the RELEASE
     point (the section flush at the top, everything cleared — R22;
     was the track's bottom at the viewport bottom, which now sits
     inside the exit with the photo still fading). R21/R22: the
     THRESHOLD is the photo's layout
     slot's bottom edge (foundersDepartingEdge — 24 above the
     section's edge; the photo itself has risen and blurred out by
     the release, R22); the settle target is the track's bottom, the
     section's edge. Idle + tween
     grammar is the reel snap's (150ms / 0.6s cubic-out, new input
     wins); reduced motion resolves the same zone instantly. Desktop
     only — the mobile stack has no sticky boundary. */
  let cleanupHandoffSettle = () => {};
  {
    const handoffTrack = section.closest('[data-landing-founders-track]') ?? section.parentElement;
    if (handoffTrack instanceof HTMLElement && !isMobileViewport()) {
      let settleTimer = 0;
      const trySettle = () => {
        const bottom = handoffTrack.getBoundingClientRect().bottom;
        const vh = window.innerHeight || 0;
        if (bottom <= 0.5 || bottom >= vh - 0.5) return;
        /* R21/R22: the THRESHOLD reads the photo's layout slot
           (foundersDepartingEdge — 24 above the track's edge); the
           settle TARGETS the section's edge so no strip of the
           founders ground can rest at the top. */
        const forward = foundersDepartingEdge() < vh * (1 - FOUNDERS_HANDOFF_T);
        /* The back target is the RELEASE point: the track's bottom at
           the section's pinned bottom = its sticky top + its height
           (14"/15" pass, 2026-09-03: with the bottom-aligned pin the
           sticky top is negative below a 1014 viewport, and targeting
           the bare height landed 20–72 BEFORE the release, on a photo
           still 4–15% visible — the half-stuck state. Sticky top 0 at
           1728: byte-identical). */
        const stickyTop = Math.min(0, parseFloat(getComputedStyle(section).top) || 0);
        const target = Math.round(
          (window.scrollY || 0) + (forward ? bottom : bottom - (section.offsetHeight + stickyTop)),
        );
        const lenis = getLenisInstance();
        if (reducedMotion || !lenis) {
          window.scrollTo(0, target);
          return;
        }
        lenis.scrollTo(target, {
          duration: FOUNDERS_HANDOFF_SETTLE_S,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      };
      const onHandoffScroll = () => {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(trySettle, FOUNDERS_HANDOFF_IDLE_MS);
      };
      window.addEventListener('scroll', onHandoffScroll, { passive: true });
      cleanupHandoffSettle = () => {
        window.clearTimeout(settleTimer);
        window.removeEventListener('scroll', onHandoffScroll);
      };
    }
  }

  if (reducedMotion) {
    return cleanupHandoffSettle;
  }

  /* ── Entry -> hold -> exit, ONE scrubbed timeline (so entry and
     exit can never fight over the same properties). The track is the
     trigger: its top crossing the viewport bottom is the entry start,
     and the timeline's px-denominated durations map 1:1 onto scroll
     (entry = one viewport height; then the hold; then the exit).
     Entry: each layer lags at its own amplitude and lands at rest.
     Hold: the "resistance" — sticky holds the section, nothing moves.
     Exit: each item travels exactly its own clearance (bottom edge to
     past the section top) over the same window — they leave together
     at different speeds, the entry mirrored — while the section's
     ground fades to the hero grey. Portraits animate `top`, never
     transform (the blend note on the constants). */
  const track = section.closest('[data-landing-founders-track]') ?? section.parentElement;
  const driftTweens = [];
  /* MOBILE (the viewport.js seam): the drift/hold/exit scrub encodes
     the desktop sticky-track geometry (portrait `top` bases, the photo
     crop expansion, the pin catch) — the linear mobile stack has none
     of it. The ENTRANCE below (word reveals + is-visible) runs on both
     regimes; only this scrub is desktop's. */
  if (!isMobileViewport()) {
    /* Entry runs until the sticky pin engages — which, with the
       bottom-aligned pin (the section is taller than the viewport),
       is one full SECTION height of scroll after the track's top
       enters the viewport bottom (or one viewport height on screens
       taller than the section — matching the CSS min()). This keeps
       "items land" and "the catch begins" the same scroll instant. */
    const entryPx = Math.max(
      window.innerHeight || 0,
      section.offsetHeight || SECTION_ENTRY_PX_FALLBACK,
    );
    const holdEnd = entryPx + FOUNDERS_HOLD_PX;
    const photo = section.querySelector('.landing-founders__photo');
    const headline = section.querySelector('.landing-founders__headline');

    /* R22: the photo's blur-out START, derived from measured geometry
       (constants block): the headline's first line box top within the
       section (+ the ink inset) against the nav's live bottom, mapped
       onto the exit through the headline's own travel. Measured BEFORE
       the timeline exists, so no drift transform is on the headline
       yet (and the measured y is subtracted regardless).
       14"/15" PASS (2026-09-03): the section pins at its STICKY TOP,
       which is 0 only when the viewport is at least the section's 1014
       (bottom-aligned pin: −20 at the 994 interior, −72 at 942), so
       the ink's VIEWPORT position at the pin is the in-section offset
       PLUS that sticky top — without it the blur fired 43–155 late
       in-shell. At 1728 the sticky top is 0: byte-identical. */
    const nav = document.querySelector('.home__topbar');
    const firstLine = section.querySelector('.landing-founders__line') ?? headline;
    const navBottomPx = nav instanceof HTMLElement ? nav.getBoundingClientRect().bottom : 0;
    const stickyTopPx = Math.min(0, parseFloat(getComputedStyle(section).top) || 0);
    const headlineInkTopPx = firstLine instanceof HTMLElement
      ? firstLine.getBoundingClientRect().top
        - section.getBoundingClientRect().top
        - (headline instanceof HTMLElement ? Number(gsap.getProperty(headline, 'y')) || 0 : 0)
        + HEADLINE_INK_INSET_PX
        + stickyTopPx
      : 0;
    const photoBlurStartPx = Math.min(
      FOUNDERS_EXIT_PX,
      Math.max(0, ((headlineInkTopPx - navBottomPx) / EXIT_HEADLINE_PX) * FOUNDERS_EXIT_PX),
    );
    const photoBlurEndPx = Math.max(
      EXIT_BLUR_HEADLINE_PX, EXIT_BLUR_CTAS_PX, EXIT_BLUR_ROBBO_PX, EXIT_BLUR_ASHLEY_PX,
    ) + EXIT_PHOTO_BLUR_LAG_PX;
    const driftSpec = [
      /* The WHO WE ARE label (frame 16:204) rides the headline's own
         drift amplitude — the established vocabulary, nothing new. */
      { el: section.querySelector('[data-landing-founders-label]'), px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: section.querySelector('[data-landing-founders-label]'), blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: section.querySelector('.landing-founders__headline'), px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: section.querySelector('.landing-founders__headline'), blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: section.querySelector('.landing-founders__ctas'), px: DRIFT_CTAS_PX, exit: EXIT_CTAS_PX, mode: 'y', blurEl: section.querySelector('.landing-founders__ctas'), blurDur: EXIT_BLUR_CTAS_PX },
      { el: photo, px: DRIFT_PHOTO_PX, exit: EXIT_PHOTO_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__portrait--robbo'), px: DRIFT_ROBBO_PX, exit: EXIT_ROBBO_PX, mode: 'top', blurEl: section.querySelector('.landing-founders__portrait--robbo .landing-founders__portrait-crop'), blurDur: EXIT_BLUR_ROBBO_PX },
      { el: section.querySelector('.landing-founders__portrait--ashley'), px: DRIFT_ASHLEY_PX, exit: EXIT_ASHLEY_PX, mode: 'top', blurEl: section.querySelector('.landing-founders__portrait--ashley .landing-founders__portrait-crop'), blurDur: EXIT_BLUR_ASHLEY_PX },
    ];

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: `+=${entryPx + FOUNDERS_HOLD_PX + FOUNDERS_EXIT_PX}`,
        scrub: true,
      },
    });

    driftSpec.forEach(({ el, px, exit, mode, blurEl, blurDur }) => {
      if (!(el instanceof HTMLElement)) return;
      if (mode === 'top') {
        const baseTop = parseFloat(getComputedStyle(el).top);
        tl.fromTo(
          el,
          { top: baseTop + px },
          { top: baseTop, duration: entryPx, ease: 'none' },
          0,
        );
        if (exit) {
          tl.to(
            el,
            { top: baseTop - exit, duration: FOUNDERS_EXIT_PX, ease: 'none' },
            holdEnd,
          );
        }
      } else {
        tl.fromTo(
          el,
          { y: px },
          { y: 0, duration: entryPx, ease: 'none' },
          0,
        );
        if (exit) {
          tl.to(el, { y: -exit, duration: FOUNDERS_EXIT_PX, ease: 'none' }, holdEnd);
        }
      }
      if (blurEl instanceof HTMLElement && blurDur) {
        tl.fromTo(
          blurEl,
          { filter: 'blur(0px)', opacity: 1 },
          { filter: `blur(${EXIT_BLUR_PX}px)`, opacity: 0, duration: blurDur, ease: 'none' },
          holdEnd,
        );
      }
    });

    /* R21 (Oscar, 2026-09-02): THE EXPANSION IS GONE (the track's
       extra 350 retired with it — landing.css: 1014 + 250 + 900).
       R22 (2026-09-03): the R21 "fixed through the whole exit" hold
       (holdEnd + 900 before the photo moved) is gone too — the photo
       rises from holdEnd with everything else (EXIT_PHOTO_PX above)
       and blur-fades out last, on the derived window below. Its
       filter/opacity are its own (a bare <img> inside — no blended
       descendant to isolate). */
    /* The blur/opacity target is the photo's INNER IMG, never the
       figure: the entrance's .is-visible fade owns the figure's
       opacity through a 0.8s CSS transition, which would smear every
       scrubbed opacity write across time (measured: the scrub's blur
       exact, its opacity lagging both ways) — the mobile note's
       collision class. Separate elements, the two fades multiply. */
    const photoImg = photo instanceof HTMLElement ? photo.querySelector('img') : null;
    if (photoImg instanceof HTMLElement && photoBlurEndPx > photoBlurStartPx) {
      tl.fromTo(
        photoImg,
        { filter: 'blur(0px)', opacity: 1 },
        {
          filter: `blur(${EXIT_BLUR_PX}px)`,
          opacity: 0,
          duration: photoBlurEndPx - photoBlurStartPx,
          ease: 'none',
        },
        holdEnd + photoBlurStartPx,
      );
    }
    driftTweens.push(tl);

    if (import.meta.env.DEV) {
      window.__landingFounders = {
        entryPx,
        holdPx: FOUNDERS_HOLD_PX,
        exitPx: FOUNDERS_EXIT_PX,
        timelineTotal: entryPx + FOUNDERS_HOLD_PX + FOUNDERS_EXIT_PX,
        holdEndPx: holdEnd,
        photoExitPx: EXIT_PHOTO_PX,
        photoBlurStartPx: +photoBlurStartPx.toFixed(1),
        photoBlurEndPx,
        photoBlurLagPx: EXIT_PHOTO_BLUR_LAG_PX,
        releasePx: FOUNDERS_RELEASE_PX,
        navBottomPx,
        headlineInkTopPx,
        stickyTopPx,
        lastOtherBlurEndPx: photoBlurEndPx - EXIT_PHOTO_BLUR_LAG_PX,
      };
    }
  } else if (isPhoneViewport()) {
    /* ── THE PHONE (Oscar, 2026-09-09 — Phase 2B): the desktop's
       choreography on the phone's layout. The section PINS with the
       rail's bottom flush to the viewport bottom (position: sticky, top
       = 100dvh − the rail's measured bottom offset — live under the URL
       bar; negative when the section is taller than the screen, as the
       desktop's own bottom-aligned pin is), HOLDS for the desktop's 250,
       then every item rises and blur-fades out at its own pace over the
       desktop's 900 window with the desktop's distances and blur
       durations verbatim; the track carries section + HOLD + RELEASE so
       the sticky releases at 760, when the last blur has cleared. The
       entry keeps the phone's approved drift (0.6 of the desktop's
       amplitudes) and runs until the pin engages. OUR NETWORK sits
       pinned beneath (landing-network.js) and is revealed as the items
       leave — the founders' ground is transparent for it
       (landing-narrow.css, keyed on body.m-ground-on). */
    const inset = foundersDepartingEdgeInsetPx();
    const railBottomOff = Math.max(1, section.offsetHeight - inset);
    section.style.setProperty('--fd-rail-bottom', `${railBottomOff}px`);
    /* W1 (Oscar, 2026-09-09) — THE BLOCK IS CENTRED: label, headline,
       chips and rail as one block, centred between the nav's foot and
       the viewport bottom at the pinned state (it was the rail's bottom
       flush to the viewport bottom, the block's top wherever the
       section's padding put it — 41 + 106 at 402×874). The sticky top
       is the CSS's — (100dvh + nav − block) / 2 − the block's offset in
       the section — so it is live under the URL bar; the same numbers
       go into the scrub below. THE SHORT VIEWPORT: where the block is
       taller than the room (390×664, 360×740) the equal gaps would be
       negative and the label would sit under the nav — the top is
       clamped so the label lands at the nav's foot and the rail's
       bottom goes below the fold by the shortfall. */
    const nav = document.querySelector('.home__topbar');
    const navBottomPx = nav instanceof HTMLElement ? nav.getBoundingClientRect().bottom : 0;
    const labelEl = section.querySelector('[data-landing-founders-label]');
    const blockTopPx = labelEl instanceof HTMLElement && labelEl.offsetTop > 0
      ? labelEl.offsetTop
      : parseFloat(getComputedStyle(section).paddingTop) || 0;
    const blockHPx = Math.max(1, railBottomOff - blockTopPx);
    section.style.setProperty('--fd-block-top', `${blockTopPx}px`);
    section.style.setProperty('--fd-block-h', `${blockHPx}px`);
    section.style.setProperty('--fd-nav-bottom', `${Math.round(navBottomPx)}px`);
    section.classList.add('is-pinned-phone');
    if (track instanceof HTMLElement) {
      /* the release (760) is measured from the pin and already spans the
         hold and the exit — the track is the section + the release */
      track.style.height = `${section.offsetHeight + FOUNDERS_RELEASE_PX}px`;
    }
    const vhPx = window.innerHeight || 0;
    /* the pin's top in px at build (the CSS's own formula, for the scrub) */
    const pinTopPx = Math.max(
      navBottomPx - blockTopPx,
      (vhPx + navBottomPx - blockHPx) / 2 - blockTopPx,
    );
    lastPhonePinTopPx = pinTopPx;
    /* the entry runs from the track's top at the viewport bottom to the
       pin engaging: vh − the pin's top */
    const entryPx = Math.max(1, vhPx - pinTopPx);
    const holdEnd = entryPx + FOUNDERS_HOLD_PX;
    const photo = section.querySelector('.landing-founders__photo');
    const headline = section.querySelector('.landing-founders__headline');
    const firstLine = section.querySelector('.landing-founders__line') ?? headline;
    /* the section's top in the viewport while pinned (negative on a
       viewport shorter than the block) — the ink's own position is its
       offset in the section plus this */
    const stickyTopPx = pinTopPx;
    const headlineInkTopPx = firstLine instanceof HTMLElement
      ? firstLine.getBoundingClientRect().top
        - section.getBoundingClientRect().top
        - (headline instanceof HTMLElement ? Number(gsap.getProperty(headline, 'y')) || 0 : 0)
        + HEADLINE_INK_INSET_PX
        + stickyTopPx
      : 0;
    const photoBlurStartPx = Math.min(
      FOUNDERS_EXIT_PX,
      Math.max(0, ((headlineInkTopPx - navBottomPx) / EXIT_HEADLINE_PX) * FOUNDERS_EXIT_PX),
    );
    const photoBlurEndPx = Math.max(
      EXIT_BLUR_HEADLINE_PX, EXIT_BLUR_CTAS_PX, EXIT_BLUR_ROBBO_PX, EXIT_BLUR_ASHLEY_PX,
    ) + EXIT_PHOTO_BLUR_LAG_PX;
    const spec = [
      { el: section.querySelector('[data-landing-founders-label]'), px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: section.querySelector('[data-landing-founders-label]'), blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: headline, px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: headline, blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: section.querySelector('.landing-founders__ctas'), px: DRIFT_CTAS_PX, exit: EXIT_CTAS_PX, mode: 'y', blurEl: section.querySelector('.landing-founders__ctas'), blurDur: EXIT_BLUR_CTAS_PX },
      { el: photo, px: DRIFT_PHOTO_PX, exit: EXIT_PHOTO_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__portrait--robbo'), px: DRIFT_ROBBO_PX, exit: EXIT_ROBBO_PX, mode: 'top', blurEl: section.querySelector('.landing-founders__portrait--robbo .landing-founders__portrait-crop'), blurDur: EXIT_BLUR_ROBBO_PX },
      { el: section.querySelector('.landing-founders__portrait--ashley'), px: DRIFT_ASHLEY_PX, exit: EXIT_ASHLEY_PX, mode: 'top', blurEl: section.querySelector('.landing-founders__portrait--ashley .landing-founders__portrait-crop'), blurDur: EXIT_BLUR_ASHLEY_PX },
    ];
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: `+=${entryPx + FOUNDERS_HOLD_PX + FOUNDERS_EXIT_PX}`,
        scrub: true,
      },
    });
    spec.forEach(({ el, px, exit, mode, blurEl, blurDur }) => {
      if (!(el instanceof HTMLElement)) return;
      const amp = px * DRIFT_SCALE_NARROW;
      if (mode === 'top') {
        tl.fromTo(el, { top: amp }, { top: 0, duration: entryPx, ease: 'none' }, 0);
        if (exit) tl.to(el, { top: -exit, duration: FOUNDERS_EXIT_PX, ease: 'none' }, holdEnd);
      } else {
        tl.fromTo(el, { y: amp }, { y: 0, duration: entryPx, ease: 'none' }, 0);
        if (exit) tl.to(el, { y: -exit, duration: FOUNDERS_EXIT_PX, ease: 'none' }, holdEnd);
      }
      if (blurEl instanceof HTMLElement && blurDur) {
        tl.fromTo(
          blurEl,
          { filter: 'blur(0px)', opacity: 1 },
          { filter: `blur(${EXIT_BLUR_PX}px)`, opacity: 0, duration: blurDur, ease: 'none' },
          holdEnd,
        );
      }
    });
    const photoImg = photo instanceof HTMLElement ? photo.querySelector('img') : null;
    if (photoImg instanceof HTMLElement && photoBlurEndPx > photoBlurStartPx) {
      tl.fromTo(
        photoImg,
        { filter: 'blur(0px)', opacity: 1 },
        { filter: `blur(${EXIT_BLUR_PX}px)`, opacity: 0, duration: photoBlurEndPx - photoBlurStartPx, ease: 'none' },
        holdEnd + photoBlurStartPx,
      );
    }
    /* N2 (Oscar, 2026-09-09) — THE RAIL'S VEILS LEAVE WITH THE RAIL. The
       section's ::before/::after (16 and 48 wide, the rail's 306 tall, a
       gradient into #161616 over the rail's edges) were not part of this
       exit: the cards blurred out and the veils stayed painted at the
       founders' z, over the network stage beneath, and once the section
       released they scrolled up over the network's heading and text —
       measured at 402: the right veil's box over the right 32px of OUR
       NETWORK (960px²) and over the industries (up to 4320px²) through
       ~200px of scroll, at opacity 1, while the title revealed under it.
       They now fade over the first portrait's blur window, so the
       veils are gone with the cards and never leave the rail's frame. */
    tl.fromTo(
      section,
      { '--fd-veil-op': 1 },
      { '--fd-veil-op': 0, duration: EXIT_BLUR_ROBBO_PX, ease: 'none' },
      holdEnd,
    );
    driftTweens.push(tl);
    if (import.meta.env.DEV) {
      window.__landingFounders = {
        phone: true, entryPx, holdPx: FOUNDERS_HOLD_PX, exitPx: FOUNDERS_EXIT_PX, holdEndPx: holdEnd,
        releasePx: FOUNDERS_RELEASE_PX, railBottomOff, stickyTopPx, photoBlurStartPx: +photoBlurStartPx.toFixed(1), photoBlurEndPx,
        trackHeight: track instanceof HTMLElement ? track.offsetHeight : null,
      };
    }
  } else {
    /* ── NARROW (the rebuild, 2026-09-07): the desktop's ENTRY DRIFT and
       nothing else. Each layer lags at its own amplitude — scaled to the
       phone's shorter travel (DRIFT_SCALE_NARROW) — and lands at rest as
       the section fills the viewport: one viewport of scroll from the
       track's top. The sticky hold and the blur exit are NOT carried:
       they encode a section that fits a 1117 viewport, and at the
       phone's height this one is taller than the screen, so it scrolls
       on in flow and Our Network follows it. REJECTED: shrinking the
       images until the section pins (the photo becomes a stamp); pinning
       the headline alone (a partial pin reads as a bug). Portraits still
       drift via `top` (the blend note above) — they sit position:
       relative below the seam, so 0 is their rest. */
    const entryPx = window.innerHeight || SECTION_ENTRY_PX_FALLBACK;
    const spec = [
      { el: section.querySelector('[data-landing-founders-label]'), px: DRIFT_HEADLINE_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__headline'), px: DRIFT_HEADLINE_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__ctas'), px: DRIFT_CTAS_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__photo'), px: DRIFT_PHOTO_PX, mode: 'y' },
      { el: section.querySelector('.landing-founders__portrait--robbo'), px: DRIFT_ROBBO_PX, mode: 'top' },
      { el: section.querySelector('.landing-founders__portrait--ashley'), px: DRIFT_ASHLEY_PX, mode: 'top' },
    ];
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: `+=${entryPx}`,
        scrub: true,
      },
    });
    spec.forEach(({ el, px, mode }) => {
      if (!(el instanceof HTMLElement)) return;
      const amp = px * DRIFT_SCALE_NARROW;
      if (mode === 'top') tl.fromTo(el, { top: amp }, { top: 0, duration: entryPx, ease: 'none' }, 0);
      else tl.fromTo(el, { y: amp }, { y: 0, duration: entryPx, ease: 'none' }, 0);
    });
    driftTweens.push(tl);
  }

  /* Wrap after fonts so the clip boxes measure the real glyphs (the
     established gate — wrapping against fallback metrics mis-groups
     lines). Hidden until wrapped: the wrap itself puts each line in
     its risen-out state, so there is no flash window. */
  const timeouts = [];
  let trigger = null;
  let disposed = false;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });

    const play = () => {
      lines.forEach((line) => {
        if (line instanceof HTMLElement) playLineRevealElement(line);
      });
      buttons.forEach((btn, i) => {
        timeouts.push(
          setTimeout(() => btn.classList.add('is-visible'), BUTTONS_AT_MS + i * BUTTONS_STAGGER_MS),
        );
      });
      timeouts.push(
        setTimeout(() => {
          images.forEach((img) => img.classList.add('is-visible'));
        }, IMAGES_AT_MS),
      );
    };

    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: play,
    });
  });

  return () => {
    disposed = true;
    cleanupHandoffSettle();
    timeouts.forEach(clearTimeout);
    trigger?.kill();
    driftTweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    if (section.classList.contains('is-pinned-phone')) {
      section.classList.remove('is-pinned-phone');
      section.style.removeProperty('--fd-rail-bottom');
      section.style.removeProperty('--fd-block-top');
      section.style.removeProperty('--fd-block-h');
      section.style.removeProperty('--fd-nav-bottom');
      lastPhonePinTopPx = 0;
      if (track instanceof HTMLElement) track.style.height = '';
    }
  };
}
