/**
 * SERVICES INTRO (/landing) — the outro section's opening line.
 *
 * Two jobs:
 *
 * 1. GLYPH ALIGNMENT (layout, both motion branches): line 1's left
 *    edge is offset so the O of "OUR" sits exactly on the first S of
 *    "ACCESS" in the line below — derived from the RENDERED glyph via
 *    a Range around that character (the site's established mechanism,
 *    the holding sign-off's B-under-R). Runs after fonts, BEFORE the
 *    reveal wrap (the measure needs the raw text node), and re-derives
 *    on resize. The title block is shrink-to-fit and flex-centred by
 *    the section, so the indented pair stays centred TOGETHER.
 *
 * 2. ENTRANCE (no-preference only): the founders-headline vocabulary
 *    verbatim — per-line line-reveals, 120ms stagger, one-shot
 *    trigger when the section scrolls to 65% viewport, fonts-gated
 *    wrap. Reduced motion renders the line complete and static.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';

gsap.registerPlugin(ScrollTrigger);

const LINE_STAGGER_S = 0.12;

/**
 * The transition OUT (Oscar's rev — the bridge into Our Network),
 * one scrubbed gesture over the outro's extra runway, starting the
 * moment the outro's top reaches the viewport top (i.e. exactly as
 * the founders photo finishes departing):
 *
 *   0 ......... DWELL ........ 250        the services line holds
 *   250 ....... text fade .... 650        opacity 1 -> 0
 *   450 ....... ground fade .. 950        #EEEEF0 -> #161616
 *
 * The text fade and ground fade overlap by 200px so the three beats
 * read as one continuous move, and the scrub's end (950) is the same
 * scroll position where the network section's top crosses the
 * viewport bottom — black arriving on black, no seam. Keep the total
 * in step with the outro's height in landing.css.
 */
const TRANSITION_DWELL_PX = 250;
const TRANSITION_TEXT_FADE_PX = 400;
const TRANSITION_GROUND_DELAY_PX = 200;
const TRANSITION_GROUND_FADE_PX = 500;
const GROUND_DARK = '#161616';

/** Index of the alignment glyph — the first S of "ACCESS. TO IMPACT.". */
const ALIGN_CHAR_INDEX = 4;

function alignServicesLines(line1, line2) {
  if (!(line1 instanceof HTMLElement) || !(line2 instanceof HTMLElement)) return;
  const textNode = line2.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

  line1.style.marginLeft = '0px';
  const range = document.createRange();
  range.setStart(textNode, ALIGN_CHAR_INDEX);
  range.setEnd(textNode, ALIGN_CHAR_INDEX + 1);
  const sRect = range.getBoundingClientRect();
  if (sRect.width === 0) return;
  const offset = sRect.left - line2.getBoundingClientRect().left;
  line1.style.marginLeft = `${offset.toFixed(2)}px`;
}

export function initLandingServices() {
  const section = document.querySelector('[data-landing-services]');
  const line1 = document.querySelector('[data-landing-services-line1]');
  const line2 = document.querySelector('[data-landing-services-line2]');
  if (!(section instanceof HTMLElement)) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  let disposed = false;
  let trigger = null;
  let transitionTl = null;

  const onResize = () => alignServicesLines(line1, line2);

  fontsReady.then(() => {
    if (disposed) return;

    /* Alignment first — the Range measure needs line 2's raw text
       node, which the reveal wrap replaces. The derived margin lives
       on the line, so the wrap carries it. */
    alignServicesLines(line1, line2);
    window.addEventListener('resize', onResize);

    if (reduced) return;

    /* The transition out — see the constants above. */
    const title = document.querySelector('[data-landing-services-title]');
    if (title instanceof HTMLElement) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${TRANSITION_DWELL_PX + TRANSITION_GROUND_DELAY_PX + TRANSITION_GROUND_FADE_PX}`,
          scrub: true,
        },
      });
      tl.to(
        title,
        { opacity: 0, duration: TRANSITION_TEXT_FADE_PX, ease: 'none' },
        TRANSITION_DWELL_PX,
      );
      tl.to(
        section,
        { backgroundColor: GROUND_DARK, duration: TRANSITION_GROUND_FADE_PX, ease: 'none' },
        TRANSITION_DWELL_PX + TRANSITION_GROUND_DELAY_PX,
      );
      transitionTl = tl;
    }

    const lines = [line1, line2].filter((el) => el instanceof HTMLElement);
    lines.forEach((line, i) => {
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapLineRevealElement(line);
    });

    trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        lines.forEach((line) => playLineRevealElement(line));
      },
    });
  });

  return () => {
    disposed = true;
    window.removeEventListener('resize', onResize);
    trigger?.kill();
    transitionTl?.scrollTrigger?.kill();
    transitionTl?.kill();
  };
}
