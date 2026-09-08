# The Network Effect — design system reference

A record of the type, spacing and colour as they stand in the codebase today. It describes what is there, including where the same role takes several values; it is not an audit and proposes no changes.

**Three zones, two seams.** The seams are written once, in `src/config/breakpoints.js`, and generated into their two mirrors (`src/styles/tokens/breakpoints.css`, `public/scale-shell.html`) by `npm run gen:seams` — see Part 4.2.

| Zone | Widths | What renders |
|---|---|---|
| Shell | 1360 – 1727 | The 1728 composition inside a same-origin iframe, transform-scaled to the viewport. No values of its own. |
| Tablet band | 768 – 1359 | Nothing of its own yet (`tablet.css` is an empty container until Part 4 of the rebuild) |
| Phone | ≤ 767 | The mobile layer, built from the 402 frame, fluid 360 – 430 |

1360 is the type floor: the smallest interactive text is the 14px tier, and 14 × (w ÷ 1728) stays above 11px only from 1358 up, so the shell must not scale below 0.786. 768 is chosen because no iPad is narrower in either orientation and no phone is wider than 430, leaving a 338px gap that no device occupies.

**Which sheets are live.** In cascade-layer order (Part 4.1): the five token sheets; `global.css`, `fonts.css`, `canvas-cursor.css`; `home.css`, `menu.css` and the seven desktop sheets under `src/styles/landing/`; the mobile sheets under `src/styles/mobile/` (twenty after Part 4); `tablet/index.css` and `tokens/tablet.css` (Part 4). The `about-2`, `about-3`, `holding`, `old` and `services/partners.css` trees belong to archived routes and are excluded throughout.

## Part 1 — Typography

Twenty-one roles at 1728. The desktop sheets keep their own literals plus the older five-tier family `--ts-serif-{display,editorial,section,lead,body}` declared at `fonts.css:109`; the table below is a description of the 1728 render, and it is the spec the shells scale. Below the seam the type is a different, smaller set of roles read from `src/styles/tokens/type.css` (Part 5.1).
### The roles

#### Desktop — 1728 (the spec)

| Role | Token | Face | Wt | Size | Line-height | Letter-spacing | Case | Where it is used |
|---|---|---|---|---|---|---|---|---|
| **counter** | `--type-counter-*` | Serrif Condensed | 500 | 400px | 400px · 1 | -0.02em · -8px | none | The splash-B intro counter on `/` (`.splash-b__count`, the count-up to 089). Below the seam it is viewport-relative (25vw) — it is the splash, not page type. |
| **statement** | `--type-statement-*` | Dazzed | 600 | 100px | 88px · 0.88 | -0.04em · -4px | uppercase | The "dline" grammar: the closing statement on `/` and `/services` (`.landing-closing-st__line`), the access dline (`.landing-access__dline`), the `/services` fragment lines (`.sv6-frag__line`), the case-study hero title (`.cs-hero__title`). |
| **display** | `--type-display-*` | Dazzed | 600 | 90px | 79.2px · 0.88 | -0.05em · -4.5px | uppercase | The hero headline's sans line POWERED BY ACCESS. (`.landing-hero__headline-line`), the reel's TO IMPACT (`.landing-sreel__st-line`), the `/services` hero sans (`.sv6-hero__t-sans`), `/contact`'s LET'S START A CONVERSATION (`.ct__intro`), FEATURED on `/work` (`.work-page__hl`), the case study's MORE WORK (`.cs-more__title`), the 404 headline. |
| **display-serif** | `--type-display-serif-*` | Serrif Condensed | 500 | 90px | 82.8px · 0.92 | -0.04em · -3.6px | uppercase | The mixed-face partner of display: the hero headline's serif line BUILT ON TRUST. (`.landing-hero__headline-line--dazzed` — the class names are inverted, noted in landing.css), the reel's FROM ACCESS (`.landing-sreel__st-serif`), the `/services` hero serif (`.sv6-hero__t-serif`), CONVERSATION., WORK. |
| **heading** | `--type-heading-*` | Dazzed | 600 | 56px | 54px · 0.96 | -0.035em · -1.96px | uppercase | The widest-used role (18 narrow selectors): the founders band headline (`.landing-founders__headline`), the network title and subtitle, the reel title row, FEATURED WORK (`.landing-featured__hl`), the closing headline (`.landing-closing__hl`), the footer statement (`.landing-footer__dst-line`), the menu links (`.site-menu__link`), the case-study intro statement (`.cs-intro__statement`), the `/services` pillar names, statements and gallery title, the founders' names (`.fd-slide__staticname`). |
| **heading-serif** | `--type-heading-serif-*` | Serrif Condensed | 500 | 56px | 50px · 0.89 | -0.035em · -1.96px | none | The mixed-face partner of heading: the access word slots — Talent / Brands / Business (`.landing-access__wordslot`), CREATE ACCESS, the footer statement's serif line. |
| **term** | `--type-term-*` | Serrif Condensed | 500 | 48px | 52px · 1.08 | 0 · 0px | none | The network marquee terms and their separators (`.landing-network__body`). |
| **keyword** | `--type-keyword-*` | Dazzed | 600 | 48px | 48px · 1 | 0 · 0px | uppercase | The closing section's keyword tiles on desktop (`.landing-closing__kw-row`, the ≥1360 block in landing.css). **No narrow reader** — below the seam the rebuild routes that row to `title` and its line to `body`. |
| **lede** | `--type-lede-*` | Serrif Condensed | 500 | 36px | 40px · 1.11 | -0.0286em · -1.03px | none | The hero intro (`.landing-hero__intro-text`) and the `/services` hero description (`.sv6-hero__desc`). |
| **title** | `--type-title-*` | Serrif Condensed | 500 | 34px | 38px · 1.12 | -0.03em · -1.02px | none | The wordmark (`.home__logo`), the featured and MORE WORK card titles (`.work-m__title`, `.cs-more__cardtitle`), the drawer title and logo (`.sp-modal__title`, `.sp-modal__logo`), the `/contact` modal logo; on narrow also the closing keyword row. |
| **note** | `--type-note-*` | Serrif Condensed | 500 | 32px | 35.4px · 1.11 | -0.027em · -0.86px | none | The reel's pillars note (`.landing-sreel__note`) and the founders band's portrait names (`.landing-founders__portrait-name`). |
| **subtitle** | `--type-subtitle-*` | Serrif Condensed | 500 | 28px | 32px · 1.14 | -0.03em · -0.84px | none | The pillar subtitles — the reel's two authored lines (`.landing-sreel__desc`) and `/services` (`.sv6-pillar__sub`). |
| **row** | `--type-row-*` | Serrif Condensed | 500 | 26px | 32px · 1.23 | -0.02em · -0.52px | none | The `/services` table rows (`.sv-rows__text`), the founders' relationship rows (`.fd-slide__rel-row`), the `/work` grid names (`.work-gtile__name`), the featured title block, the drawer's text inputs (`.sp-input`). |
| **index** | `--type-index-*` | Dazzed | 600 | 24px | 24px · 1 | 0 · 0px | none | The pillar indices (`.landing-sreel__num`, `.sv6-pillar__num`) and the drawer's step index (`.sp-modal__index`). |
| **tile** | `--type-tile-*` | Dazzed | 600 | 24px | 28px · 1.17 | -0.035em · -0.84px | uppercase | The drawer's pillar tile names (`.sp-tile__name`). |
| **body** | `--type-body-*` | Serrif Condensed | 500 | 21px | 28px · 1.33 | -0.015em · -0.31px | none | The serif body: the case facts (`.cs-facts__para`, `.cs-facts__rowcopy`), the reel's service rows (`.landing-sreel__svc`), the founders' biography (`.fd-slide__bio2`), the `/work` row descriptions (`.work-m__desc`), the drawer's tile descriptions and input placeholders. |
| **body-sans** | `--type-body-sans-*` | Dazzed | 400 | 18px | 27px · 1.5 | 0 · 0px | none | The drawer's Dazzed Regular copy and field labels — the only Dazzed 400 role. **No narrow reader**: the narrow drawer routes its labels to `eyebrow` and its inputs to `row`. |
| **label** | `--type-label-*` | Dazzed | 600 | 16px | 16px · 1 | -0.02em · -0.32px | uppercase | The interface role, 19 narrow selectors: the nav links (`.home__nav-link`), the topbar email, every chip and button (`.landing-svc-card__btn`, `.ne-cta`, `.sp-chip`, `.ct-cta`, `.ct__chat`, `.landing-footer__dchip`), VIEW ALL (`.landing-featured__viewall`), MORE INFO (`.landing-sreel__btn`), the `/work` view toggle, the `/services` table and gallery labels, the case facts row labels, the lightbox CLOSE. |
| **eyebrow** | `--type-eyebrow-*` | Dazzed | 600 | 14px | 16px · 1.14 | 0 · 0px | uppercase | WHO WE ARE (`.landing-founders__label`), WHAT WE DO (`.landing-sreel__wwd`), the access dlabel, the case facts labels (`.cs-facts__label`), the `/contact` label, the founders' role line and relationship label, the drawer's field labels (`.sp-label`). |
| **small** | `--type-small-*` | Serrif Condensed | 500 | 14px | 16px · 1.14 | 0 · 0px | none | The footer's small text — index, address, socials, legal, copyright (`.landing-footer__dlabel`, `__dlink`, `__ritem`), the menu footer links, the drawer's error line, the founders indicator (`.fd-ind__label`). |
| **micro** | `--type-micro-*` | Dazzed | 600 | 13px | 19.5px · 1.5 | 0.02em · 0.26px | none | The skip link and the COPIED tip. The skip link is the one text element on the site that does **not** read a token — it is a 13px literal at `landing.css:5613`. |

#### Below the seam — 2026-09-08

The tablet-band and phone tables that stood here described the exponent-derived system (`gen-type-tokens.mjs`) and the `*-narrow.css` sheets. Both were torn out on 2026-09-08. The phone's type is now the 402 frame's own roles, fixed but for four fluid display roles — see **Part 5.1**; the tablet band renders nothing of its own until Part 4 of the rebuild.
## Part 2 — Spacing

> **2026-09-08.** The "Phone" and "Tablet" columns and every `*-narrow.css` / `mobile.css` citation in this part describe the build that was torn out on this date; they are kept as the record of the desktop values' former counterparts. The phone's values are now the tokens in Part 5; the desktop columns are unchanged and current.

Spacing is the part of the system that is least tokenised on desktop and most tokenised below the seam. The desktop composition is positions and heights carried from the design frames, mostly as literals, with several sections measured at runtime. The narrow build is a token system: one geometry token per role per section, declared at the top of each narrow sheet with a phone value and a band value.

### 2.1 Page margins and content width

| Role | Desktop 1728 | Tablet 768–1359 | Phone ≤767 | Token or literal | Where |
|---|---|---|---|---|---|
| Horizontal page inset | `24px` | `32px` | `24px` | **Literal on desktop** (about 40 separate `left: 24px` / `padding: 0 24px` declarations); **token `--m-margin`** below the seam | `landing.css:953, 985, 1171, 1235, …`; `mobile.css:54`; `tablet.css:66` |
| Safe-area variants | — | `max(--m-margin, --safe-*)` | same | Token `--m-margin-safe-l` / `-r` | `mobile.css:55`; `tablet.css:70` |
| Home-family margins | `--home-margin-x: 24px`, `--home-margin-y: 32px` | `21px` / `28px` at 961–1512 | `max(20px, safe)` ≤440 | Token | `home.css:12`, `:550`, `:630` |
| Max content width | `1680px` (1728 − 2×24) | — | — | Literal, repeated | `landing.css:2421, 2533, 3704, 4726`; `case-study.css:84`; `services-v2.css:242` |
| Hero video inset | `24px` | — | — | Token `--landing-video-margin` — the only desktop inset token | `landing.css:19` |

