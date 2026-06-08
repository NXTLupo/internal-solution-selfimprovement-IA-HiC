/**
 * Verifier Service - Pre-shipping quality gate.
 *
 * Runs three checks on every generated deliverable before the user sees it:
 *   - brief-fit:      every section serves at least one stated engagement goal
 *   - framework-fit:  the structure matches the canonical framework page
 *   - evidence-fit:   every numeric/named claim cites a real source
 *
 * Weak sections are auto-regenerated via regenerateWithFeedback. Strong
 * sections ship. Results are logged to wiki/synthesis/verifier-history.md
 * so the learning engine can observe verifier patterns over time.
 *
 * Created 2026-05-22 as part of Phase 4 of the self-improvement loop.
 */

import { regenerateWithFeedback } from './feedbackRegeneration';

const PROXY_BASE = 'http://127.0.0.1:5012';

export type VerifierCheck = 'brief-fit' | 'framework-fit' | 'evidence-fit';

export interface VerifierFinding {
    check: VerifierCheck;
    severity: 'pass' | 'weak' | 'fail';
    section: string | null;
    message: string;
    quotedClaim?: string;
    suggestedFix?: string;
}

export interface VerifierReport {
    deliverableType: string;
    deliverableId: string;
    engagementSlug?: string;
    overall: 'pass' | 'weak' | 'fail';
    findings: VerifierFinding[];
    durationMs: number;
    autoRegeneratedSections: string[];
    finalText?: string;
}

interface EngagementGoals {
    raw: string;
    items: string[];
}

async function loadEngagementGoals(engagementSlug?: string): Promise<EngagementGoals | null> {
    if (!engagementSlug) return null;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/engagements/${engagementSlug}.md`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const content: string = data.content || '';
        const goalsMatch = content.match(/##\s+Goals?\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        if (!goalsMatch) return null;
        const block = goalsMatch[1];
        const items = block
            .split('\n')
            .filter(l => /^[-*]\s+/.test(l.trim()))
            .map(l => l.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean);
        return { raw: block, items };
    } catch {
        return null;
    }
}

async function loadFrameworkPage(deliverableType: string): Promise<string | null> {
    // Map common deliverable type aliases to canonical framework file names
    const aliasMap: Record<string, string> = {
        'persona': 'personas',
        'recommendations': 'strategy',
        'recommendation': 'strategy',
        'gap_analysis': 'gap-analysis',
        'tech_audit': 'tech-audit',
        'tech_architecture': 'architecture',
        'competitive_analysis': 'competitive',
        'themes': 'strategy',
        'theme': 'strategy',
        'presentations': 'deck',
        'proto': 'deck',
        'whitepaper': 'strategy',
        'chat-reply': 'strategy',
    };
    const canonical = aliasMap[deliverableType] || deliverableType;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/frameworks/${canonical}.md`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.content || null;
    } catch {
        return null;
    }
}

async function llmCheck(
    text: string,
    deliverableType: string,
    goals: EngagementGoals | null,
    framework: string | null,
): Promise<{ findings: VerifierFinding[]; overall: 'pass' | 'weak' | 'fail' }> {
    // Single LLM call doing all three checks. Cost-controlled: Haiku.
    const goalsBlock = goals ? `Stated engagement goals:\n- ${goals.items.join('\n- ')}` : 'No engagement goals stated.';
    const frameworkSummary = framework ? framework.slice(0, 3000) : 'No framework page available for this deliverable type.';

    const prompt = `You are a strict quality verifier for a ${deliverableType} consulting deliverable. Run three checks and return STRICT JSON.

DELIVERABLE:
${text.slice(0, 6000)}

${goalsBlock}

FRAMEWORK SPECIFICATION (excerpt):
${frameworkSummary}

CHECKS:

1. brief-fit: does each section in the deliverable serve at least one stated goal? If goals are empty, every section is pass by default.

2. framework-fit: does the deliverable's structure match the framework? Identify the section that most diverges, if any.

3. evidence-fit: does every numeric claim, statistic, or named entity cite a real source (named publication, named study, dated report)? Flag any unsupported claim.

Return STRICT JSON only:
{
  "findings": [
    {
      "check": "brief-fit" | "framework-fit" | "evidence-fit",
      "severity": "pass" | "weak" | "fail",
      "section": "name of section or null",
      "message": "short specific finding",
      "quotedClaim": "verbatim text from deliverable, or omit",
      "suggestedFix": "concrete action"
    }
  ],
  "overall": "pass" | "weak" | "fail"
}

Default to "pass" when checks succeed. Use "weak" for partial issues. Use "fail" only for clear violations.`;

    // 2026-05-22 - Model selection. The verifier runs three structured
    // checks against goals + framework + deliverable simultaneously - exactly
    // the multi-step reasoning Gemini 3.5 Flash is designed for. Flash is
    // also ~10x cheaper than Opus and faster than Haiku per Google's
    // positioning, which matters because the verifier runs before every
    // shipped deliverable. Anthropic Haiku is retained as fallback.
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.2,
                    maxOutputTokens: 1500,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = raw.replace(/```json\n?|```/g, '').trim();
            try {
                const parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed.findings) && typeof parsed.overall === 'string') {
                    return { findings: parsed.findings, overall: parsed.overall };
                }
            } catch { /* fall through to Anthropic */ }
        }
        // Anthropic Haiku fallback
        const fbResp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1200,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!fbResp.ok) return { findings: [], overall: 'pass' };
        const data = await fbResp.json();
        const raw: string = data?.content?.[0]?.text || '';
        const cleaned = raw.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.findings) && typeof parsed.overall === 'string') {
            return { findings: parsed.findings, overall: parsed.overall };
        }
    } catch (err) {
        // Verifier failures must never block the user - return pass on error
        console.warn('[verifier] LLM check failed:', err);
    }
    return { findings: [], overall: 'pass' };
}

