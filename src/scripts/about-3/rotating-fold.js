import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * /about-3 section 04 ("selected work") — the HERO GALLERY'S turn/fold
 * effect adapted to the zigzag column (approved Phase 2 of the
 * mechanism swap). This module reuses rotating-gallery.js's conventions
 * VERBATIM where they apply — the invisible-DOM-proxy plane sync
 * (per-frame getBoundingClientRect mirroring), the texture handling
 * (Image + crossOrigin, uImageSize, no mipmaps), the cover-crop
 * fragment shader, the camera/viewport derivation, and the destroy
 * lifecycle — and its exact vertex shader: the uPosition-driven
 * per-vertex Y-axis turn whose distortionAxis-weighted phase offset
 * folds the plane (corners lead/lag) instead of spinning it rigidly.
 *
 * THE ADAPTATION (approved mapping (a) — piecewise fold-in /
 * flat-at-centre / fold-out): where the hero maps its one-way
 * rest->exit travel onto 0..360°, each image here maps its journey
 * through the viewport onto a SIGNED angle that is EXACTLY zero at the
 * window's midpoint: d = (p − 0.5)·2 ∈ [−1, 1], eased by the hero's
 * own 1−(1−|d|)^EASE curve and signed back, then scaled to
 * ±HALF_TURNS·2π. The flat-legible middle is the point (Oscar) — the
 * centre is protected the same way the hero protects its resting row:
 * an epsilon snap to exactly 0 and a uDistortion ramp that holds the
 * fold at exactly 0 through the centre band, so the mid-window image
 * is pixel-identical to the DOM proxy it replaces. Travel p reproduces
 * the retired per-item ScrollTrigger window ('top bottom+=20%' ->
 * 'bottom top-=20%') as pure rect geometry:
 * p = (1.2·screenH − rect.top) / (1.4·screenH + rect.height) — no
 * triggers, nothing new to spare in the hero rebuild.
 *
 * WINDOWING (approved, hover-module precedent, ~3-4 live planes):
 * a plane is LIVE only while its proxy rect intersects the viewport
 * expanded by NEAR_BAND on each side — beyond it the mesh is hidden
 * and its uniforms untouched. Textures are deferred to a plane's FIRST
 * mount (the DOM image keeps painting until its texture is decoded —
 * the founders-dissolve takeover technique — then the proxy img hides)
 * and retained after (5 images ≈ ~23MB VRAM ceiling, within plan).
 * With the column's spacing, at most ~3 items intersect the band.
 *
 * The rAF loop pauses with the section window (rotating-scroll.js's
 * gate -> setPaused), so the rest of the page pays nothing — stricter
 * than the hero, which runs for its whole lifetime.
 *
 * NOTE (approved removal): the demo-4 velocity-blur layer is GONE with
 * the mechanism it belonged to — the fold owns the motion now.
 */

/** Rotation magnitude per side of the centre, in full turns: 0.5 =
 * ±180°, a full 360° traversed across the window — the hero's
 * full-turn magnitude, re-centred on legibility. Oscar's register
 * tunable. */
const FOLD_HALF_TURNS = 0.5;
/** The hero's own travel ease (rotating-gallery.js EASE_EXPONENT),
 * applied to |d| and mirrored: rotation rate is high at the window
 * edges and settles gently into flat at the centre. */
const FOLD_EASE_EXPONENT = 1.4;
/** The hero's fold character constants, unchanged: per-vertex phase
 * amplitude and the ramp that holds the fold at exactly 0 through the
 * flat point (rotating-gallery.js DISTORTION_PHASE/DISTORTION_RAMP —
 * there the flat point is rest; here it is the window centre). */
const FOLD_DISTORTION_PHASE = 0.15;
const FOLD_DISTORTION_RAMP = 0.05;
const FOLD_ROTATION_AXIS = [0, 1, 0];
const FOLD_DISTORTION_AXIS = [1, 1, 0];
/** Signed-progress snap — |d| below this reads as exactly centred
 * (the hero's TRAVEL_EPSILON, applied to the centre guard). */