There is **no** `--page-x`, `--gutter`, `--content-w` or `--grid-*` token. On desktop the 24px inset is a literal written about forty times; below the seam it is a single token with two values.

**The content grid**

| Role | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|
| `/work` grid columns | 12 | 12 | 2 | Literal | `work.css:434`; `work-narrow.css:290`, `:133` |
| `/work` gutter | `8px` (was 24) | `8px` | `8px` | Token `--work-grid-gutter` | `work.css:382`; `work-narrow.css:117` |
| Derived column width | `132.67px` = (1680 − 11×8) ÷ 12 | — | — | Documented in a comment, not authored | `work.css:374` |
| `/work` row gap | `120px` pre-JS, then runtime | `56px` | `40px` | Token `--work-grid-rowgap`, then `--wk-row-gap` | `work.css:390`; `work-narrow.css:31`, `:286` |
| Statement grid | 12 columns, gutter 0 | same | same | Literal | `shared-narrow.css:50`; `landing-narrow.css:1453` |
| Landing two-up | — | `1fr 1fr`, column-gap `16px` | — | Literal | `tablet.css:99` |
| `/work` two-up | — | column-gap `24px`, row-gap `48px` | — | Literal | `tablet.css:123` |

The 12-column grid exists on `/work` only. Everywhere else the composition is absolute positions on desktop and flex or single-purpose grids below the seam.

**Drift.** The drawer's step index sits at `48px`, not the 24 grammar, with a comment saying so (`landing.css:5129`). The services marquee track insets `80px` (`services-v2.css:419`). A legacy footer column inset of `40px` survives at `landing.css:2585` and `:2654` but is hidden on both sides of the seam and can never render.

### 2.2 Section-level rhythm

Desktop and narrow use two different systems, and this is the largest single difference in the whole design system.

**Desktop has no section gaps.** Every landing section is a fixed-height scroll runway with a sticky or fixed stage; adjacency is set by explicit heights and negative `margin-top` overlaps, and several of those heights are measured at runtime.

| Section | Height | Overlap into the previous section | Where |
|---|---|---|---|
| Hero | `100dvh` stage, `300vh` runway pre-JS; runtime `total + vh` | — | `landing.css:695`, `:717`; `landing-hero-scroll.js:1034` |
| Founders | `calc(1049 + 250 + 760)px` | — | `landing.css:911` |
| Outro / reel | `calc(100dvh + 4077px)`; runtime `--sreel-runway` | — | `landing.css:1043`; `landing-services-reel.js:272` |
| Network | `calc(1097 + 900)px` | `-100dvh` | `landing.css:1424`, `:1425` |
| Featured | `calc(100dvh + 2634px)`; runtime `100dvh + runway() + 100` | `-100dvh`, then a runtime margin | `landing.css:2827`; `landing-featured.js:230`, `:343` |
| Access | `calc(1446 + 600 + 3650)px` | Runtime margin | `landing.css:4376`; `landing-access.js:436` |
| Closing | `calc(1060 + 300)px` | `calc(-1 * (50dvh + 300px))` | `landing.css:2045`, `:2041` |
| Footer | `830px` | `-830px` | `landing.css:2354`, `:2390` |

**Narrow has real, tokenised section padding**, one pair of tokens per section, phone value then band value.

| Section | Phone | Tablet | Token | Where |
|---|---|---|---|---|
| Founders | 64 / 64 | 96 / 80 | `--fd-pad-top`, `--fd-pad-bottom` | `landing-narrow.css:351`, `:534` |
| Network | 64 | 96 | `--nw-pad-top` | `landing-narrow.css:599`, `:746` |
| Services reel | 64 | 96 | `--sv-pad-top` | `landing-narrow.css:778`, `:1115` |
| Featured | 64 | 96 | `--fw-pad-top` | `landing-narrow.css:1169`, `:1378` |
| Access | 64 | 96 | `--ac-pad-top` | `landing-narrow.css:1407`, `:1614` |
| Closing | 64 / 64 | 96 / 96 | `--cl-pad-top`, `--cl-pad-bottom` | `landing-narrow.css:1637`, `:1757` |

Page sheets follow the same pattern: `--wk-pad-top` 96/120, `--cs-pad-top` 96/120, `--cs-section-gap` 64/96, `--sv-section-gap` 48/64 against the desktop's 120, `--sv-closing-gap` 64/96, `--ct-top` 96/128, `--fd-block-gap` 96/128.

**Desktop section gaps on the page sheets** are literals and cluster on 120: `/services` pillar, statement, table, gallery and closing gaps are all `margin-top: 120px` (`services-6.css:111, 241, 280, 382, 553`); the case study uses 80 then 100 at ≥1360 and 120 for its dividers (`case-study.css:79, 511, 208`). The one irregular value is `147px` between AMPLIFY and the statement (`services-6.css:245`).

**Label to content.** On desktop the eyebrow and the thing it labels usually share a row rather than stacking: WHO WE ARE and the founders headline are both `top: 200px` (`landing.css:3474`, `:3493`); the access label and its first line are both `top: 100px` (`landing.css:4402`, `:4429`). Below the seam these become tokens: `--nw-subtitle-gap` 24, `--nw-list-gap` 40/56, `--fw-header-gap` 40/48, `--hero-headline-to-intro` 24/32, `--sv-hero-desc-gap` 16/20, `--fd-role-gap` 8/16.

**The 180 class.** Ten desktop places set a ~180 value, and they are not one role.

| What | Value | Where |
|---|---|---|
| Closing red tail, ink to footer reveal | `180px` (was 500) | `landing.css:2333` |
| Case-study intro red bar, no-JS fallback | `180px` base, `204px` desktop, `120px` narrow | `case-study.css:105`, `:519`; `case-study-narrow.css:89` |
| `/work` grid top, pre-JS | `180px` | Token `--work-grid-top`, `work.css:395` |
| WHAT WE DO ink below the section boundary | 180 (via `top: 177px` + 3 cap) | `landing.css:4602` |
| Hero headline right inset | `180px` | `landing.css:3952` |
| Hero headline line-2 lead indent | `180px` (2em at 90) | `landing.css:3981` |
| Hero intro left inset | `180px` | `landing.css:3435` |
| Founders headline right ink inset | 180 (via `left: 596px`) | `landing.css:3499` |
| Reel note left / statement right ink inset | `179px` / `183px` (side-bearing corrections to an ink 180) | `landing.css:4688`, `:4652` |
| Reel exit fade span | `SREEL_EXIT_SPAN_PX = 180` | `landing-services-reel.js:165` |

Siblings in the same class: 160 (services hero overhang, `--st-tail` on the band, `--fd-strip-h` on the phone), 200 (the founders label row; also the 20-space lead atom at 100px type), 220 (`/services` hero to pillar one). There is no 240 vertical value; the only 240 is the founders slot width.

Narrow replaces the closing tail with `--st-tail`, 120 on the phone and 160 on the band (`shared-narrow.css:35`, `:86`).

**Runtime section spacing.** These are measured, not authored: the hero runway, the featured section height and entry margin, the featured header block centring (`ROW_TO_UNIT_GAP_PX = 80`), the access entry margin, the reel runway, the `/work` grid top (`toggleBottom + 120 − headH`) and its per-row margins (name ink to next image = 120), the `/services` dark band bounds and gallery runway, the `/contact` label and carousel tops, and the founders indicator top (`portraitBottom − 32 − indicatorHeight`).

### 2.3 Statement blocks

The clear space above and below every large statement is derived at runtime, not authored. `statement-dwell.js` sets padding-top to `calc(50dvh + topBound/2 − anchor)` and padding-bottom to `calc(50dvh − topBound/2 − rest)`, where the anchor is the statement's measured ink midpoint (`statement-dwell.js:112–117`). The shared hold is `ST_DWELL_HOLD_PX = 300`; the landing closing doubles it to 600 on desktop and takes 400 on narrow, and drops its bottom clearance entirely because the red tail is the clearance (`closing-statement.js:67`, `:132`).

| Role | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|
| Closing stage height | `calc(54 + 727 − 9)px` | — | — | Literal | `landing.css:2296` |
| Closing stage padding | in the stage height | `64px` | `48px` | Token `--st-pad` | `shared-narrow.css:34`, `:85` |
| Closing tail below the ink | `180px` | `160px` | `120px` | Literal / token `--st-tail` | `landing.css:2333`; `shared-narrow.css:35`, `:86` |
| `/services` statement clearance | `120px`, and `147px` after AMPLIFY | `64px` | `48px` | Literal / token `--sv-section-gap` | `services-6.css:241`, `:245`; `services-narrow.css:216` |
| Statement lead indent | `268px` at 48, `313px` at 56 | `5.6em` | `5.6em` | Literal / token `--sv-st-indent` | `case-study.css:96`, `:518`; `services-narrow.css:40` |

**The red bar is a runtime measurement.** `statement-bar.js` writes both `top` and `height` from the statement's rendered ink: it takes the baseline from the line-box top plus half-leading plus `fontBoundingBoxAscent`, then extends up by the first line's `actualBoundingBoxAscent` and down by the last line's `actualBoundingBoxDescent`, re-running on `fonts.ready`, after a 600 ms settle, and on resize (`statement-bar.js:83–135`). It is not a fraction of the type and not a literal in the live state. Only these stay in CSS:

| Property | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|
| Bar width | `10px` | `8px` | `6px` | Literal / token `--sv-bar-w` | `case-study.css:104`; `services-narrow.css:41`, `:536` |
| Bar right edge | `right: 0` | same | same | Literal | `services-6.css:268` |
| Bar colour | `#c1250e` | same | same | Literal, no token | see Part 3 |
| No-JS fallback height | `180px` base, `204px` desktop | — | `120px` | Literal | `case-study.css:105`, `:519`; `case-study-narrow.css:89` |
| Text clearance for the bar | — | `calc(var(--sv-bar-w) + 12px)` | same | Token + literal | `services-narrow.css:221` |

### 2.4 Cards and grids

