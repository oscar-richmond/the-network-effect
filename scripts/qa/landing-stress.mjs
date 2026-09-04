#!/usr/bin/env node
/**
 * LANDING STRESS HARNESS — dev-only (never shipped: lives outside src/).
 *
 * Randomised scroll sessions against the dev server, asserting the
 * landing's state-purity invariants after EVERY move. Built for the
 * intermittent bugs of 2026-09-03 (the Featured Work edge gradient
 * escaping its section; What We Do's text vanishing on scroll-up) —
 * both were residue: state that was not a pure function of scroll.
 *
 *   node scripts/qa/landing-stress.mjs [--vp 1728x1117] [--moves 250]
 *        [--seed 1] [--base http://localhost:4321] [--out report.json]
 *
 * INVARIANTS (checked ~80ms after each move and again after any pause):
 *   G1  the Featured edge gradient (the GradualBlur band + the edge
 *       tint) has computed opacity 0 unless the Featured stage's ground
 *       is >= 85% dark (luminance <= 54.4 on the 238 -> 22 scale);
 *   G2  while visible, the band lies inside the Featured section's box
 *       and never overlaps the We Create Access section;
 *   T1  while the What We Do stage is on screen and NOT in its exit
 *       cascade, every risen pillar's title / index / description and
 *       the WHAT WE DO label read opacity >= 0.98, no blur, visible;
 *       the top (uncovered) pillar's list rows the same;
 *   T2  every word-reveal clip inside a risen pillar carries lr-visible
 *       (a played entrance never un-plays);
 *   R1  residue drift: with NO scroll input for 350ms while a section is
 *       fully off-screen, none of its watched elements' inline styles
 *       change (an orphaned tween / loop would).
 *   I1  (R29, the IMMERSE-over-FROM-ACCESS recurrence) while the FROM
 *       ACCESS / TO IMPACT statement is on screen, the IMMERSE panel's top
 *       never sits above the statement's box bottom — the panel may only
 *       rise once the statement has travelled out (by construction the
 *       two never cross on a forward pass);
 *   I2  continuity: between consecutive samples of one move, the three
 *       panels' and the intro's transforms move no faster than their
 *       scrubs' steepest rate allows for the scroll delta (a discontinuity
 *       = a stale value being replaced by a re-measured one).
 *
 * --focus immerse: full down-up-down cycles through What We Do at random
 *   pace and depth (the reported reproduction sequence), sampling every
 *   wheel step for I2.
 *   H1  (R31, the hero -> Who We Are boundary) whenever WHO WE ARE's
 *       first ink (its label) is inside the viewport, the hero ground
 *       has finished fading (luminance <= 22 + 2) — no light ground
 *       under the incoming ink, either direction;
 *   H2  whenever the Who We Are section's top edge is inside the
 *       viewport, its computed background equals the hero ground's
 *       (the R27 seam class — one colour every frame).
 * --focus hero: cycles across that boundary (from the cards' rest to
 *   Who We Are landed and back) at random pace, sampling every step.
 *
 * --page work (R34): the /work list view — W1 docked meta cap top level
 *   with its image, W2 no readable overlap, W3 purity, W4 tile pitch and
 *   continuity.
 *
 * --page work --focus switch (R35): the /work list <-> grid switch —
 *   W1 listener balance flat across cycles, W2 one cursor instance,
 *   W3 the right machinery per view (list handle / Lenis / stage /
 *   body overflow), W4 ScrollTrigger count flat, W5 aria-pressed.
 *
 * --page modal --route <path> (R40): the START A PROJECT modal's lifecycle
 *     from every trigger on the page — M1 open/close clean, M2 focus
 *     returns, M3 listener balance flat, M4 one modal at a time, M5 the
 *     trap holds.
 * --page case --case <slug> (R37): a case study's random walk with the
 *     floating START A PROJECT chip's invariants X1–X5 (hidden at the
 *     top / shown in range / hidden past the last image / never two
 *     states / 40-40 position stable) plus N1 and page errors.
 * --page services (R36): the /services random walk with the shared R36
 *     checks — N1 the bottom nav sweep, C1–C6 the closing statement band
 *     (grounds equal / white→red bounds / monotonic / nav-over-red / dwell /
 *     tail ≥ vh − 830), S7 one scroll-active row per table. N1 and C1–C6
 *     also ride the landing mode's every snapshot; N1 rides the founders
 *     mode's pauses on the driver's pos.
 * --page founders (R30): the /founders virtual-scroll driver instead of
 *   the landing. Randomised wheel passes over its whole axis, asserting
 *   after every move:
 *     F1  the two text blocks' opacities SUM to 1 (±0.02) — the
 *         crossfade can never leave the screen empty;
 *     F2  they are never BOTH fully visible (both >= 0.99);
 *     F3  the closing sweep is invisible before its phase, spans the
 *         full width at and after its end, and its clip is monotonic
 *         in pos (no jump between adjacent samples);
 *     F4  the indicator's divider and label keep mix-blend-mode
 *         difference through their blur-fade (a wrapper-level fade
 *         would isolate them);
 *     F5  state purity: leaving a position and returning to it
 *         reproduces the same opacities, clip and transforms;
 *     F6  (R32) the band's top and height equal the portrait's at every
 *         frame, it is full width once the sweep is complete, and it
 *         carries no filter (crisp edges);
 *     F7  (R32) through the footer reveal the ground below the band is
 *         exactly the deliberate strip (stage bottom − band bottom =
 *         viewport bottom − portrait bottom), and the footer row's
 *         scrubbed items never run out of stagger order.
 *
 * Playwright is resolved from the repo's node_modules (dev tooling).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const [W, H] = arg('--vp', '1728x1117').split('x').map(Number);
const MOVES = Number(arg('--moves', 250));
const SEED = Number(arg('--seed', 1));
const BASE = arg('--base', 'http://localhost:4321');
const OUT = arg('--out', '');
const SHOT_DIR = arg('--shots', '');

let seed = SEED; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a, b) => a + rnd() * (b - a);

const PAGE = arg('--page', 'landing');
const FOCUS = arg('--focus', '');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
const pageErrs = []; p.on('pageerror', (e) => pageErrs.push(String(e.message).slice(0, 120)));
const CASE = arg('--case', 'wilderness-reserve');
const ROUTE = arg('--route', '/');
await p.goto(BASE + (PAGE === 'founders' ? '/founders?splash=0&forcehover' : PAGE === 'work' ? '/work?splash=0&forcehover' : PAGE === 'services' ? '/services?splash=0&forcehover' : PAGE === 'case' ? `/work/${CASE}?splash=0&forcehover` : PAGE === 'modal' ? `${ROUTE}${ROUTE.includes('?') ? '&' : '?'}splash=0&forcehover` : '/?splash=0&forcehover'), { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(3500);
const s = W >= 1728 ? 1 : W / 1728;
const f = () => p.frames().find((fr) => fr.url().includes('framed=1')) ?? p.mainFrame();

/* ══ R36 (2026-09-04) — SHARED BOTTOM / CLOSING CHECKS (every page mode) ══
   N1  (item 1) at the page's bottom (y ≥ max − 2, settled) all three centred
       nav links are swept (every char carries nav-char-out, tabindex −1);
       away from it (y < max − 64, settled) none is (no nav-char-out, no
       tabindex) — the shared binder / applier on every page;
   C1  (item 7) the closing statement's three grounds (section, stage, tail)
       read the same colour at every frame (one tween);
   C2  white (238,238,240) before the fade's start, red (193,37,14) after
       its end; C3 the ground only moves towards red as y grows (and back as
       it shrinks) inside the fade; C4 the nav is solid (is-over-red) exactly
       while the band covers the nav's midpoint; C5 the stage holds one
       viewport top through the fade (the dwell); C6 the tail's bottom never
       rises above vh − 830 (the footer exposes at most its own height). */
const R36STATE = `(() => {
  const links = [...document.querySelectorAll('.home__nav-link')]; const units = (a) => [...a.querySelectorAll('.cr-char')];
  const linkSt = links.map((a) => { const u = units(a); return { out: u.length > 0 && u.every((c) => c.classList.contains('nav-char-out')), anyOut: u.some((c) => c.classList.contains('nav-char-out')), ti: a.getAttribute('tabindex') }; });
  const st = document.querySelector('[data-closing-st]'); const stage = st ? st.querySelector('[data-closing-st-stage]') : null; const tail = document.querySelector('[data-closing-tail]'); const tb = document.querySelector('.home__topbar');
  const rgb = (c) => { const m = /rgba?\\((\\d+), (\\d+), (\\d+)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
  const cl = (st && stage && tail && getComputedStyle(st).display !== 'none') ? { top: +st.getBoundingClientRect().top.toFixed(1), sec: rgb(getComputedStyle(st).backgroundColor), stg: rgb(getComputedStyle(stage).backgroundColor), tl: rgb(getComputedStyle(tail).backgroundColor), stageTop: +stage.getBoundingClientRect().top.toFixed(1), tailB: +tail.getBoundingClientRect().bottom.toFixed(1), overRed: tb ? tb.classList.contains('is-over-red') : null, navY: tb ? tb.getBoundingClientRect().height * 0.5 : 35.5, fade: (window.__closingStatement && window.__closingStatement.fade) ? window.__closingStatement.fade() : null } : null;
  const tables = [...document.querySelectorAll('.sv6-table')].map((t) => t.querySelectorAll('[data-sv-row].is-sactive').length);
  return { y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, vh: innerHeight, links: linkSt, cl, tables }; })()`;
