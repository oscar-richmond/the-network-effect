/**
 * /contact — content + config. Figma n2cY4c7GnsR5MBx1PJoC97 nodes
 * 70:5009 (Contact) + 70:5172 (SCHEDULE A CALL - CONTACT, the
 * modal), extracted 2026-08-08. Copy verbatim from the file.
 *
 * RIGHTS — ELEVATED: contact-image.png is the file's topmost layer
 * of a stack whose siblings are named "Men's Spring-Summer 2026
 * Collection LOUIS VUITTON" — fashion-show / third-party-IP
 * imagery, NOTHING ships without explicit confirmation. The Robbo
 * profile crop carries the standing founder-imagery sign-off
 * caveat.
 *
 * EMAIL: hello@networkeffectagency.co.uk — the ONE correct address
 * (Oscar, 2026-08-10). The Figma file's EMAIL US said
 * hello@thenetworkeffect.co.uk; that address is wrong and is
 * retired everywhere, so EMAIL US, the copy-to-clipboard pill and
 * the footer all now agree with LET'S CHAT. Subject = the holding
 * page's established enquiry subject, verbatim.
 */

export const CONTACT_INTRO = {
  line1: 'LET’S START A', // Dazzed Bold 48, the file's leading indent
  line2: 'CONVERSATION.', // Serrif Medium 48
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
