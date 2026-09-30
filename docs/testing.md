# Testing and verification

## Unit tests

`yarn test` runs `vitest run` using the `test` block in `vite.config.ts`: `environment: 'node'` and `include: ['src/**/*.test.ts']`. Test files sit next to the code they test. There is no DOM, WebGL or React renderer in tests, so only pure logic and data can be tested: `world/`, `scripting/`, the character part grids, the character model renderer and map definitions. Importing `gameConfig` works in node even though it pulls in the whole engine index (React, three.js and CSS), because nothing renders at import time.

There are 8 files and 55 tests:

| File | Tests | Covers |
|---|---|---|
| `src/engine/world/collision.test.ts` | 7 | `moveBox`: contact at `tile − r` and `tile + 1 + r`, sliding on the free axis, blocking by dynamic boxes, ignoring boxes off to the side, moving out of an overlapping tile or box |
| `src/engine/world/TileMap.test.ts` | 5 | Parsing and dimensions, errors for uneven rows and unknown characters, `getClamped` edge extension, out-of-bounds counts as solid |
| `src/engine/world/World.test.ts` | 10 | Player stops at solid tiles, object footprints and NPCs; 8-way `heading` on diagonal input with 4-way facing, and the heading snapping back to a changed facing; the corner nudge into a 1-tile gap; `findInteraction` for NPCs and objects with text; `facingFromInput` on diagonals |
| `src/engine/scripting/DialogueController.test.ts` | 4 | Typewriter reveal and confirm-to-complete, page resolution and close, choice cursor with confirm, cancel picks the last option. Uses a fake `Input` that only has `wasPressed`. |
| `src/engine/assets/characterSprites.test.ts` | 4 | 16×24 frame; every head, body and leg row is 16 wide and fits in the frame |
| `src/engine/sprites/renderSheet.test.ts` | 3 | `renderCharacterSheet`: a 72×256 sheet with no empty frame, left-facing rows that mirror the right-facing ones, identical output on a second render |
| `src/game/maps/town.test.ts` | 1 | The town is 22 rows of exactly 24 tiles |
| `src/game/maps/maps.test.ts` | 21 | For every map in `gameConfig`: registered under its own id, equal row widths, warp sources walkable, warp targets exist and land on walkable in-bounds tiles, NPCs on walkable tiles. Also checks the start tile is walkable. |

`maps.test.ts` runs over `gameConfig.maps`, so new maps are checked automatically.

Known test-output noise: vitest prints a `THREE_CJS_DEPRECATED` warning. It is harmless.

## Full check

Run all three before handing work back or committing:

```bash
yarn test && yarn build && yarn lint
```

- `yarn build` runs `tsc -b`, so it is also the type check. The bundle-size advisory is expected.
- `yarn lint` must report 0 errors. There are currently 24 known warnings ([known-issues.md](known-issues.md)). Don't add new ones.

## Running the game

`yarn dev` serves http://localhost:5173. Check in the browser any change that affects rendering, the look, input, the UI, scripting flow or map layout; unit tests can't see those.

### Debug handle

In dev builds only (`import.meta.env.DEV`), `Shoebox` sets `window.__shoebox` to the live `GameRuntime`:

```js
__shoebox.world.player                        // Character: x, z, facing, tileX, tileZ
__shoebox.world.def.id                        // current map id
__shoebox.warp({ map: 'lab', x: 7, y: 10 })   // teleport with the normal fade
__shoebox.world.player.x = 5.5                // direct teleport within the map
__shoebox.flags.set('metMom')
__shoebox.ui.getState()                       // dialogue, choice, fade, banner, loading, worldId
__shoebox.playerFree                          // false while a script or transition runs
```

### Driving input from automation

`Input` listens on `window` and reads `KeyboardEvent.code`:

```js
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
// wait N ms for a walk, or one frame or more for a press
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }))
```

- Confirm is `Space`, `Enter`, `KeyZ` or `KeyE`. Cancel is `Escape`, `KeyX` or `Backspace`. Run is `ShiftLeft` held.
- A press only counts on the frame after `keydown`, so leave at least one frame (about 20 ms) before `keyup`.
- Dialogue pages need one confirm to finish typing, or wait for it to finish, then another to advance.
- To read the result, poll `__shoebox.ui.getState().dialogue` and `choice`, `__shoebox.world.def.id` and the player position with `Runtime.evaluate`, rather than relying on fixed sleeps.

### Behaviours to spot-check

Go through this checklist after gameplay or rendering changes. Every item passed when the engine was first built:

1. Loading finishes and the town renders sprites with shadows, trees, water, the dock, flowers, fences and tall grass, with no console errors.
2. Walking and running with Shift work. The player collides with houses, trees and fences and slides along them.
3. Pushing up on `(5,7)` fades into `playerHouse1F` with the banner, and pressing down on the mat returns.
4. The stairs go to 2F and back. The bed's nap choice works for both Yes and No.
5. Mom's line changes after the first talk. NPCs face the player while talking and resume their AI afterwards.
6. In the lab, the professor's choice and his changed line after the crystals, and both aides, work.
7. The north trigger walks the player back. Wade on the dock is reachable.

Expected console noise: two `THREE.Clock: This module has been deprecated` warnings from react-three-fiber internals. `src/` doesn't use `Clock`.

### Clean up

The render loop never idles, so a tab left open on the game keeps the GPU and fans busy.

- **Stop the dev server** you started. Check `lsof -nP -iTCP:5173 -sTCP:LISTEN` and kill the process.
- **Close the browser tab**, or navigate it to `about:blank` if it can't be closed. A page that is already loaded keeps rendering after the server stops.
