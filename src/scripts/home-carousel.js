import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCurveMedia } from './curve-media.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * @param {number} index
 * @param {number} length
 */
function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

/**
 * @param {number} distance
 * @param {number} range
 */
function focusFromDistance(distance, range) {
  const t = Math.min(1, Math.max(0, distance / range));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * @param {HTMLElement} root
 * @param {{ onImageClick?: () => void }} [options]
 */
export function initHomeCarousel(root, options = {}) {
  if (!root) return () => {};

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const pin = root.querySelector('[data-carousel-pin]');
  const viewport = root.querySelector('[data-carousel-viewport]');
  const track = root.querySelector('[data-carousel-track]');
  const slides = /** @type {HTMLElement[]} */ ([
    ...root.querySelectorAll('[data-carousel-slide]'),
  ]);

  if (!pin || !viewport || !track || slides.length === 0) {
    return () => {};
  }

  const leftLabel = root.querySelector('[data-carousel-left-label]');
  const rightLabel = root.querySelector('[data-carousel-right-label]');
  const indexLabel = root.querySelector('[data-carousel-index]');
  const clientItems = /** @type {HTMLElement[]} */ ([
    ...root.querySelectorAll('[data-carousel-client]'),
  ]);
  const frame = root.querySelector('[data-carousel-frame]');
  if (frame instanceof HTMLElement) {
    frame.style.cssText = '';
  }

  /** @type {import('../data/carousel.js').CarouselSlide[]} */
  const slideData = JSON.parse(root.dataset.slides || '[]');
  const slideCount = slides.length;
  const defaultIndex = Number(root.dataset.defaultSlide ?? 0);
  let activeIndex = defaultIndex;
  /** @type {ScrollTrigger | null} */
  let scrollTrigger = null;
  let isWrapping = false;
  let wrapLock = false;

  const canvas = root.querySelector('[data-curve-canvas]');
  const images = slides
    .map((slide) => slide.querySelector('[data-carousel-image]'))
    .filter((img) => img instanceof HTMLImageElement);

  /** @type {ReturnType<typeof initCurveMedia> | null} */
  let curveMedia = null;

  if (canvas instanceof HTMLCanvasElement && viewport && images.length > 0) {
    try {
      curveMedia = initCurveMedia(viewport, canvas, images);
    } catch (error) {
      console.warn('[home-carousel] Curve media init failed.', error);
    }
  }

  const loadSlideImage = (slideEl) => {
    const img = slideEl.querySelector('[data-carousel-image]');
    if (!(img instanceof HTMLImageElement) || img.dataset.loaded === 'true') return;

    const src = img.dataset.src;
    if (!src) return;

    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
      img.dataset.loaded = 'true';
      return;
    }

    img.addEventListener(
      'load',
      () => {
        img.classList.add('is-loaded');
      },
      { once: true },
    );

    if (!img.getAttribute('src')) {
      img.src = src;
    }

    img.dataset.loaded = 'true';
  };

  const preloadNearbyImages = (index) => {
    [index - 1, index, index + 1].forEach((i) => {
      const wrapped = wrapIndex(i, slideCount);
      if (slides[wrapped]) loadSlideImage(slides[wrapped]);
    });
  };

  const updateSlideFocus = () => {
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;

    slides.forEach((slide) => {
      const rect = slide.getBoundingClientRect();
      if (rect.height < 1) {
        slide.style.setProperty('--slide-focus', '0');
        return;
      }

      const slideCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(slideCenterY - viewportCenterY);
      const range = Math.max(rect.height * 0.85, viewportRect.height * 0.28);
      const focus = focusFromDistance(distance, range);
      slide.style.setProperty('--slide-focus', focus.toFixed(4));
    });
  };

  const setActiveSlide = (index) => {
    const nextIndex = wrapIndex(index, slideCount);
    activeIndex = nextIndex;

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === activeIndex);
    });

    const data = slideData[activeIndex];
    if (data) {
      if (leftLabel) leftLabel.textContent = data.leftLabel;
      if (rightLabel) rightLabel.textContent = data.rightLabel;
      if (indexLabel) indexLabel.textContent = data.number;
    }

    clientItems.forEach((item) => {
      item.classList.toggle(
        'is-active',
        item.dataset.carouselClient === data?.client,
      );
    });

    preloadNearbyImages(activeIndex);
    updateSlideFocus();
  };

  const getOffsets = () => {
    const centerY = viewport.clientHeight / 2;

    return slides.map((slide) => {
      const slideCenter = slide.offsetTop + slide.offsetHeight / 2;
      return centerY - slideCenter;
    });
  };

  const progressForIndex = (index) => {
    if (slideCount <= 1) return 0;
    return wrapIndex(index, slideCount) / (slideCount - 1);
  };

  const scrollToProgress = (progress) => {
    if (!scrollTrigger) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const target =
      scrollTrigger.start +
      (scrollTrigger.end - scrollTrigger.start) * clamped;
    window.scrollTo(0, target);
  };

  const jumpToSlide = (index) => {
    if (!scrollTrigger || slideCount <= 1 || wrapLock) return;

    wrapLock = true;
    isWrapping = true;
    scrollToProgress(progressForIndex(index));
    setActiveSlide(index);
    ScrollTrigger.update();

    requestAnimationFrame(() => {
      isWrapping = false;
      window.setTimeout(() => {
        wrapLock = false;
      }, 320);
    });
  };

  const tryWrapAtEdge = (direction) => {
    if (!scrollTrigger?.isActive || wrapLock || slideCount <= 1) return false;

    const atStart = scrollTrigger.progress <= 0.001;
    const atEnd = scrollTrigger.progress >= 0.999;

    if (atEnd && direction > 0) {
      jumpToSlide(0);
      return true;
    }

    if (atStart && direction < 0) {
      jumpToSlide(slideCount - 1);
      return true;
    }

    return false;
  };

  /** @param {WheelEvent} event */
  const onWheel = (event) => {
    if (!scrollTrigger?.isActive) return;
    if (tryWrapAtEdge(event.deltaY)) {
      event.preventDefault();
    }
  };

  const markReady = () => {
    root.classList.add('is-ready');
  };

  const buildScroll = () => {
    scrollTrigger?.kill();

    const offsets = getOffsets();
    gsap.set(track, { y: offsets[0] ?? 0 });

    const tween = gsap.to(track, {
      y: offsets[offsets.length - 1],
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${window.innerHeight * Math.max(slideCount - 1, 1)}`,
        pin: viewport,
        scrub: 0.45,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: {
          snapTo: 1 / Math.max(slideCount - 1, 1),
          duration: { min: 0.18, max: 0.42 },
          delay: 0.04,
          ease: 'power2.inOut',
        },
        onUpdate(self) {
          if (isWrapping) return;
          const index = Math.round(self.progress * (slideCount - 1));
          setActiveSlide(index);
          updateSlideFocus();
        },
        onLeave(self) {
          if (self.direction === 1 && !wrapLock) {
            jumpToSlide(0);
          }
        },
        onLeaveBack(self) {
          if (self.direction === -1 && !wrapLock) {
            jumpToSlide(slideCount - 1);
          }
        },
      },
    });

    scrollTrigger = tween.scrollTrigger ?? null;
    ScrollTrigger.refresh();
    updateSlideFocus();

    requestAnimationFrame(() => {
      jumpToSlide(defaultIndex);
      updateSlideFocus();
      markReady();
    });
  };

  const onResize = () => {
    buildScroll();
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);

  const onImageClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!target.matches('[data-carousel-image]')) return;
    options.onImageClick?.();
  };

  root.addEventListener('click', onImageClick);

  slides.forEach((slide, index) => {
    if (Math.abs(index - defaultIndex) <= 1) {
      loadSlideImage(slide);
    }
  });

  try {
    buildScroll();
  } catch (error) {
    console.error('[home-carousel] Scroll setup failed.', error);
    markReady();
  }

  return () => {
    root.removeEventListener('click', onImageClick);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    curveMedia?.destroy();
    scrollTrigger?.kill();
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger === pin) trigger.kill();
    });
  };
}
