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
        /**
         * E1.4 (2026-08-21). One suite run reported failures while a Docker build was
         * saturating every core; four runs on an idle machine passed. Reproduced under
         * deliberate contention, the culprit was `userImagery.test.ts` failing at
         * 5015ms: a large module pulled in with `await import()` inside the test body
         * blew the default 5s per-test timeout. Nothing in that test asserts elapsed
         * time, so the timeout was measuring the machine, not the code.
         *
         * The worst offender now imports statically, and this raises the ceiling for
         * the seven other files that still load modules lazily inside a body. Raising
         * it weakens no assertion: no test in this suite asserts a duration. A suite
         * whose job is pinning a contract must not fail because the host is busy.
         */
        testTimeout: 20000,
        hookTimeout: 20000,
    },
});
