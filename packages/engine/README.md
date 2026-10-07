# Shoebox Theatre

A game engine for 2D sprites in real 3D worlds. Flat pixel-art characters stand in a lit, miniature 3D world, with real shadows, bloom, a tilt-shift blur and an eased follow camera. Use it for any genre and any look.

A shoebox theatre is a home-made toy theatre: a shoebox turned on its side, with card scenery and cut-out characters standing inside it. This engine does the same thing in code.

Shoebox Theatre runs in the browser on React 19, three.js and React Three Fiber. Maps, characters, dialogue and scripts are data in a `GameConfig`, and all built-in art is generated in code.

## Install

```sh
yarn add shoeboxtheatre react react-dom three @react-three/fiber @react-three/postprocessing postprocessing
```

The React, three.js and React Three Fiber packages are peer dependencies, so your game has exactly one copy of each.

The package is for bundlers: it ships ES modules that import CSS files. Use a bundler that handles CSS imports, such as [Vite](https://vite.dev).

## Quick start

```tsx
import { createRoot } from 'react-dom/client'
import { characterModelSheet, Shoebox, TILES, type GameConfig } from 'shoeboxtheatre'

const gameConfig: GameConfig = {
  title: 'My Game',
  start: { map: 'field', x: 2, y: 2, facing: 'down' },
  player: { sprite: 'hero' },
  characters: {
    hero: characterModelSheet({
      hair: 'short',
      outfit: 'tunic',
      palette: { skin: '#f2c9a0', hair: '#4d3127', top: '#3569b5', bottom: '#34406a', shoes: '#4a3024' },
    }),
  },
  maps: {
    field: {
      id: 'field',
      name: 'The Field',
      tiles: ['TTTTT', 'T,,,T', 'T,,,T', 'T,,,T', 'TTTTT'],
      palette: { T: TILES.tree, ',': TILES.grass },
      environment: {
        background: '#a9d3e8',
        hemisphere: { sky: '#d6ebff', ground: '#6b8f4a', intensity: 0.9 },
        sun: { color: '#fff0d6', intensity: 2.8, direction: [-0.55, 1, 0.65] },
      },
    },
  },
}

createRoot(document.getElementById('root')!).render(<Shoebox config={gameConfig} />)
```

Keep `gameConfig` a module-level constant: `Shoebox` creates a new game whenever the `config` object changes.

Pass `debug` (for example `debug={import.meta.env.DEV}`) to expose the running game as `window.__shoebox` for the browser console.

## Documentation

The full documentation, and a complete demo game, are in the [GitHub repository](https://github.com/jackcannon/shoebox-theatre):

- [Architecture and public API](https://github.com/jackcannon/shoebox-theatre/blob/master/docs/architecture.md)
- [Maps, movement and collision](https://github.com/jackcannon/shoebox-theatre/blob/master/docs/world.md)
- [Scripting and dialogue](https://github.com/jackcannon/shoebox-theatre/blob/master/docs/scripting.md)
- [Extending the engine](https://github.com/jackcannon/shoebox-theatre/blob/master/docs/extending.md)

## Licence

MIT
