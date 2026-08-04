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
const MEDIA_AT_MS = 1040;

/* ── Industry hover / logo swap (Oscar's rev) ─────────────────────
   Hovering (or keyboard-focusing) a sector term dims the rest of the
   list to 10% and swaps the carousels' logo set under a blur cover:
   a left-to-right blur WAVE (each cell delayed by its on-screen x,
   0..SWAP_SWEEP_MS across the viewport; per-cell ramp 500ms) ->
   rebuild both tracks from the target set and IMMEDIATELY wave the
   un-blur left-to-right the same way — no hold at full blur: the
   fresh logos are committed blurred (forced reflow) with fresh
   position-derived delays in the same tick the cover starts
   lifting. Delays are pinned at each phase start; the marquees
   drift ~30px/s so the anchoring error over a phase is invisible. ONE persistent driver chases the LATEST target,
   so rapid hovers retarget cleanly — a new target simply becomes
   where the next (or current, on completion) cycle settles; no
   stacked transitions, no half-swapped states. Set sizes may differ
   per industry: each rebuild re-derives the wrap (set width = 192px
   pitch x count, copies = enough to cover the widest viewport + 1,
   --marquee-set-w = the translate distance), so the seamless loop
   holds for any length. Carousels keep animating throughout — the
   var/DOM change lands mid-flight but under full blur. */
const SWAP_BLUR_MS = 500;
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

  /* Pin each cell's share of the wave: transition-delay from its
     current on-screen x (clamped to the viewport — offscreen copies
     ride the nearest edge). Reading rects also forces the style
     commit the rebuild handoff relies on. */
  const assignSweepDelays = () => {
    const vw = window.innerWidth || 1728;
    tracks.forEach((t) => {
      Array.from(t.children).forEach((cell) => {
        const img = cell.querySelector('img');
        if (!img) return;
        const x = Math.min(Math.max(cell.getBoundingClientRect().left, 0), vw);
        img.style.transitionDelay = `${Math.round((x / vw) * SWAP_SWEEP_MS)}ms`;
      });
    });
  };

  const pumpSwap = () => {
    if (swapBusy || targetKey === currentKey) return;
    swapBusy = true;
    assignSweepDelays();
    rows.forEach((r) => r.classList.add('is-swapping'));
    swapTimeouts.push(setTimeout(() => {
      const key = targetKey;
      const base = NETWORK_BRAND_SETS[key] ?? NETWORK_BRAND_SETS.all;
      /* Random arrangement per industry swap (placeholder — see
         shuffled()); the resting 'all' state keeps canonical order.
         Each track gets its own shuffle so the rows differ too. */
      tracks.forEach((t) => applySetToTrack(t, key === 'all' ? base : shuffled(base)));
      currentKey = key;
      /* The rect reads inside assignSweepDelays force the style/
         layout pass that commits the fresh imgs at blur(12px) under
         is-swapping (delay doesn't apply to an initial commit) —
         then drop the class in the same tick: they un-blur FROM
         blurred, left to right, with zero hold. */
      assignSweepDelays();
      rows.forEach((r) => r.classList.remove('is-swapping'));
      swapTimeouts.push(setTimeout(() => {
        swapBusy = false;
        pumpSwap();
      }, SWAP_BLUR_MS + SWAP_SWEEP_MS));
    }, SWAP_BLUR_MS + SWAP_SWEEP_MS));
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
  const media = Array.from(
    section.querySelectorAll('[data-landing-network-row], [data-landing-network-strip]'),
  );

  const timeouts = [];
  let trigger = null;
  let disposed = false;

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

    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        lines.forEach((line) => {
          if (line instanceof HTMLElement) playLineRevealElement(line);
        });
        timeouts.push(
          setTimeout(() => {
            media.forEach((el) => el.classList.add('is-visible'));
          }, MEDIA_AT_MS),
        );
      },
    });
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    swapTimeouts.forEach(clearTimeout);
    cleanupHover.forEach((fn) => fn());
    trigger?.kill();
  };
}
