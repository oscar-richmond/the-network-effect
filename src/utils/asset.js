/**
 * @param {string} path
 */
export function asset(path) {
  const base = import.meta.env.BASE_URL;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${clean}`;
}

/**
 * @param {string} path
 */
export function withBase(path) {
  if (!path.startsWith('/')) return `${import.meta.env.BASE_URL}${path}`;
  return asset(path);
}

/**
 * R86 (Oscar, 2026-09-06) — srcset for the SMALL boxes only. Four render
 * sites were feeding full-size files to thumbnails: the case-study rail
 * (2000w for a 130–340px box), the founders switch thumbs (870w for
 * 64–88px), the footer image (880w for 100px), the legacy services
 * gallery tiles (2000–3072w for 389px in the tablet band). Each gets a
 * single 2×-of-box JPEG variant beside the original and a srcset/sizes
 * pair, so a tablet at DPR 2 fetches the variant and a 1728 desktop
 * still fetches the original. Content images (heroes, streams at full
 * width) were measured at ≤1.6× oversupply and are deliberately left
 * alone — a site-wide pipeline is out of proportion for that.
 * Returns undefined when no variant exists, so the <img> falls back to
 * a plain src exactly as before.
 */
export function thumbSrcset(path, variantWidth, fullWidth) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const variant = clean.replace(/\.(jpg|png)$/i, `-w${variantWidth}.jpg`);
  return `${asset(variant)} ${variantWidth}w, ${asset(clean)} ${fullWidth}w`;
}
