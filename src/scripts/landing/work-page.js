/**
 * /work — FEATURED WORK page machinery (Figma 27:3103; Oscar's
 * finite-travel rev 2026-08-06).
 *
 * DRIVER: the holding pages' single-velocity drift driver
 * (createDriftDriver, holding-shared.js — REUSED, not copied: wheel
 * impulses + touch position-coupling + flick momentum + rAF
 * ownership + visibility pause, the approved motion), with
 * autoDrift 0 per the /holding-2 mobile-travel precedent — travel
 * is scroll-driven only, reversible. A dedicated Lenis instance was
 * rejected: Lenis wants a scrollable document and this page
 * deliberately has none; two scroll authorities is the settle-shake
 * bug class.
 *
 * FINITE TRAVEL (Oscar's rev — the loop is gone): pos clamps to
 * [0, maxPos]. Phase 1 travels the carousel (first image top ON the
 * meta title's top line at pos 0, nothing above); phase 2 — the
 * last FOOTER_REVEAL_PX of travel — slides the whole stage up over
 * the FIXED landing footer beneath it: the landing parallax
 * uncover, virtualised. The footer's own entrance (the
 * landing-closing choreography: column/row word reveals, image
 * rise) fires once, ~200px into the reveal, same as /landing.
 * Clamping rebases the driver offset so reversal is immediate (no
 * rubber-band debt from momentum pushing past the ends).
 *
 * TRAVEL-AND-DOCK METAS (Oscar's rev — replaces swap-in-place):
 * each project's title + /0N + description is a per-project unit in
 * the left column riding its image's vertical position; it PINS at
 * the dock (441, the old meta position) while its project
 * traverses, and the successor pushes it up and out through the
 * layer's clip line at the dock (the iOS-sticky-header mechanic —
 * both visible during the handoff, contact push). Per frame:
 *   y_i = min( max(linkedY_i, dockY), y_{i+1} − blockH_i )
 * computed successor-first — pure f(travel), reversible by
 * construction (flicks and mid-push reversals mirror exactly).
 * blockH is measured per unit (multi-line descriptions push
 * further); the /0N derives 6px off each unit's title. The layer
 * sits UNDER the blur band like the images (text enters through
 * the blur) and is clipped above the dock (a pushed meta exits
 * cleanly, never overlapping the pills). Docking is announced via
 * a polite live region. ALTERNATIVE (one-flag switch if the push
 * reads badly): PUSH_HANDOFF=false fades the docked meta in place
 * instead of displacing it. NOTE: the metas are brand-black ink
 * (Oscar's standing rev) — no blend rides these transforms; the
 * page's only difference elements remain the cursor pair.
 *
 * CURSOR: one large difference dot + label — two top-level fixed
 * siblings each blending difference themselves (the nav-logo
 * shape; a wrapper would isolate the blend), following via
 * left/top at the canvas-cursor 0.25 lerp. The site's canvas dot
 * hides while this cursor is live. Gated (hover:hover)+(pointer:
 * fine) — NOTE: false system-wide on Oscar's machine; verify the
 * cursor on another input device.
 *
 * PLACEHOLDER LINKS: tiles link to /work/[slug] — routes that don't
 * exist yet; navigation is prevented here until they do.
 *
 * BOTTOM BEHAVIOURS (the landing pair, ported): a 2s idle stop
 * part-way into the footer reveal glides to the very bottom (a
 * wheel during the glide hands control back); at the bottom the
 * nav ripples out via the shared nav-motion applier, back in on
 * the way up.
 *
 * RM: travel remains (direct wheel/touch writes, no momentum), meta
 * swaps instant, footer content static, no custom cursor, no snap.
 * <1024px: the CSS stacked list is the page; no machinery boots.
 */
import gsap from 'gsap';
import { createDriftDriver } from '../holding/holding-shared.js';
import { WORK_PROJECTS } from '../../data/landing/featured-work.js';
import { wrapWordRevealElement, playLineRevealElement, wrapStaticLines } from '../line-reveal.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { LIVE_CASE_SLUGS } from '../../data/landing/case-studies.js';

const BASE_TOP_PX = 441; // first tile top = meta title top (Oscar's rev)
const IMG_H_PX = 616; // Oscar's rev: the pre-412 height (640) minus 24
const GAP_PX = 8;
const PITCH_PX = IMG_H_PX + GAP_PX; // 624
const END_GAP_PX = 152; /* ground below the last image before the
  reveal — the landing closing's measured last-content-to-footer
  whitespace (Oscar's rev: equal on every page; supersedes the
  earlier 80). */
