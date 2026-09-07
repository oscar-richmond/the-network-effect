/**
 * R86 (Oscar, 2026-09-06) — srcset for the SMALL boxes only. SERVER-SIDE:
 * imported by .astro frontmatter, never by a client script (it reads
 * the disk).
 *
 * Four render sites were feeding full-size files to thumbnails: the
 * case-study rail (2000w for a 340px box), the founders switch thumbs
 * (870w for 64–88px), the footer image (880w for 243px), the legacy
 * services gallery tiles (up to 3072w for 381px in the tablet band).
 * Each gets one 2×-of-box JPEG variant beside the original and a
 * srcset/sizes pair, so a tablet at DPR 2 fetches the variant and the
 * 1728 desktop still fetches the original. Content images were measured
 * at ≤1.6× oversupply and are left alone.
 *
 * THE GUARD. Variants are never upscaled, so a source narrower than the
 * variant width has none — the original IS the right file. This returns
 * undefined unless the variant exists on disk at build time, and the
 * <img> then carries a plain src exactly as before. Without the guard
 * the markup referenced six variants that could not exist and every
 * /services load 404'd twice.
 */
import { existsSync } from 'node:fs';
import { asset } from './asset.js';

export function thumbSrcset(path, variantWidth, fullWidth) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const variant = clean.replace(/\.(jpg|png)$/i, `-w${variantWidth}.jpg`);
  const onDisk = new URL(`../../public${variant}`, import.meta.url);
  if (!existsSync(onDisk)) return undefined;
  return `${asset(variant)} ${variantWidth}w, ${asset(clean)} ${fullWidth}w`;
}
