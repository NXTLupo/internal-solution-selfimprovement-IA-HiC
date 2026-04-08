/**
 * Provider Registry Initialization
 * Registers all available AI provider adapters.
 */

export { providerRegistry } from './ProviderAdapter';
export type { ProviderAdapter, EvidenceSpan, AnalysisResponse, StructuredResponse, ProviderCapabilities } from './ProviderAdapter';

import { providerRegistry } from './ProviderAdapter';
import { geminiAdapter } from './geminiAdapter';
import { claudeAdapter } from './claudeAdapter';
import { openaiAdapter } from './openaiAdapter';

// Register all adapters
providerRegistry.register(geminiAdapter);
providerRegistry.register(claudeAdapter);
providerRegistry.register(openaiAdapter);

// Gemini is default (works without proxy for basic calls)
providerRegistry.setDefault('gemini');
