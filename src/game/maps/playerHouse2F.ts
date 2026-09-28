import { TILES, type MapDefinition } from '../../engine'
import { indoorWarm, interiorCamera } from './environments'

export const playerHouse2F: MapDefinition = {
  id: 'playerHouse2F',
  name: 'Your Room',
  tiles: [
    'WWWWWWWWWW',
    'W........W',
    'W........W',
    'W........W',
    'W........W',
    'W........W',
    'W........W',
  ],
  palette: {
    W: { ...TILES.wall, side: 'wallpaper' },
    '.': TILES.woodFloor,
  },
  objects: [
    {
      type: 'bed',
      x: 1,
      y: 1,
      d: 2,
      props: { color: '#3d6fb0' },
      interact: async (ctx) => {
        const answer = await ctx.choice('Take a quick nap?', ['Yes', 'No'])
        if (answer !== 0) return
        await ctx.fadeOut(500)
        await ctx.wait(700)
        await ctx.fadeIn(500)
        await ctx.say('You feel refreshed!')
      },
    },
    { type: 'window', x: 3, y: 0, w: 2, solid: false },
    { type: 'desk', x: 3, y: 1, w: 2, text: "Your computer. A note on the screen says: 'Remember to save often!'" },
    { type: 'tv', x: 5, y: 1, text: 'A game console is hooked up to the TV. You played until very late last night…' },
    { type: 'bookshelf', x: 6, y: 1, text: "Adventure novels. You've read every one of them twice." },
    { type: 'stairs', x: 8, y: 1, solid: false },
    { type: 'rug', x: 3, y: 3, w: 3, d: 2, solid: false, props: { color: '#4f8f45' } },
    { type: 'plant', x: 8, y: 6 },
  ],
  warps: [{ x: 8, y: 1, to: { map: 'playerHouse1F', x: 9, y: 2, facing: 'down' } }],
  environment: {
    ...indoorWarm,
    lights: [{ position: [4.5, 2.2, 3.5], intensity: 10, distance: 9 }],
  },
  camera: interiorCamera,
}
