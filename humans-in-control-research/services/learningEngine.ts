/**
 * Learning Engine - Loop 4 (async pattern detection + improvement routing).
 *
 * Reads the feedback event stream, clusters events by (deliverable_type,
 * section_scope, signal_polarity), and routes patterns crossing the
 * threshold to one of five improvement targets:
 *
 *   1. Constraint store    (wiki/synthesis/learned-constraints.md)
 *   2. Skill patch         (.claude/skills/<name>/SKILL.md - via proxy)
 *   3. Framework page      (wiki/frameworks/<type>.md - diff queued)
 *   4. Anti-pattern entry  (wiki/anti-patterns/<type>.md - auto-applied)
 *   5. Exemplar update     (wiki/exemplars/<type>.md - positive signals)
 *
 * Also computes constraint effectiveness so under-performing constraints
 * can be retired.
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 3.
 */

import { readFeedbackIndex, type FeedbackSummary, type FeedbackIndex } from './feedbackService';
import { persistChunkOverride, type ArtifactType } from './chunkBudgetCalculator';
import { evaluateConstraint } from './constraintQualityGate';

const PROXY_BASE = 'http://127.0.0.1:5012';

// 2026-05-23 - Feedback patterns that signal a chunking-config change, not a
// constraint or skill patch. Kept in sync with the live classifier in
// feedbackService.ts so the same complaint that bumps the current run also
// promotes to a persistent override after 3+ clusters.
const CHUNK_INCOMPLETE_PATTERNS = [
    /\btruncat/i, /\bcut[\s-]?off\b/i, /\bstop(?:ped|s)\s+(?:at|early|mid)/i,
    /\bonly\s+got\s+\d+/i, /\bmissing\s+(?:slides?|themes?|sections?|items?)/i,
    /\bdidn'?t\s+finish/i, /\bincomplet/i, /\bpartial\b/i, /\bnot\s+all\b/i,
];
const CHUNK_TOOSHORT_PATTERNS = [
    /\bmore\s+depth\b/i, /\bmore\s+detail/i, /\btoo\s+(?:brief|short|thin|shallow)/i,
    /\bneeds?\s+more\b/i, /\bexpand\b/i, /\bdeepen\b/i, /\bshallow\b/i, /\bsparse\b/i,
];

function classifyChunkingComplaint(fragments: string[]): { incomplete: boolean; tooShort: boolean } {
    const joined = fragments.join(' ');
    return {
        incomplete: CHUNK_INCOMPLETE_PATTERNS.some(re => re.test(joined)),
        tooShort: CHUNK_TOOSHORT_PATTERNS.some(re => re.test(joined)),
    };
}

const DELIVERABLE_TO_ARTIFACT_TYPE: Record<string, ArtifactType> = {
    'slides': 'slides',
    'presentations': 'slides',
    'deck': 'slides',
    'case-study': 'slides',
    'case_study': 'slides',
    'themes': 'themes',
    'theme': 'themes',
    'personas': 'personas',
    'persona': 'personas',
    'recommendations': 'recommendations',
    'recommendation': 'recommendations',
    'roadmap': 'roadmap',
    'prd': 'prd',
    'blueprint': 'blueprint',
    'journey': 'journey',
    'journey-map': 'journey',
    'gap': 'gap',
    'gap-analysis': 'gap',
    'gap_analysis': 'gap',
    'tech-audit': 'tech-audit',
    'tech_audit': 'tech-audit',
    'architecture': 'architecture',
    'tech-architecture': 'architecture',
    'tech_architecture': 'architecture',
    'competitive': 'competitive',
    'competitive_analysis': 'competitive',
    'whitepaper': 'report',
    'report': 'report',
    'proto': 'prototype',
    'prototype': 'prototype',
};
const PATTERN_THRESHOLD = 3;      // events of same kind to trigger
const POSITIVE_STAR_FLOOR = 4;    // stars >= 4 are positive
const NEGATIVE_STAR_CEILING = 2;  // stars <= 2 are negative
const HIGH_CONFIDENCE = 0.8;
const REVIEW_CONFIDENCE = 0.5;
const CONSTRAINT_RETIRE_FLOOR = 0.3;
const CONSTRAINT_PROMOTE_CEILING = 0.7;

// --- TYPES ---

export type ImprovementTarget = 'constraint' | 'skill-patch' | 'framework-page' | 'anti-pattern' | 'exemplar' | 'chunk-config';
export type SignalPolarity = 'negative' | 'positive' | 'neutral';

