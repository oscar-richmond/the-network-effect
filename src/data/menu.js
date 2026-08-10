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
  /* Contact points at the new /contact page (2026-08-08 — was the
     LET'S CHAT mailto while no page existed). */
  { href: 'contact', label: 'Contact', image: 'contact.png' },
];

/** @typedef {{ href: string, label: string, external?: boolean }} MenuFooterLink */

/* THE ONE CORRECT ADDRESS (Oscar, 2026-08-10): every earlier
   variant — hello@thenetworkeffect.com and
   hello@thenetworkeffect.co.uk — was wrong and is now retired
   site-wide. The holding pages already used this one. */
export const CONTACT_EMAIL = 'hello@networkeffectagency.co.uk';

/** @type {MenuFooterLink[]} */
export const menuFooterLinks = [
  {
    href: 'https://instagram.com/thenetwork_effect',
    label: 'instagram',
    external: true,
  },
  {
    href: `mailto:${CONTACT_EMAIL}`,
    label: CONTACT_EMAIL,
  },
  { href: 'privacy', label: 'privacy policy' },
  { href: 'terms', label: 'terms & conditions' },
];

/* The NEW BUILD's menu footer (Oscar's rev): instagram + the email
   only — privacy policy and terms & conditions are dropped from
   the main menu. The /old routes keep the full set above. */
export const landingMenuFooterLinks = menuFooterLinks.slice(0, 2);
