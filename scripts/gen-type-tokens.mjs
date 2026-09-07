#!/usr/bin/env node
/**
 * THE TYPE SCALE SYSTEM — one source that emits src/styles/type-tokens.css
 * (the foundation task, 2026-09-07; the mobile + tablet rebuild reads the
 * tokens everywhere below the seam). Edit the tunables below and re-run:
 *
 *   node scripts/gen-type-tokens.mjs
 *
 * THE ONE TUNABLE (Oscar, 2026-09-07): TYPE_SCALE_EXPONENT_MOBILE. Every
 * phone size is body × (desktop ÷ 18) ^ k. The shipped k is derived from
 * the two ends — body 16 and the 100px statement at 36 (the longest
 * display word, "RELATIONSHIPS." at Dazzed 600 −4%, is 8.7em wide, so 36
 * is what a 312px measure allows) — k = ln(36/16) ÷ ln(100/18) = 0.4728.
 * Replace the expression with a number to re-derive the whole hierarchy
 * in one place: a larger k spreads the roles apart (bigger headlines for
 * the same body), a smaller k compresses them. The tablet band slides its
 * own exponent from TYPE_SCALE_EXPONENT_TABLET[0] at 768 to [1] at 1359;
 * the shipped end is derived so the display reaches 79 at 1359 — what
 * the shell renders at 1360 — and headlines do not jump at the seam.
 *
 * Roles come from the rendered 1728 inventory (42 combos over 3,017 runs,
 * collapsed to the roles below with their desktop variants recorded as
 * the reported inconsistencies — the desktop itself is never changed).
 *
 * LEADING is re-derived per role class: tight display leadings loosen a
 * little at small sizes (0.88 → 0.92 on the phone), body serif opens to
 * 1.5 at 17px, single-line labels stay near 1. TRACKING scales by size
 * class: ≥64px keeps the desktop em, 40–64 keeps 75%, 24–40 keeps 50%,
 * under 24 drops to 0. FACES, WEIGHTS and CASE are preserved per role.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── THE TUNABLES ──────────────────────────────────────────────────── */
/** The phone exponent (see the header). Replace with a number to tune. */
export const TYPE_SCALE_EXPONENT_MOBILE = Math.log(36 / 16) / Math.log(100 / 18); // 0.4728
/** The tablet band's exponent at 768 and at 1359. */
export const TYPE_SCALE_EXPONENT_TABLET = [0.70, Math.log(79 / 17.5) / Math.log(100 / 18)]; // 0.70 → 0.878
/** Body sizes: desktop; the phone at 360 → 430; the band at 768 → 1359. */
export const BODY_DESKTOP = 18;
export const BODY_MOBILE = [16, 17];
export const BODY_TABLET = [17, 17.5];
/* ─────────────────────────────────────────────────────────────────── */

const BODY_D = BODY_DESKTOP;
const k_m = TYPE_SCALE_EXPONENT_MOBILE;
const [k_t0, k_t1] = TYPE_SCALE_EXPONENT_TABLET;
const BODY_M = BODY_MOBILE, BODY_T = BODY_TABLET;

const FACES = { serif: 'var(--font-serif-cond)', sans: "'Dazzed', var(--font-display, sans-serif)" };

