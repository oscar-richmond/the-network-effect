/**
 * OUR SERVICES — THE REEL BELOW THE SEAM (the mobile + tablet rebuild,
 * 2026-09-07). The desktop's services reel (landing-services-reel.js —
 * a 100dvh sticky stage, pillars rising and fixing with divider fills,
 * the rows scrolling behind a gradient blur, the active row driving the
 * pillar's image through the case-study wipe, the fade-to-black tail) is
 * the spec. Its markup is now the ONLY services markup at every width
 * (the retired mobile stack — three cards under an OUR SERVICES title,
 * swipe strips, its own copy — is gone), and this module is the reel's
 * narrow driver; the desktop module returns early below the seam and
 * this one returns early above it.
 *
 * THE TRANSLATION, and what was rejected:
 *   - IN FLOW, NOT PINNED. A pinned stage with pillars stacking into
 *     bands needs the desktop's height; on a 660px phone viewport the
 *     bands alone fill the screen. The pillars follow each other in
 *     flow, each with its divider, title row, description, label, rows
 *     and MORE INFO. REJECTED: the pin at a shrunken scale (the rows
 *     become 12px); a horizontal pillar carousel (a new mechanic).
 *   - THE IMAGE STICKS. The desktop fixes the pillar's image beside the
 *     scrolling rows; here the image is position: sticky at the top of
 *     its pillar (below the nav) while the rows scroll up beneath it
 *     through the same gradient blur, and the row at the READING LINE
 *     (just under the image; beside its centre on the tablet, where
 *     the image sits beside the rows) is the active one: its text
 *     slides right — the desktop's scroll-mode treatment, 24px for the
 *     narrower measure — and the image wipes to that row's picture with
 *     the desktop's own wipe (the lightbox beat, edge blur). Scroll-
 *     driven, as the desktop's scroll mode is; there is no hover to
 *     mirror, so the hover mode is not carried.
 *   - THE DIVIDER FILLS with the rows' progress past the reading line
 *     (the desktop fills it with the reel's progress).
 *   - THE TAIL FADES TO BLACK over the section's last stretch (a painted
 *     gradient on the section's tail — landing-narrow.css), so Featured
 *     Work arrives black-over-black as on the desktop.
 *   - THE ENTRANCES are the desktop's vocabulary: the intro lines and
 *     each pillar's heads word-reveal, the furniture fade-rises.
 *
 * Reduced motion: no reveals (the shared entrance gates itself), plain
 * image swaps instead of wipes, the fill and the text slide still
 * follow the scroll (states, not motion), the tail still fades.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isMobileViewport, isPhoneViewport } from './viewport.js';
import { initMobileEntrance } from './m-entrance.js';
import { initCarouselIndicators } from './carousel-indicator.js';
import { wireRailVeils } from './rail-veils.js';
import { SERVICES_REEL_PILLARS } from '../../data/landing/services-reel.js';

gsap.registerPlugin(ScrollTrigger);

/* the desktop reel's wipe, verbatim (IMG_WIPE_* there) */
const IMG_WIPE_MS = 450;
const IMG_WIPE_EDGE_BLUR_PX = 6;
const IMG_WIPE_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';
const IMG_DECODE_TIMEOUT_MS = 600;
/* the reading line sits this far below the image's bottom on the phone
   (the tablet reads --sv-read-t = 0.5: beside the image's centre) */
const READ_GAP_PX = 72; /* below the 48px fade band, so the active row reads sharp */
/* D3 — the phone stack's dwell: the scroll a locked panel holds before
   the next panel's top enters the viewport (IMMERSE → CONNECT and
   CONNECT → AMPLIFY alike; the founders' and the network's 250) */
export const SV_DWELL_PX = 250;

/** The phone stack's RELEASE, absolute scroll px — the last panel is
 *  pushed when the stage's bottom reaches its parked bottom (park top +
 *  height); the three then leave together at 1:1. ONE derivation for the
 *  ground module (the fade-to-dark starts here) and for FEATURED WORK's
 *  arrival below. Null until the phone stack has parked its panels. */
