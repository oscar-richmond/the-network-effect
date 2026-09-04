/**
 * /work — THE VIEW CONTROLLER (R35, Oscar 2026-09-03): GRID (the
 * default since R38 — a normal document, work-grid.js) or LIST (the
 * fixed-viewport driver, work-page.js), and the switch between them.
 *
 * THE STRUCTURAL RULE: switching is a FULL TEARDOWN of the outgoing
 * view — its listeners, rAF loop, ScrollTriggers, cursor instance,
 * timeouts, Lenis — through the cleanup it returned (the same cleanup
 * astro:before-swap calls), then a clean BOOT of the incoming view.
 * Nothing accumulates across repeated switching (the harness's switch
 * mode asserts listener counts flat, one cursor instance, the list
 * handle absent in grid view, Lenis absent in list view).
 *
 * PERSISTENCE: the choice lives in sessionStorage (WORK_VIEW_STORAGE_KEY)
 * and in the URL (?view=grid|list — WORK_VIEW_QUERY_KEY); the query
 * wins on load, both are written on a switch (replaceState — no
 * history entries). Deep-linkable and shareable. R38 (Oscar,
 * 2026-09-04): GRID is the default (WORK_VIEW_DEFAULT); ?view=list is
 * the override; a page landing on grid never boots the list driver
 * (boot() runs exactly one view).
 *
 * THE TRANSITION: a blur-crossfade in the house vocabulary, sequenced
 * — the outgoing view blur-fades out (SWITCH_OUT_MS), the page scrolls
 * to top, the views swap, the incoming blur-fades in (SWITCH_IN_MS).
 * Reduced motion: an instant swap. Keyboard operable (buttons),
 * aria-pressed on the active chip, the change announced.
 *
 * MOBILE (≤1024): the toggle is hidden and this controller simply boots
 * the list driver's mobile branch as before — nothing else engages.
 */
import { initWorkPage } from './work-page.js';
import { initWorkGrid } from './work-grid.js';
import { isMobileViewport } from './viewport.js';

export const WORK_VIEW_STORAGE_KEY = 'ne:work-view';
export const WORK_VIEW_QUERY_KEY = 'view';
export const SWITCH_OUT_MS = 360;
export const SWITCH_IN_MS = 420;
/* The toggle's anchor (R38 item 1, Oscar 2026-09-04 — supersedes the
   R35 baseline-of-FEATURED anchor): its right edge on the K's ink in
   WORK, its top 32 below the title's bottom ink — both derived from
   the font's measured metrics at boot and on resize; the CSS values
   are the pre-JS approximation. */
const TOGGLE_GAP_PX = 32; /* R38: the group's top below the title's bottom ink */
const GRID_START_GAP_PX = 80; /* R38 item 3: the first row below the toggle group's bottom */

/* R38 item 2 (Oscar, 2026-09-04): GRID is the default view; LIST is
   what the user switches to. The query wins on load (?view=list is
   the override now; ?view=grid still honoured), then the session's
   stored choice, then the default. Persisting mirrors it: list writes
   ?view=list, grid clears the key. */