let r36Engage = null; let r36Prev = null; let r36Checks = 0;
const r36Checks_ = (bs, tag, pos, push) => {
  r36Checks += 1; const settled = /settled|pause|landed|back|top|after-move/.test(tag) && !/mid/.test(tag);
  const y = pos ? pos.y : bs.y, max = pos ? pos.max : bs.max;
  if (settled && bs.links.length === 3) {
    if (y >= max - 2 && !bs.links.every((l) => l.out && l.ti === '-1')) push({ inv: 'N1', tag, y, msg: 'nav not swept at the bottom', links: bs.links });
    if (y < max - 64 && bs.links.some((l) => l.anyOut || l.ti !== null)) push({ inv: 'N1', tag, y, msg: 'nav still swept away from the bottom', links: bs.links });
  }
  const c = bs.cl; if (c && c.sec && c.stg && c.tl) {
    const eq = (a, b2) => a && b2 && a.every((v, i) => Math.abs(v - b2[i]) <= 1);
    if (!eq(c.sec, c.stg) || !eq(c.sec, c.tl)) push({ inv: 'C1', tag, y, msg: 'closing grounds differ', sec: c.sec, stg: c.stg, tl: c.tl });
    if (c.fade) { const [f0, f1] = c.fade;
      if (bs.y <= f0 - 1 && !eq(c.sec, [238, 238, 240])) push({ inv: 'C2', tag, y, msg: 'closing ground not white before the fade', sec: c.sec, fade: c.fade });
      if (bs.y >= f1 + 1 && !eq(c.sec, [193, 37, 14])) push({ inv: 'C2', tag, y, msg: 'closing ground not red after the fade', sec: c.sec, fade: c.fade });
      if (r36Prev && r36Prev.cl && r36Prev.cl.sec && bs.y >= f0 && bs.y <= f1 && r36Prev.y >= f0 && r36Prev.y <= f1) { const dy = bs.y - r36Prev.y; const dg = c.sec[1] - r36Prev.cl.sec[1]; if ((dy > 0 && dg > 1) || (dy < 0 && dg < -1)) push({ inv: 'C3', tag, y, msg: 'closing ground moved against the scroll inside the fade', dy, from: r36Prev.cl.sec, to: c.sec }); }
      if (bs.y >= f0 && bs.y <= f1) { if (r36Engage == null) r36Engage = c.stageTop; else if (Math.abs(c.stageTop - r36Engage) > 1.5) push({ inv: 'C5', tag, y, msg: 'statement stage moved during the fade (dwell broken)', stageTop: c.stageTop, engage: r36Engage }); }
    }
    /* C4 reads at settled samples only: the switch rides the scroll event, one frame behind a mid-glide rect read (the switch point is where both nav readings coincide, so the lag is invisible by construction) */
    const expect = c.top <= c.navY && c.tailB > c.navY; if (settled && c.overRed !== null && c.overRed !== expect) push({ inv: 'C4', tag, y, msg: 'nav-over-red state differs from the band covering the nav midpoint', overRed: c.overRed, top: c.top, tailB: c.tailB, navY: c.navY });
    if (c.tailB < bs.vh - 830 - 1.5) push({ inv: 'C6', tag, y, msg: 'tail bottom above vh − 830 (footer over-exposed)', tailB: c.tailB, vh: bs.vh });
  }
  if (bs.tables.some((n) => n > 1)) push({ inv: 'S7', tag, y, msg: 'more than one scroll-active row in a table', tables: bs.tables });
  r36Prev = bs;
};

/* ══ R34 — /work MODE (the list view's fixed-viewport driver) ═════
   W1  the DOCKED meta's title cap top is level with its image's top
       (±1.5): the column's origin and the dock relation are one rule;
   W2  no two meta units overlap while both are readable (opacity >
       0.05 on their titles) — the wipe clears the outgoing before the
       incoming reaches it;
   W3  purity: the same position reproduces the same tile y and docked
       index;
   W4  tiles keep their pitch (every adjacent pair exactly PITCH apart)
       and never jump between adjacent samples faster than the input. */
if (PAGE === 'work' && FOCUS !== 'switch') {
  const WSTATE = `(() => {
    const st = window.__workPage ? window.__workPage.state() : null; if (!st) return { st: null };
    const num = (v) => { const m = /matrix\\([^)]+\\)/.exec(v); return m ? +m[0].split(',').slice(-1)[0].replace(')', '') : 0; };
    const tiles = [...document.querySelectorAll('.work-tile')].map((t) => +t.getBoundingClientRect().top.toFixed(1));
    const units = [...document.querySelectorAll('.work-meta-unit')].map((u) => { const t = u.querySelector('.work-page__meta-title'); const r = u.getBoundingClientRect(); const tr = t.getBoundingClientRect(); const cs = getComputedStyle(t); return { top: +r.top.toFixed(1), titleTop: +tr.top.toFixed(1), titleBottom: +tr.bottom.toFixed(1), descBottom: +u.querySelector('.work-page__meta-desc').getBoundingClientRect().bottom.toFixed(1), op: +cs.opacity, vis: cs.visibility }; });
    /* the cap inset from the same metrics the driver uses */
    const t0 = document.querySelector('.work-page__meta-title'); let capInset = 0; if (t0) { const cs = getComputedStyle(t0); const c = document.createElement('canvas').getContext('2d'); c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const m = c.measureText('H'); capInset = (parseFloat(cs.lineHeight) - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent; }
    return { st, tiles, units, capInset: +capInset.toFixed(2), vh: innerHeight }; })()`;
  const snap = () => f().evaluate(WSTATE);
  const first = await snap();
  if (!first.st) { console.log(JSON.stringify({ vp: `${W}x${H}`, page: 'work', error: 'no __workPage handle (dev build only)' })); await b.close(); process.exit(2); }
  const PITCH = first.tiles.length > 1 ? +(first.tiles[1] - first.tiles[0]).toFixed(1) : 624;
  const viol = []; const hist = []; const seen = new Map(); let prev = null; let wchecks = 0;
  const check = (st, tag) => {
    wchecks += 1; const pos = Math.round(st.st.pos);
    const d = st.st.dockedIdx;
    if (st.st.pos <= st.st.carouselMax) {
      /* W1 — a RIDING unit (its image has not reached the dock) keeps its cap top level with its image top; a PINNED unit's image has passed it (the dock relation is the same rule the column's origin is derived from) */
      st.units.forEach((u, i) => { const capTop = u.titleTop + st.capInset; const tileTop = st.tiles[i]; if (tileTop == null) return; const riding = tileTop > capTop + 1.5; if (riding && Math.abs(capTop - tileTop) > 1.5) viol.push({ inv: 'W1', tag, pos, msg: 'riding meta cap top not level with its image top', unit: i, capTop: +capTop.toFixed(1), tileTop }); });
    }
    /* W2 — the overtake wipe's contract (META_WIPE_LEAD 40 / SPAN 60, unchanged by R34 and measured identical on the pre-R34 code): a pinned title is at most 1 − 40/60 ≈ 0.34 when the incoming title's top first touches its bottom, and fully gone (≤ 0.02) by the time the incoming top reaches the pinned title's top. A pinned title above 0.4 under any intrusion, or still readable once overtaken to its top, is a real overlap. */
    for (let i = 0; i < st.units.length - 1; i++) { const a = st.units[i], b2 = st.units[i + 1]; if (a.vis === 'hidden' || b2.vis === 'hidden' || b2.op <= 0.05) continue; const intrusion = a.titleBottom - b2.titleTop; if (intrusion > 1 && b2.titleTop > a.titleTop - 1 && a.op > 0.4) viol.push({ inv: 'W2', tag, pos, msg: 'pinned title still readable under the incoming title', a: i, b: i + 1, intrusion: +intrusion.toFixed(1), aOp: a.op }); if (b2.titleTop <= a.titleTop + 1 && b2.titleTop > a.titleTop - 40 && a.op > 0.02) viol.push({ inv: 'W2', tag, pos, msg: 'pinned title not gone once overtaken to its top', a: i, b: i + 1, aOp: a.op }); }
    for (let i = 1; i < st.tiles.length; i++) if (Math.abs((st.tiles[i] - st.tiles[i - 1]) - PITCH) > 0.6) viol.push({ inv: 'W4', tag, pos, msg: 'tile pitch broken', i, delta: +(st.tiles[i] - st.tiles[i - 1]).toFixed(1), pitch: PITCH });
    if (prev && Math.abs(st.tiles[0] - prev.tiles[0]) > Math.abs(st.st.pos - prev.st.pos) + 2) viol.push({ inv: 'W4', tag, pos, msg: 'tile jumped faster than the position moved', from: prev.tiles[0], to: st.tiles[0], dPos: +(st.st.pos - prev.st.pos).toFixed(1) });
    if (Math.abs(st.st.pos - st.st.targetPos) < 0.5) { const key = Math.round(st.st.pos / 25) * 25; const sig = { pos: st.st.pos, t0: st.tiles[0], d }; const was = seen.get(key); if (was) { const dPos = Math.abs(sig.pos - was.pos); if (Math.abs(sig.t0 - was.t0) > dPos + 1) viol.push({ inv: 'W3', tag, pos, msg: 'same position, different tile y', was: was.t0, now: sig.t0 }); if (sig.d !== was.d && dPos < 5) viol.push({ inv: 'W3', tag, pos, msg: 'same position, different docked index', was: was.d, now: sig.d }); } else seen.set(key, sig); }
    prev = st;
  };
  for (let i = 0; i < MOVES; i++) {
    const kind = rnd(); const dir = rnd() < 0.5 ? -1 : 1; const dist = Math.round(pick(60, 1600));
    if (kind < 0.15) { await p.mouse.wheel(0, dir * dist); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3))); hist.push(`rev ${dir * dist}`); }
    else { const steps = Math.round(pick(1, 5)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps)); await p.waitForTimeout(Math.round(pick(10, 45))); check(await snap(), 'mid'); } hist.push(`wheel ${dir * dist}/${steps}`); }
    await p.waitForTimeout(260); check(await snap(), 'settled');
    if (rnd() < 0.25) { await p.waitForTimeout(Math.round(pick(200, 700))); check(await snap(), 'pause'); }
  }
  const summary = { vp: `${W}x${H}`, page: 'work', moves: MOVES, seed: SEED, maxPos: first.st.maxPos, checks: wchecks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}

