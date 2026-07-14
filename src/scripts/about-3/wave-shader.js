import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';
import { getScrollVelocity } from './about-scroll.js';

gsap.registerPlugin(CustomEase);

/**
 * /about-3 pillar-wave shader — the Codrops "shader on scroll" effect
 * (src/_reference/codrops-shader-on-scroll/, MIT, Jan Kohlbach) on the
 * three pillar waves' images: a scroll-velocity vertical bow (vertex)
 * plus a cursor-following, per-pixel-noise UV displacement — the grain —
 * driven by hover and velocity (fragment). At rest both terms are
 * exactly 0: a resting wave image is a plain sharp cover crop, so the
 * section's resting look is unchanged from the module this replaces.
 *
 * REPLACES gallery-hover-blur.js (the noise-dissolve hover blur) on the
 * same chassis — everything structural is carried over from that module
 * unchanged, because it already solved this page's hard problems:
 *
 * - Served set: ONLY the pillar-wave images
 *   ([data-about-landing-wave-img]). The horizontal gallery's images
 *   (FROM ACCESS TO IMPACT) are NOT served: their hover treatment was
 *   removed by explicit request before this module existed, and a
 *   velocity-only plane treatment briefly added at the update round
 *   was REVERSED by explicit request immediately after — the gallery
 *   images are plain DOM imgs, full stop.
 * - STAGE-SCOPED canvas in [data-about-landing-hover-canvas-slot] —
 *   NOT the reference's fullscreen fixed body-level canvas, which would
 *   sit either above the difference-text rows' backdrop or beneath the
 *   stage's opaque ground. The slot keeps the canvas between the image
 *   tracks and the difference rows (which blend against it as ordinary
 *   backdrop content — proven live), leaving nav / section-progress
 *   stacking untouched. The canvas keeps the existing
 *   .about-landing__gallery-hover-canvas class and CSS rule.
 * - Per-tick getBoundingClientRect plane sync — replaces the reference's
 *   cached `top + scrollY` mesh maths, which assumes images move only by
 *   document scroll; these images move HORIZONTALLY under scrubbed
 *   transforms inside a fixed stage, so only live rects are correct.
 * - Culling: ZERO IntersectionObserver (hard constraint). The
 *   reference's IO is replaced by the already-live two-level gate:
 *   the stage-window ScrollTrigger drives setPaused via landing-scroll's
 *   setStageVisible (module fully off outside the landing), and the
 *   per-tick rect isNear window (MOUNT_MARGIN_PX, both axes — waves
 *   approach vertically AND slide horizontally) mounts/unmounts planes.
 * - Scroll: NO Lenis instance of its own (hard constraint) — velocity is
 *   read per tick from the site instance via about-scroll.js's
 *   getScrollVelocity() (Lenis's own px-per-frame `velocity`, which the
 *   library resets to 0 shortly after scrolling settles).
 * - Render loop: gsap.ticker (hard constraint — not a standalone rAF;
 *   the one deliberate lifecycle departure from the old module).
 *   setPaused adds/removes the ticker callback.
 * - Hover overlay text: rect-synced + opacity-synced to the hover
 *   progress (uMouseEnter), so text and displacement arrive as one
 *   gesture, exactly as before.
 * - calm()/setPaused()/resize()/destroy() keep the old module's exact
 *   contract, so landing-scroll.js's freeze/visibility/resize/teardown
 *   wiring is untouched. calm() now also flattens the vertex bow
 *   (velocity 0) and recentres the cursor, guaranteeing an undistorted
 *   frozen frame beneath the detail view's departing FLIP clone.
 *
 * Gated behind `(hover: hover) and (pointer: fine)` — kept by explicit
 * decision (touch parity with the old module: plain images, zero GPU
 * cost; velocity-on-touch is a flagged future task, do not lift here).
 *
 * Returns null (caller keeps plain DOM images, no regression) when the
 * gate doesn't match, WebGL is unavailable, or there are no served
 * images.
 */

/** Hover enter/leave tween — the reference's own character: 0.6s on
 * CustomEase '0.4, 0, 0.2, 1' (it creates this ease inline per event;
 * we create it once). Supersedes the old module's 0.45s power2.inOut. */
