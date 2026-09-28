# Rendering: the Shoebox Theatre scene

Everything in `src/engine/render/` is react-three-fiber. The Shoebox Theatre look comes from these pieces:

- upright pixel sprites that cast real shadows, in a lit, low-poly 3D diorama
- a fixed-pitch follow camera
- a tilt-shift blur whose focus line tracks the player
- bloom on emissive parts, ACES tone mapping and a vignette
- wind sway, drifting motes and animated pixel water

## Canvas (`GameCanvas.tsx`)

- `<Canvas className="shoebox-canvas" shadows="percentage" dpr={[1, 2]} gl={{ antialias: false, powerPreference: 'high-performance' }}>`, with an initial camera of fov 30, near 0.5 and far 220. `FollowCamera` takes it over.
  - `shadows="percentage"` is PCF. three r186 removed `PCFSoftShadowMap`.
  - Antialiasing comes from the composer's `multisampling={4}`, not the default framebuffer.
- R3F's default frame loop (`always`) renders continuously, even when nothing moves.
- `GameLoop` (priority −2) drives `runtime.update(dt)`; see [architecture.md](architecture.md#one-frame).
- `<MapScene key={worldId}>` and `<PostEffects key={`fx-${worldId}`}>` remount on every map load, so every per-map resource is rebuilt from the new `World`.

## Map scene (`MapScene.tsx`)

It renders these, in order:

1. `<color attach="background">` from `environment.background`
2. `<fog>` from `environment.fog`, if set
3. `Lighting`
4. `Terrain`
5. `Water`
6. decorations
7. prefab objects
8. one `CharacterSprite` per character
9. `Particles`, if `environment.particles` is set
10. `FollowCamera`

- **Decorations:** it walks every tile in the rendered region (map plus border, using `getClamped`) and groups tiles by `TileType.decoration`. Each registered decoration component gets all its instances at once. An unregistered id logs a `console.warn` and is skipped.
- **Objects:** each `MapObject` renders its prefab (`runtime.prefabs[object.type]`) inside a group at `[object.x, heightAt(footprint centre), object.y]`. An unregistered type logs a warning and is skipped.

## Terrain (`Terrain.tsx`, `world/terrainGeometry.ts`)

`buildTerrain(map, surfaces, scaleOf)` visits every tile in the region:

- It emits one top quad at the tile's height, unless `ground` is `'none'`.
- It emits a side quad on each edge where the neighbour is lower, using `side ?? ground`. Neighbours outside the region count as `baseHeight` (−0.5).
- Quads are grouped by surface id. `Terrain` turns each group into one `BufferGeometry` and one `MeshStandardMaterial`, with `map` from the surface's texture, `color` defaulting to `#ffffff`, `roughness` to 0.95 and `metalness` 0. Every terrain mesh casts and receives shadows.
- UV scale is the texture's pixel size divided by 16 ([coordinates-and-units.md](coordinates-and-units.md#texel-density-16-px-per-unit)). The `anchor` rule for side faces is in [world.md](world.md#tile-types-and-surfaces).
- An unknown surface id throws `Unknown surface "<id>"`.

## Water (`Water.tsx`)

- One quad per water tile in the region, at `WATER_LEVEL = −0.14`, above the seabed at −0.55.
- Each vertex gets a `shore` attribute: 1 if any of the four tiles around that corner isn't water, otherwise 0. Tiles outside the region count as water.
- It uses a custom `ShaderMaterial` with `transparent`, `depthWrite: false`, fog support and `renderOrder` 1. The fragment shader:
  - snaps to the 1/16 pixel grid
  - mixes a deep colour (`#1f5f8f`) with a shallow one (`#3f9fbf`) by sine waves plus the shore factor
  - adds moving streaks
  - adds random pixel glints above 1.0 brightness, so bloom catches them
  - adds foam (`#e9f7f2`) near the shore
- It includes three's `tonemapping_fragment` chunk. That chunk does nothing here because the composer disables renderer tone mapping.

## Decorations (`decorations.tsx`)

Every decoration is instanced: one `InstancedMesh` per geometry, with per-instance matrices and, where used, colours. Instance transforms and tints come from `hashTile`, so they are stable across loads. `DecorationInstance.inMap` is false for border tiles, which get more scatter and variation.

| Id | Look |
|---|---|
| `tree` | Tapered 6-sided trunk (`bark`) plus two lumpy icosahedron foliage blobs (`leaves`, flat shaded, HSL-tinted, wind 0.035). Border trees are scattered more and are darker. |
| `bush` | One foliage blob, wind 0.03 |
| `flowers` | Two upright cut-out quads per tile using the 2-frame `flowers` texture, which alternates at 1.6 frames per second. No cast shadow. |
| `tallGrass` | Three cut-out quads per tile, tinted, wind 0.14. No cast shadow. |
| `fence` | A post per tile, plus two rails towards each east or south neighbour that is also a fence |

- **Cut-outs** are upright planes facing south (towards the camera). They use `alphaTest: 0.5` and `DoubleSide`. Each cut-out material clones its texture so it can set its own `repeat` and animate its own `offset`.
- **Disposal:** geometries and materials a decoration creates go through `useDisposable`, which disposes them on unmount.

## Character sprites (`CharacterSprite.tsx`)

- Each sprite is a vertical `PlaneGeometry` that is `frameWidth / 16` wide and `frameHeight / 16 × stretch` tall, where stretch is `1 / cos(pitch)`.
- Its `MeshStandardMaterial` has `alphaTest: 0.5`, roughness 1 and **`DoubleSide`**. It must stay `DoubleSide`: a front-side material is drawn back-side in three's shadow pass, and a plane facing the camera, lit from the front, would then cast no shadow.
- Each sprite **clones** the sheet texture so it has its own `offset` and `repeat`. Clones share the GPU upload of the source image. The clone is disposed on unmount.
- Every frame it copies `x/y/z` from its `Character`, sets the UV offset to column `frame()` and the row for its facing, and bobs up one pixel on standing frames while moving.
- A soft `blob` contact shadow sits under each sprite (`renderOrder` 2, `depthWrite: false`) in addition to the real shadow.

## Lighting (`Lighting.tsx`)

`environment` controls it:

- `ambient { color, intensity }` and `hemisphere { sky, ground, intensity }` are plain fill lights.
- **`sun { color, intensity, direction }`** is the only shadow caster. `direction` points from the scene towards the light.
  - The light sits 60 units from the map centre along that direction.
  - Its orthographic shadow camera is fitted to the whole map plus border, with extent `hypot(w/2 + border, h/2 + border) + 1`.
  - The shadow map is 4096² when the extent is over 14, otherwise 2048². `shadow-bias` is −0.0004 and `normalBias` is 0.025.
- **`lights: PointLightDefinition[]`** are non-shadowing point lights. They default to colour `#ffcf8a`, intensity 12, distance 8 and decay 2. `flicker: true` makes the intensity waver with `runtime.time`. They are physically based, so intensities of about 6–12 read well.

Prefabs can add their own lights too; each `lamp` adds a point light.

## Particles (`Particles.tsx`)

`environment.particles { count, color, size = 0.08 }` spawns `count` points in a 24 × 18 area around the player, from 0 to 3 units up.

- They drift upwards and sideways, and respawn near the ground when they rise above 3.2 or stray outside the area.
- Brightness pulses through vertex colours.
- The material uses the `dot` texture with additive blending, `depthWrite: false` and `frustumCulled={false}`.

## Camera (`FollowCamera.tsx`, `camera.ts`)

- `resolveCamera(def)` merges `def.camera` over `DEFAULT_CAMERA` (fov 30, pitch 40, distance 18). The camera's `fov` is updated on map load.
- **Following:** each frame the look-at target is clamped, eased with `damp` (λ 5) towards the player on x, y and z (it snaps on the first frame of a map), and the camera is placed at `target + (0, sin(pitch) · distance, cos(pitch) · distance)` looking at the target.
- **Clamping** (`clampCameraTarget`) works out how far the view reaches north and south of the target on the ground plane, and the half-width at the target, then clamps the target so the view stays inside the rendered area: `[−border, width + border]` on x and z. If the area is smaller than the view on an axis, the target is centred on that axis. If `pitch − fov/2` is 0.05 rad or less, which means the view reaches the horizon, z isn't clamped.
- **North overhang** (`northOverhang`): tall terrain on the map, like an interior's 2.5-unit back wall, rises into view from north of the ground rectangle. The min-z bound is extended by `height / tan(pitch − fov/2)`, where `height` is the tallest tile inside the map, so the whole wall stays visible. It is 0 for flat maps.
- **Sprite stretch** (`spriteStretch`) is `1 / cos(pitch)`.

## Post-processing (`PostEffects.tsx`)

`<EffectComposer multisampling={4}>` runs, in order:

| Effect | Settings |
|---|---|
| `Bloom` | `mipmapBlur`, intensity `postfx.bloom` (default 0.55), `luminanceThreshold` 0.85, smoothing 0.3, radius 0.7 |
| `TiltShift2` × 2 | Horizontal and vertical passes, blur `postfx.tiltShift` (default 0.12), taper 0.3, 10 samples |
| `HueSaturation` | saturation `postfx.saturation` (default 0, range −1..1) |
| `ToneMapping` | `ToneMappingMode.ACES_FILMIC` |
| `Vignette` | offset 0.3, darkness `postfx.vignette` (default 0.55) |

- **Tilt-shift focus line:** every frame, the player's position plus 0.8 up is projected to the screen. Both tilt-shift passes get `start = [0, y]` and `end = [1, y]`, a horizontal focus line at the player's screen height, with y clamped to 0.2..0.8. `TiltShift2` blurs away from the line from `start` to `end`, and its default is a vertical line, which is why the line is set explicitly.
- **Bloom threshold 0.85:** anything meant to glow (lamps, screens, crystals, window glass, water glints) needs emissive or colour output above about 1, for example `emissiveIntensity` of 1.5–3.
- **Tone mapping:** `EffectComposer` sets the renderer's tone mapping to none, so the `ToneMapping` effect does it. ACES was chosen over AgX, which looked grey and flat in testing.
- `environment.postfx` overrides the defaults per map. The demo interiors use `tiltShift: 0.07`.

## Wind (`wind.ts`)

- `windUniforms.uWindTime` is one shared uniform, updated by `GameLoop` from `runtime.time`.
- `applyWind(material, strength)` patches `material.onBeforeCompile` to sway vertices sideways in proportion to their local `y`, so the geometry's base must sit at y = 0. The phase comes from the instance or model origin, so neighbouring plants move out of step. It sets `customProgramCacheKey` to `wind-<strength>`.
- `applyWind` **replaces** any existing `onBeforeCompile`, so it can't be combined with another shader patch on the same material.

## Performance notes

- In step 4 verification, the town rendered at about 68 fps average with a 3840×2160 backbuffer (DPR 2), using about 229 WebGL draw calls per frame. That count includes the shadow and post-processing passes.
- The main costs are the 4096² sun shadow map on the town, two tilt-shift passes, mipmap bloom and 4× MSAA at DPR 2.
- Every point light, including each `lamp`, adds cost to every lit material. Keep lamp counts modest.
- Decorations are instanced and terrain is merged per surface, so extra tiles are cheap. Extra prefabs are not: each is its own set of meshes.
- The loop never idles. A browser tab left open on the dev server keeps the GPU busy, so close it when you're done ([testing.md](testing.md)).
