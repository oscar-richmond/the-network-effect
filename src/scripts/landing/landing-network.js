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
  /* The rising group (Oscar's arrival rev): logo rows, their fade
     band and the photo strip — parked below the stage until the
     entrance. (The edge gradient stays put: over the bare #161616
     ground it is invisible, so parking it buys nothing.) */
  const stage = section.querySelector('[data-landing-network-stage]');
  const media = Array.from(
    section.querySelectorAll(
      '[data-landing-network-row], [data-landing-network-strip], .landing-network__row-fade',
    ),
  ).filter((el) => el instanceof HTMLElement);

  const timeouts = [];
  let trigger = null;
  let disposed = false;
  let entered = false;

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
  const onEntryResize = () => {
    if (!entered) parkMedia();
  };
  window.addEventListener('resize', onEntryResize);

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
       arrive in their final state together. */
    const totalS = (lines.length - 1) * LINE_STAGGER_S + LINE_REVEAL_S;
    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      once: true,
      onEnter: () => {
        entered = true;
        lines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
        media.forEach((el) => {
          el.style.transition = `transform ${totalS.toFixed(2)}s ${ENTRY_CURVE}`;
        });
        void section.offsetWidth; /* commit parked state under the transition */
        media.forEach((el) => {
          el.style.transform = 'translateY(0px)';
        });
        timeouts.push(setTimeout(() => {
          media.forEach((el) => {
            el.style.transition = '';
            el.style.transform = '';
          });
        }, totalS * 1000 + 200));
      },
    });
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    swapTimeouts.forEach(clearTimeout);
    cleanupHover.forEach((fn) => fn());
    window.removeEventListener('resize', onEntryResize);
    trigger?.kill();
  };
}
