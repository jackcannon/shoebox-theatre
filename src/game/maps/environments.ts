import type { CameraSettings, EnvironmentSettings } from '../../engine'

export const outdoorDay: EnvironmentSettings = {
  background: '#a9d3e8',
  fog: { color: '#c4dde6', near: 30, far: 75 },
  hemisphere: { sky: '#d6ebff', ground: '#6b8f4a', intensity: 0.9 },
  ambient: { color: '#ffffff', intensity: 0.25 },
  sun: { color: '#fff0d6', intensity: 2.8, direction: [-0.55, 1, 0.65] },
  particles: { count: 80, color: '#fff3c4', size: 0.09 },
}

export const indoorWarm: EnvironmentSettings = {
  background: '#0b0a10',
  ambient: { color: '#ffe2c0', intensity: 0.5 },
  hemisphere: { sky: '#ffe9cc', ground: '#5a3a2a', intensity: 0.4 },
  sun: { color: '#ffe8c8', intensity: 1.1, direction: [-0.4, 1, 0.8] },
  particles: { count: 40, color: '#ffe6b0', size: 0.05 },
  postfx: { tiltShift: 0.07 },
}

export const interiorCamera: CameraSettings = { fov: 32, pitch: 50, distance: 15 }
