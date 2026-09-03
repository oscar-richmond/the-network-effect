/**
 * [ VIEW CASE STUDY + ] CURSOR — extracted from work-page.js so
 * /work and the landing page's FEATURED WORK carousel share one
 * implementation (Oscar's rev: the landing carousel must read
 * exactly like /work, including the dot-to-text handoff).
 *
 * THE SHAPE (unchanged from the original): ONE top-level fixed
 * element that carries mix-blend-mode: difference ITSELF — a
 * wrapper would isolate the blend — following the pointer on
 * left/top (never transform, which would create a stacking context
 * on the blend root) at the canvas-cursor lerp. The site's own dot
 * cursor hides while this is live.
 *
 * Gated on (hover: hover) and (pointer: fine). NOTE, standing: that
 * query reads FALSE system-wide on Oscar's machine, so a dead
 * cursor there is not necessarily a bug — verify on another device.
 *
 * DOCUMENT-level pointerover is the hover signal, not a
 * stage-scoped over/out pair: the old pair fed the OUT event's
 * target (the tile being LEFT) into the same hit test, so exiting a
 * tile toward the footer still read as "over a tile".
 */

/** The canvas-cursor feel. */
export const CURSOR_LERP = 0.25;

/**
 * @param {{ cursorEl: Element|null, linkSelector: string, reduced?: boolean }} opts
 * @returns {() => void} cleanup
 */
export function initViewCaseCursor(opts = {}) {
  const { cursorEl, linkSelector, reduced = false } = opts;
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduced || !fineHover || !(cursorEl instanceof HTMLElement) || !linkSelector) {
    return () => {};
  }

  document.documentElement.classList.add('work-cursor-on');
  document.body.classList.add('work-cursor-on');
  /* R35: live-instance count for the /work view-switch harness (a
     torn-down view must leave exactly the incoming view's instance). */
  if (import.meta.env.DEV) window.__viewCaseCursorCount = (window.__viewCaseCursorCount || 0) + 1;

  /* Centre on the pointer WITHOUT transform (blend root): the
     measured half-extent becomes a static margin. */
  const centre = () => {
    cursorEl.style.marginLeft = `${(-cursorEl.offsetWidth / 2).toFixed(1)}px`;
    cursorEl.style.marginTop = `${(-cursorEl.offsetHeight / 2).toFixed(1)}px`;
  };
  (document.fonts?.ready ?? Promise.resolve()).then(centre);

  let cx = -200;
  let cy = -200;
  let tx = -200;
  let ty = -200;
  let over = false;
  let raf = 0;

  const tick = () => {
    cx += (tx - cx) * CURSOR_LERP;
    cy += (ty - cy) * CURSOR_LERP;
    cursorEl.style.left = `${cx.toFixed(1)}px`;
    cursorEl.style.top = `${cy.toFixed(1)}px`;
    raf = window.requestAnimationFrame(tick);
  };

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
  };

  const setOver = (nowOver) => {
    if (nowOver === over) return;
    over = nowOver;
    if (over) {
      cx = tx;
      cy = ty;
      cursorEl.classList.add('is-active');
      document.documentElement.classList.add('work-cursor-live');
      if (!raf) raf = window.requestAnimationFrame(tick);
    } else {
      cursorEl.classList.remove('is-active');
      document.documentElement.classList.remove('work-cursor-live');
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const onOver = (e) => {
    setOver(e.target instanceof Element && !!e.target.closest(linkSelector));
  };
  const onDocLeave = () => setOver(false);

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver);
  document.documentElement.addEventListener('pointerleave', onDocLeave);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.documentElement.removeEventListener('pointerleave', onDocLeave);
    window.cancelAnimationFrame(raf);
    document.documentElement.classList.remove('work-cursor-on', 'work-cursor-live');
    document.body.classList.remove('work-cursor-on');
    if (import.meta.env.DEV) window.__viewCaseCursorCount = Math.max(0, (window.__viewCaseCursorCount || 1) - 1);
  };
}
