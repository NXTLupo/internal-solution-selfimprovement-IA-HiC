/**
 * sourceIntelligence.ts - instant per-source intelligence at upload time (2026-11-03).
 * Plan: plans/notebooklm-studio-reverse-engineering-2026-11-03.md, Part 6 W6 (spec clause N1).
 *
 * NotebookLM analyzes every source the moment it is added: a short summary, key topics,
 * and suggested questions appear before the user does anything else. HiC parsed uploads
 * to text and showed a name + size chip. This module closes that gap with ONE bounded
 * Flash call per upload, fired as soon as parsedText lands and rendered beside the chip.
 *
 * Deliberately on the fast tier: this is pre-run orientation chrome, not a deliverable
 * (the _utility class in aiRouter terms); the engagement ledger's full-document reasoning
 * pass still runs at ingest. Results are session state only; nothing is persisted here.
 */

export interface SourceIntel {
    filename: string;
    /** 2-4 declarative sentences on what the document covers and argues. */
    summary: string;
    /** 3-6 short noun phrases. */
    keyTopics: string[];
    /** 3-4 questions this document can answer, phrased for the Analyst Desk. */
    suggestedQuestions: string[];
    status: 'ready' | 'failed';
    error?: string;
}

const PROXY_BASE = 'http://127.0.0.1:5012';
const TEXT_CAP = 28_000;

// ---------------------------------------------------------------------------------------------
// SESSION REGISTRY (2026-11-03, "every artifact" directive). The per-source intelligence is not
// only chip UI: once an upload's analysis lands, buildUploadedFileContents prepends it as a
// SOURCE GUIDE line above that document's text, so EVERY artifact prompt (chat grounding, the
// HTML artifact chain, decks, uplift kinds) opens each upload with its summary and key topics,
// the way NotebookLM's per-source guide primes its outputs. In-memory, session-scoped.
// ---------------------------------------------------------------------------------------------
const _INTEL_REGISTRY = new Map<string, SourceIntel>();

export function registerSourceIntel(intel: SourceIntel): void {
    if (intel && intel.filename && intel.status === 'ready' && intel.summary) {
        _INTEL_REGISTRY.set(intel.filename, intel);
    }
}

export function getSourceIntel(filename: string): SourceIntel | undefined {
    return _INTEL_REGISTRY.get(filename);
}

/** One-line prompt digest for a document, or '' when no analysis has landed. */
export function sourceGuideLine(filename: string): string {
    const i = _INTEL_REGISTRY.get(filename);
    if (!i) return '';
    const topics = i.keyTopics.length ? ` Key topics: ${i.keyTopics.join('; ')}.` : '';
    return `SOURCE GUIDE: ${i.summary}${topics}`;
}

/** Strip code fences and find the first JSON object in a model reply. */
function extractJson(text: string): any | null {
    const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

export async function analyzeUploadForIntelligence(opts: {
    filename: string;
    parsedText: string;
    researchGoal?: string;
    signal?: AbortSignal;
}): Promise<SourceIntel> {
    const { filename, parsedText, researchGoal, signal } = opts;
    const base: SourceIntel = { filename, summary: '', keyTopics: [], suggestedQuestions: [], status: 'failed' };
    const text = String(parsedText || '').slice(0, TEXT_CAP);
    if (text.length < 200) return { ...base, error: 'too little readable text' };

    const goalLine = (researchGoal || '').trim()
        ? `The user's research objective (for question relevance only): ${String(researchGoal).trim().slice(0, 300)}`
        : 'No research objective has been stated yet.';

    const prompt = `You are cataloging one uploaded client document for a research workbench. Read the document text and return STRICT JSON only (no prose, no code fence) with this exact shape:
{"summary": "...", "keyTopics": ["..."], "suggestedQuestions": ["..."]}

Rules:
- summary: 2-4 plain declarative sentences stating what the document covers, what it argues or records, and who produced it when the text says so. Name actors and systems. No percentages or figures unless quoting. Never start with "This document" twice; vary the subject.
- keyTopics: 3-6 short noun phrases (2-4 words each) naming the document's main subjects. No hashtags, no sentence case headers.
- suggestedQuestions: exactly 3-4 questions THIS document can answer, each under 110 characters, phrased as a direct analyst question about the subject (never "what does the document say about..."). Make at least one question a decision or implication question, not pure recall.
${goalLine}

DOCUMENT: ${filename}
--- BEGIN DOCUMENT TEXT (may be truncated) ---
${text}
--- END DOCUMENT TEXT ---`;

    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 900 },
            }),
            signal: signal || AbortSignal.timeout(25_000),
        });
        if (!resp.ok) return { ...base, error: `proxy ${resp.status}` };
        const data = await resp.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text || '';
        const parsed = extractJson(raw);
        if (!parsed || typeof parsed.summary !== 'string') return { ...base, error: 'unparseable reply' };
        const topics = Array.isArray(parsed.keyTopics) ? parsed.keyTopics.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 6) : [];
        const questions = Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.map((q: any) => String(q).trim()).filter(Boolean).slice(0, 4) : [];
        const summary = String(parsed.summary).trim().slice(0, 900);
        if (!summary) return { ...base, error: 'empty summary' };
        return { filename, summary, keyTopics: topics, suggestedQuestions: questions, status: 'ready' };
    } catch (err: any) {
        return { ...base, error: err?.name === 'TimeoutError' ? 'timed out' : (err?.message || 'failed') };
    }
}
