/**
 * Holding-page entry choreography.
 *
 * Ported from the /about-3 hero tagline (src/components/about-3/AboutHero.astro)
 * with the scroll/video coupling removed:
 *  - the hero's line-reveal + rolling-last-word mechanics are reused verbatim
 *    (word list, timings, easing) — see wrapTaglineLines/initTaglineRotate below;
 *  - there is no ScrollTrigger anywhere in the hero's tagline to begin with, so
 *    "decoupling from scroll" just means starting on load instead of after the
 *    hero's own image-burst timeline;
 *  - the hero's fixed <video> + rAF position-sync workaround is dropped
 *    entirely: it existed only so a <video> could avoid living inside a
 *    mix-blend-mode:difference subtree. This page uses a static <img> instead
 *    (per the Figma update), which opts out of the parent blend with a plain
 *    `mix-blend-mode: normal`, so no workaround is needed.
 */
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';

const HOLDING_WORDMARK_AT = 0;
const HOLDING_TAGLINE_AT = 200;
const HOLDING_BUTTONS_AT = 680;
const HOLDING_BUTTONS_STAGGER = 120;
const HOLDING_SIGNOFF_AT = 920;
const HOLDING_IMAGE_AT = 1040;

const TAGLINE_ROTATE_WORDS = ['CONSULTANCY', 'NETWORK', 'STUDIO', 'COLLECTIVE'];
const TAGLINE_ROTATE_MS = 3000;
const TAGLINE_ROTATE_EXIT_MS = 1000;

const CULTURE_TEXT_SELECTOR =
  '.holding-tagline__culture-word, .holding-tagline__culture-img-wrap, .holding-tagline__culture-amp';

function isCultureTaglineLine(line) {
  return line instanceof HTMLElement && line.querySelector('.holding-tagline__culture') != null;
}

function playLineRevealTarget(el) {
  if (!(el instanceof HTMLElement)) return;
  const clip = el.querySelector(':scope > .lr-clip');
  playLineRevealElement(clip instanceof HTMLElement ? clip : el);
}

function wrapTaglineLines(container) {
  if (!(container instanceof HTMLElement)) return [];

  const lines = Array.from(container.querySelectorAll('.holding-tagline__line'));
  lines.forEach((line, index) => {
    if (!(line instanceof HTMLElement)) return;
    line.dataset.revealDelay = String(index * 0.12);

    if (isCultureTaglineLine(line)) {
      line.querySelectorAll(CULTURE_TEXT_SELECTOR).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.dataset.revealDelay = line.dataset.revealDelay;
          wrapLineRevealElement(el);
        }
      });
      return;
    }

    wrapLineRevealElement(line);
  });

  return lines;
}

function playTaglineLineReveals(container) {
  if (!(container instanceof HTMLElement)) return;

  container.querySelectorAll('.holding-tagline__line').forEach((line) => {
    if (!(line instanceof HTMLElement)) return;

    if (isCultureTaglineLine(line)) {
      line.querySelectorAll(CULTURE_TEXT_SELECTOR).forEach(playLineRevealTarget);
      return;
    }

    playLineRevealTarget(line);
  });
}

function initTaglineRotate(root) {
  const inner = root.querySelector('.holding-tagline__rotate-inner');
  if (!(inner instanceof HTMLElement)) return () => {};

  let index = 0;
  let active = true;
  let timeoutId;

  const schedule = (fn, delay) => {
    timeoutId = setTimeout(() => {
      if (!active) return;
      fn();
    }, delay);
  };

  const cycle = () => {
    inner.classList.add('is-exiting');

    schedule(() => {
      inner.classList.remove('is-exiting');
      index = (index + 1) % TAGLINE_ROTATE_WORDS.length;
      inner.textContent = TAGLINE_ROTATE_WORDS[index];
      inner.classList.add('is-entering');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inner.classList.remove('is-entering');
        });
      });

      schedule(cycle, TAGLINE_ROTATE_MS);
    }, TAGLINE_ROTATE_EXIT_MS);
  };

  schedule(cycle, TAGLINE_ROTATE_MS);

  return () => {
    active = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

function revealWordmark(wordmark) {
  if (!(wordmark instanceof HTMLElement)) return;
  wordmark.style.opacity = '1';
  wrapLineRevealElement(wordmark);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playLineRevealElement(wordmark);
    });
  });
}

function revealTagline(tagline, taglineText) {
  if (!(taglineText instanceof HTMLElement)) return () => {};
  taglineText.style.opacity = '1';

  const lines = wrapTaglineLines(taglineText);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playTaglineLineReveals(taglineText);
    });
  });

  const revealCompleteMs = (lines.length - 1) * 120 + 1200;
  let cleanup = () => {};
  const rotateRoot = taglineText.querySelector('[data-holding-tagline-rotate]');
  if (rotateRoot instanceof HTMLElement) {
    const timeoutId = setTimeout(() => {
      cleanup = initTaglineRotate(rotateRoot);
    }, revealCompleteMs + TAGLINE_ROTATE_MS);
    cleanup = () => clearTimeout(timeoutId);
  }
  return () => cleanup();
}

function revealSignoff(signoff) {
  if (!(signoff instanceof HTMLElement)) return;
  signoff.style.opacity = '1';
  wrapLineRevealElement(signoff);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playLineRevealElement(signoff);
    });
  });
}

export function initHoldingEntry() {
  const wordmark = document.querySelector('[data-holding-wordmark]');
  const tagline = document.querySelector('[data-holding-tagline]');
  const taglineText = document.querySelector('[data-holding-tagline-text]');
  const signoff = document.querySelector('[data-holding-signoff]');
  const buttons = Array.from(document.querySelectorAll('[data-holding-button]'));
  const photo = document.querySelector('[data-holding-image]');

  // Dev-only diagnostic: this page gates hover styles behind
  // `(hover: hover) and (pointer: fine)` and no-ops the whole entry
  // sequence under `prefers-reduced-motion: reduce` — both correct,
  // intentional behavior (see holding-page.css). Some machines/browsers
  // misreport these queries even on unrelated sites, which looks like a
  // missing feature but isn't one. Logging the raw results lets a tester
  // tell environment suppression apart from a real bug at a glance.
  if (import.meta.env.DEV) {
    console.info(
      '[holding-entry] media queries — hover:hover=%s pointer:fine=%s prefers-reduced-motion:reduce=%s',
      window.matchMedia('(hover: hover)').matches,
      window.matchMedia('(pointer: fine)').matches,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    // Nothing to do: the hidden starting states in holding-page.css only
    // apply under prefers-reduced-motion:no-preference, so every element
    // is already visible in its resting position, and the rotating word
    // stays on its first, static value.
    return () => {};
  }

  let cleanupRotate = () => {};

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (import.meta.env.DEV) {
      console.info('[holding-entry] fonts ready — entry sequence starting');
    }

    setTimeout(() => revealWordmark(wordmark), HOLDING_WORDMARK_AT);

    setTimeout(() => {
      cleanupRotate = revealTagline(tagline, taglineText);
    }, HOLDING_TAGLINE_AT);

    buttons.forEach((btn, i) => {
      setTimeout(() => {
        btn.classList.add('is-visible');
      }, HOLDING_BUTTONS_AT + i * HOLDING_BUTTONS_STAGGER);
    });

    setTimeout(() => revealSignoff(signoff), HOLDING_SIGNOFF_AT);

    setTimeout(() => {
      photo?.classList.add('is-visible');
    }, HOLDING_IMAGE_AT);
  });

  return () => {
    cleanupRotate();
  };
}
