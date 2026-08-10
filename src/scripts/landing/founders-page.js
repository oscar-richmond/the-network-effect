/**
 * /founders — the two-slide fixed-viewport driver.
 *
 * DRIVER LINEAGE: the /work page's virtual scroller PORTED — wheel
 * → target 1:1 (deltaMode-scaled), touch 1:1 with flick momentum
 * (0.95 decay), one owned rAF loop lerping pos → target at the
 * house 0.065 (= site-scroll's SCROLL_LERP — keep in step), a
 * stepScroll ref for the occluded-pane tickOnce convention, and
 * gsap-proxy glides for snaps/jumps (one writer).
 *
 * PHASE MAP (one axis, all windows px, everything a pure function
 * of pos — reversible by construction):
 *   P1 [0, T)            Robbo's name travels top→terminus: top
 *                        edge at the portrait's LIVE centre →
 *                        bottom edge 40px above its LIVE bottom
 *                        (layout `top`, never transform — the
 *                        landing-founders blend rule; the name is
 *                        difference). T = the travel distance (1:1).
 *   P2 [T, T+600)        the slide transition: slide-1 text
 *                        staggers OUT (blur+fade) over the first
 *                        half, slide-2 IN over the second; the
 *                        portrait blur-crossfades (the standard
 *                        house dissolve — the /old noise-dissolve
 *                        is a WebGL shader welded to the old hero,
 *                        not portable); the indicator label rides
 *                        its 64px and ROLLS 01→02 at the midpoint;
 *                        aria-live announces. SNAPPED: idle inside
 *                        the window glides the TARGET to the
 *                        nearest boundary (the access one-writer
 *                        lesson).
 *   P3 [.., +T)          Ashley's travel, same clamps.
 *   P4 [.., +156+811]    release: the stage rides up 156 (until
 *                        180px remains below the portrait — the
 *                        design rests at 24, so 156 more), then
 *                        the /work footer-reveal grammar: the
 *                        stage keeps riding up 811 over the fixed
 *                        footer wrap. Free (unsnapped), reversible.
 *
 * RM: the driver applies DISCRETE states — names pinned at their
 * termini, the transition swaps instantly past its midpoint, no
 * crossfade choreography (hard swap), release instant-follow (no
 * lerp). Touch keeps the /work handling.
 */

import gsap from 'gsap';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';
import { FOUNDERS_SLIDES } from '../../data/landing/founders-page.js';

