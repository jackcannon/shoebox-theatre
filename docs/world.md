# World: tiles, movement, NPCs and events

Everything in `packages/engine/src/world/` is plain TypeScript with no three.js, React or DOM, and all of it is unit-tested in node. The runtime-side event handling (interaction, warps, triggers) lives in `core/GameRuntime.ts` and is described at the end.

## Map definition

A `MapDefinition` (`types.ts`) contains:

| Field | Meaning |
|---|---|
| `id` | Key used in `config.maps` and in warp targets. Must match its key. |
| `name` | Shown in the location banner |
| `tiles` | ASCII rows, north to south. Every row must be the same length. |
| `palette` | Character → `TileType` |
| `border?` | Tiles of edge-extended scenery rendered around the map (default 0) |
| `showBanner?` | `false` hides the banner for this map |
| `objects?`, `npcs?`, `warps?`, `triggers?` | See below |
| `environment` | Lighting, fog, particles and post-processing ([rendering.md](rendering.md)) |
| `camera?` | `{ fov?, pitch?, distance? }`, merged over `DEFAULT_CAMERA` |

## Tile types and surfaces

A `TileType` describes what one ASCII character means:

| Field | Default | Meaning |
|---|---|---|
| `ground` | required | Surface id for the top face, or `'none'` to skip it |
| `side` | `ground` | Surface id for vertical faces exposed where a neighbour is lower (`'none'` skips them) |
| `height` | 0 | Top-face height in world units |
| `solid` | false | Blocks movement |
| `decoration` | — | Decoration id rendered on the tile (for example `tree`) |
| `water` | false | Draws the animated water surface over the tile |

A **surface** (`SurfaceDefinition`) is `{ texture, anchor?, color?, roughness? }`. `texture` is a registered texture id. `anchor: 'top'` pins the texture's top edge to the top of side faces, for the grassy lip of banks and cliffs. Otherwise the texture is pinned to the bottom of the face, for wallpaper skirting. `roughness` defaults to 0.95 in `Terrain`.

`DEFAULT_SURFACES` (`world/surfaces.ts`):

| Surface | Texture | Notes |
|---|---|---|
| `grass`, `path`, `sand`, `seabed`, `dock`, `stone`, `woodFloor`, `wallTop` | same id | |
| `bank`, `cliff`, `dockSide` | same id | `anchor: 'top'` |
| `tileFloor` | same id | `roughness: 0.6` |
| `wallpaper`, `wallpaperBlue`, `labWall` | same id | `anchor: 'bottom'` |

`TILES` presets, meant to be spread into palettes:

| Preset | ground / side | Other |
|---|---|---|
| `grass`, `path`, `sand` | own / `bank` | |
| `tallGrass`, `flowers` | `grass` / `bank` | decoration of the same name |
| `tree`, `bush`, `fence` | `grass` / `bank` | decoration of the same name, `solid` |
| `water` | `seabed` / `bank` | `height: −0.55`, `water`, `solid` |
| `dock` | `dock` / `dockSide` | `height: 0` |
| `woodFloor`, `tileFloor` | own / own | |
| `wall` | `wallTop` / `wallpaper` | `height: 2.5`, `solid`. Override `side` per room. |

## `TileMap`

`new TileMap(def)` parses the layout and throws on a row of the wrong length or on a character missing from the palette. Both errors name the map, row and position.

- `inBounds(x, z)`: inside the playable map.
- `inRegion(x, z)`: inside the map plus `border`, the rendered area.
- `get(x, z)`: tile type or `undefined` out of bounds.
- `getClamped(x, z)`: clamps to the nearest edge tile. This is the "edge extension" that makes forests and sea continue into the border.
- `heightAt(x, z)`: height of the (clamped) tile under a world position.
- `isSolid(x, z)`: true for `solid` tiles and for anything out of bounds, so the player can never leave the map.

## `World`

A `World` is one loaded map. `GameRuntime` builds a fresh one on every map load with `new World(def, player, spawn)`, where `player` is the config's `PlayerSettings` and `spawn` is a `WarpTarget`. It owns:

- `map`, the `TileMap`.
- `player` and `npcs`, both `Character`. `characters` is `[player, ...npcs]`.
- An **object grid** mapping each footprint tile to its `MapObject`. When footprints overlap, an object with `text` or `interact` wins the tile; otherwise the first object placed does.
- A **solid grid** with every footprint tile of every object whose `solid !== false`.
- `firedTriggers`, used by `once` triggers. Because it is rebuilt with the world, "once" means once per visit to the map.
- `lastPlayerTile`, which starts at the spawn tile so that arriving on a tile doesn't count as entering it.

`isTileSolid(x, z)` combines terrain solidity with the solid grid. `objectAt`, `warpAt` and `triggersAt` are simple lookups.

## `Character`

State for the player and NPCs: `x`, `z`, `y`, `facing`, `heading`, `moving`, `running`, `stride`, `target`, `behavior`, `homeX`/`homeZ`, `aiTimer`, `paused` and `lookAt`.

