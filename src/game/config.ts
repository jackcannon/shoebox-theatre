import type { GameConfig } from '../engine'
import { lab } from './maps/lab'
import { neighbourHouse } from './maps/neighbourHouse'
import { playerHouse1F } from './maps/playerHouse1F'
import { playerHouse2F } from './maps/playerHouse2F'
import { town } from './maps/town'

import { characters } from './characters'

export const gameConfig: GameConfig = {
  title: 'Mossvale: a Shoebox Theatre demo',
  start: { map: 'town', x: 5, y: 8, facing: 'down' },
  player: { sprite: 'hero' },
  maps: { town, playerHouse1F, playerHouse2F, neighbourHouse, lab },
  characters,
}
