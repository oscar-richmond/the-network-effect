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

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;
const MEDIA_AT_MS = 1040;

export function initLandingNetwork() {
  const section = document.querySelector('[data-landing-network]');
  if (!(section instanceof HTMLElement)) return () => {};

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
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
      wrapLineRevealElement(line);
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
    trigger?.kill();
  };
}
