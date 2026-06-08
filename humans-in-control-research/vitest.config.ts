// humans-in-control-research/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./design-desk/__fixtures__/vitest.setup.ts'],
        include: ['design-desk/**/*.test.{ts,tsx}', 'services/**/*.test.{ts,tsx}'],
    },
});
