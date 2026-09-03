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
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
const pageErrs = []; p.on('pageerror', (e) => pageErrs.push(String(e.message).slice(0, 120)));
await p.goto(BASE + (PAGE === 'founders' ? '/founders?splash=0&forcehover' : '/?splash=0&forcehover'), { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(3500);
const s = W >= 1728 ? 1 : W / 1728;
const f = () => p.frames().find((fr) => fr.url().includes('framed=1')) ?? p.mainFrame();

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
    /* F7 (R32) — through the footer reveal the ground below the band is exactly the strip (stage bottom − band bottom = viewport bottom − portrait bottom), and the row items stay in stagger order */
    if (st.band && st.portrait && st.st.pos > st.st.footerStart) {
      /* the portrait rides the stage during the reveal, so its RESTING bottom is 80 + its height, not its live rect */
      const strip = st.stageBottom - st.band.b; const expected = st.vh - (80 + st.portrait.h);
      if (Math.abs(strip - expected) > 1.5) viol.push({ inv: 'F7', tag, pos: Math.round(st.st.pos), msg: 'ground below the band differs from the strip during the reveal', strip: +strip.toFixed(1), expected: +expected.toFixed(1) });
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
  for (let i = 0; i < MOVES; i++) {
    const kind = rnd();
    const dir = rnd() < 0.5 ? -1 : 1;
    const dist = Math.round(pick(60, 1400));
    if (kind < 0.15) { await p.mouse.wheel(0, dir * dist); await p.waitForTimeout(Math.round(pick(20, 90))); await p.mouse.wheel(0, -dir * Math.round(dist * pick(0.4, 1.3))); hist.push(`rev ${dir * dist}`); }
    else { const steps = Math.round(pick(1, 5)); for (let k = 0; k < steps; k++) { await p.mouse.wheel(0, dir * Math.round(dist / steps)); await p.waitForTimeout(Math.round(pick(10, 45))); const mid = await snap(); check(mid, 'mid'); } hist.push(`wheel ${dir * dist}/${steps}`); }
    await settle();
    check(await snap(), 'settled');
    if (rnd() < 0.25) { await p.waitForTimeout(Math.round(pick(200, 700))); check(await snap(), 'pause'); }
  }
  const summary = { vp: `${W}x${H}`, page: 'founders', moves: MOVES, seed: SEED, maxPos: MAX, checks: fchecks, violations: viol.length, byInvariant: viol.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: viol.slice(0, 5) };
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
  if (st.wwd && st.wwd.stageOnScreen && !st.wwd.inExit) { const tp = await textPresence(); if (tp) { if (tp.title != null && tp.title < 40) violations.push({ move: log.length, phase, y: st.y, inv: 'T3', msg: 'What We Do title box has no ink (pixel presence)', pillar: tp.pillar, spread: tp.title, recent: log.slice(-8) }); if (tp.row != null && tp.row < 30) violations.push({ move: log.length, phase, y: st.y, inv: 'T3', msg: 'What We Do row box has no ink (pixel presence)', pillar: tp.pillar, spread: tp.row, recent: log.slice(-8) }); } } };
const maxScroll = await f().evaluate(() => document.documentElement.scrollHeight - innerHeight);
let lastResidue = null;
const FOCUS = arg('--focus', '');
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
const summary = { vp: `${W}x${H}`, moves: MOVES, seed: SEED, checks, violations: violations.length, byInvariant: violations.reduce((m, v) => { m[v.inv] = (m[v.inv] || 0) + 1; return m; }, {}), pageErrors: pageErrs, first: violations.slice(0, 5) };
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, violations, log }, null, 1));
console.log(JSON.stringify(summary));
await b.close();
process.exit(violations.length ? 2 : 0);
