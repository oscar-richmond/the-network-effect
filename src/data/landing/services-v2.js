/**
 * /services (NEW BUILD) — content data. Figma n2cY4c7GnsR5MBx1PJoC97
 * node 60:3648 ("Services Page - Option 1 Hero", 1728×13819),
 * extracted 2026-08-08. ALL COPY VERBATIM from the file
 * (deck-sourced) — oddities preserved deliberately and flagged
 * inline rather than "fixed":
 *   - Immerse rows 04 and 09 BOTH read "Industry-Leading Events"
 *     (09's resting text exists only via the file's hover-state
 *     demo — the resting row is empty there).
 *   - Toggle pair 2 reads "BRANDS ⇄ BRANDS".
 *   - Amplify's statement carries a stray full stop ("…CONTENT.
 *     THAT DEEPEN…").
 *   - Connect's gallery header casing is the file's "OUR SERVICES
 *     Include" (CSS uppercases it, matching the render).
 *
 * RIGHTS — ELEVATED (the established flag class; NOTHING here ships
 * without explicit confirmation):
 *   - g1-5.png is the file's "page 1 jonny depp" layer — a NAMED
 *     PERSON (Johnny Depp) in what reads as editorial/press imagery.
 *   - g2-5.png is the file's "karl-largerfeld-pharrell-williams-
 *     greetings-gwp-2" layer — TWO NAMED PEOPLE, press photography.
 *   - p2-connect-full.png shows BURBERRY café branding (third-party
 *     brand campaign imagery).
 *   - Files with Instagram CDN naming (…_n): hover-immerse,
 *     g2-1, g3-1 — Instagram-sourced, unlicensed.
 * ALL imagery on this page is placeholder pending founder sign-off,
 * per the standing content policy.
 *
 * HERO WAVE: the /old 01-IMMERSE pillar-hero composition, ported —
 * SAME IMAGES (public/assets/pillar-waves), slotted into THIS file's
 * hero geometry (the slot ratios match the /old wave exactly; the
 * services file re-uses the landing IMMERSE moment). x/w/h are the
 * file's px in the 1728 frame; y = px BELOW the hero stage bottom
 * (frame y − 83 chrome − 1006 stage); speeds are the /old wave-0
 * multipliers per image. LAST-ITEM CONTRACT (ported invariant):
 * red-room-dinner has max y and speed 1.0 — the travel bound and
 * the "images have exited" boundary key off it.
 */

export const SERVICES_HERO = {
  title: 'FROM ACCESS TO IMPACT.',
  subtitle:
    'We are a relationship-led consultancy connecting Talent, Brands and Audiences through Experiences, Strategic Partnerships and Media.',
  wave: [
    { file: 'bubble-gum-glass', x: 1419, y: 35, w: 183, h: 201, speed: 1.18 },
    { file: 'chef-window', x: 125, y: 102, w: 260, h: 322, speed: 1.12 },
    { file: 'red-hooded-jacket', x: 920, y: 384, w: 630, h: 572, speed: 1.0 },
    /* LAST-ITEM CONTRACT: max y, speed 1.0 — keep last. */
    { file: 'red-room-dinner', x: 415, y: 558, w: 286, h: 288, speed: 1.0 },
  ],
};

/**
 * The three pillars. Per-pillar accent = the file's Highlight Bar
 * colour (extracted): IMMERSE #232A89, CONNECT #C1250E, AMPLIFY
 * #232A89. `hoverImg` is the file's single per-pillar hover image,
 * used as the PLACEHOLDER for every row in that pillar — each row
 * carries its own `img` field for Oscar's per-row content drop.
 */
