/**
 * /services — the "Option 6" desktop driver (frame 38:2420,
 * 2026-08-26). Every width since the mobile pass (3429a4c,
 * 2026-09-07); the legacy services-v2 driver that used to run below
 * the seam retired then (deleted 2026-09-10).
 *
 * MECHANIC REUSE (the inventory, per the task):
 *  · HOVER TABLES — initSvRowsSections wholesale (sv-rows.js,
 *    untouched): fill/marquee/image glide/rapid-hover latch/
 *    keyboard/touch/RM. The page sets --sv-accent to the #C1250E
 *    red; geometry adaptations live in services-6.css only.
 *  · GALLERY PIN + TRAVEL — the landing featured-work PATTERN
 *    (sticky stage + vertical runway mapped 1:1 to horizontal x;
 *    travel = strip width + margins − viewport, derived live).
 *    landing-featured.js itself documents that this pattern is
 *    reused as a pattern, not shared code ("the /old horizontal
 *    galleries are welded to their pages' pin systems") — same
 *    here: the landing module is welded to its cards/header/fade
 *    contracts, so the pattern is rebuilt minimally and the
 *    original is untouched (landing byte-identical).
 *  · BOX ARRIVAL — the landing featured entrance vocabulary:
 *    is-visible stagger at 100ms L→R, once, at 'top 65%'.
 *  · FRAGMENTED DWELL — initStatementDwell wholesale
 *    (statement-dwell.js): the centred sticky hold + clear-space
 *    pads, exactly the landing closing statement's behaviour.
 *  · Entrances — the house word-reveal vocabulary throughout.
 *
 * THE DARK BAND (38:2501): sized live from the CONNECT header
 * image's bottom edge to the AMPLIFY header image's top (the
 * frame's own transition edges; its 25px tuck under the CONNECT
 * image hides beneath the opaque image either way).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { initSvRowsSections } from './sv-rows.js';
import { isMobileViewport, isPhoneViewport, flowFooterSpacer } from './viewport.js';
import { wireRailVeils } from './rail-veils.js';
/* THE PHONE (Figma otZb9H4j24ZX1upxbGUXyu 0:17, Oscar 2026-09-10): the
   landing's shared mechanics, reused — the WHAT WE DO image wipe for
   B1's fixed frame, Featured Work's pinned rail for B2's galleries. */
import { createImageWipe } from './img-wipe.js';
import { mountPinnedRail, drivePinnedRail } from './m-pinned-rail.js';
import { smallViewportPx } from './m-viewport.js';
import { bindBottomNavSweep } from './nav-motion.js';
import { initStatementBar } from './statement-bar.js';
import { initStatementDwell } from './statement-dwell.js';
import { initClosingStatement } from './closing-statement.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const BOX_STAGGER_MS = 100;   /* the landing featured card arrival */
const ROW_STAGGER_MS = 60;    /* the sv-rows draw stagger (shipped) */
const FRAG_LINE_PITCH_PX = 90;
const FRAG_LINE_H_PX = 88;
/* R5 (Oscar 2026-08-27): the pillar hero TEXT enters once the image
   has expanded this many px per side beyond its rest margins —
   almost the moment the expansion starts moving (was edge contact).
   The threshold reads the measured --sv6-hero-inset; the EXIT keeps
   the edge-contact-leave timing untouched (asymmetric by design). */
const SV6_HERO_REST_INSET_PX = 24;
/* THE REBUILD (2026-09-07), narrow-scoped: the fragment dwell's hold —
   the desktop's ST_DWELL_HOLD_PX (300) reads long under a thumb; 240
   keeps the hold legible inside one flick. */
const FRAG_HOLD_PX_M = 240;
const SV6_TEXT_ENTER_EXPAND_PX = 4;
/* ═══ THE PHONE (Figma otZb9H4j24ZX1upxbGUXyu 0:17, 2026-09-10) ═══ */
/* B1 — the row under the viewport's vertical midpoint is the active
   row; a neighbour claims it only once the midpoint is this far inside
   its box (an 8px dead band astride every divider — no flutter). */
const M_ROW_HYST_PX = 4;
/* the dark band's edges (0:19): page 3332 and 6254 against the CONNECT
   pillar at 3169 and AMPLIFY at 6085 — 163 INTO the first image, 169
   INTO the second (the frame's own edges, built as drawn; flagged) */
const M_BAND_INTO_CONNECT_PX = 163;
const M_BAND_INTO_AMPLIFY_PX = 169;
/* the frame's gap from a row list's end line to the gallery heading
   that follows, honoured at the PIN moment (the list's tail stays in
   view above the pinned gallery); the frame's absolute 99 / 186 are
   superseded by the pin (reported) */
const M_GAL_ARRIVE_GAP_PX = 64;
/* the frame's gap from a gallery's caption row to the fragment
   statement's first line (0:101 → 0:234 and 0:125 → 0:177, both 222);
   the fragment's own dwell padding counts toward it */
const M_FRAG_GAP_PX = 222;
/* the galleries' entrance — the heading's top at this share of the
   viewport, derived as an absolute scroll from the pin (the stage is
   sticky; Featured Work's own derived-arrival pattern) */