export function servicesStackReleaseAt() {
  const stage = document.querySelector('[data-sreel-stage]');
  const pillars = document.querySelectorAll('[data-sreel-pillar]');
  const last = pillars[pillars.length - 1];
  if (!(stage instanceof HTMLElement) || !(last instanceof HTMLElement)) return null;
  const park = parseFloat(last.style.getPropertyValue('--sv-park'));
  if (!Number.isFinite(park)) return null;
  const stageBottom = stage.getBoundingClientRect().bottom + (window.scrollY || 0);
  return Math.round(stageBottom - (park + last.offsetHeight));
}
/** F1 (Oscar, 2026-09-09) — the scroll at which AMPLIFY's IMAGE begins to
 *  leave the top of the viewport: its measured top edge crossing y = 0
 *  as the released stack departs (the panel leaves its park at 1:1, so
 *  the image's top is park + its offset in the panel at the release, and
 *  crosses 0 that many px later). FEATURED WORK's arrival is anchored
 *  here (landing-featured.js). Null outside the phone's stack. */
export function servicesLastImageLeavesTopAt() {
  const releaseAt = servicesStackReleaseAt();
  if (releaseAt === null) return null;
  const pillars = document.querySelectorAll('[data-sreel-pillar]');
  const last = pillars[pillars.length - 1];
  const img = last.querySelector('[data-sreel-imgwin]');
  if (!(img instanceof HTMLElement)) return null;
  const park = parseFloat(last.style.getPropertyValue('--sv-park')) || 0;
  const imgOff = img.getBoundingClientRect().top - last.getBoundingClientRect().top;
  return Math.round(releaseAt + park + imgOff);
}

