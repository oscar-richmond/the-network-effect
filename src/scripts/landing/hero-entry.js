/**
 * THE HERO ENTRY ANIMATION (R47, Oscar 2026-09-04) — RESTORED from the
 * /about-3 hero, which is still live at /old (AboutHero.astro, last
 * touched f5bd176, 2026-07-14; the pile/sort itself unchanged since
 * 7129de1, 2026-07-08).
 *
 * WHAT IT DOES, in the original's own beats and constants:
 *   0.20s  textIn    "BUILT ON TRUST." and "POWERED BY ACCESS." rise
 *                    50px into place either side of the screen's centre
 *                    line (the original's `.about-hero__header`: an
 *                    absolutely-positioned flex row at top 50% with
 *                    space-around, so the two phrases sit left and
 *                    right of where the pile lands).
 *   0.45s  stack     SIX images burst from scale 0 to BURST_SCALE at
 *                    the exact centre of the viewport, 0.12 apart —
 *                    three extra "flash" images first, then the three
 *                    hero images in the order left, right, MIDDLE, so
 *                    the middle one lands last and sits on top of the
 *                    pile (the original's HERO_STACK_Z_INDEX and its
 *                    reordered `stackOrderImgs`).
 *   +hold  1.0s      the pile sits.
 *   flashOut         the three extra images fade and shrink away,
 *                    0.12 apart, and are removed.
 *   textOut          the two phrases rise 60 and fade; the header goes.
 *   fly              the three hero images SORT OUT of the pile into
 *                    their resting row, 0.10 apart, power3.inOut.
 *   cardsLand        the red ground resolves to the hero's own ground
 *                    and the page's normal entrance beats take over.
 *
 * ADAPTATIONS, and why (the surrounding code has moved on since /old):
 *  1. STAND-IN ELEMENTS, not the real cards. On /old the timeline
 *     animated the hero cards themselves. Here the card wrapper's
 *     transform is owned by landing-hero-scroll.js's scrubbed exit
 *     tween (a scrub drives its `y` toward the current progress on
 *     every ticker frame, so an entry tween on the same element would
 *     be fought), and the WebGL gallery mirrors each card's live rect.
 *     So the entry runs on its own `[data-he-card]` stand-ins, which
 *     land pixel-exact on the real cards' placed rects; the real cards
 *     are revealed at that instant and the entry stage is removed. The
 *     handoff is invisible by construction because the two boxes are
 *     the same box.
 *  2. THE RED GROUND is its own layer inside the entry stage, not a
 *     repaint of `.landing-hero__bg`. The hero's ground element is the
 *     target of the scroll fade's `fromTo` (light → #161616, with
 *     immediateRender), so painting it red would put two owners on one
 *     property. The entry's ground fades out at the sort's landing,
 *     revealing the hero's own ground underneath — nothing else is
 *     touched.
 *  3. THE THIRD FLASH IMAGE stays with the other two. On /old the last
 *     one flew into the "CULTURAL" word of the tagline; the landing has
 *     no such slot, so all three take the same flashOut.
 *  4. THE THREE LANDING POSITIONS are the CURRENT hero's — the row the
 *     scroll module places (`.landing-hero__card`), which sits below
 *     the headline and intro and is CROPPED BY THE VIEWPORT BOTTOM
 *     (rest top 752.9 of a 1117 interior, card height 624, so 260 of
 *     each image is below the fold), and which later rises and exits on
 *     scroll. Read live from the cards, never re-derived here.
 *
 * FIRST VISIT ONLY: it rides the splash's own gate — splash.js's
 * `ne-splash-seen` sessionStorage key, so it plays when the splash
 * plays. `?entry=1` forces it by opening that gate (LandingSplash's
 * pre-paint script); `?entry=0` suppresses it (splash.js) and leaves
 * the shipped card entrance. There is no exported helper for this: an
 * earlier one was never imported, so its documented contract was
 * simply false — the sweep caught it.
 *
 * REDUCED MOTION: no pile, no sort, no red — `skip()` puts the hero on
 * its normal ground immediately and hands straight to the page beats.
 *
 * BUILD FLAG: HERO_ENTRY (src/data/flags.js) — dev only; the markup is
 * not rendered at all in a production build.
 */
import gsap from 'gsap';
import { getLenisInstance } from './site-scroll.js';

/* ── the original's constants, verbatim (about-3 AboutHero.astro) ── */
export const HE_BURST_STAGGER = 0.12;
export const HE_BURST_DUR = 0.75;
export const HE_BURST_SCALE = 0.55;
export const HE_STACK_HOLD = 1.0;
export const HE_FLASH_OUT_DUR = 0.35;
export const HE_FLY_STAGGER = 0.1;
export const HE_FLY_DUR = 1.0;
export const HE_TEXT_STAGGER = 0.12;
export const HE_TEXT_DUR = 0.8;
export const HE_TEXT_IN_AT = 0.2;
export const HE_STACK_AT = 0.45;
/* R47's own beat: the red ground resolving to the hero's ground as the
   sort settles (Oscar's instinct — timed, at the landing). */
