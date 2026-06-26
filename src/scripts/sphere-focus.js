/**
 * Atelier sphere-gallery tile focus — isolated for reuse.
 * https://www.atelier-ui.com/en/docs/components/background/sphere-gallery
 *
 * @example
 * import { SphereFocusController, createFocusTileMaterial } from './sphere-focus.js';
 *
 * const focus = new SphereFocusController({
 *   group, camera, tileMeshes, tileLayout, surface,
 *   peekGroup, textures,
 *   config: { fov: 70 },
 *   pointerOffset, parallax, orientation,
 *   onActiveChange: (index) => {},
 * });
 *
 * focus.focus(3);      // enlarge tile, dissolve others, zoom camera
 * focus.dismiss();     // back to sphere view
 * focus.toggle(3);     // click behaviour
 */
import * as THREE from 'three';
import gsap from 'gsap';

const TAU = Math.PI * 2;

export const FOCUS_EASE = 'cubic-bezier(0.7, 0.03, 0.26, 0.99)';
export const PEEK_DEPTH = 1.5;
export const PEEK_MARGIN = 0.15;

/** @type {const} */
export const FOCUS_DEFAULTS = {
  focusDuration: 1,
  focusScale: 1.7,
  gap: 0.01,
  padding: 0.03,
  cornerRadius: 0.02,
  tileColor: '#F8F8F8',
  fov: 70,
  mouseParallax: 0.2,
};

export const SPHERE_TILE_VERTEX = /* glsl */ `
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

export const SPHERE_TILE_FRAGMENT = /* glsl */ `
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

/**
 * @typedef {object} SphereTileLayout
 * @property {THREE.Vector3} position
 * @property {THREE.Quaternion} quaternion
 * @property {number} longitude
 * @property {number} latitude
 * @property {number} width
 * @property {number} height
 * @property {THREE.Vector2} span
 */

/**
 * @typedef {object} FocusTileEntry
 * @property {THREE.Mesh} mesh
 * @property {number} index
 * @property {THREE.ShaderMaterial} material
 * @property {SphereTileLayout} tile
 */

/**
 * @param {THREE.Texture} texture
 * @param {SphereTileLayout} tile
 * @param {number} index
 * @param {typeof FOCUS_DEFAULTS} config
 * @param {number} imageAspect
 */
export function createFocusTileMaterial(texture, tile, index, config, imageAspect) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uMap: { value: texture },
      uFocus: { value: 0 },
      uLatitude: { value: tile.latitude },
      uAngularSpan: { value: tile.span },
      uImageAspect: { value: imageAspect },
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
    vertexShader: SPHERE_TILE_VERTEX,
    fragmentShader: SPHERE_TILE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * @param {SphereTileLayout} tile
 * @param {number} fov
 */
export function focusDistanceFor(tile, fov) {
  const tileSize = Math.max(tile.width, tile.height) * 1.9;
  return tileSize / 2 / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
}

/**
 * @param {object} params
 * @param {SphereTileLayout | null} params.focusedTile
 * @param {number} params.groupRotationY
 * @param {number} params.surfaceWidth
 * @param {number} params.surfaceHeight
 * @param {number} params.sceneDistance
 * @param {number} params.fov
 * @param {number} params.mouseParallax
 * @param {THREE.Vector2} params.pointerOffset
 */
export function computeFocusCameraTargets({
  focusedTile,
  groupRotationY,
  surfaceWidth,
  surfaceHeight,
  sceneDistance,
  fov,
  mouseParallax,
  pointerOffset,
}) {
  let spinAngle = groupRotationY;
  let tiltAngle = 0;
  let zDistance = sceneDistance * Math.max(1, surfaceHeight / surfaceWidth);
  let parallaxX = pointerOffset.x * mouseParallax;
  let parallaxY = pointerOffset.y * mouseParallax;

  if (focusedTile) {
    const spin = focusedTile.longitude + Math.PI / 2;
    spinAngle = spin + Math.round((groupRotationY - spin) / TAU) * TAU;
    tiltAngle = -focusedTile.latitude;
    zDistance = focusDistanceFor(focusedTile, fov) - 1;
    parallaxX = 0;
    parallaxY = 0;
  }

  return { spinAngle, tiltAngle, zDistance, parallaxX, parallaxY };
}

