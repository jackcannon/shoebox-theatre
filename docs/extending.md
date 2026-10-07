# Extending the engine

Game content is data plus a few components, registered through `GameConfig`. Most additions need no engine changes. Each recipe lists where the code goes and which docs to update. The root [`README.md`](../README.md#how-to-extend) has longer, type-checked code examples for most of these.

First decide whether the change is **content** (`games/<game>/src`, for the demo `games/mossvale/src`) or **engine** (`packages/engine/src`):

- If only this game needs it, it's content.
- If any game built on the engine could use it, it's engine code. Engine code must not know about Mossvale or any other game. Export anything games need from `packages/engine/src/index.ts`.

## Add a game

### Which games go where

| Put the game in this monorepo (`games/<game>`) when | Give the game its own repo when |
|---|---|
| It is small, like Mossvale | It needs a pinned engine version and its own release speed |
| It can always use the latest engine source | It needs different people with access |
| Its dependencies are small | It has large binary assets (art, audio, Git LFS) |
| An engine change can fix it in the same commit | It adds large dependencies that slow every monorepo build |

Size alone is not the reason; Nx handles big projects well. A game in its own repo installs a published `shoeboxtheatre` version ([releasing.md](releasing.md)) and deploys on its own ([deployment.md](deployment.md#games-in-their-own-repos)).

### Add a game to this monorepo

Run the local Nx generator in `tools/generators`:

```bash
yarn nx g ./tools/generators:game <name> --title="<Title>" --app=<dokku app>
```

- `<name>` is the folder and workspace name, in kebab-case. `--title` defaults to the name in title case, and `--app` defaults to the name.
- It creates `games/<name>` and runs `yarn install`:
  - `package.json`: the engine's peer packages and `"shoeboxtheatre": "workspace:^"` as dependencies, plus the dev tools. The versions come from `packages/engine/package.json` and the installed `@vitejs/plugin-react`. It also has the `dev`, `build`, `preview`, `typecheck` and `test` scripts and a `deploy` target for the Dokku app.
  - `vite.config.ts`, `tsconfig.json` and `src/main.tsx`, `src/App.tsx`: copies of Mossvale's.
  - `index.html` with the title.
  - `src/config.ts` with a `hero` character, and `src/maps/start.ts`, a grass clearing ringed by trees.
  - `src/maps/maps.test.ts`: the map integrity test.
  - `docs/game-content.md`.
- The generator code is `tools/generators/game/generator.cjs`, and its template files are in `tools/generators/game/files/` (EJS placeholders `<%= name %>`, `<%= title %>` and `<%= app %>`). Change the templates when Mossvale's shared files change.

Then:

1. Run `yarn nx run <name>:dev`. It also uses port 5173, so stop any other game's dev server first.
2. Link the game's docs from `docs/README.md`.
3. Ask Jack to create the Dokku app and set `GAME` ([deployment.md](deployment.md#setting-up-an-app-for-a-new-game)), then run `yarn deploy`.

`yarn dev` always runs Mossvale. For another game, use `yarn nx run <name>:dev`.

### Move a game out of the monorepo

1. Clone the monorepo into a new folder.
2. Keep only the game's history: `git filter-repo --subdirectory-filter games/<game>`. `git filter-repo` is one Python file: <https://github.com/newren/git-filter-repo>.
3. Add the files a single-game repo needs, copied from the template repo ([`jackcannon/shoebox-theatre-game-template`](https://github.com/jackcannon/shoebox-theatre-game-template)): `.yarnrc.yml` (with `npmPreapprovedPackages`), `.gitignore`, `.buildpacks`, `.dokku.env` (`NGINX_ROOT='dist'`), an empty `.static`, `.oxlintrc.json` and `AGENTS.md`.
4. In `package.json`: change `"shoeboxtheatre": "workspace:^"` to the latest published range, remove the `nx` field, add the `packageManager` field, and add a `lint` script.
5. In `tsconfig.json`, copy the options from `tsconfig.base.json` without `customConditions`. In `vite.config.ts`, remove the `@shoeboxtheatre/source` conditions, and inline `shoeboxtheatre` in Vitest ([deployment.md](deployment.md#games-in-their-own-repos)). The published package does not include the engine source.
6. Run `yarn install`, `yarn test`, `yarn build` and a browser check.
7. Create the GitHub repo and push.
8. Ask Jack to run `ssh dokku@ssh.cannonbury.co.uk config:unset --no-restart <app> GAME`, then deploy from the new repo.
9. In the monorepo: delete `games/<game>`, update the docs and commit.

## Add a map

1. Create `games/mossvale/src/maps/<id>.ts` exporting a `MapDefinition` whose `id` equals its key in `config.maps`.
2. Write `tiles` as equal-length rows (north first), and a `palette` built from `TILES` presets (`{ ...TILES.wall, side: 'labWall' }`).
3. Add `objects`, `npcs`, `warps` and `triggers`, remembering that `y` is the row. Use `environment` (reuse `outdoorDay`/`indoorWarm`) and `camera` (reuse `interiorCamera` for rooms). Give outdoor maps a `border`.
4. Register it in `config.maps` and add warps both ways (see the door convention in [world.md](world.md#warps-and-triggers)).
5. Run `yarn test`, because `maps.test.ts` checks the new map, then check it in the browser.
6. **Docs:** add it to [game-content.md](../games/mossvale/docs/game-content.md), both the map table and the links between maps.

## Add an NPC or a script

1. Add an `NpcDefinition` to the map's `npcs`. `id` must be unique on the map, `sprite` must be a `config.characters` key, and it must stand on a walkable tile.
2. Use `dialogue` for plain text, or `interact: async (ctx) => { ... }` for logic ([scripting.md](scripting.md)). Store story state in `ctx.flags`.
3. Pick a `behavior`: `idle`, `look` or `wander` with a `radius`.
4. For a new look, add a `CharacterModel` to `characterModels.ts`, following [game-art-style.md](../games/mossvale/docs/game-art-style.md#rules-for-new-characters). `characters.ts` turns it into a sheet with `characterModelSheet` ([character-models.md](character-models.md)).
5. **Docs:** [game-content.md](../games/mossvale/docs/game-content.md) (characters, scripts and flags), and [game-art-style.md](../games/mossvale/docs/game-art-style.md) for a new character.

## Add a tile type or surface

- **Tile type:** add a palette entry, spreading an existing preset. Add it to `TILES` in `world/surfaces.ts` only if it is generally useful. That is an engine change, so update [world.md](world.md).
- **Surface:** register a texture (below), then add `surfaces: { id: { texture, anchor?, color?, roughness? } }` to the config. An engine-wide surface goes in `DEFAULT_SURFACES` instead. **Docs:** [world.md](world.md) for engine surfaces.

## Add a texture

- **Generated:** add `textures: { id: { draw: () => canvas } }` to the config. Paint with `PixelCanvas` (exported) at 16 px per tile, and keep it deterministic, so no `Math.random()`. `createRng` and `hashTile` aren't exported from the engine index yet; export them deliberately if game code needs them.
- **From a file:** put the image in `public/`, then register `textures: { id: { url: '/file.png' } }`. Add `pixelArt: false` for painted art and `mipmaps: false` for cut-outs and sprites.
- An engine-wide built-in goes in `BUILTIN_TEXTURES`. **Docs:** [assets.md](assets.md).

## Add a decoration

A decoration renders every tile whose `TileType.decoration` matches its id, for the whole map plus border, in one component:

1. Write a `DecorationComponent` (`({ id, instances, map }) => JSX`). Instance it (see `render/decorations.tsx`): use `hashTile` for stable jitter, `applyWind` for sway with the geometry based at y = 0, and dispose what you create.
2. Register it with `decorations: { id: Component }` in the config, or in `DEFAULT_DECORATIONS` for the engine.
3. Reference it from a tile type: `{ ...TILES.grass, decoration: 'id', solid?: true }`.
4. **Docs:** [rendering.md](rendering.md#decorations-decorationstsx) for engine decorations; [game-content.md](../games/mossvale/docs/game-content.md) for game ones.

## Add a prefab

1. Write a `PrefabComponent` (`({ object, w, d }) => JSX`) following the conventions in [prefabs.md](prefabs.md):
   - local `[0..w] × [0..d]`, with the front at `z = d`
   - `prop()` for settings, `useGenerated()` with a complete key, `Box` for parts
   - emissive above 1 to glow
2. Register it with `prefabs: { id: Component }` in the config, or in `DEFAULT_PREFABS` for the engine.
3. Place it: `{ type: 'id', x, y, w?, d?, solid?, text? | interact?, props? }`.
4. **Docs:** add a row to the built-in table in [prefabs.md](prefabs.md) for engine prefabs.

## Add UI

Follow [ui.md](ui.md#adding-a-ui-element): new state in `uiStore`, a writer in the runtime, a component in `packages/engine/src/ui`, styles in `ui.css`, input through `Input`.

## Add engine behaviour (new script commands, map fields, systems)

1. Add the types in `types.ts` or `scripting/ScriptContext.ts`.
2. Implement it where it belongs:
   - map rules in `world/` (keep it free of three.js and React)
   - orchestration in `core/GameRuntime.ts`
   - visuals in `render/`
3. Export anything game code needs from `packages/engine/src/index.ts`.
4. Add unit tests for pure logic.
5. **Docs:** the subsystem doc, [architecture.md](architecture.md) if the frame flow, lifecycle or public API changed, and `README.md` if user-facing.

## Tune the look

The knobs are per map: `environment` (background, fog, ambient, hemisphere, sun, lights, particles, postfx) and `camera`. Fixed values, such as the bloom threshold, tilt-shift taper, tone-mapping mode and shadow bias, are in `render/PostEffects.tsx` and `render/Lighting.tsx` ([rendering.md](rendering.md)). Verify look changes with before and after screenshots at a fixed player position.

## Not built yet

These are the natural next features. Each would change the docs listed.

| Feature | Sketch | Docs |
|---|---|---|
| Audio | Music per map (for example `environment.music`) and sound effects from warps and the typewriter | architecture, rendering or a new audio doc |
| Save/load | Serialise the map, player tile and facing, and flags. `Flags` needs list and restore methods. | scripting, architecture |
| Menus | Open on cancel when `playerFree`, with new UI store fields and an overlay component | ui, architecture |
| Battles | An encounter check on entering `tallGrass` tiles, handing off to a battle scene | world, architecture |
| Touch controls | An on-screen d-pad feeding `Input` | architecture (input), README controls |
| Day/night | Animate the sun, ambient and fog, and switch lamps on at dusk | rendering |
| Code splitting | Split three.js and postprocessing into their own chunks | stack |
