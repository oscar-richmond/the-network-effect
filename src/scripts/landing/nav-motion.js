/**
 * NAV MOTION — shared machinery for the top navigation's char-sweep
 * transitions (the menu hover's blur vocabulary):
 *
 * - initNavEntrance(): MENU / the logo / LET'S CHAT ripple IN
 *   (left-to-right, blur-in) on initial load, after fonts — the
 *   entrance for every page of the new site that carries this nav.
 * - applyNavSweep(hidden): the shared show/hide applier used by the
 *   bottom-of-page exit (landing-closing.js) — exit sweeps
 *   right-to-left (the hover reversed), entry left-to-right.
 * - ensureLogoChars(): the logo's one-time ripple char wrap
 *   (sr-only text preserved; MENU and LET'S CHAT get theirs from
 *   initCharRipple). Idempotent.
 *
 * Filters ride the char spans — descendants of the difference
 * elements, the safe blend shape. Reduced motion: instant states.
 * Keyframes/classes (cr-nav-in / cr-nav-out) live in landing.css.
 */
import { isMobileViewport } from './viewport.js';
import { ensureStyles as ensureCharRippleStyles } from '../char-ripple.js';

export const NAV_CHAR_STAGGER_S = 0.03;
const ENTRANCE_AT_MS = 300;

export function getNavParts() {
  return [
    document.querySelector('[data-menu-label-menu]'),
    document.querySelector('.home__logo'),
    /* The four direct links (nav respec 2026-08-24) ride every
       sweep — entrance, closing exit — as their own parts. On
       mobile they are display:none and the sweeps are no-ops. */
    ...document.querySelectorAll('.home__nav-link'),
    document.querySelector('.home__topbar-email'),
    /* R58 (/contact): a page-owned LET'S CHAT twin — the bar's own is
       hidden there and this fixed, blend-carrying sibling stands in
       (contact.astro). Null on every other page. */
    document.querySelector('[data-nav-twin]'),
  ].filter((el) => el instanceof HTMLElement);
}

/** The parts the PAGE-BOTTOM exit sweeps (Oscar's partial-sweep
 *  ruling, 2026-08-27): the centred nav items ONLY — WORK, SERVICES
 *  and (R29, 2026-09-03) FOUNDERS, whatever the bar carries. The
 *  wordmark and LET'S CHAT remain present at all times; the full
 *  list above still serves the load entrance. */
export function getSweptNavParts() {
  return Array.from(document.querySelectorAll('.home__nav-link')).filter(
    (el) => el instanceof HTMLElement,
  );
}

/** Char-wraps the centred nav links' labels when char-ripple hasn't
 *  (its wiring is hover-gated — `hover: hover` machines only — so on
 *  hover-less machines the labels reached the sweep unwrapped and
 *  fell to sweepUnits' whole-element fallback: a single-block fade,
 *  no ripple. THE "WORK doesn't sweep" CAUSE). Same DOM shape as
 *  char-ripple's wrap (cr-sr + cr-chars/cr-char); the wired flag is
 *  respected both ways, and char-ripple boots before the page
 *  scripts, so a hover machine's wrap is never doubled. */
export function ensureNavLinkChars() {
  /* the desktop bar only — the mobile layer has its own nav (Part 1 D) */
  if (isMobileViewport()) return;
  getSweptNavParts().forEach((link) => ensureRippleChars(link.querySelector('[data-char-ripple]')));
}

/** The char wrap for ONE label (R37: shared with the case-study
 *  floating CTA — any element that must sweep on a hover-less machine
 *  needs its chars whether or not char-ripple wired it). Idempotent:
 *  the wired flag is respected both ways. */
export function ensureRippleChars(label) {
  if (!(label instanceof HTMLElement)) return;
  if (label.dataset.charRippleWired || label.querySelector('.cr-char')) return;
  /* The .cr-sr/.cr-char styles normally arrive with char-ripple's
     wiring — hover-gated, so inject here too (one flag, no-op when
     char-ripple already has). */
  ensureCharRippleStyles();
  label.dataset.charRippleWired = '1';
  const text = label.textContent ?? '';
  const sr = document.createElement('span');
  sr.className = 'cr-sr';
  sr.textContent = text;
  const box = document.createElement('span');
  box.className = 'cr-chars';
  box.setAttribute('aria-hidden', 'true');
  for (const ch of text) {
    const s = document.createElement('span');
    s.className = 'cr-char';
    /* A bare space is collapsible inside its inline-block (width 0 —
       "STARTAPROJECT" on every hover-less machine, the phone always);
       char-ripple's wrap uses the non-breaking space, so does this. */
    s.textContent = ch === ' ' ? '\u00a0' : ch;
    box.appendChild(s);
  }
  label.textContent = '';
  label.append(sr, box);
}

