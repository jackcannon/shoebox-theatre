import { useFrame } from '@react-three/fiber'
import { useRef, type Ref } from 'react'
import { AdditiveBlending, DoubleSide, type Mesh, type MeshStandardMaterial, type Texture } from 'three'

import { PIXELS_PER_UNIT, shade } from '../assets/pixel'
import { useRuntime } from '../core/context'
import type { MapObject, PrefabProps } from '../types'

import { Box, prop, useGenerated } from './parts'
import {
  drawBookshelf,
  drawCabinets,
  drawMachinePanel,
  drawPainting,
  drawQuilt,
  drawRug,
  drawScreen,
  drawStripes,
} from './prefabTextures'

type Vec3 = [number, number, number]

const WOOD = '#9a6a3e'
const DARK_WOOD = '#6b4a2e'
const BED_FRAME = '#8a5a36'
const SHELF_WOOD = '#7a4b2a'
const CABINET = '#b58a5a'
const METAL = '#8e9aa3'
const PLASTIC = '#2e3036'
const WINDOW_FRAME = '#f1ebdd'
const CRYSTALS = ['#5fe6ff', '#ff7ad9', '#ffd24a']

const LEAF_BLOBS: [number, number, number, number][] = [
  [0, 0.5, 0, 0.2],
  [-0.12, 0.62, -0.04, 0.16],
  [0.12, 0.66, 0.05, 0.15],
  [0, 0.8, 0, 0.13],
]

const FLOWER_HEADS: [number, number, number, string][] = [
  [-0.05, 0.27, 0.02, '#e8483f'],
  [0.05, 0.29, -0.02, '#f5cf3f'],
  [0, 0.32, 0.04, '#f4f1ea'],
]

function pixels(units: number): number {
  return Math.round(units * PIXELS_PER_UNIT)
}

function defaultSeed(object: MapObject): number {
  return object.x * 31 + object.y * 17
}

/**
 * Wall-mounted prefabs sit on a back-wall tile, so their group origin is the wall top rather than the floor.
 * @param object - map object
 * @param w - footprint width
 * @param d - footprint depth
 * @returns y offset from the group origin down to the floor in front of the wall
 */
function useFloorOffset(object: MapObject, w: number, d: number): number {
  const map = useRuntime().world?.map
  if (!map) return 0
  const x = object.x + w / 2
  return map.heightAt(x, object.y + d) - map.heightAt(x, object.y + d / 2)
}

interface FrontBoxProps {
  size: Vec3
  position: Vec3
  color: string
  front: Texture
  glow?: Texture
  glowIntensity?: number
  materialRef?: Ref<MeshStandardMaterial>
  roughness?: number
}

/** Box with `front` on its south (+z) face and a plain colour on the others. */
function FrontBox({ size, position, color, front, glow, glowIntensity = 1, materialRef, roughness = 0.85 }: FrontBoxProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      {[0, 1, 2, 3, 5].map((i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={color} roughness={roughness} />
      ))}
      <meshStandardMaterial
        ref={materialRef}
        attach="material-4"
        map={front}
        emissive={glow ? '#ffffff' : '#000000'}
        emissiveMap={glow}
        emissiveIntensity={glowIntensity}
        roughness={roughness}
      />
    </mesh>
  )
}

function Vase({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.75, z]}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.2, 10]} />
        <meshStandardMaterial color="#4f7fb0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#4f8f35" roughness={0.9} flatShading />
      </mesh>
      {FLOWER_HEADS.map(([fx, fy, fz, color]) => (
        <Box key={color} size={[0.06, 0.06, 0.06]} position={[fx, fy, fz]} color={color} castShadow={false} />
      ))}
    </group>
  )
}

export function Table({ object, w, d }: PrefabProps) {
  const vase = prop(object, 'vase', false)
  const legs = [
    [0.12, 0.12],
    [w - 0.12, 0.12],
    [0.12, d - 0.12],
    [w - 0.12, d - 0.12],
  ]
  return (
    <>
      <Box size={[w - 0.1, 0.07, d - 0.1]} position={[w / 2, 0.715, d / 2]} color={WOOD} />
      {legs.map(([x, z], i) => (
        <Box key={i} size={[0.08, 0.68, 0.08]} position={[x, 0.34, z]} color={shade(WOOD, -0.2)} />
      ))}
      {vase && <Vase x={w / 2} z={d / 2} />}
    </>
  )
}

