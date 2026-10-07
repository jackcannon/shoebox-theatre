# Releasing the engine to npm

The engine is the public npm package `shoeboxtheatre`, built from `packages/engine`. No version is published yet: `packages/engine/package.json` has version `0.0.0`, and the first release will be `0.1.0`. Games in this monorepo use the engine source through `workspace:^` and never need a release. Games in their own repos install a published version.

## The package

- **Name:** `shoeboxtheatre` (no hyphen). The npm organisation `shoeboxtheatre` holds the `@shoeboxtheatre` scope for later packages. The GitHub repo is `jackcannon/shoebox-theatre` (with a hyphen).
- **Licence:** MIT (`packages/engine/LICENSE`).
- **Contents:** `files` lists `dist`, `README.md` and `LICENSE`. `packages/engine/README.md` is the npm page.
- **Build:** `yarn nx run shoeboxtheatre:build` runs `tsc -p tsconfig.lib.json` into `dist/` (one `.js` and one `.d.ts` file for each source file, tests excluded), then copies `src/ui/ui.css` to `dist/ui/ui.css`.
- **For bundlers only.** The emitted JavaScript keeps its CSS imports (`ui.css` and the `@fontsource/pixelify-sans` CSS) and uses relative imports with no file extension. A bundler such as Vite handles both. Plain Node ESM does not, so `arethetypeswrong` reports failures for the `node10` and `node16` resolutions and passes for `bundler`.
- **`exports`:** `@shoeboxtheatre/source` (the source, used only inside this monorepo), then `types` (`dist/index.d.ts`) and `default` (`dist/index.js`). `src/` is not published, so never turn on the source condition outside this monorepo.
- **`sideEffects`:** `["**/*.css"]`, so bundlers keep the CSS imports.
- **Peer dependencies:** `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/postprocessing` and `postprocessing`, so a game has exactly one copy of each. Dependencies: `zustand` and `@fontsource/pixelify-sans`.
- **Versions:** semver. The public API is everything `packages/engine/src/index.ts` exports. A breaking change to it needs a major version (or a minor version while the version is `0.x`).

## Checks before a release

1. `yarn test && yarn build && yarn lint` on a clean `master`.
2. List the package contents: `yarn workspace shoeboxtheatre pack --dry-run`. Expect only `dist/**`, `README.md`, `LICENSE` and `package.json`.
3. `yarn dlx publint ./packages/engine` reports "All good!".
4. `yarn dlx @arethetypeswrong/cli --pack ./packages/engine` shows a green result for `bundler`.
5. After a change to how the package is built or exported, run a smoke test outside the workspace:
   1. `yarn workspace shoeboxtheatre pack --out <folder>/shoeboxtheatre.tgz`
   2. In that folder, make a small Vite React app with its own empty `yarn.lock` (so yarn treats it as a separate project), and install the `.tgz` file and the peer packages.
   3. Run the quick-start example from `packages/engine/README.md`. Check that it type-checks, renders, and that the location banner has its styles.

## Release steps

1. Bump, commit and tag the version: `yarn release:version <patch|minor|major|x.y.z>`. The script (`tools/release-version.sh`) runs only on a clean `master`. It runs `yarn workspace shoeboxtheatre version`, commits "Release shoeboxtheatre x.y.z", and makes the annotated tag `shoeboxtheatre@x.y.z`.
2. Build: `yarn nx run shoeboxtheatre:build`.
3. Log in to npm, if your session has expired: `yarn npm login --web-login`. It opens npm in the browser, where you sign in with 2FA. A session lasts about 2 hours.
4. Publish: `yarn workspace shoeboxtheatre npm publish`. Add `--otp <code>` if npm asks for a one-time code. `publishConfig.access` is `public`.
5. Push the commit and the tag: `git push origin master --follow-tags`.
6. Write the release notes by hand on GitHub, for the new tag. There is no generated changelog.

`yarn npm publish` replaces `workspace:` ranges in the published `package.json`. The engine has no workspace dependencies, so this matters only if the monorepo later publishes packages that depend on each other.
