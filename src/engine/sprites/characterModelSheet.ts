import type { SpriteSheetDefinition } from '../assets/AssetManager'

import type { CharacterModel } from './model'
import { MODEL_SHEET, renderCharacterSheet } from './renderSheet'

/**
 * Sprite sheet rendered from a 3D character model when the game preloads its textures.
 * @param model - character model
 * @returns 72×256 sheet definition: 24×32 frames at 21 px per tile, 8 directions
 */
export function characterModelSheet(model: CharacterModel): SpriteSheetDefinition {
  return {
    texture: {
      mipmaps: false,
      draw: () => {
        const sheet = renderCharacterSheet(model)
        const canvas = document.createElement('canvas')
        canvas.width = sheet.width
        canvas.height = sheet.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2D canvas is not supported')
        ctx.putImageData(new ImageData(new Uint8ClampedArray(sheet.data), sheet.width, sheet.height), 0, 0)
        return canvas
      },
    },
    ...MODEL_SHEET,
  }
}
