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
  const SWAP_IN_DELAY_S = 0.15; /* CLOSE starts as MENU is mid-blur */

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
      u.style.animationDelay = `${(SWAP_IN_DELAY_S + i * SWAP_STAGGER_S).toFixed(2)}s`;
      u.classList.add('nav-char-in');
    });
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
      if (landingSwap) sweepLabels(true);
    }
  };

  const close = () => {
    if (!tl.reversed() && tl.progress() > 0) {
      tl.reverse();
      if (landingSwap) sweepLabels(false);
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
