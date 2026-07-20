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
 * The word roll and the image rotation are INDEPENDENT (Oscar's revert of
 * the earlier alternating experiment): the word keeps its original
 * 3s-hold/1s-blur-cross-fade cycle untouched (initTaglineRotate), while
 * the inline image cross-fades through its 5 frames on its own 2s timer —
 * a 300ms two-layer dissolve, no blur, no coupling, and no moment where
 * the ground shows through (initImageRotate). Both are always present.
 */
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';

const HOLDING_WORDMARK_AT = 0;
const HOLDING_TAGLINE_AT = 200;
const HOLDING_BUTTONS_AT = 680;
const HOLDING_BUTTONS_STAGGER = 120;
const HOLDING_SIGNOFF_AT = 920;
const HOLDING_IMAGE_AT = 1040;

/* FINAL variant (/holding-3 desktop, .holding-final) — the LOAD entry
 * reveals the INTRO state only (the restored title/paragraph/CTA
 * block, back at the old sequence's slots one-for-one), plus the
 * sign-off and accent bar. The FORM state is hidden at load and its
 * reveal belongs to the click-triggered swap in holding-deck-form.js,
 * not to this choreography. The OLD sequence still runs too (its
 * elements are the deferred mobile layout, display:none'd at >=1025
 * on this variant) — the two sets never share elements, so both are
 * harmless no-ops for whichever breakpoint hides them. */
const FINAL_TITLE_AT = HOLDING_WORDMARK_AT;
const FINAL_PARA_AT = HOLDING_TAGLINE_AT;
const FINAL_CTAS_AT = HOLDING_BUTTONS_AT;
const FINAL_SIGNOFF_AT = HOLDING_SIGNOFF_AT;
const FINAL_LINE_STAGGER_S = 0.12;

const TAGLINE_ROTATE_WORDS = ['CONSULTANCY', 'NETWORK', 'STUDIO', 'COLLECTIVE'];
const TAGLINE_ROTATE_MS = 3000;
const TAGLINE_ROTATE_EXIT_MS = 1000;

const IMAGE_ROTATE_MS = 2000;
const IMAGE_FADE_MS = 300;

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

/**
 * Independent inline-image rotation as a true CROSS-FADE, one change every
 * IMAGE_ROTATE_MS. Two stacked layers inside the overlay container: the
 * base layer always holds a fully-opaque image while the top layer fades
 * in/out over it (IMAGE_FADE_MS, plain opacity — no blur, not coupled to
 * the word's timer, per Oscar's spec), so the ground behind never shows
 * through mid-swap. Each cycle alternates direction: fade the top layer IN
 * over the base (top now shows current image), then next cycle swap the
 * base's src underneath the opaque top (invisible) and fade the top OUT,
 * revealing it — every instant has at least one opaque layer covering.
 */
function initImageRotate(overlay, images) {
  if (!(overlay instanceof HTMLElement) || images.length < 2) return () => {};

  const base = overlay.querySelector('[data-holding-tagline-img-base]');
  const top = overlay.querySelector('[data-holding-tagline-img-top]');
  if (!(base instanceof HTMLElement) || !(top instanceof HTMLElement)) return () => {};

  top.style.transition = `opacity ${IMAGE_FADE_MS}ms ease`;

  let index = 0;
  let topShowing = false;
  let active = true;
  let timeoutId;

  const schedule = (fn, delay) => {
    timeoutId = setTimeout(() => {
      if (!active) return;
      fn();
    }, delay);
  };

  const cycle = () => {
    index = (index + 1) % images.length;

    if (!topShowing) {
      // Load the next image into the transparent top layer, then dissolve
      // it in over the still-opaque base.
      top.src = images[index];
      top.style.opacity = '1';
    } else {
      // Swap the base underneath the opaque top (invisible change), then
      // dissolve the top away to reveal it.
      base.src = images[index];
      top.style.opacity = '0';
    }
    topShowing = !topShowing;

    schedule(cycle, IMAGE_ROTATE_MS);
  };

  schedule(cycle, IMAGE_ROTATE_MS);

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
  const cleanups = [];

  const rotateRoot = taglineText.querySelector('[data-holding-tagline-rotate]');
  if (rotateRoot instanceof HTMLElement) {
    const wordTimeout = setTimeout(() => {
      cleanups.push(initTaglineRotate(rotateRoot));
    }, revealCompleteMs + TAGLINE_ROTATE_MS);
    cleanups.push(() => clearTimeout(wordTimeout));
  }

  if (cultureOverlay instanceof HTMLElement && images.length > 1) {
    const imageTimeout = setTimeout(() => {
      cleanups.push(initImageRotate(cultureOverlay, images));
    }, revealCompleteMs + IMAGE_ROTATE_MS);
    cleanups.push(() => clearTimeout(imageTimeout));
  }

  return () => cleanups.forEach((fn) => fn());
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

/**
 * FINAL sign-off alignment (Oscar's spec, ALL-CAPS revision): line 1's
 * "B" (BUILT) starts exactly where the "R" glyph of "POWERED" renders
 * on line 2 — the fifth glyph, so the offset is the full rendered
 * advance of "POWE" including every kerning pair. Rather than
 * approximating with canvas, the offset is read from the live glyph
 * geometry itself: a Range around line 2's source "r" (the CSS
 * uppercase transform doesn't change source indices) gives the exact
 * rendered x of the R, and line 1's margin is set to that distance.
 * Opacity-hidden elements still have geometry, so this works before
 * the entry reveal; display:none (mobile) yields zero rects and the
 * guard skips. Runs after fonts.ready in BOTH motion branches — this
 * is layout, not choreography. The derived value is stamped on the
 * block (data-derived-offset-px) for verification. The offset is
 * font-size-fixed, so resize never changes it; the block's own
 * centring is pure CSS (auto margins) and re-derives on its own.
 */
function alignFinalSignoff() {
  const block = document.querySelector('[data-holding-final-signoff]');
  if (!(block instanceof HTMLElement)) return;
  const serrifLine = block.querySelector('[data-holding-final-signoff-serrif]');
  const dazzedLine = block.querySelector('[data-holding-final-signoff-dazzed]');
  if (!(serrifLine instanceof HTMLElement) || !(dazzedLine instanceof HTMLElement)) return;

  // Must run before the line-reveal wrap (it does — reveals start at
  // FINAL_SIGNOFF_AT, well after this synchronous call), while line 2
  // is still a single text node.
  const walker = document.createTreeWalker(dazzedLine, NodeFilter.SHOW_TEXT);
  let textNode = null;
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim()) textNode = node;
  }
  if (!textNode) return;
  const rIndex = textNode.textContent.indexOf('r');
  if (rIndex < 0) return;

  const range = document.createRange();
  range.setStart(textNode, rIndex);
  range.setEnd(textNode, rIndex + 1);
  const rRect = range.getBoundingClientRect();
  const lineRect = dazzedLine.getBoundingClientRect();
  const offset = rRect.left - lineRect.left;
  if (!(offset > 0) || rRect.width === 0) return;

  serrifLine.style.marginLeft = `${offset}px`;
  block.dataset.derivedOffsetPx = offset.toFixed(2);
}

