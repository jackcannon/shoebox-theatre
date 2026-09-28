# Mossvale — a Shoebox Theatre engine for the web

A Shoebox Theatre engine in the style of Octopath Traveler and the Dragon Quest III remake: flat pixel-art characters standing in a lit, miniature 3D diorama. It runs in the browser on Vite, React 19, three.js and react-three-fiber.

The sprites are upright planes that cast real shadows, and the camera looks down at a fixed angle. The Shoebox Theatre look comes from a tilt-shift blur that follows the player, bloom on lamps, windows and screens, ACES tone mapping and a vignette, plus foliage that sways in the wind, drifting light motes, animated water and light shafts through windows. All art is generated in code.

The repo includes **Mossvale Village**, a small demo game with five maps: the village, your house (two floors), the neighbours' house and a research lab. You can walk around, enter buildings, read signs and talk to NPCs, and some conversations branch on choices and story flags.

For contributors, [`docs/`](docs/README.md) is the full reference for the stack, architecture and each subsystem. AI agents should read [`AGENTS.md`](AGENTS.md) first.

## Quick start

Requires Node 20.19+ or 22.12+ (Vite 8).

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest unit tests
npm run build     # type-check (tsc -b) and production build into dist/
npm run lint      # oxlint
npm run preview   # serve the production build
```

`npm run build` prints a Vite advisory that the single JS chunk is larger than 500 kB. Most of it is three.js and postprocessing; the build still succeeds.

### Controls

| Action | Keyboard | Gamepad (standard layout) |
|---|---|---|
| Move | WASD or arrow keys | Left stick or d-pad |
| Run (hold) | Shift | X / button 2 |
| Talk, confirm, next page | Space, Enter, Z or E | A / button 0 |
| Back (in a choice, picks the last option) | Esc, X or Backspace | B / button 1 |

Confirm or back while text is still typing shows the whole page at once.

### Things to try in the demo

- Talk to Mom twice. Her second line changes once you have met her.
- Go upstairs and take a nap in your bed.
- In the lab, touch the crystals on the pedestal, then talk to the professor.
- Walk north out of the village, and find the fisher at the end of the dock.

## Architecture

```
src/
  main.tsx, App.tsx     mounts <Shoebox config={gameConfig} />
  engine/
    index.ts            public API: game code imports only from here
    Shoebox.tsx        creates the GameRuntime, the 3D canvas and the UI overlay
    types.ts            every public type (GameConfig, MapDefinition, TileType, MapObject, ...)
    math.ts             directions, seeded RNG, tile hash, damp, wait
    assets/             AssetManager, PixelCanvas and colour helpers, built-in textures, character sheet generator
    core/               GameRuntime, Input (keyboard + gamepad), the zustand UI store, React context hooks
    world/              TileMap, World (movement, NPC AI, interaction), Character, collision, surfaces and TILES, terrain geometry
    scripting/          ScriptContext, DialogueController (typewriter and choices), Flags
    render/             the R3F scene: GameCanvas, MapScene, Terrain, Water, decorations, CharacterSprite,
                        Lighting, Particles, FollowCamera and camera maths, PostEffects, wind
    prefabs/            3D props placed as map objects (buildings, signs, lamps, furniture) and helpers for writing them
    ui/                 DOM overlay: dialogue box, choice box, location banner, fade, loading screen, controls hint, ui.css
  game/
    config.ts           gameConfig: title, start position, player, maps, characters
    characters.ts       character looks built with generatedCharacter
    maps/               town, playerHouse1F, playerHouse2F, neighbourHouse, lab, shared environments
