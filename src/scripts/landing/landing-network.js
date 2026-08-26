/**
 * OUR NETWORK — entrance reveal (/landing).
 *
 * The carousels themselves are pure CSS animations (see landing.css)
 * and need no JS; this module only runs the section's arrival, in the
 * page vocabulary: line-reveals for title/subtitle/body (120ms
 * stagger), then the marquee rows and photo strip fade in on the
 * image slot timing. One-shot trigger at 65% viewport, fonts-gated
 * wrap. Reduced motion: static, everything visible, no trigger.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import {
  NETWORK_STRIP_DEFAULT,
  NETWORK_STRIP_SETS,
  NETWORK_STRIP_SLOTS,
} from '../../data/landing/network-strip-sets.js';
import { asset } from '../../utils/asset.js';
import { isMobileViewport, isTouchPrimary } from './viewport.js';
import { initMobileEntrance } from './m-entrance.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const LINE_REVEAL_S = 1.2; // the reveal transition's own duration
const ENTRY_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)'; // house reveal curve

/* ── Industry hover / PHOTO-STRIP swap (Oscar's rev, repointed
   2026-08-26 — the LOGO CAROUSELS no longer respond to hover at all:
   they keep their pure-CSS roll untouched; the old cell-swap
   machinery — shuffled(), buildCell(), applySetToTrack(), the cell
   pitch constants and the marquee is-swapping arming — is REMOVED,
   not dormant).
   Hovering (or keyboard-focusing) a sector term still dims the rest
   of the list to 10% (unchanged treatment), and now swaps THE PHOTO
   STRIP beneath the carousels to that industry's set under the same
   travelling blur crest the logo swap used: each strip image runs ONE
   blur pulse (0 → 12px → 0, NETWORK_STRIP_RIPPLE_MS, CSS keyframes)
   staggered left-to-right by its on-screen x (0..SWEEP across the
   viewport), and the img's src/crop is exchanged at that slot's own
   pulse peak. ONE persistent driver chases the LATEST target, so
   rapid hovers retarget cleanly — a new target simply becomes where
   the next (or current, on completion) cycle settles; no stacked
   transitions, no half-swapped strips. Hover-out returns to
   NETWORK_STRIP_DEFAULT symmetrically. Slot geometry (window widths,
   the 264 band) never changes — only the imgs inside. */
const NETWORK_STRIP_RIPPLE_MS = 600; /* one slot's blur pulse */
const NETWORK_STRIP_SWEEP_MS = 400;  /* crest travel across the strip */

/* SET-SIZE CONTRACT (Oscar's preference): exactly NETWORK_STRIP_SLOTS
   entries per industry. Dev THROWS (a bad content drop must be
   loud); production normalises (truncate / repeat) with a console
   error so the live strip degrades rather than breaks. */
function assertStripSets() {
  const bad = Object.entries(NETWORK_STRIP_SETS).filter(
    ([, set]) => set.length !== NETWORK_STRIP_SLOTS,
  );
  if (!bad.length) return;
  const msg = `network strip sets must have exactly ${NETWORK_STRIP_SLOTS} entries: ${bad
    .map(([k, set]) => `${k}=${set.length}`)
    .join(', ')}`;
  if (import.meta.env.DEV) throw new Error(msg);
  console.error(msg);
}

function normalisedSet(key) {
  const base = key === 'all' ? NETWORK_STRIP_DEFAULT : NETWORK_STRIP_SETS[key];
  if (!base) return NETWORK_STRIP_DEFAULT;
  const out = [];
  for (let i = 0; i < NETWORK_STRIP_SLOTS; i += 1) out.push(base[i % base.length]);
  return out;
}

/** Applies one set entry to a strip img: authored crop when the entry
    carries one (the DEFAULT set), cover-fit otherwise (placeholder
    industry sets — and any future entry authored without a crop). */
function applyStripEntry(img, entry) {
  img.src = asset(entry.src);
  if (typeof entry.w === 'number') {
    img.style.width = `${entry.w}px`;
    img.style.height = `${entry.h}px`;
    img.style.left = `${entry.x}px`;
    img.style.top = `${entry.y}px`;
    img.style.objectFit = '';
  } else {
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.left = '0px';
    img.style.top = '0px';
    img.style.objectFit = 'cover';
  }
}

