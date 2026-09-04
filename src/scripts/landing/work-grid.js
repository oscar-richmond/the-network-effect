/**
 * /work — THE GRID VIEW (R35, Oscar 2026-09-03). A normal scrolling
 * document beside the list view's fixed-viewport driver; the view
 * controller (work-view.js) boots exactly one of the two and tears it
 * down before booting the other.
 *
 * What this boots, and what its cleanup returns:
 *   · the house scroll (site-scroll's Lenis — the grid should scroll
 *     like every other flow page; destroyed on teardown);
 *   · the VIEW CASE STUDY cursor over the grid's LIVE tiles (its own
 *     instance of the shared module; the list's instance is gone by
 *     the time this boots);
 *   · the header pair's word reveal (the list header's vocabulary,
 *     wrapped once per page life, replayed per boot);
 *   · the row reveal (R38) — red containers resolving to their images
 *     per row at a quarter of the tallest tile entered, reversible;
 *   · the hover swap (R38) — the cover-swap wipe to a second image;
 *   · the footer's entrance on a scroll trigger (a flow page's
 *     grammar; the wrap is idempotent in footer-motion).
 * RM: no red state (images present), no hover swap, the header still
 * reveals (the page's load beat).
 */
import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { initViewCaseCursor } from './view-case-cursor.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { createCoverSwap } from '../cover-swap.js';

/* R38 item 6 — the row reveal's tunables (the R35 entrance staggers
   are retired with the fade-rise). */
export const GRID_REVEAL_THRESHOLD_T = 0.25; /* of the row's tallest tile entered */
export const GRID_REVEAL_MS = 600;           /* the veil's fade / the image's un-blur */
export const GRID_REVEAL_BLUR_PX = 12;       /* the image's blur under the veil */
const LINE_STAGGER_S = 0.12;