| Card | Property | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|---|
| Featured | card box | `376 × 653` | `380px` wide | `78vw` | Literal / token `--fw-card-w` | `landing.css:2931`; `landing-narrow.css:1171`, `:1380` |
| Featured | image window | `441px` | — | scale `0.8` | Literal / token `--fw-scale` | `landing.css:2938`; `landing-narrow.css:1172` |
| Featured | **image → title** | `18px` box = optical 24 | `16px` | `16px` | Literal | `landing.css:2959`; `landing-narrow.css:1324` |
| Featured | **title → description** | `8.5px` box = optical 16 | — | — | Literal, written inline in the component | `LandingFeatured.astro:120`, `:156` |
| Featured | title ↔ index | `8px`, index nudged 2 then 4 | — | — | Literal | `landing.css:2989`, `:2995`, `:4081` |
| Featured | gutter | `8px` | `8px` | `8px` | Literal / token `--fw-gap` | `landing.css:2924`; `landing-narrow.css:1173` |
| `/work` grid | gutter | `8px` (was 24) | `8px` | `8px` | Token `--work-grid-gutter` | `work.css:382` |
| `/work` grid | row gap | runtime, ink to image = 120 | `56px` | `40px` | Runtime / token `--wk-row-gap` | `work-grid.js:35`; `work-narrow.css:31` |
| `/work` grid | **image → name** | `16px` | — | — | Literal | `work.css:500` |
| More work | gutter | `8px` | — | — | Literal | `case-study.css:392` |
| More work | card box | `836 × 520` | `44vw` | `78vw` | Literal / token `--cs-card-w` | `case-study.css:398`; `case-study-narrow.css:35` |
| More work | **image → title** | `20.5px` = optical 24 | — | — | Literal | `case-study.css:430` |
| More work | **title → description** | `7.5px` = optical 16 | — | — | Literal | `case-study.css:467` |
| Case rows | row and column gap | `12.27px` | `8px` | `8px` | Literal / token `--cs-row-gap` | `case-study.css:229`; `case-study-narrow.css:30` |
| Access | cell | `640 × 340`, gap `8px` | `44vw` | `78vw` | Literal / token `--ac-cell-w`, `--ac-gap` | `landing.css:4460`; `landing-narrow.css:1408` |
| Closing | tile | `414 × 450`, gap `8px` | `56px` row gap | `40px` row gap | Literal / token `--cl-tiles-gap` | `landing.css:2160`; `landing-narrow.css:1639` |
| Closing | keyword ↔ index | `12px` | `16px` | `16px` | Literal / token `--cl-kw-gap` | `landing.css:2182`; `landing-narrow.css:1640` |
| Network strip | windows | 5 windows, **gap 0**, height `301px` | `20vw` | `62vw` | Literal / token `--nw-strip-w` | `landing.css:1645`; `landing-narrow.css:603` |
| Services pillar | height and gap | `720px`, `margin-top: 120px` | `max(320, 100vw×720/1728)`, gap 64 | `320px`, gap 48 | Literal / tokens `--sv-pillar-h`, `--sv-pillar-gap` | `services-6.css:111`; `services-narrow.css:38` |
| Services rows | pitch | `69px` (sv6), `66px` (v2) | `14px` padding | same | Literal / token `--sv-row-pad` | `services-6.css:296`; `services-narrow.css:42` |
| Services rows | divider | `2px` (sv6), `1px` (v2) | `2px` | `1px` | Literal / token `--sv-divider` | `services-6.css:299`; `services-narrow.css:43` |
| Services gallery | strip gap | `8px` | — | — | Literal | `services-6.css:415` |
| Services gallery | title → strip | `80px` | `48px` | `32px` | Literal / token `--sv-gal-title-gap` | `services-6.css:419`; `services-narrow.css:49` |
| Services gallery | image → label | `40px` | `24px` | `16px` | Literal / token `--sv-gal-label-gap` | `services-6.css:442`; `services-narrow.css:50` |
| Hero cards | gap, stagger | — | `8px`, `64px` | `8px`, `48px` | Token `--hero-card-gap`, `--hero-card-stagger` | `landing-narrow.css:67`, `:72`, `:309` |
| Founders strip | slot, gap | `240 × 204.4`, `8px` | `240px`, `16px` | `188px`, `10px` | Literal / tokens `--fd-slot-w`, `--fd-thumb-gap` | `founders.css:280`; `founders-narrow.css:39`, `:48` |

**The 8px grammar.** The narrow build is clean on it: every spacing value in the seven narrow sheets is 8, 12, 16, 24, 32, 40, 48, 56, 64, 96 or 128, plus viewport-relative widths that have no grammar by construction. The exceptions there are deliberate and few: `--fd-thumb-gap: 10px`, `--fd-thumb-h: 34px`, `--fd-ind-travel: 44px` (thumb plus gap), `--ct-row-gap: 20px`, `--ct-cta-gap: 12px`, `--ct-row-h: 75px`, `--cs-pair-thumb: 130px`, `--cs-pair-h: 232px`, `--sv-frame-w: 100px`, `--sv-frame-h: 136px`, `--sv-row-pad: 14px`, `--hero-logo-row-h: 75px`.

Desktop is where the non-8 values live, and they fall into two named kinds.

*Optical corrections*, where the authored box is offset so the rendered ink lands on the 8-grid: `20.5px` and `7.5px` on the more-work card (optical 24 and 16), `8.5px` on the featured card, `459px` for the featured title block (441 + 24 − 6.1 serif cap), `177px` for the WHAT WE DO eyebrow so its ink lands on 180, `179px` and `183px` for side-bearing corrections to the same ink 180, `26.2px` on the `/services` hero, `6.34px` and `−0.0625em` for the reel index cap solve, and the 2px and 4px index nudges.

*Frame-exact values* carried from the composition: `12.27px` case row gaps, `981.67px` and `552.19px` case row image boxes, `371.56px` and `435.56px` gallery boxes, `204.4px` founders slot, `132.67px` derived `/work` column, `10.472px` and `8.976px` arrow boxes, and the stage heights 1049, 1097, 1446, 1060, 937, 830, 908, 653, 441, 450, 414, 616.

Two spacing literals are neither: `139px`, the pre-footer whitespace, which survives on the case study (`case-study.css:319`) and as a term inside the landing closing stage height, and which `/services` has retired in favour of the 180 tail; and `147px`, the one irregular gap in the `/services` frame.
### 2.5 Buttons and chips

Every chip on the site is border 0 and radius 0. The only strokes are inset shadows — 1px on the drawer's tiles and chips (`landing.css:5251`, `:5349`), 2px on the ghost button (`landing.css:5493`). The only radii are `50%` on the two circular arrows (`case-study.css:348`, `:776`) and `999px` on the skip link (`landing.css:5618`).

| Control | Property | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|---|
| LET'S CHAT (nav) | gap, height | `6px`, no padding, ink ≈21px | `6px` | `6px` | Literal | `landing.css:101`; `shared-narrow.css:401` |
| | icon | `8.976px` | `12px` | `12px`, hidden ≤374 | Literal | `landing.css:213`; `shared-narrow.css:412` |
| Nav links | size, gap | `16/16`, row gap `32px` | token size, gap `32px` | hidden | Literal / token `--type-label-size` | `landing.css:3849`; `shared-narrow.css:444` |
| Burger | box | hidden | hidden | `16 × 12`, 3 bars at 5px pitch | Literal | `mobile.css:310` |
| `.ne-cta` base | gap, size, arrow | `8px`, `16/1`, arrow `12.4` | same | same | Literal | `landing.css:390`, `:407` |
| `.ne-cta--chip` | height, padding | `38px`, `0 16px` | same | same | Literal | `landing.css:414` |
| `.ne-cta--float` | height, padding | `44.35px` derived, `0 24px` | `44px`, `0 16px` | same | Literal | `landing.css:436`; `case-study-narrow.css:306` |
| MORE INFO / menu CTAs | height, padding, gap | `32px`, `0 14px`, `7px` | `44px` rendered, `0 16px` | same, `0 8px` ≤380 | Literal | `landing.css:1355`; `shared-narrow.css:493`; `mobile.css:205` |
| | arrow | `10.5px` | `9px` | `9px` | Literal | `landing.css:1372`; `mobile.css:240` |
| Reel MORE INFO | box | `147 × 38`, `0 16px` | `auto`/min `147`, `38px` | same | Literal | `landing.css:4962`; `landing-narrow.css:1070` |
| VIEW ALL WORK | height, padding, gap | `38px`, `0 16px`, `8px` | `44px` rendered, `0 16px`, `8px` | same | Literal | `landing.css:4213`; `landing-narrow.css:1222` |
| | arrow | `10.5px` | `12px` | `12px` | Literal | `landing.css:2907`; `landing-narrow.css:1248` |
| Founders CTAs | height, padding, gap | `32px`, `0 16px`, `7px`, pair gap `16px` | `38px` + floor, `0 16px` | same | Literal | `landing.css:994`; `landing-narrow.css:423` |
| Footer chip | height, padding, gap | `38px`, `0 16px`, `8px` | same + floor | same | Literal | `landing.css:2478`; `shared-narrow.css:229` |
| `/work` view toggle | height, padding, gap | `38px`, `0 16px`, `6px`, pair gap `12px` | same + floor | same | Literal | `work.css:545`; `work-narrow.css:82` |
| Drawer buttons | height, padding | `44.35px`, `0 32px`, row gap `12px` | `44px`, row margin `32px` | same | Literal | `landing.css:5468`; `shared-narrow.css:648` |
| Drawer tiles | padding, min-height, gap | `20px 24px`, `108px`, grid gap `8px` | `16px`, `96px` | same | Literal | `landing.css:5247`; `shared-narrow.css:590` |
| Drawer chips | height, padding, columns | `38px`, `0 16px`, 4 cols | `44px` floor, 4 cols | `44px` floor, 2 cols | Literal | `landing.css:5343`; `shared-narrow.css:612` |
| Drawer close | box | `40 × 40`, glyph `16` | `44 × 44` | same | Literal | `landing.css:5147`; `shared-narrow.css:556` |
| `/contact` CTA row | height, padding, gap | `48px`, `0 16px`, `8px` | `48px` | same | Literal | `contact.css:601`; `contact-narrow.css:104` |
| `/contact` socials | box, icon | `48 × 48`, icon `24` | same | same | Literal | `contact.css:102` |
| `/contact` LET'S CHAT twin | gap, height | `9.6px`, `18px`, arrow `14.2156` | `8px`, arrow `12px` | hidden ≤1023 | Literal | `contact.css:574`; `contact-narrow.css:352` |
| Lightbox CLOSE | height, padding | `32px`, `0 14px` | `44px`, `0 18px` | same | Literal | `case-study.css:807`; `case-study-narrow.css:324` |
| Lightbox arrows | box | `40 × 40`, radius 50% | hidden | hidden | Literal | `case-study.css:770`; `case-study-narrow.css:334` |
| More-work pager | box | `32 × 32`, radius 50% | hidden | hidden | Literal | `case-study.css:344`; `case-study-narrow.css:241` |
| Skip link | padding, radius, size | `10px 16px`, `999px`, `13px`, ≈36px tall | same | same | Literal | `landing.css:5617` |

#### Where these roles drift

**The label-to-arrow gap takes eight values, and two more states where it is not a gap at all.**

| Value | Where | Band |
|---|---|---|
| `0.25em` ≈ 3px | `.home__menu-toggle-label--close` (`menu.css:275`) | all |
| `6px` | Nav LET'S CHAT (`landing.css:101`, `shared-narrow.css:401`); `/work` view toggle icon-to-label (`work.css:548`, `work-narrow.css:84`) | all |
| `7px` | Founders CTAs (`landing.css:993`); MORE INFO and both menu CTAs (`landing.css:1358`); VIEW ALL base (`landing.css:2892`) | all |
| `8px` | `.ne-cta` family (`landing.css:390`); footer chip (`landing.css:2495`, `shared-narrow.css:225`); footer start and row items (`landing.css:2626`, `:2701`); `/contact` CTA (`landing.css:276`, `contact.css:603`, `contact-narrow.css:107`); VIEW ALL at ≥1360 and below the seam (`landing.css:4217`, `landing-narrow.css:1226`); `/contact` chat twin on the band (`contact-narrow.css:352`) | all |
| `9.6px` | `/contact` LET'S CHAT twin at ≥1360 (`contact.css:574`) | desktop |
| `20px` effective | `.ct-cta__profile` — an 8px gap plus a 12px margin-right on the crop (`landing.css:276` + `:301`) | all |
| `auto` | The reel's MORE INFO declares `gap: 8px` but its arrow takes `margin-left: auto` (`landing.css:4980`), so the rendered distance is `147 − 32 − label − 12` and the 8 never applies | desktop |
| none | The reel's MORE INFO below the seam: `display: inline-flex`, `align-items` and `gap` are declared only inside the `min-width: 1360px` block (`landing.css:4958`), and the narrow rules never restate them, so label and arrow separate on the markup's inline whitespace | tablet, phone |

