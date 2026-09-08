/**
 * THE GROUND-FADE GRAMMAR (mobile rebuild Part 1 D5, 2026-09-08).
 *
 * The frame marks WHERE grounds change: two gradient rectangles (light → dark
 * under the hero image and above Featured Work, --m-ground-fade-h tall) and
 * hard edges everywhere else (the dark band's end, the red band's edges).
 * One mechanism serves every later part: the page ground is a single fixed
 * layer (.m-ground); every section is transparent over it and declares its
 * ground in markup —
 *
 *   <section data-ground="dark" data-ground-fade>   a fade into this section
 *   <section data-ground="red">                    a hard edge at its top
 *
 * The layer's colour is a pure function of scroll: a transition is keyed on
 * the section's top crossing the viewport's midline — a fade scrubs across
 * --m-ground-fade-h of scroll centred on that crossing, a hard edge switches
 * at it — and every trigger reverses. Reading the colours from the tokens
 * keeps the grammar in one place.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';

const tokenColour = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** The colour the grammar expects at a scroll position — the harness reads this to check the layer. */
export function groundAt(scrollY, sections, fadePx, colours, vh) {
  let colour = colours.light;
  for (const { top, ground, fade } of sections) {
    const crossing = top - vh / 2; /* scrollY at which the section's top reaches the midline */
    if (fade) {
      const t = Math.min(1, Math.max(0, (scrollY - (crossing - fadePx / 2)) / fadePx));
      if (t <= 0) break;
      colour = t >= 1 ? colours[ground] : gsap.utils.interpolate(colour, colours[ground], t);
    } else if (scrollY >= crossing) colour = colours[ground];
    else break;
  }
  return colour;
}

export function initMobileGround() {
  return mobileMatch((ctx) => {
    const layer = document.querySelector('[data-m-ground]');
    if (!(layer instanceof HTMLElement)) return;
    const colours = { light: tokenColour('--m-color-ground'), dark: tokenColour('--m-color-ground-dark'), red: tokenColour('--m-color-ground-red') };
    const fadePx = tokenPx('--m-ground-fade-h');
    const sections = Array.from(document.querySelectorAll('[data-ground]')).filter((el) => el instanceof HTMLElement);
    /* the idempotent re-entry reset */
    gsap.set(layer, { backgroundColor: colours.light });
    let prev = 'light';
    ctx.add(() => {
      for (const sec of sections) {
        const next = sec.dataset.ground;
        if (!colours[next] || next === prev) continue;
        const from = colours[prev], to = colours[next];
        if ('groundFade' in sec.dataset) {
          gsap.fromTo(layer, { backgroundColor: from }, {
            backgroundColor: to, ease: 'none', immediateRender: false,
            scrollTrigger: { trigger: sec, start: `top center+=${fadePx / 2}`, end: `top center-=${fadePx / 2}`, scrub: true, invalidateOnRefresh: true },
          });
        } else {
          ScrollTrigger.create({
            trigger: sec, start: 'top center',
            onEnter: () => gsap.set(layer, { backgroundColor: to }),
            onLeaveBack: () => gsap.set(layer, { backgroundColor: from }),
          });
        }
        prev = next;
      }
    });
    /* the model, for the harness and DevTools */
    if (import.meta.env.DEV) {
      window.__mGround = () => ({ colours, fadePx, sections: sections.map((s) => ({ top: s.getBoundingClientRect().top + window.scrollY, ground: s.dataset.ground, fade: 'groundFade' in s.dataset })) });
    }
    return () => { if (import.meta.env.DEV) delete window.__mGround; };
  });
}
