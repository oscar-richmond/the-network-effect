import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import imagesLoaded from 'imagesloaded';
import { initCurveMedia } from './curve-media.js';
import { initLineReveal } from './line-reveal.js';
import { createHeroDissolve } from './hero-dissolve.js';
import { initAboutStickyClients, syncStickyClientsLayout } from './about-sticky-clients.js';

const ABOUT_TEXT_SELECTOR = [
  '.about-scroll .project__label',
  '.about-scroll .project__name',
  '.about-scroll .project__date',
  '.about-scroll .project__title',
  '.about-scroll .project p',
  '.about-scroll .caption p',
  '[data-para-anim-p]',
].join(', ');

// Gallery-3's caption ("The Art of Perfection?") keeps its original
// slide-up-from-below entrance (driven by the gallery's own scroll-linked
// transform) instead of the per-line clip reveal used elsewhere.
const ABOUT_TEXT_EXCLUDE_SELECTOR = '#gallery-3 .caption p';

// A gentler warp/bend + chromatic aberration than the homepage carousel's
// default (which is tuned for a bigger, more dramatic hero moment).
const ABOUT_CURVE_MEDIA_OPTIONS = {
  amplitude: 0.012,
  aberration: 0.0012,
  smoothing: 8,
};

gsap.registerPlugin(ScrollTrigger, Flip);

// ── Hero image staircase scroll-pin + centre expand ──────────────────────
/**
 * Orchestrates the full hero-image scroll sequence:
 *
 *  Phase 1 — Pin each image at vertical centre (scrub translateY):
 *    As the user scrolls, each card rises naturally (it’s in-flow in the spacer).
 *    When a card’s top edge would reach centreViewportY, a GSAP scrub tween
 *    applies an equal-and-opposite translateY so the card appears to stop there
 *    while the page continues scrolling.
 *
 *  Phase 2 — Side images fade out:
 *    Once all three are pinned, images 0 and 2 fade to opacity:0 over a short
 *    scroll range, leaving just the centre card visible.
 *
 *  Phase 3 — Centre image expands to full screen (clip-path):
 *    A position:fixed overlay containing the same image as card 1 (the middle
 *    hero card) is placed over the viewport. Its clip-path starts as a rectangle
 *    matching the centre card’s exact viewport position and is scrubbed to
 *    inset(0 0 0 0) (full screen). GPU-composited — no layout reflow.
 *    The in-flow card is hidden when the overlay takes over.
 *
 *  Phase 4 — Full-screen image dissolves out (noisy wipe, scroll-scrubbed):
 *    Once the centre card fills the viewport, a WebGL layer takes over and
 *    dissolves the image from bottom to top as the user continues scrolling.
 *
 *  Spacer height is extended dynamically to accommodate all phases.
 */
