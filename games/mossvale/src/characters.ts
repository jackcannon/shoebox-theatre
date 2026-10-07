import { characterModelSheet, type SpriteSheetDefinition } from 'shoeboxtheatre'

import { characterModels } from './characterModels'

export const characters: Record<string, SpriteSheetDefinition> = Object.fromEntries(
  Object.entries(characterModels).map(([id, model]) => [id, characterModelSheet(model)]),
)
