/**
 * THE HERO'S RISE (mobile rebuild Part 2, 2026-09-08; the twirl and the
 * entrances, Oscar 2026-09-08).
 *
 * The copy and the logo row are sticky at their frame positions (hero.css);
 * the image is in flow and scrolls 1:1, so it rises up and OVER them. Each
 * block dissolves in the hero vocabulary — opacity and a blur, never a bare
 * clip — over --m-hero-text-out-px of scroll, ENDING as the image's top
 * reaches the block's top (the block is then fully covered). The windows are
 * absolute scroll positions measured from the image's rest top at refresh,
 * so they are a pure function of scroll and reverse exactly.
 *
 * THE TURN: the desktop's WebGL gallery (hero-rotating-gallery.js — the
 * Codrops rotating-gallery planes: a full turn about the vertical axis, eased
 * so ~55° shows by 12% of travel, with the per-vertex fold that bends the
 * plane as it turns) runs on the one image window, verbatim: a plane mirrors
 * the window's rect every frame, its travel is the window's rise from rest
 * to off the top, and the DOM image is hidden once the plane is ready. The
 * canvas mounts in a fixed viewport layer (.m-hero__gl); the tick pauses
 * while the hero is scrolled past. Reduced motion: the DOM image, no plane.
 *
 * THE ENTRANCES: the headline's two lines and the intro arrive on the
 * word-clip rise (reveal.js). When the splash runs it owns the headline
 * (splash.js wraps and plays it as the cover lifts); the intro then follows
 * the headline's beat, keyed on the logo row's is-entered — the same moment.
 * Without the splash both play at boot, once fonts have settled. The image
 * fade-rises as it reaches the reveal line.
 *
 * The blocks: the headline (180), the intro (399), the logo row (585). The
 * logo row sits 48 below the image, so its window is clipped at scroll 0.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mobileMatch, tokenPx } from './match.js';
import { prepareText, unwrapWords, tokenS } from './reveal.js';
import { createHeroRotatingGallery } from '../landing/hero-rotating-gallery.js';

const tokenRaw = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/* an element's document top through the offset chain — unaffected by the transforms the scrubs write */
const layoutTop = (el) => { let y = 0; for (let e = el; e instanceof HTMLElement; e = e.offsetParent) y += e.offsetTop; return y; };

