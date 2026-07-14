import gsap from 'gsap';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * /about-3 landing gallery — WebGL hover blur, adapting
 * founders-dissolve.js's noise-dissolve mechanism (simplex-noise-staggered
 * mix + UV warp) rather than a plain CSS blur crossfade, per spec.
 *
 * Architecture, following founders-dissolve.js's established patterns
 * (inline glsl, DOM-rect-synced planes, own rAF, resize/destroy lifecycle)
 * with two deliberate departures, both scoped to this module's own
 * requirements:
 *
 * - ONE texture per image, not two. founders-dissolve.js mixes
 *   uTextureFrom/uTextureTo (two distinct images — a real cross-fade
 *   subject). Here there is only ever one photo; the "blurred state" is
 *   the SAME texture sampled through founders' own proven 12-tap Poisson
 *   blur pass, mixed against a sharp sample of that same texture via the
 *   identical noise-threshold (m) + UV-warp logic. Halves texture memory
 *   (12 loads, not 24) and needs zero pre-baked assets/regeneration step.
 *
 * - Planes mount/unmount by live visible-track position rather than
 *   existing for the module's whole lifetime (founders' single portrait
 *   plane and the hero's 3 rotating-gallery planes are both static-
 *   lifetime — never more than 3 concurrent). With up to 12 images here,
 *   only images within MOUNT_MARGIN_PX of the viewport get a mounted
 *   plane + loaded texture; others stay plain (invisible, unmounted) DOM
 *   img — caps concurrent planes at roughly the rotating-gallery
 *   precedent regardless of total gallery size. The underlying DOM img's
 *   visibility is toggled BOTH ways (hidden once its plane's texture is
 *   ready, RESTORED if its plane unmounts) — unlike founders/rotating-
 *   gallery's one-way hide, since planes here are reversible.
 *
 * Hover is a TIMED (not scroll-scrubbed) tween per plane — the second
 * "timed exception" in this codebase alongside founders' snap transition
 * (see founders-scroll.js's module doc comment). One persistent tween
 * target per image (survives mount/unmount), `overwrite: 'auto'` so a
 * pointerleave before a pointerenter tween completes retargets cleanly
 * from the current value rather than stacking — the same idiom
 * section-progress.js already uses for its own possibly-interrupted
 * per-row tweens.
 *
 * Gated entirely behind `(hover: hover) and (pointer: fine)` — this
 * project's own established convention for hover-only decorative effects
 * (canvas-cursor.js) — so touch devices get plain images, no shader
 * planes ever created, matching the approved plan's "no touch effect."
 *
 * Returns null (caller keeps plain DOM images, no regression) when: the
 * hover/pointer media query doesn't match, WebGL is unavailable, or the
 * gallery has no images.
 */

/** Same curve/character as founders-dissolve.js's noise-dissolve — the
 * approved plan calls for the SAME visual mechanism, so these start
 * identical to founders' constants (see founders-dissolve.js for the
 * per-constant rationale). Transition CHARACTER vs the founders dissolve
 * is Oscar's live call per the approved plan; retune here if so. */
const NOISE_SCALE = 5.0;
const MAX_DISTORT = 0.12;
const EDGE_SOFTNESS = 0.25;

/** Hover blur radius as a RATIO of each item's own frame width, not a
 * flat px value — the composition has four size classes (300-540px
 * wide); a flat px would read stronger on small frames than large ones.
 * Starting value per the approved plan — a feel constant, tuned live. */
const GALLERY_HOVER_BLUR_RATIO = 0.09;

/** Hover transition duration, seconds — symmetric in/out (matches
 * founders' own symmetric TRANSITION_DURATION convention). Snappier than
 * founders' 0.7s snap: this is micro-interaction feedback, not a major
 * content transition. Starting value, tuned live. */
const HOVER_DURATION = 0.45;
const HOVER_EASE = 'power2.inOut';

/** Mount/unmount margin, px — a plane mounts (texture load begins) once
 * its frame is within this distance of the viewport's left/right edges,
 * so the texture has time to decode before the image actually scrolls
 * into view. Unmounts once it clears this same margin on the way out. */
const MOUNT_MARGIN_PX = 400;

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSizePx;
  uniform float uProgress;
  uniform float uNoiseScale;
  uniform float uMaxDistort;
  uniform float uEdgeSoftness;
  uniform float uBlurPx;
  uniform float uLodBias;

  varying vec2 vUv;

  // 2D simplex noise — Ashima Arts / Ian McEwan (stegu/webgl-noise), MIT.
  // Verbatim from founders-dissolve.js — same noise field, same character.
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Cover-crop — same ratio maths as founders-dissolve/rotating-gallery.
  vec2 coverUv(vec2 uv, vec2 planeSize, vec2 imageSize) {
    vec2 ratio = vec2(
      min((planeSize.x / planeSize.y) / (imageSize.x / imageSize.y), 1.0),
      min((planeSize.y / planeSize.x) / (imageSize.y / imageSize.x), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    // Per-pixel dissolve threshold — identical construction to
    // founders-dissolve.js: m ≡ 0 at uProgress 0 (fully sharp), m ≡ 1 at
    // uProgress 1 (fully blurred), no residual ghost at either endpoint.
    float n = snoise(vUv * uNoiseScale) * 0.5 + 0.5;
    float pr = uProgress * (1.0 + 2.0 * uEdgeSoftness) - uEdgeSoftness;
    float m = 1.0 - smoothstep(pr - uEdgeSoftness, pr + uEdgeSoftness, n);

    // UV warp — zero at rest and completion, peaking mid-transition.
    float strength = sin(uProgress * 3.141592653589793) * uMaxDistort;
    vec2 warp = vec2(
      snoise(vUv * uNoiseScale + 3.7),
      snoise(vUv * uNoiseScale - 2.3)
    ) * strength;

    vec2 uvBase = coverUv(vUv, uPlaneSizePx, uImageSize);
    vec2 uvSharp = uvBase + warp * m;
    vec2 uvBlur = uvBase - warp * (1.0 - m);

    vec3 colSharp = texture2D(uTexture, uvSharp).rgb;

    // Blurred sample of the SAME texture — founders-dissolve's 12-tap
    // Poisson disc (disc radius 2x the CSS-equivalent blur value), but
    // with every tap LOD-BIASED into the texture's mip chain (uLodBias,
    // computed per-frame in JS): each tap reads a pre-blurred mip level
    // sized to the spacing between taps, so the sparse taps blend into a
    // smooth heavy blur. Without the bias, 13 LOD-0 taps across this
    // module's 27-49px blur radius resolved as 13 visible ghost copies —
    // a double-exposure artifact wrongly read as the dissolve animation
    // leaving residue (founders' identical taps are fine because its
    // blur mirror is ~10px). Uniform-gated as before: a resting plane
    // costs exactly one texture read. colBlur defaults to the sharp
    // sample so a stray non-zero m at uBlurPx 0 (shouldn't happen — m is
    // 0 whenever uProgress is 0) still has a defined value.
    vec3 colBlur = colSharp;
    if (uBlurPx > 0.01) {
      vec2 radiusUv = vec2(uBlurPx * 2.0) / uPlaneSizePx;
      colBlur = texture2D(uTexture, uvBlur, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.326, -0.406) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.840, -0.074) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.696,  0.457) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.203,  0.621) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.962, -0.195) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.473, -0.480) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.519,  0.767) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.185, -0.893) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.507,  0.064) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2( 0.896,  0.412) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.322, -0.933) * radiusUv, uLodBias).rgb;
      colBlur += texture2D(uTexture, uvBlur + vec2(-0.792, -0.598) * radiusUv, uLodBias).rgb;
      colBlur /= 13.0;
    }

    vec3 col = mix(colSharp, colBlur, m);
    gl_FragColor = vec4(col, 1.0);
  }