/* ══ R35 — /work VIEW-SWITCH MODE (--page work --focus switch) ═══════
   LIST is the fixed-viewport driver, GRID a normal document; the view
   controller must tear one down completely before booting the other.
   The page's EventTarget add/remove are instrumented at load so the
   live-listener balance can be read after every switch. Asserts:
     W1 listener balance flat: after the first full cycle the net
        (adds − removes) is identical after every later cycle in the
        same view;
     W2 exactly one cursor instance live in either view;
     W3 in grid view the list handle (__workPage) is null, Lenis is on
        (html.lenis), the stage is display:none and the body scrolls;
        in list view the reverse (no Lenis, the handle present, the
        wrap hidden);
     W4 ScrollTrigger count flat per view;
     W5 no page errors; the toggle's aria-pressed matches the view;
     W6 (R39) the shared header and the toggle chips hold one signature
        (position, width, opacity, filter) through every switch. */
if (PAGE === 'work' && FOCUS === 'switch') {
  await f().evaluate(() => {
    const w = window; w.__lc = { add: 0, remove: 0 };
    const A = EventTarget.prototype.addEventListener, R = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (...a) { w.__lc.add++; return A.apply(this, a); };
    EventTarget.prototype.removeEventListener = function (...a) { w.__lc.remove++; return R.apply(this, a); };
  });
  const WSTATE = `(() => { const st = getComputedStyle(document.querySelector('.work-stage')); const hdr = document.querySelector('[data-work-header]'); const hcs = hdr ? getComputedStyle(hdr) : null; const H = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, +cs.opacity, cs.filter, cs.visibility].join('|'); }; const hdrSig = hdr ? [H(hdr), ...[...hdr.querySelectorAll('.work-page__hl')].map(H), ...[...document.querySelectorAll('[data-work-viewtoggle] button')].map(H)].join(' ; ') : null; return { hdrSig, view: window.__workView?.view(), switching: !!window.__workView?.switching(), pressed: [...document.querySelectorAll('[data-work-view]')].map((b) => b.dataset.workView + ':' + b.getAttribute('aria-pressed')).join(' '), lc: window.__lc ? window.__lc.add - window.__lc.remove : null, cursors: window.__viewCaseCursorCount || 0, listHandle: !!window.__workPage, gridHandle: !!window.__workGrid, lenis: document.documentElement.classList.contains('lenis'), stageDisplay: st.display, bodyOverflow: getComputedStyle(document.body).overflow, st: (window.gsap && window.ScrollTrigger) ? ScrollTrigger.getAll().length : (window.__workPage?.gsap?.globals?.().ScrollTrigger?.getAll?.().length ?? null), scrollY: Math.round(scrollY), gridVisible: [...document.querySelectorAll('[data-work-gtile]')].filter((t) => t.classList.contains('is-visible')).length }; })()`;
  const wsnap = () => f().evaluate(WSTATE);
  const viol = []; const hist = []; const baseline = { list: null, grid: null };
  let wchecks = 0;
  const check = (st, tag) => { wchecks += 1;
    if (st.switching) return;
    const v = st.view;
    if (!v) { viol.push({ inv: 'W5', tag, msg: 'no view controller handle' }); return; }
    if (st.cursors !== 1) viol.push({ inv: 'W2', tag, view: v, msg: 'cursor instances != 1', cursors: st.cursors });
    if (v === 'grid') { if (st.listHandle) viol.push({ inv: 'W3', tag, view: v, msg: 'list driver handle present in grid view' }); if (!st.lenis) viol.push({ inv: 'W3', tag, view: v, msg: 'Lenis absent in grid view' }); if (st.stageDisplay !== 'none') viol.push({ inv: 'W3', tag, view: v, msg: 'stage displayed in grid view', display: st.stageDisplay }); if (st.bodyOverflow === 'hidden') viol.push({ inv: 'W3', tag, view: v, msg: 'body overflow hidden in grid view' }); if (!st.gridHandle) viol.push({ inv: 'W3', tag, view: v, msg: 'grid handle absent in grid view' }); }
    else { if (!st.listHandle) viol.push({ inv: 'W3', tag, view: v, msg: 'list driver handle absent in list view' }); if (st.lenis) viol.push({ inv: 'W3', tag, view: v, msg: 'Lenis present in list view' }); if (st.stageDisplay === 'none') viol.push({ inv: 'W3', tag, view: v, msg: 'stage hidden in list view' }); if (st.gridHandle) viol.push({ inv: 'W3', tag, view: v, msg: 'grid handle present in list view' }); }
    const exp = v === 'grid' ? 'list:false grid:true' : 'list:true grid:false';
    if (st.pressed !== exp) viol.push({ inv: 'W5', tag, view: v, msg: 'aria-pressed mismatch', pressed: st.pressed });
    /* the instrumentation starts after the initial view booted, so its
       own listeners are invisible until it has been torn down once —
       a view's baseline is its first visit AFTER a switch */
    if (tag === 'boot') return;
    if (baseline[v] == null) baseline[v] = { lc: st.lc, st: st.st };
    else { if (st.lc !== baseline[v].lc) viol.push({ inv: 'W1', tag, view: v, msg: 'listener balance drifted', was: baseline[v].lc, now: st.lc }); if (st.st !== baseline[v].st) viol.push({ inv: 'W4', tag, view: v, msg: 'ScrollTrigger count drifted', was: baseline[v].st, now: st.st }); }
  };
  const clickView = async (v) => { const btn = await f().$(`[data-work-view="${v}"]`); if (btn) await btn.click(); };
  /* W6 (R39 item 3): the shared header (title lines) and the toggle chips keep one signature — position, width, opacity 1, no filter — at every sample DURING a switch (polled every 40ms) and after it */
  let hdrBaseline = null; let w6checks = 0;
  const w6 = (st, tag) => { if (st.hdrSig == null) return; w6checks += 1; if (hdrBaseline == null) { hdrBaseline = st.hdrSig; return; } if (st.hdrSig !== hdrBaseline) viol.push({ inv: 'W6', tag, msg: 'header / toggle signature changed', was: hdrBaseline, now: st.hdrSig }); };
  const settleSwitch = async () => { for (let k = 0; k < 150; k++) { await p.waitForTimeout(40); const st = await wsnap(); w6(st, 'mid-switch'); if (!st.switching) return st; } return wsnap(); };
  { const st0 = await wsnap(); check(st0, 'boot'); await p.waitForTimeout(2500); w6(await wsnap(), 'boot'); }
  /* the first cycle sets the per-view baselines (a boot registers K listeners, a teardown removes K) */
  for (let i = 0; i < MOVES; i++) {
    const st0 = await wsnap(); const next = st0.view === 'grid' ? 'list' : 'grid';
    await clickView(next); const st = await settleSwitch(); hist.push(`switch -> ${next}`); check(st, 'after-switch'); w6(st, 'after-switch');
    /* scroll about in the new view */
    const n = Math.round(pick(1, 5)); for (let k = 0; k < n; k++) { await p.mouse.wheel(0, (rnd() < 0.7 ? 1 : -1) * Math.round(pick(200, 1800)) * s); await p.waitForTimeout(Math.round(pick(40, 200))); }
    await p.waitForTimeout(Math.round(pick(150, 500)));
    check(await wsnap(), 'after-scroll');
    if (rnd() < 0.15) { /* a rapid double-click: the second must be ignored while switching */ await clickView(st.view === 'grid' ? 'list' : 'grid'); await p.waitForTimeout(60); await clickView(st.view); await settleSwitch(); check(await wsnap(), 'after-rapid'); }
  }
  const summary = { vp: `${W}x${H}`, page: 'work', focus: 'switch', moves: MOVES, seed: SEED, checks: wchecks + w6checks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), baseline, pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}

/* ══ R30 — /founders MODE ═══════════════════════════════════════════
   The page is a VIRTUAL scroller (its own wheel-driven axis, no
   document scroll), so the moves are wheel input over the body and the
   state is read from the driver's own DEV handle plus computed style. */
