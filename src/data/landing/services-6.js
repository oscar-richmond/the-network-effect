/**
 * /services — "Services Page - Option 6" content (Figma
 * q30umfI8zabtFWBtRL3FTt frame 38:2420, extracted 2026-08-26; 118px
 * chrome subtracted upstream). Every string verbatim from the
 * frame's text layers.
 *
 * ═══ RIGHTS — ELEVATED THIRD-PARTY / NAMED-PERSON IMAGERY ═══
 * The galleries include the KARL LAGERFELD × PHARRELL image
 * (g2-5-lagerfeld.png) and the JOHNNY DEPP editorial page
 * (g1-5-depp.png) — the standing elevated rights-confirmation
 * flags carry to both; NEITHER may be reused as a hover
 * placeholder or anywhere else (Oscar's rule). The remaining
 * gallery images and the pillar headers are the frame's own
 * exports (sRGB), standard pending-sign-off.
 *
 * HOVER IMAGES: every table row currently carries the frame's one
 * hover placeholder (hover-placeholder.png — the frame's own
 * 38:2637 export, an unflagged event image) — PLACEHOLDER pending
 * Oscar's per-row content drop.
 *
 * FLAGS from extraction, for Oscar:
 * · IMMERSE rows list "Industry-leading Events" TWICE (rows 5 and
 *   11) — the frame's own copy, kept verbatim.
 * · The frame's hover mock shows the row highlight in the BLUE
 *   #232A89 with blue dividers; per Oscar's instruction the built
 *   highlight is the #C1250E accent (the `accent` fields below).
 */
const A = (n) => `/assets/landing/services-6/${n}`;

/* ═══ HOVER PLACEHOLDER POOL (Oscar item 4, 2026-08-26) ═══
   Per-row hover imagery, VARIED so the swap visibly works —
   PLACEHOLDER pending Oscar's real per-row drop. Drawn from the
   reel's vetted 33-image pool (services-reel.js) which maps
   pillar-for-pillar onto these tables (12/12/9), with the two
   ELEVATED-CLASS entries substituted (the yoxman Instagram
   streams → a closing tile and a network strip image): no Top
   Boy / Adolescence / adidas / Depp / Lagerfeld / Louis Vuitton
   anywhere in the set. */
import { SERVICES_REEL_PILLARS } from './services-reel.js';
const HOVER_SUBS = {
  '/assets/landing/case/yoxman/stream-1.jpg': '/assets/landing/closing/tile-1.jpg',
  '/assets/landing/case/yoxman/stream-2.jpg': '/assets/landing/network/strip-2.jpg',
};
const hoverImg = (pi, ri) => {
  const src = SERVICES_REEL_PILLARS[pi]?.services?.[ri]?.img;
  return (src && (HOVER_SUBS[src] || src)) || A('hover-placeholder.png');
};
export const SV6_HOVER_IMGS = [0, 1, 2].map((pi) =>
  Array.from({ length: [12, 12, 9][pi] }, (_, ri) => hoverImg(pi, ri)));

export const SV6_HERO = {
  /* 38:2596 — Serrif Condensed Medium 100/88/−4% + Dazzed Bold
     100/88 (the frame's sans span tracks −0.8px — flagged: the
     guide's sans display is −5%; frame wins). */
  titleSerif: 'FROM ACCESS. ',
  titleSans: 'TO IMPACT.',
  /* 38:2595 — Serrif Medium 48/50/−1.5%, 1429 measure. The frame
     draws it white + difference over the flat ground — built as
     brand-black ink per the house rule (difference-on-flat is
     ink-equivalent; the landing hero intro precedent), flagged. */
  desc: 'We are a relationship-led consultancy connecting Talent, Brands and Audiences through Experiences, Strategic Partnerships and Media.',
};

