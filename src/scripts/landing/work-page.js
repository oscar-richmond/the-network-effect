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
 * ACTIVE DETECTION: the tile whose image band contains the stage's
 * vertical centre, with a 24px deadzone (hysteresis: inside gaps or
 * the deadzone the previous winner holds — no flutter). The meta
 * swaps via one persistent out→set→in blur-fade state machine (the
 * industry-hover pattern): rapid traversal retargets the pending
 * project; nothing stacks. The /0N index derives 6px from the
 * title's rendered right edge per swap (Oscar's rev).
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
 * RM: travel remains (direct wheel/touch writes, no momentum), meta
 * swaps instant, footer content static, no custom cursor.
 * <1024px: the CSS stacked list is the page; no machinery boots.
 */
import gsap from 'gsap';
import { createDriftDriver } from '../holding/holding-shared.js';
import { WORK_PROJECTS } from '../../data/landing/featured-work.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

const BASE_TOP_PX = 441; // first tile top = meta title top (Oscar's rev)
const IMG_H_PX = 640;
const GAP_PX = 8;
const PITCH_PX = IMG_H_PX + GAP_PX; // 648
const DEADZONE_PX = 24;
const INDEX_GAP_PX = 6; // /0N sits this far right of the title (Oscar's rev)
const FOOTER_REVEAL_PX = 811; // the landing footer's full height
const FOOTER_ENTRANCE_AT_PX = 200; // fire ~200px into the reveal (landing)
const CURSOR_LERP = 0.25; // the canvas-cursor feel
const PILL_STAGGER_MS = 80;
const PILLS_AT_MS = 300;
const LINE_STAGGER_S = 0.12;

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