export function Bookshelf({ object, w }: PrefabProps) {
  const seed = prop(object, 'seed', defaultSeed(object))
  const width = pixels(w)
  const front = useGenerated(`bookshelf:${width}:${seed}`, () => drawBookshelf(width, 32, seed))
  return <FrontBox size={[w - 0.04, 2, 0.5]} position={[w / 2, 1, 0.25]} color={SHELF_WOOD} front={front} />
}

export function Counter({ w }: PrefabProps) {
  const width = pixels(w)
  const front = useGenerated(`cabinets:${width}:${CABINET}`, () => drawCabinets(width, 14, CABINET))
  return (
    <>
      <FrontBox size={[w, 0.84, 0.7]} position={[w / 2, 0.42, 0.35]} color={CABINET} front={front} />
      <Box size={[w + 0.02, 0.06, 0.74]} position={[w / 2, 0.87, 0.37]} color="#d9d6cf" roughness={0.5} />
      <Box size={[0.54, 0.01, 0.42]} position={[0.5, 0.902, 0.38]} color="#b9c3c8" roughness={0.3} castShadow={false} />
      <Box size={[0.44, 0.01, 0.32]} position={[0.5, 0.905, 0.38]} color="#56616a" roughness={0.3} castShadow={false} />
      <Box size={[0.05, 0.22, 0.05]} position={[0.5, 1, 0.14]} color="#c9d2d6" roughness={0.3} />
      <Box size={[0.05, 0.05, 0.16]} position={[0.5, 1.09, 0.2]} color="#c9d2d6" roughness={0.3} />
    </>
  )
}

export function Tv({ w, d }: PrefabProps) {
  const runtime = useRuntime()
  const screen = useGenerated('screen:tv', () => drawScreen('tv'))
  const material = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    if (!material.current) return
    const t = runtime.time
    material.current.emissiveIntensity = 1.6 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23)
  })
  const cx = w / 2
  const cz = d / 2
  return (
    <>
      <Box size={[0.9, 0.36, 0.46]} position={[cx, 0.18, cz]} color={DARK_WOOD} />
      <Box size={[0.8, 0.58, 0.34]} position={[cx, 0.65, cz]} color={PLASTIC} roughness={0.6} />
      <mesh position={[cx, 0.66, cz + 0.171]}>
        <planeGeometry args={[0.64, 0.48]} />
        <meshStandardMaterial
          ref={material}
          map={screen}
          emissiveMap={screen}
          emissive="#ffffff"
          emissiveIntensity={1.6}
          roughness={0.3}
        />
      </mesh>
    </>
  )
}

export function Bed({ object, w, d }: PrefabProps) {
  const color = prop(object, 'color', '#4f7fc0')
  const quilt = useGenerated(`quilt:${color}`, () => drawQuilt(color))
  const cx = w / 2
  const mattress = d - 0.24
  const blanket = mattress * 0.64
  return (
    <>
      <Box size={[w - 0.1, 0.26, d - 0.08]} position={[cx, 0.13, d / 2]} color={BED_FRAME} />
      <Box size={[w - 0.1, 0.8, 0.08]} position={[cx, 0.4, 0.08]} color={BED_FRAME} />
      <Box size={[w - 0.1, 0.4, 0.06]} position={[cx, 0.2, d - 0.07]} color={BED_FRAME} />
      <Box size={[w - 0.22, 0.14, mattress]} position={[cx, 0.33, d / 2 + 0.02]} color="#f1ece0" />
      <Box size={[w * 0.6, 0.1, 0.3]} position={[cx, 0.45, 0.32]} color="#ffffff" />
      <Box size={[w - 0.16, 0.06, blanket]} position={[cx, 0.42, d - 0.12 - blanket / 2]} map={quilt} tiled />
    </>
  )
}

