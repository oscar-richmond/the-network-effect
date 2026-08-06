/**
 * /work — FEATURED WORK page machinery (Figma 27:3103).
 *
 * DRIVER: the holding pages' single-velocity drift driver
 * (createDriftDriver, holding-shared.js — REUSED, not copied: wheel
 * impulses + touch position-coupling + flick momentum + rAF
 * ownership + visibility pause, the approved motion), with
 * autoDrift 0 per the /holding-2 mobile-travel precedent — travel
 * is scroll-driven only, reversible, momentum consistent with the
 * holding gallery. A dedicated Lenis instance was rejected: Lenis
 * wants a scrollable document and this page deliberately has none;
 * two scroll authorities is the settle-shake bug class.
 *
 * WRAP: infinite both directions via modulo — each tile's y is
 * ((BASE + i*PITCH - pos) wrapped into [-LEAD, total-LEAD)), the
 * holding-travel / network-marquee recycle arithmetic. Filtered
 * sets re-derive the wrap; short sets (1–2 projects) are padded by
 * repeating the set until the ring exceeds the viewport by two
 * pitches, so the loop stays seamless at every length.
 *
 * ACTIVE DETECTION: the tile whose image band contains the stage's
 * vertical centre, with a 24px deadzone (hysteresis: inside gaps or
 * the deadzone the previous winner holds — no flutter under
 * jitter). The meta block swaps via one persistent out→set→in
 * blur-fade state machine (the industry-hover machinery pattern):
 * rapid traversal retargets the pending project; nothing stacks.
 *
 * CURSOR: fresh DOM cursor, not /old's canvas-cursor — that
 * machinery renders a dot on canvas with no text support; the
 * "View project +" circle is 30 lines of DOM with difference blend
 * handled by CSS. The wrapper follows via left/top (NEVER
 * transform — difference children; blend walk in work.css) with the
 * canvas-cursor's 0.25 lerp feel. Gated (hover:hover)+(pointer:
 * fine) — NOTE: false system-wide on Oscar's machine; verify the
 * cursor on another input device.
 *
 * PLACEHOLDER LINKS: tiles link to /work/[slug] — routes that don't
 * exist yet; navigation is prevented here until they do.
 *
 * RM: travel remains (direct wheel/touch writes, no momentum), meta
 * swaps instant, no blur transitions, no custom cursor.
 * <1024px: the CSS stacked list is the page; no machinery boots.
 */
import gsap from 'gsap';
import { createDriftDriver } from '../holding/holding-shared.js';
import { WORK_PROJECTS } from '../../data/landing/featured-work.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

const BASE_TOP_PX = 445; // first tile's top at pos 0 (file 528 - 83)
const IMG_H_PX = 640;
const GAP_PX = 8;
const PITCH_PX = IMG_H_PX + GAP_PX; // 648
const DEADZONE_PX = 24;
const CURSOR_LERP = 0.25; // the canvas-cursor feel
const PILL_STAGGER_MS = 80;
const PILLS_AT_MS = 300;

const mod = (n, m) => ((n % m) + m) % m;

