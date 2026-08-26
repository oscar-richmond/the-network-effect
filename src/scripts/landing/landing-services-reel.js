/**
 * WHAT WE DO — THE SERVICES REEL (/landing; frames 29:859 expanded +
 * 30:1191 stacked, 2026-08-26). Desktop only (≤1024 keeps the
 * shipped mobile stack in landing-services.js, untouched).
 *
 * BASE = THE STAGING (8ec705a) STACK MECHANICS, carried over:
 *   · each pillar RISES RISE_PX from below the viewport (power1.out)
 *     and FIXES at its parked divider (184 / 280 / 422 — the
 *     Option-11 active position; Option-12 gives the stacked pitch);
 *   · the divider's FILL drains scaleX 1→0 across the rise — the
 *     progress bar;
 *   · ROLL-OVER WIPES: the covered pillar's lower content blurs and
 *     fades unit by unit at the derived edge-crossing as the next
 *     opaque panel rides over (occlusion free — panels are opaque);
 *   · GENTLE COMPACTION: pillar 1 eases from 184 to the stacked 138
 *     while its title row / desc close from +68/+66 to +44/+42 —
 *     layout `top` only (the titles carry difference blends);
 *   · Lenis-idle SNAP, single authority, active in rise windows.
 *
 * THE NEW REEL, between a pillar's fix and the next rise: the
 * services list translates up REEL_TRAVEL px behind the gradient
 * blur (top edge on the title's top), rows dissolving out through
 * it; the ACTIVE row is whichever sits level with the WE BUILD /
 * WE SHAPE / WE CREATE label (hysteresis at ±REEL_HYST_T of the
 * row pitch), and each landing swaps the image via THE CASE-STUDY
 * GALLERY treatment (two-phase L→R clip wipe, 450ms/phase, 6px
 * moving edge blur, house curve, pending-index latch — reused, not
 * reinvented). The reel completes when the list's bottom divider
 * reaches the label's bottom; the next pillar rises on that cue.
 * Fully scrubbed and reversible, image swaps included.
 *
 * THE FADE-TO-BLACK keeps its exact contract (constants verbatim —
 * its fourth home): the section's ground falls to GROUND_DARK over
 * the final TRANSITION_GROUND_FADE_PX, completing as Featured
 * Work's top crosses the viewport bottom.
 *
 * RM: no machinery — the markup + CSS render the full Option-11
 * expanded layout in flow, default image per pillar, no blur, no
 * swapping.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { getLenisInstance } from './landing-hero-scroll.js';
import { isMobileViewport } from './viewport.js';
import { SERVICES_REEL_PILLARS } from '../../data/landing/services-reel.js';

gsap.registerPlugin(ScrollTrigger);

/* ── Geometry (frames 29:859 / 30:1191, −118 chrome, pillar-local
   offsets from each pillar's divider). ─────────────────────────── */
const ACTIVE_Y = [184, 280, 422];  /* fixed divider Y per pillar (viewport) */
const STACKED_Y1 = 138;            /* pillar 1's compacted Y (Option 12) */
const TITLE_TOP = 68;              /* title row below the divider (expanded) */
const TITLE_TOP_STACKED = 44;      /* … compacted (Option 12) */
const LIST_TOP = 190;              /* list + label top below the divider */
const ROW_PITCH = 53;              /* divider + text row pitch */
const LABEL_H = 19;
const WWD_Y = 146;                 /* WHAT WE DO (Option 11) */
const WWD_Y_STACKED = 100;         /* … once pillar 1 compacts (Option 12) */

/* ── Beats (scroll px). ────────────────────────────────────────── */
const RISE_PX = 800;                    /* the staging card rise, kept */
const REEL_PX_PER_SERVICE = 220;        /* TUNABLE — reel pace per row */
const TRANSITION_DWELL_PX = 250;        /* verbatim through relocations */
const TRANSITION_GROUND_FADE_PX = 500;  /* verbatim */
const GROUND_DARK = '#161616';
const GROUND_LIGHT = '#eeeef0';

/* ── The reel fade (item: gradient + blur, named): top edge at the
   title top; fully opaque by there, clear by the list top. ─────── */
const REEL_FADE_TOP_PX = TITLE_TOP;              /* gradient top edge */
const REEL_FADE_H_PX = LIST_TOP - TITLE_TOP;     /* 122 — dissolve span */
const REEL_FADE_BLUR_PX = 12;                    /* backdrop blur */

/* ── Image wipe — THE CASE-STUDY GALLERY TREATMENT, reused. ────── */
const IMG_WIPE_MS = 450;              /* per phase (the lightbox beat) */
const IMG_WIPE_EDGE_BLUR_PX = 6;
const IMG_WIPE_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';
const REEL_HYST_T = 0.35;             /* commit window around row centres */

