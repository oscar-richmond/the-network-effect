/**
 * THE IMAGE WIPE — the WHAT WE DO rows' swap treatment, ONE definition
 * (extracted verbatim from landing-services.js, 2026-09-10, for the
 * /services phone row lists — Oscar's rule: reuse the landing's indent +
 * image-swap mechanism, same duration, easing and swap treatment; the
 * landing's own driver now calls this and is proven unchanged).
 *
 * THE CONSTRUCTION (the desktop reel's, IMG_WIPE_* there): two stacked
 * layers in one frame — the OVER carries the image on show, the UNDER
 * takes the incoming one. On a request the UNDER adopts the new src and
 * decodes (600ms cap — a stalled decode never parks the frame), then the
 * OVER wipes OFF it left → right (clip-path inset 0 → 100%) with a 6px
 * edge blur peaking at the midpoint, 450ms on the house cubic-bezier
 * (0.42, 0, 0.24, 1); once clipped away the OVER adopts the new src,
 * decodes, and the wipe animation is cancelled — the frame is never
 * empty, and at rest both layers show the same image. ONE run in
 * flight; a request landing mid-wipe waits as `pending` and the
 * completion re-checks it (rapid hops never stack, the newest always
 * lands). Reduced motion: the OVER swaps its src outright.
 *
 * Build-time srcsets outrank src, so both layers drop srcset/sizes
 * before their first write (the desktop reel's FINAL GATE guard).
 */
export const IMG_WIPE_MS = 450;
export const IMG_WIPE_EDGE_BLUR_PX = 6;
export const IMG_WIPE_CURVE = 'cubic-bezier(0.42, 0, 0.24, 1)';
export const IMG_DECODE_TIMEOUT_MS = 600;

const unset = (img) => {
  if (img.hasAttribute('srcset')) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
};

/**
 * @param {{ over: HTMLImageElement, under: HTMLImageElement,
 *   srcFor: (key: any) => string, reduced?: boolean, initial?: any }} opts
 *   over/under — the two layers (under sits BENEATH over in the frame)
 *   srcFor     — the src for a request key (an index, a row, a slug…)
 *   initial    — the key the frame is showing at construction (a request
 *                for it is a no-op until something else has shown)
 * @returns {{ request: (key: any) => void, current: () => any, dispose: () => void }}
 */
export function createImageWipe({ over, under, srcFor, reduced = false, initial = null }) {
  const st = { current: initial, pending: null, busy: false };
  let disposed = false;
  const play = () => {
    if (disposed || st.busy || st.pending === null) return;
    const target = st.pending;
    st.pending = null;
    if (target === st.current) return;
    st.busy = true;
    if (reduced) {
      unset(over);
      over.src = srcFor(target);
      st.current = target;
      st.busy = false;
      return;
    }
    unset(under);
    under.src = srcFor(target);
    const ready = under.decode ? under.decode().catch(() => {}) : Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, IMG_DECODE_TIMEOUT_MS))]).then(() => {
      if (disposed) return;
      const out = over.animate(
        [
          { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
          { clipPath: 'inset(0 0 0 50%)', filter: `blur(${IMG_WIPE_EDGE_BLUR_PX}px)`, offset: 0.5 },
          { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
        ],
        { duration: IMG_WIPE_MS, easing: IMG_WIPE_CURVE, fill: 'forwards' },
      );
      out.onfinish = () => {
        unset(over);
        over.src = srcFor(target);
        const overReady = over.decode ? over.decode().catch(() => {}) : Promise.resolve();
        Promise.race([overReady, new Promise((r) => setTimeout(r, IMG_DECODE_TIMEOUT_MS))]).then(() => {
          if (disposed) return;
          out.cancel();
          st.current = target;
          st.busy = false;
          play();
        });
      };
    });
  };
  return {
    request(key) {
      if (key === st.current && st.pending === null) return;
      st.pending = key;
      play();
    },
    /** Adopt a key OUTRIGHT on both layers — for a frame that is not on
     *  show (nothing to wipe from). A run in flight finishes first and
     *  then lands the key through the normal wipe. */
    set(key) {
      if (disposed) return;
      if (st.busy) { st.pending = key; return; }
      st.pending = null;
      if (key === st.current) return;
      unset(over);
      unset(under);
      over.src = srcFor(key);
      under.src = srcFor(key);
      st.current = key;
    },
    current: () => st.current,
    dispose() { disposed = true; },
  };
}
