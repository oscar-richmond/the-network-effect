// PARTNER LIST PENDING FOUNDER SIGN-OFF — do not launch without confirmation.
//
// Order is the wheel order (index 0 = the name active at the very start of
// the partners runway — see partners-scroll.js). One name was normalized
// from the source list's "Channel" -> "Chanel" (read as the fashion house)
// — flagged since the first pass, still not independently confirmed.
//
// SATELLITE DATA MODEL (approved): per-brand optional `logo`, `image`,
// `description`, `logoWidthPct`. Brands without an asset get the approved
// empty-state behaviour (slot dissolves to empty; description falls back
// to the shared GENERIC_DESCRIPTION below).
//
// LOGOS — PLACEHOLDER SOURCING PENDING FOUNDER SIGN-OFF + LICENSING
// (launch-gating): brand marks are trademarked. These files were sourced
// from Wikimedia (Commons preferred; a handful are en-wiki fair-use-
// hosted) purely as BUILD-QUALITY placeholders — full per-file provenance
// in src/data/partners-logo-sources.md. Final files must come from each
// brand's press kit once relationships are confirmed. No mark was redrawn
// or background-hacked; brands whose only available mark fails the
// white-out treatment (AMEX box-knockout; Bumble yellow tile;
// Harvey Nichols white-on-black box; Peroni flattened-alpha PNG) or was
// structurally broken (Lululemon) stay in the empty-state, alongside the
// genuinely unavailable (Pavilion, Thunder Aviation, Hermès,
// Net-a-Porter, Jo Malone, Soho House).
//
// `logoWidthPct` — normalization (approved rule): rendered width as % of
// the 140px slot. Wordmarks share a 30px cap-height (width-clamped for
// ultra-wide marks); emblem/symbol marks share an equal-AREA target
// (0.35x slot area, clamped) so marks read at equal visual weight, not
// equal bounding box. Wilderness Reserve stays pinned at 100 — the
// approved reference render. Values are script-derived from each file's
// intrinsic ratio; retune the two constants, not individual numbers.
//
// IMAGES — PLACEHOLDER PAIRINGS PENDING FOUNDER SIGN-OFF (Stage-2
// amendment 4, same standing as the client-list note above): every brand
// carries an image so the satellite slot is never empty, but the pairings
// are MOOD-PLAUSIBLE placeholders chosen from the existing project pool
// (TNE CIMGS-sourced landing-gallery + pillar-waves assets), NOT licensed
// or accurate representations of work with these companies. Several pool
// images are moodboard-sourced. Abstract/texture preferred; pool images
// featuring an identifiable OTHER brand or person are deliberately
// unused. queen-vinyl-blue (Spotify) is the one borderline case —
// flagged for Oscar's call. Reuse across non-adjacent brands is
// deliberate; only one satellite ever shows at a time.
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
 *   logo?: string, logoWidthPct?: number, image?: string }} Partner
 */

