import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type MeshStandardMaterial, type Texture } from 'three'

import { PIXELS_PER_UNIT, shade } from '../assets/pixel'
import { useRuntime } from '../core/context'
import type { PrefabProps } from '../types'

import { Box, prop, propNumbers, useGenerated } from './parts'
import { drawBricks, drawFacade, drawRoof, type BuildingStyle, type FacadeOptions } from './prefabTextures'

const INSET = 0.15
const FOUNDATION = 0.18
const OVERHANG = 0.28
const CHIMNEY_BRICK = '#9a5a44'

/**
 * Gable roof with the ridge along x and the origin at the centre of the wall top.
 * Material group 0 is the two slopes, group 1 the gable ends.
 * @param ww - wall width
 * @param wd - wall depth
 * @param rise - ridge height above the wall top
 * @returns roof geometry
 */
function createRoofGeometry(ww: number, wd: number, rise: number): BufferGeometry {
  const hw = ww / 2 + OVERHANG
  const hd = wd / 2 + OVERHANG
  const slope = Math.hypot(hd, rise)
  const positions: number[] = []
  const uvs: number[] = []
  const push = (x: number, y: number, z: number, u: number, v: number) => {
    positions.push(x, y, z)
    uvs.push(u, v)
  }

  for (const side of [1, -1]) {
    const corners: [number, number, number, number, number][] = [
      [-hw * side, 0, hd * side, (-hw * side) / 2, 0],
      [hw * side, 0, hd * side, (hw * side) / 2, 0],
      [hw * side, rise, 0, (hw * side) / 2, slope / 2],
      [-hw * side, rise, 0, (-hw * side) / 2, slope / 2],
    ]
    for (const i of [0, 1, 2, 0, 2, 3]) push(...corners[i])
  }

  const eave = rise * (1 - wd / 2 / hd)
  const outline: [number, number][] = [
    [wd / 2, 0],
    [wd / 2, eave],
    [0, rise],
    [-wd / 2, eave],
    [-wd / 2, 0],
  ]
  for (const side of [1, -1]) {
    const x = (ww / 2) * side
    const points = side === 1 ? [...outline].reverse() : outline
    for (let i = 1; i < points.length - 1; i++) {
      for (const [z, y] of [points[0], points[i], points[i + 1]]) push(x, y, z, z, y)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.addGroup(0, 12, 0)
  geometry.addGroup(12, positions.length / 3 - 12, 1)
  geometry.computeVertexNormals()
  return geometry
}

function useFacade(options: FacadeOptions): Texture {
  const { style, wall, trim, width, height, door, windows } = options
  return useGenerated(`facade:${style}:${wall}:${trim}:${width}x${height}:${door ?? '-'}:${windows.join(',')}`, () =>
    drawFacade(options),
  )
}

function Roof({ ww, wd, rise, roof, wall, trim }: { ww: number; wd: number; rise: number; roof: string; wall: string; trim: string }) {
  const texture = useGenerated(`roof:${roof}`, () => drawRoof(roof))
  const geometry = useMemo(() => createRoofGeometry(ww, wd, rise), [ww, wd, rise])
  useEffect(() => () => geometry.dispose(), [geometry])
  const hw = ww / 2 + OVERHANG
  const hd = wd / 2 + OVERHANG
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial attach="material-0" map={texture} side={DoubleSide} roughness={0.85} />
        <meshStandardMaterial attach="material-1" color={wall} side={DoubleSide} roughness={0.9} />
      </mesh>
      {[1, -1].map((side) => (
        <Box key={side} size={[hw * 2, 0.08, 0.06]} position={[0, -0.03, hd * side]} color={trim} />
      ))}
      <Box size={[hw * 2 + 0.04, 0.1, 0.16]} position={[0, rise, 0]} color={shade(roof, -0.3)} />
    </>
  )
}

function Chimney({ x, y, z }: { x: number; y: number; z: number }) {
  const bricks = useGenerated(`bricks:${CHIMNEY_BRICK}`, () => drawBricks(CHIMNEY_BRICK))
  return (
    <>
      <Box size={[0.36, 1, 0.36]} position={[x, y, z]} map={bricks} tiled />
      <Box size={[0.44, 0.08, 0.44]} position={[x, y + 0.52, z]} color="#4a3a36" />
    </>
  )
}

function Antenna({ x, y }: { x: number; y: number }) {
  const runtime = useRuntime()
  const light = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    if (light.current) light.current.emissiveIntensity = runtime.time % 1.4 < 0.35 ? 4 : 0.3
  })
  return (
    <>
      <Box size={[0.05, 1.1, 0.05]} position={[x, y + 0.55, 0]} color="#8d969c" roughness={0.5} />
      <Box size={[0.3, 0.04, 0.04]} position={[x, y + 0.8, 0]} color="#8d969c" roughness={0.5} />
      <mesh position={[x, y + 1.14, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial ref={light} color="#ff4a3a" emissive="#ff2a1a" emissiveIntensity={4} />
      </mesh>
    </>
  )
}

/** A house or lab: stone foundation, painted facades, gable roof and a few extras. */
export function Building({ object, w, d }: PrefabProps) {
  const runtime = useRuntime()
  const style: BuildingStyle = prop<string>(object, 'style', 'cottage') === 'lab' ? 'lab' : 'cottage'
  const lab = style === 'lab'
  const wall = prop(object, 'wall', lab ? '#e4e8e6' : '#efe2c4')
  const trim = prop(object, 'trim', lab ? '#5c6f86' : '#7a5234')
  const roof = prop(object, 'roof', '#c24b3a')
  const height = prop(object, 'height', 2)
  const door = prop(object, 'door', 1)
  const windows = propNumbers(object, 'windows')
  const chimney = prop(object, 'chimney', !lab)

  const ww = w - INSET * 2
  const wd = d - INSET * 2
  const hd = wd / 2 + OVERHANG
  const rise = d * (lab ? 0.25 : 0.42)
  const pixels = (units: number) => Math.round(units * PIXELS_PER_UNIT)
  const column = (col: number) => (col + 0.5 - INSET) * PIXELS_PER_UNIT
  const stone = runtime.assets.texture('stone')

  const front = useFacade({ width: pixels(ww), height: pixels(height), wall, trim, style, door: column(door), windows: windows.map(column) })
  const side = useFacade({ width: pixels(wd), height: pixels(height), wall, trim, style, windows: lab ? [] : [pixels(wd) / 2] })
  const back = useFacade({ width: pixels(ww), height: pixels(height), wall, trim, style, windows: [] })

  return (
    <>
      <Box size={[ww + 0.12, FOUNDATION, wd + 0.12]} position={[w / 2, FOUNDATION / 2, d / 2]} map={stone} tiled />
      <mesh position={[w / 2, FOUNDATION + height / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[ww, height, wd]} />
        <meshStandardMaterial attach="material-0" map={side} roughness={0.9} />
        <meshStandardMaterial attach="material-1" map={side} roughness={0.9} />
        <meshStandardMaterial attach="material-2" color={trim} roughness={0.9} />
        <meshStandardMaterial attach="material-3" color={trim} roughness={0.9} />
        <meshStandardMaterial attach="material-4" map={front} roughness={0.9} />
        <meshStandardMaterial attach="material-5" map={back} roughness={0.9} />
      </mesh>
      <group position={[w / 2, FOUNDATION + height, d / 2]}>
        <Roof ww={ww} wd={wd} rise={rise} roof={roof} wall={wall} trim={trim} />
        {chimney && <Chimney x={w * 0.22} y={rise * 0.7 + 0.3} z={-hd * 0.3} />}
        {lab && <Antenna x={-ww * 0.3} y={rise} />}
      </group>
      <Box size={[0.95, 0.07, 0.36]} position={[door + 0.5, FOUNDATION + 1.45, d - INSET + 0.16]} color={lab ? trim : roof} />
      <Box size={[0.9, 0.1, 0.3]} position={[door + 0.5, 0.05, d - INSET + 0.1]} map={stone} tiled />
    </>
  )
}
