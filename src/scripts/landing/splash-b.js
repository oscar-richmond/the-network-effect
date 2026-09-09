/**
 * SPLASH VARIANT B (R49, Oscar 2026-09-04) — the supplied reference
 * component's mechanic, ported to our stack and adapted to three images.
 *
 * THE REFERENCE'S STRUCTURE, kept beat for beat:
 *   0.0s   the counter runs 0 → 100 (power3.out, 3s) while its container
 *          scales 0.25 → 1 from a LEFT BOTTOM origin and a hairline bar
 *          draws scaleX 0 → 1 over the same 3s
 *   +1.0s  on completion the digits slide x:-100% on a 0.1 stagger, then
 *          the counter is removed
 *   4.5s   the image(s) open from a point via clip-path on the 'hop'
 *          ease (1.5s), the inner image scaling 2 → 1.5
 *   6.0s   the reference opens its one image to full bleed; OURS TRAVELS
 *          the three into the hero's row instead (2s, same ease), the
 *          inner images settling to scale 1
 *   7.0s   the headline arrives
 *   7.5s   the nav and the rest of the hero's content arrive
 *
 * WHAT WAS SUBSTITUTED (no licensed plugins):
 *  · CustomEase('hop', '0.9, 0, 0.1, 1') → `hop()` below, a plain cubic-
 *    bezier solver passed to GSAP as an ease function. Same curve, no
 *    Club plugin.
 *  · SplitText → the site's own vocabulary. The headline and the hero's
 *    content use the modules that already own them (the splash's
 *    playPageBeats path), and the counter's digits are split here into
 *    fixed-width cells, which SplitText could not have given us anyway
 *    because the number is re-rendered on every tick.
 *  · The CDN GSAP → the npm package this project already uses.
 *
 * THE THREE-IMAGE ADAPTATION. The centred row is the hero's FINAL
 * composition in miniature — same images, same aspect, same 8px
 * gutters, scaled by SB_MINI_SCALE and centred — so the travel is a pure
 * place-and-scale rather than a re-composition, and the sequence
 * resolves into the hero's real resting row rather than an approximation.
 * Choreography (all tunable below): they OPEN left → right on
 * SB_OPEN_STAGGER, because three windows appearing are three events; they
 * TRAVEL left → right on the smaller SB_TRAVEL_STAGGER, which echoes the
 * hero's own left/middle/right exit order. Opening and travelling as one
 * simultaneous block was the alternative — it reads more abrupt and
 * loses that link.
 *
 * SCROLL is locked for the whole sequence and released at the settle,
 * at position 0, on the modals' mechanism (Lenis stop + overflow, plus
 * the key/wheel/touch guards and the snap-back a modal gets free from
 * its focus trap). READINESS gates the start on the three images
 * decoding, raced against SB_READY_TIMEOUT_MS; SB_FAILSAFE_MS force-
 * settles if the timeline itself never completes. Nobody is stranded on
 * red. REDUCED MOTION skips the whole thing.
 */
import gsap from 'gsap';
import { getLenisInstance } from './site-scroll.js';
import { ensureLogoChars, sweepUnits, NAV_CHAR_STAGGER_S } from './nav-motion.js';
import { playLineRevealElement, wrapWordRevealElement } from '../line-reveal.js';
import { isPhoneViewport } from './viewport.js';

/* THE 402 FRAME (Oscar, 2026-09-09 — GvANAN3kJOPV8AKOi3O9FF 1:11): the
   phone's hero is ONE image, the middle card; the outer two are
   display:none there (landing-narrow.css). This sequence's destination
   on the phone is therefore the middle card alone — the readiness gate
   waits for ITS box, the two outer stand-ins borrow that box exactly as
   the discards do (they arrive in the pile beneath it and clear with the
   discards, never seen leaving), and the sort travels one card. Nothing
   above the seam reads this. Before: the gate waited for three boxes,
   two of which could never come, so every phone load sat on the red
   ground at "0" for the whole SB_READY_TIMEOUT and then skipped. */
const SB_PHONE_CARD = 1;

/* ── the reference's timings, verbatim */
export const SB_COUNT_DUR = 3;
export const SB_DIGITS_OUT_DELAY = 1;
export const SB_DIGITS_OUT_DUR = 0.75;
export const SB_DIGITS_OUT_STAGGER = 0.1;
/* R59 item 3 (Oscar, 2026-09-04) — THE MIDDLE BEAT IS NOW VERSION A'S
   STACK AND SORT, ported from hero-entry.js rather than rewritten: the
   three images pile ON TOP OF EACH OTHER at the centre, hold, then sort
   into their hero positions. SB_OPEN_* are retained as the STACK's
   names so every derived beat (the line's wipe) keeps its anchor. */
