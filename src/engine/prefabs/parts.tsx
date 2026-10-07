import { useEffect, useMemo } from 'react'
import { BoxGeometry, type Texture } from 'three'

import type { TextureOptions } from '../assets/AssetManager'
import { PIXELS_PER_UNIT } from '../assets/pixel'
import { useRuntime } from '../core/context'
import type { MapObject } from '../types'

type Vec3 = [number, number, number]

/**
 * Reads a typed prefab prop, falling back when it is missing or has the wrong type.
 * @param object - map object
 * @param key - prop name
 * @param fallback - default value (also defines the expected type)
 * @returns prop value
 */
export function prop<T extends string | number | boolean>(object: MapObject, key: string, fallback: T): T {
  const value = object.props?.[key]
  return typeof value === typeof fallback ? (value as T) : fallback
}

export function propNumbers(object: MapObject, key: string): number[] {
  const value = object.props?.[key]
  return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : []
}

/**
 * Cached parametric texture from the asset manager.
 * @param key - unique key covering every parameter of `draw`
 * @param draw - paints the canvas
 * @param options - filtering options
 * @returns texture
 */
export function useGenerated(key: string, draw: () => HTMLCanvasElement, options?: TextureOptions): Texture {
  const { assets } = useRuntime()
  // `draw` is keyed by `key`, so it is intentionally not a dependency.
  return useMemo(() => assets.generated(key, draw, options), [assets, key])
}

/**
 * Box whose UVs are in texture pixels, so tiling textures keep the 16px-per-unit density on every face.
 * @param w - width
 * @param h - height
 * @param d - depth
 * @param texture - texture to size the UVs for
 * @returns box geometry
 */
function pixelBox(w: number, h: number, d: number, texture: Texture): BoxGeometry {
  const geometry = new BoxGeometry(w, h, d)
  const image = texture.image as { width: number; height: number }
  const tu = image.width / PIXELS_PER_UNIT
  const tv = image.height / PIXELS_PER_UNIT
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  const uv = geometry.attributes.uv
  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i
      uv.setXY(idx, (uv.getX(idx) * faces[face][0]) / tu, (uv.getY(idx) * faces[face][1]) / tv)
    }
  }
  return geometry
}

export interface BoxProps {
  size: Vec3
  position: Vec3
  color?: string
  map?: Texture
  /** Tile `map` at 16px per unit instead of stretching it over each face */
  tiled?: boolean
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  castShadow?: boolean
  receiveShadow?: boolean
  rotation?: Vec3
}

export function Box({
  size,
  position,
  color = '#ffffff',
  map,
  tiled = false,
  emissive = '#000000',
  emissiveIntensity = 1,
  roughness = 0.9,
  castShadow = true,
  receiveShadow = true,
  rotation,
}: BoxProps) {
  const [w, h, d] = size
  const geometry = useMemo(
    () => (tiled && map ? pixelBox(w, h, d, map) : new BoxGeometry(w, h, d)),
    [w, h, d, tiled, map],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      <meshStandardMaterial
        color={color}
        map={map}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
      />
    </mesh>
  )
}
