/**
 * PILLAR ANCHOR — R81 (Oscar, 2026-09-05).
 *
 * Landing on /services#immerse (or #connect / #amplify) puts the TOP OF
 * THAT PILLAR'S IMAGE exactly on the top of the viewport — Oscar's
 * spec: "on Immerse it will be the woman orange image, so the very top
 * of that image is exactly in line with the top of the viewport".
 *
 * WHY THIS EXISTS AT ALL. The native anchor jump does nothing here.
 * Measured on the built page at 1728 and inside the 1512 shell, every
 * one of the three hashes left `scrollY` at 0 with the section sitting
 * 687 / 5625 / 10455px down the document. Lenis owns the scroll
 * position and the page's own boot resets it, so the browser's one
 * attempt — made before any of that runs — is overwritten. The reel's
 * MORE INFO buttons therefore all arrived at the top of /services
 * regardless of which pillar you pressed.
 *
 * WHAT IT TARGETS. The pillar section's full-bleed header image, not
 * the section box. They currently share a top edge to the pixel, so
 * this is the same landing either way today — but the image is what
 * Oscar specified, and if the section ever gains padding the image is
 * still the thing that must meet the viewport edge.
 *
 * BOTH BUILDS. `#immerse` and `#m-immerse` both resolve to whichever
 * of the two pillar markups is actually rendered at this width, so the
 * desktop reel's links and the mobile stack's links can point wherever
 * they like and still land correctly. Mobile's native jump already
 * worked; this simply does not break it.
 *
 * WHEN IT RUNS. After fonts and after ScrollTrigger has refreshed —
 * the positions above are only final once the pinned sections have
 * measured. It lands once, then re-lands on the next refresh in case a
 * late measurement moved the target, and stops for good the moment the
 * visitor touches the scroll themselves: an anchor that keeps yanking
 * the page back is worse than one that misses.
 */

import { getLenisInstance } from './site-scroll.js';

const KEYS = ['immerse', 'connect', 'amplify'];

/** The pillar id in the URL, with or without the mobile `m-` prefix. */
function hashKey() {
  let raw = '';
  try {
    raw = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
  } catch (e) {
    raw = (window.location.hash || '').replace(/^#/, '');
  }
  const key = raw.replace(/^m-/, '');
  return KEYS.includes(key) ? key : null;
}

/** Whichever of the two pillar markups is actually rendered here. */
function pillarSection(key) {
  const shown = (el) => el instanceof HTMLElement
    && el.getBoundingClientRect().height > 0
    && getComputedStyle(el).display !== 'none';
  const desktop = document.getElementById(key);
  if (shown(desktop)) return desktop;
  const mobile = document.getElementById(`m-${key}`);
  return shown(mobile) ? mobile : null;
}

export function initPillarAnchor() {
  const key = hashKey();
  if (!key) return () => {};

  let done = false;
  let aborted = false;
  const timers = [];

  /* The visitor's own scroll always wins from here on. Registered
     before the first landing so a fast scroller is never fought. */
  const abort = () => { aborted = true; };
  const ABORT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  ABORT_EVENTS.forEach((t) => window.addEventListener(t, abort, { passive: true, once: true }));

  const land = () => {
    if (aborted) return;
    const section = pillarSection(key);
    if (!section) return;
    /* The header image is the thing that must meet the viewport edge. */
    const target = section.querySelector('img') ?? section;
    const y = Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY));
    const lenis = getLenisInstance();
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    done = true;
  };

  /* Fonts first — the pillars sit below text whose height depends on
     them — then two frames so ScrollTrigger's own refresh has run. */
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (aborted) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      land();
      /* One correction pass: a late pin measurement can move the
         target after the first landing. Cheap, bounded, and skipped
         entirely once the visitor has scrolled. */
      timers.push(window.setTimeout(() => { if (!aborted) land(); }, 260));
      timers.push(window.setTimeout(() => { if (!aborted && done) land(); }, 700));
    }));
  });

  return () => {
    aborted = true;
    timers.forEach(clearTimeout);
    ABORT_EVENTS.forEach((t) => window.removeEventListener(t, abort));
  };
}
