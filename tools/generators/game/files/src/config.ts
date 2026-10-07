import { characterModelSheet, type GameConfig } from 'shoeboxtheatre'

import { start } from './maps/start'

export const gameConfig: GameConfig = {
  title: '<%= title %>',
  start: { map: 'start', x: 3, y: 3, facing: 'down' },
  player: { sprite: 'hero' },
  maps: { start },
  characters: {
    hero: characterModelSheet({
      hair: 'short',
      outfit: 'tunic',
      palette: { skin: '#f2c9a0', hair: '#4d3127', top: '#3569b5', bottom: '#34406a', shoes: '#4a3024' },
    }),
  },
}
