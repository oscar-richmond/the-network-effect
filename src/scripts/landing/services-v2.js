/**
 * /services (NEW BUILD) — page driver.
 *
 * SCROLL: native document scroll through Lenis — the landing boot
 * verbatim (lerp 0.065), same as the case-study page.
 *
 * HERO WAVE — the /old 01-IMMERSE pillar-hero mechanic PORTED from
 * about-3/landing-scroll.js: track base scrub to -waveTravel with
 * per-item drift ((speed−1)×travel) composing on top;
 * waveTravel = max((offsetTop+height)/speed) so the slowest item
 * still fully clears the stage top by wave end; LAST-ITEM CONTRACT
 * (red-room-dinner: max y, speed 1.0). ADAPTED: fixed-stage +
 * virtual runway becomes position:sticky + a real section height
 * (100dvh + window); the window derives from /old's felt pace —
 * WAVE_SCROLL_PX(3600) × travel / oldTravel, where oldTravel is
 * /old wave 0's travel at the same stage height (offsets 546/577,
 * both speed-1.0 bound) — so px-per-scroll matches /old exactly.
 *
 * HOVER ROWS — the page's one new mechanic (see the plan report):
 * class-driven states (rapid retargeting free), a single persistent
 * activation path shared by pointer and keyboard focus, per-row
 * marquee tracks built once after fonts settle (unit = "NN /  TEXT"
 * at Dazzed SemiBold 22; shift = unit+80 gap; duration = shift/35
 * px/s — the network-marquee family speed), the per-section image
 * repositioned + src-swapped per row with the house blur/fade
 * replay. Gated (hover:hover)+(pointer:fine) for pointers; focus
 * always works; RM = colour fill only (CSS gates the rest).
 *
 * GROUND FADE — #EEEEF0 → #161616 scrubbed across the 500px runway
 * div (TRANSITION_GROUND_FADE_PX, the landing grammar): starts as
 * the runway's top crosses the viewport bottom, completes exactly
 * as the access statement's top arrives there. Reversible by scrub.
 * The fixed nav's difference blend is untouched (it composites
 * against whatever is beneath).
 *
 * FOOTER/BOTTOM — the case-study blocks verbatim: covered-trigger
 * footer reveal maths (top = innerHeight − 811 − 200), back-to-top
 * via Lenis, bottom nav sweep + 2s idle snap.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { initSvRowsSections } from './sv-rows.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { ensureLogoChars, ensureNavLinkChars, applyNavSweep, getSweptNavParts } from './nav-motion.js';
import { createServicesHeroWave } from './services-hero-wave.js';
import { isMobileViewport } from './viewport.js';
import { initStatementDwell } from './statement-dwell.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
/* Wave pace port (see header): /old's window over /old's wave-0
   travel at the same stage height. */
const OLD_WAVE_SCROLL_PX = 3600;
const OLD_WAVE_LAST_Y = 546; // /old wave 0: red-room-dinner offset
const OLD_WAVE_LAST_H = 577;
/* Ground fade — the landing constant (landing-featured.js). */
const GROUND_FADE_FROM = '#eeeef0';
const GROUND_DARK = '#161616';
/* Pillar image treatment — the landing hero VIDEO's constants
   (landing-hero-scroll.js): 24px side band, 700px expand window
   (here ending exactly as the section tops the viewport),
   power1.inOut inside the scrub; ±80px parallax across the
   section's transit (the oversized-img/frame split). */
const PILLAR_MARGIN_PX = 24; // = VIDEO_MARGIN_PX
const PILLAR_EXPAND_PX = 700; // = VIDEO_EXPAND_PX
/* How far BEFORE full-bleed the pillar title/sub start revealing
   (Oscar's rev 8 — "slightly earlier"). Measured down the same
   700px expansion window: the text fires with ~17% of the opening
   still to run. */