- The collision box half-size is `radius = 0.3`.
- **`facing` vs `heading`:** `facing` is the 4-way `Direction` that gameplay uses (interaction, warps, scripts). `heading` is an 8-way `Heading` used only to pick the sprite row on sheets with diagonal rows. It is always `facing` or a diagonal that includes it: player input and walks towards a target set it from the movement vector (`headingFromVector`), and at the end of each character's update in `World.update` it snaps back to `facing` if it no longer includes it (`headingIncludes`). Script `face`/`faceToward` and an idle NPC turning back after a talk set both.
- **Walk cycle:** sheet columns `[0, 1, 0, 2]` (stand, step A, stand, step B), advancing one frame per 0.3 units walked. A character that isn't moving shows frame 0.
- `moveTo(tileX, tileZ, speed)` walks in a straight line to the tile centre, **ignoring collision**, and returns a promise that resolves on arrival. Starting a new `moveTo` resolves the previous one immediately.

## Player movement and collision

Each frame, `World.update` does this for each character:

- It follows its `target` if it has one (a scripted walk or an AI step).
- Otherwise the player moves by input and an NPC runs its AI, unless it is `paused`.
- A character with a `lookAt` and no target turns towards it.
- Its `heading` snaps to `facing` if it no longer includes it.
- It updates `moving`, `stride` and the eased `y`.

The player's movement:

- **Free 8-direction movement** at `walkSpeed` (default 3.6 tiles/s) or `runSpeed` (default 6.2). Input below length 0.2 is ignored.
- **Facing is 4-way** (`facingFromInput`). On a diagonal the current facing is kept if that direction is still pressed; otherwise the dominant axis wins. The heading is the input direction rounded to 8 ways.
- **`moveBox`** (`collision.ts`) sweeps x first, then z, against the tile grid and against dynamic boxes. A blocked axis stops exactly at contact, at `tile − r` or `tile + 1 + r`, while the other axis keeps moving, so the player slides along walls. A box that already overlaps a solid tile can always move out of it.
- **Dynamic boxes:** every NPC blocks the player with a box of half-size 0.45 (`NPC_HALF_SIZE`), plus a second box on the tile it is walking into.
- **Corner nudging:** when the player pushes along exactly one axis and is blocked, the world probes sideways offsets of ±0.05, ±0.10, … up to `NUDGE_RANGE` (0.42), so ±0.40 at most. If an offset would unblock the push and the path to it is clear, the player slides towards it by up to one frame's movement, so 1-tile gaps don't need pixel-perfect alignment.

## NPC behaviour

`NpcDefinition.behavior` defaults to `idle`:

| Type | Behaviour |
|---|---|
| `idle` | Stands still, keeping its `facing` |
| `look` | Turns to a random direction every `interval` seconds (default 3) |
| `wander` | Turns like `look` (default interval 2.2), then tries a 1-tile step in that direction if the tile is within `radius` of its home tile on both axes |

Each interval is randomised to 60–140%. NPCs walk at 2.2 tiles/s. A wandering NPC won't step onto a tile that is solid, has a warp, has a trigger, is occupied by or reserved by another NPC, or is within `player.radius + 0.5` of the player on both axes.

## Interaction

On a confirm press while the player is free, `World.findInteraction()` probes a point 0.8 tiles in front of the player along their facing:

1. The nearest NPC within 0.75 of the probe point wins.
2. Otherwise, the object on the probe tile wins if it has `text` or `interact`.

`GameRuntime` then:

- **For an NPC,** runs `def.interact`. If there isn't one, it runs `ctx.say(def.dialogue, npc.name)`. An NPC with neither does nothing. While the script runs, the NPC is `paused` with `lookAt = player`. Afterwards both are cleared, and `idle` NPCs return to their original facing.
- **For an object,** runs `object.interact`, or `ctx.say(object.text)` with no speaker.

See [scripting.md](scripting.md) for what scripts can do.

## Warps and triggers

When the player is free and didn't press confirm this frame, `GameRuntime.checkTileEvents` looks at the player's current tile:

- **Warp on the tile:**
  - With `dir`, it fires while the player pushes that way (input dot product > 0.5). This suits doors and doormats.
  - Without `dir`, it fires on entering the tile. This suits stairs.

  Trigger checks are skipped on warp tiles. A warp that is already transitioning is ignored.
- **Triggers:** on entering a tile, every trigger whose rectangle contains it runs, except `once` triggers that already fired on this visit. A non-`once` trigger runs again on every tile entry inside its rectangle.
- "Entering" means the player's tile changed since last frame. Arriving by warp doesn't count, so a stairs warp or trigger under the arrival tile only fires after stepping off and back on.

Door convention: a building with footprint `(x, y, w, d)` and `door` column offset `c` gets its warp on the tile just south of the footprint, `(x + c, y + d)`, with `dir: 'up'`. Interior exits are a doormat on the bottom row with `dir: 'down'`.
