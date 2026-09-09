/**
 * STRIP AUTO-ADVANCE — OUR NETWORK's photo strip, phone only
 * (item 4, Oscar, 2026-09-09). Used by landing-network.js and by
 * NOTHING else: FEATURED WORK and the other rails do not advance on
 * their own.
 *
 * The strip is a native overflow-x scroller with mandatory start-snap
 * (landing-narrow.css). Once ARMED (the section's arrival has played —
 * the caller says when) and while ON SCREEN, it advances ONE snap stop
 * at a time — the next window's aligned position, so the rest is
 * exactly where a swipe would have left it — on a gentle rhythm, by
 * the platform's own smooth scroll (scrollTo behavior: 'smooth'), so
 * the veils and the indicator follow as they would a finger.
 *
 * THE RULES:
 *   - STOPS PERMANENTLY on the user's touch or swipe: touchstart,
 *     pointerdown, wheel or a key on the strip, or any scroll of the
 *     strip this module did not drive. It never resumes — the user has
 *     taken the strip.
 *   - Does not run under prefers-reduced-motion (a no-op).
 *   - PAUSES while the strip is off screen (IntersectionObserver, 60%
 *     of the strip in the viewport) or the tab is hidden
 *     (visibilitychange), and while the caller disarms it (the
 *     section's content has left back to its parked state); resumes
 *     with a fresh interval when all three are true again.
 *   - Advances one item at a time, respecting the snap: the target is
 *     the next window's snap stop, never a fraction.
 *   - STOPS at the last item — no loop, no rewind. The last stop is the
 *     scroll extent where the last window's aligned position lies
 *     beyond it (the browser clamps such a stop to the extent).
 *
 * @param {HTMLElement} strip     the scroller
 * @param {{ intervalMs?: number }} [opts]
 * @returns {{ arm: (on: boolean) => void, stopped: () => boolean, destroy: () => void }}
 */
export function initStripAutoAdvance(strip, { intervalMs = 2500 } = {}) {
  const noop = { arm: () => {}, stopped: () => true, destroy: () => {} };
  if (!(strip instanceof HTMLElement)) return noop;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;

  let armed = false;
  let onScreen = false;
  let stopped = false;    /* permanent: the user's touch, or the last item */
  let driving = false;    /* a scroll this module started is in flight */
  let timer = 0;
  let settleRaf = 0;
  let graceUntil = 0;     /* the platform may emit one last scroll event after the rest */

  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = 0; } };

  /** the snap stops: each snapping child's start on the scroll-padding line, clamped to the extent */
  const stops = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
    const left = strip.getBoundingClientRect().left;
    const out = [];
    Array.from(strip.children).forEach((c) => {
      if (getComputedStyle(c).scrollSnapAlign === 'none') return;
      const stop = c.getBoundingClientRect().left - left + strip.scrollLeft - pad;
      out.push(Math.min(max, Math.max(0, stop)));
    });
    return out.sort((a, b) => a - b);
  };

  const stop = () => {
    stopped = true;
    clearTimer();
  };

  const settle = (target) => {
    /* the drive is over when the strip rests on the target (or the
       platform's smooth scroll has had its time) */
    const t0 = performance.now();
    const check = () => {
      settleRaf = 0;
      if (Math.abs(strip.scrollLeft - target) < 1 || performance.now() - t0 > 1500) {
        driving = false;
        graceUntil = performance.now() + 150;
        schedule();
        return;
      }
      settleRaf = requestAnimationFrame(check);
    };
    settleRaf = requestAnimationFrame(check);
  };

  const advance = () => {
    timer = 0;
    if (stopped || !armed || !onScreen || document.visibilityState !== 'visible') return;
    const here = strip.scrollLeft;
    const next = stops().find((s) => s > here + 1);
    if (next === undefined) { stop(); return; } /* the last item: done */
    driving = true;
    strip.scrollTo({ left: next, behavior: 'smooth' });
    settle(next);
  };

  const schedule = () => {
    clearTimer();
    if (stopped || !armed || !onScreen || driving || document.visibilityState !== 'visible') return;
    timer = window.setTimeout(advance, intervalMs);
  };

  /* the user's hand: permanent */
  const onUser = () => stop();
  const onScroll = () => { if (!driving && performance.now() > graceUntil) stop(); };
  strip.addEventListener('touchstart', onUser, { passive: true });
  strip.addEventListener('pointerdown', onUser, { passive: true });
  strip.addEventListener('wheel', onUser, { passive: true });
  strip.addEventListener('keydown', onUser);
  strip.addEventListener('scroll', onScroll, { passive: true });

  /* on screen / off screen */
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      onScreen = !!e && e.isIntersecting && e.intersectionRatio >= 0.6;
      schedule();
    }, { threshold: [0, 0.6, 1] })
    : null;
  if (io) io.observe(strip); else onScreen = true;

  const onVisibility = () => schedule();
  document.addEventListener('visibilitychange', onVisibility);

  return {
    arm(on) {
      armed = !!on;
      schedule();
    },
    stopped: () => stopped,
    destroy() {
      clearTimer();
      if (settleRaf) cancelAnimationFrame(settleRaf);
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      strip.removeEventListener('touchstart', onUser);
      strip.removeEventListener('pointerdown', onUser);
      strip.removeEventListener('wheel', onUser);
      strip.removeEventListener('keydown', onUser);
      strip.removeEventListener('scroll', onScroll);
    },
  };
}
