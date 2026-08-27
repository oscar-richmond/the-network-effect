/**
 * /work — FEATURED WORK page machinery (Figma 27:3103; Oscar's
 * finite-travel rev 2026-08-06).
 *
 * DRIVER (Oscar's rev 3 — the case-page resistance ALL the way
 * down): a LENIS-SEMANTICS virtual scroller. Wheel deltas move the
 * TARGET position directly (the earlier drift-driver velocity
 * layer spread each tick into a coast, so sustained scrolling
 * reached a speed-matched steady state and felt 1:1 — the Lenis
 * feel IS discrete ticks smoothed only by the position lerp); the
 * render position chases the target at the case page's exact
 * Lenis value (0.065) in an owned rAF loop. Touch: 1:1 drag while
 * down + flick momentum decaying into the same lerp. A real Lenis
 * instance still doesn't fit: it wants a scrollable document and
 * this page deliberately has none.
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
 * TRAVEL-AND-DOCK METAS (Oscar's rev 4 — WIPE IN PLACE): each
 * project's title + /0N + description is a per-project unit in the
 * left column riding its image's vertical position; it PINS at the
 * dock (441, the old meta position) and STAYS THERE — never
 * displaced. As the successor's meta travels up and over it, the
 * pinned text wipes LINE BY LINE, bottom first, each line blurring
 * + fading as the incoming edge approaches it (WIPE_LEAD ahead of
 * contact, so a line is gone before the new text physically
 * overlaps it) — the services roll-over / hero exit-wipe contract,
 * pure f(travel), mirrored exactly on reversal. y_i =
 * max(linkedY_i, dockY), successor-first so each unit knows the
 * incoming edge. Fully-overtaken units rest at the dock at opacity
 * 0. The /0N derives 6px off each unit's title; wipe lines are
 * measured per unit (title line + the desc's rendered lines). The
 * layer sits UNDER the blur band like the images and keeps its
 * clip above the dock (belt — nothing crosses it now). Docking is
 * announced via a polite live region. NOTE: brand-black ink — no
 * blend rides these transforms; the page's only difference
 * element remains the cursor.
 *
 * CURSOR: [ VIEW CASE STUDY + ] — the case-study gallery-cursor
 * construction (Oscar's rev; was the big dot + label pair): one
 * top-level fixed element blending difference itself (the
 * nav-logo shape; a wrapper would isolate the blend), centring
 * margins measured in JS, following via left/top at the
 * canvas-cursor 0.25 lerp. The site's canvas dot hides while it
 * is live. Gated (hover:hover)+(pointer:fine) — NOTE: false
 * system-wide on Oscar's machine; verify on another input device.
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
 * <=1024px: the CSS stacked list is the page; no machinery boots.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORK_PROJECTS } from '../../data/landing/featured-work.js';
import { initMobileEntrance } from './m-entrance.js';
import { wrapWordRevealElement, playLineRevealElement, wrapStaticLines } from '../line-reveal.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { LIVE_CASE_SLUGS } from '../../data/landing/case-studies.js';
import { initViewCaseCursor } from './view-case-cursor.js';

const BASE_TOP_PX = 441; // first tile top = meta title top (Oscar's rev)
const IMG_H_PX = 616; // Oscar's rev: the pre-412 height (640) minus 24
const GAP_PX = 8;
const PITCH_PX = IMG_H_PX + GAP_PX; // 624
const END_GAP_PX = 163; /* ground below the last image before the
  reveal — the site-wide 139 pre-footer whitespace +24 on THIS
  page only (Oscar's rev 2026-08-07: the /work bottom read tighter
  than asked; other pages stay at 139). */
