/**
 * THE CLOSING STATEMENT — the shared driver (R36 item 7, Oscar
 * 2026-09-04). One module, two instances: the landing (after the
 * closing section) and /services (after AMPLIFY's WE CREATE list).
 * The markup is ClosingStatement.astro; the CSS stays in landing.css
 * (.landing-closing-st*, .landing-closing-tail — page-agnostic under
 * .landing-v2, the footer sticky schema included).
 *
 * EXTRACTED VERBATIM from landing-closing.js (its R4 dwell, R16/R21/R23
 * red band, and the frame-13:277 fragment entrance blocks — the comment
 * trail is theirs): the centred DWELL (statement-dwell.js: the text
 * fixes when its ink centres between the nav wordmark's bottom and the
 * viewport bottom; hold = the fade's scrub range), the WHITE → RED scrub
 * (#eeeef0 → #C1250E over CLOSING_FADE_PX while the text is fixed; red
 * is the final ground; the footer reveals from beneath the 180 red
 * tail), the NAV OVERRIDE (solid #161616 while the band covers the
 * nav's midpoint), and the fragment ENTRANCE (per-line word reveal at
 * 65%). Desktop only (the section is display:none ≤1024). RM: the dwell
 * (layout) runs; the band is static red (CSS); no scrub, no entrance.
 *
 * DEV handle: window.__closingStatement (was __landingClosingRed).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initStatementDwell, ST_DWELL_HOLD_PX } from './statement-dwell.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

/** @param {{ reduced?: boolean }} [opts] @returns {() => void} cleanup */
export function initClosingStatement({ reduced = false, solidNavFrom = null } = {}) {
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
    /* R79 (Oscar, 2026-09-05) — WHERE THE SOLID STATE BEGINS.
       By default the section's own top: the band arrives and the nav
       goes solid as it crosses the nav's midpoint.

       `solidNavFrom` moves that boundary EARLIER, to the BOTTOM of the
       element passed in. /services uses it to start at the end of the
       WE CREATE rows, which is Oscar's ruling and also fixes a real
       defect: R50 made the solid ink #EEEEF0, and the switch fires
       while the ground is still WHITE, so for the ~120px between the
       rows and the band the nav was light ink on a light ground —
       measured 1.0:1, and on screen the nav simply vanished. Starting
       at the rows' bottom with the ink black (the /services override
       in landing.css) keeps the nav readable across the whole
       stretch, and the switch itself is invisible in BOTH directions:
       over that white ground the difference blend's own result is
       (17,17,15), one step from the solid #161616.

       The OFF edge is unchanged — the band's bottom crossing the same
       line — so the pair stays symmetric and scrolling back up
       reverts at exactly the boundary it engaged at. */
    const solidTopY = () => (solidNavFrom instanceof HTMLElement
      ? solidNavFrom.getBoundingClientRect().bottom
      : section.getBoundingClientRect().top);
    const onRedScroll = () => {
      const r = section.getBoundingClientRect();
      const y = navSwitchY();
      /* The band (section + tail) covers the nav's midpoint. */
      const bandBottom = tail instanceof HTMLElement ? tail.getBoundingClientRect().bottom : r.bottom;
      setSolid(solidTopY() <= y && bandBottom > y);
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
          window.__closingStatement = {
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

  return () => {
    earlyDisposed = true;
    fragTrigger?.kill();
    cleanupRed();
    cleanupDwell();
  };
}