/** @type {Partner[]} */
export const PARTNERS = [
  // Wilderness Reserve leads DELIBERATELY (Stage-1 amendment, Oscar's
  // re-pass): index 0 is the rest-active brand with the real supplied
  // logo — the rest state demonstrates the full satellite row, matching
  // the Figma composition (WILDERNESS RESERVE active, queued names
  // arcing below).
  {
    name: 'Wilderness Reserve',
    slug: 'wilderness-reserve',
    logo: '/assets/partners/wilderness-reserve-logo.png', // REAL (Figma-supplied)
    logoWidthPct: 100, // pinned — approved reference render
    image: '/assets/landing-gallery/kitchen-smoke.jpg', // estate kitchen mood
    description:
      'Nearly 20 years building global relationships meets 30 years at the heart of music, film and television.', // REAL (Figma copy)
  },
  {
    name: 'Pavilion',
    slug: 'pavilion',
    // logo: MISSING — ambiguous private brand, no public source
    image: '/assets/pillar-waves/film-set-monitor.jpg', // production monitor
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    logo: '/assets/partners/logos/netflix.svg',
    logoWidthPct: 79,
    image: '/assets/pillar-waves/theatre-seats.jpg', // screening room
    description: 'Working together at the intersection of culture, commerce and community.', // PLACEHOLDER
  },
  {
    name: 'Thunder Aviation',
    slug: 'thunder-aviation',
    // logo: MISSING — private company, no public brand asset
    image: '/assets/partners/thunder-aviation-image.jpg', // REAL (Figma sample photo)
    description: 'A partnership built on shared standards and a mutual instinct for what matters.', // PLACEHOLDER
  },
  {
    name: 'GQ',
    slug: 'gq',
    logo: '/assets/partners/logos/gq.svg',
    logoWidthPct: 40,
    image: '/assets/landing-gallery/cult-culture-flatlay.jpg', // editorial flatlay
  },
  {
    name: 'Disney',
    slug: 'disney',
    logo: '/assets/partners/logos/disney.svg',
    logoWidthPct: 41,
    image: '/assets/pillar-waves/projection-dinner.jpg', // projection screening
    description: 'Building meaningful connections between talent, brand and audience, one project at a time.', // PLACEHOLDER
  },
  {
    name: 'Burberry',
    slug: 'burberry',
    logo: '/assets/partners/logos/burberry.svg',
    logoWidthPct: 100,
    image: '/assets/pillar-waves/wax-seal-envelope.jpg', // heritage texture
  },
  {
    name: 'ITV',
    slug: 'itv',
    // FLAGGED: current file is the multi-colour ITV1 (2022) mark — reads
    // "ITV1", not "ITV"; kept as placeholder pending a proper ITV plc mark.
    logo: '/assets/partners/logos/itv.svg',
    logoWidthPct: 58,
    image: '/assets/pillar-waves/rotary-phone-story.jpg', // broadcast-era prop
    description: 'A relationship rooted in trust, creativity and a shared belief in doing things properly.', // PLACEHOLDER
  },
  {
    name: 'Net-a-Porter',
    slug: 'net-a-porter',
    // logo: FLATTENED-ONLY sources — empty-state per rule 3
    image: '/assets/pillar-waves/portre-flatlay.jpg', // fashion flatlay
  },
  {
    name: 'Bumble',
    slug: 'bumble',
    // logo: DROPPED at Phase B verification — the 2025 mark is a yellow
    // TILE with text on it (canvas corner test: opaque background);
    // a background box dies under the white-out treatment.
    image: '/assets/landing-gallery/retro-phone-cocktail.jpg', // phone, social setting
  },
  {
    name: 'Samsung',
    slug: 'samsung',
    logo: '/assets/partners/logos/samsung.svg',
    logoWidthPct: 100,
    image: '/assets/pillar-waves/ommo-orange-panel.jpg', // tech-abstract panel
  },
  {
    name: 'Adidas',
    slug: 'adidas',
    logo: '/assets/partners/logos/adidas.svg',
    logoWidthPct: 36,
    image: '/assets/landing-gallery/bw-stairs.jpg', // urban geometry
  },
  {
    name: 'Nike',
    slug: 'nike',
    logo: '/assets/partners/logos/nike.svg',
    logoWidthPct: 60,
    image: '/assets/landing-gallery/nike-dinner.jpg', // pool's own Nike dinner scene
  },
  {
    name: 'Reebok',
    slug: 'reebok',
    // FLAGGED: dated (blue/red era) mark — the only open-repo vector.
    logo: '/assets/partners/logos/reebok.svg',
    logoWidthPct: 43,
    image: '/assets/pillar-waves/red-socks-car.jpg', // sport detail
  },
  {
    name: 'Rolls-Royce',
    slug: 'rolls-royce',
    logo: '/assets/partners/logos/rolls-royce.svg',
    logoWidthPct: 49,
    image: '/assets/pillar-waves/bstn-newspaper-car.jpg', // classic-car scene
  },
  {
    name: 'Bentley',
    slug: 'bentley',
    logo: '/assets/partners/logos/bentley.svg',
    logoWidthPct: 95,
    image: '/assets/pillar-waves/rhode-corvette-plate.jpg', // car detail
    description: 'A valued partner in shaping culture through experiences, media and lasting collaboration.', // PLACEHOLDER
  },
  {
    name: 'AMEX',
    slug: 'amex',
    // logo: DROPPED at Phase B verification — the 2018 box mark's knockout
    // text dies under the white-out treatment (solid white square).
    image: '/assets/pillar-waves/collectors-key.jpg', // members'-key object
  },
  {
    name: 'Barbour',
    slug: 'barbour',
    logo: '/assets/partners/logos/barbour.svg',
    logoWidthPct: 100,
    image: '/assets/pillar-waves/hotel-balzac-door.jpg', // heritage door
  },
  {
    name: 'Sony',
    slug: 'sony',
    logo: '/assets/partners/logos/sony.svg',
    logoWidthPct: 100,
    image: '/assets/landing-gallery/vinyl-candlelight.jpg', // music texture
  },
  {
    name: 'Apple',
    slug: 'apple',
    logo: '/assets/partners/logos/apple.svg',
    logoWidthPct: 49,
    image: '/assets/landing-gallery/door-313.jpg', // minimal architectural detail
  },
  {
    name: 'Google',
    slug: 'google',
    logo: '/assets/partners/logos/google.svg',
    logoWidthPct: 63,
    image: '/assets/pillar-waves/public-kitchen-cards.jpg', // communal workspace
  },
  {
    name: 'Chanel',
    slug: 'chanel',
    logo: '/assets/partners/logos/chanel.svg',
    logoWidthPct: 51,
    image: '/assets/pillar-waves/wax-seal-envelope.jpg', // luxury texture (reuse)
  },
  {
    name: 'Hermès',
    slug: 'hermes',
    // logo: MISSING — no usable Hermès (Paris) mark on any open repo
    image: '/assets/pillar-waves/red-leather-tie.jpg', // leather craft
  },
  {
    name: 'Amazon',
    slug: 'amazon',
    logo: '/assets/partners/logos/amazon.svg',
    logoWidthPct: 71,
    image: '/assets/pillar-waves/film-set-monitor.jpg', // studio screen (reuse)
  },
  {
    name: 'JP Morgan',
    slug: 'jp-morgan',
    logo: '/assets/partners/logos/jp-morgan.svg',
    logoWidthPct: 100,
    image: '/assets/landing-gallery/bw-stairs.jpg', // architecture (reuse)
  },
  {
    name: 'Red Bull',
    slug: 'red-bull',
    logo: '/assets/partners/logos/red-bull.svg',
    logoWidthPct: 71,
    image: '/assets/landing-gallery/red-car-blur.jpg', // motion blur
  },
  {
    name: 'Land Rover',
    slug: 'land-rover',
    logo: '/assets/partners/logos/land-rover.svg',
    logoWidthPct: 41,
    image: '/assets/pillar-waves/bstn-newspaper-car.jpg', // car scene (reuse)
  },
  {
    name: 'Grey Goose',
    slug: 'grey-goose',
    // FLAGGED: multi-colour label artwork — silhouette under white-out is
    // a legibility judgment call (Oscar's pass).
    logo: '/assets/partners/logos/grey-goose.svg',
    logoWidthPct: 64,
    image: '/assets/landing-gallery/retro-phone-cocktail.jpg', // cocktail (reuse)
  },
  {
    name: 'LVMH',
    slug: 'lvmh',
    logo: '/assets/partners/logos/lvmh.svg',
    logoWidthPct: 74,
    image: '/assets/pillar-waves/collectors-key.jpg', // luxury object (reuse)
  },
  {
    name: 'Peroni',
    slug: 'peroni',
    // logo: DROPPED at Phase B verification — the PNG's alpha is a token
    // margin only (92% opaque): effectively a flattened background box.
    image: '/assets/pillar-waves/alaia-table-setting.jpg', // aperitivo table
  },
  {
    name: 'Jo Malone',
    slug: 'jo-malone',
    // logo: FLATTENED-ONLY sources — empty-state per rule 3
    image: '/assets/landing-gallery/vinyl-candlelight.jpg', // candlelight (reuse)
  },
  {
    name: 'Rolex',
    slug: 'rolex',
    logo: '/assets/partners/logos/rolex.svg', // wordmark only — crown not openly available
    logoWidthPct: 100,
    image: '/assets/pillar-waves/wax-seal-envelope.jpg', // precision craft texture (reuse)
  },
  {
    name: 'Premier League',
    slug: 'premier-league',
    logo: '/assets/partners/logos/premier-league.svg',
    logoWidthPct: 51,
    image: '/assets/pillar-waves/theatre-seats.jpg', // seated-crowd abstract (reuse)
  },
  {
    name: 'Louis Vuitton',
    slug: 'louis-vuitton',
    logo: '/assets/partners/logos/louis-vuitton.svg',
    logoWidthPct: 100,
    image: '/assets/pillar-waves/portre-flatlay.jpg', // fashion flatlay (reuse)
  },
  {
    name: 'TikTok',
    slug: 'tiktok',
    logo: '/assets/partners/logos/tiktok.svg',
    logoWidthPct: 74,
    image: '/assets/pillar-waves/ommo-orange-panel.jpg', // bold graphic panel (reuse)
  },
  {
    name: 'Puma',
    slug: 'puma',
    logo: '/assets/partners/logos/puma.svg', // text-only wordmark — cat not openly available
    logoWidthPct: 69,
    image: '/assets/pillar-waves/red-socks-car.jpg', // sport detail (reuse)
  },
  {
    name: 'Spotify',
    slug: 'spotify',
    logo: '/assets/partners/logos/spotify.svg',
    logoWidthPct: 89,
    image: '/assets/pillar-waves/queen-vinyl-blue.jpg', // vinyl — BORDERLINE, flagged above
  },
  {
    name: 'Meta',
    slug: 'meta',
    logo: '/assets/partners/logos/meta.svg',
    logoWidthPct: 100,
    image: '/assets/pillar-waves/public-kitchen-cards.jpg', // community vibe (reuse)
  },
  {
    name: 'Porsche',
    slug: 'porsche',
    logo: '/assets/partners/logos/porsche.svg', // wordmark — crest deliberately avoided
    logoWidthPct: 100,
    image: '/assets/landing-gallery/red-car-blur.jpg', // motion blur (reuse)
  },
  {
    name: 'Airbnb',
    slug: 'airbnb',
    logo: '/assets/partners/logos/airbnb.svg',
    logoWidthPct: 69,
    image: '/assets/pillar-waves/hotel-balzac-door.jpg', // door/stay (reuse)
  },
  {
    name: 'Bank of America',
    slug: 'bank-of-america',
    logo: '/assets/partners/logos/bank-of-america.svg',
    logoWidthPct: 100,
    image: '/assets/landing-gallery/bw-stairs.jpg', // architecture (reuse)
  },
  {
    name: 'Lululemon',
    slug: 'lululemon',
    // logo: DROPPED at Phase B verification — the only open-repo SVG is
    // structurally broken (references an undefined symbol id; renders
    // empty). Empty-state per rule 3 (flag, don't hack).
    image: '/assets/landing-gallery/cult-culture-flatlay.jpg', // lifestyle flatlay (reuse)
  },
  {
    name: 'Harvey Nichols',
    slug: 'harvey-nichols',
    // logo: DROPPED at Phase B verification — white wordmark on a solid
    // BLACK box (canvas corner test); a background box dies under the
    // white-out treatment.
    image: '/assets/landing-gallery/door-313.jpg', // boutique door (reuse)
  },
  {
    name: 'Harrods',
    slug: 'harrods',
    logo: '/assets/partners/logos/harrods.svg',
    logoWidthPct: 49,
    image: '/assets/pillar-waves/alaia-table-setting.jpg', // fine-dining table (reuse)
  },
  {
    name: 'Soho House',
    slug: 'soho-house',
    // logo: FLATTENED-ONLY sources — empty-state per rule 3
    image: '/assets/landing-gallery/kitchen-smoke.jpg', // kitchen scene (reuse)
  },
];