export function initWorkGrid() {
  const grid = document.querySelector('[data-work-grid]');
  if (!(grid instanceof HTMLElement)) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    || new URLSearchParams(window.location.search).has('forcehover');
  const cleanups = [];
  const timeouts = [];
  let disposed = false;

  cleanups.push(initSiteScroll());
  /* R36: the grid is a document-scroll page — it gets the shared bottom
     behaviour (the nav sweep at the bottom, the idle snap) like every
     other flow page; the list view keeps the driver's own. */
  cleanups.push(bindBottomNavSweep({ reduced, getLenis: getLenisInstance }));
  cleanups.push(initViewCaseCursor({
    cursorEl: document.querySelector('[data-work-cursor]'),
    linkSelector: '.work-grid [data-work-link]',
    reduced,
  }));

  /* ── The header pair (the list header's beat). */
  const lines = [
    grid.querySelector('[data-work-grid-hl-featured]'),
    grid.querySelector('[data-work-grid-hl-work]'),
  ].filter((el) => el instanceof HTMLElement);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed || reduced) return;
    lines.forEach((line, i) => {
      if (!line.querySelector('.lr-clip')) {
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      } else {
        line.querySelectorAll('.lr-clip').forEach((c) => c.classList.remove('lr-visible'));
        void line.offsetHeight;
      }
      playLineRevealElement(line);
    });
  });

  /* ── R38 item 5: THE HOVER SWAP — the /services row-hover cover-swap
     (cover-swap.js, the shared runner: one run in flight per tile, the
     latest target lands, so rapid hops never stack or half-swap) on
     every LIVE tile: enter → wipe the hover image in; leave → wipe the
     original back in the same left → right read. Keyboard focus does
     the same. RM: no swap (the runner is not wired). */
  if (!reduced && fineHover) {
    grid.querySelectorAll('a[data-work-gtile]').forEach((tile) => {
      if (!(tile instanceof HTMLElement)) return;
      const wrap = tile.querySelector('.work-gtile__media');
      const baseEl = tile.querySelector('[data-gtile-base]');
      const overEl = tile.querySelector('[data-gtile-over]');
      const alt = tile.dataset.hoverImg;
      if (!(wrap instanceof HTMLElement) || !(baseEl instanceof HTMLImageElement) || !(overEl instanceof HTMLImageElement) || !alt) return;
      const original = baseEl.getAttribute('src') || '';
      const swap = createCoverSwap({ wrap, baseEl, overEl });
      const enter = () => swap.swapTo(alt);
      const leave = () => swap.swapTo(original);
      tile.addEventListener('pointerenter', enter);
      tile.addEventListener('pointerleave', leave);
      tile.addEventListener('focus', enter);
      tile.addEventListener('blur', leave);
      cleanups.push(() => {
        tile.removeEventListener('pointerenter', enter);
        tile.removeEventListener('pointerleave', leave);
        tile.removeEventListener('focus', enter);
        tile.removeEventListener('blur', leave);
        swap.reset();
        if (baseEl.getAttribute('src') !== original) baseEl.setAttribute('src', original);
      });
    });
  }

  /* ── R38 item 6: THE ROW REVEAL — red containers resolving to images.
     Per row, from that row's MEASURED geometry: the threshold is a
     quarter of the row's TALLEST tile entered (row top + tallest/4 ≤
     the viewport bottom) — resolve; above it — red again (mirrored,
     scroll-driven, reversible). All tiles in a row resolve together
     (Oscar's default). Tunables: GRID_REVEAL_THRESHOLD_T, the
     duration and blur as CSS vars (GRID_REVEAL_MS / GRID_REVEAL_BLUR_PX).
     RM: no veil (CSS), rows marked resolved at boot. */
  const rows = Array.from(grid.querySelectorAll('[data-work-grid-row]')).filter((el) => el instanceof HTMLElement);
  const tilesOf = (row) => Array.from(row.querySelectorAll('[data-work-gtile]')).filter((el) => el instanceof HTMLElement);
  grid.style.setProperty('--work-reveal-s', `${GRID_REVEAL_MS / 1000}s`);
  grid.style.setProperty('--work-reveal-blur', `${GRID_REVEAL_BLUR_PX}px`);
  const rowThreshold = (row) => Math.max(...tilesOf(row).map((t) => (t.querySelector('.work-gtile__media') ?? t).getBoundingClientRect().height), 0) * GRID_REVEAL_THRESHOLD_T;
  const measureRows = () => {
    const vh = window.innerHeight || 0;
    rows.forEach((row) => {
      const top = row.getBoundingClientRect().top;
      const on = reduced || top + rowThreshold(row) <= vh;
      row.classList.toggle('is-resolved', on);
    });
  };
  let revealRaf = 0;
  const onRevealScroll = () => { if (!revealRaf) revealRaf = requestAnimationFrame(() => { revealRaf = 0; measureRows(); }); };
  measureRows();
  window.addEventListener('scroll', onRevealScroll, { passive: true });
  window.addEventListener('resize', onRevealScroll);
  cleanups.push(() => {
    window.removeEventListener('scroll', onRevealScroll);
    window.removeEventListener('resize', onRevealScroll);
    window.cancelAnimationFrame(revealRaf);
    /* once per BOOT: the next boot replays from the parked (red) state */
    rows.forEach((row) => row.classList.remove('is-resolved'));
  });

  /* ── The footer: the flow-page grammar — wrapped once (idempotent),
     played when it enters. */
  const footer = document.querySelector('[data-work-footer] [data-landing-footer]');
  /* R38 item 7: the sticky uncover's height is the footer's rendered
     height (work.css reads --work-footer-h); re-derived on resize. */
  const deriveFooterH = () => { if (footer instanceof HTMLElement) document.body.style.setProperty('--work-footer-h', `${footer.offsetHeight || 830}px`); };
  deriveFooterH();
  window.addEventListener('resize', deriveFooterH);
  cleanups.push(() => { window.removeEventListener('resize', deriveFooterH); document.body.style.removeProperty('--work-footer-h'); });
  let footerIo = null;
  fontsReady.then(() => {
    if (disposed || !(footer instanceof HTMLElement)) return;
    const wrapped = wrapFooterReveals(footer);
    const play = () => playFooterReveals(wrapped, (fn, ms) => timeouts.push(setTimeout(fn, ms)));
    if (reduced || typeof IntersectionObserver !== 'function') { play(); return; }
    footerIo = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { play(); footerIo?.disconnect(); footerIo = null; }
    }, { threshold: 0.15 });
    footerIo.observe(footer);
  });
  cleanups.push(() => { footerIo?.disconnect(); footerIo = null; });
  cleanups.push(() => timeouts.forEach(clearTimeout));

  if (import.meta.env.DEV) {
    window.__workGrid = {
      rows: () => rows.map((r) => ({ resolved: r.classList.contains('is-resolved'), threshold: +rowThreshold(r).toFixed(1), top: +r.getBoundingClientRect().top.toFixed(1), tiles: tilesOf(r).map((t) => t.dataset.slug) })),
    };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    if (import.meta.env.DEV) window.__workGrid = null;
  };
}
