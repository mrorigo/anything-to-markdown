import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