/**
 * Mobile (<=1024) only: left-aligns the sign-off block with the intro
 * text's rendered left edge (Oscar's flip — the sign-off sits 64px off
 * the viewport bottom, left-aligned with the text above). The intro's
 * title/paragraph are shrink-to-fit flex children, so their rects ARE
 * the visual text block; the target is the leftmost of the two. The
 * offset is written as an inline margin-left against the flex-start
 * anchor; on desktop the inline margin is cleared so the absolute
 * desktop placement is untouched. Layout, not choreography — runs in
 * both motion branches and on resize. Skipped while the intro is
 * hidden (form/sent state): rects would be zero; the last good offset
 * holds and the next intro-visible resize or replay re-derives it.
 */
function alignFinalSignoffMobile() {
  const signoff = document.querySelector('[data-holding-final-signoff]');
  if (!(signoff instanceof HTMLElement)) return;

  if (!window.matchMedia('(max-width: 1024px)').matches) {
    signoff.style.marginLeft = '';
    return;
  }

  const intro = document.querySelector('[data-deck-intro]');
  if (!(intro instanceof HTMLElement) || intro.hidden) return;
  const title = intro.querySelector('[data-holding-final-title]');
  const para = intro.querySelector('[data-holding-final-para]');

  const lefts = [title, para]
    .filter((el) => el instanceof HTMLElement)
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 0)
    .map((rect) => rect.left);
  if (!lefts.length) return;
  const targetLeft = Math.min(...lefts);

  signoff.style.marginLeft = '0px';
  const baseLeft = signoff.getBoundingClientRect().left;
  signoff.style.marginLeft = `${targetLeft - baseLeft}px`;
}

/**
 * FINAL entry choreography — the established vocabulary on the INTRO
 * state's elements: line-reveals for title/paragraph/sign-off (lines
 * staggered 120ms), .is-visible for the intro's CTA pair only (the
 * ported .holding-spin draw-in — the form's buttons are excluded by
 * the [data-deck-intro] scope and revealed by the swap instead), and
 * the accent bar fading alongside the photo's reveal.
 */
