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

echo "→ Deploying a PREVIEW build (branch: $BRANCH)…"
# --yes skips the interactive scope/link prompts; the deployment URL is
# the last line of stdout.
DEPLOY_URL="$(vercel deploy --yes | tail -1)"

if [ -z "$DEPLOY_URL" ]; then
  echo "No deployment URL returned — aborting before aliasing." >&2
  exit 1
fi

echo "→ Deployed: $DEPLOY_URL"
echo "→ Aliasing to $ALIAS…"
vercel alias set "$DEPLOY_URL" "$ALIAS"

echo
echo "STAGING is live: https://$ALIAS"
