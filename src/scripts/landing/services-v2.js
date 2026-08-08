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
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';
import { createServicesHeroWave } from './services-hero-wave.js';

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
/* Hover-row marquee — the network-marquee family speed (one 1728
   set / 48s ≈ 36 px/s). */
const MARQ_SPEED_PX_S = 35;
const MARQ_GAP_PX = 80;
/* Hover image geometry (file): 280×380 centred on the row band
   (row divider top + 34 = band centre; image top = centre − 190). */
const HOVER_IMG_HALF_PX = 190;
const ROW_BAND_CENTRE_PX = 34;
/* Pillar image treatment — the landing hero VIDEO's constants
   (landing-hero-scroll.js): 24px side band, 700px expand window
   (here ending exactly as the section tops the viewport),
   power1.inOut inside the scrub; ±80px parallax across the
   section's transit (the oversized-img/frame split). */
const PILLAR_MARGIN_PX = 24; // = VIDEO_MARGIN_PX
const PILLAR_EXPAND_PX = 700; // = VIDEO_EXPAND_PX
const PILLAR_PARALLAX_PX = 80;
/* Bottom behaviours — the landing constants. */
const FOOTER_H_PX = 811;
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

  /* ── Scroll: the SHARED house boot (site-scroll.js — one source
     of truth for the uniform feel; non-RM only). `lenis` reads the
     live instance so later closures always see the current one. */
  if (!reduced) cleanups.push(initSiteScroll());
  const lenis = { get i() { return getLenisInstance(); } };

  /* ── HOVER ROWS — wired for every mode (activation differs; the
     marquee/image build is skipped under RM, CSS enforces too). */
  const rowSections = Array.from(document.querySelectorAll('[data-sv-rows]'));
  rowSections.forEach((section) => {
    if (!(section instanceof HTMLElement)) return;
    const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
    const imgWrap = section.querySelector('[data-sv-rows-img]');
    const imgEl = imgWrap instanceof HTMLElement ? imgWrap.querySelector('img') : null;
    let active = null;

    /* Marquee tracks — built once; widths measured after fonts so
       the loop shift is exact (seamless at every row width). */
    const buildMarquees = () => {
      if (reduced) return;
      const listWidth = section.querySelector('[data-sv-rows-list]')?.clientWidth ?? 1161;
      rows.forEach((row) => {
        const marq = row.querySelector('[data-sv-marq]');
        if (!(marq instanceof HTMLElement) || marq.dataset.built) return;
        marq.dataset.built = '1';
        const label = `${row.dataset.index} /  ${row.dataset.text ?? ''}`;
        const track = document.createElement('span');
        track.className = 'sv-rows__marq-track';
        const probe = document.createElement('span');
        probe.className = 'sv-rows__marq-unit';
        probe.textContent = label;
        track.appendChild(probe);
        marq.appendChild(track);
        const unitW = probe.getBoundingClientRect().width || 300;
        const shift = unitW + MARQ_GAP_PX;
        /* Enough copies that a one-shift translate always leaves the
           row covered (the file's 3–4-copies-under-a-mask loop). */
        const copies = Math.ceil((listWidth + shift) / shift) + 1;
        for (let i = 1; i < copies; i += 1) {
          const unit = document.createElement('span');
          unit.className = 'sv-rows__marq-unit';
          unit.textContent = label;
          track.appendChild(unit);
        }
        marq.style.setProperty('--sv-marq-shift', `${shift.toFixed(1)}px`);
        marq.style.setProperty('--sv-marq-dur', `${(shift / MARQ_SPEED_PX_S).toFixed(2)}s`);
      });
    };
    const fontsForMarq = document.fonts?.ready ?? Promise.resolve();
    fontsForMarq.then(buildMarquees);

    /* Image swap runner (Oscar's rev 4 — COVER, don't clear): the
       NEW image wipes in L→R ON TOP of the old one (the overlay
       img), the frame gliding to the new row meanwhile (CSS top
       transition); once the cover completes, the BASE adopts the
       new src and the overlay hides — the old image is never wiped
       out first, so at no point is the frame empty. One run in
       flight; the completion re-checks the LATEST pending row (the
       lightbox latch), so rapid hops never stack and always land
       the newest. */
    const SWAP_PHASE_MS = 450; /* the lightbox constant */
    const SWAP_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';
    const overEl = imgWrap instanceof HTMLElement ? imgWrap.querySelector('[data-sv-img-over]') : null;
    let shownRow = null;
    let pendingRow = null;
    let swapAnim = false;
    const swapTimers = [];
    const swapSchedule = (fn, ms) => swapTimers.push(window.setTimeout(fn, ms));
    const clearSwap = () => {
      swapTimers.forEach(window.clearTimeout);
      swapTimers.length = 0;
      swapAnim = false;
      if (overEl instanceof HTMLImageElement) {
        overEl.hidden = true;
        overEl.style.transition = '';
        overEl.style.clipPath = '';
        overEl.style.filter = '';
      }
    };
    const placeAt = (row) => {
      if (imgWrap instanceof HTMLElement) {
        imgWrap.style.top = `${row.offsetTop + ROW_BAND_CENTRE_PX - HOVER_IMG_HALF_PX}px`;
      }
    };
    const runSwapSequence = () => {
      if (!(overEl instanceof HTMLImageElement) || !(imgWrap instanceof HTMLElement)) return;
      const target = pendingRow;
      if (!(target instanceof HTMLElement) || target === shownRow) return;
      swapAnim = true;
      /* The NEW image wipes in over the old; the frame glides to
         the target row underneath both (top transition). */
      placeAt(target);
      overEl.src = target.dataset.img ?? '';
      overEl.hidden = false;
      overEl.style.transition = 'none';
      overEl.style.clipPath = 'inset(0 100% 0 0)';
      overEl.style.filter = 'blur(6px)';
      void overEl.offsetWidth;
      overEl.style.transition = `clip-path ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}, filter ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}`;
      overEl.style.clipPath = 'inset(0 0 0 0)';
      overEl.style.filter = 'blur(0px)';
      swapSchedule(() => {
        /* Fully covered — the base adopts the new image, the
           overlay retires (no stacking beyond the pair). */
        if (imgEl instanceof HTMLImageElement) imgEl.src = overEl.src;
        shownRow = target;
        clearSwap();
        if (pendingRow !== shownRow && pendingRow instanceof HTMLElement) runSwapSequence();
      }, SWAP_PHASE_MS + 30);
    };
    const setActive = (row) => {
      if (row === active) return;
      if (active) active.classList.remove('is-active');
      active = row;
      if (!(row instanceof HTMLElement)) {
        pendingRow = null;
        clearSwap();
        imgWrap?.classList.remove('is-active');
        shownRow = null;
        return;
      }
      row.classList.add('is-active');
      if (reduced || !(imgWrap instanceof HTMLElement)) return;
      pendingRow = row;
      if (!imgWrap.classList.contains('is-active')) {
        /* Fresh entrance: place + src directly, blur/fade in. */
        clearSwap();
        placeAt(row);
        if (imgEl instanceof HTMLImageElement) imgEl.src = row.dataset.img ?? '';
        shownRow = row;
        void imgWrap.offsetWidth;
        imgWrap.classList.add('is-active');
        return;
      }
      /* Row-to-row: the two-phase sequence (unless one is already
         in flight — it will pick pendingRow up at its boundary). */
      if (!swapAnim && row !== shownRow) runSwapSequence();
    };
    cleanups.push(clearSwap);

    if (fineHover) {
      const onOver = (e) => {
        const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
        setActive(row instanceof HTMLElement && section.contains(row) ? row : null);
      };
      const onLeave = () => setActive(null);
      section.addEventListener('pointerover', onOver);
      section.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        section.removeEventListener('pointerover', onOver);
        section.removeEventListener('pointerleave', onLeave);
      });
    }
    /* Keyboard parity — focus gets the same state in every mode. */
    const onFocusIn = (e) => {
      const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
      if (row instanceof HTMLElement) setActive(row);
    };
    const onFocusOut = (e) => {
      const next = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-sv-row]') : null;
      if (!next) setActive(null);
    };
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);
    cleanups.push(() => {
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
    });
  });

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
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
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

  if (reduced) {
    /* RM: static page (sticky is layout; the wave rides plain
       scroll via the section's fallback height — no scrub, images
       simply scroll past). Hidden entrance states are gated
       no-preference in CSS. */
    return () => cleanups.forEach((fn) => fn());
  }

  const triggers = [];
  let disposed = false;
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

    /* ── HERO WAVE — the ported mechanic. */
    const hero = document.querySelector('[data-sv-hero]');
    const stage = document.querySelector('[data-sv-hero-stage]');
    const track = document.querySelector('[data-sv-hero-track]');
    if (hero instanceof HTMLElement && stage instanceof HTMLElement && track instanceof HTMLElement) {
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

    /* ── Pillar overlay texts — word reveals on entry, once. */
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
        start: 'top 65%',
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

    /* ── Rows resting entrance — staggered rise+fade (cs-more
       cards' treatment; 60ms steps). */
    rowSections.forEach((section) => {
      const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          rows.forEach((row, i) => schedule(() => row.classList.add('is-visible'), i * 60));
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

    /* ── Gallery tiles — rise+fade, 100ms L→R (closing tiles). */
    document.querySelectorAll('[data-sv-gallery]').forEach((gallery) => {
      const tiles = Array.from(gallery.querySelectorAll('[data-sv-tile]'));
      triggers.push(ScrollTrigger.create({
        trigger: gallery,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          tiles.forEach((tile, i) => schedule(() => tile.classList.add('is-visible'), i * 100));
        },
      }));
    });

    /* ── Flow rows + toggles — the pills' 0.6s fade, staggered. */
    document.querySelectorAll('[data-sv-flow]').forEach((flow) => {
      const units = Array.from(flow.children).filter((el) => el instanceof HTMLElement);
      triggers.push(ScrollTrigger.create({
        trigger: flow,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          units.forEach((unit, i) => schedule(() => unit.classList.add('is-visible'), i * 60));
        },
      }));
    });
    const toggles = document.querySelector('[data-sv-toggles]');
    if (toggles instanceof HTMLElement) {
      const pairs = Array.from(toggles.querySelectorAll('[data-sv-toggle]'));
      triggers.push(ScrollTrigger.create({
        trigger: toggles,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          pairs.forEach((pair, i) => schedule(() => pair.classList.add('is-visible'), i * 60));
        },
      }));
    }

    /* ── Access statement — word reveal + note. */
    const accessStatement = document.querySelector('[data-sv-access-statement]');
    const accessNote = document.querySelector('[data-sv-access-note]');
    [accessStatement, accessNote].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
    });
    const access = document.querySelector('[data-sv-access]');
    if (access instanceof HTMLElement) {
      triggers.push(ScrollTrigger.create({
        trigger: access,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          [accessStatement, accessNote].forEach((line) => {
            if (line instanceof HTMLElement) playLineRevealElement(line);
          });
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
        start: () => `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`,
        once: true,
        onEnter: () => playFooterReveals(wrapped, schedule),
      }));
    }

    ScrollTrigger.refresh();
  });

  if (import.meta.env.DEV) {
    /* Occluded-pane verification (the work-page convention): rAF can
       be frozen there, stalling gsap's ticker — expose the clock. */
    window.__servicesV2 = { gsap, ScrollTrigger };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
  };
}
