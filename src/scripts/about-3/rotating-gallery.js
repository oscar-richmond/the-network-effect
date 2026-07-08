import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * WebGL takeover for the three /about-3 hero images — ported from the
 * Codrops "WebGL Rotating Image Gallery" (OGL + GLSL) reference at
 * `src/_reference/rotating-slideshow/` (read-only, not imported directly).
 *
 * Deliberate departures from the reference, per the approved integration
 * plan:
 * - No virtual scroll (no wheel/touch listeners, no lerped scroll value).
 *   Each plane instead mirrors an existing, already-scroll-animated DOM
 *   `.about-hero__img` element every frame via `getBoundingClientRect()` —
 *   the exact "invisible DOM proxy + rAF-synced overlay" technique already
 *   used for the tagline video overlay and for `curve-media.js` elsewhere
 *   in this codebase. `about-scroll.js` keeps sole ownership of *when*
 *   the images move (GSAP/ScrollTrigger); this module only ever *reads*
 *   their resulting geometry.
 * - No infinite wrap (`extra`/`isBefore`/`isAfter`/`heightTotal`) — this is
 *   a finite, one-shot exit, not a looping carousel.
 * - `setScale(320, 300)` (hardcoded in the reference, a bug) is replaced by
 *   the element's real measured size every frame.
 * - Rotation is driven by `uPosition`, which the shader now treats as a
 *   rotation angle in radians directly (previously it was a bounded
 *   [0, ~0.5] progress value run through the reference's own
 *   `fract`/`qinticInOut` sweep — see TOTAL_ROTATION_TURNS and
 *   EASE_EXPONENT below for why that was replaced). At travel progress 0,
 *   `uPosition` is exactly 0, i.e. exactly flat, unconditionally.
 */

/** Total rotation, in full turns, completed over the whole rest→exit
 * travel (1.0 = 360°). `uPosition` now carries the angle directly (in
 * radians), so the final angle is exactly
 * `TOTAL_ROTATION_TURNS * 2 * PI`. Replaces the old
 * UPOSITION_TRAVEL_RANGE constant, which fed a bounded progress value
 * through the shader's own `qinticInOut` easing — that scheme could only
 * ever reach a maximum of ~180° (and in practice was tuned to ~90°)
 * before the easing function's domain broke down for larger inputs, and
 * combining it with an early-onset JS curve made it saturate around
 * travel ≈ 50% and visibly freeze there for the remaining travel. */
const TOTAL_ROTATION_TURNS = 1.0;

/** `travelProgress` (0 = rest, 1 = fully exited) is eased with
 * `1 - (1 - t) ** EASE_EXPONENT` before being converted to a rotation
 * angle, so the spin is clearly visible within roughly the first 10-15%
 * of travel rather than only building up near the end. At
 * travelProgress = 0 this is exactly 0 for any exponent, so the resting
 * row is unaffected (still exactly flat).
 *
 * Kept deliberately mild (close to linear): the previous fix used a
 * steep exponent (8) to punch an onset through the shader's own quintic
 * `qinticInOut` easing, but that front-loads *all* of the rotation into
 * roughly the first half of the travel and flattens out for the rest —
 * exactly the "freezes mid-turn" symptom this constant now fixes. With
 * the shader-side easing removed (rotation is a direct, continuous
 * function of this eased value with no further clamping), a mild
 * exponent is enough for an early, clearly-visible onset (~55° by 12%
 * travel) while keeping the rotation rate roughly steady (no flat
 * stretch) all the way through to a full turn at travelProgress = 1. */
const EASE_EXPONENT = 1.4;

const ROTATION_AXIS = [0, 1, 0];
const DISTORTION_AXIS = [1, 1, 0];

