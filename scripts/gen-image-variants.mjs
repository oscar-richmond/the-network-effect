#!/usr/bin/env node
/**
 * Image variants for the responsive srcsets (the mobile pass, 2026-09-07).
 *
 * Writes `<name>-w<W>.jpg` beside each source (the convention thumb-srcset.js
 * reads at build time — a variant that is missing is simply not offered).
 * JPEG, quality 82, never upscaled: a width wider than the source is skipped.
 * PNG sources produce JPEG variants (the full-size PNG stays for the widths
 * that need it). Idempotent — existing variants are kept unless --force.
 *
 *   node scripts/gen-image-variants.mjs            # the standing list below
 *   node scripts/gen-image-variants.mjs --force    # regenerate everything
 */
import sharp from 'sharp';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const force = process.argv.includes('--force');

/** [glob-ish source, widths, quality] */
const JOBS = [
	/* the /work rail + list images (2000w): phones need ~1100 */
	[/^assets\/landing\/work\/work-page-\d+\.jpg$/, [1200], 82],
	/* case-study streams + heroes (2000–2048w): full rows ~1100, pair thumbs ~400 */
	[/^assets\/landing\/case\/[^/]+\/stream-\d+\.jpg$/, [600, 1200], 82],
	[/^assets\/landing\/case\/[^/]+\/hero\.jpg$/, [1200, 1400], 82],
	/* /services pillars (1254w PNG, ~2.2MB each): a JPEG at the phone's need */
	/* the 1300 is allowed to upscale (the 1254 / 878 sources): a 430×3 phone
	   needs 1290 for a full-bleed frame, and the alternative is the PNG */
	[/^assets\/landing\/services-6\/pillar-[a-z]+\.png$/, [860, 1200, 1300], 82, { upscale: [1300] }],
	/* the access tiles (779w): the phone's half-width tiles need ~500 */
	[/^assets\/landing\/access\/access-\d+\.jpg$/, [600], 82],
	/* the menu overlay's blurred ground on phones (1218w, ~1MB each) */
	[/^assets\/images\/menu\/(Home|Work|Services|Founders)\.jpg$/, [600], 80],
	/* the founders' portraits (870w JPEGs saved as .png, 1.2MB): same pixels as JPEG */
	[/^assets\/landing\/founders-page\/(ashley|robbo)\.png$/, [870], 80],
];

const walk = (dir, out = []) => {
	for (const f of readdirSync(dir)) {
		const p = join(dir, f);
		if (statSync(p).isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
};

const files = walk(ROOT).map((p) => p.slice(ROOT.length + 1));
let made = 0, kept = 0, skipped = 0;
for (const [re, widths, quality, opts = {}] of JOBS) {
	for (const rel of files.filter((f) => re.test(f))) {
		const src = join(ROOT, rel);
		const meta = await sharp(src).metadata();
		for (const w of widths) {
			const out = join(ROOT, dirname(rel), `${basename(rel, extname(rel))}-w${w}.jpg`);
			if (!force && existsSync(out)) { kept += 1; continue; }
			const up = (opts.upscale || []).includes(w);
			if (meta.width < w && !up) { skipped += 1; console.log(`  skip ${rel} → w${w} (source is ${meta.width})`); continue; }
			await sharp(src).resize({ width: w, withoutEnlargement: !up }).jpeg({ quality, mozjpeg: true }).toFile(out);
			made += 1;
			console.log(`  ${rel} → ${basename(out)} (${(statSync(out).size / 1024).toFixed(0)}KB)`);
		}
	}
}
console.log(`variants: ${made} made, ${kept} kept, ${skipped} skipped`);
