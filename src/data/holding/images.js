import { asset } from '../../utils/asset.js';

/**
 * The holding pages' shared image sets — one source of truth for both
 * /holding (fold gallery) and /holding-2 (stacked warp column), which
 * deliberately reuse identical content so the A/B compares treatment,
 * not imagery. PENDING SIGN-OFF as ever.
 */

/** Oscar's "HP Carousel 1-5" originals (~/Desktop, 480x550 portrait
 * crops), recompressed at native size, mozjpeg q78, 173KB total.
 * galleryImages[0] doubles as /holding's static poster (first paint,
 * reduced motion, no-WebGL); on /holding-2 the server-rendered slide
 * stack itself is the static fallback. */
export const galleryImages = [
  asset('/assets/holding/gallery/01-armchairs-overhead.jpg'),
  asset('/assets/holding/gallery/02-glass-touch.jpg'),
  asset('/assets/holding/gallery/03-staircase.jpg'),
  asset('/assets/holding/gallery/04-portrait.jpg'),
  asset('/assets/holding/gallery/05-panelled-lounge.jpg'),
];

/** The tagline's inline 5-image rotation, in display order (Oscar's
 * "HP 1-5" originals, 220px wide / mozjpeg q80 — ~2x the slot's ~101px
 * render at 1728). */
export const taglineImages = [
  asset('/assets/holding/tagline-image.jpg'), // 1 — veiled sunglasses close-up
  asset('/assets/holding/tagline-image-2.jpg'), // 2 — blue fur portrait
  asset('/assets/holding/tagline-image-3.jpg'), // 3 — red bulls scene
  asset('/assets/holding/tagline-image-4.jpg'), // 4 — B&W portrait pair
  asset('/assets/holding/tagline-image-5.jpg'), // 5 — green sea figure
];
