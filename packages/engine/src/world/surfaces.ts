import type { SurfaceDefinition, TileType } from '../types'

export const DEFAULT_SURFACES: Record<string, SurfaceDefinition> = {
  grass: { texture: 'grass' },
  path: { texture: 'path' },
  sand: { texture: 'sand' },
  seabed: { texture: 'seabed' },
  bank: { texture: 'bank', anchor: 'top' },
  cliff: { texture: 'cliff', anchor: 'top' },
  dock: { texture: 'dock' },
  dockSide: { texture: 'dockSide', anchor: 'top' },
  stone: { texture: 'stone' },
  woodFloor: { texture: 'woodFloor' },
  tileFloor: { texture: 'tileFloor', roughness: 0.6 },
  wallpaper: { texture: 'wallpaper', anchor: 'bottom' },
  wallpaperBlue: { texture: 'wallpaperBlue', anchor: 'bottom' },
  labWall: { texture: 'labWall', anchor: 'bottom' },
  wallTop: { texture: 'wallTop' },
}

/** Ready-made tile types; spread into a map palette and override as needed. */
export const TILES = {
  grass: { ground: 'grass', side: 'bank' },
  path: { ground: 'path', side: 'bank' },
  sand: { ground: 'sand', side: 'bank' },
  tallGrass: { ground: 'grass', side: 'bank', decoration: 'tallGrass' },
  flowers: { ground: 'grass', side: 'bank', decoration: 'flowers' },
  tree: { ground: 'grass', side: 'bank', decoration: 'tree', solid: true },
  bush: { ground: 'grass', side: 'bank', decoration: 'bush', solid: true },
  fence: { ground: 'grass', side: 'bank', decoration: 'fence', solid: true },
  water: { ground: 'seabed', side: 'bank', height: -0.55, water: true, solid: true },
  dock: { ground: 'dock', side: 'dockSide', height: 0 },
  woodFloor: { ground: 'woodFloor', side: 'woodFloor' },
  tileFloor: { ground: 'tileFloor', side: 'tileFloor' },
  wall: { ground: 'wallTop', side: 'wallpaper', height: 2.5, solid: true },
} satisfies Record<string, TileType>
