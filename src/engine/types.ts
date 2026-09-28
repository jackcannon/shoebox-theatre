import type { ComponentType } from 'react'

import type { SpriteSheetDefinition, TextureSource } from './assets/AssetManager'
import type { ScriptContext } from './scripting/ScriptContext'
import type { TileMap } from './world/TileMap'

export type Direction = 'up' | 'down' | 'left' | 'right'

/** Async-friendly cutscene / interaction logic. See `ScriptContext` for the available commands. */
export type Script = (ctx: ScriptContext) => void | Promise<void>

/** What a single character in a map's ASCII layout means. */
export interface TileType {
  /** Surface id for the top face, or `'none'` to skip rendering it */
  ground: string
  /** Surface id for vertical faces exposed when neighbours are lower (defaults to `ground`) */
  side?: string
  height?: number
  solid?: boolean
  /** Decoration id rendered on this tile (tree, flowers, fence, ...) */
  decoration?: string
  /** Renders the animated water surface over this tile */
  water?: boolean
}

/** A prefab placed on the map. `x`/`y` are the top-left tile of its footprint. */
export interface MapObject {
  type: string
  x: number
  y: number
  w?: number
  d?: number
  /** Whether the footprint blocks movement (default `true`) */
  solid?: boolean
  /** Shorthand for an interaction that just shows text */
  text?: string | string[]
  interact?: Script
  /** Prefab-specific settings */
  props?: Record<string, unknown>
}

export type NpcBehavior =
  | { type: 'idle' }
  | { type: 'look'; interval?: number }
  | { type: 'wander'; radius: number; interval?: number }

export interface NpcDefinition {
  id: string
  sprite: string
  x: number
  y: number
  name?: string
  facing?: Direction
  behavior?: NpcBehavior
  /** Shorthand for an interaction that just shows text */
  dialogue?: string | string[]
  interact?: Script
}

export interface WarpTarget {
  map: string
  x: number
  y: number
  facing?: Direction
}

export interface WarpDefinition {
  x: number
  y: number
  /** If set, the warp fires while the player pushes this way on the tile (doors); otherwise on entering it (stairs) */
  dir?: Direction
  to: WarpTarget
}

export interface TriggerDefinition {
  x: number
  y: number
  w?: number
  d?: number
  once?: boolean
  script: Script
}

export interface PointLightDefinition {
  position: [number, number, number]
  color?: string
  intensity?: number
  distance?: number
  flicker?: boolean
}

export interface PostFxSettings {
  bloom?: number
  tiltShift?: number
  vignette?: number
  saturation?: number
}

export interface EnvironmentSettings {
  background: string
  fog?: { color: string; near: number; far: number }
  ambient?: { color: string; intensity: number }
  hemisphere?: { sky: string; ground: string; intensity: number }
  /** Shadow-casting directional light. `direction` points from the scene towards the light. */
  sun?: { color: string; intensity: number; direction: [number, number, number] }
  lights?: PointLightDefinition[]
  particles?: { count: number; color: string; size?: number }
  postfx?: PostFxSettings
}

export interface CameraSettings {
  fov?: number
  /** Degrees below the horizon */
  pitch?: number
  distance?: number
}

export interface MapDefinition {
  id: string
  /** Shown in the location banner */
  name: string
  /** ASCII layout, one string per row (north to south) */
  tiles: string[]
  palette: Record<string, TileType>
  /** Tiles of edge-extended scenery rendered around the playable area */
  border?: number
  showBanner?: boolean
  objects?: MapObject[]
  npcs?: NpcDefinition[]
  warps?: WarpDefinition[]
  triggers?: TriggerDefinition[]
  environment: EnvironmentSettings
  camera?: CameraSettings
}

/** A material used by terrain faces. Texture scale is derived from the texture size (16px = 1 tile). */
export interface SurfaceDefinition {
  texture: string
  /** Which edge of the texture lines up with vertical faces: `top` for cliffs, `bottom` for walls */
  anchor?: 'top' | 'bottom'
  color?: string
  roughness?: number
}

export interface DecorationInstance {
  x: number
  z: number
  /** Ground height of the tile */
  y: number
  /** Stable per-tile random value in [0, 1) */
  seed: number
  /** False for scenery in the border extension */
  inMap: boolean
}

export interface DecorationProps {
  id: string
  instances: DecorationInstance[]
  map: TileMap
}

export type DecorationComponent = ComponentType<DecorationProps>

export interface PrefabProps {
  object: MapObject
  w: number
  d: number
}

export type PrefabComponent = ComponentType<PrefabProps>

export interface PlayerSettings {
  sprite: string
  walkSpeed?: number
  runSpeed?: number
}

export interface GameConfig {
  title: string
  start: WarpTarget
  player: PlayerSettings
  maps: Record<string, MapDefinition>
  characters: Record<string, SpriteSheetDefinition>
  textures?: Record<string, TextureSource>
  surfaces?: Record<string, SurfaceDefinition>
  decorations?: Record<string, DecorationComponent>
  prefabs?: Record<string, PrefabComponent>
}
