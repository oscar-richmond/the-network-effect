import gsap from 'gsap';
import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * /about-3 Partners — WebGL noise-dissolve for the satellite IMAGE slot
 * (Stage-2 amendment 5): the per-brand bottom-right photo melts between
 * brands with the founders portrait-dissolve treatment (same simplex-
 * noise threshold + UV-warp shader family, founders-dissolve.js) instead
 * of the CSS blur transition the other satellite pieces keep.
 *
 * WHAT THIS DELIBERATELY INHERITS AND GUARDS AGAINST (Oscar's brief):
 * re-introducing a timed-transition path where the CSS choice had
 * designed the race class out. The panel-race lessons are applied
 * structurally:
 * - ONE persistent plane + ONE tween slot for the whole section — no
 *   per-swap object spawning, nothing queried from DOM state mid-flight.
 * - Retarget-from-playhead: a swap arriving mid-transition kills the
 *   running tween and re-bases — if the melt was past halfway the
 *   incoming texture becomes the new FROM (the closest freezable state a
 *   two-texture mix allows), otherwise the FROM endpoint is kept and
 *   only TO is replaced; progress restarts either way. Under hard
 *   scrubbing this churns by design, matching how the CSS blur behaved.
 * - Async supersession: texture loads carry a sequence stamp; only the
 *   LATEST requested brand may commit its retarget (a slow decode can
 *   never resurrect a stale swap — the explicit-state lesson).
 *
 * TEXTURE STRATEGY (hover-module windowing patterns, 45 brands):
 * - URLs dedupe: the 45 brands map onto ~23 unique pool images — cache
 *   keys are URLs, not brand indices.
 * - Decode cache: every unique URL decodes once into an offscreen
 *   canvas, downscaled to MAX_TEXTURE_WIDTH (the slot renders ~700
 *   device px wide — full-size pool JPGs would be pure VRAM waste).
 * - Prefetch window: on every active change, the URLs within
 *   PREFETCH_RADIUS wheel steps are decode-warmed ahead of need.
 * - GPU LRU: at most GPU_TEXTURE_BUDGET textures uploaded at once
 *   (~1.6MB each at 1024px -> low tens of MB worst case); the live
 *   from/to pair is never evicted.
 *
 * Returns null when WebGL is unavailable — the caller keeps the CSS
 * blur-dissolve path (the DOM satellite images stay painting; the
 * has-gl-image class is only added on success). Same fallback contract
 * as createFoundersDissolve.
 */

/** Melt length per brand swap, seconds — feel-tunable (Oscar's pass). */
const DISSOLVE_DURATION_S = 0.6;
const DISSOLVE_EASE = 'power2.inOut';
/** Noise frequency in UV space — founders runs 5.0 on a large portrait;
 * the satellite is a small slot, slightly coarser cells read better. */
const NOISE_SCALE = 4.0;
/** Peak UV distortion at mid-transition (founders' own value). */
const MAX_DISTORT = 0.12;
/** Softness band around the dissolve threshold (founders' own value). */
const EDGE_SOFTNESS = 0.25;
/** Decode-warm this many wheel steps around the active brand. */
const PREFETCH_RADIUS = 3;
/** Max GPU-resident textures (LRU beyond it, live pair exempt). */
const GPU_TEXTURE_BUDGET = 10;
/** Downscale bound for texture uploads, px (slot ≈ 700 device px). */
const MAX_TEXTURE_WIDTH = 1024;

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

// founders-dissolve.js's fragment, reduced to this slot's needs: same
// noise/threshold/warp core, no blur taps (no proxy blur exists here),
// no corner mask (the slot is square-cornered), uAlpha fixed at 1.
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTextureFrom;
  uniform sampler2D uTextureTo;
  uniform vec2 uImageSizeFrom;
  uniform vec2 uImageSizeTo;
  uniform vec2 uPlaneSizePx;
  uniform float uProgress;
  uniform float uNoiseScale;
  uniform float uMaxDistort;
  uniform float uEdgeSoftness;

  varying vec2 vUv;

  // 2D simplex noise — Ashima Arts / Ian McEwan (stegu/webgl-noise), MIT.
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
    float n = snoise(vUv * uNoiseScale) * 0.5 + 0.5;
    float pr = uProgress * (1.0 + 2.0 * uEdgeSoftness) - uEdgeSoftness;
    float m = 1.0 - smoothstep(pr - uEdgeSoftness, pr + uEdgeSoftness, n);

    float strength = sin(uProgress * 3.141592653589793) * uMaxDistort;
    vec2 warp = vec2(
      snoise(vUv * uNoiseScale + 3.7),
      snoise(vUv * uNoiseScale - 2.3)
    ) * strength;

    vec2 uvFrom = coverUv(vUv, uPlaneSizePx, uImageSizeFrom) + warp * m;
    vec2 uvTo = coverUv(vUv, uPlaneSizePx, uImageSizeTo) - warp * (1.0 - m);

    vec3 colFrom = texture2D(uTextureFrom, uvFrom).rgb;
    vec3 colTo = texture2D(uTextureTo, uvTo).rgb;

    gl_FragColor = vec4(mix(colFrom, colTo, m), 1.0);
  }
