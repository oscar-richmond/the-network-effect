/**
 * /work/[slug] — CASE STUDY machinery.
 *
 * SCROLL: native document scroll through Lenis — the landing's
 * config VERBATIM (lerp 0.065, smoothWheel; ScrollTrigger.update on
 * scroll; own rAF). (The desktop sticky rail is RETIRED — frame
 * 36:1827; the facts table replaced it, 2026-08-26.) —
 * proven under this exact Lenis by /landing's sticky stages (the
 * task's tripwire never fired: Lenis drives window scroll natively,
 * it never transforms a wrapper).
 *
 * ENTRANCES — the house vocabulary only: hero title/subtitle
 * word-reveal at load (clips are DESCENDANTS of the difference
 * elements — the blend-safe shape); hero image rise; intro
 * statement word-reveal + red-bar rise at 'top 65%' once (the
 * closing-section convention); what-we-did lines word-reveal with
 * a column stagger; stream rows rise as they enter; the rail
 * blocks settle (short rise) as each first pins (trigger at its
 * segment's pin point); MORE WORK title word-reveal + cards
 * stagger, card text word reveals riding them; footer = the shared
 * footer-motion choreography at the landing trigger. RM: no Lenis,
 * no entrances — sticky pinning REMAINS (layout, not motion).
 *
 * MORE-WORK pager (Oscar's rev): the carousel carries EVERY /work
 * project bar the current study; the track pages one 844px card
 * per arrow press (clamped; arrows disable at the ends). Arrows
 * are the LET'S CHAT arrow and ripple with its hover vocabulary
 * (the injected char-ripple arrow animation) when active. RM:
 * instant jumps (the glide transition is no-preference-gated).
 * Focusing an off-page card resets the browser's scroll-of-
 * overflow and pages to it.
 *
 * Card/tile links navigate only for LIVE case-study slugs
 * (data-live), everything else stays an inert placeholder.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { wrapWordRevealElement, playLineRevealElement, wrapStaticLines } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { initFloatCta } from './float-cta.js';
import { isMobileViewport } from './viewport.js';
import { SWAP_PHASE_MS, SWAP_CURVE } from '../cover-swap.js';
import { initCarouselIndicators } from './carousel-indicator.js';
import { initStatementBar } from './statement-bar.js';

gsap.registerPlugin(ScrollTrigger);

const COL_STAGGER_S = 0.08;
const LINE_STAGGER_S = 0.12;
/* Bottom behaviours — the landing constants (landing-closing.js). */
const FOOTER_H_PX = 830; /* frame 13:381 (was 811) */

