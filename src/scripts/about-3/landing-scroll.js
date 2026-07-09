import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** Same curve as line-reveal.js / founders-scroll.js — matches the hero
 * tagline and intro line-reveal character. */
const LINE_REVEAL_EASE = CustomEase.create('landingLineReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/** Seconds between each column's first line starting (left → right). */
const LANDING_COL_STAGGER = 0.18;
/** Per-line stagger within a column — mirrors the hero tagline's 0.12s. */
const LANDING_LINE_STAGGER = 0.12;
/** Per-line reveal duration — mirrors line-reveal.js's 1.2s transition. */
const LANDING_LINE_DURATION = 1.2;

/**
 * Wrap each landing column's copy into line-reveal clips and collect the
 * per-line `.lr-inner` elements in reading order.
 * @param {HTMLElement} landing
 * @returns {HTMLElement[]}
 */
function wrapLandingColumns(landing) {
  const columns = Array.from(landing.querySelectorAll('[data-about-landing-col]'));
  /** @type {HTMLElement[]} */
  const inners = [];

  columns.forEach((col, colIndex) => {
    if (!(col instanceof HTMLElement)) return;
    if (col.dataset.origHtml === undefined) {
      col.dataset.origHtml = col.innerHTML;
    } else {
      col.innerHTML = col.dataset.origHtml;
    }
    col.dataset.revealDelay = String(colIndex * LANDING_COL_STAGGER);
    wrapLineRevealElement(col);
    col.querySelectorAll('.lr-inner').forEach((inner) => {
      if (inner instanceof HTMLElement) {
        inner.style.transition = 'none';
        inners.push(inner);
      }
    });
  });

  return inners;
}

/**
 * Boot the landing-section line reveal on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initLandingScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const landing = document.querySelector('body.about-page-3 [data-about-landing]');
  if (!(landing instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  /** @type {gsap.core.Timeline | undefined} */
  let revealTl;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-landing-')) {
        trigger.kill();
      }
    });
    revealTl?.kill();

    const columns = Array.from(landing.querySelectorAll('[data-about-landing-col]'));
    if (!columns.length) return;

    const inners = wrapLandingColumns(landing);
    if (!inners.length) return;

    gsap.set(inners, { yPercent: 110, y: 0 });

    revealTl = gsap.timeline({ paused: true });

    columns.forEach((col, colIndex) => {
      if (!(col instanceof HTMLElement)) return;
      const colInners = Array.from(col.querySelectorAll('.lr-inner')).filter(
        (el) => el instanceof HTMLElement,
      );
      colInners.forEach((inner, lineIndex) => {
        revealTl.fromTo(
          inner,
          { yPercent: 110, y: 0 },
          {
            yPercent: 0,
            y: 0,
            duration: LANDING_LINE_DURATION,
            ease: LINE_REVEAL_EASE,
            immediateRender: false,
          },
          colIndex * LANDING_COL_STAGGER + lineIndex * LANDING_LINE_STAGGER,
        );
      });
    });

    ScrollTrigger.create({
      trigger: landing,
      start: 'top 85%',
      end: 'bottom top',
      id: 'about-landing-reveal',
      onEnter: () => revealTl?.play(),
      onLeaveBack: () => revealTl?.reverse(),
    });

    ScrollTrigger.refresh();
  };

  let cancelled = false;
  document.fonts.ready.then(() => {
    if (!cancelled) build();
  });

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  const onResize = () => {
    if (window.innerWidth === lastW && window.innerHeight === lastH) return;
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    build();
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelled = true;
    window.removeEventListener('resize', onResize);
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-landing-')) {
        trigger.kill();
      }
    });
    revealTl?.kill();
  };
}
