/**
 * THE LANDING'S MOBILE DRIVERS (mobile rebuild Part 2, 2026-09-08) — one
 * boot for the sections below the seam, each a mobileMatch block that
 * exists only there and reverts on the page transition. Booted from
 * LandingBody.astro beside the desktop drivers (which return early below
 * the seam), so the two sets never overlap. The footer's statement joins
 * the entrance grammar here (the landing has no footer-motion of its own;
 * the other pages' footer-motion wraps it above and below the seam).
 */
import { mobileMatch } from './match.js';
import { bindTextReveal } from './reveal.js';
import { initMobileHero } from './hero.js';
import { initMobileFounders } from './founders.js';
import { initMobileNetwork } from './network.js';
import { initMobileServices } from './services.js';
import { initMobileFeatured } from './featured.js';
import { initMobileAccess } from './access.js';
import { initMobileClosing } from './closing.js';

const initMobileFooterReveal = () => mobileMatch((ctx) => {
  const st = document.querySelector('.landing-footer__dstatement');
  if (st instanceof HTMLElement && !st.querySelector('.lr-clip')) bindTextReveal(ctx, st);
});

export function initMobileLanding() {
  const offs = [initMobileHero(), initMobileFounders(), initMobileNetwork(), initMobileServices(), initMobileFeatured(), initMobileAccess(), initMobileClosing(), initMobileFooterReveal()];
  return () => { for (const off of offs) off(); };
}