const FOLD_CENTER_EPSILON = 0.001;
/** Windowing band: a plane is live while its rect intersects the
 * viewport expanded by this fraction of the viewport height on each
 * side (the hover-module near-viewport precedent). 0.25 covers the
 * rotation window's own ±0.2vh overshoot with margin while holding
 * the live count at Oscar's ~3-4 budget for this column's spacing
 * (0.5 measured 5 live at 1084). */
const FOLD_NEAR_BAND = 0.25;

// The hero gallery's vertex shader, verbatim (rotating-gallery.js —
// see its comments for the angle-domain history).
const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 normal;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  uniform float uPosition;
  uniform vec3 distortionAxis;
  uniform vec3 rotationAxis;
  uniform float uDistortion;

  varying vec2 vUv;

  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
  }

  vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
  }

  void main() {
    vUv = uv;

    float norm = 0.5;
    float offset = ( dot(distortionAxis,position) +norm/2.)/norm;
    float localAngle = uPosition + uDistortion * offset;

    vec3 newpos = rotate(position, rotationAxis, localAngle);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
  }
`;

// The hero gallery's cover-crop fragment shader, verbatim.
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform sampler2D tMap;

  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
      min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    gl_FragColor.rgb = texture2D(tMap, uv).rgb;
    gl_FragColor.a = 1.0;
  }
`;

function clamp01(n) {
  return Math.max(0, Math.min(n, 1));
}

class FoldPlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {HTMLElement} el the .about-rotating__item proxy (rect source)
   */
  constructor(gl, geometry, scene, el) {
    this.el = el;
    this.imgEl = el.querySelector('img');
    this.texture = new Texture(gl, { generateMipmaps: false });
    this.textureRequested = false;
    this.ready = false;
    this.lastState = { live: false, uPosition: 0, uDistortion: 0 };

    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        tMap: { value: this.texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        rotationAxis: { value: FOLD_ROTATION_AXIS },
        distortionAxis: { value: FOLD_DISTORTION_AXIS },
        uDistortion: { value: 0 },
      },
      cullFace: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    this.mesh.setParent(scene);
    this.mesh.visible = false;
  }

  /** Deferred to first mount (the windowing contract): the DOM image
   * keeps painting until the texture is decoded, then hides — the
   * founders-dissolve takeover technique, so the swap can never show
   * a blank frame. */
  requestTexture() {
    if (this.textureRequested) return;
    this.textureRequested = true;
    const src = this.imgEl?.currentSrc || this.imgEl?.src;
    if (!src) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      this.texture.image = image;
      this.program.uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight];
      this.ready = true;
      if (this.imgEl) this.imgEl.style.visibility = 'hidden';
    };
    image.src = src;
  }

  /**
   * @param {{width: number, height: number}} screen
   * @param {{width: number, height: number}} viewport
   */
  update(screen, viewport) {
    const rect = this.el.getBoundingClientRect();
    const band = screen.height * FOLD_NEAR_BAND;
    const near = rect.bottom > -band && rect.top < screen.height + band;
    if (!near || rect.width < 1 || rect.height < 1) {
      this.mesh.visible = false;
      this.lastState.live = false;
      return;
    }
    this.requestTexture();
    if (!this.ready) {
      // DOM proxy still painting — keep the plane hidden until the
      // texture can take over seamlessly.
      this.mesh.visible = false;
      this.lastState.live = false;
      return;
    }
    this.mesh.visible = true;

    // Plane-rect sync — rotating-gallery.js's exact mapping.
    const cx = rect.left + rect.width / 2 - screen.width / 2;
    const cy = rect.top + rect.height / 2 - screen.height / 2;
    this.mesh.position.x = (viewport.width * cx) / screen.width;
    this.mesh.position.y = -((viewport.height * cy) / screen.height);
    this.mesh.scale.x = (viewport.width * rect.width) / screen.width;
    this.mesh.scale.y = (viewport.height * rect.height) / screen.height;
    this.program.uniforms.uPlaneSize.value = [this.mesh.scale.x, this.mesh.scale.y];

    // Travel p — the retired trigger window as pure rect geometry (see
    // the module header), then the approved signed centre-flat mapping.
    const p = clamp01((1.2 * screen.height - rect.top) / (1.4 * screen.height + rect.height));
    let d = (p - 0.5) * 2;
    if (Math.abs(d) < FOLD_CENTER_EPSILON) d = 0;
    const eased = 1 - Math.pow(1 - Math.abs(d), FOLD_EASE_EXPONENT);
    const uPosition = Math.sign(d) * eased * FOLD_HALF_TURNS * Math.PI * 2;
    const uDistortion = FOLD_DISTORTION_PHASE * clamp01(eased / FOLD_DISTORTION_RAMP);
    this.program.uniforms.uPosition.value = uPosition;
    this.program.uniforms.uDistortion.value = uDistortion;
    this.lastState = { live: true, uPosition, uDistortion };
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
    if (this.imgEl) this.imgEl.style.visibility = '';
  }
}

