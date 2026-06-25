import * as THREE from 'three';

/** Atelier UI curve-media shaders — https://www.atelier-ui.com/en/docs/components/scroll/curve-media */
const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  out vec2 vUv;
  uniform float uVelocity;
  uniform float uAmplitude;

  const float PI = 3.14159265;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float bend = sin(uv.x * PI);
    pos.y += bend * uVelocity * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  in vec2 vUv;
  uniform sampler2D uMap;
  uniform float uVelocity;
  uniform float uAberration;
  out vec4 fragColor;

  void main() {
    float shift = uVelocity * uAberration;
    vec2 offset = vec2(0.0, shift);
    float r = texture(uMap, vUv + offset).r;
    float g = texture(uMap, vUv).g;
    float b = texture(uMap, vUv - offset).b;
    fragColor = vec4(r, g, b, 1.0);
  }
`;

/**
 * @param {THREE.PlaneGeometry} geometry
 * @param {number} segments
 * @param {number} imageAspect
 * @param {number} planeAspect
 */
function applyCoverUVs(geometry, segments, imageAspect, planeAspect) {
  let repeatU = 1;
  let repeatV = 1;

  if (planeAspect > imageAspect) {
    repeatV = imageAspect / planeAspect;
  } else {
    repeatU = planeAspect / imageAspect;
  }

  const offsetU = (1 - repeatU) / 2;
  const offsetV = (1 - repeatV) / 2;
  const uv = geometry.attributes.uv;

  for (let iy = 0; iy <= segments; iy += 1) {
    for (let ix = 0; ix <= segments; ix += 1) {
      const idx = iy * (segments + 1) + ix;
      const u = ix / segments;
      const v = 1 - iy / segments;
      uv.setXY(idx, u * repeatU + offsetU, v * repeatV + offsetV);
    }
  }

  uv.needsUpdate = true;
}

class CurveMediaPlane {
  /**
   * @param {HTMLImageElement} img
   * @param {THREE.Scene} scene
   * @param {{ segments: number, amplitude: number, aberration: number }} config
   */
  constructor(img, scene, config) {
    this.img = img;
    this.segments = config.segments;
    this.geometry = new THREE.PlaneGeometry(1, 1, config.segments, config.segments);
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uMap: { value: null },
        uVelocity: { value: 0 },
        uAmplitude: { value: config.amplitude },
        uAberration: { value: config.aberration },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.ready = this.loadTexture();
  }

  loadTexture() {
    const src = this.img.dataset.src || this.img.src;
    if (!src) return Promise.resolve();

    const startLoad = () =>
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          src,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            this.material.uniforms.uMap.value = texture;
            this.updateCoverUVs(texture);
            this.mesh.visible = true;
            this.img.classList.add('is-loaded');
            this.img.style.opacity = '0';
            resolve();
          },
          undefined,
          reject,
        );
      });

    if (!this.img.src && this.img.dataset.src) {
      return new Promise((resolve, reject) => {
        this.img.addEventListener(
          'load',
          () => {
            startLoad().then(resolve).catch(reject);
          },
          { once: true },
        );
        this.img.src = this.img.dataset.src;
      });
    }

    if (!this.img.complete) {
      return new Promise((resolve, reject) => {
        this.img.addEventListener(
          'load',
          () => {
            startLoad().then(resolve).catch(reject);
          },
          { once: true },
        );
      });
    }

    return startLoad();
  }

  /** @param {THREE.Texture} texture */
  updateCoverUVs(texture) {
    const imageAspect = texture.image.width / texture.image.height;
    const rect = this.img.getBoundingClientRect();
    const planeAspect = rect.width / Math.max(rect.height, 1);
    applyCoverUVs(this.geometry, this.segments, imageAspect, planeAspect);
  }

  /**
   * @param {DOMRect} containerRect
   */
  sync(containerRect) {
    if (!this.mesh.visible) return;

    const rect = this.img.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const x =
      rect.left + rect.width / 2 - containerRect.left - containerRect.width / 2;
    const y = -(
      rect.top +
      rect.height / 2 -
      containerRect.top -
      containerRect.height / 2
    );

    this.mesh.position.set(x, y, 0);
    this.mesh.scale.set(rect.width, rect.height, 1);
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
    const map = this.material.uniforms.uMap.value;
    if (map) map.dispose();
    this.mesh.removeFromParent();
    this.img.style.opacity = '';
  }
}

/**
 * @param {HTMLElement} viewport
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement[]} images
 * @param {{ segments?: number, amplitude?: number, aberration?: number, smoothing?: number }} [options]
 */
export function initCurveMedia(viewport, canvas, images, options = {}) {
  const config = {
    segments: options.segments ?? 32,
    amplitude: options.amplitude ?? 0.03,
    aberration: options.aberration ?? 0.003,
    smoothing: options.smoothing ?? 6,
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
  } catch (error) {
    console.warn('[curve-media] WebGL renderer failed — falling back to DOM images.', error);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 100);
  camera.position.z = 10;

  /** @type {CurveMediaPlane[]} */
  const planes = images.map((img) => new CurveMediaPlane(img, scene, config));

  let velocity = 0;
  let lastScrollY = window.scrollY;
  let lastTime = performance.now();
  let rafId = 0;
  let disposed = false;

  const resize = () => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
  };

  const render = (time) => {
    if (disposed) return;
    rafId = requestAnimationFrame(render);

    const delta = Math.max((time - lastTime) / 1000, 0.0001);
    lastTime = time;

    const current = window.scrollY;
    const instantDelta = current - lastScrollY;
    lastScrollY = current;

    const target = instantDelta / delta / window.innerHeight;
    velocity = THREE.MathUtils.damp(velocity, target, config.smoothing, delta);

    const containerRect = canvas.getBoundingClientRect();

    for (const plane of planes) {
      plane.material.uniforms.uVelocity.value = velocity;
      plane.sync(containerRect);
    }

    renderer.render(scene, camera);
  };

  resize();
  rafId = requestAnimationFrame(render);

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    ready: Promise.all(planes.map((plane) => plane.ready)),
    destroy() {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      planes.forEach((plane) => plane.destroy());
      renderer.dispose();
    },
  };
}
