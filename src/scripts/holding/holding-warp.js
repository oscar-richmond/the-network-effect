import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';
import {
  createDriftDriver,
  AUTO_DRIFT_PX_PER_SEC,
} from './holding-shared.js';

gsap.registerPlugin(CustomEase);

/**
 * /holding-2's gallery variant (amended plan, supersedes the stacked
 * curve-media column): the Selected Works pillar images' Codrops
 * "shader on scroll" grain-displacement effect (wave-shader.js) on the
 * holding pages' shared drift driver. wave-shader.js itself is
 * UNTOUCHED — its shaders are ported verbatim here (its module can't be
 * reused directly: its hard (hover:hover) gate returns null on touch,
 * where this page must keep the velocity warp).
 *
 * THE EFFECT (both inputs, per the amendment):
 * - VELOCITY WARP: the vertex bow (sin arc, self-clamped at 5 px/frame)
 *   + the fragment's velocity share of the grain term, fed the SHAPED
 *   driver velocity below instead of Lenis.
 * - HOVER: the cursor-following grain circle — pointerenter/leave tween
 *   uMouseEnter over 0.6s on the reference's CustomEase, pointermove
 *   drives uMouseOverPos through the reference's 0.05 lerp, leave
 *   recentres. Gated (hover:hover)+(pointer:fine); touch gets velocity
 *   only; reduced motion never constructs this module (static stack).
 *
 * THE FEED (approved response-curve recalibration — anchored to THIS
 * effect's own constants, in its own px-per-frame units):
 *   vPf = |driver velocity|/60; excess = max(vPf - drift, 0)
 *   shaped = sign * (WARP_IDLE_FLOOR * WARP_VERTEX_FULL_PX_FRAME
 *                    + excess * smoothstep(excess / rampSpan))
 *   clamped to +/- WARP_MAX_PX_FRAME.
 * At pure drift: 0.25 px/frame -> bow ~0.25% of image height (~0.8px)
 * and grain at 2.5% of hover strength — the calm whisper, never dead.
 * At a full 3000px/s fling: the vertex clamps to its full bow and the
 * fragment term caps at exactly hover strength (1.0).
 *
 * NO FOLD: /holding-2's images travel flat — this module has no fold
 * mapping at all (that's the A/B against /holding's curl).
 *
 * LAYOUT (per the amendment): uniform width (= /holding's column
 * fraction), each slide at its NATIVE ratio -> mixed heights, with
 * /holding's gap value (gap fraction x item height). Wrap recycles
 * against the full column height: per-item slots by prefix sum,
 * loop = sum(slots), INTEGER wrap counts x the current loop (the
 * resize-safe invariant carried from the fold gallery). NOTE: the
 * current HP Carousel set is uniformly 480x550, so today's "mixed"
 * heights are equal — the maths are ratio-driven and mixed sets flow
 * in with no code change (reported).
 */

/** Fixed column width, CSS px (Oscar's HPG-set spec — supersedes the
 * region-fraction sizing AND the +height forced crop: every image
 * renders at exactly this width at its NATIVE aspect ratio, no forced
 * ratio, zero crop). Capped to a region fraction below so the tablet
 * band / phone strip never overflow. */
const COLUMN_WIDTH_PX = 405;
const COLUMN_MAX_WIDTH_FRACTION = 0.8;
/** Inter-image gap, fixed px (Oscar's spec — was /holding's 0.14 x
 * height ~ 47px at desktop, then 32). */
const GAP_PX = 24;
/** Strip-safety cap on item height (short wide regions). */
const ITEM_MAX_HEIGHT_FRACTION = 0.62;
/** Fallback ratio before natural dims are known — the HPG set. */
const DEFAULT_ASPECT = 800 / 534;

/** Feed shaping (see module header). Full scale anchors to the vertex
 * shader's own clamp (5 px/frame). */
const WARP_VERTEX_FULL_PX_FRAME = 5;
const WARP_IDLE_FLOOR = 0.05;
const WARP_RAMP_PX_S = 300;
const WARP_MAX_PX_FRAME = 10;
/** px/s -> the shader's Lenis-style px-per-frame convention. */
const PX_S_TO_PX_FRAME = 1 / 60;

/** wave-shader.js constants, verbatim. */
const HOVER_DURATION = 0.6;
const HOVER_EASE = CustomEase.create('holdingWarpHover', '0.4, 0, 0.2, 1');
const CURSOR_LERP = 0.05;
const VELOCITY_EDGE_RAMP = 0.25;
const GEOMETRY_SEGMENTS = 100;

