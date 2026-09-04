/**
 * /contact — page driver + the SCHEDULE A CALL modal.
 *
 * SCROLL: the shared house boot (site-scroll.js).
 *
 * MODAL: the case-study lightbox machinery reused — [hidden] flip
 * with a reflow before is-open (transitions from the committed
 * hidden state), own-property backdrop fade, Lenis stop/start +
 * body overflow lock, Esc close, focus to CLOSE on open and back
 * to the trigger on close — plus a Tab loop across the modal's
 * focusables INCLUDING the logo twin (z-order puts the real nav
 * behind the overlay; the twin is the one reachable nav surface).
 *
 * CAL.COM: nothing loads at page load. On FIRST open only: if
 * CAL_BOOKING_LINK is configured, the official embed script is
 * injected and an inline embed mounts into the window; if it is
 * empty (no account yet) the quiet fallback shows instead — no
 * cal.com request is ever made. Script failure also falls back.
 *
 * RM: instant open/close (CSS kills the transitions), backdrop
 * still blocks, all keyboard paths intact.
 */

import { initSiteScroll, getLenisInstance } from './site-scroll.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';
import { wrapFooterReveals, playFooterReveals } from './footer-motion.js';
import { bindBottomNavSweep } from './nav-motion.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CAL_BOOKING_LINK } from '../../data/landing/contact.js';
import { isMobileViewport } from './viewport.js';

gsap.registerPlugin(ScrollTrigger);

/* Bottom behaviours — the landing constants. */
const FOOTER_H_PX = 830; /* frame 13:381 (was 811) */

const CAL_EMBED_SRC = 'https://app.cal.com/embed/embed.js';

