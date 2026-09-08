/**
 * WHO WE ARE — THE FOUNDERS RAIL (mobile rebuild Part 2, 2026-09-08): the
 * edge gradients of the rail (FoundersRailMobile.astro) follow its scroll;
 * everything else in the band is static layout (founders.css).
 */
import { mobileMatch, tokenPx } from './match.js';
import { bindRailEdges } from './rail.js';

export function initMobileFounders() {
  return mobileMatch((ctx) => {
    const rail = document.querySelector('[data-frail]');
    if (!(rail instanceof HTMLElement)) return;
    bindRailEdges(ctx, rail, {
      left: document.querySelector('[data-frail-edge="l"]'),
      right: document.querySelector('[data-frail-edge="r"]'),
      endPad: tokenPx('--m-inset'),
    });
  });
}
