import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/file-tree.ts',
    './src/utils.ts',
  ],
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
  treeshake: true,
  bundle: true,
})