const M_GAL_ENTER_VH = 0.9;
/* The landing's bottom pair (audit fix, 2026-08-27 — this build had
   NEITHER behaviour: the nav exit and idle snap only ever lived in
   the since-retired services-v2.js driver. Constants are the
   case-study/contact pair, verbatim). */

export function initServices6() {
  const page = document.querySelector('[data-services-6]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* THE MOBILE PASS (2026-09-07): this driver runs on BOTH builds now
     (the legacy mobile page retired). narrow = the phone/tablet build:
     the tables take the tap path (sv-rows), the galleries are native
     swipe strips (no pin/scrub), the fragment dwell, the statement
     bars, the dark-band layer and the bottom nav sweep stand aside —
     services-6.css paints their equivalents. The pillar expansion
     keeps its scrub; its rest inset is the page margin here. */
  const narrow = isMobileViewport();
  /* THE PHONE (2026-09-10): the 402 frame's build — its own row-list
     frame (B1), pinned galleries (B2), authored statement and fragment
     lines, the frame's band edges. The band (768–1359) keeps the
     rebuild's narrow paths. */
  const phone = isPhoneViewport();
  const readPx = (prop, fallback) => {
    const v = parseFloat(getComputedStyle(document.body).getPropertyValue(prop));
    return Number.isFinite(v) ? v : fallback;
  };
  const restInset = narrow ? readPx('--m-margin', SV6_HERO_REST_INSET_PX) : SV6_HERO_REST_INSET_PX;
  /* retimed for the narrow build: the pillar frame is 240 tall there and
     the inset 24, so the desktop's 700px of scroll for the expansion
     reads as a slow drag under the thumb; 420 completes it inside one
     flick. Desktop keeps 700 (the hero's VIDEO_EXPAND_PX). */
  const expandPx = narrow ? 420 : 700;
  const fineHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');

  if (!reduced) cleanups.push(initSiteScroll());

  /* ── THE PHONE'S AUTHORED LINES (layout, before anything measures):
     statement /01 breaks on the frame's ten lines (data-m-lines, from
     the data file — the same words; the indent span goes), and each
     fragment stage is rebuilt from the frame's own line set (a different
     count and x than the desktop's; the closing statement's phone
     construction: blocks on the 45 pitch, x in 402nds). Runs under RM
     too (it is the layout, not the choreography). */
  if (phone) {
    page.querySelectorAll('[data-sv6-statement][data-m-lines]').forEach((text) => {
      const lines = (text.getAttribute('data-m-lines') || '').split('|').filter(Boolean);
      if (!lines.length) return;
      text.textContent = '';
      lines.forEach((line, i) => {
        if (i) text.appendChild(document.createElement('br'));
        text.appendChild(document.createTextNode(line));
      });
    });
    page.querySelectorAll('[data-sv6-frag-stage][data-m-lines]').forEach((stage) => {
      let lines = [];
      try { lines = JSON.parse(stage.getAttribute('data-m-lines') || '[]'); } catch { lines = []; }
      if (!Array.isArray(lines) || !lines.length) return;
      stage.querySelectorAll('[data-sv6-frag-line]').forEach((l) => l.remove());
      lines.forEach(({ x, t }) => {
        const p = document.createElement('p');
        p.className = 'sv6-frag__mline';
        p.setAttribute('data-sv6-frag-line', '');
        p.style.setProperty('--st-x', String((Number(x) || 16) - 16));
        p.textContent = String(t);
        stage.appendChild(p);
      });
      stage.classList.add('is-mlines');
    });
  }

  /* ── Hover tables — the shared machinery, wholesale. R3 (Oscar
     2026-08-27): fixedImg — the frame holds at the CSS fixed
     centre-right slot instead of gliding; controllers hand back
     each table's image runner for the scroll driver below. */
  const svImgCtl = [];
  /* R36 item 6 (Oscar, 2026-09-04): treatment 'indent' — the landing
     rows' hover (the text's indent slide + the image swap in the fixed
     frame); the red fill / edge gradients / rolling marquee / text-out
     are retired from this page (their spans are gone from the markup,
     their rules from services-6.css). The shared machinery keeps the
     full treatment for its other hosts. */
  cleanups.push(initSvRowsSections({
    /* narrow: neither hover nor the tap path — a tapped row here would
       indent with nothing to reveal (the frame is hidden ≤1359), and it
       fought the scroll-active indent below (two rows indented at once,
       measured). The row at the viewport centre is the one active
       row on touch; keyboard focus keeps its parity handlers. */
    reduced, isMob: false, fineHover: narrow ? false : fineHover, schedule, root: page,
    /* fixedImg on every width (the rebuild): the frame is CSS-placed here
       too — the phone's top-right, the band's centre-right. */
    fixedImg: true, controllers: svImgCtl, moveGate: !narrow, treatment: 'indent', tap: !narrow,
  }));

  /* ── SCROLL-ACTIVE ROWS (R3): between hovers, the row under the
     viewport centre is the table's active row — its text indents
     (the landing reel's slide vocabulary, same constants) and the
     fixed frame shows ITS image via the machinery's own swap
     runner, so scroll and hover can never disagree about what the
     frame shows. Hover (or keyboard focus) takes over exactly as
     before; leaving releases to whatever the scroll position then
     dictates. */
  const SV6_SLIDE_X_PX = 40;
  const SV6_SLIDE_S = 0.5;
  const SV6_SLIDE_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  if (!reduced || phone) {
    /* the narrow build's indent is its own token (services-narrow.css:
       24 phone (the landing rows' --sreel-slide-x) / 24 band — the
       desktop's 40 for the narrower measure) */
    page.style.setProperty('--sv6-slide-x', `${narrow ? readPx('--sv-slide-x', 16) : SV6_SLIDE_X_PX}px`);
    page.style.setProperty('--sv6-slide-s', `${SV6_SLIDE_S}s`);
    page.style.setProperty('--sv6-slide-ease', SV6_SLIDE_EASE);
  }
  /* ═══ B1 — THE PHONE'S FIXED FRAME (Oscar, 2026-09-10) ═══
     One 130×180 frame FIXED at the viewport's vertical middle, its right
     edge 24 from the viewport's right (services-narrow.css .sv6-mframe),
     shared by the three lists. The row whose box holds the midpoint is
     the ACTIVE row: it indents (the landing rows' 24 / 0.5s / house
     state curve — the same --sv6-slide-* vars) and the frame WIPES to
     its image through the WHAT WE DO swap (img-wipe.js: 450ms clip-path
     wipe, 6px edge blur, the under layer decoded first). The rows travel
     to the frame; the frame never moves — so the active row's text is by
     construction the one at the midpoint, the image centred on it within
     the row's own 50 (reported). HYSTERESIS: a neighbour claims the
     midpoint only once it is M_ROW_HYST_PX inside its box; the holder
     keeps it to the same distance past its edges. ENTRY / EXIT: the frame
     is off between lists — it fades + rises in (the media beat, 0.8s /
     16px) as the first row's box claims the midpoint, adopting that
     row's image outright (nothing to wipe from while unseen), and leaves
     the same way once the last row's box has passed; mirrored on the
     way back up. Scroll-driven only — no hover, no tap (the machinery's
     tap path is off on the phone). RM: states without motion — the wipe
     module swaps outright, the CSS drops the frame's and the indent's
     transitions. */
  if (phone) {
    const tables = svImgCtl.map((ctl) => ctl.section).filter((s) => s instanceof HTMLElement);
    const rowsOf = tables.map((t) => Array.from(t.querySelectorAll('[data-sv-row]')).filter((r) => r instanceof HTMLElement));
    if (tables.length) {
      const frame = document.createElement('div');
      frame.className = 'sv6-mframe';
      frame.setAttribute('data-sv6-mframe', '');
      frame.setAttribute('aria-hidden', 'true');
      const mkImg = (cls) => {
        const img = document.createElement('img');
        img.className = cls;
        img.alt = '';
        img.decoding = 'async';
        return img;
      };
      const under = mkImg('sv6-mframe__img sv6-mframe__img--under');
      const over = mkImg('sv6-mframe__img');
      frame.append(under, over);
      page.appendChild(frame);
      const wipe = createImageWipe({ over, under, srcFor: (src) => src, reduced, initial: null });
      let on = false;
      let curT = -1;
      let curR = -1;
      const setActive = (t, r) => {
        if (t === curT && r === curR) return;
        if (curT >= 0) rowsOf[curT][curR]?.classList.remove('is-sactive');
        curT = t;
        curR = r;
        if (t < 0) {
          if (on) { on = false; frame.classList.remove('is-on'); }
          return;
        }
        const row = rowsOf[t][r];
        row.classList.add('is-sactive');
        const src = row.dataset.img || '';
        if (!on) {
          on = true;
          wipe.set(src);
          frame.classList.add('is-on');
        } else {
          wipe.request(src);
        }
      };
      const measure = () => {
        const mid = (window.innerHeight || 0) / 2;
        if (curT >= 0) {
          const r = rowsOf[curT][curR].getBoundingClientRect();
          if (mid >= r.top - M_ROW_HYST_PX && mid < r.bottom + M_ROW_HYST_PX) return; /* the holder keeps it */
        }
        for (let t = 0; t < tables.length; t += 1) {
          const rows = rowsOf[t];
          for (let r = 0; r < rows.length; r += 1) {
            const b = rows[r].getBoundingClientRect();
            if (mid >= b.top + M_ROW_HYST_PX && mid < b.bottom - M_ROW_HYST_PX) { setActive(t, r); return; }
          }
        }
        setActive(-1, -1);
      };
      let raf = 0;
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      schedule(measure, 600); /* the initial state once layout settles */
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        window.cancelAnimationFrame(raf);
        wipe.dispose();
        frame.remove();
      });
      if (import.meta.env.DEV) {
        window.__sv6Frame = { active: () => [curT, curR], on: () => on, frame };
      }
    }
  } else if (!reduced) {
    svImgCtl.forEach((ctl) => {
      const { section } = ctl;
      const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
      if (!rows.length) return;
      let hoverOn = false;
      let scrollCand = -1;
      let cur = -1;
      const setIndent = (idx) => {
        if (cur === idx) return;
        if (cur >= 0) rows[cur]?.classList.remove('is-sactive');
        cur = idx;
        if (idx >= 0) rows[idx]?.classList.add('is-sactive');
      };
      const applyState = () => {
        if (hoverOn) return;
        setIndent(scrollCand);
        if (scrollCand >= 0) ctl.showImage(rows[scrollCand]);
        else ctl.clearImage();
      };
      const measure = () => {
        const centre = (window.innerHeight || 1080) / 2;
        let cand = -1;
        for (let i = 0; i < rows.length; i += 1) {
          const r = rows[i].getBoundingClientRect();
          if (centre >= r.top && centre < r.bottom) { cand = i; break; }
        }
        if (cand !== scrollCand) {
          scrollCand = cand;
          applyState();
        }
      };
      let raf = 0;
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      schedule(measure, 600); /* initial state once layout settles */
      const enter = () => {
        hoverOn = true;
        setIndent(-1);
      };
      const leave = () => {
        hoverOn = false;
        applyState();
      };
      if (fineHover) {
        /* The machinery's moveGate discriminator, mirrored (the root
           cause of the dead indent: pointerenter fired the moment
           the full-width section slid under the RESTING cursor and
           parked the table in hover mode for the whole pass, while
           synthetic pointerovers — measured 40 per stationary wheel
           pass, 0 pointermoves — retargeted the treatment
           chaotically). An over without recent real movement is
           scroll: the section stays in scroll mode. Real movement
           over a row hands over to hover; real movement elsewhere
           releases. */
        const MOVE_FRESH_MS = 150;
        let lastMoveT = -1e9;
        const decide = (e) => {
          const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
          if (row instanceof HTMLElement && section.contains(row)) {
            if (!hoverOn) enter();
          } else if (hoverOn) {
            leave();
          }
        };
        const onMove = (e) => {
          lastMoveT = performance.now();
          decide(e);
        };
        const onOver = (e) => {
          if (performance.now() - lastMoveT > MOVE_FRESH_MS) {
            if (hoverOn) leave();
            return;
          }
          decide(e);
        };
        section.addEventListener('pointerover', onOver);
        section.addEventListener('pointermove', onMove);
        section.addEventListener('pointerleave', leave);
        section.addEventListener('focusin', enter);
        const onFocusOut = (e) => {
          const next = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-sv-row]') : null;
          if (!next || !section.contains(next)) leave();
        };
        section.addEventListener('focusout', onFocusOut);
        cleanups.push(() => {
          section.removeEventListener('pointerover', onOver);
          section.removeEventListener('pointermove', onMove);
          section.removeEventListener('pointerleave', leave);
          section.removeEventListener('focusin', enter);
          section.removeEventListener('focusout', onFocusOut);
        });
      }
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.cancelAnimationFrame(raf);
      });
    });
  }

  /* ── The dark band — CONNECT image bottom → AMPLIFY image top. */
  const band = page.querySelector('[data-sv6-darkband]');
  const sizeBand = () => {
    /* (the rebuild: the band is the desktop's own layer on every width) */
    const connect = page.querySelector('#connect');
    const amplify = page.querySelector('#amplify');
    if (!(band instanceof HTMLElement) || !(connect instanceof HTMLElement) || !(amplify instanceof HTMLElement)) return;
    const pageTop = page.getBoundingClientRect().top;
    /* THE PHONE (0:19): the frame's edges fall INSIDE the two pillar
       images — 163 below CONNECT's top, 169 below AMPLIFY's — not on
       their edges; built as drawn (the margins beside each image step
       from one ground to the other at the rest width; flagged). */
    const top = phone
      ? connect.getBoundingClientRect().top - pageTop + M_BAND_INTO_CONNECT_PX
      : connect.getBoundingClientRect().bottom - pageTop;
    const bottom = amplify.getBoundingClientRect().top - pageTop + (phone ? M_BAND_INTO_AMPLIFY_PX : 0);
    band.style.top = `${top.toFixed(0)}px`;
    band.style.height = `${(bottom - top).toFixed(0)}px`;
  };

  /* ── Fragmented statements — stage height from the line count,
     then the SHARED centred dwell (layout, runs under RM too). */
  const fragCleanups = [];
  page.querySelectorAll('[data-sv6-frag]').forEach((sec) => {
    const stage = sec.querySelector('[data-sv6-frag-stage]');
    if (!(stage instanceof HTMLElement)) return;
    const lines = stage.querySelectorAll('[data-sv6-frag-line]');
    let maxTop = 0;
    lines.forEach((l) => { maxTop = Math.max(maxTop, parseFloat(l.style.top) || 0); });
    stage.style.setProperty('--sv6-frag-h', `${maxTop + FRAG_LINE_H_PX}px`);
    /* R4 (Oscar 2026-08-27, the landing closing precedent): centred
       between the NAV WORDMARK's bottom and the viewport bottom —
       the dwell's own topBound derivation, measured live. R6: the
       centring anchors to the text's INK (statement-dwell's shared
       measurement), one derivation with the landing closing. */
    fragCleanups.push(initStatementDwell(sec, stage, {
      topBound: () => {
        const tb = document.querySelector('.home__topbar');
        return tb instanceof HTMLElement ? tb.getBoundingClientRect().bottom : 0;
      },
      /* narrow (the rebuild): the lines sit on a grid with no baked
         paddings, so box centring is ink centring — the closing
         statement's own narrow rule; the hold is the narrow constant. */
      inkLines: narrow ? undefined : () => Array.from(sec.querySelectorAll('[data-sv6-frag-line]')),
      allowNarrow: narrow,
      holdPx: narrow ? FRAG_HOLD_PX_M : undefined,
    }));
  });
  cleanups.push(() => fragCleanups.forEach((fn) => fn()));
  /* THE PHONE: the frame's 222 from the gallery's caption row to the
     fragment's first line — the pinned gallery leaves its content 52
     above the section's end (--sv-gal-pad-bottom) and the dwell pads
     the fragment's top to centre it; the margin is whatever remains
     (0 at 874, where the dwell's own pad already exceeds the frame's
     gap — reported). Re-derived with the dwell on every resize. */
  const applyFragMargins = () => {
    if (!phone) return;
    page.querySelectorAll('[data-sv6-frag]').forEach((sec) => {
      if (!(sec instanceof HTMLElement)) return;
      const pad = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      const galPad = readPx('--sv-gal-pad-bottom', 52);
      sec.style.setProperty('--sv6-frag-margin', `${Math.max(0, Math.round(M_FRAG_GAP_PX - galPad - pad))}px`);
    });
  };
  applyFragMargins();

  /* ── The closing statement (R36 item 7): the shared driver — dwell,
     white → red scrub, nav-over-red, entrance (closing-statement.js). */
  /* R79 (Oscar, 2026-09-05): the nav goes SOLID BLACK from the end of
     the last rows table — WE CREATE, the one ending "Design Systems &
     Brand Assets" — and stays solid to the foot of the page, rather
     than switching at the red band's own top. Scoped to the desktop
     build's own tables (`.sv6`): the legacy mobile markup carries the
     same data attribute and must not be picked up. */
  const sv6Rows = document.querySelectorAll('.sv6 [data-sv-rows]');
  cleanups.push(initClosingStatement({ reduced, solidNavFrom: sv6Rows[sv6Rows.length - 1] ?? null }));

  /* ── Galleries — the featured pattern: derived travel, sticky
     pin, 1:1 scrub. With the frame's six 273px boxes the strip
     fits the viewport and the derived travel is 0 (the pin
     degenerates to a pass-through) — any additional images in the
     data create real travel with no code change. */
  const gals = Array.from(page.querySelectorAll('[data-sv6-gal]'));
  const galTravel = (gal) => {
    const strip = gal.querySelector('[data-sv6-gal-strip]');
    if (!(strip instanceof HTMLElement)) return 0;
    return Math.max(strip.scrollWidth + 24 + 24 - (window.innerWidth || 1728), 0);
  };
  const galTweens = [];
  const buildGals = () => {
    if (narrow) return; /* native swipe strips on the narrow build */
    gals.forEach((gal) => {
      const stage = gal.querySelector('[data-sv6-gal-stage]');
      const strip = gal.querySelector('[data-sv6-gal-strip]');
      if (!(strip instanceof HTMLElement) || !(stage instanceof HTMLElement)) return;
      /* Items 7/8 (Oscar R2): the stage's natural content height
         feeds the CENTRE PIN (sticky top = 50dvh - h/2, the dwell
         derivation); the scrub window starts exactly at the pin. */
      gal.style.removeProperty('--sv6-gal-stage-h');
      const h = stage.offsetHeight;
      gal.style.setProperty('--sv6-gal-stage-h', `${h}px`);
      /* R4 (Oscar 2026-08-27, the landing closing precedent): the
         pinned stage centres between the NAV WORDMARK's bottom and
         the viewport bottom — sticky top gains tb/2 (the CSS calc
         reads --sv6-gal-tb) and the scrub start shifts with it so
         the travel window still begins exactly at the pin. */
      const topBar = document.querySelector('.home__topbar');
      const tb = topBar instanceof HTMLElement ? topBar.getBoundingClientRect().bottom : 0;
      gal.style.setProperty('--sv6-gal-tb', `${tb.toFixed(1)}px`);
      const t = galTravel(gal);
      gal.style.setProperty('--sv6-gal-runway', `${t.toFixed(0)}px`);
      if (t <= 0 || reduced) return;
      const tween = gsap.to(strip, {
        x: () => -galTravel(gal),
        ease: 'none',
        scrollTrigger: {
          trigger: gal,
          start: () => `top ${Math.round(((window.innerHeight || 1080) - h + tb) / 2)}px`,
          end: () => `+=${galTravel(gal)}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      galTweens.push(tween);
    });
  };
  cleanups.push(() => galTweens.forEach((tw) => { tw.scrollTrigger?.kill(); tw.kill(); }));
  /* ITEM 3 (Oscar, 2026-09-09) — on the phone each gallery's native
     strip carries the shared rail veils (rail-veils.js; the paint is
     shared-narrow.css's on .sv6-gal's pseudo-elements, anchored in
     services-narrow.css): right only at the start, both once scrolled,
     left only at the end. The band is the boxes' image band — the first
     box's image, measured, since the wrapped title above sets where the
     strip begins. The strips had no veils before. */
  /* ═══ B2 — THE PHONE'S PINNED GALLERIES (Oscar, 2026-09-10) ═══
     Featured Work's mechanic, the shared module (m-pinned-rail.js): the
     stage mounts in a pin wrapper one small viewport + the travel tall
     and pins at the viewport's top with its content at its foot (52
     from the visible edge, translated by --m-vv-dy so the browser's bar
     never moves it); the strip travels RIGHT 1:1 with the scroll and
     ends with the LAST image's right edge 16 from the viewport's right
     (travel = the strip's laid-out width − the viewport; 1170 at 402);
     the pin releases and the flow resumes. Captions and arrows are
     inside the boxes, so they travel with the rail. THE VEILS (B3): the
     shared rail-veil state written from the scrub's progress, painted on
     the stage over the images' band exactly (bottom-anchored in CSS).
     THE ARRIVAL: the section's margin is derived so the list's end line
     above sits the frame's 64 over the heading at the pin moment (the
     tail of the list stays in view while the gallery rolls). RM: no pin —
     the native snap strip with the shared veils (the rebuild's path). */
  const galRails = [];
  if (phone && !reduced) {
    gals.forEach((gal) => {
      const stage = gal.querySelector('[data-sv6-gal-stage]');
      const strip = gal.querySelector('[data-sv6-gal-strip]');
      const title = gal.querySelector('[data-sv6-gal-title]');
      const boxes = Array.from(gal.querySelectorAll('[data-sv6-gal-box]')).filter((b) => b instanceof HTMLElement);
      if (!(gal instanceof HTMLElement) || !(stage instanceof HTMLElement) || !(strip instanceof HTMLElement)) return;
      const { pin, unmount } = mountPinnedRail(gal, stage, { pinClass: 'sv6-gal__pin' });
      const contentH = () => (title instanceof HTMLElement
        ? strip.getBoundingClientRect().bottom - title.getBoundingClientRect().top
        : strip.getBoundingClientRect().height);
      /* Featured Work's ride (landing-featured.js applyArrival): the
         section rides UP on a negative margin — the pin wrapper's top
         sits under the list's tail — so that at the pin moment the end
         line above stands the gap over the heading (the heading rests
         svh − pad − content below the pin's top); the tail then scrolls
         away over the travel's first stretch while the gallery holds. */
      const applyArrival = () => {
        const svh = smallViewportPx() || window.innerHeight || 0;
        const padB = readPx('--sv-gal-pad-bottom', 52);
        const headingRest = svh - padB - contentH();
        gal.style.setProperty('--sv6-gal-margin', `${Math.round(M_GAL_ARRIVE_GAP_PX - headingRest)}px`);
      };
      applyArrival();
      const rail = drivePinnedRail({
        section: gal, strip, items: boxes, pin, travelProp: '--sv6-gal-travel',
        onRefreshInit: applyArrival,
      });
      galRails.push({ gal, pin, stage, title, rail });
      cleanups.push(() => {
        rail.cleanup();
        unmount();
        gal.style.removeProperty('--sv6-gal-margin');
      });
    });
  } else if (isPhoneViewport()) {
    /* ITEM 3 (Oscar, 2026-09-09) — RM keeps the native strip: each
       gallery's strip carries the shared rail veils (rail-veils.js; the
       paint is shared-narrow.css's on .sv6-gal's pseudo-elements,
       anchored in services-narrow.css): right only at the start, both
       once scrolled, left only at the end. The band is the boxes' image
       band — the first box's image, measured. */
    gals.forEach((gal) => {
      const strip = gal.querySelector('[data-sv6-gal-strip]');
      const band = gal.querySelector('[data-sv6-gal-box] img');
      if (!(gal instanceof HTMLElement) || !(strip instanceof HTMLElement)) return;
      cleanups.push(wireRailVeils(gal, strip, { band: band instanceof HTMLElement ? band : null }));
    });
  }

  sizeBand();
  buildGals();

  /* ── Statement accent bars — derived from the rendered ink
     (statement-bar.js; Oscar's spanning rule, 2026-08-27). The SSR
     barH inline heights remain only as the no-JS fallback. Layout,
     not choreography — runs under RM too. */
  page.querySelectorAll('[data-sv6-st]').forEach((sec) => {
    cleanups.push(initStatementBar(
      sec.querySelector('[data-sv6-bar]'),
      sec.querySelector('[data-sv6-statement]'),
    ));
  });

  const onResize = () => { sizeBand(); applyFragMargins(); };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* ── Back-to-top (footer) — navigation, all modes. */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTop = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };
  topLinks.forEach((l) => l.addEventListener('click', onTop));
  cleanups.push(() => topLinks.forEach((l) => l.removeEventListener('click', onTop)));

  if (reduced) {
    /* RM: static page — dwells (layout) applied above; sv-rows'
       own RM path (colour fill only) is inside the machinery. */
    sizeBand();
    return () => { cleanups.forEach((fn) => fn()); timeouts.forEach(clearTimeout); };
  }

  /* ── Entrances (live vocabulary). */
  const triggers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  /* The dark band's edges are MEASURED from the CONNECT/AMPLIFY
     pillars, so any reflow above them (a font swap re-wrapping a
     statement, the reveal wraps landing) must re-derive it — caught
     on the SemiBold pass: a 54px (one 56/54 statement line) stale
     band. refreshInit runs before every ScrollTrigger measurement
     pass, which is exactly when layout is final. */
  const onRefreshInit = () => { sizeBand(); applyFragMargins(); };
  ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
  cleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', onRefreshInit));

  fontsReady.then(() => {
    if (disposed) return;
    sizeBand();
    ScrollTrigger.refresh();
    /* And once more on the house settle tick — the statement wraps
       below run after this refresh. */
    schedule(() => { sizeBand(); }, 600);

    /* Hero — word reveals at load. THE PHONE: the two faces wrap
       separately so FROM / ACCESS. (the frame's two authored lines —
       the serif block wraps at its widest word) rise as two lines on the
       0.12 stagger, then TO IMPACT., then the description. */
    const heroTitle = page.querySelector('[data-sv6-hero-title]');
    const heroDesc = page.querySelector('[data-sv6-hero-desc]');
    if (phone) {
      let heroDelay = 0;
      [page.querySelector('.sv6-hero__t-serif'), page.querySelector('.sv6-hero__t-sans'), heroDesc].forEach((line) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(heroDelay);
        wrapWordRevealElement(line);
        playLineRevealElement(line);
        const tops = new Set(Array.from(line.querySelectorAll(':scope > .lr-clip')).map((c) => Math.round(c.offsetTop / 4)));
        heroDelay += LINE_STAGGER_S * Math.max(1, tops.size);
      });
    } else {
      [heroTitle, heroDesc].forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
        playLineRevealElement(line);
      });
    }

    /* Pillar heroes — R3 (Oscar 2026-08-27): the landing hero
       video's margins->full-bleed expansion, ported (power1.inOut
       inside the scrub, the hero's 700px window; unpinned — the
       scrub rides the section's own arrival). ONE var drives the
       image clip AND the text anchor (services-6.css), scrubbed
       and reversible. START is derived per pillar: 8px above its
       load position when it sits in the first viewport (pillar 1 at
       ~507 must SHOW the rest state at load and expand on the
       first scroll — the R2 titles-only-on-scroll intent carried
       forward), else at 85% for the pillars that arrive by scroll.
       TEXT ENTRANCE (supersedes the R2 'top 40%' trigger): the
       reveal fires when the image's edges MEET the viewport sides —
       detected as the expansion scrub completing (inset 0), not a
       scroll offset. Still scroll-only by construction. */
    page.querySelectorAll('.sv6-pillar').forEach((sec) => {
      const lines = Array.from(sec.querySelectorAll('[data-sv6-line]'));
      lines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      /* The IMAGE's own earlier beat: visible as soon as its section
         is in view — at load for pillar 1. R4 (Oscar 2026-08-27,
         symmetric reverse): no longer once — leaving back re-arms
         the arrival fade, so re-entry plays it again (the section is
         below the viewport at that point; nothing pops visibly). */
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 95%',
        onEnter: () => {
          sec.querySelector('.sv6-pillar__img')?.classList.add('is-visible');
        },
        onLeaveBack: () => {
          sec.querySelector('.sv6-pillar__img')?.classList.remove('is-visible');
        },
      }));
      /* R4 (Oscar 2026-08-27): the texts are a pure function of the
         scrub — played when the image's edges MEET the viewport
         sides (progress 1), RETIRED the moment they leave them going
         up (the landing-network hideGroup grammar: clips re-clip
         with no stagger, delays restored for the next play). The old
         one-shot `played` flag never reset — scrolled back up, the
         titles sat stuck over the contracted image (the asymmetric-
         teardown class). */
      let played = false;
      const playTexts = () => {
        if (played) return;
        played = true;
        lines.forEach((l) => {
          if (!(l instanceof HTMLElement)) return;
          l.querySelectorAll('.lr-inner').forEach((inner) => {
            inner.style.transitionDelay = '';
          });
          playLineRevealElement(l);
        });
      };
      const hideTexts = () => {
        if (!played) return;
        played = false;
        lines.forEach((l) => {
          if (!(l instanceof HTMLElement)) return;
          l.querySelectorAll('.lr-inner').forEach((inner) => {
            inner.style.transitionDelay = '0s';
          });
          l.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
            clip.classList.remove('lr-visible');
          });
        });
      };
      const expand = gsap.fromTo(sec,
        { '--sv6-hero-inset': `${restInset}px` },
        {
          '--sv6-hero-inset': '0px',
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: sec,
            start: () => {
              const vh = window.innerHeight || 1080;
              const docTop = sec.getBoundingClientRect().top + window.scrollY;
              const entry = Math.min(vh * 0.85, docTop - 8);
              return `top ${Math.round(entry)}px`;
            },
            end: () => `+=${expandPx}`, /* the hero's VIDEO_EXPAND_PX (700) on wide; 420 on narrow */
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              /* R5 (Oscar 2026-08-27, asymmetric BY DESIGN): the
                 ENTRANCE fires almost as the expansion starts moving
                 — the measured inset shrinking SV6_TEXT_ENTER_EXPAND_PX
                 past its 24px rest (read from the section's live
                 --sv6-hero-inset, the one value the image clip
                 derives from — never a scroll offset). The EXIT keeps
                 the shipped edge-contact-leave threshold verbatim
                 (progress < 0.999 — byte-identical reverse timing).
                 The split is a direction-gated hysteresis band, not a
                 latch: downward crossings play, upward crossings
                 retire, every leg stays scrubbed — repeated passes
                 and mid-band reversals re-derive cleanly. */
              const inset = parseFloat(
                getComputedStyle(sec).getPropertyValue('--sv6-hero-inset'),
              );
              if (self.direction >= 0) {
                if (Number.isFinite(inset)
                  && inset <= restInset - SV6_TEXT_ENTER_EXPAND_PX) playTexts();
              } else if (self.progress < 0.999) {
                hideTexts();
              }
            },
          },
        });
      triggers.push(expand.scrollTrigger);
      cleanups.push(() => expand.kill());
    });

    /* Statements — word reveal + the bar draw (the case-study intro
       convention). */
    page.querySelectorAll('[data-sv6-st]').forEach((sec) => {
      const text = sec.querySelector('[data-sv6-statement]');
      if (text instanceof HTMLElement) wrapWordRevealElement(text);
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          if (text instanceof HTMLElement) playLineRevealElement(text);
          sec.querySelector('[data-sv6-bar]')?.classList.add('is-visible');
        },
      }));
    });

    /* Tables — the shipped sv-rows draw: rows' dividers + texts
       stagger at 60ms, the endline last (services-v2's own beat,
       replicated for the new host). */
    page.querySelectorAll('[data-sv-rows]').forEach((section) => {
      const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
      const endline = section.querySelector('[data-sv-rows-end]');
      const label = section.querySelector('.sv-rows__label');
      if (label instanceof HTMLElement) wrapWordRevealElement(label);
      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          if (label instanceof HTMLElement) playLineRevealElement(label);
          rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * ROW_STAGGER_MS));
          if (endline instanceof HTMLElement) {
            schedule(() => endline.classList.add('is-visible'), rows.length * ROW_STAGGER_MS);
          }
        },
      }));
    });

    /* Galleries — title first, then the boxes one by one (the
       landing featured arrival: 100ms L→R). */
    gals.forEach((gal) => {
      /* Item 5: each title LINE wraps individually (wrapping the
         whole h3 flattened the explicit two-line break). */
      const titleLines = Array.from(gal.querySelectorAll('.sv6-gal__titleline'));
      const boxes = Array.from(gal.querySelectorAll('[data-sv6-gal-box]'));
      titleLines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      /* THE PHONE'S PINNED GALLERY: the section's top is the pin
         wrapper's, a small viewport above the content — the cue is
         derived so the TITLE (sticky, at the stage's foot) crosses the
         same 65% line: pin top = 0.65·vh − (stage bottom − title top)
         offset by the stage's height. Re-derived on refresh. */
      const pinned = galRails.find((g) => g.gal === gal);
      triggers.push(ScrollTrigger.create({
        trigger: gal,
        start: pinned
          ? () => {
            const vh = window.innerHeight || 0;
            const stageR = pinned.stage.getBoundingClientRect();
            const titleTop = pinned.title instanceof HTMLElement ? pinned.title.getBoundingClientRect().top : stageR.top;
            return `top ${Math.round(vh * 0.65 - (stageR.height - (stageR.bottom - titleTop)))}px`;
          }
          : 'top 65%',
        once: true,
        onEnter: () => {
          titleLines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l));
          boxes.forEach((box, i) => schedule(() => box.classList.add('is-visible'), 300 + i * BOX_STAGGER_MS));
        },
      }));
    });

    /* Fragmented statements — per-line word reveal on the closing
       convention (65%, once, 0.12 DOM-order stagger). */
    page.querySelectorAll('[data-sv6-frag]').forEach((sec) => {
      const lines = Array.from(sec.querySelectorAll('[data-sv6-frag-line]'));
      lines.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: sec,
        start: 'top 65%',
        once: true,
        onEnter: () => lines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l)),
      }));
    });

    /* Footer — the shared choreography at its approach. */
    const footer = document.querySelector('.sv6-footwrap .landing-footer') || document.querySelector('.landing-footer');
    let wrapped = { wordEls: [], img: null };
    if (footer instanceof HTMLElement) {
      wrapped = wrapFooterReveals(footer);
      /* narrow: the footer sits under the page until the spacer scrolls it
         clear (the sticky uncover) — the cue is the spacer 200 into the
         viewport, the landing's narrow footer cue. */
      const spacer = narrow ? flowFooterSpacer('.sv6-footspacer') : null;
      triggers.push(ScrollTrigger.create({
        trigger: spacer ?? footer,
        start: spacer ? 'top bottom-=200' : 'top 90%',
        once: true,
        onEnter: () => playFooterReveals(wrapped, (fn, ms) => schedule(fn, ms)),
      }));
    }
  });

  cleanups.push(() => {
    disposed = true;
    triggers.forEach((t) => t.kill());
    timeouts.forEach(clearTimeout);
  });

  /* ── Bottom behaviours — the case-study/landing pair, verbatim:
     the two centred nav items sweep out at the very bottom (back in
     on the way up), 2s idle snap inside the footer reveal. */
  /* R36 (Oscar, 2026-09-04): the SHARED bottom binder (nav-motion.js)
     — sweep, hysteresis and the idle snap inside the footer's height,
     one implementation on every document-scroll page. */
  /* every width (the rebuild): the sweep is the band's; the idle snap
     gates itself off on narrow viewports (nav-motion.js). */
  cleanups.push(bindBottomNavSweep({ reduced, getLenis: getLenisInstance }));

  if (import.meta.env.DEV) {
    window.__services6 = {
      galTravel: () => gals.map((g) => galTravel(g)),
    };
  }

  return () => cleanups.forEach((fn) => fn());
}
