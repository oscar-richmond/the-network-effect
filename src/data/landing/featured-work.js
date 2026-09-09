/**
 * FEATURED WORK — card content (Figma 22:3021, extracted 2026-08-06).
 *
 * Card ORDER is Oscar's (2026-08-06 re-order): Wilderness, Top Boy,
 * Pavilion Club, Pavilion Summit, Adolescence, Yoxman, Thunder,
 * Animol — indexes renumbered to match. Asset filenames keep their
 * original slot numbers (work-N maps by content, not position).
 * Image crops are window-relative; `cover: true` = object-fit
 * cover instead of an exact crop.
 *
 * FILE FIXES (Oscar-approved):
 * - Thunder Aviation's index read /04 in the file — corrected /05.
 * - Its dark-text instance carried Yoxman's description — the
 *   correct aviation copy is used.
 * - Pavilion Club's "businessled" -> "business-led" (minor copy
 *   mend, flagged).
 *
 * ═══ RIGHTS CONFIRMATION REQUIRED — NAMED-PERSON IMAGERY ═══
 * The PAVILION CLUB image (work-2.jpg) contains a RECOGNIZABLE
 * PUBLIC FIGURE. Beyond the standard pending-sign-off, the founders
 * must explicitly confirm PERMISSION to use this person's likeness
 * before launch — this is a rights question, not a preference one.
 *
 * PENDING FOUNDER SIGN-OFF: all imagery is placeholder until
 * licensed finals.
 *
 * Cards /04 and /05 carry OSCAR-SUPPLIED images (2026-08-06),
 * replacing the file exports (and retiring the old card-4 trimmed-
 * export caveat) — cover-fit, sRGB-converted. Still pending formal
 * founder sign-off like all imagery.
 */
import { asset } from '../../utils/asset.js';

const a = (n) => asset(`/assets/landing/featured/work-${n}.jpg`);
const wp = (n) => asset(`/assets/landing/work/work-page-${n}.jpg`);

/** @typedef {{ index: string, title: string[], desc: string, img: { src: string, w?: number, h?: number, x?: number, y?: number, cover?: boolean } }} FeaturedCard */

