import type { CameraSettings, MapDefinition } from '../types'

export const DEFAULT_CAMERA: Required<CameraSettings> = { fov: 30, pitch: 40, distance: 18 }

export function resolveCamera(def: MapDefinition): Required<CameraSettings> {
  return { ...DEFAULT_CAMERA, ...def.camera }
}

/**
 * Upright sprites are foreshortened by the camera pitch; stretching them by 1/cos(pitch) restores the pixel art's proportions on screen.
 * @param def - map definition
 * @returns vertical scale for character sprites
 */
export function spriteStretch(def: MapDefinition): number {
  return 1 / Math.cos((resolveCamera(def).pitch * Math.PI) / 180)
}

/**
 * Tall terrain such as an interior's back wall rises into view north of the map's ground area.
 * @param height - tallest terrain height on the map
 * @param settings - camera settings
 * @returns extra distance north of the map the camera must be able to see to keep that terrain on screen
 */
export function northOverhang(height: number, settings: Required<CameraSettings>): number {
  const top = ((settings.pitch - settings.fov / 2) * Math.PI) / 180
  return height > 0 && top > 0.05 ? height / Math.tan(top) : 0
}

export interface CameraBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * Clamps the camera's look-at point so the view stays inside the rendered area.
 * @param x - desired look-at x
 * @param z - desired look-at z
 * @param bounds - rendered area
 * @param settings - camera settings
 * @param aspect - viewport aspect ratio
 * @returns clamped [x, z]
 */
export function clampCameraTarget(
  x: number,
  z: number,
  bounds: CameraBounds,
  settings: Required<CameraSettings>,
  aspect: number,
): [number, number] {
  const pitch = (settings.pitch * Math.PI) / 180
  const halfFov = (settings.fov * Math.PI) / 360
  const height = settings.distance * Math.sin(pitch)
  const back = settings.distance * Math.cos(pitch)
  const top = pitch - halfFov
  const north = top > 0.05 ? height / Math.tan(top) - back : Infinity
  const south = back - height / Math.tan(pitch + halfFov)
  const halfWidth = settings.distance * Math.tan(halfFov) * aspect

  const clampAxis = (value: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)))
  return [
    clampAxis(x, bounds.minX + halfWidth, bounds.maxX - halfWidth),
    Number.isFinite(north) ? clampAxis(z, bounds.minZ + north, bounds.maxZ - south) : z,
  ]
}
