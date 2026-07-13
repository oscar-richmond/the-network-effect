// PARTNER LIST PENDING FOUNDER SIGN-OFF — do not launch without confirmation.
//
// Order is the wheel order (index 0 = the name active at the very start of
// the partners runway — see partners-scroll.js). One name was normalized
// from the source list's "Channel" -> "Chanel" (read as the fashion house)
// — flagged since the first pass, still not independently confirmed.
//
// SATELLITE DATA MODEL (approved): per-brand optional `logo`, `image`,
// `description`. Brands without an asset get the approved empty-state
// behaviour (slot dissolves to empty; description falls back to the shared
// GENERIC_DESCRIPTION below — the reference site's own approach). The
// asset-backed set is the Figma seven for now (Pavilion, Netflix,
// Wilderness Reserve, Thunder Aviation, Bentley, ITV, Disney) — extending
// it is a content task, not a build task.
//
// ASSET STATUS: Wilderness Reserve's logo + description are the REAL
// Figma-supplied ones; Thunder Aviation's image is the REAL Figma sample
// photo. Everything else marked below is a STAND-IN from the existing
// image pool, and all non-Wilderness descriptions are deliberately
// GENERIC placeholders — no factual basis exists for describing the real
// relationship with these companies, and specific-sounding claims would
// read as fabricated fact about real businesses. NO logos are fabricated
// (an IP and credibility problem the moment one is wrong): logo slots
// stay empty until real marks are supplied to public/assets/partners/.
export const GENERIC_DESCRIPTION =
  'From multinational companies to independent brands, we have been fortunate to work across a diversity of projects and clients.';

/**
 * @typedef {{ name: string, slug: string, description?: string,
 *   logo?: string, image?: string }} Partner
 */

/** @type {Partner[]} */
export const PARTNERS = [
  {
    name: 'Pavilion',
    slug: 'pavilion',
    image: '/assets/landing-gallery/kitchen-smoke.jpg', // STAND-IN
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    image: '/assets/pillar-waves/film-set-monitor.jpg', // STAND-IN
    description: 'Working together at the intersection of culture, commerce and community.', // PLACEHOLDER
  },
  {
    name: 'Wilderness Reserve',
    slug: 'wilderness-reserve',
    logo: '/assets/partners/wilderness-reserve-logo.png', // REAL (Figma-supplied)
    description:
      'Nearly 20 years building global relationships meets 30 years at the heart of music, film and television.', // REAL (Figma copy)
  },
  {
    name: 'Thunder Aviation',
    slug: 'thunder-aviation',
    image: '/assets/partners/thunder-aviation-image.jpg', // REAL (Figma sample photo)
    description: 'A partnership built on shared standards and a mutual instinct for what matters.', // PLACEHOLDER
  },
  { name: 'GQ', slug: 'gq' },
  {
    name: 'Disney',
    slug: 'disney',
    image: '/assets/pillar-waves/theatre-seats.jpg', // STAND-IN
    description: 'Building meaningful connections between talent, brand and audience, one project at a time.', // PLACEHOLDER
  },
  { name: 'Burberry', slug: 'burberry' },
  {
    name: 'ITV',
    slug: 'itv',
    image: '/assets/pillar-waves/rotary-phone-story.jpg', // STAND-IN
    description: 'A relationship rooted in trust, creativity and a shared belief in doing things properly.', // PLACEHOLDER
  },
  { name: 'Net-a-Porter', slug: 'net-a-porter' },
  { name: 'Bumble', slug: 'bumble' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Adidas', slug: 'adidas' },
  { name: 'Nike', slug: 'nike' },
  { name: 'Reebok', slug: 'reebok' },
  { name: 'Rolls-Royce', slug: 'rolls-royce' },
  {
    name: 'Bentley',
    slug: 'bentley',
    image: '/assets/pillar-waves/rhode-corvette-plate.jpg', // STAND-IN
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  { name: 'AMEX', slug: 'amex' },
  { name: 'Barbour', slug: 'barbour' },
  { name: 'Sony', slug: 'sony' },
  { name: 'Apple', slug: 'apple' },
  { name: 'Google', slug: 'google' },
  { name: 'Chanel', slug: 'chanel' },
  { name: 'Hermès', slug: 'hermes' },
  { name: 'Amazon', slug: 'amazon' },
  { name: 'JP Morgan', slug: 'jp-morgan' },
  { name: 'Red Bull', slug: 'red-bull' },
  { name: 'Land Rover', slug: 'land-rover' },
  { name: 'Grey Goose', slug: 'grey-goose' },
  { name: 'LVMH', slug: 'lvmh' },
  { name: 'Peroni', slug: 'peroni' },
  { name: 'Jo Malone', slug: 'jo-malone' },
  { name: 'Rolex', slug: 'rolex' },
  { name: 'Premier League', slug: 'premier-league' },
  { name: 'Louis Vuitton', slug: 'louis-vuitton' },
  { name: 'TikTok', slug: 'tiktok' },
  { name: 'Puma', slug: 'puma' },
  { name: 'Spotify', slug: 'spotify' },
  { name: 'Meta', slug: 'meta' },
  { name: 'Porsche', slug: 'porsche' },
  { name: 'Airbnb', slug: 'airbnb' },
  { name: 'Bank of America', slug: 'bank-of-america' },
  { name: 'Lululemon', slug: 'lululemon' },
  { name: 'Harvey Nichols', slug: 'harvey-nichols' },
  { name: 'Harrods', slug: 'harrods' },
  { name: 'Soho House', slug: 'soho-house' },
];
