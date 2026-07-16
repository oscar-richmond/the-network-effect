/**
 * Holding-page entry choreography.
 *
 * Ported from the /about-3 hero tagline (src/components/about-3/AboutHero.astro)
 * with the scroll coupling removed:
 *  - the hero's line-reveal + rolling-last-word mechanics are reused verbatim
 *    (word list, timings, easing) — see wrapTaglineLines/initTaglineRotate below;
 *  - there is no ScrollTrigger anywhere in the hero's tagline to begin with, so
 *    "decoupling from scroll" just means starting on load instead of after the
 *    hero's own image-burst timeline;
 *  - the hero's fixed-overlay + position-sync workaround for the inline
 *    "CULTURE & [image]" window IS still needed here, same as the hero: a
 *    descendant's mix-blend-mode:normal does not opt it out of an ancestor's
 *    mix-blend-mode:difference (confirmed — an inline <img> given
 *    mix-blend-mode:normal still rendered differenced). The real image is a
 *    fixed sibling of .holding-tagline, synced to an invisible in-flow slot's
 *    on-screen rect — see syncCultureOverlay below.
 *
 * The inline image is a rotating set of 5, cycling on the SAME
 * cycle()/is-exiting/is-entering timer as the rolling word in
 * initTaglineRotate — one shared timer, so the two can't drift apart. Word
 * list length (4) and image list length (5) are deliberately different, so
 * their pairing rotates cycle to cycle.
 *
 * Word and image are mutually exclusive, alternating turns: each roll,
 * whichever was showing fades out and stays parked (hidden) at its exited
 * state, while the OTHER one (already parked from its own last turn) fades
 * in with its next value. The very first roll is a special case — both
 * start visible from the (unchanged) entry reveal, so it exits both
 * together before the alternation begins.
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
  '.holding-tagline__culture-word, .holding-tagline__culture-amp';

function getTaglineImages(overlay) {
  if (!(overlay instanceof HTMLElement)) return [];
  try {
    const parsed = JSON.parse(overlay.dataset.taglineImages ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((src) => typeof src === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Warms the browser's image cache for every frame in the rotation (image 1
 * is already loading as the overlay's initial src) so no later roll swap
 * ever shows a decode flash. Small enough files that a plain Image()
 * prewarm at init is sufficient — no need for <link rel="preload">.
 */
