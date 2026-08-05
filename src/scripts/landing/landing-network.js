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
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { NETWORK_BRAND_SETS } from '../../data/landing/network-brands.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const LINE_REVEAL_S = 1.2; // the reveal transition's own duration
const ENTRY_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)'; // house reveal curve

/* ── Industry hover / logo swap (Oscar's rev) ─────────────────────
   Hovering (or keyboard-focusing) a sector term dims the rest of the
   list to 10% and swaps the carousels' logo set under the CTAs'
   ripple, scaled up: each cell's logo runs ONE blur pulse (0 ->
   12px -> 0, 600ms, CSS keyframes) staggered left-to-right by its
   on-screen x (0..SWAP_SWEEP_MS across the viewport), and the img's
   src is exchanged at that cell's own pulse peak — a travelling
   crest that reveals the new set as it passes. Same-length sets
   swap in place (no DOM rebuild, animations undisturbed); if a
   future real set changes length, geometry is normalised by a
   rebuild AFTER the ripple (instant — revisit the choreography when
   such a set actually lands). Delays pin at ripple start; marquee
   drift (~30px/s) over one ripple is invisible. ONE persistent driver chases the LATEST target,
   so rapid hovers retarget cleanly — a new target simply becomes
   where the next (or current, on completion) cycle settles; no
   stacked transitions, no half-swapped states. Set sizes may differ
   per industry: each rebuild re-derives the wrap (set width = 192px
   pitch x count, copies = enough to cover the widest viewport + 1,
   --marquee-set-w = the translate distance), so the seamless loop
   holds for any length. Carousels keep animating throughout — the
   var/DOM change lands mid-flight but under full blur. */
const SWAP_RIPPLE_MS = 600;
const SWAP_SWEEP_MS = 400;
const CELL_PITCH_PX = 192;

/**
 * PLACEHOLDER randomiser (Oscar's rev): until the real per-industry
 * sets land, each industry swap shows a random arrangement of the
 * full set so the change is VISIBLE; hover-out restores the
 * canonical order. Becomes dead weight (and removable) once
 * NETWORK_BRAND_SETS carries real per-industry arrays.
 */
