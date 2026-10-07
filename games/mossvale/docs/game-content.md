# Game content: Mossvale Village

`games/mossvale/` is the demo game, the workspace `mossvale`. Its `src/` is data and scripts only, and it imports the engine as `shoeboxtheatre`. The file paths below are relative to `games/mossvale/src/`. All names, text and art are original. It must never contain names, text or assets from any commercial game, or any other copyrighted material.

## Files

| File | Contents |
|---|---|
| `config.ts` | `gameConfig`: title "Mossvale: a Shoebox Theatre demo", start `{ map: 'town', x: 5, y: 8, facing: 'down' }`, player `{ sprite: 'hero' }`, the five maps and `characters`. It doesn't override textures, surfaces, decorations or prefabs. |
| `characterModels.ts` | `characterModels`: the `CharacterModel` of every character ([game-art-style.md](game-art-style.md)) |
| `characters.ts` | `characters`: a `characterModelSheet` for each entry in `characterModels` |
| `maps/environments.ts` | Shared `outdoorDay` and `indoorWarm` environments, and `interiorCamera` |
| `maps/town.ts` | `town` |
| `maps/playerHouse1F.ts`, `maps/playerHouse2F.ts`, `maps/neighbourHouse.ts`, `maps/lab.ts` | The four interiors |
| `maps/town.test.ts`, `maps/maps.test.ts` | Content tests ([testing.md](../../../docs/testing.md)) |

`gameConfig` must stay a module-level constant: `Shoebox` recreates the runtime whenever the `config` object changes.

## Characters

Every character sheet is rendered from a `CharacterModel` when the game loads ([character-models.md](../../../docs/character-models.md)). All of them have 24×32 frames at 21 px per tile, with 8 directions. Their look and palettes are described in [game-art-style.md](game-art-style.md).

| Id | Hair | Outfit | Used by |
|---|---|---|---|
| `hero` | spiky, with cap | tunic | the player |
| `mom` | bun | dress | Mom |
| `florist` | long | dress | Poppy |
| `elder` | short | tunic | Old Tomas |
| `fisher` | short, with cap | tunic | Wade |
| `kid` | short | tunic | Pip |
| `professor` | short | coat | Prof. Hawthorne |
| `aide` | short | coat | Aide Juniper, Aide Rook |
| `sister` | long | dress | Ivy |

## Environments and cameras

- **`outdoorDay`:**
  - sky background `#a9d3e8`, fog `#c4dde6` from 30 to 75
  - hemisphere light 0.9, ambient 0.25
  - warm sun at intensity 2.8 from `[−0.55, 1, 0.65]`
  - 80 pollen motes
  - default post-processing
- **`indoorWarm`:**
  - near-black background, warm ambient 0.5, hemisphere light 0.4
  - sun at intensity 1.1 from `[−0.4, 1, 0.8]`
  - 40 dust motes
  - `postfx: { tiltShift: 0.07 }`

  Each interior adds its own warm point lights at y ≈ 2.2 (intensity 10, distance 9). The lab uses cool white `#e8f0ff` lights at y 2.3 and overrides the ambient to `#f0f4ff` at 0.4.
- **Cameras:** the town uses the default camera (fov 30, pitch 40, distance 18) with `border: 6`. The interiors use `interiorCamera = { fov: 32, pitch: 40, distance: 15 }` with no border. The pitch matches the town; interiors stay a little closer.

## Maps

| Id | Name | Size | Palette | Contents |
|---|---|---|---|---|
| `town` | Mossvale Village | 24 × 22 | `T` tree, `,` grass, `.` path, `"` tall grass, `f` flowers, `=` fence, `b` bush, `s` sand, `~` water, `d` dock | 3 buildings, 3 signs, a mailbox, 4 lamps, 4 NPCs, 3 door warps, 1 trigger |
| `playerHouse1F` | Your House | 11 × 8 | `W` wall (`wallpaper`), `.` wood floor | Bookshelf, TV, window, counter, painting, stairs, rug, table with vase, 2 plants, doormat, Mom |
| `playerHouse2F` | Your Room | 10 × 7 | `W` wall (`wallpaper`), `.` wood floor, `v` opening (`ground: 'none'`) | Bed (nap script), window, desk, TV, bookshelf, stairs (`down: true` on `v`), rug, plant |
| `neighbourHouse` | Birch House | 11 × 8 | `W` wall (`wallpaperBlue`), `.` wood floor | Bookshelf, window, painting, counter, rug, table, 2 plants, doormat, Ivy |
| `lab` | Hawthorne Lab | 15 × 12 | `W` wall (`labWall`), `.` tile floor | 4 bookshelves, window, 3 plants, 3 machines, crystal pedestal, 2 desks, doormat, the professor and two aides |

