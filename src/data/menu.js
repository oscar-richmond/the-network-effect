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
  { href: 'services', label: 'Services', image: 'services.jpg' },
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