const PILLAR_TEXT_LEAD_PX = 120;
const PILLAR_PARALLAX_PX = 80;
/* Bottom behaviours — the landing constants. */
const FOOTER_H_PX = 830; /* frame 13:381 (was 811) */
const BOTTOM_SNAP_IDLE_MS = 2000;
const BOTTOM_EPSILON_PX = 2;
const NAV_SHOW_HYSTERESIS_PX = 64;

export function initServicesV2() {
  const page = document.querySelector('[data-services-v2]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* The viewport.js seam — mobile keeps the reveals, the rows (with
     the tap path below) and the bottom behaviours; the hero wave,
     pillar clip/parallax scrubs and the desktop image-frame glide
     are gated where they occur. */
  const isMob = isMobileViewport();

  /* ── Scroll: the SHARED house boot (site-scroll.js — one source
     of truth for the uniform feel; non-RM only). `lenis` reads the
     live instance so later closures always see the current one. */
  if (!reduced) cleanups.push(initSiteScroll());
  const lenis = { get i() { return getLenisInstance(); } };

  /* ── HOVER ROWS — the shared machinery (sv-rows.js; extracted
     verbatim 2026-08-24 so the landing's row lists run the exact
     same behaviour — one definition, no drift). */
  cleanups.push(initSvRowsSections({ reduced, isMob, fineHover, schedule }));

  /* Back-to-top / home (all modes — navigation, not decoration). */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    if (lenis.i) lenis.i.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  /* ── Bottom behaviours — the case-study/landing pair, verbatim:
     nav sweep out at the very bottom, 2s idle snap inside the
     footer reveal. */
  ensureLogoChars();
  /* The swept links' own chars — unconditional (char-ripple's wrap
     is hover-gated; the WORK-doesn't-sweep cause). */
  ensureNavLinkChars();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced, parts: getSweptNavParts() });
  };
  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;
  const inSnapZone = () => maxScroll() - (window.scrollY || 0) < FOOTER_H_PX - BOTTOM_EPSILON_PX;
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown || !inSnapZone()) return;
    const y = window.scrollY || 0;
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) return;
    if (lenis.i) lenis.i.scrollTo(maxScroll(), { duration: 1.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
  };
  const onBottomScroll = () => {
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
  window.addEventListener('scroll', onBottomScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('scroll', onBottomScroll);
    window.clearTimeout(snapTimer);
  });

  /* ── THE STATEMENT DWELLS (R4, Oscar 2026-08-26): every statement
     block on this page — the three pillar intros and the access
     statement+note — gets the shared centred sticky hold
     (statement-dwell.js; one mechanism with the landing's
     fragmented statement). Layout, not motion: runs under RM,
     desktop-gated inside the helper, fonts-gated for real metrics.
     ScrollTrigger refreshes after so every element-anchored beat
     re-derives around the added slack. */
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (disposed) return; /* teardown-before-fonts: don't install dwells into a dead page */
    document.querySelectorAll('[data-sv-dwell]').forEach((sec) => {
      const stage = sec.querySelector('[data-sv-dwell-stage]');
      if (sec instanceof HTMLElement && stage instanceof HTMLElement) {
        cleanups.push(initStatementDwell(sec, stage));
      }
    });
    ScrollTrigger.refresh();
  });

  /* `disposed` is declared HERE, above the reduced-motion return below,
     because the statement-dwell callback installed earlier reads it when
     fonts resolve. Declared after that return (as it was) the RM path
     skipped its initialiser and the callback threw a temporal-dead-zone
     ReferenceError — "Cannot access 'disposed' before initialization" —
     on every mobile /services load with reduced motion, which also meant
     the dwells (documented as layout, not motion, and meant to run under
     RM) never installed. */
  let disposed = false;

  if (reduced) {
    /* RM: static page (sticky is layout; the wave rides plain
       scroll via the section's fallback height — no scrub, images
       simply scroll past). Hidden entrance states are gated
       no-preference in CSS. */
    return () => cleanups.forEach((fn) => fn());
  }

  const triggers = [];
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* ── HERO — word reveals at load (the house line vocabulary). */
    const heroTitle = document.querySelector('[data-sv-hero-title]');
    const heroSub = document.querySelector('[data-sv-hero-subtitle]');
    [heroTitle, heroSub].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });

    /* ── HERO WAVE — the ported mechanic. Desktop only: the mobile
       hero is linear (the track is display:none) — mounting the
       scrub + GL against a hidden track would burn a context for
       nothing (A4: zero GL on mobile). */
    const hero = document.querySelector('[data-sv-hero]');
    const stage = document.querySelector('[data-sv-hero-stage]');
    const track = document.querySelector('[data-sv-hero-track]');
    if (!isMob && hero instanceof HTMLElement && stage instanceof HTMLElement && track instanceof HTMLElement) {
      const items = Array.from(track.children).filter((el) => el instanceof HTMLElement);
      const itemSpeed = (item) => parseFloat(item.dataset.svWaveSpeed || '1') || 1;
      let waveTravel = 0;
      const measure = () => {
        waveTravel = 0;
        items.forEach((item) => {
          waveTravel = Math.max(waveTravel, (item.offsetTop + item.offsetHeight) / itemSpeed(item));
        });
        const stageH = stage.clientHeight || window.innerHeight;
        const oldTravel = stageH + OLD_WAVE_LAST_Y + OLD_WAVE_LAST_H;
        const windowPx = (OLD_WAVE_SCROLL_PX * waveTravel) / oldTravel;
        hero.style.setProperty('--sv-wave-runway', `${windowPx.toFixed(0)}px`);
        return windowPx;
      };
      measure();
      gsap.fromTo(track, { y: 0 }, {
        y: () => -waveTravel,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: () => `+=${measure().toFixed(0)}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      items.forEach((item, j) => {
        const speed = itemSpeed(item);
        if (speed === 1) return;
        gsap.fromTo(item, { y: 0 }, {
          y: () => -(speed - 1) * waveTravel,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: () => `+=${measure().toFixed(0)}`,
            scrub: true,
            invalidateOnRefresh: true,
            id: `sv-wave-drift-${j}`,
          },
        });
      });

      /* ── The access-wave shader on the travelling images (Oscar's
         rev): same treatment as the WE CREATE ACCESS columns —
         velocity bow + hover grain — adapted to per-item composed
         velocities (services-hero-wave.js). Gated inside the
         factory (house hover rule + ?forcehover); null = plain DOM
         images stand. */
      const waveCanvas = document.querySelector('[data-sv-hero-canvas]');
      if (waveCanvas instanceof HTMLCanvasElement) {
        const waveItems = items
          .map((frameEl) => ({
            frameEl,
            imgEl: frameEl.querySelector('img'),
            speed: itemSpeed(frameEl),
          }))
          .filter((it) => it.imgEl instanceof HTMLImageElement);
        const heroWave = createServicesHeroWave(
          stage,
          waveCanvas,
          waveItems,
          () => -(Number(gsap.getProperty(track, 'y')) || 0),
        );
        if (heroWave) {
          cleanups.push(() => heroWave.destroy());
          if (import.meta.env.DEV) window.__svHeroWave = heroWave;
        }
      }
    }

    /* ── Pillar images — the landing hero video treatment (Oscar's
       rev): the frame's clip opens from the 24px band to full-bleed
       over the ported 700px window, completing exactly as the
       section tops the viewport (power1.inOut inside the scrub);
       the oversized img rides the ±80px parallax across the whole
       transit. Both scrubbed — reversible by construction. */
    document.querySelectorAll('.sv-pillar').forEach((section) => {
      const frame = section.querySelector('[data-sv-pillar-frame]');
      const img = section.querySelector('[data-sv-pillar-img]');
      /* Mobile: the pillar is a static aspect box — no clip
         expansion, no parallax (the oversized-img ride would fight
         the static crop). */
      if (isMob) return;
      if (frame instanceof HTMLElement) {
        gsap.fromTo(frame, {
          clipPath: `inset(0px ${PILLAR_MARGIN_PX}px 0px ${PILLAR_MARGIN_PX}px)`,
        }, {
          clipPath: 'inset(0px 0px 0px 0px)',
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: section,
            start: () => `top ${PILLAR_EXPAND_PX}px`,
            end: 'top top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      }
      if (img instanceof HTMLElement) {
        gsap.fromTo(img, { y: PILLAR_PARALLAX_PX }, {
          y: -PILLAR_PARALLAX_PX,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      }
    });

    /* ── Pillar overlay texts — word reveals as the image NEARS
       full viewport width. The clip expansion completes at 'top
       top'; Oscar's rev 8 fires the text PILLAR_TEXT_LEAD_PX
       earlier, i.e. with the last ~17% of the 700px expansion still
       running, so the title is already arriving as the image
       finishes opening rather than starting after it. */
    document.querySelectorAll('.sv-pillar').forEach((section) => {
      const title = section.querySelector('[data-sv-pillar-title]');
      const sub = section.querySelector('[data-sv-pillar-sub]');
      [title, sub].forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: () => `top ${PILLAR_TEXT_LEAD_PX}px`,
        once: true,
        onEnter: () => {
          [title, sub].forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
        },
      }));
    });

    /* ── Statements + bars — the case-study intro convention. */
    document.querySelectorAll('[data-sv-intro]').forEach((intro) => {
      const statement = intro.querySelector('[data-sv-statement]');
      const sub = intro.querySelector('[data-sv-statement-sub]');
      [statement, sub].forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: intro,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          [statement, sub].forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
          intro.querySelector('[data-sv-bar]')?.classList.add('is-visible');
        },
      }));
    });

    /* ── Rows resting entrance (Oscar's rev 5) — each divider draws
       left-to-right with its row's text rising on the same beat,
       staggered top-to-bottom (60ms steps); the ENDLINE (the
       closing divider) draws LAST, one slot after the final row
       (it was a static border that appeared first — the bug). */
    /* (The hover machinery moved to sv-rows.js — this entrance keeps
       its own section query.) */
    Array.from(document.querySelectorAll('[data-sv-rows]')).forEach((section) => {
      const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
      const endline = section.querySelector('[data-sv-rows-end]');
      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * 60));
          if (endline instanceof HTMLElement) {
            schedule(() => endline.classList.add('is-visible'), rows.length * 60);
          }
        },
      }));
    });

    /* ── Gallery headers — word reveals on entry. The title wraps
       PER LINE SPAN (the footer-statement pattern): wrapping the
       whole h3 would fold its block-level line spans into
       inline-block word atoms and collapse the two lines onto one
       (Oscar's report — the END-TO-END: line merging up). */
    document.querySelectorAll('[data-sv-galhead]').forEach((head) => {
      const titleLines = Array.from(head.querySelectorAll('.sv-galhead__line'));
      const note = head.querySelector('[data-sv-galhead-note]');
      const parts = [...titleLines, note];
      parts.forEach((line, i) => {
        if (!(line instanceof HTMLElement)) return;
        line.dataset.revealDelay = String(i * LINE_STAGGER_S);
        wrapWordRevealElement(line);
      });
      triggers.push(ScrollTrigger.create({
        trigger: head,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          parts.forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
        },
      }));
    });

    /* ── Gallery tiles + their captions — blur-fade in L→R, 100ms
       slots (Oscar's rev 6): the caption COLUMN under each tile
       (the flow block; arrows ride the half-slot between) fires ON
       ITS TILE'S SLOT — one trigger per gallery, one clock. The
       ACCESS gallery is excluded here: it reveals with its whole
       section the moment the ground fade completes (below), same
       per-column pairing. */
    document.querySelectorAll('[data-sv-gallery]').forEach((gallery) => {
      if (gallery.closest('[data-sv-access]')) return;
      const tiles = Array.from(gallery.querySelectorAll('[data-sv-tile]'));
      const flow = gallery.nextElementSibling?.matches?.('[data-sv-flow]')
        ? gallery.nextElementSibling
        : null;
      const blocks = flow ? Array.from(flow.querySelectorAll('[data-sv-flow-block]')) : [];
      const arrows = flow ? Array.from(flow.querySelectorAll('.sv-flow__arrow')) : [];
      triggers.push(ScrollTrigger.create({
        trigger: gallery,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          tiles.forEach((tile, i) => schedule(() => tile.classList.add('is-visible'), i * 100));
          blocks.forEach((block, i) => schedule(() => block.classList.add('is-visible'), i * 100));
          arrows.forEach((arrow, i) => schedule(() => arrow.classList.add('is-visible'), i * 100 + 50));
        },
      }));
    });

    /* ── ACCESS SECTION — ONE entrance for the whole dark block
       (Oscar's rev 5 — it read late): statement + note + gallery +
       toggles all fire THE MOMENT THE GROUND FADE COMPLETES. The
       fade's scrub ends exactly when the section's top reaches the
       viewport bottom (the runway construction), so 'top bottom'
       IS the fully-black moment — same anchor, two consumers. */
    const accessStatement = document.querySelector('[data-sv-access-statement]');
    const accessNote = document.querySelector('[data-sv-access-note]');
    [accessStatement, accessNote].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    const access = document.querySelector('[data-sv-access]');
    if (access instanceof HTMLElement) {
      const accessTiles = Array.from(access.querySelectorAll('[data-sv-tile]'));
      const accessPairs = Array.from(access.querySelectorAll('[data-sv-toggle]'));
      triggers.push(ScrollTrigger.create({
        trigger: access,
        start: 'top bottom',
        once: true,
        onEnter: () => {
          [accessStatement, accessNote].forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
          /* Toggle pairs share their tile's slot (rev 6 — the
             caption-under-image pairing, same as the flow blocks). */
          accessTiles.forEach((tile, i) => schedule(() => tile.classList.add('is-visible'), i * 100));
          accessPairs.forEach((pair, i) => schedule(() => pair.classList.add('is-visible'), i * 100));
        },
      }));
    }

    /* ── GROUND FADE — scrubbed across the runway (see header). */
    const runway = document.querySelector('[data-sv-fade-runway]');
    if (runway instanceof HTMLElement) {
      gsap.fromTo(page, { backgroundColor: GROUND_FADE_FROM }, {
        backgroundColor: GROUND_DARK,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: runway,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }

    /* ── FOOTER reveal — the covered-trigger maths, verbatim. */
    const footer = document.querySelector('[data-landing-footer]');
    if (footer instanceof HTMLElement) {
      const wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        /* Mobile: plain-flow footer — the desktop pin formula can sit
           past the document end and never fire (the landing-closing
           lesson). */
        start: () => (isMob
          ? 'top 85%'
          : `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`),
        once: true,
        onEnter: () => playFooterReveals(wrapped, schedule),
      }));
    }

    ScrollTrigger.refresh();

    /* DEEP LINK (/landing's MORE INFO -> /services#immerse|connect
       |amplify): the browser's own anchor jump happens before this
       page's triggers exist and before Lenis takes over the scroll,
       so it lands short once the pins are measured. Re-seat it here
       — AFTER the refresh above, through Lenis when it is the
       writer — on the section top, which is the full-bleed moment.
       Runs once, under the transition cover. */
    const hashId = (window.location.hash || '').slice(1);
    if (hashId) {
      const target = document.getElementById(hashId);
      if (target instanceof HTMLElement && target.classList.contains('sv-pillar')) {
        const y = target.getBoundingClientRect().top + window.scrollY;
        const lenis = getLenisInstance();
        if (lenis && typeof lenis.scrollTo === 'function') {
          lenis.scrollTo(y, { immediate: true, force: true });
        } else {
          window.scrollTo(0, y);
        }
        ScrollTrigger.update();
      }
    }
  });

  if (import.meta.env.DEV) {
    /* Occluded-pane verification (the work-page convention): rAF can
       be frozen there, stalling gsap's ticker — expose the clock,
       and Lenis so probes scroll THROUGH the one writer. */
    window.__servicesV2 = { gsap, ScrollTrigger, get lenis() { return getLenisInstance(); } };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
  };
}
