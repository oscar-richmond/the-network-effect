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

const DEFAULT_TARGET_SELECTOR =
  'h1, h2, h3, p, .home__intro-links a, .home__clients li, .home__theme > span';

const DEFAULT_EXCLUDE_SELECTOR = [
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

let lineRevealStylesInjected = false;

function ensureLineRevealStyles() {
  if (lineRevealStylesInjected) return;
  lineRevealStylesInjected = true;

  /* The lr-done release/re-arm hooks (see the stylesheet note):
     transitionend on a revealed inner frees the clip; a stale lr-done
     is cleared as the next transition starts while un-revealed. */
  document.addEventListener('transitionend', (e) => {
    const t = e.target;
    if (e.propertyName !== 'transform' || !(t instanceof HTMLElement) || !t.classList.contains('lr-inner')) return;
    const clip = t.parentElement;
    if (!clip?.classList.contains('lr-clip')) return;
    /* Release only when SETTLED AT IDENTITY — a transition that ended
       elsewhere (an exit landing at its parked offset) keeps the clip. */
    const tf = getComputedStyle(t).transform;
    if (tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)') {
      clip.classList.add('lr-done');
    }
  }, true);
  document.addEventListener('transitionstart', (e) => {
    const t = e.target;
    if (e.propertyName !== 'transform' || !(t instanceof HTMLElement) || !t.classList.contains('lr-inner')) return;
    /* ANY starting motion re-arms the clip immediately. */
    t.parentElement?.classList.remove('lr-done');
  }, true);

  const css = document.createElement('style');
  css.id = 'line-reveal-styles';
  css.textContent = `
    /* CLIP BOUNDS (Oscar's clipping report, 2026-08-26):
       — SIDES: the window extends 0.25em past each edge with
         exactly-compensating negative margins (exact for both block
         and inline-block clips — the margin box, and therefore all
         layout, is byte-identical; vertical padding is NOT used: in
         inline-block line-box contexts its negative-margin
         compensation is unreliable and leaked height).
       — VERTICALS: once a reveal's transition COMPLETES the clip
         releases overflow entirely (lr-done, set on transitionend
         below), so descender/ascender ink renders in full at rest.
         The gate needs BOTH classes: the moment an un-reveal drops
         lr-visible the clip re-engages for the exit motion. The
         animation itself — timing, curve, character — is untouched;
         only the at-rest window changes. */
    .lr-clip { overflow: hidden; display: block; padding: 0 0.25em; margin: 0 -0.25em; }
    .lr-clip--word { display: inline-block; vertical-align: top; text-indent: 0; }
    .lr-inner {
      display: block;
      transform: translateY(110%);
      will-change: transform;
    }
    .lr-clip.lr-visible .lr-inner {
      transform: translateY(0);
    }
    .lr-clip.lr-done { overflow: visible; }
  `;
  document.head.appendChild(css);
}

/**
 * @param {HTMLElement} el
 */
export function playLineRevealElement(el) {
  ensureLineRevealStyles();

  const clips = el.querySelectorAll(':scope > .lr-clip');
  if (clips.length > 0) {
    clips.forEach((clip) => clip.classList.add('lr-visible'));
    return;
  }

  if (el.classList.contains('lr-clip')) {
    el.classList.add('lr-visible');
    return;
  }

  const parentClip = el.parentElement;
  if (el.classList.contains('lr-inner') && parentClip?.classList.contains('lr-clip')) {
    parentClip.classList.add('lr-visible');
    return;
  }

  el.classList.add('lr-visible');
}

/**
 * @param {HTMLElement} el
 */
export function wrapLineRevealElement(el) {
  ensureLineRevealStyles();
  return revealElement(el);
}

/**
 * STATIC line wrap — the proven line-grouping (revealElement's
 * layout-measured lines) yielding plain per-line block elements
 * with NO reveal behaviour: clips pre-visible, inner transitions
 * stripped. For per-line effects that need rendered-line targets
 * (the overtake wipes). Call after fonts; re-call after setting
 * textContent to re-derive.
 *
 * @param {HTMLElement} el
 * @returns {HTMLElement[]} the per-line clip elements, top to bottom
 */
export function wrapStaticLines(el) {
  ensureLineRevealStyles();
  revealElement(el);
  const clips = Array.from(el.querySelectorAll(':scope > .lr-clip'));
  clips.forEach((clip) => {
    clip.classList.add('lr-visible');
    clip.querySelectorAll('.lr-inner').forEach((inn) => {
      if (inn instanceof HTMLElement) {
        inn.style.transition = 'none';
        inn.style.transitionDelay = '';
      }
    });
  });
  return clips.filter((c) => c instanceof HTMLElement);
}

