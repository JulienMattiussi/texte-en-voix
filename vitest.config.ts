import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/lib/**'],
      },
    },
  }),
)
