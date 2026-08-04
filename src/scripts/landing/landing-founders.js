/**
 * FOUNDERS SECTION — entrance choreography (/landing).
 *
 * The page's established vocabulary only, nothing new: the headline
 * lines get the site-wide line-reveal (clip + rise, 120ms stagger —
 * the same mechanism the hero copy uses), the buttons fade-rise like
 * the chrome items across the site, and the images plain-fade like
 * the photo slots. The relative timings are the hero's own entry
 * slots (lines at 0, buttons at 680ms + 120ms stagger, images at
 * 1040ms), re-anchored to the moment the section scrolls into view.
 *
 * The trigger is a one-shot ScrollTrigger (enter at 65% viewport) —
 * an ENTRANCE, not a scrub: it plays once, like the hero's load
 * choreography, and never reverses.
 *
 * Reduced motion: no triggers, no hidden states (CSS gates those
 * under no-preference) — the section renders complete and static.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const BUTTONS_AT_MS = 680;
const BUTTONS_STAGGER_MS = 120;
const IMAGES_AT_MS = 1040;

/**
 * Entry drift (Oscar's rev): while the section scrolls up over the
 * held video, each item lags behind at its own pace and lands on its
 * design position exactly as the section becomes fully visible
 * (section top reaching the viewport top — the same scroll position
 * where the crossing runway ends). Values are the per-item drift in
 * px at the moment the section's top edge enters the viewport;
 * larger = lazier. Tunables.
 *
 * The two PORTRAITS drift via `top` (layout), NOT transform: they
 * contain the difference-blended hover names, and a transformed
 * ancestor creates a stacking context that isolates a blend — the
 * codebase's six-regression class. The blend-free layers use
 * transforms as normal.
 */
const DRIFT_HEADLINE_PX = 60;
const DRIFT_CTAS_PX = 110;
const DRIFT_ROBBO_PX = 140;
const DRIFT_ASHLEY_PX = 170;
const DRIFT_PHOTO_PX = 200;

export function initLandingFounders() {
  const section = document.querySelector('[data-landing-founders]');
  if (!(section instanceof HTMLElement)) return () => {};

  const lines = Array.from(section.querySelectorAll('.landing-founders__line'));
  const buttons = Array.from(section.querySelectorAll('.landing-founders__btn'));
  const images = Array.from(section.querySelectorAll('[data-landing-founders-img]'));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  /* ── Entry drift: scrubbed over the section's crossing runway
     (top-enters-bottom -> top-reaches-top), ease none so each layer
     tracks the scroll 1:1 at its own amplitude and lands exactly at
     its resting position. Composes with the one-shot reveal below:
     the drift owns WHERE things are during entry, the reveal owns
     their opacity/line choreography. Transform layers animate `y`;
     the portraits animate `top` (see the blend note on the
     constants). */
  const driftTweens = [];
  const driftSpec = [
    { el: section.querySelector('.landing-founders__headline'), px: DRIFT_HEADLINE_PX, mode: 'y' },
    { el: section.querySelector('.landing-founders__ctas'), px: DRIFT_CTAS_PX, mode: 'y' },
    { el: section.querySelector('.landing-founders__photo'), px: DRIFT_PHOTO_PX, mode: 'y' },
    { el: section.querySelector('.landing-founders__portrait--robbo'), px: DRIFT_ROBBO_PX, mode: 'top' },
    { el: section.querySelector('.landing-founders__portrait--ashley'), px: DRIFT_ASHLEY_PX, mode: 'top' },
  ];
  driftSpec.forEach(({ el, px, mode }) => {
    if (!(el instanceof HTMLElement)) return;
    const scrollTrigger = {
      trigger: section,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
    };
    let tween;
    if (mode === 'top') {
      const baseTop = parseFloat(getComputedStyle(el).top);
      tween = gsap.fromTo(
        el,
        { top: baseTop + px },
        { top: baseTop, ease: 'none', scrollTrigger },
      );
    } else {
      tween = gsap.fromTo(el, { y: px }, { y: 0, ease: 'none', scrollTrigger });
    }
    driftTweens.push(tween);
  });

  /* Wrap after fonts so the clip boxes measure the real glyphs (the
     established gate — wrapping against fallback metrics mis-groups
     lines). Hidden until wrapped: the wrap itself puts each line in
     its risen-out state, so there is no flash window. */
  const timeouts = [];
  let trigger = null;
  let disposed = false;

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    lines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });

    const play = () => {
      lines.forEach((line) => {
        if (line instanceof HTMLElement) playLineRevealElement(line);
      });
      buttons.forEach((btn, i) => {
        timeouts.push(
          setTimeout(() => btn.classList.add('is-visible'), BUTTONS_AT_MS + i * BUTTONS_STAGGER_MS),
        );
      });
      timeouts.push(
        setTimeout(() => {
          images.forEach((img) => img.classList.add('is-visible'));
        }, IMAGES_AT_MS),
      );
    };

    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: play,
    });
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    trigger?.kill();
    driftTweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
  };
}