function revealFinal(root) {
  const title = root.querySelector('[data-holding-final-title]');
  const para = root.querySelector('[data-holding-final-para]');
  const signoff = root.querySelector('[data-holding-final-signoff]');
  const bar = root.querySelector('[data-holding-final-bar]');
  const mobilePhoto = root.querySelector('[data-holding-final-mobile-photo]');
  const links = Array.from(
    root.querySelectorAll('[data-deck-intro] [data-holding-final-button]'),
  );

  const playLines = (container, lineSelector) => {
    if (!(container instanceof HTMLElement)) return;
    container.style.opacity = '1';
    // Visible lines only: the paragraph carries BOTH breakpoints'
    // line-sets (desktop 3 / mobile 4, CSS shows one). Filtering keeps
    // each set's stagger 0-based and identical to the pre-split timing;
    // the hidden set stays unwrapped (plain static text if a later
    // resize crosses the breakpoint — reveals never replay on resize).
    const lines = Array.from(container.querySelectorAll(lineSelector)).filter(
      (line) => line instanceof HTMLElement && line.offsetParent !== null,
    );
    const targets = lines.length ? lines : [container];
    targets.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * FINAL_LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        targets.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
      });
    });
  };

  setTimeout(() => playLines(title, ':scope > *'), FINAL_TITLE_AT);
  setTimeout(() => playLines(para, '.holding-final__para-line'), FINAL_PARA_AT);
  links.forEach((link, i) => {
    setTimeout(() => {
      link.classList.add('is-visible');
    }, FINAL_CTAS_AT + i * HOLDING_BUTTONS_STAGGER);
  });
  setTimeout(() => playLines(signoff, '.holding-final__signoff-line'), FINAL_SIGNOFF_AT);
  setTimeout(() => {
    bar?.classList.add('is-visible');
    // Mobile's bottom photo card shares the photo slot's timing.
    mobilePhoto?.classList.add('is-visible');
  }, HOLDING_IMAGE_AT);
}

/**
 * Replays the intro's title/paragraph/CTA entrance (Oscar's revision):
 * called by holding-deck-form.js's auto-return-from-sent, so landing
 * back on the intro after a successful send feels like the initial
 * "land on the site" entrance rather than a flat re-appear. Assumes
 * revealFinal has already run once (title/para are already wrapped
 * into lr-clip/lr-inner — this never re-wraps, only resets+replays)
 * and is a no-op under reduced motion (nothing was ever wrapped to
 * begin with there). MUST be called while the intro container is
 * still hidden (display:none) so the reset itself is invisible — the
 * caller unhides it afterward; each clip's own baked-in transition-
 * delay (set once at wrap time) reproduces the same stagger on every
 * replay, so simply re-adding lr-visible is enough — no re-deriving
 * per-line timing here. */
export function replayHoldingIntroEntrance() {
  // The intro is visible again: re-derive the mobile sign-off offset in
  // case a resize landed while the form was up (measures were skipped
  // then). Layout, not motion — runs before the reduced-motion gate.
  alignFinalSignoffMobile();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const title = document.querySelector('[data-holding-final-title]');
  const para = document.querySelector('[data-holding-final-para]');
  const links = Array.from(
    document.querySelectorAll('[data-deck-intro] [data-holding-final-button]'),
  );

  const resetClips = (container) => {
    if (!(container instanceof HTMLElement)) return;
    container.querySelectorAll('.lr-clip').forEach((clip) => clip.classList.remove('lr-visible'));
  };

  const playClips = (container) => {
    if (!(container instanceof HTMLElement)) return;
    container.querySelectorAll('.lr-clip').forEach((clip) => clip.classList.add('lr-visible'));
  };

  resetClips(title);
  resetClips(para);
  links.forEach((link) => link.classList.remove('is-visible'));

  // Same relative rhythm as the initial page-load entrance.
  setTimeout(() => playClips(title), FINAL_TITLE_AT);
  setTimeout(() => playClips(para), FINAL_PARA_AT);
  links.forEach((link, i) => {
    setTimeout(() => {
      link.classList.add('is-visible');
    }, FINAL_CTAS_AT + i * HOLDING_BUTTONS_STAGGER);
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

  // SYNCHRONOUS on every resize tick — the old 150ms debounce left the
  // fixed-position overlay at stale coordinates while the text reflowed
  // instantly (the reported lag-then-snap desync). The remeasure is one
  // getBoundingClientRect + four style writes: cheap enough to run per
  // event, with a rAF follow-up to catch post-reflow adjustments
  // (scrollbars, late font metrics).
  const onResize = () => {
    syncCultureOverlay(taglineText, cultureOverlay);
    requestAnimationFrame(() => syncCultureOverlay(taglineText, cultureOverlay));
    // Idempotent re-derive (the measurement reads line 2 only, which
    // line 1's margin never moves) — self-heals the degenerate case of
    // a zero-size viewport at load, where every rect measures 0 and
    // the first pass has to bail.
    alignFinalSignoff();
    alignFinalSignoffMobile();
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
    // The final sign-off's "P"-advance offset is layout, not motion —
    // it runs here too.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      syncCultureOverlay(taglineText, cultureOverlay);
      cultureOverlay?.classList.add('is-visible');
      alignFinalSignoff();
      alignFinalSignoffMobile();
      // Second pass after the viewport settles (some embedded webviews
      // size late without firing resize) — idempotent, cheap.
      setTimeout(alignFinalSignoffMobile, 1000);
    });
    return () => window.removeEventListener('resize', onResize);
  }

  let cleanupRotate = () => {};

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (import.meta.env.DEV) {
      console.info('[holding-entry] fonts ready — entry sequence starting');
    }

    // FINAL variant: layout alignment first (fonts are ready — the
    // measure is exact), then its sequence runs alongside the old one.
    alignFinalSignoff();
    alignFinalSignoffMobile();
    // Second pass once the entry has largely played out: catches
    // viewports that settle late without firing resize (embedded
    // webviews) — idempotent, cheap.
    setTimeout(alignFinalSignoffMobile, 1000);
    revealFinal(document);

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
