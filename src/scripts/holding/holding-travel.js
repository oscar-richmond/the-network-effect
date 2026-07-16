import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';
import { createDriftDriver } from './holding-shared.js';

/**
 * /holding-2's MOBILE/TABLET gallery (<=1024, Figma 9135ovd3e9n2xa6i
 * node 0:3): ONE image travelling bottom -> top BEHIND the page's
 * difference-blend text, scroll/touch-driven ONLY (no autonomous drift —
 * the design deliberately supersedes the touch-drift-only decision),
 * folding with /holding's curl register as it travels.
 *
 * THE POKE (approved): at rest — and at every loop boundary — the
 * current image PEEKS POKE_PX above the bottom edge. On a page that
 * never scrolls, the poke is the mechanic's discoverability: the only
 * affordance saying scroll input does anything. The entry choreography
 * rises image 1 from fully-below to the poke.
 *
 * SEGMENT MODEL (exit gate + cycling + reverse, one mechanism): travel
 * t divides into segments of span = regionH + imageH - POKE_PX. Segment
 * k shows image (k mod N): at segment-local s=0 the image pokes; at
 * s=span its last sliver leaves the top EXACTLY as the next segment's
 * image pokes in below. One plane, one texture: two images can never be
 * visible, swaps happen only at fully-offscreen boundaries, and reverse
 * travel is the exact mirror (the previous image re-enters from the
 * top, un-spinning). Momentum crossing several boundaries just advances
 * several images.
 *
 * THE SPIN: the curl shaders below are VERBATIM from holding-gallery.js
 * (itself byte-faithful to the Codrops reference — see that module's
 * provenance comments), duplicated rather than exported so /holding's
 * module file stays untouched. uPosition follows the same
 * map(y, -vpH, +vpH, 5, 15) convention, driven purely by travel
 * position: no input, no motion.
 */

/** The design's resting peek (frame: image top at 857 of 874 content-
 * relative ~17px). Tunable. */
const POKE_PX = 18;
/** Image width: the design's 354/402 = 88vw, capped for tablets. */
const IMAGE_WIDTH_FRACTION = 0.88;
const IMAGE_MAX_WIDTH_PX = 620;
const DEFAULT_ASPECT = 800 / 534;
/** Entry rise to the poke (house curve timing register). */
const ENTRY_RISE_MS = 900;

