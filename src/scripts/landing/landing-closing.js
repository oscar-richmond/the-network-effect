/**
 * CLOSING SECTION + FOOTER entrances (/landing) — house vocabulary,
 * once-only scrolled-into-view reveals (no scrub), per the page's
 * entrance conventions.
 *
 * CLOSING (trigger 'top 65%'): headline WORD-reveals in reading
 * order (the shared word-by-word clip mechanism — it animates the
 * blend lines' DESCENDANTS, never wraps them in moving ancestors);
 * the intro and the keyword blocks word-reveal on the old wave's
 * base delays; the tiles (media) keep the rise+fade left-to-right
 * on a 100ms stagger.
 *
 * FOOTER (trigger ~200px into the reveal): index-column and
 * bottom-row TEXT word-reveals on the old stagger timings, the
 * image rise+fades, the big statement word-reveals (staggered
 * lines).
 *
 * BACK TO TOP + HOME: smooth scroll to the page top THROUGH Lenis
 * (the page's one scroll authority — the access-snap precedent).
 *
 * Reduced motion: no init — everything static (the hidden entrance
 * states are gated behind prefers-reduced-motion: no-preference in
 * landing.css).
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initStatementDwell } from './statement-dwell.js';
import gsap from 'gsap';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';
import { isMobileViewport } from './viewport.js';
import { initCarouselIndicators } from './carousel-indicator.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
/* Bottom-of-page behaviours (Oscar's rev):
   1. AUTO-SNAP: if the user stops scrolling (2s idle) with the
      closing tiles at least 2/3 off the top of the viewport (or any
      further down), and the last movement was DOWNWARD, glide to
      the very bottom (the footer's full reveal) through Lenis.
   2. NAV EXIT: every time the page rests at the bottom, MENU / the
      logo / LET'S CHAT ripple OUT (per-char blur, right-to-left —
      the menu hover effect reversed) and ripple back in when
      scrolling up. The logo gets the same char wrap at init (MENU
      and LET'S CHAT already carry ripple chars). */
const BOTTOM_SNAP_IDLE_MS = 2000;
const SNAP_ZONE_TILE_BOTTOM_PX = 150; // 450px tiles, 2/3 off the top
const BOTTOM_EPSILON_PX = 2;
const NAV_SHOW_HYSTERESIS_PX = 64;
const TILE_STAGGER_MS = 100;
const TILES_AT_MS = 200;
const KEYWORDS_AT_MS = 600;
const KEYWORD_STAGGER_MS = 100;
const INTRO_AT_MS = 400;
const FOOTER_COL_STAGGER_MS = 120;
const FOOTER_IMG_AT_MS = 240;
const FOOTER_ROW_AT_MS = 900;

