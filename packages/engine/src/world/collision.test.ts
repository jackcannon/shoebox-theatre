import { describe, expect, it } from 'vitest'
import { boxAround, moveBox } from './collision'

const R = 0.3
const wallAtX3 = (x: number) => x === 3
const open = () => false

describe('moveBox', () => {
  it('stops at a wall with contact at tile − r', () => {
    const result = moveBox(2.5, 0.5, R, 1, 0, wallAtX3)
    expect(result.x).toBeCloseTo(3 - R)
    expect(result.z).toBe(0.5)
    expect(result.blockedX).toBe(true)
    expect(result.blockedZ).toBe(false)
  })

  it('stops at a wall on the negative side with contact at tile + 1 + r', () => {
    const result = moveBox(4.5, 0.5, R, -1, 0, wallAtX3)
    expect(result.x).toBeCloseTo(4 + R)
    expect(result.blockedX).toBe(true)
  })

  it('slides along a wall on the free axis', () => {
    const result = moveBox(2.5, 0.5, R, 1, 0.5, wallAtX3)
    expect(result.x).toBeCloseTo(3 - R)
    expect(result.z).toBeCloseTo(1)
    expect(result.blockedX).toBe(true)
    expect(result.blockedZ).toBe(false)
  })

  it('is blocked by dynamic boxes', () => {
    const npc = boxAround(3.5, 0.5, 0.38)
    const result = moveBox(2.5, 0.5, R, 1, 0, open, [npc])
    expect(result.x).toBeCloseTo(npc.minX - R)
    expect(result.blockedX).toBe(true)
  })

  it('ignores dynamic boxes that are off to the side', () => {
    const npc = boxAround(3.5, 2.5, 0.38)
    const result = moveBox(2.5, 0.5, R, 1, 0, open, [npc])
    expect(result.x).toBeCloseTo(3.5)
    expect(result.blockedX).toBe(false)
  })

  it('allows moving out of an overlapping solid tile', () => {
    const result = moveBox(2.9, 0.5, R, -0.5, 0, wallAtX3)
    expect(result.x).toBeCloseTo(2.4)
    expect(result.blockedX).toBe(false)
  })

  it('allows moving out of an overlapping dynamic box', () => {
    const npc = boxAround(3.2, 0.5, 0.38)
    const result = moveBox(2.9, 0.5, R, -0.5, 0, open, [npc])
    expect(result.x).toBeCloseTo(2.4)
    expect(result.blockedX).toBe(false)
  })
})
