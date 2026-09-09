/**
 * CAROUSEL INDICATOR — the shared mobile swipe-progress readout
 * (Figma 402-frame rebuild, 2026-08-13; component styles in
 * mobile.css `.m-carousel-ind`). One instance per native-scroll
 * carousel: a 100px track whose 32px thumb translates with the
 * strip's scroll progress — `--ci-x` is the whole contract, written
 * on the indicator element and consumed by the CSS transform.
 *
 * The strip is a NATIVE overflow-x scroller (momentum, snap and
 * rubber-banding stay the platform's own — the mobile brief's
 * standing rule), so this module only OBSERVES: a passive scroll
 * listener, rAF-throttled, no Lenis, no ScrollTrigger. Geometry is
 * read fresh each frame (scrollWidth − clientWidth), so resize and
 * font reflow need no separate rebuild; progress is clamped for
 * iOS rubber-band overshoot. Zero-overflow strips (a carousel whose
 * columns happen to fit) keep the thumb parked at 0.
 *
 * Used by the services list carousels, the featured-work cards
 * (Part 2, the file's 200px track via `--wide`), and the closing
 * tiles — track/thumb geometry is MEASURED per instance, so any
 * width modifier works without new constants.
 *
 * @param {ParentNode} scope subtree to wire (a section, or document)
 * @returns {() => void} cleanup
 */
export function initCarouselIndicators(scope = document) {
  const cleanups = [];

  scope.querySelectorAll('[data-svc-m-carousel], [data-m-carousel]').forEach((root) => {
    const strip = root.querySelector('[data-carousel-strip]');
    const ind = root.querySelector('[data-carousel-ind]');
    const thumb = root.querySelector('[data-carousel-thumb]');
    if (!(strip instanceof HTMLElement) || !(ind instanceof HTMLElement)) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const max = strip.scrollWidth - strip.clientWidth;
      const p = max > 0 ? Math.min(1, Math.max(0, strip.scrollLeft / max)) : 0;
      const travel = ind.clientWidth - (thumb instanceof HTMLElement ? thumb.offsetWidth : 32);
      ind.style.setProperty('--ci-x', `${(p * Math.max(travel, 0)).toFixed(1)}px`);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    strip.addEventListener('scroll', onScroll, { passive: true });
    update();

    cleanups.push(() => {
      strip.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
