import * as THREE from 'three';
import gsap from 'gsap';

/** Atelier UI sphere-gallery — https://www.atelier-ui.com/en/docs/components/background/sphere-gallery */
const TAU = Math.PI * 2;
const MAX_TILT = Math.PI / 4;
const SCENE_DISTANCE = 0.1;
const INITIAL_DISTANCE = 2;
const PEEK_DEPTH = 1.5;
const PEEK_MARGIN = 0.15;
const FOCUS_EASE = 'cubic-bezier(0.7, 0.03, 0.26, 0.99)';
const REVEAL_EASE = 'cubic-bezier(0.4, 0.2, 0.15, 1)';

const DEFAULTS = {
  rows: 7,
  columns: 12,
  latitudeRange: 85,
  gap: 0.01,
  padding: 0.03,
  cornerRadius: 0.02,
  lensBlur: 0.4,
  fov: 70,
  tileColor: '#F8F8F8',
  sphereColor: '#ffffff',
  revealDuration: 2,
  focusDuration: 1,
  focusScale: 1.7,
  mouseParallax: 0.2,
};

const TILE_VERTEX = /* glsl */ `
  precision highp float;

  uniform float uFocus;
  uniform float uLatitude;
  uniform vec2 uAngularSpan;
  out vec2 vUv;

  void main() {
    vUv = uv;

    float longitude = (uv.x - 0.5) * uAngularSpan.x;
    float latitude = uLatitude + (uv.y - 0.5) * uAngularSpan.y;

    vec3 spherePosition = vec3(
      cos(latitude) * sin(longitude),
      sin(latitude) * cos(uLatitude) - cos(latitude) * sin(uLatitude) * cos(longitude),
      1.0 - cos(latitude) * cos(uLatitude) * cos(longitude) - sin(latitude) * sin(uLatitude)
    );

    vec3 morphedPosition = mix(spherePosition, position, uFocus);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(morphedPosition, 1.0);
  }
`;

const TILE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uImageAspect;
  uniform vec2 uTileSize;
  uniform float uGap;
  uniform float uPadding;
  uniform float uRadius;
  uniform vec3 uBackground;
  uniform float uBackgroundAlpha;
  uniform float uDissolve;
  uniform float uSeed;
  uniform float uOpacity;
  uniform float uReveal;

  in vec2 vUv;
  out vec4 fragColor;

  float sdRoundBox(vec2 point, vec2 halfSize, float radius) {
    vec2 corner = abs(point) - halfSize + radius;
    return min(max(corner.x, corner.y), 0.0) + length(max(corner, 0.0)) - radius;
  }

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
    vec2 point = (vUv - 0.5) * uTileSize;
    vec2 halfTile = uTileSize * 0.5 - uGap;
    vec2 content = halfTile - uPadding;

    float imageHalfHeight = min(content.x / uImageAspect, content.y);
    vec2 imageHalfSize = vec2(imageHalfHeight * uImageAspect, imageHalfHeight);
    vec2 imageUv = point / (imageHalfSize * 2.0) + 0.5;

    bool inside = all(greaterThanEqual(imageUv, vec2(0.0))) &&
      all(lessThanEqual(imageUv, vec2(1.0)));

    vec3 color = inside ? texture(uMap, imageUv).rgb : uBackground;

    float boxDistance = sdRoundBox(point, halfTile, uRadius);
    float boxAntialias = fwidth(boxDistance);
    float alpha = smoothstep(boxAntialias, -boxAntialias, boxDistance);
    alpha *= inside ? 1.0 : uBackgroundAlpha;

    if (uDissolve > 0.0) {
      float threshold = mix(-0.1, 0.95, uDissolve);
      float noise = fbm(vUv * 3.0 + uSeed * 7.13);
      float edgeDistance = noise - threshold;
      float edgeAntialias = fwidth(edgeDistance);
      alpha *= smoothstep(-edgeAntialias, edgeAntialias, edgeDistance);
      float rim = 1.0 - smoothstep(0.0, 0.1, edgeDistance);
      color += rim * 0.4;
    }

    fragColor = vec4(color, alpha * uOpacity * uReveal);
  }
