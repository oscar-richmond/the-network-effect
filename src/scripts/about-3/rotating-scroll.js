import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { wrapLineRevealElement } from '../line-reveal.js';
import { createRotatingFold } from './rotating-fold.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** The site-wide line-reveal curve (line-reveal.js's CSS ease) — the
 * footer label's roll must match the landing label's exactly. */
const LABEL_REVEAL_EASE = CustomEase.create('rotatingLabelReveal', 'M0,0 C0.42,0 0.24,1 1,1');

/**
 * /about-3 rotating gallery ("04 — selected work") — scroll module.
 *
 * MECHANISM (approved swap): the per-image motion is the HERO
 * GALLERY'S turn/fold effect — rotating-fold.js, one OGL context whose
 * planes mirror the static DOM items as invisible proxies and fold
 * them through the viewport with the hero's exact vertex shader,
 * flat-at-centre (see that module's header for the mapping). This
 * REPLACED the original Codrops demo-4 CSS-3D tumble (perspective
 * wraps + rotationX/Y/Z scrubs + z dip); the demo-4 VELOCITY-BLUR
 * layer was REMOVED with it (approved: the fold owns the motion now —
 * no gsap.ticker work remains in this module). The zigzag COMPOSITION
 * is untouched: sine x-offsets on the wraps, 700px native-ratio items,
 * spacing, image set.
 *
 * This module still owns everything scroll-shaped: the sine layout,
 * the marquee scrub + section-window gate (which now also pauses the
 * fold module's rAF), the footer-label reveal, the preload trigger,
 * and the melt-lead publisher. Remaining triggers carry the
 * `about-rotating-` prefix: killed on rebuild and cleanup here, and
 * SPARED by the hero's resize rebuild (about-scroll.js
 * SPARED_TRIGGER_PREFIXES — the kill-on-resize bug class found and
 * fixed during partners Stage 1). The fold module needs NO triggers of
 * its own (per-frame rect geometry, the hero pattern).
 *
 * BOUNDARY MAP (this is the page's first IN-FLOW section between fixed
 * stages — no stage, no gates, ordinary scrolling content):
 * - IN (landing -> here): landing's exit-end fires exactly as this
 *   section's top crosses the viewport bottom; the landing stage is
 *   empty by then (post-AMPLIFY wipe + tail hold) AND already faded to
 *   #161616 (landing-scroll.js's exit ground fade, anchored to the
 *   AMPLIFY wave's last image leaving the viewport and completing at
 *   this boundary) — a DARK-to-dark pixel swap onto this section's
 *   static #161616, then normal scrolling.
 * - OUT (here -> partners): partners' entry/melt anchors ride this
 *   section's bottom by document flow. The MELT-LEAD PUBLISHER moved
 *   here from landing-scroll.js: the melt should begin when this
 *   section's LAST image's centre crosses the viewport's vertical
 *   middle — lead = sectionHeight − lastItemCentreOffset − vh/2,
 *   published on this section's dataset (same attribute contract;
 *   partners-scroll.js reads its predecessor). The crossfade now melts
 *   over this scrolling content instead of the frozen last wave.
 */

/** Sine distribution (kept from the demo-4 composition):
 * x = sin(i · STEP) · innerWidth · AMP. */
const ROTATING_SINE_AMP = 0.2;
const ROTATING_SINE_STEP = 1;
/** Ahead-of-section eager-fetch lead (the landing gallery preload
 * convention — lazy imgs are unreliable below the fold on this page). */
const ROTATING_PRELOAD_LEAD_PX = 1500;
/** Footer label reveal — the landing footer label's exact vocabulary
 * (landing-scroll.js's LANDING_SETTLE_BEAT / LANDING_LINE_DURATION /
 * FOOTER_LABEL_DISSOLVE_BLUR_PX): a settle beat past the section's
 * arrival, then a 1.2s roll-up with a concurrent 4px blur dissolve,
 * reversed symmetrically on scroll-back. */
const ROTATING_LABEL_SETTLE_PX = 150;
const ROTATING_LABEL_DURATION_S = 1.2;
const ROTATING_LABEL_DISSOLVE_BLUR_PX = 4;
/** Per-name notes (Oscar's spec) — a note shows while its marquee
 * term's CENTRE sits in the middle third of the viewport (the chosen
 * reading of "in the middle 3rd": centre-in-band gives each name a
 * clear dwell and a clean beat of silence while a separator crosses
 * centre; with several candidates the one nearest centre wins). The
 * crossfade is a short TIMED dissolve per swap (a micro-tween on a
 * scrub-driven state change — the hover-tween class of exception, not
 * a scrubbed animation; overwrite:'auto' makes rapid scrub reversals
 * retarget cleanly). */