```

The public API (`src/engine/index.ts`) exports `Shoebox`, `generatedCharacter`, `TILES`, `DEFAULT_SURFACES`, `PIXELS_PER_UNIT`, `PixelCanvas`, `shade`, `mixColor`, the prefab helpers `prop`, `propNumbers`, `useGenerated` and `Box`, plus `useRuntime` and `applyWind`. It also exports every type in `types.ts`, and the `CharacterLook`, `CharacterPalette`, `TextureSource`, `SpriteSheetDefinition`, `ScriptContext`, `CharacterHandle` and `GameRuntime` types.

### One frame

Every frame runs in react-three-fiber `useFrame` callbacks, ordered by priority:

1. **Game loop** (`GameLoop` in `render/GameCanvas.tsx`, priority −2) clamps the frame time to 1/20 s and calls `runtime.update(dt)`, which runs steps 2 to 5.
2. **Input:** `Input.update()` turns the key and gamepad presses since the last frame into this frame's `wasPressed` edges.
3. **Dialogue:** `DialogueController.update(dt)` advances the typewriter, moves the choice cursor and resolves the page or choice a script is waiting on.
4. **World:** `World.update(dt, control)` moves every character. A character on a scripted walk follows it; otherwise the player follows input (only when no script or transition is running) and NPCs follow their AI. It also updates facing and the walk-cycle stride, and eases each character to the ground height under it.
5. **Interaction, warps and triggers:** if the player is free, a confirm press talks to whatever is in front of them. Without a confirm press, the runtime checks the player's tile for a warp and then for triggers.
6. **Camera:** `FollowCamera` (priority −1) eases the look-at point towards the player, clamped to the rendered area, at the map's fixed pitch and distance.
7. **Sprites:** each `CharacterSprite` copies its character's position and picks the sprite-sheet frame through the texture offset. At the same priority, `PostEffects` moves the tilt-shift focus line to the player's screen height, and animated materials read `runtime.time`.
8. **Composer:** the postprocessing `EffectComposer` (priority 1, which replaces R3F's default render) draws the scene, then bloom, two tilt-shift passes, hue/saturation, ACES tone mapping and the vignette.

### Runtime state vs UI state

- `GameRuntime` (`core/GameRuntime.ts`) is a plain mutable class that owns everything outside React. That includes the config, `assets`, `input`, `flags`, the current `world`, the shared clock `time`, the dialogue controller, running scripts and map transitions. Per-frame state such as positions and facing lives on `Character` objects and is read inside `useFrame`, so nothing re-renders React per frame.
- `runtime.ui` is a zustand vanilla store (`core/uiStore.ts`) that only holds what the DOM overlay shows: `dialogue`, `choice`, `fade`, `banner`, `loading`, and `worldId`. Loading a map bumps `worldId`, which remounts the scene for the new map.
- `Shoebox` creates the runtime inside `useEffect`, so React StrictMode's double mount gets a fresh instance. Pass it a module-level `config` constant: a new object on every render would recreate the runtime.

### Coordinates and scale

- **16 pixels per world unit.** One tile is one world unit and `PIXELS_PER_UNIT = 16`. Every texture (terrain, props and sprites) is mapped at that density, so pixel art is the same size everywhere.
- Tile `(x, z)` covers `x..x+1` by `z..z+1`. Map rows are listed north to south; north is −z, and the camera sits to the south (+z) looking north. Character positions are floats in tile units, and tile centres are at `+0.5`.
- In map definitions, `y` always means the row, which is world z. That applies to objects, NPCs, warps, triggers and warp targets.
- A `MapObject`'s `x`/`y` is the top-left (north-west) tile of its `w × d` footprint. A prefab renders in a group placed at that tile's corner at the footprint's ground height. It draws over local `[0..w] × [0..d]`, and its front (south) face is at local `z = d`.
- `TileType.height` is in world units (default 0). The demo's walls are 2.5 high and its water is at −0.55.

## Assets

### AssetManager

`runtime.assets` is the registry and cache for every texture and sprite sheet.

- A `TextureSource` is either `{ url }` (an image file, for example in `public/`) or `{ draw }` (a function that paints and returns a canvas). Both accept `pixelArt` (nearest-neighbour magnification, default true) and `mipmaps` (default true; turn it off for sprite sheets and cut-outs).
- The runtime registers the built-in textures, then `config.textures` (a matching id replaces the built-in), then one sheet per entry in `config.characters`.
- `start()` calls `assets.preload(onProgress)`, which loads every URL texture and paints every generated one while the loading screen shows progress.
- `assets.texture(id)` returns the cached texture. A generated texture is painted on first use if needed. A URL texture must be registered in the config so it is preloaded; otherwise `texture()` throws.
- `assets.generated(key, draw, options)` caches parametric art such as a facade painted for one building's size and colours. The key must describe every parameter of `draw`. Prefabs use it through the `useGenerated(key, draw)` hook.
- Built-in texture ids: `grass`, `path`, `sand`, `seabed`, `bank`, `cliff`, `dock`, `dockSide`, `woodFloor`, `tileFloor`, `wallpaper`, `wallpaperBlue`, `labWall`, `wallTop`, `stone`, `leaves`, `bark`, `flowers`, `tallGrass`, `blob`, `dot`, `lightShaft`.

### Character sprite sheets

A `SpriteSheetDefinition` is `{ texture, frameWidth, frameHeight }`. The sheet is a grid of **3 columns** (stand, step A, step B) by **4 rows** (down, left, right, up). The walk cycle plays stand, A, stand, B, advancing one frame every 0.3 tiles walked.

In the world, a sprite is an upright plane `frameWidth / 16` units wide. Its height is `frameHeight / 16` stretched by `1 / cos(pitch)`, which cancels the camera's foreshortening so the pixel art keeps its proportions on screen. It is alpha-tested, casts a real shadow, and has a soft blob shadow at its feet.

There are two ways to make a character:

- **Generated:** `generatedCharacter({ head, body, palette })` paints a 48×96 sheet of 16×24 frames from pixel-grid parts. The head is `short`, `cap`, `long` or `bun`, and the body is `tunic`, `dress` or `coat`. The palette sets `hair`, `skin`, `top`, `accent`, `bottom` and `shoes`, with optional `eyes` and `outline`. Shadow tones are derived automatically, and the left-facing row is mirrored from the right.
- **A PNG:** lay frames out in the same 3×4 grid and register it by URL (see [Use a PNG](#use-a-png-texture-or-sprite-sheet)). Sprite sheets default to `mipmaps: false`. Keep 16 px per tile, so a 16×24 frame is one tile wide.

```ts
export const characters = {
  hero: generatedCharacter({
    head: 'cap',
    body: 'tunic',
    palette: { hair: '#3b2a24', skin: '#f2c9a0', top: '#3569b5', accent: '#d9493e', bottom: '#34406a', shoes: '#2d2d3a' },
  }),
}
```

### Surfaces and terrain

- Tile types refer to **surfaces**, not textures. A `SurfaceDefinition` is `{ texture, anchor?, color?, roughness? }`. The built-in surfaces are listed in `DEFAULT_SURFACES`.
- Terrain is built from the ASCII layout: one quad for each tile top, plus side faces wherever a neighbour is lower. All faces with the same surface are merged into one mesh.
- **Texture scale comes from the image size.** UVs are world coordinates divided by `image size / 16`, so a 64×64 texture repeats every 4 tiles, a 16×32 bank texture covers 1 tile across and 2 units of height, and textures tile seamlessly across tile boundaries.
- `anchor: 'top'` pins the top edge of the texture to the top of a side face (the grassy lip of a bank or cliff). Otherwise the texture is pinned to the bottom of the face (the skirting of a wallpaper).
- `border: n` on a map renders `n` tiles of extra scenery around it by repeating the edge tiles outwards, so forests and sea continue past the playable area.

## Movement and collision

- **Free 8-direction movement.** The player moves at `walkSpeed` (default 3.6 tiles/s) or `runSpeed` while running (default 6.2), both set in `PlayerSettings`. Diagonal input is normalised. Facing is 4-way: on a diagonal, the player keeps their current facing if that direction is still held.
- **Box-vs-tile sweep.** The player is a square with half-size 0.3. `moveBox` in `world/collision.ts`, a pure and unit-tested function, sweeps the x axis and then the z axis against the tile grid and against dynamic boxes. A blocked axis stops exactly at contact while the other axis keeps moving, so the player slides along walls.
- **What is solid:** terrain tiles with `solid: true`, anything out of bounds, and the footprint of every object without `solid: false`. Height is visual only. Characters ease to the ground height of their tile, so non-solid raised tiles act as steps.
- **Corner nudging.** If you push along one axis and hit a corner, the world tries sideways offsets of up to 0.42 tiles. If one clears the way, the player slides towards the gap, so 1-tile gaps don't need pixel-perfect lining up.
- **NPCs move tile to tile.** `Character.moveTo` walks in a straight line to a tile centre, ignoring collision. Behaviours:
  - `idle` stands still.
  - `look` turns to a random direction every ~3 s.
  - `wander` also takes a 1-tile step within `radius` of its home tile, every ~2.2 s.
  - Every interval is randomised by ±40% and can be set with `interval`.
- **Reserved tiles.** A wandering NPC never steps onto a solid tile, a warp or trigger tile, a tile another NPC is standing on or walking into, or a tile the player overlaps. NPCs block the player with a box of half-size 0.45. While an NPC walks, a second box covers the tile it is walking into, so the player can't slip into it.
- **Interaction.** Confirm probes a point 0.8 tiles in front of the player. The nearest NPC within 0.75 of that point wins; otherwise the object on that tile, if it has `text` or `interact`. While talking, an NPC's AI pauses and it faces the player. Idle NPCs turn back to their original facing afterwards.
- **Warps.** A warp with `dir` fires while the player stands on its tile and pushes that way, which suits doors and doormats. A warp without `dir` fires when the player steps onto the tile, which suits stairs. Landing on a tile after a warp doesn't count as entering it, so a stairs warp or trigger under the arrival point only fires once the player steps off and back on.
- **Triggers** fire when the player enters any tile in their `x, y, w, d` rectangle. With `once: true` a trigger fires once per visit to the map.

## How to extend

Game content is data plus a few components, all registered in the `GameConfig`. The engine merges `textures`, `surfaces`, `decorations` and `prefabs` over its built-ins by id, so a new id adds an entry and an existing id replaces the built-in. Here is the demo config with every example from this section registered:

```ts
// src/game/config.ts
import type { GameConfig } from '../engine'
import { lab } from './maps/lab'
import { meadow } from './maps/meadow'
import { neighbourHouse } from './maps/neighbourHouse'
import { playerHouse1F } from './maps/playerHouse1F'
import { playerHouse2F } from './maps/playerHouse2F'
import { town } from './maps/town'

