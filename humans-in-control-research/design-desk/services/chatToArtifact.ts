import { validatePersonaArtifact } from '../schemas/personaArtifact';
import { validateJourneyArtifact } from '../schemas/journeyArtifact';
import { validateOrgChartArtifact } from '../schemas/orgChartArtifact';
import { buildPersonaPrompt } from '../prompts/personaPrompt';
import { buildJourneyPrompt } from '../prompts/journeyPrompt';
import { buildOrgChartPrompt } from '../prompts/orgChartPrompt';
import type { Artifact } from '../types';
import type { BrandHashtag, ContentHashtag } from './hashtagParser';
import { analyzeText } from '../../services/anthropicService';

export interface GenerateArgs {
    content: ContentHashtag;
    brand: BrandHashtag;
    userPrompt: string;
    designMdRaw: string;
    corpusText: string;
    currentArtifact: Artifact | null;
}

export interface GenerateResult {
    ok: true;
    artifact: Artifact;
}
export interface GenerateError {
    ok: false;
    error: string;
    rawResponse?: string;
}

// The existing anthropicService exports analyzeText(systemPrompt, userPrompt, model, maxTokens, temperature) -> Promise<string>.
// We pass the fully-built artifact prompt as the userPrompt and supply a minimal system prompt so the full contract stays in the user turn.
const SYSTEM_PROMPT = 'You are a consulting artifact generator for the NXT Humans Design Desk. Return only a single JSON object as specified in the user prompt. No prose, no preamble, no markdown fences.';
const MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.2;

async function callClaudeWrapper(prompt: string): Promise<string> {
    return analyzeText(SYSTEM_PROMPT, prompt, MODEL, MAX_TOKENS, TEMPERATURE);
}

function extractJson(raw: string): unknown | null {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = (fenced ? fenced[1] : raw).trim();
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    try {
        return JSON.parse(candidate.slice(first, last + 1));
    } catch {
        return null;
    }
}

export async function generateArtifact(args: GenerateArgs): Promise<GenerateResult | GenerateError> {
    let prompt: string;
    if (args.content === 'persona') {
        prompt = buildPersonaPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'persona' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else if (args.content === 'journey') {
        prompt = buildJourneyPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'journey' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else if (args.content === 'org') {
        prompt = buildOrgChartPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'org' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else {
        return { ok: false, error: `Content type "${args.content}" is not yet supported in the framework pilot (persona + journey + org only)` };
    }

    let raw: string;
    try {
        raw = await callClaudeWrapper(prompt);
    } catch (err: any) {
        return { ok: false, error: `Claude request failed: ${err?.message ?? String(err)}` };
    }

    const parsed = extractJson(raw);
    if (!parsed) {
        return { ok: false, error: 'Model did not return parsable JSON', rawResponse: raw };
    }

    const validator =
        args.content === 'persona' ? validatePersonaArtifact :
        args.content === 'journey' ? validateJourneyArtifact :
        validateOrgChartArtifact;
    const result = validator(parsed as any);
    if (!result.ok) {
        return { ok: false, error: `Artifact schema validation failed: ${result.error}`, rawResponse: raw };
    }

    return { ok: true, artifact: result.value as Artifact };
}
