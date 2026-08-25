/**
 * /founders — content data. Figma n2cY4c7GnsR5MBx1PJoC97 node
 * 73:5519 ("The Founders — Slide 2"), extracted 2026-08-08.
 *
 * NO SLIDE 1 FRAME EXISTS IN THE FILE (the canvas holds only the
 * slide-2 frame; both founders' image layers live inside it). Slide
 * 1 is therefore built from the same template with Robbo's imagery:
 * the BIO is still PLACEHOLDER (the landing founders section's
 * approved Robbo line restyled into the slide-2 bio grammar,
 * pending the deck), but the list is APPROVED copy — Oscar's
 * 2026-08-08 attachment ("Relationships across:" + seven sectors).
 * ("Rob" vs "Robbo" remains flagged site-wide; the file's own
 * layer names say Robbo.)
 *
 * SLIDE-2 COPY is the deck's, with ONE deliberate correction
 * (Oscar, rev 5): the deck double-indexed the wrapped item
 * "INDUSTRY RELATIONSHIPS" (/03 after INDUSTRY, /04 after
 * RELATIONSHIPS). It is now a single item with a single index /03
 * and an authored line break between its words; the items after it
 * renumber to /04 and /05.
 *
 * IMAGERY: founder portraits — standard pending founder sign-off.
 * BUTTON: the file's 195×38 "FEATURED WORK" CTA — /work exists, so
 * it is a REAL link (not a placeholder).
 */

export const FOUNDERS_SLIDES = [
  {
    id: 'robbo',
    number: '01',
    name: 'Robbo McCallum',
    img: '/assets/landing/founders-page/robbo.png',
    /* MOBILE second image (frame 13:948's slot under the Serrif
       statement) — Oscar's sofa shot (supplied 2026-08-14, replaces
       the interim portrait-reuse placeholder). */
    img2: '/assets/landing/founders-page/robbo-2.jpg',
    /* PLACEHOLDER (see header): the landing founders line, split
       into the slide-2 bio grammar (Dazzed statement + Serrif
       close). */
    bioBold: 'RELATIONSHIP ARCHITECT WITH NEARLY 20 YEARS BUILDING GLOBAL PARTNERSHIPS.',
    bioSerrif: 'Trusted connector. Strategic operator.',
    /* APPROVED COPY (Oscar's attachment, 2026-08-08) — replaces the
       placeholder list: "Relationships across:" + the seven sectors
       on two lines (break after FOOD & BEVERAGE, per the visual). */
    /* ── FRAME 6:67 DESKTOP FIELDS (2026-08-26). The frame carries
       REAL new Robbo copy (role line, two bio paragraphs) and a TEN-
       sector relationships list — sentence case, NO /0N indexes,
       label reworded — which DIVERGES from the approved 7-item
       indexed list below (kept: mobile still renders it). Flagged
       in the report for Oscar's ruling. */
    roleLine: 'FOUNDER: PARTNERSHIPS, STRATEGY & EXPERIENCES',
    bioParas: [
      '20 years operating at the intersection of luxury hospitality, entertainment, brands, talent and live experiences.',
      'Rob has built a career creating partnerships, communities and experiences by connecting people and opportunities that wouldn\u2019t ordinarily come together.',
    ],
    relLabel: 'A STRATEGIC OPERATOR WITH A GLOBAL NETWORK SPANNING',
    relRows: [
      ['Talent', 'Hospitality', 'TV & Film', 'Music'],
      ['Luxury', 'Fashion', 'Food & Beverage'],
      ['Sports', 'Production', 'Founders'],
    ],
    /* The frame's four right-column shots (downloaded 2026-08-26,
       resized; PENDING FOUNDER SIGN-OFF like all founder imagery). */
    colImgs: [
      '/assets/landing/founders-page/col-1.png',
      '/assets/landing/founders-page/col-2.png',
      '/assets/landing/founders-page/col-3.png',
      '/assets/landing/founders-page/col-4.png',
    ],
    listLabel: 'Relationships across:',
    /* Oscar's rev 5: BRANDS moves UP to line 1 (so a slash divider
       now falls between FOOD & BEVERAGE and BRANDS); the break
       runs after BRANDS instead. */
    list: [
      { text: 'TALENT', index: '/01' },
      { text: 'HOSPITALITY', index: '/02' },
      { text: 'FOOD & BEVERAGE', index: '/03' },
      { text: 'BRANDS', index: '/04', breakAfter: true },
      { text: 'EVENTS', index: '/05' },
      { text: 'PRODUCTION', index: '/06' },
      { text: 'DESIGN', index: '/07' },
    ],
  },
  {
    id: 'ashley',
    number: '02',
    name: 'Ashley Walters',
    img: '/assets/landing/founders-page/ashley.png',
    /* MOBILE second image — frame 13:948's "023A7036" shot, the
       file's exact square crop baked into the asset (2026-08-14). */
    img2: '/assets/landing/founders-page/ashley-2.jpg',
    bioBold: 'ONE OF THE UK’S MOST RESPECTED CULTURAL VOICES WITH OVER 30 YEARS ACROSS MUSIC, FILM AND TELEVISION.',
    /* Forced break (Oscar's rev 3): "culture" drops to the last
       line — rendered via white-space:pre-line on the Serrif block. */
    bioSerrif: 'Decades inside rooms where\nculture was built.',
    /* ── FRAME 6:67 DESKTOP FIELDS — Ashley has no frame; his
       APPROVED copy maps into the same grammar. roleLine is an
       INVENTED PLACEHOLDER (from his approved bio) — flagged.
       Column images: the same four shots in REVERSE order (Oscar:
       "the images on the right just need to change order" —
       interpreted as reversed, no image in the same slot; flagged
       for correction). */
    roleLine: 'FOUNDER: MUSIC, FILM & TELEVISION',
    bioParas: [
      'One of the UK\u2019s most respected cultural voices with over 30 years across music, film and television.',
      'Decades inside rooms where culture was built.',
    ],
    relLabel: 'THE NETWORK ADVANTAGE',
    relRows: [
      ['Cultural Credibility', 'Trusted Access to Talent'],
      ['Industry Relationships', 'Authenticity Within Culture'],
      ['Creative Influence'],
    ],
    colImgs: [
      '/assets/landing/founders-page/col-4.png',
      '/assets/landing/founders-page/col-3.png',
      '/assets/landing/founders-page/col-2.png',
      '/assets/landing/founders-page/col-1.png',
    ],
    listLabel: 'The network advantage:',
    /* Oscar's rev 5 — the deck's double-index quirk is RESOLVED, not
       preserved: "INDUSTRY RELATIONSHIPS" is ONE item carrying ONE
       index (/03), with an authored break between its two words so
       RELATIONSHIPS starts line 2 and a normal slash divider follows
       it. The two items after it renumber accordingly (/04, /05) —
       five conceptual items, five indexes. */
    list: [
      { text: 'CULTURAL CREDIBILITY', index: '/01' },
      { text: 'TRUSTED ACCESS TO TALENT', index: '/02' },
      { text: 'INDUSTRY\nRELATIONSHIPS', index: '/03' },
      { text: 'AUTHENTICITY WITHIN CULTURE', index: '/04' },
      { text: 'CREATIVE INFLUENCE', index: '/05' },
    ],
  },
];

export const FOUNDERS_CTA = { label: 'FEATURED WORK', href: '/work' };