import { characters } from './characters'
import { Rocks } from './decorations'
import { Well } from './prefabs'
import { drawCobbles } from './textures'

export const gameConfig: GameConfig = {
  title: 'Mossvale — Shoebox Theatre Demo',
  start: { map: 'town', x: 5, y: 8, facing: 'down' },
  player: { sprite: 'hero' },
  maps: { town, playerHouse1F, playerHouse2F, neighbourHouse, lab, meadow },
  characters,
  textures: { cobble: { draw: drawCobbles } },
  surfaces: { cobble: { texture: 'cobble' } },
  decorations: { rock: Rocks },
  prefabs: { well: Well },
}
```

`src/game/maps/maps.test.ts` checks every map in `gameConfig`, including new ones. It checks that rows have equal widths, that warps start on walkable tiles and land on walkable tiles of existing maps, and that NPCs stand on walkable tiles. Run `npm test` after adding a map.

### Add a map

A map is an ASCII layout, a palette that says what each character means, and lists of objects, NPCs, warps and triggers, plus lighting and camera settings. Spread the `TILES` presets into the palette and override fields as needed.

```ts
// src/game/maps/meadow.ts
import { TILES, type MapDefinition } from '../../engine'
import { outdoorDay } from './environments'

export const meadow: MapDefinition = {
  id: 'meadow',
  name: 'Windy Meadow', // shown in the location banner
  tiles: [
    'TTTTTTTTTT',
    'TT,,^^^,TT',
    'T,,,,,,,,T',
    'T,"",,f,,T',
    'T,"",,,,,T',
    'T,,,,..,,T',
    'TTTTT..TTT',
  ],
  palette: {
    T: TILES.tree,
    ',': TILES.grass,
    '.': TILES.path,
    '"': TILES.tallGrass,
    f: TILES.flowers,
    '^': { ground: 'grass', side: 'cliff', height: 1, solid: true },
  },
  border: 4,
  objects: [{ type: 'sign', x: 4, y: 5, text: ['WINDY MEADOW', 'Mind the ledge.'] }],
  npcs: [
    {
      id: 'shepherd',
      sprite: 'elder',
      name: 'Shepherd',
      x: 7,
      y: 3,
      behavior: { type: 'wander', radius: 1 },
      dialogue: 'The wind never stops up here.',
    },
  ],
  warps: [
    { x: 5, y: 6, dir: 'down', to: { map: 'town', x: 11, y: 1, facing: 'down' } },
    { x: 6, y: 6, dir: 'down', to: { map: 'town', x: 12, y: 1, facing: 'down' } },
  ],
  triggers: [
    {
      x: 2,
      y: 3,
      w: 2,
      d: 2,
      once: true,
      script: async (ctx) => {
        await ctx.say('Something rustles in the tall grass…')
        await ctx.player.walk('right', 2)
      },
    },
  ],
  environment: { ...outdoorDay, postfx: { tiltShift: 0.16 } },
  camera: { pitch: 45, distance: 16 },
}
```

Register it in `maps` and link it from another map. For example, replace the town's north-exit trigger (which pushes the player back) with two warps on the path at the top of `town.ts`:

```ts
{ x: 11, y: 0, dir: 'up', to: { map: 'meadow', x: 5, y: 5, facing: 'up' } },
{ x: 12, y: 0, dir: 'up', to: { map: 'meadow', x: 6, y: 5, facing: 'up' } },
```

More map options:

- `TILES` has `grass`, `path`, `sand`, `tallGrass`, `flowers`, `tree`, `bush`, `fence`, `water`, `dock`, `woodFloor`, `tileFloor` and `wall`.
- For interiors, make row 0 a wall (`{ ...TILES.wall, side: 'wallpaper' }`) and leave out the front wall. Put a doormat on the bottom row with a warp using `dir: 'down'`, and use a steeper, closer camera such as the demo's `{ fov: 32, pitch: 50, distance: 15 }`. The camera clamp automatically keeps tall back walls in view.
- `showBanner: false` hides the location banner. The banner also stays hidden when the new map has the same `name` as the old one.

#### Built-in prefabs

| Prefab | Props |
|---|---|
| `building` | `style` (`'cottage'` or `'lab'`), `wall`, `trim`, `roof` (colours), `height` (default 2), `door` (column offset in the footprint, default 1), `windows` (column offsets), `chimney` |
| `sign`, `lamp` | none. Each `lamp` adds a real point light, so keep the count modest. |
| `mailbox`, `bed`, `rug`, `doormat` | `color` |
| `table` | `vase` |
| `bookshelf`, `machine` | `seed` (varies the painted detail) |
| `counter`, `tv`, `plant`, `stairs`, `desk`, `pedestal` | none |
| `window`, `painting` | none. Place them on a row-0 wall tile with `solid: false`; they drop themselves to floor height. |

A building's door warp goes on the tile just south of the footprint, at column `x + door` and row `y + d`, with `dir: 'up'`. Mark rugs, doormats and stairs `solid: false` so they can be walked on.

### Add an NPC with a script

`dialogue` is the shorthand for an NPC that just talks: one page per string, with `name` as the speaker. For anything more, give the NPC an `interact` script. Objects take `text` or `interact` the same way, and triggers take `script`.

```ts
{
  id: 'wren',
  sprite: 'kid',
  name: 'Wren',
  x: 2,
  y: 2,
  facing: 'down',
  interact: async (ctx) => {
    if (ctx.flags.has('metWren')) {
      await ctx.say('Back again? The village is just down the path.', 'Wren')
      return
    }
    await ctx.say(["Oh! I didn't hear you coming.", 'Everyone gets lost up here at first.'], 'Wren')
    const answer = await ctx.choice('Want a shortcut home?', ['Yes please', 'No thanks'], 'Wren')
    ctx.flags.set('metWren')
    if (answer !== 0) return
    await ctx.self?.walk('right', 1)
    ctx.self?.faceToward(ctx.player)
    await ctx.say('Follow me, then!', 'Wren')
    await ctx.fadeOut(400)
    await ctx.warp({ map: 'town', x: 5, y: 8, facing: 'down' })
    await ctx.say('…and somehow you are back outside your house.')
  },
},
```

Scripts are async functions that receive a `ScriptContext`:

| Command | What it does |
|---|---|
| `say(text \| text[], speaker?)` | Shows one page per string and resolves after the last page is dismissed |
| `choice(prompt, options, speaker?)` | Resolves to the chosen index. Back picks the last option, so put "No" or "Cancel" last. |
| `wait(ms)`, `fadeOut(ms?)`, `fadeIn(ms?)` | Pause; fade the screen to black or back (default 280 ms) |
| `warp({ map, x, y, facing? })` | Fades out, loads the map and fades in |
| `flags.get(key)`, `flags.has(key)`, `flags.set(key, value = true)` | Story state shared by every script. Values are booleans, numbers or strings, and `has` checks truthiness. |
| `player`, `self`, `npc(id)` | Character handles with `face(dir)`, `faceToward(handle)`, `walk(dir, tiles = 1)` and the underlying `character` |
| `runtime` | The `GameRuntime`, as an escape hatch |

- While any script runs, the player can't move, and the dialogue box closes when the last script finishes. A script that throws is logged and ends.
- Pass the speaker to `say` and `choice` yourself in `interact` scripts; only the `dialogue` shorthand fills it in from `name`.
- Scripted walks move at 3.2 tiles/s and ignore collision, so walk characters over clear tiles.
- `player` and `self` point at the characters of the map the script started on. After `warp`, don't walk them: their `walk` would never finish. `npc(id)` always looks up the current map.
- Flags last for the session and are not saved.

### Add a tile type or surface

A tile type is a palette entry: `ground` and `side` (surface ids, or `'none'` to skip that face), `height`, `solid`, `decoration`, and `water` (draws the animated water surface over the tile). A new look for the ground needs a texture and a surface. Paint the texture with `PixelCanvas`, which wraps by default so the texture tiles seamlessly:

```ts
// src/game/textures.ts
import { PixelCanvas, shade } from '../engine'

