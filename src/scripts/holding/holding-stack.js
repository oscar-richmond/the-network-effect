import { initCurveMedia } from '../curve-media.js';
import {
  createDriftDriver,
  AUTO_DRIFT_PX_PER_SEC,
  MAX_VELOCITY,
} from './holding-shared.js';

/**
 * /holding-2's gallery variant — the services pop-up's STACKED COLUMN
 * (the detail view's right-side image stack) grafted onto the holding
 * pages' shared drift driver, per the approved Phase 1 plan.
 *
 * VISUAL: curve-media.js VERBATIM (the pop-up's THREE.js warp overlay —
 * arc-bend + chromatic aberration, velocity-driven; zero modifications,
 * fed through its existing getScrollPosition option exactly like the
 * pop-up feeds its own virtual scroll). The pop-up's focus veils /
 * snap-to-slide / difference label are deliberately NOT grafted — they
 * are pop-up furniture, and snap conflicts with autonomous drift. With
 * no [data-carousel-slide] ancestors, curve-media's focus uniform
 * defaults to fully opaque.
 *
 * MOTION: the shared single-velocity driver (holding-shared.js) — same
 * drift/wheel/wrap behaviour as /holding's fold gallery. Slides are the
 * SERVER-RENDERED <img> stack (curve-media requires DOM proxies; the
 * static markup doubles as the reduced-motion / no-JS first frame),
 * positioned absolutely per tick with the fold gallery's proven
 * integer-wraps modulo (resize-safe by construction).
 *
 * THE WARP FEED (Oscar's approved spec — supersedes the plan's raw-feed
 * recommendation): "delta-above-drift with the 5% idle floor and the
 * 0-to-1 wheel ramp — calm at rest, alive under the hand, never dead."
 * The warp channel integrates its own virtual travel whose velocity is:
 *   sign(v) * ( WARP_IDLE_FLOOR * full-scale        — the 5% idle floor:
 *                                                     a constant gentle
 *                                                     bend at rest-drift,
 *                                                     never dead
 *             + excess * smoothstep(excess/RAMP) )  — the wheel delta
 *                                                     above drift speed,
 *                                                     eased 0->1 so small
 *                                                     touches ramp in
 * curve-media derives its damped uVelocity from this virtual position —
 * so the module itself stays untouched.
 */

/** The pop-up's compositional density, per Oscar: three slots visible
 * in the region at once. */
const STACK_VISIBLE_SLOTS = 3;
/** The pop-up track's inter-slide gap, verbatim (detail-view.css). */
const STACK_GAP_PX = 28;
/** HP Carousel native aspect — zero crop at the stack's geometry. */
const STACK_ASPECT = 480 / 550;
/** Strip-safety: slides never exceed this fraction of the region width
 * (short wide regions size by height first, per the slot maths). */
const STACK_MAX_WIDTH_FRACTION = 0.8;

/** Warp feed shaping — Oscar's constants (see module header). */
const WARP_FULL_SCALE_PX_S = MAX_VELOCITY;
const WARP_IDLE_FLOOR = 0.05;
const WARP_RAMP_PX_S = 300;

/**
 * @param {HTMLElement} region the gallery region (wheel scope, size
 *   source, canvas host). Must contain the server-rendered
 *   [data-holding-stack-slide] elements.
 * @param {string[]} imageUrls display order (parity check only — the
 *   slides' own <img>s are the texture sources).
 * @returns {{ ready: Promise<unknown>, resize: () => void,
 *   tickOnce: (dtMs?: number) => void, debugState: () => object,
 *   destroy: () => void } | null}
 */