export const SB_OPEN_AT = 4.5;
/* R69 (Oscar, 2026-09-04): version A's own burst duration (HE_BURST_DUR
   0.75) — the pile was arriving at half that pace. The 0.12 stagger
   already matched it, so this one number brings the whole arrival onto
   the reference's tempo, and shortens the sequence by 0.75s. */
export const SB_OPEN_DUR = 0.75;
export const SB_TRAVEL_AT = 6;
export const SB_TRAVEL_DUR = 2;
/* R59: the headline and content beats are DERIVED from the sort now
   (they were absolutes tuned against the retired travel at 6). The
   headline lands as the first card touches down; the content follows
   half a second later, as before. */
export const SB_HEADLINE_AT_LEGACY = 7;
export const SB_CONTENT_AT_LEGACY = 7.5;
/* ── ours */
export const SB_MINI_SCALE = 0.42;
/* The pile's size at the centre — version A's HE_BURST_SCALE. */
export const SB_STACK_SCALE = 0.55;
/* R67 (Oscar, 2026-09-04) — THE PILE IS STRAIGHT AND ONE SIZE, exactly as
   the shipped entry animation on the main landing page stacks it.
   R65 had varied each card's scale, rotation and offset so all six read
   individually; Oscar's ruling supersedes that outright — version A is
   the reference, and version A stacks every card at ONE scale
   (HE_BURST_SCALE 0.55), at ONE centre, with no rotation and no drift.
   SB_STACK_SCALE below is that same 0.55. The variation constants are
   deliberately gone rather than set to zero: a tunable that must stay at
   zero is an invitation to re-introduce the thing that was rejected.
   CONSEQUENCE, understood and accepted: the cards occlude one another
   exactly, so the pile reads as ONE card — which is what the reference
   does. What reads is the ARRIVAL (six beats of it) and then the swap,
   not six visible edges. */
/* The beat the pile holds before it sorts — version A's HE_STACK_HOLD. */
export const SB_STACK_HOLD = 1.0;
/* R65 item 2c — THE DISCARDS. Three extra images arrive FIRST, the
   hero's three stack on top of them, and the first three then clear
   before the travel begins.
   THEIR EXIT (R70, superseding R65's blur-fade): a plain opacity fade
   IN PLACE. R65 dropped them 40px and blurred them, which was the whole
   problem — any displacement walks them out from under the top card and
   they are seen. Behind an opaque card at the identical rect, a fade
   with no movement is invisible, which is the requirement: one image
   throughout, then the three heroes leave for their places.
   It completes BEFORE the sort — SB_SORT_AT is derived from it below. */
export const SB_DISCARD_OUT_AT_OFFSET = 0.25; /* after the pile completes */
export const SB_DISCARD_OUT_DUR = 0.55;
export const SB_DISCARD_OUT_STAGGER = 0.07;
/* The gap between the discards clearing and the sort starting. */
export const SB_SORT_GAP = 0.2;      /* the centred row, as a fraction of the hero's */
export const SB_OPEN_STAGGER = 0.12;    /* three windows appearing — three events */
export const SB_TRAVEL_STAGGER = 0.08;  /* echoes the hero's own left/middle/right order */
export const SB_IMG_SCALE_FROM = 2;     /* the reference's inner-image scale */
export const SB_IMG_SCALE_MID = 1.5;
export const SB_GROUND_OUT_DUR = 0.6;   /* red resolving to the hero's ground */
/* R54 item 7 — THE LINE'S EXIT, derived from the timeline rather than
   typed: it starts wiping as the images begin appearing in the centre
   (SB_OPEN_AT) and is gone exactly as the travel begins (SB_TRAVEL_AT),
   so retiming either beat carries the wipe with it. */
/* The sort begins once the pile has assembled and held. Derived, so
   retiming the stack carries the sort and the line's wipe with it. */
/* SIX cards arrive now, not three (R65 item 2c). */
export const SB_STACK_N = 6;
export const SB_STACK_TOTAL = (SB_STACK_N - 1) * SB_OPEN_STAGGER + SB_OPEN_DUR;
/* the discards clear after the pile has completed and held a moment… */
export const SB_DISCARD_OUT_AT = SB_OPEN_AT + SB_STACK_TOTAL + SB_DISCARD_OUT_AT_OFFSET;
export const SB_DISCARD_OUT_TOTAL = 2 * SB_DISCARD_OUT_STAGGER + SB_DISCARD_OUT_DUR;
/* …and only then does the sort begin — derived, so no overlap is possible. */
export const SB_SORT_AT = Math.max(
  SB_OPEN_AT + SB_STACK_TOTAL + SB_STACK_HOLD,
  SB_DISCARD_OUT_AT + SB_DISCARD_OUT_TOTAL + SB_SORT_GAP,
);
/* The hero's text arrives the instant the red has gone — the ground's
   fade-out ends exactly here, so this is both "as soon as the background
   fades" and the earliest point at which nothing rises behind it. */
