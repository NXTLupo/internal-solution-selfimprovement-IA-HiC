/**
 * Wiki Compiler - Loop 2 of the self-improvement architecture.
 *
 * Regenerates synthesis pages from the evidence layer on a schedule.
 * Evidence becomes authoritative; synthesis becomes a derived view that
 * cannot drift because it can be rebuilt at will.
 *
 * Also produces cross-engagement pattern pages once an engagement type +
 * industry has accumulated >=5 prior engagements.
 *
 * Created 2026-05-22 as part of Phase 5 of the self-improvement loop.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';
const STALE_SYNTHESIS_DAYS = 30;
const MIN_ENGAGEMENTS_FOR_PATTERN = 5;

// --- TYPES ---

export interface CompileResult {
    runId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    synthesisPagesRegenerated: string[];
    synthesisPagesSkipped: string[];
    crossEngagementPatternsCompiled: string[];
    proposedDiffs: number;
    autoApplied: number;
    indexRegenerated: boolean;
    changelog: string;
}

// Dirs holding curated, human-navigable knowledge pages (enumerated in the
// index). Flat or shallow - safe to list precisely on every compile.
const CURATED_INDEX_DIRS = [
    'frameworks', 'anti-patterns', 'benchmarks', 'brand', 'synthesis',
    'evidence', 'methodologies', 'mentors', 'industries', 'deep-research',
    'known-gaps', 'inspiration-hub', 'exemplars',
];
// Dirs holding the raw RAG corpus (semantic-search tier). Counted, not
// enumerated - listing 8,000+ scraped files would defeat the index's purpose.
const CORPUS_INDEX_DIRS = [
    'articles', 'social-intelligence', 'sources', 'uploads', 'transcripts',
    'engagements', 'presentations',
];

interface EvidencePage {
    path: string;
    content: string;
    tags: string[];
}

interface SynthesisPage {
    path: string;
    content: string;
    updated: Date | null;
    title: string;
}

interface EngagementPage {
    path: string;
    slug: string;
    industry: string | null;
    engagementType: string | null;
    goals: string[];
    themes: string[];
    personas: string[];
    recommendations: string[];
}

// --- LIGHTWEIGHT WIKI ACCESS ---

async function listDir(path: string): Promise<{ files: string[]; dirs: string[] }> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/${path}`);
        if (!resp.ok) return { files: [], dirs: [] };
        const data = await resp.json();
        return { files: data.files || [], dirs: data.dirs || [] };
    } catch {
        return { files: [], dirs: [] };
    }
}

async function readPage(path: string): Promise<string | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${path}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.content || null;
    } catch {
        return null;
    }
}

async function writePage(path: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

function parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const out: Record<string, any> = {};
    for (const line of match[1].split('\n')) {
        const eq = line.indexOf(':');
        if (eq < 0) continue;
        const key = line.substring(0, eq).trim();
        let value: any = line.substring(eq + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
            try { value = JSON.parse(value.replace(/'/g, '"')); } catch { /* leave */ }
        }
        if (typeof value === 'string') {
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
        }
        out[key] = value;
    }
    return out;
}

// --- EVIDENCE + SYNTHESIS LOADING ---

async function loadEvidencePages(): Promise<EvidencePage[]> {
    const pages: EvidencePage[] = [];
    const { files } = await listDir('evidence');
    for (const f of files) {
        if (!f.endsWith('.md')) continue;
        const content = await readPage(`evidence/${f}`);
        if (!content) continue;
        const fm = parseFrontmatter(content);
        pages.push({
            path: `evidence/${f}`,
            content,
            tags: Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === 'string' ? [fm.tags] : []),
        });
    }
    return pages;
}

// 2026-05-22 - Pages owned by other loops MUST NOT be regenerated from the
// evidence layer. These pages are append-only outputs of services like
// learningEngine, persistQualityScore, verifierService, and wikiLintService.
// Regenerating them destroys their content. Exclude by exact filename OR
// by frontmatter `exclude_from_compile: true`.
const COMPILE_EXCLUDE_FILES = new Set([
    'learned-constraints.md',
    'quality-scores.md',
    'verifier-history.md',
    'last-lint.json',
    'skill-improvements.md',
    'learning-state.json',
    'constraint-effectiveness.json',
    'constraint-records.json',
]);

