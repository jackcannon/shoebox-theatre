import { describe, expect, it } from 'vitest'
import { town } from './town'

describe('town map', () => {
  it('is 22 rows of exactly 24 tiles', () => {
    expect(town.tiles).toHaveLength(22)
    for (const row of town.tiles) expect(row).toHaveLength(24)
  })
})