export function drawCobbles(): HTMLCanvasElement {
  const p = new PixelCanvas(32, 32)
  p.fill('#6f6a64')
  for (let y = 0; y < 32; y += 8) {
    const offset = (y / 8) % 2 === 0 ? 0 : 4
    for (let x = 0; x < 32; x += 8) {
      p.rect(x + offset + 1, y + 1, 6, 6, '#a9a49c')
      p.rect(x + offset + 1, y + 6, 6, 1, shade('#a9a49c', -0.3))
    }
  }
  return p.toCanvas()
}
```

Register `textures: { cobble: { draw: drawCobbles } }` and `surfaces: { cobble: { texture: 'cobble' } }`, then use the surface in a palette. This 32×32 texture repeats every 2 tiles. This entry is a cobbled plaza raised a quarter of a unit, with cliff sides:

```ts
'#': { ground: 'cobble', side: 'cliff', height: 0.25 },
```

### Add a decoration component

Decorations are repeated scenery attached to tile types, such as trees, flowers and fences. A decoration component receives every tile with its id on the map and in the border (`inMap` is false for border tiles) in one `instances` array. Each instance has the tile's `x`, `z`, ground height `y` and a stable random `seed`.

```tsx
// src/game/decorations.tsx
import type { DecorationComponent } from '../engine'