if (PAGE === 'founders') {
  const FSTATE = `(() => {
    const q = (s2) => document.querySelector(s2);
    const num = (v) => { const m = /matrix\\([^)]+\\)/.exec(v); return m ? +m[0].split(',').slice(-1)[0].replace(')', '') : 0; };
    const sl = [...document.querySelectorAll('[data-fd-slide]')].map((el) => { const cs = getComputedStyle(el);
      return { op: +cs.opacity * (cs.visibility === 'hidden' ? 0 : 1), rawOp: +cs.opacity, vis: cs.visibility, y: +num(cs.transform).toFixed(1) }; });
    const sw = q('[data-fd-sweep]'); const scs = sw ? getComputedStyle(sw) : null;
    const clipPct = scs ? (/inset\\(0px ([\\d.]+)%/.exec(scs.clipPath) ? +/inset\\(0px ([\\d.]+)%/.exec(scs.clipPath)[1] : (scs.clipPath.includes('0%') ? 0 : null)) : null;
    const div = q('.fd-ind__divider'); const lab = q('[data-fd-label]');
    const track = q('[data-fd-coltrack]');
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: +r.top.toFixed(1), b: +r.bottom.toFixed(1), l: +r.left.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const stageEl = q('.fd-stage');
    return { st: window.__founders ? window.__founders.state() : null,
      band: R(sw), portrait: R(q('[data-fd-portrait]')), sweepFilter: scs ? scs.filter : null, vw: innerWidth, vh: innerHeight,
      stageBottom: stageEl ? +stageEl.getBoundingClientRect().bottom.toFixed(1) : null,
      stageClipB: stageEl ? (+(/inset\\(0px 0px ([\\d.]+)px(?: 0px)?\\)/.exec(getComputedStyle(stageEl).clipPath) || [0, 0])[1]) : 0,
      rowOps: [...document.querySelectorAll('[data-footer-row-scrub] .landing-footer__ritem')].map((e) => +getComputedStyle(e).opacity),
      slides: sl, sweepVisible: scs ? scs.visibility !== 'hidden' : false, sweepRemain: clipPct,
      divBlend: div ? getComputedStyle(div).mixBlendMode : null, labBlend: lab ? getComputedStyle(lab).mixBlendMode : null,
      divOp: div ? +getComputedStyle(div).opacity : null,
      colY: track ? +num(getComputedStyle(track).transform).toFixed(1) : null,
      errs: [] }; })()`;
  const snap = () => f().evaluate(FSTATE);
  const first = await snap();
  if (!first.st) { console.log(JSON.stringify({ vp: `${W}x${H}`, page: 'founders', error: 'no __founders handle (dev build only)' })); await b.close(); process.exit(2); }
  const MAX = first.st.maxPos;
  const viol = []; const hist = []; const seen = new Map();
  let prev = null; let fchecks = 0;
  const check = (st, tag) => {
    fchecks += 1;
    const [r, a] = st.slides;
    const inText = st.st.pos > st.st.textStart && st.st.pos < st.st.textEnd;
    const sum = r.op + a.op;
    if (inText && Math.abs(sum - 1) > 0.02) viol.push({ inv: 'F1', tag, pos: Math.round(st.st.pos), msg: 'text opacities do not sum to 1', robbo: r.op, ashley: a.op, sum: +sum.toFixed(3) });
    if (r.op >= 0.99 && a.op >= 0.99) viol.push({ inv: 'F2', tag, pos: Math.round(st.st.pos), msg: 'both blocks fully visible', robbo: r.op, ashley: a.op });
    if (st.st.pos < st.st.sweepStart - 1 && st.sweepVisible) viol.push({ inv: 'F3', tag, pos: Math.round(st.st.pos), msg: 'sweep visible before its phase', remain: st.sweepRemain });
    if (st.st.pos >= st.st.sweepEnd + 1 && !(st.sweepVisible && st.sweepRemain === 0)) viol.push({ inv: 'F3', tag, pos: Math.round(st.st.pos), msg: 'sweep not edge to edge at/after its end', visible: st.sweepVisible, remain: st.sweepRemain });
    if (prev && st.sweepRemain != null && prev.sweepRemain != null) {
      const dPos = Math.abs(st.st.pos - prev.st.pos); const dClip = Math.abs(st.sweepRemain - prev.sweepRemain);
      /* the clip moves 100% over FD_SWEEP_PX of pos; allow the rate plus slack */
      const maxClip = (dPos / (st.st.sweepEnd - st.st.sweepStart)) * 100 + 2;
      if (dClip > maxClip) viol.push({ inv: 'F3', tag, pos: Math.round(st.st.pos), msg: 'sweep clip discontinuity', from: prev.sweepRemain, to: st.sweepRemain, dPos: Math.round(dPos) });
    }
    if (st.divBlend !== 'difference' || st.labBlend !== 'difference') viol.push({ inv: 'F4', tag, pos: Math.round(st.st.pos), msg: 'indicator blend isolated', divBlend: st.divBlend, labBlend: st.labBlend });
    /* F6 (R32) — the band IS the portrait's box: same top and height at every frame, full width once the sweep is complete, no filter */
    if (st.band && st.portrait) {
      if (Math.abs(st.band.t - st.portrait.t) > 1 || Math.abs(st.band.h - st.portrait.h) > 1) viol.push({ inv: 'F6', tag, pos: Math.round(st.st.pos), msg: 'band top/height differ from the portrait', band: st.band, portrait: st.portrait });
      if (st.st.pos >= st.st.sweepEnd + 1 && (st.band.l > 1 || st.band.w < st.vw - 1)) viol.push({ inv: 'F6', tag, pos: Math.round(st.st.pos), msg: 'band not full width after the sweep', band: st.band });
      if (st.sweepFilter && st.sweepFilter !== 'none') viol.push({ inv: 'F6', tag, pos: Math.round(st.st.pos), msg: 'sweep carries a filter (edges must be crisp)', filter: st.sweepFilter });
    }
    /* F7 (R32; R36 item 3) — through the footer reveal the VISIBLE ground below the band is the strip collapsing first (max(0, strip − reveal): the stage's bottom edge clips up through it while the band holds), then zero — the band's bottom edge is the reveal line; the footer's exposure equals the reveal throughout; and the row items stay in stagger order */
    if (st.band && st.portrait && st.st.pos > st.st.footerStart) {
      /* the portrait rides the stage during the reveal, so its RESTING bottom is 80 + its height, not its live rect */
      const reveal = Math.min(st.st.pos - st.st.footerStart, 830);
      const strip0 = st.vh - (80 + st.portrait.h);
      const visibleBottom = st.stageBottom - (st.stageClipB || 0);
      const ground = visibleBottom - st.band.b; const expected = Math.max(0, strip0 - reveal);
      if (Math.abs(ground - expected) > 1.5) viol.push({ inv: 'F7', tag, pos: Math.round(st.st.pos), msg: 'ground below the band differs from the collapsing strip during the reveal', ground: +ground.toFixed(1), expected: +expected.toFixed(1), reveal: +reveal.toFixed(1) });
      const exposed = st.vh - visibleBottom;
      if (Math.abs(exposed - reveal) > 1.5) viol.push({ inv: 'F7', tag, pos: Math.round(st.st.pos), msg: 'footer exposure differs from the reveal', exposed: +exposed.toFixed(1), reveal: +reveal.toFixed(1) });
      if (st.rowOps && st.rowOps.length) { for (let k = 1; k < st.rowOps.length; k++) if (st.rowOps[k] > st.rowOps[k - 1] + 0.001) viol.push({ inv: 'F7', tag, pos: Math.round(st.st.pos), msg: 'footer row stagger out of order', rowOps: st.rowOps }); }
    }
    /* F5 — purity: the same pos must reproduce the same visual state.
       Compared NUMERICALLY against the bucket's own recorded pos: the
       driver lerps, so a "settled" sample can sit a fraction of a px
       from the last one, and every value here is a continuous function
       of pos — the tolerance is that fraction's worth of travel, not
       slack for a real jump (the column runs 1:1 with pos, so its
       allowance is the pos delta itself plus a pixel). */
    if (Math.abs(st.st.pos - st.st.targetPos) < 0.5) {
      const key = Math.round(st.st.pos / 25) * 25;
      const sig = { pos: st.st.pos, op0: st.slides[0].rawOp, op1: st.slides[1].rawOp, clip: st.sweepRemain, colY: st.colY };
      const was = seen.get(key);
      if (was) {
        const dPos = Math.abs(sig.pos - was.pos);
        const bad = [];
        if (Math.abs(sig.op0 - was.op0) > dPos / 400 + 0.02) bad.push(`robbo ${was.op0} -> ${sig.op0}`);
        if (Math.abs(sig.op1 - was.op1) > dPos / 400 + 0.02) bad.push(`ashley ${was.op1} -> ${sig.op1}`);
        if (sig.clip != null && was.clip != null && Math.abs(sig.clip - was.clip) > dPos / 5 + 1) bad.push(`clip ${was.clip} -> ${sig.clip}`);
        if (sig.colY != null && was.colY != null && Math.abs(sig.colY - was.colY) > dPos + 1) bad.push(`colY ${was.colY} -> ${sig.colY}`);
        if (bad.length) viol.push({ inv: 'F5', tag, pos: Math.round(sig.pos), msg: 'same position, different state', dPos: +dPos.toFixed(2), bad });
      } else seen.set(key, sig);
    }
    prev = st;
  };
  const settle = async (ms = 260) => { await p.waitForTimeout(ms); };
  const r36 = async (tag) => { const bs = await f().evaluate(R36STATE); const st = await f().evaluate(() => window.__founders.state()); r36Checks_(bs, tag, { y: st.pos, max: st.maxPos }, (v) => viol.push({ ...v, pos: Math.round(st.pos) })); };
  for (let i = 0; i < MOVES; i++) {
    const kind = rnd();
    const dir = rnd() < 0.5 ? -1 : 1;
    const dist = Math.round(pick(60, 1400));
    if (kind < 0.15) { await p.mouse.wheel(0, dir * dist); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3))); hist.push(`rev ${dir * dist}`); }
    else { const steps = Math.round(pick(1, 5)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps)); await p.waitForTimeout(Math.round(pick(10, 45))); const mid = await snap(); check(mid, 'mid'); } hist.push(`wheel ${dir * dist}/${steps}`); }
    await settle();
    check(await snap(), 'settled');
    if (rnd() < 0.25) { await p.waitForTimeout(Math.round(pick(200, 700))); check(await snap(), 'pause'); await r36('pause'); }
  }
  const summary = { vp: `${W}x${H}`, page: 'founders', moves: MOVES, seed: SEED, maxPos: MAX, checks: fchecks + r36Checks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}
/* ══ R40 — MODAL MODE (--page modal --route <path>): the START A PROJECT
   form modal's lifecycle from EVERY trigger on the page, randomised:
   M1  every trigger opens the modal (is-open, not hidden, the logo twin
       visible, body overflow locked) and Esc / CANCEL / backdrop / CLOSE
       closes it (hidden, overflow released);
   M2  focus returns to the trigger that opened it;
   M3  listener balance flat across cycles (the page's add/remove counts
       instrumented at load — a cycle must remove what it added);
   M4  only one modal open at a time (the contact page's schedule modal
       closes when this opens and vice versa);
   M5  the trap holds: Tab from the modal's last focusable lands on its
       first; no page errors. */