const ROTATING_NOTE_FADE_S = 0.35;
// NOTE: the light-to-dark ground fade that briefly lived here (an
// entry scrub at 'top top') MOVED UPSTREAM at the image round: it now
// runs inside landing-scroll.js, anchored to the AMPLIFY wave's last
// image leaving the viewport and completing at the boundary — so this
// section's ground is statically #161616 (rotating.css) and the
// handoff is dark-to-dark by the time it scrolls in.

/**
 * Boot the rotating gallery on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initRotatingScroll() {
  if (!document.body.classList.contains('about-page-3')) return () => {};

  const section = document.querySelector('body.about-page-3 [data-about-rotating]');
  if (!(section instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return () => {};

  const wraps = Array.from(section.querySelectorAll('[data-about-rotating-wrap]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const items = Array.from(section.querySelectorAll('[data-about-rotating-item]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const mark = section.querySelector('[data-about-rotating-mark]');
  const markInner = section.querySelector('[data-about-rotating-mark-inner]');
  const label = section.querySelector('[data-about-rotating-label]');
  if (!wraps.length || wraps.length !== items.length) return () => {};

  // Per-name notes + their marquee term spans, paired by index (the
  // component renders both from ONE array — RotatingSection.astro).
  // Term spans are the inner's children minus the '/' separators; the
  // note list is truncated to the pairing so a copy edit that changes
  // one count can never mis-map the rest.
  const notes = Array.from(section.querySelectorAll('[data-about-rotating-note]')).filter(
    (el) => el instanceof HTMLElement,
  );
  const termSpans =
    markInner instanceof HTMLElement
      ? Array.from(markInner.children).filter(
          (el) => el instanceof HTMLElement && el.textContent.trim() !== '/',
        )
      : [];
  const noteCount = Math.min(notes.length, termSpans.length);

  /** Active note index, -1 = none (no term centre in the middle third). */
  let activeNote = -1;

  const setActiveNote = (index) => {
    if (index === activeNote) return;
    activeNote = index;
    notes.forEach((note, i) => {
      gsap.to(note, {
        opacity: i === index ? 1 : 0,
        duration: ROTATING_NOTE_FADE_S,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  };

  // Live-rect read of the scrubbed marquee (the house rect-sync
  // precedent) — called from the marquee trigger's onUpdate, so it runs
  // exactly when the strip can have moved.
  const updateActiveNote = () => {
    if (!noteCount) return;
    const width = window.innerWidth;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < noteCount; i++) {
      const rect = termSpans[i].getBoundingClientRect();
      const centre = (rect.left + rect.right) / 2;
      if (centre < width / 3 || centre > (2 * width) / 3) continue;
      const dist = Math.abs(centre - width / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setActiveNote(best);
  };

  // Footer label reveal timeline — wrapped ONCE at init (the landing
  // wrapLandingColumns idiom, single static line): the roll-up drives
  // the .lr-inner transform, the dissolve rides the .lr-clip — the same
  // disjoint-target split the landing label documents.
  /** @type {gsap.core.Timeline | undefined} */
  let labelTl;
  if (label instanceof HTMLElement) {
    wrapLineRevealElement(label);
    const labelInner = label.querySelector('.lr-inner');
    const labelClip = label.querySelector('.lr-clip');
    if (labelInner instanceof HTMLElement && labelClip instanceof HTMLElement) {
      labelInner.style.transition = 'none';
      labelTl = gsap.timeline({ paused: true });
      labelTl.fromTo(
        labelInner,
        { yPercent: 110, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: ROTATING_LABEL_DURATION_S,
          ease: LABEL_REVEAL_EASE,
          immediateRender: true,
        },
        0,
      );
      labelTl.fromTo(
        labelClip,
        { opacity: 0, filter: `blur(${ROTATING_LABEL_DISSOLVE_BLUR_PX}px)` },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: ROTATING_LABEL_DURATION_S,
          ease: LABEL_REVEAL_EASE,
          immediateRender: true,
        },
        0,
      );
    }
  }

  // The fold module — created ONCE, module-instance lifetime (the
  // landing waveShader / partners imageDissolve idiom): one OGL context,
  // planes proxying the static items, re-POINTED on resize, never
  // recreated. null (no WebGL) leaves the static DOM column as the
  // degradation path, same contract as the hero gallery.
  const fold = createRotatingFold(section, items);
  // Verification/tuning hook (structural-verification protocol: the
  // occluded test pane has no rAF, so probes drive fold.tickOnce()/
  // debugState() through this expando; harmless in production).
  if (fold) section.rotatingFold = fold;

  // One gate for everything section-scoped: marquee + footer-label +
  // edge-blur visibility and the fold module's rAF ride the same window
  // trigger — which ENDS at the content-clear point (see build), so
  // every piece of text is gone before the partners melt can begin, and
  // the GL loop costs nothing while the section is off screen. The edge
  // bands are viewport-FIXED (this section is in-flow, unlike partners'
  // stage-scoped bands), so this gate is what keeps them from painting
  // over other sections.
  const edges = Array.from(section.querySelectorAll('.about-rotating__edge')).filter(
    (el) => el instanceof HTMLElement,
  );
  const setWindowVisible = (visible) => {
    if (mark instanceof HTMLElement) mark.style.visibility = visible ? 'visible' : 'hidden';
    if (label instanceof HTMLElement) label.style.visibility = visible ? 'visible' : 'hidden';
    edges.forEach((edge) => {
      edge.style.visibility = visible ? 'visible' : 'hidden';
    });
    // Notes ride the same gate. On close, the crossfade state RESETS
    // instantly (kill + snap, no tween) — visibility already blanks
    // them, and a re-entry from either end must start from silence
    // rather than resume a stale fade.
    notes.forEach((note) => {
      note.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) {
        gsap.killTweensOf(note);
        note.style.opacity = '0';
      }
    });
    if (!visible) activeNote = -1;
    else updateActiveNote();
    fold?.setPaused(!visible);
  };

  /** @type {gsap.core.Timeline | undefined} */
  let markTl;

  const build = () => {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-rotating-')) {
        trigger.kill();
      }
    });
    markTl?.kill();

    // Sine distribution on the WRAPS (the kept demo-4 composition:
    // sin(i) · innerWidth·0.2). The wraps are the only transformed
    // layer now — the items themselves are static rect proxies for the
    // fold module's planes.
    const amplitude = window.innerWidth * ROTATING_SINE_AMP;
    wraps.forEach((wrap, i) => {
      gsap.set(wrap, { x: Math.sin(i * ROTATING_SINE_STEP) * amplitude });
    });

    // Re-point the fold module at the fresh viewport (re-POINTED, not
    // recreated — the waveShader/imageDissolve resize idiom). Per-image
    // rotation needs no triggers here: rotating-fold.js derives each
    // plane's travel from its proxy's live rect every frame (the hero
    // pattern).
    fold?.resize();

    // Content-clear point — the scroll offset (within the section's own
    // travel) at which the LAST image's bottom passes the viewport top.
    // Everything text-shaped ends with it: the marquee window (below)
    // and the label/mark visibility gate both close here, so by the
    // time the partners melt can begin (see the publisher) the viewport
    // holds nothing but the empty #161616 tail. Sine x offsets don't
    // affect vertical layout, so offsetTop is authoritative.
    const lastWrap = wraps[wraps.length - 1];
    const lastBottom = lastWrap.offsetTop + lastWrap.offsetHeight;

    // Marquee — one trigger doubles as the scrub (x: 100vw -> -100%)
    // and the section-window gate (marquee + footer-label visibility +
    // the velocity layer's perf gate). The window's END is the
    // content-clear point (was the reference's 'bottom top'): the strip
    // completes its full run exactly as the last image exits, per
    // Oscar's melt-clearance spec.
    if (mark instanceof HTMLElement && markInner instanceof HTMLElement) {
      markTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: `top+=${lastBottom} top`,
          scrub: true,
          id: 'about-rotating-mark',
          onToggle: (self) => setWindowVisible(self.isActive),
        },
        // Per-name notes — re-derive the active note on the TIMELINE's
        // onUpdate, not the trigger's: the strip's x moves exactly when
        // this timeline renders, so this fires precisely when a term
        // rect can have changed (and, measured, the trigger-level
        // onUpdate does not dispatch under manual ST.update()+tick
        // driving, where the timeline callback does — the gate handles
        // enter/exit either way).
        onUpdate: updateActiveNote,
      });
      markTl.fromTo(
        markInner,
        { x: '100vw' },
        { x: '-100%', ease: 'none', immediateRender: false },
      );
    }

    // Footer label play/reverse trigger — the landing reveal idiom: a
    // settle beat past the section's arrival plays the timed roll-up;
    // scrolling back above it reverses symmetrically. The far-end hide
    // is the window gate above (instant, the landing stage-swap
    // precedent).
    if (labelTl) {
      ScrollTrigger.create({
        trigger: section,
        start: `top+=${ROTATING_LABEL_SETTLE_PX} bottom`,
        end: `top+=${lastBottom} top`,
        id: 'about-rotating-label',
        onEnter: () => labelTl.play(),
        onLeaveBack: () => labelTl.reverse(),
      });
    }

    // Melt-lead publisher (see BOUNDARY MAP in the header): the melt
    // may only begin once ALL content — images, marquee text, footer
    // label — has fully left the viewport (Oscar's spec). The published
    // lead is the boundary-to-clear gap: sectionHeight − lastBottom −
    // vh. The CSS tail (100vh + 500px, rotating.css) makes this 555px
    // at any viewport height, so the consumer's 400px clamp always
    // lands the melt strictly inside the cleared, empty tail.
    section.dataset.partnersMeltLeadPx = String(
      Math.max(0, Math.round(section.offsetHeight - lastBottom - window.innerHeight)),
    );

    // One-shot eager fetch ahead of the section (landing preload idiom —
    // these pool files are usually cached from the waves already; belt).
    // Lives INSIDE build(): it carries the killed prefix, so a resize
    // rebuild must recreate it (re-arming after it fired is idempotent —
    // the eager upgrade is a no-op the second time).
    ScrollTrigger.create({
      trigger: section,
      start: `top-=${ROTATING_PRELOAD_LEAD_PX} bottom`,
      end: `top-=${ROTATING_PRELOAD_LEAD_PX} bottom`,
      id: 'about-rotating-preload',
      once: true,
      onEnter: () => {
        section.querySelectorAll('[data-about-rotating-img]').forEach((img) => {
          if (img instanceof HTMLImageElement) {
            img.loading = 'eager';
            img.decode?.().catch(() => {});
          }
        });
      },
    });

    ScrollTrigger.refresh();

    // Rebuild restoration — window gate + label playhead derived from
    // the fresh triggers (callbacks only fire on change; a rebuild
    // mid-section needs the state read explicitly — the landing
    // revealTl restoration idiom).
    const markTrigger = markTl?.scrollTrigger;
    if (markTrigger) setWindowVisible(markTrigger.isActive);
    if (labelTl) {
      const labelTrigger = ScrollTrigger.getById('about-rotating-label');
      if (labelTrigger && window.scrollY >= labelTrigger.start) {
        labelTl.progress(1).pause();
      } else {
        labelTl.progress(0).pause();
      }
    }
  };

  let cancelled = false;
  // Same hero-settle gate as the neighbouring modules (see
  // landing-scroll.js): anchors depend on every runway above being
  // final. Registered BEFORE partners-scroll.js's listener (AboutScroll
  // init order), so this build publishes the melt lead before partners'
  // build reads it — and partners' trailing refresh re-anchors
  // everything regardless.
  const whenHeroScrollReady = () =>
    new Promise((resolve) => {
      if (document.querySelector('body.about-page-3 [data-about-hero-spacer]')?.style.height) {
        resolve();
        return;
      }
      document.addEventListener('about-3:hero-scroll-ready', () => resolve(), { once: true });
    });
  Promise.all([document.fonts.ready, whenHeroScrollReady()]).then(() => {
    if (!cancelled) build();
  });

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  const onResize = () => {
    if (window.innerWidth === lastW && window.innerHeight === lastH) return;
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    build();
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelled = true;
    window.removeEventListener('resize', onResize);
    ScrollTrigger.getAll().forEach((trigger) => {
      if (typeof trigger.vars.id === 'string' && trigger.vars.id.startsWith('about-rotating-')) {
        trigger.kill();
      }
    });
    markTl?.kill();
    labelTl?.kill();
    gsap.killTweensOf([...items, ...wraps, ...notes]);
    if (markInner instanceof HTMLElement) gsap.killTweensOf(markInner);
    if (label instanceof HTMLElement) gsap.killTweensOf(label.querySelectorAll('.lr-inner, .lr-clip'));
    setWindowVisible(false);
    fold?.destroy();
  };
}
