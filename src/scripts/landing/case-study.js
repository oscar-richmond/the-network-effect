/**
 * /work/[slug] — CASE STUDY machinery.
 *
 * SCROLL: native document scroll through Lenis — the landing's
 * config VERBATIM (lerp 0.065, smoothWheel; ScrollTrigger.update on
 * scroll; own rAF). The sticky rail is native position:sticky —
 * proven under this exact Lenis by /landing's sticky stages (the
 * task's tripwire never fired: Lenis drives window scroll natively,
 * it never transforms a wrapper).
 *
 * ENTRANCES — the house vocabulary only: hero title/subtitle
 * word-reveal at load (clips are DESCENDANTS of the difference
 * elements — the blend-safe shape); hero image rise; intro
 * statement word-reveal + red-bar rise at 'top 65%' once (the
 * closing-section convention); what-we-did lines word-reveal with
 * a column stagger; stream rows rise as they enter; the rail
 * blocks settle (short rise) as each first pins (trigger at its
 * segment's pin point); MORE WORK title word-reveal + cards
 * stagger, card text word reveals riding them; footer = the shared
 * footer-motion choreography at the landing trigger. RM: no Lenis,
 * no entrances — sticky pinning REMAINS (layout, not motion).
 *
 * MORE-WORK pager: with exactly two entries the arrows are INERT
 * (disabled in markup); a functional horizontal pager arms only
 * when a study's moreWork data grows past two — the markup and
 * this module gate on that count, nothing else changes.
 *
 * Card/tile links navigate only for LIVE case-study slugs
 * (data-live), everything else stays an inert placeholder.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';

gsap.registerPlugin(ScrollTrigger);

const SCROLL_LERP = 0.065; // the landing hero's value, verbatim
const LINE_STAGGER_S = 0.12;
const COL_STAGGER_S = 0.08;

export function initCaseStudy() {
  const page = document.querySelector('[data-case-study]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Live-slug gating for the more-work cards. On the PAGE element,
     not document: it must preventDefault BEFORE page-transition's
     document-level interceptor sees the click (bubble order). */
  const onLinkClick = (e) => {
    const link = e.target instanceof Element ? e.target.closest('[data-cs-more-card]') : null;
    if (link instanceof HTMLElement && link.dataset.live !== 'true') e.preventDefault();
  };
  page.addEventListener('click', onLinkClick);
  cleanups.push(() => page.removeEventListener('click', onLinkClick));

  /* ── Lenis (non-RM): the landing boot, verbatim. */
  let lenis = null;
  if (!reduced) {
    document.documentElement.classList.add('lenis');
    lenis = new Lenis({ lerp: SCROLL_LERP, smoothWheel: true });
    lenis.on('scroll', () => ScrollTrigger.update());
    let rafId = 0;
    const raf = (time) => {
      lenis?.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);
    cleanups.push(() => {
      window.cancelAnimationFrame(rafId);
      lenis?.destroy();
      lenis = null;
      document.documentElement.classList.remove('lenis');
    });
  }

  /* Back-to-top / home (all modes — navigation, not decoration). */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  if (reduced) {
    /* RM: static page; sticky remains (it's layout). The hidden
       entrance states are gated no-preference in CSS. */
    return () => cleanups.forEach((fn) => fn());
  }

  const triggers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* Hero — word reveals at load, image rise behind. */
    const heroTitle = document.querySelector('[data-cs-hero-title]');
    const heroSub = document.querySelector('[data-cs-hero-subtitle]');
    [heroTitle, heroSub].forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      line.dataset.revealDelay = String(i * LINE_STAGGER_S);
      wrapWordRevealElement(line);
      playLineRevealElement(line);
    });
    schedule(() => {
      document.querySelector('[data-cs-hero-img]')?.classList.add('is-visible');
    }, 300);

    /* Intro statement + red bar — once, the closing convention. */
    const intro = document.querySelector('[data-cs-intro]');
    if (intro instanceof HTMLElement) {
      wrapWordRevealElement(intro);
      triggers.push(ScrollTrigger.create({
        trigger: intro,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          playLineRevealElement(intro);
          document.querySelector('[data-cs-bar]')?.classList.add('is-visible');
        },
      }));
    }

    /* What-we-did — lines word-reveal, columns staggered L->R. */
    const didLines = Array.from(document.querySelectorAll('[data-cs-did-line]'));
    didLines.forEach((line, i) => {
      if (!(line instanceof HTMLElement)) return;
      const col = Number(line.dataset.csCol ?? '-1');
      const base = col >= 0 ? 0.12 + col * COL_STAGGER_S : 0;
      wrapWordRevealElement(line, { baseDelay: base + (i % 5) * 0.04 });
    });
    const did = document.querySelector('[data-cs-did]');
    if (did) {
      triggers.push(ScrollTrigger.create({
        trigger: did,
        start: 'top 70%',
        once: true,
        onEnter: () => didLines.forEach((l) => l instanceof HTMLElement && playLineRevealElement(l)),
      }));
    }

    /* Stream rows — rise as they enter. */
    document.querySelectorAll('[data-cs-row]').forEach((row) => {
      triggers.push(ScrollTrigger.create({
        trigger: row,
        start: 'top 85%',
        once: true,
        onEnter: () => row.classList.add('is-visible'),
      }));
    });

    /* Rail blocks — settle as each first pins (its segment's top
       reaching the 120px pin line). */
    document.querySelectorAll('.cs-rail-seg').forEach((seg) => {
      const block = seg.querySelector('[data-cs-rail]');
      triggers.push(ScrollTrigger.create({
        trigger: seg,
        start: 'top 60%',
        once: true,
        onEnter: () => block?.classList.add('is-visible'),
      }));
    });

    /* More work — title reveal, cards stagger, card text rides. */
    const moreTitle = document.querySelector('[data-cs-more-title]');
    if (moreTitle instanceof HTMLElement) wrapWordRevealElement(moreTitle);
    const moreCards = Array.from(document.querySelectorAll('[data-cs-more-card]'));
    moreCards.forEach((card) => {
      card.querySelectorAll('.cs-more__cardtitle, .cs-more__carddesc').forEach((el, k) => {
        if (el instanceof HTMLElement) wrapWordRevealElement(el, { baseDelay: 0.2 + k * LINE_STAGGER_S });
      });
    });
    const more = document.querySelector('[data-cs-more]');
    if (more) {
      triggers.push(ScrollTrigger.create({
        trigger: more,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          if (moreTitle instanceof HTMLElement) playLineRevealElement(moreTitle);
          moreCards.forEach((card, i) => {
            schedule(() => {
              card.classList.add('is-visible');
              card.querySelectorAll('.cs-more__cardtitle, .cs-more__carddesc').forEach((el) => {
                if (el instanceof HTMLElement) playLineRevealElement(el);
              });
            }, 200 + i * 120);
          });
        },
      }));
    }

    /* Footer — the shared choreography at the landing trigger. */
    const footer = document.querySelector('[data-cs-footer] [data-landing-footer]');
    if (footer instanceof HTMLElement) {
      const wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: 'top 75%',
        once: true,
        onEnter: () => playFooterReveals(wrapped, schedule),
      }));
    }

    ScrollTrigger.refresh();
  });

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
  };
}