if (PAGE === 'modal') {
  await f().evaluate(() => { const w = window; w.__lc = { add: 0, remove: 0 }; const A = EventTarget.prototype.addEventListener, R = EventTarget.prototype.removeEventListener; EventTarget.prototype.addEventListener = function (...a) { w.__lc.add++; return A.apply(this, a); }; EventTarget.prototype.removeEventListener = function (...a) { w.__lc.remove++; return R.apply(this, a); }; });
  const MST = `(() => { const m = document.querySelector('[data-sp-modal]'); const twin = document.querySelector('[data-sp-logo]'); const ct = document.querySelector('[data-ct-modal]'); return { open: !!m && m.classList.contains('is-open') && !m.hidden, hidden: m ? m.hidden : null, twin: twin ? (!twin.hidden && +getComputedStyle(twin).opacity > 0.5) : null, overflow: document.body.style.overflow, ct: ct ? ct.classList.contains('is-open') : null, lc: window.__lc.add - window.__lc.remove, active: document.activeElement ? document.activeElement.tagName + ':' + (document.activeElement.textContent || '').trim().slice(0, 12) : null, menu: !!document.querySelector('[data-menu]')?.classList.contains('is-open') }; })()`;
  const viol = []; const hist = []; let mchecks = 0; let lcBase = null;
  const trig = await f().evaluate(() => [...document.querySelectorAll('[data-start-project]')].map((t, i) => { t.dataset.spQa = String(i); return { i, inMenu: !!t.closest('[data-menu]'), text: t.textContent.replace(/\s+/g, ' ').trim().slice(0, 16) }; }));
  if (!trig.length) { console.log(JSON.stringify({ vp: `${W}x${H}`, page: 'modal', route: ROUTE, error: 'no triggers' })); await b.close(); process.exit(2); }
  const closers = ['esc', 'cancel', 'backdrop', 'close'];
  const settle = async (ms) => p.waitForTimeout(ms);
  for (let i = 0; i < MOVES; i++) {
    const t = trig[Math.floor(rnd() * trig.length)];
    if (t.inMenu) { await f().evaluate(() => document.querySelector('[data-menu-toggle]').click()); await settle(1300); }
    await f().evaluate((i2) => { const el = document.querySelector(`[data-sp-qa="${i2}"]`); el.scrollIntoView({ block: 'center' }); el.click(); }, t.i); await settle(Math.round(pick(700, 1100)));
    const o = await f().evaluate(MST); mchecks += 1;
    if (!o.open || !o.twin || o.overflow !== 'hidden') viol.push({ inv: 'M1', move: i, msg: 'modal did not open cleanly', trigger: t, o });
    if (o.menu) viol.push({ inv: 'M4', move: i, msg: 'menu still open over the modal', trigger: t });
    /* M5: Tab wraps within the modal */
    if (rnd() < 0.3) { let wrapped = false; for (let k = 0; k < 40; k++) { await p.keyboard.press('Tab'); const a = await f().evaluate(() => ({ inModal: !!document.activeElement.closest('[data-sp-modal]') || document.activeElement.hasAttribute('data-sp-logo'), first: document.activeElement === document.querySelector('[data-sp-modal] [data-sp-close]') })); if (!a.inModal) { viol.push({ inv: 'M5', move: i, msg: 'focus escaped the modal', trigger: t }); break; } if (k > 3 && a.first) { wrapped = true; break; } } mchecks += 1; void wrapped; }
    /* M4 on /contact: opening the schedule modal must close this one */
    if (rnd() < 0.25 && (await f().evaluate(() => !!document.querySelector('[data-ct-open]')))) { await f().evaluate(() => document.querySelector('[data-ct-open]').click()); await settle(900); const o2 = await f().evaluate(MST); mchecks += 1; if (o2.open || !o2.ct) viol.push({ inv: 'M4', move: i, msg: 'both modals open', o2 }); await f().evaluate(() => document.querySelector('[data-sp-qa="0"]').click()); await settle(900); const o3 = await f().evaluate(MST); mchecks += 1; if (!o3.open || o3.ct) viol.push({ inv: 'M4', move: i, msg: 'schedule modal did not yield', o3 }); }
    const how = closers[Math.floor(rnd() * closers.length)];
    if (how === 'esc') await p.keyboard.press('Escape'); else if (how === 'cancel') await f().evaluate(() => document.querySelector('[data-sp-cancel]')?.click()); else if (how === 'backdrop') await f().evaluate(() => document.querySelector('[data-sp-backdrop]').click()); else await f().evaluate(() => document.querySelector('[data-sp-close]').click());
    await settle(Math.round(pick(800, 1200)));
    const c = await f().evaluate(MST); mchecks += 1;
    if (c.open || !c.hidden || c.overflow !== '') viol.push({ inv: 'M1', move: i, msg: 'modal did not close cleanly', how, c });
    const back = await f().evaluate((i2) => document.activeElement === document.querySelector(`[data-sp-qa="${i2}"]`), t.i); mchecks += 1;
    if (!back && !t.inMenu) viol.push({ inv: 'M2', move: i, msg: 'focus did not return to the trigger', trigger: t, active: c.active });
    if (t.inMenu) { await f().evaluate(() => { const m = document.querySelector('[data-menu]'); if (m.classList.contains('is-open')) document.querySelector('[data-menu-toggle]').click(); }); await settle(1200); }
    if (i >= 2) { if (lcBase == null) lcBase = c.lc; else if (c.lc !== lcBase) viol.push({ inv: 'M3', move: i, msg: 'listener balance drifted across cycles', was: lcBase, now: c.lc }); }
    hist.push(`${t.text} → ${how}`);
  }
  const summary = { vp: `${W}x${H}`, page: 'modal', route: ROUTE, moves: MOVES, seed: SEED, triggers: trig.length, checks: mchecks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}

/* ══ R37 — CASE-STUDY MODE (--page case --case <slug>): the floating
   START A PROJECT chip's invariants on the generic random walk:
   X1  at the top (y < 2, settled) the chip is hidden (visibility hidden,
       every unit at opacity 0 or swept, tabindex −1);
   X2  in range (y ≥ 2 and the stream's last image bottom > vh, settled
       ≥ 900ms) the chip is shown (visible, every unit opacity 1, no
       tabindex, pointer events on);
   X3  past the last image (its bottom ≤ vh, settled) the chip is hidden;
   X4  never two states — no unit carries both nav-char-in and
       nav-char-out, and the host's data-float-state matches the driver;
   X5  position stable — whenever shown, right = vw − 40 and bottom =
       vh − 40 (±0.5), the box never moves. Plus N1 (the bottom nav
       sweep) and page errors. */
if (PAGE === 'case') {
  await p.mouse.move(W * 0.5, H * 0.6);
  const viol = []; const hist = [];
  const CSTATE = `(() => {
    const host = document.querySelector('[data-cs-float]'); const cta = document.querySelector('[data-cs-float-cta]'); if (!host || !cta) return { absent: true };
    const units = [...cta.querySelectorAll('.cr-char'), ...cta.querySelectorAll('[data-char-ripple-arrow]')];
    const ops = units.map((u) => +getComputedStyle(u).opacity);
    const both = units.filter((u) => u.classList.contains('nav-char-in') && u.classList.contains('nav-char-out')).length;
    const items = document.querySelectorAll('[data-cs-lb-item]'); const last = items[items.length - 1]; const lb = last ? last.getBoundingClientRect().bottom : null;
    const r = cta.getBoundingClientRect(); const hr = host.getBoundingClientRect();
    return { y: scrollY, vh: innerHeight, vw: innerWidth, max: document.documentElement.scrollHeight - innerHeight, vis: getComputedStyle(host).visibility, state: host.dataset.floatState, drv: window.__csFloat ? window.__csFloat.state() : null, since: window.__csFloat ? Math.round(window.__csFloat.since()) : 0, minOp: Math.min(...ops), maxOp: Math.max(...ops), both, ti: cta.getAttribute('tabindex'), pe: cta.style.pointerEvents, lastB: lb, right: innerWidth - r.right, bottom: innerHeight - r.bottom, hostRight: innerWidth - hr.right, hostBottom: innerHeight - hr.bottom, lbOpen: document.querySelector('[data-cs-lightbox]')?.classList.contains('is-open') }; })()`;
  const check = async (tag) => {
    const st = await f().evaluate(CSTATE); if (st.absent) { viol.push({ inv: 'X0', tag, msg: 'floating CTA absent' }); return st; }
    const bs = await f().evaluate(R36STATE); r36Checks_(bs, tag, null, (v) => viol.push({ ...v, move: hist.length }));
    /* the chip's sweeps run ~0.9s after a state change (which follows the LENIS settle, not the input) — assert states only once the driver has been in its state for over a second */
    const settled = /pause/.test(tag) && st.since > 1000;
    const push = (inv, msg, extra) => viol.push({ inv, tag, y: Math.round(st.y), msg, ...extra, move: hist.length, recent: hist.slice(-6) });
    if (st.both > 0) push('X4', 'unit carries both sweep classes', { both: st.both });
    if (st.state !== st.drv) push('X4', 'host state differs from the driver', { state: st.state, drv: st.drv });
    if (settled) {
      const expectShown = st.y >= 2 && st.lastB > st.vh && !st.lbOpen;
      if (!expectShown) { if (st.vis !== 'hidden' || st.maxOp > 0.01 || st.ti !== '-1') push(st.y < 2 ? 'X1' : 'X3', 'chip not hidden', { vis: st.vis, maxOp: st.maxOp, ti: st.ti, lastB: st.lastB }); }
      else { if (st.vis !== 'visible' || st.minOp < 0.99 || st.ti !== null || st.pe === 'none') push('X2', 'chip not shown in range', { vis: st.vis, minOp: st.minOp, ti: st.ti, pe: st.pe, lastB: st.lastB }); }
    }
    if (st.vis === 'visible' && (Math.abs(st.hostRight - 40) > 0.5 || Math.abs(st.hostBottom - 40) > 0.5)) push('X5', 'chip not at 40/40', { right: st.hostRight, bottom: st.hostBottom });
    return st;
  };
  const maxS = await f().evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let i = 0; i < MOVES; i++) {
    const dir = rnd() < 0.5 ? -1 : 1; const dist = Math.round(pick(80, 2600)); const kind = rnd();
    if (kind < 0.12) { await p.mouse.wheel(0, dir * dist * s); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3)) * s); hist.push(`rev ${dir * dist}`); }
    else if (kind < 0.22) { const y = Math.round(pick(0, maxS)); await f().evaluate((v) => window.scrollTo(0, v), y); hist.push(`jump ${y}`); }
    else if (kind < 0.30) { await f().evaluate(() => window.scrollTo(0, 0)); hist.push('top'); }
    else if (kind < 0.38) { /* the exit threshold: walk across the last image's bottom slowly, both ways */ const st0 = await f().evaluate(CSTATE); const yEdge = st0.y + (st0.lastB - st0.vh); const from = Math.round(yEdge - pick(200, 700)), to = Math.round(yEdge + pick(200, 700)); await f().evaluate((v) => window.scrollTo(0, v), Math.max(0, from)); await p.waitForTimeout(300); for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, ((to - from) / 8) * s); await p.waitForTimeout(Math.round(pick(30, 120))); await check('mid'); } for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, -((to - from) / 8) * s); await p.waitForTimeout(Math.round(pick(30, 120))); await check('mid'); } hist.push(`edge ${from}..${to}`); }
    else { const steps = Math.round(pick(1, 6)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps) * s); await p.waitForTimeout(Math.round(pick(8, 40))); await check('mid'); } hist.push(`wheel ${dir * dist}/${steps}`); }
    await p.waitForTimeout(80); await check('after-move');
    if (rnd() < 0.45) { const pause = Math.round(pick(1000, 1500)); await p.waitForTimeout(pause); await check('pause'); hist[hist.length - 1] += ` +pause${pause}`; }
  }
  const summary = { vp: `${W}x${H}`, page: 'case', study: CASE, moves: MOVES, seed: SEED, maxScroll: maxS, checks: r36Checks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}