/**
 * @param {THREE.ShaderMaterial} material
 * @param {THREE.Mesh} mesh
 * @param {{ focused: boolean, dissolving: boolean }} state
 * @param {typeof FOCUS_DEFAULTS} config
 */
export function tweenTileFocus(material, mesh, state, config) {
  const { focused, dissolving } = state;
  const scale = focused ? config.focusScale : 1;
  const duration = config.focusDuration;
  const ease = FOCUS_EASE;

  gsap.to(material.uniforms.uFocus, { value: focused ? 1 : 0, duration, ease });
  gsap.to(material.uniforms.uDissolve, { value: dissolving ? 1 : 0, duration, ease });
  gsap.to(material.uniforms.uGap, { value: focused ? 0 : config.gap, duration, ease });
  gsap.to(material.uniforms.uPadding, { value: focused ? 0 : config.padding, duration, ease });
  gsap.to(material.uniforms.uRadius, { value: focused ? 0 : config.cornerRadius, duration, ease });
  gsap.to(material.uniforms.uBackgroundAlpha, { value: focused ? 0 : 1, duration, ease });
  gsap.to(mesh.scale, { x: scale, y: scale, z: scale, duration, ease });
}

/**
 * @param {FocusTileEntry[]} tileMeshes
 * @param {number | null} activeTile
 * @param {typeof FOCUS_DEFAULTS} config
 */
export function tweenAllTilesFocus(tileMeshes, activeTile, config) {
  tileMeshes.forEach((entry) => {
    const focused = activeTile === entry.index;
    const dissolving = activeTile !== null && !focused;
    tweenTileFocus(entry.material, entry.mesh, { focused, dissolving }, config);
  });
}

/**
 * @param {object} params
 * @param {THREE.Group} params.group
 * @param {THREE.PerspectiveCamera} params.camera
 * @param {ReturnType<typeof computeFocusCameraTargets>} params.targets
 * @param {typeof FOCUS_DEFAULTS} params.config
 * @param {THREE.Vector2} params.parallax
 * @param {{ spin: number, tilt: number, targetSpin: number, targetTilt: number }} params.orientation
 * @param {() => void} [params.onStart]
 * @param {() => void} [params.onComplete]
 */
export function createFocusCameraTimeline({
  group,
  camera,
  targets,
  config,
  parallax,
  orientation,
  onStart,
  onComplete,
}) {
  const { spinAngle, tiltAngle, zDistance, parallaxX, parallaxY } = targets;

  return gsap.timeline({
    onStart,
    onComplete: () => {
      parallax.set(parallaxX, parallaxY);
      orientation.spin = group.rotation.y - parallax.x;
      orientation.tilt = group.rotation.x - parallax.y;
      orientation.targetSpin = orientation.spin;
      orientation.targetTilt = tiltAngle;
      onComplete?.();
    },
  })
    .to(
      group.rotation,
      {
        x: tiltAngle + parallaxY,
        y: spinAngle + parallaxX,
        duration: config.focusDuration,
        ease: FOCUS_EASE,
      },
      0,
    )
    .to(
      camera.position,
      {
        z: zDistance,
        duration: config.focusDuration,
        ease: FOCUS_EASE,
      },
      0,
    );
}

/**
 * @param {object} params
 * @param {number} params.activeTile
 * @param {SphereTileLayout[]} params.tileLayout
 * @param {THREE.Texture[]} params.textures
 * @param {number} params.surfaceWidth
 * @param {number} params.surfaceHeight
 * @param {number} params.fov
 */
