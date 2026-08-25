/**
 * SV-ROWS — the hover-row machinery, SHARED (extracted verbatim from
 * services-v2.js, 2026-08-24, for the landing services redesign):
 * accent fill + seamless rolling marquee + the cover-swap image
 * frame gliding between rows, with the lightbox latch for rapid
 * hovers, tap-to-activate on touch, keyboard focus parity, and
 * RM = colour fill only (CSS gates the rest). One definition, two
 * hosts (/services and /landing) — behaviour can never drift.
 *
 * Two guarded adaptations for the landing rows (both no-ops on
 * /services): index-less rows drop the "NN / " marquee prefix, and
 * the image-glide half-height is MEASURED from the frame element
 * (landing's overlay is 380x480 vs /services' 380-square constant).
 */
import { isTouchPrimary } from './viewport.js';
import { SWAP_PHASE_MS, SWAP_CURVE } from '../cover-swap.js';

/* Hover-row marquee — the network-marquee family speed. */
const MARQ_SPEED_PX_S = 35;
const MARQ_GAP_PX = 80;
const HOVER_IMG_HALF_PX = 190;
const ROW_BAND_CENTRE_PX = 34;

/**
 * Wires every [data-sv-rows] section under `root`. Returns a cleanup.
 * @param {{ reduced: boolean, isMob: boolean, fineHover: boolean,
 *   schedule: (fn: () => void, ms: number) => void,
 *   root?: ParentNode }} opts
 */
