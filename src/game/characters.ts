import { generatedCharacter } from '../engine'

export const characters = {
  hero: generatedCharacter({
    head: 'cap',
    body: 'tunic',
    palette: { hair: '#3b2a24', skin: '#f2c9a0', top: '#3569b5', accent: '#d9493e', bottom: '#34406a', shoes: '#2d2d3a' },
  }),
  mom: generatedCharacter({
    head: 'bun',
    body: 'dress',
    palette: { hair: '#8a4b2d', skin: '#f0c4a0', top: '#e58a7a', accent: '#f4efe6', bottom: '#f0c4a0', shoes: '#6b3f2a' },
  }),
  florist: generatedCharacter({
    head: 'long',
    body: 'dress',
    palette: { hair: '#e0b24a', skin: '#f2c9a0', top: '#58a8d8', accent: '#ffffff', bottom: '#f2c9a0', shoes: '#8a4a3a' },
  }),
  elder: generatedCharacter({
    head: 'short',
    body: 'tunic',
    palette: { hair: '#dcdcdc', skin: '#e8bb94', top: '#7a8a5a', accent: '#5a3e2a', bottom: '#5a5a6a', shoes: '#3a2a22' },
  }),
  fisher: generatedCharacter({
    head: 'cap',
    body: 'tunic',
    palette: { hair: '#2a2a2a', skin: '#d9a47a', top: '#e0a030', accent: '#2f5f8f', bottom: '#3a4a5a', shoes: '#222222' },
  }),
  kid: generatedCharacter({
    head: 'short',
    body: 'tunic',
    palette: { hair: '#6a3a1a', skin: '#f2c9a0', top: '#6ab04c', accent: '#f0d040', bottom: '#3a5a9a', shoes: '#2d2d3a' },
  }),
  professor: generatedCharacter({
    head: 'short',
    body: 'coat',
    palette: { hair: '#b8b8c0', skin: '#ecc29c', top: '#f2f2ee', accent: '#8a4a4a', bottom: '#6a5a4a', shoes: '#3a2a22' },
  }),
  aide: generatedCharacter({
    head: 'short',
    body: 'coat',
    palette: { hair: '#2a2a3a', skin: '#f2c9a0', top: '#f2f2ee', accent: '#3a6a9a', bottom: '#3a3a4a', shoes: '#2d2d3a' },
  }),
  sister: generatedCharacter({
    head: 'long',
    body: 'dress',
    palette: { hair: '#a0522d', skin: '#f2c9a0', top: '#9b6bc4', accent: '#ffffff', bottom: '#f2c9a0', shoes: '#5a3a2a' },
  }),
}
