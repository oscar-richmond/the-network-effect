/**
 * THE PHONE'S GROUND — the page-level scrubbed ground fades (Oscar,
 * 2026-09-09: "the whole page ground changing colour as the user
 * scrolls — not static gradient rectangles placed in the flow").
 *
 * THE MECHANISM (ported from the rebuild's ground.js, mobile-rebuild-v2
 * 66556bf, read-only archaeology): ONE layer carries the colour — here
 * the document's own canvas (body's background-color, which the root
 * propagates behind everything) — and the sections that sit in a
 * transition zone are TRANSPARENT through it (the hero stage's ground,
 * WHO WE ARE's track and section, the services tail, FEATURED WORK's
 * whole section — landing-narrow.css), so no section edge can ever draw
 * a seam against a fading ground. Where a section keeps an opaque
 * ground (OUR NETWORK's #161616, the services stage's light), the layer
 * is switched beneath it at a scroll where the opaque section fills the
 * viewport, so the switch is never seen.
 *
 * ONE WRITER: every colour on the page ground is a pure function of
 * scrollY, computed here and written from one ScrollTrigger that spans
 * the document (onUpdate + onRefresh). The rebuild used one fromTo per
 * fade; on a refresh ScrollTrigger re-renders every scrub at its
 * progress in creation order, and two tweens on one property can then
 * disagree (the hero's "dark" end state over the services' "light"
 * start state). A single piecewise function cannot.
 *
 * THE FADES (each reported in DECISIONS.md):
 *   1 hero → WHO WE ARE   light → dark, from the headline's wipe end
 *                         (the hero's last ink is gone) to the band's
 *                         first-ink crossing (the label enters on a
 *                         settled ground) — both anchors read from the
 *                         hero driver's own beats (heroBeats()).
 *   2 OUR NETWORK → services: NO fade (Oscar's ruling — "it should just
 *                         be white; there's no background fade there").
 *                         The network is opaque dark, the services stage
 *                         opaque light; the layer switches dark → light
 *                         beneath the services stage once its top has
 *                         reached the viewport top (it fills the screen).
 *   3 AMPLIFY → FEATURED  light → dark over FADE_PX, STARTING as the
 *                         stack releases (the three panels begin to
 *                         leave). The panels' own grounds and the stage's
 *                         ride the same value, and the panels' ink drains
 *                         with it (the desktop's departure: "the ground
 *                         falls to dark while the content blurs out").
 *   4 FEATURED → ACCESS   dark → light over FADE_PX, starting as the
 *                         pinned stage releases (the travel done); the
 *                         stage's light ink and its edge veils drain with
 *                         it (--fw-ink-op).
 *
 * Phone only (isPhoneViewport); the desktop and the tablet band are
 * untouched — their grounds are their sections' own.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isPhoneViewport } from './viewport.js';
import { heroBeats } from './landing-hero-scroll.js';
import { featuredPhonePin } from './landing-featured.js';
import { servicesStackReleaseAt } from './landing-services.js';

gsap.registerPlugin(ScrollTrigger);

const LIGHT = '#eeeef0';
const DARK = '#161616';
/** the tails' fade length — the rebuild's --m-ground-fade-px */
export const GROUND_FADE_PX = 300;

export function initPhoneGround() {
  if (!isPhoneViewport()) return () => {};
  if (!document.body.classList.contains('landing-home')) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const body = document.body;
  /* the sections in the transition zones drop their own grounds only
     while this module paints (landing-narrow.css keys on the class) */
  body.classList.add('m-ground-on');
  const outro = document.querySelector('[data-landing-services]');
  const pillars = Array.from(document.querySelectorAll('[data-sreel-pillar]'));
  const featured = document.querySelector('[data-landing-featured]');
  const toDark = gsap.utils.interpolate(LIGHT, DARK); /* t 0 → light, 1 → dark */
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  /** the fades, in document order; each maps scrollY to a darkness t */
  let heroFade = null;      /* [from, to]: light → dark */
  let switchAt = Infinity;  /* dark → light (instant, hidden) */
  let servicesFade = null;  /* [from, to]: light → dark */
  let featuredFade = null;  /* [from, to]: dark → light */
  let lastReport = null;

  const measure = () => {
    const sy = window.scrollY || 0;
    const docTop = (el) => el.getBoundingClientRect().top + sy;

    const hb = heroBeats();
    heroFade = hb ? [hb.wipeEndAt, Math.max(hb.firstInkAt, hb.wipeEndAt + 1)] : null;

    switchAt = outro instanceof HTMLElement ? docTop(outro) : Infinity;

    /* the stack's release: the last panel is pushed when the stage's
       bottom reaches its parked bottom (its park top + its height) —
       landing-services.js's one derivation (FEATURED WORK's arrival is
       anchored on the same stack, F1) */
    const releaseAt = servicesStackReleaseAt();
    servicesFade = releaseAt !== null ? [releaseAt, releaseAt + GROUND_FADE_PX] : null;

    const fp = featuredPhonePin();
    featuredFade = fp ? [fp.releaseAt, fp.releaseAt + GROUND_FADE_PX] : null;

    lastReport = { heroFade, switchAt, servicesFade, featuredFade };
  };

  const t01 = (range, y) => (range ? clamp01((y - range[0]) / (range[1] - range[0])) : 0);

  let lastKey = '';
  const paint = () => {
    const y = window.scrollY || 0;
    const s = t01(servicesFade, y);
    const f = t01(featuredFade, y);
    /* the ground's darkness, piecewise in document order: the hero's
       fade until the hidden switch beneath the services stage, then the
       two tail fades (each complete before the next begins) */
    const t = y < switchAt ? (heroFade ? t01(heroFade, y) : 0) : s * (1 - f);
    const key = `${t.toFixed(3)}|${s.toFixed(3)}|${f.toFixed(3)}`;
    if (key === lastKey) return;
    lastKey = key;
    const colour = toDark(t);
    body.style.backgroundColor = colour;
    /* the services stage and its panels ride the same value; their ink
       drains over the same window (opacity on the panels' children —
       the panel itself must stay opaque for the sticky occlusion) */
    if (outro instanceof HTMLElement) outro.style.backgroundColor = toDark(s);
    pillars.forEach((p) => {
      const g = toDark(s);
      p.style.backgroundColor = g;
      p.style.setProperty('--sv-ground', g); /* the list rail's edge veils */
      p.style.setProperty('--sv-ink-op', (1 - s).toFixed(3));
      /* D4: the fade's own progress, for MORE INFO and the rail indicator's
         blur-out (landing-narrow.css) — one value, so they cannot desync */
      p.style.setProperty('--sv-fade-p', s.toFixed(3));
    });
    if (featured instanceof HTMLElement) featured.style.setProperty('--fw-ink-op', (1 - f).toFixed(3));
  };

  const trigger = ScrollTrigger.create({
    trigger: body,
    start: 0,
    end: 'max',
    onRefresh: () => { measure(); lastKey = ''; paint(); },
    onUpdate: paint,
  });
  measure();
  paint();

  if (import.meta.env.DEV) {
    window.__mGround = { report: () => lastReport, measure, paint };
  }

  return () => {
    trigger.kill();
    body.classList.remove('m-ground-on');
    body.style.backgroundColor = '';
    if (outro instanceof HTMLElement) outro.style.backgroundColor = '';
    pillars.forEach((p) => { p.style.backgroundColor = ''; p.style.removeProperty('--sv-ink-op'); p.style.removeProperty('--sv-ground'); p.style.removeProperty('--sv-fade-p'); });
    if (featured instanceof HTMLElement) featured.style.removeProperty('--fw-ink-op');
  };
}
