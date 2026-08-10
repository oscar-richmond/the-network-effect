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
 * SLIDE-2 COPY VERBATIM, including the deck quirk that the wrapped
 * item "INDUSTRY RELATIONSHIPS" carries TWO superscript indexes
 * (/03 after INDUSTRY at the line end, /04 after RELATIONSHIPS on
 * the next line) — six indexes across five conceptual items,
 * preserved not "fixed".
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
    /* PLACEHOLDER (see header): the landing founders line, split
       into the slide-2 bio grammar (Dazzed statement + Serrif
       close). */
    bioBold: 'RELATIONSHIP ARCHITECT WITH NEARLY 20 YEARS BUILDING GLOBAL PARTNERSHIPS.',
    bioSerrif: 'Trusted connector. Strategic operator.',
    /* APPROVED COPY (Oscar's attachment, 2026-08-08) — replaces the
       placeholder list: "Relationships across:" + the seven sectors
       on two lines (break after FOOD & BEVERAGE, per the visual). */
    listLabel: 'Relationships across:',
    list: [
      { text: 'TALENT', index: '/01' },
      { text: 'HOSPITALITY', index: '/02' },
      { text: 'FOOD & BEVERAGE', index: '/03', breakAfter: true },
      { text: 'BRANDS', index: '/04' },
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
    bioBold: 'ONE OF THE UK’S MOST RESPECTED CULTURAL VOICES WITH OVER 30 YEARS ACROSS MUSIC, FILM AND TELEVISION.',
    /* Forced break (Oscar's rev 3): "culture" drops to the last
       line — rendered via white-space:pre-line on the Serrif block. */
    bioSerrif: 'Decades inside rooms where\nculture was built.',
    listLabel: 'The network advantage:',
    /* VERBATIM incl. the double-indexed wrapped item (see header). */
    list: [
      { text: 'CULTURAL CREDIBILITY', index: '/01' },
      { text: 'TRUSTED ACCESS TO TALENT', index: '/02' },
      { text: 'INDUSTRY', index: '/03', joinNext: true },
      /* Explicit break (Oscar's rev 4) — at 20px this line ended
         here by natural wrap anyway; pinning it keeps the two-line
         set deterministic instead of column-width dependent. */
      { text: 'RELATIONSHIPS', index: '/04', breakAfter: true },
      { text: 'AUTHENTICITY WITHIN CULTURE', index: '/05' },
      { text: 'CREATIVE INFLUENCE', index: '/06' },
    ],
  },
];

export const FOUNDERS_CTA = { label: 'FEATURED WORK', href: '/work' };
