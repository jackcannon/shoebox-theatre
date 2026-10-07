# Stack and tooling

A browser game built with Vite, React 19, TypeScript, three.js and react-three-fiber (R3F). There is no backend, network code or persistence. Each workspace's `package.json` is the source of truth for exact versions; the table lists the major versions the code is written against.

## Runtime dependencies

| Package | Version | Used for |
|---|---|---|
| `react`, `react-dom` | 19 | App shell and the DOM UI overlay (`packages/engine/src/ui`) |
| `three` | 0.186 (r186) | Geometry, materials, textures, shaders |
| `@react-three/fiber` | 9 | Declarative three.js scene, `useFrame` game loop (`packages/engine/src/render`) |
| `@react-three/postprocessing` + `postprocessing` | 3 + 6 | Bloom, tilt-shift, hue/saturation, tone mapping, vignette (`render/PostEffects.tsx`) |
| `zustand` | 5 | Vanilla store for UI-only state (`core/uiStore.ts`), read in React with `useStore` |
| `@fontsource/pixelify-sans` | 5 | Pixel font for the overlay, weights 400 and 600, imported in `ui/GameUI.tsx` |

There is no router, CSS framework, state library other than zustand, or R3F helper library (no drei). All art is generated in code, so the only image asset is `public/favicon.svg`, and there are no model or audio assets.

## Dev dependencies

| Package | Version | Used for |
|---|---|---|
| `vite` + `@vitejs/plugin-react` | 8 + 6 | Dev server, HMR, production build |
| `typescript` | 6.0 | Type checking (`tsc -p tsconfig.json` in each project). TypeScript 6 enables `strict` by default, so the tsconfigs don't set it |
| `vitest` | 4 | Unit tests in a node environment |
| `oxlint` | 1 | Linting |
| `@types/react`, `@types/react-dom`, `@types/three`, `@types/node` | — | Types |

Node must satisfy Vite 8's engine range: `^20.19.0 || >=22.12.0`.

## Package manager