`;

const LENS_VERTEX = /* glsl */ `
  precision highp float;
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const LENS_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uScene;
  uniform float uStrength;
  uniform float uRadius;
  uniform float uSmoothness;
  uniform float uDispersion;
  uniform float uMotion;
  uniform float uMotionStrength;

  in vec2 vUv;
  out vec4 fragColor;

  const int SAMPLES = 24;

  void main() {
    vec2 toCenter = vUv - 0.5;
    float distanceFromCenter = length(toCenter);

    float radius = uRadius * (1.0 - 0.7 * uMotion);
    float mask = smoothstep(radius, radius + uSmoothness, distanceFromCenter);
    float amount = mask * mask * uStrength + mask * uMotion * uMotionStrength;

    if (amount <= 0.0) {
      fragColor = texture(uScene, vUv);
      return;
    }

    vec3 color = vec3(0.0);
    float alpha = 0.0;
    float total = 0.0;

    for (int sampleIndex = 0; sampleIndex < SAMPLES; sampleIndex++) {
      float progress = float(sampleIndex) / float(SAMPLES - 1);
      float weight = 1.0 - progress * 0.6;
      float scale = 1.0 - amount * progress;
      float spread = uDispersion * amount * progress;

      vec4 mid = texture(uScene, 0.5 + toCenter * scale);
      color.r += texture(uScene, 0.5 + toCenter * (scale + spread)).r * weight;
      color.g += mid.g * weight;
      color.b += texture(uScene, 0.5 + toCenter * (scale - spread)).b * weight;
      alpha += mid.a * weight;
      total += weight;
    }

    fragColor = vec4(color / total, alpha / total);
  }