export function initMobileHero() {
  return mobileMatch((ctx) => {
    const hero = document.querySelector('[data-landing-hero]');
    const img = document.querySelector('[data-hero-image-m]');
    if (!(hero instanceof HTMLElement) || !(img instanceof HTMLElement)) return;
    const win = img.querySelector('[data-hero-win-m]');
    const blocks = [
      hero.querySelector('[data-landing-hero-headline]'),
      hero.querySelector('[data-landing-hero-intro]'),
      hero.querySelector('[data-landing-hero-logos]'),
    ].filter((el) => el instanceof HTMLElement);
    /* 1:270 is one paragraph: the desktop's authored <br> (a hard line separator for its reveal wrap) becomes a space here, and comes back on revert */
    const brs = Array.from(hero.querySelectorAll('[data-landing-hero-intro-text] br'));
    const spaces = brs.map((br) => { const t = document.createTextNode(' '); br.replaceWith(t); return [br, t]; });
    const outPx = tokenPx('--m-hero-text-out-px');
    const blur = tokenPx('--m-hero-out-blur');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* the idempotent re-entry reset */
    gsap.set(blocks, { opacity: 1, filter: 'blur(0px)' });
    const imgTop = () => layoutTop(img);
    const stickyTop = (el) => parseFloat(getComputedStyle(el).top) || 0;
    /* the gallery: the window's rest top in viewport space is its document top (travel 0 at scroll 0) */
    const mount = document.querySelector('[data-hero-gl-m]');
    let gallery = null, galleryDisposed = false;
    const startGallery = () => {
      if (gallery || galleryDisposed || reduced || !(win instanceof HTMLElement) || !(mount instanceof HTMLElement)) return;
      gallery = createHeroRotatingGallery([win], { mount, minCards: 1, restTopOf: (el) => layoutTop(el) });
      gallery?.ready.then(() => { if (galleryDisposed) gallery?.destroy(); else { const im = win.querySelector('img'); if (im instanceof HTMLElement) im.style.opacity = '0'; } });
    };
    ctx.add(() => {
      for (const block of blocks) {
        const end = () => imgTop() - stickyTop(block);        /* the image's top reaches the block's top */
        const start = () => Math.max(0, end() - outPx);
        gsap.fromTo(block, { opacity: 1, filter: 'blur(0px)' }, {
          opacity: 0, filter: `blur(${blur}px)`, ease: 'none', immediateRender: false,
          scrollTrigger: { start, end, scrub: true, invalidateOnRefresh: true },
        });
      }
      /* the plane's tick pauses once the window has cleared the top (the founders cover the hero) */
      ScrollTrigger.create({ start: () => imgTop() + img.offsetHeight, end: 'max', invalidateOnRefresh: true, onEnter: () => gallery?.setPaused(true), onLeaveBack: () => gallery?.setPaused(false) });
      /* the image's arrival — the fade-rise as its top enters the viewport (at boot, on the frame's fold); the gallery takes over when it has landed */
      if (reduced) return;
      const rise = tokenPx('--m-reveal-media-rise'), dur = tokenS('--m-reveal-media-dur'), ease = tokenRaw('--m-ease-house') || 'power2.out';
      gsap.set(img, { opacity: 0, y: rise });
      ScrollTrigger.create({
        trigger: img, start: 'top 100%', once: true,
        onEnter: () => { gsap.to(img, { opacity: 1, y: 0, duration: dur, ease, overwrite: 'auto', clearProps: 'opacity,transform', onComplete: startGallery }); },
      });
      return () => { galleryDisposed = true; gallery?.destroy(); gallery = null; const im = win?.querySelector('img'); if (im instanceof HTMLElement) im.style.opacity = ''; };
    });

    /* THE COPY'S ENTRANCE — the headline when the splash is not running it, the intro always */
    const splash = document.documentElement.classList.contains('splash-active');
    const headline = splash ? [] : Array.from(hero.querySelectorAll('.landing-hero__headline-line')).filter((el) => el instanceof HTMLElement);
    const intro = Array.from(hero.querySelectorAll('[data-landing-hero-intro-text] p')).filter((el) => el instanceof HTMLElement);
    const wrapped = [];
    let disposed = false;
    if (!reduced) {
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (disposed) return;
        const line = tokenS('--m-reveal-line-stagger');
        const preps = [
          ...headline.map((el, i) => { wrapped.push(el); return prepareText(el, i * line); }),
          ...intro.map((el) => { wrapped.push(el); return prepareText(el, 2 * line); }),
        ];
        const playAll = () => { if (!disposed) preps.forEach((p) => p.play()); };
        if (!splash) { playAll(); return; }
        /* the splash's beat: the logo row's is-entered (playPageBeats) — or the cover's departure, whichever first */
        const logos = hero.querySelector('[data-landing-hero-logos]');
        let done = false;
        const once = () => { if (done) return; done = true; mo?.disconnect(); document.removeEventListener('splash:complete', once); playAll(); };
        const mo = logos instanceof HTMLElement ? new MutationObserver(() => { if (logos.classList.contains('is-entered')) once(); }) : null;
        if (logos instanceof HTMLElement) { if (logos.classList.contains('is-entered')) once(); else mo.observe(logos, { attributes: true, attributeFilter: ['class'] }); }
        document.addEventListener('splash:complete', once, { once: true });
        if (!document.documentElement.classList.contains('splash-active')) once();
        ctx.add(() => () => { mo?.disconnect(); document.removeEventListener('splash:complete', once); });
      });
    }
    return () => {
      disposed = true;
      for (const el of wrapped) unwrapWords(el);
      for (const [br, t] of spaces) t.replaceWith(br);
    };
  });
}
