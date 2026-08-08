/**
 * /services HERO — wave media shader (Oscar's rev 2026-08-08): the
 * WE CREATE ACCESS columns' treatment ported onto the hero's four
 * travelling images — the SAME shader pair (velocity vertical bow
 * in the vertex, cursor-following simplex-noise grain overlay in
 * the fragment, opaque output, colours true), same texture config,
 * same mount/unmount window, same feel constants — all imported
 * from access-wave.js (exported there for this port, behaviour
 * unchanged on /landing).
 *
 * ADAPTATIONS (everything else carried verbatim):
 * - VELOCITY PER ITEM: the access build differentiates per-COLUMN
 *   travel; here each plane's uScrollVelocity is its item's own
 *   composed travel delta — speed multiplier × the base track
 *   delta per tick (the hero scrub's parent+child transforms
 *   compose to exactly speed × base, so the differentiated feed
 *   matches what the eye sees per image).
 * - ONE stage-scoped static canvas (between the track and the
 *   difference text wrap in paint order; pointer-events none so
 *   the item frames beneath keep the hover grain events). Planes
 *   track live frame rects per tick — canvas-relative maths, the
 *   sticky-stage rule from the access build.
 * - Gate: the house hover rule + ?forcehover escape (identical to
 *   the access build — Oscar's machine misreports hover:hover).
 *   No gate / no GL → null; the caller keeps plain DOM images.
 */
import gsap from 'gsap';
import { Renderer, Camera, Transform, Plane } from 'ogl';
import {
  WavePlane,
  HOVER_DURATION,
  HOVER_EASE,
  CURSOR_LERP,
  MOUNT_MARGIN_PX,
  VELOCITY_EDGE_RAMP,
  VELOCITY_SMOOTHING,
  GEOMETRY_SEGMENTS,
} from './access-wave.js';

/**
 * @param {HTMLElement} stage the hero's sticky stage
 * @param {HTMLCanvasElement} canvas the hero's shader canvas
 * @param {{ imgEl: HTMLImageElement, frameEl: HTMLElement, speed: number }[]} items
 * @param {() => number} getTravel the base track travel in px (the
 *   hero scrub's -y); the module differentiates per tick and scales
 *   by each item's speed multiplier.
 * @returns {{ resize: () => void, tickOnce: () => void, debugState: () => object, destroy: () => void } | null}
 */
