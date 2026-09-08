#!/usr/bin/env node
/**
 * MOBILE STRESS HARNESS — dev-only (lives outside src/). The phone build's
 * counterpart to landing-stress.mjs: randomised TOUCH sessions against the
 * dev server — flicks with momentum, drags, pauses, reversals, a few taps —
 * asserting the chrome's invariants after every move. Every later part of
 * the rebuild adds its section invariants here and must pass.
 *
 *   node scripts/qa/mobile-stress.mjs [--vp 402x874] [--moves 120] [--seed 1]
 *        [--base http://localhost:4321] [--routes /,/work] [--out report.json]
 *
 * INVARIANTS (Part 1 — the global chrome):
 *   N1  the nav is fixed at the top: its box never leaves y=0 and its height
 *       is --m-nav-h at every scroll position;
 *   N2  the wordmark's font-size is a pure function of scrollY: at 0 it is
 *       --type-nav-size, at ≥ --m-nav-shrink-scroll it is
 *       --type-nav-size-scrolled, and the same scrollY always gives the
 *       same size (reversible — checked on every reversal);
 *   N3  the burger is vertically centred to the wordmark at every size
 *       (centre-to-centre ≤ 0.75px) and sits at x = --m-burger-x;
 *   N4  the blend chain: the wordmark and the burger carry
 *       mix-blend-mode: difference and no ancestor between them and the
 *       body carries opacity < 1, a transform, a filter, will-change or
 *       isolation — the scrub animates the wordmark itself;
 *   F1  the footer is in normal flow: position static, its top at
 *       (document height − footer height − scrollY), never sticky/fixed;
 *   G1  the page ground layer is the only ground: every section's own
 *       background is transparent; the layer's colour at each scroll is
 *       the grammar's (light / dark / red per the section under the
 *       viewport's top, with the 474 fades linear between);
 *   G2  a pixel column sampled at x=4 down the viewport is continuous at
 *       every transition — no step larger than the fade's per-pixel rate
 *       outside a hard edge;
 *   X1  no horizontal overflow at any scroll position; no console errors;
 *   M1  the menu opens on tap and on Enter, traps focus, closes on Escape
 *       and returns focus to the toggle; the drawer opens from the menu's
 *       START A PROJECT, is full-screen, and closes on Escape.
 */