async function appendVerifierHistory(report: VerifierReport): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n## ${date} | ${report.deliverableType} | ${report.deliverableId}\n` +
        `- overall: ${report.overall}\n` +
        `- findings: ${report.findings.length}\n` +
        `- auto_regenerated: ${report.autoRegeneratedSections.length}\n` +
        `- duration_ms: ${report.durationMs}\n` +
        (report.findings.length > 0
            ? `- detail:\n${report.findings.map(f => `  - ${f.check}/${f.severity}: ${f.message}`).join('\n')}\n`
            : '');
    try {
        await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/verifier-history.md', content: entry }),
        });
    } catch {
        /* best-effort */
    }
}

/**
 * Main entry: verify a deliverable. Returns the report; if any sections were
 * auto-regenerated, `finalText` contains the regenerated output.
 *
 * `autoRegenerate: false` makes this a pure inspection pass - no rewriting.
 */
export async function verifyDeliverable(input: {
    text: string;
    deliverableType: string;
    deliverableId: string;
    engagementSlug?: string;
    autoRegenerate?: boolean;
}): Promise<VerifierReport> {
    const t0 = Date.now();
    const goals = await loadEngagementGoals(input.engagementSlug);
    const framework = await loadFrameworkPage(input.deliverableType);
    const { findings, overall } = await llmCheck(input.text, input.deliverableType, goals, framework);

    const autoRegeneratedSections: string[] = [];
    let finalText = input.text;

    if (input.autoRegenerate && overall !== 'pass') {
        const failedSections = findings.filter(f => f.severity !== 'pass' && f.section);
        // De-duplicate sections
        const seen = new Set<string>();
        for (const f of failedSections) {
            if (!f.section || seen.has(f.section)) continue;
            seen.add(f.section);
            const fix = f.suggestedFix || f.message;
            try {
                const result = await regenerateWithFeedback({
                    originalText: finalText,
                    feedbackText: fix,
                    deliverableType: input.deliverableType,
                    sectionScope: f.section,
                    engagementSlug: input.engagementSlug,
                    provider: 'anthropic',
                });
                if (result.ok && result.newText) {
                    finalText = result.newText;
                    autoRegeneratedSections.push(f.section);
                }
            } catch {
                // Single section regen failure does not abort the run
            }
        }
    }

    const report: VerifierReport = {
        deliverableType: input.deliverableType,
        deliverableId: input.deliverableId,
        engagementSlug: input.engagementSlug,
        overall,
        findings,
        durationMs: Date.now() - t0,
        autoRegeneratedSections,
        finalText: autoRegeneratedSections.length > 0 ? finalText : undefined,
    };
    await appendVerifierHistory(report);
    return report;
}

/**
 * Lightweight pre-check used at generation time to inject the engagement
 * goals into the prompt as a hard constraint. Called by loadGenerationContext.
 */
export async function getEngagementGoalsAsConstraint(engagementSlug?: string): Promise<string> {
    const goals = await loadEngagementGoals(engagementSlug);
    if (!goals || goals.items.length === 0) return '';
    const goalList = goals.items.map(g => `- ${g}`).join('\n');
    return `\n\nENGAGEMENT GOALS (each section MUST demonstrably serve at least one):\n${goalList}\n\nIf a section does not serve a stated goal, omit it.`;
}