export function initCaseStudy() {
  const page = document.querySelector('[data-case-study]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* MOBILE swipe indicators (the 402-frame rebuild): the what-we-did
     columns and the more-work cards are native carousels below the
     seam — the shared component observes them. Above the RM gate:
     the thumb follows the user's own swipe (feedback, not motion). */
  if (isMobileViewport()) {
    cleanups.push(initCarouselIndicators(page));
  }

  /* Live-slug gating for the more-work cards. On the PAGE element,
     not document: it must preventDefault BEFORE page-transition's
     document-level interceptor sees the click (bubble order). */
  const onLinkClick = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-cs-more-card]') : null;
    if (link instanceof HTMLElement && link.dataset.live !== 'true') e.preventDefault();
  };
  page.addEventListener('click', onLinkClick);
  cleanups.push(() => page.removeEventListener('click', onLinkClick));

  /* ── Scroll: the SHARED house boot (site-scroll.js — one source
     of truth for the uniform feel; non-RM only). `lenis` reads the
     live instance so later closures always see the current one. */
  if (!reduced) cleanups.push(initSiteScroll());
  const lenis = { get i() { return getLenisInstance(); } };

  /* Arrow hover = the LET'S CHAT ripple (the injected char-ripple
     arrow animation replayed on the svg). Extracted to a helper
     (audit follow-up) because the LIGHTBOX arrows are the same icon
     button as the pager's and had no hover affordance at all — one
     definition means the two pairs can never drift apart again.
     Non-RM only; disabled buttons never play. */
  const wireArrowRipple = (btn) => {
    if (reduced || !(btn instanceof HTMLElement)) return;
    const svg = btn.querySelector('[data-char-ripple-arrow]');
    if (!svg) return;
    const onHover = () => {
      if (btn.disabled) return;
      svg.classList.remove('is-rippling');
      void btn.offsetWidth;
      svg.classList.add('is-rippling');
    };
    btn.addEventListener('mouseenter', onHover);
    cleanups.push(() => btn.removeEventListener('mouseenter', onHover));
  };

  /* ── MORE-WORK pager (all modes — navigation, not decoration). */
  const track = document.querySelector('[data-cs-more-track]');
  const viewport = document.querySelector('[data-cs-more-viewport]');
  const prevBtn = document.querySelector('[data-cs-pager="prev"]');
  const nextBtn = document.querySelector('[data-cs-pager="next"]');
  if (track instanceof HTMLElement && prevBtn instanceof HTMLButtonElement && nextBtn instanceof HTMLButtonElement) {
    const CARD_STEP_PX = 844; // 836 card + 8 gap
    const PER_VIEW = 2;
    const count = track.children.length;
    const maxIdx = Math.max(0, count - PER_VIEW);
    let idx = 0;
    const applyPager = () => {
      track.style.transform = `translate3d(${(-idx * CARD_STEP_PX).toFixed(0)}px, 0, 0)`;
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= maxIdx;
    };
    const page = (dir) => {
      idx = Math.min(Math.max(idx + dir, 0), maxIdx);
      applyPager();
    };
    const onPrev = () => page(-1);
    const onNext = () => page(1);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    cleanups.push(() => {
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
    });
    [prevBtn, nextBtn].forEach(wireArrowRipple);
    /* Keyboard: focusing an off-page card — undo the browser's
       overflow scroll (it fights the transform pager) and page to
       the card instead. */
    const onFocusIn = (e) => {
      if (viewport instanceof HTMLElement) viewport.scrollLeft = 0;
      const card = e.target instanceof Element ? e.target.closest('[data-cs-more-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const i = Array.from(track.children).indexOf(card);
      if (i < 0) return;
      idx = Math.min(Math.max(i - (PER_VIEW - 1), 0), maxIdx);
      if (i < idx) idx = i;
      applyPager();
    };
    track.addEventListener('focusin', onFocusIn);
    cleanups.push(() => track.removeEventListener('focusin', onFocusIn));

    /* DRAG (Oscar's rev): click-hold-drag pages the carousel — 1:1
       while down (transition suspended), settling to the nearest
       card on release through applyPager's glide. A real drag
       (>6px) suppresses the click so card links don't fire (and
       page-transition never sees it). All modes — input, not
       motion. */
    if (viewport instanceof HTMLElement) {
      const DRAG_CLICK_SLOP_PX = 6;
      let dragging = false;
      let dragMoved = false;
      let startX = 0;
      let baseOffset = 0;
      const maxOffset = () => maxIdx * CARD_STEP_PX;
      const onPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true;
        dragMoved = false;
        startX = e.clientX;
        baseOffset = idx * CARD_STEP_PX;
        track.style.transition = 'none';
        /* NO setPointerCapture (Oscar's report: MORE WORK cards were
           unclickable). Capturing on the VIEWPORT retargets the
           subsequent `click` to the viewport itself, so the card's
           anchor never received it and no navigation ever fired —
           and it was never released either. The window-level
           pointermove/up listeners below already track the pointer
           outside the element, so the capture bought nothing. */
      };
      const onPointerMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > DRAG_CLICK_SLOP_PX) dragMoved = true;
        const offset = Math.min(Math.max(baseOffset - dx, 0), maxOffset());
        track.style.transform = `translate3d(${(-offset).toFixed(1)}px, 0, 0)`;
      };
      const onPointerUp = (e) => {
        if (!dragging) return;
        dragging = false;
        const dx = e.clientX - startX;
        const offset = Math.min(Math.max(baseOffset - dx, 0), maxOffset());
        idx = Math.min(Math.max(Math.round(offset / CARD_STEP_PX), 0), maxIdx);
        track.style.transition = '';
        applyPager();
      };
      const onDragClick = (e) => {
        if (!dragMoved) return;
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      };
      const onDragStart = (e) => e.preventDefault(); /* native img drag */
      viewport.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      track.addEventListener('click', onDragClick, true);
      track.addEventListener('dragstart', onDragStart);
      cleanups.push(() => {
        viewport.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        track.removeEventListener('click', onDragClick, true);
        track.removeEventListener('dragstart', onDragStart);
      });
    }
    applyPager();
  }

  /* ── Gallery cursor (Oscar's rev): "[ VIEW GALLERY + ]" over the
     OUR WORK stream images — the /work cursor machinery verbatim
     (canvas-cursor lerp follow via left/top, document-level
     pointerover so exits toward any surface read correctly, the
     site dot hidden while live, self blur-fade = the house
     transition). Gated hover:hover + pointer:fine (NOTE: reads
     false on Oscar's machine — verify on another device); RM: no
     custom cursor. */
  const galleryCursor = document.querySelector('[data-cs-gallery-cursor]');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduced && fineHover && galleryCursor instanceof HTMLElement) {
    /* Centre on the pointer without transform (blend root): the
       measured half-extent becomes a static margin. */
    const centre = () => {
      galleryCursor.style.marginLeft = `${(-galleryCursor.offsetWidth / 2).toFixed(1)}px`;
      galleryCursor.style.marginTop = `${(-galleryCursor.offsetHeight / 2).toFixed(1)}px`;
    };
    const fontsForCursor = document.fonts?.ready ?? Promise.resolve();
    fontsForCursor.then(centre);
    let cx = -200;
    let cy = -200;
    let tx = -200;
    let ty = -200;
    let over = false;
    let cursorRaf = 0;
    const CURSOR_LERP = 0.25; /* the canvas-cursor feel */
    const tick = () => {
      cx += (tx - cx) * CURSOR_LERP;
      cy += (ty - cy) * CURSOR_LERP;
      galleryCursor.style.left = `${cx.toFixed(1)}px`;
      galleryCursor.style.top = `${cy.toFixed(1)}px`;
      cursorRaf = window.requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const setOver = (nowOver) => {
      if (nowOver === over) return;
      over = nowOver;
      if (over) {
        cx = tx;
        cy = ty;
        galleryCursor.classList.add('is-active');
        document.documentElement.classList.add('cs-cursor-live');
        if (!cursorRaf) cursorRaf = window.requestAnimationFrame(tick);
      } else {
        galleryCursor.classList.remove('is-active');
        document.documentElement.classList.remove('cs-cursor-live');
        window.cancelAnimationFrame(cursorRaf);
        cursorRaf = 0;
      }
    };
    const onOver = (e) => {
      setOver(e.target instanceof Element && !!e.target.closest('.cs-row__img'));
    };
    const onDocLeave = () => setOver(false);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver);
    document.documentElement.addEventListener('pointerleave', onDocLeave);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onDocLeave);
      window.cancelAnimationFrame(cursorRaf);
      document.documentElement.classList.remove('cs-cursor-live');
    });
  }

  /* ── LIGHTBOX (Oscar's rev, all modes — it's UI): click a stream
     item -> centred pop-up over the frosted page; prev/next via
     the CTA arrows, arrow KEYS (and Escape to close), and wheel
     steps (cooldown-gated); wrap-around order = the stream's.
     Scroll locks through Lenis + body overflow while open; focus
     moves to close and returns to the opener. Media swaps ride the
     house blur-fade; video items autoplay muted-looped. */
  /* ── R37: the floating START A PROJECT chip — desktop only (the host
     is display:none under the seam); its range is derived from the
     stream's LAST image, so every study (and every future one) gets
     the same behaviour from its own structure. */
  const floatCta = isMobileViewport() ? null : initFloatCta({
    reduced,
    host: document.querySelector('[data-cs-float]'),
    cta: document.querySelector('[data-cs-float-cta]'),
    lastImage: () => { const items = document.querySelectorAll('[data-cs-lb-item]'); return items[items.length - 1] ?? null; },
  });
  if (floatCta) cleanups.push(floatCta.cleanup);
  if (import.meta.env.DEV && floatCta) window.__csFloat = floatCta;

  const lightbox = document.querySelector('[data-cs-lightbox]');
  if (lightbox instanceof HTMLElement) {
    /* Same icon button as the MORE WORK pager — same affordance
       (audit follow-up; previously these had none). */
    lightbox.querySelectorAll('[data-cs-lb-prev], [data-cs-lb-next]').forEach(wireArrowRipple);
    const lbImg = lightbox.querySelector('[data-cs-lb-img]');
    const lbVideo = lightbox.querySelector('[data-cs-lb-video]');
    const lbStage = lightbox.querySelector('[data-cs-lb-stage]');
    const items = Array.from(page.querySelectorAll('[data-cs-lb-item] img, [data-cs-lb-item] video')).map((el) => ({
      src: el.currentSrc || el.src,
      isVideo: el.tagName === 'VIDEO',
    }));
    let lbIdx = 0;
    let lbOpen = false;
    let lbOpener = null;
    let wheelCool = 0;

    const applyMedia = (i) => {
      const item = items[i];
      if (!item) return;
      if (lbImg instanceof HTMLImageElement) {
        lbImg.hidden = item.isVideo;
        if (!item.isVideo) lbImg.src = item.src;
      }
      if (lbVideo instanceof HTMLVideoElement) {
        lbVideo.hidden = !item.isVideo;
        if (item.isVideo) {
          lbVideo.src = item.src;
          lbVideo.play?.().catch(() => {});
        } else {
          lbVideo.pause?.();
          lbVideo.removeAttribute('src');
        }
      }
    };

    /* A freeze-frame of the CURRENTLY visible media (img: clone;
       video: canvas frame grab — same-origin assets) for the
       swap wipe. */
    const makeSnapshot = () => {
      if (lbImg instanceof HTMLImageElement && !lbImg.hidden && lbImg.src) {
        const snap = document.createElement('img');
        snap.src = lbImg.src;
        snap.className = 'cs-lightbox__wipe';
        return snap;
      }
      if (lbVideo instanceof HTMLVideoElement && !lbVideo.hidden && lbVideo.videoWidth) {
        try {
          const c = document.createElement('canvas');
          c.width = lbVideo.videoWidth;
          c.height = lbVideo.videoHeight;
          c.getContext('2d')?.drawImage(lbVideo, 0, 0);
          const snap = document.createElement('img');
          snap.src = c.toDataURL('image/jpeg', 0.8);
          snap.className = 'cs-lightbox__wipe';
          return snap;
        } catch { return null; }
      }
      return null;
    };

    /* TWO-PHASE SWAP (Oscar's rev 2 — strictly sequential): the
       showing media wipes OUT left-to-right to the bare backdrop
       (the incoming stays hidden), and only once it is fully gone
       does the new media wipe IN left-to-right with the same
       effect. The stage box is frozen through phase 1 (the
       absolute snapshot needs it once the media beneath hides);
       rapid navigation retargets via pendingIdx — the sequence in
       flight picks up the LATEST target at its phase boundary
       (the meta-swap runner pattern, nothing stacks). */
    let pendingIdx = null;
    let swapAnim = false;

    const hideBothMedia = () => {
      if (lbImg instanceof HTMLImageElement) lbImg.hidden = true;
      if (lbVideo instanceof HTMLVideoElement) {
        lbVideo.hidden = true;
        lbVideo.pause?.();
      }
    };

    const visibleMedia = () =>
      (lbImg instanceof HTMLImageElement && !lbImg.hidden && lbImg)
      || (lbVideo instanceof HTMLVideoElement && !lbVideo.hidden && lbVideo)
      || null;

    const runSwapSequence = () => {
      if (pendingIdx === null || !(lbStage instanceof HTMLElement)) return;
      swapAnim = true;
      /* Phase 1 — OUT: freeze the box, snapshot the current media
         on top, hide the real media (bare backdrop beneath), wipe
         the snapshot away L->R. */
      const rect = lbStage.getBoundingClientRect();
      lbStage.style.width = `${rect.width.toFixed(1)}px`;
      lbStage.style.height = `${rect.height.toFixed(1)}px`;
      const snap = makeSnapshot();
      hideBothMedia();
      if (snap) {
        lbStage.appendChild(snap);
        void snap.offsetWidth;
        snap.classList.add('is-wiping');
      }
      schedule(() => {
        snap?.remove();
        lbStage.style.width = '';
        lbStage.style.height = '';
        /* Phase 2 — IN, immediately: the LATEST target reveals
           L->R from nothing (clip grows from the left edge). */
        const target = pendingIdx ?? lbIdx;
        lbIdx = target;
        applyMedia(target);
        const el = visibleMedia();
        if (el) {
          el.style.transition = 'none';
          el.style.clipPath = 'inset(0 100% 0 0)';
          el.style.filter = 'blur(6px)';
          void el.offsetWidth;
          el.style.transition = `clip-path ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}, filter ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}`;
          el.style.clipPath = 'inset(0 0 0 0)';
          el.style.filter = 'blur(0px)';
        }
        schedule(() => {
          if (el) {
            el.style.transition = '';
            el.style.clipPath = '';
            el.style.filter = '';
          }
          swapAnim = false;
          if (pendingIdx !== lbIdx) runSwapSequence(); /* retarget */
        }, SWAP_PHASE_MS + 30);
      }, snap ? SWAP_PHASE_MS + 20 : 0);
    };

    /* Navigation steps FROM THE LATEST TARGET, not the settled
       index: lbIdx only advances at the phase boundary now, so
       stepping from it would collapse rapid inputs into one. */
    const navIdx = () => pendingIdx ?? lbIdx;

    const showMedia = (i, instant) => {
      const wrapped = ((i % items.length) + items.length) % items.length; /* wrap */
      if (instant || reduced || !(lbStage instanceof HTMLElement)) {
        lbIdx = wrapped;
        pendingIdx = wrapped;
        applyMedia(lbIdx);
        return;
      }
      pendingIdx = wrapped;
      if (!swapAnim) runSwapSequence();
    };

    /* A11y batch item 6 (Oscar, 2026-09-04): while the dialog is open
       the rest of the document is INERT — every body child that is
       not the lightbox's own ancestor — so neither Tab nor a screen
       reader's virtual cursor can reach the page behind; released on
       close. `inert` is the platform's own mechanism (all evergreen
       browsers), no synthetic tabindex juggling. */
    let inerted = [];
    const setPageInert = (on) => {
      if (on) {
        inerted = Array.from(document.body.children).filter((el) => el instanceof HTMLElement && !el.contains(lightbox) && !el.inert);
        inerted.forEach((el) => { el.inert = true; });
      } else {
        inerted.forEach((el) => { el.inert = false; });
        inerted = [];
      }
    };

    const openLb = (i, opener) => {
      lbOpen = true;
      lbOpener = opener ?? null;
      setPageInert(true);
      floatCta?.suspend(true); /* R37: the chip leaves while the lightbox is open */
      showMedia(i, true);
      lightbox.hidden = false;
      void lightbox.offsetWidth; /* commit hidden state, then frost in */
      lightbox.classList.add('is-open');
      lenis.i?.stop();
      document.body.style.overflow = 'hidden';
      const closeBtn = lightbox.querySelector('[data-cs-lb-close-btn]');
      if (closeBtn instanceof HTMLElement) closeBtn.focus();
    };

    const closeLb = () => {
      if (!lbOpen) return;
      lbOpen = false;
      floatCta?.suspend(false);
      lightbox.classList.remove('is-open');
      schedule(() => {
        lightbox.hidden = true;
        if (lbVideo instanceof HTMLVideoElement) lbVideo.pause?.();
      }, 380);
      lenis.i?.start();
      document.body.style.overflow = '';
      setPageInert(false);
      /* Focus returns to the opener — a focusable figure now (tabindex
         0, role button), so this call lands rather than falling to body. */
      if (lbOpener instanceof HTMLElement) lbOpener.focus?.({ preventScroll: true });
    };
    cleanups.push(() => setPageInert(false));

    const onStreamClick = (e) => {
      const fig = e.target instanceof Element ? e.target.closest('[data-cs-lb-item]') : null;
      if (!(fig instanceof HTMLElement)) return;
      const figs = Array.from(page.querySelectorAll('[data-cs-lb-item]'));
      const i = figs.indexOf(fig);
      if (i >= 0) openLb(i, fig);
    };
    page.addEventListener('click', onStreamClick);
    cleanups.push(() => page.removeEventListener('click', onStreamClick));

    /* The opener on the keyboard: Enter or Space on a focused stream
       figure opens it, the same path as a click. */
    const onStreamKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const fig = e.target instanceof Element ? e.target.closest('[data-cs-lb-item]') : null;
      if (!(fig instanceof HTMLElement)) return;
      e.preventDefault();
      const figs = Array.from(page.querySelectorAll('[data-cs-lb-item]'));
      const i = figs.indexOf(fig);
      if (i >= 0) openLb(i, fig);
    };
    page.addEventListener('keydown', onStreamKey);
    cleanups.push(() => page.removeEventListener('keydown', onStreamKey));

    const onLbClick = (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (t.closest('[data-cs-lb-prev]')) showMedia(navIdx() - 1);
      else if (t.closest('[data-cs-lb-next]')) showMedia(navIdx() + 1);
      else if (t.closest('[data-cs-lb-close], [data-cs-lb-close-btn]')) closeLb();
    };
    lightbox.addEventListener('click', onLbClick);
    cleanups.push(() => lightbox.removeEventListener('click', onLbClick));

    const onLbKey = (e) => {
      if (!lbOpen) return;
      if (e.key === 'Tab') {
        /* The focus trap: Tab cycles the dialog's own controls. */
        const items = Array.from(lightbox.querySelectorAll('button:not([disabled]), a[href]')).filter((el) => el instanceof HTMLElement && el.getClientRects().length > 0);
        if (!items.length) return;
        const first = items[0]; const last = items[items.length - 1];
        const active = document.activeElement; const inside = items.includes(active);
        if (e.shiftKey) { if (!inside || active === first) { e.preventDefault(); last.focus(); } }
        else if (!inside || active === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); showMedia(navIdx() + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); showMedia(navIdx() - 1); }
    };
    document.addEventListener('keydown', onLbKey);
    cleanups.push(() => document.removeEventListener('keydown', onLbKey));

    const onLbWheel = (e) => {
      if (!lbOpen) return;
      e.preventDefault(); /* the page is locked; wheel steps navigate */
      const now = performance.now();
      if (now - wheelCool < 400 || Math.abs(e.deltaY) < 12) return;
      wheelCool = now;
      showMedia(navIdx() + (e.deltaY > 0 ? 1 : -1));
    };
    lightbox.addEventListener('wheel', onLbWheel, { passive: false });
    cleanups.push(() => lightbox.removeEventListener('wheel', onLbWheel));

    /* TOUCH (mobile brief, A3/B3): swipe left/right steps the
       gallery (the desktop arrows are hidden on mobile), swipe down
       dismisses — the platform's sheet convention. One-axis winner:
       whichever axis dominates the gesture decides, so a diagonal
       can't both navigate and close. Pinch is not intercepted — the
       overlay shows one media at a time; nothing to zoom into
       (declared in the report). */
    let tX = 0;
    let tY = 0;
    let tLive = false;
    const onLbTouchStart = (e) => {
      if (!lbOpen || e.touches.length !== 1) { tLive = false; return; }
      tLive = true;
      tX = e.touches[0].clientX;
      tY = e.touches[0].clientY;
    };
    const onLbTouchEnd = (e) => {
      if (!lbOpen || !tLive) return;
      tLive = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - tX;
      const dy = t.clientY - tY;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 70) closeLb(); /* swipe down = dismiss */
      } else if (Math.abs(dx) > 50) {
        showMedia(navIdx() + (dx < 0 ? 1 : -1));
      }
    };
    lightbox.addEventListener('touchstart', onLbTouchStart, { passive: true });
    lightbox.addEventListener('touchend', onLbTouchEnd, { passive: true });
    cleanups.push(() => {
      lightbox.removeEventListener('touchstart', onLbTouchStart);
      lightbox.removeEventListener('touchend', onLbTouchEnd);
    });
  }

  /* Back-to-top / home (all modes — navigation, not decoration). */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    if (lenis.i) lenis.i.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  /* ── Bottom behaviours (Oscar's rev — the landing pair, every
     page): the two centred nav items ripple OUT at the very bottom
     and back in on the way up (partial sweep, 2026-08-27 — wordmark
     + LET'S CHAT stay); a 2s idle stop inside the footer reveal glides to
     the bottom (non-RM). All through the shared nav-motion applier
     and Lenis — the landing-closing.js shape verbatim. */
  /* R36 (Oscar, 2026-09-04): the SHARED bottom binder (nav-motion.js)
     — sweep, hysteresis and the idle snap inside the footer's height,
     one implementation on every document-scroll page. */
  cleanups.push(bindBottomNavSweep({ reduced, getLenis: () => lenis.i }));

  /* ── The intro's accent bar — derived from the rendered ink
     (statement-bar.js; Oscar's spanning rule, 2026-08-27 — the four
     studies' copy lengths differ, which the derivation absorbs).
     The CSS height/top remain only as the no-JS fallback. Layout,
     not choreography — runs under RM too. Desktop only: the bar is
     display:none under the seam and the mobile DOM keeps its bytes. */
  if (!isMobileViewport()) {
    cleanups.push(initStatementBar(
      document.querySelector('[data-cs-bar]'),
      document.querySelector('[data-cs-intro]'),
    ));
  }

  if (reduced) {
    /* RM: static page; sticky remains (it's layout). The hidden
       entrance states are gated no-preference in CSS. */
    return () => cleanups.forEach((fn) => fn());
  }

  const triggers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* Hero — the title word-reveals at load, image rise behind.
       (The subtitle is DESKTOP-hidden since the 36:1827 rebuild —
       the mobile build keeps its shipped title+subtitle pair, so
       its wiring is width-gated, not removed.) */
    const isMob = isMobileViewport();
    const heroTitle = document.querySelector('[data-cs-hero-title]');
    const heroSub = isMob ? document.querySelector('[data-cs-hero-subtitle]') : null;
    [heroTitle, heroSub].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });
    schedule(() => {
      document.querySelector('[data-cs-hero-img]')?.classList.add('is-visible');
    }, 300);

    /* Intro statement + red bar — once, the closing convention. */
    const intro = document.querySelector('[data-cs-intro]');
    if (intro instanceof HTMLElement) {
      wrapWordRevealElement(intro);
      triggers.push(ScrollTrigger.create({
        trigger: intro,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          playLineRevealElement(intro);
          document.querySelector('[data-cs-bar]')?.classList.add('is-visible');
        },
      }));
    }

    /* THE FACTS (36:1827): the label + paragraph word-reveal at the
       label/para convention (65%, once); the TABLE ROWS reveal in
       row order on the house 0.12 row stagger (the reel/access row
       treatment), one-shot at 75%. */
    /* THE MOBILE PASS (2026-09-07): the facts render on the narrow build
       too (case-study.css), so their reveals run on both widths. */
    const factLines = Array.from(document.querySelectorAll('[data-cs-facts-line]'));
    factLines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    const factsHead = document.querySelector('.cs-facts__head');
    if (factsHead && factLines.length) {
      triggers.push(ScrollTrigger.create({
        trigger: factsHead,
        start: 'top 65%',
        once: true,
        onEnter: () => factLines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l)),
      }));
    }
    const factRows = Array.from(document.querySelectorAll('[data-cs-fact-row]'));
    factRows.forEach((row, r) => {
      row.querySelectorAll('[data-cs-fact-line]').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.dataset.revealDelay = String(r * LINE_STAGGER_S);
        wrapWordRevealElement(el);
      });
    });
    const factsTable = document.querySelector('[data-cs-facts-table]');
    if (factsTable && factRows.length) {
      triggers.push(ScrollTrigger.create({
        trigger: factsTable,
        start: 'top 75%',
        once: true,
        onEnter: () => factRows.forEach((row) => {
          row.querySelectorAll('[data-cs-fact-line]').forEach((el) => {
            if (el instanceof HTMLElement) playLineRevealElement(el);
          });
        }),
      }));
    }

    /* Stream rows — rise as they enter. */
    document.querySelectorAll('[data-cs-row]').forEach((row) => {
      triggers.push(ScrollTrigger.create({
        trigger: row,
        start: 'top 85%',
        once: true,
        onEnter: () => row.classList.add('is-visible'),
      }));
    });

    /* MOBILE-ONLY entrances (the shipped mobile build keeps its
       what-we-did columns and static rail blocks — their wiring is
       width-gated here since the 36:1827 desktop rebuild removed
       those sections from the desktop render). The DESKTOP rail
       machinery — the settle-at-pin scheduling for sticky segments
       and the KEY-IMPACT scrubbed cover wipe — is REMOVED, not
       gated. (Note: the cover wipe used to run below the seam too,
       against desktop constants — a latent leak; it is gone on
       both.) */
    if (isMob) {
      const didLines = Array.from(document.querySelectorAll('[data-cs-did-line]'));
      didLines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        const col = Number(line.dataset.csCol ?? '-1');
        const base = col >= 0 ? 0.12 + col * COL_STAGGER_S : 0;
        wrapWordRevealElement(line, { baseDelay: base + (i % 5) * 0.04 });
      });
      const did = document.querySelector('[data-cs-did]');
      if (did) {
        triggers.push(ScrollTrigger.create({
          trigger: did,
          start: 'top 70%',
          once: true,
          onEnter: () => didLines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l)),
        }));
      }
      /* The seg1 desc keeps its static line boxes — the retired
         cover wipe used to split it (wrapStaticLines) on every
         width; the split is rendering-neutral and the shipped
         mobile DOM carries it, so it stays. */
      const seg1Desc = document.querySelector('.cs-rail-seg--1 .cs-rail__desc');
      if (seg1Desc instanceof HTMLElement) wrapStaticLines(seg1Desc);
      document.querySelectorAll('.cs-rail-seg').forEach((seg) => {
        const block = seg.querySelector('[data-cs-rail]');
        triggers.push(ScrollTrigger.create({
          trigger: seg,
          start: 'top 60%',
          once: true,
          onEnter: () => {
            block?.classList.add('is-visible');
            schedule(() => {
              if (block instanceof HTMLElement) block.style.transition = 'none';
            }, 700);
          },
        }));
      });
    }

    /* More work — title reveal, cards stagger, card text rides. */
    const moreTitle = document.querySelector('[data-cs-more-title]');
    if (moreTitle instanceof HTMLElement) wrapWordRevealElement(moreTitle);
    const moreCards = Array.from(document.querySelectorAll('[data-cs-more-card]'));
    moreCards.forEach((card) => {
      card.querySelectorAll('.cs-more__cardtitle, .cs-more__carddesc').forEach((el, k) => {
        if (el instanceof HTMLElement) wrapWordRevealElement(el, { baseDelay: 0.2 + k * LINE_STAGGER_S });
      });
    });
    const more = document.querySelector('[data-cs-more]');
    if (more) {
      triggers.push(ScrollTrigger.create({
        trigger: more,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          if (moreTitle instanceof HTMLElement) playLineRevealElement(moreTitle);
          moreCards.forEach((card, i) => {
            schedule(() => {
              card.classList.add('is-visible');
              card.querySelectorAll('.cs-more__cardtitle, .cs-more__carddesc').forEach((el) => {
                if (el instanceof HTMLElement) playLineRevealElement(el);
              });
            }, 200 + i * 120);
          });
        },
      }));
    }

    /* Footer — the shared choreography, on the LANDING'S covered-
       footer trigger maths verbatim: the footer PINS BEHIND the
       content (the parallax uncover), so a viewport-percentage
       start fires while it's still covered — fire ~200px into the
       actual reveal instead (the pin engages when the footer's flow
       top reaches 100dvh - 811 from the viewport top). The earlier
       IntersectionObserver fallback is GONE for the same reason:
       IO can't see occlusion — a pinned-behind footer intersects
       the viewport long before it's revealed, playing the entrance
       under the cover (Oscar's "no reveal effect"). */
    const footer = document.querySelector('[data-landing-footer]');
    if (footer instanceof HTMLElement) {
      const wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: () => (isMobileViewport()
          ? 'top 85%' /* mobile plain-flow footer — the desktop pin formula can never fire (landing-closing lesson) */
          : `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`),
        once: true,
        onEnter: () => playFooterReveals(wrapped, schedule),
      }));
    }

    ScrollTrigger.refresh();
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
    document.body.style.overflow = ''; /* release the lightbox scroll lock if torn down open */
  };
}
