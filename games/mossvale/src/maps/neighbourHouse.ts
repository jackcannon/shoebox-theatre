import { TILES, type MapDefinition } from 'shoeboxtheatre'
import { indoorWarm, interiorCamera } from './environments'

export const neighbourHouse: MapDefinition = {
  id: 'neighbourHouse',
  name: 'Birch House',
  tiles: [
    'WWWWWWWWWWW',
    'W.........W',
    'W.........W',
    'W.........W',
    'W.........W',
    'W.........W',
    'W.........W',
    'W.........W',
  ],
  palette: {
    W: { ...TILES.wall, side: 'wallpaperBlue' },
    '.': TILES.woodFloor,
  },
  objects: [
    { type: 'bookshelf', x: 1, y: 1, w: 2, text: 'A shelf packed with travel guides.' },
    { type: 'window', x: 4, y: 0, w: 2, solid: false },
    { type: 'painting', x: 7, y: 0, solid: false, text: 'A painting of mountains under a starry sky.' },
    { type: 'counter', x: 8, y: 1, w: 2 },
    { type: 'rug', x: 3, y: 3, w: 4, d: 3, solid: false, props: { color: '#7a4f9a' } },
    { type: 'table', x: 4, y: 4, w: 2 },
    { type: 'plant', x: 1, y: 7 },
    { type: 'plant', x: 9, y: 7 },
    { type: 'doormat', x: 5, y: 7, solid: false },
  ],
  npcs: [
    {
      id: 'ivy',
      sprite: 'sister',
      name: 'Ivy',
      x: 3,
      y: 5,
      behavior: { type: 'wander', radius: 1 },
      dialogue: [
        'Hi! My little brother ran off to the lab at sunrise.',
        "He's probably pestering the professor with questions again.",
      ],
    },
  ],
  warps: [{ x: 5, y: 7, dir: 'down', to: { map: 'town', x: 17, y: 7, facing: 'down' } }],
  environment: {
    ...indoorWarm,
    lights: [
      { position: [3, 2.2, 3.5], intensity: 10, distance: 9 },
      { position: [7.5, 2.2, 4.5], intensity: 10, distance: 9 },
    ],
  },
  camera: interiorCamera,
}