// holding-gallery.js's shaders, verbatim (Codrops reference lineage).
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

  float PI = 3.141592653589793238;

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

  float qinticInOut(float t) {
    return t < 0.5
      ? +16.0 * pow(t, 5.0)
      : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
  }

  void main() {
    vUv = uv;

    float norm = 0.5;

    vec3 newpos = position;
    float offset = ( dot(distortionAxis,position) +norm/2.)/norm;

    float localprogress = clamp( (fract(uPosition * 5.0 * 0.01) - 0.01*uDistortion*offset)/(1. - 0.01*uDistortion),0.,2.);

    localprogress = qinticInOut(localprogress)*PI;

    newpos = rotate(newpos,rotationAxis,localprogress);

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

const CURL_DISTORTION = 3;
const UPOSITION_MIN = 5;
const UPOSITION_MAX = 15;

function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * @param {HTMLElement} region the full-viewport travel host (fixed,
 *   behind the blend text — see holding-page.css's mobile block). Also
 *   the touch/wheel capture surface. Contains the poked poster img
 *   (the RM / no-WebGL / pre-decode static frame).
 * @param {string[]} imageUrls the HP Gallery set, cycled one per loop.
 * @returns {{ ready: Promise<void>, resize: () => void,
 *   tickOnce: (dtMs?: number) => void, debugState: () => object,
 *   destroy: () => void } | null}
 */
export function createHoldingTravel(region, imageUrls) {
  if (!(region instanceof HTMLElement) || !imageUrls.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'holding-travel__gl';
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
    console.warn('[holding-travel] WebGL renderer failed — poked poster stays.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;
  const scene = new Transform();
  const geometry = new Plane(gl, { heightSegments: 1, widthSegments: 100 });

  const texture = new Texture(gl, { generateMipmaps: false });
  const program = new Program(gl, {
    depthTest: false,
    depthWrite: false,
    vertex: VERTEX_SHADER,
    fragment: FRAGMENT_SHADER,
    uniforms: {
      tMap: { value: texture },
      uPosition: { value: 0 },
      uPlaneSize: { value: [0, 0] },
      uImageSize: { value: [1, 1] },
      rotationAxis: { value: [0, 1, 0] },
      distortionAxis: { value: [1, 1, 0] },
      uDistortion: { value: CURL_DISTORTION },
    },
    cullFace: false,
  });
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);
  mesh.visible = false;

  // All set images decode up front (46-74KB each) — boundary swaps reuse
  // decoded bitmaps, never re-fetch.
  const images = imageUrls.map(() => null);
  const ready = Promise.all(
    imageUrls.map(
      (src, i) =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            images[i] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => {});

  let regionSize = { width: 1, height: 1 };
  let viewport = { width: 1, height: 1 };
  let imgW = 1;
  let currentIndex = -1;

  const currentAspect = () => {
    const img = images[mod(currentIndex, images.length)];
    return img ? img.naturalWidth / Math.max(img.naturalHeight, 1) : DEFAULT_ASPECT;
  };

  const layout = () => {
    const rect = region.getBoundingClientRect();
    regionSize = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    renderer.setSize(regionSize.width, regionSize.height);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = camera.fov * (Math.PI / 180);
    const vh = 2 * Math.tan(fov / 2) * camera.position.z;
    viewport = { width: vh * camera.aspect, height: vh };
    imgW = Math.min(regionSize.width * IMAGE_WIDTH_FRACTION, IMAGE_MAX_WIDTH_PX);
  };

  /** Entry rise: a time-eased offset from -(POKE+height margin) to 0,
   * added to travel — image 1 rises into the poke. Skipped (0) when the
   * boot never constructs this module (RM), and inert once complete. */
  let entryStartTs = 0;
  let entryDone = false;
  const entryOffset = (nowMs) => {
    if (entryDone) return 0;
    if (!entryStartTs) return -POKE_PX - 12;
    const t = Math.min((nowMs - entryStartTs) / ENTRY_RISE_MS, 1);
    if (t >= 1) {
      entryDone = true;
      return 0;
    }
    const eased = 1 - Math.pow(1 - t, 3);
    return (-POKE_PX - 12) * (1 - eased);
  };

  const place = (travelPx) => {
    const imgH = imgW / currentAspect();
    const span = regionSize.height + imgH - POKE_PX;
    const t = travelPx + entryOffset(performance.now());
    const k = Math.floor(t / span);
    const s = t - k * span;

    if (k !== currentIndex) {
      currentIndex = k;
      const img = images[mod(k, images.length)];
      if (img) {
        texture.image = img;
        texture.needsUpdate = true;
        program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight];
      }
    }

    const imgH2 = imgW / currentAspect(); // aspect may differ post-swap
    const topPx = regionSize.height - POKE_PX - s; // image top edge, CSS px
    const centreY = topPx + imgH2 / 2;
    const yVp = ((regionSize.height / 2 - centreY) / regionSize.height) * viewport.height;

    mesh.visible = images[mod(currentIndex, images.length)] != null;
    mesh.position.x = 0;
    mesh.position.y = yVp;
    mesh.scale.x = (imgW / regionSize.width) * viewport.width;
    mesh.scale.y = (imgH2 / regionSize.height) * viewport.height;
    program.uniforms.uPlaneSize.value = [imgW, imgH2];
    program.uniforms.uPosition.value =
      UPOSITION_MIN +
      ((yVp + viewport.height) / (2 * viewport.height)) * (UPOSITION_MAX - UPOSITION_MIN);

    renderer.render({ scene, camera });
    return { k, s, span, topPx, imgH: imgH2 };
  };

  let lastPlace = { k: 0, s: 0, span: 1, topPx: 0, imgH: 1 };
  // INPUT SURFACE: NOT the region — on mobile the region is the fixed
  // z:-1 layer BEHIND the column, and hit-testing routes every real
  // wheel/touch to the column's content, whose bubble path (column ->
  // stage -> body) never includes a behind-layer sibling. Capturing on
  // the stage (the full-viewport in-flow ancestor everything bubbles
  // through) is what makes real input work; the region keeps canvas +
  // layout duties only. (The original region-scoped capture passed
  // verification because synthetic dispatchEvent ON the region bypasses
  // hit-testing — real input exposed it.)
  const inputSurface = region.closest('.holding-page__stage') ?? document.body;
  const driver = createDriftDriver(inputSurface, {
    onFrame: (travelPx) => {
      lastPlace = place(travelPx);
    },
    autoDrift: 0, // scroll-driven only — the design supersedes drift here
    touch: true,
  });

  const onResize = () => {
    layout();
    lastPlace = place(driver.state().travelPx);
  };
  window.addEventListener('resize', onResize);
  // iOS URL-bar collapse changes the visual viewport without always
  // firing window resize — re-derive on it too.
  window.visualViewport?.addEventListener('resize', onResize);

  layout();
  region.appendChild(canvas);

  // Takeover: poked poster hides only after the canvas has actually
  // painted (the flash-window contract, per the warp module).
  const poster = region.querySelector('[data-holding-travel-poster]');
  let takeoverTimeout = 0;
  const hidePoster = () => {
    if (poster instanceof HTMLElement) poster.style.visibility = 'hidden';
  };
  ready.then(() => {
    entryStartTs = performance.now();
    lastPlace = place(driver.state().travelPx);
    canvas.classList.add('is-live');
    canvas.addEventListener('transitionend', hidePoster, { once: true });
    const checkCovered = () => {
      if (parseFloat(getComputedStyle(canvas).opacity) >= 0.99) hidePoster();
      else takeoverTimeout = window.setTimeout(checkCovered, 500);
    };
    takeoverTimeout = window.setTimeout(checkCovered, 600);
  });

  return {
    ready,
    resize: onResize,
    tickOnce(dtMs = 16.7) {
      driver.tickOnce(dtMs);
    },
    debugState() {
      return {
        ...driver.state(),
        ...lastPlace,
        pokePx: POKE_PX,
        imageIndex: mod(currentIndex, images.length),
        regionSize: { ...regionSize },
        entryDone,
      };
    },
    destroy() {
      driver.destroy();
      clearTimeout(takeoverTimeout);
      canvas.removeEventListener('transitionend', hidePoster);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      mesh.setParent(null);
      program.remove();
      geometry.remove();
      canvas.remove();
      if (poster instanceof HTMLElement) poster.style.visibility = '';
    },
  };
}