export function initWorkPage() {
  const stage = document.querySelector('[data-work-stage]');
  const carousel = document.querySelector('[data-work-carousel]');
  if (!(stage instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return () => {};

  const metaTitle = document.querySelector('[data-work-meta-title]');
  const metaIndex = document.querySelector('[data-work-meta-index]');
  const metaDesc = document.querySelector('[data-work-meta-desc]');
  const metaEls = [metaTitle, metaIndex, metaDesc].filter((el) => el instanceof HTMLElement);

  const cleanups = [];

  /* Placeholder links — /work/[slug] routes don't exist yet. */
  const onLinkClick = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
    if (link) e.preventDefault();
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

  /* ── The set + tiles. */
  let set = WORK_PROJECTS; // active filtered set
  let tiles = []; // rendered ring: may repeat the set (short sets)
  let ringLen = 0; // tiles.length * PITCH

  const buildTiles = () => {
    /* The network section's applySetToTrack rebuild: wipe, re-render,
       re-derive the wrap. Short sets pad by repetition so the ring
       always exceeds the viewport by two pitches. */
    const data = [];
    if (set.length) {
      while (data.length * PITCH_PX < stageH() + 2 * PITCH_PX || data.length < set.length) {
        data.push(...set);
      }
    }
    carousel.textContent = '';
    tiles = data.map((p, i) => {
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
      img.width = 1000;
      img.height = 640;
      a.appendChild(img);
      carousel.appendChild(a);
      return { el: a, project: p };
    });
    ringLen = tiles.length * PITCH_PX;
  };

  /* ── Layout: pure f(pos), wrapped. LEAD keeps one pitch of ring
     above the stage top before recycling to the bottom. */
  let pos = 0;
  const layout = () => {
    const lead = PITCH_PX;
    tiles.forEach(({ el }, i) => {
      const y = mod(BASE_TOP_PX + i * PITCH_PX - pos + lead, ringLen) - lead;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
  };

  /* ── Active detection + the single persistent meta swap. */
  /* The SSR meta already shows the first project — seed the swap
     state from it so boot is a no-op and only REAL changes animate
     (no entrance tween on the meta: a fixed page's text is simply
     there at paint). */
  let activeSlug = null;
  let shownSlug = WORK_PROJECTS[0]?.slug ?? null;
  let targetProject = null;
  let swapping = false;

  const applyMetaText = (p) => {
    if (metaTitle) metaTitle.textContent = p.title.join(' ');
    if (metaIndex) metaIndex.textContent = p.tbc ? '/–' : p.index;
    if (metaDesc) metaDesc.textContent = p.desc;
  };

  const runSwap = () => {
    if (!targetProject || targetProject.slug === shownSlug) return;
    swapping = true;
    gsap.to(metaEls, {
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.2,
      ease: 'power1.in',
      overwrite: 'auto',
      onComplete: () => {
        /* Set-point reads the LATEST target — rapid traversal
           retargets here, nothing stacks. */
        const p = targetProject;
        shownSlug = p.slug;
        applyMetaText(p);
        gsap.to(metaEls, {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.3,
          ease: 'power1.out',
          overwrite: 'auto',
          onComplete: () => {
            swapping = false;
            runSwap(); // target moved on during the in-phase?
          },
        });
      },
    });
  };

  const requestMeta = (p) => {
    targetProject = p;
    if (reduced) {
      shownSlug = p.slug;
      applyMetaText(p);
      return;
    }
    if (!swapping) runSwap();
  };

  const detectActive = () => {
    if (!tiles.length) return;
    const anchor = stageH() / 2;
    const lead = PITCH_PX;
    for (let i = 0; i < tiles.length; i += 1) {
      const y = mod(BASE_TOP_PX + i * PITCH_PX - pos + lead, ringLen) - lead;
      if (anchor >= y + DEADZONE_PX && anchor <= y + IMG_H_PX - DEADZONE_PX) {
        const p = tiles[i].project;
        if (p.slug !== activeSlug) {
          activeSlug = p.slug;
          requestMeta(p);
        }
        return;
      }
    }
    /* Gap or deadzone under the anchor: the previous winner holds. */
  };

  /* ── Input: the drift driver (non-RM) or direct writes (RM). */
  let posOffset = 0; // filter resets / focus retargets layer over the driver
  let driver = null;

  const frame = () => {
    layout();
    detectActive();
  };

  if (!reduced) {
    driver = createDriftDriver(stage, {
      autoDrift: 0,
      touch: true,
      onFrame: (travelPx) => {
        pos = travelPx + posOffset;
        frame();
      },
    });
    cleanups.push(() => driver.destroy());
  } else {
    /* RM: travel remains, direct 1:1, no momentum. */
    const onWheel = (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageH() : 1;
      pos += e.deltaY * unit;
      frame();
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    cleanups.push(() => stage.removeEventListener('wheel', onWheel));
    let touchY = 0;
    const onTouchStart = (e) => { if (e.touches.length) touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (!e.touches.length) return;
      e.preventDefault();
      pos += touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      frame();
    };
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    cleanups.push(() => {
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
    });
  }

  /* ── Filters — blur-out → set swap → blur-in (the network
     industry-hover machinery pattern: different-length sets, the
     wrap re-derives on rebuild). */
  const pills = Array.from(document.querySelectorAll('[data-work-filter]'));
  let currentFilter = 'all';
  let filtering = false;

  const applySet = (key) => {
    const next = key === 'all'
      ? WORK_PROJECTS
      : WORK_PROJECTS.filter((p) => p.tags.includes(key));
    if (!next.length) return false; // no-tag TBC guard: never an empty ring
    set = next;
    buildTiles();
    posOffset = -(driver ? driver.state().travelPx : 0); // pos back to 0
    pos = 0;
    activeSlug = null;
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
    const lead = PITCH_PX;
    const y = mod(BASE_TOP_PX + i * PITCH_PX - pos + lead, ringLen) - lead;
    const desired = stageH() / 2 - IMG_H_PX / 2;
    posOffset += y - desired;
    pos += y - desired;
    frame();
  };
  carousel.addEventListener('focusin', onFocusIn);
  cleanups.push(() => carousel.removeEventListener('focusin', onFocusIn));

  /* ── Custom cursor (gate note: hover/fine reads FALSE system-wide
     on Oscar's machine — verify on another device). */
  const cursor = document.querySelector('[data-work-cursor]');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduced && fineHover && cursor instanceof HTMLElement) {
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
      /* left/top, never transform — difference children. */
      cursor.style.left = `${cx.toFixed(1)}px`;
      cursor.style.top = `${cy.toFixed(1)}px`;
      cursorRaf = window.requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const onOver = (e) => {
      const hit = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
      const nowOver = !!hit;
      if (nowOver === over) return;
      over = nowOver;
      if (over) {
        cx = tx;
        cy = ty;
        cursor.classList.add('is-active');
        if (!cursorRaf) cursorRaf = window.requestAnimationFrame(tick);
      } else {
        cursor.classList.remove('is-active');
        window.cancelAnimationFrame(cursorRaf);
        cursorRaf = 0;
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerover', onOver);
    stage.addEventListener('pointerout', onOver);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerover', onOver);
      stage.removeEventListener('pointerout', onOver);
      window.cancelAnimationFrame(cursorRaf);
      document.documentElement.classList.remove('work-cursor-on');
      document.body.classList.remove('work-cursor-on');
    });
  }

  /* ── Entrances (non-RM): header word-reveals, pills stagger-fade,
     meta blur-in — after fonts (line grouping + Range). */
  const timeouts = [];
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  let disposed = false;
  fontsReady.then(() => {
    if (disposed) return;
    alignWork();
    if (reduced) return;
    [hlFeatured, hlWork].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * 0.12);
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
    buildTiles();
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
         stalls gsap's ticker — expose it so probes can tick
         manually (the tickOnce convention). */
      gsap,
      swapState: () => ({ swapping, target: targetProject?.slug ?? null, shown: shownSlug }),
      state: () => ({
        pos,
        posOffset,
        setLength: set.length,
        tileCount: tiles.length,
        ringLen,
        activeSlug,
        shownSlug,
        filter: currentFilter,
      }),
      driver: () => (driver ? driver.state() : null),
      setPos: (p) => {
        posOffset += p - pos;
        pos = p;
        frame();
      },
    };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
  };
}
