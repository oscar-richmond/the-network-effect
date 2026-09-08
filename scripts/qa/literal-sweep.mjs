#!/usr/bin/env node
/**
 * THE LITERAL SWEEP — dev-only (lives outside src/). Three checks, all
 * must pass (exit 1 otherwise):
 *
 *   1. SEAMS: no numeric seam literal (the values in src/config/breakpoints.js)
 *      anywhere in src/ except that file, and the two generated mirrors are
 *      fresh (scripts/gen-breakpoints.mjs --check).
 *   2. THE MOBILE LAYER: every stylesheet under src/styles/mobile/ and every
 *      <style> in a *Mobile.astro component reads tokens only — no px / em /
 *      rem / vw / vh / svh / dvh numbers (0 excepted), no colour literals
 *      (#hex, rgb(), hsl(), named colours; transparent / currentColor /
 *      inherit excepted), no unitless line-height literals, no media query
 *      with a number (they read @custom-media). Values inside var(--…, fallback)
 *      fallbacks count as literals too.
 *   3. THE TOKENS: every --m-* / --type-* token the mobile layer reads is declared.
 *
 *   node scripts/qa/literal-sweep.mjs [--verbose]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as BP from '../../src/config/breakpoints.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const verbose = process.argv.includes('--verbose');
const walk = (dir, out = []) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };
let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };

/* ── 1. seams ─────────────────────────────────────────────────── */
const SEAMS = [BP.SHELL_MIN_WIDTH, BP.MOBILE_MAX_WIDTH, BP.TABLET_MIN_WIDTH, BP.PHONE_MAX_WIDTH];
/* a seam literal is one of the seam numbers used AS a width: in a media / sizes condition, a width
   comparison or assignment, or prose naming the seam. A frame coordinate (top: 767px), an image's
   dimensions or a decimal (768.3) are not seams and pass. */
const seamRe = new RegExp(`(?<![\\d.])(${SEAMS.join('|')})(?![\\d.])`);
const seamCtx = /(min-width|max-width|matchMedia|innerWidth|clientWidth|MOBILE_MAX|SHELL_MIN|TABLET_MIN|PHONE_MAX|\bseam|\bband\b|\bshell\b|\bphone\b|\btablet\b|\bnarrow\b|≤|≥|<=|>=|–\s*\d|\d\s*–)/i;
const SEAM_EXEMPT = new Set(['src/config/breakpoints.js', 'src/styles/tokens/breakpoints.css']); /* the source and its generated mirror */
const srcFiles = walk(join(ROOT, 'src')).filter((p) => /\.(css|js|mjs|ts|astro|html)$/.test(p));
let seamHits = 0;
for (const p of srcFiles) {
  const rel = relative(ROOT, p); if (SEAM_EXEMPT.has(rel)) continue;
  /* archived routes are out of scope (about-2 / about-3 / holding / old) */
  if (/src\/(styles\/(about|holding)|components\/(about-|holding|HomePage|AboutHero|AboutScroll|AboutStickyClients|AboutParaTrio|HeroShader|SplashScreen)|scripts\/(about-|holding|home-carousel)|pages\/(_about|_index|holding|old)|data\/carousel\.js)/.test(rel)) continue;
  readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    if (seamRe.test(line) && seamCtx.test(line)) { seamHits++; fail(`seam literal ${rel}:${i + 1}: ${line.trim().slice(0, 90)}`); }
  });
}
try { execFileSync('node', [join(ROOT, 'scripts/gen-breakpoints.mjs'), '--check'], { stdio: verbose ? 'inherit' : 'pipe' }); }
catch { fail('generated seam mirrors are stale — run node scripts/gen-breakpoints.mjs'); }
console.log(`seams: ${seamHits} literal(s) in src/`);

