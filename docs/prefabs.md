# Prefabs: 3D props placed as map objects

A prefab is a React component that draws one kind of `MapObject` (buildings, signs, lamps, furniture). Its gameplay side (solidity, text, scripts) comes from the `MapObject`, not the component, so a prefab is purely visual.

## Contract

```ts
type PrefabComponent = ComponentType<PrefabProps>
interface PrefabProps { object: MapObject; w: number; d: number }
```

- **Where it renders:** `MapScene` renders `runtime.prefabs[object.type]` inside a group at the footprint's north-west corner, at the footprint centre's ground height. The prefab draws in local space over `[0..w] × [0..d]`, with its front (south, camera-facing) face at `z = d` ([coordinates-and-units.md](coordinates-and-units.md#footprints)).
- **What the map object controls:** the object's `solid` (default true), `text` and `interact` control collision and interaction, whatever the prefab draws. Mark walk-on props (rugs, doormats, stairs) and wall-mounted props `solid: false`.
- **Registration:** `DEFAULT_PREFABS` lives in `prefabs/index.ts`. `config.prefabs` is merged over it, so a matching id replaces a built-in.
- **Lifetime:** prefabs remount on every map load, together with the rest of `MapScene`.

## Helpers (`prefabs/parts.tsx`, all exported from the engine index)

| Helper | Use |
|---|---|
| `prop(object, key, fallback)` | Typed read of `object.props[key]`. The fallback sets the expected type, and a missing or wrong-typed value returns the fallback. |
| `propNumbers(object, key)` | `number[]` from an array prop, dropping anything that isn't a number |
| `useGenerated(key, draw, options?)` | Cached canvas texture via `assets.generated`. **The key must include every parameter `draw` uses**, for example `` `rug:${width}x${depth}:${color}` ``. `draw` isn't a memo dependency, and only the first `draw` for a key is ever painted. |
| `Box` | A box mesh with `size`, `position`, `color`, `map`, `tiled`, `emissive`, `emissiveIntensity`, `roughness` (default 0.9), `castShadow` (default true), `rotation`. It always receives shadows. With `tiled`, its UVs are rescaled so `map` repeats at 16 px per unit on every face instead of stretching; use it for `stone` and bricks. It disposes its geometry. |

`useRuntime()` gives access to `runtime.assets.texture(id)` for registered textures, `runtime.time` for animation and `runtime.world` for map queries.

## Conventions for writing prefabs

- **Multi-material boxes** attach one material per face: `<mesh><boxGeometry/><meshStandardMaterial attach="material-4" .../>…</mesh>`. Face order is +x, −x, +y, −y, **+z (front)**, −z. `furniture.tsx` has a private `FrontBox` helper that puts a texture on the front face and a plain colour on the other five.
- **Shadows:** solid parts cast and receive shadows. Flat floor overlays (rugs, doormats) only receive, and use `polygonOffset` to avoid z-fighting with the floor.
- **Glow:** emissive parts need `emissiveIntensity` above about 1 to pass the bloom threshold of 0.85. Existing values run from 1.3 (window glass) to 3 (lamp lantern).
- **Animation:** animate in `useFrame` by writing to refs, using `runtime.time` as the clock. Never use React state for animation.
- **Texture sizes:** pass canvas painters whole-pixel sizes (`Math.round(units * 16)`), because fractional sizes break the canvas.
- **Painters:** they live in `prefabs/prefabTextures.ts`. There are `drawFacade`, `drawRoof`, `drawBricks`, `drawBookshelf`, `drawCabinets`, `drawScreen('tv' | 'pc')`, `drawRug`, `drawQuilt`, `drawMachinePanel(…, emissive)`, `drawPainting`, `drawStripes` and `drawSignBoard`. Each is seeded with `createRng`, so it paints the same image every time.
- **Disposal:** dispose any geometry or material you create by hand (`useMemo` plus a `useEffect` cleanup). JSX-declared geometries and materials are disposed by R3F.

## Built-in prefabs

| Id | Component (file) | Props (default) | Notes |
|---|---|---|---|
| `building` | `Building` (`Building.tsx`) | `style` `'cottage' \| 'lab'` (`'cottage'`), `wall` (`#efe2c4`, lab `#e4e8e6`), `trim` (`#7a5234`, lab `#5c6f86`), `roof` (`#c24b3a`), `height` (2), `door` column offset (1), `windows` column offsets (none), `chimney` (true for cottages) | Walls inset 0.15 per side, a tiled `stone` foundation, painted facades (door and windows on the front, one window on each side of a cottage), a custom gable roof with the ridge along x (rise `d × 0.42`, lab `d × 0.25`, overhang 0.28), an awning and doorstep at the door, a brick chimney, and a blinking red antenna light on the lab |
| `sign` | `Sign` (`outdoor.tsx`) | — | Post and board with a painted front |
| `mailbox` | `Mailbox` | `color` (`#c9483b`) | Post, box, slot and flag |
| `lamp` | `Lamp` | — | Iron post about 1.95 tall with an emissive lantern (intensity 3) and a real `pointLight` (intensity 6, distance 5, no shadow) |
| `table` | `Table` (`furniture.tsx`) | `vase` (false) | Top at 0.75 with four legs; `vase` adds a vase of flowers |
| `bookshelf` | `Bookshelf` | `seed` (from position) | 2.0 tall and 0.5 deep, at the back of the tile; the seed varies the books |
| `counter` | `Counter` | — | Cabinets 0.84 high and 0.7 deep with a stone top, plus a sink and tap on the first tile |
| `tv` | `Tv` | — | Stand and TV with an emissive, gently flickering screen |
| `bed` | `Bed` | `color` (`#4f7fc0`) | Frame, mattress, pillow at the north end and a quilt blanket. Use `d: 2`. |
| `plant` | `Plant` | — | Terracotta pot with leafy icosahedron blobs |
| `rug` | `Rug` | `color` (`#3f6fa8`) | Flat, receive-only plane covering `w × d` |
| `stairs` | `Stairs` | `down` (false) | Five steps and a rail. By default the steps rise towards the back wall. `down` reverses them so they descend towards the back wall. Keep the tile walkable, since it holds the warp. |
| `desk` | `Desk` | — | Desk with a PC monitor (emissive `drawScreen('pc')`) and a keyboard |
| `machine` | `Machine` | `seed` (from position) | Tall grey box with a painted panel and a pulsing emissive map |
| `pedestal` | `Pedestal` | — | Round table with three emissive crystals (cyan, pink, gold) that bob and spin |
| `window` | `WallWindow` | — | **Wall-mounted.** Frame, emissive glass and sill, plus an additive `lightShaft` plane sloping 2.5 tiles out onto the floor and a soft light patch |
| `doormat` | `Doormat` | `color` (`#b8433a`) | Striped floor mat |
| `painting` | `Painting` | — | **Wall-mounted.** Gilt frame and painted canvas at y ≈ 1.6 |

**Wall-mounted prefabs** (`window`, `painting`) go on a row-0 wall tile with `solid: false`. Their group origin is the wall top (2.5), so `useFloorOffset` works out the height difference to the tile just south and drops the group to floor level. They then draw on the wall's south face, at local `z = d`.

**Building doors:** the facade's door is painted at column offset `door`. The warp for it goes on the tile just south of the footprint, `(x + door, y + d)`, with `dir: 'up'`. The whole footprint is solid, so the door is reached by standing on that tile and pushing up.
