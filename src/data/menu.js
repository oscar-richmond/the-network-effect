import { SOCIAL_LINKS } from './landing/socials.js';
import { CONTACT_MAILTO } from './landing/contact.js';

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
  /* Repointed to the capitalised file (2026-08-10): Oscar's new menu
     imagery REPLACED lowercase services.jpg, which still resolved on
     the case-insensitive Mac filesystem but would 404 on the
     case-sensitive deploy target. */
  { href: 'old/services', label: 'Services', image: 'Services.jpg' },
];

/** The NEW BUILD's menu items (SiteShell pages — /landing, /work and
 *  every page to come; the old routes above keep menuLinks). Oscar's
 *  rev 2026-08-07: Home / Founders / Services / Work / Contact, split
 *  into two rows in SiteShell (3 + 2, list order). Founders is
 *  UNBUILT (404 — the old menu's pre-existing behaviour, unchanged);
 *  Services is the standalone partners-wheel page; Contact is the
 *  LET'S CHAT mailto (absolute hrefs pass through un-prefixed).
 *
 *  HOVER IMAGERY (Oscar, 2026-08-10): his own selects, supplied as
 *  Home/Founders/Services/Work.jpg. Filenames are CAPITALISED
 *  exactly as delivered — the deploy target is case-sensitive, so
 *  these must not be "tidied" to lowercase. Contact keeps the
 *  existing contact.png. Standard founder/rights sign-off caveat
 *  applies to the imagery itself.
 * @type {MenuLink[]} */
export const landingMenuLinks = [
  /* Home -> the root now (release restructure). linkHref('')
     resolves to base = '/'. */
  /* THE MOBILE PASS (2026-09-07): the desktop nav's order — Work,
     Services, Founders — after Home; Contact leaves the list (the
     menu's LET'S CHAT CTA is that route, as on the desktop nav). */
  { href: '', label: 'Home', image: 'Home.jpg' },
  { href: 'work', label: 'Work', image: 'Work.jpg' },
  { href: 'services', label: 'Services', image: 'Services.jpg' },
  { href: 'founders', label: 'Founders', image: 'Founders.jpg' },
  /* Contact points at the new /contact page (2026-08-08 — was the
     LET'S CHAT mailto while no page existed). */
];

/** @typedef {{ href: string, label: string, external?: boolean }} MenuFooterLink */

/* ═══ CANONICAL (Oscar, FINAL, 2026-08-27) ═══
   hello@networkeffectagency.co.uk is THE TNE address, site-wide.
   Every earlier variant (hello@thenetworkeffect.com, and the
   .co.uk that briefly returned in the 2026-08-24/26 nav+footer
   respecs) is retired. This constant is the single source; the
   API's defaults and every mailto agree with it. Do not restate
   this ruling elsewhere — point here. */
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

/* The NEW BUILD's menu footer (Oscar's rev): Instagram + the email
   only — privacy policy and terms & conditions are dropped from the
   main menu. Spelled out rather than sliced from the list above so
   the capital "I" (Oscar, 2026-08-10) is the NEW BUILD's alone; the
   /old routes keep their lowercase "instagram". */
export const landingMenuFooterLinks = [
  {
    /* Reads the shared source (2026-08-27): the confirmed URL form
       (www + trailing slash) replaces this file's earlier hardcoded
       variant, which pointed at the same account. The /old menu's
       list above keeps its own copy — those routes are frozen. */
    href: SOCIAL_LINKS.find((s) => s.key === 'instagram')?.href || '',
    label: 'Instagram',
    external: true,
  },
  {
    href: CONTACT_MAILTO, /* the site-wide prefilled mailto (the mobile pass) */
    label: CONTACT_EMAIL,
  },
];
