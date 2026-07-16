import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';
import { createDriftDriver } from './holding-shared.js';

/**
 * Holding-page auto-rolling curl gallery — the Codrops RotatingSlideshow
 * reference's deformation VERBATIM (see the curl-constants block below
 * for why the house rotating-fold adaptation was reverted here), driven
 * by a NEW, fully self-contained time/wheel driver, per the approved
 * Phase 1 plan.
 *
 * LINEAGE: the reference's vertex shader and uPosition/uDistortion
 * conventions verbatim (src/_reference/rotating-slideshow, MIT); the
 * cover-crop fragment shader (identical in the reference and every
 * house adaptation); rotating-fold.js's OGL renderer/camera/dpr
 * conventions, destroy lifecycle, and tickOnce()/debugState()
 * verification hooks.
 *
 * DEPARTURES from both site ancestors, per plan:
 * - No DOM proxies: planes live in a virtual vertical strip
 *   (y = slot x index, offset by one travel scalar) — the Codrops
 *   reference's own model, which is what makes infinite wrap clean.
 * - Region-local renderer: the canvas and ALL derived math (viewport,
 *   wrap thresholds, fold progress) are sized to the gallery region,
 *   not the window — the module cannot touch the left column.
 * - Infinite wrap: the reference's extra/heightTotal modulo, with
 *   direction taken from the sign of the per-frame travel delta rather
 *   than the reference's global up/down flag (handles mid-frame wheel
 *   reversals without a mis-wrap).
 *
 * THE DRIVER (approved design): one velocity value. Auto-drift is its
 * home value; wheel deltas write impulses into it; every frame it lerps
 * back home and travel integrates it. Travel is an integral, so the
 * auto<->wheel handoff is continuous by construction — input only ever
 * changes acceleration, never position. Images travel UPWARD at rest
 * (Oscar's judgment call 2); wheel drives both directions.
 *
 * Wheel capture is scoped to the region element only (judgment call 1):
 * listener on the region, passive:false + preventDefault — the rest of
 * the page never sees gallery scroll intent, and the gallery never sees
 * the page's. Touch devices: auto-drift only, no drag (approved) — the
 * wheel listener simply never fires.
 *
 * REDUCED MOTION: the caller never constructs this module — the static
 * poster <img> stays. WebGL init failure degrades the same way (returns
 * null, poster stays), rotating-fold's degradation contract.
 */

/** Card layout: width as a fraction of the region, aspect locked to the
 * HP Carousel set (480x550 portrait crops — cover-crop cuts zero
 * pixels), gap as a fraction of card height. Cards also cap to
 * CARD_MAX_HEIGHT_FRACTION of the region so the tablet band / phone
 * strip (short, wide regions) keep whole cards visible rather than a
 * clipped peek-window. Halved from the original 0.82/0.72 per Oscar
 * (cards 2x smaller) — which also largely resolves the earlier softness
 * flag: the ~295px CSS card at desktop is much closer to the 480px
 * native exports. */
const CARD_WIDTH_FRACTION = 0.41;
const CARD_ASPECT = 480 / 550;
const CARD_GAP_FRACTION = 0.14;
const CARD_MAX_HEIGHT_FRACTION = 0.36;

/** Curl constants — the REFERENCE'S OWN deformation values, extracted
 * from src/_reference/rotating-slideshow (Media.js + vertex.glsl), not
 * the house rotating-fold adaptation. The reference's swirl/curl
 * character comes from running qinticInOut PER-VERTEX in the shader:
 * each vertex's progress lags by up to 0.01*CURL_DISTORTION*offset
 * (offset spans [-1.5, 2.5] along the plane diagonal), and qintic's
 * slope — steep mid-travel, ~zero at the ends — amplifies that constant
 * lag into a large angular twist exactly while the card is turning
 * (~108 deg of wind-up across the plane at mid-turn with the stock
 * value 3), collapsing back to flat as the turn settles. Curl amplitude
 * is intrinsically coupled to turn rate; there is no separate amplitude
 * ramp. The earlier house shader (rotating-gallery/rotating-fold)
 * deliberately REMOVED the in-shader qintic to support unbounded
 * scroll-driven rotation — that removal is what flattened the curl into
 * the rigid-card "bowtie pinch" on this page; the reference's bounded
 * travel model fits the holding gallery, so its original math returns
 * verbatim. */
/** The reference's uDistortion (Media.js: `uDistortion: { value: 3 }`,
 * constant) — Oscar's curl-strength tunable. */
const CURL_DISTORTION = 3;
/** The reference's uPosition convention (Media.js: map(plane.y, -vpH,
 * +vpH, 5, 15)); the shader rescales by 0.05, so travel spans effective
 * progress 0.25..0.75 — flat-ish on entry, edge-on mid-region, flat
 * (backside) on exit. */