function shuffled(set) {
  const out = [...set];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Exact-text line wrap: the shared wrapLineRevealElement splits a
 * line into words and rejoins them SINGLE-spaced — which destroys
 * the sector list's authored double spaces around its slashes
 * (NBSPs die too: the splitter treats them as whitespace). These are
 * single nowrap lines, so word-level splitting buys nothing — this
 * builds the same clip/inner structure around the line's exact text.
 * playLineRevealElement drives it identically.
 */
function wrapLineExact(el, delaySeconds) {
  const clip = document.createElement('span');
  clip.className = 'lr-clip';
  const inner = document.createElement('span');
  inner.className = 'lr-inner';
  inner.style.transition = `transform 1.2s cubic-bezier(0.42,0,0.24,1) ${delaySeconds.toFixed(2)}s`;
  /* MOVE the children (term buttons, separators, text nodes) rather
     than flattening to text — preserves both the interactive
     structure and every authored space. */
  while (el.firstChild) inner.appendChild(el.firstChild);
  clip.appendChild(inner);
  el.appendChild(clip);
}

/** Builds one cell's DOM for a brand entry (mirrors the Astro markup). */
function buildCell(brand) {
  const cell = document.createElement('span');
  cell.className = 'landing-network__cell';
  const img = document.createElement('img');
  img.src = brand.src;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.style.width = `${brand.w}px`;
  img.style.height = `${brand.h}px`;
  cell.appendChild(img);
  return cell;
}

/** Rebuilds a track for a set, re-deriving the seamless-wrap geometry. */
function applySetToTrack(track, set) {
  const setW = CELL_PITCH_PX * set.length;
  const copies = Math.max(2, Math.ceil((window.innerWidth || 1728) / setW) + 1);
  track.style.setProperty('--marquee-set-w', `${setW}px`);
  track.textContent = '';
  for (let c = 0; c < copies; c += 1) {
    set.forEach((brand) => track.appendChild(buildCell(brand)));
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
  const rows = Array.from(section.querySelectorAll('[data-landing-network-row]'));
  const tracks = Array.from(section.querySelectorAll('.landing-network__track'));
  const swapTimeouts = [];

  let currentKey = 'all';
  let targetKey = 'all';
  let swapBusy = false;
  let currentSetLength = NETWORK_BRAND_SETS.all.length;

  const pumpSwap = () => {
    if (swapBusy || targetKey === currentKey) return;
    swapBusy = true;
    const key = targetKey;
    const base = NETWORK_BRAND_SETS[key] ?? NETWORK_BRAND_SETS.all;
    const vw = window.innerWidth || 1728;
    tracks.forEach((track) => {
      /* Random arrangement per industry swap (placeholder — see
         shuffled()); the resting 'all' state restores canonical
         order. Each track gets its own shuffle so the rows differ. */
      const set = key === 'all' ? base : shuffled(base);
      Array.from(track.children).forEach((cell, i) => {
        const img = cell.querySelector('img');
        if (!img) return;
        /* Pin this cell's slot in the wave from its on-screen x
           (offscreen copies ride the nearest edge)... */
        const x = Math.min(Math.max(cell.getBoundingClientRect().left, 0), vw);
        const delay = Math.round((x / vw) * SWAP_SWEEP_MS);
        img.style.setProperty('--cell-ripple-delay', `${delay}ms`);
        /* ...and exchange its logo at its own pulse peak. Changing
           src does not restart a running CSS animation. */
        const brand = set[i % set.length];
        swapTimeouts.push(setTimeout(() => {
          img.src = brand.src;
          img.style.width = `${brand.w}px`;
          img.style.height = `${brand.h}px`;
        }, delay + SWAP_RIPPLE_MS / 2));
      });
      /* Same-length sets (all current ones) are now fully swapped
         in place; a future different-length set needs its geometry
         normalised once the ripple is over. */
      if (set.length !== currentSetLength) {
        swapTimeouts.push(setTimeout(() => {
          applySetToTrack(track, set);
        }, SWAP_SWEEP_MS + SWAP_RIPPLE_MS));
      }
    });
    rows.forEach((r) => r.classList.add('is-swapping'));
    swapTimeouts.push(setTimeout(() => {
      rows.forEach((r) => r.classList.remove('is-swapping'));
      currentSetLength = base.length;
      currentKey = key;
      swapBusy = false;
      pumpSwap();
    }, SWAP_SWEEP_MS + SWAP_RIPPLE_MS));
  };

  const activate = (term) => {
    if (!(body instanceof HTMLElement)) return;
    body.classList.add('is-dimming');
    body.querySelectorAll('.landing-network__term').forEach((t) => {
      t.classList.toggle('is-active', t === term);
    });
    targetKey = term.dataset.networkTerm ?? 'all';
    pumpSwap();
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
      applyTestSet: (n) => {
        const set = NETWORK_BRAND_SETS.all.slice(0, n);
        tracks.forEach((t) => applySetToTrack(t, set));
        return { setW: CELL_PITCH_PX * n, cells: tracks[0].children.length };
      },
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
  section.style.background = 'transparent';
  if (stage instanceof HTMLElement) stage.style.background = 'transparent';
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
  const pinOffset = () => Math.max(1097 - window.innerHeight, 0);

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      if (line.closest('.landing-network__body')) {
        wrapLineExact(line, i * LINE_STAGGER_S);
      } else {
        wrapLineRevealElement(line);
      }
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

    /* Ground cover — at the section top (= the services scrub end). */
    groundTrigger = ScrollTrigger.create({
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
    /* Content — at the bottom-aligned pin, both directions. */
    trigger = ScrollTrigger.create({
      trigger: section,
      start: () => `top+=${pinOffset()} top`,
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
