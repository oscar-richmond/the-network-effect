# Environments, branches, and routes

Written at the start of the full-site rebuild phase. The holding page is
live to the public; the full site is being rebuilt from scratch behind
it. This document is the contract for what is allowed to change where.

## The three environments

| | Where | Serves | Who sees it |
|---|---|---|---|
| **LOCAL** | `http://localhost:4321` | the working tree | us |
| **STAGING** | `https://networkeffect-staging.vercel.app` | `develop`, deployed by hand | the client, by link |
| **PRODUCTION** | `https://networkeffect.vercel.app` + `https://networkeffectagency.co.uk` | `production` | the public |

### LOCAL

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.
Never run a dev server any other way — see CLAUDE.md.

### STAGING

```
npm run stage
```

Deploys the current tree as a Vercel **preview** and re-points the fixed
alias `networkeffect-staging.vercel.app` at that deployment. The URL
handed to the client therefore never changes while the content behind it
moves forward.

This project has **no git integration on Vercel** — every deploy is a
manual CLI push of the local tree. That is why the alias exists: a bare
`vercel deploy` mints a new random hostname each time, which is no use
to a client.

Deployment protection must stay **off** for previews, or the client hits
a login wall. Verify in the Vercel dashboard under Settings →
Deployment Protection if a client ever reports being asked to sign in.

### PRODUCTION

Nothing reaches production automatically. There is deliberately no
`--prod` in `scripts/stage.sh`. Production changes only by a hand-run:

```
vercel deploy --prod
```

…from the `production` branch, and only when Oscar has explicitly said
to. During the rebuild phase, production serves **the holding page and
nothing else** — the rebuild is not promoted until launch.

## Branches

| Branch | Purpose |
|---|---|
| `production` | What is (or may be) live. Holding-page fixes only during the rebuild. The only branch that feeds `vercel deploy --prod`. |
| `develop` | All new full-site work. Feeds staging. |
| feature branches | Cut from `develop` for anything experimental; merge back into `develop`. |
| `holding-page` | The branch the holding page was built on. Frozen reference; `production` was cut from its tip. |

Everything is pushed to `origin`
(`github.com/oscar-richmond/the-network-effect`). Nothing lives only on
one machine.

## Routes

| Route | What it is | Status |
|---|---|---|
| `/` | The holding page | **Live** — same design as `/holding-3` |
| `/holding-3` | The holding page, direct link | **Live** — the path the launch domain rewrites to |
| `/holding`, `/holding-2` | Early holding variants | Dormant. Built output must stay byte-identical. |
| `/old` | The archived in-progress full site | Parked for reference during the rebuild |
| `/services` | The services / partners-wheel page | Unchanged, still linked from the menu |
| `/landing` | **The new site, in development** | Staging only. Never promote to root without a decision. |
| `/api/deck-request` | Holding-page deck form → Resend | Live |

### The launch domain

`networkeffectagency.co.uk` (apex + www) is handled by Edge Middleware
(`middleware.js`), which rewrites **every** path to `/holding-3` before
the filesystem is consulted. Only hashed assets, `/assets/*`, `/api/*`,
and the favicons pass through. The main site is reachable only via
`networkeffect.vercel.app`.

This is why `vercel.json` rewrites alone were not enough: those run
*after* the filesystem check, so real files were served before the
rewrite was ever consulted. Middleware runs first. Do not "simplify"
this back into `vercel.json`.

## Production guardrails (installed 2026-08-04, after the outage)

On Aug 4 a `git push` auto-deployed a pre-holding commit to production
via Vercel's git integration (connected since Jul 14, production branch
`cursor/initial-astro-scaffold`) and took the public domain off the
holding page for ~43 minutes. Three guardrails now stand, verified from
evidence, so that can never repeat:

1. **Staged production (the structural gate).** The project's
   `autoAssignCustomDomains` setting is OFF. A production-targeted
   deployment — from the CLI or anywhere else — builds but does NOT
   take the live domains. Going live is a separate, deliberate act:

   ```
   vercel promote <deployment-url>
   ```

   Verified by test: a bare `vercel deploy --prod` was run and all
   three domains (apex, www, networkeffect.vercel.app) stayed on the
   prior deployment; the test build was then deleted.

2. **Git integration disconnected.** Pushing to origin can no longer
   create any deployment, production or preview. If it is ever
   reconnected, staged production (1) still catches it — but don't.

3. **Claude session deny rules** (`.claude/settings.json`): Claude
   cannot run `vercel deploy`, `vercel promote`, `vercel alias`,
   `vercel rollback`, `vercel redeploy`, or `git push` at all —
   deterministically denied, not classifier-judged. Staging goes
   through `npm run stage` only; pushes to origin and production
   promotes are run by a human.

**The standing rule these implement: production releases happen only on
Oscar's explicit word, per action, as a separate deliberate act. An
instruction to deploy is not an instruction to release.**

## Rules during the rebuild

1. The holding page stays live and working throughout. Treat
   `/`, `/holding-3`, `/holding`, `/holding-2`, and `/api/deck-request`
   as frozen unless a change is explicitly about the holding page.
2. New work goes in new files under a new route. Do not build the new
   site on top of `/old`.
3. `/old` and `/services` are reference material. Leave them be.
4. Production promotion is Oscar's call, every time.

## Known, deliberately unaddressed

`/old`, `/services`, and the shared menu still show
`hello@thenetworkeffect.com` — an address on a domain that was
superseded. The correct address is `hello@networkeffectagency.co.uk`
(the holding page and its form use it). This is left alone because those
pages are archived reference; fix it when the new site's contact
details are built, not before.
