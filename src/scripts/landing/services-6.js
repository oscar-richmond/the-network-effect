/**
 * /services — the "Option 6" desktop driver (frame 38:2420,
 * 2026-08-26). DESKTOP ONLY: the page script initialises this above
 * the seam and the legacy services-v2 driver below it.
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
const SV6_TEXT_ENTER_EXPAND_PX = 4;
/* The landing's bottom pair (audit fix, 2026-08-27 — this build had
   NEITHER behaviour: the nav exit and idle snap only ever lived in
   services-v2.js, which initialises below the seam. Constants are
   the case-study/contact pair, verbatim). */

export function initServices6() {
  const page = document.querySelector('[data-services-6]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');

  if (!reduced) cleanups.push(initSiteScroll());

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
    reduced, isMob: false, fineHover, schedule, root: page,
    fixedImg: true, controllers: svImgCtl, moveGate: true, treatment: 'indent',
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
  if (!reduced) {
    page.style.setProperty('--sv6-slide-x', `${SV6_SLIDE_X_PX}px`);
    page.style.setProperty('--sv6-slide-s', `${SV6_SLIDE_S}s`);
    page.style.setProperty('--sv6-slide-ease', SV6_SLIDE_EASE);
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
    const connect = page.querySelector('#connect');
    const amplify = page.querySelector('#amplify');
    if (!(band instanceof HTMLElement) || !(connect instanceof HTMLElement) || !(amplify instanceof HTMLElement)) return;
    const pageTop = page.getBoundingClientRect().top;
    const top = connect.getBoundingClientRect().bottom - pageTop;
    const bottom = amplify.getBoundingClientRect().top - pageTop;
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
      inkLines: () => Array.from(sec.querySelectorAll('[data-sv6-frag-line]')),
    }));
  });
  cleanups.push(() => fragCleanups.forEach((fn) => fn()));

  /* ── The closing statement (R36 item 7): the shared driver — dwell,
     white → red scrub, nav-over-red, entrance (closing-statement.js). */
  cleanups.push(initClosingStatement({ reduced }));

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

  const onResize = () => { sizeBand(); };
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
  const onRefreshInit = () => sizeBand();
  ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
  cleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', onRefreshInit));

  fontsReady.then(() => {
    if (disposed) return;
    sizeBand();
    ScrollTrigger.refresh();
    /* And once more on the house settle tick — the statement wraps
       below run after this refresh. */
    schedule(() => { sizeBand(); }, 600);

    /* Hero — word reveals at load. */
    const heroTitle = page.querySelector('[data-sv6-hero-title]');
    const heroDesc = page.querySelector('[data-sv6-hero-desc]');
    [heroTitle, heroDesc].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });

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
        { '--sv6-hero-inset': '24px' },
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
            end: '+=700', /* the hero's VIDEO_EXPAND_PX, reused */
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
                  && inset <= SV6_HERO_REST_INSET_PX - SV6_TEXT_ENTER_EXPAND_PX) playTexts();
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
      triggers.push(ScrollTrigger.create({
        trigger: gal,
        start: 'top 65%',
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
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: 'top 90%',
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
  cleanups.push(bindBottomNavSweep({ reduced, getLenis: getLenisInstance }));

  if (import.meta.env.DEV) {
    window.__services6 = {
      galTravel: () => gals.map((g) => galTravel(g)),
    };
  }

  return () => cleanups.forEach((fn) => fn());
}
