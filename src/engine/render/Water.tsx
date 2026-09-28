import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, UniformsLib, UniformsUtils } from 'three'

import { useRuntime } from '../core/context'
import type { TileMap } from '../world/TileMap'

export const WATER_LEVEL = -0.14

const vertexShader = /* glsl */ `
  attribute float shore;
  varying float vShore;
  varying vec2 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vShore = shore;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  varying float vShore;
  varying vec2 vWorld;
  #include <fog_pars_fragment>

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Snap to the 16px-per-tile grid so the water reads as pixel art.
    vec2 p = floor(vWorld * 16.0) / 16.0;
    float wave = sin(p.x * 2.1 + uTime * 1.1) * sin(p.y * 1.7 - uTime * 0.8);
    wave += 0.5 * sin((p.x - p.y) * 3.3 + uTime * 1.9);
    vec3 color = mix(uDeep, uShallow, clamp(0.4 + wave * 0.16 + vShore * 0.4, 0.0, 1.0));

    float streak = sin(p.y * 6.0 + sin(p.x * 1.3 + uTime * 0.7) * 2.0 + uTime * 1.4);
    color = mix(color, uFoam, step(0.94, streak) * 0.25);

    float glint = step(0.997, hash(floor(vWorld * 16.0) + floor(uTime * 2.0)));
    color += glint * vec3(1.6, 1.5, 1.2) * (1.0 - vShore);

    float foam = smoothstep(0.62, 0.95, vShore + 0.1 * sin(uTime * 2.2 + (p.x + p.y) * 5.0));
    color = mix(color, uFoam, foam * 0.7);

    gl_FragColor = vec4(color, mix(0.8, 0.96, foam));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/** Animated pixel-art water over every water tile, with foam where it meets land. */
export function Water({ map }: { map: TileMap }) {
  const runtime = useRuntime()

  const geometry = useMemo(() => {
    const b = map.border
    const isWater = (x: number, z: number) => !map.inRegion(x, z) || map.getClamped(x, z).water === true
    const shoreAt = (cx: number, cz: number) =>
      isWater(cx - 1, cz - 1) && isWater(cx, cz - 1) && isWater(cx - 1, cz) && isWater(cx, cz) ? 0 : 1
    const positions: number[] = []
    const shore: number[] = []
    const indices: number[] = []
    for (let z = -b; z < map.height + b; z++) {
      for (let x = -b; x < map.width + b; x++) {
        if (!map.getClamped(x, z).water) continue
        const base = positions.length / 3
        for (const [cx, cz] of [
          [x, z + 1],
          [x + 1, z + 1],
          [x + 1, z],
          [x, z],
        ]) {
          positions.push(cx, WATER_LEVEL, cz)
          shore.push(shoreAt(cx, cz))
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
      }
    }
    if (!indices.length) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setAttribute('shore', new Float32BufferAttribute(shore, 1))
    g.setIndex(indices)
    g.computeBoundingSphere()
    return g
  }, [map])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uDeep: { value: new Color('#1f5f8f') },
            uShallow: { value: new Color('#3f9fbf') },
            uFoam: { value: new Color('#e9f7f2') },
          },
        ]),
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry?.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    material.uniforms.uTime.value = runtime.time
  })

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={1} />
}