/**
 * An element atom's OWN leading/trailing whitespace, moved out of the
 * element and returned so the caller can emit it BETWEEN clips.
 *
 * Why: each atom is wrapped in a `display:inline-block` clip, and CSS
 * deletes collapsible whitespace at a line-box edge. A face span
 * authored as `<span>WE </span><span>CREATE ACCESS</span>` therefore
 * renders "WECREATE ACCESS" — the space is inside the clip, at its
 * edge, so it is dropped (Oscar's report). Hoisted into the gap
 * between the two clips the same space survives as an ordinary
 * collapsed space, which is what the source means.
 *
 * Elements that PRESERVE whitespace (white-space: pre / pre-wrap /
 * break-spaces) are left untouched: their spacing is authored and
 * already renders correctly inside the clip — the network sector
 * separators and OUR/NETWORK title depend on exactly that.
 *
 * @param {Node} node
 * @returns {{ lead: string, trail: string }}
 */
function hoistEdgeWhitespace(node) {
  const none = { lead: '', trail: '' };
  if (!(node instanceof HTMLElement) || node.nodeName === 'BR') return none;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  /** @type {Text[]} */
  const texts = [];
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (t instanceof Text) texts.push(t);
  }
  if (!texts.length) return none;

  /* Read computed styles NOW — the caller detaches these nodes
     moments later, and a detached node has no computed style. */
  const preserved = (text) => {
    const owner = text.parentElement ?? node;
    return /^(pre|pre-wrap|break-spaces)$/.test(getComputedStyle(owner).whiteSpace);
  };

  /* An all-whitespace text node is left alone: it is a deliberate
     spacer atom, not an edge run on real text. */
  let lead = '';
  const first = texts[0];
  const firstText = first.textContent ?? '';
  if (!preserved(first) && !/^\s+$/.test(firstText)) {
    const m = firstText.match(/^\s+/);
    if (m) {
      lead = m[0];
      first.textContent = firstText.slice(lead.length);
    }
  }

  let trail = '';
  const last = texts[texts.length - 1];
  const lastText = last.textContent ?? '';
  if (!preserved(last) && !/^\s+$/.test(lastText)) {
    const m = lastText.match(/\s+$/);
    if (m) {
      trail = m[0];
      last.textContent = lastText.slice(0, lastText.length - trail.length);
    }
  }

  return { lead, trail };
}

/**
 * WORD-level reveal wrap (the landing pages' entrance): each word —
 * or whole child ELEMENT (kept intact: face spans, term buttons,
 * spacers all survive as live nodes) — gets its own inline
 * clip/inner pair, staggered left-to-right within its laid-out line
 * (wordStagger) and line by line (lineStagger), on the same clip
 * slide the line reveal uses. Source whitespace is tracked exactly
 * (a space is emitted between units only where the source had one —
 * compact markup and white-space:pre content stay byte-faithful),
 * INCLUDING whitespace that sits inside an element atom's own edges,
 * which is hoisted into the inter-clip gap (see hoistEdgeWhitespace)
 * because the clip's inline-block edge would otherwise delete it.
 * playLineRevealElement drives it unchanged (`:scope > .lr-clip`),
 * and .lr-inner-based exit machinery (delay maps, un-reveals)
 * generalises to the word inners automatically.
 *
 * @param {HTMLElement} el
 * @param {{ baseDelay?: number, wordStagger?: number, lineStagger?: number }} [opts]
 */
