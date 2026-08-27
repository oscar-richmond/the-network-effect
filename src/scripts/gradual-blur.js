import {
  buildBlurLayers,
  resolveGradualBlurConfig,
} from '../lib/gradual-blur.js';

/**
 * @param {HTMLElement} root
 */
function updateBlurLayers(root, strengthMultiplier = 1) {
  const config = resolveGradualBlurConfig({
    position: /** @type {any} */ (root.dataset.gradualBlurPosition),
    strength: Number(root.dataset.gradualBlurStrength),
    height: root.dataset.gradualBlurHeight,
    width: root.dataset.gradualBlurWidth,
    divCount: Number(root.dataset.gradualBlurDivCount),
    exponential: root.dataset.gradualBlurExponential === 'true',
    curve: /** @type {any} */ (root.dataset.gradualBlurCurve),
    opacity: Number(root.dataset.gradualBlurOpacity),
    target: /** @type {any} */ (root.dataset.gradualBlurTarget),
    preset: root.dataset.gradualBlurPreset,
  });

  const inner = root.querySelector('.gradual-blur-inner');
  if (!(inner instanceof HTMLElement)) return;

  const layers = buildBlurLayers(config, strengthMultiplier);
  const children = inner.querySelectorAll('[data-gradual-blur-layer]');

  children.forEach((child, index) => {
    if (!(child instanceof HTMLElement)) return;
    const layer = layers[index];
    if (!layer) return;

    child.style.backdropFilter = `blur(${layer.blurValue.toFixed(3)}rem)`;
    child.style.webkitBackdropFilter = `blur(${layer.blurValue.toFixed(3)}rem)`;
  });
}

/**
 * @param {HTMLElement} root
 */
export function initGradualBlurElement(root) {
  if (root.dataset.gradualBlurInitialized === 'true') return () => {};
  root.dataset.gradualBlurInitialized = 'true';
  const animated = root.dataset.gradualBlurAnimated;
  const hoverIntensity = Number(root.dataset.gradualBlurHoverIntensity);
  const undo = [];

  if (animated === 'scroll') {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        root.classList.toggle('is-visible', entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(root);
    undo.push(() => observer.disconnect());
  } else if (animated === 'true') {
    root.classList.add('is-visible');
  }

  if (Number.isFinite(hoverIntensity) && hoverIntensity > 0) {
    root.style.pointerEvents = 'auto';

    const onEnter = () => updateBlurLayers(root, hoverIntensity);
    const onLeave = () => updateBlurLayers(root, 1);
    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mouseleave', onLeave);
    undo.push(() => {
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
    });
  }

  /* A real cleanup (was none): the observer and hover listeners are
     released, and the wired-guard resets so a future re-init works. */
  return () => {
    undo.forEach((fn) => fn());
    delete root.dataset.gradualBlurInitialized;
  };
}

/**
 * @param {ParentNode | Document} scope
 * @returns {() => void}
 */
export function initGradualBlur(scope = document) {
  const elements = scope.querySelectorAll('[data-gradual-blur]');
  const cleanups = [];

  elements.forEach((el) => {
    if (el instanceof HTMLElement) cleanups.push(initGradualBlurElement(el));
  });

  return () => cleanups.forEach((fn) => fn());
}
