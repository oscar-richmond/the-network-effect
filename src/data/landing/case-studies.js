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
 * The Yoxman stream images AND VIDEOS are Instagram-sourced per
 * the file's own layer names (49035…_n / AQMb… etc.) and several
 * contain RECOGNIZABLE PEOPLE (named chefs — Rogan, Roux — and
 * guests). Explicit rights confirmation is required for every
 * asset before anything ships — this is the elevated third-party
 * class, not standard pending-sign-off. Stills sRGB-converted on
 * processing; videos passed through as supplied.
 */
import { asset } from '../../utils/asset.js';
import { FEATURED_CARDS } from './featured-work.js';

const ref = (slug) => {
  const hit = FEATURED_CARDS.find((c) => c.slug === slug);
  if (!hit) throw new Error(`case-studies: unknown featured-work slug ${slug}`);
  return hit;
};

/* ═══ THE FACTS TABLE (frame 36:1827 rebuild, 2026-08-26) ═══
   Four rows per study — a 16/19 label (≤240px) + Body 21/28 copy
   (≤460px) at the frame's FIXED row heights: rows 1/3/4 are TWO
   lines, row 2 is ONE line — every study's copy is authored to
   exactly those line counts so the frame's divider offsets
   (0/106/184/290/396) hold for all four by construction.
   ═══ ALL DERIVED COPY IS PLACEHOLDER ═══ condensed from each
   study's own existing brief / our-work / key-impact content
   (preserved below in railBlocks + ourWork.desc, no longer
   rendered on desktop but retained verbatim — the longer copy may
   be wanted back, and the MOBILE build still renders it), pending
   the client's real account. */

/* ═══ STREAM ROW GRAMMAR (frame 36:1827) ═══ The vocabulary is
   three row types — full (1679.57×981.67) · pair-narrow-left
   (552.19 + 1115.11) · pair-wide-left (mirrored) — on a 12.27px
   gap both axes (the frame's exact measures). The frame's 12-row
   sequence is the RULE's canonical cycle: [full · pair-narrow-left
   · full · full · pair-wide-left] repeating, closed by a full row.
   Each study's data declares its own sequence in this vocabulary
   (layout + narrowFirst below — the shipped fields ARE the
   grammar); the per-study image arrays map onto the slots in
   authored order. How the four resolve: Yoxman and Pavilion Club
   run one full cycle + the closing full (6 rows); Pavilion Summit
   is the cycle's 4-row prefix (its set has no wide-left pair);
   Wilderness Reserve compresses the cycle (drops the second full),
   reported as an authored deviation, not an error. */

const yox = (n) => asset(`/assets/landing/case/yoxman/${n}`);
const pcl = (n) => asset(`/assets/landing/case/pavilion-club/${n}`);
const psu = (n) => asset(`/assets/landing/case/pavilion-summit/${n}`);
const wld = (n) => asset(`/assets/landing/case/wilderness-reserve/${n}`);

/**
 * @typedef {{ layout: 'full' | 'pair', narrowFirst?: boolean, imgs: string[] }} StreamRow
 *   The grammar's vocabulary (see the header): 'full' = one
 *   1679.57-wide image; 'pair' = 552.19 + 1115.11 on the 12.27px
 *   gap, narrowFirst controls which side the 552.19 sits.
 */