export function wrapWordRevealElement(el, opts = {}) {
  ensureLineRevealStyles();
  const base = parseFloat(el.dataset.revealDelay ?? '') || opts.baseDelay || 0;
  const wordStagger = opts.wordStagger ?? 0.04;
  const lineStagger = opts.lineStagger ?? 0.12;

  /* Whitespace runs are carried VERBATIM (`spaceBefore` is the exact
     source string — double spaces and NBSPs survive; the network
     sector list's authored spacing depends on this). */
  /** @type {{ word?: string, node?: Node, spaceBefore: string }[]} */
  const atoms = [];
  let pendingSpace = '';
  Array.from(el.childNodes).forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      (n.textContent || '').split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) pendingSpace += part;
        else {
          atoms.push({ word: part, spaceBefore: pendingSpace });
          pendingSpace = '';
        }
      });
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      /* BRs stay bare — a break inside an inline clip is nonsense;
         the offsetTop grouping picks up the new line naturally. */
      const { lead, trail } = hoistEdgeWhitespace(n);
      atoms.push({ node: n, isBr: n.nodeName === 'BR', spaceBefore: pendingSpace + lead });
      pendingSpace = trail;
    }
  });
  if (!atoms.length) return null;

  el.textContent = '';
  const units = atoms.map((a, i) => {
    if (a.isBr) {
      el.appendChild(a.node);
      return null;
    }
    if (a.spaceBefore && i > 0) el.appendChild(document.createTextNode(a.spaceBefore));
    const clip = createClip('lr-clip lr-clip--word');
    const inner = createClip('lr-inner');
    if (a.node) inner.appendChild(a.node);
    else inner.textContent = a.word ?? '';
    clip.appendChild(inner);
    el.appendChild(clip);
    return clip;
  }).filter((u) => u !== null);

  /* Line grouping from real layout, then per-unit delays. */
  let lineIdx = 0;
  let wordIdx = 0;
  let lastTop = null;
  units.forEach((clip) => {
    const top = clip.offsetTop;
    if (lastTop === null) lastTop = top;
    else if (Math.abs(top - lastTop) > 3) {
      lineIdx += 1;
      wordIdx = 0;
      lastTop = top;
    }
    const inner = clip.firstChild;
    if (inner instanceof HTMLElement) {
      inner.style.transition = `transform 1.2s cubic-bezier(0.42,0,0.24,1) ${(base + lineIdx * lineStagger + wordIdx * wordStagger).toFixed(2)}s`;
    }
    wordIdx += 1;
  });

  return el;
}

/**
 * @param {{
 *   readyEvent?: string,
 *   trigger?: 'ready' | 'scroll',
 *   selector?: string,
 *   exclude?: string,
 *   threshold?: number,
 *   rootMargin?: string,
 *   onWrapped?: () => void,
 * }} [options]
 */
export function initLineReveal(options = {}) {
  const readyEvent = options.readyEvent ?? 'splash:finished';
  const trigger = options.trigger ?? 'ready';
  const targetSelector = options.selector ?? DEFAULT_TARGET_SELECTOR;
  const excludeSelector = options.exclude ?? DEFAULT_EXCLUDE_SELECTOR;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    options.onWrapped?.();
    return () => {};
  }

  ensureLineRevealStyles();

  const targets = Array.from(document.querySelectorAll(targetSelector)).filter(
    (el) => !excludeSelector || !(/** @type {Element} */ (el).closest(excludeSelector)),
  );

  /** @type {Set<HTMLElement>} */
  const revealed = new Set();

  /** @type {HTMLElement[]} */
  let toObserve = [];

  /**
   * @param {HTMLElement} target
   */
  const revealTarget = (target) => {
    playLineRevealElement(target);
    revealed.add(target);
  };

  const startObserving = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toObserve.forEach((el) => revealTarget(el));
      });
    });
  };

  /** @type {IntersectionObserver | null} */
  let scrollObserver = null;

  /** @type {Map<Element, HTMLElement>} */
  const observedNodeToTarget = new Map();

  const startScrollObserving = () => {
    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = observedNodeToTarget.get(entry.target);
          if (!target || revealed.has(target)) return;
          revealTarget(target);
          target.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
            scrollObserver?.unobserve(clip);
            observedNodeToTarget.delete(clip);
          });
          scrollObserver?.unobserve(entry.target);
          observedNodeToTarget.delete(entry.target);
        });
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
      },
    );

    toObserve.forEach((el) => {
      // Observe the tight-fitting per-line clips rather than `el` itself:
      // `el` may carry large decorative padding (e.g. gallery caption
      // layouts) that has nothing to do with the actual visible text, which
      // would make the observer fire while only empty padding is on screen.
      const clips = el.querySelectorAll(':scope > .lr-clip');
      const observeNodes = clips.length > 0 ? Array.from(clips) : [el];
      observeNodes.forEach((node) => {
        observedNodeToTarget.set(node, el);
        scrollObserver?.observe(node);
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

    options.onWrapped?.();

    if (trigger === 'scroll') {
      startScrollObserving();
      return;
    }

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
            clip.classList.add('lr-done'); /* no transition => no transitionend */
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                /** @type {HTMLElement} */ (clip).style.transition = '';
              });
            });
          });
        } else if (trigger === 'scroll' && scrollObserver) {
          const clips = target.querySelectorAll(':scope > .lr-clip');
          const observeNodes = clips.length > 0 ? Array.from(clips) : [target];
          observeNodes.forEach((node) => {
            observedNodeToTarget.set(node, target);
            scrollObserver?.observe(node);
          });
        }
      });
    }, 200);
  };

  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    scrollObserver?.disconnect();
  };
}
