/**
 * THE LANDING'S MOBILE DRIVERS (mobile rebuild Part 2, 2026-09-08) — one
 * boot for the sections below the seam, each a mobileMatch block that
 * exists only there and reverts on the page transition. Booted from
 * LandingBody.astro beside the desktop drivers (which return early below
 * the seam), so the two sets never overlap.
 */
import { initMobileHero } from './hero.js';
import { initMobileFounders } from './founders.js';
import { initMobileNetwork } from './network.js';
import { initMobileServices } from './services.js';

export function initMobileLanding() {
  const offs = [initMobileHero(), initMobileFounders(), initMobileNetwork(), initMobileServices()];
  return () => { for (const off of offs) off(); };
}
