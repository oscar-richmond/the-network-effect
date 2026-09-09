import gsap from 'gsap';
import { createCoverSwap } from './cover-swap.js';
import { playLineRevealElement } from './line-reveal.js';
import { sweepUnits } from './landing/nav-motion.js';

const ease = 'power3.inOut';

/**
 * @param {HTMLElement | Document} scope
 */
export function initMenu(scope = document) {
  const root = scope.querySelector('[data-menu]');
  const toggle = scope.querySelector('[data-menu-toggle]');
  const labelMenu = scope.querySelector('[data-menu-label-menu]');
  const labelClose = scope.querySelector('[data-menu-label-close]');
  const closeX = scope.querySelector('[data-menu-toggle-x]');
  const panel = root?.querySelector('[data-menu-panel]');
  const navBody = root?.querySelector('[data-menu-body]');
  const navImage = root?.querySelector('[data-menu-image]');
  const navImageEl = root?.querySelector('[data-menu-image-el]');
  const navImageOver = root?.querySelector('[data-menu-image-over]');
  const backdrop = root?.querySelector('[data-menu-backdrop]');
  const footerItems = root?.querySelectorAll('.site-menu__footer li') ?? [];

  if (
    !(root instanceof HTMLElement) ||
    !(toggle instanceof HTMLElement) ||
    !(panel instanceof HTMLElement) ||
    !(navBody instanceof HTMLElement) ||
    !(navImage instanceof HTMLElement) ||
    !(navImageEl instanceof HTMLImageElement) ||
    !(backdrop instanceof HTMLElement) ||
    !(labelMenu instanceof HTMLElement) ||
    !(labelClose instanceof HTMLElement) ||
    !(closeX instanceof HTMLElement)
  ) {
    return () => {};
  }

  /* Hover image swap — the /services hover-rows grammar, shared
     (scripts/cover-swap.js) so the two surfaces can never drift.
     If the overlay element is absent (a stale cached document
     against fresh JS), `hasCoverSwap` falls the hover back to the
     old direct assignment rather than leaving the image frozen. */
  const hasCoverSwap = navImageOver instanceof HTMLImageElement;
  const imageSwap = createCoverSwap({
    wrap: navImage,
    baseEl: navImageEl,
    overEl: hasCoverSwap ? navImageOver : undefined,
  });
  let navImageShown = false;

  const navLinks = root.querySelectorAll('.site-menu__link');

  navLinks.forEach((link) => {
    const text = link.textContent ?? '';
    link.textContent = '';
    text.split('').forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      link.appendChild(span);
    });
  });

  /* Separator slashes (the new-build two-row menu) ride the same
     rise as the link chars; the selector is a no-op on routes
     without them. */
  const allChars = root.querySelectorAll('.site-menu__link span, .site-menu__sep span');
  const navSeps = root.querySelectorAll('.site-menu__sep');

  /* NEW-BUILD MENU<->CLOSE swap (landing-v2 pages only; the old
     routes keep the opacity crossfade + x pop): both labels sweep
     LEFT-TO-RIGHT with the nav char-blur (Oscar's rev — the hover
     effect's blur, via the nav-motion sweep classes in landing.css).
     Chars carry visibility, so the labels stay opaque; the close
     label's resting hide is menu.css's base opacity 0, lifted by
     the .menu-open rule while open. CLOSE gets real chars here
     (unconditionally — char-ripple's hover gate must not decide
     whether the swap is per-char); MENU falls back to a whole-label
     sweep when char-ripple hasn't wired (the applyNavSweep shape). */
  const landingSwap = document.body.classList.contains('landing-v2');
  const closeText = labelClose.querySelector('.home__menu-toggle-close-text');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SWAP_STAGGER_S = 0.03; /* = nav-motion NAV_CHAR_STAGGER_S — keep in step */
  const NAV_CHAR_OUT_S = 0.3; /* = landing.css cr-nav-out duration — keep in step */

  if (landingSwap && closeText instanceof HTMLElement && !closeText.querySelector('.cr-char')) {
    const text = closeText.textContent ?? '';
    closeText.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'cr-sr';
    sr.textContent = text;
    const box = document.createElement('span');
    box.setAttribute('aria-hidden', 'true');
    Array.from(text).forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'cr-char';
      span.textContent = ch === ' ' ? ' ' : ch;
      box.appendChild(span);
    });
    closeText.append(sr, box);
  }

  const swapUnits = (label, trailing) => {
    const chars = Array.from(label.querySelectorAll('.cr-char'));
    const units = chars.length ? chars : [label];
    if (trailing) units.push(trailing);
    return units;
  };

  let sweepBeltTimer = 0;
  let logoBeltTimer = 0;

  const sweepLabels = (opening) => {
    const menuUnits = swapUnits(labelMenu);
    const closeUnits = swapUnits(closeText instanceof HTMLElement ? closeText : labelClose, closeX);
    const outUnits = opening ? menuUnits : closeUnits;
    const inUnits = opening ? closeUnits : menuUnits;
    if (reducedMotion) {
      outUnits.forEach((u) => { u.style.opacity = '0'; });
      inUnits.forEach((u) => { u.style.opacity = ''; });
      return;
    }
    /* STRICTLY SEQUENTIAL (Oscar's rev 2 — the cross-blur read as
       both labels overlaid): the incoming label starts only after
       the outgoing's LAST char has fully blurred away — the
       lightbox two-phase grammar on the toggle. */
    const inBaseDelay = (outUnits.length - 1) * SWAP_STAGGER_S + NAV_CHAR_OUT_S;
    [...outUnits, ...inUnits].forEach((u) => {
      u.classList.remove('nav-char-out', 'nav-char-in');
      u.style.opacity = '';
    });
    void labelMenu.offsetWidth;
    outUnits.forEach((u, i) => {
      u.style.animationDelay = `${(i * SWAP_STAGGER_S).toFixed(2)}s`;
      u.classList.add('nav-char-out');
    });
    inUnits.forEach((u, i) => {
      u.style.animationDelay = `${(inBaseDelay + i * SWAP_STAGGER_S).toFixed(2)}s`;
      u.classList.add('nav-char-in');
    });
    /* END-STATE BELT (Oscar's rev 3 — "fix properly"): once the out
       window has elapsed, the outgoing units are pinned hidden
       INLINE, independent of the CSS animation having actually run
       (style beats everything; the next sweep clears it above).
       Guards any environment where the sweep animation misfires. */
    window.clearTimeout(sweepBeltTimer);
    sweepBeltTimer = window.setTimeout(() => {
      outUnits.forEach((u) => { u.style.opacity = '0'; });
    }, Math.ceil(inBaseDelay * 1000));
  };

  /* LOGO sweep with the menu (Oscar's rev 2): THE NETWORK EFFECT
     blurs out L→R as the menu opens and back in on close — the
     nav-char vocabulary on the logo's own chars (built by
     nav-motion's ensureLogoChars on the landing pages; the bare
     element is the no-chars fallback, the applyNavSweep shape).
     The logo is a LINK and the topbar rides ABOVE the open panel
     (menu-open z600), so while hidden it must not be clickable. */
  const sweepNavPart = (part, hidden) => {
    if (!(part instanceof HTMLElement)) return;
    /* Both parts are LINKS and the topbar rides ABOVE the open panel
       (menu-open z600), so while hidden neither may be clickable. */
    const link = part.querySelector('.home__logo-link');
    (link instanceof HTMLElement ? link : part).style.pointerEvents = hidden ? 'none' : '';
    /* nav-motion's own unit list — chars PLUS a trailing arrow.
       LET'S CHAT ends in an arrow SVG that is not a .cr-char, so a
       chars-only sweep left it hanging in the corner. */
    const units = sweepUnits(part);
    if (reducedMotion) {
      units.forEach((u) => { u.style.opacity = hidden ? '0' : ''; });
      return { units, ms: 0 };
    }
    units.forEach((u, i) => {
      u.classList.remove('nav-char-out', 'nav-char-in');
      u.style.opacity = '';
      void u.offsetWidth;
      u.style.animationDelay = `${(i * SWAP_STAGGER_S).toFixed(2)}s`;
      u.classList.add(hidden ? 'nav-char-out' : 'nav-char-in');
    });
    return { units, ms: Math.ceil(((units.length - 1) * SWAP_STAGGER_S + NAV_CHAR_OUT_S) * 1000) };
  };

  /* The LOGO and LET'S CHAT leave together when the menu opens and
     return together once it has closed (Oscar's rev). */
  const sweepLogo = (hidden) => {
    const parts = [
      document.querySelector('.home__logo'),
      document.querySelector('.home__topbar-email'),
    ];
    const results = parts.map((p) => sweepNavPart(p, hidden)).filter(Boolean);
    /* The same end-state belt as the labels (see sweepLabels): pin
       the hidden state once the sweep's own animation has run, so a
       dropped animationend can never leave a part half-visible. */
    window.clearTimeout(logoBeltTimer);
    if (hidden && results.length) {
      logoBeltTimer = window.setTimeout(() => {
        results.forEach((r) => r.units.forEach((u) => { u.style.opacity = '0'; }));
      }, Math.max(...results.map((r) => r.ms)));
    }
  };

  gsap.set(allChars, { y: '100%', opacity: 0 });
  gsap.set(footerItems, { y: '100%', opacity: 0 });
  gsap.set(panel, { height: 0, overflow: 'hidden' });
  gsap.set(backdrop, { opacity: 0 });
  if (landingSwap) {
    /* Rest state: CLOSE's units hidden until their first sweep-in
       (the label's own opacity 0 covers the pre-JS frame). */
    swapUnits(closeText instanceof HTMLElement ? closeText : labelClose, closeX)
      .forEach((u) => { u.style.opacity = '0'; });
  } else {
    gsap.set(closeX, { scale: 0, rotation: -135, opacity: 0 });
  }

  const tl = gsap.timeline({
    paused: true,
    onStart: () => {
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      labelMenu.setAttribute('aria-hidden', 'true');
      labelClose.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
    },
    onReverseComplete: () => closedHousekeeping(),
  });

  /* The closed-state housekeeping — ONE function (R1 item 2): the
     timeline's onReverseComplete runs it on a normal close, and
     close() runs it DIRECTLY when reverse() lands on a timeline
     that never ticked (a rapid open→close at progress 0 — GSAP
     fires no callback there, which used to strand is-open/aria
     'open' on a visually closed menu and hold the wordmark chars
     in their swept-out blur). The logo and LET'S CHAT sweep back
     in ONLY here — once the panel has finished retracting (Oscar's
     rev); an eventCallback from close() would replace the cleanup
     and strand `is-open` (the applyNavSweep guard keys on it). */
  function closedHousekeeping() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    labelMenu.setAttribute('aria-hidden', 'false');
    labelClose.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    if (landingSwap) sweepLogo(false);
  }

  tl.to(panel, { height: 'auto', duration: 1, ease }, 0)
    .to(backdrop, { opacity: 1, duration: 1, ease }, 0);
  if (!landingSwap) {
    /* Old routes: the original label crossfade + x pop. The landing
       pages swap via sweepLabels in open()/close() instead — CSS
       animations, deliberately OUTSIDE this reversible timeline
       (a reverse would run the sweep backwards R->L; Oscar's rev is
       L->R both ways). */
    tl.to(labelMenu, { opacity: 0, duration: 0.35 }, 0)
      .to(labelClose, { opacity: 1, duration: 0.35 }, 0)
      .to(
        closeX,
        { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease },
        0.08,
      );
  }
  tl.to(
      allChars,
      { y: '0%', opacity: 1, duration: 1, ease, stagger: 0.02 },
      0.2,
    )
    .to(
      footerItems,
      { y: '0%', opacity: 1, duration: 1, ease, stagger: 0.05 },
      0.4,
    );

  /* CTA reveal — the MORE INFO clip rise, played with the panel's
     own entrance and re-armed on close so every open replays it.
     playLineRevealElement injects the .lr-* styles on first use. */
  const ctaBlock = root.querySelector('[data-menu-ctas]');
  const ctaClips = Array.from(root.querySelectorAll('.site-menu__ctaclip'));
  let ctaRevealTimer = 0;
  const revealCTAs = (show) => {
    if (!(ctaBlock instanceof HTMLElement) || !ctaClips.length) return;
    window.clearTimeout(ctaRevealTimer);
    if (!show) {
      ctaClips.forEach((c) => c.classList.remove('lr-visible'));
      return;
    }
    /* Rides in behind the nav rows, like the footer items do. */
    ctaRevealTimer = window.setTimeout(() => playLineRevealElement(ctaBlock), 400);
  };

  /* ── THE SWEEP SETTLE BELT (Oscar's device report, R1 item 2:
     residual blurred wordmark letters). ROOT CAUSE, proven by
     hammering the toggle: the logo/email return sweep hangs
     EXCLUSIVELY off the timeline's onReverseComplete, while the
     out-sweep and its inline opacity-0 belt fire unconditionally on
     open — and close() was a no-op at progress 0 (a queued open
     kept playing), so rapid toggles could end CLOSED with chars
     still carrying .nav-char-out (animation-fill blur 3px) and the
     belt's pinned opacity. The belt below is the guarantee the
     choreography can't give: after EVERY toggle transition, one
     settle timer reconciles the chars to the authoritative menu
     state — closed = classes off, inline animation/opacity/filter
     cleared (computed filter none), open = pinned hidden. Also runs
     when the tab returns to visibility (frozen-tab animations). */
  const NAV_SETTLE_MS = 1500; /* > the longest sweep window */
  let settleTimer = 0;
  const reconcileNav = () => {
    const isOpen = root.classList.contains('is-open');
    [document.querySelector('.home__logo'), document.querySelector('.home__topbar-email')]
      .forEach((part) => {
        if (!(part instanceof HTMLElement)) return;
        sweepUnits(part).forEach((u) => {
          u.classList.remove('nav-char-out', 'nav-char-in');
          u.style.animationDelay = '';
          u.style.filter = '';
          u.style.opacity = isOpen ? '0' : '';
        });
        if (!isOpen) {
          const link = part.querySelector('.home__logo-link');
          (link instanceof HTMLElement ? link : part).style.pointerEvents = '';
        }
      });
  };
  const scheduleSettle = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(reconcileNav, NAV_SETTLE_MS);
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') scheduleSettle();
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* ── CLOSE-TAIL BOOST (Oscar's device report: a dead pause before
     the exit visibly begins). MEASURED at 915ms tap-to-first-panel-
     motion: the timeline's tail (char + footer staggers, running to
     ~1.9s) reverses BEFORE the playhead re-enters the panel's [0..1s]
     band. The boost reverses that tail at 12× (≈75ms) and restores
     1× the moment the panel band begins — the exit's visible speed
     and character are untouched, only the inaudible tail is
     compressed. Open() clears any active boost (a re-open mid-close
     must run at normal speed). */
  const PANEL_BAND_END_S = 1.0; /* the panel tween's slot */
  const CLOSE_TAIL_TIMESCALE = 20;
  let tailWatch = null;
  const clearTailBoost = () => {
    if (tailWatch) {
      gsap.ticker.remove(tailWatch);
      tailWatch = null;
    }
    /* GSAP-3 pitfall (the wedge this fix round found): the timeScale
       SETTER clears reversed() — reversed playback rides the scale's
       sign — so the direction must be restored around every set. */
    const wasReversed = tl.reversed();
    tl.timeScale(1);
    tl.reversed(wasReversed);
  };

  /* ── FOCUS MODALITY (X1, 2026-09-09). The rings are :focus-visible
     only, but every engine decides for itself whether a SCRIPT focus
     paints one: Chromium inherits it from the element focus left
     (measured: after the START A PROJECT modal returned focus to the
     toggle with a ring, the next tap-open's first.focus() painted the
     rectangle around WORK — :focus-visible=true, outline 2px #232a89)
     and treats any keyboard use in the session as "keyboard user"
     thereafter (measured: after one Tab, a tap-close's toggle.focus()
     painted the square around the X). So the input modality is
     tracked here — the last thing the user did, pointer or keyboard —
     and the two programmatic focuses are shaped by it:
       · open → the PANEL (tabindex=-1, `outline: none`): a focus
         target that never paints; Tab from it goes to the first link
         WITH a ring (keyboard-initiated, every engine agrees).
       · close → the toggle, as before (focus must return), but after
         a POINTER close it carries `is-focus-quiet` — its ring rule
         yields — until the next key press or blur. A keyboard close
         (Escape / Enter on the toggle) keeps its ring. */
  const FOCUS_QUIET = 'is-focus-quiet';
  const MENU_FOCUS_FRAMES = 12; /* frames to wait for is-open (the timeline's first tick) */
  let lastInput = 'pointer';
  const onAnyKey = () => {
    lastInput = 'keyboard';
    toggle.classList.remove(FOCUS_QUIET);
  };
  const onAnyPointer = () => { lastInput = 'pointer'; };
  const onToggleBlur = () => { toggle.classList.remove(FOCUS_QUIET); };
  document.addEventListener('keydown', onAnyKey, true);
  document.addEventListener('pointerdown', onAnyPointer, true);
  toggle.addEventListener('blur', onToggleBlur);
  /* The old rAF fired once and checked is-open — which the timeline's
     onStart adds on its FIRST TICK, a race the rAF lost on a cold page
     (measured in Chromium: focus never left the toggle). Polls a few
     frames instead, giving up if the open was reversed meanwhile. */
  const focusPanelWhenOpen = (framesLeft) => {
    requestAnimationFrame(() => {
      if (tl.reversed()) return;
      if (root.classList.contains('is-open')) {
        panel.focus({ preventScroll: true });
        return;
      }
      if (framesLeft > 0) focusPanelWhenOpen(framesLeft - 1);
    });
  };

  /* X2 (2026-09-09): every open starts NEUTRAL. The hover treatment
     (the hovered link sharp, the rest blur 4 / 0.6, the image up) is
     written as inline GSAP state from `mouseover` and only ever undone
     by `mouseleave` — which a touch pointer never fires: a tap on a
     link is a synthetic mouseover (measured: Work sharp, Services and
     Founders blur(4px)/0.6 in the frames before the navigation
     committed) and nothing after it clears the state for the life of
     the document — a bfcache restore (iOS swipe-back) brings that
     document back with the tapped item still "selected". */
  const neutraliseHover = () => {
    navImageShown = false;
    gsap.set(navLinks, { filter: 'blur(0px)', opacity: 1, overwrite: true });
    if (navSeps.length) gsap.set(navSeps, { filter: 'blur(0px)', opacity: 1, overwrite: true });
    gsap.set(navImage, { opacity: 0, overwrite: true });
  };

  const open = () => {
    if (tl.reversed() || tl.progress() === 0) {
      clearTailBoost();
      neutraliseHover();
      /* Re-resolve the panel's height:'auto' against the CURRENT
         content each open (R2 item 7): gsap caches the px from the
         first resolution, which was measured against init-time
         layout — 80px taller than the settled mobile content, so the
         menu background ran past the 32px bottom spec. At progress 0
         every tween's start state is its parked rest, so the
         re-record is loss-free. */
      if (tl.progress() === 0) tl.invalidate();
      tl.play();
      /* Focus lands on the panel container once the panel has begun
         to open — never on an item (X1). */
      focusPanelWhenOpen(MENU_FOCUS_FRAMES);
      revealCTAs(true);
      if (landingSwap) {
        sweepLabels(true);
        sweepLogo(true);
      }
      scheduleSettle();
    }
  };

  const close = () => {
    /* The frame goes with the overlay — drop any pending swap so a
       timer can't land on the next open. */
    navImageShown = false;
    imageSwap.reset();
    revealCTAs(false); /* re-arm so the next open replays the rise */
    /* NO progress>0 guard (R1 item 2): a rapid open→close used to
       no-op here while the queued play() carried on opening the
       panel — and the return sweep never came. reverse() at 0 simply
       parks the queued open; the settle belt owns the terminal char
       state either way. */
    if (!tl.reversed()) {
      /* Focus goes back to the toggle if it was inside the menu (or
         dropped to the body by a backdrop click). */
      const active = document.activeElement;
      if (active === document.body || (active instanceof Node && root.contains(active))) {
        toggle.focus({ preventScroll: true });
        /* X1: a pointer-initiated close must not paint the return
           focus; a keyboard close keeps its ring. */
        if (lastInput !== 'keyboard') toggle.classList.add(FOCUS_QUIET);
      }
      tl.reverse();
      if (!reducedMotion && tl.time() > PANEL_BAND_END_S) {
        tl.timeScale(CLOSE_TAIL_TIMESCALE);
        tl.reversed(true); /* the setter just cleared it (sign pitfall) */
        tailWatch = () => {
          if (!tl.reversed() || tl.time() <= PANEL_BAND_END_S) clearTailBoost();
        };
        gsap.ticker.add(tailWatch);
      }
      if (landingSwap) {
        /* CLOSE -> MENU swaps immediately (it IS the toggle), but the
           logo and LET'S CHAT wait for the panel to finish closing
           and only then sweep back in (Oscar's rev) — they should
           not reappear over a panel that is still retracting. */
        sweepLabels(false);
        /* sweepLogo(false) is NOT called here — closedHousekeeping
           runs it once the panel has closed. */
      }
      /* The no-tick path: reverse() at progress 0 completes without
         a tick and fires NO callback — run the housekeeping now. */
      if (tl.progress() === 0) closedHousekeeping();
      scheduleSettle();
    }
  };

  const onToggleClick = () => {
    if (tl.reversed() || tl.progress() === 0) {
      open();
    } else {
      close();
    }
  };

  const onNavMouseOver = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('.site-menu__link');
    if (!(link instanceof HTMLElement)) return;

    const hoveredIndex = link.dataset.index;

    navLinks.forEach((other) => {
      const isHovered = other.dataset.index === hoveredIndex;
      gsap.to(other, {
        filter: isHovered ? 'blur(0px)' : 'blur(4px)',
        opacity: isHovered ? 1 : 0.6,
        duration: 0.3,
        overwrite: true,
      });
    });

    /* Image change = the /services hover-rows swap (Oscar's rev):
       the first hover of a visit PLACES the image (the frame is
       still fading in — nothing to wipe over); every hover after
       that runs the cover-then-retire sequence. */
    const src = link.dataset.src;
    if (src) {
      /* RM gets the plain cut (the pre-swap behaviour, and what
         /services does with this same mechanic). */
      if (!hasCoverSwap || reducedMotion) navImageEl.src = src;
      else if (navImageShown) imageSwap.swapTo(src);
      else imageSwap.showInstant(src);
    }
    navImageShown = true;
    /* The separator slashes read as "the rest of the line" — they
       soften with the non-hovered links (no-op without seps). */
    if (navSeps.length) {
      gsap.to(navSeps, { filter: 'blur(4px)', opacity: 0.6, duration: 0.3, overwrite: true });
    }
    gsap.to(navImage, { opacity: 1, duration: 0.35, overwrite: true });
  };

  const onNavMouseLeave = () => {
    /* An in-flight swap is deliberately NOT cancelled — it finishes
       under the fading frame, so nothing snaps back to the old
       image on the way out. The next entrance places directly. */
    navImageShown = false;
    gsap.to(navLinks, {
      filter: 'blur(0px)',
      opacity: 1,
      duration: 0.3,
      overwrite: true,
    });
    if (navSeps.length) {
      gsap.to(navSeps, { filter: 'blur(0px)', opacity: 1, duration: 0.3, overwrite: true });
    }
    gsap.to(navImage, { opacity: 0, duration: 0.35, overwrite: true });
  };

  const onBackdropClick = () => {
    close();
  };

  /* A11y batch item 5 (Oscar, 2026-09-04): FOCUS MANAGEMENT. Opening
     moves focus to the first menu link; while open, Tab cycles inside
     the menu — the toggle (it IS the close control) plus every link
     and button in the panel — instead of walking the page behind the
     overlay; closing returns focus to the toggle. */
  const menuFocusables = () => [
    toggle,
    ...Array.from(root.querySelectorAll('a[href], button:not([disabled])')),
  ].filter((el) => el instanceof HTMLElement && el.getClientRects().length > 0);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab' || !root.classList.contains('is-open')) return;
    const items = menuFocusables();
    if (!items.length) return;
    /* THE MENU FIX (2026-09-07): every Tab is ours while the menu is
       open. Deferring to the browser's own order between the ends let
       focus leave the panel — WebKit never tabs to links at all (Safari's
       default), and in the band the native next stop after the toggle is
       the wordmark behind the overlay — so the cycle is walked here:
       toggle → links → CTAs → footer links → toggle, both directions. */
    event.preventDefault();
    const idx = items.indexOf(document.activeElement);
    /* From the panel itself (the open's focus target, X1): Tab goes to
       the first LINK — the toggle is the cycle's wrap point, not its
       first stop — and Shift+Tab to the toggle. */
    const fromPanel = idx < 0 && document.activeElement === panel;
    const next = fromPanel
      ? (event.shiftKey ? 0 : Math.min(1, items.length - 1))
      : event.shiftKey
        ? (idx <= 0 ? items.length - 1 : idx - 1)
        : (idx < 0 || idx === items.length - 1 ? 0 : idx + 1);
    items[next].focus({ preventScroll: true });
  };

  /* X2: a bfcache restore (iOS swipe-back) resurrects the document
     exactly as it froze — menu open, the tapped item "selected". The
     page-transition re-covers and re-reveals the page; the menu comes
     back closed under that cover, and the next open is neutral. */
  const onPageShow = (event) => {
    if (event.persisted && root.classList.contains('is-open')) close();
  };
  window.addEventListener('pageshow', onPageShow);

  toggle.addEventListener('click', onToggleClick);
  backdrop.addEventListener('click', onBackdropClick);
  navBody.addEventListener('mouseover', onNavMouseOver);
  navBody.addEventListener('mouseleave', onNavMouseLeave);
  document.addEventListener('keydown', onKeyDown);

  /* R40 (2026-09-04): a modal opening from inside the menu (START A
     PROJECT) takes the page — the menu (z500, over the modal tier)
     retracts first. */
  const onModalOpen = () => { if (root.classList.contains('is-open')) close(); };
  document.addEventListener('ne:modal-open', onModalOpen);

  return () => {
    document.removeEventListener('ne:modal-open', onModalOpen);
    clearTailBoost();
    window.clearTimeout(settleTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    reconcileNav(); /* never hand a stuck sweep to the next page */
    window.clearTimeout(sweepBeltTimer);
    window.clearTimeout(logoBeltTimer);
    window.clearTimeout(ctaRevealTimer);
    close();
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('keydown', onAnyKey, true);
    document.removeEventListener('pointerdown', onAnyPointer, true);
    toggle.removeEventListener('blur', onToggleBlur);
    toggle.classList.remove(FOCUS_QUIET);
    toggle.removeEventListener('click', onToggleClick);
    backdrop.removeEventListener('click', onBackdropClick);
    navBody.removeEventListener('mouseover', onNavMouseOver);
    navBody.removeEventListener('mouseleave', onNavMouseLeave);
    document.removeEventListener('keydown', onKeyDown);
    document.body.classList.remove('menu-open');
    tl.kill();
  };
}
