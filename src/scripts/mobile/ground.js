/**
 * THE GROUND-FADE GRAMMAR (mobile rebuild Part 1 D5, 2026-09-08; the fade
 * grammar reworked for Oscar's 2026-09-08 brief: no drawn gradients — the
 * page's ground itself fades).
 *
 * The page ground is a single fixed layer (.m-ground) painted together with
 * body; every section is transparent over it and declares its ground in
 * markup. THE NAV'S INK follows the ground from here (nav.css): every colour
 * write also sets --m-nav-ink on :root to the ground's inverse — what the
 * desktop's difference blend yields against a bare ground, computed rather
 * than blended because a fixed bar's blend is not reliable on iOS.
 *
 *
 *   <section data-ground="dark">                   a HARD EDGE: the layer switches as the
 *       section's top reaches the viewport's top — for a section that follows an OPAQUE
 *       band (the footer after the painted red), so the switch is invisible
 *   <section data-ground="dark" data-ground-fade>  a FADE into this section, over
 *       --m-ground-fade-px of scroll, ENDING as the section's top reaches the viewport's
 *       bottom — the band is on its own ground before its first ink enters (the dark band
 *       after the hero; WHAT WE DO after OUR NETWORK's exit)
 *   … data-ground-fade-from="<selector>"           the fade STARTS as that element's top
 *       reaches the viewport's BOTTOM and runs its length: the element is a bare tail after an
 *       opaque pinned stage (the services and Featured Work tails), so while the colour moves
 *       the stage still covers the viewport above it and only bare ground shows beneath — the
 *       tail is at least the fade plus the reveal margin (--m-band-tail), so the next
 *       section's ink (hidden until its reveal line) enters on a settled ground
 *   … data-ground-fade-px="--token"                this fade's own length (the closing's 600)
 *   … data-ground-fade-anchor="<selector>" data-ground-fade-anchor-y="pin"
 *       the closing statement: the fade STARTS as the anchor's natural top reaches its own
 *       sticky top (the scrub runs while the text is fixed) and runs its length
 *   … data-ground-paint                            the section's own background is tweened
 *       in step with the layer (opaque from then on — its edge with the next section's own
 *       ground is a cut)
 *
 * Every colour is a pure function of scroll (scrubbed ScrollTriggers keyed on
 * in-flow elements — never on a sticky one); every trigger reverses.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';

const tokenColour = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/* an element's document top, sticky measured off */
const naturalTop = (el) => { const prev = el.style.position; el.style.position = 'static'; const t = el.getBoundingClientRect().top + window.scrollY; el.style.position = prev; return t; };
const naturalBottom = (el) => { const prev = el.style.position; el.style.position = 'static'; const b = el.getBoundingClientRect().bottom + window.scrollY; el.style.position = prev; return b; };
const FADE_MIN_PX = 120;

/** A section's fade window in document scroll, from its declaration — the one model the triggers, the sections that ride it
 *  (featured.js fades its light ink with the Featured → Access fade) and the harness share. */
export function fadeWindow(sec, fadePx = tokenPx('--m-ground-fade-px')) {
  const vh = window.innerHeight;
  const own = sec.dataset.groundFadePx ? tokenPx(sec.dataset.groundFadePx) : fadePx;
  const secTop = naturalTop(sec);
  if (sec.dataset.groundFadeAnchorY === 'pin' && sec.dataset.groundFadeAnchor) {
    const anchor = document.querySelector(sec.dataset.groundFadeAnchor);
    if (anchor instanceof HTMLElement) {
      const start = naturalTop(anchor) - (parseFloat(getComputedStyle(anchor).top) || 0);
      return { start, end: start + own };
    }
  }
  const end = secTop - vh;                          /* the section's top at the viewport's bottom */
  if (sec.dataset.groundFadeFrom) {
    const from = document.querySelector(sec.dataset.groundFadeFrom);
    if (from instanceof HTMLElement) {
      /* the tail's top at the viewport's bottom (the opaque stage above it still pinned, the ground below it darkening),
         over the fade's own length — done before the section's ink, hidden until its reveal line, enters */
      const start = Math.min(naturalTop(from) - vh, end - FADE_MIN_PX);
      return { start, end: Math.min(start + own, end) };
    }
  }
  return { start: end - own, end };
}