export const CASE_STUDIES = [
  {
    base: ref('yoxman-food-festival'),
    subtitle: 'A New Platform for Culinary Culture', // PLACEHOLDER copy
    heroImg: yox('hero.jpg'),
    /* THE 402 FRAME (V9fcTtbistM57vsObNruR6 2:21, 2026-09-09): the phone's
       full-bleed 402×500 hero crops this photograph off-centre — the
       frame scales it to the window's height and shows x123..525 of its
       755 (the chefs and the near table; the water and the far bank
       fall off the right). object-position for the phone's window;
       the other studies are unframed and take the centre. */
    heroFramingM: '35% 50%',
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
        /* stream-2: the chef-name portrait VIDEO (Oscar's drop
           2026-08-07 — replaces the Davies still; autoplay muted
           loop via the template's video branch). */
        { layout: 'pair', narrowFirst: true, imgs: [yox('stream-2.mp4'), yox('stream-3.jpg')] },
        { layout: 'full', imgs: [yox('stream-4.jpg')] },
        { layout: 'full', imgs: [yox('stream-5.jpg')] },
        /* stream-7: the Yoxman-script portrait VIDEO (Oscar's drop —
           720x1280, ~10.6MB; flag: worth a compression pass before
           anything ships). */
        { layout: 'pair', narrowFirst: false, imgs: [yox('stream-6.jpg'), yox('stream-7.mp4')] },
        { layout: 'full', imgs: [yox('stream-8.jpg')] },
      ],
    },
    /* PLACEHOLDER copy — the file's six bullets. */
    railBlocks: [{ serrif: 'KEY', rest: 'IMPACT', items: [
      'Festival concept and brand positioning',
      'Michelin-star chef programming',
      'Premium partnership development',
      'Guest experience and hospitality design',
      'Commercial sponsorship',
      'End-to-end event production',
    ] }],
    /* THE FACTS TABLE — see the header block. PLACEHOLDER, derived
       from the brief + key impact above. Themes chosen: the four
       load-bearing halves of the story — created-from-nothing,
       the chef programme (its headline draw), the commercial
       partners, and the delivery. */
    facts: [
      { label: 'CONCEPT & POSITIONING', copy: 'Festival concept created from scratch and positioned as a premium culinary platform.' },
      { label: 'PROGRAMMING', copy: 'Michelin-star chef programming, curated end to end.' },
      { label: 'PARTNERSHIPS', copy: 'Premium partners and commercial sponsorship developed around the festival brand.' },
      { label: 'PRODUCTION', copy: 'Guest experience, hospitality design and full event production delivered in-house.' },
    ],
    /* MORE WORK derives in the template (Oscar's rev): every /work
       project except this study, in the landing order, with the
       /work page's images and descriptions — no per-study list. */
  },

  /* ── PAVILION CLUB (Oscar's copy drop 2026-08-10). Titles, Our
     Work and Key Impact are HIS VERBATIM; the hero intro below is
     mine, written to the Yoxman length brief (3-4 lines at 16/14")
     and flagged for his approval. Imagery is his supplied set —
     standard sign-off caveat, and it contains recognisable people. */
  {
    base: ref('pavilion-club'),
    subtitle: 'Building a Community Through Culture and Connection',
    heroImg: pcl('hero.jpg'),
    /* CLAUDE-WRITTEN intro — pending Oscar's approval. */
    intro:
      'Built from the ground up, Pavilion\u2019s membership brings founders, investors and cultural leaders into the same room \u2014 and gives them a reason to keep coming back.',
    whatWeDid: {
      immerse: ['Cultural Programming', 'Industry-leading Events', 'Talent-Led Experiences'],
      connect: ['Strategic Introductions', 'Brand Alignment', 'Commercial Management'],
      amplify: ['Brand-led Narratives', 'Talent Partnerships'],
    },
    ourWork: {
      desc: 'Rob created and launched Pavilion\u2019s private membership proposition, helping scale the brand across four London clubs. His focus was on creating meaningful connections between founders, CEOs, investors, creatives and cultural leaders through carefully curated experiences and programming.',
      stream: [
        { layout: 'full', imgs: [pcl('stream-1.jpg')] },
        { layout: 'pair', narrowFirst: true, imgs: [pcl('stream-2.jpg'), pcl('stream-3.jpg')] },
        { layout: 'full', imgs: [pcl('stream-4.jpg')] },
        { layout: 'full', imgs: [pcl('stream-5.jpg')] },
        { layout: 'pair', narrowFirst: false, imgs: [pcl('stream-6.jpg'), pcl('stream-7.jpg')] },
        { layout: 'full', imgs: [pcl('stream-8.jpg')] },
      ],
    },
    railBlocks: [{ serrif: 'KEY', rest: 'IMPACT', items: [
      'Developed Pavilion\u2019s membership proposition and member journey',
      'Launched and scaled membership across four London locations',
      'Produced flagship founder and CEO programming',
      'Curated conversations with industry-leading entrepreneurs and cultural figures',
      'Secured strategic partnerships and commercial collaborations',
      'Positioned Pavilion as a destination for business, culture and community',
    ] }],
    /* FACTS — PLACEHOLDER, condensed from Oscar's verbatim key
       impact. Themes: the proposition itself, the programming, the
       community it convenes, and the commercial layer. */
    facts: [
      { label: 'MEMBERSHIP', copy: 'Created Pavilion\u2019s private membership proposition and member journey from the ground up.' },
      { label: 'PROGRAMMING', copy: 'Flagship founder and CEO programming, four clubs.' },
      { label: 'COMMUNITY', copy: 'Curated conversations connecting founders, investors, creatives and cultural leaders.' },
      { label: 'PARTNERSHIPS', copy: 'Strategic partnerships and commercial collaborations secured around the brand.' },
    ],
  },

  /* ── PAVILION SUMMIT. TWO rail blocks (his copy gives Featured
     Speakers AND Scope rather than a Key Impact list). NAMED
     INDIVIDUALS in the speaker list — rights/consent confirmation
     needed before anything ships, the elevated third-party class. */
  {
    base: ref('pavilion-summit'),
    subtitle: '24 Hours Outside the Everyday',
    /* HERO = the LAST image in the gallery (Oscar's rev). The gallery
       keeps its own order below, unchanged — this only re-points the
       hero at stream-5. */
    heroImg: psu('stream-5.jpg'),
    /* CLAUDE-WRITTEN intro — pending Oscar's approval. */
    intro:
      'Twenty-four hours away from the everyday, bringing founders, athletes and cultural voices together for the conversations that boardrooms rarely make room for.',
    whatWeDid: {
      immerse: ['Leadership Summits & Conferences', 'Industry-leading Events', 'Cultural Programming'],
      connect: ['Talent Partnerships', 'Strategic Introductions', 'Brand Alignment'],
      amplify: ['Brand-led Narratives', 'Campaign Content'],
    },
    ourWork: {
      desc: 'Rob conceived and delivered an immersive leadership experience bringing together influential founders, business leaders and cultural voices for meaningful conversation beyond the boardroom. From concept through to execution, he curated every aspect of the experience including speakers, partnerships, hospitality and guest journey.',
      stream: [
        { layout: 'full', imgs: [psu('stream-1.jpg')] },
        /* Gallery image 3 (the panel) frames from the TOP — the
           centre crop was cutting the speakers' heads (Oscar). */
        { layout: 'pair', narrowFirst: true, imgs: [psu('stream-2.jpg'), psu('stream-3.jpg')], framing: [null, 'top'] },
        /* Gallery image 4 (the woods) — same. */
        { layout: 'full', imgs: [psu('stream-4.jpg')], framing: ['top'] },
        { layout: 'full', imgs: [psu('stream-5.jpg')] },
      ],
    },
    railBlocks: [
      { serrif: 'FEATURED', rest: 'SPEAKERS', items: [
        'Ashley Walters',
        'Stephen Graham',
        'Joe Marler',
        'Professor Tim Spector',
        'Jamie Laing',
        'Sophie Habboo',
      ] },
      /* SCOPE removed at Oscar's request (2026-08-10) — his copy
         listed it, he has since cut it from this study. */
    ],
    /* FACTS — PLACEHOLDER, condensed from the brief + the speaker
       list (NAMED INDIVIDUALS — the elevated rights/consent flag on
       railBlocks carries to row 2 verbatim). Themes: the concept,
       the speakers (this study's centre of gravity), the curation
       scope, and the conversations themselves. */
    facts: [
      { label: 'CONCEPT', copy: 'An immersive 24-hour leadership experience conceived and delivered from a blank page.' },
      { label: 'SPEAKERS', copy: 'Ashley Walters, Stephen Graham, Joe Marler & more.' },
      { label: 'CURATION', copy: 'Speakers, partnerships, hospitality and guest journey curated across every touchpoint.' },
      { label: 'CONVERSATION', copy: 'Conversations beyond the boardroom between founders, athletes and cultural voices.' },
    ],
  },

  /* ── WILDERNESS RESERVE. */
  {
    base: ref('wilderness-reserve'),
    subtitle: 'From Estate to Destination',
    heroImg: wld('hero.jpg'),
    /* CLAUDE-WRITTEN intro — pending Oscar's approval. */
    intro:
      'Seven years turning a private Suffolk estate into one of Britain\u2019s defining luxury destinations \u2014 three estates, twenty-eight residences and a brand people travel for.',
    whatWeDid: {
      immerse: ['Talent-Led Experiences', 'Immersive Brand Worlds', 'Health & Wellbeing Retreats'],
      connect: ['Strategic Introductions', 'Brand Alignment', 'Commercial Management'],
      amplify: ['Brand-led Narratives', 'Talent Partnerships', 'Campaign Content'],
    },
    ourWork: {
      desc: 'Over seven years, Rob helped transform Wilderness Reserve from a private country estate into one of Britain\u2019s leading luxury hospitality destinations. Working across commercial strategy, brand development, partnerships, events and audience growth, he played a key role in building the business into a recognised lifestyle brand.',
      stream: [
        { layout: 'full', imgs: [wld('stream-1.jpg')] },
        { layout: 'pair', narrowFirst: true, imgs: [wld('stream-2.jpg'), wld('stream-3.jpg')] },
        { layout: 'full', imgs: [wld('stream-4.jpg')] },
        { layout: 'pair', narrowFirst: false, imgs: [wld('stream-5.jpg'), wld('stream-6.jpg')] },
      ],
    },
    railBlocks: [{ serrif: 'KEY', rest: 'IMPACT', items: [
      'Growth from 7 luxury residences to more than 28 properties across three estates',
      'Digital audience increased from 10,000 to over 415,000',
      'Helped establish three core revenue pillars: Leisure \u2022 Weddings \u2022 Corporate Retreats',
      'Developed partnerships with luxury brands, global businesses and cultural talent',
      'Curated celebrity stays, private events and brand experiences that elevated the estate\u2019s profile',
      'Supported the commercial growth that positioned Wilderness Reserve as one of the UK\u2019s premier luxury destinations',
    ] }],
    /* FACTS — PLACEHOLDER, condensed from the key impact. Themes:
       the four measurable arcs — estate growth, audience growth,
       the revenue model, and the partnership layer. */
    facts: [
      { label: 'GROWTH', copy: 'From seven luxury residences to more than twenty-eight properties across three estates.' },
      { label: 'AUDIENCE', copy: 'Digital audience grown from 10,000 to over 415,000.' },
      { label: 'REVENUE', copy: 'Three core revenue pillars established: leisure, weddings and corporate retreats.' },
      { label: 'PARTNERSHIPS', copy: 'Luxury brand, global business and cultural talent partnerships elevating the estate.' },
    ],
  },
];

/** Slugs with a LIVE case-study page — /work's tiles navigate for
 *  these; everything else stays an inert placeholder. */
export const LIVE_CASE_SLUGS = CASE_STUDIES.map((c) => c.base.slug);