`;

/**
 * @param {number} rows
 * @param {number} columns
 * @param {number} latitudeRange
 */
function buildTileLayout(rows, columns, latitudeRange) {
  /** @type {Array<{ position: THREE.Vector3, quaternion: THREE.Quaternion, longitude: number, latitude: number, width: number, height: number, span: THREE.Vector2 }>} */
  const tiles = [];
  const orienter = new THREE.Object3D();
  const latRange = THREE.MathUtils.degToRad(latitudeRange);
  const latSpan = (latRange * 2) / rows;

  for (let row = 0; row < rows; row += 1) {
    const latitude = -latRange + (row + 0.5) * latSpan;
    const cosLat = Math.cos(latitude);
    const ringColumns = Math.max(1, Math.round(columns * cosLat));
    const lonSpan = TAU / ringColumns;
    const span = new THREE.Vector2(lonSpan, latSpan);

    for (let col = 0; col < ringColumns; col += 1) {
      const longitude = (col + (row % 2) / 2) * lonSpan;
      const position = new THREE.Vector3(
        cosLat * Math.cos(longitude),
        Math.sin(latitude),
        cosLat * Math.sin(longitude),
      );

      orienter.position.copy(position);
      orienter.lookAt(0, 0, 0);

      tiles.push({
        position,
        quaternion: orienter.quaternion.clone(),
        longitude,
        latitude,
        width: lonSpan * cosLat,
        height: latSpan,
        span,
      });
    }
  }

  return tiles;
}

/**
 * @param {THREE.Texture} texture
 * @param {ReturnType<typeof buildTileLayout>[number]} tile
 * @param {number} index
 * @param {typeof DEFAULTS} config
 */
function createTileMaterial(texture, tile, index, config) {
  const image = /** @type {HTMLImageElement} */ (texture.image);
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uMap: { value: texture },
      uFocus: { value: 0 },
      uLatitude: { value: tile.latitude },
      uAngularSpan: { value: tile.span },
      uImageAspect: { value: image.width / image.height },
      uTileSize: { value: new THREE.Vector2(tile.width, tile.height) },
      uGap: { value: config.gap },
      uPadding: { value: config.padding },
      uRadius: { value: config.cornerRadius },
      uBackground: { value: new THREE.Color(config.tileColor) },
      uBackgroundAlpha: { value: 1 },
      uDissolve: { value: 0 },
      uSeed: { value: index },
      uOpacity: { value: 1 },
      uReveal: { value: 0 },
    },
    vertexShader: TILE_VERTEX,
    fragmentShader: TILE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * @typedef {{ src: string, alt: string, label?: string }} SphereGalleryItem
 */

/**
 * @param {HTMLElement} surface
 * @param {HTMLCanvasElement} canvas
 * @param {SphereGalleryItem[]} items
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function createSphereGallery(surface, canvas, items, options = {}) {
  const config = { ...DEFAULTS, ...options };
  let activeTile = /** @type {number | null} */ (null);
  let open = false;
  let disposed = false;
  let revealComplete = false;
  let ready = false;
  let rafId = 0;
  let lastTime = performance.now();
  let previousCameraZ = /** @type {number | null} */ (null);
  let lensMotion = 0;

  const tileLayout = buildTileLayout(config.rows, config.columns, config.latitudeRange);
  const orientation = {
    spin: 0,
    tilt: 0,
    targetSpin: 0,
    targetTilt: 0,
  };
  const pointerOffset = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const dragMoved = { current: false };
  const dragging = { current: false };
  const pointerOnTile = { current: false };
  const animating = { current: false };

  /** @type {gsap.core.Timeline | gsap.core.Tween | null} */
  let activeTimeline = null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const contentScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 1000);
  camera.position.z = INITIAL_DISTANCE;

  const group = new THREE.Group();
  group.rotation.x = 1;
  group.rotation.y = 3;
  group.scale.setScalar(0.5);
  contentScene.add(group);

  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: config.sphereColor,
    transparent: true,
    opacity: 0,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.99, 64, 64), sphereMaterial));
  const fbo = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  fbo.texture.colorSpace = THREE.SRGBColorSpace;

  const lensMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uScene: { value: fbo.texture },
      uStrength: { value: config.lensBlur },
      uRadius: { value: 0.3 },
      uSmoothness: { value: 0.5 },
      uDispersion: { value: 0.35 },
      uMotion: { value: 0 },
      uMotionStrength: { value: 0.4 },
    },
    vertexShader: LENS_VERTEX,
    fragmentShader: LENS_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
  });
  const lensScene = new THREE.Scene();
  const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  lensScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMaterial));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  /** @type {Array<{ mesh: THREE.Mesh, index: number, material: THREE.ShaderMaterial, tile: ReturnType<typeof buildTileLayout>[number] }>} */
  const tileMeshes = [];
  /** @type {Array<{ mesh: THREE.Mesh, material: THREE.ShaderMaterial, slot: ReturnType<typeof getPeekSlots>['previous'] }>} */
  const peekMeshes = [];

  const loader = new THREE.TextureLoader();
  const textures = items.map(
    (item) =>
      loader.load(item.src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
      }),
  );

  tileLayout.forEach((tile, i) => {
    const texture = textures[i % textures.length];
    const material = createTileMaterial(texture, tile, i, config);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(tile.width, tile.height, 24, 24),
      material,
    );
    mesh.position.copy(tile.position);
    mesh.quaternion.copy(tile.quaternion);
    mesh.userData.tileIndex = i;
    group.add(mesh);
    tileMeshes.push({ mesh, index: i, material, tile });
  });

  const peekGroup = new THREE.Group();
  group.add(peekGroup);

  const focusDistanceFor = (tile) => {
    const tileSize = Math.max(tile.width, tile.height) * 1.9;
    return tileSize / 2 / Math.tan(THREE.MathUtils.degToRad(config.fov) / 2);
  };

  const getPeekSlots = () => {
    if (activeTile === null) return { previous: null, next: null };

    const focused = tileLayout[activeTile];
    const sideAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(focused.quaternion);
    const depthAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(focused.quaternion);
    const total = tileLayout.length;
    const width = surface.clientWidth;
    const height = surface.clientHeight;
    const peekDistance = focusDistanceFor(focused) + focused.width * PEEK_DEPTH;
    const sideOffset =
      Math.tan(THREE.MathUtils.degToRad(config.fov) / 2) * peekDistance * (width / height) -
      focused.width / 2 -
      focused.width * PEEK_MARGIN;

    const slot = (side) => {
      const index = (activeTile + side + total) % total;
      const neighbor = tileLayout[index];
      return {
        index,
        texture: textures[index % textures.length],
        position: focused.position
          .clone()
          .addScaledVector(sideAxis, side * sideOffset)
          .addScaledVector(depthAxis, -focused.width * PEEK_DEPTH),
        quaternion: focused.quaternion.clone(),
        width: neighbor.width,
        height: neighbor.height,
      };
    };

    return { previous: slot(-1), next: slot(1) };
  };

  const syncPeekMeshes = () => {
    const slots = getPeekSlots();
    const entries = [
      { key: 'previous', slot: slots.previous },
      { key: 'next', slot: slots.next },
    ];

    entries.forEach(({ key, slot }) => {
      let peek = peekMeshes.find((p) => p.mesh.userData.side === key);
      if (!slot) {
        if (peek) {
          peekGroup.remove(peek.mesh);
          peek.mesh.geometry.dispose();
          peek.material.dispose();
          peekMeshes.splice(peekMeshes.indexOf(peek), 1);
        }
        return;
      }

      if (!peek) {
        const material = new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          uniforms: {
            uMap: { value: slot.texture },
            uFocus: { value: 1 },
            uLatitude: { value: 0 },
            uAngularSpan: { value: new THREE.Vector2(1, 1) },
            uImageAspect: {
              value:
                /** @type {HTMLImageElement} */ (slot.texture.image).width /
                /** @type {HTMLImageElement} */ (slot.texture.image).height,
            },
            uTileSize: { value: new THREE.Vector2(slot.width, slot.height) },
            uGap: { value: 0 },
            uPadding: { value: 0 },
            uRadius: { value: 0 },
            uBackground: { value: new THREE.Color('#000') },
            uBackgroundAlpha: { value: 0 },
            uDissolve: { value: 1 },
            uSeed: { value: slot.index },
            uOpacity: { value: 1 },
            uReveal: { value: 1 },
          },
          vertexShader: TILE_VERTEX,
          fragmentShader: TILE_FRAGMENT,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(slot.width, slot.height),
          material,
        );
        mesh.userData.side = key;
        mesh.userData.tileIndex = slot.index;
        peekGroup.add(mesh);
        peek = { mesh, material, slot };
        peekMeshes.push(peek);
      }

      peek.slot = slot;
      peek.material.uniforms.uMap.value = slot.texture;
      peek.material.uniforms.uSeed.value = slot.index;
      peek.material.uniforms.uImageAspect.value =
        /** @type {HTMLImageElement} */ (slot.texture.image).width /
        /** @type {HTMLImageElement} */ (slot.texture.image).height;
      peek.material.uniforms.uTileSize.value.set(slot.width, slot.height);
      peek.mesh.position.copy(slot.position);
      peek.mesh.quaternion.copy(slot.quaternion);

      gsap.to(peek.material.uniforms.uDissolve, {
        value: 0,
        duration: config.focusDuration * 0.8,
        ease: FOCUS_EASE,
      });
    });
  };

  const setPointer = (on) => {
    pointerOnTile.current = on;
    if (!dragging.current) {
      surface.style.cursor = on ? 'pointer' : '';
    }
  };

  const animateTileFocus = (entry) => {
    const focused = activeTile === entry.index;
    const dissolving = activeTile !== null && !focused;
    const { material, mesh } = entry;
    const scale = focused ? config.focusScale : 1;

    gsap.to(material.uniforms.uFocus, {
      value: focused ? 1 : 0,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(material.uniforms.uDissolve, {
      value: dissolving ? 1 : 0,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(material.uniforms.uGap, {
      value: focused ? 0 : config.gap,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(material.uniforms.uPadding, {
      value: focused ? 0 : config.padding,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(material.uniforms.uRadius, {
      value: focused ? 0 : config.cornerRadius,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(material.uniforms.uBackgroundAlpha, {
      value: focused ? 0 : 1,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
    gsap.to(mesh.scale, {
      x: scale,
      y: scale,
      z: scale,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    });
  };

  const animateAllTilesFocus = () => {
    tileMeshes.forEach(animateTileFocus);
    syncPeekMeshes();
  };

  const dismissFocus = () => {
    if (activeTile === null) return false;
    activeTile = null;
    animateAllTilesFocus();
    runFocusAnimation();
    onActiveChange?.(null);
    return true;
  };

  const selectTile = (index) => {
    if (dragMoved.current) return;
    if (activeTile !== null) {
      activeTile = null;
    } else {
      activeTile = index;
    }
    animateAllTilesFocus();
    runFocusAnimation();
    onActiveChange?.(activeTile === null ? null : activeTile % items.length);
  };

  const navigateTile = (index) => {
    if (dragMoved.current) return;
    activeTile = index;
    animateAllTilesFocus();
    runFocusAnimation();
    onActiveChange?.(activeTile % items.length);
  };

  /** @type {((index: number | null) => void) | undefined} */
  let onActiveChange;
  /** @type {(() => void) | undefined} */
  let onEmptyClick;

  const runRevealAnimation = () => {
    activeTimeline?.kill();
    revealComplete = false;
    camera.position.z = INITIAL_DISTANCE;
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
    group.scale.setScalar(0.5);
    sphereMaterial.opacity = 0;
    group.rotation.x = 1;
    group.rotation.y = 3;

    tileMeshes.forEach((entry) => {
      entry.material.uniforms.uReveal.value = 0;
      entry.material.uniforms.uDissolve.value = 0;
    });

    activeTimeline = gsap.timeline({
      onComplete: () => {
        pointerOffset.set(0, 0);
        revealComplete = true;
        tileMeshes.forEach((entry) => {
          gsap.to(entry.material.uniforms.uReveal, {
            value: 1,
            duration: config.revealDuration * 1.2,
            ease: REVEAL_EASE,
          });
          gsap.fromTo(
            entry.material.uniforms.uDissolve,
            { value: 0.5 },
            { value: 0, duration: config.revealDuration * 1.2, ease: REVEAL_EASE },
          );
        });
      },
    });

    activeTimeline.to(group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: config.revealDuration,
      ease: REVEAL_EASE,
    }, 0);
    activeTimeline.to(sphereMaterial, {
      opacity: 0.5,
      duration: config.revealDuration,
      ease: REVEAL_EASE,
    }, 0);
    activeTimeline.to(group.rotation, {
      x: 0,
      y: 0,
      duration: config.revealDuration,
      ease: REVEAL_EASE,
    }, 0);
    activeTimeline.to(camera.position, {
      z: SCENE_DISTANCE,
      duration: config.revealDuration * 0.7,
      ease: FOCUS_EASE,
    }, config.revealDuration * 0.7);
  };

  const runFocusAnimation = () => {
    if (!revealComplete) return;

    animating.current = true;
    activeTimeline?.kill();

    const focused = activeTile !== null ? tileLayout[activeTile] : null;
    let spinAngle = group.rotation.y;
    let tiltAngle = 0;
    let zDistance = SCENE_DISTANCE * Math.max(1, surface.clientHeight / surface.clientWidth);
    let parallaxX = pointerOffset.x * config.mouseParallax;
    let parallaxY = pointerOffset.y * config.mouseParallax;

    if (focused) {
      const spin = focused.longitude + Math.PI / 2;
      spinAngle = spin + Math.round((group.rotation.y - spin) / TAU) * TAU;
      tiltAngle = -focused.latitude;
      zDistance = focusDistanceFor(focused) - 1;
      parallaxX = 0;
      parallaxY = 0;
    }

    activeTimeline = gsap.timeline({
      onComplete: () => {
        animating.current = false;
        parallax.set(parallaxX, parallaxY);
        orientation.spin = group.rotation.y - parallax.x;
        orientation.tilt = group.rotation.x - parallax.y;
        orientation.targetSpin = orientation.spin;
        orientation.targetTilt = tiltAngle;
      },
    });

    activeTimeline.to(group.rotation, {
      x: tiltAngle + parallaxY,
      y: spinAngle + parallaxX,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    }, 0);
    activeTimeline.to(camera.position, {
      z: zDistance,
      duration: config.focusDuration,
      ease: FOCUS_EASE,
    }, 0);
  };

  const resize = () => {
    const width = surface.clientWidth;
    const height = surface.clientHeight;
    if (width < 1 || height < 1) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const pixelRatio = renderer.getPixelRatio();
    fbo.setSize(Math.ceil(width * pixelRatio), Math.ceil(height * pixelRatio));
  };

  const render = (time) => {
    if (disposed || !open) return;
    rafId = requestAnimationFrame(render);

    const delta = Math.max((time - lastTime) / 1000, 0.0001);
    lastTime = time;

    if (revealComplete && activeTile === null && !animating.current) {
      orientation.spin = THREE.MathUtils.damp(
        orientation.spin,
        orientation.targetSpin,
        12,
        delta,
      );
      orientation.tilt = THREE.MathUtils.damp(
        orientation.tilt,
        orientation.targetTilt,
        12,
        delta,
      );
      parallax.x = THREE.MathUtils.damp(
        parallax.x,
        pointerOffset.x * config.mouseParallax,
        4,
        delta,
      );
      parallax.y = THREE.MathUtils.damp(
        parallax.y,
        pointerOffset.y * config.mouseParallax,
        4,
        delta,
      );
      group.rotation.set(
        orientation.tilt + parallax.y,
        orientation.spin + parallax.x,
        0,
      );
    }

    const targetStrength = activeTile !== null ? 0 : config.lensBlur;
    lensMaterial.uniforms.uStrength.value = THREE.MathUtils.damp(
      lensMaterial.uniforms.uStrength.value,
      targetStrength,
      5,
      delta,
    );

    const cameraZ = camera.position.z;
    if (previousCameraZ !== null && delta > 0) {
      const speed = Math.abs(cameraZ - previousCameraZ) / delta;
      const target = Math.min(speed * 0.1, 1);
      lensMotion = THREE.MathUtils.damp(lensMotion, target, 14, delta);
      lensMaterial.uniforms.uMotion.value = lensMotion;
    }
    previousCameraZ = cameraZ;

    const previousClearAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(fbo);
    renderer.setClearAlpha(0);
    renderer.clear();
    renderer.render(contentScene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(previousClearAlpha);
    renderer.render(lensScene, lensCamera);
  };

  const getInteractiveMeshes = () => {
    if (!revealComplete) return [];
    const meshes = [];
    tileMeshes.forEach((entry) => {
      const focused = activeTile === entry.index;
      if (activeTile === null || focused) meshes.push(entry.mesh);
    });
    peekMeshes.forEach((peek) => meshes.push(peek.mesh));
    return meshes;
  };

  const updatePointer = (clientX, clientY) => {
    const rect = surface.getBoundingClientRect();
    pointerOffset.set(
      THREE.MathUtils.clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      THREE.MathUtils.clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    );
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  };

  const drag = { active: false, x: 0, y: 0, spin: 0, tilt: 0 };
  const DRAG_THRESHOLD = 6;

  const onPointerDown = (event) => {
    if (!open || !revealComplete) return;
    drag.active = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.spin = orientation.targetSpin;
    drag.tilt = orientation.targetTilt;
    dragMoved.current = false;
    updatePointer(event.clientX, event.clientY);
  };

  const onPointerMove = (event) => {
    if (!open) return;
    updatePointer(event.clientX, event.clientY);
    if (!drag.active) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      dragMoved.current = true;
    }

    if (activeTile !== null) return;

    if (dragMoved.current && !dragging.current) {
      dragging.current = true;
      surface.style.cursor = 'grabbing';
    }

    const width = surface.offsetWidth;
    orientation.targetSpin = drag.spin - (deltaX / width) * TAU;
    orientation.targetTilt = THREE.MathUtils.clamp(
      drag.tilt - (deltaY / width) * Math.PI,
      -MAX_TILT,
      MAX_TILT,
    );
  };

  const onPointerUp = (event) => {
    if (!open) return;

    if (!dragMoved.current && revealComplete) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getInteractiveMeshes(), false);
      if (hits.length > 0) {
        const mesh = hits[0].object;
        const tileIndex = mesh.userData.tileIndex;
        if (typeof tileIndex === 'number') {
          if (peekMeshes.some((p) => p.mesh === mesh)) {
            navigateTile(tileIndex);
          } else {
            selectTile(tileIndex);
          }
          setPointer(false);
        }
      } else if (activeTile !== null) {
        dismissFocus();
      } else {
        onEmptyClick?.();
      }
    }

    drag.active = false;
    dragging.current = false;
    surface.style.cursor = pointerOnTile.current ? 'pointer' : '';
  };

  const onPointerHover = (event) => {
    if (!open || !revealComplete || dragging.current || drag.active) return;
    updatePointer(event.clientX, event.clientY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(getInteractiveMeshes(), false);
    const onTile = hits.length > 0;
    const focused = activeTile !== null;
    setPointer(onTile && (!focused || hits[0].object.userData.tileIndex === activeTile));
  };

  const waitReady = () =>
    Promise.all(
      textures.map(
        (texture) =>
          new Promise((resolve) => {
            if (texture.image?.complete) resolve(texture);
            else texture.addEventListener('load', () => resolve(texture), { once: true });
          }),
      ),
    ).then(() => {
      ready = true;
    });

  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointermove', onPointerHover);
  window.addEventListener('resize', resize);

  return {
    set onActiveChange(callback) {
      onActiveChange = callback;
    },
    set onEmptyClick(callback) {
      onEmptyClick = callback;
    },
    get isReady() {
      return ready;
    },
    waitReady,
    openGallery() {
      if (open) return;
      open = true;
      activeTile = null;
      resize();
      lastTime = performance.now();
      previousCameraZ = null;
      waitReady().then(() => {
        if (!open || disposed) return;
        runRevealAnimation();
        rafId = requestAnimationFrame(render);
      });
    },
    closeGallery() {
      open = false;
      activeTile = null;
      revealComplete = false;
      cancelAnimationFrame(rafId);
      activeTimeline?.kill();
      onActiveChange?.(null);
    },
    dismissFocus,
    destroy() {
      disposed = true;
      this.closeGallery();
      surface.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerHover);
      window.removeEventListener('resize', resize);
      tileMeshes.forEach(({ mesh, material }) => {
        mesh.geometry.dispose();
        material.dispose();
      });
      peekMeshes.forEach(({ mesh, material }) => {
        mesh.geometry.dispose();
        material.dispose();
      });
      sphereMaterial.dispose();
      lensMaterial.dispose();
      fbo.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    },
  };
}

/**
 * @param {HTMLElement} root
 * @param {SphereGalleryItem[]} items
 */
export function initSphereGalleryOverlay(root, items) {
  const overlay = root.querySelector('[data-sphere-overlay]');
  const surface = root.querySelector('[data-sphere-surface]');
  const canvas = root.querySelector('[data-sphere-canvas]');
  const closeBtn = root.querySelector('[data-sphere-close]');
  const backdrop = root.querySelector('[data-sphere-backdrop]');
  const label = root.querySelector('[data-sphere-label]');

  if (
    !(overlay instanceof HTMLElement) ||
    !(surface instanceof HTMLElement) ||
    !(canvas instanceof HTMLCanvasElement)
  ) {
    return { open: () => {}, close: () => {}, destroy: () => {} };
  }

  const gallery = createSphereGallery(surface, canvas, items);

  gallery.onActiveChange = (index) => {
    if (!(label instanceof HTMLElement)) return;
    if (index === null) {
      label.textContent = '';
      label.hidden = true;
      return;
    }
    const item = items[index];
    label.textContent = item?.label || item?.alt || '';
    label.hidden = !label.textContent;
  };

  const open = () => {
    overlay.hidden = false;
    document.body.classList.add('sphere-gallery-open');
    gallery.openGallery();
  };

  const close = () => {
    gallery.closeGallery();
    overlay.hidden = true;
    document.body.classList.remove('sphere-gallery-open');
    if (label instanceof HTMLElement) {
      label.textContent = '';
      label.hidden = true;
    }
  };

  gallery.onEmptyClick = close;

  const onKeyDown = (event) => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      const unfocused = gallery.dismissFocus();
      if (!unfocused) close();
    }
  };

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.addEventListener('keydown', onKeyDown);

  return {
    open,
    close,
    destroy: () => {
      close();
      window.removeEventListener('keydown', onKeyDown);
      gallery.destroy();
    },
  };
}