/* ── 2. the mobile layer ──────────────────────────────────────── */
const mobileCss = [];
const mobileDir = join(ROOT, 'src/styles/mobile');
try { for (const p of walk(mobileDir).filter((p) => p.endsWith('.css'))) mobileCss.push([relative(ROOT, p), readFileSync(p, 'utf8')]); } catch {}
for (const p of walk(join(ROOT, 'src/components')).filter((p) => /Mobile\.astro$/.test(p))) {
  const src = readFileSync(p, 'utf8'); const m = src.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || [];
  for (const block of m) mobileCss.push([relative(ROOT, p), block.replace(/<\/?style[^>]*>/g, '')]);
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const NAMED = /\b(white|black|red|blue|grey|gray|silver|navy|teal|orange|yellow|green|purple|pink|brown|maroon|olive|lime|aqua|fuchsia)\b/i;
let literalHits = 0;
for (const [rel, css] of mobileCss) {
  const lines = stripComments(css).split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim(); if (!line) return;
    /* the token declarations themselves are the one place literals live */
    if (/^--[a-z0-9-]+\s*:/.test(line) && rel.startsWith('src/styles/tokens/')) return;
    if (/^@media/.test(line) && /\d/.test(line)) { literalHits++; fail(`media literal ${rel}:${i + 1}: ${line.slice(0, 80)}`); return; }
    const decl = line.match(/^([a-z-]+)\s*:\s*(.+?);?$/); if (!decl) return;
    const [, prop, value] = decl;
    if (prop.startsWith('--')) { literalHits++; fail(`token declared outside src/styles/tokens ${rel}:${i + 1}: ${line.slice(0, 80)}`); return; }
    /* lengths */
    const lengths = value.match(/(?<![\w.-])-?\d*\.?\d+(px|em|rem|vw|vh|svh|dvh|lvh|ch)\b/g) || [];
    for (const l of lengths) if (!/^-?0(\.0+)?(px|em|rem|vw|vh|svh|dvh|lvh|ch)$/.test(l)) { literalHits++; fail(`length literal ${rel}:${i + 1}: ${prop}: ${value.slice(0, 70)}`); return; }
    /* colours */
    if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(value) || (NAMED.test(value) && !/var\(/.test(value) && ['color', 'background', 'background-color', 'border', 'border-color', 'fill', 'stroke', 'outline', 'outline-color', 'box-shadow', 'text-decoration-color'].includes(prop))) { literalHits++; fail(`colour literal ${rel}:${i + 1}: ${prop}: ${value.slice(0, 70)}`); return; }
    /* unitless line-height / z-index are fine only via tokens */
    if (prop === 'line-height' && /^\d*\.?\d+$/.test(value)) { literalHits++; fail(`line-height literal ${rel}:${i + 1}: ${value}`); return; }
    if (/\bcubic-bezier\(|\b\d*\.?\d+m?s\b/.test(value) && /^(transition|animation|transition-duration|animation-duration|transition-timing-function)$/.test(prop) && !/var\(/.test(value)) { literalHits++; fail(`motion literal ${rel}:${i + 1}: ${prop}: ${value.slice(0, 70)}`); }
  });
}
console.log(`mobile layer: ${mobileCss.length} sheet(s), ${literalHits} literal(s)`);

/* ── 3. tokens resolve ────────────────────────────────────────── */
const declared = new Set();
try { for (const p of walk(join(ROOT, 'src/styles/tokens')).filter((p) => p.endsWith('.css'))) for (const m of readFileSync(p, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)) declared.add(m[1]); } catch {}
let unresolved = 0;
for (const [rel, css] of mobileCss) for (const m of stripComments(css).matchAll(/var\((--[a-z0-9-]+)/g)) if (!declared.has(m[1])) { unresolved++; fail(`undeclared token ${m[1]} read in ${rel}`); }
console.log(`tokens: ${declared.size} declared, ${unresolved} unresolved read(s)`);
console.log(failures ? `\nLITERAL SWEEP: ${failures} failure(s)` : '\nLITERAL SWEEP: clean');
process.exit(failures ? 1 : 0);