const SCROLL_SMOOTH_LERP = 0.065; /* = site-scroll SCROLL_LERP */
const TRANSITION_PX = 600;
const RELEASE_RISE_PX = 96; /* the 120px white gap − the 24 rest (rev 2) */
const FOOTER_REVEAL_PX = 811;
const NAME_END_GAP_PX = 40;
const SNAP_IDLE_MS = 600;
const STAGGER_STEP = 0.15; /* per-element transition offset */
const NAV_EXIT_EPSILON_PX = 2;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function initFoundersPage() {
  const stage = document.querySelector('[data-founders-stage]');
  if (!(stage instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  if (narrow) return () => {}; /* the static stacked fallback (CSS) */

  const content = stage.querySelector('[data-fd-content]');
  const portrait = stage.querySelector('[data-fd-portrait]');
  const imgOver = stage.querySelector('[data-fd-img-over]');
  const slides = Array.from(stage.querySelectorAll('[data-fd-slide]'));
  const names = slides.map((_, i) => stage.querySelector(`[data-fd-name][data-slide="${i}"]`));
  const elsPerSlide = slides.map((s) => Array.from(s.querySelectorAll('[data-fd-el]')));
  const thumbs = Array.from(stage.querySelectorAll('[data-fd-thumb]'));
  const labelRow = stage.querySelector('[data-fd-labelrow]');
  const label = stage.querySelector('[data-fd-label]');
  const live = stage.querySelector('[data-fd-live]');
  const footerWrap = document.querySelector('[data-fd-footer]');

  /* ── Geometry (LIVE — re-derived on resize so 1470/1512 heights
     clamp correctly). */
  let nameStartTop = 0;
  let nameTravel = 1;
  /* Robbo's name (slide 0) is placed so the PORTRAIT'S LEFT EDGE
     runs through the middle of the first "b" (Oscar's rev 4).
     Derived from the live glyph box — a Range over that single
     character — so it holds at any name size, after the webfont
     swaps, and at every viewport (the shell's interior included).
     Ashley's name has no "b" and keeps the authored left. */
  const alignNameToPortrait = () => {
    const el = names[0];
    if (!(el instanceof HTMLElement) || !(portrait instanceof HTMLElement)) return;
    const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
    if (!textNode) return;
    const i = (textNode.textContent || '').toLowerCase().indexOf('b');
    if (i < 0) return;
    el.style.left = ''; /* measure from the CSS anchor, never a prior result */
    const range = document.createRange();
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const glyph = range.getBoundingClientRect();
    if (!glyph.width) return; /* font not ready — the fonts hook re-runs this */
    const offsetToGlyphCentre = glyph.left + glyph.width / 2 - el.getBoundingClientRect().left;
    el.style.left = `${(portrait.getBoundingClientRect().left - offsetToGlyphCentre).toFixed(1)}px`;
  };

  const measure = () => {
    const pr = portrait instanceof HTMLElement ? portrait.getBoundingClientRect() : null;
    const imgTop = pr ? pr.top : 88;
    const imgBottom = pr ? pr.bottom : window.innerHeight - 24;
    const nameH = names[0] instanceof HTMLElement ? names[0].offsetHeight : 56;
    nameStartTop = imgTop + (imgBottom - imgTop) / 2;
    const nameEndTop = imgBottom - NAME_END_GAP_PX - nameH;
    nameTravel = Math.max(nameEndTop - nameStartTop, 1);
    alignNameToPortrait();
  };
  measure();

  const T = () => nameTravel; /* the 1:1 travel window */
  const transStart = () => T();
  const p3Start = () => T() + TRANSITION_PX;
  const releaseStart = () => p3Start() + T();
  const footerStart = () => releaseStart() + RELEASE_RISE_PX;
  const maxPos = () => footerStart() + FOOTER_REVEAL_PX;

  /* ── State. */
  let pos = 0;
  let targetPos = 0;
  let flickVel = 0;
  let activeSlide = 0;
  let announced = 0;
  let snapTween = null;
  let footerPlayed = false;
  let wrappedFooter = null;
  let disposed = false;
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));

  const announce = (i) => {
    if (announced === i || !(live instanceof HTMLElement)) return;
    announced = i;
    live.textContent = `Founder ${FOUNDERS_SLIDES[i].number} of 02: ${FOUNDERS_SLIDES[i].name}`;
  };

  const setActiveSlide = (i) => {
    if (activeSlide === i) return;
    activeSlide = i;
    thumbs.forEach((t, j) => t.setAttribute('aria-current', j === i ? 'true' : 'false'));
    slides.forEach((s, j) => { s.dataset.active = j === i ? 'true' : 'false'; });
    /* Only the active slide's button is tabbable. */
    slides.forEach((s, j) => {
      const btn = s.querySelector('.fd-slide__btn');
      if (btn instanceof HTMLElement) btn.tabIndex = j === i ? 0 : -1;
    });
    label?.classList.toggle('is-second', i === 1);
    announce(i);
  };

  /* ── The frame — every visual is a pure function of pos. */
  const frame = () => {
    const t2 = clamp((pos - transStart()) / TRANSITION_PX, 0, 1);
    const p1t = reduced ? 1 : clamp(pos / T(), 0, 1);
    const p3t = reduced ? 1 : clamp((pos - p3Start()) / T(), 0, 1);
    const rise = clamp(pos - releaseStart(), 0, RELEASE_RISE_PX);
    const reveal = clamp(pos - footerStart(), 0, FOOTER_REVEAL_PX);
    const t2e = reduced ? (t2 < 0.5 ? 0 : 1) : t2;

    /* Names — layout top between the live clamps (each slide's own
       phase; the outgoing holds its terminus through P2). */
    if (names[0] instanceof HTMLElement) {
      names[0].style.top = `${(nameStartTop + nameTravel * p1t).toFixed(1)}px`;
    }
    if (names[1] instanceof HTMLElement) {
      names[1].style.top = `${(nameStartTop + nameTravel * p3t).toFixed(1)}px`;
    }

    /* Transition — staggered out (first half) / in (second half);
       the names join their slide's group. Opacity+blur only (the
       names are blend roots — self-filters safe, transforms not). */
    slides.forEach((slide, i) => {
      const els = [...elsPerSlide[i], names[i]].filter((el) => el instanceof HTMLElement);
      /* NORMALISED stagger (rev 2 root-cause fix: without the span
         term the last elements only ever reached 1 − j×step —
         Ashley's name/button/list sat permanently dimmed+blurred):
         each half-window is stretched by the total stagger span so
         element j completes at (1 + span) − j×step ≥ 1. */
      const span = (els.length - 1) * STAGGER_STEP;
      els.forEach((el, j) => {
        let p; /* 1 = fully hidden */
        if (i === 0) {
          p = clamp(t2e * 2 * (1 + span) - j * STAGGER_STEP, 0, 1);
        } else {
          p = 1 - clamp((t2e - 0.5) * 2 * (1 + span) - j * STAGGER_STEP, 0, 1);
        }
        el.style.opacity = String(1 - p);
        el.style.filter = p > 0.001 ? `blur(${(6 * p).toFixed(2)}px)` : '';
      });
      slide.style.visibility = (i === 0 ? t2e >= 1 : t2e <= 0) ? 'hidden' : '';
    });

    /* Portrait crossfade — the outgoing (Robbo) layer on top. */
    if (imgOver instanceof HTMLElement) {
      imgOver.style.opacity = String(1 - t2e);
      imgOver.style.filter = t2e > 0.001 && t2e < 0.999 ? `blur(${(6 * Math.sin(Math.PI * t2e)).toFixed(2)}px)` : '';
    }

    /* Indicator — the label row rides its 64px with the scrub. */
    if (labelRow instanceof HTMLElement) {
      labelRow.style.top = `${(19 + 64 * t2e).toFixed(1)}px`;
    }
    setActiveSlide(t2e >= 0.5 ? 1 : 0);

    /* Release (rev 2): the CONTENT rides up leaving the white gap
       below the portrait (24 rest + 96 = 120 at full rise) — the
       stage ground stays put beneath it; ONLY the footer reveal
       rides the stage (the /work uncover), so the gap reads as
       part of the slide, not as the reveal. */
    if (content instanceof HTMLElement) {
      content.style.transform = `translate3d(0, ${(-rise).toFixed(1)}px, 0)`;
    }
    stage.style.transform = `translate3d(0, ${(-reveal).toFixed(1)}px, 0)`;

    /* Bottom nav sweep at the very end (the landing pair). */
    setNav(reveal >= FOOTER_REVEAL_PX - NAV_EXIT_EPSILON_PX);

    /* Footer reveal choreography once the uncover is underway. */
    maybePlayFooter();
  };

  /* ── Nav exit (the /work bottom behaviour). */
  ensureLogoChars();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
  };

  /* ── Input (the /work port). ROOT-CAUSE FIX (Oscar's report: the
     reveal stalls partway, footer top items cut off): wheel/touch
     capture must cover the WHOLE page — once the stage rides up,
     the revealed footer is a SIBLING fixed layer, so events over
     it never bubble through the stage. The input surface is
     document.body (the /work fix, ported). */
  const inputRegion = document.body;
  const setPosClamped = (raw) => {
    targetPos = clamp(raw, 0, maxPos());
  };
  const onWheel = (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    snapTween?.kill();
    setPosClamped(targetPos + e.deltaY * unit);
    markInput();
  };
  inputRegion.addEventListener('wheel', onWheel, { passive: false });
  cleanups.push(() => inputRegion.removeEventListener('wheel', onWheel));

  let touchY = 0;
  let touchT = 0;
  let touchVel = 0;
  const onTouchStart = (e) => {
    if (!e.touches.length) return;
    touchY = e.touches[0].clientY;
    touchT = performance.now();
    touchVel = 0;
    flickVel = 0;
    snapTween?.kill();
  };
  const onTouchMove = (e) => {
    if (!e.touches.length) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const now = performance.now();
    const dy = touchY - y;
    const dt = Math.max((now - touchT) / 1000, 0.001);
    setPosClamped(targetPos + dy);
    touchVel = touchVel * 0.6 + (dy / dt) * 0.4;
    touchY = y;
    touchT = now;
    markInput();
  };
  const onTouchEnd = () => {
    flickVel = touchVel;
    touchVel = 0;
    markInput();
  };
  inputRegion.addEventListener('touchstart', onTouchStart, { passive: true });
  inputRegion.addEventListener('touchmove', onTouchMove, { passive: false });
  inputRegion.addEventListener('touchend', onTouchEnd, { passive: true });
  cleanups.push(() => {
    inputRegion.removeEventListener('touchstart', onTouchStart);
    inputRegion.removeEventListener('touchmove', onTouchMove);
    inputRegion.removeEventListener('touchend', onTouchEnd);
  });

  /* ── The boundary snap (P2 only): idle inside the window glides
     the TARGET to the nearest edge — a half-transitioned text
     state reads broken (the access-pairs precedent). */
  let snapTimer = 0;
  const markInput = () => {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
  };
  const glideTo = (to, duration = 0.8) => {
    snapTween?.kill();
    /* A pending idle-snap must not fire mid-glide and yank the
       target back (caught in verification: a wheel tick ≤600ms
       before a thumb click armed exactly that). */
    window.clearTimeout(snapTimer);
    const proxy = { p: targetPos };
    snapTween = gsap.to(proxy, {
      p: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => { setPosClamped(proxy.p); },
    });
  };
  const trySnap = () => {
    if (reduced) return;
    const t2 = (targetPos - transStart()) / TRANSITION_PX;
    if (t2 > 0.02 && t2 < 0.98 && Math.abs(flickVel) < 20) {
      glideTo(t2 < 0.5 ? transStart() : p3Start());
    }
  };
  cleanups.push(() => {
    window.clearTimeout(snapTimer);
    snapTween?.kill();
  });

  /* ── Thumbs — glide the driver to the slide's rest position. */
  thumbs.forEach((thumb, i) => {
    const onClick = () => {
      glideTo(i === 0 ? transStart() : p3Start(), 1.0);
    };
    thumb.addEventListener('click', onClick);
    cleanups.push(() => thumb.removeEventListener('click', onClick));
  });

  /* ── The owned loop (the /work shape; tickOnce for the pane). */
  const stepScroll = (dtMs) => {
    const dt = Math.min(dtMs, 100) / 1000;
    if (flickVel !== 0) {
      setPosClamped(targetPos + flickVel * dt);
      flickVel *= 0.95;
      if (Math.abs(flickVel) < 20) flickVel = 0;
    }
    if (reduced) {
      if (pos !== targetPos) { pos = targetPos; frame(); }
      return;
    }
    if (Math.abs(targetPos - pos) > 0.05) {
      pos += (targetPos - pos) * SCROLL_SMOOTH_LERP;
      if (Math.abs(targetPos - pos) < 0.05) pos = targetPos;
      frame();
    }
  };
  let rafId = 0;
  let lastT = 0;
  const loop = (t) => {
    stepScroll(lastT ? t - lastT : 16.7);
    lastT = t;
    rafId = window.requestAnimationFrame(loop);
  };
  rafId = window.requestAnimationFrame(loop);
  cleanups.push(() => window.cancelAnimationFrame(rafId));

  const onResize = () => {
    measure();
    frame();
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ── Footer reveal choreography — wrapped once, played when the
     reveal begins (the covered-trigger idea expressed in driver
     space: the footer is fixed UNDER the stage, so viewport
     triggers can't see it — the driver knows exactly when it
     shows). */
  const footerEl = footerWrap?.querySelector('[data-landing-footer]');
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    /* The webfont changes the glyph advances the name alignment and
       the travel clamps are derived from — re-derive once it lands. */
    measure();
    frame();
    if (!(footerEl instanceof HTMLElement)) return;
    wrappedFooter = wrapFooterReveals(footerEl);
  });
  function maybePlayFooter() {
    if (footerPlayed || !wrappedFooter) return;
    if (pos - footerStart() > 200) {
      footerPlayed = true;
      playFooterReveals(wrappedFooter, schedule);
    }
  }
  frame();
  announce(0);

  if (import.meta.env.DEV) {
    window.__founders = {
      gsap,
      tick: (dt) => stepScroll(dt ?? 16.7),
      setPos: (p) => { setPosClamped(p); },
      state: () => ({
        pos, targetPos, T: T(), transStart: transStart(), p3Start: p3Start(),
        releaseStart: releaseStart(), footerStart: footerStart(), maxPos: maxPos(),
        nameStartTop, nameTravel, activeSlide,
      }),
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
    setNav(false);
  };
}