/* ══ R36 — /services MODE (--page services): the generic random walk with
   the shared checks (N1, C1–C6, S7) and page errors. */
if (PAGE === 'services') {
  await p.mouse.move(W * 0.5, H * 0.6);
  const viol = []; const hist = [];
  const maxS = await f().evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const r36 = async (tag) => { const bs = await f().evaluate(R36STATE); r36Checks_(bs, tag, null, (v) => viol.push({ ...v, move: hist.length, recent: hist.slice(-6) })); return bs; };
  for (let i = 0; i < MOVES; i++) {
    const dir = rnd() < 0.5 ? -1 : 1; const dist = Math.round(pick(80, 2600)); const kind = rnd();
    if (kind < 0.15) { await p.mouse.wheel(0, dir * dist * s); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3)) * s); hist.push(`rev ${dir * dist}`); }
    else if (kind < 0.25) { const y = Math.round(pick(0, maxS)); await f().evaluate((v) => window.scrollTo(0, v), y); hist.push(`jump ${y}`); }
    else if (kind < 0.35) { /* the closing band: walk it slowly, both ways */ const bs0 = await f().evaluate(R36STATE); const fd = bs0.cl && bs0.cl.fade; if (fd) { const from = Math.round(fd[0] - pick(100, 600)), to = Math.round(fd[1] + pick(100, 900)); await f().evaluate((v) => window.scrollTo(0, v), from); await p.waitForTimeout(300); for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, ((to - from) / 8) * s); await p.waitForTimeout(Math.round(pick(30, 120))); await r36('mid'); } for (let k = 0; k < 8; k++) { await p.mouse.wheel(0, -((to - from) / 8) * s); await p.waitForTimeout(Math.round(pick(30, 120))); await r36('mid'); } hist.push(`band ${from}..${to}`); } }
    else { const steps = Math.round(pick(1, 6)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps) * s); await p.waitForTimeout(Math.round(pick(8, 40))); await r36('mid'); } hist.push(`wheel ${dir * dist}/${steps}`); }
    await p.waitForTimeout(80); await r36('after-move');
    if (rnd() < 0.4) { const pause = Math.round(pick(900, 1500)); await p.waitForTimeout(pause); await r36('pause'); hist[hist.length - 1] += ` +pause${pause}`; }
  }
  const summary = { vp: `${W}x${H}`, page: 'services', moves: MOVES, seed: SEED, maxScroll: maxS, checks: r36Checks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations: viol, log: hist }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(viol.length ? 2 : 0);
}
await p.mouse.move(W * 0.5, H * 0.6);

const STATE = `(() => {
  const q = (s) => document.querySelector(s); const qa = (s) => [...document.querySelectorAll(s)];
  const lum = (c) => { const m = /rgba?\\(([\\d.]+), ?([\\d.]+), ?([\\d.]+)/.exec(c || ''); return m ? 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] : null; };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vh = innerHeight; const y = Math.round(scrollY);
  const out = { y, vh, errs: [] };
  /* Featured gradient */
  const ft = q('[data-landing-featured]'); const stage = q('.landing-featured__stage'); const band = q('.landing-featured .gradual-blur'); const tint = q('[data-featured-edge-tint]'); const acc = q('[data-landing-access]');
  if (ft && stage && band) {
    const bcs = getComputedStyle(band); const tcs = tint ? getComputedStyle(tint) : null; const gL = lum(getComputedStyle(stage).backgroundColor);
    const layers = qa('[data-gradual-blur-layer]').map((l) => l.style.backdropFilter || getComputedStyle(l).backdropFilter);
    const bandOp = +bcs.opacity * (bcs.visibility === 'hidden' ? 0 : 1); const tintOp = tcs ? +tcs.opacity * (tcs.visibility === 'hidden' ? 0 : 1) : 0;
    const anyBlur = layers.some((v) => v && v !== 'none' && !/blur\\(0(rem|px)?\\)/.test(v));
    const visible = (bandOp > 0.01 && anyBlur) || tintOp > 0.01;
    const br = rect(band); const fr = rect(ft); const onScreen = br.b > 0 && br.t < vh;
    out.gradient = { gL: gL == null ? null : +gL.toFixed(1), bandOp, tintOp, anyBlur, visible, band: br, featured: fr, onScreen, bandClass: band.className, bandVis: bcs.visibility, layers: layers.slice(0, 2) };
    if (visible && onScreen && gL != null && gL > 54.4) out.errs.push({ inv: 'G1', msg: 'gradient visible over a ground not >=85% dark', gL: +gL.toFixed(1), bandOp, tintOp, anyBlur, band: br, featured: fr });
    if (visible && onScreen && (br.t < fr.t - 1 || br.b > fr.b + 1)) out.errs.push({ inv: 'G2', msg: 'gradient outside the Featured section box', band: br, featured: fr });
    if (visible && onScreen && acc) { const ar = rect(acc); if (br.b > ar.t + 1 && br.t < ar.b - 1 && ar.t < vh && ar.b > 0) out.errs.push({ inv: 'G2', msg: 'gradient overlaps the Access section', band: br, access: ar }); }
  }
  /* What We Do texts */
  const sreel = q('.landing-sreel'); const sstage = q('.landing-sreel__stage'); const outro = q('[data-landing-services]');
  if (sreel && sstage && outro) {
    const sr = rect(sstage); const onScreen = sr.b > 0 && sr.t < vh && sr.h > 0;
    const pad = parseFloat(getComputedStyle(outro).paddingBottom) || 0; const departStart = Math.round(outro.getBoundingClientRect().bottom + scrollY - vh - pad);
    const inExit = y >= departStart - 2;
    out.wwd = { stageOnScreen: onScreen, inExit, departStart };
    if (onScreen && !inExit) {
      const pillars = qa('[data-sreel-pillar]'); const risen = pillars.map((pl) => { const r = pl.getBoundingClientRect(); return r.top < vh - 5; });
      const topIdx = risen.lastIndexOf(true);
      const check = (el, label, i) => { const cs = getComputedStyle(el); const op = +cs.opacity; const blur = /blur\\(([\\d.]+)/.exec(cs.filter); const bl = blur ? +blur[1] : 0; const r = rect(el);
        if (cs.visibility === 'hidden' || op < 0.98 || bl > 0.05 || cs.display === 'none') out.errs.push({ inv: 'T1', msg: 'What We Do text not fully visible', el: label, pillar: i, opacity: op, filter: cs.filter, visibility: cs.visibility, display: cs.display, transform: cs.transform.slice(0, 40), rect: r, classes: el.className.slice(0, 60), inline: el.getAttribute('style')?.slice(0, 80) });
        const clips = el.querySelectorAll('.lr-clip'); const missing = [...clips].filter((c) => !c.classList.contains('lr-visible')).length; if (clips.length && missing) out.errs.push({ inv: 'T2', msg: 'word-reveal clips without lr-visible in a risen pillar', el: label, pillar: i, missing, total: clips.length }); };
      pillars.forEach((pl, i) => { if (!risen[i]) return; ['.landing-sreel__title', '.landing-sreel__num', '[data-sreel-desc]'].forEach((sel) => { const el = pl.querySelector(sel); if (el) check(el, sel, i); }); if (i === topIdx) { pl.querySelectorAll('.landing-sreel__svc').forEach((el, k) => { if (el.getBoundingClientRect().top < vh && el.getBoundingClientRect().bottom > 0) check(el, '.landing-sreel__svc#' + k, i); }); const wl = pl.querySelector('[data-sreel-wlabel]'); if (wl) check(wl, '[data-sreel-wlabel]', i); } });
      const wwd = q('.landing-sreel__wwd'); if (wwd && risen.some(Boolean)) check(wwd, '.landing-sreel__wwd', -1);
    }
    /* I1 — IMMERSE below FROM ACCESS while the statement is on screen */
    const stEl = q('.landing-sreel__st'); const p0 = q('[data-sreel-pillar]');
    if (onScreen && stEl && p0) { const str = rect(stEl); const pr = rect(p0); const stOn = str.b > 0 && str.t < vh; const p0On = pr.t < vh - 2;
      out.immerse = { st: str, p0: pr };
      if (stOn && p0On && pr.t < str.b - 1) out.errs.push({ inv: 'I1', msg: 'IMMERSE panel top above the FROM ACCESS statement bottom', st: str, p0: pr, introStyle: q('[data-sreel-intro]')?.getAttribute('style')?.slice(0, 60), p0Style: p0.getAttribute('style')?.slice(0, 60) }); }
  }
  /* H1 / H2 — the hero -> Who We Are boundary */
  const heroBg = q('.landing-hero__bg'); const fsec = q('[data-landing-founders]'); const flabel = q('[data-landing-founders-label]');
  if (heroBg && fsec) {
    const hL = lum(getComputedStyle(heroBg).backgroundColor); const fr2 = rect(fsec); const secOn = fr2.t < vh && fr2.t > -5;
    const fBg = getComputedStyle(fsec).backgroundColor; const hBg = getComputedStyle(heroBg).backgroundColor;
    out.boundary = { heroL: hL == null ? null : +hL.toFixed(1), secTop: fr2.t, fBg, hBg };
    if (flabel) { const lr = rect(flabel); const inkOn = lr.t < vh && lr.b > 0; if (inkOn && hL != null && hL > 24) out.errs.push({ inv: 'H1', msg: 'Who We Are ink on screen over an unfinished ground fade', heroL: +hL.toFixed(1), label: lr, secTop: fr2.t }); }
    if (secOn && fBg !== hBg) out.errs.push({ inv: 'H2', msg: 'Who We Are ground differs from the hero ground at the seam', fBg, hBg, secTop: fr2.t });
  }
  /* residue snapshot for R1 (inline styles of watched elements) */
  out.residue = { featured: qa('[data-landing-featured] .gradual-blur, [data-featured-edge-tint], [data-featured-strip], .landing-featured__stage').map((e) => e.getAttribute('style') || '').join('|').length, wwd: qa('.landing-sreel__title, [data-sreel-desc], .landing-sreel__wwd, [data-sreel-pillar]').map((e) => e.getAttribute('style') || '').join('|'), featuredOff: ft ? (rect(ft).b < -50 || rect(ft).t > vh + 50) : false, wwdOff: sstage ? (rect(sstage).b < -50 || rect(sstage).t > vh + 50) : false };
  return out;
})()`;
const snapshot = () => f().evaluate(STATE);
/* T3 — PIXEL PRESENCE: DOM state can read opacity 1 while the compositor
   drops a text layer, so while the What We Do stage is on screen (and
   not in its exit cascade) the top pillar's title and its first visible
   row are screenshot-clipped and must contain ink (luminance spread
   over the box > 40 / > 30). */
