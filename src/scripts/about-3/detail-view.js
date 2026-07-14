import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';
import { initCurveMedia } from '../curve-media.js';

gsap.registerPlugin(CustomEase);

/**
 * /about-3 landing detail view — the LinesToLayout (Codrops) open/close
 * mechanism adapted to this page's architecture (see DetailView.astro
 * and the Phase-1 plan): clicking any landing image (gallery or pillar
 * wave) FREEZES the page (scroll lock + hover-blur pause), rolls the
 * visible landing text away (the reverse of the hero "WE ARE A.."
 * line-reveal), fades the landing imagery, and FLIPs a clone of the
 * clicked image into the entry's left slot while the entry's text rolls
 * in (the same line-reveal entry) and the right mini-carousel appears.
 * Return plays the whole thing backwards; the scroll position is never
 * touched, so the resume point is exact by construction.
 *
 * TIMED, not scroll-scrubbed — the third timed exception in this
 * codebase (hover-blur, founders snap): a user-triggered layout
 * transition has no scroll axis to scrub against, and page scroll is
 * locked for its whole lifetime.
 *
 * CLONE, not the real element: at click time the visible pixels may be
 * the hover module's WebGL plane (the DOM img is visibility:hidden
 * whenever its plane is mounted), and the real img lives inside
 * scrubbed transformed tracks — a plain <img> clone at the frame's
 * viewport rect (the two stage backgrounds are identical #F9F9F9, so
 * there is no layer seam), rect-tweened via layout properties, docks
 * and swaps for the entry's CSS-positioned left img so resize-while-
 * open costs nothing.
 */

/** Same curve as line-reveal.js / landing-scroll.js — the hero entry
 * character, also used in reverse for every roll-out here. */
