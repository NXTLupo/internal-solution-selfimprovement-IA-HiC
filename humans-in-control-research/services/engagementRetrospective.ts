// engagementRetrospective.ts — 2026-05-11 (HiC-Active-Loop #7)
//
// Session-end "PreCompact" hook applied to the whole engagement. Captures
// everything the system learned across this run — deliverables produced,
// edits the user made, constraints learned, sources cited, themes built —
// and writes a single structured retrospective to:
//
//   wiki/engagements/{slug}-retrospective.md
//
// Next time the user starts a research goal that semantically overlaps with
// this one, the engagement-memory matcher (already in App.tsx via
// priorEngagementMatches) auto-loads the retrospective into the new prompt.
// That's the closing of the self-improvement loop:
//
//   Edits → Constraints → Future generations get sharper (loop #3 — shipped)
//   Engagement run → Retrospective → Future engagements inherit (loop #7 — this)
//
// The retrospective is intentionally STRUCTURED markdown — easy for the
// matcher to read, easy for the model to load into context, and easy for
// humans to skim later.

const PROXY_BASE = 'http://localhost:5012';

export interface EngagementSnapshot {
    researchGoal: string;
    startedAt?: string;          // ISO timestamp of engagement start
    completedAt: string;         // ISO timestamp of retrospective capture
    sourceResults?: any[];       // liveSourceResults from App.tsx
    themes?: any[];              // themesResult.themes
    personas?: any[];            // personasResult.personas
    journeyStages?: any[];
    recommendations?: any[];
    deliverables?: string[];     // labels of generated deliverables
    fileNames?: string[];        // uploaded document names
    chatTurnCount?: number;
    learnedConstraints?: Array<{ rule: string; rationale?: string }>;
    knowledgeGraph?: { nodes: any[]; edges: any[] };
}

/**
 * Build a structured retrospective markdown from an engagement snapshot.
 * No LLM call — this is pure assembly of session metadata so the matcher
 * gets exact strings (not paraphrased) and the retrospective costs zero
 * tokens to produce. The optional LLM enrichment pass (`enrichWithInsights`)
 * adds a narrative summary if the caller wants one.
 */
