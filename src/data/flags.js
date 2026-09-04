/**
 * BUILD FLAGS — one place, read from the frontmatter of any component.
 *
 * START_PROJECT_MODAL (R41, Oscar 2026-09-04): the site-wide START A
 * PROJECT form modal (R40). ON locally (`astro dev`), OFF in a build —
 * so it can be finished and reviewed on localhost while STAGING keeps
 * the previous, shipped behaviour: the footer chips and the floating
 * case-study chip are live mailtos again, and the /contact and menu
 * CTAs are the styled non-navigating placeholders they were.
 *
 * Override without touching code: PUBLIC_START_PROJECT=1 forces it ON
 * in a build (set it in the Vercel project to show the form on
 * staging), PUBLIC_START_PROJECT=0 forces it OFF anywhere.
 *
 * The /api/start-project function is deployed either way — it is
 * guarded and unreachable from the UI while the flag is off.
 */
const override = import.meta.env.PUBLIC_START_PROJECT;
export const START_PROJECT_MODAL = override === '1' ? true : override === '0' ? false : !!import.meta.env.DEV;

/** The canonical enquiry address — the chips' destination while the modal is off. */
export const START_PROJECT_MAILTO = 'mailto:hello@networkeffectagency.co.uk';