export const SERVICES_PILLARS = [
  {
    id: 'immerse',
    num: '01',
    name: 'IMMERSE',
    sub: 'Activate Experiences & Cultural Moments.',
    fullImg: '/assets/landing/services/p1-immerse-full.png',
    statement:
      'Designing immersive experiences, strategic partnerships and cultural moments that bring brands, talent and communities together.',
    statementSub: null,
    label: 'WE BUILD',
    accent: '#232a89',
    hoverImg: '/assets/landing/services/hover-immerse.png', // Instagram-sourced — RIGHTS
    rows: [
      { index: '01', text: 'Talent-Led Experiences' },
      { index: '02', text: 'Immersive Brand Worlds' },
      { index: '03', text: 'Brand Launches' },
      { index: '04', text: 'Industry-leading Events' },
      { index: '05', text: 'Cultural Programming' },
      { index: '06', text: 'Brand Collaborations' },
      { index: '07', text: 'Experiential Campaigns' },
      { index: '08', text: 'Music & Food Festivals' },
      /* Resting text sourced from the file's hover demo (see header
         flag — duplicates 04 verbatim in the deck). */
      { index: '09', text: 'Industry-Leading Events' },
      { index: '10', text: 'Fashion & Media Events' },
      { index: '11', text: 'Leadership Summits & Conferences' },
      { index: '12', text: 'Health & Wellbeing Retreats' },
    ],
    galleryTitle: ['OUR SERVICES SPAN', 'END-TO-END:'],
    galleryNote: {
      serrif: 'WE DON’T JUST PRODUCE EVENTS',
      bold: 'WE CREATE CULTURAL MOMENTS.',
    },
    gallery: [
      '/assets/landing/services/g1-1.png',
      '/assets/landing/services/g1-2.png',
      '/assets/landing/services/g1-3.png',
      '/assets/landing/services/g1-4.png',
      '/assets/landing/services/g1-5.png', // JOHNNY DEPP — RIGHTS
      '/assets/landing/services/g1-6.png',
    ],
    /* Single-line flow (arrow-separated). */
    flow: [['CONCEPT'], ['STRATEGY'], ['PARTNERSHIP'], ['PRODUCTION'], ['EXPERIENCE'], ['AMPLIFICATION']],
  },
  {
    id: 'connect',
    num: '02',
    name: 'CONNECT',
    sub: 'Talent Strategy & Partnerships',
    fullImg: '/assets/landing/services/p2-connect-full.png', // BURBERRY branding — RIGHTS
    statement:
      'CONNECTING TALENT WITH BRANDS THROUGH MEANINGFUL LONG-TERM COMMERCIAL AND CULTURAL RELATIONSHIPS.',
    statementSub:
      'Our role is not traditional talent management. We act as strategic relationship partners for both talent and brands.',
    label: 'WE SHAPE',
    accent: '#c1250e',
    hoverImg: '/assets/landing/services/hover-connect.png',
    rows: [
      { index: '01', text: 'Strategic Brand Partnerships' },
      { index: '02', text: 'Celebrity & Talent Partnerships' },
      { index: '03', text: 'Cultural Introductions' },
      { index: '04', text: 'Commercial Relationship Development' },
      { index: '05', text: 'Long-term Partnership Strategy' },
      { index: '06', text: 'Story-led Collaborations' },
      { index: '07', text: 'Sponsorship Strategy & Acquisition' },
      { index: '08', text: 'Brand-to-brand Collaborations' },
      /* Resting text from the file's hover demo. */
      { index: '09', text: 'Ambassador Programmes' },
      { index: '10', text: 'Influencer & Creator Partnerships' },
      { index: '11', text: 'Community & Membership Engagement' },
      { index: '12', text: 'Network-led Business Development' },
    ],
    galleryTitle: ['OUR SERVICES Include'],
    galleryNote: null,
    gallery: [
      '/assets/landing/services/g2-1.png', // Instagram-sourced — RIGHTS
      '/assets/landing/services/g2-2.png',
      '/assets/landing/services/g2-3.png',
      '/assets/landing/services/g2-4.png',
      '/assets/landing/services/g2-5.png', // LAGERFELD/PHARRELL — RIGHTS
      '/assets/landing/services/g2-6.png',
    ],
    /* Two-line flow blocks. */
    flow: [
      ['Talent', 'Partnerships'],
      ['Brand', 'Alignment'],
      ['Cultural', 'Positioning'],
      ['Strategic', 'Introductions'],
      ['Partnership', 'Developments'],
      ['Commercial', 'Management'],
    ],
  },
  {
    id: 'amplify',
    num: '03',
    name: 'AMPLIFY',
    sub: 'Narrative & Media Studio',
    fullImg: '/assets/landing/services/p3-amplify-full.png',
    statement:
      'CREATING STORIES, PLATFORMS AND CONTENT. THAT DEEPEN RELATIONSHIPS AND AMPLIFY CULTURE.',
    statementSub: null,
    label: 'WE CREATE',
    accent: '#232a89',
    hoverImg: '/assets/landing/services/hover-amplify.png',
    rows: [
      { index: '01', text: 'Podcasts' },
      { index: '02', text: 'Documentary Formats' },
      { index: '03', text: 'Original Content Series' },
      { index: '04', text: 'Brand Storytelling' },
      { index: '05', text: 'Campaign Creative' },
      { index: '06', text: 'Creative Direction' },
      { index: '07', text: 'Social-first Content' },
      { index: '08', text: 'Photography & Film Production' },
      { index: '09', text: 'Design Systems & Brand Assets' },
    ],
    /* Amplify's gallery lives in the DARK region (SERVICES_ACCESS
       below) — no light gallery/flow here. */
    galleryTitle: null,
    galleryNote: null,
    gallery: null,
    flow: null,
  },
];

/** The dark region after the ground fade (frame y 11323–11971). */
export const SERVICES_ACCESS = {
  statement: "WE CREATE ACCESS BETWEEN WORLDS THAT DON'T NORMALLY CONNECT.",
  note: 'The Network Effect exists to connect people, brands and talent in ways that create long-term cultural and commercial value.',
  gallery: [
    '/assets/landing/services/g3-1.png', // Instagram-sourced — RIGHTS
    '/assets/landing/services/g3-2.png',
    '/assets/landing/services/g3-3.png',
    '/assets/landing/services/g3-4.png',
    '/assets/landing/services/g3-5.png',
    '/assets/landing/services/g3-6.png',
  ],
  /* The paired toggles, verbatim incl. the BRANDS⇄BRANDS pair. */
  toggles: [
    ['TALENT', 'BRANDS'],
    ['BRANDS', 'BRANDS'],
    ['TALENT', 'BUSINESS'],
    ['HOSPITALITY', 'CULTURE'],
    ['MEDIA', 'COMMERCE'],
    ['CORPORATE', 'COMMUNITY'],
  ],
};
