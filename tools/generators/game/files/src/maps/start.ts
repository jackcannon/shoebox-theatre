import { TILES, type MapDefinition } from 'shoeboxtheatre'

export const start: MapDefinition = {
  id: 'start',
  name: '<%= title %>',
  tiles: [
    'TTTTTTT',
    'T,,,,,T',
    'T,,,,,T',
    'T,,,,,T',
    'T,,,,,T',
    'T,,,,,T',
    'TTTTTTT',
  ],
  palette: { T: TILES.tree, ',': TILES.grass },
  border: 4,
  environment: {
    background: '#a9d3e8',
    fog: { color: '#c4dde6', near: 30, far: 75 },
    hemisphere: { sky: '#d6ebff', ground: '#6b8f4a', intensity: 0.9 },
    ambient: { color: '#ffffff', intensity: 0.25 },
    sun: { color: '#fff0d6', intensity: 2.8, direction: [-0.55, 1, 0.65] },
  },
}