export function initSvRowsSections({ reduced, isMob, fineHover, schedule, root = document }) {
  const cleanups = [];
  const rowSections = Array.from(root.querySelectorAll('[data-sv-rows]'));
  rowSections.forEach((section) => {
    if (!(section instanceof HTMLElement)) return;
    const rows = Array.from(section.querySelectorAll('[data-sv-row]'));
    const imgWrap = section.querySelector('[data-sv-rows-img]');
    const imgEl = imgWrap instanceof HTMLElement ? imgWrap.querySelector('img') : null;
    let active = null;

    /* Marquee tracks — built once; widths measured after fonts so
       the loop shift is exact (seamless at every row width). */
    const buildMarquees = () => {
      if (reduced) return;
      const listWidth = section.querySelector('[data-sv-rows-list]')?.clientWidth ?? 1161;
      rows.forEach((row) => {
        const marq = row.querySelector('[data-sv-marq]');
        if (!(marq instanceof HTMLElement) || marq.dataset.built) return;
        marq.dataset.built = '1';
        /* Index-less rows (the landing lists) roll the text alone. */
        const label = row.dataset.index
          ? `${row.dataset.index} /  ${row.dataset.text ?? ''}`
          : (row.dataset.text ?? '');
        const track = document.createElement('span');
        track.className = 'sv-rows__marq-track';
        const probe = document.createElement('span');
        probe.className = 'sv-rows__marq-unit';
        probe.textContent = label;
        track.appendChild(probe);
        marq.appendChild(track);
        const unitW = probe.getBoundingClientRect().width || 300;
        const shift = unitW + MARQ_GAP_PX;
        /* Enough copies that a one-shift translate always leaves the
           row covered (the file's 3–4-copies-under-a-mask loop). */
        const copies = Math.ceil((listWidth + shift) / shift) + 1;
        for (let i = 1; i < copies; i += 1) {
          const unit = document.createElement('span');
          unit.className = 'sv-rows__marq-unit';
          unit.textContent = label;
          track.appendChild(unit);
        }
        marq.style.setProperty('--sv-marq-shift', `${shift.toFixed(1)}px`);
        marq.style.setProperty('--sv-marq-dur', `${(shift / MARQ_SPEED_PX_S).toFixed(2)}s`);
      });
    };
    const fontsForMarq = document.fonts?.ready ?? Promise.resolve();
    fontsForMarq.then(buildMarquees);

    /* Image swap runner (Oscar's rev 4 — COVER, don't clear): the
       NEW image wipes in L→R ON TOP of the old one (the overlay
       img), the frame gliding to the new row meanwhile (CSS top
       transition); once the cover completes, the BASE adopts the
       new src and the overlay hides — the old image is never wiped
       out first, so at no point is the frame empty. One run in
       flight; the completion re-checks the LATEST pending row (the
       lightbox latch), so rapid hops never stack and always land
       the newest. */
    /* Timing/curve now live in scripts/cover-swap.js — the menu's
       hover image runs this same swap, and one definition means the
       two can never drift apart. */
    const overEl = imgWrap instanceof HTMLElement ? imgWrap.querySelector('[data-sv-img-over]') : null;
    let shownRow = null;
    let pendingRow = null;
    let swapAnim = false;
    const swapTimers = [];
    const swapSchedule = (fn, ms) => swapTimers.push(window.setTimeout(fn, ms));
    const clearSwap = () => {
      swapTimers.forEach(window.clearTimeout);
      swapTimers.length = 0;
      swapAnim = false;
      imgWrap?.classList.remove('is-covering');
      if (overEl instanceof HTMLImageElement) {
        overEl.hidden = true;
        overEl.style.transition = '';
        overEl.style.clipPath = '';
        overEl.style.filter = '';
      }
    };
    const placeAt = (row) => {
      /* Mobile: the frame is CSS-docked at the section's bottom slot
         (services-v2.css) — the glide is a desktop read. */
      if (isMob) return;
      if (imgWrap instanceof HTMLElement) {
        const half = (imgWrap.offsetHeight || HOVER_IMG_HALF_PX * 2) / 2;
        /* RECT-based (2026-08-25): the landing hosts the rows inside
           a translated scroll wrapper with the frame OUTSIDE it, so
           the row's live rect — not offsetTop — is the truth. On
           /services nothing is transformed and this is byte-identical
           to the old offsetTop math. */
        const parent = imgWrap.offsetParent;
        const rowTop = parent instanceof HTMLElement
          ? row.getBoundingClientRect().top - parent.getBoundingClientRect().top
          : row.offsetTop;
        imgWrap.style.top = `${(rowTop + ROW_BAND_CENTRE_PX - half).toFixed(1)}px`;
      }
    };
    const runSwapSequence = () => {
      if (!(overEl instanceof HTMLImageElement) || !(imgWrap instanceof HTMLElement)) return;
      const target = pendingRow;
      if (!(target instanceof HTMLElement) || target === shownRow) return;
      swapAnim = true;
      /* The NEW image wipes in over the old (blur 6→0) while the
         BASE blurs up 0→6 beneath it (.is-covering — the lightbox
         out-phase read, Oscar's rev 5: one-sided blur wasn't
         legible); the frame glides to the target row meanwhile. */
      placeAt(target);
      imgWrap.classList.add('is-covering');
      overEl.src = target.dataset.img ?? '';
      overEl.hidden = false;
      overEl.style.transition = 'none';
      overEl.style.clipPath = 'inset(0 100% 0 0)';
      overEl.style.filter = 'blur(6px)';
      void overEl.offsetWidth;
      overEl.style.transition = `clip-path ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}, filter ${SWAP_PHASE_MS / 1000}s ${SWAP_CURVE}`;
      overEl.style.clipPath = 'inset(0 0 0 0)';
      overEl.style.filter = 'blur(0px)';
      swapSchedule(() => {
        /* Fully covered — the base adopts the new image and
           UN-BLURS TRANSITION-FREE under the overlay (a visible
           0.45s un-blur would follow the class removal
           otherwise), then the overlay retires. */
        if (imgEl instanceof HTMLImageElement) {
          imgEl.src = overEl.src;
          imgEl.style.transition = 'none';
          imgWrap.classList.remove('is-covering');
          void imgEl.offsetWidth;
          imgEl.style.transition = '';
        } else {
          imgWrap.classList.remove('is-covering');
        }
        shownRow = target;
        clearSwap();
        if (pendingRow !== shownRow && pendingRow instanceof HTMLElement) runSwapSequence();
      }, SWAP_PHASE_MS + 30);
    };
    const setActive = (row) => {
      if (row === active) return;
      if (active) active.classList.remove('is-active');
      active = row;
      if (!(row instanceof HTMLElement)) {
        pendingRow = null;
        clearSwap();
        imgWrap?.classList.remove('is-active');
        shownRow = null;
        return;
      }
      row.classList.add('is-active');
      if (reduced || !(imgWrap instanceof HTMLElement)) return;
      pendingRow = row;
      if (!imgWrap.classList.contains('is-active')) {
        /* Fresh entrance: place + src directly, blur/fade in. */
        clearSwap();
        placeAt(row);
        if (imgEl instanceof HTMLImageElement) imgEl.src = row.dataset.img ?? '';
        shownRow = row;
        void imgWrap.offsetWidth;
        imgWrap.classList.add('is-active');
        return;
      }
      /* Row-to-row: the two-phase sequence (unless one is already
         in flight — it will pick pendingRow up at its boundary). */
      if (!swapAnim && row !== shownRow) runSwapSequence();
    };
    cleanups.push(clearSwap);

    if (fineHover) {
      const onOver = (e) => {
        const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
        setActive(row instanceof HTMLElement && section.contains(row) ? row : null);
      };
      const onLeave = () => setActive(null);
      section.addEventListener('pointerover', onOver);
      section.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        section.removeEventListener('pointerover', onOver);
        section.removeEventListener('pointerleave', onLeave);
      });
    } else if (isTouchPrimary()) {
      /* A3 (mobile brief): TAP-TO-ACTIVATE — the rows are
         non-navigating showcases, so the tap owns activation
         outright: tap a row -> fill + marquee + the docked image
         adopt it; tap another -> switch; tap the active row ->
         clear. The FIRST row pre-activates once the section's
         entrance has drawn it, so the mechanic is never a dead
         list (the report's rule). */
      const onTap = (e) => {
        const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
        if (!(row instanceof HTMLElement) || !section.contains(row)) return;
        setActive(row === active ? null : row);
      };
      section.addEventListener('click', onTap);
      cleanups.push(() => section.removeEventListener('click', onTap));
      if (!reduced && rows[0] instanceof HTMLElement) {
        schedule(() => {
          if (!active) setActive(rows[0]);
        }, 1400);
      }
    }
    /* Keyboard parity — focus gets the same state in every mode. */
    const onFocusIn = (e) => {
      const row = e.target instanceof Element ? e.target.closest('[data-sv-row]') : null;
      if (row instanceof HTMLElement) setActive(row);
    };
    const onFocusOut = (e) => {
      const next = e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-sv-row]') : null;
      if (!next) setActive(null);
    };
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);
    cleanups.push(() => {
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