/** @type {FeaturedCard[]} */
export const FEATURED_CARDS = [
  {
    index: '/01',
    title: ['Wilderness', 'Reserve'],
    slug: 'wilderness-reserve',
    /* PROVISIONAL pillar tags — final tagging is a founder/content
       decision (destination experiences + partnerships). */
    tags: ['immerse', 'connect'],
    workImg: wp(1), // /work carousel image (Figma 27:3103, interior)
    desc: 'Developed one of the UK’s leading luxury destinations, spanning hospitality, events, guest experiences and talent partnerships.',
    img: { src: a(1), cover: true }, // Oscar-supplied final (2026-08-06; file crop retired)
  },
  {
    /* RIGHTS: recognizable cast, TV key-art class — see header. */
    index: '/02',
    title: ['Top Boy'],
    slug: 'top-boy',
    tags: ['amplify'], // PROVISIONAL
    workImg: wp(4), // /work carousel image (b/w promotional still)
    desc: 'A defining British screen project with global cultural reach, rooted in storytelling, music, fashion and culture.',
    img: { src: a(6), cover: true },
  },
  {
    /* RIGHTS: see the named-person flag in the header. */
    index: '/03',
    title: ['Pavilion', 'Club'],
    slug: 'pavilion-club',
    tags: ['connect', 'immerse'], // PROVISIONAL
    /* Trimmed one line ("high-profile" dropped) so "experiences."
       isn't a widow (Oscar's rev). */
    desc: 'Created and scaled a private membership programme across four clubs, connecting founders, CEOs and talent through cultural and business-led experiences.',
    img: { src: a(2), w: 723, h: 468, x: -165.93, y: -2 },
  },
  {
    index: '/04',
    title: ['Pavilion', 'Summit'],
    slug: 'pavilion-summit',
    tags: ['immerse', 'connect'], // PROVISIONAL
    desc: 'A 24-hour immersive leadership experience, delivered from ideation to execution, bringing CEOs, founders and cultural voices together.',
    img: { src: a(3), w: 720, h: 466, x: -225.87, y: 0 },
  },
  {
    /* RIGHTS: recognizable cast, TV key-art class — see header. */
    index: '/05',
    title: ['Adolescence'],
    slug: 'adolescence',
    tags: ['amplify'], // PROVISIONAL
    workImg: wp(7), // /work carousel image (series key art)
    desc: 'Contemporary screen work reinforcing Ashley’s position as one of the UK’s most recognisable voices.',
    img: { src: a(7), cover: true },
  },
  {
    index: '/06',
    title: ['Yoxman Food', 'Festival'],
    slug: 'yoxman-food-festival',
    tags: ['immerse'], // PROVISIONAL
    /* Trimmed one line ("guest journey" dropped) so "experience."
       isn't a widow (Oscar's rev). */
    desc: 'Created and launched a Michelin-starred culinary festival, uniting world-class chefs, premium partnerships, creative direction and luxury hospitality experience.',
    img: { src: a(4), cover: true }, // Oscar-supplied final (2026-08-06)
  },
  {
    index: '/07',
    title: ['Thunder', 'Aviation'],
    slug: 'thunder-aviation',
    tags: ['connect'], // PROVISIONAL
    desc: 'Developed luxury aviation positioning and partnership strategy across private travel, premium hospitality and high-net-worth experiences.',
    img: { src: a(5), cover: true }, // Oscar-supplied final (2026-08-06)
  },
  {
    /* RIGHTS: Ashley on set — see header. */
    index: '/08',
    /* CASING RULED (Oscar, 2026-08-27): sentence case. Authored
       final - surfaces must not re-transform (the natural-case
       pattern). */
    title: ['Animol'],
    slug: 'animol',
    tags: ['amplify'], // PROVISIONAL
    workImg: wp(9), // /work carousel image (Berlinale artwork)
    desc: 'Directorial feature debut, marking Ashley’s evolution from actor and producer to filmmaker and creative lead.',
    img: { src: a(8), cover: true },
  },
];

/* ═══ /work PAGE (Figma 27:3103) ═══════════════════════════════════
   The page's 9-image carousel reuses the entries above (single
   source of truth) and adds the file's images that have NO landing
   entry, below, as TBC content stubs — titles/copy/tags PENDING
   OSCAR'S CONTENT DROP.

   ═══ RIGHTS CONFIRMATION REQUIRED — ELEVATED, THIRD-PARTY IP /
   NAMED PERSONS ═══ Beyond the standard pending-sign-off: the Top
   Boy and Adolescence promotional stills, the adidas Spezial
   campaign shot, the Animol Berlinale artwork, and every
   recognizable-person image below (the documentary-presenter
   portrait, the Ashley Walters portrait, the chef portrait) are
   broadcast/brand properties or named-person likenesses, NOT
   stock. Explicit rights confirmation is required for each before
   anything ships. */

/** @typedef {{ index: string, title: string[], desc: string, slug: string, tags: string[], workImg: string, tbc?: boolean }} WorkStub */