const UPOSITION_MIN = 5;
const UPOSITION_MAX = 15;
const CURL_ROTATION_AXIS = [0, 1, 0];
const CURL_DISTORTION_AXIS = [1, 1, 0];

// The reference's vertex shader, verbatim
// (src/_reference/rotating-slideshow/src/shaders/vertex.glsl).
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

// The lineage's cover-crop fragment shader, verbatim.
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

class GalleryPlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {string} url
   * @param {number} index
   * @param {number} count
   */
  constructor(gl, geometry, scene, url, index, count) {
    this.index = index;
    this.count = count;
    /** Wrap accumulator — an INTEGER count of loop circumferences, not
     * the reference's pre-multiplied `extra` offset. Multiplied by the
     * CURRENT loop length each frame, so accumulated wraps stay valid
     * across a resize (a stored offset in old-layout units would leave a
     * permanent seam after the slot metric changes — caught live in
     * verification). */
    this.wraps = 0;
    this.ready = false;
    this.lastState = { y: 0, uPosition: 0, uDistortion: 0, wraps: 0 };

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
        rotationAxis: { value: CURL_ROTATION_AXIS },
        distortionAxis: { value: CURL_DISTORTION_AXIS },
        // Constant, the reference's own convention — the curl breathes
        // with qintic's slope, not with an amplitude ramp.
        uDistortion: { value: CURL_DISTORTION },
      },
      cullFace: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    this.mesh.setParent(scene);
    this.mesh.visible = false;

    this.readyPromise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        texture.image = image;
        this.program.uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight];
        this.ready = true;
        resolve();
      };
      image.onerror = () => resolve(); // a failed image mustn't hold the gallery hostage
      image.src = url;
    });
  }

  /**
   * @param {{cardW: number, cardH: number, slot: number, loop: number}} layout viewport units
   */
  layout(layout) {
    this.layoutVp = layout;
    this.mesh.scale.x = layout.cardW;
    this.mesh.scale.y = layout.cardH;
    this.program.uniforms.uPlaneSize.value = [layout.cardW, layout.cardH];
    this.mesh.position.x = 0;
    // Stack downward from the region centre: index 0 at 0, 1 below, ...
    this.baseY = -layout.slot * this.index;
  }

  /**
   * @param {number} travelVp travel in viewport units (positive = strip moves up)
   * @param {number} viewportH region viewport height
   */
  update(travelVp, viewportH) {
    if (!this.ready || !this.layoutVp) {
      this.mesh.visible = false;
      return;
    }
    const { slot, loop } = this.layoutVp;
    const half = this.mesh.scale.y / 2;

    // Infinite wrap — STATELESS closed-form fold (the resize-bug fix,
    // mirrored in holding-warp.js: see its placeSlides note): the raw
    // strip position folds into the canonical window (T - loop, T]
    // every frame, T one slot above the band top. No accumulated wrap
    // counts to go stale when resize re-derives the loop; both travel
    // directions handled with no direction gate.
    const windowTop = viewportH / 2 + slot / 2;
    const raw = this.baseY + travelVp;
    const k = Math.ceil((raw - windowTop) / loop);
    const y = raw - k * loop;
    this.wraps = -k; // kept for the debug surface

    this.mesh.visible = true;
    this.mesh.position.y = y;

    // Curl: the reference's exact uPosition driver (Media.js:
    // map(plane.y, -vpH, +vpH, 5, 15)) — the per-vertex qintic in the
    // shader does everything else. Continuous progressive roll: flat-ish
    // entering from below, edge-on mid-curl at the centre, flat
    // (backside) exiting above.
    const uPosition =
      UPOSITION_MIN +
      ((y + viewportH) / (2 * viewportH)) * (UPOSITION_MAX - UPOSITION_MIN);
    this.program.uniforms.uPosition.value = uPosition;
    this.lastState = { y, uPosition, wraps: this.wraps };
  }

  destroy() {
    this.mesh.setParent(null);
    this.program.remove();
  }
}

/**
 * @param {HTMLElement} region the gallery region (canvas host, wheel scope,
 *   size source). The poster <img> inside it hides once all textures are
 *   decoded — the founders-dissolve takeover, so no blank frame can show.
 * @param {string[]} imageUrls display order
 * @returns {{ ready: Promise<void>, resize: () => void,
 *   tickOnce: (dtMs?: number) => void, debugState: () => object,
 *   destroy: () => void } | null} null when WebGL is unavailable — the
 *   poster stays (degradation contract).
 */
