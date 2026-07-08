import { Renderer, Camera, Transform, Plane, Mesh, Program, Texture } from 'ogl';

/**
 * /about-3 Founders section — WebGL noise-dissolve for the slide 1 → 2
 * image transition (full-bleed background + sharp portrait). OGL, following
 * rotating-gallery.js's established patterns: inline glsl template-string
 * shaders, DOM-rect-synced plane sizing, own rAF, resize/destroy lifecycle.
 *
 * Architecture (per the approved plan):
 * - TWO planes, one per image PAIR (background pair, portrait pair) — the
 *   dissolve needs both slides' textures in one fragment shader
 *   (uTextureFrom/uTextureTo mixed per-pixel), and both slides' backgrounds /
 *   portraits occupy identical rects, so one quad per pair covers both
 *   endpoints exactly.
 * - Invisible DOM proxies: each plane mirrors slide 1's corresponding DOM
 *   element every frame via getBoundingClientRect() (position/size — the
 *   portrait's entrance rise comes free) and reads its computed opacity into
 *   uAlpha (the scroll-scrubbed entrance fades stay owned by GSAP in
 *   founders-scroll.js; this module only reads their result). The four
 *   slide <img>s are set visibility: hidden once textures are ready —
 *   rects/opacity still measurable, paint off.
 * - uProgress is written straight through from the snap timeline's proxy
 *   tween (no lerp-toward-target — the tween is already smooth and eased,
 *   and a lerp would trail behind the DOM text tweens it must sync with).
 *   GSAP renders exact final values at completion, so distortion
 *   (sin(uProgress·π)) is exactly zero at both resting endpoints.
 * - Returns null if the WebGL renderer can't be created — the caller keeps
 *   the DOM image crossfade as the degradation path (same console.warn +
 *   fallback contract as createRotatingGallery).
 */

/** Noise frequency in UV space — higher = smaller dissolve cells. */
const NOISE_SCALE = 5.0;
/** Peak UV distortion at mid-transition (sin(uProgress·π) envelope —
 * exactly zero at both endpoints, so resting slides are pixel-crisp). */
const MAX_DISTORT = 0.12;
/** Half-width of the smoothstep band around the per-pixel dissolve
 * threshold — larger = softer, more overlapped region edges. */
const EDGE_SOFTNESS = 0.25;
/** Portrait corner radius in CSS px — mirrors the DOM wrapper's
 * border-radius: 4px, which the canvas can't inherit (SDF alpha mask). */
