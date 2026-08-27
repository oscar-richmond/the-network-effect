/**
 * OUR SERVICES — the ROW-LIST redesign (/landing; Figma
 * NgsyYiyjKRFhtPHyjc0aL4 frame 18:1694, 2026-08-24).
 *
 * The pinned card stack (beats A–D, parked offsets, title morph,
 * snap) is REMOVED WHOLE — the section is normal flow now: header
 * (WHAT WE DO / FROM ACCESS–TO IMPACT / the pillars note), then
 * three pillar row lists. The row hover mechanic is the /services
 * page's own machinery, SHARED via sv-rows.js (accent fill +
 * rolling marquee + cover-swap image glide; rapid-hover latch,
 * tap-to-activate, focus parity, RM = fill only) — one definition,
 * no drift.
 *
 * THE FADE-TO-BLACK lives HERE now (its third home — hero-era →
 * featured → here; moved, never duplicated): the ONE light→dark
 * boundary in the current order is services (light) → featured
 * (#161616), so the section's own ground falls to GROUND_DARK over
 * the final TRANSITION_GROUND_FADE_PX of its scroll, completing
 * exactly as Featured Work's top crosses the viewport bottom — the
 * same contract the fade has always held. Featured then arrives
 * black-over-black. (Featured's −100dvh overlap is retired with it
 * — landing.css.) TRANSITION_DWELL_PX rides with the family as the
 * recorded constant; the frame's own 100px content tail is the
 * dwell here.
 *
 * MOBILE (the viewport.js seam): unchanged — the shipped stacked
 * cards, carousels and entrances, verbatim.
 */
import { isMobileViewport } from './viewport.js';
import { initCarouselIndicators } from './carousel-indicator.js';
import { initMobileEntrance } from './m-entrance.js';

/* ── THE STACK (Oscar's rev, 2026-08-25) — the old card-stack
   grammar on the row lists. Pins: IMMERSE lands 120 from the top
   and fixes with the stage; each later pillar rides up OPAQUE at
   1:1 and fixes a BAND below the one before — 160px keeps topline +
   name + /0N + desc + MORE INFO visible (btn bottom 102) and slides
   the WE BUILD label (171) under the arriving panel. The list
   scrolls through its clipped window between arrivals; window =
   100dvh − pin − 214 (CSS), travel = content − window. A 250px
   settle closes the runway (the old stack's dwell). */
const STACK_PIN_PX = [120, 280, 440]; // 120 + n×160
const STACK_BAND_TO_ROWS_PX = 214;    // divider → rows top (the band)
const STACK_SETTLE_PX = 250;

/* THE FADE-TO-BLACK — constants verbatim through every relocation. */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_GROUND_FADE_PX = 500;
const GROUND_DARK = '#161616';
const GROUND_LIGHT = '#eeeef0';

export function initLandingServices() {
  const section = document.querySelector('[data-landing-services]');
  if (!(section instanceof HTMLElement)) return () => {};

  const title = section.querySelector('[data-landing-services-title]');
  const cards = Array.from(section.querySelectorAll('[data-services-card]'));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  if (isMobileViewport()) {
    const cleanupInd = initCarouselIndicators(section);
    const cleanups = [cleanupInd];
    /* The heading is a WELDED mixed-face paragraph — no reveal wrap
       survives it (line wraps split at span boundaries, word wraps
       broke the flow measurements; both caught in R1 verification).
       Over the mobile flat ground it renders as plain ink (the /work
       header decision), so the fade-rise is blend-safe. */
    cleanups.push(
      initMobileEntrance(section, {
        media: [title].filter((el) => el instanceof HTMLElement),
      }),
    );
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      cleanups.push(
        initMobileEntrance(card, {
          lines: [card.querySelector('.landing-svc-card__titlerow')].filter(
            (el) => el instanceof HTMLElement,
          ),
          media: [
            card.querySelector('.landing-svc-card__m-img'),
            card.querySelector('.landing-svc-card__desc'),
            card.querySelector('.landing-svc-card__m-listblock'),
            card.querySelector('.landing-svc-card__btnclip'),
          ].filter((el) => el instanceof HTMLElement),
          start: 'top 75%',
        }),
      );
    });
    return () => cleanups.forEach((fn) => fn());
  }

  /* ── DESKTOP — nothing. The svcrows row-list build this module
     served (hover rows, pillar pins, the fade-to-black) was retired
     by the reel rebuild (landing-services-reel.js carries the fade
     now); its [data-svcrows] markup no longer exists. The mobile
     branch above is this module's only live role. */
  return () => {};
}