async function loadSynthesisPages(): Promise<SynthesisPage[]> {
    const pages: SynthesisPage[] = [];
    const { files } = await listDir('synthesis');
    for (const f of files) {
        if (!f.endsWith('.md')) continue;
        if (f.startsWith('lint-') || f.startsWith('compile-')) continue;
        if (COMPILE_EXCLUDE_FILES.has(f)) continue;
        const content = await readPage(`synthesis/${f}`);
        if (!content) continue;
        const fm = parseFrontmatter(content);
        // Frontmatter opt-out: any page that declares `exclude_from_compile: true`
        // is skipped even if its filename isn't in COMPILE_EXCLUDE_FILES.
        if (fm.exclude_from_compile === true || fm.exclude_from_compile === 'true') continue;
        const updated = fm.updated ? new Date(String(fm.updated)) : null;
        pages.push({
            path: `synthesis/${f}`,
            content,
            updated: updated && !Number.isNaN(updated.getTime()) ? updated : null,
            title: fm.title || f,
        });
    }
    return pages;
}

async function loadEngagementPages(): Promise<EngagementPage[]> {
    const out: EngagementPage[] = [];
    const { files, dirs } = await listDir('engagements');
    const allFiles: string[] = [];
    for (const f of files) {
        if (f.endsWith('.md')) allFiles.push(`engagements/${f}`);
    }
    for (const d of dirs) {
        const sub = await listDir(`engagements/${d}`);
        for (const sf of sub.files) {
            if (sf.endsWith('.md')) allFiles.push(`engagements/${d}/${sf}`);
        }
    }

    for (const path of allFiles) {
        const content = await readPage(path);
        if (!content) continue;
        const fm = parseFrontmatter(content);
        const slug = path.replace(/^engagements\//, '').replace(/\.md$/, '').replace(/\//g, '__');
        const goals = extractListUnderHeading(content, /##\s+Goals?\s*\n/i);
        const themes = extractListUnderHeading(content, /##\s+Themes?\s*\n/i);
        const personas = extractListUnderHeading(content, /##\s+Personas?\s*\n/i);
        const recommendations = extractListUnderHeading(content, /##\s+Recommendations?\s*\n/i);
        out.push({
            path,
            slug,
            industry: fm.industry || null,
            engagementType: fm.engagement_type || fm.type || null,
            goals,
            themes,
            personas,
            recommendations,
        });
    }
    return out;
}

function extractListUnderHeading(content: string, headingRe: RegExp): string[] {
    const match = content.match(new RegExp(headingRe.source + '([\\s\\S]*?)(?=\\n##|\\n#|$)', 'i'));
    if (!match) return [];
    return match[1]
        .split('\n')
        .filter(l => /^[-*]\s+/.test(l.trim()))
        .map(l => l.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean)
        .slice(0, 20);
}

// --- SYNTHESIS REGENERATION ---

async function regenerateSynthesisPage(
    page: SynthesisPage,
    evidence: EvidencePage[],
): Promise<{ newContent: string; changed: boolean } | null> {
    // Identify the evidence pages that share tags with this synthesis page's
    // title (a coarse but effective filter). For a stronger filter we would
    // embed the synthesis title and rerank evidence pages - out of scope for
    // the MVP.
    const titleLower = page.title.toLowerCase();
    const titleTokens = titleLower.split(/\s+/).filter(t => t.length > 4);
    const relevantEvidence = evidence.filter(e => {
        const lc = e.content.toLowerCase();
        return titleTokens.some(t => lc.includes(t)) || e.tags.some(t => titleLower.includes(String(t).toLowerCase()));
    }).slice(0, 8); // cap at 8 to control prompt size

    if (relevantEvidence.length === 0) {
        return { newContent: page.content, changed: false };
    }

    const evidenceBlock = relevantEvidence
        .map(e => `=== ${e.path} ===\n${e.content.slice(0, 2000)}`)
        .join('\n\n');

    const prompt = `Regenerate this synthesis page from the evidence below.

CURRENT SYNTHESIS PAGE TITLE: ${page.title}

EXISTING CONTENT (for context - replace fully):
${page.content.slice(0, 3000)}

EVIDENCE PAGES (the authoritative source of truth):
${evidenceBlock}

RULES:
- Cite every claim with the evidence file it came from (e.g., "[evidence/cx-maturity.md]")
- Drop any claim from the existing page that no longer has evidence backing
- Flag contradictions across evidence pages explicitly
- Preserve frontmatter exactly; update only the body
- No meta-narration ("based on the evidence", "this synthesis shows")
- Return ONLY the full revised markdown, starting with the existing frontmatter block`;

    // 2026-05-22 - Model selection. Synthesis regeneration runs across many
    // pages per compile pass and previously called Opus per page (high cost,
    // slow). Gemini 3.5 Flash provides frontier-level performance for the
    // structured "rewrite given evidence" task at ~10% of the Opus cost.
    // We escalate to Opus if Flash returns short or malformed output.
    let newContent: string | null = null;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 4500 },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text && text.length >= 100) newContent = text;
        }
    } catch { /* fall through */ }

    // Escalate to Opus only when Flash returned nothing usable
    if (!newContent) {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-opus-4-8',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            newContent = data?.content?.[0]?.text || null;
            if (!newContent || newContent.length < 100) return null;
        } catch {
            return null;
        }
    }

    // Sanity: keep frontmatter if the regen dropped it
    if (!newContent.startsWith('---') && page.content.startsWith('---')) {
        const fmMatch = page.content.match(/^---\n[\s\S]*?\n---/);
        if (fmMatch) {
            return { newContent: fmMatch[0] + '\n\n' + newContent, changed: true };
        }
    }
    const changed = newContent.replace(/\s+/g, ' ').trim() !== page.content.replace(/\s+/g, ' ').trim();
    return { newContent, changed };
}

