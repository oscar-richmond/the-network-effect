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

/** @typedef {{ index: string, title: string[], desc: string, img: { src: string, w?: number, h?: number, x?: number, y?: number, cover?: boolean } }} FeaturedCard */

/** @type {FeaturedCard[]} */
export const FEATURED_CARDS = [
  {
    index: '/01',
    title: ['WILDERNESS', 'RESERVE'],
    desc: 'Developed one of the UK’s leading luxury destinations, spanning hospitality, events, guest experiences and talent partnerships.',
    img: { src: a(1), cover: true }, // Oscar-supplied final (2026-08-06; file crop retired)
  },
  {
    /* RIGHTS: recognizable cast, TV key-art class — see header. */
    index: '/02',
    title: ['TOP BOY'],
    desc: 'A defining British screen project with global cultural reach, rooted in storytelling, music, fashion and culture.',
    img: { src: a(6), cover: true },
  },
  {
    /* RIGHTS: see the named-person flag in the header. */
    index: '/03',
    title: ['PAVILION', 'CLUB'],
    /* Trimmed one line ("high-profile" dropped) so "experiences."
       isn't a widow (Oscar's rev). */
    desc: 'Created and scaled a private membership programme across four clubs, connecting founders, CEOs and talent through cultural and business-led experiences.',
    img: { src: a(2), w: 723, h: 468, x: -165.93, y: -2 },
  },
  {
    index: '/04',
    title: ['PAVILION', 'SUMMIT'],
    desc: 'A 24-hour immersive leadership experience, delivered from ideation to execution, bringing CEOs, founders and cultural voices together.',
    img: { src: a(3), w: 720, h: 466, x: -225.87, y: 0 },
  },
  {
    /* RIGHTS: recognizable cast, TV key-art class — see header. */
    index: '/05',
    title: ['ADOLESCENCE'],
    desc: 'Contemporary screen work reinforcing Ashley’s position as one of the UK’s most recognisable voices.',
    img: { src: a(7), cover: true },
  },
  {
    index: '/06',
    title: ['YOXMAN FOOD', 'FESTIVAL'],
    /* Trimmed one line ("guest journey" dropped) so "experience."
       isn't a widow (Oscar's rev). */
    desc: 'Created and launched a Michelin-starred culinary festival, uniting world-class chefs, premium partnerships, creative direction and luxury hospitality experience.',
    img: { src: a(4), cover: true }, // Oscar-supplied final (2026-08-06)
  },
  {
    index: '/07',
    title: ['THUNDER', 'AVIATION'],
    desc: 'Developed luxury aviation positioning and partnership strategy across private travel, premium hospitality and high-net-worth experiences.',
    img: { src: a(5), cover: true }, // Oscar-supplied final (2026-08-06)
  },
  {
    /* RIGHTS: Ashley on set — see header. */
    index: '/08',
    title: ['ANIMOL'],
    desc: 'Directorial feature debut, marking Ashley’s evolution from actor and producer to filmmaker and creative lead.',
    img: { src: a(8), cover: true },
  },
];
