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
// GENERIC_DESCRIPTION below — the reference site's own approach). NO logos
// are fabricated (an IP and credibility problem the moment one is wrong):
// logo slots stay empty until real marks are supplied to
// public/assets/partners/.
//
// IMAGES — PLACEHOLDER PAIRINGS PENDING FOUNDER SIGN-OFF (Stage-2
// amendment 4, same standing as the client-list note above): every brand
// now carries an image so the satellite slot is never empty, but the
// pairings are MOOD-PLAUSIBLE placeholders chosen from the existing
// project pool (TNE CIMGS-sourced landing-gallery + pillar-waves assets),
// NOT licensed or accurate representations of work with these companies.
// Several pool images are moodboard-sourced. Selection rules applied:
// abstract/texture/scene images preferred over recognisable subjects;
// pool images whose content features an identifiable OTHER brand or
// person (bottega-jacket, jacquemus-bag, lagerfeld-pharrell, depp-bar,
// skims-taxi, comme-des-garcons-walk) are deliberately UNUSED here —
// pairing them with a different named company would imply a specific
// claim. queen-vinyl-blue (Spotify) is the one borderline case (sleeve
// art may be identifiable) — flagged for Oscar's call. Reuse across
// non-adjacent brands is deliberate (pool of ~23 usable images across 45
// brands); only one satellite ever shows at a time.
//
// ASSET STATUS: Wilderness Reserve's logo + description are the REAL
// Figma-supplied ones; Thunder Aviation's image is the REAL Figma sample
// photo. All non-Wilderness descriptions are deliberately GENERIC
// placeholders — no factual basis exists for describing the real
// relationship with these companies, and specific-sounding claims would
// read as fabricated fact about real businesses.
export const GENERIC_DESCRIPTION =
  'From multinational companies to independent brands, we have been fortunate to work across a diversity of projects and clients.';

/**
 * @typedef {{ name: string, slug: string, description?: string,
 *   logo?: string, image?: string }} Partner
 */

