#!/usr/bin/env bash
# Bumps the engine version, then commits and tags it. Usage: yarn release:version <patch|minor|major|x.y.z>
set -euo pipefail

bump=${1:?Give patch, minor, major or an exact version}

[ "$(git rev-parse --abbrev-ref HEAD)" = master ] || { echo 'Release from master only.' >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo 'Commit your changes first.' >&2; exit 1; }

yarn workspace shoeboxtheatre version "$bump"
version=$(node -p "require('./packages/engine/package.json').version")

git add packages/engine/package.json
git commit -m "Release shoeboxtheatre $version"
git tag -a "shoeboxtheatre@$version" -m "shoeboxtheatre $version"

echo "Tagged shoeboxtheatre@$version. Next: yarn nx run shoeboxtheatre:build, yarn workspace shoeboxtheatre npm publish, git push origin master --follow-tags"
