import { describe, expect, it } from 'vitest'

import type { CharacterModel } from './model'
import { MODEL_SHEET, renderCharacterSheet, type SheetImage } from './renderSheet'

const MODEL: CharacterModel = {
  hair: 'spiky',
  outfit: 'tunic',
  palette: { skin: '#f2c9a0', hair: '#4d3127', top: '#3569b5', bottom: '#34406a', shoes: '#4a3024', cap: '#d9493e' },
}

const { frameWidth: W, frameHeight: H } = MODEL_SHEET

function frame(sheet: SheetImage, col: number, row: number, mirror = false): number[] {
  const out: number[] = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = col * W + (mirror ? W - 1 - x : x)
      const o = ((row * H + y) * sheet.width + sx) * 4
      out.push(...sheet.data.subarray(o, o + 4))
    }
  }
  return out
}

describe('renderCharacterSheet', () => {
  const sheet = renderCharacterSheet(MODEL)

  it('renders 3 columns by 8 rows of 24×32 frames, none of them empty', () => {
    expect([sheet.width, sheet.height]).toEqual([W * 3, H * 8])
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 3; col++) expect(frame(sheet, col, row).some((v) => v > 0)).toBe(true)
    }
  })

  it('mirrors the left-facing rows from the right-facing ones', () => {
    for (const [left, right] of [
      [1, 2],
      [4, 5],
      [6, 7],
    ]) {
      expect(frame(sheet, 0, left)).toEqual(frame(sheet, 0, right, true))
    }
  })

  it('is deterministic', () => {
    expect(renderCharacterSheet(MODEL).data).toEqual(sheet.data)
  })
})