export const HE_GROUND_OUT_DUR = 0.6;
/* R48 — THE READINESS GATE. The loading line and its asset gate lived
   in the black splash; with that hidden the entry needs its own, or
   the pile can burst before its images have decoded. The six images
   are decoded before the timeline starts, and the wait is RACED
   against HE_READY_TIMEOUT_MS so a slow or broken image can never
   strand anyone on a red screen — on timeout the sequence simply
   starts. */
export const HE_READY_TIMEOUT_MS = 2500;
/* The outer failsafe: if the timeline itself never completes (a killed
   tween, a background tab throttling rAF), this forces the settle —
   the stage goes, the scroll lock releases and the page's own beats
   run. Comfortably past the sequence's ~5.7s. */
export const HE_FAILSAFE_MS = 12000;
const HE_N = 3;
const HE_FLY_TOTAL = (HE_N - 1) * HE_FLY_STAGGER + HE_FLY_DUR;
const HE_TEXT_TOTAL = (HE_N - 1) * HE_TEXT_STAGGER + HE_TEXT_DUR;

/**
 * @param {{ onSettled: () => void }} opts  onSettled runs the page's own
 *   entrance beats (headline, intro, logo row, the cards' is-entered and
 *   the WebGL handoff) — exactly what splash.js plays without the entry.
 * @returns {() => void} cleanup
 */