// wave-shader.js's shaders, verbatim (themselves the Codrops reference's
// effectVertex/effectFragment ported GLSL3->GLSL1 — see that module's
// header for provenance and the uVelocityRamp deviation).
const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uScrollVelocity;
  uniform float uVelocityRamp;
  uniform vec2 uTextureSize;
  uniform vec2 uQuadSize;

  varying vec2 vUv;
  varying vec2 vUvCover;

  float PI = 3.141592653589793;

  vec2 getCoverUvVert(vec2 uv, vec2 textureSize, vec2 quadSize) {
    vec2 ratio = vec2(
      min((quadSize.x / quadSize.y) / (textureSize.x / textureSize.y), 1.0),
      min((quadSize.y / quadSize.x) / (textureSize.y / textureSize.x), 1.0)
    );

    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  vec3 deformationCurve(vec3 position, vec2 uv) {
    position.y = position.y - (sin(uv.x * PI) * min(abs(uScrollVelocity), 5.0) * uVelocityRamp * sign(uScrollVelocity) * -0.01);

    return position;
  }

  void main() {
    vUv = uv;
    vUvCover = getCoverUvVert(uv, uTextureSize, uQuadSize);

    vec3 deformedPosition = deformationCurve(position, vUvCover);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uScrollVelocity;
  uniform sampler2D uTexture;
  uniform vec2 uTextureSize;
  uniform vec2 uQuadSize;
  uniform float uMouseEnter;
  uniform vec2 uMouseOverPos;

  varying vec2 vUv;
  varying vec2 vUvCover;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+10.0)*x);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 texCoords = vUvCover;

    float aspectRatio = uQuadSize.y / uQuadSize.x;

    float circle = 1.0 - distance(
      vec2(uMouseOverPos.x, (1.0 - uMouseOverPos.y) * aspectRatio),
      vec2(vUv.x, vUv.y * aspectRatio)
    ) * 15.0;

    float noise = snoise(gl_FragCoord.xy);

    texCoords.x += mix(0.0, circle * noise * 0.01, uMouseEnter + uScrollVelocity * 0.1);
    texCoords.y += mix(0.0, circle * noise * 0.01, uMouseEnter + uScrollVelocity * 0.1);

    vec3 col = texture2D(uTexture, texCoords).rgb;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function smoothstep01(t) {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

/**
 * @param {HTMLElement} region
 * @param {string[]} imageUrls
 * @returns {{ ready: Promise<void>, resize: () => void,
 *   tickOnce: (dtMs?: number) => void, debugState: () => object,
 *   destroy: () => void } | null}
 */
export function createHoldingWarp(region, imageUrls) {
  if (!(region instanceof HTMLElement)) return null;
  const slides = Array.from(region.querySelectorAll('[data-holding-warp-slide]')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (slides.length < 2 || imageUrls.length < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'holding-warp__gl';
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try {
    renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
  } catch (error) {
    console.warn('[holding-warp] WebGL renderer failed — DOM slide stack stays.', error);
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
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const states = slides.map((slideEl, i) => {
    const imgEl = slideEl.querySelector('img');
    const texture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });
    const program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      transparent: false,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTexture: { value: texture },
        uTextureSize: { value: [480, 550] },
        uQuadSize: { value: [1, 1] },
        uMouseEnter: { value: 0 },
        uMouseOverPos: { value: [0.5, 0.5] },
        uScrollVelocity: { value: 0 },
        uVelocityRamp: { value: 0 },
      },
      cullFace: false,
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.renderOrder = i;
    mesh.setParent(scene);
    mesh.visible = false;

    const state = {
      slideEl,
      imgEl,
      program,
      mesh,
      aspect: DEFAULT_ASPECT,
      ready: false,
      // wave-shader's persistent per-item hover state, verbatim.
      mouseEnter: { value: 0 },
      mouseOverPos: { current: { x: 0.5, y: 0.5 }, target: { x: 0.5, y: 0.5 } },
      wraps: 0,
      y: 0,
      heightPx: 1,
      offsetPx: 0,
      /** Flash-window pattern: the DOM img hides only AFTER its plane
       * has actually been RENDERED visible once (set post-render in
       * syncPlanes) — hiding at texture decode raced the next canvas
       * frame (unbounded in a stalled-rAF background-tab load) and
       * could expose a blank slide. JS only ever reveals; the hide is
       * strictly cover-then-hide. */
      imgHidden: false,
    };

    state.readyPromise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        texture.image = image;
        program.uniforms.uTextureSize.value = [image.naturalWidth, image.naturalHeight];
        state.aspect = image.naturalWidth / Math.max(image.naturalHeight, 1);
        state.ready = true;
        resolve();
      };
      image.onerror = () => resolve();
      image.src = imageUrls[i] ?? (imgEl?.currentSrc || imgEl?.src || '');
    });

    return state;
  });

  // Hover — ported handler-for-handler from wave-shader.js, attached to
  // the slide element (static across the module's life). House-gated;
  // touch devices get the velocity warp only.
  if (hoverCapable) {
    states.forEach((state) => {
      state.slideEl.addEventListener(
        'pointerenter',
        () => {
          gsap.to(state.mouseEnter, {
            value: 1,
            duration: HOVER_DURATION,
            ease: HOVER_EASE,
            overwrite: 'auto',
          });
        },
        { signal: listenerAbort.signal },
      );
      state.slideEl.addEventListener(
        'pointermove',
        (event) => {
          const rect = state.slideEl.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return;
          state.mouseOverPos.target.x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
          state.mouseOverPos.target.y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
        },
        { signal: listenerAbort.signal },
      );
      state.slideEl.addEventListener(
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
  }

  // ── Layout: uniform width, native ratios, prefix-sum slots. ──────────
  let regionSize = { width: 1, height: 1 };
  let viewport = { width: 1, height: 1 };
  let loopPx = 1;
  let maxSlotPx = 1;
  let columnWidthPx = COLUMN_WIDTH_PX;

  const layout = () => {
    const rect = region.getBoundingClientRect();
    regionSize = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    renderer.setSize(regionSize.width, regionSize.height);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = camera.fov * (Math.PI / 180);
    const vh = 2 * Math.tan(fov / 2) * camera.position.z;
    viewport = { width: vh * camera.aspect, height: vh };

    columnWidthPx = Math.min(COLUMN_WIDTH_PX, regionSize.width * COLUMN_MAX_WIDTH_FRACTION);
    const maxH = regionSize.height * ITEM_MAX_HEIGHT_FRACTION;
    let offset = 0;
    maxSlotPx = 1;
    states.forEach((state) => {
      // Native ratio at the fixed column width — no forced ratio, zero
      // crop (the strip-safety height cap only bites on short regions).
      const h = Math.min(columnWidthPx / state.aspect, maxH);
      state.heightPx = h;
      state.offsetPx = offset;
      const slot = h + GAP_PX;
      offset += slot;
      if (slot > maxSlotPx) maxSlotPx = slot;
      state.slideEl.style.position = 'absolute';
      state.slideEl.style.left = '50%';
      state.slideEl.style.top = '0';
      state.slideEl.style.width = `${columnWidthPx}px`;
      state.slideEl.style.height = `${h}px`;
    });
    loopPx = offset; // the full column height — the recycling modulo
  };

  /** Mixed-height wrap: virtual y is region-centre-origin, positive up;
   * per-item base = -prefix-sum offset; INTEGER wraps x the CURRENT
   * loop (resize-safe, the fold gallery's invariant). Band margin from
   * the largest slot. */
  const placeSlides = (travelPx, dirSign) => {
    const band = regionSize.height / 2 + maxSlotPx / 2;
    states.forEach((state) => {
      const half = state.heightPx / 2;
      let y = -state.offsetPx + travelPx + state.wraps * loopPx;
      if (dirSign > 0 && y - half > band) {
        state.wraps -= 1;
        y = -state.offsetPx + travelPx + state.wraps * loopPx;
      } else if (dirSign < 0 && y + half < -band) {
        state.wraps += 1;
        y = -state.offsetPx + travelPx + state.wraps * loopPx;
      }
      state.y = y;
      const top = regionSize.height / 2 - y - half;
      state.slideEl.style.transform = `translate3d(-50%, ${top}px, 0)`;
    });
  };

  // ── The shaped feed + per-frame uniform writes. ───────────────────────
  let warpPxFrame = 0;

  const syncPlanes = () => {
    states.forEach((state) => {
      if (!state.ready) {
        state.mesh.visible = false;
        return;
      }
      const half = state.heightPx / 2;
      const topPx = regionSize.height / 2 - state.y - half;
      // Region cull (wave-shader's backstop, in our own coordinates).
      if (topPx + state.heightPx < 0 || topPx > regionSize.height) {
        state.mesh.visible = false;
        return;
      }
      state.mesh.visible = true;

      state.mesh.position.x = 0;
      state.mesh.position.y = (state.y / regionSize.height) * viewport.height;
      state.mesh.scale.x = (columnWidthPx / regionSize.width) * viewport.width;
      state.mesh.scale.y = (state.heightPx / regionSize.height) * viewport.height;
      state.program.uniforms.uQuadSize.value = [columnWidthPx, state.heightPx];

      // wave-shader's viewport-entry ramp, against the region: the bow
      // only grows once the image genuinely overlaps the region.
      const overlap =
        Math.min(topPx + state.heightPx, regionSize.height) - Math.max(topPx, 0);
      state.program.uniforms.uVelocityRamp.value = Math.min(
        Math.max(overlap / (state.heightPx * VELOCITY_EDGE_RAMP), 0),
        1,
      );

      state.program.uniforms.uScrollVelocity.value = warpPxFrame;

      // The reference's damped in-frame cursor (lerp 0.05).
      const pos = state.mouseOverPos;
      pos.current.x += (pos.target.x - pos.current.x) * CURSOR_LERP;
      pos.current.y += (pos.target.y - pos.current.y) * CURSOR_LERP;
      state.program.uniforms.uMouseOverPos.value = [pos.current.x, pos.current.y];
      state.program.uniforms.uMouseEnter.value = state.mouseEnter.value;
    });
    renderer.render({ scene, camera });

    // Cover-then-hide (see imgHidden's note): only after this frame has
    // actually painted a plane does its DOM img hand over.
    states.forEach((state) => {
      if (!state.imgHidden && state.mesh.visible) {
        state.imgHidden = true;
        if (state.imgEl instanceof HTMLElement) state.imgEl.style.visibility = 'hidden';
      }
    });
  };

  const onFrame = (travelPx, dirSign) => {
    placeSlides(travelPx, dirSign);
    const v = driver.state().velocity;
    const sign = v < 0 ? -1 : 1;
    const vPf = Math.abs(v) * PX_S_TO_PX_FRAME;
    const excessPf = Math.max(vPf - AUTO_DRIFT_PX_PER_SEC * PX_S_TO_PX_FRAME, 0);
    const ramp = smoothstep01(excessPf / (WARP_RAMP_PX_S * PX_S_TO_PX_FRAME));
    const shaped = WARP_IDLE_FLOOR * WARP_VERTEX_FULL_PX_FRAME + excessPf * ramp;
    warpPxFrame = sign * Math.min(shaped, WARP_MAX_PX_FRAME);
    syncPlanes();
  };

  const driver = createDriftDriver(region, { onFrame });

  const onResize = () => {
    layout();
    placeSlides(driver.state().travelPx, 1);
    syncPlanes();
  };
  window.addEventListener('resize', onResize);

  layout();
  region.appendChild(canvas);
  // Position immediately — the occluded-tab environment has no rAF, and
  // the static CSS stack must hand over without a first-frame jump.
  placeSlides(0, 1);

  return {
    ready: Promise.all(states.map((s) => s.readyPromise)).then(() => {}),
    resize: onResize,
    /** One synchronous integrate+frame — verification hook. */
    tickOnce(dtMs = 16.7) {
      driver.tickOnce(dtMs);
    },
    debugState() {
      return {
        ...driver.state(),
        warpPxFrame,
        loopPx,
        regionSize: { ...regionSize },
        hoverCapable,
        slides: states.map((s) => ({
          y: +s.y.toFixed(3),
          wraps: s.wraps,
          heightPx: +s.heightPx.toFixed(2),
          ready: s.ready,
          uMouseEnter: +s.program.uniforms.uMouseEnter.value.toFixed(3),
          uScrollVelocity: +s.program.uniforms.uScrollVelocity.value.toFixed(4),
          uVelocityRamp: +s.program.uniforms.uVelocityRamp.value.toFixed(3),
        })),
      };
    },
    destroy() {
      driver.destroy();
      listenerAbort.abort();
      window.removeEventListener('resize', onResize);
      states.forEach((state) => {
        gsap.killTweensOf(state.mouseEnter);
        gsap.killTweensOf(state.mouseOverPos.target);
        state.mesh.setParent(null);
        state.program.remove();
        if (state.imgEl instanceof HTMLElement) state.imgEl.style.visibility = '';
        state.slideEl.style.position = '';
        state.slideEl.style.left = '';
        state.slideEl.style.top = '';
        state.slideEl.style.width = '';
        state.slideEl.style.height = '';
        state.slideEl.style.transform = '';
      });
      geometry.remove();
      canvas.remove();
    },
  };
}
