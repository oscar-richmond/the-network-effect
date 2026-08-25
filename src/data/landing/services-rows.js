/**
 * LANDING services pillars — the ROW-LIST redesign (Figma
 * NgsyYiyjKRFhtPHyjc0aL4 frame 18:1694, extracted 2026-08-24).
 * Landing-page data only: /services keeps its own services-v2.js
 * source untouched (the scope rule).
 *
 * Row copy VERBATIM from the frame — including IMMERSE's trailing
 * "Industry-leading Events" repeats, which are the file's own
 * placeholder rows (flagged in the report; swap when real copy
 * lands). `img` per row is unspecified in the file: every row falls
 * back to the pillar's hoverImg — the frame's own reference image,
 * downloaded as the placeholder — awaiting Oscar's per-row content
 * drop.
 *
 * Accents: IMMERSE is the frame's #C1250E hover fill; CONNECT and
 * AMPLIFY are undrawn in the file and alternate the house pair
 * (report flag — Oscar's call).
 */

const PLACEHOLDER_IMG = '/assets/landing/services/hover-rows-placeholder.png';

/* DUMMY per-row images (Oscar, 2026-08-25): every row gets its OWN
   image — thematically from the pillar's /services gallery set plus
   in-repo work/band shots — so no two neighbours repeat and the
   cover-swap transition is visible. Placeholders until the real
   content drop; swap freely. */
const IMG = (n) => `/assets/landing/services/${n}`;
const IMMERSE_IMGS = ['hover-immerse.png', 'g1-1.png', 'g1-2.png', 'g1-3.png', 'g1-4.png', 'g1-5.png', 'g1-6.png', 'work-1.jpg', 'work-2.jpg', 'work-3.jpg', 'work-4.jpg', 'work-5.jpg'].map((n) => n.startsWith('work') ? `/assets/landing/${n}` : IMG(n));
const CONNECT_IMGS = ['hover-connect.png', 'g2-1.png', 'g2-2.png', 'g2-3.png', 'g2-4.png', 'g2-5.png', 'g2-6.png', 'band-1.png', 'band-2.png'].map(IMG).concat(['/assets/landing/work-6.jpg', '/assets/landing/work-7.jpg', '/assets/landing/work-8.jpg']);
const AMPLIFY_IMGS = ['hover-amplify.png', 'g3-1.png', 'g3-2.png', 'g3-3.png', 'g3-4.png', 'g3-5.png', 'g3-6.png', 'band-3.png', 'band-4.png'].map(IMG);

