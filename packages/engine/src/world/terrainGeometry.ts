import type { SurfaceDefinition } from '../types'

import type { TileMap } from './TileMap'

export interface SurfaceMesh {
  positions: number[]
  normals: number[]
  uvs: number[]
  indices: number[]
}

/** World units covered by one repeat of a surface's texture, [u, v]. */
export type SurfaceScale = (surfaceId: string) => [number, number]

type Vec3 = [number, number, number]

function meshFor(meshes: Map<string, SurfaceMesh>, id: string): SurfaceMesh {
  let mesh = meshes.get(id)
  if (!mesh) {
    mesh = { positions: [], normals: [], uvs: [], indices: [] }
    meshes.set(id, mesh)
  }
  return mesh
}

/** Corners must be counter-clockwise when viewed from the front. */
function pushQuad(mesh: SurfaceMesh, corners: Vec3[], normal: Vec3, uvs: [number, number][]): void {
  const base = mesh.positions.length / 3
  corners.forEach((c, i) => {
    mesh.positions.push(...c)
    mesh.normals.push(...normal)
    mesh.uvs.push(...uvs[i])
  })
  mesh.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

const SIDES: { dx: number; dz: number; normal: Vec3 }[] = [
  { dx: 0, dz: 1, normal: [0, 0, 1] },
  { dx: 0, dz: -1, normal: [0, 0, -1] },
  { dx: 1, dz: 0, normal: [1, 0, 0] },
  { dx: -1, dz: 0, normal: [-1, 0, 0] },
]

/**
 * Builds top and side faces for every tile in the rendered region, grouped by surface id.
 * @param map - tile map (border tiles are edge-extended)
 * @param surfaces - surface registry, used for side-face texture anchoring
 * @param scaleOf - texture repeat size of a surface in world units
 * @returns geometry buffers per surface id
 */
export function buildTerrain(
  map: TileMap,
  surfaces: Record<string, SurfaceDefinition>,
  scaleOf: SurfaceScale,
): Map<string, SurfaceMesh> {
  const meshes = new Map<string, SurfaceMesh>()
  const b = map.border
  const heightAt = (x: number, z: number) =>
    map.inRegion(x, z) ? (map.getClamped(x, z).height ?? 0) : map.baseHeight

  for (let z = -b; z < map.height + b; z++) {
    for (let x = -b; x < map.width + b; x++) {
      const tile = map.getClamped(x, z)
      const h = tile.height ?? 0

      if (tile.ground !== 'none') {
        const [su, sv] = scaleOf(tile.ground)
        pushQuad(
          meshFor(meshes, tile.ground),
          [
            [x, h, z + 1],
            [x + 1, h, z + 1],
            [x + 1, h, z],
            [x, h, z],
          ],
          [0, 1, 0],
          [
            [x / su, -(z + 1) / sv],
            [(x + 1) / su, -(z + 1) / sv],
            [(x + 1) / su, -z / sv],
            [x / su, -z / sv],
          ],
        )
      }

      const sideId = tile.side ?? tile.ground
      if (sideId === 'none') continue
      const [su, sv] = scaleOf(sideId)
      const anchorTop = surfaces[sideId]?.anchor === 'top'
      for (const { dx, dz, normal } of SIDES) {
        const low = heightAt(x + dx, z + dz)
        if (low >= h - 1e-3) continue
        const v = (y: number) => (anchorTop ? 1 - (h - y) / sv : (y - low) / sv)
        let a: [number, number]
        let bEnd: [number, number]
        let u0: number
        if (dz === 1) {
          a = [x, z + 1]
          bEnd = [x + 1, z + 1]
          u0 = x
        } else if (dz === -1) {
          a = [x + 1, z]
          bEnd = [x, z]
          u0 = -(x + 1)
        } else if (dx === 1) {
          a = [x + 1, z + 1]
          bEnd = [x + 1, z]
          u0 = -(z + 1)
        } else {
          a = [x, z]
          bEnd = [x, z + 1]
          u0 = z
        }
        pushQuad(
          meshFor(meshes, sideId),
          [
            [a[0], low, a[1]],
            [bEnd[0], low, bEnd[1]],
            [bEnd[0], h, bEnd[1]],
            [a[0], h, a[1]],
          ],
          normal,
          [
            [u0 / su, v(low)],
            [(u0 + 1) / su, v(low)],
            [(u0 + 1) / su, v(h)],
            [u0 / su, v(h)],
          ],
        )
      }
    }
  }
  return meshes
}
