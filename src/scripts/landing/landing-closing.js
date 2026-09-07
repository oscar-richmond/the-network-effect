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
import { initClosingStatement } from './closing-statement.js';
import gsap from 'gsap';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { isMobileViewport } from './viewport.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
/* Bottom-of-page behaviours (Oscar's rev):
   1. AUTO-SNAP: if the user stops scrolling (2s idle) with the
      closing tiles at least 2/3 off the top of the viewport (or any
      further down), and the last movement was DOWNWARD, glide to
      the very bottom (the footer's full reveal) through Lenis.
   2. NAV EXIT (partial — Oscar's ruling, 2026-08-27): every time
      the page rests at the bottom, the two CENTRED nav items (WORK,
      SERVICES) ripple OUT (per-char blur, right-to-left — the menu
      hover effect reversed) and back in when scrolling up. The
      wordmark and LET'S CHAT remain present at all times. */
/* R6 (Oscar 2026-08-27): the settle's gate — it may only advance
   once this fraction of the statement section has exited the
   viewport top, OR within this many px of the page bottom.
   (Retires SNAP_ZONE_TILE_BOTTOM_PX, the tile-anchored zone that
   armed long before the statement.) */
const CLOSING_SNAP_EXIT_T = 0.5;
const CLOSING_SNAP_NEAR_PX = 400;
/* Mobile's shipped slide-anchored zone (kept byte-identical under
   the seam; the desktop gate above replaces it ≥1025 only). */
const SNAP_ZONE_TILE_BOTTOM_PX = 150; // 450px tiles, 2/3 off the top
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

  /* ── THE CLOSING STATEMENT — R36 item 7 (Oscar, 2026-09-04): the
     dwell, the white → red scrub, the nav-over-red switch and the
     fragment entrance moved VERBATIM into closing-statement.js (one
     module, two instances: here and /services). The snap-zone gate
     below still reads [data-closing-st]. */
  const cleanupStatement = initClosingStatement({ reduced });

  /* ── Nav-at-bottom + auto-snap (all modes; RM = instant toggle,
     no auto-snap). Char wrap + sweep applier are shared with the
     load entrance (nav-motion.js). */
  /* R36 (Oscar, 2026-09-04): the SHARED bottom binder (nav-motion.js)
     — the sweep applier, the direction/hysteresis logic and the idle
     snap are one implementation on every document-scroll page now.
     This page keeps its own snap ZONE predicate: the R6 gate (the
     statement half-exited, or within CLOSING_SNAP_NEAR_PX of the
     bottom) — a ruled behaviour, passed in, not re-ruled here. */
  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  const inSnapZone = () => {
    /* The rebuild (2026-09-07): the statement section renders below the
       seam now, so one rule serves every width. */
    const st = document.querySelector('[data-closing-st]');
    if (st instanceof HTMLElement && st.getBoundingClientRect().height > 0) {
      const r = st.getBoundingClientRect();
      if (r.top + r.height * CLOSING_SNAP_EXIT_T <= 0) return true;
    }
    return maxScroll() - (window.scrollY || 0) <= CLOSING_SNAP_NEAR_PX;
  };
  const cleanupBottom = bindBottomNavSweep({ reduced, inSnapZone, getLenis: getLenisInstance });


  const cleanupBase = () => {
    topLinks.forEach((el) => el.removeEventListener('click', onTopClick));
    cleanupBottom();
  };

  if (reduced) {
    return () => {
      cleanupStatement();
      cleanupBase();
    };
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
      /* The footer pins BEHIND the closing section (the reveal), so
         a viewport-percentage start would fire while it's still
         covered: fire ~200px into the actual reveal instead. The
         pin engages when the footer's flow top reaches
         100dvh - footerH from the viewport top — footerH is
         MEASURED here (A1, 2026-08-27: a literal 811 outlived the
         footer's move to 830 and skewed this trigger 19px; deriving
         from the element kills that class of drift; 830 is only the
         no-layout fallback). */
      /* THE REBUILD (2026-09-07): the narrow build reveals the footer
         from behind the red tail too (a sticky footer under the closing
         tier, the spacer keeping the document's height — the desktop's
         construction with a measured height). Its trigger reads the
         SPACER, which is in flow: 200 into the reveal is the spacer's
         top 200 above the viewport bottom. */
      trigger: isMobileViewport() && document.querySelector('.landing-footer-spacer') ? document.querySelector('.landing-footer-spacer') : footer,
      start: () =>
        isMobileViewport()
          ? (document.querySelector('.landing-footer-spacer') ? 'top bottom-=200' : 'top 85%')
          : `top ${(window.innerHeight - (footer.offsetHeight || 830) - 200).toFixed(0)}px`,
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
    cleanupStatement();
    disposed = true;
    cleanupBase();
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
  };
}
