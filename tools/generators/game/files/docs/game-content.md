# Game content: <%= title %>

`games/<%= name %>/` is the workspace `<%= name %>`. Its `src/` imports the engine as `shoeboxtheatre`. The file paths below are relative to `games/<%= name %>/src/`.

## Files

| File | Contents |
|---|---|
| `config.ts` | `gameConfig`: title "<%= title %>", start `{ map: 'start', x: 3, y: 3, facing: 'down' }`, player `{ sprite: 'hero' }`, the `start` map and the `hero` character |
| `maps/start.ts` | `start`: a 7 × 7 grass clearing ringed by trees, with a 4-tile border |
| `maps/maps.test.ts` | Checks every map in `gameConfig`: ids, row widths, warps, NPC tiles and the start tile |

## Deployment

The Dokku app is `<%= app %>`, with `GAME=<%= name %>`. The `deploy` target in `package.json` pushes to it; see `docs/deployment.md` at the repo root.
