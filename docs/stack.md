# Stack and tooling

A browser game built with Vite, React 19, TypeScript, three.js and react-three-fiber (R3F). There is no backend, network code or persistence. `package.json` is the source of truth for exact versions; the table lists the major versions the code is written against.

## Runtime dependencies

| Package | Version | Used for |
|---|---|---|
| `react`, `react-dom` | 19 | App shell and the DOM UI overlay (`src/engine/ui`) |
| `three` | 0.186 (r186) | Geometry, materials, textures, shaders |
| `@react-three/fiber` | 9 | Declarative three.js scene, `useFrame` game loop (`src/engine/render`) |
| `@react-three/postprocessing` + `postprocessing` | 3 + 6 | Bloom, tilt-shift, hue/saturation, tone mapping, vignette (`render/PostEffects.tsx`) |
| `zustand` | 5 | Vanilla store for UI-only state (`core/uiStore.ts`), read in React with `useStore` |
| `@fontsource/pixelify-sans` | 5 | Pixel font for the overlay, weights 400 and 600, imported in `ui/GameUI.tsx` |

There is no router, CSS framework, state library other than zustand, or R3F helper library (no drei). All art is generated in code, so there are no image, model or audio assets apart from `public/favicon.svg`.

## Dev dependencies

| Package | Version | Used for |
|---|---|---|
| `vite` + `@vitejs/plugin-react` | 8 + 6 | Dev server, HMR, production build |
| `typescript` | 6.0 | Type checking (`tsc -b`). TypeScript 6 enables `strict` by default, so the tsconfigs don't set it |
| `vitest` | 4 | Unit tests in a node environment |
| `oxlint` | 1 | Linting |
| `@types/react`, `@types/react-dom`, `@types/three`, `@types/node` | — | Types |

Node must satisfy Vite 8's engine range: `^20.19.0 || >=22.12.0`. The package manager is yarn 1 (classic) with `yarn.lock`. There is no `package-lock.json`.

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Vite dev server on http://localhost:5173. Exposes `window.__shoebox` (see [testing.md](testing.md)) |
| `yarn test` | `vitest run`: all `src/**/*.test.ts` files once, in node |
| `yarn build` | `tsc -b && vite build`: type-checks both tsconfig projects, then bundles into `dist/` |
| `yarn lint` | `oxlint` over the repo |
| `yarn preview` | Serves `dist/` |

`yarn build` prints a Vite advisory that the single JS chunk is over 500 kB (about 1.31 MB, 363 kB gzipped, mostly three.js and postprocessing). The build still succeeds; see [known-issues.md](known-issues.md).

## Config files

- **`tsconfig.json`**: a solution file that references `tsconfig.app.json` and `tsconfig.node.json`. `tsc -b` builds both.
- **`tsconfig.app.json`** covers `src/`:
  - `target`/`lib` ES2023 plus DOM, `module: esnext`, `moduleResolution: bundler`, `jsx: react-jsx`, `types: ["vite/client"]` (provides `import.meta.env`).
  - `noEmit`, `allowImportingTsExtensions` (so `import App from './App.tsx'` works), `allowArbitraryExtensions`, `skipLibCheck`, `moduleDetection: force`.
  - `verbatimModuleSyntax`: type-only imports must be written `import type { X }` or `import { type X }`.
  - `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties. Use union types, `as const` objects and explicit fields.
  - `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`: unused code fails the build.
- **`tsconfig.node.json`** type-checks `vite.config.ts` only (node types, `module: nodenext`).
- **`vite.config.ts`**: the React plugin plus a Vitest block, `test: { environment: 'node', include: ['src/**/*.test.ts'] }`, typed through `/// <reference types="vitest/config" />`.
- **`.oxlintrc.json`**: the `react`, `typescript` and `oxc` plugins. `react/rules-of-hooks` is an error, and `react/only-export-components` is a warning with `allowConstantExport`.
- **`index.html`**: title "Mossvale — Shoebox Theatre Demo", an inline `html,body,#root{margin:0;height:100%;background:#000}` style, and the `/src/main.tsx` module entry.
- **`.gitignore`**: the Vite scaffold defaults (`node_modules`, `dist`, `*.local`, logs, editor folders). The agent scratch folders `.agent-files/` and `.agent-tmp/` are excluded per machine (in `.git/info/exclude`), not by `.gitignore`.

## Why this stack

- **R3F for the scene, React DOM for the UI.** The 3D world is an R3F `<Canvas>`. Dialogue, choices, banners and the loading screen are ordinary DOM elements over it, which keeps text crisp and CSS-styled.
- **Game state outside React.** A mutable `GameRuntime` class owns the game loop state, and R3F components read it inside `useFrame`. React re-renders only when a map changes or the UI store changes, never per frame. See [architecture.md](architecture.md).
- **Procedural art.** Every texture, sprite sheet and prop is painted or built in code at load time ([assets.md](assets.md)). `AssetManager` also supports URL textures for real art.
- **three r186 specifics.** `PCFSoftShadowMap` was removed in r186, so the canvas uses `shadows="percentage"`. The postprocessing `EffectComposer` forces `gl.toneMapping = NoToneMapping`, so tone mapping happens in the `<ToneMapping>` effect instead of the renderer.
