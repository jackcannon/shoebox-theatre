# Project docs

These docs explain how the project works: the stack, the architecture, every subsystem of the engine in `packages/engine/src`, and the Mossvale demo game in `games/mossvale/src`. They are written for AI agents and developers who are about to change the code.

- How an agent should **behave** in this repo (rules, workflow, style, the docs-update rule) is in [`../AGENTS.md`](../AGENTS.md).
- The user-facing overview, quick start and tutorial-style snippets are in the root [`README.md`](../README.md).

The docs describe the code as it is now. If a doc and the code disagree, the code is right and the doc is a bug. Fix it in the same commit as the change that exposed it.

## Reading order

1. [stack.md](stack.md): languages, libraries, tooling, scripts and config.
2. [architecture.md](architecture.md): layers, lifecycle, the per-frame flow and the public API.
3. [coordinates-and-units.md](coordinates-and-units.md): axes, tiles, footprints and the 16 px rule. Nearly every change depends on this.
4. Then the subsystem docs for the area you are changing.

## Index

Engine docs describe what `packages/engine/src` can do for any game. Game docs describe the Mossvale demo in `games/mossvale/src`: its content and the choices it makes with the engine. Keep them apart. Don't put Mossvale names, maps or art decisions in an engine doc; link to the game doc instead.

### Project and engine

| Doc | Covers |
|---|---|
| [stack.md](stack.md) | Dependencies, versions, yarn scripts, TypeScript/Vite/Vitest/oxlint config, build output, Dokku buildpack facts |
| [architecture.md](architecture.md) | Folder map, dependency rules, `GameRuntime` vs the UI store, startup and map loading, frame order, registries, public API |
| [coordinates-and-units.md](coordinates-and-units.md) | World axes, tile and footprint coordinates, heights, prefab local space, texel density |
| [world.md](world.md) | `TileMap`, tile types and surfaces, `World`, `Character`, movement and collision, NPC AI, interaction, warps, triggers |
| [scripting.md](scripting.md) | `Script`, `ScriptContext`, dialogue and choices, flags, how talking to an NPC works, scripting gotchas |
| [rendering.md](rendering.md) | The R3F scene: canvas, terrain, water, decorations, sprites, lighting, particles, camera, post-processing, wind |
| [assets.md](assets.md) | `AssetManager`, texture sources and options, built-in textures, `PixelCanvas`, the pixel-grid character generator |
| [character-models.md](character-models.md) | `characterModelSheet`: 8-direction sprite sheets rendered from 3D character models, their options and the rendering pipeline |
| [prefabs.md](prefabs.md) | The prefab contract, helpers, built-in prefabs and their props |
| [ui.md](ui.md) | The DOM overlay: UI state, components, CSS and font |
| [testing.md](testing.md) | Unit tests, what each file covers, the dev debug handle, driving the game in a browser |
| [extending.md](extending.md) | Where to add maps, NPCs, tiles, surfaces, textures, decorations, prefabs and UI, and what to update |
| [deployment.md](deployment.md) | Dokku deploys: buildpacks, `GAME`, `heroku-postbuild`, `deploy` targets, `yarn deploy`, the `deployed` tag, new apps |
| [releasing.md](releasing.md) | The `shoeboxtheatre` npm package: build, contents, `exports`, peer dependencies, checks and release steps |
| [known-issues.md](known-issues.md) | Current bugs, limitations, lint warnings and features that don't exist yet |

### Mossvale demo game

| Doc | Covers |
|---|---|
| [game-content.md](../games/mossvale/docs/game-content.md) | Config, characters, maps, links between maps, scripts and flags |
| [game-art-style.md](../games/mossvale/docs/game-art-style.md) | The characters' visual style, the hero's design, and the rules for new characters |

## Which doc to update

Before every commit, match the files you changed against this table and update each listed doc so it stays accurate. Update `README.md` as well when a change affects anything it describes (controls, scripts, public API, extension snippets).

| If you changed... | Check and update |
|---|---|
| `package.json` (root), `.yarnrc.yml`, `nx.json`, `tsconfig.base.json`, `.oxlintrc.json` | stack.md, architecture.md (folder map) |
| `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/vite.config.ts` | stack.md, and testing.md for test config |
| `games/*/package.json`, `games/*/tsconfig.json`, `games/*/vite.config.ts`, `games/*/index.html`, `games/*/public/` | stack.md, and testing.md for test config |
| `tools/*` | stack.md, and releasing.md for `tools/release-version.sh` |
| `packages/engine/README.md`, `packages/engine/tsconfig.lib.json`, `LICENSE` | releasing.md |
| `.buildpacks`, `.dokku.env`, `.static`, `tools/heroku-postbuild.sh`, `tools/deploy.sh`, a game's `deploy` target | deployment.md, README.md (Deployment) |
| `yarn.lock` | stack.md |
| `games/mossvale/src/main.tsx`, `games/mossvale/src/App.tsx`, `packages/engine/src/Shoebox.tsx`, `packages/engine/src/index.ts`, `packages/engine/src/types.ts`, `packages/engine/src/math.ts` | architecture.md, plus the subsystem doc for any type you changed |
| `packages/engine/src/core/GameRuntime.ts` | architecture.md, scripting.md, world.md (interaction, warps, triggers) |
| `packages/engine/src/core/Input.ts` | architecture.md (input), README.md (controls), ui.md if the controls hint text changes |
| `packages/engine/src/core/uiStore.ts`, `packages/engine/src/core/context.ts` | architecture.md, ui.md |
| `packages/engine/src/world/*` | world.md, coordinates-and-units.md if units or axes change |
| `packages/engine/src/scripting/*` | scripting.md |
| `packages/engine/src/render/*` | rendering.md |
| `packages/engine/src/assets/*` | assets.md |
| `packages/engine/src/sprites/*` | character-models.md, and game-art-style.md if the look of rendered characters changes |
| `packages/engine/src/prefabs/*` | prefabs.md |
| `packages/engine/src/ui/*` | ui.md |
| `games/mossvale/src/characterModels.ts`, `games/mossvale/src/characters.ts` | game-art-style.md, game-content.md (Characters) |
| `games/mossvale/src/*` | game-content.md |
| any `*.test.ts` | testing.md (file list and test counts) |
| a bug fixed or found, a limitation added or removed | known-issues.md |
| a new way to extend the engine | extending.md |
| a new doc file | this index and the table above |