export function initLandingNetwork() {
  const section = document.querySelector('[data-landing-network]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /* ── Industry hover wiring (house hover gate + ?forcehover escape;
     touch gets the resting state only — tapping a term does nothing,
     per the recommendation). Keyboard mirrors hover via focusin. */
  const canHover =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    new URLSearchParams(window.location.search).has('forcehover');
  const body = section.querySelector('[data-landing-network-body]');
  const strip = section.querySelector('[data-landing-network-strip]');
  const stripImgs = strip instanceof HTMLElement
    ? Array.from(strip.querySelectorAll('img'))
    : [];
  const swapTimeouts = [];
  assertStripSets();

  let currentKey = 'all';
  let targetKey = 'all';
  let swapBusy = false;

  const pumpSwap = () => {
    if (swapBusy || targetKey === currentKey) return;
    if (!(strip instanceof HTMLElement) || !stripImgs.length) return;
    swapBusy = true;
    const key = targetKey;
    const set = normalisedSet(key);
    const vw = window.innerWidth || 1728;
    stripImgs.forEach((img, i) => {
      /* Pin this slot in the crest from its on-screen x... */
      const win = img.parentElement ?? img;
      const x = Math.min(Math.max(win.getBoundingClientRect().left, 0), vw);
      const delay = Math.round((x / vw) * NETWORK_STRIP_SWEEP_MS);
      img.style.setProperty('--cell-ripple-delay', `${delay}ms`);
      /* ...and exchange its image at its own pulse peak (changing
         src does not restart a running CSS animation). */
      swapTimeouts.push(setTimeout(() => {
        applyStripEntry(img, set[i]);
      }, delay + NETWORK_STRIP_RIPPLE_MS / 2));
    });
    strip.classList.add('is-swapping');
    swapTimeouts.push(setTimeout(() => {
      strip.classList.remove('is-swapping');
      currentKey = key;
      swapBusy = false;
      pumpSwap();
    }, NETWORK_STRIP_SWEEP_MS + NETWORK_STRIP_RIPPLE_MS));
  };

  const activate = (term, withSwap = true) => {
    if (!(body instanceof HTMLElement)) return;
    body.classList.add('is-dimming');
    body.querySelectorAll('.landing-network__term').forEach((t) => {
      t.classList.toggle('is-active', t === term);
    });
    if (withSwap) {
      targetKey = term.dataset.networkTerm ?? 'all';
      pumpSwap();
    }
  };

  const deactivate = () => {
    if (!(body instanceof HTMLElement)) return;
    body.classList.remove('is-dimming');
    body.querySelectorAll('.landing-network__term.is-active').forEach((t) => {
      t.classList.remove('is-active');
    });
    targetKey = 'all';
    pumpSwap();
  };

  const cleanupHover = [];
  /* A3 (mobile brief): TOUCH gets tap-to-toggle — tap a term to dim
     the rest and swap the rows; tap the active term (or outside the
     list) to clear. An explicit click path, not focus: iOS Safari
     does not reliably focus <button> on tap. Bound before the hover
     branch so a hybrid device gets exactly one interaction model. */
  if (!canHover && isTouchPrimary() && body instanceof HTMLElement) {
    const onClick = (e) => {
      const term = e.target instanceof Element && e.target.closest('[data-network-term]');
      if (term instanceof HTMLElement) {
        /* Dim-only on touch (2026-08-26): the logo shuffle this used
           to drive is removed; the strip swap is hover/keyboard. */
        if (term.classList.contains('is-active')) deactivate();
        else activate(term, false);
      }
    };
    const onDocClick = (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-landing-network-body]')) {
        deactivate();
      }
    };
    body.addEventListener('click', onClick);
    document.addEventListener('click', onDocClick);
    cleanupHover.push(() => {
      body.removeEventListener('click', onClick);
      document.removeEventListener('click', onDocClick);
    });
  }
  if (canHover && body instanceof HTMLElement) {
    const onOver = (e) => {
      const term = e.target instanceof Element && e.target.closest('[data-network-term]');
      if (term instanceof HTMLElement) activate(term);
    };
    const onOut = (e) => {
      const to = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-network-term]');
      if (!to) deactivate();
    };
    const onFocusIn = (e) => {
      const term = e.target instanceof Element && e.target.closest('[data-network-term]');
      if (term instanceof HTMLElement && term.matches(':focus-visible')) activate(term);
    };
    const onFocusOut = (e) => {
      const to = e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-network-term]');
      if (!to) deactivate();
    };
    body.addEventListener('mouseover', onOver);
    body.addEventListener('mouseout', onOut);
    body.addEventListener('focusin', onFocusIn);
    body.addEventListener('focusout', onFocusOut);
    cleanupHover.push(() => {
      body.removeEventListener('mouseover', onOver);
      body.removeEventListener('mouseout', onOut);
      body.removeEventListener('focusin', onFocusIn);
      body.removeEventListener('focusout', onFocusOut);
    });
  }

  if (import.meta.env.DEV) {
    window.__landingNetworkSwap = {
      state: () => ({ currentKey, targetKey, swapBusy }),
      request: (key) => { targetKey = key; pumpSwap(); },
    };
  }

  /* MOBILE (the viewport.js seam): the section renders complete and
     static (landing.css linearises it) — no media parking, no ground
     toggle, no pin-anchored entrance. Everything ABOVE this line
     (marquee swaps + the term interaction, including the tap path)
     stays live; everything below is the desktop arrival. */
  if (isMobileViewport()) {
    /* Part-2 rebuild: the section still linearises (no pin, no media
       parking), but arrives via the shared mobile entrance — text +
       rows + strip fade-rise on the founders slots (.is-visible
       states in the landing-home mobile block; marquees/strip carry
       no blends, so the transform rise is safe). */
    const cleanupEnt = initMobileEntrance(section, {
      media: [
        section.querySelector('[data-landing-network-title]'),
        section.querySelector('[data-landing-network-subtitle]'),
        section.querySelector('[data-landing-network-body]'),
        ...section.querySelectorAll('[data-landing-network-row]'),
        section.querySelector('[data-landing-network-strip]'),
      ].filter((el) => el instanceof HTMLElement),
    });
    return () => {
      swapTimeouts.forEach(clearTimeout);
      cleanupHover.forEach((fn) => fn());
      cleanupEnt();
    };
  }

  const lines = Array.from(section.querySelectorAll('.landing-network__line'));
  /* The rising group (Oscar's arrival rev): logo rows, both fade
     bands and the photo strip — parked below the stage until the
     entrance, so every overlay arrives ALREADY composed on its
     media (rev 2: the edge gradient was painting early over the
     services fade — it rides with the group now). */
  const stage = section.querySelector('[data-landing-network-stage]');
  const media = Array.from(
    section.querySelectorAll(
      '[data-landing-network-row], [data-landing-network-strip], .landing-network__row-fade, .landing-network__edge-fade',
    ),
  ).filter((el) => el instanceof HTMLElement);

  const timeouts = [];
  let trigger = null;
  let groundTrigger = null;
  let disposed = false;
  let shown = false;

  /* Park each riser at the stage's bottom edge (its own distance —
     same duration and curve for all, so they LAND TOGETHER with the
     text). Re-derived on resize until the entrance has played. */
  const stageH = () => (stage instanceof HTMLElement ? stage.clientHeight : window.innerHeight);
  const parkMedia = () => {
    media.forEach((el) => {
      const d = Math.max(stageH() - el.offsetTop, 0);
      el.style.transform = `translateY(${d.toFixed(0)}px)`;
    });
  };
  parkMedia();
  /* TWO covers, split (Oscar's rev 3 — the video hole): the GROUND
     (track + stage black) toggles at 'top top', the exact scroll
     position the services fade completes — an invisible switch over
     identical black that also plugs the viewport-bottom strip the
     old whole-section visibility toggle left open between the
     section top and the (later, bottom-aligned) pin, where the
     fixed hero video showed through. The CONTENT toggles at the pin
     with a REAL reversed exit (below): the exited state IS the
     initial parked state, so no visibility hack is needed at all. */
  /* R2/R3 (Oscar, 2026-08-24/25): on the LANDING page the section
     sits BENEATH the founders track (z260 vs 261) as solid black
     from first paint — the held full-screen photo scrolls up to
     REVEAL it (no transparent phase, no ground toggle). /services
     keeps the shipped transparent-until-pin. */
  const opaqueEntry = document.body.classList.contains('landing-home');
  if (!opaqueEntry) {
    section.style.background = 'transparent';
    if (stage instanceof HTMLElement) stage.style.background = 'transparent';
  }
  const onEntryResize = () => {
    if (!shown) {
      media.forEach((el) => { el.style.transition = ''; });
      parkMedia();
    }
  };
  window.addEventListener('resize', onEntryResize);

  /* The stage pins BOTTOM-ALIGNED (sticky top 100dvh - 1097, so the
     strip's bottom kisses the viewport bottom — Oscar's rev 2); the
     pin therefore starts this many px after the section top. */
  /* MEASURED, not hardcoded: the stage is 1118px on /landing (frame
     16:113 respec) but keeps the shipped 1097px on /services, which
     embeds this same component — the CSS owns the number per page. */
  const pinOffset = () => Math.max(stageH() - window.innerHeight, 0);

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      /* Shared word reveal for every line — the sector lists' term
         buttons ride as whole atoms and the authored double-spaced
         separators survive (the wrap carries whitespace verbatim). */
      wrapWordRevealElement(line);
    });

    /* The synchronized entrance, at the pin (the black moment): text
       reveals in place; media rises over the SAME total time as the
       full text reveal (last line's delay + its transition), so both
       arrive in their final state together. The EXIT (Oscar's rev 3
       — scrolling back up previously just vanished everything) is
       the same gesture reversed: text back into its clips (delays
       zeroed so the lines leave together), media riding back down to
       parked, on the same curve. Both replay on every crossing —
       CSS transitions retarget cleanly mid-flight. */
    const totalS = (lines.length - 1) * LINE_STAGGER_S + LINE_REVEAL_S;
    /* Each inner's authored stagger delay, captured post-wrap so the
       exit can zero them and the next entrance can restore them. */
    const delayMap = new Map();
    lines.forEach((line) => {
      line.querySelectorAll('.lr-inner').forEach((inner) => {
        delayMap.set(inner, getComputedStyle(inner).transitionDelay);
      });
    });
    const setMediaTransition = () => {
      media.forEach((el) => {
        el.style.transition = `transform ${totalS.toFixed(2)}s ${ENTRY_CURVE}`;
      });
    };
    const showContent = () => {
      shown = true;
      lines.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = delayMap.get(inner) ?? '';
        });
        playLineRevealElement(line);
      });
      setMediaTransition();
      void section.offsetWidth; /* commit current state under the transition */
      media.forEach((el) => { el.style.transform = 'translateY(0px)'; });
    };
    const hideContent = () => {
      shown = false;
      lines.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = '0s';
        });
        line.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
          clip.classList.remove('lr-visible');
        });
      });
      setMediaTransition();
      void section.offsetWidth;
      parkMedia();
    };

    /* Ground cover — at the section top (= the services scrub end).
       Skipped on the landing page (opaque from first paint, above). */
    if (!opaqueEntry) groundTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'max',
      onEnter: () => {
        section.style.background = '';
        if (stage instanceof HTMLElement) stage.style.background = '';
      },
      onLeaveBack: () => {
        section.style.background = 'transparent';
        if (stage instanceof HTMLElement) stage.style.background = 'transparent';
      },
    });
    /* Content — at the bottom-aligned pin (the landing default),
       OR at the preceding sibling's exit when the host page opts in
       with entry="prev-exit" (/services — Oscar's rev 2026-08-08:
       enter as soon as the section above is fully out). The offset
       is MEASURED (section top − previous sibling's bottom, a
       layout constant per page), so host-page spacing changes can't
       silently break the anchor. */
    const prevExitOffset = () => {
      const prev = section.previousElementSibling;
      if (!prev) return 0;
      return Math.round(
        section.getBoundingClientRect().top - prev.getBoundingClientRect().bottom,
      );
    };
    trigger = ScrollTrigger.create({
      trigger: section,
      start: () =>
        section.dataset.networkEntry === 'prev-exit'
          ? `top ${prevExitOffset()}px`
          : `top+=${pinOffset()} top`,
      end: 'max',
      onEnter: showContent,
      onLeaveBack: hideContent,
    });
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    swapTimeouts.forEach(clearTimeout);
    cleanupHover.forEach((fn) => fn());
    window.removeEventListener('resize', onEntryResize);
    section.style.background = '';
    if (stage instanceof HTMLElement) stage.style.background = '';
    groundTrigger?.kill();
    trigger?.kill();
  };
}
