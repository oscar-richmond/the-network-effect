/**
 * /founders — content data. Figma n2cY4c7GnsR5MBx1PJoC97 node
 * 73:5519 ("The Founders — Slide 2"), extracted 2026-08-08.
 *
 * NO SLIDE 1 FRAME EXISTS IN THE FILE (the canvas holds only the
 * slide-2 frame; both founders' image layers live inside it). Slide
 * 1 is therefore built from the same template with Robbo's imagery
 * and PLACEHOLDER copy: the bio is the landing founders section's
 * approved Robbo line restyled into the slide-2 bio grammar, and
 * the slash-list is a placeholder in the same voice — ALL SLIDE-1
 * COPY PENDING THE DECK. ("Rob" vs "Robbo" remains flagged
 * site-wide; the file's own layer names say Robbo.)
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
    listLabel: 'The network advantage:',
    /* PLACEHOLDER list (the slide-2 grammar; pending the deck). */
    list: [
      { text: 'GLOBAL PARTNERSHIPS', index: '/01' },
      { text: 'TRUSTED CONNECTOR', index: '/02' },
      { text: 'STRATEGIC OPERATOR', index: '/03', breakAfter: true },
      { text: 'COMMERCIAL INSTINCT', index: '/04' },
      { text: 'LONG-TERM RELATIONSHIPS', index: '/05' },
      { text: 'CULTURAL FLUENCY', index: '/06' },
    ],
  },
  {
    id: 'ashley',
    number: '02',
    name: 'Ashley Walters',
    img: '/assets/landing/founders-page/ashley.png',
    bioBold: 'ONE OF THE UK’S MOST RESPECTED CULTURAL VOICES WITH OVER 30 YEARS ACROSS MUSIC, FILM AND TELEVISION.',
    bioSerrif: 'Decades inside rooms where culture was built.',
    listLabel: 'The network advantage:',
    /* VERBATIM incl. the double-indexed wrapped item (see header). */
    list: [
      { text: 'CULTURAL CREDIBILITY', index: '/01' },
      { text: 'TRUSTED ACCESS TO TALENT', index: '/02' },
      { text: 'INDUSTRY', index: '/03', joinNext: true },
      { text: 'RELATIONSHIPS', index: '/04' },
      { text: 'AUTHENTICITY WITHIN CULTURE', index: '/05' },
      { text: 'CREATIVE INFLUENCE', index: '/06' },
    ],
  },
];

export const FOUNDERS_CTA = { label: 'FEATURED WORK', href: '/work' };