/* role: [name, face, weight, desktopSize, desktopLH(px), desktopTrackingEm, case, leading class, sample, notes, variants[]] */
const ROLES = [
	['counter', 'serif', 500, 400, 400, -0.02, 'none', 'display', '89', 'The splash-B counter. Viewport-relative (25vw) below the seam — it is the splash, not page type.', []],
	['statement', 'sans', 600, 100, 88, -0.04, 'upper', 'display', 'The network effect exists to connect people, brands and talent.', 'The dline grammar: the closing statement (/ and /services), the /services fragments, the case-study hero title.', ['case hero title tracks −5px (−0.05em) where the statement and fragments track −4px (−0.04em)', 'fragments are authored caps with text-transform none; the statement and hero use uppercase']],
	['display', 'sans', 600, 90, 79.2, -0.05, 'upper', 'display', 'POWERED BY ACCESS.', 'The hero headline\'s sans line, the reel\'s TO IMPACT, the /services hero sans, LET\'S START A CONVERSATION, FEATURED / MORE WORK, the 404 headline.', ['leading 79.2 (0.88) on the hero and /services hero vs 88 (0.978) on /contact, /work and the case-study MORE WORK']],
	['display-serif', 'serif', 500, 90, 82.8, -0.04, 'upper', 'display', 'BUILT ON TRUST.', 'The mixed-face partner of display: the hero headline\'s serif line, FROM ACCESS., the reel\'s FROM ACCESS, CONVERSATION., WORK.', []],
	['heading', 'sans', 600, 56, 54, -0.035, 'upper', 'heading', 'NEARLY 20 YEARS BUILDING GLOBAL RELATIONSHIPS', 'Section headings and statements at 56: the founders band, FEATURED WORK / WE CREATE ACCESS lines, the case-study intro, the footer statement, the pillar names, the founders\' names, the /services statements.', ['leading 50 (0.893) on the founders band and the featured heading vs 54 (0.964) everywhere else', 'the closing headline (MOST BRANDS STRUGGLE…) tracks −0.196px — −0.0035em against the role\'s −0.035em: a dropped digit']],
	['heading-serif', 'serif', 500, 56, 50, -0.035, 'none', 'heading', 'Talent / Brands / Business', 'The mixed-face partner of heading: the access word slots, CREATE ACCESS, the footer statement\'s serif line (48).', ['the footer statement\'s serif line renders 48/48 −0.02em against the 56/50 word slots']],
	['term', 'serif', 500, 48, 52, 0, 'none', 'heading', 'Talent / Hospitality / TV & Film', 'The network marquee terms (and their separators).', []],
	['keyword', 'sans', 600, 48, 48, 0, 'upper', 'heading', 'CULTURE', 'The closing section\'s keyword tiles.', []],
	['lede', 'serif', 500, 36, 40, -0.0286, 'none', 'lede', 'We connect Talent, Brands & Audiences through Experiences, Strategic Partnerships & Media.', 'The hero intro and the /services hero description.', []],
	['title', 'serif', 500, 34, 38, -0.03, 'none', 'lede', 'TheNetworkEffect', 'The wordmark and the featured / MORE WORK card titles share one role.', []],
	['note', 'serif', 500, 32, 35.4, -0.027, 'none', 'lede', 'Our work is structured across three connected pillars.', 'The reel\'s pillars note; the founders band\'s portrait names (32/24 — a leading below the size).', ['portrait names 32/24: line-height 24 on 32px text, the frame\'s box']],
	['subtitle', 'serif', 500, 28, 32, -0.03, 'none', 'lede', 'Activate Experiences & Cultural Moments', 'The pillar subtitles (the reel\'s two authored lines).', []],
	['row', 'serif', 500, 26, 32, -0.02, 'none', 'body', 'Talent-Led Experiences', 'The /services table rows, the founders\' relationship rows, the /work grid names (26/28).', ['grid names 26/28 −0.03em vs rows 26/32 −0.02em']],
	['index', 'sans', 600, 24, 24, 0, 'none', 'label', '/01', 'The pillar and drawer indices.', []],
	['tile', 'sans', 600, 24, 28, -0.035, 'upper', 'label', 'IMMERSE', 'The drawer\'s pillar tile names.', []],
	['body', 'serif', 500, 21, 28, -0.015, 'none', 'body', 'Over seven years, Rob helped transform Wilderness Reserve from a private country estate into one of Britain\'s leading luxury hospitality destinations.', 'The serif body: the case facts, the reel\'s rows, the founders\' biography; the drawer\'s confirmation copy at 24/30.', ['sp-copy 24/30 −0.02em vs body 21/28 −0.015em', 'drawer tile descriptions 18/22 −0.02em']],
	['body-sans', 'sans', 400, 18, 27, 0, 'none', 'body', 'Where we can reach you.', 'The drawer\'s Dazzed Regular copy and field labels (the one Dazzed 400 role).', []],
	['label', 'sans', 600, 16, 16, -0.02, 'upper', 'label', 'START A PROJECT', 'The nav links, every chip and button, the table labels, the network line, VIEW ALL.', ['nav 16/16 −0.02em; buttons and CTAs 16/16 0; table labels 16/19 0; the network line 16/20 −0.02em; VIEW ALL WORK 16/24; LET\'S CHAT 16/21.3 mixed case', 'the /contact and 404 nav renders at 18/18 −0.02em against 16/16 elsewhere', 'gallery labels 18/22 uppercase']],
	['eyebrow', 'sans', 600, 14, 16, 0, 'upper', 'label', 'WHO WE ARE', 'WHO WE ARE, the facts labels, the founders\' role line; the drawer\'s chips and field labels (14/18 +0.02em); the lightbox CLOSE (14/21).', ['drawer chips/labels 14/18 +0.02em', 'lightbox CLOSE 14/21 mixed case']],
	['small', 'serif', 500, 14, 16, 0, 'none', 'body', 'Site Index · Hello@networkeffectagency.co.uk', 'The footer\'s small text (index, address, socials, legal, copyright), the founders indicator (12/18).', ['founders indicator 12/18']],
	['micro', 'sans', 600, 13, 19.5, 0.02, 'none', 'label', 'Skip to content', 'The skip link; the COPIED tip (12/12 +0.02em uppercase).', ['COPIED 12/12 uppercase']],
];