export const SB_TEXT_AT = SB_SORT_AT + SB_TRAVEL_DUR;
/* R70 — THE LOGO ROW follows the intro immediately. The hero module gives
   the intro a reveal delay of the headline's stagger +
   INTRO_AFTER_HEADLINE_S (0.39) and line-reveal runs a 1.2s transition,
   so the intro's last line lands SB_TEXT_AT + 1.59. The row starts there.
   It used to ride playPageBeats at the settle and then wait out the CSS's
   own 0.54s entrance delay on top — measured, it began at 10.99 and did
   not finish until ~12.3. That delay is suppressed on this route (the
   beat is scheduled here instead), so the row rises the moment the
   intro's text has settled. */
export const SB_INTRO_SETTLE_S = 0.39 + 1.2;
export const SB_LOGOS_AT = SB_TEXT_AT + SB_INTRO_SETTLE_S;
/* H1 (Oscar, 2026-09-09) — THE PHONE'S LOGO ROW: directly after the intro
   line completes its entrance, one short deliberate beat. Measured on the
   402 build before this: the row's `is-entered` landed at the intro's
   transition end as intended, but its fade did not START until 0.54s
   later — the desktop rule's transition-delay (landing.css) was winning
   over the variant-B zeroing rule, which sits one class lower in
   specificity ((0,4,1) against (0,3,2)); the phone sheet now zeroes it at
   a specificity that wins. With the delay gone this beat is the whole gap
   between the intro's transition end and the row's first frame. Phone
   only: the desktop's schedule is exactly as it was. */
export const SB_LOGOS_BEAT_PHONE_S = 0.12;
export const SB_HEADLINE_AT = SB_TEXT_AT;
export const SB_CONTENT_AT = SB_HEADLINE_AT + 0.5;
export const SB_LINE_WIPE_AT = SB_OPEN_AT;
export const SB_LINE_WIPE_DUR = SB_SORT_AT - SB_OPEN_AT;
/* R65 item 2c: SIX images decode now, not three — the gate's budget and
   the failsafe both move up to cover them (and the sequence itself is
   ~2.2s longer). */
export const SB_READY_TIMEOUT_MS = 3500;
export const SB_FAILSAFE_MS = 20000;

/* R69 (Oscar, 2026-09-04) — THE COUNT'S EASE: fast away, decelerating,
   then EVENLY PACED to the end.
   WHAT WAS WRONG: power3.out. Its tail is almost flat, so the last
   numbers crawl — 98→99 took 0.18s and 99→100 took 0.95s, which is
   the "going from 99 to 100 is too slow" exactly.
   WHAT THIS IS: a quadratic that decelerates from a fast start to
   reach SB_COUNT_KNEE_V of the count at SB_COUNT_KNEE_T of the time,
   joined to a straight line for the rest — so the final stretch runs
   at ONE constant rate and 98, 99 and 100 are evenly spaced by
   construction, not by tuning. The join is smooth because the
   quadratic's coefficients are solved for the line's own slope at the
   knee: no stall, no kink.
   With the shipped values the opening runs at 3.05× the average rate
   and the last ten numbers take 0.135s each — against 0.95s for the
   final step before. */
const SB_COUNT_KNEE_T = 0.55; /* of the duration */
const SB_COUNT_KNEE_V = 0.9;  /* of the count */
const countEase = (x) => {
  const K = SB_COUNT_KNEE_T;
  const V = SB_COUNT_KNEE_V;
  const m = (1 - V) / (1 - K);          /* the tail's constant rate */
  if (x >= K) return V + (x - K) * m;   /* linear to 1 at x = 1 */
  const a = (m * K - V) / (K * K);      /* solved so f(K)=V and f'(K)=m */
  const b = m - 2 * a * K;
  return a * x * x + b * x;
};

/** The reference's CustomEase 'hop' — cubic-bezier(0.9, 0, 0.1, 1) — as
 *  a plain solver, so no Club plugin is needed. Newton with a bisection
 *  fallback; accurate to well under a pixel at these durations. */
function cubicBezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t;
  const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const fy = (t) => ((ay * t + by) * t + cy) * t;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) { const e = fx(t) - p; if (Math.abs(e) < 1e-6) return fy(t); const d = dfx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = p;
    for (let i = 0; i < 24; i++) { const e = fx(t); if (Math.abs(e - p) < 1e-6) break; if (e < p) lo = t; else hi = t; t = (lo + hi) / 2; }
    return fy(t);
  };
}
const hop = cubicBezierEase(0.9, 0, 0.1, 1);

/**
 * @param {HTMLElement} splashRoot  the shipped splash's root (this variant
 *   replaces its sequence; the root is removed as this one starts)
 * @returns {() => void} cleanup
 */
