import { asset } from '../../utils/asset.js';

/**
 * The holding pages' shared image sets — one source of truth for both
 * /holding (fold gallery) and /holding-2 (stacked warp column), which
 * deliberately reuse identical content so the A/B compares treatment,
 * not imagery. PENDING SIGN-OFF as ever.
 */

/** /holding's fold-gallery set — Oscar's "HP Carousel 1-5" originals
 * (~/Desktop, 480x550 portrait crops), recompressed at native size,
 * mozjpeg q78, 173KB total. galleryImages[0] doubles as /holding's
 * static poster (first paint, reduced motion, no-WebGL). */
export const galleryImages = [
  asset('/assets/holding/gallery/01-armchairs-overhead.jpg'),
  asset('/assets/holding/gallery/02-glass-touch.jpg'),
  asset('/assets/holding/gallery/03-staircase.jpg'),
  asset('/assets/holding/gallery/04-portrait.jpg'),
  asset('/assets/holding/gallery/05-panelled-lounge.jpg'),
];

/** /holding-2's warp-column set — Oscar's "HPG Image 1-7" (~/Desktop
 * 'HP Carousel' folder, refreshed 2026-07-16; the task's "HP Gallery"),
 * all 800x534 landscape (uniform — no height variation in this set
 * either), recompressed at native size (~2x the 405px display width),
 * mozjpeg q78, 423KB total. The two sets deliberately FORK here: the
 * fold set above stays referenced by /holding. */
export const warpGalleryImages = [
  asset('/assets/holding/warp/01-seated-portrait.jpg'),
  asset('/assets/holding/warp/02-panelled-lounge.jpg'),
  asset('/assets/holding/warp/03-portrait.jpg'),
  asset('/assets/holding/warp/04-glass-touch.jpg'),
  asset('/assets/holding/warp/05-armchairs.jpg'),
  asset('/assets/holding/warp/06-close-portrait.jpg'),
  asset('/assets/holding/warp/07-staircase.jpg'),
];

/** The mobile travelling-image cycle (Oscar's spec): exactly HPG Image
 * 2 -> 4 -> 5, looping — a subset of the warp set above (same processed
 * assets, no new exports). The desktop warp column keeps all seven. */
export const travelGalleryImages = [
  warpGalleryImages[1], // HPG Image 2 — panelled lounge
  warpGalleryImages[3], // HPG Image 4 — glass touch
  warpGalleryImages[4], // HPG Image 5 — armchairs
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
