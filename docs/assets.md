# Assets: textures, pixel art and character sprites

All art is generated in code at load time, and the only static asset is `public/favicon.svg`. The pipeline accepts image URLs, so real art can replace or join the generated art without engine changes. External assets go in `public/`, with their source and licence recorded here.

## `AssetManager` (`assets/AssetManager.ts`)

`runtime.assets` is the registry and cache for every texture and sprite sheet.

```ts
type TextureSource = ({ url: string } | { draw: () => HTMLCanvasElement }) & TextureOptions
interface TextureOptions { pixelArt?: boolean; mipmaps?: boolean }
```

| Method | Behaviour |
|---|---|
| `registerTexture(id, source)` | Registers or replaces a source. It disposes any cached texture for that id. |
| `registerSpriteSheet(id, def)` | Stores the sheet and registers its texture as `sheet:<id>` with `mipmaps: false` by default |
| `preload(onProgress?)` | Loads every registered URL and paints every `draw` source that isn't cached yet, reporting progress from 0 to 1 |
| `texture(id)` | Returns the cached texture. It paints a `draw` source on first use. It throws for an unknown id, or for a URL source that wasn't preloaded. |
| `generated(key, draw, options?)` | Caches parametric art under `generated:<key>`. Only the first `draw` for a key is kept, so **the key must encode every parameter `draw` uses**. |
| `spriteSheet(id)` | Returns `{ texture, frameWidth, frameHeight, pixelsPerUnit, columns, rows }`, with `pixelsPerUnit` defaulting to `PIXELS_PER_UNIT` and columns and rows derived from the image size |
| `dispose()` | Disposes every cached texture |

`configure()` applies these settings to every texture:

- `SRGBColorSpace` and `RepeatWrapping` on both axes.
- **`pixelArt`** (default true) gives nearest-neighbour magnification. Set it to false for soft gradients such as `blob`, `dot` and `lightShaft`.
- **`mipmaps`** (default true) enables trilinear mipmaps and anisotropy 8, which stops distant terrain shimmering. Turn it off for sprite sheets and cut-outs. The min filter is then nearest, or linear if `pixelArt` is false.

**Registration order** in the `GameRuntime` constructor:

1. `BUILTIN_TEXTURES`, overlaid by `config.textures`, so the same id replaces a built-in
2. `config.characters`, one sprite sheet each

`start()` preloads everything before the first map loads. Painting happens then, and `Loading` shows the progress.

## Built-in textures (`assets/builtinTextures.ts`)

All are `draw` sources painted with `PixelCanvas`. The image size sets the world scale: 16 px is 1 unit.

| Group | Ids |
|---|---|
| Terrain tops | `grass`, `path`, `sand`, `seabed`, `dock`, `woodFloor`, `tileFloor`, `wallTop`, `stone` |
| Vertical faces | `bank`, `cliff`, `dockSide`, `wallpaper`, `wallpaperBlue`, `labWall` |
| Foliage | `leaves`, `bark`, `flowers` (2 frames side by side, no mipmaps), `tallGrass` (no mipmaps) |
| Soft light shapes | `blob` (contact shadow), `dot` (particles), `lightShaft` (window beams). All three have `pixelArt: false` and no mipmaps. |

Prefab-specific art (facades, roofs, bricks, bookshelves, screens and so on) isn't registered. Prefabs paint it on demand through `useGenerated`, using the painters in `prefabs/prefabTextures.ts` ([prefabs.md](prefabs.md)).

## Pixel helpers (`assets/pixel.ts`)

