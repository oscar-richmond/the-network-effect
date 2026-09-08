/**
 * WHO WE ARE below the seam (mobile rebuild Part 2, 2026-09-08; the pin and
 * exit and the entrances, Oscar 2026-09-08).
 *
 * The band pins and exits on the desktop founders mechanic (band.js): the
 * label and the headline take the headline role, the CTAs theirs, the rail
 * the media's — each drifting in, holding, then rising and blurring out at
 * its own pace. The copy arrives on the word-clip rise (reveal.js), the
 * CTAs and the three cards fade-rise a beat behind. The rail's edge
 * gradients (FoundersRailMobile.astro) follow its scroll (rail.js).
 */
import { mobileMatch, tokenPx } from './match.js';
import { bindRailEdges } from './rail.js';
import { bindBand, bandSpecs } from './band.js';
import { bindTextReveal, bindMediaReveal } from './reveal.js';

export function initMobileFounders() {
  return mobileMatch((ctx) => {
    const track = document.querySelector('[data-landing-founders-track]');
    const section = document.querySelector('[data-landing-founders]');
    const rail = document.querySelector('[data-frail]');
    if (!(track instanceof HTMLElement) || !(section instanceof HTMLElement)) return;
    if (rail instanceof HTMLElement) {
      bindRailEdges(ctx, rail, {
        left: document.querySelector('[data-frail-edge="l"]'),
        right: document.querySelector('[data-frail-edge="r"]'),
        endPad: tokenPx('--m-inset'),
      });
    }
    const label = section.querySelector('[data-landing-founders-label]');
    const headline = section.querySelector('[data-landing-founders-headline]');
    const ctas = section.querySelector('[data-landing-founders-ctas]');
    const railWrap = section.querySelector('[data-frail-wrap]');
    /* the entrances */
    bindTextReveal(ctx, label);
    bindTextReveal(ctx, headline);
    if (ctas instanceof HTMLElement) bindMediaReveal(ctx, Array.from(ctas.querySelectorAll('.landing-founders__btn')));
    if (rail instanceof HTMLElement) bindMediaReveal(ctx, Array.from(rail.querySelectorAll('[data-frail-card]')));
    /* the pin and the exit */
    const s = bandSpecs();
    bindBand(ctx, {
      track, section,
      items: [
        { el: label, ...s.headline },
        { el: headline, ...s.headline },
        { el: ctas, ...s.ctas },
        { el: railWrap, ...s.media },
      ],
    });
  });
}
