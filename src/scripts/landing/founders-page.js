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
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { FOUNDERS_SLIDES } from '../../data/landing/founders-page.js';

const SCROLL_SMOOTH_LERP = 0.065; /* = site-scroll SCROLL_LERP */
/* ── R2 PHASE MAP (Oscar, 2026-08-26 — the travelling names and
   their derived clamps are GONE; every anchor is a named constant
   now, no longer keyed to the name travel):
     ENTRY   [0, FD_ENTRY_PX)          the whole composition
                                       (portrait + text + column)
                                       rides up into rest as ONE
                                       movement.
     TEXT    [.., + FD_TEXT_PX)        the portrait FIXES; Robbo's
                                       block rides up and out
                                       (FD_TEXT_EXIT_PX), Ashley's
                                       rides up from below (one
                                       viewport) into the SAME
                                       slot; the portrait reveal
                                       runs over the tail
                                       (FD_REVEAL_*). The carousel
                                       rolls through everything at
                                       FD_CAROUSEL_RATE.
     RELEASE [.., +96+811]             unchanged grammar.
   The old boundary SNAP is REMOVED — a half-travelled text state
   is ordinary mid-scroll content under the normal-scroll grammar
   (reported; the access-pairs precedent no longer applies). */
const FD_ENTRY_PX = 360;
const FD_TEXT_PX = 900;
const FD_TEXT_EXIT_PX = 800; /* clears the text block's 245..752 span */
const FD_REVEAL_START_T = 0.55; /* of the text phase */
const FD_REVEAL_END_T = 0.95;   /* Ashley fully there as his text lands */
const FD_REVEAL_BLUR_PX = 6;    /* the lightbox edge blur, kept */
const FD_CAROUSEL_RATE = 0.5;   /* carousel px per scroll px */
const FD_CAROUSEL_PITCH_PX = 212.4; /* 204.4 cell + 8 gap */
const FD_CAROUSEL_SET = 4;      /* images per set (×4 sets rendered) */
const RELEASE_RISE_PX = 96; /* the 120px white gap − the 24 rest (rev 2) */
const FOOTER_REVEAL_PX = 811;
const NAV_EXIT_EPSILON_PX = 2;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function initFoundersPage() {
  const stage = document.querySelector('[data-founders-stage]');
  if (!(stage instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  if (narrow) {
    /* MOBILE (frame 13:948 rev 2, 2026-08-14): normal document
       scroll — none of the driver below engages. One profile at a
       time; the narrow branch owns the swap + entrance replay. */
    return initFoundersMobile(stage, reduced);
  }

  const content = stage.querySelector('[data-fd-content]');
  const portrait = stage.querySelector('[data-fd-portrait]');
  const imgOver = stage.querySelector('[data-fd-img-over]'); /* Robbo, above; Ashley full beneath */
  const colWrap = stage.querySelector('.fd-col');
  const colTrack = stage.querySelector('[data-fd-coltrack]');
  const slides = Array.from(stage.querySelectorAll('[data-fd-slide]'));
  const thumbs = Array.from(stage.querySelectorAll('[data-fd-thumb]'));
  const labelRow = stage.querySelector('[data-fd-labelrow]');
  const label = stage.querySelector('[data-fd-label]');
  const live = stage.querySelector('[data-fd-live]');
  const footerWrap = document.querySelector('[data-fd-footer]');

  /* ── R2 anchors — named constants, nothing derived from names. */
  const textStart = () => FD_ENTRY_PX;
  const textEnd = () => FD_ENTRY_PX + FD_TEXT_PX;
  const releaseStart = () => textEnd();
  const footerStart = () => releaseStart() + RELEASE_RISE_PX;
  const maxPos = () => footerStart() + FOOTER_REVEAL_PX;
  const setH = FD_CAROUSEL_PITCH_PX * FD_CAROUSEL_SET; /* 849.6 */
  const mod = (v, m) => ((v % m) + m) % m;

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
    const entryT = reduced ? 1 : clamp(pos / FD_ENTRY_PX, 0, 1);
    const textT = clamp((pos - textStart()) / FD_TEXT_PX, 0, 1);
    const textTe = reduced ? (textT < 0.5 ? 0 : 1) : textT;
    const rise = clamp(pos - releaseStart(), 0, RELEASE_RISE_PX);
    const reveal = clamp(pos - footerStart(), 0, FOOTER_REVEAL_PX);
    const vh = window.innerHeight || 1080;

    /* ENTRY — one movement: portrait, column and Robbo's block ride
       up into rest together; the portrait then FIXES (groupY 0). */
    const groupY = (1 - entryT) * FD_ENTRY_PX;
    if (portrait instanceof HTMLElement) {
      portrait.style.transform = groupY > 0.01 ? `translate3d(0, ${groupY.toFixed(1)}px, 0)` : '';
    }
    if (colWrap instanceof HTMLElement) {
      colWrap.style.transform = groupY > 0.01 ? `translate3d(0, ${groupY.toFixed(1)}px, 0)` : '';
    }

    /* TEXT TRAVEL — Robbo up and out; Ashley up and in, landing on
       the identical CSS slot (translate 0). */
    if (slides[0] instanceof HTMLElement) {
      const y = groupY - FD_TEXT_EXIT_PX * textTe;
      slides[0].style.transform = Math.abs(y) > 0.01 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : '';
      slides[0].style.visibility = textTe >= 1 ? 'hidden' : '';
    }
    if (slides[1] instanceof HTMLElement) {
      const y = vh * (1 - textTe);
      slides[1].style.transform = y > 0.01 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : '';
      slides[1].style.visibility = textTe <= 0 ? 'hidden' : '';
    }

    /* PORTRAIT REVEAL-BEHIND over the travel's tail: Ashley is fully
       opaque beneath at all times; Robbo's layer wipes L→R off him —
       combined coverage never below full (the white-flash fix). */
    const rT = reduced
      ? (textTe >= 1 ? 1 : 0)
      : clamp((textT - FD_REVEAL_START_T) / (FD_REVEAL_END_T - FD_REVEAL_START_T), 0, 1);
    if (imgOver instanceof HTMLElement) {
      imgOver.style.clipPath = rT <= 0 ? '' : `inset(0 0 0 ${(rT * 100).toFixed(2)}%)`;
      imgOver.style.visibility = rT >= 1 ? 'hidden' : '';
      imgOver.style.filter = rT > 0.001 && rT < 0.999
        ? `blur(${(FD_REVEAL_BLUR_PX * Math.sin(Math.PI * rT)).toFixed(2)}px)`
        : '';
    }

    /* THE ROLLING CAROUSEL — scroll-driven, seamless modulo wrap;
       rolls through every phase, stops with the scroll, reverses. */
    if (colTrack instanceof HTMLElement) {
      const roll = reduced ? 0 : pos * FD_CAROUSEL_RATE;
      colTrack.style.transform = `translate3d(0, ${(-setH - mod(roll, setH)).toFixed(2)}px, 0)`;
    }

    /* Indicator — the label row rides its 64px with the text travel. */
    if (labelRow instanceof HTMLElement) {
      labelRow.style.top = `${(19 + 64 * textTe).toFixed(1)}px`;
    }
    setActiveSlide(textTe >= 0.5 ? 1 : 0);

    /* Release + footer reveal — the unchanged grammar. */
    if (content instanceof HTMLElement) {
      content.style.transform = `translate3d(0, ${(-rise).toFixed(1)}px, 0)`;
    }
    stage.style.transform = `translate3d(0, ${(-reveal).toFixed(1)}px, 0)`;
    setNav(reveal >= FOOTER_REVEAL_PX - NAV_EXIT_EPSILON_PX);
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

  /* R2: the boundary snap is REMOVED — under the normal-scroll
     grammar a half-travelled text state is ordinary mid-scroll
     content (reported). glideTo survives for the indicator thumbs. */
  const markInput = () => {};
  const glideTo = (to, duration = 0.8) => {
    snapTween?.kill();
    const proxy = { p: targetPos };
    snapTween = gsap.to(proxy, {
      p: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => { setPosClamped(proxy.p); },
    });
  };
  cleanups.push(() => {
    snapTween?.kill();
  });

  /* ── Thumbs — glide the driver to the slide's rest position. */
  thumbs.forEach((thumb, i) => {
    const onClick = () => {
      glideTo(i === 0 ? textStart() : textEnd(), 1.0);
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
        pos, targetPos, textStart: textStart(), textEnd: textEnd(),
        releaseStart: releaseStart(), footerStart: footerStart(), maxPos: maxPos(),
        activeSlide,
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

/* ═══════════════════════════════════════════════════════════════════
   MOBILE (≤1024) — frame 13:948 rev 4 (2026-08-14): one founder
   profile shown at a time (data-m-active; Ashley lands), swapped via
   the fixed thumb dock or the CTA-row name chip. Every swap scrolls
   home and REPLAYS the entrance vocabulary (word-reveal on the
   blended lines, staggered fade-rise on the media) — the same
   grammar the m-entrance one-shot used, owned here because replays
   need resets.

   The name labels' pin behaviour (24px under the image top → pinned
   at the viewport middle → parked 24px above the image bottom) and
   their copy (name LEFT, "Founder 0N" RIGHT, the data numbering)
   are pure CSS/markup — baked per slide. This controller toggles
   slides, follows the dock's active stroke, wires thumbs + chips to
   swapTo, and blurs the dock out over the footer (IO below).

   WRAP TIMING: the word wrap groups lines from live offsetTop, so a
   display:none slide can't be wrapped — each slide wraps lazily the
   first time it is shown (post fonts.ready, pre-play). A swap that
   lands before fonts resolve shows that slide statically (media
   forced visible, lines never wrapped) rather than risking
   fallback-metric grouping. */

const M_LINE_STAGGER_S = 0.12; /* = m-entrance LINE_STAGGER_S */
const M_MEDIA_AT_MS = 400; /* = m-entrance MEDIA_AT_MS */
const M_MEDIA_STAGGER_MS = 120; /* = m-entrance MEDIA_STAGGER_MS */

/**
 * @param {HTMLElement} stage
 * @param {boolean} reduced
 * @returns {() => void}
 */
function initFoundersMobile(stage, reduced) {
  const slides = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-slide]')));
  const thumbs = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-m-thumb]')));
  const dock = stage.querySelector('[data-fd-m-dock]');
  const cluster = stage.querySelector('[data-fd-m-switch]');
  const swapBtns = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-m-swap]')));
  const live = stage.querySelector('[data-fd-live]');

  /* The desktop SSR gives the inactive slide's link tabindex=-1 —
     meaningless here (the inactive slide is display:none, out of the
     tab order by itself) and it would lock Ashley's landing CTA out
     of keyboard reach. */
  stage.querySelectorAll('.fd-slide__btn').forEach((btn) => btn.removeAttribute('tabindex'));

  const lineSels = ['.fd-slide__m-label', '.fd-slide__bio-text--bold', '.fd-slide__m-serif'];
  /* VISUAL top-to-bottom order (the CTA row sits after the list in
     flex order but before it in the DOM) — the stagger reads down
     the page. The name labels ride with the portrait; the thumb
     dock is NOT here — it's shared, enters once, persists. */
  const mediaSels = [
    '.fd-slide__m-portrait',
    '.fd-m-switch-label--l',
    '.fd-m-switch-label--r',
    '.fd-slide__m-img2',
    '.fd-slide__listlabel',
    '.fd-slide__list',
    '.fd-slide__m-ctarow',
  ];
  const parts = slides.map((slide) => ({
    lines: /** @type {HTMLElement[]} */ (
      lineSels.map((sel) => slide.querySelector(sel)).filter((el) => el instanceof HTMLElement)
    ),
    media: /** @type {HTMLElement[]} */ (
      mediaSels.map((sel) => slide.querySelector(sel)).filter((el) => el instanceof HTMLElement)
    ),
  }));

  let active = 1; /* Ashley lands (the file's state; SSR matches) */
  let disposed = false;
  let fontsDone = false;
  /** @type {ReturnType<typeof setTimeout>[]} */
  const timeouts = [];
  /** @type {(() => void)[]} */
  const cleanups = [];
  const wrappedSlides = new Set();
  const staticSlides = new Set();

  const applyActive = (idx) => {
    active = idx;
    slides.forEach((s) => {
      s.dataset.mActive = s.dataset.slide === String(idx) ? 'true' : 'false';
    });
    /* The dock is shared across slides — the stroke follows here. */
    thumbs.forEach((t) => {
      t.setAttribute('aria-current', t.dataset.slide === String(idx) ? 'true' : 'false');
    });
    if (live instanceof HTMLElement) {
      live.textContent = `Founder: ${FOUNDERS_SLIDES[idx].name}`;
    }
  };

  const ensureWrapped = (idx) => {
    if (wrappedSlides.has(idx) || staticSlides.has(idx)) return;
    wrappedSlides.add(idx);
    parts[idx].lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * M_LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
  };

  /* Rewind a slide's revealed state without animating: the inner
     transitions (which carry the wrap's per-word delays) are
     suppressed for the flip and restored verbatim. Runs in the same
     task as the show — no paintable revealed frame. */
  const resetSlide = (idx) => {
    parts[idx].lines.forEach((line) => {
      line.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
        const inner = clip.querySelector('.lr-inner');
        if (inner instanceof HTMLElement) {
          const t = inner.style.transition;
          inner.style.transition = 'none';
          clip.classList.remove('lr-visible');
          void inner.offsetHeight;
          inner.style.transition = t;
        } else {
          clip.classList.remove('lr-visible');
        }
      });
    });
    parts[idx].media.forEach((el) => {
      el.style.transition = 'none';
      el.classList.remove('is-visible');
      void el.offsetHeight;
      el.style.transition = '';
    });
  };

  /* SYNCHRONOUS play — the pre-reveal state is committed with a
     forced reflow first, so the class flips transition from it.
     Deliberately NOT rAF-scheduled: throttled/embedded contexts
     starve rAF entirely (caught live — the replay silently never
     ran), while a reflow is deterministic everywhere. */
  const playSlide = (idx) => {
    void stage.offsetHeight;
    parts[idx].lines.forEach((line) => playLineRevealElement(line));
    parts[idx].media.forEach((el, i) => {
      timeouts.push(
        setTimeout(() => el.classList.add('is-visible'), M_MEDIA_AT_MS + i * M_MEDIA_STAGGER_MS),
      );
    });
  };

  const swapTo = (idx) => {
    if (disposed || idx === active || !slides[idx]) return;
    applyActive(idx);
    window.scrollTo(0, 0);
    if (reduced) return;
    if (!fontsDone) {
      /* Pre-fonts tap (sub-100ms window): show statically rather
         than wrap against fallback metrics. */
      staticSlides.add(idx);
      parts[idx].media.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    ensureWrapped(idx); /* needs the slide VISIBLE — after applyActive */
    resetSlide(idx);
    playSlide(idx);
  };

  /* ── Wire the CTAs (the thumbs ARE the CTAs, plus the name chip). */
  thumbs.forEach((t) => {
    const onClick = () => swapTo(Number(t.dataset.slide));
    t.addEventListener('click', onClick);
    cleanups.push(() => t.removeEventListener('click', onClick));
  });
  swapBtns.forEach((b) => {
    const onClick = () => swapTo(Number(b.dataset.target));
    b.addEventListener('click', onClick);
    cleanups.push(() => b.removeEventListener('click', onClick));
  });

  applyActive(active);

  /* ── Footer clearance: the dock blurs out (the site's exit
     vocabulary) as soon as the footer enters the viewport, and
     blurs back in when it leaves on the way up — it must never
     block the footer. Applies under reduced motion too (it's an
     occlusion fix, not theatre). */
  if (dock instanceof HTMLElement) {
    const footer = document.querySelector('[data-landing-footer]');
    if (footer && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            dock.classList.toggle('is-footer-hidden', entry.isIntersecting);
          });
        },
        { threshold: 0 },
      );
      io.observe(footer);
      cleanups.push(() => io.disconnect());
    }
  }

  if (reduced) {
    /* Hidden states are no-preference-gated; the classes keep the
       DOM state coherent (the /work rule). Swaps still work — they
       just cut, no theatre. */
    parts.forEach((p) => p.media.forEach((el) => el.classList.add('is-visible')));
    if (cluster instanceof HTMLElement) cluster.classList.add('is-visible');
  } else {
    /* Landing entrance: the section owns the first viewport, so it
       plays on arrival (fonts-gated wrap first — the established
       order). The dock enters ONCE at the media stagger's tail and
       persists across swaps. */
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (disposed) return;
      fontsDone = true;
      if (!staticSlides.has(active)) ensureWrapped(active);
      playSlide(active);
      if (cluster instanceof HTMLElement) {
        timeouts.push(
          setTimeout(
            () => cluster.classList.add('is-visible'),
            M_MEDIA_AT_MS + parts[active].media.length * M_MEDIA_STAGGER_MS,
          ),
        );
      }
    });
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
  };
}