/**
 * @param {HTMLElement} section the [data-about-rotating] section (canvas host)
 * @param {HTMLElement[]} itemEls the .about-rotating__item proxies
 * @returns {{ resize: () => void, setPaused: (v: boolean) => void,
 *   tickOnce: () => void, debugState: () => object[],
 *   destroy: () => void } | null}
 *   null when WebGL is unavailable — the DOM column stays as-is (the
 *   same degradation contract as createRotatingGallery).
 */
export function createRotatingFold(section, itemEls) {
  const els = itemEls.filter((el) => el instanceof HTMLElement);
  if (!els.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'about-rotating__canvas';
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
    console.warn('[rotating-fold] WebGL renderer failed — DOM column stays.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;
  const scene = new Transform();
  // The hero's segment density — the fold needs the vertices.
  const geometry = new Plane(gl, { heightSegments: 1, widthSegments: 100 });

  const planes = els.map((el) => new FoldPlane(gl, geometry, scene, el));

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

  const step = () => {
    planes.forEach((plane) => plane.update(screen, viewport));
    renderer.render({ scene, camera });
  };

  let rafId = 0;
  let disposed = false;
  let paused = true; // starts paused — the section window gate resumes it
  const tick = () => {
    if (disposed || paused) return;
    rafId = requestAnimationFrame(tick);
    step();
  };

  resize();
  canvas.style.visibility = 'hidden'; // until the section window opens
  section.appendChild(canvas);

  return {
    resize,
    /** Idle/resume with the section window (the founders-dissolve
     * setPaused contract) — the whole module costs nothing while the
     * section is off screen. The canvas HIDES with the pause: a paused
     * canvas would otherwise freeze its last frame, and the window
     * closes at the content-clear point while near-band planes may
     * still hold pixels — a stale frame must never sit under the
     * partners melt (or any other section). Starts paused+hidden until
     * the window gate first opens. */
    setPaused(value) {
      if (paused === value || disposed) return;
      paused = value;
      if (paused) {
        cancelAnimationFrame(rafId);
        canvas.style.visibility = 'hidden';
      } else {
        canvas.style.visibility = 'visible';
        rafId = requestAnimationFrame(tick);
      }
    },
    /** One synchronous update+render — verification/tuning hook (the
     * occluded-tab environment has no rAF; harmless in production). */
    tickOnce() {
      if (!disposed) step();
    },
    debugState() {
      return planes.map((p) => ({ ...p.lastState, ready: p.ready }));
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      planes.forEach((plane) => plane.destroy());
      geometry.remove();
      canvas.remove();
    },
  };
}
