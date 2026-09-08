/**
 * THE SERVICES STACK below the seam (mobile rebuild Part 2, 2026-09-08 —
 * frames 1:105 / 1:141 / 1:177 and the stack 1:426; Oscar's 2026-09-08
 * brief: the pinned label, the roll-over dissolve, the one release, the
 * transform compaction).
 *
 * THE STACK: WHAT WE DO pins 24 under the scrolled wordmark; each pillar is
 * a sticky opaque panel (services.css) parking on a 31 pitch under it —
 * IMMERSE's divider 16 under the label, CONNECT 31 lower, AMPLIFY 31 lower
 * again. As the NEXT pillar arrives, the parked one COMPACTS: its title row
 * scales about its top-left corner (28 → 14, the index with it) and lifts
 * (the 32 gap → 8) — ONE transform, scrubbed over the next pillar's last
 * --m-stack-compact-px of approach, ending as its divider lands; the row's
 * fixed 55 box means nothing below it moves. Scaling the font instead
 * re-laid the glyphs out every frame and read as a vibration.
 *
 * THE ROLL-OVER: the parked pillar's units below its title — the image, the
 * description, the label, the list, the button — DISSOLVE one by one as the
 * next panel's top comes up over them: each blurs --m-wipe-blur and fades
 * over --m-wipe-span of scroll, gone --m-wipe-lead before the panel's top
 * reaches its own top (the hero's vocabulary; the desktop reel's roll-over
 * wipe). Their windows are absolute scroll positions from the pinned
 * geometry, so they reverse exactly.
 *
 * THE RELEASE: the stack holds --m-stack-hold once AMPLIFY has parked, then
 * leaves as ONE. A sticky box lets go as the stage's end reaches its foot,
 * so the four boxes are given one foot: --m-stack-h (the tallest pillar plus
 * its band offset) is measured here and written on the stage; each pillar's
 * min-height is it less the pillar's band offset, WHAT WE DO's box runs down
 * to it (services.css takes the extra out of the flow). Without it AMPLIFY,
 * the tallest, would slide up first over the parked bands.
 *
 * THE LIST RAIL: the rows are a 4-row column grid in a snapping scroller;
 * the indicator's thumb (the label's pseudo-element) translates with the
 * rail's scroll fraction — a ScrollTrigger on the rail as its scroller.
 *
 * The desc's authored <br> becomes a space below the seam (1:113 is one
 * text node wrapping at 257) and comes back on revert. The intro statement
 * and WHAT WE DO arrive on the word-clip rise (reveal.js); the pillars'
 * own text does not (Oscar's brief).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';
import { bindTextReveal } from './reveal.js';

const UNITS = ['.landing-sreel__img', '.landing-sreel__desc', '.landing-sreel__wlabel', '.landing-sreel__listwin', '.landing-sreel__btn'];

export function initMobileServices() {
  return mobileMatch((ctx) => {
    const stage = document.querySelector('[data-sreel-stage]');
    if (!(stage instanceof HTMLElement)) return;
    const pillars = Array.from(stage.querySelectorAll('[data-sreel-pillar]')).filter((el) => el instanceof HTMLElement);
    if (!pillars.length) return;
    const pinTop = tokenPx('--m-stack-pin-top'), bandH = tokenPx('--m-stack-band-h'), compactPx = tokenPx('--m-stack-compact-px');
    const gapOpen = tokenPx('--m-space-5'), gapClosed = tokenPx('--m-stack-band-title-gap');
    const titleOpen = tokenPx('--type-pillar-title-size'), titleClosed = tokenPx('--type-pillar-title-size-collapsed');
    const ratio = titleOpen > 0 ? titleClosed / titleOpen : 0.5;
    const wipeLead = tokenPx('--m-wipe-lead'), wipeSpan = tokenPx('--m-wipe-span'), wipeBlur = tokenPx('--m-wipe-blur');
    const trackW = tokenPx('--m-indicator-w'), thumbW = tokenPx('--m-indicator-thumb');

    /* the entrances: the statement's two lines and the label */
    for (const el of stage.querySelectorAll('.landing-sreel__st-line')) bindTextReveal(ctx, el);
    bindTextReveal(ctx, stage.querySelector('[data-sreel-wwd]'));

    /* the desc's <br> → a space (restored on revert) */
    const swaps = [];
    for (const br of stage.querySelectorAll('[data-sreel-desc] br')) { const t = document.createTextNode(' '); br.replaceWith(t); swaps.push([br, t]); }

    /* THE ONE FOOT: the pillars' natural heights (min-height off), the tallest plus its band offset */
    const measure = () => {
      stage.style.setProperty('--m-stack-h', '0px');
      const h = Math.max(...pillars.map((p, i) => p.offsetHeight + i * bandH));
      stage.style.setProperty('--m-stack-h', `${Math.ceil(h)}px`);
    };
    measure();

    /* natural (unstuck) tops, measured with sticky off — the scrubs are keyed on these, as absolute scroll positions */
    const naturalTops = () => {
      const prev = pillars.map((p) => p.style.position);
      pillars.forEach((p) => { p.style.position = 'static'; });
      const tops = pillars.map((p) => p.getBoundingClientRect().top + window.scrollY);
      pillars.forEach((p, i) => { p.style.position = prev[i]; });
      return tops;
    };

    /* the idempotent re-entry reset: every pillar expanded, every unit whole */
    const rows = pillars.map((p) => p.querySelector('[data-sreel-titlerow]')).filter((r) => r instanceof HTMLElement);
    gsap.set(rows, { scale: 1, y: 0 });
    const units = pillars.map((p) => UNITS.map((s) => p.querySelector(s)).filter((u) => u instanceof HTMLElement));
    gsap.set(units.flat(), { opacity: 1, filter: 'blur(0px)' });
    gsap.set(pillars, { '--m-ind-x': '0px' });

    ctx.add(() => {
      /* the refresh re-measures the foot before anything reads the layout */
      ScrollTrigger.addEventListener('refreshInit', measure);
      for (let i = 0; i < pillars.length - 1; i += 1) {
        const pinI = pinTop + i * bandH, pinNext = pinI + bandH;
        /* the compaction of pillar i, keyed on pillar i + 1's approach to its own pin line: one transform on the row */
        const row = rows[i];
        if (row) {
          const end = () => naturalTops()[i + 1] - pinNext;   /* the next divider lands */
          const start = () => end() - compactPx;
          const state = { p: 0 };
          /* the row scales s about its top-left; its text (gapOpen down) must sit at the gap the scrub wants, so the row lifts the difference */
          const apply = (p) => { const s = 1 - (1 - ratio) * p; const gap = gapOpen - (gapOpen - gapClosed) * p; gsap.set(row, { scale: s, y: gap - gapOpen * s, transformOrigin: '0 0' }); };
          gsap.to(state, { p: 1, ease: 'none', onUpdate: () => apply(state.p), scrollTrigger: { start, end, scrub: true, invalidateOnRefresh: true, onRefresh: (st) => apply(st.progress) } });
        }
        /* the roll-over: each unit of pillar i dissolves as pillar i + 1's top comes up to it */
        for (const unit of units[i]) {
          const cover = () => naturalTops()[i + 1] - (pinI + unit.offsetTop);  /* the next panel's top reaches the unit's pinned top */
          const end = () => cover() - wipeLead;
          const start = () => end() - wipeSpan;
          gsap.fromTo(unit, { opacity: 1, filter: 'blur(0px)' }, {
            opacity: 0, filter: `blur(${wipeBlur}px)`, ease: 'none', immediateRender: false,
            scrollTrigger: { start, end, scrub: true, invalidateOnRefresh: true },
          });
        }
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
      window.__mStack = () => pillars.map((p, i) => { const r = p.getBoundingClientRect(); return { i, top: Math.round(r.top), bottom: Math.round(r.bottom), scale: gsap.getProperty(rows[i], 'scale'), natural: Math.round(naturalTops()[i]), stackH: stage.style.getPropertyValue('--m-stack-h') }; });
    }
    return () => { ScrollTrigger.removeEventListener('refreshInit', measure); for (const [br, t] of swaps) t.replaceWith(br); stage.style.removeProperty('--m-stack-h'); if (import.meta.env.DEV) delete window.__mStack; };
  });
}
