/**
 * Founders section slide data — /about-3 only.
 *
 * Copy verified verbatim against the TNE Proposal Deck 2026 (Founders
 * pages). Body copy renders in ALL CAPS via CSS text-transform — a
 * confirmed decision; names keep the title-case serif treatment shown in
 * both Figma frames.
 *
 * Data-driven so a third founder/team member is a new array entry, not
 * new markup. `photo` doubles as the sharp portrait and the thumbnail;
 * `background` is a pre-blurred + pre-darkened full-bleed asset (blur and
 * the Figma rgba(22,22,22,0.2) overlay baked into the file — no runtime
 * backdrop-filter).
 *
 * @typedef {{ label: string, index: string }} FounderTag
 * @typedef {{
 *   id: string,
 *   name: string,
 *   bio: string[],
 *   tagsHeading: string,
 *   tags: FounderTag[],
 *   photo: string,
 *   background: string,
 *   alt: string,
 * }} FounderSlide
 */

/** @type {FounderSlide[]} */
export const founders = [
  {
    id: 'robbo',
    name: 'Robbo McCallum',
    bio: [
      'Relationship architect with nearly 20 years building global partnerships.',
      'Trusted connector. Strategic operator.',
    ],
    tagsHeading: 'Relationships across:',
    tags: [
      { label: 'Talent', index: '/01' },
      { label: 'Hospitality', index: '/02' },
      { label: 'Food & Beverage', index: '/03' },
      { label: 'Brands', index: '/04' },
      { label: 'Events', index: '/05' },
      { label: 'Production', index: '/06' },
      { label: 'Design', index: '/07' },
    ],
    photo: '/assets/about-scroll/robbo-team.png',
    background: '/assets/about-hero/about-3/founders-bg-robbo.jpg',
    alt: 'Portrait of Robbo McCallum',
  },
  {
    id: 'ashley',
    name: 'Ashley Walters',
    bio: [
      "One of the UK's most respected cultural voices with over 30 years across music, film and television.",
    ],
    tagsHeading: 'The Network Advantage:',
    tags: [
      { label: 'Cultural Credibility', index: '/01' },
      { label: 'Trusted Access to Talent', index: '/02' },
      { label: 'Industry Relationships', index: '/03' },
      { label: 'Creative Influence', index: '/04' },
      { label: 'Authenticity Within Culture', index: '/05' },
    ],
    photo: '/assets/about-scroll/ashley-team.png',
    background: '/assets/about-hero/about-3/founders-bg-ashley.jpg',
    alt: 'Portrait of Ashley Walters',
  },
];
