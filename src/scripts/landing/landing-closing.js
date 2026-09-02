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
import { ensureLogoChars, ensureNavLinkChars, applyNavSweep, getSweptNavParts } from './nav-motion.js';
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
const BOTTOM_SNAP_IDLE_MS = 2000;
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
      /* R5 (Oscar 2026-08-27, supersedes full-viewport centring for
         THIS block only): centred between the NAV'S measured bottom
         and the viewport bottom — equal gaps both sides; derived
         live so it holds at 1728 and in the 1512 shell. The
         /services dwells keep the default. */
      const topbar = document.querySelector('.home__topbar');
      cleanupDwell = initStatementDwell(stDwellSection, stDwellStage, {
        topBound: () => (topbar instanceof HTMLElement ? topbar.getBoundingClientRect().bottom : 0),
        /* R6 (Oscar 2026-08-27): centre the text's INK, not the
           stage box — the box bakes 54px above the lines and a
           180px legacy allowance below (the twice-missed centring's
           mechanism; see statement-dwell). */
        inkLines: () => Array.from(stDwellStage.querySelectorAll('[data-closing-st-line]')),
      });
      ScrollTrigger.refresh();
    });
  }

  /* ── THE RED BAND (R16, Oscar 2026-09-02): the statement section's
     ground is #C1250E. GROUND CHOREOGRAPHY on the established fade
     grammar — two scrubbed, reversible windows on the section's (and
     its stage's) backgroundColor:
       ENTER  [section top at the viewport bottom, + the section's
              top clear strip (its measured padding-top — the dwell's
              symmetric pad)]: the closing's #eeeef0 → red. Complete
              exactly as the stage's top reaches the viewport bottom;
              the first ink sits 54 lower, so no ink is ever seen over
              the shifting ground.
       EXIT   on THE RED TAIL (the empty strip after the section —
              the services-fade lesson, never under live content):
              [tail top at the viewport bottom, + the tail's height]
              — the section, its stage and the tail fade TOGETHER,
              red → the FOOTER's own ground (read live), so the tail's
              bottom edge uncovers the footer in the footer's colour
              — no cut, and the statement's whole dwell sits on solid
              red (the section's own bottom edge is only 21px below
              the viewport at the dwell's release — a fade on the
              section alone had to run through the hold). The
              statement is plain #161616 ink, styled for both grounds,
              so it may still be in view over the first part of this
              shift. INK RULED FINAL (Oscar, 2026-09-02): #161616 on
              #C1250E stays — do not re-flag. Measured contrast 3.05:1,
              which passes WCAG only at the large-text floor (3:1;
              the statement is 100px, the nav 18-34px). The simple
              exit fade stays as built; no ink fade is needed because
              the dark ink is styled for both grounds.
     NAV OVERRIDE: while the band is under the nav every nav item is
     solid #161616, blend off — a class on the ELEMENTS (never an
     ancestor). ON when the band's top edge crosses the nav's vertical
     midpoint (NAV_RED_SWITCH_T of the bar's height — the straddle
     rule: half the bar's height of scroll either side is the
     unavoidable straddle, minimised at the midpoint); OFF when the
     exit fade completes (the tail's bottom edge at the viewport
     bottom — the ground under the nav is the footer's grey by then,
     where the blend's own result is #111, one step from the solid).
     Both edges are pure functions of the band's rect, so reverse
     scroll runs them backwards. RM: the static red band keeps the
     nav rule (a state, not motion); the fades don't run (the RM
     boundary rule). Desktop only. */
  const RED = '#c1250e';
  const NAV_RED_SWITCH_T = 0.5;
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
      const vh = window.innerHeight || 0;
      /* Red under the nav from the band's top edge at the switch line
         until the exit fade completes = the tail's bottom edge at the
         viewport bottom (the section's own bottom when no tail). */
      const groundBottom = tail instanceof HTMLElement ? tail.getBoundingClientRect().bottom : r.bottom;
      setSolid(r.top <= navSwitchY() && groundBottom > vh);
    };
    window.addEventListener('scroll', onRedScroll, { passive: true });
    window.addEventListener('resize', onRedScroll);
    onRedScroll();
    const redTls = [];
    if (!reduced) {
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (earlyDisposed) return;
        /* Registered after the dwell's own fonts.then, so the pads are
           already written when these measure. */
        const enterPx = () => parseFloat(getComputedStyle(section).paddingTop) || 0;
        /* The exit runs over the tail's own height (CLOSING_RED_TAIL_PX
           in landing.css — read rendered, one source). Without a tail
           it falls back to the section's ink→edge clearance. */
        const exitPx = () => {
          if (tail instanceof HTMLElement && tail.offsetHeight > 0) return tail.offsetHeight;
          const lines = Array.from(stage.querySelectorAll('[data-closing-st-line]'));
          const lastBottom = lines.length
            ? Math.max(...lines.map((l) => l.offsetTop + l.offsetHeight))
            : stage.offsetHeight;
          return Math.max(0, stage.offsetHeight - lastBottom)
            + (parseFloat(getComputedStyle(section).paddingBottom) || 0);
        };
        const exitTrigger = tail instanceof HTMLElement && tail.offsetHeight > 0 ? tail : section;
        const grounds = [section, stage, ...(tail instanceof HTMLElement ? [tail] : [])];
        const footerGround = () => (footer instanceof HTMLElement
          ? getComputedStyle(footer).backgroundColor
          : '#eeeef0');
        const enter = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: () => `+=${Math.round(enterPx())}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        enter.fromTo([section, stage],
          { backgroundColor: '#eeeef0' },
          { backgroundColor: RED, ease: 'none', duration: 1, immediateRender: true }, 0);
        const exit = gsap.timeline({
          scrollTrigger: {
            trigger: exitTrigger,
            start: exitTrigger === tail ? 'top bottom' : () => `bottom bottom+=${Math.round(exitPx())}`,
            end: exitTrigger === tail ? () => `+=${Math.round(exitPx())}` : 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        exit.fromTo(grounds,
          { backgroundColor: RED },
          { backgroundColor: footerGround(), ease: 'none', duration: 1, immediateRender: false }, 0);
        redTls.push(enter, exit);
        ScrollTrigger.refresh();
        if (import.meta.env.DEV) {
          window.__landingClosingRed = {
            enter: () => [enter.scrollTrigger?.start, enter.scrollTrigger?.end],
            exit: () => [exit.scrollTrigger?.start, exit.scrollTrigger?.end],
            enterPx, exitPx, footerGround, solid: () => solid, navSwitchY,
            tail: () => (tail instanceof HTMLElement ? tail.getBoundingClientRect() : null),
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
  const menuToggle = document.querySelector('[data-menu-toggle]');
  ensureLogoChars();
  /* The swept links' own chars — unconditional (char-ripple's wrap
     is hover-gated; the WORK-doesn't-sweep cause). */
  ensureNavLinkChars();

  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    /* Never strand an open menu without its toggle. */
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced, parts: getSweptNavParts() });
  };

  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);

  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;

  /* R6 (Oscar 2026-08-27, THE GATE — supersedes the tile-anchored
     zone, which armed as soon as the tiles were 2/3 off the top:
     long before the statement, so idling AT the centred dwell was
     yanked to the footer — the eagerness). The settle may only
     advance when EITHER at least CLOSING_SNAP_EXIT_T of the
     statement section has exited the viewport top (its measured
     midpoint above the top edge at 0.5) OR no more than
     CLOSING_SNAP_NEAR_PX of scroll remains to the page bottom.
     Below both, idling does nothing — the current machinery has no
     back-settle at this boundary (the dwell is pure sticky) and
     that behaviour is kept. Interruption stays the house Lenis
     convention (user input takes the tween over). */
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
