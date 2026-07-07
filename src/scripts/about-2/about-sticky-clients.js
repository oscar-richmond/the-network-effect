import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLiquidMedia } from '../liquid-media.js';

gsap.registerPlugin(ScrollTrigger);

/** Gap between the right trio image bottom and the first client row. */
const CLIENT_LIST_ANCHOR_GAP = 180;

/**
 * Positions the client list so its first row sits {@link CLIENT_LIST_ANCHOR_GAP}px
 * below the bottom of the right trio image.
 *
 * @param {ParentNode | Document} scope
 */
export function syncStickyClientsLayout(scope = document) {
  const anchorItem = scope.querySelector('[data-para-trio-item="right"]');
  const root = scope.querySelector('[data-about-sticky-clients]');
  const lead = root?.querySelector('[data-sticky-clients-lead]');

  if (
    !(anchorItem instanceof HTMLElement)
    || !(root instanceof HTMLElement)
    || !(lead instanceof HTMLElement)
  ) {
    return;
  }

  const anchorBottom = anchorItem.getBoundingClientRect().bottom + window.scrollY;
  const rootTop = root.getBoundingClientRect().top + window.scrollY;
  const offset = Math.round(anchorBottom + CLIENT_LIST_ANCHOR_GAP - rootTop);

  if (offset >= 0) {
    lead.style.height = `${offset}px`;
    root.style.marginTop = '';
  } else {
    lead.style.height = '0px';
    root.style.marginTop = `${offset}px`;
  }
}

/**
 * Sets left/right founder text columns to the rendered width of the first
 * industries line (Talent / Hospitality / Brands).
 *
 * @param {ParentNode | Document} scope
 */
export function syncFounderSideWidth(scope = document) {
  const founderBlock = scope.querySelector('[data-sticky-clients-founder]');
  const inner = founderBlock?.querySelector('.about-sticky-clients__founder-inner');
  const refLine = founderBlock?.querySelector('.about-sticky-clients__founder-industries-line:first-of-type');

  if (!(inner instanceof HTMLElement) || !(refLine instanceof HTMLElement)) {
    return;
  }

  inner.style.removeProperty('--founder-side-width');
  const width = Math.ceil(refLine.getBoundingClientRect().width);

  if (width > 0) {
    inner.style.setProperty('--founder-side-width', `${width}px`);
  }
}

/**
 * Sticky “Meet the & Founders” bar with scrolling client rows
 * and footer-driven scale / reposition — Animmaster reference.
 *
 * @param {ParentNode | Document} scope
 * @returns {() => void}
 */
export function initAboutStickyClients(scope = document) {
  const root = scope.querySelector('[data-about-sticky-clients]');
  if (!(root instanceof HTMLElement)) return () => {};

  const stickyBar = root.querySelector('[data-sticky-clients-bar]');
  const founderBlock = root.querySelector('[data-sticky-clients-founder]');

  if (!(stickyBar instanceof HTMLElement)) {
    return () => {};
  }

  const setFounderBarMode = (active) => {
    stickyBar.classList.toggle('is-founder', active);
    if (!active) stickyBar.style.top = '';
  };

  syncStickyClientsLayout(scope);
  syncFounderSideWidth(scope);

  const cleanupLiquidMedia = initLiquidMedia(scope);

  /** @type {ResizeObserver | undefined} */
  let founderSideObserver;

  if (founderBlock instanceof HTMLElement) {
    const refLine = founderBlock.querySelector('.about-sticky-clients__founder-industries-line:first-of-type');
    if (refLine instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
      founderSideObserver = new ResizeObserver(() => syncFounderSideWidth(scope));
      founderSideObserver.observe(refLine);
    }
  }

  /** @type {ScrollTrigger[]} */
  const triggers = [];

  const track = (vars) => {
    const trigger = ScrollTrigger.create(vars);
    triggers.push(trigger);
    return trigger;
  };

  const getStickyBarCenter = () =>
    stickyBar.offsetTop + stickyBar.offsetHeight / 2;

  /** One viewport of scroll while the founder portrait stays pinned. */
  const getFounderPinEnd = () => `+=${window.innerHeight}`;

  const getBarBottomTop = () => {
    const barHeight = stickyBar.offsetHeight;
    const padding = 16;
    return window.innerHeight - barHeight / 2 - padding;
  };

  const rows = root.querySelectorAll('[data-sticky-clients-row]');

  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;

    track({
      trigger: row,
      start: () => `top+=${getStickyBarCenter() - 650} center`,
      end: () => `top+=${getStickyBarCenter() - 450} center`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const narrow = window.innerWidth < 900;
        const maxGap = narrow ? 10 : 15;
        const minGap = narrow ? 0.5 : 1;
        row.style.gap = `${minGap + (maxGap - minGap) * self.progress}em`;
      },
    });

    track({
      trigger: row,
      start: () => `top+=${getStickyBarCenter() - 400} center`,
      end: () => `top+=${getStickyBarCenter() - 300} center`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const narrow = window.innerWidth < 900;
        const maxGap = narrow ? 0.5 : 1;
        const minGap = narrow ? 10 : 15;
        row.style.gap = `${minGap + (maxGap - minGap) * self.progress}em`;
      },
    });
  });

  if (founderBlock instanceof HTMLElement) {
    track({
      trigger: founderBlock,
      start: 'top top',
      end: getFounderPinEnd,
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
    });

    track({
      trigger: founderBlock,
      start: 'top top',
      end: getFounderPinEnd,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (!stickyBar.classList.contains('is-founder')) return;
        const startTop = window.innerHeight * 0.5;
        const endTop = getBarBottomTop();
        stickyBar.style.top = `${startTop + (endTop - startTop) * self.progress}px`;
      },
    });

    track({
      trigger: founderBlock,
      start: 'top center',
      end: () => `+=${window.innerHeight * 1.5}`,
      onEnter: () => setFounderBarMode(true),
      onEnterBack: () => setFounderBarMode(true),
      onLeave: () => setFounderBarMode(false),
      onLeaveBack: () => setFounderBarMode(false),
    });
  }

  track({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => { stickyBar.style.visibility = 'visible'; },
    onEnterBack: () => { stickyBar.style.visibility = 'visible'; },
    onLeave: () => { stickyBar.style.visibility = 'hidden'; },
    onLeaveBack: () => { stickyBar.style.visibility = 'hidden'; },
  });

  const onLayoutChange = () => {
    syncStickyClientsLayout(scope);
    syncFounderSideWidth(scope);
    ScrollTrigger.refresh();
  };

  window.addEventListener('resize', onLayoutChange);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => syncFounderSideWidth(scope));
  }

  scope.querySelectorAll('[data-para-trio-row] img').forEach((img) => {
    if (!(img instanceof HTMLImageElement) || img.complete) return;
    img.addEventListener('load', onLayoutChange, { once: true });
  });

  return () => {
    cleanupLiquidMedia();
    window.removeEventListener('resize', onLayoutChange);
    founderSideObserver?.disconnect();
    triggers.forEach((t) => t.kill());
    stickyBar.style.top = '';
    stickyBar.style.transform = '';
    stickyBar.style.visibility = '';
    stickyBar.classList.remove('is-founder');
    rows.forEach((row) => {
      if (row instanceof HTMLElement) row.style.gap = '';
    });
    root.style.marginTop = '';
    const lead = root.querySelector('[data-sticky-clients-lead]');
    if (lead instanceof HTMLElement) lead.style.height = '';
    const inner = founderBlock?.querySelector('.about-sticky-clients__founder-inner');
    if (inner instanceof HTMLElement) inner.style.removeProperty('--founder-side-width');
  };
}
