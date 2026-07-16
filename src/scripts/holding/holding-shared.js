import { initHoldingEntry } from './holding-entry.js';

/**
 * Shared holding-page plumbing for /holding and /holding-2 — the
 * single-velocity drift driver (extracted VERBATIM-semantics from
 * holding-gallery.js so both gallery variants ride the same approved
 * motion: a later driver fix lands here once) and the common page boot.
 */

/** Auto-drift pace, CSS px/sec, upward. ~one card every ~20s at desktop
 * card sizes — the Codrops wheel-coast made permanent. Oscar's first
 * feel-pass tunable. */
export const AUTO_DRIFT_PX_PER_SEC = 24;
/** Velocity impulse per normalized wheel px. */
export const WHEEL_GAIN = 12;
/** Per-frame lerp factor pulling velocity back to the auto-drift home
 * value once input stops — a released fling rejoins the drift in ~1.5s
 * at 60fps. */
export const VELOCITY_RECOVERY = 0.04;
/** Velocity clamp, CSS px/sec, both signs — a violent trackpad fling
 * coasts fast but can never teleport the strip. */
export const MAX_VELOCITY = 3000;
/** Integration step cap — after a hidden-tab stall the first resumed
 * frame advances at most this much, instead of jumping the whole gap. */
export const DT_MAX_MS = 100;

export function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

/**
 * The approved single-velocity driver (see holding-gallery.js's module
 * header for the design rationale): auto-drift is velocity's home value,
 * wheel deltas write impulses into it, every frame it lerps home and
 * travel integrates it — the auto<->wheel handoff is continuous by
 * construction. Wheel capture is scoped to the region element only
 * (passive:false + preventDefault); touch devices never fire it
 * (drift-only, approved). The driver owns its rAF and pauses it on
 * visibilitychange with a fresh timestamp on resume.
 *
 * @param {HTMLElement} region wheel scope + deltaMode-2 unit source
 * @param {{ onFrame: (travelPx: number, dirSign: number, dtSec: number) => void }} opts
 *   onFrame runs once per frame after integration — the gallery variant
 *   updates its visuals (and any secondary integrations) here.
 * @returns {{ tickOnce: (dtMs?: number) => void, state: () => {velocity: number, travelPx: number}, destroy: () => void }}
 */
export function createDriftDriver(region, { onFrame }) {
  let velocity = AUTO_DRIFT_PX_PER_SEC;
  let travelPx = 0;
  let lastTravelPx = 0;

  const integrate = (dtMs) => {
    const dt = Math.min(dtMs, DT_MAX_MS) / 1000;
    velocity = clamp(
      velocity + (AUTO_DRIFT_PX_PER_SEC - velocity) * VELOCITY_RECOVERY,
      -MAX_VELOCITY,
      MAX_VELOCITY,
    );
    travelPx += velocity * dt;
    return dt;
  };

  const step = (dtSec) => {
    const dirSign = Math.sign(travelPx - lastTravelPx) || 1;
    lastTravelPx = travelPx;
    onFrame(travelPx, dirSign, dtSec);
  };

  const onWheel = (event) => {
    event.preventDefault();
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? region.getBoundingClientRect().height : 1;
    velocity = clamp(velocity + event.deltaY * unit * WHEEL_GAIN, -MAX_VELOCITY, MAX_VELOCITY);
  };
  region.addEventListener('wheel', onWheel, { passive: false });

  let rafId = 0;
  let lastTs = 0;
  let disposed = false;
  const tick = (ts) => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    const dtMs = lastTs ? ts - lastTs : 16.7;
    lastTs = ts;
    step(integrate(dtMs));
  };

  const onVisibility = () => {
    cancelAnimationFrame(rafId);
    if (!document.hidden && !disposed) {
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  rafId = requestAnimationFrame(tick);

  return {
    /** One synchronous integrate+frame — the lineage's verification hook
     * (the occluded-tab environment has no rAF; harmless in production). */
    tickOnce(dtMs = 16.7) {
      if (disposed) return;
      step(integrate(dtMs));
    },
    state() {
      return { velocity, travelPx };
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      region.removeEventListener('wheel', onWheel);
    },
  };
}

/**
 * Common page boot for both holding pages: entry choreography, the
 * reduced-motion gate (the gallery module is never constructed under
 * `reduce` — the region's server-rendered children stay as the static
 * first frame), URL parsing from the region's data attribute, dev-only
 * debug handle, and astro:before-swap teardown.
 *
 * @param {{ createGallery: (region: HTMLElement, urls: string[]) => object | null,
 *   devHandle: string }} opts
 */
export function bootHoldingPage({ createGallery, devHandle }) {
  initHoldingEntry();

  const region = document.querySelector('[data-holding-gallery]');
  let gallery = null;
  if (
    region instanceof HTMLElement &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    let urls = [];
    try {
      urls = JSON.parse(region.dataset.galleryImages ?? '[]');
    } catch {
      urls = [];
    }
    gallery = createGallery(region, urls);
    if (gallery && import.meta.env.DEV) {
      // Verification handle for the occluded-tab environment (no rAF) —
      // dev only, stripped from production builds.
      window[devHandle] = gallery;
    }
  }

  document.addEventListener(
    'astro:before-swap',
    () => {
      gallery?.destroy();
      gallery = null;
    },
    { once: true },
  );
}