export interface FeedbackCluster {
    deliverableType: string;
    sectionScope: string | null;
    polarity: SignalPolarity;
    count: number;
    representativeEvents: FeedbackSummary[];
    distinctTextFragments: string[];
}

export interface ImprovementCandidate {
    id: string;
    cluster: FeedbackCluster;
    target: ImprovementTarget;
    payload: string; // the rule, anti-pattern, or exemplar text the engine generated
    confidence: number;
    rationale: string;
    proposedAt: string;
}

export interface LearningPassResult {
    runId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    clustersDetected: number;
    candidatesProduced: number;
    applied: ImprovementCandidate[];
    queuedForReview: ImprovementCandidate[];
    rejected: ImprovementCandidate[];
    skillsTouched: string[];
    constraintsRetired: string[];
    chunkConfigsPromoted: string[];
}

// --- CLUSTERING ---

function classifyPolarity(event: FeedbackSummary): SignalPolarity {
    if (event.vote_value === 'down' || (typeof event.stars_value === 'number' && event.stars_value <= NEGATIVE_STAR_CEILING)) {
        return 'negative';
    }
    if (event.vote_value === 'up' || (typeof event.stars_value === 'number' && event.stars_value >= POSITIVE_STAR_FLOOR)) {
        return 'positive';
    }
    // Pure text signals without vote/stars are treated as negative (user took
    // the time to write something - likely a correction).
    if (event.text_excerpt) return 'negative';
    return 'neutral';
}

function clusterFeedback(index: FeedbackIndex): FeedbackCluster[] {
    const clusters: FeedbackCluster[] = [];
    for (const [deliverableType, bySection] of Object.entries(index)) {
        for (const [sectionKey, events] of Object.entries(bySection)) {
            // Bucket by polarity
            const byPolarity = new Map<SignalPolarity, FeedbackSummary[]>();
            for (const e of events) {
                const p = classifyPolarity(e);
                if (!byPolarity.has(p)) byPolarity.set(p, []);
                byPolarity.get(p)!.push(e);
            }
            for (const [polarity, polEvents] of byPolarity) {
                if (polarity === 'neutral') continue;
                if (polEvents.length < PATTERN_THRESHOLD) continue;
                const distinctTextFragments = uniqueExcerpts(polEvents);
                clusters.push({
                    deliverableType,
                    sectionScope: sectionKey === '__top__' ? null : sectionKey,
                    polarity,
                    count: polEvents.length,
                    representativeEvents: polEvents.slice(0, 10),
                    distinctTextFragments,
                });
            }
        }
    }
    return clusters;
}

function uniqueExcerpts(events: FeedbackSummary[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of events) {
        if (!e.text_excerpt) continue;
        const key = e.text_excerpt.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e.text_excerpt);
        if (out.length >= 5) break;
    }
    return out;
}

// --- ROUTING ---

function routeCluster(cluster: FeedbackCluster): ImprovementTarget {
    // Positive signal -> always exemplar.
    if (cluster.polarity === 'positive') return 'exemplar';

    // 2026-05-23 - Chunking-complaint detection takes precedence over the
    // constraint/skill-patch routes. A user saying "only got 5 of 20 slides"
    // is not asking for a wording constraint; they're asking for a deeper
    // chunk plan on the artifact type. We promote to chunk-config when the
    // deliverable type maps to a known artifact and the text fragments
    // contain the classifier patterns.
    const complaint = classifyChunkingComplaint(cluster.distinctTextFragments);
    const artifactType = DELIVERABLE_TO_ARTIFACT_TYPE[cluster.deliverableType.toLowerCase()];
    if (artifactType && (complaint.incomplete || complaint.tooShort)) {
        return 'chunk-config';
    }

    // Negative signal - choose the most surgical target.
    // - section-scoped + text feedback     -> constraint (narrow)
    // - section-scoped + no text           -> anti-pattern (named failure mode)
    // - global (no section) + text         -> skill patch (structural change)
    // - global + no text                   -> framework page (structural review)
    if (cluster.sectionScope) {
        return cluster.distinctTextFragments.length > 0 ? 'constraint' : 'anti-pattern';
    }
    return cluster.distinctTextFragments.length > 0 ? 'skill-patch' : 'framework-page';
}