export function getPeekSlots({
  activeTile,
  tileLayout,
  textures,
  surfaceWidth,
  surfaceHeight,
  fov,
}) {
  const focused = tileLayout[activeTile];
  const sideAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(focused.quaternion);
  const depthAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(focused.quaternion);
  const total = tileLayout.length;
  const peekDistance = focusDistanceFor(focused, fov) + focused.width * PEEK_DEPTH;
  const sideOffset =
    Math.tan(THREE.MathUtils.degToRad(fov) / 2) * peekDistance * (surfaceWidth / surfaceHeight) -
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
}

/**
 * Reusable sphere tile focus — morph, dissolve, camera zoom, peek neighbours.
 */
export class SphereFocusController {
  /**
   * @param {object} options
   * @param {THREE.Group} options.group
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {FocusTileEntry[]} options.tileMeshes
   * @param {SphereTileLayout[]} options.tileLayout
   * @param {HTMLElement} options.surface
   * @param {THREE.Group} options.peekGroup
   * @param {THREE.Texture[]} options.textures
   * @param {number} options.sceneDistance
   * @param {THREE.Vector2} options.pointerOffset
   * @param {THREE.Vector2} options.parallax
   * @param {{ spin: number, tilt: number, targetSpin: number, targetTilt: number }} options.orientation
   * @param {Partial<typeof FOCUS_DEFAULTS>} [options.config]
   * @param {() => boolean} [options.canAnimate]
   * @param {(index: number | null) => void} [options.onActiveChange]
   */
  constructor({
    group,
    camera,
    tileMeshes,
    tileLayout,
    surface,
    peekGroup,
    textures,
    sceneDistance,
    pointerOffset,
    parallax,
    orientation,
    config = {},
    canAnimate = () => true,
    onActiveChange,
  }) {
    this.group = group;
    this.camera = camera;
    this.tileMeshes = tileMeshes;
    this.tileLayout = tileLayout;
    this.surface = surface;
    this.peekGroup = peekGroup;
    this.textures = textures;
    this.sceneDistance = sceneDistance;
    this.pointerOffset = pointerOffset;
    this.parallax = parallax;
    this.orientation = orientation;
    this.config = { ...FOCUS_DEFAULTS, ...config };
    this.canAnimate = canAnimate;
    this.onActiveChange = onActiveChange;

    /** @type {number | null} */
    this.activeTile = null;
    this.animating = false;
    /** @type {gsap.core.Timeline | null} */
    this.activeTimeline = null;
    /** @type {Array<{ mesh: THREE.Mesh, material: THREE.ShaderMaterial, slot: ReturnType<typeof getPeekSlots>['previous'] }>} */
    this.peekMeshes = [];
  }

  get activeIndex() {
    return this.activeTile;
  }

  killTimeline() {
    this.activeTimeline?.kill();
    this.activeTimeline = null;
  }

  runCameraAnimation() {
    if (!this.canAnimate()) return;

    this.animating = true;
    this.killTimeline();

    const focused =
      this.activeTile !== null ? this.tileLayout[this.activeTile] : null;
    const targets = computeFocusCameraTargets({
      focusedTile: focused,
      groupRotationY: this.group.rotation.y,
      surfaceWidth: this.surface.clientWidth,
      surfaceHeight: this.surface.clientHeight,
      sceneDistance: this.sceneDistance,
      fov: this.config.fov,
      mouseParallax: this.config.mouseParallax,
      pointerOffset: this.pointerOffset,
    });

    this.activeTimeline = createFocusCameraTimeline({
      group: this.group,
      camera: this.camera,
      targets,
      config: this.config,
      parallax: this.parallax,
      orientation: this.orientation,
      onComplete: () => {
        this.animating = false;
      },
    });
  }

