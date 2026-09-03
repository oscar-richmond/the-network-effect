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
import { FOUNDERS_HANDOFF_T, foundersDepartingEdgeInsetPx } from './landing-founders.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const LINE_REVEAL_S = 1.2; // the reveal transition's own duration
const ENTRY_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)'; // house reveal curve

/* R4 (Oscar, 2026-08-26): the OUR NETWORK title (the desktop label)
   and the "Trusted by…" subtitle arrive LATER than the rest of the
   entrance. Oscar asked for "a second or so", converted to SCROLL
   DISTANCE (the page is scrubbed — a time delay would vary with
   scroll speed): ≈700px/s is the relaxed house wheel pace under
   Lenis, so 700px ≈ 1s, and it stays small against the section's
   pinned dwell. Landing entry only — the /services prev-exit path
   keeps the single-trigger entrance. The reveal animation itself is
   untouched; only its trigger moves.
   HANDOFF REV (Oscar, 2026-08-27): on the landing the delayed
   trigger is re-anchored to the founders handoff's third line —
   see the trigger block — so this constant now serves only the
   fallback path there (founders track missing). */
const NETWORK_TITLE_DELAY_PX = 700;

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
/* THE TRANSITION (Oscar's rev, 2026-08-26): the FOUNDERS PORTRAIT
   swap — reveal-behind. The incoming image sits FULLY OPAQUE beneath
   (decode-gated, so ground can never show mid-wipe); the outgoing
   layer clips away left→right on the house curve with the 6px
   moving-edge blur. Slots stagger left→right across the sweep. */
const NETWORK_STRIP_WIPE_MS = 450;  /* one slot's L→R wipe (the lightbox/founders beat) */
const NETWORK_STRIP_SWEEP_MS = 400; /* stagger travel across the strip */
const NETWORK_STRIP_EDGE_BLUR_PX = 6;
const NETWORK_STRIP_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)'; /* house curve */
const NETWORK_STRIP_DECODE_TIMEOUT_MS = 1500;

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
    industry sets — and any future entry authored without a crop).
    Every branch COVERS the slot window — the authored crops do so by
    their Figma geometry, cover-fit by definition. */
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

/** Waits for a strip img to be decodable so the wipe never reveals a
    half-painted frame (the founders white-flash lesson, time-domain).
    Bounded — a slow network degrades to a plain swap, never a hang. */
