/**
 * /founders — THE PHONE (Figma d2vjAZ9BYqMqQhg662Yzuw, frame 2:42
 * "Founder — iPhone 16 & 17 Pro", 402×4380; Oscar 2026-09-10). The
 * branch founders-page.js takes below 768 instead of the narrow (band)
 * build: the SAME DOM on normal document scroll, laid out by
 * founders-narrow.css's ≤767 block as two static founder blocks. This
 * module owns everything that moves:
 *
 *   THE AUTHORED COPY — the data-m-* attributes founders.astro carries
 *     for the phone (the /services phoneLines precedent): the name
 *     breaks into its two words (ROBBO left / MCCALLUM right), the
 *     labels and Ashley's first paragraph take their authored lines,
 *     and each list becomes ONE flowing paragraph of the frame's items
 *     on " / " (the desktop's authored rows retire in CSS).
 *   B1 · TEXT ENTRANCES — every text part (role, name, statement
 *     paragraphs, label, list) on the desktop's line-clip vocabulary
 *     (line-reveal.js — the hero's wrap and 1.2s curve), its rows at
 *     the founders' 0.05s stagger, each part as IT crosses the 85%
 *     line (the narrow build's block line) — not the block at once,
 *     which on these viewport-tall blocks would spend the lower rows'
 *     reveals unseen. One-shot per part.
 *   B2 · IMAGE BLUR-IN — the two portraits, the strip's tiles and the
 *     sofa shot take the site-wide phone reveal (img-reveal.js: parked
 *     under 12px, resolved over 0.6s at the quarter line, mirrored).
 *   B3 · THE CONTINUOUS STRIP — the four shots roll leftward without
 *     end on the network rows' marquee keyframes (landing.css, the
 *     --marquee-set-w contract; the track is already doubled for the
 *     seamless wrap). PACE: the house marquee's desktop pace, 1728px in
 *     48s = 36 px/s (FDP_MARQUEE_PX_S — the desktop /founders column is
 *     scroll-driven and has no pace of its own; flagged). The set width
 *     is measured from the live slots and written with the duration.
 *   B4 · THE FLOATING THUMBS — the indicator's two thumbs, fixed and
 *     centred at the viewport's foot (CSS). Shown from load (the frame
 *     draws them in the first viewport); gone once the sofa shot has
 *     FULLY entered (its bottom ≤ the viewport bottom — the float-CTA's
 *     end predicate), back on reverse; the media beat both ways (0.8s
 *     fade + 16px rise, CSS). The ACTIVE stroke follows the reading:
 *     Ashley once her block's top crosses the viewport's middle.
 *   B5 · ROUTING — a thumb glides the page so that founder's role line
 *     sits at the frame's y181 (Robbo = the page top); /founders#robbo
 *     and #ashley land there on boot; the landing's founder links keep
 *     resolving. aria-current, data-active and the live region follow.
 *   THE FOOTER — in flow; its reveal on the shared cue (200 into the
 *     viewport); the back-to-top links glide.
 *
 * RM: no wraps (the copy renders complete), tiles static (CSS), images
 * present, the thumbs' states instant.
 */
import { flowFooterSpacer } from './viewport.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { initImageReveal } from './img-reveal.js';
import { FOUNDERS_SLIDES } from '../../data/landing/founders-page.js';
import { getLenisInstance } from './site-scroll.js';

/** a text part plays as its top crosses this share of the viewport (the narrow build's block line) */
export const FDP_ENTER_T = 0.85;
/** TUNABLE — the strip's pace, px/s: the house marquee's desktop pace (landing.css: 1728px per 48s) */
export const FDP_MARQUEE_PX_S = 36;
/** the frame's role-line y — a glide lands the founder's role here */
export const FDP_LAND_Y = 181;
/** the active founder switches as Ashley's block top crosses this share of the viewport */
export const FDP_ACTIVE_T = 0.5;
/** the float's settle re-reads after the last input (the Lenis tail lands late — float-cta.js) */
const FDP_SETTLE_TICKS_MS = [200, 700, 1500];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ── the authored copy (data-m-*) ─────────────────────────────────── */

