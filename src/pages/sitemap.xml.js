/**
 * SITEMAP — SEO batch item 3 (Oscar, 2026-09-04).
 *
 * LIVE ROUTES ONLY, listed explicitly rather than crawled from the
 * build output: the output also contains the holding pages (still
 * deployed and served on the launch domain by the edge middleware), the
 * archived /old site, the /landing redirect stub and /scale-shell — none
 * of which are content, and all of which a directory walk would sweep in.
 * The case studies come from the data so a new study appears here the
 * moment it is added.
 *
 * `changefreq`/`priority` are omitted deliberately — Google ignores both,
 * and a wrong value is worse than none.
 */
import { CASE_STUDIES } from '../data/landing/case-studies.js';

const SITE = 'https://networkeffectagency.co.uk';

/** The site's real, indexable pages. */
export const LIVE_ROUTES = [
  '/',
  '/work',
  '/services',
  '/founders',
  '/contact',
  ...CASE_STUDIES.map((c) => `/work/${c.base.slug}`),
];

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = LIVE_ROUTES.map((r) => `  <url>\n    <loc>${SITE}${r}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
