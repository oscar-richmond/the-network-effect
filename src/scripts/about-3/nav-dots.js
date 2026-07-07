/**
 * /about-3 — position nav dots symmetrically around the logo.
 * Right dot: midpoint of logo↔email gap.
 * Left dot: same offset from logo left as right dot from logo right.
 */
export function initAbout3NavDots() {
  const topbar = document.querySelector('body.about-page-3 .home__topbar--about');
  if (!(topbar instanceof HTMLElement)) return () => {};

  const positionDots = () => {
    const logo = topbar.querySelector('.home__logo');
    const email = topbar.querySelector('.home__topbar-email');
    const leftDot = topbar.querySelector('.home__topbar-dot--before');
    const rightDot = topbar.querySelector('.home__topbar-dot--after');

    if (
      !(logo instanceof HTMLElement)
      || !(email instanceof HTMLElement)
      || !(leftDot instanceof HTMLElement)
      || !(rightDot instanceof HTMLElement)
    ) {
      return;
    }

    const topbarRect = topbar.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const emailRect = email.getBoundingClientRect();

    const rightCenterX = (logoRect.right + emailRect.left) / 2;
    const offset = rightCenterX - logoRect.right;
    const leftCenterX = logoRect.left - offset;
    const centerY = logoRect.top + logoRect.height / 2;

    const top = centerY - topbarRect.top;
    leftDot.style.left = `${leftCenterX - topbarRect.left}px`;
    leftDot.style.top = `${top}px`;
    rightDot.style.left = `${rightCenterX - topbarRect.left}px`;
    rightDot.style.top = `${top}px`;
  };

  positionDots();
  window.addEventListener('resize', positionDots);
  document.fonts?.ready.then(positionDots);
  document.addEventListener('about-hero:settled', positionDots);
  document.addEventListener('about-3:position-nav-dots', positionDots);

  /** @type {ResizeObserver | undefined} */
  let resizeObserver;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(positionDots);
    resizeObserver.observe(topbar);
    const logo = topbar.querySelector('.home__logo');
    const email = topbar.querySelector('.home__topbar-email');
    if (logo instanceof HTMLElement) resizeObserver.observe(logo);
    if (email instanceof HTMLElement) resizeObserver.observe(email);
  }

  return () => {
    window.removeEventListener('resize', positionDots);
    document.removeEventListener('about-hero:settled', positionDots);
    document.removeEventListener('about-3:position-nav-dots', positionDots);
    resizeObserver?.disconnect();
  };
}
