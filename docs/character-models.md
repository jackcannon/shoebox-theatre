# Character models: sprite sheets rendered from 3D

`src/engine/sprites/` turns a small description of a character, a `CharacterModel`, into an 8-direction pixel-art walk sheet. It builds the character from signed-distance shapes, sphere-traces it with an orthographic camera, then shades and inks the result as pixel art. The rendering happens in code when the game preloads, like every other generated texture ([assets.md](assets.md)).

This doc covers the engine side: the API, the sheet format and the rendering pipeline. What a particular game's characters look like belongs to that game; for the Mossvale demo it's [game-art-style.md](game-art-style.md).

## Files

| File | Contents |
|---|---|
| `sdf.ts` | Shapes (`ellipsoid`, `capsule`, `roundBox`), combinators (`intersect`, `smoothUnion`, `above`, `rotX`), `segmentParam`, the view basis (`makeView`), the sphere tracer (`trace`) and `project` |
| `model.ts` | `CharacterModel`, `CharacterModelPalette`, `HairStyle`, `Outfit`; the body proportions, walk poses, hair styles, cap and outfits; `buildModel(model, pose)` |
| `renderSheet.ts` | `MODEL_SHEET`, `SheetImage`, and `renderCharacterSheet(model)`: shading, line art, face, outline and sheet layout |
| `characterModelSheet.ts` | `characterModelSheet(model)`, the `SpriteSheetDefinition` whose `draw` source paints the rendered sheet onto a canvas |
| `renderSheet.test.ts` | Sheet size, mirroring and determinism ([testing.md](testing.md)) |

Everything except the `draw` callback in `characterModelSheet.ts` is free of three.js, React and the DOM, so it runs in node tests.

## API

`characterModelSheet(model)` and the types `CharacterModel`, `CharacterModelPalette`, `HairStyle` and `Outfit` are exported from `src/engine/index.ts`.

```ts
interface CharacterModel {
  hair: 'spiky' | 'short' | 'long' | 'bun'
  outfit: 'tunic' | 'dress' | 'coat'
  palette: CharacterModelPalette
  scale?: number // size relative to an adult, default 1; feet stay on the ground
}
```

| Palette key | Colours | Default |
|---|---|---|
| `skin` | Face, neck, hands, and bare legs | required |
| `hair` | Hair; its shadow and highlight tones are derived | required |
| `top` | Shirt, dress or coat, including sleeves | required |
| `bottom` | Trousers | `skin` (bare legs) |
| `shoes` | Boots | required |
| `cap` | Adds a peaked cap. The brim is `cap` mixed 10% towards black. | no cap |
| `emblem` | Adds an oval badge to the front of the cap | no badge |
| `undershirt` | The V-neck of a tunic or coat | `#efe4c8` |
| `belt` | The tunic belt | `#5e3b25` |
| `apron` | Adds an apron down the front, from just above the hem to below the shoulders | no apron |
| `tie` | Adds a narrow tie down the V-neck of a tunic or coat | no tie |

| Hair style | Shape |
|---|---|
| `spiky` | Seven spikes fanning back and down from under the cap line, one over each ear, three short ones along the hairline, and hair over the temples ending in pointed sideburns. Shaded by distance from the head centre rather than by the light: dark within 1.1 head radii, mid to 1.24, light beyond. |
| `short` | A close shell behind the ears and over the crown, three fringe tufts at uneven lengths, two tufts at the nape and a tuft over each ear |
| `long` | A fuller shell, a curtain of hair down the back to the waist, a lock at each side of the face down to the chin, and the fringe |
| `bun` | The short shell, the fringe, and a bun on the back of the crown |

| Outfit | Shape |
|---|---|
| `tunic` | Shirt to the hips with a V-neck (`undershirt`) and a belt at the waist, trousers, short sleeves |
| `dress` | Top and a flared skirt to just below the knee, no V-neck, short sleeves |
| `coat` | Coat to the knee with a deep V-neck, an optional tie, long sleeves, and trousers below |

Sleeves cover the first 20% of the forearm, or 80% for `coat`.

## Sheet format