export function createServicesHeroWave(stage, canvas, items, getTravel) {
  const canHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');
  if (!canHover) return null;

  let renderer;
  try {
    renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
  } catch (error) {
    console.warn('[services-hero-wave] WebGL renderer failed — falling back to plain images.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;

  const scene = new Transform();
  const geometry = new Plane(gl, {
    widthSegments: GEOMETRY_SEGMENTS,
    heightSegments: GEOMETRY_SEGMENTS,
  });

  const listenerAbort = new AbortController();

  const itemStates = items
    .map(({ imgEl, frameEl, speed }, i) => {
      if (!(imgEl instanceof HTMLImageElement) || !(frameEl instanceof HTMLElement)) return null;
      return {
        imgEl,
        frameEl,
        speed,
        velocity: 0,
        plane: null,
        mouseEnter: { value: 0 },
        mouseOverPos: {
          current: { x: 0.5, y: 0.5 },
          target: { x: 0.5, y: 0.5 },
        },
        edgeFactor: 0,
        renderOrder: i,
      };
    })
    .filter((s) => s !== null);

  const src = (imgEl) => imgEl.currentSrc || imgEl.src;

  const mount = (state) => {
    if (state.plane) return;
    state.plane = new WavePlane(gl, geometry, scene, {
      src: src(state.imgEl),
      renderOrder: state.renderOrder,
    });
    const mountedPlane = state.plane;
    state.plane.readyPromise.then(() => {
      if (state.plane === mountedPlane) state.imgEl.style.visibility = 'hidden';
    });
  };

  const unmount = (state) => {
    if (!state.plane) return;
    state.plane.destroy();
    state.plane = null;
    state.imgEl.style.visibility = '';
  };

  const isNear = (rect) =>
    rect.right > -MOUNT_MARGIN_PX &&
    rect.left < window.innerWidth + MOUNT_MARGIN_PX &&
    rect.bottom > -MOUNT_MARGIN_PX &&
    rect.top < window.innerHeight + MOUNT_MARGIN_PX;

  itemStates.forEach((state) => {
    state.frameEl.addEventListener(
      'pointerenter',
      () => {
        mount(state);
        gsap.to(state.mouseEnter, {
          value: 1,
          duration: HOVER_DURATION,
          ease: HOVER_EASE,
          overwrite: 'auto',
        });
      },
      { signal: listenerAbort.signal },
    );
    state.frameEl.addEventListener(
      'pointermove',
      (event) => {
        const rect = state.frameEl.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        state.mouseOverPos.target.x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        state.mouseOverPos.target.y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      },
      { signal: listenerAbort.signal },
    );
    state.frameEl.addEventListener(
      'pointerleave',
      () => {
        gsap.to(state.mouseEnter, {
          value: 0,
          duration: HOVER_DURATION,
          ease: HOVER_EASE,
          overwrite: 'auto',
        });
        gsap.to(state.mouseOverPos.target, {
          x: 0.5,
          y: 0.5,
          duration: HOVER_DURATION,
          ease: HOVER_EASE,
          overwrite: 'auto',
        });
      },
      { signal: listenerAbort.signal },
    );
  });

  let viewport = { width: 1, height: 1 };

  const resize = () => {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = camera.fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * camera.position.z;
    const width = height * camera.aspect;
    viewport = { width, height };
  };

  let disposed = false;
  let lastTravel = getTravel();

  const lerp = (start, end, damping) => start * (1 - damping) + end * damping;

  const tick = () => {
    if (disposed) return;

    /* Per-item velocity: the base track delta scaled by the item's
       composed speed — the same Lenis px-per-frame family as the
       access columns; all items travel UP on scroll-down (positive
       feed), each bowing per its own pace. */
    const travel = getTravel();
    const baseDelta = travel - lastTravel;
    lastTravel = travel;

    const canvasRect = canvas.getBoundingClientRect();

    itemStates.forEach((state) => {
      state.velocity = lerp(state.velocity, state.speed * baseDelta, VELOCITY_SMOOTHING);
      const rect = state.frameEl.getBoundingClientRect();
      const near = isNear(rect);
      if (near) mount(state);
      else unmount(state);

      if (state.plane) {
        state.mouseOverPos.current.x = lerp(state.mouseOverPos.current.x, state.mouseOverPos.target.x, CURSOR_LERP);
        state.mouseOverPos.current.y = lerp(state.mouseOverPos.current.y, state.mouseOverPos.target.y, CURSOR_LERP);

        state.plane.program.uniforms.uMouseEnter.value = state.mouseEnter.value;
        state.plane.program.uniforms.uMouseOverPos.value = [
          state.mouseOverPos.current.x,
          state.mouseOverPos.current.y,
        ];
        const overlap = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const ramp = rect.height * VELOCITY_EDGE_RAMP;
        state.edgeFactor = ramp > 0 ? Math.min(Math.max(overlap / ramp, 0), 1) : 1;
        state.plane.program.uniforms.uScrollVelocity.value = state.velocity;
        state.plane.program.uniforms.uVelocityRamp.value = state.edgeFactor;
        state.plane.update(rect, canvasRect, viewport);
      }
    });

    renderer.render({ scene, camera });
  };

  resize();
  gsap.ticker.add(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    resize,
    tickOnce() {
      if (disposed) return;
      tick();
    },
    debugState() {
      return {
        disposed,
        items: itemStates.map((state) => ({
          speed: state.speed,
          velocity: state.velocity,
          mounted: Boolean(state.plane),
          ready: Boolean(state.plane?.ready),
          meshVisible: Boolean(state.plane?.mesh.visible),
          edgeFactor: state.edgeFactor,
          imgHidden: state.imgEl.style.visibility === 'hidden',
        })),
      };
    },
    destroy() {
      disposed = true;
      gsap.ticker.remove(tick);
      listenerAbort.abort();
      window.removeEventListener('resize', onResize);
      itemStates.forEach((state) => {
        gsap.killTweensOf(state.mouseEnter);
        gsap.killTweensOf(state.mouseOverPos.target);
        unmount(state);
      });
      geometry.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