const TILE_RIGHT_MARGIN_PX = 16; // right edge held at stage - 16
const TILE_LOGO_GAP_PX = 8; // left edge 8px left of the logo's T
const BAND_FADE_PX = 150; // radii-drain window at the last image's half
const INDEX_GAP_PX = 6; // /0N sits this far right of the title (Oscar's rev)
const DOCK_Y_PX = BASE_TOP_PX; // the dock = the old meta position (441)
const META_WIPE_BLUR_PX = 6; // the services roll-over blur (Oscar's rev)
/* The flagged alternative: false = the docked meta FADES in place
   as the successor docks, instead of being pushed out. */
const PUSH_HANDOFF = true;
const FOOTER_REVEAL_PX = 811; // the landing footer's full height
const FOOTER_ENTRANCE_AT_PX = 200; // fire ~200px into the reveal (landing)
const CURSOR_LERP = 0.25; // the canvas-cursor feel
/* The case-page scroll RESISTANCE (Oscar's rev): the render
   position lerps toward the input target at the Lenis value the
   case study uses (0.065) — wheel input lands with the same lag/
   ease instead of 1:1. Feel constant, one place. */
const SCROLL_SMOOTH_LERP = 0.065;
const PILL_STAGGER_MS = 80;
const PILLS_AT_MS = 300;
const LINE_STAGGER_S = 0.12;
/* Bottom behaviours — the landing constants (landing-closing.js). */
const BOTTOM_SNAP_IDLE_MS = 2000;
const BOTTOM_EPSILON_PX = 2;
const NAV_SHOW_HYSTERESIS_PX = 64;

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

