import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: false,
  clean: false,          // dist/ also holds styles.css from the tailwind step
  external: ['react', 'react-dom'],
  target: 'es2020',
});
