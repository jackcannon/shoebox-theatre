import type { MapDefinition, TileType } from '../types'

/** Parsed, queryable version of a map's ASCII layout. */
export class TileMap {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly border: number
  /** Height used for faces that look out past the rendered area */
  readonly baseHeight = -0.5
  private readonly tiles: TileType[] = []

  constructor(def: Pick<MapDefinition, 'id' | 'tiles' | 'palette' | 'border'>) {
    this.id = def.id
    this.height = def.tiles.length
    this.width = def.tiles[0]?.length ?? 0
    this.border = def.border ?? 0
    def.tiles.forEach((row, z) => {
      if (row.length !== this.width) {
        throw new Error(`Map "${def.id}": row ${z} has ${row.length} tiles, expected ${this.width}`)
      }
      for (let x = 0; x < row.length; x++) {
        const type = def.palette[row[x]]
        if (!type) throw new Error(`Map "${def.id}": unknown tile "${row[x]}" at ${x},${z}`)
        this.tiles.push(type)
      }
    })
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height
  }

  /** Whether a tile is inside the rendered area (map + border). */
  inRegion(x: number, z: number): boolean {
    const b = this.border
    return x >= -b && z >= -b && x < this.width + b && z < this.height + b
  }

  get(x: number, z: number): TileType | undefined {
    return this.inBounds(x, z) ? this.tiles[z * this.width + x] : undefined
  }

  /** Tile lookup that extends edge tiles outwards, used to render the border scenery. */
  getClamped(x: number, z: number): TileType {
    const cx = Math.min(this.width - 1, Math.max(0, x))
    const cz = Math.min(this.height - 1, Math.max(0, z))
    return this.tiles[cz * this.width + cx]
  }

  heightAt(x: number, z: number): number {
    return this.getClamped(Math.floor(x), Math.floor(z)).height ?? 0
  }

  isSolid(x: number, z: number): boolean {
    const tile = this.get(x, z)
    return !tile || tile.solid === true
  }
}