function estimateConfidence(cluster: FeedbackCluster, target: ImprovementTarget): number {
    // Confidence is a function of:
    //   - count (more events = higher confidence)
    //   - distinct text agreement (more agreement = higher)
    //   - target type (anti-pattern + exemplar default higher because the
    //     blast radius is lower than a framework page)
    let base = 0.5;
    base += Math.min(0.3, (cluster.count - PATTERN_THRESHOLD) * 0.1);
    if (cluster.distinctTextFragments.length === 1) base += 0.15; // unanimity
    if (target === 'anti-pattern') base += 0.1;
    if (target === 'exemplar') base += 0.15;
    if (target === 'framework-page') base -= 0.1; // bigger blast radius
    if (target === 'chunk-config') base += 0.2; // chunking signals are concrete and self-validating
    return Math.min(1.0, Math.max(0.0, base));
}

// --- PAYLOAD GENERATION ---

async function generatePayload(cluster: FeedbackCluster, target: ImprovementTarget): Promise<string> {
    // 2026-05-23 - chunk-config payloads are deterministic JSON descriptions
    // of the chunk-plan override. No LLM call needed - the signal is concrete.
    if (target === 'chunk-config') {
        const complaint = classifyChunkingComplaint(cluster.distinctTextFragments);
        const artifactType = DELIVERABLE_TO_ARTIFACT_TYPE[cluster.deliverableType.toLowerCase()];
        const override: any = {
            artifactType: artifactType || cluster.deliverableType,
            applied: [] as string[],
        };
        if (complaint.incomplete) {
            override.applied.push('incomplete:chunks-x1.5');
            override.applied.push('incomplete:budget-x1.3');
        }
        if (complaint.tooShort) {
            override.applied.push('too_short:budget-x1.5');
        }
        if (override.applied.length === 0) {
            // Defensive: shouldn't happen because routing already checked, but
            // produce a sensible default.
            override.applied.push('incomplete:chunks-x1.5');
        }
        override.rationale = `Promoted from ${cluster.count} feedback signals: ${cluster.distinctTextFragments.slice(0, 2).join(' | ').slice(0, 240)}`;
        return JSON.stringify(override);
    }

    // For constraints, anti-patterns, and skill patches, use an LLM to
    // synthesize the actual content from the feedback fragments. Cost-
    // controlled: Haiku, ~$0.001 per pass.
    const fragments = cluster.distinctTextFragments.join('\n- ');
    const polarityLabel = cluster.polarity.toUpperCase();
    const scopeLabel = cluster.sectionScope || 'overall output';

    let instruction = '';
    if (target === 'constraint') {
        instruction = `Convert these ${cluster.count} negative user signals on the "${cluster.deliverableType}" deliverable, section "${scopeLabel}", into a single section-scoped constraint of the form: "When generating ${cluster.deliverableType} ${scopeLabel} section, [do X] because [reason]." Return only the constraint sentence.`;
    } else if (target === 'anti-pattern') {
        instruction = `These ${cluster.count} user signals on the "${cluster.deliverableType}" deliverable indicate a repeating failure mode. Write a named anti-pattern entry. Return STRICT JSON: {"name": "short-kebab-name", "description": "1-2 sentence description of the failure mode", "detection": "concrete criteria a verifier can check", "alternative": "what to do instead"}.`;
    } else if (target === 'skill-patch') {
        instruction = `These ${cluster.count} user signals indicate the "${cluster.deliverableType}" skill should change its default behavior. Write a single-paragraph patch (under 80 words) for the skill's SKILL.md describing the new behavior. Return only the paragraph.`;
    } else if (target === 'framework-page') {
        instruction = `These ${cluster.count} signals reveal a structural gap in the "${cluster.deliverableType}" framework page. Write a proposed addition (under 100 words) suggesting a new required section or refined section definition. Return only the addition text.`;
    } else if (target === 'exemplar') {
        instruction = `These ${cluster.count} positive user signals praise an exemplary "${cluster.deliverableType}" output. Write a 2-sentence annotation explaining WHY this kind of output works well. Return only the annotation.`;
    }
    const prompt = `${instruction}\n\nUSER SIGNALS (${polarityLabel}):\n- ${fragments || '(no text provided; vote/star-only signals)'}\n\nDeliverable type: ${cluster.deliverableType}\nSection scope: ${scopeLabel}`;

    // 2026-05-22 - Model selection. The learning engine is an agentic loop
    // (cluster -> route -> generate payload -> apply). Gemini 3.5 Flash is
    // positioned as Google's most-capable agentic + coding model at
    // ~1/10th the cost of Opus and lower latency than Haiku. The payload
    // generation is exactly the kind of structured multi-step transform
    // Flash is built for. We keep an Anthropic fallback in case the Gemini
    // call fails so the loop never breaks.
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 600 },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text.trim().length > 5) return text.trim();
        }
        // Fall through to Anthropic Haiku fallback on any failure or empty body
        const fallbackResp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!fallbackResp.ok) return fallbackPayload(cluster, target);
        const data = await fallbackResp.json();
        return (data?.content?.[0]?.text || fallbackPayload(cluster, target)).trim();
    } catch {
        return fallbackPayload(cluster, target);
    }
}