export function initWorkPage() {
  const stage = document.querySelector('[data-work-stage]');
  const carousel = document.querySelector('[data-work-carousel]');
  if (!(stage instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return () => {};

  const metasLayer = document.querySelector('[data-work-metas]');
  const metaLive = document.querySelector('[data-work-meta-live]');
  const footer = document.querySelector('[data-work-footer]');

  const cleanups = [];

  /* Tiles navigate for LIVE case studies (Yoxman first); the rest
     stay inert placeholders until their content drops. */
  const onLinkClick = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
    if (link instanceof HTMLElement && !LIVE_CASE_SLUGS.includes(link.dataset.slug ?? '')) {
      e.preventDefault();
    }
  };
  stage.addEventListener('click', onLinkClick);
  cleanups.push(() => stage.removeEventListener('click', onLinkClick));

  /* <1024: the CSS stacked list is the whole story. */
  if ((window.innerWidth || 1728) < 1024) {
    return () => cleanups.forEach((fn) => fn());
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stageH = () => stage.clientHeight || window.innerHeight;

  /* ── W-under-A (the featured section's Range mechanism). */
  const hlFeatured = document.querySelector('[data-work-hl-featured]');
  const hlWork = document.querySelector('[data-work-hl-work]');
  const alignWork = () => {
    if (!(hlFeatured instanceof HTMLElement) || !(hlWork instanceof HTMLElement)) return;
    const tn = hlFeatured.firstChild;
    if (!tn || tn.nodeType !== Node.TEXT_NODE) return;
    const range = document.createRange();
    range.setStart(tn, 2); // FE[A]TURED
    range.setEnd(tn, 3);
    const aRect = range.getBoundingClientRect();
    if (aRect.width === 0) return;
    hlWork.style.left = `${(aRect.left - stage.getBoundingClientRect().left).toFixed(2)}px`;
  };

  /* Tile geometry is DERIVED (Oscar's rev): left edge 8px left of
     the nav logo's T, right edge held at stage-16. Set as CSS vars
     (carousel + tiles read them); re-derived on fonts/resize. */
  const deriveTileWidth = () => {
    const logo = document.querySelector('.home__logo');
    if (!(logo instanceof HTMLElement)) return;
    const left = logo.getBoundingClientRect().left - TILE_LOGO_GAP_PX;
    const width = (stage.clientWidth || window.innerWidth) - TILE_RIGHT_MARGIN_PX - left;
    stage.style.setProperty('--work-tile-left', `${left.toFixed(1)}px`);
    stage.style.setProperty('--work-tile-w', `${width.toFixed(1)}px`);
  };

  /* ── The set + tiles + meta units (finite — no ring). Metas are
     rebuilt WITH the tiles (they belong to projects), so filtered
     sets inherit the dock mechanism automatically. */
  let set = WORK_PROJECTS;
  let tiles = [];
  let units = [];

  const measureUnits = () => {
    units.forEach((u) => {
      const tRect = u.title.getBoundingClientRect();
      const uRect = u.el.getBoundingClientRect();
      u.index.style.left = `${(tRect.right - uRect.left + INDEX_GAP_PX).toFixed(1)}px`;
      /* Per-LINE wipe units (Oscar's rev): the title (+/0N) line
         plus the desc's rendered lines (wrapStaticLines — rebuilt
         from the source text so font-load/resize re-derive the
         grouping), each with its bottom offset inside the unit,
         ordered BOTTOM FIRST (the incoming edge reaches the lower
         lines first). */
      u.desc.textContent = u.descText;
      const descLines = wrapStaticLines(u.desc);
      const lineUnits = [
        { els: [u.title, u.index], bottom: tRect.bottom - uRect.top },
        ...descLines.map((clip) => ({
          els: [clip],
          bottom: clip.getBoundingClientRect().bottom - uRect.top,
        })),
      ];
      u.wipeLines = lineUnits.sort((a, b) => b.bottom - a.bottom);
      /* Push clearance: the unit's content height (desc bottom). */
      u.blockH = u.desc.offsetTop + u.desc.offsetHeight;
    });
  };

  const buildTiles = () => {
    /* The network section's applySetToTrack rebuild: wipe,
       re-render, re-derive the travel bounds. */
    carousel.textContent = '';
    tiles = set.map((p, i) => {
      const a = document.createElement('a');
      a.className = 'work-tile';
      a.href = `/work/${p.slug}`; // placeholder — see onLinkClick
      a.setAttribute('data-work-link', '');
      a.dataset.slug = p.slug;
      a.dataset.tileIndex = String(i);
      a.setAttribute('aria-label', `${p.title.join(' ')} — view project`);
      const img = document.createElement('img');
      img.src = p.workImg;
      img.alt = '';
      img.decoding = 'async';
      img.width = 1024;
      img.height = 616;
      a.appendChild(img);
      carousel.appendChild(a);
      return { el: a, project: p };
    });
    if (metasLayer instanceof HTMLElement) {
      metasLayer.textContent = '';
      units = set.map((p, i) => {
        const u = document.createElement('div');
        u.className = 'work-meta-unit';
        u.setAttribute('data-work-meta-unit', '');
        u.dataset.slug = p.slug;
        const title = document.createElement('h2');
        title.className = 'work-page__meta-title';
        title.textContent = p.title.join(' ');
        const index = document.createElement('p');
        index.className = 'work-page__meta-index';
        index.textContent = p.index;
        const desc = document.createElement('p');
        desc.className = 'work-page__meta-desc';
        desc.textContent = p.desc;
        u.append(title, index, desc);
        u.style.transform = `translate3d(0, ${(BASE_TOP_PX + i * PITCH_PX).toFixed(0)}px, 0)`;
        metasLayer.appendChild(u);
        return { el: u, project: p, title, index, desc, descText: p.desc, blockH: 150, wipeLines: null, wiped: false };
      });
      measureUnits();
    }
  };

  /* Travel bounds: phase 1 ends when the last image's bottom meets
     the viewport bottom; phase 2 adds the footer reveal. */
  const carouselMax = () => {
    /* Phase 1 ends with the last image's bottom + the 80px run-out
       (Oscar's rev) on the viewport bottom. */
    const contentBottom = BASE_TOP_PX + (tiles.length - 1) * PITCH_PX + IMG_H_PX + END_GAP_PX;
    return Math.max(contentBottom - stageH(), 0);
  };
  const maxPos = () => carouselMax() + FOOTER_REVEAL_PX;

  /* Bottom band dissolve (Oscar's rev): from HALFWAY through the
     last image, the band's radii drain to nothing over BAND_FADE_PX
     of travel — scrubbed, reversible (the featured band-dissolve
     pattern; wrapper opacity would sever the backdrop filters). */
  const bandLayers = Array.from(stage.querySelectorAll('.work-stage__band [data-gradual-blur-layer]'));
  const bandBases = bandLayers.map((l) => {
    const m = /([\d.]+)rem/.exec(l.style.backdropFilter || '');
    return m ? parseFloat(m[1]) : 0;
  });
  let lastBandT = -1;
  const applyBand = () => {
    const half = BASE_TOP_PX + (tiles.length - 1) * PITCH_PX + IMG_H_PX / 2 - stageH();
    const bandT = clamp((pos - half) / BAND_FADE_PX, 0, 1);
    if (bandT === lastBandT) return;
    lastBandT = bandT;
    bandLayers.forEach((l, i) => {
      const v = `blur(${(bandBases[i] * (1 - bandT)).toFixed(3)}rem)`;
      l.style.backdropFilter = v;
      l.style.webkitBackdropFilter = v;
    });
  };

  /* ── Layout: pure f(pos). Carousel rides phase 1; the stage slides
     up through phase 2 (the reveal). */
  let pos = 0;
  let footerEntered = false;
  const layout = () => {
    const p1 = Math.min(pos, carouselMax());
    tiles.forEach(({ el }, i) => {
      const y = BASE_TOP_PX + i * PITCH_PX - p1;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
    layoutMetas(p1);
    applyBand();
    const revealT = clamp(pos - carouselMax(), 0, FOOTER_REVEAL_PX);
    stage.style.transform = revealT > 0 ? `translate3d(0, ${(-revealT).toFixed(2)}px, 0)` : '';
    if (!footerEntered && revealT > FOOTER_ENTRANCE_AT_PX) {
      footerEntered = true;
      playFooterEntrance();
    }
  };

  const timeouts = [];

  /* ── The dock: per-frame positional metas (replaces the swap
     machinery entirely). Successor-first so each meta can be
     displaced by the one after it; the layer's clip at the dock
     line turns the push into the iOS exit. */
  let dockedIdx = 0;
  let announcedSlug = set[0]?.slug ?? null;

  const announceDock = (idx) => {
    if (idx === dockedIdx && announcedSlug) return;
    dockedIdx = idx;
    const p = units[idx]?.project;
    if (!p || p.slug === announcedSlug) return;
    announcedSlug = p.slug;
    if (metaLive) metaLive.textContent = `${p.title.join(' ')} ${p.index}. ${p.desc}`;
  };

  const layoutMetas = (p1) => {
    if (!units.length) return;
    const docked = clamp(Math.floor(p1 / PITCH_PX), 0, units.length - 1);
    if (reduced) {
      /* RM: no travel choreography — instant swap-in-place at the
         dock, driven by the same dock-crossing trigger. */
      units.forEach((u, i) => {
        u.el.style.visibility = i === docked ? '' : 'hidden';
        u.el.style.transform = `translate3d(0, ${DOCK_Y_PX}px, 0)`;
      });
      announceDock(docked);
      return;
    }
    let succY = Infinity;
    for (let i = units.length - 1; i >= 0; i -= 1) {
      const u = units[i];
      const linked = BASE_TOP_PX + i * PITCH_PX - p1;
      let y = Math.max(linked, DOCK_Y_PX);
      if (PUSH_HANDOFF) {
        y = Math.min(y, succY - u.blockH);
      } else if (succY <= DOCK_Y_PX + u.blockH && i === docked) {
        /* Flagged alternative: fade in place as the successor
           arrives (no displacement). */
        const t = clamp((DOCK_Y_PX + u.blockH - succY) / u.blockH, 0, 1);
        u.el.style.opacity = String(1 - t);
      }
      if (!PUSH_HANDOFF && !(succY <= DOCK_Y_PX + u.blockH && i === docked)) {
        u.el.style.opacity = '';
      }
      /* THE OVERTAKE WIPE (Oscar's rev 2 — LINE BY LINE): as the
         incoming meta rides over the docked one, the outgoing text
         wipes one line at a time, BOTTOM FIRST (the lines nearest
         the arriving text lead), each line blurring + fading across
         its own window of the push — pure f(travel), mirrored
         exactly on reversal. Plain black ink — filters carry no
         blend risk. */
      if (PUSH_HANDOFF && u.wipeLines) {
        const p = clamp((DOCK_Y_PX - y) / Math.max(u.blockH, 1), 0, 1);
        if (p > 0) {
          const n = u.wipeLines.length;
          const win = 0.5; /* each line's wipe window (of the push) */
          u.wipeLines.forEach((line, k) => {
            const startP = n > 1 ? (k / n) * (1 - win) : 0;
            const t = clamp((p - startP) / win, 0, 1);
            line.els.forEach((el) => {
              el.style.opacity = t > 0 ? (1 - t).toFixed(3) : '';
              el.style.filter = t > 0 ? `blur(${(META_WIPE_BLUR_PX * t).toFixed(2)}px)` : '';
            });
          });
          u.wiped = true;
        } else if (u.wiped) {
          u.wipeLines.forEach((line) => line.els.forEach((el) => {
            el.style.opacity = '';
            el.style.filter = '';
          }));
          u.wiped = false;
        }
      }
      u.el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      succY = y;
    }
    announceDock(docked);
  };

  /* ── Input: the drift driver (non-RM) or direct writes (RM). The
     clamp REBASES the offset so momentum can't bank debt past the
     ends — reversal is immediate. */
  let posOffset = 0;
  let targetPos = 0;
  let driver = null;

  const frame = () => {
    layout();
  };

  /* Direct placement (tweens, focus, filters, RM, dev): render AND
     target snap together — no smoothing on deliberate moves. */
  const setPosClamped = (raw, driverTravel) => {
    pos = clamp(raw, 0, maxPos());
    targetPos = pos;
    if (raw !== pos && driverTravel !== undefined) posOffset = pos - driverTravel;
    frame();
    onPosChange();
  };

  /* ROOT-CAUSE FIX (Oscar's report: no scroll over the footer):
     the driver's wheel/touch capture is scoped to its region
     element, and the revealed footer is a SIBLING fixed layer —
     wheeling over it never reached the stage-scoped listener. On a
     fixed-viewport route the whole PAGE is the input surface, so
     the region is document.body. */
  const inputRegion = document.body;
  if (!reduced) {
    driver = createDriftDriver(inputRegion, {
      autoDrift: 0,
      touch: true,
      onFrame: (travelPx) => {
        /* A wheel during the bottom-snap glide hands control back
           to the user (the landing snap's Lenis-retarget
           equivalent): any real impulse kills the tween. */
        if (snapTween?.isActive() && Math.abs(driver.state().velocity) > 50) {
          snapTween.kill();
          posOffset = pos - travelPx;
        }
        /* Wheel/touch path: clamp the TARGET (rebasing the offset
           at the ends), then lerp the render position toward it —
           the case-page resistance. */
        const raw = travelPx + posOffset;
        targetPos = clamp(raw, 0, maxPos());
        if (raw !== targetPos) posOffset = targetPos - travelPx;
        pos += (targetPos - pos) * SCROLL_SMOOTH_LERP;
        if (Math.abs(targetPos - pos) < 0.05) pos = targetPos;
        frame();
        onPosChange();
      },
    });
    cleanups.push(() => driver.destroy());
  } else {
    const onWheel = (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageH() : 1;
      setPosClamped(pos + e.deltaY * unit);
    };
    inputRegion.addEventListener('wheel', onWheel, { passive: false });
    cleanups.push(() => inputRegion.removeEventListener('wheel', onWheel));
    let touchY = 0;
    const onTouchStart = (e) => { if (e.touches.length) touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (!e.touches.length) return;
      e.preventDefault();
      setPosClamped(pos + (touchY - e.touches[0].clientY));
      touchY = e.touches[0].clientY;
    };
    inputRegion.addEventListener('touchstart', onTouchStart, { passive: true });
    inputRegion.addEventListener('touchmove', onTouchMove, { passive: false });
    cleanups.push(() => {
      inputRegion.removeEventListener('touchstart', onTouchStart);
      inputRegion.removeEventListener('touchmove', onTouchMove);
    });
  }

  /* ── Filters — blur-out → set swap → blur-in (the network
     industry-hover machinery pattern; bounds re-derive on rebuild). */
  const pills = Array.from(document.querySelectorAll('[data-work-filter]'));
  let currentFilter = 'all';
  let filtering = false;

  const applySet = (key) => {
    const next = key === 'all'
      ? WORK_PROJECTS
      : WORK_PROJECTS.filter((p) => p.tags.includes(key));
    if (!next.length) return false;
    set = next;
    buildTiles();
    posOffset = -(driver ? driver.state().travelPx : 0);
    pos = 0;
    dockedIdx = 0;
    announcedSlug = null; /* the new set's first dock announces */
    /* footerEntered stays as-is: the footer entrance is once-only. */
    frame();
    return true;
  };

  const onPill = (key) => {
    if (filtering || key === currentFilter) return;
    const previous = currentFilter;
    currentFilter = key;
    pills.forEach((p) => {
      p.setAttribute('aria-pressed', p.getAttribute('data-work-filter') === key ? 'true' : 'false');
    });
    if (reduced) {
      if (!applySet(key)) currentFilter = previous;
      return;
    }
    filtering = true;
    gsap.to(carousel, {
      opacity: 0,
      filter: 'blur(8px)',
      duration: 0.25,
      ease: 'power1.in',
      onComplete: () => {
        if (!applySet(key)) currentFilter = previous;
        gsap.to(carousel, {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.35,
          ease: 'power1.out',
          onComplete: () => { filtering = false; },
        });
      },
    });
  };
  const pillHandlers = pills.map((pill) => {
    const fn = () => onPill(pill.getAttribute('data-work-filter') || 'all');
    pill.addEventListener('click', fn);
    return [pill, fn];
  });
  cleanups.push(() => pillHandlers.forEach(([pill, fn]) => pill.removeEventListener('click', fn)));

  /* ── Keyboard: focusing a tile brings it to the anchor. */
  const onFocusIn = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
    if (!(link instanceof HTMLElement) || !link.dataset.tileIndex) return;
    const i = Number(link.dataset.tileIndex);
    const desired = clamp(BASE_TOP_PX + i * PITCH_PX - (stageH() / 2 - IMG_H_PX / 2), 0, maxPos());
    posOffset += desired - pos;
    setPosClamped(desired);
  };
  carousel.addEventListener('focusin', onFocusIn);
  cleanups.push(() => carousel.removeEventListener('focusin', onFocusIn));

  /* ── Footer: entrance choreography (the landing-closing footer
     vocabulary — column/row word reveals on its stagger bases, the
     image rise) + BACK TO TOP gliding the travel home. HOME stays a
     real navigation here (/landing). */
  /* The shared footer choreography (footer-motion.js — one copy
     for /work and the case studies). */
  let wrappedFooter = { wordEls: [], img: null };
  const wrapFooter = () => {
    wrappedFooter = wrapFooterReveals(footer instanceof HTMLElement ? footer : null);
  };
  const playFooterEntrance = () => {
    playFooterReveals(wrappedFooter, (fn, ms) => timeouts.push(setTimeout(fn, ms)));
  };

  const topLinks = footer ? Array.from(footer.querySelectorAll('[data-footer-top]')) : [];
  const onTopClick = (e) => {
    const el = e.currentTarget;
    /* HOME is an anchor with a real destination (/landing) — let it
       navigate; BACK TO TOP (a button) glides the travel home. */
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    const proxy = { p: pos };
    if (reduced) {
      posOffset += 0 - pos;
      setPosClamped(0);
      return;
    }
    gsap.to(proxy, {
      p: 0,
      duration: 1.2,
      ease: 'power3.out',
      onUpdate: () => {
        posOffset += proxy.p - pos;
        setPosClamped(proxy.p);
      },
    });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  /* ── Custom cursor — one large difference dot + label (gate note:
     hover/fine reads FALSE system-wide on Oscar's machine — verify
     on another device). */
  const cursorEls = [
    document.querySelector('[data-work-cursor-circle]'),
    document.querySelector('[data-work-cursor-label]'),
  ].filter((el) => el instanceof HTMLElement);
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduced && fineHover && cursorEls.length === 2) {
    document.documentElement.classList.add('work-cursor-on');
    document.body.classList.add('work-cursor-on');
    let cx = -200;
    let cy = -200;
    let tx = -200;
    let ty = -200;
    let over = false;
    let cursorRaf = 0;
    const tick = () => {
      cx += (tx - cx) * CURSOR_LERP;
      cy += (ty - cy) * CURSOR_LERP;
      cursorEls.forEach((el) => {
        /* left/top, never transform — these ARE the blend elements. */
        el.style.left = `${cx.toFixed(1)}px`;
        el.style.top = `${cy.toFixed(1)}px`;
      });
      cursorRaf = window.requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const setOver = (nowOver) => {
      if (nowOver === over) return;
      over = nowOver;
      if (over) {
        cx = tx;
        cy = ty;
        cursorEls.forEach((el) => el.classList.add('is-active'));
        document.documentElement.classList.add('work-cursor-live');
        if (!cursorRaf) cursorRaf = window.requestAnimationFrame(tick);
      } else {
        cursorEls.forEach((el) => el.classList.remove('is-active'));
        document.documentElement.classList.remove('work-cursor-live');
        window.cancelAnimationFrame(cursorRaf);
        cursorRaf = 0;
      }
    };
    /* ROOT-CAUSE FIX (Oscar's report: the cursor stayed on the
       footer): the old stage-scoped pointerover/OUT pair fed the
       OUT event's target — the tile being LEFT — into the same
       hit test, so exiting a tile toward the footer (outside the
       stage, no matching over event) still read as "over a tile".
       DOCUMENT-level pointerover is the correct signal: it fires
       for whatever the pointer actually enters, footer included. */
    const onOver = (e) => {
      setOver(e.target instanceof Element && !!e.target.closest('[data-work-link]'));
    };
    const onDocLeave = () => setOver(false);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver);
    document.documentElement.addEventListener('pointerleave', onDocLeave);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onDocLeave);
      window.cancelAnimationFrame(cursorRaf);
      document.documentElement.classList.remove('work-cursor-on', 'work-cursor-live');
      document.body.classList.remove('work-cursor-on');
    });
  }

  /* ── Bottom behaviours (Oscar's rev — the landing pair, ported):
     1. AUTO-SNAP: stopping (2s idle) part-way into the footer
        reveal, having moved DOWN, glides to the very bottom.
     2. NAV EXIT: at the bottom, MENU / logo / LET'S CHAT ripple out
        (the shared nav-motion applier) and back in on the way up. */
  ensureLogoChars();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    /* Never strand an open menu without its toggle. */
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
  };

  let snapTimer = 0;
  let lastPos = 0;
  let lastDirDown = false;
  let snapTween = null;
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown) return;
    if (pos <= carouselMax() || pos >= maxPos() - BOTTOM_EPSILON_PX) return;
    const proxy = { p: pos };
    snapTween = gsap.to(proxy, {
      p: maxPos(),
      duration: 1.0,
      ease: 'power3.out',
      onUpdate: () => {
        posOffset += proxy.p - pos;
        setPosClamped(proxy.p);
      },
    });
  };
  const onPosChange = () => {
    if (pos !== lastPos) {
      lastDirDown = pos > lastPos;
      lastPos = pos;
    }
    if (pos >= maxPos() - BOTTOM_EPSILON_PX) setNav(true);
    else if (pos < maxPos() - NAV_SHOW_HYSTERESIS_PX) setNav(false);
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnapToBottom, BOTTOM_SNAP_IDLE_MS);
  };
  cleanups.push(() => {
    window.clearTimeout(snapTimer);
    snapTween?.kill();
  });

  /* ── Entrances (non-RM): header word-reveals, pills stagger-fade —
     after fonts (line grouping + Range + index derivation). */
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  let disposed = false;
  fontsReady.then(() => {
    if (disposed) return;
    alignWork();
    deriveTileWidth();
    measureUnits(); /* index offsets + push heights need real glyphs */
    frame();
    if (reduced) return;
    wrapFooter();
    [hlFeatured, hlWork].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });
    pills.forEach((pill, i) => {
      timeouts.push(setTimeout(() => pill.classList.add('is-visible'), PILLS_AT_MS + i * PILL_STAGGER_MS));
    });
  });
  cleanups.push(() => timeouts.forEach(clearTimeout));

  const onResize = () => {
    alignWork();
    deriveTileWidth();
    measureUnits();
    frame();
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  /* Boot. */
  buildTiles();
  frame();

  if (import.meta.env.DEV) {
    window.__workPage = {
      /* Occluded-pane verification: rAF can be frozen there, which
         stalls gsap's ticker — expose it so probes can drive time
         manually (the tickOnce convention). */
      gsap,
      metaYs: () => units.map((u) => ({
        slug: u.project.slug,
        y: u.el.style.transform,
        blockH: u.blockH,
      })),
      tick: (dtMs) => driver?.tickOnce(dtMs),
      state: () => ({
        pos,
        targetPos,
        posOffset,
        setLength: set.length,
        tileCount: tiles.length,
        carouselMax: carouselMax(),
        maxPos: maxPos(),
        footerEntered,
        dockedIdx,
        dockedSlug: units[dockedIdx]?.project.slug ?? null,
        filter: currentFilter,
      }),
      driver: () => (driver ? driver.state() : null),
      setPos: (p) => {
        posOffset += p - pos;
        setPosClamped(p);
      },
    };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
  };
}