const HOVER_DURATION = 0.6;
const HOVER_EASE = CustomEase.create('waveShaderHover', '0.4, 0, 0.2, 1');

/** Per-tick lerp toward the cursor's target position within a frame —
 * the reference's mouseOverPos damping (its render-loop lerp 0.05). */
const CURSOR_LERP = 0.05;

/** Clamp on |uScrollVelocity| as written to the shader, in Lenis
 * px-per-frame units — pre-staged as the ONE value to tune if flick
 * scrolls spike the fragment's displacement term (which the reference
 * leaves unclamped: `uMouseEnter + uScrollVelocity * 0.1`). Infinity =
 * clamp OFF = verbatim reference behaviour, deliberately, for the
 * first character review. NOTE: the uniform is shared with the vertex
 * bow, but the vertex self-clamps at min(|v|, 5.0) — so any value here
 * >= 5 tunes ONLY the fragment term; going below 5 would soften the
 * bow too (split the uniform if that's ever wanted). */
const FRAGMENT_VELOCITY_CLAMP = Infinity;

/** Mount/unmount margin, px — a plane mounts (texture load begins) once
 * its frame is within this distance of the viewport on either axis, so
 * the texture has time to decode before the image is actually visible.
 * Carried from the old module (the proven wave budget: max ~4-6
 * concurrent planes across a wave crossing). */
const MOUNT_MARGIN_PX = 400;

/** Plane subdivision — the reference's PlaneGeometry(1, 1, 100, 100):
 * the vertex bow displaces per-vertex, so the plane must tessellate.
 * Cost is trivial at the mount window's concurrent-plane budget. */
const GEOMETRY_SEGMENTS = 100;