export const SV6_PILLARS = [
  {
    key: 'immerse',
    title: '01 — IMMERSE',
    /* R36 item 5 (Oscar, 2026-09-04): the landing WHAT WE DO expanded
       subtitle — the reel's two authored lines, one source (was 'Activate Experiences & Cultural Moments.'). */
    subtitleLines: SERVICES_REEL_PILLARS[0].desc,
    headerImg: A('pillar-immerse.png'),
    /* 38:2597 — Dazzed Bold 56/54/−3.5% uppercase ink, the 26-space
       leading indent, 1630 measure; bar 10×155. */
    statement: 'Designing immersive experiences, strategic partnerships and cultural moments that bring brands, talent and communities together.',
    barH: 155,
    label: 'WE BUILD',
    accent: '#c1250e',
    dark: false,
    rows: [
      'Talent-Led Experiences',
      'Immersive Brand Worlds',
      'Brand Launches',
      'Fashion & Media Events',
      'Industry-leading Events',
      'Cultural Programming',
      'Brand Collaborations',
      'Leadership Summits & Conferences',
      'Experiential Campaigns',
      'Music & Food Festivals',
      'Industry-leading Events',
      'Health & Wellbeing Retreats',
    ],
  },
  {
    key: 'connect',
    title: '02 — CONNECT',
    /* R36 item 5 (Oscar, 2026-09-04): the landing WHAT WE DO expanded
       subtitle — the reel's two authored lines, one source (was 'Talent Strategy & Partnerships'). */
    subtitleLines: SERVICES_REEL_PILLARS[1].desc,
    headerImg: A('pillar-connect.png'),
    statement: 'CONNECTING TALENT WITH BRANDS THROUGH MEANINGFUL LONG-TERM COMMERCIAL AND CULTURAL RELATIONSHIPS.',
    barH: 150,
    label: 'WE SHAPE',
    accent: '#c1250e',
    dark: true, /* sits inside the #161616 band (38:2501) */
    rows: [
      'Strategic Brand Partnerships',
      'Celebrity & Talent Partnerships',
      'Cultural Introductions',
      'Commercial Relationship Development',
      'Ambassador Programmes',
      'Influencer & Creator Partnerships',
      'Long-term Partnership Strategy',
      'Story-led Collaborations',
      'Sponsorship Strategy & Acquisition',
      'Brand-to-brand Collaborations',
      'Community & Membership Engagement',
      'Network-led Business Development',
    ],
  },
  {
    key: 'amplify',
    title: '03 — AMPLIFY',
    /* R36 item 5 (Oscar, 2026-09-04): the landing WHAT WE DO expanded
       subtitle — the reel's two authored lines, one source (was 'Narrative & Media Studio'). */
    subtitleLines: SERVICES_REEL_PILLARS[2].desc,
    headerImg: A('pillar-amplify.png'),
    statement: 'CREATING STORIES, PLATFORMS AND CONTENT. THAT DEEPEN RELATIONSHIPS AND AMPLIFY CULTURE.',
    barH: 96,
    label: 'WE CREATE',
    accent: '#c1250e',
    dark: false,
    rows: [
      'Podcasts',
      'Documentary Formats',
      'Original Content Series',
      'Brand Storytelling',
      'Campaign Creative',
      'Creative Direction',
      'Social-first Content',
      'Photography & Film Production',
      'Design Systems & Brand Assets',
    ],
  },
];

/* Every row's hover image = the frame's placeholder (see header). */
export const SV6_HOVER_PLACEHOLDER = A('hover-placeholder.png');

export const SV6_GALLERIES = [
  {
    key: 'span',
    /* 38:2690 — Dazzed Bold 56/54/−3.5%, two lines. Drawn white +
       difference over flat ground → built as ink (flagged, the
       house rule). */
    /* Item 5 (Oscar): explicit two-line break — SPAN END-TO-END on
       its own row (the space inside the line is authored text). */
    headerLines: ['OUR SERVICES', 'SPAN END-TO-END:'],
    dark: false,
    imgs: [A('g1-1.png'), A('g1-2.png'), A('g1-3.png'), A('g1-4.png'), A('g1-5-depp.png'), A('g1-6.png')],
    /* 38:2713 — Dazzed Bold 18/22 uppercase centred, 160w. */
    labels: ['CONCEPT', 'STRATEGY', 'PARTNERSHIP', 'PRODUCTION', 'EXPERIENCE', 'AMPLIFICATION'],
  },
  {
    key: 'include',
    headerLines: ['OUR SERVICES INCLUDE'],
    dark: true,
    imgs: [A('g2-1.png'), A('g2-2.png'), A('g2-3.png'), A('g2-4.png'), A('g2-5-lagerfeld.png'), A('g2-6.png')],
    /* 38:2550 — two-line labels, white on the dark band. */
    labels: ['Talent Partnerships', 'Brand Alignment', 'Cultural Positioning', 'Strategic Introductions', 'Partnership Developments', 'Commercial Management'],
  },
];

/* The two fragmented statements (38:2725 / 38:2794) — Dazzed Bold
   100/88/−4% at authored x positions on the 90px line pitch; every
   line one size (the guide: hierarchy from position only). x is
   page-absolute (frame x, no chrome shift on x). */
export const SV6_FRAGMENTS = [
  {
    key: 'moments',
    dark: false,
    lines: [
      { x: 512, t: 'WE' },
      { x: 512, t: 'DON’T JUST' },
      { x: 237, t: 'PRODUCE', pair: { x: 1002, t: 'EVENTS.' } },
      { x: 454, t: 'WE CREATE' },
      { x: 636, t: 'CULTURAL' },
      { x: 955, t: 'MOMENTS' },
    ],
  },
  {
    key: 'partners',
    dark: true,
    lines: [
      { x: 448, t: 'WE' },
      { x: 448, t: 'ARE NOT TRADITIONAL' },
      { x: 173, t: 'WE ACT AS', pair: { x: 843, t: 'STRATEGIC' } },
      { x: 282, t: 'RELATIONSHIP PARTNERS' },
      { x: 572, t: 'FOR BOTH' },
      { x: 891, t: 'TALENT' },
      { x: 733, t: '& BRANDS' },
    ],
  },
];
