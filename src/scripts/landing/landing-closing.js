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
import { initStatementDwell, ST_DWELL_HOLD_PX } from './statement-dwell.js';
import gsap from 'gsap';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { isMobileViewport } from './viewport.js';
import { initCarouselIndicators } from './carousel-indicator.js';

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
      /* R5 (Oscar 2026-08-27, supersedes full-viewport centring for
         THIS block only): centred between the NAV'S measured bottom
         and the viewport bottom — equal gaps both sides; derived
         live so it holds at 1728 and in the 1512 shell. The
         /services dwells keep the default. */
      const topbar = document.querySelector('.home__topbar');
      cleanupDwell = initStatementDwell(stDwellSection, stDwellStage, {
        topBound: () => (topbar instanceof HTMLElement ? topbar.getBoundingClientRect().bottom : 0),
        /* R23 (Oscar 2026-09-03): the hold IS the red fade's scrub
           range (CLOSING_FADE_PX, 600 — twice R21's 300), so the text
           stays fixed for the whole white → red; no clearing strip
           below the stage — the tail is the same band, and the strip
           was stacking ground between "value." and the reveal. */
        holdPx: CLOSING_FADE_PX,
        bottomClear: false,
        /* R6 (Oscar 2026-08-27): centre the text's INK, not the
           stage box — the box bakes 54px above the lines and a
           180px legacy allowance below (the twice-missed centring's
           mechanism; see statement-dwell). */
        inkLines: () => Array.from(stDwellStage.querySelectorAll('[data-closing-st-line]')),
      });
      ScrollTrigger.refresh();
    });
  }

  /* ── THE RED BAND — R21 (Oscar 2026-09-02) REVERSES the R16
     sequence. Scrolling down: the statement ARRIVES on the WHITE
     ground → it FIXES (the dwell, centred as built) → the ground
     scrubs WHITE → RED (#C1250E) while the text stays fixed → once
     fully red, continued scroll reveals the footer from beneath. One
     progress value, fully reversible:
       FADE   [the dwell's engage (section top at the viewport top),
              + CLOSING_FADE_PX (R23: 600, twice R21's 300 — half
              speed, same start)]: #eeeef0 → red on the section, its
              stage and the red tail together — the sticky hold IS
              the fade window (the dwell takes holdPx = the fade), so
              the text is pinned throughout and is fully red exactly
              at the release.
       TAIL   CLOSING_RED_TAIL_PX (landing.css; 180 — R21, was 500):
              R23: the section's stage now ENDS AT THE INK BOTTOM of
              "value." (its 180 legacy allowance retired — it had
              stacked with this tail: 189 + 180 = 369 of red below
              the ink) and the dwell adds no clearing strip, so the
              tail's 180 is THE gap: ink bottom → the band's end,
              where the sticky footer (grey/white) uncovers. The
              reveal follows full red directly; no hold on full red
              (CLOSING_RED_HOLD_PX below is the knob, 0).
     The R16 enter fade (light → red over the top strip) and exit
     fade (red → the footer's ground over a 500 tail) are retired.
     INK RULED FINAL (Oscar, 2026-09-02): #161616 on both grounds —
     3.05:1 on the red, the WCAG large-text floor (the statement is
     100px); no ink switch anywhere in the sequence.
     NAV OVERRIDE (unchanged mechanism): solid #161616, blend off,
     while the band covers the nav's midpoint (NAV_RED_SWITCH_T of
     the bar's height): ON as the section's top crosses it — the
     ground is still white there, where the blend's own result is
     (17,17,15), one step from the solid, so the switch is invisible;
     it holds through the fade and the red tail; OFF as the tail's
     bottom edge crosses the same line — over the footer's grey the
     blend again reads (17,17,15). A class on the elements and the
     bar (the bar itself is difference-blended), never a new ancestor.
     RM: the static red band (no scrub) keeps the nav rule. */
  const RED = '#c1250e';
  const NAV_RED_SWITCH_T = 0.5;
  /* R23 (Oscar 2026-09-03): HALF SPEED — the white → red scrub (and
     its reverse) takes TWICE the scroll it did: 600 (was the dwell's
     300 hold). Same start point (the dwell's engage). The dwell's
     hold is set to this same value (initStatementDwell holdPx), so
     the text stays fixed for exactly the fade; the runway grows by
     the added 300. One knob. */
  const CLOSING_FADE_PX = ST_DWELL_HOLD_PX * 2;
  const CLOSING_RED_HOLD_PX = 0; /* a pause on full red before the reveal — none ruled */
  let cleanupRed = () => {};
  if (stDwellSection instanceof HTMLElement && stDwellStage instanceof HTMLElement
    && window.matchMedia('(min-width: 1025px)').matches) {
    const section = stDwellSection;
    const stage = stDwellStage;
    const tail = document.querySelector('[data-closing-tail]');
    const topbar = document.querySelector('.home__topbar');
    /* The items AND the bar: the bar itself is difference-blended
       (home.css — its own established shape), so an item switched to
       normal inside it still composites through the bar's blend
       (measured: #161616 over the red came out as (171,15,8) — the
       bar's |ink − ground|). Both switch together for the state;
       nothing else in the chain changes, and the class-off state is
       byte-identical to before. */
    const navEls = [
      topbar,
      document.querySelector('.home__logo'),
      ...document.querySelectorAll('.home__nav-link'),
      document.querySelector('.home__topbar-email'),
    ].filter((el) => el instanceof HTMLElement);
    let solid = false;
    const setSolid = (on) => {
      if (on === solid) return;
      solid = on;
      navEls.forEach((el) => el.classList.toggle('is-over-red', on));
    };
    const navSwitchY = () => (topbar instanceof HTMLElement
      ? topbar.getBoundingClientRect().height * NAV_RED_SWITCH_T
      : 35.5);
    const onRedScroll = () => {
      const r = section.getBoundingClientRect();
      const y = navSwitchY();
      /* The band (section + tail) covers the nav's midpoint. */
      const bandBottom = tail instanceof HTMLElement ? tail.getBoundingClientRect().bottom : r.bottom;
      setSolid(r.top <= y && bandBottom > y);
    };
    window.addEventListener('scroll', onRedScroll, { passive: true });
    window.addEventListener('resize', onRedScroll);
    onRedScroll();
    const redTls = [];
    if (!reduced) {
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (earlyDisposed) return;
        /* Registered after the dwell's own fonts.then, so its paddings
           and hold are already in place when this measures. */
        const grounds = [section, stage, ...(tail instanceof HTMLElement ? [tail] : [])];
        const fade = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',                       /* = the dwell's engage */
            end: () => `+=${CLOSING_FADE_PX}`,      /* R23: = the (doubled) hold: red at the release */
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        fade.fromTo(grounds,
          { backgroundColor: '#eeeef0' },
          { backgroundColor: RED, ease: 'none', duration: 1, immediateRender: true }, 0);
        redTls.push(fade);
        ScrollTrigger.refresh();
        if (import.meta.env.DEV) {
          window.__landingClosingRed = {
            fade: () => [fade.scrollTrigger?.start, fade.scrollTrigger?.end],
            holdPx: CLOSING_FADE_PX, fadePx: CLOSING_FADE_PX, redHoldPx: CLOSING_RED_HOLD_PX,
            tail: () => (tail instanceof HTMLElement ? tail.getBoundingClientRect() : null),
            solid: () => solid, navSwitchY,
          };
        }
      });
    }
    cleanupRed = () => {
      window.removeEventListener('scroll', onRedScroll);
      window.removeEventListener('resize', onRedScroll);
      setSolid(false);
      redTls.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
    };
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
  /* R36 (Oscar, 2026-09-04): the SHARED bottom binder (nav-motion.js)
     — the sweep applier, the direction/hysteresis logic and the idle
     snap are one implementation on every document-scroll page now.
     This page keeps its own snap ZONE predicate: the R6 gate (the
     statement half-exited, or within CLOSING_SNAP_NEAR_PX of the
     bottom) — a ruled behaviour, passed in, not re-ruled here. */
  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  const inSnapZone = () => {
    /* MOBILE keeps the shipped slide-anchored zone byte-identical
       (the statement section is display:none under the seam — its
       zero rect would read the exit condition permanently true,
       the exact bug class the old anchor comment warned about). */
    if (isMobileViewport()) {
      const slide = closing.querySelector('.landing-closing__m-slide');
      if (!(slide instanceof HTMLElement) || slide.getBoundingClientRect().height <= 0) return false;
      return slide.getBoundingClientRect().bottom <= SNAP_ZONE_TILE_BOTTOM_PX;
    }
    const st = document.querySelector('[data-closing-st]');
    if (st instanceof HTMLElement && st.getBoundingClientRect().height > 0) {
      const r = st.getBoundingClientRect();
      if (r.top + r.height * CLOSING_SNAP_EXIT_T <= 0) return true;
    }
    return maxScroll() - (window.scrollY || 0) <= CLOSING_SNAP_NEAR_PX;
  };
  const cleanupBottom = bindBottomNavSweep({ reduced, inSnapZone, getLenis: getLenisInstance });

  /* Mobile tile-carousel indicator (Part-2 rebuild) — swipe feedback,
     not motion, so it lives above the RM return. */
  const cleanupInd = isMobileViewport() ? initCarouselIndicators(closing) : () => {};

  const cleanupBase = () => {
    topLinks.forEach((el) => el.removeEventListener('click', onTopClick));
    cleanupBottom();
    cleanupInd();
  };

  if (reduced) {
    return () => {
      earlyDisposed = true;
      cleanupRed();
      cleanupDwell();
      cleanupBase();
    };
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
         covered: fire ~200px into the actual reveal instead. The
         pin engages when the footer's flow top reaches
         100dvh - footerH from the viewport top — footerH is
         MEASURED here (A1, 2026-08-27: a literal 811 outlived the
         footer's move to 830 and skewed this trigger 19px; deriving
         from the element kills that class of drift; 830 is only the
         no-layout fallback). */
      /* MOBILE: no pin — the footer is plain flow, so the desktop
         formula (innerHeight − footerH − 200, i.e. the top rising
         past the viewport) can sit beyond the document's end and
         never fire, leaving the footer text in its clips forever. A
         plain in-view start is the correct trigger there. */
      start: () =>
        isMobileViewport()
          ? 'top 85%'
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
    earlyDisposed = true;
    fragTrigger?.kill();
    cleanupRed();
    cleanupDwell();
    disposed = true;
    cleanupBase();
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
  };
}