- **`PIXELS_PER_UNIT = 16`.**
- **`PixelCanvas(width, height, wrap = true)`** is an RGBA buffer with `set`, `rect`, `fill`, `pattern(rows, colors, ox, oy, mirror)` and `toCanvas()`. With `wrap`, drawing past an edge wraps round, so tiling textures are seamless. With `wrap = false`, off-canvas pixels are clipped. `pattern` skips `.` and any character missing from `colors`.
- **`shade(hex, amount)`** is pixel-art shading. A negative amount mixes towards cool purple `#1e1630`, a positive one towards warm white `#fff4da`.
- **`mixColor(a, b, t)`** is linear RGB mixing of hex colours.
- **Internal helpers:** `tileableNoise`, `ditherPick` (4×4 Bayer ordered dithering) and `noiseFill` build textures.
- **Determinism:** textures use `createRng(seed)` (mulberry32) from `math.ts`, and decoration placement uses `hashTile`. Neither uses `Math.random()`, so art is identical on every load. Keep it that way. `Math.random()` is used only for NPC AI timing and particles.

## Character sprite sheets

`SpriteSheetDefinition` is `{ texture: TextureSource, frameWidth, frameHeight, pixelsPerUnit? }`. `pixelsPerUnit` is sheet pixels per world unit and defaults to `PIXELS_PER_UNIT` (16). **Layout** (`SPRITE_ROWS`):

- 3 columns: stand, step A, step B
- 4 rows: down (0), left (1), right (2), up (3)
- optionally 4 more: down-left (4), down-right (5), up-left (6), up-right (7)

A sheet with all 8 rows shows the character's 8-way `heading`; a 4-row sheet shows its 4-way `facing` ([world.md](world.md#character)). The walk cycle plays stand, A, stand, B.

The engine can generate sheets in two ways:

- `characterModelSheet(model)` renders an 8-row, 24×32, 21 px-per-tile sheet from a 3D character model. The demo uses it for every character. See [character-models.md](character-models.md).
- `generatedCharacter(look)`, described below, paints a 4-row, 16×24 sheet at 16 px per tile from pixel-grid parts.

### `generatedCharacter(look)` (`assets/characterSprites.ts`)

It builds a sheet definition whose texture paints a **48×96** canvas of **16×24** frames (`FRAME_WIDTH`, `FRAME_HEIGHT`), with `mipmaps: false`.

```ts
interface CharacterLook {
  head: 'short' | 'cap' | 'long' | 'bun'
  body: 'tunic' | 'dress' | 'coat'
  palette: { hair; skin; top; accent; bottom; shoes; eyes?; outline? }
}
```

- **Parts:** `CHARACTER_PARTS` holds pixel grids of 16-character rows:
  - `heads[style][dir]` and `bodies[style][dir]`, each with a `y` offset
  - `legs[dir]` as three frames, at `legsY = 19`

  Only `down`, `up` and `right` are drawn. The left row is the right row mirrored.
- **Draw order:** legs, then body, then head, so the head overlaps.
- **Palette keys in the grids:**

  | Key | Colour |
  |---|---|
  | `o` | outline (default `#261a2b`) |
  | `H`, `S`, `C`, `A`, `P` | hair, skin, top, accent (hat, belt, apron), bottom (legs) |
  | `h`, `s`, `c`, `a`, `p` | shadow tones, derived automatically with `shade` |
  | `E` | eyes (default `#1f1a2e`) |
  | `W` | white `#f6f2e8` |
  | `B` | shoes |
  | `.` | transparent |

  `bottom` is trousers, or the skin colour for bare legs under a dress.
- `characterSprites.test.ts` checks that every row is exactly 16 characters and that every part fits inside the 24 px frame. Keep it passing when you edit parts.

### Using a PNG instead

Draw frames in the same 3 × 4 (or 3 × 8) layout, then register the sheet in `config.characters`:

```ts
characters: {
  guard: { texture: { url: '/sprites/guard.png', mipmaps: false }, frameWidth: 16, frameHeight: 24 },
}
```

Files in `public/` are served from `/`. URL sources are preloaded at start. A sprite's width in the world is `frameWidth / pixelsPerUnit`. Sheets drawn at a density other than 16 px per tile set `pixelsPerUnit`, and their pixels then don't line up with the world's pixel grid.
