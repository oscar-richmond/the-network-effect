/**
 * THE STATEMENTS — one source, two renderings (mobile rebuild Part 3,
 * 2026-09-08). The desktop composes each statement as its own authored
 * lines (frames 16:113 / 13:277 / the closing's), the phone as the 402
 * frame's (GvANAN3kJOPV8AKOi3O9FF 1:11: 1:326, 1:338, 1:373) — different
 * breaks and indents over the SAME words. Each component renders its own
 * list from here; the copy is written once.
 *
 *   desktop: the lines as the desktop components authored them (verbatim —
 *            the desktop's rendered output is unchanged)
 *   mobile:  the frame's lines: { t, x } — x is the indent from the inset
 *            (the node's x − 16); { t, right: n } is a line right-aligned
 *            to the measure, n in from its right edge
 */

/* WE CREATE ACCESS (desktop frame 16:113; phone 1:326 — eight 48/45 lines at x 82/82/166/16/173/73/16/48) */
export const ACCESS_LABEL = 'WHAT WE DO';
export const ACCESS_STATEMENT = {
  desktop: ['WE', 'CREATE', 'ACCESS', 'BETWEEN', 'WORLDS', 'THAT DON’T', 'NORMALLY CONNECT'],
  mobile: [
    { t: 'WE', x: 66 },
    { t: 'CREATE', x: 66 },
    { t: 'ACCESS', x: 150 },
    { t: 'BETWEEN', x: 0 },
    { t: 'WORLDS', x: 157 },
    { t: 'THAT DON’T', x: 57 },
    { t: 'NORMALLY', x: 0 },
    { t: 'CONNECT', x: 32 },
  ],
};

/* MOST BRANDS STRUGGLE TO ACCESS CULTURE AUTHENTICALLY. (desktop three lines; phone 1:338 — four 32/30 lines at x 16/31/16/64) */
export const CLOSING_HEADLINE = {
  desktop: ['MOST BRANDS', 'STRUGGLE TO ACCESS', 'CULTURE AUTHENTICALLY.'],
  mobile: [
    { t: 'MOST BRANDS', x: 0 },
    { t: 'STRUGGLE TO ACCESS', x: 15 },
    { t: 'CULTURE', x: 0 },
    { t: 'AUTHENTICALLY.', x: 48 },
  ],
};

/* THE CLOSING STATEMENT (desktop frame 13:277 — nine absolutely placed lines, authored x/y; phone 1:373 — fourteen 48/45 lines, four of them right-aligned) */
export const CLOSING_STATEMENT = {
  desktop: [
    { x: 374, y: 0, t: 'The' },
    { x: 295, y: 90, t: 'network effect' },
    { x: 88, y: 178, t: 'exists            to connect people,' },
    { x: 565, y: 279, t: 'brands and talent' },
    { x: 201, y: 369, t: 'in ways that create' },
    { x: 228, y: 459, t: 'long-term' },
    { x: 1037, y: 459, t: 'cultural' },
    { x: 410, y: 549, t: 'and commercial' },
    { x: 1007, y: 639, t: 'value.' },
  ],
  mobile: [
    { t: 'THE', x: 66 },
    { t: 'NETWORK', x: 0 },      /* the node sits at x14, 2 outside the inset — drawn at the inset */
    { t: 'EFFECT EXISTS', right: 0 },
    { t: 'TO CONNECT', right: 0 },
    { t: 'PEOPLE,', x: 139 },
    { t: 'BRANDS AND', x: 0 },
    { t: 'TALENT', x: 47 },
    { t: 'IN WAYS THAT', right: 0 },
    { t: 'CREATE', x: 185 },
    { t: 'LONG-TERM', x: 63 },
    { t: 'CULTURAL', x: 0 },
    { t: 'AND', x: 24 },
    { t: 'COMMERCIAL', x: 0 },
    { t: 'VALUE', right: 32 },
  ],
};
