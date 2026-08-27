/**
 * SOCIAL PROFILE LINKS — the ONE shared source (Oscar's contact
 * respec, 2026-08-27): the /contact icon chips and the footer's
 * social entries both read from here, so the eventual URL drop
 * lands everywhere at once.
 *
 * STANDING FLAG (unchanged from the footer's original comment):
 * placeholder hrefs pending Oscar's real profile URLs. While an
 * href is empty the consumers render the established inert
 * .is-placeholder treatment (no navigation, no pointer promise);
 * a non-empty href turns every surface into a real link in one
 * edit here.
 *
 * NOTE for the drop: the /old shared menu (data/menu.js) already
 * carries a live Instagram URL (https://instagram.com/
 * thenetwork_effect) — confirm it is the right account and seed
 * these from it.
 */
export const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram', href: '' },
  { key: 'linkedin', label: 'Linkedin', href: '' },
];
