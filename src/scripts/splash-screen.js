import * as THREE from 'three';
import gsap from 'gsap';
import { FOCUS_EASE } from './sphere-focus.js';

const HOLD_MS = 2000;
const DISSOLVE_DURATION = 1;
const VERTICAL_OFFSET_PX = 104;

const VERTEX = /* glsl */ `
  precision highp float;
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uDissolve;
  uniform float uSeed;
  uniform vec3 uBackground;

  in vec2 vUv;
  out vec4 fragColor;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 offset = fract(point);
    float bottomLeft = hash(cell);
    float bottomRight = hash(cell + vec2(1.0, 0.0));
    float topLeft = hash(cell + vec2(0.0, 1.0));
    float topRight = hash(cell + vec2(1.0, 1.0));
    vec2 smoothed = offset * offset * (3.0 - 2.0 * offset);
    return mix(bottomLeft, bottomRight, smoothed.x)
      + (topLeft - bottomLeft) * smoothed.y * (1.0 - smoothed.x)
      + (topRight - bottomRight) * smoothed.x * smoothed.y;
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 3; octave++) {
      value += amplitude * valueNoise(point);
      point *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 color = texture(uMap, vUv).rgb;
    float alpha = 1.0;

    if (uDissolve > 0.0) {
      float threshold = mix(-0.1, 0.95, uDissolve);
      float noise = fbm(vUv * 3.0 + uSeed * 7.13);
      float edgeDistance = noise - threshold;
      float edgeAntialias = fwidth(edgeDistance);
      alpha *= smoothstep(-edgeAntialias, edgeAntialias, edgeDistance);
      float rim = 1.0 - smoothstep(0.0, 0.1, edgeDistance);
      color += rim * 0.4;
    }

    fragColor = vec4(mix(uBackground, color, alpha), 1.0);
  }
`;

/**
 * object-fit: cover; object-position: top right
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image
 * @param {number} width
 * @param {number} height
 */
