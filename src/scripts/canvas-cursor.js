import gsap from 'gsap';

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
 *   selector?: string,
 *   radius?: number,
 *   hoverScale?: number,
 *   followEase?: number,
 * }} [options]
 */
export function initCanvasCursor(options = {}) {
  const hoverSelector =
    options.selector ?? 'a, button, [data-hover], [data-cursor="expand"], [data-menu-toggle]';
  const baseRadius = options.radius ?? 10;
  const hoverScale = options.hoverScale ?? 3;
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
    radius: baseRadius,
    lastX: mouseX,
    lastY: mouseY,
  };

  /** @type {HTMLElement[]} */
  const hoverTargets = [];
  /** @type {Map<HTMLElement, { enter: () => void, leave: () => void }>} */
  const hoverHandlers = new Map();

  const hoverTween = gsap.to(circle, {
    radius: baseRadius * hoverScale,
    duration: 0.25,
    ease: 'power1.inOut',
    paused: true,
  });

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

  const bindHoverTargets = () => {
    hoverHandlers.forEach((handlers, el) => {
      el.removeEventListener('mouseenter', handlers.enter);
      el.removeEventListener('mouseleave', handlers.leave);
    });
    hoverHandlers.clear();
    hoverTargets.length = 0;

    document.querySelectorAll(hoverSelector).forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      hoverTargets.push(el);

      const enter = () => {
        hoverTween.play();
      };
      const leave = () => {
        hoverTween.reverse();
      };

      hoverHandlers.set(el, { enter, leave });
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });
  };

  resize();
  bindHoverTargets();
  rafId = requestAnimationFrame(render);

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', resize);
    hoverHandlers.forEach((handlers, el) => {
      el.removeEventListener('mouseenter', handlers.enter);
      el.removeEventListener('mouseleave', handlers.leave);
    });
    hoverHandlers.clear();
    hoverTween.kill();
    document.documentElement.classList.remove('canvas-cursor-active');
  };
}
