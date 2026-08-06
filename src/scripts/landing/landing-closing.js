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
import gsap from 'gsap';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';

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
  const tileEl = closing.querySelector('[data-closing-tile]');

  const inSnapZone = () => {
    if (!(tileEl instanceof HTMLElement)) return false;
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

  const cleanupBase = () => {
    topLinks.forEach((el) => el.removeEventListener('click', onTopClick));
    window.removeEventListener('scroll', onScroll);
    window.clearTimeout(snapTimer);
  };

  if (reduced) {
    return cleanupBase;
  }

  const closingLines = Array.from(closing.querySelectorAll('[data-closing-line]'));
  /* Headline anchoring is pure CSS now (left-anchored on the tiles'
     24px margin, Oscar's rev 2) — no runtime derivation. */
  const intro = closing.querySelector('[data-closing-intro]');
  const tiles = Array.from(closing.querySelectorAll('[data-closing-tile]'));
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
    footerCols.forEach((col, i) => {
      const base = (i * FOOTER_COL_STAGGER_MS) / 1000;
      if (col.matches('a, button')) {
        /* START A PROJECT — a single control: its label + arrow
           sweep as that element's own units. */
        wrapWordRevealElement(col, { baseDelay: base });
        footerWordEls.push(col);
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
      start: () => `top ${(window.innerHeight - 811 - 200).toFixed(0)}px`,
      once: true,
      onEnter: () => {
        footerWordEls.forEach((el) => playLineRevealElement(el));
        timeouts.push(setTimeout(() => {
          if (footerImg) footerImg.classList.add('is-visible');
        }, FOOTER_IMG_AT_MS));
        stLines.forEach((line) => playLineRevealElement(line));
      },
    }));
  });

  return () => {
    disposed = true;
    cleanupBase();
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
  };
}