// --- CROSS-ENGAGEMENT PATTERN COMPILATION ---

async function compileCrossEngagementPattern(
    engagementType: string,
    industry: string,
    engagements: EngagementPage[],
): Promise<{ path: string; content: string } | null> {
    if (engagements.length < MIN_ENGAGEMENTS_FOR_PATTERN) return null;

    const summary = engagements.map(e => ({
        slug: e.slug,
        goals: e.goals,
        themes: e.themes,
        personas: e.personas,
        recommendations: e.recommendations,
    }));

    const prompt = `You are compiling a cross-engagement pattern page from ${engagements.length} prior engagements of type "${engagementType}" in industry "${industry}".

ENGAGEMENTS (JSON):
${JSON.stringify(summary, null, 2).slice(0, 8000)}

Produce a markdown page that captures:
1. Themes that consistently emerge (count appearances)
2. Personas that recur (count appearances)
3. Recommendations that consistently appear
4. Recommendations that SHOULD appear but rarely do (gap analysis from the goals)

Return STRICT markdown only, starting with frontmatter:
---
title: ${engagementType} ${industry} engagement patterns
type: synthesis
engagement_type: ${engagementType}
industry: ${industry}
sample_size: ${engagements.length}
updated: ${new Date().toISOString().split('T')[0]}
status: active
---

Then the body sections (## Themes, ## Personas, ## Recommendations, ## Gaps).`;

    // 2026-05-22 - Same model strategy as regenerateSynthesisPage. Pattern
    // compilation reads 5+ engagement summaries and writes a single markdown
    // page; Gemini 3.5 Flash handles this with the larger output token budget
    // it supports at low cost. Opus is the fallback.
    let content: string | null = null;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 3500 },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text && text.length >= 200) content = text;
        }
    } catch { /* fall through */ }

    if (!content) {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-opus-4-8',
                    max_tokens: 3000,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            content = data?.content?.[0]?.text || null;
            if (!content || content.length < 200) return null;
        } catch {
            return null;
        }
    }

    const safeType = engagementType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeIndustry = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
        path: `synthesis/patterns/${safeType}-${safeIndustry}.md`,
        content,
    };
}

// --- ORCHESTRATION ---