const LEAD = { // leading ratios per class: [desktop→ keep?, tablet, mobile]
	display: (d) => [d, Math.max(d, 0.90), Math.max(d, 0.92)],
	heading: (d) => [d, Math.max(d, 0.93), Math.max(d, 0.96)],
	lede: (d) => [d, Math.max(d, 1.15), Math.max(d, 1.2)],
	body: (d) => [d, Math.max(d, 1.45), Math.max(d, 1.5)],
	label: (d) => [d, Math.max(d, 1.1), Math.max(d, 1.2)],
};
const trackAt = (em, size) => (em >= 0 ? em : size >= 64 ? em : size >= 40 ? em * 0.75 : size >= 24 ? em * 0.5 : 0);
const r2 = (x) => Math.round(x * 100) / 100;
const scale = (dSize, body, k) => body * Math.pow(dSize / BODY_D, k);
/* FLOORS. Body ≥ 16 (below it iOS zooms a focused field and a condensed serif loses its counters);
   anything interactive ≥ 14 (the nav and every chip, the index that is a control in the drawer);
   labels and captions ≥ 12 (the smallest size the condensed serif and Dazzed caps stay legible at
   3× density); a display or heading role that would fall under 24 stops being one — held at 24. */
const FLOOR = { counter: 64, statement: 24, display: 24, "display-serif": 24, heading: 24, "heading-serif": 24, term: 24, keyword: 24, lede: 18, title: 18, note: 18, subtitle: 18, row: 16, body: 16, "body-sans": 16, index: 14, tile: 14, label: 14, eyebrow: 12, small: 12, micro: 12 };
const floorOf = (name) => FLOOR[name] ?? 12;

