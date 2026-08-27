/**
 * SOCIAL PROFILE LINKS — the ONE shared source (Oscar's contact
 * respec, 2026-08-27): the /contact icon chips and the footer's
 * social entries both read from here, so the eventual URL drop
 * lands everywhere at once.
 *
 * INSTAGRAM: LIVE (Oscar's confirmed URL, 2026-08-27). The /old
 * menu's earlier hardcoded variant (https://instagram.com/
 * thenetwork_effect — no www, no trailing slash) resolved to the
 * same account; the new build's surfaces now read the confirmed
 * form from here.
 *
 * LINKEDIN: STANDING FLAG — placeholder pending Oscar's real
 * profile URL. While an href is empty the consumers render the
 * established inert .is-placeholder treatment (no navigation, no
 * pointer promise); dropping the URL here turns every surface
 * into a real link in one edit.
 */
export const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/thenetwork_effect/' },
  { key: 'linkedin', label: 'Linkedin', href: '' },
];