**Chip height takes eight values for what reads as one role:** 32 (MORE INFO, VIEW ALL base, founders CTAs, lightbox CLOSE), 38 (the chip family, footer chip, reel button, VIEW ALL at ≥1360, `/work` toggle, drawer chips), 40 (drawer close, contact modal close, lightbox arrows), 44 (float CTA and lightbox CLOSE below the seam, drawer buttons), 44.35 (drawer buttons and the float CTA on desktop), 48 (`/contact` CTA and socials), 64 (`.ct-cta` base at `landing.css:263`, which never renders — every page carrying `.ct-cta` also loads `contact.css`, which overrides to 48 in both bands), plus the two circular boxes at 32 and 40.

**Horizontal padding takes seven values:** 8 (MORE INFO ≤380), 14 (MORE INFO base, VIEW ALL base, lightbox CLOSE), 16 (footer chip, reel, `/work` toggle, drawer chips, `/contact` CTA, `.ne-cta--chip`), 18 (lightbox CLOSE below the seam), 24 (float CTA, ghost, drawer tiles), 32 (drawer buttons, `.ct-cta` base), and an 8px left-only on the schedule variant.

**The arrow box takes eleven sizes:** 8.976, 9, 10.472, 10.5, 12, 12.4, 13.1, 14.2156, plus 16×12 on the view toggle, 16×16 on the drawer close and 24×24 on the socials.

#### The 44px touch floor

Three different mechanisms are in use, and they are not interchangeable.

1. **`min-height: 44px`** on MORE INFO and VIEW ALL (`landing.css:6192`), the drawer chips (`shared-narrow.css:613`), the footer links (`shared-narrow.css:215`), the menu footer links (`mobile.css:232`), the wordmark link (`landing.css:6209`) and the `/services` rows (`services-narrow.css:288`); `min-width` too on the drawer close (`shared-narrow.css:559`).
2. **A pseudo-element hit extension.** `inset: -3px 0` takes a 38px chip to 44 tall without widening it — the footer chip, VIEW ALL, the founders CTAs, the reel button, the `/work` toggle. The nav links and the `/contact` chat twin use `−8` horizontal and `−14` vertical instead; the burger uses `−2` vertical and `−14` horizontal.
3. **Padding plus a cancelling negative margin**, 14 and −14, on the burger, the topbar email, the wordmark link and the footer text stops (`mobile.css:253`).

Four things are visible from the CSS alone and worth recording:

- MORE INFO and VIEW ALL carry both `height: 38px` in the narrow sheets and `min-height: 44px` in `landing.css:6194`. The rendered box is 44, not the 38 the narrow comments describe; VIEW ALL, which also has the `::after`, presents a 50px hit box.
- The burger reaches 44 × 44 only by combining two sheets. `mobile.css:253` alone gives 16 × 40; the `::before` at `landing.css:6205` supplies the last 4px and the width.
- The reel's MORE INFO is 38 tall with an `::after` to 44 below the seam, but has no `display: flex`, `align-items` or `gap` in that band, so its label and arrow are not centred.
- The skip link renders about 36px tall with no floor rule. The network terms take `padding: 8px` with a `−8px` margin, adding 16 rather than guaranteeing 44; they clear it only because the type is large.

The two under-44 controls that do not need a floor are the more-work pager (32 × 32) and the lightbox arrows (40 × 40), both `display: none` below the seam.

#### Runtime-placed controls

`--work-toggle-top` and `--work-toggle-left` position the `/work` toggle group (`work-view.js:135`, CSS fallbacks 375 and 318 at `work.css:534`). `--lf-viewall-top` places VIEW ALL (`landing-featured.js:336`, fallback `top: 199px`). `--sp-label-nudge` is read at `landing.css:5481` with a 1px fallback but nothing writes it, so 1px is the effective value.

### 2.6 The footer

Desktop and narrow are two different constructions. On desktop the footer is a fixed 830px box with every child absolutely positioned; below the seam it is a flow layout with padding.

| Role | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|
| Footer height | `830px` | derived from content | derived | Literal / runtime `--footer-h` | `landing.css:2354`; `LandingFooter.astro:191` |
| Footer padding | none — children are positioned | `calc(--nav-h + 32px)` top, `--m-margin` sides, `32px` bottom | same with `--nav-h: 64px` | Literal / token | `shared-narrow.css:324`, `:123` |
| Top row | `left: 24, top: 40, 1680 × 92` | grid `auto auto 1fr auto`, column gap `48px`, margin-bottom `96px` | grid `1fr auto`, column gap `24px`, row gap `32px`, margin-bottom `48px` | Literal | `landing.css:2418`; `shared-narrow.css:328`, `:173` |
| Columns | absolute x: `0 / 1028.32 / 1593.98` | grid columns | grid columns | Literal | `landing.css:2434` |
| Label to link | `gap: 3px` | `margin-bottom: 4px`, group gap 0 | same | Literal | `landing.css:2430`; `shared-narrow.css:186` |
| Link row height | ink only | `min-height: 0`, `padding: 6px 0` | `min-height: 44px` | Literal | `shared-narrow.css:336`, `:215` |
| Chip | `left: 463.66`, `38px`, `0 16px`, gap `8px` | `38px`, `0 16px`, gap `8px`, hit `−3px 0` | same | Literal | `landing.css:2466`; `shared-narrow.css:229` |
| Statement | `left: 24, top: 472, 1542` wide, indent `355px` | `margin: 0 0 48px`, indent `6.3em` | same | Literal | `landing.css:2503`; `shared-narrow.css:261` |
| Legal row | `left: 24, top: 774, 1680 × 16`; items at `0 / 491.66 / 960.32 / 1516.98`, item gap `6px` | `repeat(4, auto)`, space-between | `1fr 1fr`, gap `12px 16px` | Literal | `landing.css:2530`; `shared-narrow.css:338`, `:290` |

**The reveal.** The footer sits behind the page and is uncovered as the page scrolls off it. Both bands use the same three-part schema — a sticky top, a negative margin pulling the footer under the content, and a spacer of the footer's height — but they get the height differently.

| | Desktop | Narrow |
|---|---|---|
| Height source | literal `830px` | `--footer-h`, `Math.round(footer.offsetHeight)` published on the body on `fonts.ready`, resize and load, each followed by a ScrollTrigger refresh, and only when the viewport is narrow (`LandingFooter.astro:191`) |
| Sticky top | `calc(100dvh - 830px)` (`landing.css:2389`) | `max(0px, calc(100svh - var(--footer-h, 600px)))` (`shared-narrow.css:149`) |
| Margin pull | `-830px` (`landing.css:2390`) | `calc(-1 * var(--footer-h, 600px))` (`shared-narrow.css:150`) |
| Spacer | `830px` (`landing.css:2579`) | `var(--footer-h, 600px)` (`shared-narrow.css:159`) |
| Scope | `.landing-v2:not(.work-page):not(.founders-page)` | a body-qualified list at one extra class, needed to out-cascade the desktop rule |

The `max(0px, …)` is the difference that matters: a footer taller than the viewport pins to the top of the screen rather than hiding its own head, which is what the desktop's bottom pin would do. `/work` and `/founders` are excluded from the desktop rule and carry their own; `/work` derives `--work-footer-h` from `footer.offsetHeight || 830` at `work-grid.js:174`.

**The reveal cue is 200px, everywhere, and it is all JavaScript.** On desktop the trigger starts at `top (innerHeight − footerH − 200)px`, because a viewport-percentage start would fire while the footer is still covered. On narrow the trigger moves to the in-flow spacer and becomes `top bottom-=200`, or an IntersectionObserver with `rootMargin: 0px 0px -200px 0px` on `/work`. It appears in eight places: `landing-closing.js:245`, `case-study.js:856`, `contact.js:513`, `services-v2.js:526`, `services-6.js:616`, `work-page.js:118`, `founders-page.js:829`, and is named as a convention at `footer-motion.js:9`.

### 2.7 The nav

| Role | Desktop | Tablet | Phone | Token or literal | Where |
|---|---|---|---|---|---|
| Bar height | `71px` | `71px` | `64px` | **Literal on desktop**, token `--nav-h` below the seam | `landing.css:3804`; `shared-narrow.css:423`, `:357` |
| Side padding | `0 24px` | `--m-margin-safe-*` = 32 | same = 24 | Literal / token | `landing.css:3805`; `shared-narrow.css:363` |
| Position | fixed, `top: 0`, full bleed | same | same | Literal | `landing.css:41` |
| Bar columns | `1fr auto 1fr` | `1fr auto 1fr` | `auto minmax(0,1fr) auto` | Literal | `landing.css:46`; `shared-narrow.css:362` |
| Wordmark | column 1, flush to the inset | column 1 | column 2, after the burger | Literal | `landing.css:3821`; `shared-narrow.css:371` |
| Nav link gap | `32px` | `32px` | links move into the menu | Literal | `landing.css:3839`; `shared-narrow.css:436` |
| Bar column gap | — | `24px` | `12px` | Literal | `shared-narrow.css:427`, `:363` |
| Burger | hidden | hidden | `16 × 12`, optical `top: 4px` | Literal | `landing.css:3812`; `mobile.css:310` |

`--nav-h` does not exist on desktop; every desktop consumer writes 71 as a literal. Below the seam the token exists but its consumers carry fallbacks that disagree with each other: `64px` at `shared-narrow.css:123`, `services-narrow.css:47`, `founders-narrow.css:83`, `:97`, `:127`, `contact-narrow.css:255` and `founders-page.js:927`; `71px` at `shared-narrow.css:324`, `founders-narrow.css:390`, `:395`, `:402` and `contact-narrow.css:341`, `:349`. Where the token resolves this is invisible; where it does not, the two sets disagree by 7px.

There is also a third, older height in play. `.home__topbar` computes `calc(var(--home-margin-y) * 2 + 1.125rem)` at `home.css:111`, which is 82px at the 32 margin, 74 at 28 and about 58 at 20. Every live page overrides it, but `home.css` is imported on every landing-family page, so its 1512 and 440 breakpoints still fire and still reach the menu overlay's padding and the hero headline's margin.

**The menu overlay.** Its wrapper padding is the only place the home margin tokens drive live desktop geometry: `calc(var(--home-margin-y) + 1.333rem) var(--home-margin-x) var(--home-margin-y)`, which resolves to 56/24/32 at 1728 and 49/21/28 between 1360 and 1512 (`menu.css:91`). Rows gap `40px`, items within a row `32px` (`landing.css:588`, `:595`), the CTA pair `16px` (`menu.css:148`). On the phone the container owns every offset — `calc(max(7px, safe-top) + 40px + 24px)` on top, `max(16px, safe)` on the sides (`mobile.css:74`) — and the wrapper's padding is zeroed. Link rows take `margin: 0 15px 24px 0` with a `−7px` inset tap extension, the CONTACT row sits 48px below them, and the CTA row 64px below that (`mobile.css:135`, `:180`, `:208`). The band inherits all of it but hides the burger, so the overlay's phone rules apply to a surface no one can open there.

---

## Part 3 — Colour and other tokens

