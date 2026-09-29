# Known issues and limitations

Keep this list current. When you fix an item, remove it. When you find or introduce one, add it.

## Bugs

- **A script that walks a character after `ctx.warp()` never finishes.** `ctx.player` and `ctx.self` are bound to the `World` the script started in (`GameRuntime.createContext`). After a warp that world is discarded, so a `walk` on those handles never resolves and the player stays locked. The workaround is in [scripting.md](scripting.md#gotchas). A fix would resolve `player` and `self` lazily from `this.world`, and settle pending `moveTo` promises when a world is replaced.
- **The typewriter counts UTF-16 code units.** `dialogue.text.slice(0, visible)` can briefly show half of a surrogate pair (most emoji) while typing. The current text uses no such characters.

## Limitations

- **No persistence.** `Flags`, the current map and the player's position live only in memory. A reload restarts the game.
- **No audio, menus, battles, touch input or day/night cycle.** See [extending.md](extending.md#not-built-yet).
- **Collision is 2D.** Tile `height` is visual only. There are no jumps, ramps with collision or multi-level maps.
- **Characters face 4 ways only**, although movement is 8-way.
- **NPC AI is local:** random turning and 1-tile steps, with no pathfinding or schedules. Scripted `walk` ignores collision.
- **`once` triggers reset on every map load**, because `firedTriggers` lives on the `World`. Use a flag for once-per-game events.
- **Point lights are costly.** Each `lamp` prefab and each `environment.lights` entry is a real point light, and none cast shadows.
- **The loop always renders.** It never idles, even when nothing changes.
- **Upright sprites overlap.** Side-by-side characters can touch while talking, and a character standing directly behind another is partly hidden. This is normal for upright sprite billboards.
- **Window glass reads near-white in interiors**, due to its emissive glass, the additive light shaft and bloom.

## Build and lint

- **Bundle size.** Vite warns that the single JS chunk is over 500 kB (about 1.31 MB, 363 kB gzipped). There is no code splitting yet.
- **24 oxlint warnings, 0 errors.** Each was reviewed and none is a real bug; most flag normal R3F patterns:
  - `react(only-export-components)`: 6 in `render/decorations.tsx` and 3 in `prefabs/parts.tsx`. These files export helpers or non-component constants next to components, which only affects fast refresh.
  - `react(immutability)`: 1 each in `render/decorations.tsx` and `render/Water.tsx`, 3 in `render/Particles.tsx` and 2 in `render/FollowCamera.tsx`. These are deliberate per-frame mutation of three.js objects, uniforms and buffers inside `useFrame` or effects.
  - `react(purity)`: 4 in `render/Particles.tsx`. `Math.random()` seeds particle positions inside `useMemo`.
  - `react-hooks(exhaustive-deps)` and `react(use-memo)`: 2 in `render/decorations.tsx` (`useDisposable` forwards a caller's deps) and 1 in `prefabs/parts.tsx` (`useGenerated` is keyed by `key` on purpose).
  - `react(set-state-in-effect)`: 1 in `Shoebox.tsx`. The runtime is created in an effect on purpose, for StrictMode safety.

  Don't add new warnings. If you fix one of these, update the count here and in [testing.md](testing.md).
- **Console noise:** `THREE.Clock: This module has been deprecated` (twice, from react-three-fiber internals) in the browser, and `THREE_CJS_DEPRECATED` in vitest. Both are harmless.
