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
import { isMobileViewport } from './viewport.js';
import { initMobileEntrance } from './m-entrance.js';
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

export function initLandingServices() {
  const section = document.querySelector('[data-landing-services]');
  if (!(section instanceof HTMLElement)) return () => {};
  if (!isMobileViewport()) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  const pillars = Array.from(section.querySelectorAll('[data-sreel-pillar]')).filter((el) => el instanceof HTMLElement);
  const readT = parseFloat(getComputedStyle(document.body).getPropertyValue('--sv-read-t')) || 1;

  /* ── the entrances: the intro's lines, then each pillar's heads ── */
  const intro = section.querySelector('[data-sreel-intro]');
  cleanups.push(initMobileEntrance(section, {
    lines: [
      section.querySelector('[data-sreel-wwd]'),
      ...(intro ? intro.querySelectorAll('[data-sreel-introline]') : []),
    ].filter((el) => el instanceof HTMLElement),
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
    if (reduced) {
      st.over.src = srcFor(i, target);
      st.current = target;
      st.busy = false;
      return;
    }
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
  const triggers = pillars.map((pillar, i) => ScrollTrigger.create({
    trigger: pillar,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: () => update(i),
    onEnter: () => update(i),
    onEnterBack: () => update(i),
  }));

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
  };
}
