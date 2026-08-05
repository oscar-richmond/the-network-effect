/**
 * WE CREATE ACCESS — column media shader (/landing).
 *
 * THE LATEST WARP (Oscar's direction): the about-3 pillar-wave
 * treatment (src/scripts/about-3/wave-shader.js — the Codrops
 * "shader on scroll" effect, MIT, Jan Kohlbach) ported onto the
 * access columns, REPLACING the old curve-media warp here. Same
 * shader pair verbatim (velocity vertical bow in the vertex,
 * cursor-following simplex-noise grain in the fragment, opaque
 * vec4(col, 1.0) output — no alpha/focus dim, colours true), same
 * texture config, same mount/unmount window, same entry ramp.
 *
 * ADAPTATIONS for this section (everything else carried verbatim):
 * - VELOCITY PER COLUMN: the reference reads the site Lenis
 *   velocity; here each plane's uScrollVelocity is its COLUMN's own
 *   travel delta per tick (differentiated from the shared progress
 *   feed), so the left column (travelling up) and right column
 *   (travelling down) bow in opposite directions, exactly as their
 *   motion demands.
 * - ONE stage-scoped canvas for both columns (z2 — above the image
 *   columns, below the veils/words; see landing.css). The canvas is
 *   STATIC: planes track live frame rects per tick, so both the
 *   entrance slide (wrapper transforms) and the scroll travel land
 *   on the planes with zero extra wiring. Because the stage is
 *   sticky (not fixed), plane maths are CANVAS-RELATIVE (per-tick
 *   canvas rect), not window-relative.
 * - No hover overlay text, no calm()/setPaused() (no detail-view
 *   freeze here); tickOnce()/debugState() kept for verification.
 * - Gate: house hover rule + the ?forcehover escape (Oscar's
 *   machine reports hover:hover false system-wide). No-gate/no-GL →
 *   null, caller keeps plain DOM images.
 */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

gsap.registerPlugin(CustomEase);

const HOVER_DURATION = 0.6;
const HOVER_EASE = CustomEase.create('accessWaveHover', '0.4, 0, 0.2, 1');
const CURSOR_LERP = 0.05;
const MOUNT_MARGIN_PX = 400;
const VELOCITY_EDGE_RAMP = 0.25;
const GEOMETRY_SEGMENTS = 100;

/* Shader pair — wave-shader.js verbatim (see its header for the full
 * provenance notes: cover UVs from the reference's utils.glsl, snoise
 * from Ashima/stegu webgl-noise, uVelocityRamp = the entry-warp fix). */
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

class WavePlane {
  constructor(gl, geometry, scene, { src, renderOrder }) {
    const texture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      transparent: false,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTexture: { value: texture },
        uTextureSize: { value: [1, 1] },
        uQuadSize: { value: [1, 1] },
        uMouseEnter: { value: 0 },
        uMouseOverPos: { value: [0.5, 0.5] },
        uScrollVelocity: { value: 0 },
        uVelocityRamp: { value: 0 },
      },
      cullFace: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    this.mesh.renderOrder = renderOrder;
    this.mesh.setParent(scene);
    this.mesh.visible = false;

    this.ready = false;
    this.readyPromise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        texture.image = image;
        this.program.uniforms.uTextureSize.value = [image.naturalWidth, image.naturalHeight];
        this.ready = true;
        resolve();
      };
      image.src = src;
    });
  }

  /** Canvas-relative (the stage is sticky, not fixed — window coords
   *  only match while pinned). Cull stays window-relative. */
  update(rect, canvasRect, viewport) {
    if (rect.width < 1 || rect.height < 1 || !this.ready) {
      this.mesh.visible = false;
      return;
    }
    const onScreen =
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth;
    if (!onScreen) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    const cx = rect.left + rect.width / 2 - canvasRect.left - canvasRect.width / 2;
    const cy = rect.top + rect.height / 2 - canvasRect.top - canvasRect.height / 2;

    this.mesh.position.x = (viewport.width * cx) / canvasRect.width;
    this.mesh.position.y = -((viewport.height * cy) / canvasRect.height);

    this.mesh.scale.x = (viewport.width * rect.width) / canvasRect.width;
    this.mesh.scale.y = (viewport.height * rect.height) / canvasRect.height;
    this.program.uniforms.uQuadSize.value = [rect.width, rect.height];
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
  }
}

/**
 * @param {HTMLElement} stage the access stage
 * @param {HTMLCanvasElement} canvas the section's shader canvas (z2)
 * @param {{ left: HTMLImageElement[], right: HTMLImageElement[] }} sides
 * @param {() => { left: number, right: number }} getPositions per-column
 *   virtual travel in px (the shared-progress feed); the module
 *   differentiates per tick into Lenis-family px/frame velocities.
 * @returns {{ resize: () => void, tickOnce: () => void, debugState: () => object, destroy: () => void } | null}
 */
export function createAccessWave(stage, canvas, sides, getPositions) {
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
    console.warn('[access-wave] WebGL renderer failed — falling back to plain images.', error);
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

  const itemStates = ['left', 'right'].flatMap((side) =>
    sides[side].map((imgEl, i) => {
      const frameEl = imgEl.closest('.landing-access__item');
      if (!(frameEl instanceof HTMLElement)) return null;
      return {
        side,
        imgEl,
        frameEl,
        plane: null,
        mouseEnter: { value: 0 },
        mouseOverPos: {
          current: { x: 0.5, y: 0.5 },
          target: { x: 0.5, y: 0.5 },
        },
        edgeFactor: 0,
        renderOrder: i,
      };
    }),
  ).filter((s) => s !== null);

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
  const lastPositions = { ...getPositions() };
  const velocities = { left: 0, right: 0 };

  const lerp = (start, end, damping) => start * (1 - damping) + end * damping;

  const tick = () => {
    if (disposed) return;

    /* Per-column velocity: the travel delta since last tick, in the
       reference's Lenis px-per-frame family. Left rises on scroll
       (positive feed), right falls (negative) — opposite bows. */
    const positions = getPositions();
    velocities.left = positions.left - lastPositions.left;
    velocities.right = positions.right - lastPositions.right;
    lastPositions.left = positions.left;
    lastPositions.right = positions.right;

    const canvasRect = canvas.getBoundingClientRect();

    itemStates.forEach((state) => {
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
        state.plane.program.uniforms.uScrollVelocity.value = velocities[state.side];
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
        velocities: { ...velocities },
        items: itemStates.map((state) => ({
          side: state.side,
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