/** `data-m-lines="a|b"` → the element's text as its authored lines on <br>. */
function applyAuthoredLines(el) {
  const raw = el.getAttribute('data-m-lines');
  if (!raw) return;
  const lines = raw.split('|').filter((s) => s.length);
  if (!lines.length) return;
  el.textContent = '';
  lines.forEach((line, i) => {
    if (i) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
}

/** The name: its words as block spans — the last one flush right (CSS). */
function applyNameLines(el) {
  const raw = el.getAttribute('data-m-lines');
  if (!raw) return;
  const words = raw.split('|').filter((s) => s.length);
  if (words.length < 2) return;
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = `fd-slide__name-l${i === words.length - 1 ? ' fd-slide__name-l--last' : ''}`;
    span.textContent = word;
    el.appendChild(span);
  });
}

/** `data-m-items` on the list → one flowing paragraph after its label. */
function buildRelFlow(rel) {
  let items = [];
  try { items = JSON.parse(rel.getAttribute('data-m-items') || '[]'); } catch { items = []; }
  if (!Array.isArray(items) || !items.length) return null;
  const p = document.createElement('p');
  p.className = 'fd-slide__rel-flow';
  items.forEach((item, i) => {
    if (i) p.appendChild(document.createTextNode(' '));
    const last = i === items.length - 1;
    /* an authored break inside an item ("Authenticity Within\nCulture") is
       a <br> SIBLING of the text — the line-reveal's wrap reads it as a
       hard line boundary, exactly as the frame draws it */
    String(item).split('\n').forEach((part, k, parts) => {
      if (k) p.appendChild(document.createElement('br'));
      const words = part.split(/\s+/).filter(Boolean);
      const tailed = !last && k === parts.length - 1;
      const lead = tailed ? words.slice(0, -1) : words;
      if (lead.length) p.appendChild(document.createTextNode(lead.join(' ') + (tailed ? ' ' : '')));
      if (!tailed) return;
      /* the slash rides in one element with the word it follows: the
         line-reveal's wrap takes an element child as a single atom, so a
         wrapped line ends "… / " and never opens with one (as the frame's
         lines 1 and 3 do at 402) */
      const tail = document.createElement('span');
      tail.className = 'fd-slide__rel-tail';
      tail.appendChild(document.createTextNode(words[words.length - 1] || ''));
      const sep = document.createElement('span');
      sep.className = 'fd-slide__rel-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = ' /';
      tail.appendChild(sep);
      p.appendChild(tail);
    });
  });
  rel.appendChild(p);
  return p;
}

/**
 * @param {HTMLElement} stage
 * @param {{ reduced: boolean, rowStaggerS: number }} opts
 * @returns {() => void} cleanup
 */
