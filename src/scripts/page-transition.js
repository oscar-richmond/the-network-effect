/**
 * Cover Page Transition
 *
 * Adapted from the CoverPageTransition library (Codrops / Vitalii Burhonskyi).
 *
 * HOW IT WORKS (full-page navigation, no SPA router required):
 *
 *   EXIT  — On any internal link click:
 *           1. Prevent default navigation.
 *           2. Animate overlay rows scaleY 0 → 1 (covers screen from top + bottom).
 *           3. Once covered, navigate to the href.
 *
 *   ENTER — On the new page load:
 *           1. Check sessionStorage for a pending transition flag.
 *           2. If found, skip the overlay rows to scaleY 1 (already covering).
 *           3. Animate overlay rows scaleY 1 → 0 (reveals the new page).
 *
 * The overlay HTML is rendered once in BaseLayout.astro and persists
 * across navigations (re-queried on each page load).
 */

import gsap from 'gsap';

// ─── Constants ─────────────────────────────────────────────────────────────

const EASE_IN  = 'power3.inOut';
const EASE_OUT = 'power3.inOut';

/** Duration for the cover sweep-in (exit from current page), in seconds. */
const DURATION_IN  = 0.85;

/** Duration for the cover sweep-out (enter into new page), in seconds. */
const DURATION_OUT = 0.85;

/**
 * Delay before the sweep-out starts after the new page loads.
 * A small pause lets the browser paint the new page content underneath.
 */
const ENTER_DELAY = 0.05;

/** SessionStorage key used to signal a pending entrance animation. */
const TRANSITION_KEY = 'ne-page-transition';

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {HTMLElement[]} */
let rows = [];

/** Prevent multiple simultaneous navigations */
let navigating = false;

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Returns true if the link href is an internal page on this site
 * (same origin, not a fragment-only link, not mailto/tel/external).
 *
 * @param {HTMLAnchorElement} anchor
 * @returns {boolean}
 */
function isInternalLink(anchor) {
  // Must be a same-origin link
  if (anchor.origin !== window.location.origin) return false;

  // Ignore hash-only links (fragment navigation on the same page)
  if (anchor.pathname === window.location.pathname && anchor.hash) return false;

  // Ignore links to the exact same page (pathname + search must differ)
  if (
    anchor.pathname === window.location.pathname &&
    anchor.search === window.location.search &&
    !anchor.hash
  ) return false;

  // Ignore if it targets a new tab / window
  if (anchor.target && anchor.target !== '_self') return false;

  // Ignore mailto: tel: etc. (those won't have a matching origin anyway but
  // this guard is a useful explicit safety net)
  if (!anchor.href.startsWith('http')) return false;

  return true;
}

/**
 * Retrieve the two overlay row elements.
 * @returns {HTMLElement[]}
 */
function getRows() {
  return [...document.querySelectorAll('.page-cover__row')];
}

// ─── Core animations ───────────────────────────────────────────────────────

/**
 * Animate the cover in (sweeping over the current page),
 * then navigate to `href`.
 *
 * @param {string} href
 */
function coverAndNavigate(href) {
  if (navigating) return;
  navigating = true;

  const cover = document.querySelector('.page-cover');
  if (cover) cover.classList.add('page-cover--active');

  const currentRows = getRows();

  // Set a flag so the next page knows to reveal itself
  try {
    sessionStorage.setItem(TRANSITION_KEY, '1');
  } catch {
    // Private browsing may block sessionStorage — degrade gracefully
  }

  gsap.fromTo(
    currentRows,
    { scaleY: 0 },
    {
      scaleY: 1,
      duration: DURATION_IN,
      ease: EASE_IN,
      stagger: {
        // Top row and bottom row animate simultaneously — no stagger needed
        amount: 0,
      },
      onComplete: () => {
        window.location.href = href;
      },
    },
  );
}

/**
 * Animate the cover out (revealing the new page from beneath).
 * Called on new-page load when a transition flag is detected, or on the
 * about-page first load to open the loading screen with the same effect.
 *
 * @param {(() => void) | undefined} [onComplete]
 */
function revealPage(onComplete) {
  const cover = document.querySelector('.page-cover');

  // Rows should already be at scaleY 1 (set imperatively below)
  const currentRows = getRows();

  if (!currentRows.length) {
    onComplete?.();
    return;
  }

  // Keep pointer-events blocked during the reveal sweep
  if (cover) cover.classList.add('page-cover--active');

  gsap.to(currentRows, {
    scaleY: 0,
    duration: DURATION_OUT,
    ease: EASE_OUT,
    delay: ENTER_DELAY,
    onComplete: () => {
      if (cover) cover.classList.remove('page-cover--active');
      onComplete?.();
    },
  });
}

/** Signal that the cover reveal is finished (or was skipped). */
function finishCoverReveal() {
  document.documentElement.dataset.coverRevealed = '1';
  document.dispatchEvent(new CustomEvent('page-cover:revealed'));
}

/**
 * Run `callback` once the cover overlay has finished revealing the page.
 * If no reveal is pending, `callback` runs immediately.
 *
 * @param {() => void} callback
 */
export function whenCoverRevealed(callback) {
  if (document.documentElement.dataset.coverRevealed === '1') {
    callback();
    return;
  }

  document.addEventListener('page-cover:revealed', () => callback(), { once: true });
}

// ─── Intercept clicks ──────────────────────────────────────────────────────

/**
 * Attaches a document-level click listener that intercepts internal anchor
 * clicks and runs the exit transition before navigating.
 */
function attachLinkInterceptor() {
  document.addEventListener('click', (event) => {
    // Respect an upstream preventDefault (the platform contract):
    // pages gate placeholder links (e.g. /work tiles for case
    // studies that don't exist yet) by preventing default — the
    // transition must not carry those into 404s. No-op for pages
    // that never prevent internal-link defaults.
    if (event.defaultPrevented) return;
    // Walk up the DOM to find the nearest anchor element
    const anchor = /** @type {Element | null} */ (event.target)?.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isInternalLink(anchor)) return;
    if (navigating) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    coverAndNavigate(anchor.href);
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────

/**
 * Initialise the page transition system.
 *
 * Call once on every page load (from BaseLayout.astro's inline script).
 */
export function initPageTransition() {
  // Reset navigation lock for this page
  navigating = false;

  rows = getRows();

  const isAboutPage =
    document.body.classList.contains('about-page')
    || document.body.classList.contains('about-page-2');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hasPendingTransition = (() => {
    try {
      const val = sessionStorage.getItem(TRANSITION_KEY);
      if (val) {
        sessionStorage.removeItem(TRANSITION_KEY);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  })();

  const shouldReveal =
    hasPendingTransition || (isAboutPage && !prefersReduced);

  if (shouldReveal) {
    // Snap overlay to "covering" state, then animate open (window reveal)
    gsap.set(rows, { scaleY: 1 });
    revealPage(finishCoverReveal);
  } else {
    // First page load — ensure overlay is hidden
    gsap.set(rows, { scaleY: 0 });
    finishCoverReveal();
  }

  // Attach click interceptor (only once — use a flag on the document)
  if (!document.documentElement.dataset.coverTransitionInit) {
    document.documentElement.dataset.coverTransitionInit = '1';
    attachLinkInterceptor();
  }
}