export function createHoldingStack(region, imageUrls) {
  if (!(region instanceof HTMLElement)) return null;
  const slides = Array.from(region.querySelectorAll('[data-holding-stack-slide]')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (slides.length < 2 || imageUrls.length < 2) return null;
  const images = slides
    .map((slide) => slide.querySelector('img'))
    .filter((img) => img instanceof HTMLImageElement);

  const canvas = document.createElement('canvas');
  canvas.className = 'holding-stack__gl';
  canvas.setAttribute('aria-hidden', 'true');
  region.appendChild(canvas);

  let regionSize = { width: 1, height: 1 };
  let slotPx = 1;
  let loopPx = 1;
  let slideH = 1;
  const wraps = slides.map(() => 0);
  const lastYs = slides.map(() => 0);

  const layout = () => {
    const rect = region.getBoundingClientRect();
    regionSize = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    slotPx = regionSize.height / STACK_VISIBLE_SLOTS;
    slideH = Math.max(slotPx - STACK_GAP_PX, 24);
    let slideW = slideH * STACK_ASPECT;
    const maxW = regionSize.width * STACK_MAX_WIDTH_FRACTION;
    if (slideW > maxW) {
      slideW = maxW;
      slideH = slideW / STACK_ASPECT;
    }
    loopPx = slotPx * slides.length;
    slides.forEach((slide) => {
      slide.style.position = 'absolute';
      slide.style.left = '50%';
      slide.style.top = '0';
      slide.style.width = `${slideW}px`;
      slide.style.height = `${slideH}px`;
    });
  };

  /** The fold gallery's wrap maths verbatim, in CSS px: virtual y is
   * region-centre-origin, positive up; wraps are INTEGER loop counts
   * multiplied by the CURRENT loop length (resize-safe). */
  const placeSlides = (travelPx, dirSign) => {
    const half = slideH / 2;
    const band = regionSize.height / 2 + slotPx / 2;
    slides.forEach((slide, i) => {
      let y = -slotPx * i + travelPx + wraps[i] * loopPx;
      if (dirSign > 0 && y - half > band) {
        wraps[i] -= 1;
        y = -slotPx * i + travelPx + wraps[i] * loopPx;
      } else if (dirSign < 0 && y + half < -band) {
        wraps[i] += 1;
        y = -slotPx * i + travelPx + wraps[i] * loopPx;
      }
      lastYs[i] = y;
      const top = regionSize.height / 2 - y - half;
      slide.style.transform = `translate3d(-50%, ${top}px, 0)`;
    });
  };

  // ── The warp feed (see module header). ────────────────────────────────
  let warpTravel = 0;
  let warpVelocity = 0;

  const onFrame = (travelPx, dirSign, dtSec) => {
    placeSlides(travelPx, dirSign);
    const v = driver.state().velocity;
    const sign = v < 0 ? -1 : 1;
    const excess = Math.max(Math.abs(v) - AUTO_DRIFT_PX_PER_SEC, 0);
    const t = Math.min(excess / WARP_RAMP_PX_S, 1);
    const smooth = t * t * (3 - 2 * t);
    warpVelocity = sign * (WARP_IDLE_FLOOR * WARP_FULL_SCALE_PX_S + excess * smooth);
    warpTravel += warpVelocity * dtSec;
  };

  const driver = createDriftDriver(region, { onFrame });

  // curve-media derives its damped uVelocity from this virtual position —
  // the same override the pop-up itself uses for its locked-scroll case.
  let curve = null;
  try {
    curve = initCurveMedia(region, canvas, images, {
      getScrollPosition: () => warpTravel,
    });
  } catch (error) {
    console.warn('[holding-stack] curve-media init failed — DOM slide stack stays.', error);
  }

  const onResize = () => {
    layout();
    placeSlides(driver.state().travelPx, 1);
  };
  window.addEventListener('resize', onResize);

  layout();
  // Position immediately — the occluded-tab environment has no rAF, and
  // the static CSS stack must hand over without a first-frame jump.
  placeSlides(0, 1);

  return {
    ready: curve?.ready ?? Promise.resolve(),
    resize: onResize,
    /** One synchronous integrate+frame — verification hook (harmless in
     * production; curve-media renders on its own internal loop). */
    tickOnce(dtMs = 16.7) {
      driver.tickOnce(dtMs);
    },
    debugState() {
      return {
        ...driver.state(),
        warpVelocity,
        warpTravel,
        regionSize: { ...regionSize },
        slotPx,
        slides: slides.map((_, i) => ({ y: lastYs[i], wraps: wraps[i] })),
      };
    },
    destroy() {
      driver.destroy();
      curve?.destroy();
      window.removeEventListener('resize', onResize);
      canvas.remove();
      slides.forEach((slide) => {
        slide.style.position = '';
        slide.style.left = '';
        slide.style.top = '';
        slide.style.width = '';
        slide.style.height = '';
        slide.style.transform = '';
      });
    },
  };
}
