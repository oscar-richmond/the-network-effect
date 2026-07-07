import * as THREE from 'three';

/**
 * Noisy bottom-up dissolve (Ironhill / Animmaster reference).
 * Renders a full-viewport textured quad that dissolves out as uProgress → 1.
 */

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform float uSpread;
  uniform float uProgressScale;
  uniform float uNoiseScale;
  uniform float uEdgeSoftness;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p2 = vec3(p.xy, 1.0);
    return fract(sin(dot(p2, vec3(37.1, 61.7, 12.4))) * 3758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f *= f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 1.0) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    return v;
  }

  void main() {
    vec4 color = texture2D(uMap, vUv);
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 centeredUv = (uv - 0.5) * vec2(aspect, 1.0);

    float dissolveEdge = uProgress * uProgressScale - uv.y;
    float noiseValue = fbm(centeredUv * uNoiseScale);
    float d = dissolveEdge + noiseValue * uSpread;

    float edge = uEdgeSoftness / uResolution.y;
    float visibility = 1.0 - smoothstep(-edge, edge, d);

    gl_FragColor = vec4(color.rgb, color.a * visibility);
  }
`;

/**
 * Snapshots the hero image with the same object-fit:cover crop the DOM uses.
 *
 * @param {HTMLImageElement} imgEl
 * @param {number} width
 * @param {number} height
 * @param {number} dpr
 */
function captureDisplayedImageTexture(imgEl, width, height, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.Texture(imgEl);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  ctx.scale(dpr, dpr);

  const iw = imgEl.naturalWidth;
  const ih = imgEl.naturalHeight;

  if (iw > 0 && ih > 0) {
    const scale = Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (width - dw) * 0.5;
    const dy = (height - dh) * 0.5;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
  } else {
    ctx.drawImage(imgEl, 0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * @param {HTMLImageElement} imageEl
 * @param {{ spread?: number, progressScale?: number, noiseScale?: number, edgeSoftness?: number }} [options]
 */
export function createHeroDissolve(imageEl, options = {}) {
  const spread         = options.spread         ?? 0.33;
  const progressScale  = options.progressScale  ?? 1.42;
  const noiseScale     = options.noiseScale     ?? 10;
  const edgeSoftness   = options.edgeSoftness   ?? 7.5;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-dissolve__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.opacity = '0';
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 2);

  const texture = captureDisplayedImageTexture(imageEl, width, height, dpr);

  const uniforms = {
    uMap: { value: texture },
    uProgress: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uSpread: { value: spread },
    uProgressScale: { value: progressScale },
    uNoiseScale: { value: noiseScale },
    uEdgeSoftness: { value: edgeSoftness },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let destroyed = false;

  const resize = () => {
    if (destroyed) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    uniforms.uResolution.value.set(w, h);
  };

  const render = () => {
    if (destroyed) return;
    renderer.render(scene, camera);
  };

  /** @param {number} progress 0 = fully visible, 1 = fully dissolved */
  const setProgress = (progress) => {
    if (destroyed) return;
    uniforms.uProgress.value = Math.max(0, Math.min(progress, 1.1));
    render();
  };

  /** Fade the canvas in after the first frame matches the DOM image. */
  const reveal = (duration = 0.18) => {
    render();
    if (duration <= 0) {
      canvas.style.opacity = '1';
      return;
    }
    requestAnimationFrame(() => {
      canvas.style.transition = `opacity ${duration}s ease-out`;
      canvas.style.opacity = '1';
    });
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    geometry.dispose();
    material.dispose();
    texture.dispose();
    renderer.dispose();
    canvas.remove();
  };

  resize();
  render();

  return { setProgress, render, resize, reveal, destroy, canvas };
}
