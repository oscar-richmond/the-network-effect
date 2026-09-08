/**
 * THE BAND'S PIN AND EXIT (Oscar 2026-09-08) — the desktop founders
 * mechanic (landing-founders.js: entry → hold → exit, one scrubbed
 * timeline) on the phone's layouts, shared by WHO WE ARE and OUR NETWORK.
 *
 * A band is a TRACK in flow (the containing block, the ground-bearing
 * element) and a SECTION inside it that this makes sticky: pinned at the
 * top, or on its foot where it is taller than the viewport (the desktop's
 * min(0, 100svh − h)) — but never with its first ink under the bar
 * (--m-band-ink, measured here: the phone's bands run past a viewport, and
 * the foot rule alone would hide their heads). The track is the section plus --m-band-hold, plus
 * --m-band-release, plus any `after` (OUR NETWORK holds a further
 * --m-ground-fade-px of bare ground while the layer lightens for WHAT WE
 * DO); the sticky lets go as the track ends.
 *
 * The timeline is keyed on the track's top reaching the viewport's bottom
 * and runs entry + hold + exit of scroll:
 *   ENTRY (until the pin engages — the scroll from the track's top at the
 *     viewport's bottom to the section's top at its sticky top): each item
 *     lags in from its own drift (--m-drift-*, at the phone's 0.6) and
 *     lands at rest as the catch begins;
 *   HOLD (--m-band-hold): nothing moves — the resistance;
 *   EXIT (--m-band-exit): each item rises its own --m-exit-y-* and blurs
 *     and fades out over its own --m-exit-blur-* span (the media a
 *     --m-exit-media-lag behind), so they leave together at different
 *     speeds; by --m-band-release the last has gone and the section is
 *     released.
 * Every write is a pure function of scroll and reverses. An item's exit may
 * mirror onto CSS variables on a host (--m-band-y, --m-band-fade) for
 * pseudo-elements that must ride with it (the network strip's edges).
 * Reduced motion: no pin, no exit — the band scrolls in flow.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tokenPx } from './match.js';

/** The three roles' specs from the tokens: drift in, rise out, blur span. */
export function bandSpecs() {
  const s = tokenPx('--m-drift-scale') || 1;
  return {
    headline: { drift: tokenPx('--m-drift-headline') * s, exitY: tokenPx('--m-exit-y-headline'), blurSpan: tokenPx('--m-exit-blur-headline') },
    ctas: { drift: tokenPx('--m-drift-ctas') * s, exitY: tokenPx('--m-exit-y-ctas'), blurSpan: tokenPx('--m-exit-blur-ctas') },
    media: { drift: tokenPx('--m-drift-media') * s, exitY: tokenPx('--m-exit-y-media'), blurSpan: tokenPx('--m-exit-blur-media'), lag: tokenPx('--m-exit-media-lag') },
  };
}

/**
 * @param {gsap.Context} ctx
 * @param {{ track: HTMLElement, section: HTMLElement, items: { el: HTMLElement, drift: number, exitY: number, blurSpan: number, lag?: number, mirror?: HTMLElement }[], after?: number | ((h: number, pinTop: number) => number) }} band  `after` may be a function of the section's height and sticky top (measured at every refresh)
 */
export function bindBand(ctx, { track, section, items, after = 0 }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hold = tokenPx('--m-band-hold'), exit = tokenPx('--m-band-exit'), release = tokenPx('--m-band-release'), blur = tokenPx('--m-exit-blur');
  const list = items.filter((it) => it.el instanceof HTMLElement);
  const els = list.map((it) => it.el);
  /* the idempotent re-entry reset */
  gsap.set(els, { y: 0, opacity: 1, filter: 'blur(0px)' });
  for (const it of list) if (it.mirror) gsap.set(it.mirror, { '--m-band-y': '0px', '--m-band-fade': 1 });
  /* the sticky geometry: the section's height, measured in flow, written for band.css */
  /* the section's sticky top as band.css resolves it (0 until the classes are on) */
  const pinTop = () => parseFloat(getComputedStyle(section).top) || 0;
  const afterPx = () => (typeof after === 'function' ? after(section.offsetHeight, pinTop()) : after);
  /* the sticky geometry: the section's height and its first ink's offset (the pin never puts it under the bar), measured in flow */
  const measure = () => {
    const secTop = section.getBoundingClientRect().top;
    const ink = Math.min(...els.map((el) => el.getBoundingClientRect().top - secTop - (Number(gsap.getProperty(el, 'y')) || 0)));
    track.style.setProperty('--m-band-h', `${section.offsetHeight}px`);
    track.style.setProperty('--m-band-ink', `${Math.max(0, Math.round(ink))}px`);
    track.style.setProperty('--m-band-after', `${Math.round(afterPx())}px`);
  };
  track.classList.remove('is-banded'); section.classList.remove('is-banded');
  measure();
  track.classList.add('m-band-track', 'is-banded'); section.classList.add('m-band', 'is-banded');
  ctx.add(() => {
    const vh = window.innerHeight;
    const entry = vh - pinTop();                /* the scroll from the track's top at the viewport's bottom to the pin (the section's top at its sticky top) */
    const holdEnd = entry + hold;
    /* the geometry is re-measured at the head of every refresh, before any trigger reads the layout */
    ScrollTrigger.addEventListener('refreshInit', measure);
    const tl = gsap.timeline({ scrollTrigger: { trigger: track, start: 'top bottom', end: `+=${entry + hold + exit}`, scrub: true, invalidateOnRefresh: true } });
    for (const it of list) {
      tl.fromTo(it.el, { y: it.drift }, { y: 0, duration: entry, ease: 'none' }, 0);
      tl.to(it.el, { y: -it.exitY, duration: exit, ease: 'none' }, holdEnd);
      const at = holdEnd + (it.lag || 0);
      tl.fromTo(it.el, { filter: 'blur(0px)', opacity: 1 }, { filter: `blur(${blur}px)`, opacity: 0, duration: it.blurSpan, ease: 'none' }, at);
      if (it.mirror) {
        tl.to(it.mirror, { '--m-band-y': `${-it.exitY}px`, duration: exit, ease: 'none' }, holdEnd);
        tl.fromTo(it.mirror, { '--m-band-fade': 1 }, { '--m-band-fade': 0, duration: it.blurSpan, ease: 'none' }, at);
      }
    }
    return () => { ScrollTrigger.removeEventListener('refreshInit', measure); track.classList.remove('is-banded', 'm-band-track'); section.classList.remove('is-banded', 'm-band'); track.style.removeProperty('--m-band-h'); track.style.removeProperty('--m-band-ink'); track.style.removeProperty('--m-band-after'); };
  });
  if (import.meta.env.DEV) {
    section.__mBand = () => ({ h: section.offsetHeight, hold, exit, release, after, top: getComputedStyle(section).top, items: list.map((it) => ({ el: it.el.className, y: gsap.getProperty(it.el, 'y'), opacity: gsap.getProperty(it.el, 'opacity') })) });
  }
}