/* Both shaders are the reference's effectVertex/effectFragment ported
 * GLSL3 -> GLSL1 (in/out -> attribute/varying, texture() -> texture2D(),
 * outColor -> gl_FragColor) with its two #includes inlined — house
 * convention (inline template-literal GLSL, no vite-plugin-glsl):
 * - getCoverUvVert: resources/utils.glsl, verbatim (character-identical
 *   to the coverUv already proven in the module this replaces).
 * - snoise: resources/noise.glsl (Ashima Arts / Ian McEwan, stegu
 *   webgl-noise, MIT), verbatim — note its permute constant is +10.0,
 *   the reference's own variant.
 * The reference's declared-but-unused uniforms (uCursor, uTime,
 * uResolution, uBorderRadius) are dropped; its baseVertex/baseFragment
 * pair is never bound by the reference either and is not ported. */

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uScrollVelocity;
  uniform vec2 uTextureSize;
  uniform vec2 uQuadSize;

  varying vec2 vUv;
  varying vec2 vUvCover;

  float PI = 3.141592653589793;

  // cover (reference resources/utils.glsl, verbatim)
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

  // Velocity bow (reference deformationCurve, verbatim): a sine arc
  // across the plane's width, amplitude min(|v|, 5) * 1% of plane
  // height — scale-invariant (positions are pre-scale unit-plane
  // coords). The 5.0 here is the vertex's OWN clamp; see
  // FRAGMENT_VELOCITY_CLAMP's note about the shared uniform.
  vec3 deformationCurve(vec3 position, vec2 uv) {
    position.y = position.y - (sin(uv.x * PI) * min(abs(uScrollVelocity), 5.0) * sign(uScrollVelocity) * -0.01);

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

  // 2D simplex noise (reference resources/noise.glsl — Ashima Arts /
  // Ian McEwan, stegu webgl-noise, MIT), verbatim incl. the +10.0
  // permute constant.
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

  // Reference effectFragment main(), verbatim: a cursor-following
  // circle (aspect-corrected, radius via the *15 falloff) gates a
  // per-pixel simplex-noise UV displacement — the grain — scaled by
  // hover progress + scroll velocity. Both scalers are 0 at rest, so
  // the resting image is an undisplaced cover crop.
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
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {{ src: string, renderOrder: number }} opts
   */
  constructor(gl, geometry, scene, { src, renderOrder }) {
    // Texture configuration — EXPLICIT, not library defaults (stated
    // per instruction, since the old module's LOD-bias machinery that
    // used to justify its filtering is deleted with it):
    // - generateMipmaps: true + LINEAR_MIPMAP_LINEAR minFilter: these
    //   images display MINIFIED into their frames (1500px-class sources
    //   in 300-540px frames), so trilinear minification is a pure
    //   sharpness/shimmer-quality choice — no LOD-biased sampling
    //   remains anywhere in this module. NPOT mipmaps need WebGL2;
    //   OGL's Renderer prefers WebGL2 and self-guards the WebGL1
    //   fallback by disabling mipmaps (degrades to plain LINEAR, never
    //   breaks).
    // - magFilter LINEAR: standard; magnification barely occurs here.
    // - wrapS/wrapT CLAMP_TO_EDGE: displaced UVs can leave [0,1] under
    //   the fragment's grain term; edge-clamp matches the reference
    //   (three.js's own texture default).
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

  /** @param {DOMRect} rect @param {{width:number,height:number}} screen @param {{width:number,height:number}} viewport */
  update(rect, screen, viewport) {
    if (rect.width < 1 || rect.height < 1 || !this.ready) {
      this.mesh.visible = false;
      return;
    }
    // Viewport cull on the UNDEFORMED box (Oscar's warp report): the
    // vertex bow can overhang the box by up to 5% of plane height, so
    // a large wave image parked just above the viewport leaked its
    // bowed bottom edge into view on scroll-up, before the image
    // itself should arrive. Hiding the mesh until its box actually
    // intersects the viewport means the bow can never paint ahead of
    // the image (symmetric for all four edges — the same leak exists
    // below on scroll-down). No pop on entry: at the boundary frame
    // the box's visible sliver is 0px, and DOM order/culling in the
    // old blur module painted nothing there either.
    const onScreen =
      rect.bottom > 0 &&
      rect.top < screen.height &&
      rect.right > 0 &&
      rect.left < screen.width;
    if (!onScreen) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    const cx = rect.left + rect.width / 2 - screen.width / 2;
    const cy = rect.top + rect.height / 2 - screen.height / 2;

    this.mesh.position.x = (viewport.width * cx) / screen.width;
    this.mesh.position.y = -((viewport.height * cy) / screen.height);

    this.mesh.scale.x = (viewport.width * rect.width) / screen.width;
    this.mesh.scale.y = (viewport.height * rect.height) / screen.height;
    this.program.uniforms.uQuadSize.value = [rect.width, rect.height];
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
  }
}

/**
 * @param {HTMLElement} galleryEl the container to serve — the whole
 *   landing STAGE (the old module's exact contract; landing-scroll.js
 *   passes the stage unchanged). Served set: the pillar-wave images
 *   only. Every served image sits in a `.about-landing__gallery-frame`
 *   (the plane/hit-test unit) and maps by stage-global index to a
 *   `[data-about-landing-gallery-overlay]` (see AboutScroll.astro).
 * @returns {{ resize: () => void, calm: () => void, setPaused: (v: boolean) => void, tickOnce: () => void, debugState: () => object, destroy: () => void } | null}
 *   null when touch/coarse-pointer, WebGL is unavailable, or there are
 *   no served images — caller keeps plain DOM images, no regression.
 */
export function createWaveShader(galleryEl) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;

  const items = Array.from(
    galleryEl.querySelectorAll('[data-about-landing-wave-img]'),
  ).filter((el) => el instanceof HTMLImageElement);
  if (!items.length) return null;

  // Class kept from the old module deliberately — the CSS rule
  // (.about-landing__gallery-hover-canvas, about-page.css) and the
  // slot placement are reused as-is; the stacking world is unchanged.
  const canvas = document.createElement('canvas');
  canvas.className = 'about-landing__gallery-hover-canvas';
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
    console.warn('[wave-shader] WebGL renderer failed — falling back to plain images.', error);
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

  // One AbortController tears down every pointer listener in destroy()
  // (explicit-removal requirement of this task's lifecycle contract).
  const listenerAbort = new AbortController();

  /** @typedef {{ imgEl: HTMLImageElement, frameEl: HTMLElement, overlayEl: HTMLElement | null, plane: WavePlane | null, mouseEnter: { value: number }, mouseOverPos: { current: {x:number,y:number}, target: {x:number,y:number} }, renderOrder: number }} ItemState */
  /** @type {ItemState[]} */
  const itemStates = items
    .map((imgEl, i) => {
      const frameEl = imgEl.closest('.about-landing__gallery-frame');
      if (!(frameEl instanceof HTMLElement)) return null;
      // Hover overlay text — a SIBLING outside the transformed track
      // (see AboutScroll.astro's comment for why it can't live in the
      // frame), rect-synced + opacity-synced in tick() below, keyed by
      // the wave image's DOM-order index.
      const overlayEl = galleryEl.querySelector(
        `[data-about-landing-gallery-overlay="${i}"]`,
      );
      return {
        imgEl,
        frameEl,
        overlayEl: overlayEl instanceof HTMLElement ? overlayEl : null,
        plane: null,
        // Persistent per-item animation state (survives mount/unmount,
        // like the old module's `progress`): hover progress + the
        // reference's damped in-frame cursor position.
        mouseEnter: { value: 0 },
        mouseOverPos: {
          current: { x: 0.5, y: 0.5 },
          target: { x: 0.5, y: 0.5 },
        },
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
      // Guards a fast mount/unmount race (scrolled back out before the
      // texture finished decoding) — only hide the DOM img if this is
      // still the CURRENT plane for this item.
      if (state.plane === mountedPlane) state.imgEl.style.visibility = 'hidden';
    });
  };

  const unmount = (state) => {
    if (!state.plane) return;
    state.plane.destroy();
    state.plane = null;
    state.imgEl.style.visibility = '';
    // An unmount mid-hover must not strand visible overlay text.
    if (state.overlayEl) state.overlayEl.style.opacity = '0';
  };

  /* Both axes: wave items are parked far below the stage until their
   * scrub window AND slide horizontally within it — either bound alone
   * would over-mount. (Carried verbatim from the old module.) */
  const isNear = (rect, screenWidth, screenHeight) =>
    rect.right > -MOUNT_MARGIN_PX &&
    rect.left < screenWidth + MOUNT_MARGIN_PX &&
    rect.bottom > -MOUNT_MARGIN_PX &&
    rect.top < screenHeight + MOUNT_MARGIN_PX;

  // Pointer handlers — attached to the FRAME element (static across
  // mount/unmount). Hover progress and cursor-recentre tweens use
  // overwrite:'auto' (retargets cleanly from the current value on a
  // rapid enter/leave flip, never stacks — the section-progress idiom;
  // the reference tweens the same values without this guard).
  // Force-mounts on pointerenter as a defensive backstop, as before.
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
    // Cursor position from clientX/Y against the frame's live rect —
    // NOT the reference's e.offsetX/Y, which is relative to whichever
    // CHILD the event actually hits and would jump across the frame's
    // img/frame boundary.
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

  let screen = { width: 1, height: 1 };
  let viewport = { width: 1, height: 1 };

  const resize = () => {
    screen = { width: window.innerWidth, height: window.innerHeight };
    renderer.setSize(screen.width, screen.height);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = camera.fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * camera.position.z;
    const width = height * camera.aspect;
    viewport = { width, height };
  };

  let disposed = false;
  let paused = false;
  /** Last velocity actually written to the uniforms — debug surface. */
  let lastVelocity = 0;

  const lerp = (start, end, damping) => start * (1 - damping) + end * damping;

  const tick = () => {
    if (disposed || paused) return;

    // Site Lenis velocity (px/frame), through the pre-staged clamp —
    // Infinity today, i.e. reference-verbatim; see the constant's note.
    const raw = getScrollVelocity();
    lastVelocity = Math.max(-FRAGMENT_VELOCITY_CLAMP, Math.min(FRAGMENT_VELOCITY_CLAMP, raw));

    itemStates.forEach((state) => {
      const rect = state.frameEl.getBoundingClientRect();
      const near = isNear(rect, screen.width, screen.height);
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
        state.plane.program.uniforms.uScrollVelocity.value = lastVelocity;
        state.plane.update(rect, screen, viewport);

        // Overlay text: rect-synced via LAYOUT properties (the blend
        // element must never gain a transform — the name-clip idiom)
        // and faded with the hover progress the shader runs on.
        if (state.overlayEl) {
          const o = state.overlayEl.style;
          o.left = `${rect.left}px`;
          o.top = `${rect.top}px`;
          o.width = `${rect.width}px`;
          o.height = `${rect.height}px`;
          o.opacity = String(state.mouseEnter.value);
        }
      }
    });

    renderer.render({ scene, camera });
  };

  resize();
  // Canvas into the dedicated stage slot (between the image tracks and
  // the difference-text rows — see AboutScroll.astro), else appended to
  // the container itself. Identical placement to the old module.
  const canvasSlot = galleryEl.querySelector('[data-about-landing-hover-canvas-slot]');
  (canvasSlot instanceof HTMLElement ? canvasSlot : galleryEl).appendChild(canvas);
  gsap.ticker.add(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  const killItemTweens = (state) => {
    gsap.killTweensOf(state.mouseEnter);
    gsap.killTweensOf(state.mouseOverPos.target);
  };

  return {
    resize,
    /** Snap every animated input to rest and repaint once — called by
     * the detail-view freeze (landing-scroll.js) BEFORE setPaused(true):
     * a paused canvas keeps displaying its last render, and a frozen
     * mid-hover/mid-scroll frame (displaced grain, bowed plane) would
     * pop against the detail view's departing sharp FLIP clone. Kills
     * the tweens too, so nothing snaps to a stale value on resume. */
    calm() {
      if (disposed) return;
      lastVelocity = 0;
      itemStates.forEach((state) => {
        killItemTweens(state);
        state.mouseEnter.value = 0;
        state.mouseOverPos.current = { x: 0.5, y: 0.5 };
        state.mouseOverPos.target = { x: 0.5, y: 0.5 };
        if (state.plane) {
          state.plane.program.uniforms.uMouseEnter.value = 0;
          state.plane.program.uniforms.uMouseOverPos.value = [0.5, 0.5];
          state.plane.program.uniforms.uScrollVelocity.value = 0;
          state.plane.update(state.frameEl.getBoundingClientRect(), screen, viewport);
        }
        if (state.overlayEl) state.overlayEl.style.opacity = '0';
      });
      renderer.render({ scene, camera });
    },
    /** Idle/resume the ticker callback — driven by landing-scroll.js's
     * setStageVisible (and held paused throughout the detail-view
     * freeze). Mounted planes are left as-is on pause (not destroyed) —
     * cheap to resume; the mount/unmount window simply resumes
     * reconciling on the next tick. */
    setPaused(value) {
      if (paused === value || disposed) return;
      paused = value;
      if (paused) {
        gsap.ticker.remove(tick);
      } else {
        gsap.ticker.add(tick);
      }
    },
    /** Debug/verification surface (the rotating-fold precedent): one
     * manual frame regardless of pause state, and a state snapshot —
     * for occluded-pane verification where no ticker ever fires. */
    tickOnce() {
      if (disposed) return;
      const wasPaused = paused;
      paused = false;
      tick();
      paused = wasPaused;
    },
    debugState() {
      return {
        paused,
        disposed,
        lastVelocity,
        clamp: FRAGMENT_VELOCITY_CLAMP,
        items: itemStates.map((state) => ({
          mounted: Boolean(state.plane),
          ready: Boolean(state.plane?.ready),
          meshVisible: Boolean(state.plane?.mesh.visible),
          mouseEnter: state.mouseEnter.value,
          cursor: { ...state.mouseOverPos.current },
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
        killItemTweens(state);
        unmount(state);
      });
      geometry.remove();
      canvas.remove();
      // Deterministic GPU teardown on Astro page transition (task
      // contract): planes/programs are already unmounted above; losing
      // the context releases the textures and the context slot itself
      // rather than waiting on GC.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