/** The colour the grammar expects at a scroll position — the harness reads this to check the layer. */
export function groundAt(scrollY, sections, colours) {
  let colour = colours.light;
  for (const { top, ground, fade, start, end } of sections) {
    if (fade) {
      const t = Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)));
      if (t <= 0) break;
      colour = t >= 1 ? colours[ground] : gsap.utils.interpolate(colour, colours[ground], t);
    } else if (scrollY >= top) colour = colours[ground];
    else break;
  }
  return colour;
}

export function initMobileGround() {
  return mobileMatch((ctx) => {
    const layer = document.querySelector('[data-m-ground]');
    if (!(layer instanceof HTMLElement)) return;
    const colours = { light: tokenColour('--m-color-ground'), dark: tokenColour('--m-color-ground-dark'), red: tokenColour('--m-color-ground-red') };
    const fadePx = tokenPx('--m-ground-fade-px');
    const sections = Array.from(document.querySelectorAll('[data-ground]')).filter((el) => el instanceof HTMLElement);
    /* the layer and body together (the nav's blend backdrop lives in the root layer) */
    const grounds = [layer, document.body];
    /* the nav's ink: the inverse of the ground the layer shows right now */
    const syncInk = () => {
      const m = /(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/.exec(getComputedStyle(layer).backgroundColor);
      if (m) document.documentElement.style.setProperty('--m-nav-ink', `rgb(${[m[1], m[2], m[3]].map((c) => Math.round(255 - parseFloat(c))).join(', ')})`);
    };
    const paint = (targets, colour) => { gsap.set(targets, { backgroundColor: colour }); syncInk(); };
    /* ScrollTrigger renders the scrubbed fades with events suppressed on refresh (a load mid-window, a resize), so the ink is
       resynced after every refresh as well as on the fades' own updates */
    ScrollTrigger.addEventListener('refresh', syncInk);
    /* the idempotent re-entry reset */
    paint(grounds, colours.light);
    let prev = 'light';
    ctx.add(() => {
      for (const sec of sections) {
        const next = sec.dataset.ground;
        if (!colours[next] || next === prev) continue;
        const from = colours[prev], to = colours[next];
        if ('groundFade' in sec.dataset) {
          const targets = 'groundPaint' in sec.dataset ? [...grounds, sec] : grounds;
          gsap.fromTo(targets, { backgroundColor: from }, {
            backgroundColor: to, ease: 'none', immediateRender: false, onUpdate: syncInk,
            scrollTrigger: { start: () => fadeWindow(sec, fadePx).start, end: () => fadeWindow(sec, fadePx).end, scrub: true, invalidateOnRefresh: true },
          });
        } else {
          ScrollTrigger.create({
            start: () => naturalTop(sec), end: () => naturalTop(sec) + 1, invalidateOnRefresh: true,
            onEnter: () => paint(grounds, to),
            onLeaveBack: () => paint(grounds, from),
          });
        }
        prev = next;
      }
    });
    /* the model, for the harness and DevTools */
    if (import.meta.env.DEV) {
      window.__mGround = () => ({ colours, fadePx, sections: sections.map((s) => {
        const fade = 'groundFade' in s.dataset;
        const w = fade ? fadeWindow(s, fadePx) : { start: 0, end: 0 };
        return { top: naturalTop(s), bottom: naturalBottom(s), ground: s.dataset.ground, fade, start: Math.round(w.start), end: Math.round(w.end) };
      }) });
    }
    return () => { ScrollTrigger.removeEventListener('refresh', syncInk); gsap.set(document.body, { clearProps: 'backgroundColor' }); document.documentElement.style.removeProperty('--m-nav-ink'); if (import.meta.env.DEV) delete window.__mGround; };
  });
}
