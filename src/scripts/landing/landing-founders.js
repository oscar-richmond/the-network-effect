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
import { isMobileViewport } from './viewport.js';
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
const DRIFT_HEADLINE_PX = 60;
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
 * the ground fades #161616 -> the hero grey. Keep HOLD/EXIT in step
 * with the track height in landing.css.
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

/**
 * Exit blur (Oscar's rev): as each LEFT item starts its exit travel it
 * blurs away — the portrait names' blur vocabulary (the shared 3px),
 * scrubbed against scroll rather than clocked, each over its own
 * scroll distance so the speeds differ with the travel paces (the
 * faster the mover, the quicker the dissolve). The big photo doesn't
 * blur — it EXPANDS to full screen instead, covering the section as
 * the sticky release approaches; the ground fade is gone (stays
 * #161616 under the photo). Portrait blurs target the CROP spans,
 * never the figures: a filtered/faded ancestor would isolate the
 * difference-blended names (the six-regression class).
 */
const EXIT_BLUR_PX = 3;
const EXIT_BLUR_HEADLINE_PX = 450;
const EXIT_BLUR_CTAS_PX = 550;
const EXIT_BLUR_ROBBO_PX = 650;
const EXIT_BLUR_ASHLEY_PX = 700;

/**
 * MOBILE expansion (the Figma 402-frame rebuild, 2026-08-13): the
 * sofa photo scrubs from its rest crop (file 0:25 — the 254×306
 * window at 402) to the full-bleed 402×400 keyframe (0:58/0:62),
 * reversible, as the grid scrolls through the lower viewport. The
 * grid-space's height is the push: it grows 306→400 in step, so the
 * services heading below rides down rather than being overlapped.
 * The inner img counter-zooms between the file's two crops (460w →
 * 608w source widths, expressed as %-of-window so the tween is fluid
 * across 360–430). Portraits fade + drift left over the first 60% —
 * the file's expanded keyframe shows the photo alone. Scroll px are
 * the scrub's denominator (the page's grammar; ease:none).
 */
/* R1 item 4a (Oscar's device pass): the scrub STARTS LATER so the
   resting grid holds through its arrival — both ends are his
   fine-tune knobs. START is the grid-top viewport line that arms
   the scrub ('top 45%' = begins once the grid has climbed to the
   viewport's upper half; was 75%); LEN is the scroll distance of
   the full expansion. */
const FD_M_SCRUB_START = 'top 45%';
const FD_M_EXPAND_PX = 340;
const FD_M_TARGET_H = 400;
/* R1 item 4b: the grid's rest margin below (94 = 400−306). The scrub
   drains it to 0 while the height grows by the same 94, so the dark
   band's bottom NEVER moves and the fully-expanded image lands flush
   on it — no dark strip below, at any viewport height. */
