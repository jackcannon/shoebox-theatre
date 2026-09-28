import { describe, expect, it } from 'vitest'
import { CHARACTER_PARTS, FRAME_HEIGHT, FRAME_WIDTH } from './characterSprites'

const { heads, bodies, legs, legsY } = CHARACTER_PARTS

function expectFits(name: string, y: number, rows: string[]) {
  for (const [i, row] of rows.entries()) {
    expect(row.length, `${name} row ${i}`).toBe(FRAME_WIDTH)
  }
  expect(y, `${name} top`).toBeGreaterThanOrEqual(0)
  expect(y + rows.length, `${name} bottom`).toBeLessThanOrEqual(FRAME_HEIGHT)
}

describe('CHARACTER_PARTS', () => {
  it('uses a 16×24 frame', () => {
    expect(FRAME_WIDTH).toBe(16)
    expect(FRAME_HEIGHT).toBe(24)
  })

  it('has head rows that are 16 wide and fit in the frame', () => {
    for (const [style, parts] of Object.entries(heads)) {
      for (const [dir, part] of Object.entries(parts)) expectFits(`head ${style} ${dir}`, part.y, part.rows)
    }
  })

  it('has body rows that are 16 wide and fit in the frame', () => {
    for (const [style, parts] of Object.entries(bodies)) {
      for (const [dir, part] of Object.entries(parts)) expectFits(`body ${style} ${dir}`, part.y, part.rows)
    }
  })

  it('has three leg frames per direction that are 16 wide and fit in the frame', () => {
    for (const [dir, frames] of Object.entries(legs)) {
      expect(frames, `legs ${dir}`).toHaveLength(3)
      frames.forEach((rows, frame) => expectFits(`legs ${dir} frame ${frame}`, legsY, rows))
    }
  })
})