/**
 * Regenerate wiki/index.md from the live filesystem (Phase 2, 2026-05-29).
 *
 * The hand-maintained index had drifted to "Total pages: 48 | Total sources: 0
 * | Last updated 2026-04-10" against a 9,500+ file reality, breaking the
 * AGENTS.md "read the index first" navigation contract. This rebuilds it with
 * accurate counts and an honest split: curated knowledge pages are enumerated;
 * the raw RAG corpus is counted and labeled, not listed.
 *
 * Returns the new content (caller writes it) or null on failure.
 */
async function buildIndexContent(): Promise<{ content: string; curatedCount: number; corpusCount: number } | null> {
    const date = new Date().toISOString().split('T')[0];
    const curatedSections: string[] = [];
    let curatedCount = 0;

    for (const dir of CURATED_INDEX_DIRS) {
        const { files } = await listDir(dir);
        const pages = files.filter(f => f.endsWith('.md') && f !== 'index.md');
        if (pages.length === 0) continue;
        curatedCount += pages.length;
        const links = pages
            .map(f => f.replace(/\.md$/, ''))
            .sort()
            .map(slug => `- [[${dir}/${slug}]]`)
            .join('\n');
        curatedSections.push(`### ${dir} (${pages.length})\n${links}`);
    }

    // Corpus dirs: count immediate children (files + subdirs) cheaply; label,
    // do not enumerate. For engagements, the subdir count is the engagement count.
    const corpusLines: string[] = [];
    let corpusCount = 0;
    for (const dir of CORPUS_INDEX_DIRS) {
        const { files, dirs } = await listDir(dir);
        const mdFiles = files.filter(f => f.endsWith('.md')).length;
        const childCount = mdFiles + dirs.length;
        if (childCount === 0) continue;
        corpusCount += childCount;
        const label = dirs.length > 0
            ? `${mdFiles} files + ${dirs.length} subdirs`
            : `${mdFiles} files`;
        corpusLines.push(`- ${dir}/ - ${label} (semantic-search tier; query via /api/wiki/fetch-articles)`);
    }

    const content = `# Humans in Control -- Wiki Index
> Last updated: ${date} | Curated pages: ${curatedCount} | Raw corpus entries: ${corpusCount} | Auto-generated by wikiCompiler

This index is regenerated automatically on each wiki compile. Do not hand-edit;
changes will be overwritten. See AGENTS.md for the schema.

## Curated knowledge (navigable; loaded into generation context)

${curatedSections.join('\n\n')}

## Raw corpus (capture tier; retrieved semantically, not enumerated here)

${corpusLines.join('\n')}
`;
    return { content, curatedCount, corpusCount };
}