function fallbackPayload(cluster: FeedbackCluster, target: ImprovementTarget): string {
    const sample = cluster.distinctTextFragments[0] || '(no text)';
    return `[fallback ${target}] ${cluster.count} ${cluster.polarity} signals on ${cluster.deliverableType}/${cluster.sectionScope || 'overall'}: ${sample}`;
}

// --- APPLICATION ---

async function applyConstraint(candidate: ImprovementCandidate): Promise<boolean> {
    // QUALITY GATE (Phase 1, 2026-05-29): the LLM that synthesizes the payload
    // can re-emit a master-rule violation (e.g. "quantify in dollars") or a
    // generic stub. Never append one to the constraint store - that is exactly
    // how learned-constraints.md accreted 21 duplicate dollar-quantification
    // rules that contradict the master Quantitative Claim Rule.
    const verdict = evaluateConstraint(candidate.payload);
    if (!verdict.accept) {
        console.log(`[LearningEngine] Constraint rejected by quality gate (${verdict.reason}): ${candidate.payload}`);
        return false;
    }
    const entry = `- CONSTRAINT [${candidate.cluster.deliverableType}/${candidate.cluster.sectionScope || 'overall'}]: ${candidate.payload} (source: ${candidate.cluster.count} feedback signals, confidence ${candidate.confidence.toFixed(2)})`;
    return appendToPage('synthesis/learned-constraints.md', entry);
}

async function applyAntiPattern(candidate: ImprovementCandidate): Promise<boolean> {
    let parsed: any = null;
    try { parsed = JSON.parse(candidate.payload); } catch { /* fall through */ }
    if (!parsed || !parsed.name) {
        const fallback = `\n### AP-LEARNED: from-feedback-${Date.now()}\n- **Description**: ${candidate.payload}\n- **Source**: ${candidate.cluster.count} feedback signals\n- **Added**: ${new Date().toISOString().split('T')[0]}\n`;
        return appendToPage(`anti-patterns/${candidate.cluster.deliverableType}.md`, fallback);
    }
    const entry = `\n### AP-LEARNED: ${parsed.name}\n- **Description**: ${parsed.description}\n- **Detection**: ${parsed.detection}\n- **Alternative**: ${parsed.alternative}\n- **Source**: Learned from ${candidate.cluster.count} user feedback signals (confidence ${candidate.confidence.toFixed(2)})\n- **Added**: ${new Date().toISOString().split('T')[0]}\n`;
    return appendToPage(`anti-patterns/${candidate.cluster.deliverableType}.md`, entry);
}

async function applySkillPatch(candidate: ImprovementCandidate): Promise<{ ok: boolean; skillName?: string }> {
    // Map deliverable type to the responsible skill. This is a best-effort
    // table - the deliverable-type vocabulary used by feedback widgets is
    // a superset of the skill name vocabulary.
    const skillNameMap: Record<string, string> = {
        'personas': 'persona-architect',
        'persona': 'persona-architect',
        'roadmap': 'roadmap-builder',
        'strategy': 'strategy-author',
        'deck': 'deck-narrative-composer',
        'presentations': 'deck-narrative-composer',
        'prd': 'prd-compiler',
        'blueprint': 'service-blueprint-mapper',
        'recommendations': 'recommendation-architect',
        'recommendation': 'recommendation-architect',
        'gap-analysis': 'gap-analysis-evaluator',
        'gap_analysis': 'gap-analysis-evaluator',
        'tech-audit': 'tech-audit-inspector',
        'tech_audit': 'tech-audit-inspector',
        'competitive': 'competitive-analyst',
        'competitive_analysis': 'competitive-analyst',
        'tech_architecture': 'tech-arch-generator',
        'themes': 'theme-analyst',
        'theme': 'theme-analyst',
        'proto': 'experience-prototype-composer',
        'whitepaper': 'strategic-report-writer',
    };
    const skillName = skillNameMap[candidate.cluster.deliverableType];
    if (!skillName) {
        return { ok: false };
    }
    const success = await patchSkillFile(skillName, candidate);
    return { ok: success, skillName };
}

