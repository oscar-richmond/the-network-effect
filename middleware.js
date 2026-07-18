/**
 * Vercel Edge Middleware — runs BEFORE the filesystem for every
 * request, which is exactly why it exists in this project: the
 * vercel.json host rewrites run AFTER the filesystem check, so real
 * files (/index.html, /services/…) were served on the launch domain
 * before those rewrites were ever consulted — the launch bug where
 * networkeffectagency.co.uk showed the main site instead of the
 * holding page.
 *
 * On the launch domain (apex + www), EVERY path serves /holding-3's
 * content with the URL untouched — except the holding page's own
 * subresources (hashed bundles, images, favicons) and the
 * deck-request API, which must resolve normally for the page to
 * work. The main site is reachable ONLY via networkeffect.vercel.app
 * (untouched here — non-launch hosts fall straight through).
 */
import { next, rewrite } from '@vercel/edge';

const LAUNCH_HOSTS = new Set([
  'networkeffectagency.co.uk',
  'www.networkeffectagency.co.uk',
]);

const PASSTHROUGH_PREFIXES = ['/_astro/', '/assets/', '/api/'];
const PASSTHROUGH_EXACT = new Set(['/favicon.svg', '/favicon.ico']);

export default function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase();
  if (!LAUNCH_HOSTS.has(host)) return next();

  const { pathname } = new URL(request.url);
  if (
    PASSTHROUGH_EXACT.has(pathname) ||
    PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return next();
  }

  return rewrite(new URL('/holding-3', request.url));
}