Every interior has a wall on row 0, walls down both sides and no front wall. Its exit is a doormat on the bottom row.

### Town layout

- **Buildings** (door warp in brackets):
  - the player's house at `(4,4)`, 4×3 with a red roof and a chimney (door `(5,7)`)
  - the Birch house at `(16,4)`, 4×3 with a blue roof (door `(17,7)`)
  - the lab at `(14,11)`, 6×4, `style: 'lab'` (door `(16,15)`)
- **Signs and mailbox:**
  - "MOSSVALE VILLAGE" at `(10,11)`
  - "Your house" at `(3,7)`
  - "HAWTHORNE RESEARCH LAB" at `(13,13)`
  - the Birch mailbox at `(15,7)`
- **Lamps** at `(10,9)`, `(13,9)`, `(10,17)` and `(13,17)`.
- **NPCs:**
  - Poppy, `florist` at `(4,12)`, wanders with radius 2
  - Old Tomas, `elder` at `(9,11)`, `look`
  - Pip, `kid` at `(19,9)`, wanders with radius 3
  - Wade, `fisher` at `(12,20)` on the dock, idle and facing down
- **North exit trigger:** `x 9, y 1, w 6`. It says two lines about tall grass and walks the player one tile back down.
- **South edge:** sand, then sea, with a 2×2-tile dock (columns 11–12, rows 19–20) running out from the central path. Sand tiles set `side: 'sand'` so the drop to the water is sand rather than the grassy `bank` lip. The forest and sea continue into the 6-tile border.

## Links between maps

| From | Tile | Dir | To | Arrive at | Facing |
|---|---|---|---|---|---|
| `town` | (5,7) | up | `playerHouse1F` | (5,7) | up |
| `town` | (17,7) | up | `neighbourHouse` | (5,7) | up |
| `town` | (16,15) | up | `lab` | (7,11) | up |
| `playerHouse1F` | (5,7) | down | `town` | (5,7) | down |
| `playerHouse1F` | (9,1) | — (stairs) | `playerHouse2F` | (8,2) | down |
| `playerHouse2F` | (8,1) | — (stairs) | `playerHouse1F` | (9,2) | down |
| `neighbourHouse` | (5,7) | down | `town` | (17,7) | down |
| `lab` | (7,11) | down | `town` | (16,15) | down |

Stairs arrivals are one tile south of the other floor's stairs tile, so arriving doesn't immediately warp back. Both flights run left to right. The upstairs stairs sit on the `v` opening with `props: { down: true }`: a stairwell cut into the floor, steps dropping from left to right. The ground-floor stairs keep the default and rise from left to right.

## Scripts and flags

| Where | Script | Flag |
|---|---|---|
| Mom (`playerHouse1F`) | First talk: two pages, then sets `metMom`. Later: "Don't keep the professor waiting!…" | `metMom` |
| Bed (`playerHouse2F`) | `choice('Take a quick nap?', ['Yes', 'No'])`. Yes: fade out 500 ms, wait 700, fade in 500, then "You feel refreshed!" | — |
| Pedestal (`lab`) | One line about the humming crystals, then sets `touchedCrystals` | `touchedCrystals` |
| Prof. Hawthorne (`lab`) | If `touchedCrystals`: "…I saw that. Please don't poke the crystals." Then `choice('Would you like to hear about my research?', ['Yes', 'No'])`. Yes gives three research pages; No gives "Another time, then!…" | reads `touchedCrystals` |
| North trigger (`town`) | Two lines, then `ctx.player.walk('down', 1)` | — |

Every other NPC uses a `dialogue` string or array, and every other interactive object uses `text`.
