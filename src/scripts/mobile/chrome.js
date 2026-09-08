/**
 * THE GLOBAL CHROME'S BOOT (mobile rebuild Part 1 D) — the nav's size
 * behaviour and the ground layer, on every page. Each is a mobileMatch
 * block: it exists only below the seam, reverts itself above it and on the
 * page transition, and reboots on astro:after-swap (the site's pattern).
 */
import { initMobileNav } from './nav.js';
import { initMobileGround } from './ground.js';

export function initMobileChrome() {
  const offs = [initMobileNav(), initMobileGround()];
  return () => offs.forEach((off) => off());
}