const TILE_RIGHT_MARGIN_PX = 16; // right edge held at stage - 16
/* Tile left edge (regression fix, 2026-08-26): originally DERIVED as
   "8px left of the nav logo's T" — authored against the old CENTRED
   wordmark (logo left 768.3 → tiles at 760.3). The nav respec
   (976b83f) moved the wordmark to the LEFT edge (x24), which dragged
   the tiles to x16 / full-bleed and broke the row layout. The nav is
   no longer a stable anchor, so the left edge is now the stage
   literal the derivation used to produce (the site's 1728 px-literal
   grammar; the shell keeps the inner viewport at 1728). */
const TILE_LEFT_PX = 760;
const DOCK_Y_PX = BASE_TOP_PX; // the dock = the old meta position (441)
const META_WIPE_BLUR_PX = 6; // the services roll-over blur (Oscar's rev)
/* The in-place wipe window: each line wipes over SPAN px of the
   incoming edge's travel, starting LEAD px before contact. LEAD >
   SPAN - (the title line's ~36 bottom) guarantees every line
   completes by the moment the incoming docks. */
const META_WIPE_SPAN_PX = 60;
const META_WIPE_LEAD_PX = 40;
const FOOTER_REVEAL_PX = 830; // the landing footer's full height (13:381)
const FOOTER_ENTRANCE_AT_PX = 200; // fire ~200px into the reveal (landing)
/* The case-page scroll RESISTANCE (Oscar's rev): the render
   position lerps toward the input target at the Lenis value the
   case study uses (0.065) — wheel input lands with the same lag/
   ease instead of 1:1. Feel constant, one place. */
