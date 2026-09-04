// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  /* SEO batch (Oscar, 2026-09-04): the LIVE domain is .CO.UK — the
     middleware's LAUNCH_HOSTS, the canonical email address and the
     sitemap all say so; this said .com, so every canonical this value
     feeds pointed at a domain the site is not served from. Corrected.
     ASTRO_SITE still overrides for staging. */
  site: process.env.ASTRO_SITE ?? 'https://networkeffectagency.co.uk',
  base: process.env.ASTRO_BASE ?? '/',
  redirects: {
    // root-landing move: the former /about-3 now serves at "/" — keep
    // circulating deep links (staging previews) landing correctly.
    '/about-3': '/',
  },
});
