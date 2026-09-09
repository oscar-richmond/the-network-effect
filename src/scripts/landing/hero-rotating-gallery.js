import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * THE THREE-IMAGE HERO's WebGL takeover (R8, Oscar 2026-09-02) — the
 * /old hero's rotating-gallery module (src/scripts/about-3/
 * rotating-gallery.js, itself from the Codrops "WebGL Rotating Image
 * Gallery" reference) ported for the landing hero. Shaders, rotation
 * maths and the "invisible DOM proxy + rAF-synced planes" technique
 * are verbatim — this IS the reference feel: each card rotates about
 * its vertical axis through a full turn as it rises (eased so ~55° is
 * visible by 12% of travel, steady to the end), with a per-vertex
 * fold that ramps in over the first 5% of travel so the resting row
 * is pixel-flat. landing-hero-scroll.js keeps sole ownership of WHEN
 * the cards move (the scrubbed y tweens); this module only reads
 * their resulting geometry every frame.
 *
 * DEPARTURES from the /old module, all lifecycle: (1) the canvas
 * mounts INSIDE the hero's fixed stage (a sibling of the DOM cards at
 * their z, never an ancestor of any blended element — the nav sits
 * on its own fixed layer above the stage); (2) the rest top comes
 * from the card's laid-out rest position at build (parseFloat of the
 * inline top the scroll module writes), same source as /old;
 * (3) setPaused(): the tick stops while the hero is scrolled past
 * (the founders section covers the stage) so the page never spends
 * GPU on an invisible canvas; (4) destroy() restores the DOM imgs.
 * The landing had zero GL contexts before this — this is the one.
 */

const TOTAL_ROTATION_TURNS = 1.0;
const EASE_EXPONENT = 1.4;
const ROTATION_AXIS = [0, 1, 0];
const DISTORTION_AXIS = [1, 1, 0];
const DISTORTION_PHASE = 0.15;
const DISTORTION_RAMP = 0.05;
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

class HeroPlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {HTMLElement} el the `.landing-hero__card` wrapper
   * @param {() => number} restTopOf the card's rest top in stage space
   */
  constructor(gl, geometry, scene, el, restTopOf) {
    this.el = el;
    this.imgEl = el.querySelector('img');
    this.restTopOf = restTopOf;
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
      image.onerror = () => resolve();
      image.src = src;
    });
  }

  resize(screen, viewport) {
    this.screen = screen;
    this.viewport = viewport;
    this.program.uniforms.uViewportSize.value = [viewport.width, viewport.height];
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

    const restTop = this.restTopOf();
    const span = Math.max(restTop - this.exitTop, 1);
    let travel = clamp01((restTop - rect.top) / span);
    if (travel < TRAVEL_EPSILON) travel = 0;
    const easedTravel = 1 - Math.pow(1 - travel, EASE_EXPONENT);

    this.program.uniforms.uPosition.value = easedTravel * TOTAL_ROTATION_TURNS * Math.PI * 2;
    this.program.uniforms.uDistortion.value =
      DISTORTION_PHASE * clamp01(easedTravel / DISTORTION_RAMP);
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
 * @param {HTMLElement[]} cardEls the three `.landing-hero__card` wrappers
 * @param {{ mount: HTMLElement, restTopOf: (el: HTMLElement) => number }} opts
 * @returns {{ ready: Promise<void>, resize: () => void, setPaused: (p: boolean) => void, destroy: () => void } | null}
 */
export function createHeroRotatingGallery(cardEls, opts) {
  const els = cardEls.filter((el) => el instanceof HTMLElement);
  if (els.length < 3 || !(opts?.mount instanceof HTMLElement)) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'landing-hero__gallery-canvas';
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
    console.warn('[hero-rotating-gallery] WebGL renderer failed — DOM cards stay.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;

  const scene = new Transform();
  const geometry = new Plane(gl, { heightSegments: 1, widthSegments: 100 });

  const planes = els.map((el) => new HeroPlane(gl, geometry, scene, el, () => opts.restTopOf(el)));

  let screen = { width: 1, height: 1 };
  let viewport = { width: 1, height: 1 };

  const resize = () => {
    /* the rebuild (2026-09-07): the STAGE's box, not the window's — on the
       phone the stage is 100svh and innerHeight moves with the URL bar,
       which would skew every plane against its DOM card; on the desktop
       the fixed stage IS the viewport, so the numbers are identical. */
    screen = { width: opts.mount.clientWidth || window.innerWidth, height: opts.mount.clientHeight || window.innerHeight };
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
  let paused = false;

  const tick = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (paused) return;
    planes.forEach((plane) => plane.update());
    renderer.render({ scene, camera });
  };

  resize();
  opts.mount.appendChild(canvas);
  rafId = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    ready: Promise.all(planes.map((p) => p.readyPromise)).then(() => {}),
    resize,
    setPaused(p) {
      paused = !!p;
      canvas.style.visibility = paused ? 'hidden' : '';
    },
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