`;

/**
 * @param {HTMLElement} mount the slot element the canvas fills
 * @param {string[]} urls per-brand image URLs, wheel order
 * @param {number} initialIndex brand shown at rest
 * @returns {{ setActive: (i: number) => void, setPaused: (v: boolean) => void,
 *   resize: () => void, destroy: () => void } | null}
 */
export function createPartnersImageDissolve(mount, urls, initialIndex) {
  if (!urls.length) return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');

  let renderer;
  try {
    renderer = new Renderer({
      canvas,
      alpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
  } catch (error) {
    console.warn('[partners-image-dissolve] WebGL renderer failed — CSS dissolve stays.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;
  const scene = new Transform();
  const geometry = new Plane(gl);

  const program = new Program(gl, {
    depthTest: false,
    depthWrite: false,
    vertex: VERTEX_SHADER,
    fragment: FRAGMENT_SHADER,
    uniforms: {
      uTextureFrom: { value: new Texture(gl, { generateMipmaps: false }) },
      uTextureTo: { value: new Texture(gl, { generateMipmaps: false }) },
      uImageSizeFrom: { value: [1, 1] },
      uImageSizeTo: { value: [1, 1] },
      uPlaneSizePx: { value: [1, 1] },
      uProgress: { value: 0 },
      uNoiseScale: { value: NOISE_SCALE },
      uMaxDistort: { value: MAX_DISTORT },
      uEdgeSoftness: { value: EDGE_SOFTNESS },
    },
    cullFace: false,
  });
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);
  mesh.visible = false; // until the first texture commits

  // ── Decode + GPU caches (URL-keyed — the 45 brands dedupe to the
  // pool's unique files) ────────────────────────────────────────────────
  /** @type {Map<string, Promise<{ source: TexImageSource, w: number, h: number } | null>>} */
  const decodeCache = new Map();
  const decodeUrl = (url) => {
    let entry = decodeCache.get(url);
    if (!entry) {
      entry = new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          const scale = Math.min(1, MAX_TEXTURE_WIDTH / image.naturalWidth);
          if (scale >= 1) {
            resolve({ source: image, w: image.naturalWidth, h: image.naturalHeight });
            return;
          }
          const c = document.createElement('canvas');
          c.width = Math.round(image.naturalWidth * scale);
          c.height = Math.round(image.naturalHeight * scale);
          c.getContext('2d')?.drawImage(image, 0, 0, c.width, c.height);
          resolve({ source: c, w: c.width, h: c.height });
        };
        image.onerror = () => resolve(null); // missing file: swap simply no-ops
        image.src = url;
      });
      decodeCache.set(url, entry);
    }
    return entry;
  };

  /** @type {Map<string, { texture: InstanceType<typeof Texture>, w: number, h: number, stamp: number }>} */
  const texCache = new Map();
  let stampCounter = 0;
  const ensureTexture = async (url) => {
    const cached = texCache.get(url);
    if (cached) {
      cached.stamp = ++stampCounter;
      return cached;
    }
    const decoded = await decodeUrl(url);
    if (!decoded) return null;
    const again = texCache.get(url); // decoded twice in a race — reuse
    if (again) {
      again.stamp = ++stampCounter;
      return again;
    }
    const texture = new Texture(gl, { image: decoded.source, generateMipmaps: false });
    const entry = { texture, w: decoded.w, h: decoded.h, stamp: ++stampCounter };
    texCache.set(url, entry);
    // LRU eviction — never the live pair.
    if (texCache.size > GPU_TEXTURE_BUDGET) {
      let oldestUrl = null;
      let oldest = Infinity;
      texCache.forEach((e, u) => {
        if (u === state.fromUrl || u === state.toUrl) return;
        if (e.stamp < oldest) {
          oldest = e.stamp;
          oldestUrl = u;
        }
      });
      if (oldestUrl) {
        // OGL Textures own a WebGLTexture; drop the GL handle directly
        // (Texture has no dispose in this OGL version).
        const evict = texCache.get(oldestUrl);
        if (evict?.texture.texture) gl.deleteTexture(evict.texture.texture);
        texCache.delete(oldestUrl);
      }
    }
    return entry;
  };

  const prefetchAround = (index) => {
    for (let i = index - PREFETCH_RADIUS; i <= index + PREFETCH_RADIUS; i++) {
      if (urls[i]) decodeUrl(urls[i]);
    }
  };

  // ── The single transition mechanism ─────────────────────────────────
  const state = { fromUrl: '', toUrl: '', seq: 0 };
  /** @type {gsap.core.Tween | undefined} */
  let progressTween;

  const commitEndpoint = (which, entry, url) => {
    program.uniforms[which === 'from' ? 'uTextureFrom' : 'uTextureTo'].value = entry.texture;
    program.uniforms[which === 'from' ? 'uImageSizeFrom' : 'uImageSizeTo'].value = [
      entry.w,
      entry.h,
    ];
    state[which === 'from' ? 'fromUrl' : 'toUrl'] = url;
  };

  const retarget = (entry, url) => {
    progressTween?.kill();
    if (!state.toUrl) {
      // First commit — no transition, the rest brand simply appears.
      commitEndpoint('from', entry, url);
      commitEndpoint('to', entry, url);
      program.uniforms.uProgress.value = 1;
      mesh.visible = true;
      return;
    }
    // Re-base from the playhead: past halfway the incoming side already
    // dominates — promote it to FROM; otherwise keep FROM and replace TO.
    if (program.uniforms.uProgress.value >= 0.5) {
      const toEntry = texCache.get(state.toUrl);
      if (toEntry) commitEndpoint('from', toEntry, state.toUrl);
    }
    commitEndpoint('to', entry, url);
    program.uniforms.uProgress.value = 0;
    progressTween = gsap.to(program.uniforms.uProgress, {
      value: 1,
      duration: DISSOLVE_DURATION_S,
      ease: DISSOLVE_EASE,
    });
  };

  const setActive = (index) => {
    const url = urls[index];
    prefetchAround(index);
    if (!url || url === state.toUrl) return;
    const seq = ++state.seq;
    ensureTexture(url).then((entry) => {
      if (disposed || !entry || seq !== state.seq) return; // superseded
      retarget(entry, url);
    });
  };

  // ── Size + loop ──────────────────────────────────────────────────────
  const resize = () => {
    const rect = mount.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h);
    camera.perspective({ aspect: w / h });
    const fov = camera.fov * (Math.PI / 180);
    const viewH = 2 * Math.tan(fov / 2) * camera.position.z;
    mesh.scale.x = viewH * camera.aspect;
    mesh.scale.y = viewH;
    program.uniforms.uPlaneSizePx.value = [w, h];
  };

  let rafId = 0;
  let disposed = false;
  let paused = false;
  const tick = () => {
    if (disposed || paused) return;
    rafId = requestAnimationFrame(tick);
    renderer.render({ scene, camera });
  };

  resize();
  mount.appendChild(canvas);
  rafId = requestAnimationFrame(tick);
  setActive(initialIndex);

  return {
    setActive,
    resize,
    /** Idle/resume with stage visibility (founders setPaused contract). */
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
      progressTween?.kill();
      texCache.forEach((entry) => {
        if (entry.texture.texture) gl.deleteTexture(entry.texture.texture);
      });
      texCache.clear();
      mesh.setParent(null);
      program.remove();
      geometry.remove();
      canvas.remove();
    },
  };
}
