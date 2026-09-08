/**
 * OUR NETWORK below the seam (mobile rebuild Part 2, 2026-09-08).
 *
 * THE STRIP (1:16): the desktop's five windows become a touch rail — the
 * windows sized to the frame's tile (272.368 on the 264.117 pitch), each
 * image cover-fitting its window (the desktop's inline crops are written
 * over with gsap.set, so the context's revert restores them). The edge
 * gradients (1:572) follow the rail's scroll (rail.js, the section's
 * pseudo-elements).
 *
 * INDUSTRY SELECTION BY TAP: tapping a term selects it — full ink, the rest
 * dimmed (network.css) — and the strip swaps to that industry's set
 * (NETWORK_STRIP_SETS, the desktop's per-industry placeholders). Tapping
 * the selected term again DESELECTS it and the strip returns to the resting
 * set; tapping another term switches. The swap is the desktop strip's own
 * vocabulary: every window gets an under layer carrying the new image; the
 * over layer clips off left → right on the house curve with a 6px blur
 * riding the moving edge, each window delayed by its x across the viewport;
 * then the over layer takes the new image and the under layer waits for
 * the next cycle. A swap requested mid-wipe queues and runs after.
 */
import { gsap } from 'gsap';
import { mobileMatch, tokenPx } from './match.js';
import { bindRailEdges } from './rail.js';
import { asset } from '../../utils/asset.js';
import { NETWORK_STRIP_SETS, NETWORK_STRIP_HOME, NETWORK_STRIP_SLOTS } from '../../data/landing/network-strip-sets.js';

const tokenRaw = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function setFor(key) {
  const base = key === 'all' ? NETWORK_STRIP_HOME : NETWORK_STRIP_SETS[key] || NETWORK_STRIP_HOME;
  const out = [];
  for (let i = 0; i < NETWORK_STRIP_SLOTS; i += 1) out.push(base[i % base.length]);
  return out;
}

const decodeWithin = (img, ms) => Promise.race([
  img.decode().catch(() => {}),
  new Promise((res) => setTimeout(res, ms)),
]);

export function initMobileNetwork() {
  return mobileMatch((ctx) => {
    const section = document.querySelector('[data-landing-network]');
    const strip = document.querySelector('[data-landing-network-strip]');
    const body = document.querySelector('[data-landing-network-body]');
    if (!(section instanceof HTMLElement) || !(strip instanceof HTMLElement)) return;
    const tileW = tokenPx('--m-strip-tile-w');
    const wins = Array.from(strip.querySelectorAll('.landing-network__strip-win'));
    const overs = wins.map((w) => w.querySelector('img')).filter((i) => i instanceof HTMLImageElement);
    /* the windows and images take the frame's geometry (inline, reverted with the context) */
    gsap.set(wins, { width: tileW });
    gsap.set(overs, { width: '100%', height: '100%', left: 0, top: 0, clearProps: 'srcset,sizes' });
    for (const img of overs) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
    /* the under layers, created here and removed on revert */
    const unders = overs.map((over) => {
      const under = document.createElement('img');
      under.alt = ''; under.decoding = 'async'; under.className = 'm-strip-under';
      gsap.set(under, { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' });
      over.parentElement?.insertBefore(under, over);
      return under;
    });
    bindRailEdges(ctx, strip, { host: section });

    /* the swap */
    const wipeMs = parseFloat(tokenRaw('--m-wipe-ms')) || 450;
    const sweepMs = parseFloat(tokenRaw('--m-wipe-sweep-ms')) || 300;
    const edgeBlur = tokenPx('--m-wipe-edge-blur');
    const curve = tokenRaw('--m-ease-house') || 'ease';
    let currentKey = 'all', targetKey = 'all', busy = false, disposed = false;
    const timers = [], anims = [];
    const pump = () => {
      if (busy || targetKey === currentKey || disposed) return;
      busy = true;
      const key = targetKey; const set = setFor(key);
      const vw = window.innerWidth;
      Promise.all(unders.map((u, i) => { u.src = asset(set[i].src); return decodeWithin(u, 1200); })).then(() => {
        if (disposed) return;
        overs.forEach((over, i) => {
          const x = Math.min(Math.max(over.parentElement.getBoundingClientRect().left, 0), vw);
          const delay = Math.round((x / vw) * sweepMs);
          const anim = over.animate([
            { clipPath: 'inset(0 0 0 0%)', filter: 'blur(0px)' },
            { clipPath: 'inset(0 0 0 50%)', filter: `blur(${edgeBlur}px)`, offset: 0.5 },
            { clipPath: 'inset(0 0 0 100%)', filter: 'blur(0px)' },
          ], { duration: wipeMs, delay, easing: curve, fill: 'forwards' });
          anims.push(anim);
          timers.push(setTimeout(() => { over.src = asset(set[i].src); anim.cancel(); }, delay + wipeMs + 30));
        });
        timers.push(setTimeout(() => { currentKey = key; busy = false; pump(); }, sweepMs + wipeMs + 60));
      });
    };
    const terms = body instanceof HTMLElement ? Array.from(body.querySelectorAll('.landing-network__term')) : [];
    const select = (term) => {
      const active = term.classList.contains('is-active');
      terms.forEach((t) => t.classList.toggle('is-active', !active && t === term));
      body.classList.toggle('is-dimming', !active);
      targetKey = active ? 'all' : term.dataset.networkTerm || 'all';
      pump();
    };
    const onClick = (e) => { const t = e.target instanceof Element ? e.target.closest('.landing-network__term') : null; if (t instanceof HTMLElement) { e.preventDefault(); select(t); } };
    body?.addEventListener('click', onClick);
    if (import.meta.env.DEV) window.__mNetwork = () => ({ currentKey, targetKey, busy, srcs: overs.map((o) => o.getAttribute('src')) });
    return () => {
      disposed = true;
      body?.removeEventListener('click', onClick);
      timers.forEach(clearTimeout); anims.forEach((a) => a.cancel());
      unders.forEach((u) => u.remove());
      terms.forEach((t) => t.classList.remove('is-active')); body?.classList.remove('is-dimming');
      if (import.meta.env.DEV) delete window.__mNetwork;
    };
  });
}
