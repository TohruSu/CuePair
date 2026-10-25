import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
  },
})