export function initSplashB(splashRoot) {
  const stage = document.querySelector('[data-splash-b]');
  const ground = document.querySelector('[data-sb-ground]');
  const counterBox = document.querySelector('[data-sb-counter]');
  const countEl = document.querySelector('[data-sb-count]');
  const bar = document.querySelector('[data-sb-bar]');
  const sbCards = Array.from(document.querySelectorAll('[data-sb-card]'));
  /* R65 item 2c: the three that arrive first and are thrown away. */
  const sbDiscards = Array.from(document.querySelectorAll('[data-sb-discard]'));
  const heroCards = Array.from(document.querySelectorAll('[data-landing-hero-card]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* THE REBUILD (2026-09-07): ONE sequence at every width. The narrow
     build's hero is the desktop's row of three now (the mobile pass's
     one-window-onto-the-video branch went with the video hero), so the
     three windows open and sort onto the hero's measured cards on the
     phone and the tablet exactly as they do at 1728. */

  let tl = null;
  let done = false;
  let locked = false;
  let failsafe = 0;

  /* ── the scroll lock: the modals' mechanism, plus the guards a modal
     gets free from its focus trap (keys) and the snap-back that covers
     programmatic scrolling, which `overflow: hidden` does not stop. */
  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const eat = (e) => e.preventDefault();
  const eatKey = (e) => { if (SCROLL_KEYS.has(e.key)) e.preventDefault(); };
  const snapBack = () => { if (window.scrollY !== 0) { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; } };
  const lockScroll = () => {
    if (locked) return;
    locked = true;
    getLenisInstance()?.stop();
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', eat, { passive: false });
    window.addEventListener('touchmove', eat, { passive: false });
    window.addEventListener('keydown', eatKey, { passive: false });
    window.addEventListener('scroll', snapBack, { passive: true });
  };
  const unlockScroll = () => {
    if (!locked) return;
    locked = false;
    window.removeEventListener('wheel', eat);
    window.removeEventListener('touchmove', eat);
    window.removeEventListener('keydown', eatKey);
    window.removeEventListener('scroll', snapBack);
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    const lenis = getLenisInstance();
    lenis?.scrollTo(0, { immediate: true, force: true });
    lenis?.start();
  };

  /* the page's own entrance beats — the SAME ones the shipped splash
     plays, so the hero's arrival vocabulary is the live one, not the
     reference's */
  /* R54 item 5 — THE NAV. index.astro boots initNavEntrance() after the
     splash, and that zeroes every nav part's opacity and then bows out
     when `data-ne-splash` is on, expecting the splash to drive their
     arrival. This variant never did, so the whole nav — wordmark, three
     links, LET'S CHAT, the menu label — sat at inline `opacity: 0` for
     the life of the page (measured). It now arrives on the site's own
     char ripple, the same sweep units and stagger the shipped splash
     uses, at the reference's content beat. The wordmark keeps its
     difference blend, so it composites against the red exactly as the
     main landing page's does over its own grounds. */
  const rippleNavIn = () => {
    ensureLogoChars();
    [
      document.querySelector('.home__logo'),
      document.querySelector('[data-menu-label-menu]'),
      ...document.querySelectorAll('.home__nav-link'),
      document.querySelector('.home__topbar-email'),
    ].forEach((part) => {
      if (!(part instanceof HTMLElement)) return;
      part.style.opacity = '';
      part.style.pointerEvents = '';
      sweepUnits(part).forEach((u, i) => {
        if (reduced) { u.style.opacity = ''; return; }
        u.classList.remove('nav-char-out', 'nav-char-in');
        void u.offsetWidth;
        u.style.animationDelay = `${(i * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
        u.classList.add('nav-char-in');
      });
    });
  };

  /* R59 items 1 + 5 (Oscar, 2026-09-04) — THE HERO'S TEXT ENTRANCE IS
     THE MAIN LANDING PAGE'S, VERBATIM.
     ITEM 1, DIAGNOSED: the intro paragraph beneath POWERED BY ACCESS.
     never appeared on this route. It is NOT missing from the markup and
     NOT dropped by the shared-component extraction — measured, both
     lines are present, the wrapper is `is-armed` and opacity 1. They sit
     at transform matrix(1,0,0,1,0,44): still parked 44px down inside
     their own reveal clips, so they are clipped out of sight. The hero
     module wraps and parks them at fonts-ready; the shipped splash
     RELEASES them in its playPageBeats with playLineRevealElement, and
     this variant's beats never called it. The same is true of the
     headline's wrapped lines. Sampled on the main page they read
     matrix(1,0,0,1,0,0) — released.
     ITEM 5: the fix and the entrance are therefore the same thing —
     splash.js's exact treatment, in its exact order. The MECHANISM is
     line-reveal.js's clip-and-slide (each line an .lr-clip box with an
     .lr-inner parked at +44px, released by playLineRevealElement); the
     DURATIONS, STAGGER and EASING live on the wrapped elements
     themselves, written by the hero module when it wrapped them (the
     headline's own two-line stagger, then the intro a beat behind at
     the headline stagger + INTRO_AFTER_HEADLINE_S). Playing them here
     rather than re-declaring anything is what makes this verbatim: the
     numbers are never restated in this file, so they cannot drift from
     the main page's.
     BEFORE (this route): headline released by nothing in this module,
     intro never released — parked at y44, invisible.
     AFTER: both released together on the settle beat, exactly as the
     shipped splash does at its own landing. */
  /* R68 (Oscar, 2026-09-04) — THE TEXT ARRIVES AS THE RED CLEARS, not at
     the settle. It was released inside playPageBeats, which runs when the
     whole timeline completes — TWO FULL SECONDS after the ground had
     faded, so the hero sat empty and then the copy appeared late. It is
     its own beat now, fired from the timeline at SB_TEXT_AT, which is
     derived as the moment the ground's fade-out COMPLETES: released a
     beat earlier and the lines would rise behind the red, which is the
     other half of what Oscar reported.
     THE ORDER WITHIN IT is not set here and must not be: the hero module
     writes each element's own reveal delay when it wraps them — the
     headline's two lines at 0 and 0.12, the intro at the headline's
     stagger + INTRO_AFTER_HEADLINE_S (0.39) — so one release call plays
     the headline first and the intro straight after its second line,
     exactly as the shipped splash does. Restating those numbers here
     would let the two pages drift.
     Idempotent, because the settle path calls it too: a skipped or
     failsafed sequence must still land the text. */
  /* R69 — THE HEADLINE HAD NO CLIPS TO PLAY. Diagnosed: the shipped
     splash WRAPS the two headline lines itself, in its own readiness
     gate and under its own cover (splash.js: a per-line revealDelay of
     i × the headline stagger, then wrapWordRevealElement); the hero
     module never wraps them. This variant only ever CALLED
     playLineRevealElement on them, which is a no-op against unwrapped
     lines — measured, zero .lr-inner elements under the headline — so
     the headline simply sat there while everything else animated.
     Wrapped here on the same terms: under this variant's own red ground,
     so the restructure is never seen, with the same per-line delay so
     the two lines stagger exactly as they do on the main page. */
  const HEADLINE_LINE_STAGGER_S = 0.12;
  let headlineWrapped = false;
  const wrapHeadline = () => {
    if (headlineWrapped) return;
    headlineWrapped = true;
    document.querySelectorAll('[data-landing-hero-headline-text] .landing-hero__headline-line')
      .forEach((el, i) => {
        if (!(el instanceof HTMLElement)) return;
        el.dataset.revealDelay = String(i * HEADLINE_LINE_STAGGER_S);
        wrapWordRevealElement(el);
      });
  };

  let textPlayed = false;
  const playHeroText = () => {
    if (textPlayed) return;
    textPlayed = true;
    wrapHeadline();
    document.querySelectorAll('[data-landing-hero-headline-text] .landing-hero__headline-line').forEach((el) => {
      if (el instanceof HTMLElement) playLineRevealElement(el);
    });
    document.querySelectorAll('[data-landing-hero-intro-text] p').forEach((p) => {
      if (p instanceof HTMLElement) playLineRevealElement(p);
    });
  };

  let logosPlayed = false;
  const playLogos = () => {
    if (logosPlayed) return;
    logosPlayed = true;
    const logos = document.querySelector('[data-landing-hero-logos]');
    if (logos instanceof HTMLElement) logos.classList.add('is-entered');
  };

  const playPageBeats = () => {
    playLogos();
    const cards = document.querySelector('[data-landing-hero-cards]');
    if (cards instanceof HTMLElement) cards.classList.add('is-entered');
    document.dispatchEvent(new CustomEvent('landing-hero:cards-entered'));
    playHeroText();
  };

  const settle = () => {
    if (done) return;
    done = true;
    if (failsafe) { clearTimeout(failsafe); failsafe = 0; }
    document.documentElement.classList.remove('sb-on');
    document.documentElement.classList.add('sb-landed');
    stage?.remove();
    unlockScroll();
    playPageBeats();
    /* THE MENU FIX (2026-09-07): Menu.astro defers its boot behind
       `splash:complete` whenever the page loads splash-active — the
       shipped splash dispatched it at its end; this variant never did, so
       on every root load the burger had no handler at all (measured on
       staging in WebKit and Chromium: aria-expanded stayed false after the
       splash). settle() is this sequence's single exit (natural end,
       skip, failsafe), so the event fires exactly once here. */
    document.dispatchEvent(new CustomEvent('splash:complete'));
  };
  const skip = () => { if (tl) tl.kill(); settle(); };

  /* the shipped splash's chrome never shows in this variant — its cover
     and travelling wordmark are removed if present. `splashRoot` IS this
     variant's own root, so it is never the thing removed here. */
  document.querySelector('[data-landing-splash]')?.remove();
  document.querySelector('[data-splash-logo]')?.remove();
  document.documentElement.classList.remove('splash-active');
  void splashRoot;

  if (reduced || !(stage instanceof HTMLElement) || sbCards.length !== 3 || heroCards.length !== 3) {
    skip();
    return () => {};
  }

  /* THE LANDING RECTS come from the live placed hero cards — but the
     hero module places them at fonts-ready, which lands AFTER this
     module boots (the shipped splash never had to care: its cover was
     already up). So waiting for them is part of the readiness gate
     below, not an assumption here. */
  let rects = [];
  const phone = isPhoneViewport();
  /* the phone: the stand-ins that have no card of their own (see the
     note at SB_PHONE_CARD) — they pile and clear, they do not travel */
  const sbExtras = phone ? sbCards.filter((_, i) => i !== SB_PHONE_CARD) : [];
  const sbTravellers = phone ? [sbCards[SB_PHONE_CARD]] : sbCards;
  const cardsPlaced = () => {
    const wrap = document.querySelector('.landing-hero__cards');
    if (!wrap || !wrap.classList.contains('is-placed')) return false;
    const r = heroCards.map((c) => c.getBoundingClientRect());
    const needed = phone ? [r[SB_PHONE_CARD]] : r;
    if (needed.some((x) => x.width < 1 || x.height < 1)) return false;
    rects = phone ? r.map(() => r[SB_PHONE_CARD]) : r;
    return true;
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* the centred row is the hero's row IN MINIATURE — filled in once the
     hero has placed itself, so the travel is a pure place-and-scale */
  let miniW = 0, miniH = 0, gap = 0, miniLeft = () => 0, miniTop = 0;
  /* The pile's arrival order is built in deriveMini (it needs the placed
     rects) and read by the timeline — declared here, in the scope both
     share. */
  let pileOrder = [];
  const deriveMini = () => {
    const cardW = rects[0].width;
    const cardH = rects[0].height;
    miniW = cardW * SB_MINI_SCALE;
    miniH = cardH * SB_MINI_SCALE;
    gap = 8 * SB_MINI_SCALE;
    const rowW = miniW * 3 + gap * 2;
    miniLeft = (i) => (vw - rowW) / 2 + i * (miniW + gap);
    miniTop = (vh - miniH) / 2;
    /* R59 item 3 — VERSION A'S GEOMETRY, PORTED VERBATIM (hero-entry.js):
       each stand-in's LAYOUT BOX is its own landing rect, and x/y carry
       it to the centre with scale 0. Nothing about the box changes after
       this, so the sort is a plain return to x:0 y:0 scale:1 — the
       destination is the real card's own box by construction, which is
       both the pixel-exactness discipline (no re-measured target, so the
       55px class of bug cannot recur) and the smooth-travel discipline
       (compositor transforms only, resolved once, one owner). */
    const centreLeft = vw / 2 - cardW / 2;
    const centreTop = vh / 2 - cardH / 2;
    /* R67 — THE PILE: SIX DEEP, ONE SIZE, STRAIGHT (version A's own
       geometry). Every card is set to the SAME centred position at the
       SAME card size and scales from 0 to SB_STACK_SCALE — no rotation,
       no offset, no size step. The discards borrow the middle card's box
       so they occupy exactly the same place; they never travel, so the
       box is only a size. The hero cards' FINAL state is still x:0 y:0
       scale:1 against their own landing box, so the sort remains a plain
       return to zero and the landing stays pixel-exact.
       ARRIVAL ORDER: the three discards, then hero LEFT, RIGHT and the
       MIDDLE last so it lands on top — version A's own reorder, kept. */
    pileOrder = [...sbDiscards, sbCards[0], sbCards[2], sbCards[1]];
    if (sbDiscards.length) gsap.set(sbDiscards, {
      top: rects[1].top, left: rects[1].left, width: rects[1].width, height: rects[1].height,
      transformOrigin: '50% 50%',
      x: centreLeft - rects[1].left,
      y: centreTop - rects[1].top,
      rotation: 0,
      scale: 0,
    });
    gsap.set(sbCards, {
      top: (i) => rects[i].top,
      left: (i) => rects[i].left,
      width: (i) => rects[i].width,
      height: (i) => rects[i].height,
      transformOrigin: '50% 50%',
      x: (i) => centreLeft - rects[i].left,
      y: (i) => centreTop - rects[i].top,
      rotation: 0,
      scale: 0,
      clipPath: 'none',
    });
    gsap.set(sbCards.map((c) => c.querySelector('img')), { scale: SB_IMG_SCALE_FROM });
    /* the phone: the two extras sit ABOVE the discards and BENEATH the
       middle card in the pile (the markup's z puts the right card on
       top), so the card that stays is the one the eye follows and the
       extras fade behind it exactly as the discards do */
    if (sbExtras.length) gsap.set(sbExtras, { zIndex: (i) => 13 + i });
  };

  /* the counter: fixed-width digit cells (see the component's note) */
  const renderCount = (n) => {
    if (!(countEl instanceof HTMLElement)) return;
    const s = String(n);
    /* R54 item 3:each digit lives inside its OWN overflow:hidden mask —
       the reference gets this from SplitText's `mask` option, which
       wraps each split char in a clipping box so it slides out of that
       box and disappears behind the ground. Ours slid bare over the
       ground. The mask is the wrapper; the digit inside is what moves. */
    if (countEl.childElementCount !== s.length) {
      countEl.textContent = '';
      for (const ch of s) {
        const mask = document.createElement('span');
        mask.className = 'splash-b__digitmask';
        const d = document.createElement('span');
        d.className = 'splash-b__digit';
        d.textContent = ch;
        mask.appendChild(d);
        countEl.appendChild(mask);
      }
    } else {
      [...countEl.children].forEach((m, i) => { const d = m.firstElementChild; if (d && d.textContent !== s[i]) d.textContent = s[i]; });
    }
  };
  renderCount(0);

  document.documentElement.classList.add('sb-on');
  lockScroll();
  window.scrollTo(0, 0);
  failsafe = window.setTimeout(settle, SB_FAILSAFE_MS);

  /* ── THE READINESS GATE, three things raced against one timeout:
     the fonts (the counter is a webfont), the three images decoding,
     and the HERO having placed its cards — the sequence's destination.
     If the cards are still not placed when the timeout fires there is
     nothing to travel to, so the sequence is skipped and the hero
     simply appears; a red screen with no exit is never an outcome. */
  /* R65 item 2c: SIX images now — the gate and the failsafe cover them
     all, not just the hero three. */
  const imgs = [...sbCards, ...sbDiscards].map((c) => c.querySelector('img')).filter(Boolean);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const decoded = Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  const placed = new Promise((resolve) => {
    if (cardsPlaced()) { resolve(true); return; }
    const t = window.setInterval(() => { if (cardsPlaced()) { window.clearInterval(t); resolve(true); } }, 40);
    window.setTimeout(() => { window.clearInterval(t); resolve(cardsPlaced()); }, SB_READY_TIMEOUT_MS);
  });
  const timeout = new Promise((r) => window.setTimeout(() => r('timeout'), SB_READY_TIMEOUT_MS));

  Promise.race([Promise.all([fontsReady, decoded, placed]), timeout]).then(() => {
    /* R70 (Oscar, 2026-09-04) — WRAP THE HEADLINE HERE, under the red.
       DIAGNOSED: the wrap was only happening inside playHeroText, which
       fires at SB_TEXT_AT — measured at t=9.02, while the ground began
       fading at 8.53 and was clear by 8.95. So for that half-second the
       headline was UNWRAPPED and therefore sitting there fully visible;
       the wrap then parked it (it vanished) and it animated back in by
       10.32. Exactly the "you see it, it disappears, it animates in"
       report. Wrapping at readiness — before the sequence draws a single
       frame, with the opaque red over the whole hero — means the lines
       are parked long before anything can be seen, so the first time
       they are visible is when they rise. */
    wrapHeadline();
    if (done) return;
    if (!cardsPlaced()) { skip(); return; }
    deriveMini();
    build();
  });

  function build() {
    const sortAt = SB_SORT_AT;
    const textAt = sortAt + SB_TRAVEL_DUR;
    const logosAt = textAt + SB_INTRO_SETTLE_S + (phone ? SB_LOGOS_BEAT_PHONE_S : 0);
    const contentAt = textAt + 0.5;
    const lineWipeDur = sortAt - SB_LINE_WIPE_AT;
    const counter = { value: 0 };
    tl = gsap.timeline({ onComplete: settle });

    /* ── the count, its scale and the hairline: all on the same 3s */
    tl.to(counter, {
      value: 100,
      duration: SB_COUNT_DUR,
      ease: countEase,
      onUpdate: () => renderCount(Math.floor(counter.value)),
      onComplete: () => {
        renderCount(100);
        gsap.to([...(countEl?.children || [])].map((m) => m.firstElementChild).filter(Boolean), {
          x: '-100%',
          duration: SB_DIGITS_OUT_DUR,
          ease: 'power3.out',
          stagger: SB_DIGITS_OUT_STAGGER,
          delay: SB_DIGITS_OUT_DELAY,
          onComplete: () => counterBox?.remove(),
        });
      },
    }, 0);
    if (counterBox instanceof HTMLElement) tl.to(counterBox, { scale: 1, duration: SB_COUNT_DUR, ease: 'power3.out' }, '<');
    if (bar instanceof HTMLElement) tl.to(bar, { scaleX: 1, duration: SB_COUNT_DUR, ease: 'power3.out' }, '<');

    /* ── THE STACK (SB_OPEN_AT): the three grow from nothing at the
       centre, one after another, piling on top of each other. Version
       A's order — LEFT, RIGHT, then the MIDDLE last so it lands on top
       of the pile (hero-entry.js's own reorder, kept). */
    tl.to(pileOrder, {
      scale: SB_STACK_SCALE, ease: 'power2.out',
      duration: SB_OPEN_DUR, stagger: SB_OPEN_STAGGER,
    }, SB_OPEN_AT);
    tl.to(imgs, { scale: 1, duration: SB_OPEN_DUR, ease: 'power2.out', stagger: SB_OPEN_STAGGER }, SB_OPEN_AT);

    /* ── THE DISCARDS CLEAR (R70): they must NEVER be seen. The pile is
       six cards at one identical rect, so the top card occludes the five
       beneath it exactly — and the R65 exit broke that by sliding them
       DOWN 40px and blurring them, which walked them out from under the
       top card's bottom edge in full view (measured: discard tops at
       404 / 419 / 427 against a top card fixed at 387, on a 343-tall
       card). They now leave with NO displacement at all: a short opacity
       fade in place, entirely behind the card above them, so what the eye
       sees is one image throughout and then the three heroes departing.
       No blur, no drift — a moving element cannot stay hidden behind a
       stationary one. Removed from the DOM on completion. */
    if (sbDiscards.length) {
      tl.to(sbDiscards, {
        opacity: 0,
        duration: SB_DISCARD_OUT_DUR,
        ease: 'none',
        stagger: SB_DISCARD_OUT_STAGGER,
        onComplete: () => sbDiscards.forEach((d) => d.remove()),
      }, SB_DISCARD_OUT_AT);
    }
    /* the phone's two extras clear on the same beat, the same fade, no
       stagger — so they are gone within the discards' own window, before
       the middle card leaves the pile and would expose them */
    if (sbExtras.length) {
      tl.to(sbExtras, {
        opacity: 0,
        duration: SB_DISCARD_OUT_DUR,
        ease: 'none',
        onComplete: () => sbExtras.forEach((d) => d.remove()),
      }, SB_DISCARD_OUT_AT);
    }

    /* ── THE SORT: a plain return to zero — x, y and scale only, on the
       compositor, with the destination already the element's own layout
       box. Per-frame deltas verified monotonic with no reversals. */
    tl.to(sbTravellers, {
      x: 0, y: 0, scale: 1, ease: 'power3.inOut',
      duration: SB_TRAVEL_DUR, stagger: SB_TRAVEL_STAGGER,
    }, sortAt);


    /* R54 item 7: the line WIPES AWAY left → right — its left edge
       travels right until it meets the right end — starting as the
       images appear and finishing exactly as the travel begins. The
       second line that used to ride over the first is gone. */
    if (bar instanceof HTMLElement) tl.to(bar, { clipPath: 'inset(0 0 0 100%)', duration: lineWipeDur, ease: hop }, SB_LINE_WIPE_AT);
    /* the red resolves to the hero's own ground as the three come home */
    if (ground instanceof HTMLElement) tl.to(ground, { opacity: 0, duration: SB_GROUND_OUT_DUR, ease: 'power1.inOut' }, sortAt + SB_TRAVEL_DUR - SB_GROUND_OUT_DUR);

    /* ── the headline, then the nav and the rest — OUR vocabulary on the
       reference's clock. The hero's own modules own these reveals. */
    tl.add(() => {
      playHeroText();
      document.dispatchEvent(new CustomEvent('landing-splash-b:headline'));
    }, textAt);
    tl.add(playLogos, logosAt);
    tl.add(() => { rippleNavIn(); document.dispatchEvent(new CustomEvent('landing-splash-b:content')); }, contentAt);
    /* hold the timeline open to the last beat so onComplete is the settle */
    tl.to({}, { duration: 0.5 }, contentAt + 1);
  }

  if (import.meta.env.DEV) {
    window.__splashB = {
      timeline: () => tl, time: () => (tl ? +tl.time().toFixed(2) : null),
      total: () => (tl ? +tl.duration().toFixed(2) : null),
      seek: (t) => tl?.pause(t), play: () => tl?.play(), skip,
      settled: () => done,
      rects: () => rects.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]),
      mini: () => sbCards.map((_, i) => [Math.round(miniLeft(i)), Math.round(miniTop), Math.round(miniW), Math.round(miniH)]),
    };
  }

  return () => {
    if (tl) tl.kill();
    if (failsafe) clearTimeout(failsafe);
    unlockScroll();
    document.documentElement.classList.remove('sb-on', 'sb-landed');
  };
}
