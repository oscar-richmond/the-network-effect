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
      'Industry-leading Events',
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
      'Strategic Brand Partnerships',
      'Celebrity & Talent Partnerships',
      'Commercial Relationship Development',
      'Ambassador Programmes',
      'Influencer & Creator Partnerships',
      'Health & Wellbeing Retreats',
      'Long-term Partnership Strategy',
      'Story-led Collaborations',
      'Sponsorship Strategy & Acquisition',
      'Brand-to-brand Collaborations',
      'Community & Membership Engagement',
      'Network-led Business Development',
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