const PORTRAIT_RADIUS_PX = 4;

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

  uniform sampler2D uTextureFrom;
  uniform sampler2D uTextureTo;
  uniform vec2 uImageSizeFrom;
  uniform vec2 uImageSizeTo;
  uniform vec2 uPlaneSizePx;
  uniform float uProgress;
  uniform float uAlpha;
  uniform float uNoiseScale;
  uniform float uMaxDistort;
  uniform float uEdgeSoftness;
  uniform float uRadiusPx;

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

  // Cover-crop (same ratio maths as rotating-gallery's fragment shader) —
  // aspect-only, so px plane size vs texel image size is fine.
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

  float roundedBoxSdf(vec2 pos, vec2 halfSize, float radius) {
    vec2 q = abs(pos) - halfSize + radius;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  void main() {
    // Per-pixel dissolve threshold: noise in [0, 1]; uProgress's range is
    // extended by the softness band so BOTH endpoints fully resolve
    // (m ≡ 0 at uProgress 0, m ≡ 1 at uProgress 1 — no residual ghost).
    float n = snoise(vUv * uNoiseScale) * 0.5 + 0.5;
    float pr = uProgress * (1.0 + 2.0 * uEdgeSoftness) - uEdgeSoftness;
    float m = 1.0 - smoothstep(pr - uEdgeSoftness, pr + uEdgeSoftness, n);

    // UV warp — zero at rest and completion, peaking mid-transition. The
    // outgoing image warps where it has already dissolved (m), the incoming
    // one where it hasn't arrived yet (1 - m): the melt tracks the dissolve
    // front rather than sliding the whole frame.
    float strength = sin(uProgress * 3.141592653589793) * uMaxDistort;
    vec2 warp = vec2(
      snoise(vUv * uNoiseScale + 3.7),
      snoise(vUv * uNoiseScale - 2.3)
    ) * strength;

    vec2 uvFrom = coverUv(vUv, uPlaneSizePx, uImageSizeFrom) + warp * m;
    vec2 uvTo = coverUv(vUv, uPlaneSizePx, uImageSizeTo) - warp * (1.0 - m);

    vec3 col = mix(texture2D(uTextureFrom, uvFrom).rgb, texture2D(uTextureTo, uvTo).rgb, m);

    // Rounded-corner mask (portrait plane only; uRadiusPx 0 on the bg
    // plane skips it) — ~1px smoothed SDF edge against aliasing.
    float alpha = uAlpha;
    if (uRadiusPx > 0.0) {
      vec2 pos = (vUv - 0.5) * uPlaneSizePx;
      float d = roundedBoxSdf(pos, 0.5 * uPlaneSizePx, uRadiusPx);
      alpha *= 1.0 - smoothstep(-1.0, 1.0, d);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

class DissolvePlane {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {InstanceType<typeof Plane>} geometry
   * @param {InstanceType<typeof Transform>} scene
   * @param {{ proxyEl: HTMLElement, imgFrom: HTMLImageElement, imgTo: HTMLImageElement, radiusPx: number, renderOrder: number }} opts
   *   proxyEl: slide 1's DOM element — per-frame position/size/opacity source
   */
  constructor(gl, geometry, scene, { proxyEl, imgFrom, imgTo, radiusPx, renderOrder }) {
    this.proxyEl = proxyEl;

    const textureFrom = new Texture(gl, { generateMipmaps: false });
    const textureTo = new Texture(gl, { generateMipmaps: false });

    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTextureFrom: { value: textureFrom },
        uTextureTo: { value: textureTo },
        uImageSizeFrom: { value: [1, 1] },
        uImageSizeTo: { value: [1, 1] },
        uPlaneSizePx: { value: [1, 1] },
        uProgress: { value: 0 },
        uAlpha: { value: 1 },
        uNoiseScale: { value: NOISE_SCALE },
        uMaxDistort: { value: MAX_DISTORT },
        uEdgeSoftness: { value: EDGE_SOFTNESS },
        uRadiusPx: { value: radiusPx },
      },
      cullFace: false,
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    this.mesh.renderOrder = renderOrder;
    this.mesh.setParent(scene);
    this.mesh.visible = false;

    this.ready = false;
    this.readyPromise = Promise.all([
      this.loadTexture(textureFrom, imgFrom, 'uImageSizeFrom'),
      this.loadTexture(textureTo, imgTo, 'uImageSizeTo'),
    ]).then(() => {
      this.ready = true;
    });
  }

  loadTexture(texture, imgEl, sizeUniform) {
    const src = imgEl?.currentSrc || imgEl?.src;
    if (!src) return Promise.resolve();

    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        texture.image = image;
        this.program.uniforms[sizeUniform].value = [image.naturalWidth, image.naturalHeight];
        resolve();
      };
      image.src = src;
    });
  }

  /** @param {{width: number, height: number}} screen @param {{width: number, height: number}} viewport */
  update(screen, viewport) {
    const rect = this.proxyEl.getBoundingClientRect();
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

    // The entrance tweens (founders-scroll.js) animate the proxy's opacity;
    // read the result rather than duplicating that timing here.
    this.program.uniforms.uAlpha.value = parseFloat(getComputedStyle(this.proxyEl).opacity) || 0;
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
 * @param {HTMLElement} stage the `.founders__stage` element
 * @returns {{ setProgress: (v: number) => void, ready: Promise<void>, resize: () => void, destroy: () => void } | null}
 *   null when WebGL is unavailable — caller falls back to the DOM crossfade.
 */
export function createFoundersDissolve(stage) {
  const slides = Array.from(stage.querySelectorAll('[data-founder-slide]'));
  if (slides.length < 2) return null;
  const [slide1, slide2] = slides;

  const bgFrom = slide1.querySelector('[data-founder-bg]');
  const bgTo = slide2.querySelector('[data-founder-bg]');
  const portraitWrap = slide1.querySelector('[data-founder-portrait]');
  const portraitFrom = portraitWrap?.querySelector('img');
  const portraitTo = slide2.querySelector('[data-founder-portrait] img');
  if (!(bgFrom && bgTo && portraitWrap && portraitFrom && portraitTo)) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'founders__canvas';
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
    console.warn('[founders-dissolve] WebGL renderer failed — falling back to DOM crossfade.', error);
    return null;
  }

  const gl = renderer.gl;
  const camera = new Camera(gl);
  camera.fov = 45;
  camera.position.z = 20;

  const scene = new Transform();
  const geometry = new Plane(gl);

  // Draw order: full-bleed background first, portrait composited above it.
  const planes = [
    new DissolvePlane(gl, geometry, scene, {
      proxyEl: bgFrom,
      imgFrom: bgFrom,
      imgTo: bgTo,
      radiusPx: 0,
      renderOrder: 0,
    }),
    new DissolvePlane(gl, geometry, scene, {
      proxyEl: portraitWrap,
      imgFrom: portraitFrom,
      imgTo: portraitTo,
      radiusPx: PORTRAIT_RADIUS_PX,
      renderOrder: 1,
    }),
  ];

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

  let rafId = 0;
  let disposed = false;

  const tick = () => {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    planes.forEach((plane) => plane.update(screen, viewport));
    renderer.render({ scene, camera });
  };

  resize();
  stage.appendChild(canvas);
  rafId = requestAnimationFrame(tick);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  // The DOM images stay painting until textures are decoded — the takeover
  // can never show blank imagery, however slow the load. visibility (not
  // opacity/display) keeps their rects and computed opacity measurable for
  // the per-frame proxy mirroring above.
  const proxyImgs = [bgFrom, bgTo, portraitFrom, portraitTo];
  const ready = Promise.all(planes.map((p) => p.readyPromise)).then(() => {
    if (disposed) return;
    proxyImgs.forEach((img) => {
      img.style.visibility = 'hidden';
    });
  });

  return {
    ready,
    resize,
    setProgress(value) {
      planes.forEach((plane) => plane.setProgress(value));
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      proxyImgs.forEach((img) => {
        img.style.visibility = '';
      });
      planes.forEach((plane) => plane.destroy());
      geometry.remove();
      canvas.remove();
    },
  };
}