export function initContactPage() {
  const page = document.querySelector('[data-contact]');
  if (!(page instanceof HTMLElement)) return () => {};

  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(setTimeout(fn, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Scroll: the shared house boot (non-RM). */
  if (!reduced) cleanups.push(initSiteScroll());
  const lenis = { get i() { return getLenisInstance(); } };

  /* ── THE MODAL ─────────────────────────────────────────────── */
  const modal = document.querySelector('[data-ct-modal]');
  const backdrop = document.querySelector('[data-ct-backdrop]');
  const calHost = document.querySelector('[data-ct-cal]');
  const fallback = document.querySelector('[data-ct-fallback]');
  const closeBtn = document.querySelector('[data-ct-close]');
  const logoTwin = document.querySelector('[data-ct-logo]');
  const openBtn = document.querySelector('[data-ct-open]');

  let modalOpen = false;
  let opener = null;
  let calMounted = false;

  /* Centre the logo twin by measured margin (the gallery-cursor
     pattern — content-sized hit area, no transform on a blend
     root). Measured hidden-safe: the twin is display:flex even
     while [hidden]? No — [hidden] is display:none, so measure on
     first open instead (fonts settled by then). */
  let twinCentred = false;
  const centreTwin = () => {
    if (twinCentred || !(logoTwin instanceof HTMLElement)) return;
    twinCentred = true;
    /* NAV RESPEC (2026-08-24): the desktop wordmark is
       "TheNetworkEffect" at left 24 (contact.css) — no centring
       margin. Mobile keeps the shipped centred twin unchanged. */
    if (!isMobileViewport()) {
      logoTwin.textContent = 'TheNetworkEffect';
      return;
    }
    logoTwin.style.marginLeft = `${(-logoTwin.offsetWidth / 2).toFixed(1)}px`;
  };

  /* cal.com — first-open lazy mount (see header). */
  const mountCal = () => {
    if (calMounted) return;
    calMounted = true;
    if (!CAL_BOOKING_LINK) {
      /* No account yet (the config sentinel): quiet fallback, zero
         cal.com network. */
      if (fallback instanceof HTMLElement) fallback.hidden = false;
      return;
    }
    try {
      /* The official embed snippet (their documented loader),
         injected on demand. */
      (function calLoader(C, A, L) {
        const p = (a, ar) => { a.q.push(ar); };
        const d = C.document;
        C.Cal = C.Cal || function calFn() {
          const cal = C.Cal; const ar = arguments;
          if (!cal.loaded) {
            cal.ns = {}; cal.q = cal.q || [];
            const s = d.createElement('script');
            s.src = A;
            s.onerror = () => { if (fallback instanceof HTMLElement) fallback.hidden = false; };
            d.head.appendChild(s);
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api = function apiFn() { p(api, arguments); };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === 'string') { cal.ns[namespace] = api; p(api, ar); } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
      }(window, CAL_EMBED_SRC, 'init'));
      window.Cal('init', { origin: 'https://cal.com' });
      window.Cal('inline', {
        elementOrSelector: '[data-ct-cal]',
        calLink: CAL_BOOKING_LINK,
        config: { theme: 'light' },
      });
    } catch {
      if (fallback instanceof HTMLElement) fallback.hidden = false;
    }
  };

  /* Focus trap — Tab loops across the modal's focusables + the
     logo twin (the one visible nav surface while open). */
  const trapFocusables = () => {
    const inModal = modal instanceof HTMLElement
      ? Array.from(modal.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])'))
      : [];
    const list = [...inModal, logoTwin].filter(
      (el) => (el instanceof HTMLElement) && !el.hidden && el.offsetParent !== undefined,
    );
    return list;
  };
  const onTrapKey = (e) => {
    if (!modalOpen || e.key !== 'Tab') return;
    const list = trapFocusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!list.includes(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  const openModal = (triggerEl) => {
    if (modalOpen || !(modal instanceof HTMLElement)) return;
    modalOpen = true;
    opener = triggerEl ?? null;
    /* R40: the START A PROJECT modal is a sibling — one open at a time */
    document.dispatchEvent(new CustomEvent('ne:modal-open', { detail: 'schedule' }));
    mountCal();
    lenis.i?.stop();
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    if (logoTwin instanceof HTMLElement) logoTwin.hidden = false;
    centreTwin(); /* first open: laid out now, fonts long settled */
    /* Commit the hidden state, THEN frost in (the lightbox flip). */
    void modal.offsetWidth;
    modal.classList.add('is-open');
    logoTwin?.classList.add('is-open');
    if (closeBtn instanceof HTMLElement) closeBtn.focus();
  };

  const closeModal = ({ silent = false } = {}) => {
    if (!modalOpen || !(modal instanceof HTMLElement)) return;
    modalOpen = false;
    /* R40: a close forced by a SIBLING modal opening must not return
       focus — the sibling owns focus now (a late refocus would pull it
       out of the open modal). */
    if (silent) opener = null;
    modal.classList.remove('is-open');
    logoTwin?.classList.remove('is-open');
    const finish = () => {
      modal.hidden = true;
      if (logoTwin instanceof HTMLElement) logoTwin.hidden = true;
      document.body.style.overflow = '';
      lenis.i?.start();
      if (opener instanceof HTMLElement) opener.focus();
      opener = null;
    };
    if (reduced) finish();
    else schedule(finish, 620); /* the frost-out's 0.6s (rev 2) */
  };

  if (openBtn instanceof HTMLElement) {
    const onOpen = () => openModal(openBtn);
    openBtn.addEventListener('click', onOpen);
    cleanups.push(() => openBtn.removeEventListener('click', onOpen));
  }
  if (closeBtn instanceof HTMLElement) {
    const onCloseClick = () => closeModal();
    closeBtn.addEventListener('click', onCloseClick);
    cleanups.push(() => closeBtn.removeEventListener('click', onCloseClick));
  }
  if (backdrop instanceof HTMLElement) {
    const onBackdropClick = () => closeModal();
    backdrop.addEventListener('click', onBackdropClick);
    cleanups.push(() => backdrop.removeEventListener('click', onBackdropClick));
  }
  const onKey = (e) => {
    if (!modalOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onTrapKey);
  const onSiblingOpen = (e) => { if (e.detail !== 'schedule') closeModal({ silent: true }); };
  document.addEventListener('ne:modal-open', onSiblingOpen);
  cleanups.push(() => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keydown', onTrapKey);
    document.removeEventListener('ne:modal-open', onSiblingOpen);
    document.body.style.overflow = '';
  });

  /* ── EMAIL click-to-copy — the HOLDING page's contact UX ported
     (the source pattern is holding-deck-form.js's
     initHoldingContactCopy; the holding files are untouched): the
     click COPIES the address, confirms via the cursor-bound pill
     (keyboard anchors under the link; mobile centres below it;
     the aria announcer mirrors for AT), and the mailto STILL
     fires — most visitors have no desktop mail client (Oscar's
     report: a bare mailto is a silent no-op), the copy is what
     actually helps; mailto never unloads the page, so the pill
     survives it. Same constants as the holding implementation. */
  const COPY_RESET_MS = 2600;
  const TIP_OFFSET_X = 14;
  const TIP_OFFSET_Y = 18;
  const TIP_FADE_OUT_MS = 220;
  const MOBILE_TIP_GAP = 24;
  const copyLinks = Array.from(document.querySelectorAll('[data-ct-copy]'));
  const copyTip = document.querySelector('[data-ct-copy-tip]');
  const copyAnnouncer = document.querySelector('[data-ct-copy-announcer]');
  if (copyLinks.length && copyTip instanceof HTMLElement) {
    let hideTimer = 0;
    let removeTimer = 0;
    let tracking = false;
    const copyAnnounce = (text) => {
      if (copyAnnouncer instanceof HTMLElement) copyAnnouncer.textContent = text;
    };
    const place = (x, y) => {
      copyTip.style.transform = `translate3d(${x + TIP_OFFSET_X}px, ${y + TIP_OFFSET_Y}px, 0)`;
    };
    const onMove = (event) => place(event.clientX, event.clientY);
    const stopTracking = () => {
      if (tracking) {
        window.removeEventListener('mousemove', onMove);
        tracking = false;
      }
    };
    const hideTip = () => {
      stopTracking();
      copyAnnounce('');
      copyTip.classList.remove('is-in');
      removeTimer = window.setTimeout(() => { copyTip.hidden = true; }, TIP_FADE_OUT_MS);
    };
    const isMobile = () => window.matchMedia('(max-width: 1024px)').matches;
    const showTip = (link, x, y) => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      copyTip.hidden = false;
      if (isMobile()) {
        const rect = link.getBoundingClientRect();
        const tipW = copyTip.offsetWidth;
        const cx = Math.min(
          Math.max(rect.left + rect.width / 2 - tipW / 2, 8),
          window.innerWidth - tipW - 8,
        );
        copyTip.style.transform = `translate3d(${cx}px, ${rect.bottom + MOBILE_TIP_GAP}px, 0)`;
      } else {
        place(x, y);
      }
      void copyTip.offsetWidth;
      copyTip.classList.add('is-in');
      if (!isMobile() && !tracking) {
        window.addEventListener('mousemove', onMove);
        tracking = true;
      }
      hideTimer = window.setTimeout(hideTip, COPY_RESET_MS);
    };
    copyLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const email = link.dataset.contactEmail;
      if (!email) return;
      const onCopyClick = (event) => {
        event.preventDefault();
        const rect = link.getBoundingClientRect();
        const hasPointer = event.clientX !== 0 || event.clientY !== 0;
        const x = hasPointer ? event.clientX : rect.left;
        const y = hasPointer ? event.clientY : rect.bottom;
        const copy = navigator.clipboard
          ? navigator.clipboard
              .writeText(email)
              .then(() => {
                showTip(link, x, y);
                copyAnnounce('Email copied');
              })
              .catch(() => {
                /* Clipboard blocked (rare) — the mailto below still
                   fires as the fallback. */
              })
          : Promise.resolve();
        copy.finally(() => {
          window.location.href = link.href;
        });
      };
      link.addEventListener('click', onCopyClick);
      cleanups.push(() => link.removeEventListener('click', onCopyClick));
    });
    cleanups.push(() => {
      stopTracking();
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    });
  }

  /* ── Back-to-top / home (the shared footer contract). */
  const topLinks = Array.from(document.querySelectorAll('[data-footer-top]'));
  const onTopClick = (e) => {
    const el = e.currentTarget;
    if (el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('/')) return;
    e.preventDefault();
    if (lenis.i) lenis.i.scrollTo(0, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  topLinks.forEach((el) => el.addEventListener('click', onTopClick));
  cleanups.push(() => topLinks.forEach((el) => el.removeEventListener('click', onTopClick)));

  /* ── Bottom behaviours — the landing pair, verbatim. */
  /* R36 (Oscar, 2026-09-04): the SHARED bottom binder (nav-motion.js)
     — sweep, hysteresis and the idle snap inside the footer's height,
     one implementation on every document-scroll page. */
  cleanups.push(bindBottomNavSweep({ reduced, getLenis: () => lenis.i }));

  if (reduced) {
    return () => cleanups.forEach((fn) => fn());
  }

  const triggers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;

    /* Intro — word reveal at load (the hero convention). */
    const intro = document.querySelector('[data-ct-intro]');
    if (intro instanceof HTMLElement) {
      wrapWordRevealElement(intro);
      playLineRevealElement(intro);
    }

    /* CTAs — the pills' staggered fade, after the intro's beat; the
       social chips (51:2862) join the same wave as beats 4 and 5. */
    const ctas = Array.from(document.querySelectorAll('.ct-cta, .ct-social'));
    ctas.forEach((cta, i) => {
      schedule(() => cta.classList.add('is-visible'), 300 + i * 60);
    });

    /* Media (the hero video) — blur/fade at the hero-image beat. */
    schedule(() => {
      document.querySelector('[data-ct-media]')?.classList.add('is-visible');
    }, 300);

    /* Footer — the covered-trigger reveal maths, verbatim. */
    const footer = document.querySelector('[data-landing-footer]');
    if (footer instanceof HTMLElement) {
      const wrapped = wrapFooterReveals(footer);
      triggers.push(ScrollTrigger.create({
        trigger: footer,
        start: () => (isMobileViewport()
          ? 'top 85%' /* mobile plain-flow footer — the desktop pin formula can never fire (landing-closing lesson) */
          : `top ${(window.innerHeight - FOOTER_H_PX - 200).toFixed(0)}px`),
        once: true,
        onEnter: () => playFooterReveals(wrapped, schedule),
      }));
    }

    ScrollTrigger.refresh();
  });

  if (import.meta.env.DEV) {
    window.__contact = {
      gsap,
      ScrollTrigger,
      get lenis() { return getLenisInstance(); },
      openModal,
      closeModal,
    };
  }

  return () => {
    disposed = true;
    timeouts.forEach(clearTimeout);
    triggers.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
  };
}