export function ensureLogoChars() {
  /* the desktop bar only — the mobile wordmark is the served text, sized by the mobile layer (nav.js) */
  if (isMobileViewport()) return;
  const logo = document.querySelector('.home__logo');
  if (!(logo instanceof HTMLElement) || logo.querySelector('.cr-char')) return;
  /* The logo text lives inside its home link when present (the
     clickable-logo rev) — build the chars THERE so the anchor
     survives; the sweep still finds .cr-char under .home__logo. */
  const host = logo.querySelector('.home__logo-link') ?? logo;
  /* NAV RESPEC (frame 17:1637): the wordmark is "TheNetworkEffect" —
     swapped here, before the wrap and before any reveal, on EVERY width
     since the rebuild (2026-09-07; the SSR text stays the spaced form
     for a no-JS render). */
  host.textContent = 'TheNetworkEffect';
  const text = host.textContent;
  host.textContent = '';
  const sr = document.createElement('span');
  sr.textContent = text;
  sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
  const box = document.createElement('span');
  box.setAttribute('aria-hidden', 'true');
  for (const ch of text) {
    const s = document.createElement('span');
    s.className = 'cr-char';
    s.textContent = ch === ' ' ? ' ' : ch;
    box.appendChild(s);
  }
  host.append(sr, box);
}

/** A part's sweep units: its chars (plus a trailing arrow where
 *  present), else the element itself (the no-chars fallback). */
export function sweepUnits(part) {
  const chars = Array.from(part.querySelectorAll('.cr-char'));
  const arrow = part.querySelector('[data-char-ripple-arrow]');
  const units = chars.length ? chars : [part];
  if (arrow) units.push(arrow);
  return units;
}

/** Show/hide nav parts with the char sweep. `hidden: true` = exit
 *  (right-to-left), false = entry (left-to-right). `parts` scopes
 *  the sweep (Oscar's partial-sweep ruling, 2026-08-27): the load
 *  entrance keeps the full default; the page-bottom exit passes
 *  getSweptNavParts() so only WORK and SERVICES ever leave — the
 *  wordmark and LET'S CHAT are simply not in its list. Each part
 *  animates its OWN chars (descendants of the difference-blended
 *  element — the safe blend shape; never an ancestor). */