function preloadTaglineImages(images) {
  images.slice(1).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

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

function playTaglineLineReveals(container, cultureOverlay) {
  if (!(container instanceof HTMLElement)) return;

  container.querySelectorAll('.holding-tagline__line').forEach((line) => {
    if (!(line instanceof HTMLElement)) return;

    if (isCultureTaglineLine(line)) {
      line.querySelectorAll(CULTURE_TEXT_SELECTOR).forEach(playLineRevealTarget);
      cultureOverlay?.classList.add('is-visible');
      return;
    }

    playLineRevealTarget(line);
  });
}

/**
 * Keeps the real, visible overlay image positioned exactly over the
 * invisible in-flow slot inside the tagline text. Unlike the /about-3
 * hero (continuously synced via rAF against scroll-driven movement), this
 * page never scrolls and the slot only moves on resize/reflow, so a
 * one-shot sync plus a debounced resize listener is enough.
 */
function syncCultureOverlay(taglineText, overlay) {
  if (!(taglineText instanceof HTMLElement) || !(overlay instanceof HTMLElement)) return;

  const slot = taglineText.querySelector('.holding-tagline__culture-img-wrap');
  if (!(slot instanceof HTMLElement)) return;

  const rect = slot.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

/**
 * Drives the rolling last word AND the inline image on one shared timer —
 * same is-exiting/is-entering toggle, same schedule, same durations — but
 * mutually exclusive: only one of the two is ever visible. Each roll,
 * whichever is currently showing exits and stays parked (is-exiting is
 * simply left on, holding it at opacity:0/blur) until its next turn, while
 * the other — already parked from ITS last turn — gets its next value and
 * enters. The first roll is the one exception: both start visible from the
 * (unchanged) entry reveal, so it exits both together before the
 * word/image swap-off begins.
 */
function initTaglineRotate(root, cultureOverlay, images) {
  const inner = root.querySelector('.holding-tagline__rotate-inner');
  if (!(inner instanceof HTMLElement)) return () => {};

  const hasImages = cultureOverlay instanceof HTMLElement && images.length > 0;

  let wordIndex = 0;
  let imageIndex = 0;
  let imageTurn = false; // whose turn is CURRENTLY active — word goes first, matching the boot state
  let firstRoll = true;
  let active = true;
  let timeoutId;

  const schedule = (fn, delay) => {
    timeoutId = setTimeout(() => {
      if (!active) return;
      fn();
    }, delay);
  };

  const cycle = () => {
    if (firstRoll) {
      inner.classList.add('is-exiting');
      if (hasImages) cultureOverlay.classList.add('is-exiting');
    } else {
      const outgoing = imageTurn && hasImages ? cultureOverlay : inner;
      outgoing.classList.add('is-exiting');
    }

    schedule(() => {
      firstRoll = false;
      imageTurn = hasImages ? !imageTurn : false;

      if (imageTurn) {
        imageIndex = (imageIndex + 1) % images.length;
        cultureOverlay.src = images[imageIndex];
        cultureOverlay.classList.remove('is-exiting');
        cultureOverlay.classList.add('is-entering');
      } else {
        wordIndex = (wordIndex + 1) % TAGLINE_ROTATE_WORDS.length;
        inner.textContent = TAGLINE_ROTATE_WORDS[wordIndex];
        inner.classList.remove('is-exiting');
        inner.classList.add('is-entering');
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inner.classList.remove('is-entering');
          if (hasImages) cultureOverlay.classList.remove('is-entering');
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

function revealTagline(tagline, taglineText, cultureOverlay, images) {
  if (!(taglineText instanceof HTMLElement)) return () => {};
  taglineText.style.opacity = '1';

  const lines = wrapTaglineLines(taglineText);
  syncCultureOverlay(taglineText, cultureOverlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playTaglineLineReveals(taglineText, cultureOverlay);
    });
  });

  const revealCompleteMs = (lines.length - 1) * 120 + 1200;
  let cleanup = () => {};
  const rotateRoot = taglineText.querySelector('[data-holding-tagline-rotate]');
  if (rotateRoot instanceof HTMLElement) {
    const timeoutId = setTimeout(() => {
      cleanup = initTaglineRotate(rotateRoot, cultureOverlay, images);
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
  const cultureOverlay = document.querySelector('[data-holding-tagline-img-overlay]');
  const signoff = document.querySelector('[data-holding-signoff]');
  const buttons = Array.from(document.querySelectorAll('[data-holding-button]'));
  const photo = document.querySelector('[data-holding-image]');

  const taglineImages = getTaglineImages(cultureOverlay);
  preloadTaglineImages(taglineImages);

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => syncCultureOverlay(taglineText, cultureOverlay), 150);
  };
  window.addEventListener('resize', onResize);

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
    // Everything else is already visible in its resting position (the
    // hidden starting states in holding-page.css only apply under
    // no-preference) and the rotating word stays on its first, static
    // value — but the culture overlay's position is set by JS, not CSS,
    // so it still needs a one-shot sync + reveal even with no animation.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      syncCultureOverlay(taglineText, cultureOverlay);
      cultureOverlay?.classList.add('is-visible');
    });
    return () => window.removeEventListener('resize', onResize);
  }

  let cleanupRotate = () => {};

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (import.meta.env.DEV) {
      console.info('[holding-entry] fonts ready — entry sequence starting');
    }

    setTimeout(() => revealWordmark(wordmark), HOLDING_WORDMARK_AT);

    setTimeout(() => {
      cleanupRotate = revealTagline(tagline, taglineText, cultureOverlay, taglineImages);
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
    window.removeEventListener('resize', onResize);
  };
}