function decodeWithin(img, ms) {
  const decode = img.decode ? img.decode() : Promise.resolve();
  return Promise.race([
    decode.catch(() => {}),
    new Promise((resolve) => { setTimeout(resolve, ms); }),
  ]);
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
  /* The authored imgs become the OVER layers; an UNDER img is cloned
     beneath each at init (same slot, same default entry), mirroring
     the founders portrait pair — the wipe clips the over layer off
     the always-full under layer. DESKTOP HOVER ONLY: the mobile
     build has no strip swap, so its DOM stays exactly as shipped
     (width-gated as well as hover-gated). */
  const stripOvers = canHover && !isMobileViewport() && strip instanceof HTMLElement
    ? Array.from(strip.querySelectorAll('img'))
    : [];
  const stripUnders = stripOvers.map((over) => {
    const under = over.cloneNode(false);
    under.classList.add('landing-network__strip-img--under');
    over.parentElement?.insertBefore(under, over);
    return under;
  });
  const swapTimeouts = [];
  const wipeAnims = [];
  assertStripSets();

  let currentKey = 'all';
  let targetKey = 'all';
  let swapBusy = false;

  const pumpSwap = () => {
    if (swapBusy || targetKey === currentKey) return;
    if (!(strip instanceof HTMLElement) || !stripOvers.length) return;
    swapBusy = true;
    const key = targetKey;
    const set = normalisedSet(key);
    const vw = window.innerWidth || 1728;
    /* Stage every UNDER layer first and wait for its decode — the
       wipe must never reveal ground or a half-painted frame. */
    const staged = stripUnders.map((under, i) => {
      applyStripEntry(under, set[i]);
      return decodeWithin(under, NETWORK_STRIP_DECODE_TIMEOUT_MS);
    });
    Promise.all(staged).then(() => {
      if (disposed) return; /* a hover-swap in flight must not animate torn-down DOM */
      stripOvers.forEach((over, i) => {
        const win = over.parentElement ?? over;
        const x = Math.min(Math.max(win.getBoundingClientRect().left, 0), vw);
        const delay = Math.round((x / vw) * NETWORK_STRIP_SWEEP_MS);
        /* The founders reveal-behind, time-domain: clip the over
           layer off left→right on the house curve; the 6px edge
           blur rides the moving edge (a SELF-filter — blend-safe). */
        const anim = over.animate(
          [
            { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
            { clipPath: 'inset(0 0 0 50%)', filter: `blur(${NETWORK_STRIP_EDGE_BLUR_PX}px)`, offset: 0.5 },
            { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
          ],
          { duration: NETWORK_STRIP_WIPE_MS, delay, easing: NETWORK_STRIP_CURVE, fill: 'forwards' },
        );
        wipeAnims.push(anim);
        /* Promote once THIS slot's wipe lands: the over becomes the
           new image again (full, unclipped — its own animation
           cancelled), ready for the next cycle; identical to the
           founders pair's reset. */
        swapTimeouts.push(setTimeout(() => {
          applyStripEntry(over, set[i]);
          anim.cancel();
        }, delay + NETWORK_STRIP_WIPE_MS + 30));
      });
      swapTimeouts.push(setTimeout(() => {
        currentKey = key;
        swapBusy = false;
        pumpSwap();
      }, NETWORK_STRIP_SWEEP_MS + NETWORK_STRIP_WIPE_MS + 60));
    });
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
      wipeAnims.forEach((a) => a.cancel());
      cleanupHover.forEach((fn) => fn());
      cleanupEnt();
    };
  }

  const lines = Array.from(section.querySelectorAll('.landing-network__line'));
  /* The delayed group (R4): title + subtitle + the desktop OUR
     NETWORK label. Partitioned only on the landing entry — prev-exit
     hosts (/services) keep every line on the main trigger. */
  const delayParents = [
    section.querySelector('[data-landing-network-title]'),
    section.querySelector('[data-landing-network-subtitle]'),
    section.querySelector('.landing-network__label'),
  ].filter((el) => el instanceof HTMLElement);
  const titleDelayPx = section.dataset.networkEntry === 'prev-exit' ? 0 : NETWORK_TITLE_DELAY_PX;
  const delayedLines = titleDelayPx
    ? lines.filter((line) => delayParents.some((p) => p.contains(line)))
    : [];
  const mainLines = lines.filter((line) => !delayedLines.includes(line));
  /* The rising group (Oscar's arrival rev): logo rows, both fade
     bands and the photo strip — parked below the stage until the
     entrance, so every overlay arrives ALREADY composed on its
     media (rev 2: the edge gradient was painting early over the
     services fade — it rides with the group now). */
  const stage = section.querySelector('[data-landing-network-stage]');
  /* R9 (Oscar 2026-09-02): the logo rows and their band backdrop are
     gone from desktop (landing.css) — the strip is the one riser now
     (its own height from the stage bottom); the fades that framed
     the rows went with them. Mobile's list above keeps the rows. */
  const media = Array.from(
    section.querySelectorAll('[data-landing-network-strip]'),
  ).filter((el) => el instanceof HTMLElement);

  const timeouts = [];
  let trigger = null;
  let delayedTrigger = null;
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
    const playGroup = (group) => {
      group.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = delayMap.get(inner) ?? '';
        });
        playLineRevealElement(line);
      });
    };
    const hideGroup = (group) => {
      group.forEach((line) => {
        line.querySelectorAll('.lr-inner').forEach((inner) => {
          inner.style.transitionDelay = '0s';
        });
        line.querySelectorAll(':scope > .lr-clip').forEach((clip) => {
          clip.classList.remove('lr-visible');
        });
      });
    };
    const showContent = () => {
      shown = true;
      playGroup(mainLines);
      setMediaTransition();
      void section.offsetWidth; /* commit current state under the transition */
      media.forEach((el) => { el.style.transform = 'translateY(0px)'; });
    };
    const hideContent = () => {
      shown = false;
      hideGroup(mainLines);
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
    /* Handoff gate (Oscar 2026-08-27, landing entry only): the
       entrance holds until the departing WHO WE ARE image has risen
       past the viewport's lower-third line — its bottom edge above
       (1 − FOUNDERS_HANDOFF_T)·vh. The measure is the founders
       track's bottom (≡ the expanded photo's bottom through the
       whole departure, verified), turned into an absolute scroll
       position so the trigger is exact at any viewport height. The
       old anchor (`top+=pinOffset() top`) fired the instant the
       departure BEGAN — image bottom still at the viewport's bottom
       edge — and remains the fallback only if the track is missing.
       prev-exit hosts (/services) keep their own anchor untouched. */
    const foundersHandoffScroll = (line) => {
      const foundersTrack = document.querySelector('[data-landing-founders-track]');
      if (!(foundersTrack instanceof HTMLElement)) return null;
      /* R21: the departing IMAGE's edge in DOCUMENT space — the track's
         bottom (in flow, scroll-linear) minus the photo's fixed inset
         from the section's edge (24: the image no longer expands, so
         its edge sits that much above the track's once the section has
         released; while pinned it never reaches the line). A live rect
         of the pinned photo would not be scroll-linear here. */
      const bottom = foundersTrack.getBoundingClientRect().bottom + (window.scrollY || 0)
        - foundersDepartingEdgeInsetPx();
      return Math.round(bottom - (window.innerHeight || 0) * line);
    };
    trigger = ScrollTrigger.create({
      trigger: section,
      start: () =>
        section.dataset.networkEntry === 'prev-exit'
          ? `top ${prevExitOffset()}px`
          : foundersHandoffScroll(1 - FOUNDERS_HANDOFF_T) ?? `top+=${pinOffset()} top`,
      end: 'max',
      onEnter: showContent,
      onLeaveBack: hideContent,
    });
    /* R4's delayed group, re-anchored with the handoff gate (Oscar
       2026-08-27): the title/subtitle now arrive at the THIRD line
       itself (image bottom = FOUNDERS_HANDOFF_T·vh) — the fixed
       NETWORK_TITLE_DELAY_PX (700) would land past the point the
       image fully clears, so a forward settle could rest on a stage
       missing its title. vh/3 of scroll after the main entrance
       (≈324–383px) keeps R4's later-arrival intent and guarantees
       the whole entrance has played wherever the settle can stop.
       Landing entry only — the array is empty on prev-exit hosts. */
    if (delayedLines.length) {
      delayedTrigger = ScrollTrigger.create({
        trigger: section,
        start: () =>
          foundersHandoffScroll(FOUNDERS_HANDOFF_T) ?? `top+=${pinOffset() + titleDelayPx} top`,
        end: 'max',
        onEnter: () => playGroup(delayedLines),
        onLeaveBack: () => hideGroup(delayedLines),
      });
    }
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    swapTimeouts.forEach(clearTimeout);
    wipeAnims.forEach((a) => a.cancel());
    cleanupHover.forEach((fn) => fn());
    window.removeEventListener('resize', onEntryResize);
    section.style.background = '';
    if (stage instanceof HTMLElement) stage.style.background = '';
    groundTrigger?.kill();
    trigger?.kill();
    delayedTrigger?.kill();
  };
}