export const Rocks: DecorationComponent = ({ instances }) => (
  <>
    {instances.map((t) => (
      <mesh
        key={`${t.x},${t.z}`}
        position={[t.x + 0.5, t.y + 0.15, t.z + 0.5]}
        rotation-y={t.seed * Math.PI * 2}
        scale={0.7 + t.seed * 0.5}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#8a8680" roughness={1} flatShading />
      </mesh>
    ))}
  </>
)
```

Register `decorations: { rock: Rocks }` and use it in a palette: `r: { ...TILES.grass, decoration: 'rock', solid: true }`. The built-in decorations (`tree`, `bush`, `flowers`, `tallGrass`, `fence`) in `render/decorations.tsx` draw each part as one `InstancedMesh`, which is the way to go for scenery that appears hundreds of times. `applyWind(material, strength)` makes a material sway; the sway grows with height above the geometry's origin.

### Add a prefab component

A prefab is a React component that receives `{ object, w, d }` and draws in the footprint's local space: `[0..w] × [0..d]` on the ground, with the front at `z = d`. Read settings with `prop(object, key, fallback)` (the fallback sets the type) or `propNumbers(object, key)`.

```tsx
// src/game/prefabs.tsx
import { Box, prop, useRuntime, type PrefabProps } from '../engine'

