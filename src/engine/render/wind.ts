import type { Material } from 'three'

/** Shared clock for every wind-swayed material. */
export const windUniforms = { uWindTime: { value: 0 } }

/**
 * Makes a material sway in the wind. Displacement grows with local height (y), so geometry should sit on y = 0.
 * @param material - material to patch
 * @param strength - sway distance per unit of height
 */
export function applyWind(material: Material, strength: number): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniforms.uWindTime
    shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 windOrigin = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 windOrigin = vec2(modelMatrix[3][0], modelMatrix[3][2]);
      #endif
      float windPhase = uWindTime * 1.7 + windOrigin.x * 0.63 + windOrigin.y * 0.41;
      float windBend = max(position.y, 0.0) * ${strength.toFixed(4)};
      transformed.x += (sin(windPhase) + 0.35 * sin(windPhase * 2.3)) * windBend;
      transformed.z += cos(windPhase * 0.8) * windBend * 0.35;`,
    )
  }
  material.customProgramCacheKey = () => `wind-${strength}`
}
