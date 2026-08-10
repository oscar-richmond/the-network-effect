/**
 * PAGE TRANSITION — the horizontal wipe (Oscar's rebuild, 2026-08-08;
 * replaces the Codrops-derived top+bottom rows system).
 *
 * ARCHITECTURE: the site is MPA — every navigation is a full document
 * load (no Astro ClientRouter; the astro:*-swap listeners around the
 * codebase never fire). The transition is therefore a TWO-DOCUMENT
 * RELAY driven by ONE state machine per document:
 *
 *   doc A: idle → covering → departing        (panel sweeps in from
 *          the LEFT; the sessionStorage flag is written AT COMMIT,
 *          never at click — an uncommitted nav must not strand it)
 *   doc B: hold (pre-paint, set by BaseLayout's inline head script —
 *          the arriving page is covered from its FIRST frame)
 *          → entering (ready-wait) → revealing → idle
 *
 * READY SIGNAL (doc B may not reveal before): DOMContentLoaded (all
 * deferred page-module boots — including the /work and /founders
 * drivers — run before it fires) + document.fonts.ready capped at
 * FONTS_CAP_MS + a double requestAnimationFrame (a composited paint
 * of the new page exists under the cover). The whole wait races
 * FAILSAFE_MS.
 *
 * FAILSAFES (3 independent — the site is UNSTRANDABLE):
 *   1. head script (BaseLayout): vanilla timer → CSS-only reveal even
 *      if this module never executes;
 *   2. entry: the ready-wait is raced against FAILSAFE_MS;
 *   3. depart: a commit watchdog — if location.href never commits
 *      (offline), the panel retreats and the machine resets.
 *
 * RAPID NAV (deterministic): covering/departing/entering → FIRST
 * WINS, later clicks are swallowed; revealing → LATEST WINS — the
 * reveal tween is killed and the panel re-covers from its CURRENT
 * position (single tween ownership at all times).
 *
 * BACK/FORWARD: fresh back/forward loads are detected in the head
 * script via the Navigation Timing type and run the full hold →
 * reveal choreography; bfcache restores are caught by `pageshow
 * persisted` here and force-re-covered → same choreography. Scroll
 * is the site's existing behaviour (scrollRestoration 'auto': fresh
 * nav = top, back/forward = browser-restored) — now under cover.
 *
 * RM: identical states and flag flow with instant cuts (cover paints
 * for one frame, swap, clear) — never a naked unstyled swap.
 *
 * BLEND: the panel is opaque, childless and blend-free at z 10000 —
 * it occludes the difference nav/logo and recomposites them
 * untouched on retreat.
 */

import gsap from 'gsap';

// ─── The transition register ───────────────────────────────────────────────

/** Cover sweep-in (left → right), seconds. */
const COVER_S = 0.6;

/** Reveal sweep-out, seconds. */
const REVEAL_S = 0.65;

/** House ease for both sweeps. */
const EASE = 'power3.inOut';

/**
 * Reveal direction — ONE named switch (Oscar's interpretation note):
 *  'retreat'  — the panel's right edge sweeps right→left, retreating
 *               the way it came; the new page appears from the RIGHT
 *               side, leftward (the specified build).
 *  'continue' — the panel continues left→right and exits stage-right;
 *               the new page appears from the LEFT side, rightward.
 */
const REVEAL_MODE = 'retreat';

/** Hard stall ceiling for every phase — the unstrandable guarantee. */
const FAILSAFE_MS = 2500;

/** Cap on waiting for document.fonts.ready inside the ready signal. */
const FONTS_CAP_MS = 1200;

/** SessionStorage key — written at COMMIT, consumed pre-paint (head). */
const TRANSITION_KEY = 'ne-page-transition';

// ─── State (module scope = one machine per MPA document) ───────────────────

/** @type {'idle'|'covering'|'departing'|'entering'|'revealing'} */
let state = 'idle';

/** @type {gsap.core.Tween | null} The ONE live tween — never two. */
let tween = null;

let departWatchdog = 0;

// ─── Helpers ───────────────────────────────────────────────────────────────

const panel = () => document.querySelector('.page-cover');

const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const block = (on) =>
  panel()?.classList.toggle('page-cover--blocking', on);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Snap the panel to an xPercent (inline transform takes authority). */
const snapX = (xp) => {
  const p = panel();
  if (p) gsap.set(p, { xPercent: xp, x: 0, y: 0 });
};

/**
 * Same-origin, same-tab page link — the transition's business.
 * Modified clicks / downloads stay native (new-tab intent respected).
 * @param {HTMLAnchorElement} a
 */
function isInternalLink(a) {
  if (a.origin !== window.location.origin) return false;
  if (a.pathname === window.location.pathname && a.hash) return false;
  if (
    a.pathname === window.location.pathname &&
    a.search === window.location.search &&
    !a.hash
  ) return false;
  if (a.target && a.target !== '_self') return false;
  if (!a.href.startsWith('http')) return false;
  return true;
}

// ─── The ready signal (doc B) ──────────────────────────────────────────────

const domReady = () =>
  document.readyState === 'loading'
    ? new Promise((r) =>
        document.addEventListener('DOMContentLoaded', r, { once: true })
      )
    : Promise.resolve();

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), delay(FONTS_CAP_MS)]);

const paintedTwice = () =>
  new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );

/**
 * Resolves when the new page is safe to reveal — or at FAILSAFE_MS,
 * whichever comes first. `window.__neCoverTestHold` is a TEST-ONLY
 * seam: verification stalls readiness through it to prove failsafe 2.
 */