- `MODEL_SHEET` is `{ frameWidth: 24, frameHeight: 32, pixelsPerUnit: 21 }`. A sheet is 72×256 px: 3 columns (stand, step A, step B) by 8 rows in `SPRITE_ROWS` order (down, left, right, up, down-left, down-right, up-left, up-right). `CharacterSprite` shows the diagonal rows from the character's `heading` ([rendering.md](rendering.md#character-sprites-charactersprite-tsx)).
- At 21 px per tile a frame is about 1.14 tiles wide and 1.52 tiles tall before the pitch stretch. Model pixels are therefore about three-quarters the size of world pixels, which are 16 per tile.
- Only 5 facings are rendered (down, down-right, right, up-right, up). The left-facing rows are mirror images of the right-facing ones, so every model is left-right symmetric.
- `characterModelSheet` sets `mipmaps: false`. The sheet has no margin between frames.

## Model space

Feet are at `y = 0`, the model is about 1 unit tall, it faces +z, and +x is the character's own left. The proportions are chibi: a head of radius 0.235 centred at `y = 0.715`, so the head is about 45% of the height. The shoulders are at 0.46, the waist at 0.3 and the knees at 0.13.

Each `Prim` in the model is an `Sdf` plus a `group` (head, torso, each arm, each leg) and a material name, or a function from the hit position to a material name. Materials are `skin`, `hair`, `hairLo`, `hairHi`, `top`, `shirt`, `tie`, `belt`, `apron`, `legs`, `shoes`, `cap`, `brim` and `emblem`.

`POSES` holds the three walk frames. The first is standing. In the two steps, the front leg swings 0.4 rad forward and the back leg 0.34 rad back with its knee bent 0.55 rad, and each arm swings 0.5 rad opposite its leg.

## Rendering pipeline

`renderCharacterSheet` renders each facing and pose once, as follows:

1. **Trace.** `buildModel(model, pose)` builds the prims. `trace` casts one orthographic ray per pixel, with the camera turned to the facing (0°, 45°, 90°, 135° or 180°) and pitched 10° down. The scale is 27 px per model unit times `model.scale`, with 1 empty row below the feet. It records the material, group, depth, normal and model-space z of each hit.
2. **Shade.** The light is fixed per facing in camera space (`VIEW_LIGHT`) and always comes from above and in front. Every material gets two flat bands. The light value is `(n·l + 0.35) / 1.35`, plus a small bias for skin, `shirt` and `emblem` (`LIGHT_BIAS`). Below 0.36 a pixel takes `shade(colour, −0.38)`, and above it `shade(colour, +0.05)`; `shade` moves towards cool purple in shadow and warm white in light. Skin, `shirt`, `emblem` and `brim` scale that amount down (`CONTRAST`), and skin shadows mix towards `#8a3a44` instead. Hair uses a 3-tone ramp instead: `hair` mixed 40% towards black, `hair` itself, and `hair` mixed 22% towards `#ffd9a8`. Light-shaded hair takes the dark tone in shadow and the mid tone in light. The `hairLo` and `hairHi` materials shift one step down or up. `spiky` hair ignores the light: its `hairLo`, `hair` and `hairHi` regions take the dark, mid and light tones.
3. **Clean up.** Isolated pixels are dropped, single-pixel holes are filled, and a lone tone inside a material is replaced by the surrounding tone (despeckle).
4. **Line art.** `#141018` lines go inside the silhouette. Between two different parts, the line goes on the part that comes earlier in `INK_ORDER` (shoes, legs, hair, top, cap, skin), so faces and hands keep their pixels. Within one part, a line goes where a different group is in front by more than 0.02 units, for example an arm over the body or overlapping legs. `hairLo`/`hairHi` count as hair; `shirt`, `tie`, `belt` and `apron` count as top; `brim` and `emblem` count as cap. There are no lines between skin and cap, or around the nape.
5. **Face.** Eyes are 1×3 px columns of `#1f1a2e`, stamped onto visible skin at ±0.42 head radii across and 0.22 below the head centre. The mouth is 2 px, or 1 px in side view, of skin mixed towards `#9a3a44`. The up and up-right facings have no face.
6. **Outline.** A 1 px `#141018` outline around the silhouette.

There is no randomness, so a model always renders the same pixels. A sheet takes about 50 ms to render (about 120 ms with `spiky` hair) in bun on the development machine. It runs synchronously while `AssetManager.preload` paints `draw` sources behind the loading screen.

## Adding a hair style or outfit

- **Hair:** add the name to `HairStyle`, write a function from `HairParts` (the shared shell, face cut and nape cut) to prims, and register it in `HAIR`. Add it to `POSITION_SHADED_HAIR` if it should shade by position.
- **Outfit:** add the name to `Outfit` and a hem height and radius to `HEM`, then branch on it in `torso`'s material function, and in the sleeve length in `buildModel` if needed.
- Check the result in all 5 rendered facings and all 3 poses. Then update the tables above.