const frameOffset = async () => (W >= 1728 ? { x: 0, y: 0 } : p.evaluate(() => { const r = document.querySelector('iframe').getBoundingClientRect(); return { x: r.left, y: r.top }; }));
/* One full-viewport capture per check, cropped in memory: a clipped
   capture composites difference-blended / backdrop-filtered regions
   against an empty backdrop and reads blank (verified: the same title
   reads spread 5 clipped, > 150 cropped from the full frame). */
const inkSpreadFrom = (png, r, off) => { const x0 = Math.max(0, Math.floor(off.x + r.l * s)), y0 = Math.max(0, Math.floor(off.y + r.t * s)), x1 = Math.min(png.w, Math.ceil(off.x + (r.l + r.w) * s)), y1 = Math.min(png.h, Math.ceil(off.y + (r.t + r.h) * s)); if (x1 - x0 < 4 || y1 - y0 < 4) return null; let mn = 255, mx = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const L = 0.2126 * png.rows[y][x * png.bpp] + 0.7152 * png.rows[y][x * png.bpp + 1] + 0.0722 * png.rows[y][x * png.bpp + 2]; if (L < mn) mn = L; if (L > mx) mx = L; } return +(mx - mn).toFixed(1); };
const TEXT_BOXES = `(() => { const q = (s) => document.querySelector(s); const vh = innerHeight; const sstage = q('.landing-sreel__stage'); const outro = q('[data-landing-services]'); if (!sstage || !outro) return null; const sr = sstage.getBoundingClientRect(); if (!(sr.bottom > 0 && sr.top < vh)) return null; const pad = parseFloat(getComputedStyle(outro).paddingBottom) || 0; const departStart = Math.round(outro.getBoundingClientRect().bottom + scrollY - vh - pad); if (scrollY >= departStart - 2) return null; const pillars = [...document.querySelectorAll('[data-sreel-pillar]')]; const risen = pillars.map((pl) => pl.getBoundingClientRect().top < vh - 5); const top = risen.lastIndexOf(true); if (top < 0) return null; const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }; /* in-flight word reveals (the 1.2s slide out of the clip) are legitimate blanks: only assert once every inner sits at identity */
const settled = (el) => [...el.querySelectorAll('.lr-inner')].every((i) => { const t = getComputedStyle(i).transform; return t === 'none' || /^matrix\(1, 0, 0, 1, 0, -?0(\.\d+)?\)$/.test(t); });
const titleEl = pillars[top].querySelector('.landing-sreel__title'); const title = titleEl && settled(titleEl) ? titleEl : null; const win = pillars[top].querySelector('[data-sreel-listwin]'); const winTop = win ? win.getBoundingClientRect().top : 0; const row = [...pillars[top].querySelectorAll('.landing-sreel__svc')].find((e) => { const r = e.getBoundingClientRect(); return r.top > winTop + 200 && r.bottom < vh && r.bottom < (win ? win.getBoundingClientRect().bottom - 8 : vh) && r.height > 4; }); return { pillar: top, title: title ? R(title) : null, row: row && settled(row) ? R(row) : null }; })()`;
/* Rects and pixels must belong to the same frame: T3 only asserts when
   the scroll position is identical before the rect read and after the
   capture (Lenis inertia can still be moving during a "pause"). */
const textPresence = async () => { const y0 = await f().evaluate(() => scrollY); const boxes = await f().evaluate(TEXT_BOXES); if (!boxes) return null; const png = decodePng(await p.screenshot({ type: 'png' })); const y1 = await f().evaluate(() => scrollY); if (!png || y0 !== y1) return null; const off = await frameOffset(); const out = { pillar: boxes.pillar }; if (boxes.title) out.title = inkSpreadFrom(png, boxes.title, off); if (boxes.row) out.row = inkSpreadFrom(png, boxes.row, off); return out; };
function decodePng(buf) { try { const zlib = require('node:zlib'); let pos = 8; let w = 0, h = 0, ct = 6; const idat = []; while (pos < buf.length) { const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8); if (type === 'IHDR') { w = buf.readUInt32BE(pos + 8); h = buf.readUInt32BE(pos + 12); ct = buf[pos + 17]; } if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len)); pos += 12 + len; } const bpp = ct === 2 ? 3 : 4; const raw = zlib.inflateSync(Buffer.concat(idat)); const stride = w * bpp; const rows = []; let prev = Buffer.alloc(stride); let i = 0; for (let y = 0; y < h; y++) { const fl = raw[i]; const cur = Buffer.from(raw.subarray(i + 1, i + 1 + stride)); i += 1 + stride; for (let x = 0; x < stride; x++) { const a = x >= bpp ? cur[x - bpp] : 0, b2 = prev[x], c = x >= bpp ? prev[x - bpp] : 0; if (fl === 1) cur[x] = (cur[x] + a) & 255; else if (fl === 2) cur[x] = (cur[x] + b2) & 255; else if (fl === 3) cur[x] = (cur[x] + ((a + b2) >> 1)) & 255; else if (fl === 4) { const pa = Math.abs(b2 - c), pb = Math.abs(a - c), pc = Math.abs(a + b2 - 2 * c); const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b2 : c; cur[x] = (cur[x] + pr) & 255; } } rows.push(cur); prev = cur; } return { w, h, bpp, rows }; } catch (e) { return null; } }
const violations = []; const log = []; let checks = 0;
const record = async (st, phase) => { checks += 1; for (const e of st.errs) violations.push({ move: log.length, phase, y: st.y, ...e, recent: log.slice(-8) });
  { const bs = await f().evaluate(R36STATE); r36Checks_(bs, phase, null, (v) => violations.push({ move: log.length, phase, ...v, recent: log.slice(-8) })); }
  if (st.wwd && st.wwd.stageOnScreen && !st.wwd.inExit) { const tp = await textPresence(); if (tp) { if (tp.title != null && tp.title < 40) violations.push({ move: log.length, phase, y: st.y, inv: 'T3', msg: 'What We Do title box has no ink (pixel presence)', pillar: tp.pillar, spread: tp.title, recent: log.slice(-8) }); if (tp.row != null && tp.row < 30) violations.push({ move: log.length, phase, y: st.y, inv: 'T3', msg: 'What We Do row box has no ink (pixel presence)', pillar: tp.pillar, spread: tp.row, recent: log.slice(-8) }); } } };
