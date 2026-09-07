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

/**
 * HERO_ENTRY (R47, Oscar 2026-09-04): the landing hero's ENTRY
 * ANIMATION — the six-image pile at the centre on a BRAND-RED ground,
 * "BUILT ON TRUST." / "POWERED BY ACCESS." either side of it, the three
 * extra images dropping out and the three hero images sorting into
 * their resting row. Restored from the /about-3 hero (still live at
 * /old).
 *
 * ON under `astro dev`, OFF in every build — so it is visible on
 * localhost only and STAGING renders exactly as it does today (the
 * current splash and card entrance, no red, no pile, no sort).
 *
 * THE SINGLE SWITCH to enable it on staging once approved: set
 * PUBLIC_HERO_ENTRY=1 in the Vercel project (Preview scope) and
 * redeploy. PUBLIC_HERO_ENTRY=0 forces it off anywhere, including dev.
 */
const heroEntryOverride = import.meta.env.PUBLIC_HERO_ENTRY;
export const HERO_ENTRY = heroEntryOverride === '1' ? true : heroEntryOverride === '0' ? false : !!import.meta.env.DEV;

/**
 * HERO_ENTRY_SPLASH (R48, Oscar 2026-09-04): does the BLACK LOGO
 * SPLASH still play in front of the entry animation?
 *
 * OFF by default, so with the entry on the page lands STRAIGHT ONTO
 * the red ground and the image stack — no black cover, no wordmark
 * ripple across it, no logo travel. The splash's code is untouched and
 * fully re-enablable: this only decides whether its VISIBLE sequence
 * runs. TO SWITCH THE BLACK SPLASH BACK ON: set
 * PUBLIC_HERO_ENTRY_SPLASH=1 (a build env var), or flip this default
 * to `true`. It has no meaning unless HERO_ENTRY is also on.
 *
 * NOTE this changes NOTHING in production: HERO_ENTRY is off in every
 * build, and on that path the splash runs exactly as it ships today.
 */
const heroEntrySplashOverride = import.meta.env.PUBLIC_HERO_ENTRY_SPLASH;
export const HERO_ENTRY_SPLASH = heroEntrySplashOverride === '1' ? true : heroEntrySplashOverride === '0' ? false : false;

/**
 * LANDING_SPLASH_B (R49, Oscar 2026-09-04): the alternate splash
 * variant and the /landing-splash-b route that renders it.
 *
 * ON under `astro dev`, OFF in every build — the route is not emitted
 * at all in production, and nothing anywhere links to it. Same
 * mechanism as HERO_ENTRY. Override with PUBLIC_LANDING_SPLASH_B=1 to
 * build it (staging preview once approved), =0 to force it off.
 */
const splashBOverride = import.meta.env.PUBLIC_LANDING_SPLASH_B;
export const LANDING_SPLASH_B = splashBOverride === '1' ? true : splashBOverride === '0' ? false : !!import.meta.env.DEV;

/**
 * ARCHIVE_ROUTES — page-weight batch item 1 (Oscar, 2026-09-04).
 *
 * /old and /old/services are the parked pre-rebuild site. They stay
 * viewable under `astro dev` and are omitted from a production build,
 * where they were dragging their own asset graph into dist. The HOLDING
 * pages are unaffected — they are real deploy targets, still built, and
 * still served on the launch domain by the edge middleware.
 *
 * PUBLIC_ARCHIVE=1 builds them anyway.
 */
export const ARCHIVE_ROUTES = import.meta.env.DEV || import.meta.env.PUBLIC_ARCHIVE === '1';

/**
 * SPLASH_B_ON_ROOT (R75, Oscar 2026-09-05) — serve the ALTERNATE SPLASH
 * on "/" itself, not only at /landing-splash-b.
 *
 * Oscar's overnight ruling was option A: ship splash-B as its own route
 * and leave the home page's shipped splash alone. On review he asked for
 * splash-B to BE the splash — so this supersedes that ruling for
 * staging, and the later instruction wins.
 *
 * OFF everywhere by default, INCLUDING dev, so localhost and any
 * production build keep the shipped splash and /landing-splash-b stays
 * the place to compare the two side by side. stage.sh sets
 * PUBLIC_SPLASH_B_ON_ROOT=1 per deployment, so staging alone serves it.
 *
 * The switch is one prop: LandingBody renders the identical page either
 * way, so nothing about the home page changes except which splash
 * component boots.
 */
export const SPLASH_B_ON_ROOT = import.meta.env.PUBLIC_SPLASH_B_ON_ROOT === '1';

/* THE TYPE SPECIMEN (the foundation task, 2026-09-07) — /type-specimen renders
   every role of the type scale system at the current viewport beside the
   desktop's literals. Dev-only: the route's getStaticPaths returns no path
   unless this is on, so a production build has no such page. Set
   PUBLIC_TYPE_SPECIMEN=1 to carry it to a preview. */
const typeSpecimenOverride = import.meta.env.PUBLIC_TYPE_SPECIMEN;
export const TYPE_SPECIMEN = typeSpecimenOverride === '1' ? true : typeSpecimenOverride === '0' ? false : !!import.meta.env.DEV;
