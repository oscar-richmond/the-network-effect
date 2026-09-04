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

/* ── the reference's timings, verbatim */
export const SB_COUNT_DUR = 3;
export const SB_DIGITS_OUT_DELAY = 1;
export const SB_DIGITS_OUT_DUR = 0.75;
export const SB_DIGITS_OUT_STAGGER = 0.1;
export const SB_OPEN_AT = 4.5;
export const SB_OPEN_DUR = 1.5;
export const SB_TRAVEL_AT = 6;
export const SB_TRAVEL_DUR = 2;
export const SB_HEADLINE_AT = 7;
export const SB_CONTENT_AT = 7.5;
/* ── ours */
export const SB_MINI_SCALE = 0.42;      /* the centred row, as a fraction of the hero's */
export const SB_OPEN_STAGGER = 0.12;    /* three windows appearing — three events */
export const SB_TRAVEL_STAGGER = 0.08;  /* echoes the hero's own left/middle/right order */
export const SB_IMG_SCALE_FROM = 2;     /* the reference's inner-image scale */
export const SB_IMG_SCALE_MID = 1.5;
export const SB_GROUND_OUT_DUR = 0.6;   /* red resolving to the hero's ground */
export const SB_READY_TIMEOUT_MS = 2500;
export const SB_FAILSAFE_MS = 15000;

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
  const barFill = document.querySelector('[data-sb-barfill]');
  const sbCards = Array.from(document.querySelectorAll('[data-sb-card]'));
  const heroCards = Array.from(document.querySelectorAll('[data-landing-hero-card]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const playPageBeats = () => {
    const logos = document.querySelector('[data-landing-hero-logos]');
    if (logos instanceof HTMLElement) logos.classList.add('is-entered');
    const cards = document.querySelector('[data-landing-hero-cards]');
    if (cards instanceof HTMLElement) cards.classList.add('is-entered');
    document.dispatchEvent(new CustomEvent('landing-hero:cards-entered'));
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
  };
  const skip = () => { if (tl) tl.kill(); settle(); };

  /* the shipped splash's chrome never shows in this variant — its cover
     and travelling wordmark are removed if present. `splashRoot` IS this
     variant's own root, so it is never the thing removed here. */
  document.querySelector('[data-landing-splash]')?.remove();
  document.querySelector('[data-splash-logo]')?.remove();
  document.documentElement.classList.remove('splash-active');
  void splashRoot;

  if (reduced || !(stage instanceof HTMLElement) || sbCards.length !== 3 || heroCards.length !== 3
      || !window.matchMedia('(min-width: 1025px)').matches) {
    skip();
    return () => {};
  }

  /* THE LANDING RECTS come from the live placed hero cards — but the
     hero module places them at fonts-ready, which lands AFTER this
     module boots (the shipped splash never had to care: its cover was
     already up). So waiting for them is part of the readiness gate
     below, not an assumption here. */
  let rects = [];
  const cardsPlaced = () => {
    const wrap = document.querySelector('.landing-hero__cards');
    if (!wrap || !wrap.classList.contains('is-placed')) return false;
    const r = heroCards.map((c) => c.getBoundingClientRect());
    if (r.some((x) => x.width < 1 || x.height < 1)) return false;
    rects = r;
    return true;
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* the centred row is the hero's row IN MINIATURE — filled in once the
     hero has placed itself, so the travel is a pure place-and-scale */
  let miniW = 0, miniH = 0, gap = 0, miniLeft = () => 0, miniTop = 0;
  const deriveMini = () => {
    const cardW = rects[0].width;
    const cardH = rects[0].height;
    miniW = cardW * SB_MINI_SCALE;
    miniH = cardH * SB_MINI_SCALE;
    gap = (rects[1].left - rects[0].left - cardW) * SB_MINI_SCALE;
    const rowW = miniW * 3 + gap * 2;
    miniLeft = (i) => (vw - rowW) / 2 + i * (miniW + gap);
    miniTop = (vh - miniH) / 2;
    gsap.set(sbCards, {
      top: miniTop, left: (i) => miniLeft(i), width: miniW, height: miniH,
      clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)',
    });
    gsap.set(sbCards.map((c) => c.querySelector('img')), { scale: SB_IMG_SCALE_FROM });
  };

  /* the counter: fixed-width digit cells (see the component's note) */
  const renderCount = (n) => {
    if (!(countEl instanceof HTMLElement)) return;
    const s = String(n);
    if (countEl.childElementCount !== s.length) {
      countEl.textContent = '';
      for (const ch of s) { const d = document.createElement('span'); d.className = 'splash-b__digit'; d.textContent = ch; countEl.appendChild(d); }
    } else {
      [...countEl.children].forEach((el, i) => { if (el.textContent !== s[i]) el.textContent = s[i]; });
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
  const imgs = sbCards.map((c) => c.querySelector('img')).filter(Boolean);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const decoded = Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  const placed = new Promise((resolve) => {
    if (cardsPlaced()) { resolve(true); return; }
    const t = window.setInterval(() => { if (cardsPlaced()) { window.clearInterval(t); resolve(true); } }, 40);
    window.setTimeout(() => { window.clearInterval(t); resolve(cardsPlaced()); }, SB_READY_TIMEOUT_MS);
  });
  const timeout = new Promise((r) => window.setTimeout(() => r('timeout'), SB_READY_TIMEOUT_MS));

  Promise.race([Promise.all([fontsReady, decoded, placed]), timeout]).then(() => {
    if (done) return;
    if (!cardsPlaced()) { skip(); return; }
    deriveMini();
    build();
  });

  function build() {
    const counter = { value: 0 };
    tl = gsap.timeline({ onComplete: settle });

    /* ── the count, its scale and the hairline: all on the same 3s */
    tl.to(counter, {
      value: 100,
      duration: SB_COUNT_DUR,
      ease: 'power3.out',
      onUpdate: () => renderCount(Math.floor(counter.value)),
      onComplete: () => {
        renderCount(100);
        gsap.to([...(countEl?.children || [])], {
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

    /* ── the three open from their points, left → right */
    tl.to(sbCards, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: SB_OPEN_DUR, ease: hop, stagger: SB_OPEN_STAGGER,
    }, SB_OPEN_AT);
    tl.to(imgs, { scale: SB_IMG_SCALE_MID, duration: SB_OPEN_DUR, ease: hop, stagger: SB_OPEN_STAGGER }, SB_OPEN_AT);

    /* ── THE TRAVEL — the reference's full-bleed beat is this instead:
       each lands on its own hero card's measured rect. */
    /* The destination is read LIVE, when this tween first renders at
       SB_TRAVEL_AT — not at build time. The hero re-places its cards
       once fonts have settled, and a destination captured earlier
       lands them in the wrong place (measured: 808 against the hero's
       real 753). Function-based values are GSAP's own answer to this. */
    tl.to(sbCards, {
      top: (i) => heroCards[i].getBoundingClientRect().top,
      left: (i) => heroCards[i].getBoundingClientRect().left,
      width: (i) => heroCards[i].getBoundingClientRect().width,
      height: (i) => heroCards[i].getBoundingClientRect().height,
      duration: SB_TRAVEL_DUR, ease: hop, stagger: SB_TRAVEL_STAGGER,
    }, SB_TRAVEL_AT);
    tl.to(imgs, { scale: 1, duration: SB_TRAVEL_DUR, ease: hop, stagger: SB_TRAVEL_STAGGER }, SB_TRAVEL_AT);
    if (barFill instanceof HTMLElement) tl.to(barFill, { scaleX: 1, duration: SB_TRAVEL_DUR, ease: hop }, SB_TRAVEL_AT);
    /* the red resolves to the hero's own ground as the three come home */
    if (ground instanceof HTMLElement) tl.to(ground, { opacity: 0, duration: SB_GROUND_OUT_DUR, ease: 'power1.inOut' }, SB_TRAVEL_AT + SB_TRAVEL_DUR - SB_GROUND_OUT_DUR);

    /* ── the headline, then the nav and the rest — OUR vocabulary on the
       reference's clock. The hero's own modules own these reveals. */
    tl.add(() => { document.dispatchEvent(new CustomEvent('landing-splash-b:headline')); }, SB_HEADLINE_AT);
    tl.add(() => { document.dispatchEvent(new CustomEvent('landing-splash-b:content')); }, SB_CONTENT_AT);
    /* hold the timeline open to the last beat so onComplete is the settle */
    tl.to({}, { duration: 0.5 }, SB_CONTENT_AT + 1);
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
