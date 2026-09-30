# Coordinates and units

Almost every bug in this kind of engine comes down to an axis or an off-by-one. These conventions apply everywhere.

## World axes

- One tile is one world unit.
- **x** points east and **z** points south. **y** is up.
- Map rows run north to south, so row 0 is the northernmost row. North is −z.
- The camera sits south of its target (+z) and above it, looking north and down. A prefab's front face is its south face (+z), which is the side the camera sees.
- `DIRECTION_VECTORS` in `math.ts` define `up` as `[0, −1]` (north), `down` as `[0, 1]`, `left` as `[−1, 0]` and `right` as `[1, 0]`, in `[x, z]` order.

## Tiles and positions

- Tile `(x, z)` covers `x..x+1` and `z..z+1`, and its centre is `(x + 0.5, z + 0.5)`.
- Character positions (`Character.x`, `Character.z`) are floats in world units. `tileX`/`tileZ` are `Math.floor` of those.
- Spawning a character on tile `(x, z)` puts it at the tile centre. `Character.moveTo(tileX, tileZ)` also targets the tile centre.
- **In map data, `y` means the row, which is world z.** This applies to `MapObject`, `NpcDefinition`, `WarpDefinition`, `TriggerDefinition` and `WarpTarget`. World code calls the same value `z`.

## Footprints

- A `MapObject` covers `w × d` tiles (both default 1) whose top-left (north-west) tile is `(x, y)`. So it spans columns `x..x+w−1` and rows `y..y+d−1`.
- A `TriggerDefinition` uses the same `x, y, w, d` rectangle.
- `MapScene` renders each prefab inside `<group position={[object.x, y, object.y]}>`, where `y` is `map.heightAt()` at the centre of the footprint.
- **Prefab local space:** the prefab draws over local `[0..w] × [0..d]`, with y = 0 at the ground. Its front (south) face is at local `z = d` and its back at `z = 0`. Centre a 1-tile prop at `[w / 2, y, d / 2]`.
- Wall-mounted prefabs (`window`, `painting`) sit on a back-wall tile (row 0), so their group origin is the wall top. They measure the height difference to the floor tile in front and offset themselves down. See [prefabs.md](prefabs.md).

## Heights

- `TileType.height` is in world units and defaults to 0. It is purely visual: collision is 2D.
- Characters ease their `y` towards the height of the tile under them (`damp` with λ 14), so non-solid raised tiles act as steps.
- The demo uses these heights: floors and grass 0, `TILES.wall` 2.5, `TILES.water` seabed −0.55, and the water surface plane at `WATER_LEVEL = −0.14` (`render/Water.tsx`).
- Beyond the rendered border, terrain side faces drop to `TileMap.baseHeight` (−0.5).

## Camera angles

- `CameraSettings.pitch` is in degrees below the horizon, `fov` is the vertical FOV in degrees, and `distance` is the camera's distance from its target. The defaults (`DEFAULT_CAMERA` in `render/camera.ts`) are fov 30, pitch 40 and distance 18.
- Upright sprites are stretched vertically by `1 / cos(pitch)` (`spriteStretch`). That cancels the foreshortening, so a 16×24 sprite looks 16×24 on screen.

## Texel density: 16 px per unit

- `PIXELS_PER_UNIT = 16` (`assets/pixel.ts`). Every texture is mapped at this density, so pixel art is the same size on terrain, props and characters. Sprite sheets can override it with `pixelsPerUnit` (see below).
- Terrain UVs are world position divided by `image size / 16`, so a 64×64 texture repeats every 4 tiles, and textures tile seamlessly across tile boundaries.
- `Box` with `tiled` rescales box UVs the same way. Canvas-painted prefab faces are sized in pixels, for example `drawFacade({ width: ww * 16, ... })`, and rounded to whole pixels.
- A sprite is `frameWidth / pixelsPerUnit` units wide and `frameHeight / pixelsPerUnit × stretch` units tall, where a sheet's `pixelsPerUnit` defaults to 16. A 16×24 frame is 1 tile wide. Sheets from `characterModelSheet` are the exception to the shared density: they are drawn at 21 px per unit, so their 24×32 frames are about 1.14 tiles wide and their pixels are finer than the world's ([character-models.md](character-models.md#sheet-format)).
- The water shader snaps its pattern to the same 1/16 grid.
