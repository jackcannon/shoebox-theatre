# Project docs

These docs explain how the project works: the stack, the architecture, every subsystem of the engine in `src/engine`, and the Mossvale demo game in `src/game`. They are written for AI agents and developers who are about to change the code.

- How an agent should **behave** in this repo (rules, workflow, style, the docs-update rule) is in [`../AGENTS.md`](../AGENTS.md).
- The user-facing overview, quick start and tutorial-style snippets are in the root [`README.md`](../README.md).

The docs describe the code as it is now. If a doc and the code disagree, the code is right and the doc is a bug. Fix it in the same commit as the change that exposed it.

## Reading order

1. [stack.md](stack.md): languages, libraries, tooling, scripts and config.
2. [architecture.md](architecture.md): layers, lifecycle, the per-frame flow and the public API.
3. [coordinates-and-units.md](coordinates-and-units.md): axes, tiles, footprints and the 16 px rule. Nearly every change depends on this.
4. Then the subsystem docs for the area you are changing.

## Index

Engine docs describe what `src/engine` can do for any game. Game docs describe the Mossvale demo in `src/game`: its content and the choices it makes with the engine. Keep them apart. Don't put Mossvale names, maps or art decisions in an engine doc; link to the game doc instead.

### Project and engine

| Doc | Covers |
|---|---|
| [stack.md](stack.md) | Dependencies, versions, yarn scripts, TypeScript/Vite/Vitest/oxlint config, build output, Dokku deployment |
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
| [known-issues.md](known-issues.md) | Current bugs, limitations, lint warnings and features that don't exist yet |

### Mossvale demo game

| Doc | Covers |
|---|---|
| [game-content.md](game-content.md) | Config, characters, maps, links between maps, scripts and flags |
| [game-art-style.md](game-art-style.md) | The characters' visual style, the hero's design, and the rules for new characters |

## Which doc to update

Before every commit, match the files you changed against this table and update each listed doc so it stays accurate. Update `README.md` as well when a change affects anything it describes (controls, scripts, public API, extension snippets).

| If you changed... | Check and update |
|---|---|
| `package.json`, `.yarnrc.yml`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html`, `public/` | stack.md, and testing.md for test config |
| `tools/*` | stack.md |
| `.buildpacks`, `.dokku.env`, `.static`, `yarn.lock` | stack.md (Deployment), README.md (Deployment) |
| `src/main.tsx`, `src/App.tsx`, `src/engine/Shoebox.tsx`, `src/engine/index.ts`, `src/engine/types.ts`, `src/engine/math.ts` | architecture.md, plus the subsystem doc for any type you changed |
| `src/engine/core/GameRuntime.ts` | architecture.md, scripting.md, world.md (interaction, warps, triggers) |
| `src/engine/core/Input.ts` | architecture.md (input), README.md (controls), ui.md if the controls hint text changes |
| `src/engine/core/uiStore.ts`, `src/engine/core/context.ts` | architecture.md, ui.md |
| `src/engine/world/*` | world.md, coordinates-and-units.md if units or axes change |
| `src/engine/scripting/*` | scripting.md |
| `src/engine/render/*` | rendering.md |
| `src/engine/assets/*` | assets.md |
| `src/engine/sprites/*` | character-models.md, and game-art-style.md if the look of rendered characters changes |
| `src/engine/prefabs/*` | prefabs.md |
| `src/engine/ui/*` | ui.md |
| `src/game/characterModels.ts`, `src/game/characters.ts` | game-art-style.md, game-content.md (Characters) |
| `src/game/*` | game-content.md |
| any `*.test.ts` | testing.md (file list and test counts) |
| a bug fixed or found, a limitation added or removed | known-issues.md |
| a new way to extend the engine | extending.md |
| a new doc file | this index and the table above |