export function Well({ object, w, d }: PrefabProps) {
  const stone = useRuntime().assets.texture('stone')
  const roof = prop(object, 'roof', '#8a4b2d')
  const cx = w / 2
  const cz = d / 2
  return (
    <>
      <Box size={[0.9, 0.6, 0.9]} position={[cx, 0.3, cz]} map={stone} tiled />
      <Box size={[0.06, 0.9, 0.06]} position={[cx - 0.4, 1.05, cz]} color="#6b4a2e" />
      <Box size={[0.06, 0.9, 0.06]} position={[cx + 0.4, 1.05, cz]} color="#6b4a2e" />
      <Box size={[1.1, 0.08, 0.7]} position={[cx, 1.54, cz]} color={roof} />
    </>
  )
}
```

Register `prefabs: { well: Well }` and place it like any object:

```ts
{ type: 'well', x: 6, y: 2, props: { roof: '#3f6fb5' }, text: 'The water is cold and clear.' },
```

- `Box` is a shadow-casting box. With `tiled`, it repeats its `map` at 16 px per unit instead of stretching it over each face.
- For art that depends on props, paint it with `useGenerated(key, draw)`, where the key includes every parameter, for example `` `plaque:${color}` ``.
- For different textures per face, use a `<mesh>` with one `meshStandardMaterial` per face (`attach="material-0"` to `"material-5"`). The face order is +x, −x, +y, −y, +z (front), −z.
- Glowing parts need `emissiveIntensity` above 1 to reach the bloom threshold (0.85).
- Animate in `useFrame` with `useRuntime().time`. See `src/engine/prefabs/` for 18 worked examples.

### Use a PNG texture or sprite sheet

Put the file in `public/` and register it by URL. URL textures are preloaded behind the loading screen.

```ts
textures: {
  grass: { url: '/textures/grass.png' }, // same id as a built-in: replaces every grass tile
  cobble: { url: '/textures/cobble.png' },
},
surfaces: { cobble: { texture: 'cobble' } },
characters: {
  ...characters,
  hero: { texture: { url: '/sprites/hero.png' }, frameWidth: 16, frameHeight: 24 },
},
```

The image size sets the world scale (16 px = 1 tile), for terrain and for `Box` with `tiled`. Add `pixelArt: false` for smooth, painted images.

### Tune the look

Lighting, fog, particles and post-processing are set per map in `environment`, and the camera in `camera`:

```ts
environment: {
  ...outdoorDay,
  sun: { color: '#ffc58a', intensity: 2.2, direction: [0.8, 0.5, 0.4] },
  lights: [{ position: [8, 2, 6], color: '#ffb060', intensity: 8, distance: 6, flicker: true }],
  postfx: { bloom: 0.8, tiltShift: 0.18, vignette: 0.7, saturation: 0.1 },
},
camera: { fov: 28, pitch: 35, distance: 20 },
```

- `background`, `fog { color, near, far }`, `ambient` and `hemisphere` set the base mood.
- `sun` is the only shadow-casting light. `direction` points from the scene towards the sun, and the shadow camera is fitted to the whole map and border automatically.
- `lights` are point lights (default colour `#ffcf8a`, intensity 12, distance 8). They are physically based, so intensities of about 6–12 read well. `flicker: true` makes them waver like a flame.
- `particles { count, color, size }` adds drifting motes around the player: pollen outdoors, dust indoors.
- `postfx` defaults are bloom 0.55, tiltShift 0.12 (blur strength; the focus line follows the player), vignette 0.55 and saturation 0 (range −1 to 1). Fixed values such as the bloom threshold, the tilt-shift taper and the ACES tone mapping live in `src/engine/render/PostEffects.tsx`.
- `camera` defaults to fov 30, pitch 40 (degrees below the horizon) and distance 18 (`DEFAULT_CAMERA` in `render/camera.ts`). The sprite stretch follows the pitch automatically. The camera is clamped to keep the view inside the map and its border, and it centres maps that are smaller than the view.

