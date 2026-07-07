import * as THREE from 'three';

/** R3F default viewport height — keeps math aligned with Atelier UI. */
const WORLD_HEIGHT = 10;

/** @typedef {{
 *   intensity?: number,
 *   radius?: number,
 *   expandRate?: number,
 *   decayRate?: number,
 *   maxRipples?: number,
 *   segments?: number,
 *   rippleMap?: string,
 *   contrast?: number,
 *   brightness?: number,
 *   webglEnabled?: boolean,
 * }} LiquidMediaOptions */

const ROTATION_SPEED = 0.1;
const INITIAL_OPACITY = 0.22;
const DISPLACEMENT_DAMPING = 6.3;
const VELOCITY_DAMPING = 6.3;
const MIN_VELOCITY = 0;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vScreenUv;

  void main() {
    vUv = uv;
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vScreenUv = pos.xy / pos.w * 0.5 + 0.5;
    gl_Position = pos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uDisplacement;
  uniform float uDisplacementIntensity;
  uniform float uContrast;
  uniform float uBrightness;
  varying vec2 vUv;
  varying vec2 vScreenUv;

  #define PI 3.14159265

  void main() {
    vec4 displacement = texture2D(uDisplacement, vScreenUv);
    float theta = displacement.r * 2.0 * PI;
    vec2 direction = vec2(sin(theta), cos(theta));
    vec2 displacedUv = vUv + direction * displacement.r * uDisplacementIntensity;
    vec4 color = texture2D(uTexture, displacedUv);
    color.rgb = (color.rgb - 0.5) * uContrast + 0.5 + uBrightness;
    gl_FragColor = color;
  }
`;

/**
 * @param {number} width
 * @param {number} height
 */
function createViewport(width, height) {
  const pxToWorld = WORLD_HEIGHT / height;
  return {
    width: width * pxToWorld,
    height: WORLD_HEIGHT,
    pxToWorld,
  };
}

/**
 * @param {THREE.OrthographicCamera} camera
 * @param {{ width: number, height: number }} viewport
 * @param {number} [near]
 * @param {number} [far]
 */
function fitOrthographicCamera(camera, viewport, near = 0.1, far = 1000) {
  camera.left = -viewport.width / 2;
  camera.right = viewport.width / 2;
  camera.top = viewport.height / 2;
  camera.bottom = -viewport.height / 2;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

/**
 * @param {HTMLImageElement} imgEl
 * @param {number} segments
 * @param {THREE.PlaneGeometry} geometry
 */
function applyObjectFitUVs(imgEl, segments, geometry) {
  const iw = imgEl.naturalWidth;
  const ih = imgEl.naturalHeight;
  if (!iw || !ih) return { x: 1, y: 1 };

  const rect = imgEl.getBoundingClientRect();
  const planeAspect = rect.width / rect.height;
  const imageAspect = iw / ih;
  const objectFit = getComputedStyle(imgEl).objectFit || 'fill';

  let repeatU = 1;
  let repeatV = 1;
  let fitScaleX = 1;
  let fitScaleY = 1;

  if (objectFit === 'cover') {
    if (planeAspect > imageAspect) {
      repeatV = imageAspect / planeAspect;
    } else {
      repeatU = planeAspect / imageAspect;
    }
  } else if (objectFit === 'contain') {
    if (planeAspect > imageAspect) {
      fitScaleX = imageAspect / planeAspect;
    } else {
      fitScaleY = planeAspect / imageAspect;
    }
  }

  const offsetU = (1 - repeatU) / 2;
  const offsetV = (1 - repeatV) / 2;
  const uvAttribute = geometry.attributes.uv;

  for (let iy = 0; iy <= segments; iy += 1) {
    for (let ix = 0; ix <= segments; ix += 1) {
      const idx = iy * (segments + 1) + ix;
      const u = ix / segments;
      const v = 1 - iy / segments;
      uvAttribute.setXY(idx, u * repeatU + offsetU, v * repeatV + offsetV);
    }
  }

  uvAttribute.needsUpdate = true;
  return { x: fitScaleX, y: fitScaleY };
}

/**
 * @param {string} url
 * @returns {Promise<THREE.Texture>}
 */
function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error),
    );
  });
}

/**
 * Cursor-driven liquid ripple on an image (Atelier UI LiquidMedia port).
 *
 * @param {HTMLImageElement} imgEl
 * @param {LiquidMediaOptions} [options]
 */
export function createLiquidMedia(imgEl, options = {}) {
  const intensity = options.intensity ?? 0.22;
  const radius = options.radius ?? 5;
  const expandRate = options.expandRate ?? 10;
  const decayRate = options.decayRate ?? 4;
  const maxRipples = options.maxRipples ?? 38;
  const segments = options.segments ?? 1;
  const rippleMapUrl = options.rippleMap
    ?? `${import.meta.env.BASE_URL}assets/liquid-media/ripple.png`;
  const webglEnabled = options.webglEnabled ?? true;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!webglEnabled || prefersReducedMotion) {
    return { destroy() {}, pause() {}, resume() {} };
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-media__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const spriteScene = new THREE.Scene();

  const pointer = {
    uv: new THREE.Vector2(0.5, 0.5),
    hover: 0,
  };

  const prevMouse = { x: 0, y: 0, velocity: 0 };
  let splatIndex = 0;
  let displacementSmoothed = 0;
  let fitScale = { x: 1, y: 1 };
  let destroyed = false;
  let paused = false;
  let visible = false;
  let ready = false;
  let rafId = 0;
  let lastTime = performance.now();
  let viewport = createViewport(window.innerWidth, window.innerHeight);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  camera.position.z = 10;

  const spriteCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
  const uniforms = {
    uTexture: { value: /** @type {THREE.Texture | null} */ (null) },
    uDisplacement: { value: /** @type {THREE.Texture | null} */ (null) },
    uDisplacementIntensity: { value: 0 },
    uContrast: { value: options.contrast ?? 0.94 },
    uBrightness: { value: options.brightness ?? 0.065 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  /** @type {THREE.WebGLRenderTarget | null} */
  let fbo = null;

  /** @type {THREE.Texture | null} */
  let rippleBrush = null;

  /** @type {THREE.Mesh[]} */
  const sprites = [];

  /**
   * @param {THREE.Texture} brush
   */
  const buildSprites = (brush) => {
    for (const sprite of sprites) {
      sprite.geometry.dispose();
      if (sprite.material instanceof THREE.Material) sprite.material.dispose();
      spriteScene.remove(sprite);
    }
    sprites.length = 0;

    for (let i = 0; i < maxRipples; i += 1) {
      const spriteMaterial = new THREE.MeshBasicMaterial({
        map: brush,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        opacity: 0,
      });

      const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), spriteMaterial);
      sprite.visible = false;
      sprite.rotation.z = Math.random() * Math.PI * 2;
      spriteScene.add(sprite);
      sprites.push(sprite);
    }
  };

  const resize = () => {
    if (destroyed) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 1.5);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);

    viewport = createViewport(width, height);
    fitOrthographicCamera(camera, viewport);
    fitOrthographicCamera(spriteCamera, viewport, 0, 1);

    if (fbo) {
      fbo.setSize(width * dpr, height * dpr);
    }
  };

  const updateMeshLayout = () => {
    const rect = imgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { pxToWorld } = viewport;
    const size = { width: window.innerWidth, height: window.innerHeight };

    mesh.position.x = (rect.left + rect.width / 2 - size.width / 2) * pxToWorld;
    mesh.position.y = -((rect.top + rect.height / 2 - size.height / 2) * pxToWorld);

    fitScale = applyObjectFitUVs(imgEl, segments, geometry);
    mesh.scale.set(
      rect.width * pxToWorld * fitScale.x,
      rect.height * pxToWorld * fitScale.y,
      1,
    );
  };

  const renderFrame = (time) => {
    if (destroyed || paused || !visible || !ready) return;

    const delta = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;

    updateMeshLayout();

    const pointerX = mesh.position.x + (pointer.uv.x - 0.5) * mesh.scale.x;
    const pointerY = mesh.position.y + (pointer.uv.y - 0.5) * mesh.scale.y;
    const dx = pointerX - prevMouse.x;
    const dy = pointerY - prevMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    prevMouse.x = pointerX;
    prevMouse.y = pointerY;

    const hovering = pointer.hover > 0.5;

    if (hovering) {
      prevMouse.velocity = Math.max(
        MIN_VELOCITY,
        THREE.MathUtils.damp(prevMouse.velocity, dist, VELOCITY_DAMPING, delta),
      );
    }

    if (hovering && dist > 0.001) {
      const idx = splatIndex % maxRipples;
      const sprite = sprites[idx];
      const scale = (radius * Math.min(viewport.width, viewport.height)) / 100;

      sprite.visible = true;
      sprite.position.set(pointerX, pointerY, 0);
      sprite.scale.set(scale, scale, 1);

      if (sprite.material instanceof THREE.MeshBasicMaterial) {
        sprite.material.opacity = INITIAL_OPACITY;
      }

      splatIndex = (splatIndex + 1) % maxRipples;
    }

    for (const sprite of sprites) {
      if (!(sprite.material instanceof THREE.MeshBasicMaterial)) continue;

      sprite.rotation.z += 2 * delta * ROTATION_SPEED;
      sprite.material.opacity = THREE.MathUtils.damp(
        sprite.material.opacity,
        0,
        decayRate,
        delta,
      );
      sprite.scale.x += delta * expandRate;
      sprite.scale.y = sprite.scale.x;
    }

    if (fbo) {
      renderer.setRenderTarget(fbo);
      renderer.render(spriteScene, spriteCamera);
      renderer.setRenderTarget(null);
    }

    displacementSmoothed = THREE.MathUtils.damp(
      displacementSmoothed,
      intensity * prevMouse.velocity * 5,
      DISPLACEMENT_DAMPING,
      delta,
    );
    uniforms.uDisplacementIntensity.value = displacementSmoothed;

    renderer.render(scene, camera);
  };

  const tick = (time) => {
    rafId = requestAnimationFrame(tick);
    renderFrame(time);
  };

  const onPointerMove = (event) => {
    const rect = imgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    pointer.uv.set(
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    );
  };

  const onPointerEnter = () => {
    pointer.hover = 1;
  };

  const onPointerLeave = () => {
    pointer.hover = 0;
  };

  const reveal = () => {
    updateMeshLayout();
    renderFrame(performance.now());

    if (!Number.isFinite(mesh.scale.x) || mesh.scale.x <= 0) {
      return;
    }

    imgEl.classList.add('is-liquid-active');
    canvas.classList.add('is-visible');
    visible = true;
  };

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting) {
        visible = true;
        canvas.classList.add('is-visible');
      } else {
        visible = false;
        canvas.classList.remove('is-visible');
      }
    },
    { root: null, threshold: 0.01 },
  );

  const resizeObserver = new ResizeObserver(() => {
    resize();
    updateMeshLayout();
  });

  imgEl.addEventListener('pointermove', onPointerMove);
  imgEl.addEventListener('pointerenter', onPointerEnter);
  imgEl.addEventListener('pointerleave', onPointerLeave);

  resizeObserver.observe(imgEl);
  resizeObserver.observe(document.body);
  intersectionObserver.observe(imgEl);

  const start = async () => {
    try {
      const [map, brush] = await Promise.all([
        imgEl.complete && imgEl.naturalWidth > 0
          ? Promise.resolve(new THREE.Texture(imgEl))
          : new Promise((resolve, reject) => {
            const onLoad = () => resolve(new THREE.Texture(imgEl));
            const onError = () => reject(new Error('Liquid media image failed to load'));
            imgEl.addEventListener('load', onLoad, { once: true });
            imgEl.addEventListener('error', onError, { once: true });
          }),
        loadTexture(rippleMapUrl),
      ]);

      if (destroyed) {
        map.dispose();
        brush.dispose();
        return;
      }

      map.colorSpace = THREE.SRGBColorSpace;
      map.minFilter = THREE.LinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.needsUpdate = true;

      brush.colorSpace = THREE.NoColorSpace;
      brush.minFilter = THREE.LinearFilter;
      brush.magFilter = THREE.LinearFilter;

      rippleBrush = brush;
      buildSprites(brush);

      const dpr = Math.min(window.devicePixelRatio, 1.5);
      fbo = new THREE.WebGLRenderTarget(
        window.innerWidth * dpr,
        window.innerHeight * dpr,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          type: THREE.UnsignedByteType,
        },
      );

      uniforms.uTexture.value = map;
      uniforms.uDisplacement.value = fbo.texture;

      resize();
      ready = true;
      visible = true;
      reveal();
      rafId = requestAnimationFrame(tick);
    } catch {
      imgEl.classList.remove('is-liquid-active');
      canvas.remove();
    }
  };

  start();

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    visible = false;
    ready = false;

    cancelAnimationFrame(rafId);
    intersectionObserver.disconnect();
    resizeObserver.disconnect();

    imgEl.removeEventListener('pointermove', onPointerMove);
    imgEl.removeEventListener('pointerenter', onPointerEnter);
    imgEl.removeEventListener('pointerleave', onPointerLeave);
    imgEl.classList.remove('is-liquid-active');

    geometry.dispose();
    material.dispose();
    if (uniforms.uTexture.value) uniforms.uTexture.value.dispose();
    if (rippleBrush) rippleBrush.dispose();
    if (fbo) fbo.dispose();

    for (const sprite of sprites) {
      sprite.geometry.dispose();
      if (sprite.material instanceof THREE.Material) {
        sprite.material.dispose();
      }
    }

    renderer.dispose();
    canvas.remove();
  };

  const pause = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
    lastTime = performance.now();
  };

  return { destroy, pause, resume };
}

/**
 * @param {HTMLImageElement} imgEl
 * @returns {LiquidMediaOptions}
 */
function readLiquidMediaOptions(imgEl) {
  const num = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    intensity: num(imgEl.dataset.liquidIntensity, 0.22),
    radius: num(imgEl.dataset.liquidRadius, 5),
    expandRate: num(imgEl.dataset.liquidExpandRate, 10),
    decayRate: num(imgEl.dataset.liquidDecayRate, 4),
    maxRipples: num(imgEl.dataset.liquidMaxRipples, 38),
    segments: num(imgEl.dataset.liquidSegments, 1),
    contrast: num(imgEl.dataset.liquidContrast, 0.94),
    brightness: num(imgEl.dataset.liquidBrightness, 0.065),
    rippleMap: imgEl.dataset.liquidRipple || undefined,
    webglEnabled: imgEl.dataset.liquidWebgl !== 'false',
  };
}

/**
 * @param {ParentNode | Document} scope
 * @returns {() => void}
 */
export function initLiquidMedia(scope = document) {
  /** @type {Array<ReturnType<typeof createLiquidMedia>>} */
  const instances = [];

  scope.querySelectorAll('[data-liquid-media]').forEach((el) => {
    if (!(el instanceof HTMLImageElement)) return;
    instances.push(createLiquidMedia(el, readLiquidMediaOptions(el)));
  });

  return () => {
    instances.forEach((instance) => instance.destroy());
  };
}
