/**
 * /services — the "Option 6" desktop driver (frame 38:2420,
 * 2026-08-26). DESKTOP ONLY: the page script initialises this above
 * the seam and the legacy services-v2 driver below it.
 *
 * MECHANIC REUSE (the inventory, per the task):
 *  · HOVER TABLES — initSvRowsSections wholesale (sv-rows.js,
 *    untouched): fill/marquee/image glide/rapid-hover latch/
 *    keyboard/touch/RM. The page sets --sv-accent to the #C1250E
 *    red; geometry adaptations live in services-6.css only.
 *  · GALLERY PIN + TRAVEL — the landing featured-work PATTERN
 *    (sticky stage + vertical runway mapped 1:1 to horizontal x;
 *    travel = strip width + margins − viewport, derived live).
 *    landing-featured.js itself documents that this pattern is
 *    reused as a pattern, not shared code ("the /old horizontal
 *    galleries are welded to their pages' pin systems") — same
 *    here: the landing module is welded to its cards/header/fade
 *    contracts, so the pattern is rebuilt minimally and the
 *    original is untouched (landing byte-identical).
 *  · BOX ARRIVAL — the landing featured entrance vocabulary:
 *    is-visible stagger at 100ms L→R, once, at 'top 65%'.
 *  · FRAGMENTED DWELL — initStatementDwell wholesale
 *    (statement-dwell.js): the centred sticky hold + clear-space
 *    pads, exactly the landing closing statement's behaviour.
 *  · Entrances — the house word-reveal vocabulary throughout.
 *
 * THE DARK BAND (38:2501): sized live from the CONNECT header
 * image's bottom edge to the AMPLIFY header image's top (the
 * frame's own transition edges; its 25px tuck under the CONNECT
 * image hides beneath the opaque image either way).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSiteScroll } from './site-scroll.js';
import { initSvRowsSections } from './sv-rows.js';
import { initStatementDwell } from './statement-dwell.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const BOX_STAGGER_MS = 100;   /* the landing featured card arrival */
const ROW_STAGGER_MS = 60;    /* the sv-rows draw stagger (shipped) */
const FRAG_LINE_PITCH_PX = 90;
const FRAG_LINE_H_PX = 88;