export function applyNavSweep(hidden, { reduced = false, parts = getNavParts() } = {}) {
  /* While the MENU OVERLAY is open, the toggle label, the logo AND
     LET'S CHAT belong to the menu's own swap/sweep (menu.js): a SHOW
     sweep landing late — the fonts-gated entrance timer racing a
     fast first click — must not resurrect MENU under CLOSE, or the
     logo/LET'S CHAT over the open panel (Oscar's overlaid-labels
     report; LET'S CHAT joined the menu's sweep 2026-08-10). */
  const menuOverlayOpen = document.querySelector('[data-menu]')?.classList.contains('is-open') ?? false;
  parts.forEach((part) => {
    if (!hidden && menuOverlayOpen
      && (part.matches('[data-menu-label-menu]')
        || part.matches('.home__logo')
        || part.matches('.home__topbar-email'))) return;
    part.style.pointerEvents = hidden ? 'none' : '';
    part.style.opacity = ''; /* any boot-hide handled by the classes now */
    /* A2c (2026-08-27): a swept-out part is invisible — it must also
       leave the tab order, or keyboard focus lands on nothing (the
       page-bottom nav exit made the topbar email an invisible stop).
       Links/buttons only; restore by removing the override. */
    if (part.matches('a, button')) {
      if (hidden) part.setAttribute('tabindex', '-1');
      else part.removeAttribute('tabindex');
    }
    part.querySelectorAll('a, button').forEach((el) => {
      if (hidden) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
    const units = sweepUnits(part);
    const n = units.length;
    units.forEach((u, i) => {
      if (reduced) {
        u.style.opacity = hidden ? '0' : '';
        return;
      }
      /* R36: a char-ripple pulse still on the unit would outrank this
         sweep's animation (same specificity, later cascade) — strip it
         here as well as on its own animationend (char-ripple.js). */
      u.classList.remove('nav-char-out', 'nav-char-in', 'is-rippling', 'is-rippling-in');
      void u.offsetWidth;
      u.style.animationDelay = `${((hidden ? n - 1 - i : i) * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
      u.classList.add(hidden ? 'nav-char-out' : 'nav-char-in');
    });
  });
  /* The toggle's hit-area rides its label's visibility — only when
     the MENU part is actually in this sweep's scope (the entrance);
     the partial bottom exit never touches it. */
  if (parts.some((p) => p.matches('[data-menu-label-menu]'))) {
    const menuToggle = document.querySelector('[data-menu-toggle]');
    if (menuToggle instanceof HTMLElement) menuToggle.style.pointerEvents = hidden ? 'none' : '';
  }
}

/* R36: the entrance class leaves with its animation too — its `both`
   fill equals the resting state, and a lingering nav-char-in would
   replay (blur-in flash) the moment a hover pulse's class was removed
   over it. The out class keeps `forwards` and stays while hidden. One
   document-level listener, installed once. */
let sweepHygieneInstalled = false;
function ensureSweepHygiene() {
  if (sweepHygieneInstalled) return;
  sweepHygieneInstalled = true;
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'cr-nav-in' && e.target instanceof Element) e.target.classList.remove('nav-char-in');
  });
}

/* ══ R36 (Oscar, 2026-09-04) — THE BOTTOM-OF-PAGE BEHAVIOUR, SHARED.
   Six pages carried six copies of the same three things (the guarded
   sweep applier, the near-bottom idle snap, the direction/hysteresis
   scroll logic) and the grid view carried none; the copies had drifted
   (a Lenis handle read through different modules, a snap zone gated
   differently). ONE binder for every document-scroll page and ONE
   applier factory for the two virtual-scroll drivers, so the sweep,
   the snap and the tab-order handling are identical everywhere. */
export const BOTTOM_SNAP_IDLE_MS = 2000;
export const BOTTOM_EPSILON_PX = 2;
export const NAV_SHOW_HYSTERESIS_PX = 64;
export const FOOTER_H_PX = 830; /* frame 13:381 */

/** The guarded sweep applier: all three centred items out at the bottom
 *  (wordmark + LET'S CHAT persist), never while the menu overlay is
 *  open; tab order follows visibility (applyNavSweep). */
export function createNavSweep({ reduced = false } = {}) {
  ensureLogoChars();
  ensureNavLinkChars();
  ensureSweepHygiene();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced, parts: getSweptNavParts() });
  };
  return { setNav, isHidden: () => navHidden };
}

/** The document-scroll pages' bottom behaviour: the sweep at the very
 *  bottom (back below the 64px hysteresis), and the 2s-idle snap to the
 *  bottom when the last movement was downward and `inSnapZone()` holds
 *  (default: within the footer's height). `scrollTo(y)` is the page's
 *  glide — Lenis where it runs, native smooth otherwise. */
export function bindBottomNavSweep({ reduced = false, inSnapZone = null, scrollTo = null, getLenis = null } = {}) {
  /* the desktop bar only — the mobile layer has its own nav (Part 1 D) */
  if (isMobileViewport()) return () => {};
  const { setNav } = createNavSweep({ reduced });
  const maxScroll = () => (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  const zone = inSnapZone ?? (() => maxScroll() - (window.scrollY || 0) < FOOTER_H_PX - BOTTOM_EPSILON_PX);
  const glide = scrollTo ?? ((y) => {
    const lenis = getLenis ? getLenis() : null;
    if (lenis) lenis.scrollTo(y, { duration: 1.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  });
  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown || !zone()) return;
    const y = window.scrollY || 0;
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) return;
    glide(maxScroll());
  };
  const onScroll = () => {
    const y = window.scrollY || 0;
    if (y !== lastScrollY) { lastDirDown = y > lastScrollY; lastScrollY = y; }
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) setNav(true);
    else if (y < maxScroll() - NAV_SHOW_HYSTERESIS_PX) setNav(false);
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnapToBottom, BOTTOM_SNAP_IDLE_MS);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.clearTimeout(snapTimer);
    setNav(false);
  };
}

/** The load entrance: parts hidden immediately (no flash), then the
 *  left-to-right ripple-in after fonts settle. */
export function initNavEntrance() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ensureLogoChars();
  const parts = getNavParts();
  if (!parts.length) return () => {};

  if (reduced) return () => {};

  parts.forEach((part) => { part.style.opacity = '0'; });

  const timeouts = [];
  let disposed = false;
  /* RE-ANCHORED (Oscar's splash sequence): when the splash owns the
     load it drives the nav's arrival itself — the logo lands via the
     handoff cross-resolve, MENU and LET'S CHAT ripple in after it.
     The parts stay hidden above; this entrance must NOT also fire or
     both would play. Every other load keeps the original timing. */
  if (document.documentElement.getAttribute('data-ne-splash') === 'on') {
    return () => { disposed = true; timeouts.forEach(clearTimeout); };
  }
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    timeouts.push(setTimeout(() => {
      applyNavSweep(false);
    }, ENTRANCE_AT_MS));
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    parts.forEach((part) => { part.style.opacity = ''; });
  };
}
