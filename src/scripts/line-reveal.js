const BLOCK_TAGS = new Set([
  'div',
  'section',
  'article',
  'aside',
  'ul',
  'ol',
  'li',
  'table',
]);

const TARGET_SELECTOR =
  'h1, h2, h3, p, .home__intro-links a, .home__clients li, .home__theme > span';

const EXCLUDE_SELECTOR = [
  '[data-carousel-left-label]',
  '[data-carousel-right-label]',
  '[data-carousel-index]',
  '[data-carousel-client]',
  '.carousel-ui',
  '[data-splash]',
  'nav',
].join(', ');

/**
 * @param {string} className
 * @returns {HTMLElement}
 */
function createClip(className) {
  const clip = document.createElement('span');
  clip.className = className;
  return clip;
}

/**
 * @param {HTMLElement} el
 * @returns {HTMLElement | null}
 */
function revealElement(el) {
  const children = Array.from(el.childNodes);

  if (
    children.some(
      (n) =>
        n.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has(/** @type {Element} */ (n).tagName.toLowerCase()),
    )
  ) {
    const clip = createClip('lr-clip');
    el.parentNode?.insertBefore(clip, el);
    clip.appendChild(el);
    el.classList.add('lr-inner');
    const revealDelayFallback = parseFloat(el.dataset.revealDelay ?? '0') || 0;
    el.style.transition = `transform 1.2s cubic-bezier(0.42,0,0.24,1) ${revealDelayFallback.toFixed(2)}s`;
    return clip;
  }

  /** @type {{ html: string, isBr: boolean }[]} */
  const atoms = [];

  children.forEach((node) => {
    if (node.nodeName === 'BR') {
      atoms.push({ html: '', isBr: true });
    } else if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent || '')
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .forEach((w) => atoms.push({ html: w, isBr: false }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      atoms.push({ html: /** @type {Element} */ (node).outerHTML, isBr: false });
    }
  });

  if (atoms.filter((a) => !a.isBr).length === 0) return null;

  el.innerHTML = '';
  /** @type {HTMLElement[]} */
  const wrapEls = [];

  atoms.forEach((atom, i) => {
    if (atom.isBr) {
      const sentinel = document.createElement('span');
      sentinel.className = 'lw-br';
      sentinel.style.cssText = 'display:block;height:0;font-size:0;line-height:0';
      el.appendChild(sentinel);
      wrapEls.push(sentinel);
    } else {
      const word = document.createElement('span');
      word.className = 'lw';
      word.style.display = 'inline-block';
      word.innerHTML = atom.html;
      el.appendChild(word);
      wrapEls.push(word);
      const next = atoms[i + 1];
      if (next && !next.isBr) el.appendChild(document.createTextNode(' '));
    }
  });

  /** @type {string[][]} */
  const lineGroups = [];
  let currentTop = -9999;
  /** @type {string[]} */
  let group = [];

  wrapEls.forEach((wrap) => {
    if (wrap.classList.contains('lw-br')) {
      if (group.length) {
        lineGroups.push(group);
        group = [];
      }
      currentTop = -9999;
      return;
    }

    const top = wrap.offsetTop;
    if (Math.abs(top - currentTop) > 3) {
      if (group.length) lineGroups.push(group);
      group = [];
      currentTop = top;
    }
    group.push(wrap.innerHTML);
  });

  if (group.length) lineGroups.push(group);
  if (lineGroups.length === 0) return null;

  const revealDelay = parseFloat(el.dataset.revealDelay ?? '0') || 0;
  el.innerHTML = '';

  lineGroups.forEach((words, i) => {
    const clip = createClip('lr-clip');
    const inner = createClip('lr-inner');
    inner.style.transition = `transform 1.2s cubic-bezier(0.42,0,0.24,1) ${(revealDelay + i * 0.12).toFixed(2)}s`;
    inner.innerHTML = words.join(' ').replace(/ ([,\.;:!?\)])/g, '$1');
    clip.appendChild(inner);
    el.appendChild(clip);
  });

  return el;
}

/**
 * @param {{ readyEvent?: string }} [options]
 */
export function initLineReveal(options = {}) {
  const readyEvent = options.readyEvent ?? 'splash:finished';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) return () => {};

  const css = document.createElement('style');
  css.textContent = `
    .lr-clip { overflow: hidden; display: block; }
    .lr-inner {
      display: block;
      transform: translateY(110%);
      will-change: transform;
    }
    .lr-clip.lr-visible .lr-inner {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(css);

  const targets = Array.from(document.querySelectorAll(TARGET_SELECTOR)).filter(
    (el) => !(/** @type {Element} */ (el).closest(EXCLUDE_SELECTOR)),
  );

  /** @type {Set<HTMLElement>} */
  const revealed = new Set();

  /** @type {HTMLElement[]} */
  let toObserve = [];

  /**
   * @param {HTMLElement} target
   */
  const revealTarget = (target) => {
    const clips = target.querySelectorAll(':scope > .lr-clip');
    if (clips.length > 0) {
      clips.forEach((clip) => clip.classList.add('lr-visible'));
    } else {
      target.classList.add('lr-visible');
    }
    revealed.add(target);
  };

  const startObserving = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toObserve.forEach((el) => revealTarget(el));
      });
    });
  };

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  let readyFired = !document.documentElement.classList.contains('splash-active');

  document.addEventListener(readyEvent, () => {
    readyFired = true;
  }, { once: true });

  fontsReady.then(() => {
    targets.forEach((el) => {
      /** @type {HTMLElement} */ (el).dataset.origHtml = el.innerHTML;
    });

    toObserve = targets
      .map((el) => revealElement(/** @type {HTMLElement} */ (el)))
      .filter((el) => el instanceof HTMLElement);

    if (readyFired) {
      startObserving();
    } else {
      document.addEventListener(readyEvent, startObserving, { once: true });
    }
  });

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      targets.forEach((el) => {
        const target = /** @type {HTMLElement} */ (el);
        if (target.dataset.origHtml !== undefined) {
          target.innerHTML = target.dataset.origHtml;
        }

        revealElement(target);

        if (revealed.has(target)) {
          target.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
            /** @type {HTMLElement} */ (clip).style.transition = 'none';
            clip.classList.add('lr-visible');
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                /** @type {HTMLElement} */ (clip).style.transition = '';
              });
            });
          });
        }
      });
    }, 200);
  };

  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    css.remove();
  };
}