export function initWorkPage() {
  const stage = document.querySelector('[data-work-stage]');
  const carousel = document.querySelector('[data-work-carousel]');
  if (!(stage instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return () => {};

  const metaTitle = document.querySelector('[data-work-meta-title]');
  const metaIndex = document.querySelector('[data-work-meta-index]');
  const metaDesc = document.querySelector('[data-work-meta-desc]');
  const metaEls = [metaTitle, metaIndex, metaDesc].filter((el) => el instanceof HTMLElement);
  const footer = document.querySelector('[data-work-footer]');

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

  /* ── The set + tiles (finite — no ring, no padding). */
  let set = WORK_PROJECTS;
  let tiles = [];

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
      img.height = 640;
      a.appendChild(img);
      carousel.appendChild(a);
      return { el: a, project: p };
    });
  };

  /* Travel bounds: phase 1 ends when the last image's bottom meets
     the viewport bottom; phase 2 adds the footer reveal. */
  const carouselMax = () => {
    const contentBottom = BASE_TOP_PX + (tiles.length - 1) * PITCH_PX + IMG_H_PX;
    return Math.max(contentBottom - stageH(), 0);
  };
  const maxPos = () => carouselMax() + FOOTER_REVEAL_PX;

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
    const revealT = clamp(pos - carouselMax(), 0, FOOTER_REVEAL_PX);
    stage.style.transform = revealT > 0 ? `translate3d(0, ${(-revealT).toFixed(2)}px, 0)` : '';
    if (!footerEntered && revealT > FOOTER_ENTRANCE_AT_PX) {
      footerEntered = true;
      playFooterEntrance();
    }
  };

  /* ── Active detection + the single persistent meta swap. */
  let activeSlug = null;
  let shownSlug = WORK_PROJECTS[0]?.slug ?? null;
  let targetProject = null;
  let swapping = false;

  /* The /0N derives from the title's rendered right edge. */
  const placeIndex = () => {
    if (!(metaTitle instanceof HTMLElement) || !(metaIndex instanceof HTMLElement)) return;
    const meta = metaTitle.offsetParent;
    if (!(meta instanceof HTMLElement)) return;
    const tRect = metaTitle.getBoundingClientRect();
    const mRect = meta.getBoundingClientRect();
    metaIndex.style.left = `${(tRect.right - mRect.left + INDEX_GAP_PX).toFixed(1)}px`;
  };

  const applyMetaText = (p) => {
    if (metaTitle) metaTitle.textContent = p.title.join(' ');
    if (metaIndex) metaIndex.textContent = p.index;
    if (metaDesc) metaDesc.textContent = p.desc;
    placeIndex();
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
            runSwap();
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
    const p1 = Math.min(pos, carouselMax());
    for (let i = 0; i < tiles.length; i += 1) {
      const y = BASE_TOP_PX + i * PITCH_PX - p1;
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

  /* ── Input: the drift driver (non-RM) or direct writes (RM). The
     clamp REBASES the offset so momentum can't bank debt past the
     ends — reversal is immediate. */
  let posOffset = 0;
  let driver = null;

  const frame = () => {
    layout();
    detectActive();
  };

  const setPosClamped = (raw, driverTravel) => {
    pos = clamp(raw, 0, maxPos());
    if (raw !== pos && driverTravel !== undefined) posOffset = pos - driverTravel;
    frame();
  };

  if (!reduced) {
    driver = createDriftDriver(stage, {
      autoDrift: 0,
      touch: true,
      onFrame: (travelPx) => {
        setPosClamped(travelPx + posOffset, travelPx);
      },
    });
    cleanups.push(() => driver.destroy());
  } else {
    const onWheel = (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageH() : 1;
      setPosClamped(pos + e.deltaY * unit);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    cleanups.push(() => stage.removeEventListener('wheel', onWheel));
    let touchY = 0;
    const onTouchStart = (e) => { if (e.touches.length) touchY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (!e.touches.length) return;
      e.preventDefault();
      setPosClamped(pos + (touchY - e.touches[0].clientY));
      touchY = e.touches[0].clientY;
    };
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    cleanups.push(() => {
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
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
    activeSlug = null;
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
  const timeouts = [];
  let footerWordEls = [];
  const footerImg = footer?.querySelector('[data-footer-img]');
  const stLines = footer ? Array.from(footer.querySelectorAll('[data-footer-st-line]')) : [];

  const wrapFooter = () => {
    if (!footer) return;
    stLines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      footerWordEls.push(line);
    });
    Array.from(footer.querySelectorAll('[data-footer-col]')).forEach((col, i) => {
      const base = i * 0.12;
      if (col.matches('a, button')) {
        wrapWordRevealElement(col, { baseDelay: base });
        footerWordEls.push(col);
      } else {
        Array.from(col.children).forEach((child, j) => {
          if (!(child instanceof HTMLElement)) return;
          wrapWordRevealElement(child, { baseDelay: base + j * 0.06 });
          footerWordEls.push(child);
        });
      }
    });
    Array.from(footer.querySelectorAll('.landing-footer__rowitem')).forEach((item, i) => {
      if (!(item instanceof HTMLElement)) return;
      wrapWordRevealElement(item, { baseDelay: 0.9 + i * 0.04 });
      footerWordEls.push(item);
    });
  };

  const playFooterEntrance = () => {
    footerWordEls.forEach((el) => playLineRevealElement(el));
    timeouts.push(setTimeout(() => {
      if (footerImg) footerImg.classList.add('is-visible');
    }, 240));
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
    const onOver = (e) => {
      const hit = e.target instanceof Element ? e.target.closest('[data-work-link]') : null;
      const nowOver = !!hit;
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
    window.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerover', onOver);
    stage.addEventListener('pointerout', onOver);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerover', onOver);
      stage.removeEventListener('pointerout', onOver);
      window.cancelAnimationFrame(cursorRaf);
      document.documentElement.classList.remove('work-cursor-on', 'work-cursor-live');
      document.body.classList.remove('work-cursor-on');
    });
  }

  /* ── Entrances (non-RM): header word-reveals, pills stagger-fade —
     after fonts (line grouping + Range + index derivation). */
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  let disposed = false;
  fontsReady.then(() => {
    if (disposed) return;
    alignWork();
    placeIndex();
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
    placeIndex();
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
      swapState: () => ({ swapping, target: targetProject?.slug ?? null, shown: shownSlug }),
      state: () => ({
        pos,
        posOffset,
        setLength: set.length,
        tileCount: tiles.length,
        carouselMax: carouselMax(),
        maxPos: maxPos(),
        footerEntered,
        activeSlug,
        shownSlug,
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
