/**
 * WHAT WE DO — SERVICES REEL (/landing; Figma q30umfI8zabtFWBtRL3FTt
 * frames 29:859 "Option 11" expanded + 30:1191 "Option 12" stacked,
 * extracted 2026-08-26, chrome −118).
 *
 * Copy is the frames' verbatim (every service extracted per node).
 *
 * ══ IMAGES: ALL PLACEHOLDER — PENDING OSCAR'S REAL IMAGERY ══
 * Per-service images do not exist yet; each service carries a
 * DISTINCT placeholder from the site's unflagged pool (case-study
 * streams, founders, closing tiles, network strip, services stack,
 * unflagged featured work) so the reel's swapping is visibly
 * working. Every image inherits its source's standing
 * pending-sign-off/rights flags. None of the elevated
 * third-party-IP/named-person images (Top Boy, Adolescence, adidas,
 * Depp, Lagerfeld, the LV screenshot) are used. Each pillar's
 * `img` default is its existing stack art.
 */

const pc = (n) => `/assets/landing/case/pavilion-club/stream-${n}.jpg`;
const ps = (n) => `/assets/landing/case/pavilion-summit/stream-${n}.jpg`;
const wr = (n) => `/assets/landing/case/wilderness-reserve/stream-${n}.jpg`;
const yx = (n) => `/assets/landing/case/yoxman/stream-${n}.jpg`;
const fp = (f) => `/assets/landing/founders-page/${f}`;
const sv = (f) => `/assets/landing/services-stack/${f}.jpg`;
const st = (n) => `/assets/landing/network/strip-${n}.jpg`;
const tile = (n) => `/assets/landing/closing/tile-${n}.jpg`;
const fw = (n) => `/assets/landing/featured/work-${n}.jpg`;

export const SERVICES_REEL_PILLARS = [
  {
    name: 'IMMERSE',
    num: '/01',
    desc: ['Activate Experiences', '& Cultural Moments'],
    label: 'WE BUILD:',
    img: sv('immerse'),
    services: [
      { t: 'Talent-Led Experiences', img: pc(1) },
      { t: 'Immersive Brand Worlds', img: wr(1) },
      { t: 'Brand Launches', img: pc(2) },
      { t: 'Fashion & Media Events', img: st(2) },
      { t: 'Industry-leading Events', img: ps(1) },
      { t: 'Cultural Programming', img: pc(3) },
      { t: 'Brand Collaborations', img: wr(2) },
      { t: 'Leadership Summits & Conferences', img: ps(2) },
      { t: 'Experiential Campaigns', img: pc(4) },
      { t: 'Music & Food Festivals', img: yx(1) },
      { t: 'Industry-leading Events', img: ps(3) },
      { t: 'Health & Wellbeing Retreats', img: wr(3) },
    ],
  },
  {
    name: 'CONNECT',
    num: '/02',
    desc: ['Strategic Partnerships', '& Talent Strategy'],
    label: 'WE SHAPE:',
    img: sv('connect'),
    services: [
      { t: 'Strategic Brand Partnerships', img: pc(5) },
      { t: 'Celebrity & Talent Partnerships', img: fp('robbo-2.jpg') },
      { t: 'Cultural Introductions', img: pc(6) },
      { t: 'Commercial Relationship Development', img: st(4) },
      { t: 'Ambassador Programmes', img: fp('ashley-2.jpg') },
      { t: 'Influencer & Creator Partnerships', img: pc(7) },
      { t: 'Long-term Partnership Strategy', img: wr(4) },
      { t: 'Story-led Collaborations', img: tile(1) },
      { t: 'Sponsorship Strategy & Acquisition', img: ps(4) },
      { t: 'Brand-to-brand Collaborations', img: st(1) },
      { t: 'Community & Membership Engagement', img: pc(8) },
      { t: 'Network-led Business Development', img: ps(5) },
    ],
  },
  {
    name: 'AMPLIFY',
    num: '/03',
    desc: ['Create Narratives', '& Media'],
    label: 'WE CREATE:',
    img: sv('amplify'),
    services: [
      { t: 'Podcasts', img: tile(2) },
      { t: 'Documentary Formats', img: wr(5) },
      { t: 'Original Content Series', img: fw(1) },
      { t: 'Brand Storytelling', img: tile(3) },
      { t: 'Campaign Creative', img: st(3) },
      { t: 'Creative Direction', img: fw(6) },
      { t: 'Social-first Content', img: yx(2) },
      { t: 'Photography & Film Production', img: wr(6) },
      { t: 'Design Systems & Brand Assets', img: tile(4) },
    ],
  },
];
