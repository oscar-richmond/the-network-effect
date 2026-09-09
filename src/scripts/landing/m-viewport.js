/**
 * THE PHONE'S VIEWPORT — the small height, and the live bottom edge
 * (item 6, Oscar, 2026-09-09).
 *
 * THE TRADE-OFF THIS RESOLVES. A section pinned against the viewport
 * bottom can be sized in svh (the SMALL viewport — the URL bar present)
 * or dvh (the DYNAMIC one — whatever the bar is doing). svh never
 * re-derives, so the pin's scroll maths hold — but its content sits
 * where the bar WAS: once the bar collapses on the way down the block
 * reads 80px too high (F4's FEATURED WORK). dvh follows the bar — but
 * the platform updates it in ONE step at the end of the bar's
 * animation, and anything sized or placed in it (a sticky top, a
 * padding, a pin's height) jumps by the bar's height mid-flight, and
 * every trigger below it moves. Neither unit is the answer on its own.
 *
 * THE ANSWER: two values, each for what it is good at.
 *
 *   --m-svh    the small viewport in px — measured off a 100svh probe
 *              once (and again on a WIDTH change: orientation), written
 *              on :root. Every pinned section's LENGTH and every sticky
 *              top is derived from it, in CSS (`var(--m-svh, 100svh)`)
 *              and in the drivers (smallViewportPx()), so the scroll
 *              maths never change and the JS and the CSS agree whatever
 *              state the bar was in at load.
 *
 *   --m-vv-dy  how far the ACTUAL visible bottom edge sits below the
 *              small viewport's, in px: visualViewport.offsetTop +
 *              visualViewport.height − --m-svh, clamped 0…M_VV_DY_MAX
 *              (a keyboard shrinking the visual viewport reads 0, not
 *              negative; pinch-zoom is ignored — scale ≠ 1). The bar
 *              present: 0. Collapsed: the bar's height (~80 on an
 *              iPhone, ~56 on Android). Written on each HOST that
 *              asked for it (trackVisibleBottom), never on :root — a
 *              per-frame write on the root would restyle the page.
 *              Each host TRANSLATES its pinned content by it (or by a
 *              function of it: the founders' centred block by half),
 *              a transform — layout untouched, the sticky range and
 *              the pin's length exactly as the svh maths left them.
 *
 * THE GLIDE. iOS Safari reports the collapse in one visualViewport
 * resize at the END of the bar's animation (innerHeight with it);
 * Chrome on Android streams it per frame. Either way the value is
 * eased here, not applied: a CRITICALLY DAMPED SPRING toward the
 * target on requestAnimationFrame (M_VV_GLIDE_OMEGA rad/s — an 80px
 * step starts from rest, peaks at ~410px/s after 70ms and is 95%
 * closed at ~340ms, no overshoot; a streamed value trails the bar by
 * ~2/ω), so the content GLIDES to the new edge rather than snapping —
 * the velocity is continuous at the start (an exponential approach
 * would take its largest step on the first frame), and settles
 * exactly (the last 0.1px is written as the target). The loop runs
 * only while there is distance to close. Reduced motion: no glide —
 * the target is written at once (the content follows the bar the way
 * the platform's own UI does).
 *
 * Phone only: every caller is inside its own isPhoneViewport() branch;
 * nothing here runs on the desktop or the tablet, and the CSS
 * fallbacks (100svh; 0px) are the values the desktop had.
 */

/** the glide's spring rate, rad/s — critically damped; a step is ~95% closed at 4.75/ω ≈ 340ms */
export const M_VV_GLIDE_OMEGA = 14;
/** the largest bar we will follow, px (anything more is not a URL bar) */
export const M_VV_DY_MAX = 240;

let svhPx = 0;
let lastW = 0;
let started = false;
let dy = 0;
let vel = 0;      /* px/s — the spring's state */
let target = 0;
let raf = 0;
let lastT = 0;
const hosts = new Set();
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** the small viewport's height (100svh) in px — a probe, not innerHeight (which is the DYNAMIC height) */
function measureSvh() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  svhPx = h > 0 ? h : (window.innerHeight || 0);
  lastW = window.innerWidth;
  document.documentElement.style.setProperty('--m-svh', `${svhPx.toFixed(2)}px`);
}

/**
 * The small viewport's height in px (measured on first use). The
 * drivers read this where their CSS reads --m-svh so the two agree.
 * @returns {number}
 */
export function smallViewportPx() {
  if (!svhPx) measureSvh();
  return svhPx;
}

/** the visible bottom edge below the small viewport's, px, 0…M_VV_DY_MAX */
function readTarget() {
  const vv = window.visualViewport;
  if (vv && Math.abs((vv.scale || 1) - 1) > 0.01) return target; /* pinch-zoom: hold */
  const bottom = vv ? vv.offsetTop + vv.height : (window.innerHeight || 0);
  return Math.min(M_VV_DY_MAX, Math.max(0, bottom - svhPx));
}

function write(v) {
  const s = `${v.toFixed(2)}px`;
  hosts.forEach((h) => h.style.setProperty('--m-vv-dy', s));
}

function tick(now) {
  raf = 0;
  /* the step in seconds, clamped so a hidden tab's long gap reads as
     one frame rather than a leap */
  const dt = Math.min(0.034, lastT ? (now - lastT) / 1000 : 0.016);
  lastT = now;
  const gap = target - dy;
  if (Math.abs(gap) < 0.1 && Math.abs(vel) < 6) {
    dy = target;
    vel = 0;
    write(dy);
    lastT = 0;
    return;
  }
  /* critically damped, integrated EXACTLY over the frame (stable for
     any dt, and the first frame from rest is the true 2px, not an
     Euler step): d(t) = (d₀ + (v₀ + ω d₀) t)·e^(−ωt), d = dy − target */
  const w = M_VV_GLIDE_OMEGA;
  const d0 = -gap;
  const bCoef = vel + w * d0;
  const e = Math.exp(-w * dt);
  const d1 = (d0 + bCoef * dt) * e;
  vel = (bCoef - w * d0 - w * bCoef * dt) * e;
  dy = target + d1;
  write(dy);
  raf = requestAnimationFrame(tick);
}

function onChange() {
  if (window.innerWidth !== lastW) measureSvh(); /* orientation: a new small viewport */
  target = readTarget();
  if (reduced()) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    dy = target;
    vel = 0;
    write(dy);
    return;
  }
  if (!raf && Math.abs(target - dy) >= 0.1) { lastT = 0; raf = requestAnimationFrame(tick); }
}

function start() {
  if (started) return;
  started = true;
  measureSvh();
  dy = target = readTarget(); /* the load state, applied at once — no glide on arrival */
  const vv = window.visualViewport;
  vv?.addEventListener('resize', onChange);
  vv?.addEventListener('scroll', onChange);
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
}

/**
 * Ask for --m-vv-dy on a host. The host's CSS translates its pinned
 * content by it. The first host starts the tracker.
 * @param {HTMLElement} host
 * @returns {() => void} stop writing to this host (its property is removed)
 */
export function trackVisibleBottom(host) {
  if (!(host instanceof HTMLElement)) return () => {};
  start();
  hosts.add(host);
  host.style.setProperty('--m-vv-dy', `${dy.toFixed(2)}px`);
  return () => {
    hosts.delete(host);
    host.style.removeProperty('--m-vv-dy');
  };
}