export function initServices6() {
  const page = document.querySelector('[data-services-6]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');

  if (!reduced) cleanups.push(initSiteScroll());

  /* ── Hover tables — the shared machinery, wholesale. */
  cleanups.push(initSvRowsSections({ reduced, isMob: false, fineHover, schedule, root: page }));

  /* ── The dark band — CONNECT image bottom → AMPLIFY image top. */
  const band = page.querySelector('[data-sv6-darkband]');
  const sizeBand = () => {
    const connect = page.querySelector('#connect');
    const amplify = page.querySelector('#amplify');
    if (!(band instanceof HTMLElement) || !(connect instanceof HTMLElement) || !(amplify instanceof HTMLElement)) return;
    const pageTop = page.getBoundingClientRect().top;
    const top = connect.getBoundingClientRect().bottom - pageTop;
    const bottom = amplify.getBoundingClientRect().top - pageTop;
    band.style.top = `${top.toFixed(0)}px`;
    band.style.height = `${(bottom - top).toFixed(0)}px`;
  };

  /* ── Fragmented statements — stage height from the line count,
     then the SHARED centred dwell (layout, runs under RM too). */
  const fragCleanups = [];
  page.querySelectorAll('[data-sv6-frag]').forEach((sec) => {
    const stage = sec.querySelector('[data-sv6-frag-stage]');
    if (!(stage instanceof HTMLElement)) return;
    const lines = stage.querySelectorAll('[data-sv6-frag-line]');
    let maxTop = 0;
    lines.forEach((l) => { maxTop = Math.max(maxTop, parseFloat(l.style.top) || 0); });
    stage.style.setProperty('--sv6-frag-h', `${maxTop + FRAG_LINE_H_PX}px`);
    fragCleanups.push(initStatementDwell(sec, stage));
  });
  cleanups.push(() => fragCleanups.forEach((fn) => fn()));

  /* ── Galleries — the featured pattern: derived travel, sticky
     pin, 1:1 scrub. With the frame's six 273px boxes the strip
     fits the viewport and the derived travel is 0 (the pin
     degenerates to a pass-through) — any additional images in the
     data create real travel with no code change. */
  const gals = Array.from(page.querySelectorAll('[data-sv6-gal]'));
  const galTravel = (gal) => {
    const strip = gal.querySelector('[data-sv6-gal-strip]');
    if (!(strip instanceof HTMLElement)) return 0;
    return Math.max(strip.scrollWidth + 24 + 24 - (window.innerWidth || 1728), 0);
  };
  const galTweens = [];
  const buildGals = () => {
    gals.forEach((gal) => {
      const stage = gal.querySelector('[data-sv6-gal-stage]');
      const strip = gal.querySelector('[data-sv6-gal-strip]');
      if (!(strip instanceof HTMLElement) || !(stage instanceof HTMLElement)) return;
      /* Items 7/8 (Oscar R2): the stage's natural content height
         feeds the CENTRE PIN (sticky top = 50dvh - h/2, the dwell
         derivation); the scrub window starts exactly at the pin. */
      gal.style.removeProperty('--sv6-gal-stage-h');
      const h = stage.offsetHeight;
      gal.style.setProperty('--sv6-gal-stage-h', `${h}px`);
      const t = galTravel(gal);
      gal.style.setProperty('--sv6-gal-runway', `${t.toFixed(0)}px`);
      if (t <= 0 || reduced) return;
      const tween = gsap.to(strip, {
        x: () => -galTravel(gal),
        ease: 'none',
        scrollTrigger: {
          trigger: gal,
          start: () => `top ${Math.round(((window.innerHeight || 1080) - h) / 2)}px`,
          end: () => `+=${galTravel(gal)}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      galTweens.push(tween);
    });
  };
  cleanups.push(() => galTweens.forEach((tw) => { tw.scrollTrigger?.kill(); tw.kill(); }));

  sizeBand();
  buildGals();
  const onResize = () => { sizeBand(); };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ── Back-to-top (footer) — navigation, all modes. */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTop = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };
  topLinks.forEach((l) => l.addEventListener('click', onTop));
  cleanups.push(() => topLinks.forEach((l) => l.removeEventListener('click', onTop)));

  if (reduced) {
    /* RM: static page — dwells (layout) applied above; sv-rows'
       own RM path (colour fill only) is inside the machinery. */
    sizeBand();
    return () => { cleanups.forEach((fn) => fn()); timeouts.forEach(clearTimeout); };
  }

  /* ── Entrances (live vocabulary). */
  const triggers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    sizeBand();
    ScrollTrigger.refresh();

    /* Hero — word reveals at load. */
    const heroTitle = page.querySelector('[data-sv6-hero-title]');
    const heroDesc = page.querySelector('[data-sv6-hero-desc]');
    [heroTitle, heroDesc].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });

    /* Pillar headers — item 1 (Oscar R2): titles animate ONLY on
       scroll. 'top 40%' sits below pillar 1's load position (top
       ~507 vs 40% of any target viewport), so nothing plays at
       load; each pillar reveals once its image is well in view. */
    page.querySelectorAll('.sv6-pillar').forEach((sec) => {
      const lines = Array.from(sec.querySelectorAll('[data-sv6-line]'));
      lines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 40%',
        once: true,
        onEnter: () => {
          sec.querySelector('.sv6-pillar__img')?.classList.add('is-visible');
          lines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l));
        },
      }));
    });

    /* Statements — word reveal + the bar draw (the case-study intro
       convention). */
    page.querySelectorAll('[data-sv6-st]').forEach((sec) => {
      const text = sec.querySelector('[data-sv6-statement]');
      if (text instanceof HTMLElement) wrapWordRevealElement(text);
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          if (text instanceof HTMLElement) playLineRevealElement(text);
          sec.querySelector('[data-sv6-bar]')?.classList.add('is-visible');
        },
      }));
    });

    /* Tables — the shipped sv-rows draw: rows' dividers + texts
       stagger at 60ms, the endline last (services-v2's own beat,
       replicated for the new host). */
    page.querySelectorAll('[data-sv-rows]').forEach((section) => {
      const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
      const endline = section.querySelector('[data-sv-rows-end]');
      const label = section.querySelector('.sv-rows__label');
      if (label instanceof HTMLElement) wrapWordRevealElement(label);
      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          if (label instanceof HTMLElement) playLineRevealElement(label);
          rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * ROW_STAGGER_MS));
          if (endline instanceof HTMLElement) {
            schedule(() => endline.classList.add('is-visible'), rows.length * ROW_STAGGER_MS);
          }
        },
      }));
    });

    /* Galleries — title first, then the boxes one by one (the
       landing featured arrival: 100ms L→R). */
    gals.forEach((gal) => {
      /* Item 5: each title LINE wraps individually (wrapping the
         whole h3 flattened the explicit two-line break). */
      const titleLines = Array.from(gal.querySelectorAll('.sv6-gal__titleline'));
      const boxes = Array.from(gal.querySelectorAll('[data-sv6-gal-box]'));
      titleLines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: gal,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          titleLines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l));
          boxes.forEach((box, i) => schedule(() => box.classList.add('is-visible'), 300 + i * BOX_STAGGER_MS));
        },
      }));
    });

    /* Fragmented statements — per-line word reveal on the closing
       convention (65%, once, 0.12 DOM-order stagger). */
    page.querySelectorAll('[data-sv6-frag]').forEach((sec) => {
      const lines = Array.from(sec.querySelectorAll('[data-sv6-frag-line]'));
      lines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 65%',
        once: true,
        onEnter: () => lines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l)),
      }));
    });

    /* Footer — the shared choreography at its approach. */
    const footer = document.querySelector('.sv6-footwrap .landing-footer') || document.querySelector('.landing-footer');
    let wrapped = { wordEls: [], img: null };
    if (footer instanceof HTMLElement) {
      wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: 'top 90%',
        once: true,
        onEnter: () => playFooterReveals(wrapped, (fn, ms) => schedule(fn, ms)),
      }));
    }
  });

  cleanups.push(() => {
    disposed = true;
    triggers.forEach((t) => t.kill());
    timeouts.forEach(clearTimeout);
  });

  if (import.meta.env.DEV) {
    window.__services6 = {
      galTravel: () => gals.map((g) => galTravel(g)),
    };
  }

  return () => cleanups.forEach((fn) => fn());
}