/* Roll-over wipe (staging constants, kept). */
const WIPE_LEAD_PX = 40;
const WIPE_SPAN_PX = 120;
const WIPE_BLUR_PX = 6;

const SNAP_IDLE_MS = 150;
const SNAP_DURATION_S = 0.6;
const LINE_STAGGER_S = 0.12;

export function initLandingServicesReel() {
  const root = document.querySelector('[data-sreel]');
  const section = document.querySelector('[data-landing-services]');
  if (!(root instanceof HTMLElement) || !(section instanceof HTMLElement)) return () => {};
  if (isMobileViewport()) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = root.querySelector('[data-sreel-stage]');
  const wwd = root.querySelector('[data-sreel-wwd]');
  const pillars = Array.from(root.querySelectorAll('[data-sreel-pillar]'));
  if (!(stage instanceof HTMLElement) || pillars.length !== 3) return () => {};

  const P = SERVICES_REEL_PILLARS;
  const listTravel = (i) => {
    /* Bottom divider (listH − 2 below the list top) down to the
       label bottom: travel = listH − 2 − LABEL_H. listH = rows on
       the 53 pitch + closing divider. */
    const listH = P[i].services.length * ROW_PITCH + 2;
    return listH - 2 - LABEL_H;
  };
  const reelPx = (i) => P[i].services.length * REEL_PX_PER_SERVICE;

  /* Beat map. */
  const riseStart = [];
  const reelStart = [];
  let cursor = 0;
  for (let i = 0; i < 3; i += 1) {
    riseStart[i] = cursor;
    cursor += RISE_PX;
    reelStart[i] = cursor;
    cursor += reelPx(i);
  }
  const RUNWAY_PX = cursor + TRANSITION_DWELL_PX;

  const cleanups = [];
  let disposed = false;
  let trigger = null;
  let masterTl = null;
  let snapTimer = 0;

  if (reduced) {
    /* RM: static expanded flow layout — CSS owns it entirely. */
    root.classList.add('is-reduced');
    return () => {};
  }

  root.classList.add('is-live');
  root.style.setProperty('--sreel-runway', `${RUNWAY_PX}px`);

  /* Park pillars below the stage before paint. */
  const stageH = () => stage.clientHeight || window.innerHeight;
  pillars.forEach((p2) => gsap.set(p2, { y: stageH() }));

  /* ── The image swap — the case-study gallery two-phase wipe with a
     pending-index latch (rapid retargets settle on the LATEST). ── */
  const imgState = pillars.map((pillar, i) => ({
    el: pillar.querySelector('[data-sreel-img]'),
    current: -1,       /* -1 = the pillar default */
    pending: null,
    busy: false,
  }));
  const srcFor = (i, idx) => {
    const base = idx < 0 ? P[i].img : P[i].services[idx].img;
    const el = imgState[i].el;
    /* Resolve like asset(): the astro rendered the default through
       asset(); data paths are root-relative and served as-is. */
    return base;
  };
  const playWipe = (i) => {
    const st = imgState[i];
    if (!(st.el instanceof HTMLElement) || st.busy || st.pending === null) return;
    const target = st.pending;
    st.pending = null;
    if (target === st.current) return;
    st.busy = true;
    const out = st.el.animate(
      [
        { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
        { clipPath: 'inset(0 0 0 50%)', filter: `blur(${IMG_WIPE_EDGE_BLUR_PX}px)`, offset: 0.5 },
        { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
      ],
      { duration: IMG_WIPE_MS, easing: IMG_WIPE_CURVE, fill: 'forwards' },
    );
    out.onfinish = () => {
      st.el.src = srcFor(i, target);
      const ready = st.el.decode ? st.el.decode().catch(() => {}) : Promise.resolve();
      Promise.race([ready, new Promise((r) => setTimeout(r, 600))]).then(() => {
        const inn = st.el.animate(
          [
            { clipPath: 'inset(0 100% 0 0)', filter: 'blur(0px)' },
            { clipPath: 'inset(0 50% 0 0)', filter: `blur(${IMG_WIPE_EDGE_BLUR_PX}px)`, offset: 0.5 },
            { clipPath: 'inset(0 0 0 0)', filter: 'blur(0px)' },
          ],
          { duration: IMG_WIPE_MS, easing: IMG_WIPE_CURVE, fill: 'forwards' },
        );
        inn.onfinish = () => {
          out.cancel();
          inn.cancel();
          st.current = target;
          st.busy = false;
          playWipe(i); /* chase the latest latched target */
        };
      });
    };
  };
  const requestImage = (i, idx) => {
    const st = imgState[i];
    if (idx === st.current && st.pending === null) return;
    st.pending = idx;
    playWipe(i);
  };

  /* Active-row selection with hysteresis: commit only within
     ±REEL_HYST_T of a row centre; between centres the previous
     active holds — no boundary flutter. */
  const activeIdx = pillars.map(() => 0);
  const updateActive = (i, translatePx) => {
    const n = P[i].services.length;
    const cand = Math.min(Math.max(Math.round(translatePx / ROW_PITCH), 0), n - 1);
    if (cand === activeIdx[i]) return;
    /* Schmitt hysteresis: switch only when the candidate row is
       meaningfully NEARER than the held one (REEL_HYST_T of the
       pitch as the deadband) — boundary flutter can't switch, and
       any large scrub jump still commits immediately. */
    const dCand = Math.abs(translatePx - cand * ROW_PITCH);
    const dHeld = Math.abs(translatePx - activeIdx[i] * ROW_PITCH);
    if (dCand + ROW_PITCH * REEL_HYST_T < dHeld) {
      activeIdx[i] = cand;
      requestImage(i, cand);
    }
  };

  /* ── Entrances: pillar texts word-reveal as each rise begins (the
     staging playCardTexts pattern; live vocabulary only). ───────── */
  const played = pillars.map(() => false);
  const parts = pillars.map(() => []);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    pillars.forEach((pillar, i) => {
      Array.from(pillar.querySelectorAll('[data-sreel-text]')).forEach((el, j) => {
        if (!(el instanceof HTMLElement)) return;
        wrapWordRevealElement(el, { baseDelay: Math.min(j, 6) * 0.06 });
        parts[i].push(el);
      });
      const btn = pillar.querySelector('[data-sreel-btn]');
      if (btn instanceof HTMLElement) {
        wrapWordRevealElement(btn, { baseDelay: 0.5 });
        parts[i].push(btn);
      }
    });
    if (wwd instanceof HTMLElement) {
      wrapWordRevealElement(wwd);
      parts[0].push(wwd);
    }
  });
  const playTexts = (i) => {
    if (played[i]) return;
    played[i] = true;
    parts[i].forEach((el) => playLineRevealElement(el));
  };

  /* ── Snap — rise windows only (the reel stays free). ──────────── */
  const trySnap = () => {
    if (!trigger) return;
    const rel = (window.scrollY || 0) - trigger.start;
    for (let i = 0; i < 3; i += 1) {
      if (rel > riseStart[i] + 0.5 && rel < reelStart[i] - 0.5) {
        const lenis = getLenisInstance();
        if (!lenis) return;
        lenis.scrollTo(trigger.start + reelStart[i], {
          duration: SNAP_DURATION_S,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
        return;
      }
    }
  };

  /* ── The master timeline (duration units = scroll px). ────────── */
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: `+=${RUNWAY_PX}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
        const px = self.progress * RUNWAY_PX;
        for (let i = 0; i < 3; i += 1) {
          if (px >= riseStart[i]) playTexts(i);
        }
      },
    },
  });

  /* RISES + FILLS + REELS per pillar. */
  pillars.forEach((pillar, i) => {
    tl.fromTo(pillar,
      { y: () => stageH() },
      { y: ACTIVE_Y[i], duration: RISE_PX, ease: 'power1.out', immediateRender: i !== 0 ? false : true },
      riseStart[i]);
    const fill = pillar.querySelector('[data-sreel-fill]');
    if (fill instanceof HTMLElement) {
      tl.fromTo(fill, { scaleX: 1 }, { scaleX: 0, duration: RISE_PX, immediateRender: false }, riseStart[i]);
    }
    /* THE REEL — list translate with active-row tracking. */
    const list = pillar.querySelector('[data-sreel-list]');
    if (list instanceof HTMLElement) {
      const proxy = { t: 0 };
      tl.to(proxy, {
        t: listTravel(i),
        duration: reelPx(i),
        onUpdate: () => {
          gsap.set(list, { y: -proxy.t });
          updateActive(i, proxy.t);
        },
      }, reelStart[i]);
    }
  });

  /* COMPACTION (pillar 1, during pillar 2's rise — Option 12): the
     panel eases 184→138 while title/desc close 68/66→44/42, all
     layout `top` on the inner elements (difference titles — never
     transform them via an ancestor... the pillar itself transforms,
     but the title blends against the pillar's own opaque ground:
     the staging card contract, kept). */
  const compact = (i, at, dur, toY) => {
    tl.to(pillars[i], { y: toY, duration: dur, ease: 'power1.inOut', immediateRender: false }, at);
    const titlerow = pillars[i].querySelector('[data-sreel-titlerow]');
    const desc = pillars[i].querySelector('[data-sreel-desc]');
    if (titlerow instanceof HTMLElement) tl.to(titlerow, { top: TITLE_TOP_STACKED, duration: dur, ease: 'power1.inOut' }, at);
    if (desc instanceof HTMLElement) tl.to(desc, { top: TITLE_TOP_STACKED - 2, duration: dur, ease: 'power1.inOut' }, at);
  };
  compact(0, riseStart[1], RISE_PX, STACKED_Y1);
  /* Pillar 2 keeps its 280 (Option 12 — its active Y IS its stacked
     Y); only its band closes as pillar 3 rises. */
  const t2 = pillars[1].querySelector('[data-sreel-titlerow]');
  const d2 = pillars[1].querySelector('[data-sreel-desc]');
  if (t2 instanceof HTMLElement) tl.to(t2, { top: TITLE_TOP_STACKED, duration: RISE_PX, ease: 'power1.inOut' }, riseStart[2]);
  if (d2 instanceof HTMLElement) tl.to(d2, { top: TITLE_TOP_STACKED - 2, duration: RISE_PX, ease: 'power1.inOut' }, riseStart[2]);
  /* WHAT WE DO rides pillar 1's compaction (146 → 100). */
  if (wwd instanceof HTMLElement) {
    tl.to(wwd, { top: WWD_Y_STACKED, duration: RISE_PX, ease: 'power1.inOut' }, riseStart[1]);
  }

  /* ROLL-OVER WIPES (staging, kept): as the incoming opaque panel's
     top edge crosses each unit of the covered pillar's lower
     content, that unit blurs/fades. Edge-crossing solved against
     the rise ease + the covered pillar's own compaction slide. */
  const coverPairs = [
    { covered: 0, incoming: 1, fromY: ACTIVE_Y[0], toY: STACKED_Y1 },
    { covered: 1, incoming: 2, fromY: ACTIVE_Y[1], toY: ACTIVE_Y[1] },
  ];
  fontsReady.then(() => {
    if (disposed) return;
    coverPairs.forEach(({ covered, incoming, fromY, toY }) => {
      const pillar = pillars[covered];
      const units = [];
      const push = (sel) => {
        const el = pillar.querySelector(sel);
        if (el instanceof HTMLElement) units.push({ els: [el], bottom: el.offsetTop + el.offsetHeight });
      };
      push('[data-sreel-btn]');
      push('[data-sreel-imgwin]');
      push('[data-sreel-listwin]');
      push('[data-sreel-wlabel]');
      const S = stageH();
      const F = ACTIVE_Y[incoming];
      const windowStart = riseStart[incoming];
      const solveT = (bottom) => {
        for (let k = 0; k <= 400; k += 1) {
          const t = k / 400;
          const yIn = S + (F - S) * (1 - (1 - t) * (1 - t));
          const yCov = fromY + (toY - fromY) * t;
          if (yIn <= yCov + bottom + WIPE_LEAD_PX) return t;
        }
        return 1;
      };
      units.forEach(({ els, bottom }) => {
        tl.fromTo(els,
          { opacity: 1, filter: 'blur(0px)' },
          { opacity: 0, filter: `blur(${WIPE_BLUR_PX}px)`, duration: WIPE_SPAN_PX, immediateRender: false },
          windowStart + solveT(bottom) * RISE_PX);
      });
    });
  });

  /* Dwell placeholder — pins the timeline's total duration to
     RUNWAY_PX so scroll px == timeline time exactly (without it the
     scrub squeezes every beat by cursor/RUNWAY). */
  tl.to({}, { duration: TRANSITION_DWELL_PX }, cursor);

  /* THE FADE-TO-BLACK — contract verbatim (see header). */
  const fade = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: `bottom bottom+=${TRANSITION_GROUND_FADE_PX}`,
      end: 'bottom bottom',
      scrub: true,
    },
  });
  fade.fromTo([section, ...pillars],
    { backgroundColor: GROUND_LIGHT },
    { backgroundColor: GROUND_DARK, ease: 'none' }, 0);
  const fades = Array.from(root.querySelectorAll('.landing-sreel__listfade'));
  if (fades.length) fade.to(fades, { autoAlpha: 0, ease: 'none', duration: 0.3 }, 0);
  cleanups.push(() => { fade.scrollTrigger?.kill(); fade.kill(); });

  masterTl = tl;
  trigger = tl.scrollTrigger ?? null;

  if (import.meta.env.DEV) {
    window.__landingReel = {
      trigger: () => trigger,
      map: { riseStart, reelStart, RUNWAY_PX, REEL_PX_PER_SERVICE },
      active: () => [...activeIdx],
      img: (i) => ({ current: imgState[i].current, pending: imgState[i].pending, busy: imgState[i].busy, src: imgState[i].el?.src.split('/').pop() }),
    };
  }

  return () => {
    disposed = true;
    window.clearTimeout(snapTimer);
    cleanups.forEach((fn) => fn());
    masterTl?.scrollTrigger?.kill();
    masterTl?.kill();
  };
}