/** Per-vertex rotation-angle phase offset, in radians — corners of the
 * plane lead/lag the centre's rotation angle by up to roughly this much,
 * which is what gives the spin its folded/wave character instead of
 * looking like a single rigid flat plane spinning. Same
 * `distortionAxis`-weighted `offset` term as the reference; only the
 * unit changed, from a shift applied to a clamped [0, 1] progress value
 * (which is what forced the old clamp()/fract() sweep pattern — see
 * TOTAL_ROTATION_TURNS above) to a direct radians shift on the final
 * angle, which stays well-behaved for a continuous, effectively
 * unbounded rotation. */
const DISTORTION_PHASE = 0.15;

/** ROOT-CAUSE FIX for the resting-row bend: the shader computes
 * `localAngle = uPosition + uDistortion * offset`, so with a *constant*
 * uDistortion the corners of each plane were rotated by up to
 * ~0.15 rad (~21° at the extreme corner, given offset ∈ [-1.5, 2.5])
 * even when uPosition was exactly 0 — shrinking each plane's projected
 * width and visibly widening the row gaps the moment the WebGL takeover
 * happened. uDistortion is therefore now driven per-frame as
 * `DISTORTION_PHASE * clamp01(easedTravel / DISTORTION_RAMP)`: exactly 0
 * at rest (planes perfectly flat, pixel-identical to the DOM images) and
 * at full fold strength once easedTravel passes this small ramp span
 * (~3.5% of raw travel), so the spin's fold/wave character is unchanged
 * for essentially the whole rotation. Pure function of easedTravel, so
 * scrolling back to top reverses through the same values and lands
 * exactly flat again. */
const DISTORTION_RAMP = 0.05;

/** Snap threshold for travel progress — guards against a sub-pixel
 * disagreement between the style-derived restTop and the live measured
 * rect leaving a residual not-quite-zero travel (and thus a residual
 * bend) at rest. */
const TRAVEL_EPSILON = 0.001;

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;
  attribute vec3 normal;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;

  uniform float uPosition;
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 distortionAxis;
  uniform vec3 rotationAxis;
  uniform float uDistortion;

  varying vec2 vUv;
  varying vec3 vNormal;

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

    // Per-vertex phase offset — same distortionAxis-weighted "offset"
    // term as the reference, but now applied as a direct additive shift
    // on the rotation ANGLE (radians) rather than as a shift on a
    // clamped [0, 1] progress value fed through an easing curve. This
    // keeps the fold/wave character (corners lead/lag the centre) while
    // staying well-behaved for a continuous, effectively unbounded
    // rotation — the old clamp()/fract()/qinticInOut sweep only worked
    // for a single bounded 0→1 transition and saturated (then went
    // numerically unstable) once asked for more than about half a turn.
    float norm = 0.5;
    float offset = ( dot(distortionAxis,position) +norm/2.)/norm;
    float localAngle = uPosition + uDistortion * offset;

    vec3 newpos = rotate(position, rotationAxis, localAngle);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
  }
