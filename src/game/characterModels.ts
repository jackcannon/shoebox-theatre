import type { CharacterModel } from '../engine'

export const characterModels: Record<string, CharacterModel> = {
  hero: {
    hair: 'spiky',
    outfit: 'tunic',
    palette: {
      skin: '#f2c9a0',
      hair: '#4d3127',
      top: '#3569b5',
      bottom: '#34406a',
      shoes: '#4a3024',
      cap: '#d9493e',
      emblem: '#f6f2e8',
    },
  },
  mom: {
    hair: 'bun',
    outfit: 'dress',
    palette: { skin: '#f0c4a0', hair: '#8a4b2d', top: '#e58a7a', shoes: '#6b3f2a', apron: '#f4efe6' },
  },
  florist: {
    hair: 'long',
    outfit: 'dress',
    palette: { skin: '#f2c9a0', hair: '#e0b24a', top: '#58a8d8', shoes: '#8a4a3a', apron: '#ffffff' },
  },
  elder: {
    hair: 'short',
    outfit: 'tunic',
    palette: { skin: '#e8bb94', hair: '#dcdcdc', top: '#7a8a5a', bottom: '#5a5a6a', shoes: '#3a2a22', belt: '#5a3e2a' },
  },
  fisher: {
    hair: 'short',
    outfit: 'tunic',
    palette: { skin: '#d9a47a', hair: '#2a2a2a', top: '#e0a030', bottom: '#3a4a5a', shoes: '#222222', cap: '#2f5f8f' },
  },
  kid: {
    hair: 'short',
    outfit: 'tunic',
    scale: 0.85,
    palette: { skin: '#f2c9a0', hair: '#6a3a1a', top: '#6ab04c', bottom: '#3a5a9a', shoes: '#2d2d3a', belt: '#f0d040' },
  },
  professor: {
    hair: 'short',
    outfit: 'coat',
    palette: { skin: '#ecc29c', hair: '#b8b8c0', top: '#f2f2ee', bottom: '#6a5a4a', shoes: '#3a2a22', tie: '#8a4a4a' },
  },
  aide: {
    hair: 'short',
    outfit: 'coat',
    palette: { skin: '#f2c9a0', hair: '#2a2a3a', top: '#f2f2ee', bottom: '#3a3a4a', shoes: '#2d2d3a', tie: '#3a6a9a' },
  },
  sister: {
    hair: 'long',
    outfit: 'dress',
    palette: { skin: '#f2c9a0', hair: '#a0522d', top: '#9b6bc4', shoes: '#5a3a2a' },
  },
}