export const LANDING_SERVICE_PILLARS = [
  {
    name: 'IMMERSE',
    num: '/01',
    desc: ['Activate Experiences', '& Cultural Moments'],
    label: 'WE BUILD',
    accent: '#c1250e',
    pitch: 66, // 24px gaps around the 18px text's 16 box (R4; was 69/19)
    hoverImg: PLACEHOLDER_IMG,
    rows: [
      { text: 'Talent-Led Experiences', img: IMMERSE_IMGS[0 % IMMERSE_IMGS.length] },
      { text: 'Immersive Brand Worlds', img: IMMERSE_IMGS[1 % IMMERSE_IMGS.length] },
      { text: 'Brand Launches', img: IMMERSE_IMGS[2 % IMMERSE_IMGS.length] },
      { text: 'Fashion & Media Events', img: IMMERSE_IMGS[3 % IMMERSE_IMGS.length] },
      { text: 'Industry-leading Events', img: IMMERSE_IMGS[4 % IMMERSE_IMGS.length] },
      { text: 'Cultural Programming', img: IMMERSE_IMGS[5 % IMMERSE_IMGS.length] },
      { text: 'Brand Collaborations', img: IMMERSE_IMGS[6 % IMMERSE_IMGS.length] },
      { text: 'Leadership Summits & Conferences', img: IMMERSE_IMGS[7 % IMMERSE_IMGS.length] },
      { text: 'Experiential Campaigns', img: IMMERSE_IMGS[8 % IMMERSE_IMGS.length] },
      { text: 'Music & Food Festivals', img: IMMERSE_IMGS[9 % IMMERSE_IMGS.length] },
      { text: 'Industry-leading Events', img: IMMERSE_IMGS[10 % IMMERSE_IMGS.length] },
      { text: 'Industry-leading Events', img: IMMERSE_IMGS[11 % IMMERSE_IMGS.length] },
    ],
  },
  {
    name: 'CONNECT',
    num: '/02',
    desc: ['Strategic Partnerships', '& Talent Strategy'],
    /* The frame writes WE CREATE here (the task brief said WE
       SHAPE — file drift, reported). */
    label: 'WE CREATE',
    accent: '#232a89',
    pitch: 68, // 25px gaps, 16 box (R4; was 71/19)
    hoverImg: PLACEHOLDER_IMG,
    rows: [
      { text: 'Strategic Brand Partnerships', img: CONNECT_IMGS[0 % CONNECT_IMGS.length] },
      { text: 'Celebrity & Talent Partnerships', img: CONNECT_IMGS[1 % CONNECT_IMGS.length] },
      { text: 'Commercial Relationship Development', img: CONNECT_IMGS[2 % CONNECT_IMGS.length] },
      { text: 'Ambassador Programmes', img: CONNECT_IMGS[3 % CONNECT_IMGS.length] },
      { text: 'Influencer & Creator Partnerships', img: CONNECT_IMGS[4 % CONNECT_IMGS.length] },
      { text: 'Health & Wellbeing Retreats', img: CONNECT_IMGS[5 % CONNECT_IMGS.length] },
      { text: 'Long-term Partnership Strategy', img: CONNECT_IMGS[6 % CONNECT_IMGS.length] },
      { text: 'Story-led Collaborations', img: CONNECT_IMGS[7 % CONNECT_IMGS.length] },
      { text: 'Sponsorship Strategy & Acquisition', img: CONNECT_IMGS[8 % CONNECT_IMGS.length] },
      { text: 'Brand-to-brand Collaborations', img: CONNECT_IMGS[9 % CONNECT_IMGS.length] },
      { text: 'Community & Membership Engagement', img: CONNECT_IMGS[10 % CONNECT_IMGS.length] },
      { text: 'Network-led Business Development', img: CONNECT_IMGS[11 % CONNECT_IMGS.length] },
    ],
  },
  {
    name: 'AMPLIFY',
    num: '/03',
    desc: ['Create Narratives', '& Media'],
    label: 'WE CREATE',
    accent: '#c1250e',
    pitch: 68,
    hoverImg: PLACEHOLDER_IMG,
    rows: [
      { text: 'Podcasts', img: AMPLIFY_IMGS[0 % AMPLIFY_IMGS.length] },
      { text: 'Documentary Formats', img: AMPLIFY_IMGS[1 % AMPLIFY_IMGS.length] },
      { text: 'Original Content Series', img: AMPLIFY_IMGS[2 % AMPLIFY_IMGS.length] },
      { text: 'Brand Storytelling', img: AMPLIFY_IMGS[3 % AMPLIFY_IMGS.length] },
      { text: 'Campaign Creative', img: AMPLIFY_IMGS[4 % AMPLIFY_IMGS.length] },
      { text: 'Creative Direction', img: AMPLIFY_IMGS[5 % AMPLIFY_IMGS.length] },
      { text: 'Social-first Content', img: AMPLIFY_IMGS[6 % AMPLIFY_IMGS.length] },
      { text: 'Photography & Film Production', img: AMPLIFY_IMGS[7 % AMPLIFY_IMGS.length] },
      { text: 'Design Systems & Brand Assets', img: AMPLIFY_IMGS[8 % AMPLIFY_IMGS.length] },
    ],
  },
];