async function patchSkillFile(skillName: string, candidate: ImprovementCandidate): Promise<boolean> {
    // Read the existing SKILL.md, archive it under _versions/, write the new
    // version with incremented version field, and append the patch to the
    // skill body under a "## Learned behaviors" section.
    const skillPath = `skills/${skillName}/SKILL.md`;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/skill/read?name=${encodeURIComponent(skillName)}`);
        if (!resp.ok) {
            // The skill-read endpoint may not exist yet - fall back to
            // appending the learned behavior to the wiki's skill-improvements
            // log so we don't lose the signal.
            return await appendToPage('synthesis/skill-improvements.md', `\n## ${new Date().toISOString().split('T')[0]} | ${skillName}\n${candidate.payload}\n(source: ${candidate.cluster.count} signals, confidence ${candidate.confidence.toFixed(2)})\n`);
        }
        const data = await resp.json();
        const oldContent: string = data.content || '';
        const oldVersion = parseSkillVersion(oldContent);
        const newVersion = incrementVersion(oldVersion);
        const today = new Date().toISOString().split('T')[0];
        const updated = patchSkillContent(oldContent, candidate.payload, newVersion, today, candidate.cluster.count);
        const writeResp = await fetch(`${PROXY_BASE}/api/skill/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: skillName,
                content: updated,
                archive_version: oldVersion,
            }),
        });
        return writeResp.ok;
    } catch {
        // Always log the attempted patch so signal isn't lost
        return await appendToPage('synthesis/skill-improvements.md', `\n## ${new Date().toISOString().split('T')[0]} | ${skillName} (patch failed)\n${candidate.payload}\n`);
    }
}

function parseSkillVersion(content: string): string {
    const match = content.match(/^version:\s*([0-9.]+)/m);
    return match ? match[1] : '1.0';
}

function incrementVersion(v: string): string {
    const parts = v.split('.').map(Number);
    if (parts.length < 2) parts.push(0);
    parts[parts.length - 1] += 1;
    return parts.join('.');
}