> **2026-09-08.** The "Phone" and "Tablet" columns and every `*-narrow.css` / `mobile.css` citation in this part describe the build that was torn out on this date; they are kept as the record of the desktop values' former counterparts. The phone's values are now the tokens in Part 5; the desktop columns are unchanged and current.

Fifteen colour custom properties are declared across the live sheets. Nothing else is tokenised: no colour custom property is declared in any component or script, and no colour is written into a custom property by JavaScript.

| Token | Value | Role | Declared at | Reads |
|---|---|---|---|---|
| `--color-bg` | `#ffffff` | Global white ground | `global.css:15` | 1 |
| `--color-fg` | `#121212` | Global ink | `global.css:16` | 1 |
| `--color-muted` | `#9a9a9a` | Global muted grey | `global.css:17` | 4 |
| `--color-page-bg` | `#ffffff` | `/` home ground | `home.css:2` | 2 |
| `--color-ink` | `#121212` | Home body ink | `home.css:3` | 2 |
| `--color-ink-strong` | `#161616` | Home emphatic ink (the near-black) | `home.css:4` | 10 |
| `--color-muted` | `#9a9a9a` | Home muted grey, same value as the global one | `home.css:5` | — |
| `--color-border` | `#f1f3f4` | Home hairline | `home.css:6` | 1 |
| `--landing-ground` | `#eeeef0` | The landing system's ground | `landing.css:16` | 4 |
| `--landing-ink` | `#161616` | Ink on that ground | `landing.css:17` | 7 |
| `--landing-accent-blue` | `#232a89` | Brand blue: footer ground, MORE INFO ink, focus rings | `landing.css:1129` | 17 |
| `--landing-svc-divider` | `#e0e0e7` | Services hairline | `landing.css:1130` | 1 |
| `--landing-svc-btn-fill` | `#e4e4ea` | Services button fill | `landing.css:1131` | 11 |
| `--footer-muted` | `#6c6c6e` | Footer muted grey, corrected | `landing.css:2369` | 8 |
| `--footer-muted` | `#6c6c6e` | The same token restated for the narrow footer | `shared-narrow.css:124` | — |

One token is read but never declared. `--sv-accent` is read five times, always with a literal fallback, and the fallbacks disagree: `#c1250e` at `services-6.css:360` and `services-narrow.css:347`, `#232a89` at `services-v2.css:396`, `:442` and `:445`. Since nothing declares it, the fallback is always what paints.

#### Literal against token, by value

Counts are occurrences, case-insensitive, `#fff` folded into `#ffffff`. "Sheets" is the 22 live stylesheets; "Components and scripts" is the 81 in-scope `.astro` and `.js` files.

| Value | Role | Token | Literals in sheets | In components and scripts | Token reads |
|---|---|---|---|---|---|
| `#161616` | Near-black: ink on the light ground, and the ground of the dark bands | `--landing-ink`, `--color-ink-strong` | 194 | 42 | 17 |
| `#eeeef0` | The landing ground, and the ink on the dark bands | `--landing-ground` | 118 | 23 | 4 |
| `#ffffff` / `#fff` | White ground, and white on the blue footer | `--color-bg`, `--color-page-bg` | 80 | 4 | 3 |
| `#232a89` | Brand blue | `--landing-accent-blue` | 55 | 3 | 17 |
| `#c1250e` | Brand red | none | 39 | 6 | 0 |
| `#e4e4ea` | Services button fill | `--landing-svc-btn-fill` | 18 | 0 | 11 |
| `#e0e0e7` | Services divider | `--landing-svc-divider` | 17 | 0 | 1 |
| `#343439` | Button ground on the dark bands | none | 11 | 0 | 0 |
| `#232326` | Its hover state | none | 6 | 0 | 0 |
| `#6c6c6e` | Footer muted grey, current | `--footer-muted` | 3 | 0 | 8 |
| `#a6a6a8` | Footer muted grey, superseded | none | 3 | 3 | 0 |
| `#121212` | Global and home ink | `--color-fg`, `--color-ink` | 2 | 0 | 3 |
| `#9a9a9a` | Global and home muted grey | `--color-muted` | 2 | 0 | 4 |
| `#2f2f2f` | Rule on the dark bands | none | 3 | 0 | 0 |
| `#8f8f95` | Input placeholder | none | 1 | 0 | 0 |
| `#6b6b70` | Optional-field label | none | 1 | 0 | 0 |
| `#9f9689` | Warm grey, menu list ink | none | 1 | 0 | 0 |
| `#f1f3f4` | Home hairline | `--color-border` | 1 | 0 | 1 |

The `#161616` pair the earlier sweep reported as 141 against 17 is **194 against 17** in the live sheets today, or 236 against 17 counting components and scripts. The 17 token reads are exact and unchanged: seven `var(--landing-ink)` and ten `var(--color-ink-strong)`. 141 is the current total for `#eeeef0` (118 in sheets plus 23 in components and scripts), so the two figures appear to have been crossed. `#161616` concentrates in `landing.css` (74 matching lines), `landing-narrow.css` (19), `contact.css` (16), `case-study.css` (13), `services-narrow.css` (11) and `services-6.css` (11).

#### The grounds and their inks

| Ground | Value | Ink on it | Ink value | Recorded contrast |
|---|---|---|---|---|
| Landing | `#eeeef0` (`--landing-ground`) | Near-black | `#161616` (`--landing-ink`) | 15.6:1, noted at `landing.css:2368` |
| Dark bands (`/contact` head, the AMPLIFY pillar, `/founders`) | `#161616`, literal — no ground-role token exists for it | Off-white | `#eeeef0`, literal | 15.6:1, noted at `contact.css:120` |
| Footer | `#232a89` (`--landing-accent-blue`) | White | `#fff` at `landing.css:2372` | — |
| The red band | `#c1250e`, literal | Near-black | `#161616` | 3.05:1, the WCAG large-text floor, ruled final at `landing.css:2274` because the statement is 100px |
| Home and global | `#ffffff` | `#121212` | — | — |

#### The brand red

`#c1250e`. It is the `/contact` ground (`contact.css:489`) and the closing statement's bar (`landing.css:2277`, with the rationale at `landing.css:2266`, "R16 — THE RED BAND — #C1250E (was #eeeef0)"). Under motion the closing ground is scrubbed from white to red by `closing-statement.js:120`. It is written 39 times in the sheets and 6 times in scripts and components, in two spellings, and **has no token at all**.

#### The muted grey

Both values are in the tree and the correction is documented where it was made.

- **Superseded: `#a6a6a8`.** Still live at `case-study.css:180`, and in three inline `style` attributes at `LandingFooter.astro:32` and `:38`.
- **Current: `#6c6c6e`,** token `--footer-muted`, declared at `landing.css:2369` and restated for narrow at `shared-narrow.css:124`, read 8 times.
- **Where the correction lives:** the comment block at `landing.css:2355–2368`, headed "R50 item 1 — THE FOOTER'S MUTED GREY". It records `#A6A6A8` at 2.10:1 on `#EEEEF0`, `#6C6C6E` at 4.52:1, and a third candidate `#89898B` at 3.01:1 that was rejected.
- `--color-muted: #9a9a9a` is a different token in a different scope, the global and home muted grey. The correction did not touch it.

#### Alpha values

None are tokenised. The recurring ones are `rgba(22,22,22,0.8)` for the lightbox scrim (`landing.css:5080`, `contact.css:157`), `rgba(0,0,0,0.45)` for the menu backdrop (`menu.css:36`), `rgba(238,238,240,0.4)` for the frosted veil (`landing.css:4511`), and zero-alpha forms of the three grounds used as gradient terminals: `rgba(238,238,240,0)` (9), `rgba(22,22,22,0)` (7), `rgba(193,37,14,0)` (6). The access section builds the same veil in JavaScript from `VEIL_RGB = '238,238,240'` and `VEIL_ALPHA = 0.4` at `landing-access.js:103`.

#### Other token families

| Family | Example | Declared at | State |
|---|---|---|---|
| Spacing scale | `--space-2xs` … `--space-3xl`, 8 steps | `global.css:20` | Declared, **read 0 times** anywhere in `src/` |
| Fluid type scale | `--text-xs` … `--text-2xl`, 6 steps | `global.css:31` | Predates the type tokens; **read once** in all of `src/` |
| Serif type scale | `--ts-serif-{display,editorial,section,lead,body}-{size,lh,track}` | `fonts.css:109` | The desktop's own type tokens, 5 tiers, 67 reads |
| Type roles | `--type-<role>-{face,weight,case,size,lh,ls}` | `type-tokens.css` | 21 roles; see Part 1 |
| Safe-area insets | `--safe-top` … `--safe-left` | `global.css:41` | 4 tokens, 14 reads |
| z-index | `--z-shader`, `--z-content` | `global.css:39` | 2 tokens, **read 0 times**; all 131 z-index values in the live sheets are raw numbers |
| Duration | `--network-marquee-top-dur: 48s` | `landing.css:1407` | Scoped to the marquee |
| Easing | `--sp-ease` | `landing.css:5067` | The only easing token; 84 other `cubic-bezier()` values are written inline |
| Font stacks | `--font-sans`, `--font-display`, `--font-serif-cond`, `--font-logo`, `--font-meta` | `global.css:30`, `fonts.css:107`, `home.css:9` | — |
| Radius, shadow, blur | — | — | **No tokens.** 9 `border-radius`, 9 `box-shadow`, 75 `blur()` and 52 `backdrop-filter` values, all literals |
---

## Part 4 — The mobile architecture (rebuild Part 1, 2026-09-08)

The mobile layer was torn out and rebuilt from the 402 frame (Figma `GvANAN3kJOPV8AKOi3O9FF`, frames `1:11` and `1:426`). Everything below the shell floor is now built on five rules. The desktop 1728 composition and the 1360–1727 shells are protected and were proven byte-identical (rect capture at 1728/1512/1470/1440 and 84 viewport screenshots against the `486cdd5` baselines) after each stage.

### 4.1 Cascade layers

