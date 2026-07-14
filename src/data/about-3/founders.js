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
    media: {
      type: 'video',
      // Stock preview stand-in (AdobeStock_2068472100 HD preview, Oscar-
      // supplied, replacing the original stand-in clip; audio stripped,
      // stream-copied) — STILL a preview, spec-for-purpose only. Swap
      // this file (same path) for the licensed clip; no code changes
      // needed.
      // IMPORTANT: also regenerate public/assets/about-hero/about-3/bg-fade.jpg
      // from the new clip's first frame at swap time — see the recipe
      // comment above bgFadeSrc in AboutScroll.astro. bg-fade is a static
      // frame used as the hero→founders handoff backdrop; left pointing at
      // the old clip's frame it goes visually stale the moment this file
      // changes (this exact staleness — bg-fade baked from the ORIGINAL
      // pre-rearchitecture Robbo photo, not this video — was diagnosed and
      // fixed once already).
      src: '/assets/about-hero/about-3/founders-bg-robbo.mp4',
      poster: '/assets/about-hero/about-3/founders-bg-robbo-video-poster.jpg',
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
      type: 'video',
      // The SAME clip as Robbo's slide (Oscar's request): with identical
      // footage behind both slides the media crossfade reads as one
      // continuous background. Each slide keeps its own element (the
      // crossfade + blend-safety architecture is per-slide);
      // createFoundersVideoController gates each slide's decode to its
      // own visible window, and the shared file makes the second load()
      // a cache hit.
      src: '/assets/about-hero/about-3/founders-bg-robbo.mp4',
      poster: '/assets/about-hero/about-3/founders-bg-robbo-video-poster.jpg',
    },
    alt: 'Portrait of Ashley Walters',
  },
];