const maxScroll = await f().evaluate(() => document.documentElement.scrollHeight - innerHeight);
let lastResidue = null;
const wwdTop = await f().evaluate(() => { const s2 = document.querySelector('.landing-sreel'); return s2 ? Math.round(s2.getBoundingClientRect().top + scrollY) : 0; });
const wwdBottom = await f().evaluate(() => { const o = document.querySelector('[data-landing-services]'); return o ? Math.round(o.getBoundingClientRect().bottom + scrollY) : 0; });
/* I2 — per-step transform sampling (one evaluate: scroll + transforms from the same frame) */
const MOTION = `(() => { const m = (el) => { const t = el ? getComputedStyle(el).transform : 'none'; const mm = /matrix\\(([^)]+)\\)/.exec(t); return mm ? +mm[1].split(',')[5] : 0; }; const ps = [...document.querySelectorAll('[data-sreel-pillar]')]; return { y: scrollY, p: ps.map(m), intro: m(document.querySelector('[data-sreel-intro]')) }; })()`;
const RATE = { p: 2.4, intro: 1.2, slack: 6 }; /* power1.out rise: 2·(stage − 216)/800 ≤ 2.26 px/px; intro 660/600 = 1.1 */
let lastMotion = null;
const motionStep = async (tag) => { const m = await f().evaluate(MOTION); if (lastMotion) { const dy = Math.abs(m.y - lastMotion.y); const bad = []; m.p.forEach((v, k) => { if (Math.abs(v - lastMotion.p[k]) > RATE.p * dy + RATE.slack) bad.push(`pillar${k} ${lastMotion.p[k].toFixed(1)}->${v.toFixed(1)} over dy ${dy.toFixed(0)}`); }); if (Math.abs(m.intro - lastMotion.intro) > RATE.intro * dy + RATE.slack) bad.push(`intro ${lastMotion.intro.toFixed(1)}->${m.intro.toFixed(1)} over dy ${dy.toFixed(0)}`); if (bad.length) violations.push({ move: log.length, phase: tag, y: Math.round(m.y), inv: 'I2', msg: 'transform discontinuity between adjacent samples', bad, recent: log.slice(-8) }); checks += 1; } lastMotion = m; };
const wheelTo = async (target, step, waitMs, tag) => { for (let guard = 0; guard < 600; guard++) { const cur = await f().evaluate(() => scrollY); const d = target - cur; if (Math.abs(d) < 4) break; await p.mouse.wheel(0, Math.sign(d) * Math.min(Math.abs(d), step) * s); await p.waitForTimeout(waitMs); await motionStep(tag); } };
const heroBeats = await f().evaluate(() => window.__landingHero?.beats?.cards ?? null);
for (let i = 0; i < MOVES; i++) {
  if (FOCUS === 'hero') {
    /* one cycle across the boundary: from the cards' rest (before the rise) to Who We Are landed (a viewport past its entry), back above the rise, at random pace */
    if (!heroBeats) { console.log('no hero beats handle'); break; }
    const from = Math.max(0, Math.round(heroBeats.startAt[0] - pick(200, 900))); const to = Math.round(heroBeats.foundersEnterAt + H + pick(0, 900));
    const step = Math.round(pick(40, 360)); const wait = Math.round(pick(10, 60));
    lastMotion = null; await wheelTo(from, 400, 20, 'hero-pre');
    await wheelTo(to, step, wait, 'hero-down'); let st = await snapshot(); await record(st, 'hero-landed');
    if (rnd() < 0.5) await p.waitForTimeout(Math.round(pick(100, 700)));
    await wheelTo(Math.round(from + pick(-300, 300)), step, wait, 'hero-up'); st = await snapshot(); await record(st, 'hero-back');
    log.push(`hero-cycle ${from} -> ${to} step ${step}`);
    continue;
  }
  if (FOCUS === 'immerse') {
    /* one full cycle: down through What We Do (to a random depth into Featured), up past its start by a random amount (sometimes to the top), down again through rise 1 — random pace, occasional idle pauses (the snap window) */
    const pace = pick(0.4, 3); const step = Math.round(pick(60, 420)); const wait = Math.round(pick(12, 60) / pace);
    const depth = Math.round(wwdBottom - H + pick(-1500, 1800)); const upTo = rnd() < 0.2 ? 0 : Math.round(wwdTop - pick(120, 3000));
    lastMotion = null; await wheelTo(depth, step, wait, 'cycle-down1'); if (rnd() < 0.5) await p.waitForTimeout(Math.round(pick(100, 800)));
    lastMotion = null; await wheelTo(upTo, step, wait, 'cycle-up'); await p.waitForTimeout(Math.round(pick(80, 900)));
    let st = await snapshot(); await record(st, 'cycle-top');
    lastMotion = null; await wheelTo(Math.round(wwdTop + pick(300, 1900)), Math.round(pick(40, 160)), Math.round(pick(20, 70)), 'cycle-down2');
    log.push(`immerse-cycle depth ${depth} up ${upTo} pace ${pace.toFixed(1)} step ${step}`);
    await p.waitForTimeout(90); st = await snapshot(); await record(st, 'cycle-down2'); const pause = Math.round(pick(200, 1000)); await p.waitForTimeout(pause); st = await snapshot(); await record(st, 'cycle-pause');
    if (SHOT_DIR && st.errs.length && violations.length <= 6) await p.screenshot({ path: `${SHOT_DIR}/violation-${violations.length}-${st.errs[0].inv}-y${st.y}.png` });
    continue;
  }
  if (FOCUS === 'wwd') {
    /* leave What We Do downward (to a random depth up to ~2600 past its end: Featured, sometimes Access), then return upward at a random pace, sometimes reversing mid-cascade */
    const depth = Math.round(pick(wwdBottom - H, wwdBottom + pick(200, 2600))); const pace = pick(0.3, 3);
    if (rnd() < 0.5) await f().evaluate((v) => window.scrollTo(0, v), depth); else { const cur = await f().evaluate(() => scrollY); const d = depth - cur; const n = Math.max(1, Math.round(Math.abs(d) / 600)); for (let k = 0; k < n; k++) { await p.mouse.wheel(0, (d / n) * s); await p.waitForTimeout(Math.round(pick(10, 60) / pace)); } }
    await p.waitForTimeout(Math.round(pick(60, 700)));
    const target = Math.round(pick(wwdTop + 200, wwdBottom - H - 200)); const cur2 = await f().evaluate(() => scrollY); const up = target - cur2; const n2 = Math.max(1, Math.round(Math.abs(up) / pick(150, 900)));
    for (let k = 0; k < n2; k++) { await p.mouse.wheel(0, (up / n2) * s); await p.waitForTimeout(Math.round(pick(8, 70) / pace)); if (rnd() < 0.12) { await p.mouse.wheel(0, Math.round(pick(100, 600)) * s); await p.waitForTimeout(Math.round(pick(20, 120))); } }
    log.push(`wwd-return depth ${depth} -> ${target} pace ${pace.toFixed(1)}`);
    await p.waitForTimeout(90); let st = await snapshot(); await record(st, 'after-return'); const pause = Math.round(pick(150, 900)); await p.waitForTimeout(pause); st = await snapshot(); await record(st, 'after-pause');
    if (SHOT_DIR && st.errs.length && violations.length <= 6) await p.screenshot({ path: `${SHOT_DIR}/violation-${violations.length}-${st.errs[0].inv}-y${st.y}.png` });
    continue;
  }
  const dir = rnd() < 0.5 ? -1 : 1; const dist = Math.round(pick(80, 2600)); const kind = rnd();
  let desc;
  if (kind < 0.15) { /* reversal mid-transition */ await p.mouse.wheel(0, dir * dist * s); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3)) * s); desc = `rev ${dir * dist}→${-dir}`; }
  else if (kind < 0.25) { /* jump */ const y = Math.round(pick(0, maxScroll)); await f().evaluate((v) => window.scrollTo(0, v), y); desc = `jump ${y}`; }
  else { const steps = Math.round(pick(1, 6)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps) * s); await p.waitForTimeout(Math.round(pick(8, 40))); } desc = `wheel ${dir * dist} in ${steps}`; }
  log.push(desc);
  await p.waitForTimeout(80); let st = await snapshot(); await record(st, 'after-move');
  if (rnd() < 0.35) { const pause = Math.round(pick(200, 1100)); await p.waitForTimeout(pause); const st2 = await snapshot(); await record(st2, 'after-pause'); log[log.length - 1] += ` +pause${pause}`;
    /* R1 residue drift: another 350ms with no input while sections are off-screen */
    if (st2.residue.featuredOff || st2.residue.wwdOff) { const a = await snapshot(); await p.waitForTimeout(350); const c = await snapshot(); if (a.y === c.y) { if (a.residue.featuredOff && a.residue.featured !== c.residue.featured) violations.push({ move: log.length, phase: 'idle', inv: 'R1', msg: 'Featured watched styles changed with no scroll while off-screen', recent: log.slice(-8) }); if (a.residue.wwdOff && a.residue.wwd !== c.residue.wwd) violations.push({ move: log.length, phase: 'idle', inv: 'R1', msg: 'What We Do watched styles changed with no scroll while off-screen', recent: log.slice(-8) }); checks += 1; } }
    st = st2; }
  if (SHOT_DIR && st.errs.length && violations.length <= 6) { await p.screenshot({ path: `${SHOT_DIR}/violation-${violations.length}-${st.errs[0].inv}-y${st.y}.png` }); }
}
const summary = { vp: `${W}x${H}`, moves: MOVES, seed: SEED, checks: checks + r36Checks, violations: violations.length, byInvariant: violations.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: violations.slice(0, 5) };
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations, log }, null, 1));
console.log(JSON.stringify(summary));
await b.close();
process.exit(violations.length ? 2 : 0);