Every live stylesheet sits in one of five layers, declared once in `src/styles/tokens/index.css` (the layout's first import) and restated at the head of every sheet so the order holds whatever Vite's bundling does. A later layer wins over an earlier one at any specificity, so the mobile sheets never need `!important` — there is none in the layer.

| Layer | Sheets | Role |
|---|---|---|
| `tokens` | `src/styles/tokens/{colour,type,space,radius,motion}.css` | Every named value. `breakpoints.css` (generated) carries the `@custom-media` seams and is unlayered by nature. |
| `base` | `global.css` (after its `@import`s), `fonts.css`, `canvas-cursor.css`, the two inline `<style>` blocks in `BaseLayout.astro` | Resets, fonts, the layout's own chrome |
| `desktop` | `home.css`, `menu.css`, `landing/{landing,work,case-study,founders,contact,services-6,services-v2}.css` | The 1728 composition — untouched by the rebuild beyond the wrap |
| `mobile` | `mobile/{base,nav,menu,footer,drawer,ground,splash,hero,founders,network,services,featured,access,brands,closing,work,case-study,services-page,contact,founders-page}.css` via `mobile/index.css` | The phone build, `@media (--mobile)` inside `@layer mobile` — the base of everything below the shell floor |
| `tablet` | `tablet/index.css` (+ `tokens/tablet.css` in the tokens layer) | The band between the phone and the shell floor, `@media (--tablet)` inside `@layer tablet` — DERIVED from the mobile layer, so it cascades ABOVE it (Part 4 §2, 2026-09-08: the order became `tokens, base, desktop, mobile, tablet`; `landing/tablet.css` and `mobile/pending.css` are retired) |

A rule of the importer: `@import` lines must come before the `@layer` statement in any file (Vite's CSS importer refuses an `@import` after a layer declaration — `mobile/index.css` served 1,062 bytes until its imports were moved first).

### 4.2 One seam source

`src/config/breakpoints.js` is the only place a seam is written:

| Constant | Value | Meaning |
|---|---|---|
| `DESIGN_WIDTH` | 1728 | The desktop spec |
| `SHELL_MIN_WIDTH` | 1360 | The shell floor; `MOBILE_MAX_WIDTH` = 1359 |
| `TABLET_MIN_WIDTH` | 768 | The tablet floor; `PHONE_MAX_WIDTH` = 767 |
| `PHONE_DESIGN_WIDTH` | 402 | The frame |
| `PHONE_FLUID_MIN` / `MAX` | 360 / 430 | The fluid range |
| `QUERIES` | `{phone, tablet, mobile, desktop}` | The media strings every `matchMedia`, `sizes` and `<source media>` reads |

`npm run gen:seams` (`scripts/gen-breakpoints.mjs`) writes the two mirrors from it: `src/styles/tokens/breakpoints.css` (`@custom-media --phone / --tablet / --mobile / --desktop`, expanded by `postcss-custom-media` — `postcss.config.cjs`) and `public/scale-shell.html` from `src/templates/scale-shell.html`. `src/scripts/landing/viewport.js` re-exports the constants for the drivers; `BaseLayout.astro` receives `MOBILE_MAX_WIDTH` through `define:vars`. `npm run qa:sweep` (`scripts/qa/literal-sweep.mjs`) greps the source for a numeric seam in width context and fails on any hit; it also fails if a generated mirror is stale.

### 4.3 Tokens only

The mobile layer reads `--m-*` and `--type-<role>-*` tokens and nothing else. The literal sweep checks every declaration in `src/styles/mobile/` for a bare length, colour, radius or duration, and resolves every `var()` it reads against the token files — an unknown token fails the sweep. Part 5 lists the tokens.

### 4.4 Scroll mechanics

Every scroll-driven mobile behaviour is a pure function of scroll position: a GSAP `ScrollTrigger` with `scrub: true` inside `gsap.matchMedia().add(QUERIES.mobile, …)` (`src/scripts/mobile/match.js` — `mobileMatch(build)`), which reverts itself on `astro:before-swap` and is rebuilt on `astro:after-swap`. No `IntersectionObserver` drives anything reversible. `src/scripts/mobile/chrome.js` boots the chrome (`nav.js`, `ground.js`) from `SiteShell.astro`, so it runs on every page.

- **The wordmark's scale** (`nav.js`): `font-size` 24 → 18 scrubbed over `--m-nav-shrink-scroll` (120px) from the top, `ease: 'none'`, reversible; the bar is the difference-blend host and the scale animates the wordmark's font-size, never an ancestor.
- **The grounds** (`ground.js`): one fixed page-level layer (`.m-ground`, `z-index: var(--m-z-ground)`) carries the page colour; every ground-bearing section is transparent and declares `data-ground="light|dark|red"`, with `data-ground-fade` where the frame draws a gradient (1:271, 1:279). A fade is a `fromTo` on the layer's `backgroundColor` over `--m-ground-fade-h` (474px) centred on the section's top; a hard edge switches at the section's top crossing the viewport centre. Sampled at every 40px of scroll on `/`: the fades step at most 1 per channel per pixel; nothing but the layer ever paints a ground, so there is no seam to show. The red band's edge (1:372) is wired (`data-ground="red"` on the closing statement) and will read once Part 2 lays that section out.

### 4.5 The component rule

Sections keep their Astro component; where the phone needs different DOM, a `*Mobile.astro` sibling reads the same data source and both are wrapped in `src/components/mobile/DeviceGate.astro`. A static build has no viewport, so the gate is a pre-paint one: each side ships as a `<template>` and a tiny inline script (before first paint, keyed on `MOBILE_MAX_WIDTH`) stamps only the matching side into the document — a phone never parses the desktop-only DOM and vice versa, and no copy is duplicated in source. This is the one honest deviation from "gated at build time".

### 4.6 The harness

`npm run qa:mobile` (`scripts/qa/mobile-stress.mjs`) drives a CDP touch session at a chosen viewport — flicks with momentum, drags, pauses, reversals, seeded — over every route and checks the invariants at each stop: N1 the bar fixed at 0 and `--m-nav-h` tall; N2 the wordmark's size equals the scrub function of scroll and is reversible; N3 the burger centred to the wordmark and at the inset; N4 the blend chain (a difference host with no opacity/transform/filter/will-change between it and the wordmark); F1 the footer static and last; G1–G2 the ground layer only ever one of the three colours or a fade between; X1 no horizontal overflow and no console errors; M1 the menu and the drawer open, trap focus and close on Escape. `mob3/keyboard.mjs` (scratch) walks the drawer by keyboard.

### 4.7 The global chrome at 402

- **Nav** (1:419): the bar 68 tall, fixed, `mix-blend-mode: difference` on the bar itself; wordmark `TheNetworkEffect` at x16, Serrif Condensed −0.03em, 24 → 18; burger 16×12 at x370, three 2px bars, a 44×44 hit area; both centred on y34 at every size. With the menu open the bar lifts to `--m-z-nav-open` so the toggle closes it.
- **Menu**: the working menu on the tokens — Work · Services · Founders at the statement tier on a 45 pitch, LET'S CHAT and START A PROJECT as 179×38 CTAs on `--m-color-fill-dark`, the footer links at the body tier; focus trap intact.
- **Footer** (1:392 + 1:410): static, in flow on every page, 229 below the last band: the statement 370×180 (30/30 with the 104 indent, the tail in the muted grey), the site index on a 30 pitch, the email, the socials, then the legal rows 40 apart. The desktop's reveal (the fixed 830 wrap on `/founders`, the sticky uncover elsewhere) does not apply below the seam.
- **Drawer and modals**: full-screen 402×874, 16px inputs (no iOS zoom), 44px buttons, tiles 88 tall.
- **Pages not yet rebuilt**: `mobile/pending.css` contains the desktop compositions of `/founders` and `/contact` so the footer stays last; Parts 2–3 delete it.

### 4.8 The landing, hero → services (rebuild Part 2, 2026-09-08)

Every section keeps its Astro component. Three mobile siblings render from the same data through DeviceGate — the hero's one image (`HeroImageMobile.astro`, the desktop's three cards and entry stage removed on the phone) and the founders rail (`FoundersRailMobile.astro`, the desktop's three figures removed); the network strip and the services pillars reuse the desktop DOM with mobile sheets (`mobile/{hero,founders,network,services}.css`) and drivers (`scripts/mobile/{hero,founders,network,services,rail}.js`, booted by `scripts/mobile/landing.js` from `LandingBody.astro`). The gate sits after the desktop elements it removes, because it runs as the parser reaches it, and removes its own script, so the desktop DOM reads exactly as before.

| Beat | Mechanism | Numbers at 402×874 (scroll px) |
|---|---|---|
| Hero rise | The headline, intro and logo row are `position: sticky` at their frame tops (180 / 399 / 585); the image is in flow and scrolls 1:1, so it rises over them. Each block dissolves (opacity + `--m-hero-out-blur`) over `--m-hero-text-out-px` (160) ending as the image's top reaches the block's top. | logos out 0 → 112 · intro 138 → 298 · headline 357 → 517 |
| Hero fade | The Part 1 ground layer with an anchored fade (`data-ground-fade-anchor`): it begins when the image's bottom edge crosses `--m-hero-fade-anchor` (700) and runs the frame's 474. 1:271 itself is a static gradient behind the image; the dark band paints its own ground (it is not a transition zone). | fade 417 → 891; safety table: no ink above 0.1 opacity on a ground under 60% luminance |
| Founders rail | A horizontal scroll container, `scroll-snap-type: x proximity` (the third card is wider than the measure), cards 230 / 224.4 / 450 on an 8 gap, the last snapping on its end; 1:54's edge gradients as overlays whose opacity is a ScrollTrigger on the rail (`rail.js`): left rises over the first 20px of scroll, right falls over the last 24. | snap points 0 · 238 · 566 |
| Industry tap | Tap selects (full ink; the rest at `--m-opacity-term-dim`), tap again deselects and the strip returns to the resting set, tap another switches. The strip swaps in the desktop's clip-wipe vocabulary (`--m-wipe-ms` 450, sweep 300, edge blur 6) with an under layer per window. | — |
| Network strip | The same five windows, 272.368 on the 264.117 pitch (an 8 overlap), snap per tile, 1:572's edges as the section's pseudo-elements driven from the rail's scroll. | snap points 0 · 264 · 528 · 791 · 925 |
| Services stack | Each pillar is a sticky opaque panel at `--m-stack-pin-top` + i × `--m-stack-band-h` (68 / 99 / 130). As pillar i+1 approaches, pillar i compacts over `--m-stack-compact-px` (160): title 28 → 14, index 14 → 6, the gap above the title 32 → 8, inside a fixed 55 title box so the layout below never moves. AMPLIFY parks expanded; the stage's tail (80 + the 474 fade zone) is content, so the stack HOLDS through it and releases as Featured Work arrives, AMPLIFY first. | IMMERSE parks 3343 · CONNECT compacts IMMERSE 3885 → 4045 · AMPLIFY compacts CONNECT 4587 → 4747 · hold to 5301 · release cascade 31px apart |
| List rail | The rows as a 4-row column grid (`--m-list-row-h` 19 on an 8 gap, columns 48 apart, the first `--m-list-col-min` 214), snapping per column; the indicator's thumb translates 0 → 68 with the rail's scroll fraction (`--m-ind-x`). | — |

Deviations from the frame, all reported: the industry list runs to 5 lines (135) instead of 4 (108) because the terms are `<button>`s, which cannot break internally, where the frame breaks "Food & / Beverage" — 27px carried through the band; the band headline's 7 lines are 210 against the frame's 206 box (4px); the founders CTA gap is the frame's 12, not the brief's 16; the CTA pair is fluid (half the measure less the gap) so 360 does not overflow; "FROM ACCESS." takes its full stop from a generated `::after` (the data has none); the pillar labels keep the data's trailing colon ("WE BUILD:") which the frame omits; the hero image is cover-fit with the crop's offset (`--m-hero-img-pos`), the frame's 2.4% zoom not reproduced; the strip tiles cover-fit (the repo's 640×800 sources, a little under 3× at 272 wide).

### 4.9 The landing, Featured Work → the footer (rebuild Part 3, 2026-09-08)

Same rules. Four mobile siblings through DeviceGate from two new data files — `data/landing/statements.js` (the We Create Access statement, the Most Brands headline and the closing statement, each as the desktop's authored lines AND the 402 frame's lines with indents; the desktop components render their own list from it, output unchanged) and `data/landing/closing.js` (the tiles and keywords lifted out of LandingClosing) — plus the Featured cards and the access rows on the desktop DOM. Sheets `mobile/{featured,access,brands,closing,splash}.css`, drivers `scripts/mobile/{featured,access,closing}.js`.

| Beat | Mechanism | Numbers at 402×874 |
|---|---|---|
| Services → Featured | The stack's hold is an opaque block after AMPLIFY (`--m-stack-hold`, 300); the section's tail (`::after`, 474) paints 1:279's gradient statically; the band paints its own dark. The page layer, seen only in the strip behind the bar, fades from `--m-fade-anchor-nav` (68 + 474) to 68 on the tail's bottom edge, so it tracks the tail's gradient at the bar's foot. | column sampled every 60px: max 1px step 2 |
| Featured rail | The desktop cards sized per slug (321×200, 340×420, 360×310, 440×400, 400×249), the frame's order, three hidden, titles 24 below, snap per card, the indicator centred (x151) with its thumb on the rail's scroll. | — |
| We Create Access | The rows (360×240 on a 368 pitch, 16 apart) and the word layer are sticky, centred (`--m-access-pin-top`), for `--m-access-runway` (5 × 400); one scrubbed trigger writes the rows' x (top left, bottom right), each cell's `--m-veil` (dead zone 184, the desktop's half pitch) and each word slot's position and opacity (solid within 140, gone at 290). The landed cells sit ±60 from centre (1:89 at x81, 1:75 at x−39). Words 30 Serrif Regular, difference white. The word layer sits after the rows in flex `order` because `order` sets a flex item's paint order. | pairs land at 0 / 400 / … / 2000 |
| Most Brands | Four lines on a 34 pitch (indents 0/15/0/48); the cards 280×280 image, word at +304, line at +340, 288 pitch, snap, edge gradients, the indicator right-aligned 40 below. | — |
| Closing statement | Fourteen 48/45 lines at the frame's indents (four right-aligned; VALUE 32 in). The stage is sticky at `--m-closing-pin-top` (the bar's foot + half the remaining height, 156 at 874) with 600 of runway; the ground layer AND the section (`data-ground-paint`) scrub grey → red from the pin ("pin" anchor, `--m-closing-red-px`); the bar goes solid ink as the fade begins (on the light ground the blend's own result is one step from the solid) and back to the blend as the footer's top crosses its midpoint. The red ends at the section's edge: the footer paints its own ground — a cut, as 1:372 is drawn. | pin 156 · fade 600 · 85 of red below the text after release |
| Splash | The cover splash (dark cover, the hairline loading line, the wordmark centred then gliding onto the bar's) runs below the seam on the tokens; the dev-only hero entry is never armed there (its stage is desktop DOM). Scroll locked while up; readiness gated on the fonts and the hero's image. | cover 402×874 · wordmark lands at 16,22 · done by ~2.6s |

Deviations, all reported: VIEW ALL WORK is absent from the frame and hidden; "Music and Culture" is a /work stub, not a featured card; the Featured titles use the title token (26/28) where the frame gives three cards 26; TOP BOY's face is the condensed serif of the others (the frame sets it in Serrif); the access rows' entrance is scroll-only (no offscreen park); the stack's 300 hold is scroll runway the frame does not draw; the muted grey is now `#6c6c6e` by ruling.

---

### 4.10 The other pages (rebuild Part 4 §1, 2026-09-08) — LAYOUT PENDING DESIGN

No phone frames exist for /work, the case studies, /services, /contact, /founders or the 404. Part 4 applied the GLOBAL LAYER to each — the bar with its scale, the in-flow footer, the ground layer, the type/spacing/colour tokens, the layer architecture — and restyled their current layouts to the tokens, one sheet per page in the mobile layer. Nothing on the site reads as the old system; the layouts themselves wait for designs.

| Page | Sheet | What changed | What waits |
|---|---|---|---|
| /work (grid and list) | `mobile/work.css` | Static stage under the bar; the GRID/ROW toggle at the label tier with 44 hit areas; one FEATURED WORK heading; grid tiles one-up (media at the measure × `--m-page-img-h`, hover image off, names at the title tier); the list as the stage's tiles one-up with the project details beneath; the footer in flow | A designed phone layout |
| /work/[slug] (four) | `mobile/case-study.css` | Title at the statement tier, hero image at the measure; intro at the heading tier with the footer indent; OUR WORK facts (eyebrow / body, hairline rows); the stream one-up (pairs stack); MORE WORK as a snapping rail (the Most Brands card grammar); cursor, float, pager off | A designed phone layout; per-image phone crops |
| /services | `mobile/services-page.css` | Title at the display tiers, lede; per pillar image (`--m-pillar-img-h`), name + index (pillar-title tokens), subtitle; statement at the heading tier; service rows at the row tier with hairlines; gallery as a snapping rail; fragment lines at the statement tier; dark band off (light throughout); footer in flow | A designed phone layout; the dark segments |
| /contact and the 404 | `mobile/contact.css` | Intro at the display tiers (serif line indented); CTAs as the 38 button; socials at 44; WE'VE WORKED WITH over the rolling logo row (the hero row's cells, pitch and roll); photograph at the measure; chat CTA off | A designed phone layout |
| /founders | `mobile/founders-page.css` | Both portraits at the measure; per founder role / name / biography / relationships; the column images as a snapping rail; the pair photograph; the indicator and the sweep choreography off; the footer in flow (Part 1's pending containment is now the page's rule) | A designed phone layout; the portrait wipe |
| The drawer, both modals, the menu | Part 1's sheets | Already on the tokens (Part 1); verified completable by touch and keyboard with the on-screen keyboard simulated (Part 4 gate) | — |

### 4.11 The tablet band (rebuild Part 4 §2, 2026-09-08) — DERIVED, PENDING TABLET DESIGNS

The band (768–1359, both orientations) is the mobile build at tablet proportions, the previous pass's approach: `tokens/tablet.css` overrides the phone's tokens under `@media (--tablet)` inside the tokens layer — the 32 margin (`--m-inset`), the pages' image windows at 560 (`--m-page-img-h`), the pillar images at 300, the rail cards at 360 (`--m-brands-*`, with the keyword offsets and rail height following), the featured cards at 1.25 — and `tablet/index.css` holds the two-up arrangements where the phone is one-up (`--m-two-up-cols`, `--m-two-up-w`): the /work grid and list, the case-study pair rows, the founders portraits, the pillar image beside its text, the contact cluster. The landing hero keeps its fixed flow (its band top is a token). The vertical rhythm and the type tiers are the phone's. The seams at 767/768 and 1359/1360 are clean under continuous resize (shell present/absent, the bar, the inset token, no overflow, no errors) on six routes.

### 4.12 The weight rule (Part 4 §3)

The phone takes each image at (at most) twice its rendered width: `sizes` on the narrow branch is two thirds of the rendered width, so DPR 3 resolves the variant, never the original (hero 780 not 1140; the closing cards and the founders' pair photograph 600 / 780; the strip and featured cards keep their build-time phone branches — the drivers no longer drop the srcset). Desktop-only images the DeviceGate removes below the shell floor carry the 1×1 gate GIF on the narrow branch so they are never fetched there.

---

## Part 5 — The mobile tokens (from the 402 frame)

Fixed unless marked fluid. The four large roles are drawn against the 370 measure (COMMERCIAL at 48 fills it) and scale with `--m-type-fluid = (100vw − 32) / 370`, clamped at 360 and 430; every other size, and every vertical distance, is fixed — the frame's rhythm is a fixed vertical rhythm, and a 16px row does not want to be 14.3 at 360. Rendered at 360 / 390 / 402 / 430 by the gated `/type-specimen/` route (dev only); the computed sizes there match this table.

### 5.1 Type

| Role | Token | Face · weight · case | Size | Leading | Tracking | Fluid | Nodes |
|---|---|---|---|---|---|---|---|
| nav | `--type-nav-*` | Serrif Condensed 500 | 24 → 18 scrolled | 1 | −0.03em | no | 1:420, 1:543 |
| display-serif | `--type-display-serif-*` | Serrif Condensed 500 | 48 (42.55 – 51.63) | 0.9375 | 0 | yes | 1:13, 1:277 |
| display | `--type-display-*` | Dazzed 600 | 48 (42.55 – 51.63) | 0.9375 | −0.03em | yes | 1:14, 1:278 |
| statement | `--type-statement-*` | Dazzed 600 uppercase | 48 (42.55 – 51.63) | 0.9375 | −0.04em | yes | 1:326, 1:373 |
| heading | `--type-heading-*` | Dazzed 600 uppercase | 32 (28.37 – 34.42) | 0.9375 | −0.035em | yes | 1:74, 1:33, 1:321, 1:338 |
| footer-statement | `--type-footer-statement-*` | Dazzed 600 uppercase | 30 | 1 | 0 | no | 1:409 |
| pillar-title | `--type-pillar-title-*` | Dazzed 600 uppercase | 28 (index 14; collapsed 14 / 6) | 1 | −0.02em | no | 1:109, 1:108, 1:436 |
| title | `--type-title-*` | Serrif Condensed 500 | 26 | 28 | 0 | no | 1:113, 1:289, 1:349 |
| term | `--type-term-*` | Serrif Condensed 500 | 24 | 27 | 0 | no | 1:32 |
| lede | `--type-lede-*` | Serrif Condensed 500 | 20 | 24 | −0.015em | no | 1:270 |
| row | `--type-row-*` | Serrif 500 | 16 | 19 (8 gap) | 0 | no | 1:126 |
| body | `--type-body-*` | Serrif 500 | 16 | 18 | 0 | no | 1:350, 1:396, 1:402 |
| small | `--type-small-*` | Serrif 500 | 14 | 16 | 0 | no | 1:413, 1:416, 1:417 |
| eyebrow | `--type-eyebrow-*` | Dazzed 600 uppercase | 12 | 14 | −0.015em | no | 1:55, 1:325, 1:123, 1:56 |
| label | `--type-label-*` | Dazzed 600 uppercase | 12 | 1 | 0 | no | 1:67, 1:72, 1:117 |
| access-label | `--type-access-label-*` | Serrif 400 | 48 / 30 inner | 1 | 0 | no | 1:77, 1:81 |

Faces: `--m-font-serif` Serrif, `--m-font-serif-cond` Serrif Condensed, `--m-font-sans` Dazzed. Three things the frame draws that the build cannot or should not follow, recorded as flags: the footer's muted grey is `#a6a6a8` as drawn where the desktop corrected it to `#6c6c6e`; Serrif Bold is not licensed (the frame uses Medium and Regular only, so nothing is lost); the frame has no splash and no START A PROJECT chip.

### 5.2 Spacing

| Role | Token | Value | Where (nodes) |
|---|---|---|---|
| Page inset | `--m-inset` | 16 | every block at x16, 370 wide (`--m-measure` = 100vw − 32, fluid) |
| Hero top | `--m-hero-top` | 180 | 1:13 |
| Section gap | `--m-space-section` | 229 | 1:277, 1:321, 1:336, 1:339, 1:409 — each 229 below the previous band |
| Page bottom | `--m-page-bottom` | 44 | below 1:417 |
| Scale | `--m-space-1…10` | 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 88 | card gutters (1:215, 1:35, 1:283, 1:343) · CTA pair, label → link (1:64, 1:394) · access rows (1:89) · label → list, image → title (1:123, 1:344) · label → heading (1:55) · heading → CTAs, legal rows (1:74, 1:410) · logos → hero image, heading → cards (1:213, 1:283, 1:343) · WHAT WE DO → statement, footer groups (1:336, 1:393) · terms → strip, pillar pitch, socials → legal (1:32, 1:114, 1:403) · CTAs → founders band (1:57 → 1:34) |
| Nav | `--m-nav-h`, `--m-nav-top`, `--m-burger-w/h/bar`, `--m-burger-x` | 68, 24, 16 × 12 × 2, 370 | 1:420 – 1:424 |
| CTA | `--m-cta-h`, `--m-cta-pad-x`, `--m-cta-gap`, `--m-cta-arrow`, `--m-cta-pair-w` | 38, 16, 6, 9, 179 | 1:65, 1:115 – 1:118, 1:70 |
| Indicator | `--m-indicator-w/h/thumb` | 100 × 1, thumb 32 | 1:121 – 1:122, 1:323 – 1:324, 1:390 – 1:391 |
| Logo row | `--m-logo-row-h`, `--m-logo-cell-w` | 64, 102.4 | 1:213 – 1:216 |
| Hero image | `--m-hero-img-h` | 420 | 1:273 |
| Founders band | `--m-founders-band-h`, `--m-founders-w-1/2/3` | 306; 230 / 224.4 / 466 | 1:34, 1:36, 1:41, 1:48 |
| Network strip | `--m-strip-h`, `--m-strip-cell-w`, `--m-strip-pitch` | 330; 272.368 on a 264.117 pitch | 1:16 – 1:29 |
| Pillars | `--m-pillar-img-h`, `--m-pillar-pitch`, `--m-pillar-title-gap`, `--m-pillar-image-gap`, `--m-divider-h` | 220, 733, 34, 55, 2 | 1:106 – 1:111 |
| Lists | `--m-list-col-gap`, `--m-list-row-h` | 48, 19 | 1:124 |
| Access tiles | `--m-access-tile-w/h`, `--m-access-row-pitch` | 360 × 240, 256 | 1:93, 1:79 |
| Cards | `--m-card-w`, `--m-card-title-gap`, `--m-card-desc-gap`, `--m-featured-title-gap` | 280, 24, 36, 24 | 1:344 – 1:350, 1:284 |
| Bands | `--m-band-dark-h`, `--m-band-featured-h`, `--m-band-red-h`, `--m-ground-fade-h` | 1703, 880, 880, 474 | 1:15, 1:281, 1:372, 1:271 / 1:279 |
| Footer | `--m-footer-indent`, `--m-footer-statement-h`, `--m-footer-index-pitch`, `--m-footer-link-h`, `--m-footer-legal-row-pitch` | 104, 180, 30, 18, 40 | 1:409, 1:393 – 1:396, 1:410 |
| Touch and stacking (house) | `--m-tap-min`, `--m-tap-pad-x/y`, `--m-hairline`, `--m-z-ground/content/nav/menu/nav-open/drawer` | 44, 14 / 16, 1, −1 / 1 / 270 / 500 / 550 / 600 | not drawn |
| Menu and drawer (house) | `--m-menu-top`, `--m-menu-row-pitch`, `--m-menu-gap`, `--m-drawer-*` | nav-h + 64, 45, 64; inset / nav-h / 32 / 24 | not drawn — the current menu and drawer on the tokens |

### 5.3 Colour

| Role | Token | Value | Nodes |
|---|---|---|---|
| Ground | `--m-color-ground` | #eeeef0 | 1:11 |
| Ground, dark | `--m-color-ground-dark` | #161616 | 1:15, 1:281 |
| Ground, red | `--m-color-ground-red` | #c1250e | 1:372 |
| Ink | `--m-color-ink` | #161616 | 1:13, 1:113, 1:396 |
| Ink on dark | `--m-color-ink-on-dark` | #eeeef0 | 1:55, 1:74, 1:289 |
| Ink, bright | `--m-color-ink-bright` | #f9f9f9 | 1:321 |
| White (blend text, burger) | `--m-color-white` | #ffffff | 1:420, 1:422, 1:77, 1:270 |
| Blue | `--m-color-blue` | #232a89 | 1:444, 1:449, 1:391 |
| Muted | `--m-color-muted` | #a6a6a8 as drawn (desktop: #6c6c6e) | 1:395, 1:401, 1:404, 1:409 |
| Fill | `--m-color-fill` | #e4e4ea | 1:442, 1:448 |
| Fill, dark | `--m-color-fill-dark` | #343439 | 1:65, 1:323 |
| Divider | `--m-color-divider` | #e0e0e7 | 1:106, 1:432 |
| Thumb on dark | `--m-color-thumb-on-dark` | #c1250e | 1:324 |
| Logo cell | `--m-color-logo-cell` | rgba(22,22,22,.04) | 1:221 |
| Frost | `--m-color-frost`, `--m-opacity-frost` | rgba(255,255,255,.1) at .6 | 1:85, 1:101 |
| Fade ends | `--m-color-ground-dark-0`, `--m-color-ground-0` | transparent #161616 / #eeeef0 | 1:271, 1:279, 1:54, 1:572; 1:269, 1:140 |
| Strip image | `--m-opacity-strip-image` | .6 | 1:84, 1:99 |
| Arrow on dark | `--m-filter-arrow-on-dark` | brightness(0) invert(1) | more-arrow.svg on the dark fills |

### 5.4 Radius, blur and motion

| Role | Token | Value | Nodes |
|---|---|---|---|
| Corners | `--m-radius-0` | 0 | the frame is square everywhere but the indicators |
| Indicator | `--m-radius-indicator` | 2 | 1:448 – 1:449 |
| Logo cell blur | `--m-blur-logo` | 12 | 1:221 |
| Frost blur | `--m-blur-frost` | 10 | 1:85 |
| Ease | `--m-ease-house` | cubic-bezier(0.22, 0.61, 0.36, 1) | house (`--sp-ease`) |
| Durations | `--m-dur-fast/base/slow` | .2s / .5s / .8s | house |
| Nav shrink range | `--m-nav-shrink-scroll` | 120px of scroll | house (D1's tunable) |
| Ground edge | `--m-ground-edge` | 0 | hard edges switch at the section top |

### 5.5 Part 2's tokens (the landing, hero → services)

| Group | Tokens | Values (402) | Nodes |
|---|---|---|---|
| Hero | `--m-hero-line-h/gap`, `--m-hero-intro-top`, `--m-hero-logos-top/gap`, `--m-hero-img-top`, `--m-hero-band-top`, `--m-hero-img-pos`, `--m-hero-text-out-px`, `--m-hero-fade-anchor` | 90 / 7, 399, 585 / 114, 697, 1167, 22% 13%, 160, 700 | 1:13, 1:14, 1:270, 1:213, 1:272, 1:271, 1:15 |
| Logo row | `--m-logo-pitch`, `--m-logo-scale`, `--m-logo-set-w/row-dur/row-delay` (defaults; data sets them inline), `--m-logo-edge-w` | 110.4, 0.64, 993.6 / 48s / 0, 12 | 1:216 – 1:266, 1:269 |
| Band | `--m-band-label-top`, `--m-band-headline-indent`, `--m-founders-card-1/2/3`, `--m-founders-card-3-lead`, `--m-founders-pos-1/2/3`, `--m-rail-edge-l/r`, `--m-rail-edge-l-op/r-op`, `--m-network-gap`, `--m-strip-tile-w`, `--m-strip-pitch` | 106, 202, 230 / 224.4 / 466, 16, crops, 20 / 24, 0 / 1, 218, 272.368, 264.117 | 1:55, 1:74, 1:36 – 1:52, 1:54, 1:56, 1:17 – 1:31, 1:572 |
| Services | `--m-access-line-h/gap`, `--m-wwd-gap`, `--m-pillar-title-h`, `--m-pillar-index-h/gap`, `--m-pillar-header-h`, `--m-pillar-image-top`, `--m-pillar-desc-w`, `--m-pillar-tail`, `--m-list-rail-gap`, `--m-list-col-min`, `--m-indicator-top`, `--m-ind-x`, `--m-services-tail` | 43 / 4, 148, 23, 11 / 4, 55, 89, 257, 80, 24, 214, 10, 0, 80 + 474 | 1:277, 1:278, 1:325, 1:106 – 1:139, 1:279 |
| Stack | `--m-stack-pin-top`, `--m-stack-band-h`, `--m-stack-band-title-gap/pad`, `--m-stack-title-lh`, `--m-stack-index-lh`, `--m-stack-compact-px` | nav-h (68), 31, 8 / 8, 13, 6, 160 | 1:432 – 1:436, 1:470 – 1:473, 1:506 |
| Type / colour / motion | `--type-term-sep-ws`, `--m-opacity-term-dim`, `--m-wipe-ms`, `--m-wipe-sweep-ms`, `--m-wipe-edge-blur`, `--m-hero-out-blur` | 0.25em, 0.3, 450, 300, 6, 12 | 1:32 (the frame draws no selected state); house |

### 5.6 Part 3's tokens (Featured Work → the footer)

| Group | Tokens | Values (402) | Nodes |
|---|---|---|---|
| Featured | `--m-fw-card-1…5`, `--m-fw-card/w/h`, `--m-fw-rail-h`, `--m-fw-tail`, `--m-fade-anchor-nav`, `--m-stack-hold`, `--m-services-tail` | 321×200 / 340×420 / 360×310 / 440×400 / 400×249, 472, 52, 542, 300, 474 | 1:285 – 1:314, 1:322, 1:279 |
| Access | `--m-access-rows-h`, `--m-access-pin-top`, `--m-access-tile-pitch`, `--m-access-step-px`, `--m-access-runway`, `--m-access-land-offset`, `--m-access-word-w/h`, `--m-access-word-full/window`, `--m-access-veil-dead`, `--m-veil`, `--m-x`, `--m-r` | 496, centred, 368, 400, 2000, 60, 344 × 61, 140 / 290, 184, 1, 0, 0 | 1:89 – 1:102, 1:75 – 1:86, 1:96, 1:81, 1:326 |
| Most Brands | `--m-brands-line-pitch`, `--m-brands-card-w/pitch`, `--m-brands-img-h`, `--m-brands-word-top`, `--m-brands-line-top/w`, `--m-brands-rail-h`, `--m-brands-tail` | 34, 280 / 288, 280, 304, 340 / 220, 394, 100 | 1:338 – 1:371, 1:389 |
| Closing | `--m-closing-st-h`, `--m-closing-st-top/bottom`, `--m-closing-pin-top`, `--m-closing-red-px`, `--m-closing-nav-switch-t` | 630, 165 / 85, nav-h + half the rest, 600, 0 | 1:372, 1:373 |
| Splash / colour | `--m-z-splash`, `--m-color-muted` | 11000, #6c6c6e (ruled) | — |

---

### 5.7 Part 4's tokens

| Group | Tokens | Values | Where |
|---|---|---|---|
| The pages | `--m-page-img-h` | 420 on the phone (the hero's), 560 in the band | `space.css`, `tokens/tablet.css` |
| Two-up | `--m-two-up-w`, `--m-two-up-cols` | half the measure less the 8 gutter; `repeat(2, minmax(0, 1fr))` | `space.css` |
| The band | `--m-inset` 32, `--m-page-img-h` 560, `--m-pillar-img-h` 300, `--m-pillar-desc-w` 360, `--m-brands-card-w/pitch/img-h` 360/368/360, `--m-brands-word-top/line-top/rail-h` 384/420/474, `--m-fw-card-1…5` at 1.25, `--m-fw-rail-h` 577 | overrides under `@media (--tablet)` | `tokens/tablet.css` |

---

## Provenance

Parts 1–3 were read from the source at commit `486cdd5` on `develop` (the pre-rebuild state) and describe the desktop, which the rebuild has not changed. The tablet-band and exponent-derived phone tables that stood in Part 1 were removed on 2026-09-08 with the build they described; Parts 4–5 record the rebuilt mobile foundation from the working tree of that day (Part 1: the architecture and the chrome; Part 2, the same day: the landing from the hero to the services stack — §4.8 and §5.5; Part 3, the same day: Featured Work to the footer and the splash — §4.9 and §5.6), and every mobile value is read from `src/styles/tokens/*.css`.