export async function compileWiki(opts: {
    dryRun?: boolean;
    onlyChanged?: boolean;
    scope?: 'synthesis' | 'patterns' | 'all';
} = {}): Promise<CompileResult> {
    const startedAt = new Date();
    const runId = `compile_${startedAt.getTime()}`;
    const scope = opts.scope || 'all';

    const result: CompileResult = {
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: '',
        durationMs: 0,
        synthesisPagesRegenerated: [],
        synthesisPagesSkipped: [],
        crossEngagementPatternsCompiled: [],
        proposedDiffs: 0,
        autoApplied: 0,
        indexRegenerated: false,
        changelog: '',
    };

    const changelogLines: string[] = [];

    // --- Synthesis regeneration ---
    if (scope === 'synthesis' || scope === 'all') {
        const evidence = await loadEvidencePages();
        const synthesisPages = await loadSynthesisPages();

        for (const page of synthesisPages) {
            const isStale = page.updated
                ? (Date.now() - page.updated.getTime()) > STALE_SYNTHESIS_DAYS * 24 * 60 * 60 * 1000
                : true;
            if (opts.onlyChanged && !isStale) {
                result.synthesisPagesSkipped.push(page.path);
                continue;
            }
            const regen = await regenerateSynthesisPage(page, evidence);
            if (!regen || !regen.changed) {
                result.synthesisPagesSkipped.push(page.path);
                continue;
            }
            result.proposedDiffs += 1;
            if (!opts.dryRun) {
                const success = await writePage(page.path, regen.newContent);
                if (success) {
                    result.synthesisPagesRegenerated.push(page.path);
                    result.autoApplied += 1;
                    changelogLines.push(`- regenerated ${page.path} (${regen.newContent.length - page.content.length >= 0 ? '+' : ''}${regen.newContent.length - page.content.length} chars)`);
                }
            } else {
                changelogLines.push(`- DRY-RUN would regenerate ${page.path}`);
            }
        }
    }

    // --- Cross-engagement patterns ---
    if (scope === 'patterns' || scope === 'all') {
        const engagements = await loadEngagementPages();
        const byTypeIndustry = new Map<string, EngagementPage[]>();
        for (const e of engagements) {
            const type = e.engagementType || 'unknown';
            const industry = e.industry || 'unknown';
            if (industry === 'unknown' || type === 'unknown') continue;
            const key = `${type}::${industry}`;
            if (!byTypeIndustry.has(key)) byTypeIndustry.set(key, []);
            byTypeIndustry.get(key)!.push(e);
        }
        for (const [key, engsList] of byTypeIndustry) {
            if (engsList.length < MIN_ENGAGEMENTS_FOR_PATTERN) continue;
            const [type, industry] = key.split('::');
            const pattern = await compileCrossEngagementPattern(type, industry, engsList);
            if (!pattern) continue;
            result.proposedDiffs += 1;
            if (!opts.dryRun) {
                const success = await writePage(pattern.path, pattern.content);
                if (success) {
                    result.crossEngagementPatternsCompiled.push(pattern.path);
                    result.autoApplied += 1;
                    changelogLines.push(`- compiled pattern ${pattern.path} (${engsList.length} engagements)`);
                }
            } else {
                changelogLines.push(`- DRY-RUN would compile pattern ${pattern.path} (${engsList.length} engagements)`);
            }
        }
    }

    // --- Index regeneration (Phase 2, 2026-05-29) ---
    // Rebuild index.md from the live filesystem so the "read index first"
    // navigation contract stops lying. Runs for synthesis/all scope.
    if (scope === 'synthesis' || scope === 'all') {
        try {
            const idx = await buildIndexContent();
            if (idx) {
                if (!opts.dryRun) {
                    const ok = await writePage('index.md', idx.content);
                    if (ok) {
                        result.indexRegenerated = true;
                        changelogLines.push(`- regenerated index.md (${idx.curatedCount} curated pages, ${idx.corpusCount} corpus entries)`);
                    }
                } else {
                    changelogLines.push(`- DRY-RUN would regenerate index.md (${idx.curatedCount} curated, ${idx.corpusCount} corpus)`);
                }
            }
        } catch { /* index regen is best-effort; never fail the compile */ }
    }

    // --- Finalize ---
    const finishedAt = new Date();
    result.finishedAt = finishedAt.toISOString();
    result.durationMs = finishedAt.getTime() - startedAt.getTime();
    result.changelog = changelogLines.join('\n');

    // Write compile report
    if (!opts.dryRun && changelogLines.length > 0) {
        const date = startedAt.toISOString().split('T')[0];
        const reportPath = `synthesis/compile-history/${date}-${runId.slice(-8)}.md`;
        const reportContent = `---\ntitle: Wiki Compile Report ${date}\ntype: compile-report\nrun_id: ${runId}\ncreated: ${date}\nupdated: ${date}\nsynthesis_regenerated: ${result.synthesisPagesRegenerated.length}\npatterns_compiled: ${result.crossEngagementPatternsCompiled.length}\nduration_ms: ${result.durationMs}\nstatus: active\n---\n\n# Compile Report ${date}\n\n## Changes\n\n${result.changelog}\n`;
        await writePage(reportPath, reportContent);

        // Log to wiki/log.md
        try {
            await fetch(`${PROXY_BASE}/api/wiki/append`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: 'log.md',
                    content: `\n## [${date}] compile | Wiki compile run ${runId}\n  - synthesis_regenerated: ${result.synthesisPagesRegenerated.length}\n  - patterns_compiled: ${result.crossEngagementPatternsCompiled.length}\n  - index_regenerated: ${result.indexRegenerated}\n  - duration_ms: ${result.durationMs}\n`,
                }),
            });
        } catch { /* best-effort */ }
    }

    return result;
}
