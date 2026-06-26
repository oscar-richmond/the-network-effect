import { createPreview } from 'shaders/js';

const PRESET_ID = '25255ad0-01c8-4b60-9c7e-243e17d83dcb';

/**
 * @param {HTMLCanvasElement | null} canvas
 * @returns {Promise<import('shaders/js').PreviewInstance | null>}
 */
export async function initHeroShader(canvas) {
  if (!canvas) return null;

  const preview = await createPreview(canvas, { presetId: PRESET_ID });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preview.pause();
  }

  return preview;
}
