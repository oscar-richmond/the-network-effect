/**
 * Responsive image helpers (server-only — they read the disk at build time).
 *
 * thumbSrcset(path, variantWidth, fullWidth)  one variant + the full file
 * imageSrcset(path, widths, fullWidth)        every existing variant + the full
 * gateSrcset(url, fullWidth) / gateSizes(fullWidth)
 *   THE MOBILE PASS (2026-09-07): an image the narrow build never shows
 *   (display:none there) still downloads — Chrome fetches hidden images,
 *   lazy or not. A srcset whose narrow candidate is a 1×1 GIF declared at
 *   8w, with sizes "1px" below the seam, makes the phone pick the GIF and
 *   every wide viewport pick the real file (its sizes branch is the full
 *   width, so the largest candidate — the original — wins, exactly as the
 *   plain src did). No wrapper element, no layout change, no JS.
 *   NOT for images whose src a script swaps (srcset outranks src).
 *
 * Variants are `<name>-w<W>.jpg` beside the source (scripts/gen-image-variants.mjs).
 * A variant that is not on disk is simply not offered, so a missing file
 * can never 404 — the full-size file is always the last candidate.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { asset } from './asset.js';

/* THE DISK LOOKUP resolves from the PROJECT ROOT (process.cwd() — where
   astro dev and astro build both run, locally and on Vercel), NOT from
   import.meta.url: during `astro build` this module is bundled into a
   server chunk whose URL is nowhere near public/, so a URL-relative
   lookup found nothing and every static build shipped without a single
   variant (measured on the 2026-09-07 staging deploy: 0 references in
   the built HTML, all present on the dev server). */
const PUBLIC_DIR = join(process.cwd(), 'public');

const variantPath = (clean, w) => clean.replace(/\.(jpg|jpeg|png)$/i, `-w${w}.jpg`);
const onDisk = (variant) => existsSync(join(PUBLIC_DIR, variant));
const cleanPath = (path) => {
  const stripped = String(path).replace(/^https?:\/\/[^/]+/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
};

export function thumbSrcset(path, variantWidth, fullWidth) {
  const clean = cleanPath(path);
  const variant = variantPath(clean, variantWidth);
  if (!onDisk(variant)) return undefined;
  return `${asset(variant)} ${variantWidth}w, ${asset(clean)} ${fullWidth}w`;
}

export function imageSrcset(path, widths, fullWidth) {
  const clean = cleanPath(path);
  const parts = [];
  for (const w of widths) {
    const variant = variantPath(clean, w);
    if (onDisk(variant)) parts.push(`${asset(variant)} ${w}w`);
  }
  if (!parts.length) return undefined;
  parts.push(`${asset(clean)} ${fullWidth}w`);
  return parts.join(', ');
}

/** The narrow-build gate — a 1×1 transparent GIF the phone picks instead of a desktop-only image. */
export const GATE_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
export const gateSrcset = (url, fullWidth) => `${GATE_GIF} 8w, ${url} ${fullWidth}w`;
export const gateSizes = (fullWidth) => `(max-width: 1359px) 1px, ${fullWidth}px`;

/** The `-w<W>.jpg` variant's path when it exists, else the original — for a src that is phone-only. */
export function variantOr(path, w) {
  const clean = cleanPath(path);
  const variant = variantPath(clean, w);
  return asset(onDisk(variant) ? variant : clean);
}