const SCROLL_SMOOTH_LERP = 0.065;
/* (PILLS_AT/STAGGER retired with the desktop filter row,
   2026-08-26 — the mobile chips keep their own load-beat entrance
   via initMobileEntrance below.) */
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

  /* <=1024 (the viewport.js seam) — the 402-frame rebuild: the page
     is the NATIVE VERTICAL LIST (.work-m, its own markup in file
     order); no driver, no docking metas, no cursor, no band. This
     branch wires:
     1. FILTERS — desktop semantics on the list entries (same tags,
        aria-pressed, live-region count), with the desktop's
        blur-out → swap → blur-in grammar as the CSS .is-swapping
        twin; the entry set toggles at the blurred midpoint. RM:
        instant toggle, no blur (the transition is no-preference).
     2. ENTRANCES — header lines via the shared line-reveal path,
        pills on the load beat, then one once-only trigger per entry
        (image → meta stagger via the CSS delays). */
  if ((window.innerWidth || 1728) <= 1024) {
    /* THE CHIP ROW (2026-08-26): the desktop filter pills are gone
       from the page markup (frame 35:1524 has none), but the MOBILE
       list keeps its working chips — so this branch now BUILDS the
       row it used to share, same markup shape, same slot (after the
       WORK headline in the left column). Desktop never renders any
       filter markup. (Char-ripple is touch-gated site-wide, so the
       chips never needed its wiring on this branch.) */
    const leftCol = document.querySelector('.work-stage__left');
    if (leftCol instanceof HTMLElement && !leftCol.querySelector('[data-work-filters]')) {
      const row = document.createElement('div');
      row.className = 'work-page__filters';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Filter projects');
      row.setAttribute('data-work-filters', '');
      [['all', 'ALL'], ['immerse', 'IMMERSE'], ['connect', 'CONNECT'], ['amplify', 'AMPLIFY']].forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `work-pill work-pill--${key}`;
        b.setAttribute('data-work-filter', key);
        b.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
        b.setAttribute('data-char-ripple-trigger', '');
        const span = document.createElement('span');
        span.setAttribute('data-char-ripple', '');
        span.textContent = label;
        b.appendChild(span);
        row.appendChild(b);
      });
      leftCol.appendChild(row);
    }
    const pills = Array.from(document.querySelectorAll('[data-work-filter]'));
    const list = document.querySelector('[data-work-m]');
    const entries = Array.from(document.querySelectorAll('[data-work-m-entry]'));
    const reducedM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SWAP_MS = 220; /* keep in step with work.css .is-swapping */

    const setEntries = (key) => {
      let shown = 0;
      entries.forEach((entry) => {
        const tags = (entry.dataset.tags ?? '').split(' ');
        const match = key === 'all' || tags.includes(key);
        entry.classList.toggle('is-filtered-out', !match);
        if (match) shown += 1;
      });
      if (metaLive instanceof HTMLElement) {
        metaLive.textContent = `${shown} project${shown === 1 ? '' : 's'} shown`;
      }
    };

    let mCurrent = 'all';
    let mSwapping = false;
    const swapTimeouts = [];
    const applyFilter = (key) => {
      if (mSwapping || key === mCurrent) return;
      mCurrent = key;
      pills.forEach((p) => {
        p.setAttribute('aria-pressed', p.dataset.workFilter === key ? 'true' : 'false');
      });
      if (reducedM || !(list instanceof HTMLElement)) {
        setEntries(key);
        return;
      }
      mSwapping = true;
      list.classList.add('is-swapping');
      swapTimeouts.push(setTimeout(() => {
        setEntries(key);
        list.classList.remove('is-swapping');
        mSwapping = false;
      }, SWAP_MS));
    };
    const onPillClick = (e) => {
      const pill = e.target instanceof Element ? e.target.closest('[data-work-filter]') : null;
      if (pill instanceof HTMLElement) applyFilter(pill.dataset.workFilter ?? 'all');
    };
    document.addEventListener('click', onPillClick);
    cleanups.push(() => {
      document.removeEventListener('click', onPillClick);
      swapTimeouts.forEach(clearTimeout);
    });

    /* Entrances (skip whole-sale under RM — CSS renders complete). */
    if (!reducedM) {
      const stage = document.querySelector('[data-work-stage]');
      const header = [
        document.querySelector('[data-work-hl-featured]'),
        document.querySelector('[data-work-hl-work]'),
      ].filter((el) => el instanceof HTMLElement);
      cleanups.push(
        initMobileEntrance(stage instanceof HTMLElement ? stage : document.body, {
          lines: header,
          media: pills,
        }),
      );
      const entryTriggers = entries.map((entry) =>
        ScrollTrigger.create({
          trigger: entry,
          start: 'top 80%',
          once: true,
          onEnter: () => entry.classList.add('is-visible'),
        }),
      );
      cleanups.push(() => entryTriggers.forEach((t) => t.kill()));
    } else {
      /* RM: the hidden states are no-preference-gated, but the
         is-visible class keeps the DOM state coherent for both. */
      entries.forEach((entry) => entry.classList.add('is-visible'));
    }

    return () => cleanups.forEach((fn) => fn());
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stageH = () => stage.clientHeight || window.innerHeight;

  /* ── W-under-A (the featured section's Range mechanism). */
  const hlFeatured = document.querySelector('[data-work-hl-featured]');
  const hlWork = document.querySelector('[data-work-hl-work]');
  /* Frame 2001:67 (2026-08-26): WORK sits RIGHT-FLUSH with
     FEATURED (the frame's 11-space lead lands its right edge on the
     block's right edge) — derived from the rendered rects so it
     holds if either width changes. (Replaces the old W-under-A
     Range derivation, which encoded the retired 48px pair.) */
  const alignWork = () => {
    if (!(hlFeatured instanceof HTMLElement) || !(hlWork instanceof HTMLElement)) return;
    const fRect = hlFeatured.getBoundingClientRect();
    const wRect = hlWork.getBoundingClientRect();
    if (fRect.width === 0 || wRect.width === 0) return;
    hlWork.style.left = `${(fRect.right - wRect.width - stage.getBoundingClientRect().left).toFixed(2)}px`;
  };

  /* Tile geometry: left edge at the stage literal (TILE_LEFT_PX —
     see the note on the constant), right edge held at stage-16. Set
     as CSS vars (carousel + tiles read them); re-derived on resize. */
  const deriveTileWidth = () => {
    const left = TILE_LEFT_PX;
    const width = (stage.clientWidth || window.innerWidth) - TILE_RIGHT_MARGIN_PX - left;
    stage.style.setProperty('--work-tile-left', `${left.toFixed(1)}px`);
    stage.style.setProperty('--work-tile-w', `${width.toFixed(1)}px`);
  };

  /* ── The set + tiles + meta units (finite — no ring). Metas are
     rebuilt WITH the tiles (they belong to projects), so filtered
     — the single full set since the filters left. */
  const set = WORK_PROJECTS;
  let tiles = [];
  let units = [];

  const measureUnits = () => {
    units.forEach((u) => {
      const tRect = u.title.getBoundingClientRect();
      const uRect = u.el.getBoundingClientRect();
      /* Per-LINE wipe units (Oscar's rev): the title line
         plus the desc's rendered lines (wrapStaticLines — rebuilt
         from the source text so font-load/resize re-derive the
         grouping), each with its bottom offset inside the unit,
         ordered BOTTOM FIRST (the incoming edge reaches the lower
         lines first). */
      u.desc.textContent = u.descText;
      const descLines = wrapStaticLines(u.desc);
      const lineUnits = [
        { els: [u.title], bottom: tRect.bottom - uRect.top },
        ...descLines.map((clip) => ({
          els: [clip],
          bottom: clip.getBoundingClientRect().bottom - uRect.top,
        })),
      ];
      u.wipeLines = lineUnits.sort((a, b) => b.bottom - a.bottom);
      /* The unit's content height (desc bottom) — the wipe range
         and the centring basis. */
      u.blockH = u.desc.offsetTop + u.desc.offsetHeight;
      /* VIEWPORT-CENTRED dock (Oscar's rev): each unit pins with
         its title+description block centred in the viewport —
         per-unit (block heights vary with description length). */
      u.dockY = stageH() / 2 - u.blockH / 2;
    });
    /* The layer's belt clip follows the highest dock. */
    if (metasLayer instanceof HTMLElement && units.length) {
      const minDock = Math.min(...units.map((u) => u.dockY));
      metasLayer.style.clipPath = `inset(${(minDock - 8).toFixed(0)}px 0 0 0)`;
    }
  };

  const buildTiles = () => {
    /* The network section's applySetToTrack rebuild: wipe,
       re-render, re-derive the travel bounds. */
    carousel.textContent = '';
    tiles = set.map((p, i) => {
      /* A4 (2026-08-27): unbuilt case studies render as INERT
         placeholders — no href, no data-work-link (the VIEW CASE
         STUDY cursor hit-tests that attribute, so no affordance
         promising navigation), out of the tab order by element
         kind. The card content stays; only the dead navigation
         goes. onLinkClick remains as the belt for live links. */
      const live = LIVE_CASE_SLUGS.includes(p.slug);
      const a = document.createElement(live ? 'a' : 'span');
      a.className = live ? 'work-tile' : 'work-tile is-placeholder';
      if (live && a instanceof HTMLAnchorElement) {
        a.href = `/work/${p.slug}`;
        a.setAttribute('data-work-link', '');
        a.setAttribute('aria-label', `${p.title.join(' ')} — view project`);
      }
      a.dataset.slug = p.slug;
      a.dataset.tileIndex = String(i);
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
        /* (No /0N index — frame 35:1524; the data field survives
           for the other renders.) */
        const desc = document.createElement('p');
        desc.className = 'work-page__meta-desc';
        desc.textContent = p.desc;
        u.append(title, desc);
        u.style.transform = `translate3d(0, ${(BASE_TOP_PX + i * PITCH_PX).toFixed(0)}px, 0)`;
        metasLayer.appendChild(u);
        return { el: u, project: p, title, desc, descText: p.desc, blockH: 150, dockY: null, wipeLines: null, wiped: false };
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

  /* ── Layout: pure f(pos). Carousel rides phase 1; the stage slides
     up through phase 2 (the reveal). */
  let pos = 0;
  let footerEntered = false;
  let stepScrollRef = null; /* the dev handle's manual tick */
  const layout = () => {
    const p1 = Math.min(pos, carouselMax());
    tiles.forEach(({ el }, i) => {
      const y = BASE_TOP_PX + i * PITCH_PX - p1;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
    const revealT = clamp(pos - carouselMax(), 0, FOOTER_REVEAL_PX);
    layoutMetas(p1, revealT);
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
    if (metaLive) metaLive.textContent = `${p.title.join(' ')}. ${p.desc}`;
  };

  const dockedProbe = (p1) => {
    for (let i = units.length - 1; i >= 0; i -= 1) {
      if (BASE_TOP_PX + i * PITCH_PX - p1 <= (units[i].dockY ?? DOCK_Y_PX)) return i;
    }
    return 0;
  };

  const layoutMetas = (p1, revealT = 0) => {
    if (!units.length) return;
    /* FOOTER-REVEAL HOLD (Oscar's rev): as the stage rides up over
       the footer, the docked meta stays VIEWPORT-STATIONARY
       (compensating the stage transform) until the last image's
       bottom meets the description's bottom — then it locks to the
       image and departs with it. At carouselMax the last image's
       bottom sits at stageH - END_GAP by construction, so contact
       lands after stageH - END_GAP - dock - blockH of reveal
       travel. ONE hold for ALL pinned units, derived from the
       VISIBLE (docked) unit — per-unit holds froze at different
       amounts (block heights vary), shifting the invisible older
       units relative to their successor and nudging their wipe
       values back under 1: the faint blurred ghost titles Oscar
       caught. Uniform hold keeps the relative geometry — and every
       wipe state — identical through the reveal. */
    let hold = 0;
    if (revealT > 0) {
      const du = units[Math.min(units.length - 1, Math.max(0, dockedProbe(p1)))];
      if (du) {
        const dDock = du.dockY ?? DOCK_Y_PX;
        hold = Math.min(revealT, Math.max(stageH() - END_GAP_PX - dDock - du.blockH, 0));
      }
    }
    /* Docked = the highest-index unit pinned at ITS dock (docks are
       per-unit, viewport-centred). */
    const docked = dockedProbe(p1);
    if (reduced) {
      /* RM: no travel choreography — instant swap-in-place at the
         dock, driven by the same dock-crossing trigger. */
      units.forEach((u, i) => {
        const dockI = u.dockY ?? DOCK_Y_PX;
        u.el.style.visibility = i === docked ? '' : 'hidden';
        u.el.style.transform = `translate3d(0, ${(dockI + hold).toFixed(1)}px, 0)`;
      });
      announceDock(docked);
      return;
    }
    let succY = Infinity;
    for (let i = units.length - 1; i >= 0; i -= 1) {
      const u = units[i];
      const linked = BASE_TOP_PX + i * PITCH_PX - p1;
      const dockI = u.dockY ?? DOCK_Y_PX;
      let y = Math.max(linked, dockI); /* pinned — NEVER displaced */
      if (y === dockI) y += hold; /* the reveal hold, uniform */
      /* THE OVERTAKE WIPE (Oscar's rev 4 — IN PLACE, line by line):
         the pinned text stays put; each of its lines blurs + fades
         as the INCOMING EDGE (the successor's top) approaches it —
         bottom lines first, each across META_WIPE_SPAN_PX of edge
         travel, starting META_WIPE_LEAD_PX before contact so a
         line is gone before the new text overlaps it. Pure
         f(travel); reversal restores top-first, mirrored. Plain
         black ink — filters carry no blend risk. */
      if (u.wipeLines) {
        const clear = succY - y > u.blockH + META_WIPE_LEAD_PX + META_WIPE_SPAN_PX;
        if (!clear) {
          u.wipeLines.forEach((line) => {
            const lineBottomAbs = y + line.bottom;
            const t = clamp(
              (lineBottomAbs + META_WIPE_LEAD_PX - succY) / META_WIPE_SPAN_PX,
              0,
              1,
            );
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

  /* ── Input: the Lenis-semantics virtual scroller (non-RM) or
     direct writes (RM). Wheel moves the TARGET directly; the rAF
     loop lerps the render position toward it — resistance
     everywhere, not just at the ends. */
  let targetPos = 0;
  let flickVel = 0; /* touch flick momentum, px/s */

  const frame = () => {
    layout();
  };

  /* Direct placement (tweens, focus, filters, RM, dev): render AND
     target snap together — no smoothing on deliberate moves. */
  const setPosClamped = (raw) => {
    pos = clamp(raw, 0, maxPos());
    targetPos = pos;
    frame();
    onPosChange();
  };

  /* ROOT-CAUSE FIX (Oscar's report: no scroll over the footer):
     wheel/touch capture must cover the WHOLE page — the revealed
     footer is a sibling fixed layer, so the input surface is
     document.body. */
  const inputRegion = document.body;
  if (!reduced) {
    const onWheel = (e) => {
      e.preventDefault();
      /* A wheel during the bottom-snap glide hands control back to
         the user (the landing snap's Lenis-retarget equivalent). */
      snapTween?.kill();
      flickVel = 0;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageH() : 1;
      targetPos = clamp(targetPos + e.deltaY * unit, 0, maxPos());
    };
    inputRegion.addEventListener('wheel', onWheel, { passive: false });
    cleanups.push(() => inputRegion.removeEventListener('wheel', onWheel));

    /* Touch: 1:1 position coupling while the finger is down (the
       page-scroll convention), flick momentum sampled on release —
       decaying into the same lerp. touchmove is passive:false so
       the page never rubber-bands; taps stay tappable. */
    let touchY = 0;
    let touchT = 0;
    let touchVel = 0;
    const onTouchStart = (e) => {
      if (!e.touches.length) return;
      touchY = e.touches[0].clientY;
      touchT = performance.now();
      touchVel = 0;
      flickVel = 0; /* grab: momentum stops under the finger */
      snapTween?.kill();
    };
    const onTouchMove = (e) => {
      if (!e.touches.length) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const now = performance.now();
      const dy = touchY - y;
      const dt = Math.max((now - touchT) / 1000, 0.001);
      targetPos = clamp(targetPos + dy, 0, maxPos());
      touchVel = touchVel * 0.6 + (dy / dt) * 0.4;
      touchY = y;
      touchT = now;
    };
    const onTouchEnd = () => {
      flickVel = touchVel;
      touchVel = 0;
    };
    inputRegion.addEventListener('touchstart', onTouchStart, { passive: true });
    inputRegion.addEventListener('touchmove', onTouchMove, { passive: false });
    inputRegion.addEventListener('touchend', onTouchEnd, { passive: true });
    cleanups.push(() => {
      inputRegion.removeEventListener('touchstart', onTouchStart);
      inputRegion.removeEventListener('touchmove', onTouchMove);
      inputRegion.removeEventListener('touchend', onTouchEnd);
    });

    /* The owned rAF loop: flick integration + the position lerp.
       One smoothing step lives in stepScroll so the dev handle can
       drive it manually (the tickOnce convention). */
    const stepScroll = (dtMs) => {
      const dt = Math.min(dtMs, 100) / 1000;
      if (flickVel !== 0) {
        targetPos = clamp(targetPos + flickVel * dt, 0, maxPos());
        flickVel *= 0.95;
        if (Math.abs(flickVel) < 20) flickVel = 0;
      }
      if (Math.abs(targetPos - pos) > 0.05) {
        pos += (targetPos - pos) * SCROLL_SMOOTH_LERP;
        if (Math.abs(targetPos - pos) < 0.05) pos = targetPos;
        frame();
        onPosChange();
      }
    };
    stepScrollRef = stepScroll;
    let rafId = 0;
    let lastT = 0;
    const loop = (t) => {
      stepScroll(lastT ? t - lastT : 16.7);
      lastT = t;
      rafId = window.requestAnimationFrame(loop);
    };
    rafId = window.requestAnimationFrame(loop);
    cleanups.push(() => window.cancelAnimationFrame(rafId));
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

  /* (The FILTERS are REMOVED — Oscar, 2026-08-26: frame 35:1524 has
     no pill row. The old machinery here — applySet's rebuild +
     bounds re-derive for filtered sets, the blur-out → swap →
     blur-in, aria-pressed tracking — is gone with it: the set is
     always the full WORK_PROJECTS and the travel bounds derive once
     from it (plus resize). NOTE the driver was already FINITE (the
     infinite loop was retired in an earlier rev), so no wrap logic
     existed to simplify beyond this. The MOBILE chip row lives in
     the <=1024 branch above, which now builds its own markup.) */

  /* ── Keyboard: focusing a tile brings it to the anchor. */
  const onFocusIn = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
    if (!(link instanceof HTMLElement) || !link.dataset.tileIndex) return;
    const i = Number(link.dataset.tileIndex);
    const desired = clamp(BASE_TOP_PX + i * PITCH_PX - (stageH() / 2 - IMG_H_PX / 2), 0, maxPos());
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
  let snapTween = null;
  const onTopClick = (e) => {
    const el = e.currentTarget;
    /* HOME is an anchor with a real destination (/landing) — let it
       navigate; BACK TO TOP (a button) glides the travel home. */
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    const proxy = { p: pos };
    if (reduced) {
      setPosClamped(0);
      return;
    }
    snapTween?.kill();
    /* Tracked as snapTween so teardown kills a glide in flight (it
       used to run ~1.2s of setPosClamped against dead DOM). */
    snapTween = gsap.to(proxy, {
      p: 0,
      duration: 1.2,
      ease: 'power3.out',
      onUpdate: () => {
        setPosClamped(proxy.p);
      },
    });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  /* ── Custom cursor — [ VIEW CASE STUDY + ]. The machinery lives
     in view-case-cursor.js now (Oscar's rev): the landing page's
     FEATURED WORK carousel uses the same cursor, and one module
     means the two can never drift. */
  cleanups.push(initViewCaseCursor({
    cursorEl: document.querySelector('[data-work-cursor]'),
    linkSelector: '[data-work-link]',
    reduced,
  }));

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
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown) return;
    if (pos <= carouselMax() || pos >= maxPos() - BOTTOM_EPSILON_PX) return;
    const proxy = { p: pos };
    snapTween = gsap.to(proxy, {
      p: maxPos(),
      duration: 1.0,
      ease: 'power3.out',
      onUpdate: () => {
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

  /* ── Entrances (non-RM): header word-reveals — after fonts (line
     grouping + Range derivation). The pills' beat left with the
     filter row; the header reveal is the page's whole load beat. */
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
      tick: (dtMs) => stepScrollRef?.(dtMs),
      state: () => ({
        pos,
        targetPos,
        flickVel,
        setLength: set.length,
        tileCount: tiles.length,
        carouselMax: carouselMax(),
        maxPos: maxPos(),
        footerEntered,
        dockedIdx,
        dockedSlug: units[dockedIdx]?.project.slug ?? null,
      }),
      setPos: (p) => {
        setPosClamped(p);
      },
    };
  }

  return () => {
    disposed = true;
    setNav(false); /* restore the nav chars if torn down mid-sweep */
    cleanups.forEach((fn) => fn());
  };
}
