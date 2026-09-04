#!/usr/bin/env bash
#
# Deploy the current working tree to STAGING and point the stable
# client-facing alias at it.
#
#   npm run stage
#
# Why a script rather than a raw `vercel deploy`: this project has NO
# git integration on Vercel — every deploy is a manual CLI push of the
# local tree. A plain preview deploy therefore mints a NEW random URL
# each time, which is useless to hand a client. Aliasing each fresh
# preview deployment to one fixed hostname gives the client a link that
# never changes while the content behind it moves forward.
#
# PRODUCTION IS NEVER TOUCHED HERE. There is no --prod in this file by
# design: production only ever changes via an explicit, deliberate
# `vercel deploy --prod` run by hand, at Oscar's word. See
# docs/ENVIRONMENTS.md.
set -euo pipefail

ALIAS="networkeffect-staging.vercel.app"

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "production" ]; then
  echo "Refusing to stage from the 'production' branch — stage from 'develop'." >&2
  exit 1
fi

# BUILD ENV, per deployment (R72, Oscar 2026-09-04). Vercel builds this
# remotely, so a local `export` never reaches the build — flags that must
# differ on staging have to be passed with the deployment itself.
# --build-env is scoped to THIS deployment: it does not write project
# environment variables, so a later production build is completely
# unaffected by anything set here. That is the whole reason it is used
# rather than `vercel env add`.
#
#   PUBLIC_LANDING_SPLASH_B=1  builds /landing-splash-b as a real route on
#   staging so the alternate splash is reviewable. The main landing page
#   is untouched and keeps its own splash.
STAGE_BUILD_ENV=(--build-env PUBLIC_LANDING_SPLASH_B=1)

# Anything passed after `npm run stage --` is forwarded verbatim.
EXTRA=("$@")

echo "→ Deploying a PREVIEW build (branch: $BRANCH)…"
echo "  build env: ${STAGE_BUILD_ENV[*]}"
# --yes skips the interactive scope/link prompts; the deployment URL is
# the last line of stdout.
DEPLOY_URL="$(vercel deploy --yes "${STAGE_BUILD_ENV[@]}" "${EXTRA[@]}" | tail -1)"

if [ -z "$DEPLOY_URL" ]; then
  echo "No deployment URL returned — aborting before aliasing." >&2
  exit 1
fi

echo "→ Deployed: $DEPLOY_URL"
echo "→ Aliasing to ${ALIAS}…"
vercel alias set "$DEPLOY_URL" "$ALIAS"

echo
echo "STAGING is live: https://$ALIAS"
