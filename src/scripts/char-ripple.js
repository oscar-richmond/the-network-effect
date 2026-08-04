/**
 * CHAR RIPPLE — reusable per-character blur-pulse hover.
 *
 * A label opts in with `data-char-ripple` on the TEXT element; the
 * hover surface (button/link) opts in with `data-char-ripple-trigger`
 * on itself or any ancestor of the label (falls back to the label
 * element when absent). Icons outside the label element are untouched
 * by default; a trailing icon opts INTO the sweep with
 * `data-char-ripple-arrow` (Oscar's rev) — it pulses in the slot
 * after the last character, so the blur runs across the text and
 * then through the arrow.
 *
 * THE EFFECT (from the reference implementation): each character
 * blurs 0 -> 3px -> 0 over 0.6s ease-in-out, staggered 0.04s per
 * character index, one iteration — a pure blur sweep, no fade, no
 * colour, no transform. Replays on EVERY mouseenter via
 * remove-class / force-reflow / re-add (never relies on
 * animationend, so a re-hover mid-pulse restarts cleanly).
 *
 * TUNABLES (the three feel constants, one place each):
 *   --char-ripple-duration  (CSS custom property, default 0.6s)
 *   --char-ripple-blur      (CSS custom property, default 3px)
 *   RIPPLE_STAGGER_S        (below, default 0.04)
 *
 * ACCESSIBILITY: per-char spans read letter-by-letter to AT and
 * fragment copy/paste, so the split lives in an aria-hidden
 * container next to a visually-hidden span carrying the full label.
 * The accessible name computes from the hidden full text — no
 * aria-label juggling on the trigger, and stateful controls (the
 * menu toggle's MENU/CLOSE swap) keep their own semantics.
 *
 * BLEND SAFETY: `filter` creates a stacking context — the historic
 * regression class here. The char spans are DESCENDANTS of any
 * blended element (the label element or its ancestor carries the
 * mix-blend-mode), and self/descendant filters are safe: the blend
 * root composites its final rendered content, filtered children
 * included, against its backdrop. This utility never touches
 * anything ABOVE the label element.
 *
 * TOUCH / COARSE POINTERS: gated behind (hover:hover) and
 * (pointer:fine) per the house rule — on touch the module does
 * NOTHING (no split, no listeners: markup, kerning and copy behave
 * exactly as unwired). Dev override: `?forcehover` in the URL wires
 * it regardless — needed because some machines (Oscar's included)
 * misreport the hover media queries system-wide.
 *
 * REDUCED MOTION: the pulse is an animation, so the page's RM rules
 * suppress it wholesale (this module checks RM too and skips
 * wiring); pages provide their own static RM hover affordance.
 */

/** Seconds of delay per character index — the sweep speed. */
const RIPPLE_STAGGER_S = 0.04;

let stylesInjected = false;

function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = document.createElement('style');
  css.id = 'char-ripple-styles';
  css.textContent = `
    :root {
      --char-ripple-duration: 0.6s;
      --char-ripple-blur: 3px;
    }
    .cr-sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .cr-char {
      display: inline-block;
    }
    .cr-char.is-rippling,
    [data-char-ripple-arrow].is-rippling {
      animation: cr-blur var(--char-ripple-duration, 0.6s) ease-in-out 1;
    }
    @keyframes cr-blur {
      0% { filter: blur(0); }
      50% { filter: blur(var(--char-ripple-blur, 3px)); }
      100% { filter: blur(0); }
    }
  `;
  document.head.appendChild(css);
}

export function initCharRipple(root = document) {
  const canHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canHover || reduced) return () => {};

  ensureStyles();

  const cleanups = [];

  root.querySelectorAll('[data-char-ripple]').forEach((el) => {
    if (!(el instanceof HTMLElement) || el.dataset.charRippleWired) return;
    el.dataset.charRippleWired = '1';

    const text = el.textContent ?? '';

    const srText = document.createElement('span');
    srText.className = 'cr-sr';
    srText.textContent = text;

    const charBox = document.createElement('span');
    charBox.className = 'cr-chars';
    charBox.setAttribute('aria-hidden', 'true');

    Array.from(text).forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'cr-char';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.animationDelay = `${(i * RIPPLE_STAGGER_S).toFixed(2)}s`;
      charBox.appendChild(span);
    });

    el.textContent = '';
    el.appendChild(srText);
    el.appendChild(charBox);

    const trigger = el.closest('[data-char-ripple-trigger]') ?? el;
    const spans = Array.from(charBox.children);

    /* A trailing icon that opted in rides the same sweep, one stagger
       slot after the final character. Being a child of the trigger
       (and of any blend root), its filter is still a descendant
       filter — same safe shape as the chars. */
    const arrow = trigger.querySelector('[data-char-ripple-arrow]');
    if (arrow instanceof HTMLElement || arrow instanceof SVGElement) {
      arrow.style.animationDelay = `${(spans.length * RIPPLE_STAGGER_S).toFixed(2)}s`;
      spans.push(arrow);
    }

    const onEnter = () => {
      spans.forEach((s) => s.classList.remove('is-rippling'));
      void charBox.offsetWidth;
      spans.forEach((s) => s.classList.add('is-rippling'));
    };

    trigger.addEventListener('mouseenter', onEnter);
    cleanups.push(() => trigger.removeEventListener('mouseenter', onEnter));
  });

  return () => cleanups.forEach((fn) => fn());
}
