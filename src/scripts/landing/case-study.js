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
 * MORE-WORK pager (Oscar's rev): the carousel carries EVERY /work
 * project bar the current study; the track pages one 844px card
 * per arrow press (clamped; arrows disable at the ends). Arrows
 * are the LET'S CHAT arrow and ripple with its hover vocabulary
 * (the injected char-ripple arrow animation) when active. RM:
 * instant jumps (the glide transition is no-preference-gated).
 * Focusing an off-page card resets the browser's scroll-of-
 * overflow and pages to it.
 *
 * Card/tile links navigate only for LIVE case-study slugs
 * (data-live), everything else stays an inert placeholder.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { wrapWordRevealElement, playLineRevealElement, wrapStaticLines } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { ensureLogoChars, applyNavSweep } from './nav-motion.js';

gsap.registerPlugin(ScrollTrigger);

const SCROLL_LERP = 0.065; // the landing hero's value, verbatim
const LINE_STAGGER_S = 0.12;
const COL_STAGGER_S = 0.08;
/* Bottom behaviours — the landing constants (landing-closing.js). */
const FOOTER_H_PX = 811;
const BOTTOM_SNAP_IDLE_MS = 2000;
const BOTTOM_EPSILON_PX = 2;
const NAV_SHOW_HYSTERESIS_PX = 64;

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

  /* ── MORE-WORK pager (all modes — navigation, not decoration). */
  const track = document.querySelector('[data-cs-more-track]');
  const viewport = document.querySelector('[data-cs-more-viewport]');
  const prevBtn = document.querySelector('[data-cs-pager="prev"]');
  const nextBtn = document.querySelector('[data-cs-pager="next"]');
  if (track instanceof HTMLElement && prevBtn instanceof HTMLButtonElement && nextBtn instanceof HTMLButtonElement) {
    const CARD_STEP_PX = 844; // 836 card + 8 gap
    const PER_VIEW = 2;
    const count = track.children.length;
    const maxIdx = Math.max(0, count - PER_VIEW);
    let idx = 0;
    const applyPager = () => {
      track.style.transform = `translate3d(${(-idx * CARD_STEP_PX).toFixed(0)}px, 0, 0)`;
      prevBtn.disabled = idx <= 0;
      nextBtn.disabled = idx >= maxIdx;
    };
    const page = (dir) => {
      idx = Math.min(Math.max(idx + dir, 0), maxIdx);
      applyPager();
    };
    const onPrev = () => page(-1);
    const onNext = () => page(1);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    cleanups.push(() => {
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
    });
    /* Arrow hover = the LET'S CHAT ripple (the injected char-ripple
       arrow animation replayed on the svg), active buttons only. */
    if (!reduced) {
      [prevBtn, nextBtn].forEach((btn) => {
        const svg = btn.querySelector('[data-char-ripple-arrow]');
        if (!svg) return;
        const onHover = () => {
          if (btn.disabled) return;
          svg.classList.remove('is-rippling');
          void btn.offsetWidth;
          svg.classList.add('is-rippling');
        };
        btn.addEventListener('mouseenter', onHover);
        cleanups.push(() => btn.removeEventListener('mouseenter', onHover));
      });
    }
    /* Keyboard: focusing an off-page card — undo the browser's
       overflow scroll (it fights the transform pager) and page to
       the card instead. */
    const onFocusIn = (e) => {
      if (viewport instanceof HTMLElement) viewport.scrollLeft = 0;
      const card = e.target instanceof Element ? e.target.closest('[data-cs-more-card]') : null;
      if (!(card instanceof HTMLElement)) return;
      const i = Array.from(track.children).indexOf(card);
      if (i < 0) return;
      idx = Math.min(Math.max(i - (PER_VIEW - 1), 0), maxIdx);
      if (i < idx) idx = i;
      applyPager();
    };
    track.addEventListener('focusin', onFocusIn);
    cleanups.push(() => track.removeEventListener('focusin', onFocusIn));
    applyPager();
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

  /* ── Bottom behaviours (Oscar's rev — the landing pair, every
     page): the nav ripples OUT at the very bottom and back in on
     the way up; a 2s idle stop inside the footer reveal glides to
     the bottom (non-RM). All through the shared nav-motion applier
     and Lenis — the landing-closing.js shape verbatim. */
  ensureLogoChars();
  const menuToggle = document.querySelector('[data-menu-toggle]');
  let navHidden = false;
  const setNav = (hidden) => {
    if (navHidden === hidden) return;
    /* Never strand an open menu without its toggle. */
    if (hidden && menuToggle?.getAttribute('aria-expanded') === 'true') return;
    navHidden = hidden;
    applyNavSweep(hidden, { reduced });
  };
  const maxScroll = () =>
    (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  let snapTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let lastDirDown = false;
  const inSnapZone = () => maxScroll() - (window.scrollY || 0) < FOOTER_H_PX - BOTTOM_EPSILON_PX;
  const trySnapToBottom = () => {
    if (reduced || !lastDirDown || !inSnapZone()) return;
    const y = window.scrollY || 0;
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) return;
    if (lenis) lenis.scrollTo(maxScroll(), { duration: 1.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
  };
  const onBottomScroll = () => {
    const y = window.scrollY || 0;
    if (y !== lastScrollY) {
      lastDirDown = y > lastScrollY;
      lastScrollY = y;
    }
    if (y >= maxScroll() - BOTTOM_EPSILON_PX) setNav(true);
    else if (y < maxScroll() - NAV_SHOW_HYSTERESIS_PX) setNav(false);
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnapToBottom, BOTTOM_SNAP_IDLE_MS);
  };
  window.addEventListener('scroll', onBottomScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('scroll', onBottomScroll);
    window.clearTimeout(snapTimer);
  });

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

    /* Rail blocks — settle as each first pins; once settled, the
       entrance's CSS transition is REMOVED (the house lesson: a CSS
       transition on opacity would intercept the scrubbed cover
       wipe's per-frame writes below). */
    document.querySelectorAll('.cs-rail-seg').forEach((seg) => {
      const block = seg.querySelector('[data-cs-rail]');
      triggers.push(ScrollTrigger.create({
        trigger: seg,
        start: 'top 60%',
        once: true,
        onEnter: () => {
          block?.classList.add('is-visible');
          schedule(() => {
            if (block instanceof HTMLElement) block.style.transition = 'none';
          }, 700);
        },
      }));
    });

    /* THE COVER WIPE (Oscar's rev 2 — LINE BY LINE): as KEY
       IMPACT's block rides up over the pinned OUR WORK, the
       outgoing text wipes one line at a time, BOTTOM FIRST (the
       incoming edge reaches the lower lines first), mirrored on
       reversal — the hero exit-wipe structure, scrubbed over the
       exact cover window. Lines = the label + the desc's rendered
       lines (wrapStaticLines). Each line's tween sits at its
       crossing offset within the window (blockH - lineBottom,
       scaled so the last wipe completes inside the window) —
       NUMERIC positions (the house lesson). KEEP 1944/120 in step
       with the rail geometry. */
    const seg1Block = document.querySelector('.cs-rail-seg--1 [data-cs-rail]');
    const workSec = document.querySelector('[data-cs-work]');
    if (seg1Block instanceof HTMLElement && workSec instanceof HTMLElement) {
      const WIPE_SPAN_PX = 40;
      const label = seg1Block.querySelector('.cs-rail__label');
      const desc = seg1Block.querySelector('.cs-rail__desc');
      const lines = [];
      if (label instanceof HTMLElement) lines.push(label);
      if (desc instanceof HTMLElement) lines.push(...wrapStaticLines(desc));
      const blockRect = seg1Block.getBoundingClientRect();
      const blockH = seg1Block.offsetHeight;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: workSec,
          start: () => `top+=${(1944 - 120 - blockH).toFixed(0)} top`,
          end: () => `top+=${(1944 - 120).toFixed(0)} top`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      const scale = Math.max((blockH - WIPE_SPAN_PX) / blockH, 0);
      lines.forEach((line) => {
        const b = line.getBoundingClientRect().bottom - blockRect.top;
        const pos = Math.max((blockH - b) * scale, 0); /* bottom lines first */
        tl.fromTo(line,
          { opacity: 1, filter: 'blur(0px)' },
          { opacity: 0, filter: 'blur(6px)', duration: WIPE_SPAN_PX, ease: 'none', immediateRender: false },
          pos);
      });
      cleanups.push(() => {
        tl.scrollTrigger?.kill();
        tl.kill();
      });
    }

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

    /* Footer — the shared choreography, on the LANDING'S covered-
       footer trigger maths verbatim: the footer PINS BEHIND the
       content (the parallax uncover), so a viewport-percentage
       start fires while it's still covered — fire ~200px into the
       actual reveal instead (the pin engages when the footer's flow
       top reaches 100dvh - 811 from the viewport top). The earlier
       IntersectionObserver fallback is GONE for the same reason:
       IO can't see occlusion — a pinned-behind footer intersects
       the viewport long before it's revealed, playing the entrance
       under the cover (Oscar's "no reveal effect"). */
    const footer = document.querySelector('[data-landing-footer]');
    if (footer instanceof HTMLElement) {
      const wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: () => `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`,
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