export function buildRetrospectiveMarkdown(snap: EngagementSnapshot): string {
    const slug = slugifyGoal(snap.researchGoal);
    const lines: string[] = [];

    // YAML frontmatter — matched against future engagements via the
    // existing engagementMemoryMatcher (App.tsx priorEngagementMatches).
    lines.push('---');
    lines.push(`title: ${JSON.stringify(`Retrospective: ${snap.researchGoal.slice(0, 100)}`)}`);
    lines.push(`type: engagement-retrospective`);
    lines.push(`slug: ${JSON.stringify(slug)}`);
    lines.push(`research_goal: ${JSON.stringify(snap.researchGoal)}`);
    lines.push(`started_at: ${JSON.stringify(snap.startedAt || '')}`);
    lines.push(`completed_at: ${JSON.stringify(snap.completedAt)}`);
    lines.push(`status: archived`);
    if (snap.fileNames && snap.fileNames.length > 0) {
        lines.push(`uploaded_files: ${JSON.stringify(snap.fileNames)}`);
    }
    if (snap.deliverables && snap.deliverables.length > 0) {
        lines.push(`deliverables: ${JSON.stringify(snap.deliverables)}`);
    }
    // Tags drive semantic matching downstream. Pull from theme/persona names
    // so a future goal mentioning the same concepts gets a hit.
    const tags = collectTags(snap);
    if (tags.length > 0) {
        lines.push(`tags: ${JSON.stringify(tags)}`);
    }
    lines.push('---');
    lines.push('');

    // Body sections — same shape as the PreCompact session digest so the
    // model parses them consistently.
    lines.push(`# Retrospective: ${snap.researchGoal}`);
    lines.push('');
    lines.push(`Completed: ${snap.completedAt}${snap.startedAt ? ` (started ${snap.startedAt})` : ''}`);
    lines.push('');

    lines.push('## Research goal');
    lines.push(snap.researchGoal);
    lines.push('');

    if (snap.themes && snap.themes.length > 0) {
        lines.push(`## Themes identified (${snap.themes.length})`);
        for (const t of snap.themes.slice(0, 30)) {
            const name = (t as any).name || (t as any).label || '(unnamed)';
            const ev = (t as any).evidenceCount ?? ((t as any).citations?.length || 0);
            const summary = (t as any).description || (t as any).summary || '';
            lines.push(`- **${name}** (${ev} evidence) — ${summary.slice(0, 200)}`);
        }
        lines.push('');
    }

    if (snap.personas && snap.personas.length > 0) {
        lines.push(`## Personas synthesized (${snap.personas.length})`);
        for (const p of snap.personas.slice(0, 12)) {
            const name = (p as any).name || (p as any).role || '(unnamed)';
            const role = (p as any).role || '';
            const goals = ((p as any).goals || []).slice(0, 2).join('; ');
            lines.push(`- **${name}** (${role})${goals ? ` — Goals: ${goals}` : ''}`);
        }
        lines.push('');
    }

    if (snap.recommendations && snap.recommendations.length > 0) {
        lines.push(`## Recommendations (${snap.recommendations.length})`);
        for (const r of snap.recommendations.slice(0, 12)) {
            const title = (r as any).title || (r as any).name || '(untitled)';
            const desc = (r as any).description || (r as any).rationale || '';
            lines.push(`- **${title}** — ${desc.slice(0, 250)}`);
        }
        lines.push('');
    }

    if (snap.sourceResults && snap.sourceResults.length > 0) {
        const productive = snap.sourceResults.filter((s: any) =>
            (s.status === 'complete' || s.status === 'completed') && (s.items?.length || 0) > 0
        );
        lines.push(`## Sources that contributed evidence (${productive.length} of ${snap.sourceResults.length} active)`);
        for (const s of productive.slice(0, 50)) {
            const itemCount = (s.items?.length || 0);
            lines.push(`- ${s.source || s.sourceId} (${itemCount} item${itemCount === 1 ? '' : 's'})`);
        }
        lines.push('');
    }

    if (snap.learnedConstraints && snap.learnedConstraints.length > 0) {
        lines.push(`## Constraints learned during this engagement (${snap.learnedConstraints.length})`);
        for (const c of snap.learnedConstraints) {
            lines.push(`- ${c.rule}${c.rationale ? ` _(${c.rationale})_` : ''}`);
        }
        lines.push('');
    }

    if (snap.deliverables && snap.deliverables.length > 0) {
        lines.push('## Deliverables produced');
        for (const d of snap.deliverables) {
            lines.push(`- ${d}`);
        }
        lines.push('');
    }

    if (snap.chatTurnCount && snap.chatTurnCount > 0) {
        lines.push(`## Chat activity`);
        lines.push(`- ${snap.chatTurnCount} chat turns during this engagement`);
        lines.push('');
    }

    if (snap.knowledgeGraph) {
        const nodes = snap.knowledgeGraph.nodes || [];
        const themesN = nodes.filter((n: any) => n.type === 'theme').length;
        const evidenceN = nodes.filter((n: any) => n.type === 'evidence').length;
        const sourcesN = nodes.filter((n: any) => n.type === 'source').length;
        lines.push('## Knowledge graph at session end');
        lines.push(`- ${nodes.length} total nodes (${themesN} themes, ${evidenceN} evidence, ${sourcesN} sources)`);
        lines.push(`- ${(snap.knowledgeGraph.edges || []).length} edges`);
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('_This retrospective was auto-generated at session end. The engagement-memory matcher loads it into future research prompts where the goal semantically overlaps._');

    return lines.join('\n');
}

/**
 * Persist a retrospective to wiki/engagements/{slug}-retrospective.md.
 * Idempotent — overwrites existing file for the same slug, so re-running
 * "End Engagement" on the same goal updates rather than duplicates.
 */
export async function saveRetrospective(snap: EngagementSnapshot): Promise<{ ok: boolean; path: string; error?: string }> {
    const slug = slugifyGoal(snap.researchGoal);
    const path = `engagements/${slug}-retrospective.md`;
    const content = buildRetrospectiveMarkdown(snap);
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content }),
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            return { ok: false, path, error: `HTTP ${resp.status}: ${err.slice(0, 200)}` };
        }
        return { ok: true, path };
    } catch (e: any) {
        return { ok: false, path, error: e?.message || 'fetch failed' };
    }
}

function slugifyGoal(goal: string): string {
    return (goal || 'untitled-engagement')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60)
        .replace(/-+$/, '');
}

function collectTags(snap: EngagementSnapshot): string[] {
    const tags = new Set<string>();
    // Pull tag-shaped tokens from theme + persona names
    const themeNames = (snap.themes || []).map((t: any) => t.name || t.label).filter(Boolean);
    const personaNames = (snap.personas || []).map((p: any) => p.name || p.role).filter(Boolean);
    for (const n of [...themeNames, ...personaNames]) {
        // Tokenize on whitespace, keep meaningful words (3+ chars, not stopwords)
        const stopwords = new Set(['and', 'the', 'for', 'with', 'from', 'this', 'that', 'into', 'over', 'than']);
        for (const w of String(n).toLowerCase().split(/[\s_-]+/)) {
            const tok = w.replace(/[^a-z0-9]/g, '');
            if (tok.length >= 4 && !stopwords.has(tok)) tags.add(tok);
        }
    }
    return Array.from(tags).slice(0, 20);
}
