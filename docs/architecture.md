# Architecture

The repo has two halves: a reusable engine (`src/engine`) and a demo game that is pure data plus scripts (`src/game`). `src/App.tsx` joins them by rendering `<Shoebox config={gameConfig} />`.

## Folder map

```
index.html                  mounts /src/main.tsx into #root
src/
  main.tsx                  createRoot + <StrictMode><App /></StrictMode>
  App.tsx                   <Shoebox config={gameConfig} />
  engine/
    index.ts                public API; game code imports only from here
    Shoebox.tsx            creates the GameRuntime, renders <GameCanvas> and <GameUI>
    types.ts                every public data type (GameConfig, MapDefinition, TileType, MapObject, ...)
    math.ts                 directions, directionFromVector, seeded RNG, hashTile, damp, wait
    core/
      GameRuntime.ts        composition root: owns assets, input, UI store, flags, world, scripts, warps
      Input.ts              keyboard + gamepad, sampled once per frame
      uiStore.ts            zustand vanilla store with the state the DOM overlay shows
      context.ts            RuntimeContext, useRuntime(), useUI(selector)
    world/                  pure game logic, no three.js or React
      TileMap.ts            parsed ASCII layout: bounds, solidity, heights, edge extension
      World.ts              one loaded map: characters, object grid, movement, NPC AI, interaction
      Character.ts          player/NPC state, walk cycle, moveTo
      collision.ts          moveBox: axis-separated box-vs-tile sweep
      surfaces.ts           DEFAULT_SURFACES and the TILES presets
      terrainGeometry.ts    buildTerrain: merged quads per surface
    scripting/
      ScriptContext.ts      the API scripts receive (types only)
      DialogueController.ts typewriter pages and choice menu
      Flags.ts              key/value story state
    assets/
      AssetManager.ts       texture and sprite-sheet registry, preload, cache
      pixel.ts              PIXELS_PER_UNIT, PixelCanvas, colour helpers, noise, dithering
      builtinTextures.ts    BUILTIN_TEXTURES (terrain, foliage, light textures)
      characterSprites.ts   16x24 pixel-grid parts, generatedCharacter
    sprites/                character sheets rendered from 3D models; no three.js or React
      sdf.ts                signed-distance shapes, view basis, CPU sphere tracer
      model.ts              CharacterModel, body, poses, hair styles, outfits, buildModel
      renderSheet.ts        shading, line art, face, outline, 8-row sheet layout
      characterModelSheet.ts  characterModelSheet: a draw-source SpriteSheetDefinition
    render/                 the R3F scene
      GameCanvas.tsx        <Canvas>, the GameLoop component, MapScene + PostEffects per map
      MapScene.tsx          background, fog, lighting, terrain, water, decorations, prefabs, sprites, particles, camera
      Terrain.tsx, Water.tsx, decorations.tsx, CharacterSprite.tsx, Lighting.tsx, Particles.tsx
      FollowCamera.tsx      eased fixed-angle follow camera
      camera.ts             pure camera maths: defaults, sprite stretch, clamp, north overhang
      PostEffects.tsx       bloom, tilt-shift, grading, tone mapping, vignette
      wind.ts               shared wind uniform + applyWind shader patch
    prefabs/                3D props placed as map objects
      index.ts              DEFAULT_PREFABS
      Building.tsx, outdoor.tsx, furniture.tsx
      parts.tsx             prop, propNumbers, useGenerated, Box
      prefabTextures.ts     canvas painters for facades, roofs, furniture
    ui/                     DOM overlay (GameUI and its parts, ui.css)
  game/
    config.ts               gameConfig
    characterModels.ts      a CharacterModel per character
    characters.ts           characterModelSheet for each model
    maps/                   town, playerHouse1F, playerHouse2F, neighbourHouse, lab, environments
```

Each subsystem has its own doc: [world.md](world.md), [scripting.md](scripting.md), [rendering.md](rendering.md), [assets.md](assets.md), [character-models.md](character-models.md), [prefabs.md](prefabs.md), [ui.md](ui.md). The demo game is described in [game-content.md](game-content.md) and [game-art-style.md](game-art-style.md).

## Dependency rules

These hold today. Keep them.