const readyToReveal = () =>
  Promise.race([
    domReady()
      .then(() =>
        Promise.all([fontsReady(), window.__neCoverTestHold ?? null])
      )
      .then(paintedTwice),
    delay(FAILSAFE_MS),
  ]);

// ─── The machine ───────────────────────────────────────────────────────────

function finishReveal() {
  tween = null;
  block(false);
  state = 'idle';
  document.documentElement.dataset.coverRevealed = '1';
  document.dispatchEvent(new CustomEvent('page-cover:revealed'));
}

function reveal() {
  tween?.kill();
  state = 'revealing';
  block(true);
  const toX = REVEAL_MODE === 'continue' ? 100 : -100;
  if (reduced()) {
    snapX(toX);
    finishReveal();
    return;
  }
  tween = gsap.to(panel(), {
    xPercent: toX,
    duration: REVEAL_S,
    ease: EASE,
    overwrite: 'auto',
    onComplete: finishReveal,
  });
}

function commit(href) {
  state = 'departing';
  /* THE INTER-DOCUMENT GAP (Oscar's report: a white flash during the
     page change). Once location.href commits, the browser tears the
     old document down and paints the ROOT ELEMENT'S background until
     the next document's first paint — white by default, which read
     as a flash through the black cover. Painting the root black for
     the handover makes that gap invisible; the arriving document's
     head CSS holds it black while its own cover is up. */
  document.documentElement.style.background = '#161616';
  try {
    sessionStorage.setItem(TRANSITION_KEY, '1');
  } catch {
    /* private browsing — arrival degrades to the failsafe-free
       uncovered load; navigation itself must still happen */
  }
  window.location.href = href;
  /* FAILSAFE 3: navigation never committed (offline / blocked).
     The flag is left in place deliberately: if the nav lands late
     it still choreographs; if it never lands, the next manual load
     starts covered and reveals gracefully — never a strand. */
  departWatchdog = window.setTimeout(reveal, FAILSAFE_MS);
}

/**
 * Navigate with the wipe. Policy: covering/departing/entering =
 * first wins (calls ignored); revealing = latest wins (the panel
 * re-covers from its current position).
 * @param {string} href
 */
function depart(href) {
  if (state === 'covering' || state === 'departing' || state === 'entering')
    return;
  tween?.kill();
  state = 'covering';
  block(true);
  if (reduced()) {
    snapX(0);
    /* Two rAFs guarantee one painted covered frame before departure
       (the "instant opaque cut", never an unpainted flash). In a
       hidden tab rAF may stall — the timeout cap keeps RM committed. */
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      commit(href);
    };
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 300);
    return;
  }
  tween = gsap.to(panel(), {
    xPercent: 0,
    duration: COVER_S,
    ease: EASE,
    overwrite: 'auto',
    onComplete: () => commit(href),
  });
}

/** Doc-B entrance: held covered pre-paint → ready-wait → reveal. */
function enterHeld() {
  window.__neCoverBoot?.cancel(); // failsafe 1 stands down — the machine owns now
  snapX(0); // inline authority BEFORE the attribute drops — no gap
  document.documentElement.removeAttribute('data-ne-cover');
  block(true);
  state = 'entering';
  readyToReveal().then(reveal);
}

// ─── Bindings (module scope: once per document, never accumulated) ─────────

document.addEventListener('click', (event) => {
  /* Upstream preventDefault is the platform contract — pages gate
     placeholder links (e.g. /work tiles without case studies) in the
     CAPTURE phase; this bubble-phase listener must respect it. */
  if (event.defaultPrevented) return;
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;
  const a = /** @type {Element | null} */ (event.target)?.closest?.('a');
  if (!(a instanceof HTMLAnchorElement)) return;
  if (a.hasAttribute('download')) return;
  if (!isInternalLink(a)) return;
  event.preventDefault();
  depart(a.href);
});

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  /* bfcache resurrection: the document froze mid-machine (covered,
     departing, whatever) — re-enter through the SAME choreography:
     snap covered, ready-wait, reveal. Closes the stranded-black
     back-nav class of bug. */
  window.clearTimeout(departWatchdog);
  tween?.kill();
  tween = null;
  snapX(0);
  block(true);
  state = 'entering';
  readyToReveal().then(reveal);
});

window.addEventListener('pagehide', () => {
  window.clearTimeout(departWatchdog);
  tween?.kill();
  tween = null;
});

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Run `callback` once the cover has finished revealing this page (or
 * immediately if no reveal is pending). Consumed by /old's hero.
 * @param {() => void} callback
 */
export function whenCoverRevealed(callback) {
  if (document.documentElement.dataset.coverRevealed === '1') {
    callback();
    return;
  }
  document.addEventListener('page-cover:revealed', () => callback(), {
    once: true,
  });
}

/**
 * Boot — called once per document from BaseLayout's module script.
 * The head script has already decided held/idle before first paint.
 */
export function initPageTransition() {
  if (document.documentElement.getAttribute('data-ne-cover') === 'hold') {
    enterHeld();
  } else {
    /* Idle load (direct entry / reload) — or a very late boot that
       raced failsafe 1: normalise to the parked end state. */
    window.__neCoverBoot?.cancel();
    snapX(-100);
    document.documentElement.removeAttribute('data-ne-cover');
    finishReveal();
  }

  /* Dev/verification handle (the __founders precedent). `enter`
     re-runs the held entrance — verification uses it with
     __neCoverTestHold to prove the entry failsafe. */
  window.__neCover = {
    gsap,
    get state() {
      return state;
    },
    depart,
    reveal,
    enter: enterHeld,
    panel,
  };
}
