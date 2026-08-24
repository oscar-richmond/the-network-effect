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
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { isMobileViewport } from './viewport.js';
import { initCarouselIndicators } from './carousel-indicator.js';
import { initMobileEntrance } from './m-entrance.js';
import { initSvRowsSections } from './sv-rows.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12; // the house line-reveal stagger
const ROW_STAGGER_MS = 60;   // the /services rows entrance rhythm

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
  /* ── DESKTOP — the row-list build. ─────────────────────────── */
  const rowsRoot = section.querySelector('[data-svcrows]');
  if (!(rowsRoot instanceof HTMLElement)) return () => {};

  let disposed = false;
  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1 — the hover rows: the SHARED machinery (sv-rows.js). */
  cleanups.push(initSvRowsSections({ reduced, isMob: false, fineHover, schedule, root: rowsRoot }));

  /* 2 — the fade-to-black (see header). Scrubbed on the section's
     own bottom edge: starts TRANSITION_GROUND_FADE_PX before the
     bottom meets the viewport bottom, ends exactly there — fully
     dark before any Featured pixel can show. */
  if (!reduced) {
    const fade = gsap.fromTo(section,
      { backgroundColor: GROUND_LIGHT },
      {
        backgroundColor: GROUND_DARK,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: `bottom bottom+=${TRANSITION_GROUND_FADE_PX}`,
          end: 'bottom bottom',
          scrub: true,
        },
      });
    cleanups.push(() => { fade.scrollTrigger?.kill(); fade.kill(); });
  }

  /* 3 — entrances, the live vocabulary only: header + pillar text
     via the house line-reveal; each pillar's rows draw in on the
     /services rhythm (.is-visible, 60ms stagger, endline last);
     topline/button/list-label ride the pillar's .is-entered CSS
     states. RM: everything static (states are no-preference-gated
     in landing.css). */
  if (!reduced) {
    fontsReady.then(() => {
      if (disposed) return;
      const headerLines = Array.from(rowsRoot.querySelectorAll('[data-svcrows-line]'));
      headerLines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      const headerTrig = ScrollTrigger.create({
        trigger: rowsRoot,
        start: 'top 75%',
        once: true,
        onEnter: () => headerLines.forEach((l) => {
          if (l instanceof HTMLElement) playLineRevealElement(l);
        }),
      });
      cleanups.push(() => headerTrig.kill());

      rowsRoot.querySelectorAll('.landing-svcrows__pillar').forEach((pillar) => {
        if (!(pillar instanceof HTMLElement)) return;
        const pLines = Array.from(pillar.querySelectorAll('[data-svcrows-pline]'));
        pLines.forEach((line, i) => {
          if (!(line instanceof HTMLElement)) return;
          line.dataset.revealDelay = String(i * LINE_STAGGER_S);
          wrapWordRevealElement(line);
        });
        const rows = Array.from(pillar.querySelectorAll('[data-sv-row]'));
        const endline = pillar.querySelector('[data-sv-rows-end]');
        const trig = ScrollTrigger.create({
          trigger: pillar,
          start: 'top 65%',
          once: true,
          onEnter: () => {
            pillar.classList.add('is-entered');
            pLines.forEach((l) => { if (l instanceof HTMLElement) playLineRevealElement(l); });
            rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * ROW_STAGGER_MS));
            if (endline instanceof HTMLElement) {
              schedule(() => endline.classList.add('is-visible'), rows.length * ROW_STAGGER_MS);
            }
          },
        });
        cleanups.push(() => trig.kill());
      });
    });
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
  };
}