`;

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

class GalleryPlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {HTMLElement} el the `.about-hero__img` wrapper (layout/measurement source)
   */
  constructor(gl, geometry, scene, el) {
    this.el = el;
    this.imgEl = el.querySelector('img');

    // Document-space rest top — scroll-independent (mirrors how
    // about-scroll.js itself reads this), so travel progress can be
    // derived purely from the live rect with no scroll value threaded in.
    this.restTop = parseFloat(el.style.top || '0');
    this.exitTop = 0;
    this.screen = { width: 1, height: 1 };
    this.viewport = { width: 1, height: 1 };

    const texture = new Texture(gl, { generateMipmaps: false });

    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        tMap: { value: texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        uSpeed: { value: 0 },
        rotationAxis: { value: ROTATION_AXIS },
        distortionAxis: { value: DISTORTION_AXIS },
        // Driven per-frame in update() — 0 at rest, ramping to
        // DISTORTION_PHASE once travel begins (see DISTORTION_RAMP).
        uDistortion: { value: 0 },
        uViewportSize: { value: [0, 0] },
        uTime: { value: 0 },
      },
      cullFace: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    this.mesh.setParent(scene);
    this.mesh.visible = false;

    this.ready = false;
    this.readyPromise = this.loadTexture(texture);
  }

  loadTexture(texture) {
    const src = this.imgEl?.currentSrc || this.imgEl?.src;
    if (!src) return Promise.resolve();

    return new Promise((resolve) => {
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

  resize(screen, viewport) {
    this.screen = screen;
    this.viewport = viewport;
    this.program.uniforms.uViewportSize.value = [viewport.width, viewport.height];

    // Card height doesn't change during the vertical travel (only its
    // screen Y does), so this is safe to (re)measure on resize only.
    const rect = this.el.getBoundingClientRect();
    if (rect.height > 0) this.exitTop = -rect.height;
  }

  update() {
    const rect = this.el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || !this.ready) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    const { screen, viewport } = this;
    const cx = rect.left + rect.width / 2 - screen.width / 2;
    const cy = rect.top + rect.height / 2 - screen.height / 2;

    this.mesh.position.x = (viewport.width * cx) / screen.width;
    this.mesh.position.y = -((viewport.height * cy) / screen.height);

    this.mesh.scale.x = (viewport.width * rect.width) / screen.width;
    this.mesh.scale.y = (viewport.height * rect.height) / screen.height;
    this.program.uniforms.uPlaneSize.value = [this.mesh.scale.x, this.mesh.scale.y];

    const span = Math.max(this.restTop - this.exitTop, 1);
    let travel = clamp01((this.restTop - rect.top) / span);
    // Snap to exactly 0 below epsilon — see TRAVEL_EPSILON above.
    if (travel < TRAVEL_EPSILON) travel = 0;
    // Ease-out before mapping to an angle — see EASE_EXPONENT above. At
    // travel === 0 this is exactly 0, so uPosition (now the rotation
    // angle itself, in radians) is exactly 0 at rest regardless of the
    // exponent — guards the flat resting row.
    const easedTravel = 1 - Math.pow(1 - travel, EASE_EXPONENT);

    this.program.uniforms.uPosition.value = easedTravel * TOTAL_ROTATION_TURNS * Math.PI * 2;
    // Ramp the per-vertex fold in from exactly 0 at rest — see
    // DISTORTION_RAMP above for why this can't be a constant.
    this.program.uniforms.uDistortion.value =
      DISTORTION_PHASE * clamp01(easedTravel / DISTORTION_RAMP);
    // uSpeed/uTime are declared in the vertex shader for parity with the
    // reference but unused in its rotation math (verified against the
    // reference source) — kept wired in case a future tweak reintroduces
    // a use for them, but they have no visual effect currently.
    this.program.uniforms.uSpeed.value = rect.top;
    this.program.uniforms.uTime.value += 0.04;
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
    if (this.imgEl) this.imgEl.style.opacity = '';
  }
}

/**
 * @param {HTMLElement[]} imgWrapperEls the three `.about-hero__img` elements
 * @returns {{ resize: () => void, destroy: () => void, ready: Promise<void> } | null}
 */
export function createRotatingGallery(imgWrapperEls) {
  const els = imgWrapperEls.filter((el) => el instanceof HTMLElement);
  if (els.length < 3) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'about-hero__gallery-canvas';
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
    console.warn('[rotating-gallery] WebGL renderer failed — falling back to DOM images.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;

  const scene = new Transform();
  const geometry = new Plane(gl, { heightSegments: 1, widthSegments: 100 });

  const planes = els.map((el) => new GalleryPlane(gl, geometry, scene, el));

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

    planes.forEach((plane) => plane.resize(screen, viewport));
  };

  let rafId = 0;
  let disposed = false;

  const tick = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    planes.forEach((plane) => plane.update());
    renderer.render({ scene, camera });
  };

  resize();
  const spacer = document.querySelector('body.about-page-3 [data-about-hero-spacer]');
  (spacer ?? document.body).appendChild(canvas);
  rafId = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    ready: Promise.all(planes.map((p) => p.readyPromise)).then(() => {}),
    resize,
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      planes.forEach((plane) => plane.destroy());
      geometry.remove();
      canvas.remove();
    },
  };
}
