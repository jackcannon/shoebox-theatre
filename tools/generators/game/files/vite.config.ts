/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defaultClientConditions, defaultServerConditions, defineConfig } from 'vite'

// The source condition makes the game (and its node tests) use the engine's TypeScript source, so engine edits apply without a build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['@shoeboxtheatre/source', ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ['@shoeboxtheatre/source', ...defaultServerConditions],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