export function Plant({ w, d }: PrefabProps) {
  const leaves = useRuntime().assets.texture('leaves')
  return (
    <group position={[w / 2, 0, d / 2]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.13, 0.32, 10]} />
        <meshStandardMaterial color="#b8643a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 10]} />
        <meshStandardMaterial color="#a4552f" roughness={0.9} />
      </mesh>
      {LEAF_BLOBS.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial map={leaves} color="#d8ecc4" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function Rug({ object, w, d }: PrefabProps) {
  const color = prop(object, 'color', '#3f6fa8')
  const width = pixels(w)
  const depth = pixels(d)
  const texture = useGenerated(`rug:${width}x${depth}:${color}`, () => drawRug(width, depth, color))
  return (
    <mesh rotation-x={-Math.PI / 2} position={[w / 2, 0.012, d / 2]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={texture} roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  )
}

function StairsUp({ w, d }: { w: number; d: number }) {
  const steps = 5
  const riser = 0.3
  const run = w / steps
  const railZ = 0.05
  const lowX = run / 2
  const highX = w - run / 2
  const railRise = (steps - 1) * riser
  const railLength = Math.hypot(railRise, highX - lowX)
  return (
    <>
      {Array.from({ length: steps }, (_, i) => {
        const h = (i + 1) * riser
        return (
          <Box
            key={i}
            size={[run, h, d - 0.12]}
            position={[(i + 0.5) * run, h / 2, d / 2 + 0.04]}
            color={i % 2 ? WOOD : shade(WOOD, 0.08)}
          />
        )
      })}
      <Box size={[0.06, riser + 0.7, 0.06]} position={[lowX, (riser + 0.7) / 2, railZ]} color={DARK_WOOD} />
      <Box size={[0.06, steps * riser + 0.7, 0.06]} position={[highX, (steps * riser + 0.7) / 2, railZ]} color={DARK_WOOD} />
      <Box
        size={[railLength, 0.05, 0.05]}
        position={[(lowX + highX) / 2, riser + 0.7 + railRise / 2, railZ]}
        rotation={[0, 0, Math.atan2(railRise, highX - lowX)]}
        color={DARK_WOOD}
      />
    </>
  )
}

/** Stairwell cut into the floor, running left to right. The tile under it must not draw a ground face. */
function StairsDown({ w, d }: { w: number; d: number }) {
  const count = 4
  const riser = 0.22
  const lip = 0.08
  const run = (w - lip) / count
  const depth = d - lip
  const pit = (count + 1) * riser
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const top = -(i + 1) * riser
        return (
          <Box
            key={i}
            size={[run + 0.012, riser, depth]}
            position={[(i + 0.5) * run, top - riser / 2, lip + depth / 2]}
            color={i % 2 ? WOOD : shade(WOOD, 0.08)}
            castShadow={false}
            receiveShadow={false}
          />
        )
      })}
      <Box
        size={[w - lip, riser, depth]}
        position={[(w - lip) / 2, -pit - riser / 2, lip + depth / 2]}
        color={shade(WOOD, -0.12)}
        emissive={shade(WOOD, -0.12)}
        emissiveIntensity={0.45}
        castShadow={false}
        receiveShadow={false}
      />
      <Box
        size={[w, pit, lip]}
        position={[w / 2, -pit / 2, lip / 2]}
        color={DARK_WOOD}
        emissive={DARK_WOOD}
        emissiveIntensity={0.5}
        castShadow={false}
        receiveShadow={false}
      />
      <Box
        size={[lip, pit, d]}
        position={[w - lip / 2, -pit / 2, d / 2]}
        color={DARK_WOOD}
        emissive={DARK_WOOD}
        emissiveIntensity={0.5}
        castShadow={false}
        receiveShadow={false}
      />
    </>
  )
}

export function Stairs({ object, w, d }: PrefabProps) {
  if (prop(object, 'down', false)) return <StairsDown w={w} d={d} />
  return <StairsUp w={w} d={d} />
}

export function Desk({ w }: PrefabProps) {
  const screen = useGenerated('screen:pc', () => drawScreen('pc'))
  const cx = w / 2
  const panel = shade(WOOD, -0.15)
  return (
    <>
      <Box size={[w - 0.08, 0.06, 0.62]} position={[cx, 0.72, 0.36]} color={WOOD} />
      <Box size={[0.06, 0.69, 0.56]} position={[0.08, 0.345, 0.36]} color={panel} />
      <Box size={[0.06, 0.69, 0.56]} position={[w - 0.08, 0.345, 0.36]} color={panel} />
      <Box size={[w - 0.2, 0.4, 0.04]} position={[cx, 0.45, 0.1]} color={panel} />
      <Box size={[0.1, 0.1, 0.1]} position={[cx, 0.8, 0.22]} color={PLASTIC} />
      <Box size={[0.52, 0.4, 0.07]} position={[cx, 1.04, 0.2]} color={PLASTIC} roughness={0.6} />
      <mesh position={[cx, 1.04, 0.2355]}>
        <planeGeometry args={[0.44, 0.33]} />
        <meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={1.5} roughness={0.3} />
      </mesh>
      <Box size={[0.38, 0.025, 0.13]} position={[cx, 0.7625, 0.48]} color="#d9d6cf" castShadow={false} />
    </>
  )
}

