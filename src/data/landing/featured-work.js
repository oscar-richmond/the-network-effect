/**
 * FEATURED WORK — card content (Figma 22:3021, extracted 2026-08-06).
 *
 * Cards /01-/05 are the file's own; /06-/08 are PLACEHOLDER SLOTS —
 * Oscar's content to follow as a data-only edit here (title lines,
 * description, image + crop). Image crops are window-relative
 * (405.93 x 465 windows); `cover: true` = object-fit cover instead
 * of an exact crop.
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
const pool = (n) => asset(`/assets/landing/access/access-${n}.jpg`);

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
    /* RIGHTS: see the named-person flag in the header. */
    index: '/02',
    title: ['PAVILION', 'CLUB'],
    desc: 'Created and scaled a private membership programme across four clubs, connecting founders, CEOs and high-profile talent through cultural and business-led experiences.',
    img: { src: a(2), w: 723, h: 468, x: -165.93, y: -2 },
  },
  {
    index: '/03',
    title: ['PAVILION', 'SUMMIT'],
    desc: 'A 24-hour immersive leadership experience, delivered from ideation to execution, bringing CEOs, founders and cultural voices together.',
    img: { src: a(3), w: 720, h: 466, x: -225.87, y: 0 },
  },
  {
    index: '/04',
    title: ['YOXMAN FOOD', 'FESTIVAL'],
    desc: 'Created and launched a Michelin-starred culinary festival, uniting world-class chefs, premium partnerships, guest journey, creative direction and luxury hospitality experience.',
    img: { src: a(4), cover: true }, // Oscar-supplied final (2026-08-06)
  },
  {
    index: '/05', // file said /04 — corrected
    title: ['THUNDER', 'AVIATION'],
    desc: 'Developed luxury aviation positioning and partnership strategy across private travel, premium hospitality and high-net-worth experiences.',
    img: { src: a(5), cover: true }, // Oscar-supplied final (2026-08-06; old crop numbers retired with the old asset)
  },
  /* ═══ PLACEHOLDER SLOTS /06-/08 — Oscar's content to follow. ═══ */
  {
    index: '/06',
    title: ['TITLE TBC'],
    desc: 'Placeholder copy — project description to follow.',
    img: { src: pool(2), cover: true },
  },
  {
    index: '/07',
    title: ['TITLE TBC'],
    desc: 'Placeholder copy — project description to follow.',
    img: { src: pool(5), cover: true },
  },
  {
    index: '/08',
    title: ['TITLE TBC'],
    desc: 'Placeholder copy — project description to follow.',
    img: { src: pool(6), cover: true },
  },
];
