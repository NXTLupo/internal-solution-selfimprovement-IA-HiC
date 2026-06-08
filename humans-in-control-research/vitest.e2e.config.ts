// humans-in-control-research/vitest.e2e.config.ts — 2026-05-27
//
// Separate config for END-TO-END deliverable tests that run the real
// generation flow against the LIVE proxy (5012). Kept apart from the unit
// vitest config (which is jsdom + design-desk only) because these are slow
// (multi-minute model calls) and require the proxy + provider keys to be up.
//
// Run:  npx vitest run --config vitest.e2e.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // jsdom so the composer's browser-oriented globals resolve; node fetch
        // is still used for the proxy calls.
        environment: 'jsdom',
        globals: true,
        include: ['services/__e2e__/**/*.e2e.test.ts'],
        testTimeout: 360_000,
        hookTimeout: 20_000,
    },
});
