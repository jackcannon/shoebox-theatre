#!/usr/bin/env bash
# Builds one game for a Dokku buildpack build. The app sets GAME to a folder name in games/.
set -euo pipefail

: "${GAME:?Set it on the app: dokku config:set --no-restart <app> GAME=<game folder>}"

yarn nx run "$GAME:build" --skip-nx-cache
rm -rf dist
cp -R "games/$GAME/dist" dist
