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

  const allChars = root.querySelectorAll('.site-menu__link span');

  gsap.set(allChars, { y: '100%', opacity: 0 });
  gsap.set(footerItems, { y: '100%', opacity: 0 });
  gsap.set(panel, { height: 0, overflow: 'hidden' });
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(closeX, { scale: 0, rotation: -135, opacity: 0 });

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
    .to(backdrop, { opacity: 1, duration: 1, ease }, 0)
    .to(labelMenu, { opacity: 0, duration: 0.35 }, 0)
    .to(labelClose, { opacity: 1, duration: 0.35 }, 0)
    .to(
      closeX,
      { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease },
      0.08,
    )
    .to(
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
    }
  };

  const close = () => {
    if (!tl.reversed() && tl.progress() > 0) {
      tl.reverse();
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
    gsap.to(navImage, { opacity: 1, duration: 0.35, overwrite: true });
  };

  const onNavMouseLeave = () => {
    gsap.to(navLinks, {
      filter: 'blur(0px)',
      opacity: 1,
      duration: 0.3,
      overwrite: true,
    });
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