- **`src/game` imports only from `src/engine` through its index** (`'../engine'` or `'../../engine'`). The one exception is `src/game/maps/maps.test.ts`, which imports `engine/world/World` to check map integrity.
- **The engine never imports from `src/game`.** Everything game-specific arrives through `GameConfig`.
- **`sprites/` imports no external libraries.** From the rest of the engine it imports only `assets/pixel.ts` and the `SpriteSheetDefinition` type, so the model renderer runs in node tests. The DOM is touched only inside the `draw` callback that `characterModelSheet` returns.
- **`world/`, `scripting/`, `math.ts`, `core/Input.ts` and `render/camera.ts` import no external libraries.** They are plain TypeScript and run in node, which is why the world and scripting code is unit-tested there. Don't pull three.js or React into them. The only browser APIs used are in `Input`: the `Window` passed to `attach()` and the key events it delivers, and `navigator.getGamepads`, which is guarded with `typeof navigator`. Constructing an `Input` works in node.
- `types.ts` imports only the `ComponentType` type from React, plus engine types.
- `core/GameRuntime.ts` is the composition root. It is the only module that imports from every other folder.
- `render/`, `prefabs/` and `ui/` reach the runtime through `useRuntime()` or `useUI()` from `core/context.ts`, never through module-level singletons. The one shared module-level value is `windUniforms` in `render/wind.ts`.

## Runtime state vs UI state

There are two stores with a strict split:

- **`GameRuntime`** (`core/GameRuntime.ts`) is a plain mutable class that owns everything outside React:
  - the `config`
  - `assets` (`AssetManager`), `input` (`Input`) and `flags` (`Flags`)
  - the registries `surfaces`, `decorations` and `prefabs`
  - the current `world` (`World | null`)
  - `time`, the seconds since start that every animated material shares
  - private state: the `DialogueController`, the running-script counter, the `transitioning` flag and the banner key

  Positions, facing and animation state live on `Character` objects inside `world`. R3F components read them in `useFrame` and write straight to three.js objects, so nothing re-renders per frame.
- **`runtime.ui`** is a zustand vanilla store (`core/uiStore.ts`) holding only what the DOM overlay needs:

  | Field | Type | Meaning |
  |---|---|---|
  | `worldId` | `number` | Bumped on every map load; the scene is keyed on it and remounts |
  | `dialogue` | `{ speaker?, text, visible, complete } \| null` | Current dialogue page and typewriter progress |
  | `choice` | `{ options, index } \| null` | Open choice menu and cursor |
  | `fade` | `{ opacity, duration }` | Full-screen black overlay; starts at opacity 1 |
  | `banner` | `{ text, key } \| null` | Location banner; a new `key` replays its animation |
  | `loading` | `number \| null` | Preload progress 0..1, or `null` when done |

  React reads it with `useUI(selector)`. Engine code writes it with `runtime.ui.setState(...)`.

Rule of thumb: if the DOM overlay needs it, put it in the UI store. If only the 3D scene or game logic needs it, keep it on the runtime or world and read it in `useFrame`.

## Lifecycle

1. **Mount.** `Shoebox` creates `new GameRuntime(config)` inside `useEffect`, stores it in state and calls `start()`. The cleanup calls `dispose()`. Creating it in the effect means React StrictMode's double mount gets a fresh runtime each time, because a disposed runtime can't restart. The effect depends on `config`, so `config` must be a stable module-level constant. In dev builds the instance is also assigned to `window.__shoebox`.
2. **Construction.** The runtime merges registries: `surfaces = { ...DEFAULT_SURFACES, ...config.surfaces }`, and the same pattern for `decorations` (`DEFAULT_DECORATIONS`) and `prefabs` (`DEFAULT_PREFABS`). It registers `BUILTIN_TEXTURES` overlaid with `config.textures`, then one sprite sheet per `config.characters` entry. It also creates the `DialogueController`. A config entry with an existing id replaces the built-in.
3. **`start()`:**
   1. attaches input to `window`
   2. sets `loading: 0` and preloads every texture, reporting progress to the store
   3. sets `loading: null`
   4. loads `config.start`
   5. waits 120 ms, then fades in from black over 600 ms

   If `dispose()` ran during the preload, start stops there.
4. **Map load (`loadMap`).** Builds a new `World(def, config.player, target)`, bumps `worldId` and shows the banner if `showBanner !== false` and the map's `name` differs from the previous map's. An unknown map id throws.
5. **Warp (`warp(to)`).** Ignored while a transition is running. Otherwise it sets `transitioning`, fades to black (280 ms), loads the map, waits 80 ms and fades back in (280 ms).
6. **`dispose()`.** Marks the runtime disposed, detaches input and disposes every cached texture.

`playerFree` is `true` only when no script is running and no transition is in progress. It gates player movement, interaction and tile events.

## One frame

Everything runs inside R3F `useFrame` callbacks. Lower priority numbers run first. Any callback with a positive priority takes over rendering, and the postprocessing `EffectComposer` registers one at priority 1.