/** @type {Partner[]} */
export const PARTNERS = [
  // Wilderness Reserve leads DELIBERATELY (Stage-1 amendment, Oscar's
  // re-pass): index 0 is the rest-active brand, and it's the only brand
  // with a real supplied logo — leading with it makes the rest state
  // demonstrate the full satellite row (logo + real copy), and matches
  // the Figma composition itself, where WILDERNESS RESERVE is the active
  // name with the queued names arcing below it.
  {
    name: 'Wilderness Reserve',
    slug: 'wilderness-reserve',
    logo: '/assets/partners/wilderness-reserve-logo.png', // REAL (Figma-supplied)
    image: '/assets/landing-gallery/kitchen-smoke.jpg', // estate kitchen mood
    description:
      'Nearly 20 years building global relationships meets 30 years at the heart of music, film and television.', // REAL (Figma copy)
  },
  {
    name: 'Pavilion',
    slug: 'pavilion',
    image: '/assets/pillar-waves/film-set-monitor.jpg', // production monitor
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    image: '/assets/pillar-waves/theatre-seats.jpg', // screening room
    description: 'Working together at the intersection of culture, commerce and community.', // PLACEHOLDER
  },
  {
    name: 'Thunder Aviation',
    slug: 'thunder-aviation',
    image: '/assets/partners/thunder-aviation-image.jpg', // REAL (Figma sample photo)
    description: 'A partnership built on shared standards and a mutual instinct for what matters.', // PLACEHOLDER
  },
  { name: 'GQ', slug: 'gq', image: '/assets/landing-gallery/cult-culture-flatlay.jpg' }, // editorial flatlay
  {
    name: 'Disney',
    slug: 'disney',
    image: '/assets/pillar-waves/projection-dinner.jpg', // projection screening
    description: 'Building meaningful connections between talent, brand and audience, one project at a time.', // PLACEHOLDER
  },
  { name: 'Burberry', slug: 'burberry', image: '/assets/pillar-waves/wax-seal-envelope.jpg' }, // heritage texture
  {
    name: 'ITV',
    slug: 'itv',
    image: '/assets/pillar-waves/rotary-phone-story.jpg', // broadcast-era prop
    description: 'A relationship rooted in trust, creativity and a shared belief in doing things properly.', // PLACEHOLDER
  },
  { name: 'Net-a-Porter', slug: 'net-a-porter', image: '/assets/pillar-waves/portre-flatlay.jpg' }, // fashion flatlay
  { name: 'Bumble', slug: 'bumble', image: '/assets/landing-gallery/retro-phone-cocktail.jpg' }, // phone, social setting
  { name: 'Samsung', slug: 'samsung', image: '/assets/pillar-waves/ommo-orange-panel.jpg' }, // tech-abstract panel
  { name: 'Adidas', slug: 'adidas', image: '/assets/landing-gallery/bw-stairs.jpg' }, // urban geometry
  { name: 'Nike', slug: 'nike', image: '/assets/landing-gallery/nike-dinner.jpg' }, // pool's own Nike dinner scene
  { name: 'Reebok', slug: 'reebok', image: '/assets/pillar-waves/red-socks-car.jpg' }, // sport detail
  { name: 'Rolls-Royce', slug: 'rolls-royce', image: '/assets/pillar-waves/bstn-newspaper-car.jpg' }, // classic-car scene
  {
    name: 'Bentley',
    slug: 'bentley',
    image: '/assets/pillar-waves/rhode-corvette-plate.jpg', // car detail
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  { name: 'AMEX', slug: 'amex', image: '/assets/pillar-waves/collectors-key.jpg' }, // members'-key object
  { name: 'Barbour', slug: 'barbour', image: '/assets/pillar-waves/hotel-balzac-door.jpg' }, // heritage door
  { name: 'Sony', slug: 'sony', image: '/assets/landing-gallery/vinyl-candlelight.jpg' }, // music texture
  { name: 'Apple', slug: 'apple', image: '/assets/landing-gallery/door-313.jpg' }, // minimal architectural detail
  { name: 'Google', slug: 'google', image: '/assets/pillar-waves/public-kitchen-cards.jpg' }, // communal workspace
  { name: 'Chanel', slug: 'chanel', image: '/assets/pillar-waves/wax-seal-envelope.jpg' }, // luxury texture (reuse)
  { name: 'Hermès', slug: 'hermes', image: '/assets/pillar-waves/red-leather-tie.jpg' }, // leather craft
  { name: 'Amazon', slug: 'amazon', image: '/assets/pillar-waves/film-set-monitor.jpg' }, // studio screen (reuse)
  { name: 'JP Morgan', slug: 'jp-morgan', image: '/assets/landing-gallery/bw-stairs.jpg' }, // architecture (reuse)
  { name: 'Red Bull', slug: 'red-bull', image: '/assets/landing-gallery/red-car-blur.jpg' }, // motion blur
  { name: 'Land Rover', slug: 'land-rover', image: '/assets/pillar-waves/bstn-newspaper-car.jpg' }, // car scene (reuse)
  { name: 'Grey Goose', slug: 'grey-goose', image: '/assets/landing-gallery/retro-phone-cocktail.jpg' }, // cocktail (reuse)
  { name: 'LVMH', slug: 'lvmh', image: '/assets/pillar-waves/collectors-key.jpg' }, // luxury object (reuse)
  { name: 'Peroni', slug: 'peroni', image: '/assets/pillar-waves/alaia-table-setting.jpg' }, // aperitivo table
  { name: 'Jo Malone', slug: 'jo-malone', image: '/assets/landing-gallery/vinyl-candlelight.jpg' }, // candlelight (reuse)
  { name: 'Rolex', slug: 'rolex', image: '/assets/pillar-waves/wax-seal-envelope.jpg' }, // precision craft texture (reuse)
  { name: 'Premier League', slug: 'premier-league', image: '/assets/pillar-waves/theatre-seats.jpg' }, // seated-crowd abstract (reuse)
  { name: 'Louis Vuitton', slug: 'louis-vuitton', image: '/assets/pillar-waves/portre-flatlay.jpg' }, // fashion flatlay (reuse)
  { name: 'TikTok', slug: 'tiktok', image: '/assets/pillar-waves/ommo-orange-panel.jpg' }, // bold graphic panel (reuse)
  { name: 'Puma', slug: 'puma', image: '/assets/pillar-waves/red-socks-car.jpg' }, // sport detail (reuse)
  { name: 'Spotify', slug: 'spotify', image: '/assets/pillar-waves/queen-vinyl-blue.jpg' }, // vinyl — BORDERLINE, flagged above
  { name: 'Meta', slug: 'meta', image: '/assets/pillar-waves/public-kitchen-cards.jpg' }, // community vibe (reuse)
  { name: 'Porsche', slug: 'porsche', image: '/assets/landing-gallery/red-car-blur.jpg' }, // motion blur (reuse)
  { name: 'Airbnb', slug: 'airbnb', image: '/assets/pillar-waves/hotel-balzac-door.jpg' }, // door/stay (reuse)
  { name: 'Bank of America', slug: 'bank-of-america', image: '/assets/landing-gallery/bw-stairs.jpg' }, // architecture (reuse)
  { name: 'Lululemon', slug: 'lululemon', image: '/assets/landing-gallery/cult-culture-flatlay.jpg' }, // lifestyle flatlay (reuse)
  { name: 'Harvey Nichols', slug: 'harvey-nichols', image: '/assets/landing-gallery/door-313.jpg' }, // boutique door (reuse)
  { name: 'Harrods', slug: 'harrods', image: '/assets/pillar-waves/alaia-table-setting.jpg' }, // fine-dining table (reuse)
  { name: 'Soho House', slug: 'soho-house', image: '/assets/landing-gallery/kitchen-smoke.jpg' }, // kitchen scene (reuse)
];
