/**
 * THE ENTRANCE GRAMMAR below the seam (Oscar 2026-09-08 — "all text
 * animates in with the BUILT ON TRUST effect", the previous build's
 * m-entrance and the desktop's reveal constants, tokens/motion.css).
 *
 * TEXT: every word of a block is wrapped in a clip (an inline-block window
 * the word's own size, 0.25em of side room with compensating margins, so
 * the layout is byte-identical) whose inner rises from 110% below over
 * --m-reveal-dur on the reveal curve — the hero headline's word-clip rise.
 * Delays are staged from the RENDERED lines (grouped by the clips' tops
 * after fonts settle): --m-reveal-line-stagger per line, --m-reveal-word-
 * stagger per word within it. The wrap walks TEXT NODES at any depth, so a
 * paragraph of authored spans (the founders' four lines, the network's
 * terms with their separators) keeps its elements and its wrapping; only
 * the words move. Once the last inner has landed the clips release their
 * overflow (is-done) so descenders render whole at rest.
 *
 * MEDIA: an element fade-rises --m-reveal-media-rise → 0 over
 * --m-reveal-media-dur on the house curve, a group staggered
 * --m-reveal-media-stagger, a beat (--m-reveal-media-delay) behind its text.
 *
 * Each plays ONCE, as the block's top reaches --m-reveal-at of the viewport
 * (a ScrollTrigger with once) — the one place the mobile layer is not a
 * pure function of scroll: an entrance is an event, as it is on the desktop.
 * A block already past that line at boot plays at once. Reduced motion:
 * nothing is wrapped, nothing moves. Everything reverts with the context:
 * the clips are unwrapped back to text.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tokenPx } from './match.js';

const tokenRaw = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** a duration token in seconds — "1.2s", or the "40ms" the engine may serialise a short one as */
export const tokenS = (name) => { const raw = tokenRaw(name); const n = parseFloat(raw) || 0; return /ms\s*$/.test(raw) ? n / 1000 : n; };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the clips' text nodes: every non-blank text node under el, outside any clip already made */
function textNodes(el) {
  const out = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!/\S/.test(n.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || p.closest('.m-rv, [data-m-reveal-skip], script, style')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n);
  return out;
}

/** Wrap a block's words in clips (idempotent: a wrapped block is left alone). @returns {HTMLElement[]} the clips */
export function wrapWords(el) {
  if (el.querySelector('.m-rv')) return Array.from(el.querySelectorAll('.m-rv'));
  const clips = [];
  for (const node of textNodes(el)) {
    const frag = document.createDocumentFragment();
    for (const part of (node.nodeValue || '').split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
      const clip = document.createElement('span'); clip.className = 'm-rv';
      const inner = document.createElement('span'); inner.className = 'm-rv__in'; inner.textContent = part;
      clip.appendChild(inner); frag.appendChild(clip); clips.push(clip);
    }
    node.parentNode?.replaceChild(frag, node);
  }
  return clips;
}

/** Unwrap a block's clips back to text (the context's revert). */
export function unwrapWords(el) {
  for (const clip of Array.from(el.querySelectorAll('.m-rv'))) clip.replaceWith(document.createTextNode(clip.textContent || ''));
  el.classList.remove('m-rv-host', 'is-in', 'is-done');
  el.normalize();
}

/** Stage a wrapped block's delays from its rendered lines. @returns {number} the last word's delay + the duration (seconds) */
export function stageWords(el, clips, base = 0) {
  const line = tokenS('--m-reveal-line-stagger'), word = tokenS('--m-reveal-word-stagger'), dur = tokenS('--m-reveal-dur');
  let lineIdx = 0, wordIdx = 0, lastTop = null, max = 0;
  for (const clip of clips) {
    const top = clip.getBoundingClientRect().top;
    if (lastTop === null) lastTop = top;
    else if (Math.abs(top - lastTop) > 3) { lineIdx += 1; wordIdx = 0; lastTop = top; }
    const d = base + lineIdx * line + wordIdx * word;
    const inner = clip.firstElementChild;
    if (inner instanceof HTMLElement) inner.style.transitionDelay = `${d.toFixed(2)}s`;
    max = Math.max(max, d);
    wordIdx += 1;
  }
  return max + dur;
}

/**
 * Prepare a text block for its entrance: wrapped and hidden (its words parked below their clips).
 * @returns {{ play: () => void, total: number }} play it (once); total = its full run in seconds
 */
export function prepareText(el, base = 0) {
  const clips = wrapWords(el);
  el.classList.add('m-rv-host');
  const total = stageWords(el, clips, base);
  let played = false;
  const play = () => {
    if (played) return; played = true;
    /* the hidden state is committed before the class flips, so the transition runs from it */
    void el.offsetWidth;
    el.classList.add('is-in');
    setTimeout(() => el.classList.add('is-done'), Math.ceil(total * 1000) + 50);
  };
  return { play, total };
}

/**
 * Bind a text block's entrance to its arrival (fonts settled first — the line grouping needs the real glyphs).
 * The element's words are hidden only once wrapped, in the same frame the trigger is armed.
 */
export function bindTextReveal(ctx, el, { base = 0, at } = {}) {
  if (!(el instanceof HTMLElement) || reduced()) return;
  const atPct = at ?? tokenPx('--m-reveal-at');
  let disposed = false;
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (disposed || !el.isConnected) return;
    const { play } = prepareText(el, base);
    ctx.add(() => {
      ScrollTrigger.create({ trigger: el, start: `top ${atPct}%`, once: true, onEnter: play });
    });
  });
  ctx.add(() => () => { disposed = true; unwrapWords(el); });
}

/**
 * Bind a media group's fade-rise to the first element's arrival — one tween per element, staggered.
 * The elements must carry no other transform/opacity writes (a scrubbed driver targets a wrapper or the children instead).
 */
export function bindMediaReveal(ctx, els, { delay, at } = {}) {
  const list = (Array.isArray(els) ? els : [els]).filter((e) => e instanceof HTMLElement);
  if (!list.length || reduced()) return;
  const rise = tokenPx('--m-reveal-media-rise'), dur = tokenS('--m-reveal-media-dur'), stagger = tokenS('--m-reveal-media-stagger');
  const lead = delay ?? tokenS('--m-reveal-media-delay');
  const ease = tokenRaw('--m-ease-house') || 'power2.out';
  const atPct = at ?? tokenPx('--m-reveal-at');
  ctx.add(() => {
    gsap.set(list, { opacity: 0, y: rise });
    ScrollTrigger.create({
      trigger: list[0], start: `top ${atPct}%`, once: true,
      onEnter: () => { gsap.to(list, { opacity: 1, y: 0, duration: dur, ease, delay: lead, stagger, overwrite: 'auto', clearProps: 'opacity,transform' }); },
    });
  });
}
