/** @typedef {'top' | 'bottom' | 'left' | 'right'} GradualBlurPosition */
/** @typedef {'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'} GradualBlurCurve */
/** @typedef {'parent' | 'page'} GradualBlurTarget */

/** @typedef {{
 *   position?: GradualBlurPosition,
 *   strength?: number,
 *   height?: string,
 *   width?: string,
 *   divCount?: number,
 *   exponential?: boolean,
 *   zIndex?: number,
 *   animated?: boolean | 'scroll',
 *   duration?: string,
 *   easing?: string,
 *   opacity?: number,
 *   curve?: GradualBlurCurve,
 *   responsive?: boolean,
 *   target?: GradualBlurTarget,
 *   className?: string,
 *   hoverIntensity?: number,
 *   preset?: string,
 * }} GradualBlurConfig */

export const DEFAULT_CONFIG = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
};

/** @type {Record<string, Partial<GradualBlurConfig>>} */
export const PRESETS = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', height: '6rem' },
  right: { position: 'right', height: '6rem' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', height: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
};

/** @type {Record<GradualBlurCurve, (p: number) => number>} */
export const CURVE_FUNCTIONS = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - (1 - p) ** 2,
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2),
};

/**
 * @param {Partial<GradualBlurConfig>[]} configs
 * @returns {Required<Pick<GradualBlurConfig, keyof typeof DEFAULT_CONFIG>> & GradualBlurConfig}
 */
export function mergeConfigs(...configs) {
  return /** @type {any} */ (configs.reduce((acc, config) => ({ ...acc, ...config }), { ...DEFAULT_CONFIG }));
}

/**
 * @param {GradualBlurPosition} position
 */
export function getGradientDirection(position) {
  return ({
    top: 'to top',
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right',
  })[position] || 'to bottom';
}

/**
 * @param {GradualBlurConfig} config
 * @param {number} [strengthMultiplier]
 * @returns {Array<{ blurValue: number, gradient: string }>}
 */
export function buildBlurLayers(config, strengthMultiplier = 1) {
  const merged = mergeConfigs(config);
  const divs = [];
  const increment = 100 / merged.divCount;
  const currentStrength = merged.strength * strengthMultiplier;
  const curveFunc = CURVE_FUNCTIONS[merged.curve] || CURVE_FUNCTIONS.linear;
  const direction = getGradientDirection(merged.position);

  for (let i = 1; i <= merged.divCount; i += 1) {
    let progress = i / merged.divCount;
    progress = curveFunc(progress);

    let blurValue;
    if (merged.exponential) {
      blurValue = 2 ** (progress * 4) * 0.0625 * currentStrength;
    } else {
      blurValue = 0.0625 * (progress * merged.divCount + 1) * currentStrength;
    }

    const p1 = Math.round((increment * i - increment) * 10) / 10;
    const p2 = Math.round(increment * i * 10) / 10;
    const p3 = Math.round((increment * i + increment) * 10) / 10;
    const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (p3 <= 100) gradient += `, black ${p3}%`;
    if (p4 <= 100) gradient += `, transparent ${p4}%`;

    divs.push({
      blurValue,
      gradient: `linear-gradient(${direction}, ${gradient})`,
    });
  }

  return divs;
}

/**
 * @param {GradualBlurConfig} config
 * @param {{ height?: string, width?: string }} [overrides]
 */
export function getContainerStyle(config, overrides = {}) {
  const merged = mergeConfigs(config);
  const isVertical = ['top', 'bottom'].includes(merged.position);
  const isHorizontal = ['left', 'right'].includes(merged.position);
  const isPageTarget = merged.target === 'page';
  const height = overrides.height ?? merged.height;
  const width = overrides.width ?? merged.width;

  /** @type {Record<string, string | number>} */
  const style = {
    position: isPageTarget ? 'fixed' : 'absolute',
    pointerEvents: merged.hoverIntensity ? 'auto' : 'none',
    zIndex: String(isPageTarget ? merged.zIndex + 100 : merged.zIndex),
  };

  if (merged.animated) {
    style.transition = `opacity ${merged.duration} ${merged.easing}`;
  }

  if (isVertical) {
    style.height = height || '6rem';
    style.width = width || '100%';
    style[merged.position] = '0';
    style.left = '0';
    style.right = '0';
  } else if (isHorizontal) {
    style.width = width || height || '6rem';
    style.height = '100%';
    style[merged.position] = '0';
    style.top = '0';
    style.bottom = '0';
  }

  return style;
}

/**
 * @param {GradualBlurConfig} input
 */
export function resolveGradualBlurConfig(input = {}) {
  const presetConfig = input.preset && PRESETS[input.preset] ? PRESETS[input.preset] : {};
  return mergeConfigs(DEFAULT_CONFIG, presetConfig, input);
}