export function createHoldingGallery(region, imageUrls) {
  if (!(region instanceof HTMLElement) || imageUrls.length < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'holding-gallery__canvas';
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
    console.warn('[holding-gallery] WebGL renderer failed — poster image stays.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;
  const scene = new Transform();
  // The lineage's segment density — the fold needs the vertices.
  const geometry = new Plane(gl, { heightSegments: 1, widthSegments: 100 });

  const planes = imageUrls.map(
    (url, i) => new GalleryPlane(gl, geometry, scene, url, i, imageUrls.length),
  );

  let regionSize = { width: 1, height: 1 };
  let viewport = { width: 1, height: 1 };
  /** CSS px -> viewport units, vertical. */
  let pxToVp = 1;

  const resize = () => {
    const rect = region.getBoundingClientRect();
    regionSize = { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
    renderer.setSize(regionSize.width, regionSize.height);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    const fov = camera.fov * (Math.PI / 180);
    const height = 2 * Math.tan(fov / 2) * camera.position.z;
    const width = height * camera.aspect;
    viewport = { width, height };
    pxToVp = viewport.height / regionSize.height;

    // Card sizing in CSS px (width-led, height-capped for the tablet
    // band / phone strip), then converted to viewport units.
    let cardWPx = regionSize.width * CARD_WIDTH_FRACTION;
    let cardHPx = cardWPx / CARD_ASPECT;
    const maxHPx = regionSize.height * CARD_MAX_HEIGHT_FRACTION;
    if (cardHPx > maxHPx) {
      cardHPx = maxHPx;
      cardWPx = cardHPx * CARD_ASPECT;
    }
    const slotPx = cardHPx * (1 + CARD_GAP_FRACTION);
    const layout = {
      cardW: cardWPx * (viewport.width / regionSize.width),
      cardH: cardHPx * pxToVp,
      slot: slotPx * pxToVp,
      loop: slotPx * pxToVp * planes.length,
    };
    planes.forEach((plane) => plane.layout(layout));
  };

  // ── The driver: one velocity value, shared plumbing (holding-shared.js
  // — extracted verbatim-semantics so /holding-2's stack rides the same
  // approved motion). This module renders in the driver's onFrame.
  let disposed = false;
  const render = (travelPx) => {
    const travelVp = travelPx * pxToVp;
    planes.forEach((plane) => plane.update(travelVp, viewport.height));
    renderer.render({ scene, camera });
  };
  const driver = createDriftDriver(region, { onFrame: render });

  // Resize re-derives geometry on the live instance and repaints
  // synchronously (renderer.setSize clears the canvas — the immediate
  // render means a resize drag never shows a blank frame). The
  // stateless fold in GalleryPlane.update makes any new loop land
  // instantly on a coherent strip: derive-don't-rebuild.
  const onResize = () => {
    resize();
    render(driver.state().travelPx);
  };
  window.addEventListener('resize', onResize);

  resize();
  canvas.style.visibility = 'hidden'; // until every texture is decoded
  region.appendChild(canvas);

  const poster = region.querySelector('[data-holding-gallery-poster]');
  let takeoverTimeout = 0;
  const hidePoster = () => {
    if (poster instanceof HTMLElement) poster.style.visibility = 'hidden';
  };
  const ready = Promise.all(planes.map((p) => p.readyPromise)).then(() => {
    if (disposed) return;
    // Takeover: with the reference's continuous-roll grammar the
    // region-centre card is mid-curl (edge-on), so the flat poster and
    // the first canvas frame no longer match geometrically — the canvas
    // fades in over the poster (is-live, 0.4s CSS) instead of a hard
    // swap. The poster hides only once the fade has ACTUALLY covered it
    // (transitionend, with an opacity-checking fallback poll) — a plain
    // timer would fire in a background tab while the frozen transition
    // holds the canvas transparent, leaving a blank region on tab-show.
    render(driver.state().travelPx);
    canvas.style.visibility = '';
    canvas.classList.add('is-live');
    canvas.addEventListener('transitionend', hidePoster, { once: true });
    const checkCovered = () => {
      if (disposed) return;
      if (parseFloat(getComputedStyle(canvas).opacity) >= 0.99) hidePoster();
      else takeoverTimeout = window.setTimeout(checkCovered, 500);
    };
    takeoverTimeout = window.setTimeout(checkCovered, 600);
  });

  return {
    ready,
    resize,
    /** One synchronous integrate+render — the lineage's verification
     * hook (the occluded-tab environment has no rAF; harmless in
     * production). */
    tickOnce(dtMs = 16.7) {
      if (disposed) return;
      driver.tickOnce(dtMs);
    },
    debugState() {
      return {
        ...driver.state(),
        regionSize: { ...regionSize },
        planes: planes.map((p) => ({ ...p.lastState, ready: p.ready })),
      };
    },
    destroy() {
      disposed = true;
      driver.destroy();
      clearTimeout(takeoverTimeout);
      canvas.removeEventListener('transitionend', hidePoster);
      window.removeEventListener('resize', onResize);
      planes.forEach((plane) => plane.destroy());
      geometry.remove();
      canvas.remove();
      if (poster instanceof HTMLElement) poster.style.visibility = '';
    },
  };
}
