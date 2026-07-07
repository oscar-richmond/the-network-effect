/** @typedef {{ href: string, label: string, image: string }} MenuLink */

/** @type {MenuLink[]} */
export const menuLinks = [
  { href: 'about', label: 'About', image: 'about.png' },
  { href: 'team', label: 'Team', image: 'team.png' },
  { href: 'contact', label: 'Contact', image: 'contact.png' },
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