function patchSkillContent(oldContent: string, patch: string, newVersion: string, today: string, signalCount: number): string {
    // Bump version in frontmatter
    let updated = oldContent;
    if (/^version:\s*[0-9.]+/m.test(updated)) {
        updated = updated.replace(/^version:\s*[0-9.]+/m, `version: ${newVersion}`);
    } else {
        // Add version line after the name field
        updated = updated.replace(/^(name:[^\n]+)\n/m, `$1\nversion: ${newVersion}\nlast_improved: ${today}\n`);
    }
    // Append to a Learned behaviors section
    const learnedBlock = `\n\n<!-- learned behavior added ${today} from ${signalCount} feedback signals -->\n${patch}\n`;
    if (/## Learned behaviors/i.test(updated)) {
        updated = updated.replace(/## Learned behaviors\n/i, `## Learned behaviors\n${learnedBlock}\n`);
    } else {
        updated = updated + `\n\n## Learned behaviors\n${learnedBlock}\n`;
    }
    return updated;
}

/**
 * 2026-05-23 - Karpathy Phase 2.3 self-improvement loop hook.
 * Reads every wiki/known-gaps/*.md file (cross-engagement shortfall log written
 * by knowledgeGapFinder.persistGapsToKnownGaps) and surfaces the top recurring
 * shortfall topics so the source-discovery scheduler can bias future fetches
 * toward those topics. The returned list is also exposed to
 * loadGenerationContext consumers as a system-prompt addendum:
 *   "Prior engagements have repeatedly hit shortfalls on: <topic A>, <topic B>...
 *    Prioritize evidence collection on these topics."
 */
export async function getRecurringShortfallTopics(): Promise<Array<{ topic: string; occurrenceCount: number; engagementSlugs: string[] }>> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/known-gaps`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const files: string[] = (data.files || []).filter((f: string) => f.endsWith('.md') && f !== 'README.md');
        const topicCounts: Array<{ topic: string; occurrenceCount: number; engagementSlugs: string[] }> = [];

        for (const file of files) {
            try {
                const fileResp = await fetch(`${PROXY_BASE}/api/wiki/read/known-gaps/${encodeURIComponent(file)}`);
                if (!fileResp.ok) continue;
                const fileData = await fileResp.json();
                const content: string = fileData.content || '';
                // Each "## YYYY-MM-DD | <engagement-slug>" block counts as one occurrence
                const occurrences = (content.match(/^## \d{4}-\d{2}-\d{2} \|/gm) || []).length;
                const slugMatches = content.match(/^## \d{4}-\d{2}-\d{2} \| ([^\n]+)$/gm) || [];
                const slugs = slugMatches.map(m => m.replace(/^## \d{4}-\d{2}-\d{2} \| /, '').trim());
                if (occurrences >= 2) {
                    topicCounts.push({
                        topic: file.replace(/\.md$/, ''),
                        occurrenceCount: occurrences,
                        engagementSlugs: Array.from(new Set(slugs)),
                    });
                }
            } catch {
                // skip
            }
        }
        topicCounts.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
        return topicCounts.slice(0, 20);
    } catch {
        return [];
    }
}

async function applyChunkConfigPromotion(candidate: ImprovementCandidate): Promise<{ ok: boolean; artifactType?: string }> {
    // 2026-05-23 - Promote a per-run chunking bump to a persisted override
    // in wiki/synthesis/chunk-config.json. Reads the current default plan
    // and bumps either chunk count, per-chunk budget, or both, depending on
    // the feedback signal pattern. The override applies on every subsequent
    // run of this artifact type until retired.
    let parsed: any = null;
    try { parsed = JSON.parse(candidate.payload); } catch { return { ok: false }; }
    if (!parsed || !parsed.artifactType) return { ok: false };

    const artifactType = parsed.artifactType as ArtifactType;
    const applied: string[] = Array.isArray(parsed.applied) ? parsed.applied : [];

    // Conservative promotion: use the per-run bump factor but rounded to
    // integers, so the persisted override is durable without runaway growth.
    // We do not read the current overrides to "stack" - persistChunkOverride
    // does shallow merge with existing record.
    const override: Record<string, any> = {};
    let hasIncomplete = false;
    let hasTooShort = false;
    for (const tag of applied) {
        if (tag.startsWith('incomplete:')) hasIncomplete = true;
        if (tag.startsWith('too_short:')) hasTooShort = true;
    }

    // Encode as relative bumps so the calculator's defaults still own the base
    // numbers. We persist as absolute adjustments - small bumps so 5 separate
    // promotions don't compound destructively.
    if (hasIncomplete) {
        override.chunkCountBump = 1;          // +1 chunk durable
        override.perChunkOutputBudgetBump = 1500; // +1.5K tokens durable
    }
    if (hasTooShort) {
        override.perChunkOutputBudgetBump = (override.perChunkOutputBudgetBump || 0) + 2000;
    }
    override.rationale = parsed.rationale || `Learned from ${candidate.cluster.count} feedback signals`;
    override.promotedFrom = candidate.cluster.count;
    override.promotedAt = new Date().toISOString();

    const ok = await persistChunkOverride(artifactType, override as any);
    return { ok, artifactType };
}

async function applyExemplar(candidate: ImprovementCandidate): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const sample = candidate.cluster.distinctTextFragments[0] || '(positive vote/star-only signal)';
    const entry = `\n## EXEMPLAR (${today}) - from ${candidate.cluster.count} positive signals\n${candidate.payload}\n\nUser-cited praise: "${sample.slice(0, 200)}"\n`;
    return appendToPage(`exemplars/${candidate.cluster.deliverableType}.md`, entry);
}

async function queueFrameworkUpdate(candidate: ImprovementCandidate): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const path = `frameworks/_pending/${candidate.cluster.deliverableType}-${today}.md`;
    const content = `---\ntitle: Proposed framework update ${candidate.cluster.deliverableType}\ntype: framework-patch-proposal\nproposed_at: ${today}\nsource_signals: ${candidate.cluster.count}\nconfidence: ${candidate.confidence}\nstatus: pending-review\n---\n\n# Proposed addition to frameworks/${candidate.cluster.deliverableType}.md\n\n${candidate.payload}\n\n## Source\n${candidate.cluster.count} negative feedback signals on the ${candidate.cluster.deliverableType} deliverable's overall structure.\n\n## Sample fragments\n${candidate.cluster.distinctTextFragments.map(f => `- "${f.slice(0, 160)}"`).join('\n')}\n`;
    return writeFullPage(path, content);
}

