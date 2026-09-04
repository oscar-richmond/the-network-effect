/**
 * FOOTER FOCUS — A11y batch item 8 (Oscar, 2026-09-04), the NARROW fix.
 *
 * The footer is painted BEHIND the page on every route (the sticky
 * uncover on /landing and the case studies, the fixed reveal layers on
 * /work and /founders): its links are in the tab order, but tabbing to
 * one scrolls nowhere and draws nothing — measured 0–3 changed pixels
 * between focused and unfocused. This does not touch the scroll
 * machinery: when focus enters the footer, the document is scrolled
 * to its end, which is the one position where every route's own
 * reveal has fully uncovered the footer. Through Lenis where it is
 * live (so its virtual position agrees), the window otherwise.
 *
 * Keyboard only by construction — a pointer cannot put focus inside a
 * footer it cannot see.
 */
import { getLenisInstance } from './site-scroll.js';

let wired = false;

export function initFooterFocus() {
  if (wired) return;
  wired = true;
  document.addEventListener('focusin', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !t.closest('.landing-footer')) return;
    const end = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (window.scrollY >= end - 1) return;
    const lenis = getLenisInstance();
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(end, { immediate: true, force: true });
    else window.scrollTo(0, end);
  });
}
