/**
 * /work/[slug] — CASE STUDY machinery.
 *
 * SCROLL: native document scroll through Lenis — the landing's
 * config VERBATIM (lerp 0.065, smoothWheel; ScrollTrigger.update on
 * scroll; own rAF). The sticky rail is native position:sticky —
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
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const COL_STAGGER_S = 0.08;
/* Bottom behaviours — the landing constants (landing-closing.js). */
const FOOTER_H_PX = 811;
const BOTTOM_SNAP_IDLE_MS = 2000;
const BOTTOM_EPSILON_PX = 2;
const NAV_SHOW_HYSTERESIS_PX = 64;

export function initCaseStudy() {
  const page = document.querySelector('[data-case-study]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    /* Arrow hover = the LET'S CHAT ripple (the injected char-ripple
       arrow animation replayed on the svg), active buttons only. */
    if (!reduced) {
      [prevBtn, nextBtn].forEach((btn) => {
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
      });
    }
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
  const lightbox = document.querySelector('[data-cs-lightbox]');
  if (lightbox instanceof HTMLElement) {
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
    const SWAP_PHASE_MS = 450;
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
          el.style.transition = `clip-path ${SWAP_PHASE_MS / 1000}s cubic-bezier(0.42, 0, 0.24, 1), filter ${SWAP_PHASE_MS / 1000}s cubic-bezier(0.42, 0, 0.24, 1)`;
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

    const openLb = (i, opener) => {
      lbOpen = true;
      lbOpener = opener ?? null;
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
      lightbox.classList.remove('is-open');
      schedule(() => {
        lightbox.hidden = true;
        if (lbVideo instanceof HTMLVideoElement) lbVideo.pause?.();
      }, 380);
      lenis.i?.start();
      document.body.style.overflow = '';
      if (lbOpener instanceof HTMLElement) lbOpener.focus?.();
    };

    const onStreamClick = (e) => {
      const fig = e.target instanceof Element ? e.target.closest('[data-cs-lb-item]') : null;
      if (!(fig instanceof HTMLElement)) return;
      const figs = Array.from(page.querySelectorAll('[data-cs-lb-item]'));
      const i = figs.indexOf(fig);
      if (i >= 0) openLb(i, fig);
    };
    page.addEventListener('click', onStreamClick);
    cleanups.push(() => page.removeEventListener('click', onStreamClick));

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
     page): the nav ripples OUT at the very bottom and back in on
     the way up; a 2s idle stop inside the footer reveal glides to
     the bottom (non-RM). All through the shared nav-motion applier
     and Lenis — the landing-closing.js shape verbatim. */
  ensureLogoChars();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    /* Never strand an open menu without its toggle. */
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
  };
  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;
  const inSnapZone = () => maxScroll() - (window.scrollY || 0) < FOOTER_H_PX - BOTTOM_EPSILON_PX;
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown || !inSnapZone()) return;
    const y = window.scrollY || 0;
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) return;
    if (lenis.i) lenis.i.scrollTo(maxScroll(), { duration: 1.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
  };
  const onBottomScroll = () => {
    const y = window.scrollY || 0;
    if (y !== lastScrollY) {
      lastDirDown = y > lastScrollY;
      lastScrollY = y;
    }
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) setNav(true);
    else if (y < maxScroll() - NAV_SHOW_HYSTERESIS_PX) setNav(false);
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnapToBottom, BOTTOM_SNAP_IDLE_MS);
  };
  window.addEventListener('scroll', onBottomScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('scroll', onBottomScroll);
    window.clearTimeout(snapTimer);
  });

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

    /* Hero — word reveals at load, image rise behind. */
    const heroTitle = document.querySelector('[data-cs-hero-title]');
    const heroSub = document.querySelector('[data-cs-hero-subtitle]');
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

    /* What-we-did — lines word-reveal, columns staggered L->R. */
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

    /* Stream rows — rise as they enter. */
    document.querySelectorAll('[data-cs-row]').forEach((row) => {
      triggers.push(ScrollTrigger.create({
        trigger: row,
        start: 'top 85%',
        once: true,
        onEnter: () => row.classList.add('is-visible'),
      }));
    });

    /* Rail blocks — settle as each first pins; once settled, the
       entrance's CSS transition is REMOVED (the house lesson: a CSS
       transition on opacity would intercept the scrubbed cover
       wipe's per-frame writes below). */
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

    /* THE COVER WIPE (Oscar's rev 2 — LINE BY LINE): as KEY
       IMPACT's block rides up over the pinned OUR WORK, the
       outgoing text wipes one line at a time, BOTTOM FIRST (the
       incoming edge reaches the lower lines first), mirrored on
       reversal — the hero exit-wipe structure, scrubbed over the
       exact cover window. Lines = the label + the desc's rendered
       lines (wrapStaticLines). Each line's tween sits at its
       crossing offset within the window (blockH - lineBottom,
       scaled so the last wipe completes inside the window) —
       NUMERIC positions (the house lesson). KEEP 1944/120 in step
       with the rail geometry. */
    const seg1Block = document.querySelector('.cs-rail-seg--1 [data-cs-rail]');
    const workSec = document.querySelector('[data-cs-work]');
    if (seg1Block instanceof HTMLElement && workSec instanceof HTMLElement) {
      const WIPE_SPAN_PX = 40;
      const label = seg1Block.querySelector('.cs-rail__label');
      const desc = seg1Block.querySelector('.cs-rail__desc');
      const lines = [];
      if (label instanceof HTMLElement) lines.push(label);
      if (desc instanceof HTMLElement) lines.push(...wrapStaticLines(desc));
      const blockRect = seg1Block.getBoundingClientRect();
      const blockH = seg1Block.offsetHeight;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: workSec,
          start: () => `top+=${(1944 - 120 - blockH).toFixed(0)} top`,
          end: () => `top+=${(1944 - 120).toFixed(0)} top`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      const scale = Math.max((blockH - WIPE_SPAN_PX) / blockH, 0);
      lines.forEach((line) => {
        const b = line.getBoundingClientRect().bottom - blockRect.top;
        const pos = Math.max((blockH - b) * scale, 0); /* bottom lines first */
        tl.fromTo(line,
          { opacity: 1, filter: 'blur(0px)' },
          { opacity: 0, filter: 'blur(6px)', duration: WIPE_SPAN_PX, ease: 'none', immediateRender: false },
          pos);
      });
      cleanups.push(() => {
        tl.scrollTrigger?.kill();
        tl.kill();
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
        start: () => `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`,
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
  };
}
