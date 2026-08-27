/**
 * /contact — content + config. Figma n2cY4c7GnsR5MBx1PJoC97 nodes
 * 70:5009 (Contact) + 70:5172 (SCHEDULE A CALL - CONTACT, the
 * modal), extracted 2026-08-08. Copy verbatim from the file.
 *
 * RIGHTS (updated 2026-08-27, frame 51:2829): the page image is now
 * contact-founders.jpg — the frame's TOPMOST visible layer (asset
 * 023A6940, a founders photograph). The LV screenshot/video are
 * fully retired from this page, so the ELEVATED third-party-IP
 * flag comes OFF this slot; the founders photo carries the STANDARD
 * pending-sign-off + the standing founder-imagery caveat, as does
 * the Robbo profile crop on SCHEDULE A CALL.
 *
 * EMAIL: hello@networkeffectagency.co.uk — CANONICAL per the ruling
 * in data/menu.js (Oscar, FINAL, 2026-08-27). Subject = the holding
 * page's established enquiry subject, verbatim.
 */

export const CONTACT_INTRO = {
  /* Frame 51:2884 (2026-08-27): Dazzed Bold 100/88/−5% BOTH lines —
     the serif second line retired with the respec. */
  line1: 'LET’S START A',
  line2: 'CONVERSATION.',
};

export const CONTACT_EMAIL = 'hello@networkeffectagency.co.uk';
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'The Network Effect — Enquiry',
)}`;

/**
 * cal.com booking link — THE one config point.
 * TODO(Oscar): no cal.com account exists yet. When it does, put the
 * booking link here (e.g. 'thenetworkeffect/intro-call') — that is
 * the ONLY change needed; the modal lazy-loads the official embed
 * on first open and styles it per the Figma frame. While this is
 * empty the modal shows the quiet fallback (message + mailto)
 * instead — no cal.com request is ever made, and the modal is
 * never a dead end.
 */
export const CAL_BOOKING_LINK = '';

/** The fallback copy inside the window while cal.com is pending. */
export const CAL_FALLBACK = {
  message: 'Our calendar is being set up.',
  action: 'Email us instead',
};