1. **`GameLoop`** (`render/GameCanvas.tsx`, priority −2) clamps `delta` to 1/20 s, calls `runtime.update(dt)`, then copies `runtime.time` into `windUniforms.uWindTime`. `runtime.update(dt)` then does, in order:
   1. `time += dt`
   2. `input.update()` turns key and pad presses since the last frame into this frame's `wasPressed` edges
   3. `dialogue.update(dt)` advances the typewriter, moves the choice cursor, resolves waiting pages and choices, and processes a pending close
   4. `world.update(dt, control)` moves every character. `control` is the input axis plus the run button when `playerFree`, otherwise `null`. Scripted walks and NPC AI still run while the player is locked.
   5. If `playerFree`: a confirm press runs an interaction and ends the update. Otherwise it checks the player's tile for a warp, then for triggers. See [world.md](world.md).
2. **`FollowCamera`** (priority −1) eases the look-at point after the player, clamped to the rendered area, and places the camera at the map's pitch and distance.
3. **Priority 0 callbacks**, in mount order: `CharacterSprite` copies position and picks the sprite frame, `PostEffects` moves the tilt-shift focus line to the player's screen height, and animated materials (water, lights, prefabs, flower frames, particles) read `runtime.time`.
4. **`EffectComposer`** (priority 1) renders the scene and then the effect chain ([rendering.md](rendering.md)).

## Input

`core/Input.ts` maps `KeyboardEvent.code` (not `key`) to actions: `up`, `down`, `left`, `right`, `confirm`, `cancel` and `run`.

| Action | Keys | Gamepad (standard mapping) |
|---|---|---|
| Move | Arrow keys, WASD | Left stick (deadzone 0.25), d-pad buttons 12–15 |
| `confirm` | Space, Enter, Z, E | Button 0 |
| `cancel` | Escape, X, Backspace | Button 1 |
| `run` (hold) | Left/right Shift | Button 2 |

- `isDown(action)` is level-triggered. `wasPressed(action)` is true only on the frame the action was pressed; key repeats don't count.
- `axis()` returns `{ x, z }` with x east and z south, clamped to length 1.
- Keys pressed while an `<input>` or `<textarea>` has focus are ignored. Bound keys call `preventDefault`. Window blur clears all held keys.
- There is no touch input.

## Registries and extension points

Everything content-specific comes in through `GameConfig` (`types.ts`):

| Field | Type | Merged with |
|---|---|---|
| `title` | `string` | — (loading screen) |
| `start` | `WarpTarget` | — |
| `player` | `{ sprite, walkSpeed?, runSpeed? }` | — (speeds default 3.6 and 6.2 tiles/s) |
| `maps` | `Record<string, MapDefinition>` | — |
| `characters` | `Record<string, SpriteSheetDefinition>` | — |
| `textures?` | `Record<string, TextureSource>` | `BUILTIN_TEXTURES` |
| `surfaces?` | `Record<string, SurfaceDefinition>` | `DEFAULT_SURFACES` |
| `decorations?` | `Record<string, DecorationComponent>` | `DEFAULT_DECORATIONS` |
| `prefabs?` | `Record<string, PrefabComponent>` | `DEFAULT_PREFABS` |

Recipes are in [extending.md](extending.md).

## Public API (`src/engine/index.ts`)

| Export | Kind | From |
|---|---|---|
| `Shoebox` | component | `Shoebox.tsx` |
| every type in `types.ts` | types | `export type *` |
| `generatedCharacter`; `CharacterLook`, `CharacterPalette` | function; types | `assets/characterSprites.ts` |
| `characterModelSheet` | function | `sprites/characterModelSheet.ts` |
| `CharacterModel`, `CharacterModelPalette`, `HairStyle`, `Outfit` | types | `sprites/model.ts` |
| `TextureSource`, `SpriteSheetDefinition` | types | `assets/AssetManager.ts` |
| `PIXELS_PER_UNIT`, `PixelCanvas`, `shade`, `mixColor` | values | `assets/pixel.ts` |
| `useRuntime` | hook | `core/context.ts` |
| `GameRuntime` | type only | `core/GameRuntime.ts` |
| `prop`, `propNumbers`, `useGenerated`, `Box` | prefab helpers | `prefabs/parts.tsx` |
| `applyWind` | function | `render/wind.ts` |
| `ScriptContext`, `CharacterHandle` | types | `scripting/ScriptContext.ts` |
| `TILES`, `DEFAULT_SURFACES` | values | `world/surfaces.ts` |

Not exported (internal): `useUI`, `AssetManager` as a value, `World`, `Character`, `TileMap`, `DEFAULT_PREFABS`, `DEFAULT_DECORATIONS`, `BUILTIN_TEXTURES`, the noise and dither helpers, the prefab texture painters, and the model renderer's internals (`buildModel`, `renderCharacterSheet`, the SDF helpers). Game code that needs one of these should get it added to the index deliberately.