const LINE_REVEAL_EASE = CustomEase.create('detailLineReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/** Open/close tempo — applied as gsap timeScale to both sequence
 * timelines, so every transition, duration ratio and beat order is
 * preserved EXACTLY, just compressed. 2 = twice as fast (50% shorter),
 * per direction. The one piece outside the timelines — the close's
 * nested landing-text roll-in, spawned in a callback — divides by the
 * same constant. All beat/duration constants below stay authored at
 * 1x. */
const DETAIL_TIMESCALE = 2;

/** FLIP flight — authored at 2.3 so the flight runs 50% SLOWER than the
 * rest of the sequence (per direction: the image was moving too fast
 * once the global tempo doubled): under DETAIL_TIMESCALE 2 this is an
 * effective ~1.15s — LinesToLayout's original weight — while every
 * other element keeps the doubled tempo. */
const FLIP_DURATION = 2.3;
const FLIP_EASE = 'power4.inOut';
/** Choreography beats (timeline-seconds from 'start') — SEQUENCED, one
 * element family at a time, per explicit direction ("timed and
 * sequenced … things animate in one by one"). OPEN: everything after
 * the flight waits for it to DOCK (flight + FLIP_DURATION = 3.15)
 * before entering. CLOSE: the flight leaves only once the text out
 * (0.3 + 0.9 + line staggers ≈ 1.4) has resolved. Retune here. */
const OPEN_BEATS = {
  textOut: 0, // landing text rolls away (0.9s)
  fade: 0.45, // landing imagery out / detail bg in (0.5s)
  flight: 0.85, // clone flight (2.3 → docks at 3.15)
  content: 3.15, // title + body roll in once the image has stopped
  carousel: 3.8, // right column fades up
  label: 3.9, // overlay label rolls in (line-reveal vocabulary)
  return: 4.2, // Return CTA arrives last
};
const CLOSE_BEATS = {
  return: 0, // Return CTA leaves first
  carousel: 0.15, // right column + label out
  textOut: 0.3, // title + body roll away (resolved ~1.4)
  flight: 1.4, // clone flies home once everything else has gone (docks 3.7)
  fade: 3.2, // bg out / landing imagery back, completing with the flight
  landingIn: 3.6, // landing text rolls back in as the image docks
};
/** Line roll timings — entry mirrors the landing reveal (1.2s / 0.12
 * stagger); exits are snappier (Codrops' 0.8) with a tight stagger. */
const LINE_IN_DURATION = 1.2;
const LINE_IN_STAGGER = 0.12;
const LINE_OUT_DURATION = 0.9;
const LINE_OUT_STAGGER = 0.05;
/** Landing imagery/background cross-fade. */
const FADE_DURATION = 0.5;
/** Return CTA slide — Codrops' back-ctrl vocabulary. */
const RETURN_HIDDEN_XPERCENT = 20;
/** Carousel label swap — the menu items' blur-dissolve vocabulary
 * (menu.js hover: 4px blur + fade). */
const LABEL_SWAP_BLUR_PX = 4;
const LABEL_SWAP_DURATION = 0.25;
/** Carousel motion — lerp smoothing ≈ the home carousel's scrub 0.45
 * feel; snap mirrors its snap tween. NO edge wrap (per direction):
 * the ends clamp and stop. */
const CAROUSEL_LERP = 0.14;
const SNAP_DURATION = 0.45;
const SNAP_DELAY_MS = 140;
/** Right-column entrance — slower than the first cut, materialising
 * from blur: the hero rolling word's own transition vocabulary
 * (about-hero.css's .is-entering/.is-exiting 10px blur), entry side
 * only, per direction. */
const CAROUSEL_IN_DURATION = 1.6;
const CAROUSEL_IN_BLUR_PX = 10;
/** Unfocused-slide veil — white at 10% over a 20px backdrop blur (the
 * Figma spec). BOTH channels ride (1 − focus) per tick: element
 * opacity fades the white tint, and the BLUR RADIUS itself scales
 * (1 − focus) · this. The radius must be driven directly — the
 * root-cause of the reported "fades slightly then snaps" open: in
 * Chromium the backdrop-filter effect is NOT modulated by the
 * element's own opacity, so a constant blur(20px) appears at full
 * strength the moment the veil paints at all, while only the tint
 * faded. Radius interpolation is continuous; below VEIL_BLUR_EPSILON
 * the filter is dropped to 'none' entirely so the focused slide never
 * pays a zero-radius backdrop pass. */
const VEIL_BACKDROP_BLUR_PX = 20;
const VEIL_BLUR_EPSILON = 0.01;

/** Cross-navigation (the CTA round) — an IN-PLACE content swap between
 * two already-open entries: the LEFT IMAGE never moves (the incoming
 * entry's img ADOPTS the original clicked image's src into the
 * identical rect — same pixels, zero motion; see switchTo()), while
 * title/body/CTA roll out/in on the house line-reveal and the right
 * column blur-fades (the open beat's own vocabulary — no new style).
 * Beats are authored at 1x like OPEN/CLOSE_BEATS and compressed by
 * DETAIL_TIMESCALE (2), so EFFECTIVE on-screen timing is half these:
 * out 0–0.45s, incoming text lands ~0.75s, carousel settles ~0.9s —
 * inside the spec's 0.5–0.8s reading window for the text itself.
 * TUNE HERE (Oscar's feel pass): later `in` values = more silence
 * between out and in; smaller = more overlap/urgency. */
const SWITCH_BEATS = {
  contentIn: 0.35, // incoming title/body/CTA start (outgoing resolves ~0.9+staggers)
  carouselIn: 0.5, // incoming right column starts materialising
  labelIn: 0.6, // incoming carousel's overlay label rolls in
};
/** Outgoing right-column exit — mirrors the close beat's own values. */
const SWITCH_CAROUSEL_OUT_DURATION = 0.55;
const SWITCH_LABEL_OUT_DURATION = 0.45;

/** Home-carousel focus falloff (home-carousel.js, verbatim maths). */
function focusFromDistance(distance, range) {
  const t = Math.min(1, Math.max(0, distance / range));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Wheel-driven vertical mini-carousel with home-carousel parity: snap,
 * per-slide --slide-focus falloff, label swap on active change, edge
 * wrap (jump, like home's tryWrapAtEdge), and the curve-media WebGL
 * warp fed by the track's own virtual position (page scroll is locked).
 */
function createDetailCarousel(viewport, canvas, track, labelWrapper, labelTextEl) {
  const slides = Array.from(track.querySelectorAll('[data-carousel-slide]')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (!slides.length) return null;

  const images = slides
    .map((slide) => slide.querySelector('img'))
    .filter((img) => img instanceof HTMLImageElement);

  let offsets = [];
  let stops = []; // virtual-scroll value at which slide i is centred
  let span = 0;

  const measure = () => {
    const centerY = viewport.clientHeight / 2;
    offsets = slides.map((slide) => centerY - (slide.offsetTop + slide.offsetHeight / 2));
    stops = offsets.map((offset) => offsets[0] - offset);
    span = stops[stops.length - 1];
  };
  measure();

  let target = 0;
  let current = 0;
  let activeIndex = -1;
  let snapTimer = 0;
  let disposed = false;
  const snapState = { value: 0 };

  // Unfocused-slide veils — white 10% + 20px BACKDROP blur over each
  // slide, BOTH riding (1 − focus) per tick (opacity for the tint,
  // radius for the blur — see VEIL_BACKDROP_BLUR_PX's root-cause note:
  // a constant radius snaps in with the first painted frame because
  // Chromium doesn't scale the backdrop effect by element opacity).
  // They must live OUTSIDE the transformed track and ABOVE the
  // curve-media canvas (z 1): the track's transform makes it a stacking
  // context, so nothing inside it can ever paint over the canvas — the
  // same reason the hover overlays sit outside the gallery track.
  // Rect-synced to their slides each tick (width/left are stable; top
  // moves with the track). Filter starts at 'none' (the CSS default) —
  // the tick below owns it entirely.
  const veils = slides.map(() => {
    const veil = document.createElement('div');
    veil.className = 'about-detail__slide-veil';
    viewport.appendChild(veil);
    return veil;
  });

  const setLabel = (index, immediate) => {
    const label = slides[index]?.dataset.detailLabel ?? '';
    if (immediate) {
      // Text only — the wrapper's visibility (and the inner's roll)
      // belong to the OPEN timeline's label beat, so the label enters
      // with the same text vocabulary as everything else instead of
      // popping in at carousel creation (the reported flash).
      labelTextEl.textContent = label;
      return;
    }
    gsap
      .timeline()
      .to(labelWrapper, {
        opacity: 0,
        filter: `blur(${LABEL_SWAP_BLUR_PX}px)`,
        duration: LABEL_SWAP_DURATION,
        overwrite: 'auto',
      })
      .add(() => {
        labelTextEl.textContent = label;
      })
      .to(labelWrapper, { opacity: 1, filter: 'blur(0px)', duration: LABEL_SWAP_DURATION });
  };

  const syncActive = () => {
    let nearest = 0;
    let best = Infinity;
    stops.forEach((stop, i) => {
      const d = Math.abs(stop - target);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    if (nearest !== activeIndex) {
      const wasUnset = activeIndex === -1;
      activeIndex = nearest;
      setLabel(activeIndex, wasUnset);
    }
  };

  const updateFocus = () => {
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const veil = veils[i];
      if (rect.height < 1) {
        slide.style.setProperty('--slide-focus', '0');
        if (veil) {
          veil.style.opacity = '0';
          // Clear any stale radius too — the tick owns both channels.
          veil.style.backdropFilter = 'none';
          veil.style.webkitBackdropFilter = 'none';
        }
        return;
      }
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenterY);
      const range = Math.max(rect.height * 0.85, viewportRect.height * 0.28);
      const focus = focusFromDistance(distance, range);
      slide.style.setProperty('--slide-focus', focus.toFixed(4));
      if (veil) {
        veil.style.left = `${rect.left - viewportRect.left}px`;
        veil.style.top = `${rect.top - viewportRect.top}px`;
        veil.style.width = `${rect.width}px`;
        veil.style.height = `${rect.height}px`;
        const dim = 1 - focus;
        veil.style.opacity = dim.toFixed(4);
        // Radius rides the same falloff — see VEIL_BACKDROP_BLUR_PX.
        const blurFilter =
          dim > VEIL_BLUR_EPSILON
            ? `blur(${(dim * VEIL_BACKDROP_BLUR_PX).toFixed(2)}px)`
            : 'none';
        veil.style.backdropFilter = blurFilter;
        veil.style.webkitBackdropFilter = blurFilter;
      }
    });
  };

  const snapToNearest = () => {
    let nearest = stops[0];
    let best = Infinity;
    stops.forEach((stop) => {
      const d = Math.abs(stop - target);
      if (d < best) {
        best = d;
        nearest = stop;
      }
    });
    snapState.value = target;
    gsap.to(snapState, {
      value: nearest,
      duration: SNAP_DURATION,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: () => {
        target = snapState.value;
      },
    });
  };

  const onWheel = (event) => {
    event.preventDefault();
    if (disposed) return;
    gsap.killTweensOf(snapState);
    // Clamped, NO wrap (per explicit direction — an earlier edge-wrap
    // read as a glitch): reaching the last image simply stops there;
    // further pushes are absorbed by the clamp.
    target = Math.max(0, Math.min(span, target + event.deltaY));
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapToNearest, SNAP_DELAY_MS);
  };

  // Runs on gsap.ticker (not a raw rAF): the same clock every tween in
  // this module already uses, with GSAP's own sleep fallback when rAF
  // stalls — and the snap/label tweens can never advance out of step
  // with the track render.
  const tick = () => {
    if (disposed) return;
    current += (target - current) * CAROUSEL_LERP;
    gsap.set(track, { y: offsets[0] - current });
    updateFocus();
    syncActive();
  };

  // Curve-media warp (home parity, approved) — velocity fed from the
  // carousel's own virtual position; everything else identical to the
  // homepage instance. Null on WebGL failure → the DOM imgs' CSS focus
  // falloff is the fallback rendering.
  let curve = null;
  try {
    curve = initCurveMedia(viewport, canvas, images, {
      getScrollPosition: () => current,
    });
  } catch (error) {
    console.warn('[detail-view] curve-media init failed — DOM image fallback.', error);
  }

  viewport.addEventListener('wheel', onWheel, { passive: false });
  gsap.set(track, { y: offsets[0] });
  updateFocus();
  syncActive();
  gsap.ticker.add(tick);

  return {
    resize() {
      // Re-measure and re-centre the active slide instantly — offsets
      // are px-derived from live layout.
      measure();
      const stop = stops[Math.max(activeIndex, 0)] ?? 0;
      target = stop;
      current = stop;
    },
    destroy() {
      disposed = true;
      gsap.ticker.remove(tick);
      window.clearTimeout(snapTimer);
      viewport.removeEventListener('wheel', onWheel);
      gsap.killTweensOf(snapState);
      gsap.killTweensOf(labelWrapper);
      veils.forEach((veil) => veil.remove());
      curve?.destroy();
      gsap.set(track, { y: offsets[0] ?? 0 });
      // Park the label for the next open: wrapper invisible, inner
      // rolled back to the hidden side (y-bake guard as everywhere).
      gsap.set(labelWrapper, { opacity: 0, filter: 'blur(0px)' });
      gsap.set(labelTextEl, { yPercent: 110, y: 0 });
    },
  };
}

/**
 * Boot the detail view on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initDetailView() {
  if (!document.body.classList.contains('about-page-3')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const root = document.querySelector('body.about-page-3 [data-about-detail]');
  const stage = root?.querySelector('[data-about-detail-stage]');
  const bg = root?.querySelector('[data-about-detail-bg]');
  const cloneLayer = root?.querySelector('[data-about-detail-clone-layer]');
  const labelWrapper = root?.querySelector('[data-about-detail-label]');
  const labelTextEl = root?.querySelector('[data-about-detail-label-text]');
  const landingStage = document.querySelector('body.about-page-3 [data-about-landing-stage]');
  if (
    !(root instanceof HTMLElement) ||
    !(stage instanceof HTMLElement) ||
    !(bg instanceof HTMLElement) ||
    !(cloneLayer instanceof HTMLElement) ||
    !(labelWrapper instanceof HTMLElement) ||
    !(labelTextEl instanceof HTMLElement) ||
    !(landingStage instanceof HTMLElement)
  ) {
    return () => {};
  }

  const entries = Array.from(root.querySelectorAll('[data-about-detail-entry]')).filter(
    (el) => el instanceof HTMLElement,
  );

  /** Per-entry element handles + line-wrapped text (wrap ONCE at init —
   * detail copy is static; inners parked at yPercent 110, the hidden
   * side of the roll, transitions off so GSAP owns the motion).
   * Entries are TEMPORARILY activated for the wrap: line grouping
   * measures word offsetTop, which needs real layout — under the
   * default display:none every word reads 0 and a paragraph collapses
   * into one giant "line" (measured live). The stage stays
   * visibility:hidden throughout, so nothing paints. */
  entries.forEach((entry) => entry.classList.add('is-active'));
  const entryParts = entries.map((entry) => {
    const lines = Array.from(entry.querySelectorAll('[data-about-detail-line]')).filter(
      (el) => el instanceof HTMLElement,
    );
    /** @type {HTMLElement[]} */
    const inners = [];
    lines.forEach((el) => {
      wrapLineRevealElement(el);
      el.querySelectorAll('.lr-inner').forEach((inner) => {
        if (inner instanceof HTMLElement) {
          inner.style.transition = 'none';
          inners.push(inner);
        }
      });
    });
    // y: 0 alongside yPercent — the CSS initial state is a % translate
    // (line-reveal's .lr-inner class), which GSAP's parse BAKES into a
    // PIXEL y that would survive every yPercent tween and hold the text
    // one line low forever (the documented founders/landing y-bake
    // trap; reproduced live here without it).
    gsap.set(inners, { yPercent: 110, y: 0 });

    const returnBtn = entry.querySelector('[data-about-detail-return]');
    if (returnBtn instanceof HTMLElement) {
      gsap.set(returnBtn, { xPercent: RETURN_HIDDEN_XPERCENT, opacity: 0 });
    }

    const cta = entry.querySelector('[data-about-detail-cta]');

    return {
      entry,
      inners,
      returnBtn: returnBtn instanceof HTMLElement ? returnBtn : null,
      cta: cta instanceof HTMLElement ? cta : null,
      leftSlot: entry.querySelector('[data-about-detail-left]'),
      leftImg: entry.querySelector('[data-about-detail-left-img]'),
      viewport: entry.querySelector('[data-about-detail-viewport]'),
      canvas: entry.querySelector('[data-about-detail-canvas]'),
      track: entry.querySelector('[data-about-detail-track]'),
    };
  });
  entries.forEach((entry) => entry.classList.remove('is-active'));

  // Landing imagery fade targets — the gallery, the three wave wrappers
  // and the shared hover-canvas slot (fading the slot fades the WebGL
  // canvas inside it). Opacity on these SIBLINGS of the blend rows is
  // safe — the backdrop-exclusion trap is compositor promotion
  // (will-change), not opacity, and the rows' text has rolled away by
  // the time these matter.
  const landingImagery = Array.from(
    landingStage.querySelectorAll(
      '[data-about-landing-gallery], [data-about-landing-wave], [data-about-landing-hover-canvas-slot]',
    ),
  ).filter((el) => el instanceof HTMLElement);

  const galleryFrames = Array.from(
    landingStage.querySelectorAll('[data-about-landing-gallery] .about-landing__gallery-frame'),
  );

  /** Frame → per-pillar entry (approved mapping): wave frames map to
   * their wave's pillar; gallery-phase frames map in thirds. */
  const entryIndexForFrame = (frame) => {
    const wave = frame.closest('[data-about-landing-wave]');
    if (wave instanceof HTMLElement) {
      const i = Number(wave.dataset.aboutLandingWave);
      return Number.isInteger(i) ? Math.max(0, Math.min(entries.length - 1, i)) : 0;
    }
    const i = galleryFrames.indexOf(frame);
    if (i === -1) return 0;
    const per = Math.ceil(galleryFrames.length / entries.length) || 1;
    return Math.max(0, Math.min(entries.length - 1, Math.floor(i / per)));
  };

  /** The landing text currently readable on stage — every line clip
   * that isn't wiped (clip opacity ~0) and doesn't belong to a row
   * still parked below the stage. Re-collected fresh at each use (a
   * resize rebuild while open replaces the clip elements). */
  const collectVisibleLandingInners = () => {
    const stageH = window.innerHeight;
    /** @type {HTMLElement[]} */
    const inners = [];
    landingStage.querySelectorAll('.lr-clip').forEach((clip) => {
      if (!(clip instanceof HTMLElement)) return;
      if (parseFloat(getComputedStyle(clip).opacity) < 0.01) return;
      const row = clip.closest('.about-landing__row');
      if (row instanceof HTMLElement) {
        const top = parseFloat(getComputedStyle(row).top);
        if (Number.isFinite(top) && top >= stageH - 1) return;
      }
      const inner = clip.querySelector('.lr-inner');
      if (inner instanceof HTMLElement) inners.push(inner);
    });
    return inners;
  };

  /** @type {'idle' | 'opening' | 'open' | 'closing'} */
  let state = 'idle';
  /** Scroll position captured at open, hard-restored at close — the
   * "back to where they were" contract should hold by construction
   * (scroll is locked throughout), but this belt makes it hold even if
   * anything (Lenis internals, browser restoration quirks) nudges the
   * native position while the lock is on. */
  let savedScrollY = 0;
  let activeIndex = -1;
  /** @type {HTMLElement | null} */
  let activeFrame = null;
  /** @type {HTMLImageElement | null} */
  let activeSourceImg = null;
  /** @type {ReturnType<typeof createDetailCarousel> | null} */
  let carousel = null;
  /** @type {gsap.core.Timeline | null} */
  let tl = null;
  /** The cross-navigation timeline — ONE persistent slot (the
   * single-persistent-mechanism pattern): every switchTo() kills the
   * in-flight instance and rebuilds from the CURRENT rendered state
   * (overwrite:'auto' on the content tweens makes mid-roll text
   * retarget from wherever it is), so rapid CTA clicks never stack or
   * spawn. @type {gsap.core.Timeline | null} */
  let switchTl = null;

  // ── Input guards while open — Lenis is stopped (scroll-lock event),
  // these cover what it doesn't drive: rubber-band wheel on the page,
  // touch scroll, keyboard paging. The carousel viewport handles its
  // own wheel (listener with preventDefault), so anything reaching
  // these guards is page-directed.
  const guardWheel = (event) => {
    const part = entryParts[activeIndex];
    if (part?.viewport instanceof HTMLElement && part.viewport.contains(event.target)) return;
    event.preventDefault();
  };
  const guardTouch = (event) => {
    const part = entryParts[activeIndex];
    if (part?.viewport instanceof HTMLElement && part.viewport.contains(event.target)) return;
    event.preventDefault();
  };
  const guardKeys = (event) => {
    if (event.key === 'Escape' && state === 'open') {
      close();
      return;
    }
    if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  };
  const addGuards = () => {
    window.addEventListener('wheel', guardWheel, { passive: false });
    window.addEventListener('touchmove', guardTouch, { passive: false });
    window.addEventListener('keydown', guardKeys);
  };
  const removeGuards = () => {
    window.removeEventListener('wheel', guardWheel);
    window.removeEventListener('touchmove', guardTouch);
    window.removeEventListener('keydown', guardKeys);
  };

  const setRect = (el, rect) => {
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  };

  const open = (frame) => {
    if (state !== 'idle') return;
    const img = frame.querySelector('img');
    if (!(img instanceof HTMLImageElement)) return;

    state = 'opening';
    savedScrollY = window.scrollY;
    activeIndex = entryIndexForFrame(frame);
    activeFrame = frame;
    activeSourceImg = img;
    const part = entryParts[activeIndex];

    // Freeze the page under the transition.
    document.dispatchEvent(new CustomEvent('about-3:scroll-lock'));
    document.dispatchEvent(new CustomEvent('about-landing:freeze'));
    addGuards();

    // Activate the entry (display) so the left slot is measurable, and
    // reveal the (still transparent) stage.
    part.entry.classList.add('is-active');
    stage.style.visibility = 'visible';

    // FLIP clone — spawned at the frame's live rect; the source img is
    // hidden underneath (the hover module is paused, so nothing will
    // re-show it).
    const sourceRect = frame.getBoundingClientRect();
    const targetRect =
      part.leftSlot instanceof HTMLElement ? part.leftSlot.getBoundingClientRect() : sourceRect;
    const clone = document.createElement('img');
    clone.src = img.currentSrc || img.src;
    clone.alt = '';
    setRect(clone, sourceRect);
    cloneLayer.appendChild(clone);
    img.style.visibility = 'hidden';

    // Preset + pre-decode the in-layout left img NOW (it stays hidden):
    // by the time the flight docks and swaps clone → img, the pixels
    // are already decoded — a same-tick swap onto an undecoded img
    // paints a blank frame (part of the reported open/close flashing).
    if (part.leftImg instanceof HTMLImageElement) {
      part.leftImg.src = clone.src;
      part.leftImg.decode?.().catch(() => {});
    }

    const outInners = collectVisibleLandingInners();

    // Carousel boots immediately (textures/warp load under the flight).
    if (
      part.viewport instanceof HTMLElement &&
      part.canvas instanceof HTMLCanvasElement &&
      part.track instanceof HTMLElement
    ) {
      gsap.set(part.viewport, { opacity: 0 });
      carousel = createDetailCarousel(
        part.viewport,
        part.canvas,
        part.track,
        labelWrapper,
        labelTextEl,
      );
    }

    tl = gsap.timeline({
      defaults: { ease: FLIP_EASE },
      onComplete: () => {
        state = 'open';
      },
    });
    tl.timeScale(DETAIL_TIMESCALE);
    tl.addLabel('start', 0)
      // Landing text out — the reverse of the WE ARE A.. entry.
      // overwrite auto: the landing reveal timeline may still be actively
      // playing these very inners (click moments after a fling into the
      // landing) — without it the reveal keeps rendering them back to 0
      // after this tween completes (measured live via a scroll teleport).
      .to(
        outInners,
        {
          yPercent: 110,
          y: 0,
          duration: LINE_OUT_DURATION,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_OUT_STAGGER,
          overwrite: 'auto',
        },
        'start',
      )
      // Landing imagery out (approved: fade), detail bg in over it —
      // beginning as the text roll resolves, not on top of it.
      .to(
        landingImagery,
        { opacity: 0, duration: FADE_DURATION, ease: 'none' },
        `start+=${OPEN_BEATS.fade}`,
      )
      .to(bg, { opacity: 1, duration: FADE_DURATION, ease: 'none' }, `start+=${OPEN_BEATS.fade}`)
      // The flight — once the old scene has yielded.
      .to(
        clone,
        {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          duration: FLIP_DURATION,
        },
        `start+=${OPEN_BEATS.flight}`,
      )
      .add(() => {
        if (part.leftImg instanceof HTMLImageElement) {
          part.leftImg.style.visibility = 'visible';
        }
        clone.remove();
      }, `start+=${OPEN_BEATS.flight + FLIP_DURATION}`)
      // Entry text in as the image settles — title first, body lines
      // following on the shared line stagger.
      .to(
        part.inners,
        {
          yPercent: 0,
          y: 0,
          duration: LINE_IN_DURATION,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_IN_STAGGER,
          overwrite: 'auto',
        },
        `start+=${OPEN_BEATS.content}`,
      )
      // Right column next — slower, materialising from blur (the hero
      // rolling word's transition vocabulary, entry side only). The
      // filter is cleared on completion so no resting stacking noise
      // lingers on the viewport.
      .fromTo(
        part.viewport instanceof HTMLElement ? part.viewport : [],
        { opacity: 0, filter: `blur(${CAROUSEL_IN_BLUR_PX}px)` },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: CAROUSEL_IN_DURATION,
          ease: 'power2.out',
          immediateRender: false,
          clearProps: 'filter',
        },
        `start+=${OPEN_BEATS.carousel}`,
      )
      // …its overlay label entering with the SAME line-reveal roll as
      // every other text (the reported pop-in was setLabel forcing the
      // wrapper visible at carousel creation, t=0).
      .set(labelWrapper, { opacity: 1, filter: 'blur(0px)' }, `start+=${OPEN_BEATS.label}`)
      .fromTo(
        labelTextEl,
        { yPercent: 110, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: LINE_IN_DURATION,
          ease: LINE_REVEAL_EASE,
          immediateRender: false,
          overwrite: 'auto',
        },
        `start+=${OPEN_BEATS.label}`,
      );
    if (part.returnBtn) {
      tl.to(
        part.returnBtn,
        { xPercent: 0, opacity: 1, duration: 0.9, ease: 'expo' },
        `start+=${OPEN_BEATS.return}`,
      );
    }
  };

  /**
   * Cross-navigation (the CTA) — swap which pillar's CONTENT is showing,
   * in place. THE STATE RULE, by construction: activeFrame /
   * activeSourceImg / savedScrollY (the opener's identity) are never
   * touched here, so close() — from whichever pillar the user ends on —
   * flies the image back to the ORIGINAL landing frame and restores the
   * original scroll, identical to closing without ever navigating. The
   * LEFT IMAGE never moves: every entry's left slot occupies the
   * identical CSS rect, and the incoming entry's img ADOPTS the
   * original image's src — same pixels in the same box, painted over
   * themselves (z-ordered incoming-on-top for the frame of overlap).
   * RETARGET-SAFE: callable mid-flight; the previous switch timeline is
   * killed and every non-target entry still active (including a
   * half-arrived one) is rolled out from its current position.
   * @param {number} targetIndex
   */
  const switchTo = (targetIndex) => {
    if (state !== 'open') return;
    if (targetIndex === activeIndex) return;
    const toPart = entryParts[targetIndex];
    if (!toPart) return;

    switchTl?.kill();
    switchTl = null;

    // Everything currently on stage that isn't the target exits —
    // under rapid clicks this can be TWO entries (one mid-arrival).
    const exitParts = entryParts.filter(
      (p, i) => i !== targetIndex && p.entry.classList.contains('is-active'),
    );

    const freshlyActivated = !toPart.entry.classList.contains('is-active');

    // The in-flight carousel instance (whichever entry it belonged to)
    // dies NOW — its viewport's visual exit is the opacity tween below;
    // the instance itself must stop ticking/listening immediately so
    // instances never stack. The target gets a fresh boot (re-entering
    // a previously-visited pillar re-measures cleanly).
    carousel?.destroy();
    carousel = null;

    // Left image adoption — before anything paints: the incoming img
    // carries the ORIGINAL clicked image (decoded since open()), in the
    // identical rect. Incoming entry z-orders on top so the one
    // overlapping frame paints identical pixels over identical pixels.
    const originalSrc = activeSourceImg?.currentSrc || activeSourceImg?.src || '';
    if (toPart.leftImg instanceof HTMLImageElement) {
      if (toPart.leftImg.src !== originalSrc) toPart.leftImg.src = originalSrc;
      toPart.leftImg.style.visibility = 'visible';
    }
    entryParts.forEach((p, i) => {
      p.entry.style.zIndex = i === targetIndex ? '1' : '0';
    });
    toPart.entry.classList.add('is-active');
    exitParts.forEach((p) => {
      if (p.leftImg instanceof HTMLImageElement) p.leftImg.style.visibility = '';
    });

    // Return control: functionally the SAME control on every entry — it
    // never blips. Incoming shown instantly, outgoing hidden instantly.
    exitParts.forEach((p) => {
      if (p.returnBtn) gsap.set(p.returnBtn, { xPercent: RETURN_HIDDEN_XPERCENT, opacity: 0 });
    });
    if (toPart.returnBtn) gsap.set(toPart.returnBtn, { xPercent: 0, opacity: 1 });

    // Fresh viewport starts invisible (the open beat's own idiom); a
    // retarget-back to a mid-exit viewport keeps its current opacity —
    // the .to() below retargets from wherever it is.
    if (freshlyActivated && toPart.viewport instanceof HTMLElement) {
      gsap.set(toPart.viewport, { opacity: 0 });
    }
    if (
      toPart.viewport instanceof HTMLElement &&
      toPart.canvas instanceof HTMLCanvasElement &&
      toPart.track instanceof HTMLElement
    ) {
      carousel = createDetailCarousel(
        toPart.viewport,
        toPart.canvas,
        toPart.track,
        labelWrapper,
        labelTextEl,
      );
    }

    // From here on, guards/close/wheel belong to the incoming pillar.
    activeIndex = targetIndex;

    const exitInners = exitParts.flatMap((p) => p.inners);
    const exitViewports = exitParts
      .map((p) => p.viewport)
      .filter((v) => v instanceof HTMLElement);

    switchTl = gsap.timeline({
      defaults: { ease: FLIP_EASE },
      onComplete: () => {
        exitParts.forEach((p) => {
          p.entry.classList.remove('is-active');
        });
        entryParts.forEach((p) => {
          p.entry.style.zIndex = '';
        });
        switchTl = null;
      },
    });
    switchTl.timeScale(DETAIL_TIMESCALE);
    switchTl
      .addLabel('start', 0)
      // Outgoing text rolls away from its CURRENT position…
      .to(
        exitInners,
        {
          yPercent: 110,
          y: 0,
          duration: LINE_OUT_DURATION,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_OUT_STAGGER,
          overwrite: 'auto',
        },
        'start',
      )
      // …the outgoing right column + shared label with it…
      .to(
        exitViewports,
        {
          opacity: 0,
          filter: `blur(${CAROUSEL_IN_BLUR_PX}px)`,
          duration: SWITCH_CAROUSEL_OUT_DURATION,
          ease: 'power2.in',
          clearProps: 'filter',
          overwrite: 'auto',
        },
        'start',
      )
      .to(
        labelWrapper,
        { opacity: 0, duration: SWITCH_LABEL_OUT_DURATION, ease: 'none', overwrite: 'auto' },
        'start',
      )
      // …incoming title/body/CTA roll in (from 110 when fresh, from
      // wherever they are on a rapid retarget-back)…
      .to(
        toPart.inners,
        {
          yPercent: 0,
          y: 0,
          duration: LINE_IN_DURATION,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_IN_STAGGER,
          overwrite: 'auto',
        },
        `start+=${SWITCH_BEATS.contentIn}`,
      )
      // …incoming right column materialises from blur (the open beat's
      // vocabulary)…
      .to(
        toPart.viewport instanceof HTMLElement ? toPart.viewport : [],
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: CAROUSEL_IN_DURATION,
          ease: 'power2.out',
          clearProps: 'filter',
          overwrite: 'auto',
        },
        `start+=${SWITCH_BEATS.carouselIn}`,
      )
      // …its overlay label re-entering with the line-reveal roll (the
      // text has changed pillar, so it re-rolls rather than crossfades).
      .set(labelWrapper, { opacity: 1, filter: 'blur(0px)' }, `start+=${SWITCH_BEATS.labelIn}`)
      .fromTo(
        labelTextEl,
        { yPercent: 110, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: LINE_IN_DURATION,
          ease: LINE_REVEAL_EASE,
          immediateRender: false,
          overwrite: 'auto',
        },
        `start+=${SWITCH_BEATS.labelIn}`,
      );
  };

  const close = () => {
    if (state !== 'open') return;
    state = 'closing';
    // A close mid-switch is legal (the state rule must hold from any
    // moment): kill the in-flight swap and take EVERY still-active
    // entry's content out below — activeIndex already points at the
    // incoming pillar, whose leftImg carries the original image, so the
    // clone + flight need no special casing.
    switchTl?.kill();
    switchTl = null;
    const activeParts = entryParts.filter((p) => p.entry.classList.contains('is-active'));
    const part = entryParts[activeIndex];
    const frame = activeFrame;
    const sourceImg = activeSourceImg;
    if (!frame || !part) return;

    // Clone re-spawned at the (CSS-positioned, resize-proof) left slot;
    // the landing frame rect is re-measured live — scroll was locked the
    // whole time, so it is exactly where the user left it.
    const slotRect =
      part.leftSlot instanceof HTMLElement
        ? part.leftSlot.getBoundingClientRect()
        : frame.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src =
      part.leftImg instanceof HTMLImageElement ? part.leftImg.src : sourceImg?.src || '';
    clone.alt = '';
    setRect(clone, slotRect);
    cloneLayer.appendChild(clone);
    // Hide the in-layout img only once the clone's pixels are ready —
    // a same-tick swap onto an undecoded clone paints a blank frame
    // (the close-side half of the reported flashing). The src is the
    // one currently displayed, so decode resolves from cache instantly
    // in practice; the catch covers decode() rejection quirks.
    const hideLeftImg = () => {
      if (part.leftImg instanceof HTMLImageElement) part.leftImg.style.visibility = 'hidden';
    };
    if (clone.decode) {
      clone.decode().then(hideLeftImg, hideLeftImg);
    } else {
      hideLeftImg();
    }

    tl = gsap.timeline({
      defaults: { ease: FLIP_EASE },
      onComplete: () => {
        clone.remove();
        if (sourceImg) sourceImg.style.visibility = '';
        // ALL entries (a close mid-switch can have two active) — and
        // every adopted left image goes back to its CSS-default hidden
        // (the current one already went via hideLeftImg above; the
        // rest unconditionally, belt for the mid-switch path).
        entryParts.forEach((p) => {
          p.entry.classList.remove('is-active');
          p.entry.style.zIndex = '';
          if (p.leftImg instanceof HTMLImageElement) p.leftImg.style.visibility = '';
        });
        stage.style.visibility = 'hidden';
        carousel?.destroy();
        carousel = null;
        if (window.scrollY !== savedScrollY) window.scrollTo(0, savedScrollY);
        document.dispatchEvent(new CustomEvent('about-landing:unfreeze'));
        document.dispatchEvent(new CustomEvent('about-3:scroll-unlock'));
        removeGuards();
        state = 'idle';
        activeIndex = -1;
        activeFrame = null;
        activeSourceImg = null;
      },
    });
    tl.timeScale(DETAIL_TIMESCALE);
    tl.addLabel('start', 0);
    // Return CTA leaves first (the mirror of it arriving last).
    if (part.returnBtn) {
      tl.to(
        part.returnBtn,
        { xPercent: RETURN_HIDDEN_XPERCENT, opacity: 0, duration: 0.5 },
        `start+=${CLOSE_BEATS.return}`,
      );
    }
    tl
      // Right column + its label out together (blur mirror of the
      // entrance) — every ACTIVE entry's viewport (two mid-switch)…
      .to(
        activeParts.map((p) => p.viewport).filter((v) => v instanceof HTMLElement),
        {
          opacity: 0,
          filter: `blur(${CAROUSEL_IN_BLUR_PX}px)`,
          duration: 0.55,
          ease: 'power2.in',
          clearProps: 'filter',
          overwrite: 'auto',
        },
        `start+=${CLOSE_BEATS.carousel}`,
      )
      .to(
        labelWrapper,
        { opacity: 0, duration: 0.45, ease: 'none', overwrite: 'auto' },
        `start+=${CLOSE_BEATS.carousel}`,
      )
      // …then the text rolls away (every active entry's — mid-switch
      // rolls both sets out from wherever they are)…
      .to(
        activeParts.flatMap((p) => p.inners),
        {
          yPercent: 110,
          y: 0,
          duration: LINE_OUT_DURATION,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_OUT_STAGGER,
          overwrite: 'auto',
        },
        `start+=${CLOSE_BEATS.textOut}`,
      )
      // …then the image flies home alone…
      .to(
        clone,
        {
          left: frameRect.left,
          top: frameRect.top,
          width: frameRect.width,
          height: frameRect.height,
          duration: FLIP_DURATION,
        },
        `start+=${CLOSE_BEATS.flight}`,
      )
      // …and the landing scene returns beneath it, completing as the
      // image docks.
      .to(bg, { opacity: 0, duration: FADE_DURATION, ease: 'none' }, `start+=${CLOSE_BEATS.fade}`)
      .to(
        landingImagery,
        { opacity: 1, duration: FADE_DURATION, ease: 'none' },
        `start+=${CLOSE_BEATS.fade}`,
      )
      .add(() => {
        // Fresh collection — a resize rebuild while open replaces the
        // clip elements, so open-time references may be stale. The
        // roll-in runs as its own tween (no reversal need).
        const backInners = collectVisibleLandingInners();
        gsap.set(backInners, { yPercent: 110, y: 0 });
        // Standalone tween (created in a callback — outside the
        // timeline's timeScale), so the tempo divides in directly.
        gsap.to(backInners, {
          yPercent: 0,
          y: 0,
          overwrite: 'auto',
          duration: LINE_IN_DURATION / DETAIL_TIMESCALE,
          ease: LINE_REVEAL_EASE,
          stagger: LINE_OUT_STAGGER / DETAIL_TIMESCALE,
        });
      }, `start+=${CLOSE_BEATS.landingIn}`);
  };

  // Click wiring — delegated; WAVE frames only (explicit request: the
  // horizontal gallery's images lost their hover treatment and overlay
  // CTA, and an invisible click affordance with no hover signal would
  // be a trap — so clickability is scoped to the three pillar waves
  // along with it).
  const onLandingClick = (event) => {
    if (state !== 'idle') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const frame = target.closest('.about-landing__gallery-frame');
    if (!(frame instanceof HTMLElement) || !landingStage.contains(frame)) return;
    if (!frame.closest('[data-about-landing-wave]')) return;
    open(frame);
  };
  landingStage.addEventListener('click', onLandingClick);

  const onReturnClick = () => close();
  entryParts.forEach((part) => {
    part.returnBtn?.addEventListener('click', onReturnClick);
  });

  const onCtaClick = (event) => {
    const btn = event.currentTarget;
    if (!(btn instanceof HTMLElement)) return;
    const targetIndex = Number(btn.dataset.aboutDetailTarget);
    if (Number.isInteger(targetIndex)) switchTo(targetIndex);
  };
  entryParts.forEach((part) => {
    part.cta?.addEventListener('click', onCtaClick);
  });

  const onResize = () => {
    if (state === 'idle') return;
    carousel?.resize();
  };
  window.addEventListener('resize', onResize);

  return () => {
    landingStage.removeEventListener('click', onLandingClick);
    entryParts.forEach((part) => part.returnBtn?.removeEventListener('click', onReturnClick));
    entryParts.forEach((part) => part.cta?.removeEventListener('click', onCtaClick));
    window.removeEventListener('resize', onResize);
    tl?.kill();
    switchTl?.kill();
    carousel?.destroy();
    removeGuards();
    if (state !== 'idle') {
      document.dispatchEvent(new CustomEvent('about-landing:unfreeze'));
      document.dispatchEvent(new CustomEvent('about-3:scroll-unlock'));
    }
    entryParts.forEach((part) => {
      gsap.killTweensOf(part.inners);
      if (part.returnBtn) gsap.killTweensOf(part.returnBtn);
      if (part.viewport) gsap.killTweensOf(part.viewport);
      // Belt for an unmount mid-switch (Astro page transition): a
      // switch leaves two entries active + a z-index pair + an adopted
      // left image for its duration — clear unconditionally rather
      // than trust the timelines' own onComplete to have run.
      part.entry.classList.remove('is-active');
      part.entry.style.zIndex = '';
      if (part.leftImg instanceof HTMLImageElement) part.leftImg.style.visibility = '';
    });
    cloneLayer.replaceChildren();
    stage.style.visibility = 'hidden';
  };
}
