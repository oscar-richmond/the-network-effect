/**
 * Founders section slide data — /about-3 only.
 *
 * Copy verified verbatim against the TNE Proposal Deck 2026 (Founders
 * pages). Body copy renders in ALL CAPS via CSS text-transform — a
 * confirmed decision; names keep the title-case serif treatment shown in
 * both Figma frames.
 *
 * Data-driven so a third founder/team member is a new array entry, not
 * new markup. `photo` doubles as the sharp portrait and the thumbnail.
 *
 * `media` is the RAW (untreated) full-bleed background asset — blur and
 * the Figma rgba(22,22,22,0.2) overlay are now a LIVE `.founders__overlay`
 * layer (backdrop-filter + rgba background) rendered above the media, not
 * baked into the file. This lets slide 1's media be a playing video: a
 * pre-treated JPG/MP4 can't carry motion, so the treatment moved from the
 * asset to the DOM.
 *
 * @typedef {{ label: string, index: string }} FounderTag
 * @typedef {
 *   { type: 'video', src: string, poster: string } |
 *   { type: 'image', src: string }
 * } FounderMedia
 * @typedef {{
 *   id: string,
 *   name: string,
 *   bio: string[],
 *   tagsHeading: string,
 *   tags: FounderTag[],
 *   photo: string,
 *   media: FounderMedia,
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
    // Background rearchitected (Oscar, 2026-07-14, second revision same
    // day): the video-with-live-treatment era is over — BOTH slides now
    // share a flat #161616 dark (a baked 64px JPG so the media/crossfade/
    // bg-fade machinery stays byte-for-byte identical) with the animated
    // WHITE grain layer above it (founders.css). The paper-texture
    // revision this replaced (founders-bg-paper.jpg) is kept in
    // public/assets for a cheap flip-back. The slide 1<->2 media
    // crossfade still runs but is an invisible no-op while both slides
    // point at the same file — kept so per-founder backgrounds can
    // return by editing only this data. IMPORTANT:
    // public/assets/about-hero/about-3/bg-fade.jpg (the hero->founders
    // handoff backdrop) is baked to MATCH this background — regenerate
    // it if this changes (recipe comment above bgFadeSrc in
    // AboutScroll.astro).
    media: {
      type: 'image',
      src: '/assets/about-hero/about-3/founders-bg-dark.jpg',
    },
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
    media: {
      type: 'image',
      src: '/assets/about-hero/about-3/founders-bg-dark.jpg', // shared flat dark — see slide 1's media comment
    },
    alt: 'Portrait of Ashley Walters',
  },
];