export function initLandingClosing() {
  const closing = document.querySelector('[data-landing-closing]');
  const footer = document.querySelector('[data-landing-footer]');
  if (!(closing instanceof HTMLElement) || !(footer instanceof HTMLElement)) return () => {};

  /* Back-to-top / home — wired in ALL modes (RM included: it's
     navigation, not decoration). Lenis when present, native fallback. */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    e.preventDefault();
    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── THE STATEMENT DWELL (R4, 2026-08-26): the shared centred
     sticky hold (statement-dwell.js — one mechanism with the
     /services statements). Layout, not motion — runs under RM;
     desktop-gated inside the helper; fonts-gated so the measured
     height sees real glyphs. */
  const stDwellSection = document.querySelector('[data-closing-st]');
  const stDwellStage = document.querySelector('[data-closing-st-stage]');
  let cleanupDwell = () => {};
  /* Guards teardown-before-fonts: without it the dwell (and the
     frag trigger below) would install AFTER dispose and leak its
     resize listener / trigger. */
  let earlyDisposed = false;
  if (stDwellSection instanceof HTMLElement && stDwellStage instanceof HTMLElement) {
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (earlyDisposed) return;
      cleanupDwell = initStatementDwell(stDwellSection, stDwellStage);
      ScrollTrigger.refresh();
    });
  }

  /* ── Fragmented statement entrance (frame 13:277) — the network
     section's vocabulary: per-line word reveal on a 120ms DOM-order
     stagger, one-shot at 65% viewport. RM: static, visible, no
     trigger. Desktop only (the section is display:none ≤1024). */
  const fragLines = Array.from(document.querySelectorAll('[data-closing-st-line]'));
  let fragTrigger = null;
  if (!reduced && fragLines.length && window.matchMedia('(min-width: 1025px)').matches) {
    const stFonts = document.fonts?.ready ?? Promise.resolve();
    stFonts.then(() => {
      if (earlyDisposed) return;
      fragLines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * 0.12);
        wrapWordRevealElement(line);
      });
      const stSection = document.querySelector('[data-closing-st]');
      if (!stSection) return;
      fragTrigger = ScrollTrigger.create({
        trigger: stSection,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          fragLines.forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
        },
      });
    });
  }

  /* ── Nav-at-bottom + auto-snap (all modes; RM = instant toggle,
     no auto-snap). Char wrap + sweep applier are shared with the
     load entrance (nav-motion.js). */
  const menuToggle = document.querySelector('[data-menu-toggle]');
  ensureLogoChars();

  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    /* Never strand an open menu without its toggle. */
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
  };

  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);

  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;
  /* The zone anchor must be a RENDERED tile: on mobile the desktop
     tiles are display:none (zero rects — bottom 0 would read as
     permanently in-zone and snap from anywhere), so fall through to
     the mobile carousel's first slide. */
  const tileEls = Array.from(
    closing.querySelectorAll('[data-closing-tile], .landing-closing__m-slide'),
  );

  const inSnapZone = () => {
    const tileEl = tileEls.find(
      (t) => t instanceof HTMLElement && t.getBoundingClientRect().height > 0,
    );
    if (!tileEl) return false;
    return tileEl.getBoundingClientRect().bottom <= SNAP_ZONE_TILE_BOTTOM_PX;
  };

  const trySnapToBottom = () => {
    if (reduced) return;
    const y = window.scrollY || 0;
    if (!lastDirDown || !inSnapZone()) return;
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) return;
    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(maxScroll(), { duration: 1.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
    }
  };

  const onScroll = () => {
    const y = window.scrollY || 0;
    if (y !== lastScrollY) {
      lastDirDown = y > lastScrollY;
      lastScrollY = y;
    }
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) setNav(true);
    else if (y < maxScroll() - NAV_SHOW_HYSTERESIS_PX) setNav(false);
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnapToBottom, BOTTOM_SNAP_IDLE_MS);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile tile-carousel indicator (Part-2 rebuild) — swipe feedback,
     not motion, so it lives above the RM return. */
  const cleanupInd = isMobileViewport() ? initCarouselIndicators(closing) : () => {};

  const cleanupBase = () => {
    topLinks.forEach((el) => el.removeEventListener('click', onTopClick));
    window.removeEventListener('scroll', onScroll);
    window.clearTimeout(snapTimer);
    cleanupInd();
  };

  if (reduced) {
    return cleanupBase;
  }

  const closingLines = Array.from(closing.querySelectorAll('[data-closing-line]'));
  /* Headline anchoring is pure CSS now (left-anchored on the tiles'
     24px margin, Oscar's rev 2) — no runtime derivation. */
  const intro = closing.querySelector('[data-closing-intro]');
  /* The mobile carousel slides (Part-2 rebuild) join the tile
     entrance: on desktop they're display:none, so the added class is
     inert; on mobile they fade-rise on the tiles' slots. */
  const tiles = Array.from(
    closing.querySelectorAll('[data-closing-tile], .landing-closing__m-slide'),
  );
  const kws = Array.from(closing.querySelectorAll('[data-closing-kw]'));
  const footerCols = Array.from(footer.querySelectorAll('[data-footer-col]'));
  const footerImg = footer.querySelector('[data-footer-img]');
  const stLines = Array.from(footer.querySelectorAll('[data-footer-st-line]'));

  const timeouts = [];
  const triggers = [];
  let disposed = false;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* Wrap AFTER fonts (line grouping), BEFORE the triggers. */
    closingLines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    stLines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });

    /* Word reveals replace the block fades (Oscar's rev: every text
       entrance is the word-by-word clip reveal): the intro, the
       keyword blocks and the footer's index/row text. Only media —
       tiles, the footer image — keeps the rise+fade. Base delays
       reproduce the old wave timings; each element's lines then step
       internally at LINE_STAGGER_S. */
    const closingWordEls = [];
    const footerWordEls = [];
    if (intro instanceof HTMLElement) {
      wrapWordRevealElement(intro, { baseDelay: INTRO_AT_MS / 1000 });
      closingWordEls.push(intro);
    }
    kws.forEach((kw, i) => {
      const base = (KEYWORDS_AT_MS + i * KEYWORD_STAGGER_MS) / 1000;
      const row = kw.querySelector('.landing-closing__kw-row');
      const kwLine = kw.querySelector('.landing-closing__kw-line');
      if (row instanceof HTMLElement) {
        wrapWordRevealElement(row, { baseDelay: base });
        closingWordEls.push(row);
      }
      if (kwLine instanceof HTMLElement) {
        wrapWordRevealElement(kwLine, { baseDelay: base + LINE_STAGGER_S });
        closingWordEls.push(kwLine);
      }
    });
    /* The START A PROJECT chip's painted pill — the one footer
       surface the word wrap can't cover; it rises via the tile/image
       class family on the same beat as its own words. */
    let footerChip = null;
    let footerChipAtMs = 0;
    footerCols.forEach((col, i) => {
      const base = (i * FOOTER_COL_STAGGER_MS) / 1000;
      if (col.matches('a, button')) {
        /* START A PROJECT — a single control: its label + arrow
           sweep as that element's own units. */
        wrapWordRevealElement(col, { baseDelay: base });
        footerWordEls.push(col);
        if (col.classList.contains('landing-footer__dchip')) {
          footerChip = col;
          footerChipAtMs = i * FOOTER_COL_STAGGER_MS;
        }
      } else {
        Array.from(col.children).forEach((child, j) => {
          if (!(child instanceof HTMLElement)) return;
          wrapWordRevealElement(child, { baseDelay: base + j * 0.06 });
          footerWordEls.push(child);
        });
      }
    });
    const rowItems = Array.from(footer.querySelectorAll('.landing-footer__rowitem'));
    rowItems.forEach((item, i) => {
      if (!(item instanceof HTMLElement)) return;
      wrapWordRevealElement(item, { baseDelay: FOOTER_ROW_AT_MS / 1000 + i * 0.04 });
      footerWordEls.push(item);
    });

    triggers.push(ScrollTrigger.create({
      trigger: closing,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        closingLines.forEach((line) => playLineRevealElement(line));
        closingWordEls.forEach((el) => playLineRevealElement(el));
        tiles.forEach((tile, i) => {
          timeouts.push(setTimeout(() => tile.classList.add('is-visible'), TILES_AT_MS + i * TILE_STAGGER_MS));
        });
      },
    }));

    triggers.push(ScrollTrigger.create({
      trigger: footer,
      /* The footer pins BEHIND the closing section (the reveal), so
         a viewport-percentage start would fire while it's still
         covered: fire ~200px into the actual reveal instead (the
         pin engages when the footer's flow top reaches
         100dvh - 811 from the viewport top). */
      /* MOBILE: no pin — the footer is plain flow, so the desktop
         formula (innerHeight − 811 − 200, i.e. the top rising past
         the viewport) can sit beyond the document's end and never
         fire, leaving the footer text in its clips forever. A plain
         in-view start is the correct trigger there. */
      start: () =>
        isMobileViewport()
          ? 'top 85%'
          : `top ${(window.innerHeight - 811 - 200).toFixed(0)}px`,
      once: true,
      onEnter: () => {
        footerWordEls.forEach((el) => playLineRevealElement(el));
        if (footerChip) {
          const chipEl = footerChip;
          timeouts.push(setTimeout(() => chipEl.classList.add('is-visible'), footerChipAtMs));
        }
        timeouts.push(setTimeout(() => {
          if (footerImg) footerImg.classList.add('is-visible');
        }, FOOTER_IMG_AT_MS));
        stLines.forEach((line) => playLineRevealElement(line));
      },
    }));
  });

  return () => {
    earlyDisposed = true;
    fragTrigger?.kill();
    cleanupDwell();
    disposed = true;
    cleanupBase();
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
  };
}