export function initHeroEntry(opts = {}) {
  const onSettled = typeof opts.onSettled === 'function' ? opts.onSettled : () => {};
  const stage = document.querySelector('[data-he-stage]');
  const cards = Array.from(document.querySelectorAll('[data-landing-hero-card]'));
  const entryCards = Array.from(document.querySelectorAll('[data-he-card]'));
  const flashes = Array.from(document.querySelectorAll('[data-he-flash]'));
  const header = document.querySelector('[data-he-header]');
  const texts = Array.from(document.querySelectorAll('[data-he-text]'));
  const ground = document.querySelector('[data-he-ground]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tl = null;
  let done = false;
  let locked = false;
  let failsafe = 0;

  /* ── R48 item 3 — THE SCROLL LOCK. The modals' own mechanism, reused
     verbatim (contact.js / start-project.js): Lenis stopped and the
     body's overflow hidden. Those two cover wheel, trackpad and touch;
     the modals get keyboard for free from their focus trap, which this
     has none of, so the scroll keys are swallowed here as well. Every
     listener is passive:false because preventDefault is the point. */
  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const eat = (e) => { e.preventDefault(); };
  /* PROGRAMMATIC scroll needs its own guard: `overflow: hidden` on the
     root stops USER scrolling but Chrome still lets a script set
     scrollTop (measured: with html and body both computed hidden,
     window.scrollTo(0, 2000) left documentElement.scrollTop at 2000).
     So anything that does move the document is snapped straight back
     within the same frame — nothing ever renders off zero, and the
     position at release is zero by construction. */
  const snapBack = () => { if (window.scrollY !== 0) { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; } };
  const eatKey = (e) => {
    if (!SCROLL_KEYS.has(e.key)) return;
    const t = e.target;
    /* never swallow a key inside a field (there is none up during the
       entry, but the guard costs nothing and cannot regress a form) */
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
  };
  const lockScroll = () => {
    if (locked) return;
    locked = true;
    getLenisInstance()?.stop();
    /* BOTH elements, the splash's own discipline (`html.splash-active,
       html.splash-active body { overflow: hidden }`): body alone leaves
       the document scrollable, so a PROGRAMMATIC window.scrollTo still
       moved the page (measured: scrollTo(0, 2000) landed at 2000).
       With the root non-scrollable there is nowhere to scroll to. */
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
    /* AT ZERO on release — nothing accumulated while the lock was on
       may be applied after it. Both the document and Lenis are reset
       before the smooth scroller is restarted. */
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    const lenis = getLenisInstance();
    lenis?.scrollTo(0, { immediate: true, force: true });
    lenis?.start();
  };

  /* the entry stage removed, the real cards shown, the page's beats run */
  const settle = () => {
    if (done) return;
    done = true;
    if (failsafe) { clearTimeout(failsafe); failsafe = 0; }
    document.documentElement.classList.remove('he-on');
    document.documentElement.removeAttribute('data-ne-entry');
    stage?.remove();
    unlockScroll();
    onSettled();
  };

  /* RM and every failure path: no pile, no sort, no red */
  const skip = () => {
    if (tl) tl.kill();
    settle();
  };

  /* DESKTOP ONLY — the mobile hero is the video; below the seam the
     page's normal beats play untouched. */
  if (!window.matchMedia('(min-width: 1025px)').matches) {
    skip();
    return () => {};
  }
  if (!(stage instanceof HTMLElement) || entryCards.length !== 3 || cards.length !== 3) {
    skip();
    return () => {};
  }
  if (reduced) {
    skip();
    return () => {};
  }

  /* THE LANDING RECTS — the live placed cards, read once at start: the
     scroll module has already written top/left/width/height on them
     (placeCards runs at fontsReady, before the splash's cover lifts). */
  const rects = cards.map((c) => c.getBoundingClientRect());
  if (rects.some((r) => r.width < 1 || r.height < 1)) {
    skip();
    return () => {};
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = rects[0].width;
  const cardH = rects[0].height;
  const centreLeft = vw / 2 - cardW / 2;
  const centreTop = vh / 2 - cardH / 2;

  /* the stand-ins start ON their landing rects, offset to the centre —
     the original's getCentreOffsets, so `fly` is a plain x/y/scale
     return to zero and the landing is the real card's own box */
  gsap.set(entryCards, {
    top: (i) => rects[i].top,
    left: (i) => rects[i].left,
    width: (i) => rects[i].width,
    height: (i) => rects[i].height,
    x: (i) => centreLeft - rects[i].left,
    y: (i) => centreTop - rects[i].top,
    scale: 0,
  });
  gsap.set(flashes, { top: centreTop, left: centreLeft, width: cardW, height: cardH, scale: 0, opacity: 1 });

  document.documentElement.classList.add('he-on');
  /* R48 item 3: locked from the first frame of the sequence, released
     only at settle (including every failsafe path below). */
  lockScroll();
  window.scrollTo(0, 0);
  failsafe = window.setTimeout(settle, HE_FAILSAFE_MS);

  /* the pile's arrival order: the three extras, then left, right, and
     the MIDDLE last so it lands on top (the original's reorder) */
  const stackEls = [...flashes, entryCards[0], entryCards[2], entryCards[1]];
  const stackTotal = (stackEls.length - 1) * HE_BURST_STAGGER + HE_BURST_DUR;

  /* ── R48 THE READINESS GATE: decode the six images first, raced
     against HE_READY_TIMEOUT_MS. `decode()` rejects on a broken image,
     so every promise is caught — a missing file delays nothing. */
  const imgs = [...flashes, ...entryCards].map((el) => el.querySelector('img')).filter(Boolean);
  const decoded = Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  const timeout = new Promise((r) => window.setTimeout(r, HE_READY_TIMEOUT_MS));

  Promise.race([decoded, timeout]).then(() => {
    if (done) return;
    build();
  });

  function build() {
  tl = gsap.timeline({ onComplete: settle });

  tl.addLabel('textIn', HE_TEXT_IN_AT);
  /* fromTo, not from: the phrases rest at opacity 0 in CSS so the
     pre-paint red frame is the ground alone, which means `from` would
     animate 0 → 0. The visible result is the original's. */
  tl.fromTo(texts, { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: 'power4.inOut', duration: 1, stagger: { amount: 0.15 } }, 'textIn');

  tl.addLabel('stack', HE_STACK_AT);
  tl.to(stackEls, { scale: HE_BURST_SCALE, ease: 'power2.out', duration: HE_BURST_DUR, stagger: HE_BURST_STAGGER }, 'stack');

  tl.addLabel('stackHold', `stack+=${stackTotal}`);
  tl.to({}, { duration: HE_STACK_HOLD }, 'stackHold');

  tl.addLabel('flashOut', `stackHold+=${HE_STACK_HOLD - HE_FLASH_OUT_DUR}`);
  tl.to(flashes, {
    opacity: 0,
    scale: 0,
    ease: 'power2.in',
    duration: HE_FLASH_OUT_DUR,
    stagger: { amount: 0.12 },
    onComplete: () => flashes.forEach((el) => el.remove()),
  }, 'flashOut');

  tl.addLabel('textOut', `stackHold+=${HE_STACK_HOLD}`);
  tl.to(texts, {
    y: -60,
    opacity: 0,
    ease: 'power4.inOut',
    duration: HE_TEXT_DUR,
    stagger: { amount: HE_TEXT_STAGGER },
    onComplete: () => header?.remove(),
  }, 'textOut');

  tl.addLabel('fly', `textOut+=${HE_TEXT_TOTAL}`);
  tl.to(entryCards, { x: 0, y: 0, scale: 1, ease: 'power3.inOut', duration: HE_FLY_DUR, stagger: HE_FLY_STAGGER }, 'fly');

  /* THE LANDING — the real cards take over from the stand-ins on the
     same rects, and the red ground resolves to the hero's own. */
  tl.addLabel('cardsLand', `fly+=${HE_FLY_TOTAL}`);
  tl.add(() => { document.documentElement.classList.add('he-landed'); }, 'cardsLand');
  if (ground instanceof HTMLElement) {
    tl.to(ground, { opacity: 0, ease: 'power1.inOut', duration: HE_GROUND_OUT_DUR }, 'cardsLand');
  }

  }

  if (import.meta.env.DEV) {
    window.__heroEntry = {
      timeline: () => tl,
      progress: () => (tl ? +tl.progress().toFixed(3) : null),
      time: () => (tl ? +tl.time().toFixed(2) : null),
      labels: () => (tl ? tl.labels : null),
      total: () => (tl ? +tl.duration().toFixed(2) : null),
      seek: (t) => { tl?.pause(t); },
      play: () => tl?.play(),
      skip,
      settled: () => done,
    };
  }

  return () => { if (tl) tl.kill(); if (failsafe) clearTimeout(failsafe); unlockScroll(); document.documentElement.classList.remove('he-on', 'he-landed'); };
}
