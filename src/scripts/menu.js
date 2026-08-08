import gsap from 'gsap';

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
  const sweepLogo = (hidden) => {
    const logo = document.querySelector('.home__logo');
    if (!(logo instanceof HTMLElement)) return;
    const link = logo.querySelector('.home__logo-link');
    if (link instanceof HTMLElement) link.style.pointerEvents = hidden ? 'none' : '';
    const chars = Array.from(logo.querySelectorAll('.cr-char'));
    const units = chars.length ? chars : [logo];
    if (reducedMotion) {
      units.forEach((u) => { u.style.opacity = hidden ? '0' : ''; });
      return;
    }
    units.forEach((u, i) => {
      u.classList.remove('nav-char-out', 'nav-char-in');
      u.style.opacity = '';
      void u.offsetWidth;
      u.style.animationDelay = `${(i * SWAP_STAGGER_S).toFixed(2)}s`;
      u.classList.add(hidden ? 'nav-char-out' : 'nav-char-in');
    });
    /* The same end-state belt as the labels (see sweepLabels). */
    window.clearTimeout(logoBeltTimer);
    if (hidden) {
      logoBeltTimer = window.setTimeout(() => {
        units.forEach((u) => { u.style.opacity = '0'; });
      }, Math.ceil(((units.length - 1) * SWAP_STAGGER_S + NAV_CHAR_OUT_S) * 1000));
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
    onReverseComplete: () => {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      labelMenu.setAttribute('aria-hidden', 'false');
      labelClose.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
    },
  });

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

  const open = () => {
    if (tl.reversed() || tl.progress() === 0) {
      tl.play();
      if (landingSwap) {
        sweepLabels(true);
        sweepLogo(true);
      }
    }
  };

  const close = () => {
    if (!tl.reversed() && tl.progress() > 0) {
      tl.reverse();
      if (landingSwap) {
        sweepLabels(false);
        sweepLogo(false);
      }
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

    const src = link.dataset.src;
    if (src) {
      navImageEl.src = src;
    }
    /* The separator slashes read as "the rest of the line" — they
       soften with the non-hovered links (no-op without seps). */
    if (navSeps.length) {
      gsap.to(navSeps, { filter: 'blur(4px)', opacity: 0.6, duration: 0.3, overwrite: true });
    }
    gsap.to(navImage, { opacity: 1, duration: 0.35, overwrite: true });
  };

  const onNavMouseLeave = () => {
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

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  toggle.addEventListener('click', onToggleClick);
  backdrop.addEventListener('click', onBackdropClick);
  navBody.addEventListener('mouseover', onNavMouseOver);
  navBody.addEventListener('mouseleave', onNavMouseLeave);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    window.clearTimeout(sweepBeltTimer);
    window.clearTimeout(logoBeltTimer);
    close();
    toggle.removeEventListener('click', onToggleClick);
    backdrop.removeEventListener('click', onBackdropClick);
    navBody.removeEventListener('mouseover', onNavMouseOver);
    navBody.removeEventListener('mouseleave', onNavMouseLeave);
    document.removeEventListener('keydown', onKeyDown);
    document.body.classList.remove('menu-open');
    tl.kill();
  };
}
