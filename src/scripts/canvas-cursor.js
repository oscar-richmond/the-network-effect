/**
 * THE SITE CURSOR — one small round dot, everywhere.
 *
 * R42 (Oscar, 2026-09-04): the HOVER EXPANSION IS REMOVED. The dot used
 * to tween its radius ×3 (10 → 30) on every `a, button, [data-hover],
 * [data-cursor="expand"], [data-menu-toggle]`, wired per element on
 * boot. That tween, its per-element mouseenter/mouseleave listeners and
 * the `selector` / `hoverScale` options are gone: the dot is a constant
 * `radius` on every page and every element. The markup's [data-hover] /
 * [data-cursor="expand"] attributes are simply inert now (left in place
 * — they carry no other meaning and removing them would churn the
 * served DOM). The page-specific LABEL cursors are untouched and still
 * hide this dot while they run: VIEW CASE STUDY over /work tiles
 * (view-case-cursor.js) and ( VIEW GALLERY + ) over the case-study
 * stream (case-study.js).
 *
 * Unchanged: fixed full-viewport canvas at z9999, difference blend,
 * white fill, the lerped follow, `cursor: none` while active, and the
 * hover-capable + no-reduced-motion gate (touch and RM keep the system
 * cursor).
 */

/**
 * @param {number} a
 * @param {number} b
 * @param {number} n
 */
function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}

/**
 * @param {{
 *   radius?: number,
 *   followEase?: number,
 * }} [options]
 */
export function initCanvasCursor(options = {}) {
  const baseRadius = options.radius ?? 10;
  const followEase = options.followEase ?? 0.25;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (prefersReduced || !finePointer) return () => {};

  const canvas = document.querySelector('[data-canvas-cursor]');
  if (!(canvas instanceof HTMLCanvasElement)) return () => {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  document.documentElement.classList.add('canvas-cursor-active');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let mouseX = 0;
  let mouseY = 0;
  let rafId = 0;
  let disposed = false;

  const circle = {
    radius: baseRadius, /* R42: constant — nothing changes it */
    lastX: mouseX,
    lastY: mouseY,
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    mouseX = width / 2;
    mouseY = height / 2;
    circle.lastX = mouseX;
    circle.lastY = mouseY;
  };

  const render = () => {
    if (disposed) return;

    circle.lastX = lerp(circle.lastX, mouseX, followEase);
    circle.lastY = lerp(circle.lastY, mouseY, followEase);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(circle.lastX, circle.lastY, circle.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    rafId = requestAnimationFrame(render);
  };

  const onMouseMove = (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  resize();
  rafId = requestAnimationFrame(render);

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', resize);
    document.documentElement.classList.remove('canvas-cursor-active');
  };
}