`;

class HoverBlurPlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {{ src: string, blurPx: number, renderOrder: number }} opts
   */
  constructor(gl, geometry, scene, { src, blurPx, renderOrder }) {
    // Mipmapped + trilinear — the blur pass samples LOD-biased (see
    // uLodBias in the fragment shader): each Poisson tap reads a
    // pre-blurred mip level sized to the spacing between taps, so 13
    // taps blend into a smooth heavy blur instead of 13 visible ghost
    // copies (the artifact this replaces — founders' identical taps are
    // fine at its ~10px blur; this module's ratio-derived 27-49px blur
    // radius drastically outruns 13 samples at LOD 0). NPOT mipmaps
    // need WebGL2 (OGL's Renderer prefers it; OGL self-guards the
    // WebGL1 fallback by disabling mipmaps, where this degrades back to
    // the sparse-tap look rather than breaking). Trilinear minFilter
    // also slightly improves the SHARP sample (the images minify into
    // their frames), not just the blur.
    const texture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
    });

    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      transparent: false,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTexture: { value: texture },
        uImageSize: { value: [1, 1] },
        uPlaneSizePx: { value: [1, 1] },
        uProgress: { value: 0 },
        uNoiseScale: { value: NOISE_SCALE },
        uMaxDistort: { value: MAX_DISTORT },
        uEdgeSoftness: { value: EDGE_SOFTNESS },
        uBlurPx: { value: blurPx },
        uLodBias: { value: 0 },
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
        this.program.uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight];
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
    this.mesh.visible = true;

    const cx = rect.left + rect.width / 2 - screen.width / 2;
    const cy = rect.top + rect.height / 2 - screen.height / 2;

    this.mesh.position.x = (viewport.width * cx) / screen.width;
    this.mesh.position.y = -((viewport.height * cy) / screen.height);

    this.mesh.scale.x = (viewport.width * rect.width) / screen.width;
    this.mesh.scale.y = (viewport.height * rect.height) / screen.height;
    this.program.uniforms.uPlaneSizePx.value = [rect.width, rect.height];

    // LOD bias for the blur taps — sized so each tap's mip footprint
    // covers roughly the spacing between the 13 Poisson samples across
    // the disc, in TEXTURE texels: blur radius in CSS px × the
    // texture-texels-per-CSS-px scale this plane displays at. Recomputed
    // here (not at mount) because rect width — and, on resize, uBlurPx —
    // both move under it. log2(σ_texels) ≈ footprint 2^L texels ≈ σ.
    const imgW = this.program.uniforms.uImageSize.value[0];
    const blurPx = this.program.uniforms.uBlurPx.value;
    if (imgW > 1 && blurPx > 0) {
      const sigmaTexels = (blurPx * imgW) / rect.width;
      this.program.uniforms.uLodBias.value = Math.max(
        0,
        Math.min(Math.log2(Math.max(sigmaTexels, 1)), 10),
      );
    }
  }

  setProgress(value) {
    this.program.uniforms.uProgress.value = Math.max(0, Math.min(value, 1));
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
  }
}

/**
 * @param {HTMLElement} galleryEl the container to serve — the whole
 *   landing STAGE. SERVED SET (explicit request): ONLY the three
 *   pillar-wave sections' images (18) — the horizontal gallery's images
 *   lost their hover treatment and overlay CTA and are deliberately NOT
 *   selected below (the module keeps its historical name). One
 *   renderer/canvas serves all waves; the mount window below keeps
 *   concurrent planes to the visible few. Every served image sits in a
 *   `.about-landing__gallery-frame` (the plane/hit-test unit) and maps by
 *   stage-global index to a `[data-about-landing-gallery-overlay]`
 *   (wave-only numbering, 0..17 — see AboutScroll.astro).
 * @returns {{ resize: () => void, setPaused: (v: boolean) => void, destroy: () => void } | null}
 *   null when touch/coarse-pointer, WebGL is unavailable, or there are no
 *   served images — caller keeps plain DOM images, no regression.
 */
export function createGalleryHoverBlur(galleryEl) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null;

  const items = Array.from(
    galleryEl.querySelectorAll('[data-about-landing-wave-img]'),
  ).filter((el) => el instanceof HTMLImageElement);
  if (!items.length) return null;

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
    console.warn('[gallery-hover-blur] WebGL renderer failed — falling back to plain images.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;

  const scene = new Transform();
  const geometry = new Plane(gl);

  /** @typedef {{ imgEl: HTMLImageElement, frameEl: HTMLElement, overlayEl: HTMLElement | null, plane: HoverBlurPlane | null, progress: { value: number }, blurPx: number }} ItemState */
  /** @type {ItemState[]} */
  const itemStates = items
    .map((imgEl, i) => {
      const frameEl = imgEl.closest('.about-landing__gallery-frame');
      if (!(frameEl instanceof HTMLElement)) return null;
      const width = frameEl.getBoundingClientRect().width || frameEl.offsetWidth;
      // Hover overlay text — a SIBLING outside the track (see
      // AboutScroll.astro's comment for why it can't live in the frame),
      // rect-synced to this frame + opacity-synced to this progress in
      // tick() below. Optional: older markup without overlays still works.
      const overlayEl = galleryEl.querySelector(
        `[data-about-landing-gallery-overlay="${i}"]`,
      );
      return {
        imgEl,
        frameEl,
        overlayEl: overlayEl instanceof HTMLElement ? overlayEl : null,
        plane: null,
        progress: { value: 0 },
        blurPx: Math.max(1, width * GALLERY_HOVER_BLUR_RATIO),
        renderOrder: i,
      };
    })
    .filter((s) => s !== null);

  const src = (imgEl) => imgEl.currentSrc || imgEl.src;

  const mount = (state) => {
    if (state.plane) return;
    state.plane = new HoverBlurPlane(gl, geometry, scene, {
      src: src(state.imgEl),
      blurPx: state.blurPx,
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
    // An unmount mid-hover (scrolled away with the pointer still down on
    // the frame's last position) must not strand visible overlay text.
    if (state.overlayEl) state.overlayEl.style.opacity = '0';
  };

  /* Both axes since the pillar waves joined: gallery items approach
   * horizontally, wave items VERTICALLY (parked far below the stage
   * until their scrub window) — a horizontal-only window would mount
   * all 18 wave planes (and decode all their textures) at init. The
   * vertical bound also unmounts gallery planes once the lift-out
   * carries the track above the viewport — strictly cheaper. */
  const isNear = (rect, screenWidth, screenHeight) =>
    rect.right > -MOUNT_MARGIN_PX &&
    rect.left < screenWidth + MOUNT_MARGIN_PX &&
    rect.bottom > -MOUNT_MARGIN_PX &&
    rect.top < screenHeight + MOUNT_MARGIN_PX;

  // Pointer handlers — attached to the FRAME element (static across
  // mount/unmount), driving a persistent per-item `progress` target via
  // gsap.to with overwrite:'auto' (retargets cleanly from the current
  // value on a rapid enter/leave flip, never stacks — same idiom
  // section-progress.js uses for its own possibly-interrupted tweens).
  // Force-mounts on pointerenter as a defensive backstop: hover can only
  // occur on an in-viewport (and therefore already-near-mounted) item in
  // practice, but this makes correctness independent of that ordering.
  itemStates.forEach((state) => {
    const setTarget = (target) => {
      mount(state);
      gsap.to(state.progress, {
        value: target,
        duration: HOVER_DURATION,
        ease: HOVER_EASE,
        overwrite: 'auto',
      });
    };
    state.frameEl.addEventListener('pointerenter', () => setTarget(1));
    state.frameEl.addEventListener('pointerleave', () => setTarget(0));
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
    // Re-derive each item's blur radius from its (possibly changed)
    // frame width — keeps the ratio-based blur correct across resizes.
    itemStates.forEach((state) => {
      const w = state.frameEl.getBoundingClientRect().width;
      if (w > 0) state.blurPx = Math.max(1, w * GALLERY_HOVER_BLUR_RATIO);
    });
  };

  let rafId = 0;
  let disposed = false;
  let paused = false;

  const tick = () => {
    if (disposed || paused) return;
    rafId = requestAnimationFrame(tick);

    itemStates.forEach((state) => {
      const rect = state.frameEl.getBoundingClientRect();
      const near = isNear(rect, screen.width, screen.height);
      if (near) mount(state);
      else unmount(state);

      if (state.plane) {
        state.plane.setProgress(state.progress.value);
        state.plane.program.uniforms.uBlurPx.value = state.blurPx;
        state.plane.update(rect, screen, viewport);

        // Overlay text: rect-synced via left/top/width/height (LAYOUT
        // properties on a blend element — the name-clip idiom; never
        // transform on the children's ancestor... here the wrapper IS
        // the blend element, so layout writes keep even self-created
        // stacking noise out) and faded with the same hover progress
        // the dissolve runs on — text and blur arrive as one gesture.
        if (state.overlayEl) {
          const o = state.overlayEl.style;
          o.left = `${rect.left}px`;
          o.top = `${rect.top}px`;
          o.width = `${rect.width}px`;
          o.height = `${rect.height}px`;
          o.opacity = String(state.progress.value);
        }
      }
    });

    renderer.render({ scene, camera });
  };

  resize();
  // Canvas placement: into the dedicated slot when the container has
  // one (the stage-wide case — the slot sits between the image tracks
  // and the difference-text rows, see AboutScroll.astro), else appended
  // to the container itself (the original gallery-only behaviour).
  const canvasSlot = galleryEl.querySelector('[data-about-landing-hover-canvas-slot]');
  (canvasSlot instanceof HTMLElement ? canvasSlot : galleryEl).appendChild(canvas);
  rafId = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    resize,
    /** Snap every hover state to rest and repaint once — called by the
     * detail-view freeze (landing-scroll.js) BEFORE setPaused(true):
     * a paused canvas keeps displaying its last render, and if that
     * render was mid-hover the clicked image's frozen plane would sit
     * BLURRED beneath the detail view's departing sharp clone (a
     * visible pop as the clone flies away). Kills the progress tweens
     * too, so nothing snaps to a stale value on resume. */
    calm() {
      if (disposed) return;
      itemStates.forEach((state) => {
        gsap.killTweensOf(state.progress);
        state.progress.value = 0;
        if (state.plane) {
          state.plane.setProgress(0);
          state.plane.update(state.frameEl.getBoundingClientRect(), screen, viewport);
        }
        if (state.overlayEl) state.overlayEl.style.opacity = '0';
      });
      renderer.render({ scene, camera });
    },
    /** Idle/resume the rAF loop — called from landing-scroll.js's
     * setStageVisible, so this pauses exactly when the stage (and
     * therefore the whole gallery) is hidden. Mounted planes are left
     * as-is on pause (not destroyed) — cheap to resume, matching
     * founders-dissolve.js's own setPaused contract; the mount/unmount
     * window check simply resumes reconciling on the next tick. */
    setPaused(value) {
      if (paused === value || disposed) return;
      paused = value;
      if (paused) {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      itemStates.forEach((state) => {
        gsap.killTweensOf(state.progress);
        unmount(state);
      });
      geometry.remove();
      canvas.remove();
    },
  };
}
