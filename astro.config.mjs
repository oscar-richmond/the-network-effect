// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: process.env.ASTRO_SITE ?? 'https://networkeffectagency.com',
  base: process.env.ASTRO_BASE ?? '/',
  redirects: {
    // root-landing move: the former /about-3 now serves at "/" — keep
    // circulating deep links (staging previews) landing correctly.
    '/about-3': '/',
  },
});
