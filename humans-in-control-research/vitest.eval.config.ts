// vitest.eval.config.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-2 E1/E3/E12)
// The eval lane: `npm run eval` runs every case in evals/cases in REPLAY mode (deterministic,
// no model call) and asserts the regression set; frontier cases are reported. EVAL_MODE=live
// generates through the real pipeline first (needs the proxy on :5012).
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['evals/**/*.spec.ts'],
        environment: 'jsdom',
        testTimeout: 600_000,
        hookTimeout: 120_000,
        reporters: ['default'],
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