// --- WIKI WRITE HELPERS ---

async function appendToPage(relativePath: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

async function writeFullPage(relativePath: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

async function appendLog(entry: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'log.md', content: entry }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

// --- CONSTRAINT EFFECTIVENESS (Phase 3.5) ---

export interface ConstraintRecord {
    text: string;
    deliverableType: string;
    sectionScope: string | null;
    addedAt: string;
    applications: number;
    repeatedNegativeSignalsAfter: number; // negative signals on same scope after this constraint was added
}

export interface EffectivenessReport {
    constraints: Array<{
        text: string;
        applications: number;
        effectiveness: number;
        decision: 'keep' | 'promote-to-skill-patch' | 'retire';
        rationale: string;
    }>;
}

/**
 * Compute effectiveness as: 1 - (repeated_negative_signals_after / applications).
 * High effectiveness = few repeated negatives after the constraint was added.
 */
export async function reviewConstraintEffectiveness(): Promise<EffectivenessReport> {
    let records: ConstraintRecord[] = [];
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/constraint-records.json`);
        if (resp.ok) {
            const data = await resp.json();
            const parsed = JSON.parse(data.content || '[]');
            if (Array.isArray(parsed)) records = parsed;
        }
    } catch {
        // First run; no records yet
    }
    const out: EffectivenessReport['constraints'] = [];
    for (const r of records) {
        const effectiveness = r.applications > 0
            ? Math.max(0, 1 - (r.repeatedNegativeSignalsAfter / r.applications))
            : 0.5;
        let decision: 'keep' | 'promote-to-skill-patch' | 'retire' = 'keep';
        let rationale = `Effectiveness ${(effectiveness * 100).toFixed(0)}% over ${r.applications} applications.`;
        if (r.applications >= 20 && effectiveness < CONSTRAINT_RETIRE_FLOOR) {
            decision = 'retire';
            rationale += ` Below ${CONSTRAINT_RETIRE_FLOOR * 100}% retire floor.`;
        } else if (r.applications >= 20 && effectiveness > CONSTRAINT_PROMOTE_CEILING) {
            decision = 'promote-to-skill-patch';
            rationale += ` Above ${CONSTRAINT_PROMOTE_CEILING * 100}% promotion ceiling.`;
        }
        out.push({
            text: r.text,
            applications: r.applications,
            effectiveness,
            decision,
            rationale,
        });
    }
    return { constraints: out };
}

// --- ORCHESTRATION ---

/**
 * Main entry: run a full learning pass.
 *
 * 1. Read feedback index
 * 2. Cluster
 * 3. Route each cluster
 * 4. Generate payload
 * 5. Estimate confidence
 * 6. Apply at high confidence; queue at review; reject at low
 * 7. Log the pass to wiki/log.md
 */
export async function runLearningPass(opts: { dryRun?: boolean } = {}): Promise<LearningPassResult> {
    const startedAt = new Date();
    const runId = `learn_${startedAt.getTime()}`;
    const index = await readFeedbackIndex();
    const clusters = clusterFeedback(index);
    const applied: ImprovementCandidate[] = [];
    const queuedForReview: ImprovementCandidate[] = [];
    const rejected: ImprovementCandidate[] = [];
    const skillsTouched: string[] = [];
    const chunkConfigsPromoted: string[] = [];

    for (const cluster of clusters) {
        const target = routeCluster(cluster);
        const payload = await generatePayload(cluster, target);
        const confidence = estimateConfidence(cluster, target);
        const candidate: ImprovementCandidate = {
            id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            cluster,
            target,
            payload,
            confidence,
            rationale: `Clustered ${cluster.count} ${cluster.polarity} signals on ${cluster.deliverableType}/${cluster.sectionScope || 'overall'}. Routed to ${target}.`,
            proposedAt: new Date().toISOString(),
        };

        if (opts.dryRun) {
            queuedForReview.push(candidate);
            continue;
        }

        if (confidence < REVIEW_CONFIDENCE) {
            rejected.push(candidate);
            continue;
        }
        if (confidence < HIGH_CONFIDENCE && target === 'framework-page') {
            // Framework page changes are always queued for review regardless
            await queueFrameworkUpdate(candidate);
            queuedForReview.push(candidate);
            continue;
        }
        if (confidence < HIGH_CONFIDENCE) {
            queuedForReview.push(candidate);
            continue;
        }

        // Apply
        let success = false;
        switch (target) {
            case 'constraint':
                success = await applyConstraint(candidate);
                break;
            case 'anti-pattern':
                success = await applyAntiPattern(candidate);
                break;
            case 'skill-patch': {
                const r = await applySkillPatch(candidate);
                success = r.ok;
                if (r.ok && r.skillName) skillsTouched.push(r.skillName);
                break;
            }
            case 'framework-page':
                success = await queueFrameworkUpdate(candidate);
                break;
            case 'exemplar':
                success = await applyExemplar(candidate);
                break;
            case 'chunk-config': {
                const r = await applyChunkConfigPromotion(candidate);
                success = r.ok;
                if (r.ok && r.artifactType) chunkConfigsPromoted.push(r.artifactType);
                break;
            }
        }
        if (success) applied.push(candidate);
        else rejected.push(candidate);
    }

    const effectiveness = await reviewConstraintEffectiveness();
    const constraintsRetired = effectiveness.constraints
        .filter(c => c.decision === 'retire')
        .map(c => c.text);

    const finishedAt = new Date();
    const result: LearningPassResult = {
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        clustersDetected: clusters.length,
        candidatesProduced: applied.length + queuedForReview.length + rejected.length,
        applied,
        queuedForReview,
        rejected,
        skillsTouched,
        constraintsRetired,
        chunkConfigsPromoted,
    };

    if (!opts.dryRun) {
        const today = startedAt.toISOString().split('T')[0];
        const logEntry = `\n## [${today}] learn | Learning pass ${runId}\n` +
            `  - clusters: ${clusters.length}\n` +
            `  - applied: ${applied.length}\n` +
            `  - queued: ${queuedForReview.length}\n` +
            `  - rejected: ${rejected.length}\n` +
            `  - skills_touched: ${skillsTouched.join(', ') || 'none'}\n` +
            `  - chunk_configs_promoted: ${chunkConfigsPromoted.join(', ') || 'none'}\n` +
            `  - constraints_retired: ${constraintsRetired.length}\n` +
            `  - duration_ms: ${result.durationMs}\n`;
        await appendLog(logEntry);
    }

    return result;
}

/**
 * Helper for the change-promotion surfaces. Reads recent improvements that
 * have been applied since `since` (ISO timestamp).
 */
export async function getRecentImprovements(since: string): Promise<{
    skillsBumped: Array<{ name: string; version: string; date: string }>;
    antiPatternsAdded: Array<{ type: string; name: string; date: string }>;
    constraintsAdded: number;
    exemplarsAdded: number;
    frameworkUpdatesPending: number;
}> {
    // Best-effort read of the relevant wiki pages and proxy endpoints.
    // For Phase 3 MVP, return zeroes when the data isn't available so the UI
    // gracefully renders an empty state instead of crashing.
    const out = {
        skillsBumped: [] as Array<{ name: string; version: string; date: string }>,
        antiPatternsAdded: [] as Array<{ type: string; name: string; date: string }>,
        constraintsAdded: 0,
        exemplarsAdded: 0,
        frameworkUpdatesPending: 0,
    };
    try {
        const sinceMs = new Date(since).getTime();
        // Constraints
        const conResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/learned-constraints.md`);
        if (conResp.ok) {
            const data = await conResp.json();
            const lines = (data.content || '').split('\n');
            for (const line of lines) {
                if (/^-\s+CONSTRAINT/.test(line)) {
                    out.constraintsAdded += 1; // count active constraints; finer date filtering when records persist
                }
            }
        }
        // Pending framework updates
        const pfResp = await fetch(`${PROXY_BASE}/api/wiki/list/frameworks/_pending`);
        if (pfResp.ok) {
            const data = await pfResp.json();
            out.frameworkUpdatesPending = (data.files || []).length;
        }
        // Skills with last_improved >= since
        const skillsResp = await fetch(`${PROXY_BASE}/api/skill/list-versions`);
        if (skillsResp.ok) {
            const data = await skillsResp.json();
            for (const s of data.skills || []) {
                if (s.last_improved && new Date(s.last_improved).getTime() >= sinceMs) {
                    out.skillsBumped.push({ name: s.name, version: s.version || '1.0', date: s.last_improved });
                }
            }
        }
    } catch {
        // Best-effort
    }
    return out;
}
