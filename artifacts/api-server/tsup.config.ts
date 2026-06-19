import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
});