  syncPeekMeshes() {
    const slots =
      this.activeTile === null
        ? { previous: null, next: null }
        : getPeekSlots({
            activeTile: this.activeTile,
            tileLayout: this.tileLayout,
            textures: this.textures,
            surfaceWidth: this.surface.clientWidth,
            surfaceHeight: this.surface.clientHeight,
            fov: this.config.fov,
          });

    const entries = [
      { key: 'previous', slot: slots.previous },
      { key: 'next', slot: slots.next },
    ];

    entries.forEach(({ key, slot }) => {
      let peek = this.peekMeshes.find((p) => p.mesh.userData.side === key);

      if (!slot) {
        if (peek) {
          this.peekGroup.remove(peek.mesh);
          peek.mesh.geometry.dispose();
          peek.material.dispose();
          this.peekMeshes.splice(this.peekMeshes.indexOf(peek), 1);
        }
        return;
      }

      const image = /** @type {HTMLImageElement | undefined} */ (slot.texture.image);
      const imageAspect =
        image?.width && image?.height ? image.width / image.height : 1;

      if (!peek) {
        const material = new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          uniforms: {
            uMap: { value: slot.texture },
            uFocus: { value: 1 },
            uLatitude: { value: 0 },
            uAngularSpan: { value: new THREE.Vector2(1, 1) },
            uImageAspect: { value: imageAspect },
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
          vertexShader: SPHERE_TILE_VERTEX,
          fragmentShader: SPHERE_TILE_FRAGMENT,
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
        this.peekGroup.add(mesh);
        peek = { mesh, material, slot };
        this.peekMeshes.push(peek);
      }

      peek.slot = slot;
      peek.material.uniforms.uMap.value = slot.texture;
      peek.material.uniforms.uSeed.value = slot.index;
      peek.material.uniforms.uImageAspect.value = imageAspect;
      peek.material.uniforms.uTileSize.value.set(slot.width, slot.height);
      peek.mesh.position.copy(slot.position);
      peek.mesh.quaternion.copy(slot.quaternion);

      gsap.to(peek.material.uniforms.uDissolve, {
        value: 0,
        duration: this.config.focusDuration * 0.8,
        ease: FOCUS_EASE,
      });
    });
  }

  applyTileAnimations() {
    tweenAllTilesFocus(this.tileMeshes, this.activeTile, this.config);
    this.syncPeekMeshes();
  }

  /** @param {number} index */
  focus(index) {
    this.activeTile = index;
    this.applyTileAnimations();
    this.runCameraAnimation();
    this.onActiveChange?.(index);
  }

  dismiss() {
    if (this.activeTile === null) return false;
    this.activeTile = null;
    this.applyTileAnimations();
    this.runCameraAnimation();
    this.onActiveChange?.(null);
    return true;
  }

  clearFocus() {
    this.killTimeline();
    this.activeTile = null;
    this.animating = false;
    this.peekMeshes.forEach(({ mesh, material }) => {
      this.peekGroup.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    });
    this.peekMeshes = [];
  }

  /** @param {number} index */
  toggle(index) {
    this.activeTile = this.activeTile !== null ? null : index;
    this.applyTileAnimations();
    this.runCameraAnimation();
    this.onActiveChange?.(this.activeTile);
  }

  /** @param {number} index */
  navigate(index) {
    this.activeTile = index;
    this.applyTileAnimations();
    this.runCameraAnimation();
    this.onActiveChange?.(index);
  }

  getInteractiveMeshes() {
    const meshes = [];
    this.tileMeshes.forEach((entry) => {
      const focused = this.activeTile === entry.index;
      if (this.activeTile === null || focused) meshes.push(entry.mesh);
    });
    this.peekMeshes.forEach((peek) => meshes.push(peek.mesh));
    return meshes;
  }

  destroy() {
    this.killTimeline();
    this.peekMeshes.forEach(({ mesh, material }) => {
      this.peekGroup.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    });
    this.peekMeshes = [];
    this.activeTile = null;
  }
}
