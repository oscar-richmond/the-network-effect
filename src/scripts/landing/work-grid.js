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
 *   · the tiles' entrance — rows revealing top to bottom as they enter
 *     the viewport, tiles staggered within each row (the featured-card
 *     fade-rise, work.css) — once per boot;
 *   · the footer's entrance on a scroll trigger (a flow page's
 *     grammar; the wrap is idempotent in footer-motion).
 * RM: no stagger (every tile visible at once), no hover scale (CSS),
 * the header still reveals (the page's load beat).
 */
import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { initViewCaseCursor } from './view-case-cursor.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';

/* The entrance's tunables: a row's tiles arrive GRID_TILE_STAGGER_MS
   apart; when more than one row is already in view at boot, the rows
   themselves are GRID_ROW_STAGGER_MS apart. */
export const GRID_ROW_STAGGER_MS = 160;
export const GRID_TILE_STAGGER_MS = 90;
const LINE_STAGGER_S = 0.12;
const ROW_ENTER_THRESHOLD = 0.12;

export function initWorkGrid() {
  const grid = document.querySelector('[data-work-grid]');
  if (!(grid instanceof HTMLElement)) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  /* ── The tiles' entrance. */
  const rows = Array.from(grid.querySelectorAll('[data-work-grid-row]')).filter((el) => el instanceof HTMLElement);
  const tilesOf = (row) => Array.from(row.querySelectorAll('[data-work-gtile]')).filter((el) => el instanceof HTMLElement);
  let rowsRevealed = 0;
  const revealRow = (row) => {
    if (row.dataset.gridRevealed === '1') return;
    row.dataset.gridRevealed = '1';
    const rowBeat = rowsRevealed * GRID_ROW_STAGGER_MS;
    rowsRevealed += 1;
    tilesOf(row).forEach((tile, i) => {
      tile.style.transitionDelay = reduced ? '' : `${rowBeat + i * GRID_TILE_STAGGER_MS}ms`;
      tile.classList.add('is-visible');
    });
    /* the row beat only applies to rows that are on screen together;
       a row that enters later starts its own count */
    timeouts.push(setTimeout(() => { rowsRevealed = Math.max(0, rowsRevealed - 1); }, GRID_ROW_STAGGER_MS + 50));
  };
  let io = null;
  if (reduced || typeof IntersectionObserver !== 'function') {
    rows.forEach(revealRow);
  } else {
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting && entry.target instanceof HTMLElement) { revealRow(entry.target); io?.unobserve(entry.target); } });
    }, { threshold: ROW_ENTER_THRESHOLD });
    rows.forEach((row) => io.observe(row));
  }
  cleanups.push(() => {
    io?.disconnect();
    /* once per BOOT: the next boot replays from the parked state */
    rows.forEach((row) => {
      delete row.dataset.gridRevealed;
      tilesOf(row).forEach((tile) => { tile.classList.remove('is-visible'); tile.style.transitionDelay = ''; });
    });
  });

  /* ── The footer: the flow-page grammar — wrapped once (idempotent),
     played when it enters. */
  const footer = document.querySelector('[data-work-footer] [data-landing-footer]');
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
      rows: () => rows.map((r) => ({ revealed: r.dataset.gridRevealed === '1', tiles: tilesOf(r).map((t) => [t.dataset.slug, t.classList.contains('is-visible'), t.style.transitionDelay]) })),
    };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    if (import.meta.env.DEV) window.__workGrid = null;
  };
}
