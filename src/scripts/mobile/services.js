/**
 * THE SERVICES STACK below the seam (mobile rebuild Part 2, 2026-09-08 —
 * frames 1:105 / 1:141 / 1:177 and the stack 1:426).
 *
 * THE STACK: each pillar is a sticky opaque panel (services.css) parking
 * under the nav on a 31 pitch — IMMERSE at the bar's foot, CONNECT 31 lower,
 * AMPLIFY 31 lower again. As the NEXT pillar arrives, the parked one
 * COMPACTS: its title 28 → 14, the index 14 → 6, the gap above the title
 * 32 → 8 — scrubbed over the next pillar's last --m-stack-compact-px of
 * approach, ending as its divider lands. The title row is a fixed 55 box,
 * so the compaction never moves the layout below it; the next panel covers
 * that layout anyway, leaving the 31 band. AMPLIFY, the last, parks
 * expanded (the stack frame's end state) and the whole stack holds through
 * the stage's tail — the 80 + 474 fade zone into Featured Work — then
 * releases with it, AMPLIFY first, the bands 31px apart behind it. Pure
 * functions of scroll: sticky is one, the scrubbed compaction is another.
 *
 * THE LIST RAIL: the rows are a 4-row column grid in a snapping scroller;
 * the indicator's thumb (the label's pseudo-element) translates with the
 * rail's scroll fraction — a ScrollTrigger on the rail as its scroller.
 *
 * The desc's authored <br> becomes a space below the seam (1:113 is one
 * text node wrapping at 257) and comes back on revert.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';

export function initMobileServices() {
  return mobileMatch((ctx) => {
    const stage = document.querySelector('[data-sreel-stage]');
    if (!(stage instanceof HTMLElement)) return;
    const pillars = Array.from(stage.querySelectorAll('[data-sreel-pillar]')).filter((el) => el instanceof HTMLElement);
    if (!pillars.length) return;
    const pinTop = tokenPx('--m-stack-pin-top'), bandH = tokenPx('--m-stack-band-h'), compactPx = tokenPx('--m-stack-compact-px');
    const gapOpen = tokenPx('--m-space-5'), gapClosed = tokenPx('--m-stack-band-title-gap');
    const titleOpen = tokenPx('--type-pillar-title-size'), titleClosed = tokenPx('--type-pillar-title-size-collapsed');
    const titleLhOpen = tokenPx('--m-pillar-title-h'), titleLhClosed = tokenPx('--m-stack-title-lh');
    const indexOpen = tokenPx('--type-pillar-index-size'), indexClosed = tokenPx('--type-pillar-index-size-collapsed');
    const indexLhOpen = tokenPx('--m-pillar-index-h'), indexLhClosed = tokenPx('--m-stack-index-lh');
    const trackW = tokenPx('--m-indicator-w'), thumbW = tokenPx('--m-indicator-thumb');

    /* the desc's <br> → a space (restored on revert) */
    const swaps = [];
    for (const br of stage.querySelectorAll('[data-sreel-desc] br')) { const t = document.createTextNode(' '); br.replaceWith(t); swaps.push([br, t]); }

    /* natural (unstuck) tops, measured with sticky off — the scrubs are keyed on these, as absolute scroll positions */
    const naturalTops = () => {
      const prev = pillars.map((p) => p.style.position);
      pillars.forEach((p) => { p.style.position = 'static'; });
      const tops = pillars.map((p) => p.getBoundingClientRect().top + window.scrollY);
      pillars.forEach((p, i) => { p.style.position = prev[i]; });
      return tops;
    };

    /* the idempotent re-entry reset: every pillar expanded */
    const parts = pillars.map((p) => ({
      row: p.querySelector('[data-sreel-titlerow]'), title: p.querySelector('.landing-sreel__title'), num: p.querySelector('.landing-sreel__num'),
    }));
    for (const { row, title, num } of parts) {
      if (row) gsap.set(row, { paddingTop: gapOpen });
      if (title) gsap.set(title, { fontSize: titleOpen, lineHeight: `${titleLhOpen}px` });
      if (num) gsap.set(num, { fontSize: indexOpen, lineHeight: `${indexLhOpen}px` });
    }
    gsap.set(pillars, { '--m-ind-x': '0px' });

    ctx.add(() => {
      /* the compaction of pillar i, keyed on pillar i + 1's approach to its own pin line */
      for (let i = 0; i < pillars.length - 1; i += 1) {
        const { row, title, num } = parts[i];
        const pinNext = pinTop + (i + 1) * bandH;
        const end = () => naturalTops()[i + 1] - pinNext;   /* the next divider lands */
        const start = () => end() - compactPx;
        const tl = gsap.timeline({ scrollTrigger: { start, end, scrub: true, invalidateOnRefresh: true } });
        if (row) tl.fromTo(row, { paddingTop: gapOpen }, { paddingTop: gapClosed, ease: 'none', immediateRender: false }, 0);
        if (title) tl.fromTo(title, { fontSize: titleOpen, lineHeight: `${titleLhOpen}px` }, { fontSize: titleClosed, lineHeight: `${titleLhClosed}px`, ease: 'none', immediateRender: false }, 0);
        if (num) tl.fromTo(num, { fontSize: indexOpen, lineHeight: `${indexLhOpen}px` }, { fontSize: indexClosed, lineHeight: `${indexLhClosed}px`, ease: 'none', immediateRender: false }, 0);
      }
      /* the list rails: the thumb follows the scroll fraction */
      for (const p of pillars) {
        const rail = p.querySelector('[data-sreel-listwin]');
        if (!(rail instanceof HTMLElement)) continue;
        const max = () => Math.max(1, rail.scrollWidth - rail.clientWidth);
        rail.scrollLeft = 0;
        gsap.fromTo(p, { '--m-ind-x': '0px' }, {
          '--m-ind-x': `${trackW - thumbW}px`, ease: 'none', immediateRender: false,
          scrollTrigger: { scroller: rail, horizontal: true, start: 0, end: max, scrub: true, invalidateOnRefresh: true },
        });
      }
    });
    if (import.meta.env.DEV) {
      window.__mStack = () => pillars.map((p, i) => { const r = p.getBoundingClientRect(); const t = parts[i].title; return { i, top: Math.round(r.top), bottom: Math.round(r.bottom), title: t ? getComputedStyle(t).fontSize : null, pad: parts[i].row ? getComputedStyle(parts[i].row).paddingTop : null, natural: Math.round(naturalTops()[i]) }; });
    }
    return () => { for (const [br, t] of swaps) t.replaceWith(br); if (import.meta.env.DEV) delete window.__mStack; };
  });
}
