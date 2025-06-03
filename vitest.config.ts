import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['__tests__/**/*.test.ts'],
          diff: {
            maxDepth: 10,
            expand: false
          }
        }
      }
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '__tests__/**'
      ],
      experimentalAstAwareRemapping: true
    }
  }
})
