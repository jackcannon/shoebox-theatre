import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial } from 'three'

import { PIXELS_PER_UNIT } from '../assets/pixel'
import { useRuntime } from '../core/context'
import type { TileMap } from '../world/TileMap'
import { buildTerrain } from '../world/terrainGeometry'

/** Merged ground and cliff/wall geometry for a map, one mesh per surface. */
export function Terrain({ map }: { map: TileMap }) {
  const runtime = useRuntime()

  const meshes = useMemo(() => {
    const { assets, surfaces } = runtime
    const textureOf = (id: string) => {
      const surface = surfaces[id]
      if (!surface) throw new Error(`Unknown surface "${id}"`)
      return assets.texture(surface.texture)
    }
    const built = buildTerrain(map, surfaces, (id) => {
      const image = textureOf(id).image as { width: number; height: number }
      return [image.width / PIXELS_PER_UNIT, image.height / PIXELS_PER_UNIT]
    })
    return [...built].map(([id, data]) => {
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3))
      geometry.setAttribute('normal', new Float32BufferAttribute(data.normals, 3))
      geometry.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2))
      geometry.setIndex(data.indices)
      geometry.computeBoundingSphere()
      const surface = surfaces[id]
      const material = new MeshStandardMaterial({
        map: textureOf(id),
        color: surface.color ?? '#ffffff',
        roughness: surface.roughness ?? 0.95,
        metalness: 0,
      })
      return { id, geometry, material }
    })
  }, [map, runtime])

  useEffect(
    () => () => {
      for (const { geometry, material } of meshes) {
        geometry.dispose()
        material.dispose()
      }
    },
    [meshes],
  )

  return meshes.map(({ id, geometry, material }) => (
    <mesh key={id} geometry={geometry} material={material} receiveShadow castShadow />
  ))
}
