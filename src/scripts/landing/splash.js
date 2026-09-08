/**
 * SPLASH / ENTRY SEQUENCE (/landing, first visit only).
 *
 * ORDER: black cover from FIRST PAINT (the component's inline
 * critical CSS — never a flash of the page beneath) -> the wordmark
 * ripples in at 24px white, centred -> a 1px line sweeps the
 * viewport bottom while the page actually loads -> at full right the
 * logo travels onto the REAL nav logo and cross-resolves into it ->
 * the cover slides out downward -> the page's own entrance plays.
 *
 * READINESS is real, not a timer: fonts.ready + the hero video
 * reaching canplaythrough (readyState >= 3) + every hero <img>
 * decoded + a double-rAF paint. Floored by MIN_MS so a warm cache
 * still reads as a deliberate beat, and raced against MAX_MS so a
 * stalled signal can never strand anyone on black.
 *
 * LOGO HANDOFF is a TWO-INSTANCE CROSS-RESOLVE (the services-title
 * morph precedent), not a scale-morph: a 24px white element cannot
 * interpolate into a 12px difference-blended one — the blend mode
 * is not animatable and the scaled text would go soft. The splash
 * instance travels/scales onto the nav instance's measured box and
 * blur-fades out; the REAL nav logo renders at its native size the
 * whole time and simply fades up. The nav logo is the genuine live
 * element — nothing is copied or left in place.
 *
 * OWNERSHIP: the splash owns the initial load, the page-transition
 * wipe owns navigation. They can never both run — the wipe only
 * holds when its own sessionStorage flag is set (internal nav), and
 * that same nav sets the splash's seen-flag. The hold attribute is
 * also checked directly as a belt.
 */

import { ensureLogoChars, sweepUnits, NAV_CHAR_STAGGER_S, ensureNavLinkChars } from './nav-motion.js';
import { isMobileViewport } from './viewport.js';
import { wrapWordRevealElement, playLineRevealElement } from '../line-reveal.js';

/* ── The register (every duration a named constant). */
const MIN_MS = 1200;        // floor, so a warm cache still reads as a beat
const MAX_MS = 4000;        // failsafe — proceed regardless past this
import { HERO_ENTRY, HERO_ENTRY_SPLASH } from '../../data/flags.js';

const LOGO_RIPPLE_AT_MS = 120;  // wordmark ripple starts
const LINE_START_AT_MS = 420;   // the loading line begins after the ripple
const LINE_SETTLE_MS = 420;     // the eased run-in to 100% when ready
const HANDOFF_MS = 700;         // logo travel + cross-resolve
const LINE_FADE_OUT_MS = 180;   // the finished line clears BEFORE any
                                // exit motion (Oscar 2026-08-27: it was
                                // riding the cover's sweep, reading
                                // wrong over dark grounds)
const COVER_EXIT_MS = 800;      // the black slides out downward
const PAGE_ENTRANCE_LEAD_MS = 120; // page beats start as the cover leaves
const NAV_AFTER_LOGO_MS = 200;  // MENU + LET'S CHAT follow the landed logo
/* R8: the cards' entrance length (0.9s transform + the 0.2s third-card
   delay) — the hero module's WebGL takeover waits for this event. */
const CARDS_ENTERED_MS = 1150;
const EASE = 'cubic-bezier(0.66, 0, 0.34, 1)';

const SEEN_KEY = 'ne-splash-seen';
/* R47: the entry rides THIS key — it plays when the splash plays
   (first visit per tab), and `?entry=1` / `?entry=0` force it either
   way independently of `?splash`. */

/** Should this load show the splash? `?splash=1` forces, `?splash=0` suppresses. */
export function splashWanted() {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('splash');
  if (forced === '1') return true;
  if (forced === '0') return false;
  /* The wipe is mid-handoff from an internal navigation — it owns
     this load, never both. */
  if (document.documentElement.getAttribute('data-ne-cover') === 'hold') return false;
  try {
    return !sessionStorage.getItem(SEEN_KEY);
  } catch {
    return true; /* private browsing: show it, never strand */
  }
}