const FD_M_IMG_FROM = { left: '-47.25%', width: '181.1%' };
const FD_M_IMG_TO = { left: '-29.6%', width: '151.2%' };
const FD_M_FADE_PORTION = 0.6;

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
     Network full-viewport); stopped below it, back (image fully in
     view). The measure is the track's bottom edge: during the whole
     departure it IS the expanded photo's bottom edge (verified
     equal at every sampled scroll — the photo exits bottom-flush
     with its track), and unlike the photo's rect it stays honest
     under reduced motion, where the crop never expands. Idle + tween
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
        const forward = bottom < vh * (1 - FOUNDERS_HANDOFF_T);
        const target = Math.round((window.scrollY || 0) + (forward ? bottom : bottom - vh));
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
    const driftSpec = [
      /* The WHO WE ARE label (frame 16:204) rides the headline's own
         drift amplitude — the established vocabulary, nothing new. */
      { el: section.querySelector('[data-landing-founders-label]'), px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: section.querySelector('[data-landing-founders-label]'), blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: section.querySelector('.landing-founders__headline'), px: DRIFT_HEADLINE_PX, exit: EXIT_HEADLINE_PX, mode: 'y', blurEl: section.querySelector('.landing-founders__headline'), blurDur: EXIT_BLUR_HEADLINE_PX },
      { el: section.querySelector('.landing-founders__ctas'), px: DRIFT_CTAS_PX, exit: EXIT_CTAS_PX, mode: 'y', blurEl: section.querySelector('.landing-founders__ctas'), blurDur: EXIT_BLUR_CTAS_PX },
      { el: photo, px: DRIFT_PHOTO_PX, exit: 0, mode: 'y' },
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

    /* The photo's exit: expand its crop window to the full viewport
       (measured from the pinned geometry so it lands exactly on the
       screen). Inline left/width seed the tween's from-state; the CSS
       right-anchor is over-constrained away once left+width are set. */
    if (photo instanceof HTMLElement) {
      const secRect = section.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      photo.style.left = `${(pr.left - secRect.left).toFixed(1)}px`;
      photo.style.width = `${pr.width.toFixed(1)}px`;
      const vh = window.innerHeight;
      const pinTop = Math.min(0, vh - section.offsetHeight);
      tl.to(
        photo,
        {
          top: -pinTop,
          left: 0,
          width: window.innerWidth,
          height: vh,
          duration: FOUNDERS_EXIT_PX,
          ease: 'none',
        },
        holdEnd,
      );
    }

    driftTweens.push(tl);

    if (import.meta.env.DEV) {
      window.__landingFounders = {
        entryPx,
        holdPx: FOUNDERS_HOLD_PX,
        exitPx: FOUNDERS_EXIT_PX,
        timelineTotal: entryPx + FOUNDERS_HOLD_PX + FOUNDERS_EXIT_PX,
      };
    }
  } else {
    /* ── MOBILE: the in-place photo expansion (constants block above).
       Anchors animate as left/right px — width stays `auto`, so the
       full-bleed end state is exact at ANY viewport width without a
       resize rebuild (only ScrollTrigger's own refresh re-measures).
       The rest anchors are MEASURED from the computed style (the CSS
       calc resolved), not re-derived, so CSS stays the one source of
       the rest geometry. immediateRender is left on: the from-state
       equals the CSS rest state byte-for-byte, so the seed writes are
       no-ops. Portraits tween opacity/x — their difference-blended
       hover names are display:none on mobile, so the blend-isolation
       rule doesn't bind here. */
    const grid = section.querySelector('[data-fd-grid]');
    const photo = section.querySelector('.landing-founders__photo');
    const photoImg = photo?.querySelector('img');
    /* The fade targets the CROP SPANS, not the figures: the entrance's
       .is-visible fade owns the figures' opacity, and a scrub tween on
       the same element+property records whatever opacity it first
       renders against (0 if the entrance timeout hasn't landed) and
       then pins it — the collision class this codebase keeps meeting.
       Separate elements, the two fades multiply cleanly. */
    const portraits = [
      section.querySelector('.landing-founders__portrait--robbo .landing-founders__portrait-crop'),
      section.querySelector('.landing-founders__portrait--ashley .landing-founders__portrait-crop'),
    ].filter((el) => el instanceof HTMLElement);

    if (grid instanceof HTMLElement && photo instanceof HTMLElement && photoImg) {
      const cs = getComputedStyle(photo);
      const baseLeft = parseFloat(cs.left) || 0;
      const baseRight = parseFloat(cs.right) || 0;
      const baseH = photo.offsetHeight || 306;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: grid,
          start: FD_M_SCRUB_START,
          end: `+=${FD_M_EXPAND_PX}`,
          scrub: true,
        },
      });

      tl.fromTo(
        photo,
        { left: baseLeft, right: baseRight, height: baseH },
        { left: 0, right: 0, height: FD_M_TARGET_H, duration: 1, ease: 'none' },
        0,
      );
      tl.fromTo(
        photoImg,
        { ...FD_M_IMG_FROM },
        { ...FD_M_IMG_TO, duration: 1, ease: 'none' },
        0,
      );
      /* Height grows exactly as the rest margin drains (item 4b) —
         the band bottom is stationary and the image ends flush. */
      tl.to(grid, {
        height: FD_M_TARGET_H,
        marginBottom: 0,
        duration: 1,
        ease: 'none',
      }, 0);
      if (portraits.length) {
        /* immediateRender:false — the entrance's .is-visible fade owns
           opacity until the scrub's first real update. */
        tl.to(
          portraits,
          { opacity: 0, x: -24, duration: FD_M_FADE_PORTION, ease: 'none', immediateRender: false },
          0,
        );
      }

      driftTweens.push(tl);
    }
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
  };
}
