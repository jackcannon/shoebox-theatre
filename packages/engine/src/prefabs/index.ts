import type { PrefabComponent } from '../types'

import { Building } from './Building'
import {
  Bed,
  Bookshelf,
  Counter,
  Desk,
  Doormat,
  Machine,
  Painting,
  Pedestal,
  Plant,
  Rug,
  Stairs,
  Table,
  Tv,
  WallWindow,
} from './furniture'
import { Lamp, Mailbox, Sign } from './outdoor'

export const DEFAULT_PREFABS: Record<string, PrefabComponent> = {
  building: Building,
  sign: Sign,
  mailbox: Mailbox,
  lamp: Lamp,
  table: Table,
  bookshelf: Bookshelf,
  counter: Counter,
  tv: Tv,
  bed: Bed,
  plant: Plant,
  rug: Rug,
  stairs: Stairs,
  desk: Desk,
  machine: Machine,
  pedestal: Pedestal,
  window: WallWindow,
  doormat: Doormat,
  painting: Painting,
}