export function initFoundersPhone(stage, { reduced, rowStaggerS }) {
  const slides = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-slide]')).filter((el) => el instanceof HTMLElement));
  const thumbs = /** @type {HTMLElement[]} */ (Array.from(stage.querySelectorAll('[data-fd-thumb]')).filter((el) => el instanceof HTMLElement));
  const ind = stage.querySelector('[data-fd-ind]');
  const live = stage.querySelector('[data-fd-live]');
  const colTrack = stage.querySelector('[data-fd-coltrack]');
  const colSlots = colTrack instanceof HTMLElement
    ? Array.from(colTrack.querySelectorAll('.fd-col__slot')).filter((el) => el instanceof HTMLElement)
    : [];
  const sweep = stage.querySelector('[data-fd-sweep]');
  const footerWrap = document.querySelector('[data-fd-footer]');
  const footerEl = footerWrap?.querySelector('[data-landing-footer]');
  const spacer = flowFooterSpacer();

  let disposed = false;
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const cleanups = [];
  const vh = () => window.innerHeight || 874;
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  /* the desktop's tab rule is the driver's — both blocks are in flow */
  stage.querySelectorAll('[tabindex="-1"]').forEach((el) => { if (el !== stage) el.removeAttribute('tabindex'); });
  /* the footer's bottom row joins the one-shot reveal (the scrub is the driver's) */
  footerWrap?.querySelector('[data-footer-row-scrub]')?.removeAttribute('data-footer-row-scrub');

  /* ── the authored copy, before anything is measured or wrapped ── */
  stage.querySelectorAll('[data-m-lines]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.classList.contains('fd-slide__staticname')) applyNameLines(el);
    else applyAuthoredLines(el);
  });
  const relFlows = slides.map((slide) => {
    const rel = slide.querySelector('.fd-slide__rel[data-m-items]');
    return rel instanceof HTMLElement ? buildRelFlow(rel) : null;
  });

  /* ── B1 — the parts, each its own one-shot ── */
  const PART_SEL = '.fd-slide__role, .fd-slide__staticname, .fd-slide__bio2-para, .fd-slide__rel-label, .fd-slide__rel-flow';
  const parts = slides.flatMap((slide) => Array.from(slide.querySelectorAll(PART_SEL))
    .filter((el) => el instanceof HTMLElement && getComputedStyle(el).display !== 'none'));
  const played = new WeakSet();
  let wrapped = false;
  const wrapParts = () => {
    if (wrapped || reduced) return;
    wrapped = true;
    parts.forEach((el) => {
      wrapLineRevealElement(el);
      el.querySelectorAll('.lr-inner').forEach((inner, row) => {
        if (inner instanceof HTMLElement) inner.style.transitionDelay = `${(row * rowStaggerS).toFixed(2)}s`;
      });
    });
  };
  const playPart = (el) => {
    if (played.has(el) || reduced || !wrapped) return;
    played.add(el);
    playLineRevealElement(el);
  };

  /* ── B2 — the images ── */
  const revealHosts = [
    ...Array.from(stage.querySelectorAll('[data-fd-mportrait]')),
    ...colSlots,
    ...(sweep instanceof HTMLElement ? [sweep] : []),
  ];
  cleanups.push(initImageReveal(revealHosts));

  /* ── B3 — the strip's pace, from the measured set ── */
  const measureStrip = () => {
    if (!(colTrack instanceof HTMLElement) || colSlots.length < 2) return;
    const pitch = colSlots[1].offsetLeft - colSlots[0].offsetLeft;
    const setW = pitch * Math.round(colSlots.length / 2);
    if (!(setW > 0)) return;
    colTrack.style.setProperty('--fdp-set-w', `${setW.toFixed(2)}px`);
    colTrack.style.setProperty('--fdp-car-dur', `${(setW / FDP_MARQUEE_PX_S).toFixed(3)}s`);
  };
  cleanups.push(() => {
    if (!(colTrack instanceof HTMLElement)) return;
    colTrack.style.removeProperty('--fdp-set-w');
    colTrack.style.removeProperty('--fdp-car-dur');
  });

  /* ── B4 / B5 — the thumbs: the float, the active founder, the glide ── */
  let activeSlide = 0;
  let announced = -1;
  const announce = (i) => {
    if (announced === i || !(live instanceof HTMLElement)) return;
    announced = i;
    live.textContent = `Founder ${FOUNDERS_SLIDES[i].number} of 02: ${FOUNDERS_SLIDES[i].name}`;
  };
  const setActiveSlide = (i) => {
    if (activeSlide === i) return;
    activeSlide = i;
    thumbs.forEach((t, j) => t.setAttribute('aria-current', j === i ? 'true' : 'false'));
    slides.forEach((s, j) => { s.dataset.active = j === i ? 'true' : 'false'; });
    announce(i);
  };
  const ashleyAnchor = slides[1]?.querySelector('.fd-slide__role') ?? slides[1] ?? null;
  let floatShown = null;
  const floatInRange = () => !(sweep instanceof HTMLElement) || sweep.getBoundingClientRect().bottom > vh();
  const setFloat = (on) => {
    if (on === floatShown || !(ind instanceof HTMLElement)) return;
    floatShown = on;
    ind.classList.toggle('is-float-shown', on);
    ind.dataset.floatState = on ? 'shown' : 'hidden';
    /* the buttons leave the tab order with the box (the CSS gates visibility) */
    thumbs.forEach((t) => { if (on) t.removeAttribute('tabindex'); else t.setAttribute('tabindex', '-1'); });
  };
  let settleTimers = [];
  const frame = () => {
    const h = vh();
    /* B1 — each part as it crosses the line */
    parts.forEach((el) => {
      if (played.has(el)) return;
      if (el.getBoundingClientRect().top < h * FDP_ENTER_T) playPart(el);
    });
    /* the active founder — from Ashley's ROLE LINE (the block's first ink;
       the block's own box begins 120 above it, at the strip's foot) */
    if (ashleyAnchor) setActiveSlide(ashleyAnchor.getBoundingClientRect().top <= h * FDP_ACTIVE_T ? 1 : 0);
    /* the float */
    setFloat(floatInRange());
  };
  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const onScrollSettle = () => {
    onScroll();
    settleTimers.forEach(window.clearTimeout);
    settleTimers = FDP_SETTLE_TICKS_MS.map((ms) => window.setTimeout(frame, ms));
  };
  const onResize = () => { measureStrip(); frame(); };
  window.addEventListener('scroll', onScrollSettle, { passive: true });
  window.addEventListener('resize', onResize);
  cleanups.push(() => {
    window.removeEventListener('scroll', onScrollSettle);
    window.removeEventListener('resize', onResize);
    window.cancelAnimationFrame(raf);
    settleTimers.forEach(window.clearTimeout);
    ind?.classList.remove('is-float-shown');
    if (ind instanceof HTMLElement) delete ind.dataset.floatState;
  });

  /* B5 — the glide: the founder's role line to the frame's y181 */
  const glideToSlide = (i, instant = false) => {
    const slide = slides[i];
    if (!(slide instanceof HTMLElement)) return;
    const role = slide.querySelector('.fd-slide__role');
    const anchor = role instanceof HTMLElement ? role : slide;
    const target = Math.max(0, Math.round(docTop(anchor) - FDP_LAND_Y));
    const lenis = getLenisInstance();
    if (instant) { window.scrollTo(0, target); lenis?.scrollTo(target, { immediate: true, force: true }); return; }
    if (lenis) lenis.scrollTo(target, { duration: 1.0, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
  };
  thumbs.forEach((t) => {
    const onClick = () => glideToSlide(Number(t.dataset.slide));
    t.addEventListener('click', onClick);
    cleanups.push(() => t.removeEventListener('click', onClick));
  });

  /* ── the footer's reveal on the shared cue ── */
  let wrappedFooter = null;
  let footerIo = null;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    wrapParts();
    measureStrip();
    /* the deep link: /founders#ashley lands on her block, #robbo on his */
    const hash = window.location.hash || '';
    if (/^#ashley$/i.test(hash)) glideToSlide(1, true);
    else if (/^#robbo$/i.test(hash)) glideToSlide(0, true);
    frame();
    if (footerEl instanceof HTMLElement) {
      wrappedFooter = wrapFooterReveals(footerEl);
      const play = () => { if (wrappedFooter) playFooterReveals(wrappedFooter, schedule); };
      if (reduced || typeof IntersectionObserver !== 'function') { play(); return; }
      footerIo = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { play(); footerIo?.disconnect(); footerIo = null; }
      }, { rootMargin: '0px 0px -200px 0px', threshold: 0 });
      footerIo.observe(spacer ?? footerEl);
    }
  });
  cleanups.push(() => { footerIo?.disconnect(); footerIo = null; });

  /* the back-to-top links (the shared footer contract) */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    const lenis = getLenisInstance();
    if (lenis) lenis.scrollTo(0, { duration: 1.2, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  measureStrip();
  frame();
  announce(activeSlide);

  if (import.meta.env.DEV) {
    window.__founders = {
      phone: true,
      state: () => ({
        scrollY: window.scrollY, activeSlide, floatShown, wrapped,
        played: parts.filter((p) => played.has(p)).length, parts: parts.length,
        setW: colTrack instanceof HTMLElement ? colTrack.style.getPropertyValue('--fdp-set-w') : null,
        dur: colTrack instanceof HTMLElement ? colTrack.style.getPropertyValue('--fdp-car-dur') : null,
      }),
      frame,
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    cleanups.forEach((fn) => fn());
    relFlows.forEach((p) => p?.remove());
  };
}