The package manager is yarn 4, pinned in the `packageManager` field of `package.json` (`yarn@4.18.1+sha512...`). Corepack reads that field and runs that exact yarn version, so run `corepack enable` once for each Node version. `yarn.lock` is in the yarn 4 format. There is no `package-lock.json`, and the Dokku build fails if one is added (see [Deployment](#deployment)).

`.yarnrc.yml` holds the yarn settings:

- `enableTelemetry: false`
- `nodeLinker: node-modules`: a normal `node_modules` folder instead of Plug'n'Play, which Vite, Vitest, oxlint and three.js expect.

Yarn 4 defaults that matter here: dependency install scripts do not run (no dependency of this repo has one), an install that must not change the lockfile is `yarn install --immutable`, and `yarn global` does not exist (install global tools with `npm i -g`). Yarn 4 ignores `.npmrc` and `.yarnrc`. Its own files go in `.yarn/`, which `.gitignore` excludes.

## Workspaces and Nx

The repo is a yarn workspace (`"workspaces": ["packages/*", "games/*"]` in the root `package.json`) managed with [Nx](https://nx.dev) (`nx` 23, a root dev dependency):

| Workspace | Folder | What it is |
|---|---|---|
| `shoebox-theatre-workspace` | `/` | The private root: workspaces, root scripts and the shared dev tools (`nx`, `@nx/devkit` for the game generator in `tools/generators`, `oxlint`, `typescript`, `vitest`, `@types/node`) |
| `shoeboxtheatre` | `packages/engine` | The engine package. Dependencies: `zustand`, `@fontsource/pixelify-sans`. Peer dependencies (also dev dependencies, for its own tests and type check): `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`. Dev dependencies: `vite`, `@types/react`, `@types/react-dom`, `@types/three`. |
| `mossvale` | `games/mossvale` | The demo game (private). Dependencies: `"shoeboxtheatre": "workspace:^"` and the engine's peer packages. Dev dependencies: `vite`, `@vitejs/plugin-react` and the same type packages. |

- Each workspace that uses `@react-three/fiber` provides `@types/react` and `@types/three`, and each workspace with a Vite config provides `vite`, because those packages ask for them as peers. Yarn hoists one copy of each package to the root `node_modules`.
- Nx needs no plugins. It turns each workspace's `package.json` `scripts` into targets. `nx.json` sets caching and inputs: `build`, `typecheck` and `test` are cached, and a game's cache depends on the engine source (`^production`), because games use that source directly ([architecture.md](architecture.md#workspaces-and-the-source-condition)).
- Nx Cloud is not used (`neverConnectToCloud` in `nx.json`), and the Nx daemon is not needed. The cache lives in `.nx/`, which `.gitignore` excludes. Yarn 4 does not run the `nx` package's install script, and Nx works without it.

## Scripts

Root scripts (run them from the repo root):

| Command | What it does |
|---|---|
| `yarn dev` | `nx run mossvale:dev`: the Vite dev server for Mossvale on http://localhost:5173. The demo turns on `debug`, so the runtime is `window.__shoebox` (see [testing.md](testing.md)) |
| `yarn test` | `nx run-many -t test`: `vitest run` in every project |
| `yarn build` | `nx run-many -t typecheck build`: `tsc -p tsconfig.json` in every project, then each project's `build`. Mossvale builds into `games/mossvale/dist/`, and the engine into `packages/engine/dist/`. |
| `yarn lint` | `oxlint` over the repo |
| `yarn preview` | `nx run mossvale:preview`: serves `games/mossvale/dist/` |
| `yarn deploy`, `yarn deploy:all` | `tools/deploy.sh`: deploys the affected games, or all games, to Dokku ([deployment.md](deployment.md)) |
| `yarn heroku-postbuild` | `tools/heroku-postbuild.sh`: the Dokku build of the game named by `GAME` ([deployment.md](deployment.md)) |
| `yarn release:version <bump>` | `tools/release-version.sh`: bumps the engine version, commits and tags it ([releasing.md](releasing.md)) |

Project scripts (run one with `yarn nx run <project>:<target>`):

| Project | Targets |
|---|---|
| `shoeboxtheatre` | `build` (`tsc -p tsconfig.lib.json` into `dist/`, then copies `ui.css`), `dev` (the same `tsc` in watch mode, for linking the engine into another repo), `typecheck` (`tsc -p tsconfig.json`), `test` (`vitest run`) |
| `mossvale` | `dev` (`vite`), `build` (`vite build`), `preview` (`vite preview`), `typecheck` (`tsc -p tsconfig.json`), `test` (`vitest run`) |

Mossvale's build prints a Vite advisory that the single JS chunk is over 500 kB (about 1.32 MB, 368 kB gzipped, mostly three.js and postprocessing). The build still succeeds; see [known-issues.md](known-issues.md).

## Config files

- **`tsconfig.base.json`** holds the shared compiler options, which each project's `tsconfig.json` extends:
  - `target`/`lib` ES2023 plus DOM, `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`, `allowArbitraryExtensions`, `skipLibCheck`, `moduleDetection: force`.
  - `customConditions: ["@shoeboxtheatre/source"]`, so type checks resolve `shoeboxtheatre` to the engine source.
  - `verbatimModuleSyntax`: type-only imports must be written `import type { X }` or `import { type X }`.
  - `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties. Use union types, `as const` objects and explicit fields.
  - `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`: unused code fails the type check.
- **`packages/engine/tsconfig.json`** covers `src` and `vite.config.ts`, with `types: ["vite/client"]`. TypeScript 6 checks side-effect imports, and the Vite client types declare the engine's CSS imports.
- **`games/mossvale/tsconfig.json`** covers `src` and `vite.config.ts`, with `types: ["vite/client", "node"]` and `allowImportingTsExtensions` (so `import App from './App.tsx'` works).
- **`packages/engine/tsconfig.lib.json`** extends the engine `tsconfig.json` for the package build: `noEmit: false`, `declaration`, `outDir: dist`, `rootDir: src`, and it excludes `src/**/*.test.ts`.
- **`packages/engine/vite.config.ts`**: only a Vitest block, `test: { environment: 'node', include: ['src/**/*.test.ts'] }`.
- **`games/mossvale/vite.config.ts`**: the React plugin, the `@shoeboxtheatre/source` condition first in `resolve.conditions` and `ssr.resolve.conditions`, and the same Vitest block. Both Vite configs are typed through `/// <reference types="vitest/config" />`.
- **`nx.json`**: named inputs and target defaults (see above).
- **`.oxlintrc.json`**: the `react`, `typescript` and `oxc` plugins. `react/rules-of-hooks` is an error, and `react/only-export-components` is a warning with `allowConstantExport`.
- **`games/mossvale/index.html`**: title "Mossvale: a Shoebox Theatre demo", an inline `html,body,#root{margin:0;height:100%;background:#000}` style, and the `/src/main.tsx` module entry.
- **`.gitignore`**: the Vite scaffold defaults (`node_modules`, `dist`, `*.local`, logs, editor folders), the yarn 4 files and the Nx cache. The agent scratch folders `.agent-files/` and `.agent-tmp/` are excluded per machine (in `.git/info/exclude`), not by `.gitignore`.

## Deployment

Games deploy to Dokku with buildpacks; [deployment.md](deployment.md) describes the whole flow. Facts about the Node buildpack (`jackcannon/heroku-buildpack-node`) that matter for the stack:

- It sees a yarn 4 lockfile (the `__metadata` header), enables corepack, installs the yarn version from `packageManager`, and runs `yarn install --immutable`. It fails if `.yarnrc.yml` is missing.
- It runs the root `heroku-postbuild` script instead of `build` when both exist.
- `package.json` has no `engines` field, so it installs its default Node 22.x line, which satisfies Vite 8 and includes corepack. Node 25 and later do not include corepack, so the build would fail on them.
- It stops with "Multiple lockfiles found" if `yarn.lock` sits next to a `package-lock.json` or `pnpm-lock.yaml`. `npm install` creates a `package-lock.json` and rewrites `yarn.lock`, so install dependencies with yarn only.
- `yarn install --immutable` fails if `yarn.lock` doesn't match the `package.json` files. Commit `yarn.lock` with every dependency change.
- nginx uses the nginx buildpack's default config: an unknown path returns 404, not `index.html`. The games have no client-side routes, so nothing needs that fallback.

## Why this stack

- **R3F for the scene, React DOM for the UI.** The 3D world is an R3F `<Canvas>`. Dialogue, choices, banners and the loading screen are ordinary DOM elements over it, which keeps text crisp and CSS-styled.
- **Game state outside React.** A mutable `GameRuntime` class owns the game loop state, and R3F components read it inside `useFrame`. React re-renders only when a map changes or the UI store changes, never per frame. See [architecture.md](architecture.md).
- **Procedural art.** Every texture, character sprite sheet and prop is painted or built in code at load time ([assets.md](assets.md), [character-models.md](character-models.md)). `AssetManager` also supports URL textures for real art.
- **three r186 specifics.** `PCFSoftShadowMap` was removed in r186, so the canvas uses `shadows="percentage"`. The postprocessing `EffectComposer` forces `gl.toneMapping = NoToneMapping`, so tone mapping happens in the `<ToneMapping>` effect instead of the renderer.