export function initLandingServices() {
  const section = document.querySelector('[data-landing-services]');
  if (!(section instanceof HTMLElement)) return () => {};
  if (!isMobileViewport()) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  const pillars = Array.from(section.querySelectorAll('[data-sreel-pillar]')).filter((el) => el instanceof HTMLElement);
  const readT = parseFloat(getComputedStyle(document.body).getPropertyValue('--sv-read-t')) || 1;

  /* THE PHONE (Figma 1:11 + 1:426, 2026-09-09): the frame's stack and
     rail — see the block at the end of this function. The reading-line
     machinery below (the rows scrolling vertically beneath a sticky
     image) has nothing to read on the phone, where the rows are a
     horizontal rail inside a sticky panel; the tablet keeps it. */
  const phone = isPhoneViewport();

  /* ── the entrances: the intro's lines, then each pillar's heads ── */
  const intro = section.querySelector('[data-sreel-intro]');
  const wwd = section.querySelector('[data-sreel-wwd]');
  const introLines = Array.from(intro ? intro.querySelectorAll('[data-sreel-introline]') : []);
  cleanups.push(initMobileEntrance(section, {
    /* the phone reads the pair first, WHAT WE DO below it (the frame's
       order — landing-narrow.css reorders the column); same stagger */
    lines: (phone ? [...introLines, wwd] : [wwd, ...introLines]).filter((el) => el instanceof HTMLElement),
  }));
  pillars.forEach((pillar) => {
    cleanups.push(initMobileEntrance(pillar, {
      lines: [pillar.querySelector('[data-sreel-titlerow]'), pillar.querySelector('[data-sreel-desc]')].filter((el) => el instanceof HTMLElement),
      media: [
        pillar.querySelector('[data-sreel-imgwin]'),
        pillar.querySelector('[data-sreel-wlabel]'),
        pillar.querySelector('[data-sreel-listwin]'),
        pillar.querySelector('[data-sreel-btn]'),
      ].filter((el) => el instanceof HTMLElement),
      start: 'top 75%',
    }));
  });

  /* ── the images: an UNDER layer beneath each pillar's img (the
     desktop's construction), the wipe clipping the OVER off it ── */
  let disposed = false;
  const imgState = pillars.map((pillar) => {
    const over = pillar.querySelector('[data-sreel-img]');
    if (!(over instanceof HTMLImageElement)) return null;
    const under = over.cloneNode(false);
    under.removeAttribute('data-sreel-img');
    under.classList.add('landing-sreel__img--under');
    over.parentElement?.insertBefore(under, over);
    return { over, under, current: -1, pending: null, busy: false };
  });
  const srcFor = (i, idx) => (idx < 0 ? SERVICES_REEL_PILLARS[i].img : SERVICES_REEL_PILLARS[i].services[idx].img);
  const playWipe = (i) => {
    const st = imgState[i];
    if (!st || st.busy || st.pending === null) return;
    const target = st.pending;
    st.pending = null;
    if (target === st.current) return;
    st.busy = true;
    /* the build-time srcset outranks src (the desktop reel's FINAL GATE
       guard, landing-services-reel.js) — without it the swap never
       showed below the seam (found driving the phone rail, 2026-09-09) */
    const unset = (img) => { if (img.hasAttribute('srcset')) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); } };
    if (reduced) {
      unset(st.over);
      st.over.src = srcFor(i, target);
      st.current = target;
      st.busy = false;
      return;
    }
    unset(st.under);
    st.under.src = srcFor(i, target);
    const ready = st.under.decode ? st.under.decode().catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, IMG_DECODE_TIMEOUT_MS))]).then(() => {
      if (disposed) return;
      const out = st.over.animate(
        [
          { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
          { clipPath: 'inset(0 0 0 50%)', filter: `blur(${IMG_WIPE_EDGE_BLUR_PX}px)`, offset: 0.5 },
          { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
        ],
        { duration: IMG_WIPE_MS, easing: IMG_WIPE_CURVE, fill: 'forwards' },
      );
      out.onfinish = () => {
        unset(st.over);
        st.over.src = srcFor(i, target);
        const overReady = st.over.decode ? st.over.decode().catch(() => {}) : Promise.resolve();
        Promise.race([overReady, new Promise((r) => setTimeout(r, IMG_DECODE_TIMEOUT_MS))]).then(() => {
          if (disposed) return;
          out.cancel();
          st.current = target;
          st.busy = false;
          playWipe(i);
        });
      };
    });
  };
  const requestImage = (i, idx) => {
    const st = imgState[i];
    if (!st) return;
    if (idx === st.current && st.pending === null) return;
    st.pending = idx;
    playWipe(i);
  };

  /* ── the active row: the one at the reading line ── */
  const activeIdx = pillars.map(() => -1);
  const rowsOf = pillars.map((p) => Array.from(p.querySelectorAll('[data-sreel-row]')).filter((el) => el instanceof HTMLElement));
  const fills = pillars.map((p) => p.querySelector('[data-sreel-fill]'));
  const update = (i) => {
    const pillar = pillars[i];
    const rows = rowsOf[i];
    const img = pillar.querySelector('[data-sreel-imgwin]');
    if (!rows.length || !(img instanceof HTMLElement)) return;
    const r = img.getBoundingClientRect();
    const line = readT >= 1 ? r.bottom + READ_GAP_PX : r.top + r.height * readT;
    let idx = -1;
    let best = Infinity;
    rows.forEach((row, k) => {
      const rr = row.getBoundingClientRect();
      const c = rr.top + rr.height / 2;
      if (c > line + rr.height) return; /* still below the line */
      const d = Math.abs(c - line);
      if (d < best) { best = d; idx = k; }
    });
    /* progress: how far the list has travelled past the line */
    const first = rows[0].getBoundingClientRect();
    const last = rows[rows.length - 1].getBoundingClientRect();
    const span = Math.max(last.top - first.top, 1);
    const t = Math.min(Math.max((line - first.top - first.height / 2) / span, 0), 1);
    const fill = fills[i];
    if (fill instanceof HTMLElement) fill.style.transform = `scaleX(${t.toFixed(4)})`;
    if (idx === activeIdx[i]) return;
    activeIdx[i] = idx;
    rows.forEach((row, k) => row.classList.toggle('is-sactive', k === idx));
    requestImage(i, idx);
  };
  const triggers = phone ? [] : pillars.map((pillar, i) => ScrollTrigger.create({
    trigger: pillar,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: () => update(i),
    onEnter: () => update(i),
    onEnterBack: () => update(i),
  }));

  /* ═══ THE PHONE — the frame's stack and rail (Figma 1:426 / 1:11) ═══
     THE STACK: each pillar is a sticky opaque panel (landing-narrow.css)
     parking under the bar on the 31 pitch; as the next panel rises
     over it, its title row compacts (is-parked → a transform on the
     house curve, the desktop reel's band compaction). The park tops
     are clamped so a panel taller than the viewport still shows its
     MORE INFO before it parks (short phones park higher, under the
     bar). THE RAIL: the rows are a 4-row column grid scrolling
     sideways; the 100×1 indicator (the shared carousel-indicator
     module — its markup built here, phone only, removed on cleanup)
     rides the WE BUILD row. The two treatments the reading line used
     to drive are RE-ANCHORED to the rail's scroll: the divider fills
     with the rail's progress, and the column in view drives the image
     through the same wipe — column 0 shows the pillar's own image,
     column k its first row's picture, that row taking the text slide. */
  const phoneCleanups = [];
  if (phone) {
    const parkTop = parseFloat(getComputedStyle(document.body).getPropertyValue('--sv-park-top')) || 67;
    const parkPitch = parseFloat(getComputedStyle(document.body).getPropertyValue('--sv-park-pitch')) || 31;
    const parks = pillars.map(() => parkTop);
    /* THE PITCH IS INVARIANT (Oscar, 2026-09-09 — Phase 2C): every park
       top is the frame's 67 + i × 31, at every viewport height. The
       earlier clamp (min(natural, vh − panelH)) kept a 653-tall panel's
       MORE INFO above the fold on short phones by parking it HIGHER —
       and below ~782 of viewport that pulled CONNECT (and AMPLIFY) up
       onto IMMERSE's park line: the compacted band is 31 tall (2 divider
       + 8 + 13 title + 8) and its sticky offset must be exactly one
       band below the panel above it. Frame 1:426 is drawn at 874 with
       AMPLIFY's panel ending at 780; on a shorter viewport its foot sits
       below the fold while parked and comes into view as the stack
       releases — the geometry wins over the button's early visibility. */
    const pillarGap = parseFloat(getComputedStyle(document.body).getPropertyValue('--sv-pillar-gap')) || 80;
    const setParks = () => {
      pillars.forEach((pillar, i) => {
        parks[i] = parkTop + i * parkPitch;
        pillar.style.setProperty('--sv-park', `${Math.round(parks[i])}px`);
      });
      /* D3 (Oscar, 2026-09-09) — THE DWELL: a panel HOLDS once it locks
         before the next one rises. Measured at 402×874 before this:
         CONNECT locked at 98 with AMPLIFY's top already 43px up the
         viewport (the 653 panel + the 80 gap is shorter than the 874
         viewport less the park), and IMMERSE locked with CONNECT 74px
         up — no hold at all, the next panel already climbing. The next
         panel's top must sit at the viewport bottom when this one locks
         and stay there for SV_DWELL_PX of scroll, so the flow gap
         between the two is derived per viewport: dwell + vh − park −
         the panel's height (never less than the frame's 80). The two
         dwells match (recommended: one grammar, the founders' and the
         network's own 250); the stack's final hold stays --sv-stack-hold. */
      const vh = window.innerHeight || 0;
      pillars.forEach((pillar, i) => {
        if (i === 0) return;
        const prev = pillars[i - 1];
        const prevMb = parseFloat(getComputedStyle(prev).marginBottom) || 0;
        const need = SV_DWELL_PX + vh - parks[i - 1] - prev.offsetHeight;
        const gap = Math.max(pillarGap, need);
        pillar.style.marginTop = `${Math.round(gap - prevMb)}px`;
      });
    };
    setParks();
    const parkTriggers = pillars.slice(0, -1).map((pillar, i) => ScrollTrigger.create({
      trigger: pillars[i + 1],
      /* the next panel's top passing 100 below this one's park line */
      start: () => `top ${Math.round(parks[i] + 100)}px`,
      end: '+=100000',
      toggleClass: { targets: pillar, className: 'is-parked' },
      invalidateOnRefresh: true,
    }));
    const onRefreshInit = () => setParks();
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
    phoneCleanups.push(() => {
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit);
      parkTriggers.forEach((t) => t.kill());
      pillars.forEach((p) => { p.classList.remove('is-parked'); p.style.removeProperty('--sv-park'); p.style.marginTop = ''; });
    });

    pillars.forEach((pillar, i) => {
      const list = pillar.querySelector('[data-sreel-list]');
      const label = pillar.querySelector('[data-sreel-wlabel]');
      const fill = fills[i];
      const rows = rowsOf[i];
      if (!(list instanceof HTMLElement)) return;
      /* the indicator */
      let ind = null;
      if (label instanceof HTMLElement) {
        ind = document.createElement('span');
        ind.className = 'm-carousel-ind';
        ind.setAttribute('data-carousel-ind', '');
        ind.setAttribute('aria-hidden', 'true');
        const thumb = document.createElement('span');
        thumb.className = 'm-carousel-ind__thumb';
        thumb.setAttribute('data-carousel-thumb', '');
        ind.appendChild(thumb);
        label.appendChild(ind);
        pillar.setAttribute('data-m-carousel', '');
        list.setAttribute('data-carousel-strip', '');
      }
      /* the rail's scroll → the fill, the active column, the image */
      let raf = 0;
      const onRail = () => {
        raf = 0;
        const max = list.scrollWidth - list.clientWidth;
        const t = max > 0 ? Math.min(Math.max(list.scrollLeft / max, 0), 1) : 0;
        if (fill instanceof HTMLElement) fill.style.transform = `scaleX(${t.toFixed(4)})`;
        /* the column in view: the row whose start is nearest the
           scroller's padding edge */
        const pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
        let col = 0;
        let best = Infinity;
        rows.forEach((row, k) => {
          const d = Math.abs(row.offsetLeft - pad - list.scrollLeft);
          if (d < best) { best = d; col = Math.floor(k / 4); }
        });
        const idx = col === 0 ? -1 : Math.min(col * 4, rows.length - 1);
        if (idx === activeIdx[i]) return;
        activeIdx[i] = idx;
        rows.forEach((row, k) => row.classList.toggle('is-sactive', k === idx));
        requestImage(i, idx);
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(onRail); };
      list.addEventListener('scroll', onScroll, { passive: true });
      onRail();
      /* ITEM 3 (Oscar, 2026-09-09) — the list's edge veils follow its
         scroll (rail-veils.js; the state lands on the pillar and the
         list window's pseudo-elements inherit it — landing-narrow.css):
         right only at the start, both once scrolled, left only at the
         end. They were 5% / 6%, both always on. */
      const cleanupVeils = wireRailVeils(pillar, list);
      phoneCleanups.push(() => {
        cleanupVeils();
        list.removeEventListener('scroll', onScroll);
        if (raf) cancelAnimationFrame(raf);
        ind?.remove();
        pillar.removeAttribute('data-m-carousel');
        list.removeAttribute('data-carousel-strip');
      });
    });
    /* the module wires every [data-m-carousel] DESCENDANT of its scope */
    phoneCleanups.push(initCarouselIndicators(section));
  }

  /* ── the tail: light → the featured stage's dark. PAINTED, not
     scrubbed (logged): the desktop scrubs its ground while its stage is
     pinned; here the section scrolls through the viewport, so the same
     journey is a gradient over the section's tail (landing-narrow.css,
     --sv-tail) — it reads identically under scroll, and a colour tween
     under touch momentum would stutter where a gradient cannot. ── */

  if (import.meta.env.DEV) {
    window.__landingServicesNarrow = { active: () => [...activeIdx], readT };
  }

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
    triggers.forEach((t) => t.kill());
    phoneCleanups.forEach((fn) => fn());
  };
}
