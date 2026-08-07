/** @typedef {{ href: string, label: string, image: string }} MenuLink */

/** @type {MenuLink[]} */
export const menuLinks = [
  // About points at /old — the archived full-site landing (the former
  // /about-3, which was at "/" until the rebuild-phase archive). The
  // root now serves the holding page, so this link must NOT be "" or
  // the site's own nav would send visitors to the holding page. The
  // old home, /about, and /about-2 are hidden (underscore-prefixed page
  // files, kept intact for component reuse). Services goes to the
  // standalone partners-wheel page. Founders still 404s (pre-existing,
  // unbuilt). The holding routes do not use this menu at all.
  { href: 'old', label: 'About', image: 'about.png' },
  { href: 'founders', label: 'Founders', image: 'team.png' },
  /* /services now serves the NEW build's services page; the archived
     standalone partners-wheel page moved to /old/services (2026-08-08)
     — this OLD-ROUTES menu keeps pointing at the archive. */
  { href: 'old/services', label: 'Services', image: 'services.jpg' },
];

/** The NEW BUILD's menu items (SiteShell pages — /landing, /work and
 *  every page to come; the old routes above keep menuLinks). Oscar's
 *  rev 2026-08-07: Home / Founders / Services / Work / Contact, split
 *  into two rows in SiteShell (3 + 2, list order). Founders is
 *  UNBUILT (404 — the old menu's pre-existing behaviour, unchanged);
 *  Services is the standalone partners-wheel page; Contact is the
 *  LET'S CHAT mailto (absolute hrefs pass through un-prefixed).
 *  work.jpg is a copy of the /work carousel's first tile (placeholder
 *  imagery — same founder sign-off caveat as everything else).
 * @type {MenuLink[]} */
export const landingMenuLinks = [
  { href: 'landing', label: 'Home', image: 'home.png' },
  { href: 'founders', label: 'Founders', image: 'team.png' },
  { href: 'services', label: 'Services', image: 'services.jpg' },
  { href: 'work', label: 'Work', image: 'work.jpg' },
  { href: 'mailto:hello@networkeffectagency.co.uk', label: 'Contact', image: 'contact.png' },
];

/** @typedef {{ href: string, label: string, external?: boolean }} MenuFooterLink */

/** @type {MenuFooterLink[]} */
export const menuFooterLinks = [
  {
    href: 'https://instagram.com/thenetwork_effect',
    label: 'instagram',
    external: true,
  },
  {
    href: 'mailto:hello@thenetworkeffect.com',
    label: 'hello@thenetworkeffect.com',
  },
  { href: 'privacy', label: 'privacy policy' },
  { href: 'terms', label: 'terms & conditions' },
];
