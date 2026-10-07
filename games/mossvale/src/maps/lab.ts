import { TILES, type MapDefinition } from 'shoeboxtheatre'
import { indoorWarm, interiorCamera } from './environments'

const JOURNALS = "Research journals: 'On the Migration of Meadow Beetles, Vol. 7'."
const MACHINE = "A machine covered in blinking lights. One button is labelled 'DO NOT PRESS'."
const PROFESSOR = 'Prof. Hawthorne'

export const lab: MapDefinition = {
  id: 'lab',
  name: 'Hawthorne Lab',
  tiles: [
    'WWWWWWWWWWWWWWW',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
    'W.............W',
  ],
  palette: {
    W: { ...TILES.wall, side: 'labWall' },
    '.': TILES.tileFloor,
  },
  objects: [
    { type: 'bookshelf', x: 1, y: 1, w: 2, text: JOURNALS },
    { type: 'bookshelf', x: 3, y: 1, w: 2, text: JOURNALS },
    { type: 'bookshelf', x: 10, y: 1, w: 2, text: JOURNALS },
    { type: 'bookshelf', x: 12, y: 1, w: 2, text: JOURNALS },
    { type: 'window', x: 6, y: 0, w: 3, solid: false },
    { type: 'plant', x: 5, y: 1 },
    { type: 'plant', x: 9, y: 1 },
    { type: 'plant', x: 13, y: 11 },
    { type: 'machine', x: 1, y: 4, text: MACHINE },
    { type: 'machine', x: 1, y: 6, text: MACHINE },
    { type: 'machine', x: 13, y: 4, text: MACHINE },
    {
      type: 'pedestal',
      x: 10,
      y: 4,
      w: 2,
      interact: async (ctx) => {
        await ctx.say('Three crystals hum softly on the pedestal. They feel warm to the touch.')
        ctx.flags.set('touchedCrystals')
      },
    },
    { type: 'desk', x: 1, y: 9, w: 2 },
    { type: 'desk', x: 12, y: 9, w: 2 },
    { type: 'doormat', x: 7, y: 11, solid: false },
  ],
  npcs: [
    {
      id: 'professor',
      sprite: 'professor',
      name: PROFESSOR,
      x: 8,
      y: 4,
      facing: 'down',
      behavior: { type: 'idle' },
      interact: async (ctx) => {
        if (ctx.flags.has('touchedCrystals')) await ctx.say("…I saw that. Please don't poke the crystals.", PROFESSOR)
        const answer = await ctx.choice('Would you like to hear about my research?', ['Yes', 'No'], PROFESSOR)
        if (answer !== 0) {
          await ctx.say('Another time, then! Feel free to look around.', PROFESSOR)
          return
        }
        await ctx.say(
          [
            'This valley is home to farmers, fishers, herons, beetles and more kinds of moss than anyone can count.',
            'I study how we all share it. When the river floods, the meadows bloom, and the whole village eats well.',
            "Look after the valley, and it looks after you. That's my research in a nutshell. The rest is footnotes!",
          ],
          PROFESSOR,
        )
      },
    },
    {
      id: 'juniper',
      sprite: 'aide',
      name: 'Aide Juniper',
      x: 4,
      y: 7,
      behavior: { type: 'wander', radius: 2 },
      dialogue: "I've been cataloguing moss samples for three weeks. There are SO many kinds of moss.",
    },
    {
      id: 'rook',
      sprite: 'aide',
      name: 'Aide Rook',
      x: 11,
      y: 8,
      behavior: { type: 'look' },
      dialogue: "The professor forgets to eat when he's excited. I've started leaving sandwiches on his desk.",
    },
  ],
  warps: [{ x: 7, y: 11, dir: 'down', to: { map: 'town', x: 16, y: 15, facing: 'down' } }],
  environment: {
    ...indoorWarm,
    ambient: { color: '#f0f4ff', intensity: 0.4 },
    lights: [
      { position: [3.5, 2.3, 4.5], color: '#e8f0ff', intensity: 10, distance: 9 },
      { position: [11.5, 2.3, 4.5], color: '#e8f0ff', intensity: 10, distance: 9 },
      { position: [7.5, 2.3, 8.5], color: '#e8f0ff', intensity: 10, distance: 9 },
    ],
  },
  camera: interiorCamera,
}
