/** @typedef {{ href: string, label: string, image: string }} MenuLink */

/** @type {MenuLink[]} */
export const menuLinks = [
  // About points at the live about page (/about-3) — the old /about and
  // /about-2 routes are hidden (underscore-prefixed page files, kept
  // intact for component reuse). Services goes to the standalone
  // partners-wheel page. Founders still 404s (pre-existing, unbuilt).
  { href: 'about-3', label: 'About', image: 'about.png' },
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