function drawCoverImage(ctx, image, width, height) {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const imageAspect = iw / ih;
  const viewportAspect = width / height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = iw;
  let sourceHeight = ih;

  if (imageAspect > viewportAspect) {
    // Image is wider than the viewport — scale to height, crop sides (anchor right)
    sourceHeight = ih;
    sourceWidth = ih * viewportAspect;
    sourceX = iw - sourceWidth;
    sourceY = 0;
  } else {
    // Image is taller than the viewport — scale to width, crop bottom (anchor top)
    sourceWidth = iw;
    sourceHeight = iw / viewportAspect;
    sourceX = 0;
    sourceY = 0;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

/**
 * @param {HTMLImageElement} image
 * @param {number} width
 * @param {number} height
 */
function createDisplayTexture(image, width, height) {
  const drawCanvas = document.createElement('canvas');
  drawCanvas.width = width;
  drawCanvas.height = height;
  const ctx = drawCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawCoverImage(ctx, image, width, height);

  const texture = new THREE.CanvasTexture(drawCanvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   src: string,
 *   width: number,
 *   height: number,
 *   onComplete?: () => void,
 *   onFinish?: () => void,
 * }} options
 */
export function initSplashScreen(root, options) {
  const { onComplete, onFinish } = options;
  const image = root.querySelector('[data-splash-image]');
  const surface = root.querySelector('[data-splash-surface]');
  const canvas = root.querySelector('[data-splash-canvas]');

  if (
    !(image instanceof HTMLImageElement) ||
    !(surface instanceof HTMLElement) ||
    !(canvas instanceof HTMLCanvasElement)
  ) {
    onComplete?.();
    onFinish?.();
    return () => {};
  }

  root.style.setProperty(
    '--splash-offset-y',
    `${window.matchMedia('(max-width: 402px)').matches ? 64 : window.matchMedia('(max-width: 440px)').matches ? 80 : VERTICAL_OFFSET_PX}px`,
  );

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    window.setTimeout(() => {
      onComplete?.();
      onFinish?.();
    }, HOLD_MS);
    return () => {};
  }

  let disposed = false;
  let rafId = 0;
  let holdTimeout = 0;
  let holdElapsed = false;
  let imageReady = false;
  let webglReady = false;
  let dissolving = false;
  /** @type {gsap.core.Tween | null} */
  let dissolveTween = null;
  /** @type {THREE.WebGLRenderer | null} */
  let renderer = null;
  /** @type {THREE.Scene | null} */
  let scene = null;
  /** @type {THREE.OrthographicCamera | null} */
  let camera = null;
  /** @type {THREE.ShaderMaterial | null} */
  let material = null;
  /** @type {THREE.Mesh | null} */
  let mesh = null;

  const uniforms = {
    uMap: { value: /** @type {THREE.Texture | null} */ (null) },
    uDissolve: { value: 0 },
    uSeed: { value: 0.42 },
    uBackground: { value: new THREE.Color('#ffffff') },
  };

  const resize = () => {
    if (!renderer || disposed) return;

    const w = surface.clientWidth;
    const h = surface.clientHeight;
    if (w < 1 || h < 1) return;

    const pixelRatio = renderer.getPixelRatio();
    const pixelWidth = Math.round(w * pixelRatio);
    const pixelHeight = Math.round(h * pixelRatio);

    renderer.setSize(w, h, false);

    uniforms.uMap.value?.dispose();
    uniforms.uMap.value = createDisplayTexture(image, pixelWidth, pixelHeight);
    if (uniforms.uMap.value) {
      uniforms.uMap.value.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    if (scene && camera) {
      renderer.render(scene, camera);
    }
  };

  const setupRenderer = () => {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff, 1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });

    mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    resize();

    const render = () => {
      if (disposed || !renderer || !scene || !camera) return;
      rafId = requestAnimationFrame(render);
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(render);
    webglReady = true;
  };

  /** @type {(() => void) | null} */
  let onResize = null;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    window.clearTimeout(holdTimeout);
    dissolveTween?.kill();
    if (onResize) {
      window.removeEventListener('resize', onResize);
    }
    mesh?.geometry.dispose();
    material?.dispose();
    uniforms.uMap.value?.dispose();
    renderer?.dispose();
  };

  const runDissolve = () => {
    if (disposed || dissolving) return;
    dissolving = true;
    onComplete?.();

    if (!webglReady || !material) {
      cleanup();
      onFinish?.();
      return;
    }

    dissolveTween = gsap.to(uniforms.uDissolve, {
      value: 1,
      duration: DISSOLVE_DURATION,
      ease: FOCUS_EASE,
      onComplete: () => {
        cleanup();
        onFinish?.();
      },
    });
  };

  const tryDissolve = () => {
    if (!holdElapsed || !imageReady || disposed || dissolving) return;
    runDissolve();
  };

  holdTimeout = window.setTimeout(() => {
    holdElapsed = true;
    tryDissolve();
  }, HOLD_MS);

  const prepareImage = async () => {
    try {
      await image.decode();
    } catch {
      // decode() can reject for broken images; load/error handlers cover that.
    }

    if (disposed || image.naturalWidth < 1) return;

    imageReady = true;

    requestAnimationFrame(() => {
      if (disposed) return;

      try {
        setupRenderer();
        onResize = () => resize();
        window.addEventListener('resize', onResize);
      } catch (error) {
        console.warn('[splash-screen] WebGL init failed.', error);
      }

      tryDissolve();
    });
  };

  if (image.complete && image.naturalWidth > 0) {
    prepareImage();
  } else {
    image.addEventListener('load', () => prepareImage(), { once: true });
    image.addEventListener(
      'error',
      () => {
        console.warn('[splash-screen] Image load failed.');
        imageReady = true;
        window.setTimeout(() => {
          onComplete?.();
          cleanup();
          onFinish?.();
        }, HOLD_MS);
      },
      { once: true },
    );
  }

  return cleanup;
}

/**
 * @param {() => void} onReveal
 */
export function completeSplash(onReveal) {
  document.documentElement.classList.remove('splash-active');
  onReveal();
}