export const WORK_VIEW_DEFAULT = 'grid';
const readInitialView = () => {
  const q = new URLSearchParams(window.location.search).get(WORK_VIEW_QUERY_KEY);
  if (q === 'grid' || q === 'list') return q;
  try {
    const stored = window.sessionStorage.getItem(WORK_VIEW_STORAGE_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch (e) { /* storage unavailable: the default */ }
  return WORK_VIEW_DEFAULT;
};

const persist = (view) => {
  try { window.sessionStorage.setItem(WORK_VIEW_STORAGE_KEY, view); } catch (e) { /* ignore */ }
  const url = new URL(window.location.href);
  if (view === WORK_VIEW_DEFAULT) url.searchParams.delete(WORK_VIEW_QUERY_KEY);
  else url.searchParams.set(WORK_VIEW_QUERY_KEY, view);
  window.history.replaceState(window.history.state, '', url);
};

export function initWorkView() {
  if (isMobileViewport()) return initWorkPage();

  const toggle = document.querySelector('[data-work-viewtoggle]');
  const buttons = Array.from(document.querySelectorAll('[data-work-view]')).filter((el) => el instanceof HTMLButtonElement);
  const live = document.querySelector('[data-work-view-live]');
  const stage = document.querySelector('[data-work-stage]');
  const grid = document.querySelector('[data-work-grid]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  const timeouts = [];
  let disposed = false;
  let view = readInitialView();
  let viewCleanup = () => {};
  let switching = false;

  const rootOf = (v) => (v === 'grid' ? grid : stage);

  const applyChrome = (v) => {
    document.body.classList.toggle('work-view-grid', v === 'grid');
    buttons.forEach((btn) => {
      const on = btn.dataset.workView === v;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  const boot = (v) => {
    applyChrome(v);
    viewCleanup = v === 'grid' ? initWorkGrid() : initWorkPage();
  };

  /* ── The toggle's vertical anchor (see TOGGLE_H_PX). */
  /* R38 item 1 (Oscar, 2026-09-04): the group's RIGHT edge sits on the
     K's INK in WORK and its TOP 32 below the title's bottom INK — the
     glyphs, not the boxes (the frame's 583 is the text box's right
     edge). Canvas metrics of the WORK line: its baseline from the line
     box (88) and the font's ascent/descent; the K's ink right =
     the line's left + actualBoundingBoxRight of "WORK"; the bottom ink
     = baseline + the caps' descent (0 for WORK). Re-derived on resize
     and after fonts. */
  const placeToggle = () => {
    if (!(toggle instanceof HTMLElement)) return;
    const hl = document.querySelector('[data-work-hl-work]');
    if (!(hl instanceof HTMLElement)) return;
    const cs = getComputedStyle(hl);
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(hl.textContent.trim());
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const asc = m.fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * 0.9;
    const desc = m.fontBoundingBoxDescent ?? parseFloat(cs.fontSize) * 0.2;
    const top = parseFloat(cs.top) || 208;
    const left = parseFloat(cs.left) || 291.8;
    const baseline = top + (lh - (asc + desc)) / 2 + asc;
    const inkBottom = baseline + (m.actualBoundingBoxDescent || 0);
    const inkRight = left + m.actualBoundingBoxRight;
    toggle.style.setProperty('--work-toggle-top', `${(inkBottom + TOGGLE_GAP_PX).toFixed(1)}px`);
    toggle.style.setProperty('--work-toggle-left', `${(inkRight - toggle.offsetWidth).toFixed(1)}px`);
    /* R38 item 3: the grid's first row begins GRID_START_GAP_PX below the
       toggle group's bottom — derived from the group's placed box, so
       the two rulings (the toggle's anchor, the grid's start) stay one
       chain. The grid reads it as its rows' padding-top. */
    if (grid instanceof HTMLElement) {
      const head = grid.querySelector('.work-grid__head');
      const headH = head instanceof HTMLElement ? head.offsetHeight : 296;
      const toggleBottom = inkBottom + TOGGLE_GAP_PX + toggle.offsetHeight;
      grid.style.setProperty('--work-grid-top', `${Math.max(0, toggleBottom + GRID_START_GAP_PX - headH).toFixed(1)}px`);
    }
    if (import.meta.env.DEV) window.__workToggle = { inkRight: +inkRight.toFixed(2), inkBottom: +inkBottom.toFixed(2), baseline: +baseline.toFixed(2), boxRight: +(left + m.width).toFixed(2) };
  };
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    placeToggle();
    /* the toggle enters with the header (the page's load beat) */
    if (toggle instanceof HTMLElement) toggle.classList.add('is-visible');
  });
  const onResize = () => placeToggle();
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ── The switch. */
  const announce = (v) => {
    if (live instanceof HTMLElement) live.textContent = v === 'grid' ? 'Grid view' : 'List view';
  };
  const wait = (ms) => new Promise((r) => timeouts.push(setTimeout(r, ms)));
  const switchTo = async (next) => {
    if (switching || next === view || (next !== 'grid' && next !== 'list')) return;
    switching = true;
    if (toggle instanceof HTMLElement) toggle.dataset.switching = '1';
    /* The list's footer is a fixed layer UNDER the stage: while either
       root fades, the compositor would show it through (measured: the
       bottom row peeking mid-switch). Veiled for the switch's length
       (work.css) — it is never part of the mid-page state anyway. */
    document.body.classList.add('work-switching');
    const out = rootOf(view);
    const incoming = rootOf(next);
    persist(next);
    announce(next);
    if (!reduced && out instanceof HTMLElement) {
      out.classList.add('is-view-out');
      await wait(SWITCH_OUT_MS);
      if (disposed) return;
    }
    /* TEARDOWN — everything the outgoing view registered. */
    viewCleanup();
    viewCleanup = () => {};
    out?.classList.remove('is-view-out');
    view = next;
    window.scrollTo(0, 0);
    /* BOOT the incoming view from its parked state. */
    if (!reduced && incoming instanceof HTMLElement) incoming.classList.add('is-view-in');
    boot(next);
    if (!reduced && incoming instanceof HTMLElement) {
      /* one frame parked, then the blur-fade in runs on the class change */
      await new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(r)));
      if (disposed) return;
      incoming.classList.remove('is-view-in');
      await wait(SWITCH_IN_MS);
    }
    if (toggle instanceof HTMLElement) delete toggle.dataset.switching;
    document.body.classList.remove('work-switching');
    switching = false;
  };

  const onToggleClick = (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-work-view]') : null;
    if (!(btn instanceof HTMLElement)) return;
    switchTo(btn.dataset.workView);
  };
  toggle?.addEventListener('click', onToggleClick);
  cleanups.push(() => toggle?.removeEventListener('click', onToggleClick));
  cleanups.push(() => timeouts.forEach(clearTimeout));

  /* The effective view persists for the session from the first boot
     too — a deep link (?view=grid) followed by in-site navigation
     comes back to the grid, as the brief's "survives navigation". */
  try { window.sessionStorage.setItem(WORK_VIEW_STORAGE_KEY, view); } catch (e) { /* ignore */ }
  boot(view);

  if (import.meta.env.DEV) {
    window.__workView = {
      view: () => view,
      switching: () => switching,
      switchTo,
    };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    viewCleanup();
    viewCleanup = () => {};
    document.body.classList.remove('work-view-grid', 'work-switching');
    if (import.meta.env.DEV) window.__workView = null;
  };
}
