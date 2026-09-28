import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'

import { useRuntime } from '../core/context'
import { hashTile } from '../math'
import type { DecorationComponent, DecorationInstance } from '../types'

import { applyWind } from './wind'

interface Placement {
  matrix: Matrix4
  color?: Color
}

const tmpPosition = new Vector3()
const tmpQuaternion = new Quaternion()
const tmpScale = new Vector3()
const tmpEuler = new Euler()

function compose(x: number, y: number, z: number, rotY = 0, sx = 1, sy = sx, sz = sx): Matrix4 {
  tmpQuaternion.setFromEuler(tmpEuler.set(0, rotY, 0))
  return new Matrix4().compose(tmpPosition.set(x, y, z), tmpQuaternion, tmpScale.set(sx, sy, sz))
}

function Instances({
  geometry,
  material,
  placements,
  castShadow = true,
  receiveShadow = true,
}: {
  geometry: BufferGeometry
  material: Material
  placements: Placement[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    placements.forEach((p, i) => {
      mesh.setMatrixAt(i, p.matrix)
      if (p.color) mesh.setColorAt(i, p.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements])
  if (!placements.length) return null
  return (
    <instancedMesh
      key={placements.length}
      ref={ref}
      args={[geometry, material, placements.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: unknown[]): T {
  const value = useMemo(factory, deps)
  useEffect(() => () => value.dispose(), [value])
  return value
}

/** Lumpy low-poly blob. Displacement is a function of vertex position so shared corners stay welded. */
function createFoliageGeometry(radius: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(radius, 1)
  const pos = geometry.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = hashTile(Math.round(v.x * 100), Math.round(v.y * 100) * 31 + Math.round(v.z * 100), 7)
    v.multiplyScalar(0.86 + n * 0.28)
    v.y *= 0.85
    pos.setXYZ(i, v.x, v.y + radius * 0.85, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function jitter(instance: DecorationInstance, salt: number, range: number): number {
  return (hashTile(instance.x, instance.z, salt) - 0.5) * range
}

const Tree: DecorationComponent = ({ instances }) => {
  const runtime = useRuntime()
  const trunkGeometry = useDisposable(() => new CylinderGeometry(0.09, 0.15, 1, 6).translate(0, 0.5, 0), [])
  const foliageGeometry = useDisposable(() => createFoliageGeometry(0.62), [])
  const trunkMaterial = useDisposable(
    () => new MeshStandardMaterial({ map: runtime.assets.texture('bark'), roughness: 1, flatShading: true }),
    [runtime],
  )
  const foliageMaterial = useDisposable(() => {
    const m = new MeshStandardMaterial({ map: runtime.assets.texture('leaves'), roughness: 0.9, flatShading: true })
    applyWind(m, 0.035)
    return m
  }, [runtime])

  const { trunks, foliage } = useMemo(() => {
    const trunks: Placement[] = []
    const foliage: Placement[] = []
    for (const t of instances) {
      const spread = t.inMap ? 0.12 : 0.5
      const x = t.x + 0.5 + jitter(t, 1, spread)
      const z = t.z + 0.5 + jitter(t, 2, spread)
      const s = (t.inMap ? 0.95 : 0.9) + t.seed * (t.inMap ? 0.2 : 0.45)
      const rot = t.seed * Math.PI * 2
      const tint = new Color().setHSL(0.27 + jitter(t, 3, 0.06), 0.35, t.inMap ? 0.72 : 0.6 + t.seed * 0.1)
      trunks.push({ matrix: compose(x, t.y, z, rot, s, s * 0.9, s) })
      foliage.push({ matrix: compose(x, t.y + 0.55 * s, z, rot, s * 1.05, s, s * 1.05), color: tint })
      foliage.push({
        matrix: compose(x + jitter(t, 4, 0.2), t.y + 1.25 * s, z + jitter(t, 5, 0.2), rot + 1, s * 0.72),
        color: tint.clone().offsetHSL(0, 0, 0.06),
      })
    }
    return { trunks, foliage }
  }, [instances])

  return (
    <>
      <Instances geometry={trunkGeometry} material={trunkMaterial} placements={trunks} />
      <Instances geometry={foliageGeometry} material={foliageMaterial} placements={foliage} />
    </>
  )
}

const Bush: DecorationComponent = ({ instances }) => {
  const runtime = useRuntime()
  const geometry = useDisposable(() => createFoliageGeometry(0.42), [])
  const material = useDisposable(() => {
    const m = new MeshStandardMaterial({ map: runtime.assets.texture('leaves'), roughness: 0.9, flatShading: true })
    applyWind(m, 0.03)
    return m
  }, [runtime])
  const placements = useMemo(
    () =>
      instances.map((t) => ({
        matrix: compose(t.x + 0.5, t.y, t.z + 0.5, t.seed * 6, 1 + t.seed * 0.2, 0.9, 1 + t.seed * 0.2),
        color: new Color().setHSL(0.26, 0.4, 0.78),
      })),
    [instances],
  )
  return <Instances geometry={geometry} material={material} placements={placements} />
}

/** Camera-facing cut-out quads, optionally animated between horizontal frames of the texture. */
function useCutoutMaterial(textureId: string, frames: number, wind: number): MeshStandardMaterial {
  const runtime = useRuntime()
  const material = useDisposable(() => {
    const map = runtime.assets.texture(textureId).clone()
    map.repeat.set(1 / frames, 1)
    const m = new MeshStandardMaterial({ map, alphaTest: 0.5, side: DoubleSide, roughness: 1 })
    if (wind) applyWind(m, wind)
    return m
  }, [runtime, textureId, frames, wind])
  useEffect(() => () => material.map?.dispose(), [material])
  useFrame(() => {
    if (frames > 1 && material.map) material.map.offset.x = Math.floor(runtime.time * 1.6) % frames / frames
  })
  return material
}

const Flowers: DecorationComponent = ({ instances }) => {
  const geometry = useDisposable(() => new PlaneGeometry(1, 10 / 16).translate(0, 5 / 16, 0), [])
  const material = useCutoutMaterial('flowers', 2, 0)
  const placements = useMemo(
    () =>
      instances.flatMap((t) =>
        [-0.22, 0.22].map((dz, i) => ({
          matrix: compose(t.x + 0.5 + jitter(t, 10 + i, 0.3), t.y, t.z + 0.5 + dz, 0, 0.8),
        })),
      ),
    [instances],
  )
  return <Instances geometry={geometry} material={material} placements={placements} castShadow={false} />
}

const TallGrass: DecorationComponent = ({ instances }) => {
  const geometry = useDisposable(() => new PlaneGeometry(1, 0.8).translate(0, 0.4, 0), [])
  const material = useCutoutMaterial('tallGrass', 1, 0.14)
  const placements = useMemo(
    () =>
      instances.flatMap((t) =>
        [-0.32, 0, 0.32].map((dz, i) => ({
          matrix: compose(t.x + 0.5 + jitter(t, 20 + i, 0.3), t.y, t.z + 0.5 + dz, 0, 1.05, 0.85 + jitter(t, 30 + i, 0.3), 1),
          color: new Color().setHSL(0.27, 0.3, 0.75 + jitter(t, 40 + i, 0.15)),
        })),
      ),
    [instances],
  )
  return <Instances geometry={geometry} material={material} placements={placements} castShadow={false} />
}

const Fence: DecorationComponent = ({ id, instances, map }) => {
  const postGeometry = useDisposable(() => new BoxGeometry(0.14, 0.7, 0.14).translate(0, 0.35, 0), [])
  const railGeometry = useDisposable(() => new BoxGeometry(1, 0.08, 0.05), [])
  const material = useDisposable(() => new MeshStandardMaterial({ color: '#eee5d3', roughness: 0.8 }), [])
  const { posts, rails } = useMemo(() => {
    const posts: Placement[] = []
    const rails: Placement[] = []
    const isFence = (x: number, z: number) => map.inRegion(x, z) && map.getClamped(x, z).decoration === id
    for (const t of instances) {
      posts.push({ matrix: compose(t.x + 0.5, t.y, t.z + 0.5) })
      for (const railY of [0.28, 0.54]) {
        if (isFence(t.x + 1, t.z)) rails.push({ matrix: compose(t.x + 1, t.y + railY, t.z + 0.5) })
        if (isFence(t.x, t.z + 1)) rails.push({ matrix: compose(t.x + 0.5, t.y + railY, t.z + 1, Math.PI / 2) })
      }
    }
    return { posts, rails }
  }, [id, instances, map])
  return (
    <>
      <Instances geometry={postGeometry} material={material} placements={posts} />
      <Instances geometry={railGeometry} material={material} placements={rails} />
    </>
  )
}

export const DEFAULT_DECORATIONS: Record<string, DecorationComponent> = {
  tree: Tree,
  bush: Bush,
  flowers: Flowers,
  tallGrass: TallGrass,
  fence: Fence,
}
