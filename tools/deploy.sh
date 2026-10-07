#!/usr/bin/env bash
# Deploys games to Dokku: only the games affected since the last deploy, or all games with --all.
set -euo pipefail

[ "$(git rev-parse --abbrev-ref HEAD)" = master ] || { echo 'Deploy from master only.' >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo 'Commit your changes first.' >&2; exit 1; }

git fetch origin master --tags --force
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] || { echo 'Push master to origin first.' >&2; exit 1; }

if [ "${1:-}" = --all ] || ! git rev-parse -q --verify refs/tags/deployed > /dev/null; then
  yarn nx run-many -t deploy --parallel=2 --output-style=stream
else
  yarn nx affected -t deploy --base=deployed --head=HEAD --parallel=2 --output-style=stream
fi

git tag -f deployed
git push -f origin refs/tags/deployed
