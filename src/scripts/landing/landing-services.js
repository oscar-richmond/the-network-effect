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

      /* Pillar entrances: IMMERSE (pinned with the stage from the
         start) keeps the /services draw-in, anchored to the STAGE
         RUNWAY's approach; CONNECT and AMPLIFY arrive as COMPOSED
         panels — the old cards rode up fully drawn, and a draw-in
         mid-ride would read as a glitch. */
      const pillars = Array.from(rowsRoot.querySelectorAll('[data-svcrows-pillar]'));
      pillars.forEach((pillar, pi) => {
        if (!(pillar instanceof HTMLElement)) return;
        const pLines = Array.from(pillar.querySelectorAll('[data-svcrows-pline]'));
        pLines.forEach((line, i) => {
          if (!(line instanceof HTMLElement)) return;
          line.dataset.revealDelay = String(i * LINE_STAGGER_S);
          wrapWordRevealElement(line);
        });
        const rows = Array.from(pillar.querySelectorAll('[data-sv-row]'));
        const endline = pillar.querySelector('[data-sv-rows-end]');
        const compose = () => {
          pillar.classList.add('is-entered');
          pLines.forEach((l) => { if (l instanceof HTMLElement) playLineRevealElement(l); });
          rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * ROW_STAGGER_MS));
          if (endline instanceof HTMLElement) {
            schedule(() => endline.classList.add('is-visible'), rows.length * ROW_STAGGER_MS);
          }
        };
        if (pi === 0) {
          const trig = ScrollTrigger.create({
            trigger: rowsRoot.querySelector('[data-svcrows-stagewrap]') ?? pillar,
            start: 'top 65%',
            once: true,
            onEnter: compose,
          });
          cleanups.push(() => trig.kill());
        } else {
          pillar.classList.add('is-composed');
          compose();
        }
      });
    });
  }

  /* ── 4 — THE STACK (see the constants above). Built after fonts
     (the windows measure real row heights); rebuilt whole on resize
     — the hero's discipline. Without it (RM) the flow layout
     stands: .is-stacked never lands and the CSS block is inert. */
  if (!reduced) {
    const stagewrap = rowsRoot.querySelector('[data-svcrows-stagewrap]');
    const stage = rowsRoot.querySelector('[data-svcrows-stage]');
    const stackPillars = Array.from(rowsRoot.querySelectorAll('[data-svcrows-pillar]'));
    if (stagewrap instanceof HTMLElement && stage instanceof HTMLElement && stackPillars.length) {
      rowsRoot.classList.add('is-stacked');
      const vh = () => window.innerHeight;
      let stackTl = null;

      const buildStack = () => {
        stackTl?.scrollTrigger?.kill();
        stackTl?.kill();
        const H = vh();
        const parts = stackPillars.map((pillar, i) => {
          const pin = STACK_PIN_PX[i] ?? STACK_PIN_PX[STACK_PIN_PX.length - 1];
          pillar.style.setProperty('--pillar-pin', `${pin}px`);
          const scroll = pillar.querySelector('[data-svcrows-scroll]');
          const win = pillar.querySelector('[data-svcrows-win]');
          const winH = win instanceof HTMLElement ? win.clientHeight : 0;
          const contentH = scroll instanceof HTMLElement ? scroll.scrollHeight : 0;
          return { pillar, scroll, pin, travel: Math.max(0, contentH - winH) };
        });
        /* Park the arrivals below the stage (transform — the panels
           are opaque, see the CSS blend note). */
        parts.forEach((pt, i) => {
          if (pt.scroll instanceof HTMLElement) gsap.set(pt.scroll, { y: 0 });
          if (i > 0) gsap.set(pt.pillar, { y: H - pt.pin });
          else gsap.set(pt.pillar, { y: 0 });
        });
        /* The runway: list1 → arrival2 → list2 → arrival3 → list3 →
           settle, all 1:1. */
        let at = 0;
        const tl = gsap.timeline({ defaults: { ease: 'none' } });
        parts.forEach((pt, i) => {
          if (i > 0) {
            const ride = H - pt.pin;
            tl.to(pt.pillar, { y: 0, duration: ride }, at);
            at += ride;
          }
          if (pt.travel > 0 && pt.scroll instanceof HTMLElement) {
            tl.to(pt.scroll, { y: -pt.travel, duration: pt.travel }, at);
            at += pt.travel;
          }
        });
        const runway = at + STACK_SETTLE_PX;
        stagewrap.style.height = `${H + runway}px`;
        tl.to({}, { duration: STACK_SETTLE_PX }, at); /* the dwell */
        tl.scrollTrigger = ScrollTrigger.create({
          trigger: stagewrap,
          start: 'top top',
          end: `+=${Math.round(runway)}`,
          scrub: true,
          animation: tl,
        });
        stackTl = tl;
      };
      fontsReady.then(() => {
        if (disposed) return;
        buildStack();
        ScrollTrigger.refresh();
      });
      let resizeT = 0;
      const onResize = () => {
        window.clearTimeout(resizeT);
        resizeT = window.setTimeout(() => {
          if (disposed) return;
          buildStack();
          ScrollTrigger.refresh();
        }, 150);
      };
      window.addEventListener('resize', onResize);
      cleanups.push(() => {
        window.removeEventListener('resize', onResize);
        window.clearTimeout(resizeT);
        stackTl?.scrollTrigger?.kill();
        stackTl?.kill();
      });
    }
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
  };
}