export function Machine({ object, w, d }: PrefabProps) {
  const runtime = useRuntime()
  const seed = prop(object, 'seed', defaultSeed(object))
  const width = pixels(w)
  const panel = useGenerated(`machine:${width}:${seed}`, () => drawMachinePanel(width, 32, seed, false))
  const glow = useGenerated(`machineGlow:${width}:${seed}`, () => drawMachinePanel(width, 32, seed, true))
  const material = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    if (material.current) material.current.emissiveIntensity = 1.4 + 0.6 * Math.sin(runtime.time * 2.4 + seed)
  })
  return (
    <FrontBox
      size={[w - 0.08, 2, d - 0.2]}
      position={[w / 2, 1, d / 2]}
      color={METAL}
      front={panel}
      glow={glow}
      glowIntensity={1.4}
      materialRef={material}
      roughness={0.5}
    />
  )
}

export function Pedestal({ w, d }: PrefabProps) {
  const runtime = useRuntime()
  const crystals = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    crystals.current.forEach((mesh, i) => {
      if (!mesh) return
      const t = runtime.time + i * 2.1
      mesh.position.y = 1.02 + Math.sin(t * 1.6) * 0.04
      mesh.rotation.y = t * 0.8
    })
  })
  return (
    <group position={[w / 2, 0, d / 2]}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.06, 16]} />
        <meshStandardMaterial color={METAL} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.41, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.74, 10]} />
        <meshStandardMaterial color={METAL} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 24]} />
        <meshStandardMaterial color="#c9d2d6" roughness={0.4} />
      </mesh>
      {CRYSTALS.map((color, i) => {
        const angle = (i / CRYSTALS.length) * Math.PI * 2
        return (
          <mesh
            key={color}
            ref={(mesh) => {
              crystals.current[i] = mesh
            }}
            position={[Math.sin(angle) * 0.2, 1.02, Math.cos(angle) * 0.2]}
            scale={[1, 1.5, 1]}
            castShadow
          >
            <octahedronGeometry args={[0.09]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} roughness={0.2} flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

/** Back-wall window with a light shaft falling onto the floor in front of it. */
export function WallWindow({ object, w, d }: PrefabProps) {
  const runtime = useRuntime()
  const floor = useFloorOffset(object, w, d)
  const shaft = runtime.assets.texture('lightShaft')
  const patch = runtime.assets.texture('dot')
  const cx = w / 2
  const glass = w - 0.3
  const top = 1.75
  const reach = 2.5
  const start = d + 0.07
  return (
    <group position-y={floor}>
      <Box size={[w - 0.16, 0.9, 0.05]} position={[cx, 1.6, d + 0.025]} color={WINDOW_FRAME} />
      <mesh position={[cx, 1.6, d + 0.052]}>
        <planeGeometry args={[glass, 0.74]} />
        <meshStandardMaterial color="#d6efff" emissive="#cfeaff" emissiveIntensity={1.3} roughness={0.2} />
      </mesh>
      <Box size={[0.04, 0.74, 0.02]} position={[cx, 1.6, d + 0.06]} color={WINDOW_FRAME} castShadow={false} />
      <Box size={[glass, 0.04, 0.02]} position={[cx, 1.6, d + 0.06]} color={WINDOW_FRAME} castShadow={false} />
      <Box size={[w - 0.06, 0.05, 0.14]} position={[cx, 1.13, d + 0.07]} color="#e3dccb" />
      <mesh position={[cx, top / 2, start + reach / 2]} rotation-x={Math.atan2(-reach, top)} renderOrder={3}>
        <planeGeometry args={[glass, Math.hypot(top, reach)]} />
        <meshBasicMaterial
          map={shaft}
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[cx, 0.02, start + reach - 0.2]} rotation-x={-Math.PI / 2} renderOrder={3}>
        <planeGeometry args={[glass * 1.6, 1.2]} />
        <meshBasicMaterial
          map={patch}
          color="#fff2cf"
          transparent
          opacity={0.22}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function Doormat({ object, w, d }: PrefabProps) {
  const color = prop(object, 'color', '#b8433a')
  const texture = useGenerated(`stripes:${color}`, () => drawStripes(color))
  return (
    <mesh rotation-x={-Math.PI / 2} position={[w / 2, 0.012, d / 2]} receiveShadow>
      <planeGeometry args={[w * 0.8, 0.5]} />
      <meshStandardMaterial map={texture} roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  )
}

export function Painting({ object, w, d }: PrefabProps) {
  const floor = useFloorOffset(object, w, d)
  const canvas = useGenerated('painting', drawPainting)
  return (
    <group position-y={floor}>
      <Box size={[0.74, 0.58, 0.05]} position={[w / 2, 1.6, d + 0.025]} color="#b08a3e" roughness={0.6} />
      <mesh position={[w / 2, 1.6, d + 0.052]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshStandardMaterial map={canvas} roughness={0.9} />
      </mesh>
    </group>
  )
}
