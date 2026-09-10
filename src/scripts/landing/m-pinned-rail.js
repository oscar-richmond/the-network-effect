/**
 * THE PHONE'S PINNED RAIL — FEATURED WORK's mechanic, ONE definition
 * (extracted verbatim from landing-featured.js, 2026-09-10, for the
 * /services phone galleries — Oscar's rule: the galleries behave exactly
 * as Featured Work does on the phone; reuse, don't rewrite. Featured's
 * driver now calls this and is proven unchanged.)
 *
 * TWO STEPS, in the host's order:
 *
 *  mountPinnedRail(section, stage, { pinClass })
 *    wraps the STAGE in a full-height pin wrapper (the wrapper pins at
 *    the viewport's top; the stage rides its bottom — the host's CSS
 *    draws the wrapper `height: var(--m-svh-px)` from a tunable bottom
 *    inset, so the pinned layout follows the SMALL viewport and never
 *    jumps when the browser's bottom bar collapses), flags the section
 *    `is-pinned-phone`, and starts the visual-viewport tracker
 *    (m-viewport.js — the section's --m-vv-dy glide). Returns the wrapper
 *    and an unmount. The host measures/arranges AFTER this (order and
 *    arrival are keyed on the pinned class) and BEFORE the drive.
 *
 *  drivePinnedRail({ section, strip, items, pin, travelProp })
 *    the travel = the last visible item's right edge + the strip's left
 *    inset − the viewport width (so the rail ENDS with the last item's
 *    right edge one inset from the viewport's right edge), published on
 *    the section as travelProp (the host's CSS reads it for the wrapper's
 *    height, so the pin's hold IS the travel); one scrubbed tween of the
 *    strip's x from 0 to −travel over a scroll of exactly travel (1:1),
 *    triggered by the pin wrapper's top reaching the viewport's top;
 *    the standard rail veils written from the scrub's progress (right
 *    veil at the start, left appearing once travelled — rail-veils.js);
 *    a refreshInit re-measure so a viewport change re-derives the travel
 *    before ScrollTrigger re-measures the pin. Host hooks: onProgress
 *    (indicator etc.), onRefreshInit, onRefresh.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { trackVisibleBottom } from './m-viewport.js';
import { veilState, writeVeilState, clearVeilState } from './rail-veils.js';

gsap.registerPlugin(ScrollTrigger);

export const PINNED_PHONE_CLASS = 'is-pinned-phone';

/**
 * @param {HTMLElement} section
 * @param {HTMLElement} stage
 * @param {{ pinClass: string, pinnedClass?: string }} opts
 * @returns {{ pin: HTMLDivElement, unmount: () => void }}
 */
export function mountPinnedRail(section, stage, { pinClass, pinnedClass = PINNED_PHONE_CLASS }) {
  const pin = document.createElement('div');
  pin.className = pinClass;
  stage.parentElement?.insertBefore(pin, stage);
  pin.appendChild(stage);
  section.classList.add(pinnedClass);
  const cleanupVv = trackVisibleBottom(section);
  return {
    pin,
    unmount() {
      pin.parentElement?.insertBefore(stage, pin);
      pin.remove();
      section.classList.remove(pinnedClass);
      cleanupVv();
    },
  };
}

/**
 * @param {{ section: HTMLElement, strip: HTMLElement, items: HTMLElement[],
 *   pin: HTMLElement, travelProp?: string,
 *   onProgress?: (p: number, travel: number) => void,
 *   onRefreshInit?: () => void, onRefresh?: () => void }} opts
 * @returns {{ travel: () => number, applyTravel: () => void,
 *   applyProgress: (p: number) => void, trigger: () => ScrollTrigger | undefined,
 *   cleanup: () => void }}
 */
/**
 * THE TRAVEL: the last item's right edge (in the strip's own box —
 * offsetLeft + width, transform-free) plus the end inset — the strip's
 * own lead margin, so the rail ends as it begins — minus the viewport:
 * at the end the last item rests exactly that inset from the right
 * edge, at every width.
 * @param {HTMLElement} strip
 * @param {HTMLElement[]} items
 */
export function railTravel(strip, items) {
  const last = items
    .filter((c) => c instanceof HTMLElement && getComputedStyle(c).display !== 'none')
    .reduce((best, c) => (!best || c.offsetLeft > best.offsetLeft ? c : best), null);
  if (!(last instanceof HTMLElement)) return 0;
  const inset = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
  return Math.max(last.offsetLeft + last.offsetWidth + inset - (window.innerWidth || 0), 0);
}

export function drivePinnedRail({ section, strip, items, pin, travelProp = '--fw-travel', onProgress, onRefreshInit, onRefresh }) {
  const travel = () => railTravel(strip, items);
  const applyTravel = () => section.style.setProperty(travelProp, `${Math.round(travel())}px`);
  const applyProgress = (p) => {
    const t = travel();
    writeVeilState(section, veilState(p * t, t));
    onProgress?.(p, t);
  };
  applyTravel();
  applyProgress(0);
  const tween = gsap.fromTo(
    strip,
    { x: 0 },
    {
      x: () => -travel(),
      ease: 'none',
      immediateRender: true,
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${Math.round(travel())}`,
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: (st) => { onRefresh?.(); applyProgress(st.progress); },
        onUpdate: (st) => applyProgress(st.progress),
      },
    },
  );
  const onInit = () => { applyTravel(); onRefreshInit?.(); };
  ScrollTrigger.addEventListener('refreshInit', onInit);
  return {
    travel,
    applyTravel,
    applyProgress,
    trigger: () => tween.scrollTrigger,
    cleanup() {
      ScrollTrigger.removeEventListener('refreshInit', onInit);
      tween.scrollTrigger?.kill();
      tween.kill();
      section.style.removeProperty(travelProp);
      clearVeilState(section);
      gsap.set(strip, { clearProps: 'transform' });
    },
  };
}
