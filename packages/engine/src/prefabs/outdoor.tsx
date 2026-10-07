import { shade } from '../assets/pixel'
import type { PrefabProps } from '../types'

import { Box, prop, useGenerated } from './parts'
import { drawSignBoard } from './prefabTextures'

const BOARD = '#9a6a3e'
const POST = '#6b4a2e'
const IRON = '#2f3136'
const LANTERN = '#ffd27a'

export function Sign({ w, d }: PrefabProps) {
  const board = useGenerated('signBoard', drawSignBoard)
  return (
    <>
      <Box size={[0.1, 0.5, 0.1]} position={[w / 2, 0.25, d / 2]} color={POST} />
      <mesh position={[w / 2, 0.58, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.5, 0.08]} />
        {[0, 1, 2, 3, 5].map((i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={BOARD} roughness={0.9} />
        ))}
        <meshStandardMaterial attach="material-4" map={board} roughness={0.9} />
      </mesh>
    </>
  )
}

export function Mailbox({ object, w, d }: PrefabProps) {
  const color = prop(object, 'color', '#c9483b')
  const cx = w / 2
  const cz = d / 2
  return (
    <>
      <Box size={[0.08, 0.7, 0.08]} position={[cx, 0.35, cz]} color={POST} />
      <Box size={[0.3, 0.26, 0.44]} position={[cx, 0.83, cz]} color={color} roughness={0.6} />
      <Box size={[0.32, 0.04, 0.46]} position={[cx, 0.98, cz]} color={shade(color, -0.2)} roughness={0.6} />
      <Box size={[0.18, 0.03, 0.01]} position={[cx, 0.86, cz + 0.225]} color="#2a2020" castShadow={false} />
      <Box size={[0.02, 0.28, 0.02]} position={[cx + 0.16, 0.9, cz - 0.08]} color="#3a3a3a" />
      <Box size={[0.02, 0.1, 0.12]} position={[cx + 0.16, 0.99, cz - 0.03]} color="#f2c94a" />
    </>
  )
}

export function Lamp({ w, d }: PrefabProps) {
  const cx = w / 2
  const cz = d / 2
  return (
    <>
      <Box size={[0.24, 0.12, 0.24]} position={[cx, 0.06, cz]} color={IRON} />
      <Box size={[0.09, 1.5, 0.09]} position={[cx, 0.87, cz]} color={IRON} roughness={0.6} />
      <Box
        size={[0.24, 0.28, 0.24]}
        position={[cx, 1.76, cz]}
        color={LANTERN}
        emissive={LANTERN}
        emissiveIntensity={3}
        castShadow={false}
      />
      <Box size={[0.32, 0.06, 0.32]} position={[cx, 1.93, cz]} color={IRON} />
      <pointLight position={[cx, 1.76, cz]} color={LANTERN} intensity={6} distance={5} decay={2} />
    </>
  )
}
