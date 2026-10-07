import { TILES, type MapDefinition } from 'shoeboxtheatre'
import { indoorWarm, interiorCamera } from './environments'

export const playerHouse1F: MapDefinition = {
  id: 'playerHouse1F',
  name: 'Your House',
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
    W: { ...TILES.wall, side: 'wallpaper' },
    '.': TILES.woodFloor,
  },
  objects: [
    { type: 'bookshelf', x: 1, y: 1, w: 2, text: 'Cookbooks, gardening guides and one very dusty photo album.' },
    { type: 'tv', x: 3, y: 1, text: 'A cooking show is on. The chef is explaining how to boil water… for the third time.' },
    { type: 'window', x: 4, y: 0, w: 2, solid: false },
    { type: 'counter', x: 6, y: 1, w: 2, text: 'The kitchen smells like fresh bread.' },
    { type: 'painting', x: 8, y: 0, solid: false, text: 'A painting of the sea at sunset.' },
    { type: 'stairs', x: 9, y: 1, solid: false },
    { type: 'rug', x: 3, y: 3, w: 4, d: 3, solid: false, props: { color: '#b8433a' } },
    { type: 'table', x: 4, y: 4, w: 2, props: { vase: true } },
    { type: 'plant', x: 1, y: 7 },
    { type: 'plant', x: 9, y: 7 },
    { type: 'doormat', x: 5, y: 7, solid: false },
  ],
  npcs: [
    {
      id: 'mom',
      sprite: 'mom',
      name: 'Mom',
      x: 7,
      y: 4,
      facing: 'left',
      behavior: { type: 'look' },
      interact: async (ctx) => {
        if (ctx.flags.has('metMom')) {
          await ctx.say("Don't keep the professor waiting! His lab is the big building to the south.", 'Mom')
          return
        }
        await ctx.say(
          [
            'Oh, good morning, sleepyhead!',
            "Professor Hawthorne stopped by earlier. He'd like you to visit his lab when you're ready.",
          ],
          'Mom',
        )
        ctx.flags.set('metMom')
      },
    },
  ],
  warps: [
    { x: 5, y: 7, dir: 'down', to: { map: 'town', x: 5, y: 7, facing: 'down' } },
    { x: 9, y: 1, to: { map: 'playerHouse2F', x: 8, y: 2, facing: 'down' } },
  ],
  environment: {
    ...indoorWarm,
    lights: [
      { position: [3, 2.2, 3.5], intensity: 10, distance: 9 },
      { position: [7.5, 2.2, 4.5], intensity: 10, distance: 9 },
    ],
  },
  camera: interiorCamera,
}
