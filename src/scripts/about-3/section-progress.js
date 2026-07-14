import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * /about-3 left-side section-progress indicator.
 *
 * Read-only mirror of scroll position: one ScrollTrigger per REAL section
 * (only sections with an actual anchor element get a trigger — placeholder
 * rows never activate), whose enter/leave callbacks set a single active
 * index. Everything visual — which rows render, per-row opacity, label
 * visibility, the dash draw — derives purely from that index in
 * applyState(); the triggers themselves animate nothing.
 *
 * All triggers carry a `section-progress-` id prefix: about-scroll.js's
 * killHeroTriggers() spares that prefix (alongside `founders-`) when it
 * rebuilds the hero sequence on settle/resize, and cleanup here kills by
 * the same prefix on Astro page transitions.
 */

/** Rows further than this many places from the active row are fully
 * unrendered (height/opacity 0) — active + WINDOW_RADIUS above +
 * WINDOW_RADIUS below = the max-5-visible sliding window. Driven by the
 * active index, so it holds however many sections the list grows to. */
const WINDOW_RADIUS = 2;

/** Opacity per distance-from-active (array index = distance in rows). */
const DISTANCE_OPACITY = [1, 0.5, 0.3];

const ROW_HEIGHT = 24; // px — must match .section-progress__row in CSS
const DUR = 0.4;
const EASE = 'power2.out';

/**
 * Real section anchors, by row index. Rows without an entry here (03/04
 * placeholders) simply never receive focus — no trigger is faked for them.
 * `prevIndex` is who becomes active when this section is left backwards
 * (scrolling up out of it). Optional `start`/`end` override the default
 * viewport-centre window when a section's composition needs a different
 * activation point.
 *
 * The partners anchor (old row 3, "04 — our partners" — the first
 * AUTHORIZED exception) left with the wheel's relocation to /services
 * (the second AUTHORIZED exception, Oscar, services-page split).
 * Founders' row keeps focus from its own section to the end of the
 * page — same standing behaviour it always had through the landing —
 * though the indicator itself stays hidden past landing-scroll.js's
 * authorized hide (no re-show exists downstream any more).
 */
const REAL_ANCHORS = [
  { index: 0, prevIndex: 0, selector: 'body.about-page-3 [data-about-hero-spacer]' },
  { index: 1, prevIndex: 0, selector: 'body.about-page-3 [data-founders-section]' },
];

/**
 * Boot the indicator on /about-3 only.
 * @returns {() => void} cleanup
 */
export function initSectionProgress() {
  const root = document.querySelector('body.about-page-3 [data-section-progress]');
  if (!(root instanceof HTMLElement)) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rows = Array.from(root.querySelectorAll('[data-sp-row]')).map((row) => ({
    row,
    numeral: row.querySelector('[data-sp-numeral]'),
    dash: row.querySelector('[data-sp-dash]'),
    label: row.querySelector('[data-sp-label]'),
  }));

  if (!rows.length) return () => {};

  let activeIndex = 0;

  /**
   * Render the state implied by activeIndex. Opacity is tweened on the
   * blended leaves (numeral/dash/label) — never the row wrapper — because
   * an ancestor with opacity < 1 isolates the blend group and would break
   * the difference treatment (see section-progress.css header).
   * @param {boolean} animate false = snap (initial paint only)
   */
  const applyState = (animate) => {
    const dur = animate && !reduceMotion ? DUR : 0;

    rows.forEach(({ row, numeral, dash, label }, i) => {
      const dist = Math.abs(i - activeIndex);
      const inWindow = dist <= WINDOW_RADIUS;
      const opacity = inWindow ? DISTANCE_OPACITY[dist] : 0;
      const isActive = dist === 0;

      gsap.to(row, {
        height: inWindow ? ROW_HEIGHT : 0,
        duration: dur,
        ease: EASE,
        overwrite: 'auto',
      });
      gsap.to([numeral, dash], { opacity, duration: dur, ease: EASE, overwrite: 'auto' });
      gsap.to(label, {
        opacity: isActive ? 1 : 0,
        x: isActive ? 0 : -6,
        duration: dur,
        ease: EASE,
        overwrite: 'auto',
      });
    });
  };

  const setActive = (index) => {
    if (index === activeIndex || !rows[index]) return;
    activeIndex = index;
    applyState(true);

    // Dash "draws into position" on the newly active row: scaleX 0 -> 1
    // from the left. scaleY(0.25) — the hairline compression — is a
    // separate transform component GSAP preserves.
    const { dash } = rows[index];
    if (dash && !reduceMotion) {
      gsap.fromTo(
        dash,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.5, ease: EASE, overwrite: 'auto' },
      );
    }
  };

  /** @type {{ index: number, st: ScrollTrigger }[]} */
  const triggers = [];

  REAL_ANCHORS.forEach(({ index, prevIndex, selector, start, end }) => {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) return;

    const st = ScrollTrigger.create({
      id: `section-progress-${index}`,
      trigger: el,
      start: start ?? 'top center',
      end: end ?? 'bottom center',
      onEnter: () => setActive(index),
      onEnterBack: () => setActive(index),
      // Leaving backwards (scrolling up out of this section) hands focus
      // to the previous real section.
      onLeaveBack: () => setActive(prevIndex),
    });

    triggers.push({ index, st });
  });

  // Re-derive the active index from the freshly measured trigger positions
  // after every global ScrollTrigger.refresh(). The enter/leave callbacks
  // above only fire on actual scroll updates — when a refresh MOVES a
  // trigger's range across the current scroll position (which happens on
  // this page every time about-scroll.js sizes the hero spacer at settle,
  // and on resize), the trigger's active state changes silently and the
  // indicator would otherwise be left stale.
  const syncToScroll = () => {
    const y = window.scrollY;
    let index = 0;
    triggers.forEach(({ index: i, st }) => {
      if (y >= st.start) index = i;
    });
    setActive(index);
  };
  ScrollTrigger.addEventListener('refresh', syncToScroll);

  applyState(false);

  return () => {
    ScrollTrigger.removeEventListener('refresh', syncToScroll);
    triggers.forEach(({ st }) => st.kill());
    rows.forEach(({ row, numeral, dash, label }) => {
      gsap.killTweensOf([row, numeral, dash, label]);
    });
  };
}