export function markSplashSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch { /* ignore */ }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * The readiness signal — see the header. Resolves when the page is
 * genuinely ready, or at MAX_MS, whichever comes first.
 */
function readiness(root) {
  const fonts = document.fonts?.ready ?? Promise.resolve();


  /* R8 (Oscar 2026-09-02): readiness gates on the three hero CARD
     images decoding. The rebuild (2026-09-07): the cards are the hero at
     every width now, so the narrow build gates on them too (the mobile
     pass's video gate went with the video). */
  /* R14: the logo row's SVGs (eager, a few KB each) are NOT part of
     the gate — a late mark is invisible under the row's own entrance,
     and first paint must never wait on nine extra requests. */
  const heroImgs = Array.from(document.querySelectorAll('.landing-hero img')).filter(
    (img) => !img.closest('[data-landing-hero-logos]'),
  );
  const imgsReady = Promise.all(
    heroImgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())),
  );

  return Promise.all([fonts, imgsReady]).then(raf2);
}

/**
 * Build per-character units inside `el` and ripple them in with the
 * nav's own utility classes/stagger — the same left-to-right
 * blur-ripple, not a second implementation.
 */
function rippleIn(el, reduced) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.querySelector('.cr-char')) {
    const text = el.textContent ?? '';
    el.textContent = '';
    Array.from(text).forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'cr-char';
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
    });
  }
  const units = Array.from(el.querySelectorAll('.cr-char'));
  /* Only NOW is the wordmark allowed to be visible: the head CSS
     keeps it visibility:hidden until this class lands, so the raw
     text can never paint before its characters exist (Oscar's
     report: logo appeared, vanished, then animated). */
  el.classList.add('is-ready');
  if (reduced) {
    units.forEach((u) => { u.style.opacity = '1'; });
    return;
  }
  units.forEach((u, i) => {
    u.classList.remove('nav-char-in');
    void u.offsetWidth;
    u.style.animationDelay = `${(i * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
    u.classList.add('nav-char-in');
  });
}

/**
 * @param {HTMLElement} root the splash element
 */
export function initSplash(root) {
  if (!(root instanceof HTMLElement)) return () => {};
  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* The logo is a top-level SIBLING of the cover (see the component's
     blend walk) — query the document, not the root. */
  const logo = document.querySelector('[data-splash-logo]');
  const line = root.querySelector('[data-splash-line]');
  const navLogo = document.querySelector('.home__logo');
  /* The hero headline's founders-style entrance (Oscar's rev 3):
     the two lines get the word-clip rise at the founders' 0.12s
     line stagger. Wrapped after fonts settle (readiness), played as
     the cover lifts. */
  const HEADLINE_LINE_STAGGER_S = 0.12;
  const headlineLines = Array.from(
    document.querySelectorAll('[data-landing-hero-headline] .landing-hero__headline-line'),
  );

  let disposed = false;
  let cleanupHeroEntry = null;
  const timers = [];
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));

  html.classList.add('splash-active');
  html.setAttribute('aria-busy', 'true');
  /* Scroll starts and stays at the top while the cover is up. */
  window.scrollTo(0, 0);

  /* The page's own entrance beats, re-anchored here (they used to
     self-start on fonts.ready): the hero video settles, the headline
     arrives, and the nav ripples in AFTER the logo has landed.
     R47: when the HERO ENTRY ANIMATION is on (dev only), these beats
     do not run as the cover lifts — the entry owns the screen first
     (its red ground, the six-image pile, the sort into the row) and
     these play at its landing, unchanged. The splash itself is
     untouched either way: the cover, the loading line and the logo's
     travel and handoff into the nav all run exactly as they do now,
     so the handoff stays pixel-exact. */
  const playPageBeats = () => {
    const video = document.querySelector('[data-landing-hero-video]');
    if (video instanceof HTMLElement) video.classList.add('is-entered');
    /* R8: the desktop cards' fade+rise (landing.css states); the hero
       module hands the cards to WebGL only once this has played —
       the DOM cards carry the entrance, the planes carry the exit. */
    /* R14: the logo row joins the same entrance — its CSS carries the
       beat (a step after the intro) and the fade+rise. */
    const logos = document.querySelector('[data-landing-hero-logos]');
    if (logos instanceof HTMLElement) logos.classList.add('is-entered');
    const cards = document.querySelector('[data-landing-hero-cards]');
    if (cards instanceof HTMLElement) {
      cards.classList.add('is-entered');
      timers.push(setTimeout(() => {
        document.dispatchEvent(new CustomEvent('landing-hero:cards-entered'));
      }, CARDS_ENTERED_MS));
    }
    /* Headline: the founders bio treatment — play the wrapped clips
       (wrapped in the main flow once fonts were ready). */
    headlineLines.forEach((el) => {
      if (el instanceof HTMLElement) playLineRevealElement(el);
    });
    /* R7 (Oscar, 2026-09-02): the hero INTRO rides the same entrance
       a slight beat behind the headline — its paragraphs were wrapped
       by the hero module (fonts-gated, under the cover) with a reveal
       delay of the headline's stagger + INTRO_AFTER_HEADLINE_S, so
       playing them here lands them just after the second line. */
    document.querySelectorAll('[data-landing-hero-intro-text] p').forEach((p) => {
      if (p instanceof HTMLElement) playLineRevealElement(p);
    });
    timers.push(setTimeout(() => {
      if (disposed) return;
      /* MENU and LET'S CHAT only — the LOGO has already arrived via
         the handoff and must not re-ripple, which is why this uses
         the sweep units directly rather than applyNavSweep (that
         would sweep all three parts). */
      [
        document.querySelector('[data-menu-label-menu]'),
        ...document.querySelectorAll('.home__nav-link'),
        document.querySelector('.home__topbar-email'),
      ].forEach((part) => {
        if (!(part instanceof HTMLElement)) return;
        part.style.opacity = '';
        part.style.pointerEvents = '';
        const units = sweepUnits(part);
        units.forEach((u, i) => {
          if (reduced) { u.style.opacity = ''; return; }
          u.classList.remove('nav-char-out', 'nav-char-in');
          void u.offsetWidth;
          u.style.animationDelay = `${(i * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
          u.classList.add('nav-char-in');
        });
      });
    }, reduced ? 0 : NAV_AFTER_LOGO_MS));
  };

  /* R47 — THE SEAM WITH THE ENTRY ANIMATION. Recommended and built:
     the entry runs AFTER the splash clears, in place of the page's
     entrance beat, not instead of the splash's reveal. The splash
     keeps its whole sequence — cover, loading line, the wordmark's
     travel and the atomic handoff into the nav (untouched, so it
     stays pixel-exact) — and the cover lifts onto the entry's red
     ground instead of onto the settled hero. The beats above then run
     at the sort's landing, in their normal order. Off (any build, RM,
     ?entry=0, or a load without the flag) this is a straight call and
     the page behaves exactly as it does today. */
  /* R48 — THE BLACK SPLASH, HIDDEN (not deleted). With the entry on
     and HERO_ENTRY_SPLASH off, the cover, the wordmark's ripple across
     it, the loading line and the logo's TRAVEL are all skipped: the
     page lands straight on the red ground (painted pre-paint by
     BaseLayout's inline gate) and the entry starts. Every line of that
     sequence is still here and comes back with the flag.
     THE NAV, which the travel used to place: with no travel there is
     no handoff, so the nav ARRIVES ON ITS OWN — the wordmark included
     — with the established char ripple (the same sweep units and
     stagger playPageBeats uses for MENU and LET'S CHAT; it excludes
     the logo only because the travel had already delivered it). */
  /* the dev-only hero entry is desktop DOM (the phone's gate removes its stage), so below the seam the cover splash runs as it does in production (mobile rebuild Part 3 §6) */
  const coverHidden = HERO_ENTRY && !HERO_ENTRY_SPLASH && !isMobileViewport();
  const rippleNavIn = () => {
    ensureLogoChars();
    const parts = [
      navLogo,
      document.querySelector('[data-menu-label-menu]'),
      ...document.querySelectorAll('.home__nav-link'),
      document.querySelector('.home__topbar-email'),
    ];
    parts.forEach((part) => {
      if (!(part instanceof HTMLElement)) return;
      part.style.opacity = '';
      part.style.pointerEvents = '';
      const units = sweepUnits(part);
      units.forEach((u, i) => {
        if (reduced) { u.style.opacity = ''; return; }
        u.classList.remove('nav-char-out', 'nav-char-in');
        void u.offsetWidth;
        u.style.animationDelay = `${(i * NAV_CHAR_STAGGER_S).toFixed(2)}s`;
        u.classList.add('nav-char-in');
      });
    });
  };

  const playPageEntrance = () => {
    /* Flag off (every build), reduced motion, `?entry=0`, or no entry
       markup: this is a straight synchronous call and the page behaves
       exactly as it does today. HERO_ENTRY is a build-time constant, so
       with it false the whole branch below — and the dynamic import
       with it — is dead code and never reaches the bundle. */
    if (!HERO_ENTRY || reduced) { playPageBeats(); return; }
    if (new URLSearchParams(window.location.search).get('entry') === '0') { playPageBeats(); return; }
    /* (`?entry=1` forces from the OTHER side — heroEntryWanted() below
       makes this load take the splash's slot even on a return visit.) */
    if (!document.querySelector('[data-he-stage]')) { playPageBeats(); return; }
    import('./hero-entry.js')
      .then(({ initHeroEntry }) => { if (!disposed) cleanupHeroEntry = initHeroEntry({ onSettled: playPageBeats }); else playPageBeats(); })
      .catch(() => playPageBeats());
  };

  const finish = () => {
    if (disposed) return;
    html.classList.remove('splash-active');
    html.removeAttribute('aria-busy');
    /* THE SWAP — atomic, same synchronous block: the real nav logo
       becomes visible as the twin leaves, so the two difference
       layers never composite on top of each other (stacked
       difference would re-lighten the glyphs) and there is no
       frame with neither. Endpoints are pixel-matched, so nothing
       moves. */
    if (navLogo instanceof HTMLElement) {
      navLogo.style.transition = '';
      navLogo.style.opacity = '';
    }
    if (logo instanceof HTMLElement) logo.remove();
    root.remove();
    markSplashSeen();
    document.dispatchEvent(new CustomEvent('splash:complete'));
  };

  /* ── R48: THE COVER-HIDDEN PATH — straight onto the red. No cover,
     no ripple across it, no loading line, no travel: the nav arrives
     on its own ripple, the splash's chrome is cleared in the same
     frame, and the entry takes the screen. Reduced motion below still
     wins (it returns before this) so RM never sees red. */
  if (coverHidden && !reduced) {
    ensureLogoChars();
    if (logo instanceof HTMLElement) logo.remove();
    if (line instanceof HTMLElement) line.remove();
    /* AFTER the boot chain: index.astro calls initNavEntrance() after
       initSplash(), and that zeroes every nav part's opacity before
       bowing out to the splash — a ripple fired synchronously here
       would be wiped by it a moment later (measured: the wordmark
       stayed at opacity 0 for the life of the page). One frame's
       deferral puts the ripple after the whole boot. */
    requestAnimationFrame(() => { if (!disposed) rippleNavIn(); });
    playPageEntrance();
    finish();
    return () => { disposed = true; timers.forEach(clearTimeout); cleanupHeroEntry?.(); };
  }

  /* ── REDUCED MOTION: a brief opaque beat, then straight through.
     Never a naked unstyled load, never a ripple/sweep/travel. */
  if (reduced) {
    ensureLogoChars();
    if (logo instanceof HTMLElement) logo.classList.add('is-ready');
    (async () => {
      await Promise.race([readiness(root), delay(MAX_MS)]);
      if (disposed) return;
      root.style.transition = 'none';
      root.style.opacity = '0';
      /* R47: reduced motion never runs the entry — the hero is present
         immediately on its normal ground. */
      playPageBeats();
      finish();
    })();
    return () => { disposed = true; timers.forEach(clearTimeout); cleanupHeroEntry?.(); };
  }

  (async () => {
    const t0 = performance.now();

    /* 1 — the wordmark ripples in (the nav's own utility). */
    await wait(LOGO_RIPPLE_AT_MS);
    if (disposed) return;
    rippleIn(logo, false);

    /* 2 — the line sweeps while the page really loads. It runs to
       85% on a long ramp; readiness (or the failsafe) eases the
       remaining 15% home, so it never snaps from part-way to full. */
    await wait(LINE_START_AT_MS - LOGO_RIPPLE_AT_MS);
    if (disposed) return;
    if (line instanceof HTMLElement) {
      line.style.transition = `transform ${(MAX_MS - LINE_START_AT_MS) / 1000}s linear`;
      line.style.transform = 'scaleX(0.85)';
    }

    await Promise.race([readiness(root), delay(MAX_MS)]);
    if (disposed) return;
    /* Fonts are settled (or the failsafe fired) — wrap the headline
       lines for their founders-style clip rise. Under the opaque
       cover, so the restructure can never be seen happening. */
    headlineLines.forEach((el, i) => {
      if (!(el instanceof HTMLElement)) return;
      el.dataset.revealDelay = String(i * HEADLINE_LINE_STAGGER_S);
      wrapWordRevealElement(el);
    });
    const elapsed = performance.now() - t0;
    if (elapsed < MIN_MS) await wait(MIN_MS - elapsed);
    if (disposed) return;

    if (line instanceof HTMLElement) {
      line.style.transition = `transform ${LINE_SETTLE_MS / 1000}s ${EASE}`;
      line.style.transform = 'scaleX(1)';
    }
    await wait(LINE_SETTLE_MS);
    if (disposed) return;

    /* 2b — the line FADES OUT before anything exits (universal: this
       path also serves the MAX_MS failsafe, which merges into the
       same flow above). No line is visible during the handoff or
       the cover's reveal sweep. */
    if (line instanceof HTMLElement) {
      line.style.transition = `opacity ${LINE_FADE_OUT_MS / 1000}s ease-out`;
      line.style.opacity = '0';
    }
    await wait(LINE_FADE_OUT_MS);
    if (disposed) return;

    /* 3 — HANDOFF. Measure both instances and travel the splash logo
       onto the live nav logo's box; the nav logo never scales. */
    ensureLogoChars();
    if (logo instanceof HTMLElement && navLogo instanceof HTMLElement) {
      const from = logo.getBoundingClientRect();
      const to = navLogo.getBoundingClientRect();
      const scale = to.height > 0 ? to.height / from.height : 0.5;
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      /* The -50%,-50% centring terms STAY in the transform — writing
         a bare translate(dx,dy) REPLACED them, so the logo first
         jumped right/down by half its own box and the travel read
         as "up and right" (Oscar's report). With both instances
         sharing the nav's exact type treatment, dx is ~0 and the
         travel is straight up.

         NO FADE (Oscar's rev 3): the logo lands and STAYS — it is
         the visible logo right through the cover's exit, flipping
         light->dark by its own difference blend as the cover edge
         passes. The real nav logo stays hidden beneath the cover
         until finish() swaps them atomically. */
      logo.style.transition = `transform ${HANDOFF_MS / 1000}s ${EASE}`;
      logo.style.transform =
        `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(${scale.toFixed(4)})`;
    }

    await wait(HANDOFF_MS);
    if (disposed) return;

    /* 4 — the cover lifts UPWARD (Oscar's rev — was downward): its
       bottom edge rises, so the page reveals bottom-to-top. The
       page entrance rides out with it. */
    root.style.transition = `transform ${COVER_EXIT_MS / 1000}s ${EASE}`;
    root.style.transform = 'translate3d(0, -100%, 0)';
    timers.push(setTimeout(() => { if (!disposed) playPageEntrance(); }, PAGE_ENTRANCE_LEAD_MS));

    await wait(COVER_EXIT_MS);
    if (disposed) return;
    if (navLogo instanceof HTMLElement) navLogo.style.transition = '';
    finish();
  })();

  return () => {
    disposed = true;
    cleanupHeroEntry?.();
    timers.forEach(clearTimeout);
    html.classList.remove('splash-active');
    html.removeAttribute('aria-busy');
  };
}
