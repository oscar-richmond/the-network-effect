/**
 * STATEMENT ACCENT BARS — derived, never hardcoded (Oscar's rule,
 * 2026-08-27, superseding the frames' drawn bar heights, which
 * disagree with each other): every accent bar beside a big
 * statement spans exactly the statement's rendered INK — from the
 * first line's cap top to the last line's ink bottom (baseline +
 * the line's real descender; for the all-caps statements that IS
 * the baseline — the measured descent is 0). Height and top are
 * recomputed from the live text, so any copy change, re-wrap or
 * type-size change carries the bar automatically. This kills the
 * drift class permanently (the audit's find: the IMMERSE bar 61px
 * short after its copy re-wrapped — fixed per-instance heights
 * were the mechanism).
 *
 * MEASUREMENT: line boxes come from the word-reveal clips when the
 * statement is wrapped (grouped by row), else from Range client
 * rects on the raw text (the reduced-motion / pre-wrap state);
 * sub-half-line rects (the indent spacer) are ignored. Ink comes
 * from canvas font metrics: each line's baseline = box top +
 * half-leading + fontBoundingBoxAscent, then the first line's
 * actualBoundingBoxAscent up and the last line's
 * actualBoundingBoxDescent down. The SSR/CSS heights remain as the
 * no-JS fallback; this always overrides them inline.
 *
 * Bars keep their width, colour, right-edge x and draw animation —
 * top + height only.
 */

let ctx = null;
const canvasCtx = () => {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  return ctx;
};

/** The statement's line boxes, in viewport space, indent-filtered. */
function lineBoxes(text) {
  const cs = getComputedStyle(text);
  const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) || 16;
  const clips = Array.from(text.querySelectorAll('.lr-clip--word, :scope > .lr-clip'));
  /** @type {{ top: number, h: number, text: string }[]} */
  let lines = [];
  if (clips.length) {
    const groups = new Map();
    clips.forEach((cl) => {
      const r = cl.getBoundingClientRect();
      if (r.height < lineH / 2) return;
      const key = Math.round(r.top / (lineH / 2));
      if (!groups.has(key)) groups.set(key, { top: r.top, h: r.height, parts: [] });
      const g = groups.get(key);
      g.top = Math.min(g.top, r.top);
      g.h = Math.max(g.h, r.height);
      g.parts.push(cl.textContent ?? '');
    });
    lines = Array.from(groups.values()).map((g) => ({ top: g.top, h: g.h, text: g.parts.join(' ') }));
  } else {
    const range = document.createRange();
    range.selectNodeContents(text);
    lines = Array.from(range.getClientRects())
      .filter((r) => r.width > 2 && r.height >= lineH / 2)
      .map((r) => ({ top: r.top, h: r.height, text: text.textContent ?? '' }));
  }
  lines.sort((a, b) => a.top - b.top);
  /* Fragments of one visual line (the Range path splits around
     inline elements) merge by row. */
  const merged = [];
  lines.forEach((l) => {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(l.top - prev.top) < lineH / 2) {
      prev.h = Math.max(prev.h, l.h);
    } else {
      merged.push({ ...l });
    }
  });
  return merged;
}

/** Measures the statement's ink extent (viewport space); null when
 *  nothing measurable (fonts not ready renders are re-run anyway). */
export function measureStatementInk(text) {
  const lines = lineBoxes(text);
  if (!lines.length) return null;
  const cs = getComputedStyle(text);
  const c = canvasCtx();
  c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const fb = c.measureText('HgÉy'); /* stable font-box sample */
  const fontBox = fb.fontBoundingBoxAscent + fb.fontBoundingBoxDescent;
  const baselineOf = (l) => l.top + (l.h - fontBox) / 2 + fb.fontBoundingBoxAscent;
  const first = lines[0];
  const last = lines[lines.length - 1];
  const mFirst = c.measureText(first.text || 'H');
  const mLast = c.measureText(last.text || 'H');
  return {
    inkTop: baselineOf(first) - mFirst.actualBoundingBoxAscent,
    inkBottom: baselineOf(last) + mLast.actualBoundingBoxDescent,
  };
}

/** Sizes one bar to its statement's ink, in the bar's own
 *  positioning space. Safe to call repeatedly. */
export function sizeStatementBar(bar, text) {
  if (!(bar instanceof HTMLElement) || !(text instanceof HTMLElement)) return;
  const ink = measureStatementInk(text);
  if (!ink || !(ink.inkBottom > ink.inkTop)) return;
  const host = bar.offsetParent instanceof HTMLElement ? bar.offsetParent : text.parentElement;
  if (!(host instanceof HTMLElement)) return;
  const hostTop = host.getBoundingClientRect().top;
  bar.style.top = `${(ink.inkTop - hostTop).toFixed(1)}px`;
  bar.style.height = `${(ink.inkBottom - ink.inkTop).toFixed(1)}px`;
}

/** Wires a bar to its statement: sizes after fonts (metrics need
 *  the real faces), once more on the settle tick (the house 600ms
 *  layout-settle pattern — the reveal wrap may land after the
 *  first pass), and on resize (re-wraps move the last line).
 *  Returns a cleanup. Runs under reduced motion too — the bar is
 *  layout, not choreography. */
export function initStatementBar(bar, text) {
  if (!(bar instanceof HTMLElement) || !(text instanceof HTMLElement)) return () => {};
  const size = () => sizeStatementBar(bar, text);
  const timers = [];
  let disposed = false;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    size();
    timers.push(setTimeout(size, 600));
  });
  const onResize = () => {
    if (!disposed) size();
  };
  window.addEventListener('resize', onResize);
  return () => {
    disposed = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('resize', onResize);
  };
}
