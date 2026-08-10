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
export const NAV_CHAR_STAGGER_S = 0.03;
const ENTRANCE_AT_MS = 300;

export function getNavParts() {
  return [
    document.querySelector('[data-menu-label-menu]'),
    document.querySelector('.home__logo'),
    document.querySelector('.home__topbar-email'),
  ].filter((el) => el instanceof HTMLElement);
}

export function ensureLogoChars() {
  const logo = document.querySelector('.home__logo');
  if (!(logo instanceof HTMLElement) || logo.querySelector('.cr-char')) return;
  /* The logo text lives inside its home link when present (the
     clickable-logo rev) — build the chars THERE so the anchor
     survives; the sweep still finds .cr-char under .home__logo. */
  const host = logo.querySelector('.home__logo-link') ?? logo;
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

/** Show/hide the nav with the char sweep. `hidden: true` = exit
 *  (right-to-left), false = entry (left-to-right). */
export function applyNavSweep(hidden, { reduced = false } = {}) {
  /* While the MENU OVERLAY is open, the toggle label, the logo AND
     LET'S CHAT belong to the menu's own swap/sweep (menu.js): a SHOW
     sweep landing late — the fonts-gated entrance timer racing a
     fast first click — must not resurrect MENU under CLOSE, or the
     logo/LET'S CHAT over the open panel (Oscar's overlaid-labels
     report; LET'S CHAT joined the menu's sweep 2026-08-10). */
  const menuOverlayOpen = document.querySelector('[data-menu]')?.classList.contains('is-open') ?? false;
  getNavParts().forEach((part) => {
    if (!hidden && menuOverlayOpen
      && (part.matches('[data-menu-label-menu]')
        || part.matches('.home__logo')
        || part.matches('.home__topbar-email'))) return;
    part.style.pointerEvents = hidden ? 'none' : '';
    part.style.opacity = ''; /* any boot-hide handled by the classes now */
    const units = sweepUnits(part);
    const n = units.length;
    units.forEach((u, i) => {
      if (reduced) {
        u.style.opacity = hidden ? '0' : '';
        return;
      }
      u.classList.remove('nav-char-out', 'nav-char-in');
      void u.offsetWidth;
      u.style.animationDelay = `${((hidden ? n - 1 - i : i) * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
      u.classList.add(hidden ? 'nav-char-out' : 'nav-char-in');
    });
  });
  const menuToggle = document.querySelector('[data-menu-toggle]');
  if (menuToggle instanceof HTMLElement) menuToggle.style.pointerEvents = hidden ? 'none' : '';
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
