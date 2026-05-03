/**
 * Provider Registry Initialization
 * Registers all available AI provider adapters.
 *
 * 2026-05-03 — claudeAdapter removed on this branch (HiC-Gemini-Primary).
 * Restoring Anthropic requires re-creating providers/claudeAdapter.ts and
 * re-registering it here, plus the corresponding /api/ai/anthropic proxy
 * endpoint and SPA-side dispatch branches.
 */

export { providerRegistry } from './ProviderAdapter';
export type { ProviderAdapter, EvidenceSpan, AnalysisResponse, StructuredResponse, ProviderCapabilities } from './ProviderAdapter';

import { providerRegistry } from './ProviderAdapter';
import { geminiAdapter } from './geminiAdapter';
import { openaiAdapter } from './openaiAdapter';

// Register all adapters (Anthropic excluded on this branch)
providerRegistry.register(geminiAdapter);
providerRegistry.register(openaiAdapter);

// Gemini is default
providerRegistry.setDefault('gemini');