### Ideas for next features

- **Audio:** music per map (an `environment.music` field played on map load) and sound effects from the runtime's `warp` and the dialogue typewriter.
- **Save and load:** serialise the current map, the player's tile and facing, and the flags. `Flags` would need a way to list and restore its values.
- **Menus:** open a pause or inventory menu on back when `runtime.playerFree`, with new fields in the UI store and a new overlay component.
- **Battles:** a random-encounter check when the player enters a `tallGrass` tile, handing off to a battle scene or overlay, then returning to the map.
- **Touch controls:** an on-screen d-pad and buttons that feed `Input`, which currently reads only the keyboard and gamepads.
- **Day and night:** animate the sun, ambient and fog over time, and switch lamps on at dusk.
- **Load time:** split three.js and postprocessing into their own chunks.

## Testing and debugging

`npm test` runs vitest in a node environment on `src/**/*.test.ts`. There are 50 tests in 7 files, covering collision, the tile map, world movement and interaction, the dialogue controller, the character parts, and the integrity of every map.

In `npm run dev`, the runtime is exposed as `window.__shoebox` for the browser console. For example:

```js
__shoebox.world.player              // position, facing, tile
__shoebox.warp({ map: 'lab', x: 7, y: 10 })
__shoebox.flags.set('metMom')
```

## Credits

- All art is generated procedurally in code: terrain, props, characters, water and light effects. The project uses no third-party game assets, and the village, characters and dialogue are original.
- Font: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License 1.1), via `@fontsource/pixelify-sans`.
- Built with [three.js](https://threejs.org), [react-three-fiber](https://r3f.docs.pmnd.rs), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing), [zustand](https://github.com/pmndrs/zustand) and [Vite](https://vite.dev).
