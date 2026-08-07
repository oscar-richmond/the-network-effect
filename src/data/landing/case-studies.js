/**
 * CASE STUDIES — per-study content for /work/[slug] (Figma 32:3306
 * "Case Study Page", extracted 2026-08-07; the frame's 118px chrome
 * — 35px top bar + 83px browser toolbar — subtracted upstream).
 *
 * SINGLE SOURCE OF TRUTH: each study REFERENCES its featured-work
 * entry (title / slug / index / tags come from there — never
 * duplicated). Adding a study when the client's content lands is a
 * PURE DATA DROP: append an object here, done — zero layout code.
 *
 * ═══ ALL COPY IS PLACEHOLDER ═══ Every string below is the dummy
 * draft pending the client's real account of each project. Per-field
 * flags mark the specific outstanding questions.
 *
 * ═══ RIGHTS CONFIRMATION REQUIRED — INSTAGRAM-SOURCED IMAGERY ═══
 * The Yoxman stream images are Instagram-sourced per the file's own
 * layer names (49035…_n etc.) and several contain RECOGNIZABLE
 * PEOPLE (chefs, guests). Explicit rights confirmation is required
 * for every image before anything ships — this is the elevated
 * third-party class, not standard pending-sign-off. sRGB-converted
 * on processing.
 */
import { asset } from '../../utils/asset.js';
import { FEATURED_CARDS } from './featured-work.js';

const ref = (slug) => {
  const hit = FEATURED_CARDS.find((c) => c.slug === slug);
  if (!hit) throw new Error(`case-studies: unknown featured-work slug ${slug}`);
  return hit;
};

const yox = (n) => asset(`/assets/landing/case/yoxman/${n}`);

/**
 * @typedef {{ layout: 'full' | 'pair', narrowFirst?: boolean, imgs: string[] }} StreamRow
 *   layout 'full' = one 1095-wide image; 'pair' = 360 + 727 (8px gap),
 *   narrowFirst controls which side the 360 sits.
 */

export const CASE_STUDIES = [
  {
    base: ref('yoxman-food-festival'),
    subtitle: 'A New Platform for Culinary Culture', // PLACEHOLDER copy
    heroImg: yox('hero.jpg'),
    /* PLACEHOLDER copy. The leading indent is reproduced as padding
       (the footer-statement spacer precedent). */
    intro:
      'Created from concept, Yoxman brought together Michelin-starred chefs, premium partners and discerning guests for an intimate multi-day culinary experience.',
    /* Services-taxonomy strings only, per pillar (the file's lists). */
    whatWeDid: {
      immerse: ['Music & Food Festivals', 'Cultural Programming', 'Experiential Campaigns'],
      connect: ['Strategic Introductions', 'Talent Partnerships', 'Brand Alignment', 'Commercial Management'],
      amplify: ['Brand-led Narratives', 'Talent Partnerships', 'Campaign Content'],
    },
    ourWork: {
      /* PLACEHOLDER copy. FLAG: the file says "Rob", not "Robbo" —
         built per file, needs confirmation. */
      desc: 'Rob led every aspect of the project from strategy and positioning through to programming, partnerships and delivery.',
      /* The file's rows, top to bottom (all RIGHTS-flagged, see
         header): full / pair(360+727) / full / full / pair(727+360)
         / full. */
      stream: [
        { layout: 'full', imgs: [yox('stream-1.jpg')] },
        { layout: 'pair', narrowFirst: true, imgs: [yox('stream-2.jpg'), yox('stream-3.jpg')] },
        { layout: 'full', imgs: [yox('stream-4.jpg')] },
        { layout: 'full', imgs: [yox('stream-5.jpg')] },
        { layout: 'pair', narrowFirst: false, imgs: [yox('stream-6.jpg'), yox('stream-7.jpg')] },
        { layout: 'full', imgs: [yox('stream-8.jpg')] },
      ],
    },
    /* PLACEHOLDER copy — the file's six bullets. */
    keyImpact: [
      'Festival concept and brand positioning',
      'Michelin-star chef programming',
      'Premium partnership development',
      'Guest experience and hospitality design',
      'Commercial sponsorship',
      'End-to-end event production',
    ],
    /* MORE WORK derives in the template (Oscar's rev): every /work
       project except this study, in the landing order, with the
       /work page's images and descriptions — no per-study list. */
  },
];

/** Slugs with a LIVE case-study page — /work's tiles navigate for
 *  these; everything else stays an inert placeholder. */
export const LIVE_CASE_SLUGS = CASE_STUDIES.map((c) => c.base.slug);
