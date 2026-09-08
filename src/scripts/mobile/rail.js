/**
 * THE RAIL EDGES (mobile rebuild Part 2, 2026-09-08) — shared by the
 * founders rail (1:34 / 1:54) and the network strip (1:16 / 1:572): a
 * horizontally scrolling container with a gradient overlay on each edge.
 * The frame draws the far edge only once there is content beyond it, so
 * each overlay's opacity is a pure function of the rail's scroll position:
 * the LEFT one rises over the first --m-rail-edge-l px of scroll, the
 * RIGHT one falls over the last --m-rail-edge-r px. ScrollTriggers on the
 * rail as their scroller (horizontal), scrubbed, reversible; nothing else.
 *
 *   bindRailEdges(ctx, rail, { left, right })          two overlay elements
 *   bindRailEdges(ctx, rail, { host })                 the edges are ::before / ::after on
 *       host, reading --m-rail-edge-l-op / --m-rail-edge-r-op (the strip: no wrapper in the DOM)
 *   … { endPad }                                      trailing inset after the last card (not content)
 */
import { gsap } from 'gsap';
import { tokenPx } from './match.js';

export function bindRailEdges(ctx, rail, { left, right, host, endPad = 0 }) {
  if (!(rail instanceof HTMLElement)) return;
  const edgeL = tokenPx('--m-rail-edge-l'), edgeR = tokenPx('--m-rail-edge-r');
  /* endPad: trailing inset after the last card that is not content — the right edge is gone once the card's end is in */
  const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth - endPad);
  /* what carries each edge's opacity: an overlay's own, or a variable on the host */
  const L = host ? [host, '--m-rail-edge-l-op'] : left ? [left, 'opacity'] : null;
  const R = host ? [host, '--m-rail-edge-r-op'] : right ? [right, 'opacity'] : null;
  /* the idempotent re-entry reset */
  if (L) gsap.set(L[0], { [L[1]]: 0 });
  if (R) gsap.set(R[0], { [R[1]]: max() > 0 ? 1 : 0 });
  rail.scrollLeft = 0;
  ctx.add(() => {
    if (L) gsap.fromTo(L[0], { [L[1]]: 0 }, {
      [L[1]]: 1, ease: 'none', immediateRender: false,
      scrollTrigger: { scroller: rail, horizontal: true, start: 0, end: () => Math.min(edgeL, max()), scrub: true, invalidateOnRefresh: true },
    });
    if (R) gsap.fromTo(R[0], { [R[1]]: 1 }, {
      [R[1]]: 0, ease: 'none', immediateRender: false,
      scrollTrigger: { scroller: rail, horizontal: true, start: () => Math.max(0, max() - edgeR), end: () => max(), scrub: true, invalidateOnRefresh: true },
    });
  });
}