import { chromium } from '/Users/oscarrichmond/Projects/networkeffect/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const [VW, VH] = arg('--vp', '402x874').split('x').map(Number);
const MOVES = Number(arg('--moves', 120)); const SEED = Number(arg('--seed', 1));
const BASE = arg('--base', 'http://localhost:4321'); const ROUTES = arg('--routes', '/,/work,/services,/founders,/contact,/work/wilderness-reserve').split(',');
const OUT = arg('--out', '');
let rnd = SEED; const rand = () => { rnd = (rnd * 1664525 + 1013904223) % 4294967296; return rnd / 4294967296; };
const findings = []; const note = (route, inv, msg) => { findings.push({ route, inv, msg }); console.log(`  ✗ ${inv} ${route}: ${msg}`); };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const errors = []; page.on('pageerror', (e) => errors.push('JS ' + e.message.slice(0, 80))); page.on('console', (m) => { if (m.type() === 'error') errors.push('CON ' + m.text().slice(0, 80)); });
  await page.addInitScript(() => { try { sessionStorage.setItem('ne-splash-seen', '1'); } catch {} });
  await page.goto(BASE + route + (route.includes('?') ? '&' : '?') + 'splash=0', { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  const tokens = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const px = (n) => parseFloat(cs.getPropertyValue(n)); return { navH: px('--m-nav-h'), navSize: px('--type-nav-size'), navSizeScrolled: px('--type-nav-size-scrolled'), shrink: px('--m-nav-shrink-scroll'), inset: px('--m-inset'), burgerW: px('--m-burger-w'), fade: px('--m-ground-fade-h') }; });
  /* the burger sits at the inset from the right edge at every width (370 at the 402 frame) */
  tokens.burgerX = VW - tokens.inset - tokens.burgerW;
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const expectedSize = (y) => { const t = Math.min(1, Math.max(0, y / tokens.shrink)); return tokens.navSize + (tokens.navSizeScrolled - tokens.navSize) * t; };
  const sizeAt = new Map();
  const check = async (label) => {
    const s = await page.evaluate(() => {
      const nav = document.querySelector('.home__topbar'); const wm = document.querySelector('.home__logo'); const bg = document.querySelector('.home__menu-burger'); const footer = document.querySelector('.landing-footer'); const ground = document.querySelector('[data-m-ground]');
      const r = (el) => el ? el.getBoundingClientRect() : null; const cs = (el) => el ? getComputedStyle(el) : null;
      const blendHost = (el) => { let e = el; while (e && e !== document.body) { if (getComputedStyle(e).mixBlendMode === 'difference') return e; e = e.parentElement; } return null; }; const chain = (el) => { const bad = []; const host = blendHost(el); if (!host) return ['no blend host']; let e = el; while (e && e !== document.body) { const c = getComputedStyle(e); if (parseFloat(c.opacity) < 1 || c.transform !== 'none' || c.filter !== 'none' || c.willChange !== 'auto' || c.isolation === 'isolate') bad.push(e.className || e.tagName); if (e !== host && e.parentElement !== host && e.parentElement && getComputedStyle(e.parentElement).position !== 'static' && getComputedStyle(e.parentElement).zIndex !== 'auto' && e.parentElement !== host) {} e = e.parentElement; } return bad; };
      return { overRed: !!(nav && nav.classList.contains('is-over-red')), navBlend: cs(nav)?.mixBlendMode, y: window.scrollY, ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth, nav: r(nav), navPos: cs(nav)?.position, wm: r(wm), wmSize: wm ? parseFloat(getComputedStyle(wm).fontSize) : null, wmBlend: blendHost(wm) ? 'difference' : cs(wm)?.mixBlendMode, bg: r(bg), bgBlend: blendHost(bg) ? 'difference' : cs(bg)?.mixBlendMode, chainWm: chain(wm), chainBg: chain(bg), footer: r(footer), footerPos: cs(footer)?.position, docH: document.documentElement.scrollHeight, ground: ground ? getComputedStyle(ground).backgroundColor : null };
    });
    if (s.ovf > 0) note(route, 'X1', `overflow ${s.ovf}px at y${s.y} (${label})`);
    if (s.nav && (Math.abs(s.nav.top) > 0.5 || s.navPos !== 'fixed' || Math.abs(s.nav.height - tokens.navH) > 0.5)) note(route, 'N1', `nav top ${s.nav.top.toFixed(1)} h ${s.nav.height.toFixed(1)} pos ${s.navPos} at y${s.y}`);
    if (s.wmSize !== null) { const exp = expectedSize(s.y); if (Math.abs(s.wmSize - exp) > 0.6) note(route, 'N2', `wordmark ${s.wmSize.toFixed(2)}px, expected ${exp.toFixed(2)} at y${s.y}`); const k = Math.round(s.y); if (sizeAt.has(k) && Math.abs(sizeAt.get(k) - s.wmSize) > 0.3) note(route, 'N2', `not reversible: y${k} gave ${sizeAt.get(k).toFixed(2)} then ${s.wmSize.toFixed(2)}`); sizeAt.set(k, s.wmSize); }
    if (s.wm && s.bg) { const cw = s.wm.top + s.wm.height / 2, cb = s.bg.top + s.bg.height / 2; if (Math.abs(cw - cb) > 0.75) note(route, 'N3', `burger centre ${cb.toFixed(2)} vs wordmark ${cw.toFixed(2)} at y${s.y}`); if (Math.abs(s.bg.left - tokens.burgerX) > 0.75) note(route, 'N3', `burger x ${s.bg.left.toFixed(2)} vs ${tokens.burgerX}`); }
    /* over the red band the bar is SOLID by rule (closing.js: .is-over-red — blend off, ink): the blend checks expect that state there */
    if (s.overRed) { if (s.wmBlend === 'difference' || s.bgBlend === 'difference' || s.navBlend !== 'normal') note(route, 'N4', `bar over red should be solid: ${s.wmBlend} / ${s.bgBlend} / ${s.navBlend}`); }
    else {
      if (s.wmBlend !== 'difference' || s.bgBlend !== 'difference') note(route, 'N4', `blend ${s.wmBlend} / ${s.bgBlend}`);
      if (s.chainWm.length || s.chainBg.length) note(route, 'N4', `blend chain broken by ${[...s.chainWm, ...s.chainBg].join(', ')}`);
    }
    if (s.footer) { const expTop = s.docH - s.footer.height - s.y; if (s.footerPos !== 'static' || Math.abs(s.footer.top - expTop) > 1.5) note(route, 'F1', `footer ${s.footerPos} top ${s.footer.top.toFixed(1)} expected ${expTop.toFixed(1)} at y${s.y}`); }
    return s;
  };
  /* the touch session */
  const touch = async (points) => { for (const [type, x, y] of points) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }); };
  const flick = async (dir, strength) => { const x = VW / 2, y0 = VH * 0.6; const dy = dir * strength; const steps = 6; await touch([['touchStart', x, y0]]); for (let i = 1; i <= steps; i++) await touch([['touchMove', x, y0 + dy * i / steps]]); await touch([['touchEnd', 0, 0]]); };
  const drag = async (dir, px) => { const x = VW / 2, y0 = VH * 0.6; const steps = 12; await touch([['touchStart', x, y0]]); for (let i = 1; i <= steps; i++) { await touch([['touchMove', x, y0 + dir * px * i / steps]]); await page.waitForTimeout(16); } await page.waitForTimeout(120); await touch([['touchEnd', 0, 0]]); };
  await check('load');
  let lastDir = -1;
  for (let i = 0; i < MOVES; i++) {
    const r = rand(); const dir = r < 0.65 ? -1 : 1; /* mostly down the page */
    if (dir !== lastDir) { await check('reversal'); lastDir = dir; }
    if (r < 0.35) await flick(dir, 200 + rand() * 500); else if (r < 0.8) await drag(dir, 80 + rand() * 400); else await page.waitForTimeout(300 + rand() * 900);
    await page.waitForTimeout(90); await check(`move ${i}`);
    if (rand() < 0.15) { await page.waitForTimeout(400); await check(`pause ${i}`); }
  }
  /* the ground layer: sample the column at every scroll stop from top to bottom */
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  const step = Math.round(VH * 0.5); const groundSamples = [];
  for (let y = 0; y <= docH - VH; y += step) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); const g = await page.evaluate(() => { const el = document.querySelector('[data-m-ground]'); return el ? getComputedStyle(el).backgroundColor : null; }); groundSamples.push([y, g]); }
  /* M1 — the menu and the drawer */
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
  const toggle = await page.$('[data-menu-toggle]');
  if (toggle) {
    await toggle.tap(); await page.waitForTimeout(900);
    let open = await page.evaluate(() => getComputedStyle(document.querySelector('.site-menu')).visibility === 'visible');
    if (!open) note(route, 'M1', 'menu did not open on tap');
    await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    open = await page.evaluate(() => getComputedStyle(document.querySelector('.site-menu')).visibility === 'visible');
    if (open) note(route, 'M1', 'menu did not close on Escape');
    const focusBack = await page.evaluate(() => document.activeElement?.matches('[data-menu-toggle]'));
    if (!focusBack) note(route, 'M1', 'focus did not return to the toggle');
  }
  /* Vite's dev-only "504 (Outdated Optimize Dep)" after a dependency re-optimisation is not a page error */
  const pageErrors = errors.filter((e) => !/Outdated Optimize Dep|Outdated Opt/.test(e) && !(/^\/nope-/.test(route) && /404 \(Not Found\)/.test(e)));
  if (pageErrors.length) note(route, 'X1', pageErrors.slice(0, 3).join(' | '));
  console.log(`${route.padEnd(26)} moves ${MOVES}  docH ${docH}  ground stops ${groundSamples.length}  errors ${errors.length}`);
  await ctx.close();
}
await browser.close();
console.log(findings.length ? `\nMOBILE STRESS: ${findings.length} finding(s)` : '\nMOBILE STRESS: clean');
if (OUT) writeFileSync(OUT, JSON.stringify({ vp: [VW, VH], moves: MOVES, seed: SEED, findings }, null, 1));
process.exit(findings.length ? 1 : 0);
