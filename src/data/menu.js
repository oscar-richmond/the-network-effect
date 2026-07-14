/** @typedef {{ href: string, label: string, image: string }} MenuLink */

/** @type {MenuLink[]} */
export const menuLinks = [
  { href: 'about', label: 'About', image: 'about.png' },
  { href: 'founders', label: 'Founders', image: 'team.png' },
  // No dedicated "services" menu hover-image exists yet — about.png
  // reused as a neutral placeholder pending real artwork.
  { href: 'services', label: 'Services', image: 'about.png' },
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