const rows = [];
let css = `/* ═══════════════════════════════════════════════════════════════════
   TYPE TOKENS — the desktop's hierarchy carried to the tablet band and
   the phone. ONE SOURCE (generated by the type-system script in the
   2026-09-07 foundation task; edit the roles there, not here).

   Every role is [face · weight · size · leading · tracking · case]. The
   desktop values (:root) are the rendered 1728 build's, for reference
   and for the specimen — the desktop stylesheets keep their literals.
   Below the seam the sizes are FLUID: clamp() between the band's edges
   (phone 360 → 430, tablet 768 → 1359), so both edges look designed.

   THE SCALE: mobile size = body × (desktop ÷ 18)^k, k = 0.473 — fixed by
   the two ends (body 16, the 100px statement at 36 so "RELATIONSHIPS."
   fits a 312px measure); rank and log-proportion between roles survive.
   Tablet: body 17 → 17.5, exponent 0.70 → 0.878 so the display reaches
   79 at 1359 — what the shell renders at 1360 — and headlines do not
   jump at the seam. Leading re-derives per class (display 0.88 → 0.92,
   body → 1.5); tracking scales by size class (≥64px keeps the desktop
   em, 40–64 keeps 75%, 24–40 keeps 50%, under 24 drops to 0).
   Floors: body ≥ 16, interactive ≥ 14, labels ≥ 12.
   ═══════════════════════════════════════════════════════════════════ */
:root {
  --font-type-serif: ${FACES.serif};
  --font-type-sans: ${FACES.sans};
`;
let cssM = `@media (max-width: 767px) {\n  :root {\n`;
let cssT = `@media (min-width: 768px) and (max-width: 1359px) {\n  :root {\n`;
const fluid = (s1, w1, s2, w2) => {
	if (Math.abs(s2 - s1) < 0.05) return `${r2(s1)}px`;
	const b = (s2 - s1) / (w2 - w1) * 100; const a = s1 - b * w1 / 100;
	return `clamp(${r2(Math.min(s1, s2))}px, calc(${r2(a)}px + ${r2(b)}vw), ${r2(Math.max(s1, s2))}px)`;
};
for (const [name, face, weight, dSize, dLH, dTrack, kase, cls, sample, notes, variants] of ROLES) {
	const interactive = ['label', 'micro'].includes(name);
	const floor = floorOf(name);
	let m0 = scale(dSize, BODY_M[0], k_m), m1 = scale(dSize, BODY_M[1], k_m);
	let t0 = scale(dSize, BODY_T[0], k_t0), t1 = scale(dSize, BODY_T[1], k_t1);
	if (name === 'counter') { m0 = 90; m1 = 108; t0 = 192; t1 = 340; }
	/* a role below the desktop body shrinks as the band's exponent rises; it holds its 768 value instead */
	if (dSize < BODY_D) t1 = Math.max(t1, t0);
	m0 = Math.max(m0, floor); m1 = Math.max(m1, floor); t0 = Math.max(t0, floor); t1 = Math.max(t1, floor);
	const dRatio = dLH / dSize;
	const [lhD, lhT, lhM] = LEAD[cls](dRatio);
	const trM = trackAt(dTrack, (m0 + m1) / 2), trT = trackAt(dTrack, (t0 + t1) / 2);
	const faceVar = face === 'serif' ? 'var(--font-type-serif)' : 'var(--font-type-sans)';
	const caseVal = kase === 'upper' ? 'uppercase' : 'none';
	css += `  --type-${name}-face: ${faceVar};\n  --type-${name}-weight: ${weight};\n  --type-${name}-case: ${caseVal};\n  --type-${name}-size: ${dSize}px;\n  --type-${name}-lh: ${r2(lhD)};\n  --type-${name}-ls: ${dTrack}em;\n`;
	cssM += `    --type-${name}-size: ${name === 'counter' ? 'clamp(64px, 25vw, 400px)' : fluid(m0, 360, m1, 430)};\n    --type-${name}-lh: ${r2(lhM)};\n    --type-${name}-ls: ${r2(trM)}em;\n`;
	cssT += `    --type-${name}-size: ${name === 'counter' ? 'clamp(160px, 25vw, 400px)' : fluid(t0, 768, t1, 1359)};\n    --type-${name}-lh: ${r2(lhT)};\n    --type-${name}-ls: ${r2(trT)}em;\n`;
	rows.push({ role: name, face: face === 'serif' ? 'Serrif Condensed' : 'Dazzed', weight, case: caseVal, desktop: `${dSize}/${dLH} ${dTrack}em`, tablet: `${r2(t0)} → ${r2(t1)} · lh ${r2(lhT)} · ${r2(trT)}em`, mobile: `${r2(m0)} → ${r2(m1)} · lh ${r2(lhM)} · ${r2(trM)}em`, floor: `${floor}px ${Math.min(m0, m1) >= floor ? '✓' : '✗'}${Math.min(m0, m1) === floor && scale(dSize, BODY_M[0], k_m) < floor ? ' (held)' : ''}`, sample, notes, variants, tokens: `--type-${name}-{face,weight,case,size,lh,ls}` });
}
css += `}\n\n` + cssM + `  }\n}\n\n` + cssT + `  }\n}\n`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');
writeFileSync(`${OUT}/type-tokens.css`, css);
console.log(`type-tokens.css written — k_m ${r2(k_m)}  k_t ${k_t0} → ${r2(k_t1)}`);
for (const r of rows) console.log(`${r.role.padEnd(14)} ${r.face.padEnd(17)} ${String(r.weight).padEnd(4)} ${r.desktop.padEnd(22)} T ${r.tablet.padEnd(40)} M ${r.mobile.padEnd(40)} floor ${r.floor}`);