/** @type {WorkStub[]} — TBC stubs, /work only (never on /landing). */
export const WORK_EXTRAS = [
  {
    /* TBC — unidentified project. RIGHTS: recognizable public
       figure (documentary presenter); press-photo class. */
    index: '/00',
    title: ['TBC'],
    desc: 'Content to follow.',
    slug: 'tbc-documentary',
    tags: [], // TBC
    workImg: wp(2),
    tbc: true,
  },
  {
    /* TBC — unidentified hospitality interior (possibly Pavilion
       Club — Oscar to confirm; if so, fold into that entry). */
    index: '/00',
    title: ['TBC'],
    desc: 'Content to follow.',
    slug: 'tbc-hospitality',
    tags: [], // TBC
    workImg: wp(3),
    tbc: true,
  },
  {
    /* R39 item 2 (Oscar, 2026-09-04): REAL CONTENT — the Rolling Stone
       portrait entry. RIGHTS: named-person portrait (Ashley Walters) —
       the standing elevated flag stands; the slug is kept for the
       existing deep links / the grid composition (no URL of its own —
       an unbuilt study, rendered as a placeholder tile / card). Index
       /09 = the ninth project on the page (was the stub's /00). */
    index: '/09',
    title: ['Music and Culture'],
    desc: 'A long-standing presence across British music, entertainment and youth culture.',
    slug: 'tbc-ashley-walters',
    tags: [],
    workImg: wp(5),
    tbc: false,
  },
  {
    /* TBC — RIGHTS: recognizable chef portrait (possibly Yoxman-
       related — Oscar to confirm). */
    index: '/00',
    title: ['TBC'],
    desc: 'Content to follow.',
    slug: 'tbc-chef',
    tags: [], // TBC
    workImg: wp(6),
    tbc: true,
  },
  {
    /* TBC — RIGHTS: adidas Spezial campaign photography (brand
       property). */
    index: '/00',
    title: ['TBC'],
    desc: 'Content to follow.',
    slug: 'tbc-adidas-spezial',
    tags: [], // TBC
    workImg: wp(8),
    tbc: true,
  },
];

/** The /work carousel — the LANDING SECTION'S ORDER and copy
 *  (Oscar's rev 2026-08-06, superseding the file's 9-image order):
 *  all eight landing projects, titles + descriptions matching the
 *  home Featured Work section. IMAGES: entries without a dedicated
 *  work-page image fall back to their landing card image as a
 *  PLACEHOLDER — Oscar's image drop follows (copy-only change,
 *  his words). The WORK_EXTRAS stubs above stay defined but ride
 *  no carousel until their content lands — an extra whose content
 *  HAS landed (tbc: false; R39: Music and Culture) rides every
 *  surface. */
export const WORK_PROJECTS = [
  ...FEATURED_CARDS.map((c) => ({
    ...c,
    workImg: c.workImg ?? c.img.src, // PLACEHOLDER pending Oscar's drop
  })),
  /* R39 item 2: an extra with REAL content (tbc: false) joins every
     /work surface — the desktop list, the grid, the case studies'
     MORE WORK rail — from this one source. The TBC stubs stay out. */
  ...WORK_EXTRAS.filter((e) => !e.tbc),
];

/* ═══ /work GRID — HOVER IMAGES (R38 item 5, Oscar 2026-09-04) ═══
   Each grid tile swaps to a SECOND image on hover (the /services
   row-hover cover-swap, cover-swap.js). ALL PLACEHOLDER pending real
   assets: one distinct image per tile from the site's UNFLAGGED pool
   (case-study streams, the founders column, the closing tiles, the
   network strip, the services stack) — none of the elevated-rights
   images (Top Boy / Adolescence / adidas / Depp / Lagerfeld / the
   named-person portraits) are used as a swap. Keyed by slug. */
export const WORK_GRID_HOVER = {
  'animol': '/assets/landing/case/wilderness-reserve/stream-2.jpg',
  'wilderness-reserve': '/assets/landing/case/wilderness-reserve/stream-4.jpg',
  'tbc-ashley-walters': '/assets/landing/founders-page/col-2.png',
  'top-boy': '/assets/landing/network/strip-3.jpg',
  'pavilion-club': '/assets/landing/case/pavilion-club/stream-4.jpg',
  'yoxman-food-festival': '/assets/landing/case/yoxman/stream-3.jpg', /* its own tile already shows stream-5 */
  'pavilion-summit': '/assets/landing/case/pavilion-summit/stream-2.jpg',
  'thunder-aviation': '/assets/landing/closing/tile-2.jpg',
  'adolescence': '/assets/landing/services-stack/connect.jpg',
};