function initHeroImageScroll() {
  const spacer = document.querySelector('[data-about-hero-spacer]');
  const imgs   = spacer
    ? Array.from(spacer.querySelectorAll('.about-hero__img'))
    : [];

  if (!spacer || imgs.length < 3) return () => {};

  const heroMedia = spacer.querySelector('[data-about-hero-media]');
  const heroVideo = heroMedia?.querySelector('[data-about-hero-video]');

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Card dimensions from GSAP-applied inline styles
  const middleImg = imgs[1];
  const cardW = parseFloat(middleImg.style.width || '0');
  const cardH = parseFloat(middleImg.style.height || '0');

  // The viewport Y at which the middle card should appear centred
  const centreViewportY = (vh - cardH) / 2;

  // scrollY at which each card’s top edge reaches its own vertical centre
  const pinScrollYs = imgs.map((img) => {
    const docTop = parseFloat(img.style.top || '0');
    const imgH = parseFloat(img.style.height || '0');
    const centreY = (vh - imgH) / 2;
    return Math.max(0, docTop - centreY);
  });

  const lastPinScrollY = Math.max(...pinScrollYs);

  // ── Timings ────────────────────────────────────────────
  const FADE_SIDE_START    = lastPinScrollY + 80;   // side images start fading
  const FADE_SIDE_DUR      = 200;                   // fade duration (px of scroll)
  const EXPAND_START       = FADE_SIDE_START + FADE_SIDE_DUR + 60; // expand begins
  const EXPAND_DUR         = 700;                   // expand duration (px of scroll)
  const EXPAND_END         = EXPAND_START + EXPAND_DUR;

  // Phase 4: full-viewport image dissolves out (Ironhill-style noisy wipe).
  const DISSOLVE_DUR = vh;
  const DISSOLVE_END = EXPAND_END + DISSOLVE_DUR;

  // Spacer ends when the hero dissolve completes — the paragraph section follows.
  const requiredHeight = DISSOLVE_END;
  spacer.style.height = requiredHeight + 'px';

  if (heroMedia instanceof HTMLElement) {
    gsap.fromTo(
      heroMedia,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: `top+=${DISSOLVE_END} top`,
          end: `top+=${DISSOLVE_END + 160} top`,
          scrub: true,
          onLeave: () => {
            if (heroVideo instanceof HTMLVideoElement) heroVideo.pause();
          },
          onEnterBack: () => {
            if (heroVideo instanceof HTMLVideoElement) heroVideo.play().catch(() => {});
            gsap.set(heroMedia, { opacity: 1 });
          },
        },
      },
    );
  }

  const heroTagline = spacer.querySelector('[data-about-hero-tagline]');
  const heroTaglineText = spacer.querySelector('[data-about-hero-tagline-text]');
  const heroTaglineFadeTarget =
    heroTaglineText instanceof HTMLElement ? heroTaglineText : heroTagline;
  if (heroTaglineFadeTarget instanceof HTMLElement) {
    gsap.fromTo(
      heroTaglineFadeTarget,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start: `top+=${DISSOLVE_END} top`,
          end: `top+=${DISSOLVE_END + 160} top`,
          scrub: true,
          onEnterBack: () => {
            if (heroTagline instanceof HTMLElement) {
              gsap.set(heroTagline, { visibility: 'visible' });
            }
            gsap.set(heroTaglineFadeTarget, { opacity: 1 });
          },
        },
      },
    );
  }

  // ── Phase 1: per-image scrub pin ──────────────────────────────
  imgs.forEach((img, i) => {
    const pinScrollY = pinScrollYs[i];
    if (pinScrollY <= 0) return;

    // From the pin point onward, the card must stay at centreViewportY.
    // translateY = (scrollY - pinScrollY) counteracts the natural upward scroll.
    // We tween y from 0 → (requiredHeight - pinScrollY) while the scrub keeps
    // the value exactly matching the live scroll offset.
    const travelAfterPin = requiredHeight - pinScrollY;

    gsap.fromTo(
      img,
      { y: 0 },
      {
        y: travelAfterPin,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start:   `top+=${pinScrollY} top`,
          end:     `top+=${pinScrollY + travelAfterPin} top`,
          scrub:   true,
        },
      },
    );
  });

  // ── Phase 2: fade side images (imgs[0] and imgs[2]) ─────────────────────
  // IMPORTANT: we fade the inner <img> element, NOT the .about-hero__img wrapper.
  //
  // Fading the wrapper (opacity !== 1) creates a CSS stacking context on it,
  // which changes the GPU compositing arrangement for all siblings including
  // the middle card. When opacity reaches 0 and that stacking context is torn
  // down, the browser recalculates subpixel rendering for adjacent elements,
  // causing a visible horizontal shift on the middle image.
  //
  // Fading only the inner <img> keeps all three wrapper divs at opacity:1
  // throughout — no stacking context is ever created or destroyed — so the
  // middle card's compositing layer stays completely stable.
  [imgs[0], imgs[2]].forEach((img) => {
    const innerImg = img.querySelector('img') ?? img;
    gsap.fromTo(
      innerImg,
      { opacity: 1 },
      {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: spacer,
          start:   `top+=${FADE_SIDE_START} top`,
          end:     `top+=${FADE_SIDE_START + FADE_SIDE_DUR} top`,
          scrub:   true,
        },
      },
    );
  });

  const middleLeft   = parseFloat(middleImg.style.left || '0');
  const docTopMiddle = parseFloat(middleImg.style.top  || '0');

  // Cubic ease-in-out — cinematic expansion pacing.
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // pinScrollY for the middle card specifically
  const pinScrollY1 = pinScrollYs[1];
  const travelAfterPin1 = requiredHeight - pinScrollY1;

  // ── Phase 3: expand the middle card directly to full viewport ────────────
  //
  // One image, no overlay.  The middle card img is already the full-res
  // landscape image.  We simply grow the card itself from its staircase size
  // to full viewport.
  //
  // While Phase 1 is still running (its translateY pin keeps the card at
  // centreViewportY), we switch the card to position:fixed and compensate
  // for Phase 1's live y value in every onUpdate frame:
  //
  //   visual_top = style.top + translateY(y)
  //              = [centreViewportY*(1-p) − y] + y
  //              = centreViewportY*(1-p)
  //              → 0 at p=1  ✓
  //
  // Phase 1 is never killed — on onLeaveBack we restore position:absolute
  // and Phase 1 immediately re-takes control of the y transform, keeping
  // the card at centreViewportY with no jump.
  //
  const getPhase1Y = () => Math.min(
    Math.max(0, window.scrollY - pinScrollY1),
    travelAfterPin1,
  );

  /** Live Phase-1 y from the scrub tween (falls back to scroll-derived pin). */
  const getMiddlePinY = () => {
    const y = gsap.getProperty(middleImg, 'y');
    return typeof y === 'number' ? y : getPhase1Y();
  };

  /**
   * Phase 1 keeps scrubbing translateY for the entire spacer height. Once the
   * middle card is fixed full-screen, style.top must track −y every frame or
   * the image drifts off the viewport while the user keeps scrolling.
   */
  const syncFullViewportFixed = () => {
    ensureMiddleInFlow();
    if (middleImg.style.position !== 'fixed') return;

    const pinY = getMiddlePinY();

    Object.assign(middleImg.style, {
      top:    `${-pinY}px`,
      left:   '0px',
      width:  `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
    });
  };

  /** @type {ReturnType<typeof createHeroDissolve> | null} */
  let heroDissolve = null;

  const destroyHeroDissolve = () => {
    heroDissolve?.destroy();
    heroDissolve = null;
  };

  const getMiddleImageEl = () => {
    const img = middleImg.querySelector('img');
    return img instanceof HTMLImageElement ? img : null;
  };

  const restoreMiddleImageOpacity = () => {
    gsap.killTweensOf(middleImg);
    const innerImg = getMiddleImageEl();
    if (innerImg) gsap.killTweensOf(innerImg);

    middleImg.style.opacity = '';
    gsap.set(middleImg, { clearProps: 'opacity' });

    if (innerImg) {
      innerImg.style.opacity = '';
      gsap.set(innerImg, { clearProps: 'opacity' });
    }
  };

  /** Return the middle card from full-screen fixed back to in-flow pin. */
  const restoreMiddleToFlow = () => {
    if (middleImg.style.position !== 'fixed') return;

    restoreMiddleImageOpacity();

    Object.assign(middleImg.style, {
      position: 'absolute',
      top:      `${docTopMiddle}px`,
      left:     `${middleLeft}px`,
      width:    `${cardW}px`,
      height:   `${cardH}px`,
      zIndex:   '',
      overflow: '',
    });

    // Phase-1 scrub can stall after fixed → absolute; snap y immediately.
    gsap.set(middleImg, { y: getPhase1Y() });
  };

  /** Safety net when scroll jumps past expand start while still fixed. */
  const ensureMiddleInFlow = () => {
    if (window.scrollY < EXPAND_START && middleImg.style.position === 'fixed') {
      restoreMiddleToFlow();
    }
  };

  // Keep middle-card y in sync in the pre-expand pin zone (incl. after scroll-back).
  ScrollTrigger.create({
    trigger: spacer,
    start: `top+=${pinScrollY1} top`,
    end:   `top+=${EXPAND_START} top`,
    onUpdate: () => {
      if (middleImg.style.position === 'fixed') return;
      gsap.set(middleImg, { y: getPhase1Y() });
    },
  });

  // ── Phase 3 trigger: card → position:fixed ───────────────────────────────
  ScrollTrigger.create({
    trigger: spacer,
    start: `top+=${EXPAND_START} top`,
    onEnter() {
      const y = getMiddlePinY();
      Object.assign(middleImg.style, {
        position: 'fixed',
        // fixedTop so that visual top = fixedTop + Phase1_y = centreViewportY
        top:      `${centreViewportY - y}px`,
        left:     `${middleLeft}px`,
        width:    `${cardW}px`,
        height:   `${cardH}px`,
        zIndex:   '249',
        overflow: 'hidden',
      });
    },
    onLeaveBack() {
      restoreMiddleToFlow();
    },
  });

  // ── Phase 3 scrub: grow card from card-size → full viewport ──────────────
  ScrollTrigger.create({
    trigger: spacer,
    start: `top+=${EXPAND_START} top`,
    end:   `top+=${EXPAND_END}   top`,
    onUpdate(self) {
      ensureMiddleInFlow();
      if (middleImg.style.position !== 'fixed') return;

      const p = easeInOut(self.progress);
      const y = getMiddlePinY();
      // visual top = fixedTop + y = centreViewportY*(1-p)
      const fixedTop = centreViewportY * (1 - p) - y;
      Object.assign(middleImg.style, {
        top:    `${fixedTop}px`,
        left:   `${middleLeft * (1 - p)}px`,
        width:  `${cardW * (1 - p) + vw * p}px`,
        height: `${cardH * (1 - p) + vh * p}px`,
      });
    },
    onLeave() {
      syncFullViewportFixed();
    },
  });

  // Compensate Phase-1 y for the full-screen + dissolve scroll range.
  ScrollTrigger.create({
    trigger: spacer,
    start: `top+=${EXPAND_END} top`,
    end:   `top+=${requiredHeight} top`,
    onUpdate: syncFullViewportFixed,
    onEnter: syncFullViewportFixed,
    onEnterBack: syncFullViewportFixed,
    onLeaveBack() {
      if (window.scrollY < EXPAND_START) restoreMiddleToFlow();
    },
  });

  const handoffToDissolveCanvas = () => {
    if (heroDissolve) return;

    const imgEl = getMiddleImageEl();
    if (!imgEl) return;

    syncFullViewportFixed();
    restoreMiddleImageOpacity();

    heroDissolve = createHeroDissolve(imgEl);
    // Show canvas immediately — no opacity tween (parallel fades expose white page bg).
    heroDissolve.reveal(0);

    // Hide DOM after canvas has painted so there is never a gap between layers.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!heroDissolve) return;
        middleImg.style.opacity = '0';
      });
    });
  };

  // ── Phase 4: dissolve full-screen image on scroll ───────────────────────
  /** @type {ScrollTrigger} */
  let dissolveTrigger;

  dissolveTrigger = ScrollTrigger.create({
    trigger: spacer,
    start: `top+=${EXPAND_END}   top`,
    end:   `top+=${DISSOLVE_END} top`,
    onEnter: syncFullViewportFixed,
    onUpdate(self) {
      syncFullViewportFixed();
      if (self.progress > 0) {
        handoffToDissolveCanvas();
        heroDissolve?.setProgress(self.progress);
      }
    },
    onLeave() {
      heroDissolve?.setProgress(1);
      destroyHeroDissolve();
      syncFullViewportFixed();
      middleImg.style.opacity = '0';
    },
    onEnterBack() {
      syncFullViewportFixed();
      if (dissolveTrigger.progress > 0) {
        handoffToDissolveCanvas();
        heroDissolve?.setProgress(dissolveTrigger.progress);
      } else {
        restoreMiddleImageOpacity();
      }
    },
    onLeaveBack() {
      destroyHeroDissolve();
      if (window.scrollY < EXPAND_START) {
        restoreMiddleToFlow();
      } else {
        restoreMiddleImageOpacity();
        syncFullViewportFixed();
      }
    },
  });

  const onDissolveResize = () => heroDissolve?.resize();

  window.addEventListener('resize', onDissolveResize);

  return () => {
    window.removeEventListener('resize', onDissolveResize);
    destroyHeroDissolve();
  };
}

/**
 * @param {string} selector
 */
function preloadImages(selector = 'img') {
  return new Promise((resolve) => {
    const targets = document.querySelectorAll(selector);
    if (!targets.length) {
      resolve(undefined);
      return;
    }

    imagesLoaded(targets, { background: true }, () => resolve(undefined));
  });
}

/** @type {Lenis | null} */
let lenis = null;

function initSmoothScrolling() {
  document.documentElement.classList.add('lenis');

  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  lenis.on('scroll', () => ScrollTrigger.update());

  const scrollFn = (time) => {
    lenis?.raf(time);
    requestAnimationFrame(scrollFn);
  };

  requestAnimationFrame(scrollFn);
}

/** Vertical offset for the hero paragraph (positive = move up). */
const PARA_HERO_OFFSET_Y = 80;

/**
 * Sets equal px padding above and below the hero paragraph so white space
 * is symmetric within one viewport height.
 */
function syncParaHeroSpacing() {
  const section = document.querySelector('[data-para-hero-section]');
  const paragraph = section?.querySelector('[data-para-anim-p]');
  if (!(section instanceof HTMLElement) || !(paragraph instanceof HTMLElement)) return;

  section.style.height = 'auto';
  section.style.paddingTop = '0';
  section.style.paddingBottom = '0';

  const viewportHeight = window.innerHeight;
  const textHeight = paragraph.getBoundingClientRect().height;
  const gap = Math.round(Math.max(0, (viewportHeight - textHeight) / 2));
  const topPad = Math.max(0, gap - PARA_HERO_OFFSET_Y);
  const bottomPad = gap + PARA_HERO_OFFSET_Y;

  section.style.height = `${viewportHeight}px`;
  section.style.paddingTop = `${topPad}px`;
  section.style.paddingBottom = `${bottomPad}px`;
  section.style.boxSizing = 'border-box';
}

/** Vertical offset for the trio image row (positive = move up). */
const PARA_TRIO_OFFSET_Y = 140;

/**
 * Top padding for the image row; section height grows to include the tagline below.
 */
function syncParaTrioSpacing() {
  const section = document.querySelector('[data-para-trio-section]');
  const row = section?.querySelector('[data-para-trio-row]');
  if (!(section instanceof HTMLElement) || !(row instanceof HTMLElement)) return;

  section.style.height = 'auto';
  section.style.paddingBottom = '0';

  const viewportHeight = window.innerHeight;
  const rowHeight = row.getBoundingClientRect().height;
  const gap = Math.round(Math.max(0, (viewportHeight - rowHeight) / 2));
  const topPad = Math.max(0, gap - PARA_TRIO_OFFSET_Y);

  section.style.paddingTop = `${topPad}px`;
  section.style.boxSizing = 'border-box';
}

function syncParaSectionSpacing() {
  syncParaHeroSpacing();
  syncParaTrioSpacing();
  syncStickyClientsLayout();
  ScrollTrigger.refresh();
}

/**
 * initParaAnim — orbit hover for the first paragraph section.
 *
 * When the user hovers over any [data-para-word] span, images orbit the
 * cursor in a slow rotating ring. Text entry is handled by initLineReveal.
 *
 * @returns {() => void} cleanup function
 */
function initParaAnim() {
  const section  = document.querySelector('[data-para-hero-section]');
  const orbitEl  = document.querySelector('[data-para-orbit]');
  if (!section || !orbitEl) return () => {};

  const words = /** @type {NodeListOf<HTMLElement>} */ (
    section.querySelectorAll('[data-para-word]')
  );
  const items = /** @type {HTMLElement[]} */ (
    Array.from(orbitEl.querySelectorAll('.para-orbit__item'))
  );

  if (!items.length || !words.length) return () => {};
  const N           = items.length;
  const ANGLE_STEP  = (2 * Math.PI) / N;
  const RADIUS      = 296;   // px from cursor to image centre (20% smaller)
  const ANGLE_SPEED = 0.004; // radians per rAF frame

  let currentAngle = 0;
  let isHovered    = false;
  let targetX      = 0;
  let targetY      = 0;
  let rafId        = /** @type {number | null} */ (null);
  let hideTimeout  = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

  /** Animate one frame: rotate the orbit and update GSAP positions. */
  const tick = () => {
    currentAngle += ANGLE_SPEED;
    if (currentAngle > 2 * Math.PI) currentAngle -= 2 * Math.PI;

    items.forEach((item, i) => {
      const angle = currentAngle + i * ANGLE_STEP;
      // .para-orbit is position:fixed at top:0; left:0, so these
      // viewport-absolute coordinates map directly to GSAP translateX/Y.
      const x = targetX + RADIUS * Math.cos(angle) - item.offsetWidth  / 2;
      const y = targetY + RADIUS * Math.sin(angle) - item.offsetHeight / 2;
      gsap.to(item, { x, y, duration: 0.6, ease: 'power1.out', overwrite: 'auto' });
    });

    if (isHovered) rafId = requestAnimationFrame(tick);
  };

  const showOrbit = (clientX, clientY) => {
    if (hideTimeout !== null) { clearTimeout(hideTimeout); hideTimeout = null; }
    targetX = clientX;
    targetY = clientY;
    if (!isHovered) {
      isHovered = true;
      items.forEach((item) =>
        gsap.to(item, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      );
      rafId = requestAnimationFrame(tick);
    }
  };

  const hideOrbit = () => {
    // Short grace period prevents a flash when moving between adjacent words.
    hideTimeout = setTimeout(() => {
      isHovered = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      items.forEach((item) =>
        gsap.to(item, { opacity: 0, duration: 0.5, ease: 'power2.in' })
      );
    }, 80);
  };

  /** @param {MouseEvent} e */
  const onEnter = (e) => showOrbit(e.clientX, e.clientY);
  /** @param {MouseEvent} e */
  const onMove  = (e) => { targetX = e.clientX; targetY = e.clientY; };

  words.forEach((word) => {
    word.addEventListener('mouseenter', onEnter);
    word.addEventListener('mousemove',  onMove);
    word.addEventListener('mouseleave', hideOrbit);
  });

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (hideTimeout !== null) clearTimeout(hideTimeout);
    words.forEach((word) => {
      word.removeEventListener('mouseenter', onEnter);
      word.removeEventListener('mousemove',  onMove);
      word.removeEventListener('mouseleave', hideOrbit);
    });
  };
}

/**
 * @param {HTMLElement} galleryEl
 * @param {object} [options]
 */
function triggerFlipOnScroll(galleryEl, options = {}) {
  const settings = {
    flip: {
      absoluteOnLeave: false,
      absolute: false,
      scale: true,
      simple: true,
      ...options.flip,
    },
    scrollTrigger: {
      start: 'center center',
      end: '+=300%',
      ...options.scrollTrigger,
    },
    stagger: options.stagger ?? 0,
  };

  const galleryCaption = galleryEl.querySelector('.caption');
  const galleryItems = galleryEl.querySelectorAll('.gallery__item');
  const galleryItemsInner = [...galleryItems]
    .map((item) => (item.children.length > 0 ? [...item.children] : []))
    .flat()
    .filter((child) => !child.classList.contains('gallery__item-media'));

  const captionOverImage = options.captionOverImage ?? true;

  galleryEl.classList.add('gallery--switch');
  const flipstate = Flip.getState([galleryItems, galleryCaption], {
    props: 'filter, opacity',
  });
  galleryEl.classList.remove('gallery--switch');

  const tl = Flip.to(flipstate, {
    ease: 'none',
    absoluteOnLeave: settings.flip.absoluteOnLeave,
    absolute: settings.flip.absolute,
    scale: settings.flip.scale,
    simple: settings.flip.simple,
    scrollTrigger: {
      trigger: galleryEl,
      start: settings.scrollTrigger.start,
      end: settings.scrollTrigger.end,
      pin: galleryEl.parentElement,
      scrub: true,
      onUpdate(self) {
        if (!captionOverImage) return;
        galleryEl.classList.toggle('gallery--caption-on-image', self.progress > 0.55);
      },
      onLeave() {
        if (captionOverImage) galleryEl.classList.add('gallery--caption-on-image');
      },
      onLeaveBack() {
        if (captionOverImage) galleryEl.classList.remove('gallery--caption-on-image');
      },
    },
    stagger: settings.stagger,
  });

  if (galleryItemsInner.length) {
    tl.fromTo(
      galleryItemsInner,
      { scale: 2 },
      {
        scale: 1,
        scrollTrigger: {
          trigger: galleryEl,
          start: settings.scrollTrigger.start,
          end: settings.scrollTrigger.end,
          scrub: true,
        },
      },
      0,
    );
  }
}

function initGalleries(root) {
  const galleries = [
    { id: '#gallery-2' },
    {
      id: '#gallery-3',
      options: {
        flip: { absolute: true, scale: false },
        scrollTrigger: { start: 'center center', end: '+=900%' },
        stagger: 0.05,
        captionOverImage: false,
      },
    },
    { id: '#gallery-4', options: { captionOverImage: false } },
    { id: '#gallery-5', options: { captionOverImage: false } },
    { id: '#gallery-7' },
    { id: '#gallery-8', options: { flip: { scale: false } } },
  ];

  galleries.forEach((gallery) => {
    const galleryElement = root.querySelector(gallery.id);
    if (galleryElement instanceof HTMLElement) {
      triggerFlipOnScroll(galleryElement, gallery.options);
    }
  });
}

/**
 * @param {HTMLElement} root
 * @param {string} gallerySelector
 */
function initGalleryCurve(root, gallerySelector) {
  const gallery = root.querySelector(gallerySelector);
  if (!(gallery instanceof HTMLElement)) return null;

  const canvas = gallery.querySelector('[data-curve-canvas]');
  const images = [...gallery.querySelectorAll('[data-curve-image]')].filter(
    (img) => img instanceof HTMLImageElement,
  );

  if (!(canvas instanceof HTMLCanvasElement) || images.length === 0) return null;

  try {
    return initCurveMedia(gallery, canvas, images, ABOUT_CURVE_MEDIA_OPTIONS);
  } catch (error) {
    console.warn(`[about-scroll] Curve media init failed for ${gallerySelector}.`, error);
    return null;
  }
}

/**
 * @param {HTMLElement | null} root
 */
export function initAboutScroll(root) {
  if (!root) return () => {};

  let cancelled = false;
  /** @type {Array<ReturnType<typeof initCurveMedia>>} */
  let curveMediaInstances = [];
  let cleanupLineReveal = () => {};
  let cleanupParaAnim   = () => {};
  let cleanupHeroScroll = () => {};
  let cleanupStickyClients = () => {};

  /** @type {(() => void) | null} */
  let onResize = null;

  preloadImages('.gallery__item').then(() => {
    if (cancelled) return;

    initSmoothScrolling();

    root?.querySelectorAll('[data-para-trio-row] img').forEach((img) => {
      if (!(img instanceof HTMLImageElement) || img.complete) return;
      img.addEventListener('load', () => syncParaSectionSpacing(), { once: true });
    });

    // initHeroImageScroll reads card dimensions from inline styles that are only
    // set once the hero entry animation completes and moves images into the spacer.
    // Waiting for 'about-hero:settled' guarantees those styles exist.
    const onHeroSettled = () => {
      if (cancelled) return;
      cleanupHeroScroll = initHeroImageScroll();
      syncParaSectionSpacing();
      document.fonts?.ready.then(() => {
        if (cancelled) return;
        syncParaSectionSpacing();
        ScrollTrigger.refresh();
      });
      ScrollTrigger.refresh();
    };

    onResize = () => {
      if (cancelled) return;
      syncParaSectionSpacing();
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', onResize);

    // If the hero has already settled by the time galleries finish preloading,
    // run immediately; otherwise wait for the event.
    if (document.querySelector('[data-about-hero-spacer] .about-hero__img')) {
      onHeroSettled();
    } else {
      document.addEventListener('about-hero:settled', onHeroSettled, { once: true });
    }

    initGalleries(root);
    cleanupStickyClients = initAboutStickyClients(root);
    ScrollTrigger.refresh();
    curveMediaInstances = [
      initGalleryCurve(root, '#gallery-3'),
    ].filter(Boolean);
    cleanupLineReveal = initLineReveal({
      trigger: 'scroll',
      selector: ABOUT_TEXT_SELECTOR,
      exclude: ABOUT_TEXT_EXCLUDE_SELECTOR,
      onWrapped: () => {
        document.body.classList.remove('loading');
        syncParaSectionSpacing();
        // Orbit hover binds after line-reveal wraps [data-para-word] spans.
        cleanupParaAnim = initParaAnim();
        ScrollTrigger.refresh();
      },
    });
  });


  return () => {
    cancelled = true;
    if (onResize) window.removeEventListener('resize', onResize);
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    curveMediaInstances.forEach((instance) => instance?.destroy());
    curveMediaInstances = [];
    cleanupHeroScroll();
    cleanupStickyClients();
    cleanupLineReveal();
    cleanupParaAnim();
    lenis?.destroy();
    lenis = null;
    document.documentElement.classList.remove('lenis');
  };
}
