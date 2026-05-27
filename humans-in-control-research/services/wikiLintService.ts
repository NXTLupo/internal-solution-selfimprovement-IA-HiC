/**
 * Wiki Lint Service — Loop 5 of the Self-Improvement Architecture
 *
 * Runs structural and semantic health checks on the wiki, writes a
 * dated report, and surfaces findings to the constraint pipeline.
 *
 * Triggered by:
 *   - Explicit call (chat command "/lint" or button)
 *   - Session-start auto-run if >7 days since last lint
 *   - Cron via wiki-maintainer service (future)
 *
 * All checks are read-only against the wiki except for the final
 * report write to wiki/synthesis/lint-<date>.md and the timestamp
 * write to wiki/synthesis/last-lint.json.
 *
 * Created 2026-05-22 as part of the self-improvement loop plan.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';
const WIKI_DIRS = [
    'frameworks',
    'benchmarks',
    'anti-patterns',
    'exemplars',
    'evidence',
    'industries',
    'brand',
    'engagements',
    'synthesis',
    'sources',
] as const;

const FRAMEWORK_TYPES = [
    'personas', 'deck', 'script', 'blueprint', 'architecture',
    'prd', 'roadmap', 'strategy', 'gap-analysis', 'tech-audit', 'competitive'
] as const;

const STALENESS_DAYS = 180; // 6 months
const BENCHMARK_AGE_DAYS = 365; // 12 months
const MIN_EVIDENCE_PER_FRAMEWORK = 5;
const CONTRADICTION_WINDOW_DAYS = 14;

// --- TYPES ---

export type LintSeverity = 'info' | 'warn' | 'error';

export type LintCategory =
    | 'frontmatter'
    | 'staleness'
    | 'orphan-page'
    | 'broken-link'
    | 'reference-asymmetry'
    | 'evidence-density'
    | 'benchmark-age'
    | 'framework-completeness'
    | 'contradiction'
    | 'coverage-gap'
    | 'constraint-retirement';

export interface LintFinding {
    category: LintCategory;
    severity: LintSeverity;
    page?: string;
    relatedPage?: string;
    message: string;
    suggestedFix?: string;
    autoFixable: boolean;
    detectedAt: string; // ISO timestamp
}

export interface LintReport {
    runId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    pagesScanned: number;
    findingsByCategory: Record<LintCategory, number>;
    findings: LintFinding[];
    summary: {
        total: number;
        errors: number;
        warnings: number;
        info: number;
        autoFixable: number;
    };
    nextLintDue: string; // ISO timestamp 7 days out
}

// --- LIGHTWEIGHT WIKI ACCESS HELPERS ---
// We don't import wikiService directly so the lint service is self-contained
// and testable in isolation (no circular dependencies via loadGenerationContext).

interface PageRecord {
    path: string;
    content: string;
    frontmatter: Record<string, any>;
    body: string;
    outboundLinks: string[];
    referencedSources: string[];
    updatedAt: Date | null;
    sizeBytes: number;
}

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

function parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const out: Record<string, any> = {};
    for (const line of match[1].split('\n')) {
        const eq = line.indexOf(':');
        if (eq < 0) continue;
        const key = line.substring(0, eq).trim();
        let value: any = line.substring(eq + 1).trim();
        // Handle YAML lists [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
            try { value = JSON.parse(value.replace(/'/g, '"')); } catch { /* leave as string */ }
        }
        // Strip surrounding quotes
        if (typeof value === 'string') {
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
        }
        out[key] = value;
    }
    return out;
}

function extractBody(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function extractWikilinks(body: string): string[] {
    const matches = body.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.map(m => m.slice(2, -2).split('|')[0].trim());
}

function extractSourceCitations(body: string): string[] {
    // Lightweight detection: lines starting with `- Source:` or containing `[Source:`
    const out: string[] = [];
    const sourceLineRe = /(?:\*\*Source\*\*|Source:|\[Source:)\s*([^,\n\]]+)/g;
    let m: RegExpExecArray | null;
    while ((m = sourceLineRe.exec(body)) !== null) {
        const s = m[1].trim();
        if (s && s.length < 200) out.push(s);
    }
    return out;
}

function tryParseDate(raw: any): Date | null {
    if (!raw) return null;
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

async function loadAllPages(): Promise<PageRecord[]> {
    const records: PageRecord[] = [];
    for (const dir of WIKI_DIRS) {
        const { files, dirs } = await listDir(dir);
        // Top-level files
        for (const f of files) {
            if (!f.endsWith('.md')) continue;
            const rel = `${dir}/${f}`;
            const content = await readPage(rel);
            if (content === null) continue;
            const fm = parseFrontmatter(content);
            const body = extractBody(content);
            records.push({
                path: rel,
                content,
                frontmatter: fm,
                body,
                outboundLinks: extractWikilinks(body),
                referencedSources: extractSourceCitations(body),
                updatedAt: tryParseDate(fm.updated || fm.created),
                sizeBytes: content.length,
            });
        }
        // One level of subdirs (e.g., engagements/<slug>/)
        for (const subDir of dirs) {
            const subResult = await listDir(`${dir}/${subDir}`);
            for (const sf of subResult.files) {
                if (!sf.endsWith('.md')) continue;
                const rel = `${dir}/${subDir}/${sf}`;
                const content = await readPage(rel);
                if (content === null) continue;
                const fm = parseFrontmatter(content);
                const body = extractBody(content);
                records.push({
                    path: rel,
                    content,
                    frontmatter: fm,
                    body,
                    outboundLinks: extractWikilinks(body),
                    referencedSources: extractSourceCitations(body),
                    updatedAt: tryParseDate(fm.updated || fm.created),
                    sizeBytes: content.length,
                });
            }
        }
    }
    return records;
}

// --- INDIVIDUAL CHECKS ---

function checkFrontmatter(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    const required = ['title', 'type', 'updated'];
    for (const p of pages) {
        for (const key of required) {
            if (!p.frontmatter[key]) {
                findings.push({
                    category: 'frontmatter',
                    severity: 'warn',
                    page: p.path,
                    message: `Missing frontmatter field "${key}"`,
                    suggestedFix: `Add "${key}: ..." to the YAML frontmatter block at the top of the file.`,
                    autoFixable: false,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    }
    return findings;
}

function checkStaleness(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    const cutoff = Date.now() - STALENESS_DAYS * 24 * 60 * 60 * 1000;
    for (const p of pages) {
        if (!p.updatedAt) continue;
        if (p.updatedAt.getTime() < cutoff && p.frontmatter.status === 'active') {
            const ageDays = Math.floor((Date.now() - p.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
            findings.push({
                category: 'staleness',
                severity: ageDays > 365 ? 'error' : 'warn',
                page: p.path,
                message: `Active page not updated in ${ageDays} days (last: ${p.updatedAt.toISOString().split('T')[0]})`,
                suggestedFix: 'Review the page; either update with current evidence, mark status: needs-review, or archive.',
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

function checkOrphans(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    // Build inbound link map
    const inboundCount = new Map<string, number>();
    const pageSlugs = new Set<string>();
    for (const p of pages) {
        const slug = p.path.replace(/\.md$/, '').split('/').pop()!;
        pageSlugs.add(slug);
        inboundCount.set(slug, 0);
    }
    for (const p of pages) {
        for (const link of p.outboundLinks) {
            const target = link.split('/').pop()!.replace(/\.md$/, '');
            if (pageSlugs.has(target)) {
                inboundCount.set(target, (inboundCount.get(target) || 0) + 1);
            }
        }
    }
    for (const p of pages) {
        const slug = p.path.replace(/\.md$/, '').split('/').pop()!;
        // index.md and log.md naturally have no inbound; skip them
        if (slug === 'index' || slug === 'log') continue;
        // Engagement and source pages routinely have no inbound; flag at info only
        const fromHighValueDir = /^(frameworks|synthesis|brand|industries)\//.test(p.path);
        if ((inboundCount.get(slug) || 0) === 0) {
            findings.push({
                category: 'orphan-page',
                severity: fromHighValueDir ? 'warn' : 'info',
                page: p.path,
                message: `Page has no inbound wikilinks from other pages.`,
                suggestedFix: 'Either link to this page from a related framework/synthesis page, or move to archived/ if no longer relevant.',
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

function checkBrokenLinks(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    const pageSlugs = new Set<string>();
    for (const p of pages) {
        pageSlugs.add(p.path.replace(/\.md$/, '').split('/').pop()!);
    }
    for (const p of pages) {
        for (const link of p.outboundLinks) {
            const target = link.split('/').pop()!.replace(/\.md$/, '');
            if (!pageSlugs.has(target)) {
                findings.push({
                    category: 'broken-link',
                    severity: 'warn',
                    page: p.path,
                    relatedPage: link,
                    message: `Wikilink "[[${link}]]" points to a page that does not exist.`,
                    suggestedFix: `Either create the missing page, rename the link to match an existing page, or remove the link.`,
                    autoFixable: false,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    }
    return findings;
}

function checkReferenceSymmetry(pages: PageRecord[]): LintFinding[] {
    // Heuristic: if Page A is in frameworks/ and links to Page B in evidence/,
    // we expect evidence/B to also link back to A. This is a soft expectation —
    // we report asymmetry as info, not warn.
    const findings: LintFinding[] = [];
    const linksFrom = new Map<string, Set<string>>();
    for (const p of pages) {
        const slug = p.path.replace(/\.md$/, '').split('/').pop()!;
        linksFrom.set(slug, new Set(p.outboundLinks.map(l => l.split('/').pop()!.replace(/\.md$/, ''))));
    }
    for (const p of pages) {
        if (!/^frameworks\//.test(p.path)) continue;
        const aSlug = p.path.replace(/\.md$/, '').split('/').pop()!;
        for (const linkedSlug of linksFrom.get(aSlug) || []) {
            const reverseSet = linksFrom.get(linkedSlug);
            if (reverseSet && !reverseSet.has(aSlug)) {
                findings.push({
                    category: 'reference-asymmetry',
                    severity: 'info',
                    page: p.path,
                    relatedPage: linkedSlug,
                    message: `Framework page "${aSlug}" links to "${linkedSlug}" but the reverse link is missing.`,
                    suggestedFix: `Add [[${aSlug}]] to ${linkedSlug} if the relationship is meaningful in both directions.`,
                    autoFixable: false,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    }
    return findings;
}

function checkEvidenceDensity(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    for (const p of pages) {
        if (!/^frameworks\//.test(p.path)) continue;
        const citationCount = p.referencedSources.length +
            (p.frontmatter.evidence_count ? Number(p.frontmatter.evidence_count) : 0);
        if (citationCount < MIN_EVIDENCE_PER_FRAMEWORK) {
            findings.push({
                category: 'evidence-density',
                severity: 'warn',
                page: p.path,
                message: `Framework page has only ${citationCount} cited evidence points (minimum: ${MIN_EVIDENCE_PER_FRAMEWORK}).`,
                suggestedFix: 'Ingest more sources targeting this framework, or extract and cite additional data points from existing sources.',
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

function checkBenchmarkAge(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    const cutoff = Date.now() - BENCHMARK_AGE_DAYS * 24 * 60 * 60 * 1000;
    for (const p of pages) {
        if (!/^benchmarks\//.test(p.path)) continue;
        if (!p.updatedAt) continue;
        if (p.updatedAt.getTime() < cutoff) {
            const ageDays = Math.floor((Date.now() - p.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
            findings.push({
                category: 'benchmark-age',
                severity: 'warn',
                page: p.path,
                message: `Benchmark page data is ${ageDays} days old. Benchmark data should be reviewed annually.`,
                suggestedFix: 'Verify the benchmark numbers against current sources. Update or mark superseded.',
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

function checkFrameworkCompleteness(pages: PageRecord[]): LintFinding[] {
    const findings: LintFinding[] = [];
    const presentFrameworks = new Set(
        pages
            .filter(p => /^frameworks\//.test(p.path))
            .map(p => p.path.replace(/^frameworks\//, '').replace(/\.md$/, ''))
    );
    const presentAntiPatterns = new Set(
        pages
            .filter(p => /^anti-patterns\//.test(p.path))
            .map(p => p.path.replace(/^anti-patterns\//, '').replace(/\.md$/, ''))
    );
    for (const type of FRAMEWORK_TYPES) {
        if (!presentFrameworks.has(type)) {
            findings.push({
                category: 'framework-completeness',
                severity: 'error',
                message: `Missing required framework page: wiki/frameworks/${type}.md`,
                suggestedFix: `Create the framework page following the schema in AGENTS.md Part VII.`,
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
        if (!presentAntiPatterns.has(type)) {
            findings.push({
                category: 'framework-completeness',
                severity: 'warn',
                message: `Missing anti-pattern page: wiki/anti-patterns/${type}.md`,
                suggestedFix: `Create the anti-pattern page following the schema in AGENTS.md Part III.`,
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

// 2026-05-24 — Patterns that match AUTO-GENERATED synthesis files (logs,
// telemetry, history, lint output). These pages do not contain knowledge
// claims that can be contradicted — they contain machine-emitted records.
// Including them in the contradiction scan was the root cause of the 18,708
// false-positive findings observed on the Northeastern 2026-05-24 run (the
// scan re-read prior lint reports and flagged citation tuples like
// `[[2013, 4, 17]]` as conflicts). Sibling fix to the wiki broken-link
// self-scan bug documented in wiki/synthesis/curator-log.md.
const AUTO_GENERATED_SYNTHESIS_PATTERNS: RegExp[] = [
    /^synthesis\/lint-/i,
    /^synthesis\/curator-log/i,
    /^synthesis\/learned-constraints\.md$/i,
    /^synthesis\/improvement-lineage\.md$/i,
    /^synthesis\/uncertainty-ledger\.md$/i,
    /^synthesis\/verifier-history\.md$/i,
    /^synthesis\/quality-scores\.md$/i,
    /^synthesis\/cross-engagement-patterns\.md$/i,
    /^synthesis\/export-failures\.md$/i,
    /^synthesis\/generation-failures\.md$/i,
    /^synthesis\/cost-telemetry\.md$/i,
    /^synthesis\/chunk-telemetry/i,
    /^synthesis\/compile-history\//i,
    /^synthesis\/topics-tm_/i,           // topic-model result caches
    /^synthesis\/.*-archive\//i,
];

function isAutoGeneratedSynthesis(path: string): boolean {
    return AUTO_GENERATED_SYNTHESIS_PATTERNS.some(re => re.test(path));
}

async function checkContradictions(pages: PageRecord[]): Promise<LintFinding[]> {
    // Detect pairs of pages updated within the last 14 days that may contain
    // contradictory claims. Cost-controlled: only checks frameworks + synthesis
    // pages, only pairs within the same broad topic family.
    //
    // 2026-05-24 — EXCLUDE auto-generated synthesis (lint reports, curator
    // logs, telemetry, history). See note above AUTO_GENERATED_SYNTHESIS_PATTERNS.
    const findings: LintFinding[] = [];
    const cutoff = Date.now() - CONTRADICTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recent = pages.filter(p =>
        p.updatedAt &&
        p.updatedAt.getTime() > cutoff &&
        (/^(frameworks|synthesis|benchmarks)\//.test(p.path)) &&
        !isAutoGeneratedSynthesis(p.path)
    );

    if (recent.length < 2) return findings;

    // Pair generation: O(n^2) but capped at the recent-pages list which is small.
    // We only run pairs where the page contents include at least one shared
    // capitalised noun (a cheap heuristic for "same topic").
    const pairsToCheck: Array<[PageRecord, PageRecord]> = [];
    for (let i = 0; i < recent.length; i++) {
        for (let j = i + 1; j < recent.length; j++) {
            const a = recent[i];
            const b = recent[j];
            if (sharesCapitalisedNoun(a.body, b.body)) {
                pairsToCheck.push([a, b]);
            }
        }
    }

    // Cap pairs to 10 per lint run to control cost. Sort by combined freshness.
    const cappedPairs = pairsToCheck
        .sort((x, y) => {
            const xAge = Math.min(x[0].updatedAt!.getTime(), x[1].updatedAt!.getTime());
            const yAge = Math.min(y[0].updatedAt!.getTime(), y[1].updatedAt!.getTime());
            return yAge - xAge;
        })
        .slice(0, 10);

    for (const [a, b] of cappedPairs) {
        try {
            const conflict = await detectPairwiseConflict(a, b);
            if (conflict) {
                findings.push({
                    category: 'contradiction',
                    severity: 'warn',
                    page: a.path,
                    relatedPage: b.path,
                    message: conflict.summary,
                    suggestedFix: conflict.suggestedResolution,
                    autoFixable: false,
                    detectedAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            // Don't fail the whole lint on one bad pair
            console.warn('[wikiLint] contradiction check failed for', a.path, b.path, err);
        }
    }
    return findings;
}

function sharesCapitalisedNoun(a: string, b: string): boolean {
    const nounsA = new Set(a.match(/\b[A-Z][a-z]{3,}\b/g) || []);
    const nounsB = new Set(b.match(/\b[A-Z][a-z]{3,}\b/g) || []);
    for (const n of nounsA) {
        if (nounsB.has(n)) return true;
    }
    return false;
}

async function detectPairwiseConflict(
    a: PageRecord,
    b: PageRecord,
): Promise<{ summary: string; suggestedResolution: string } | null> {
    // Use Haiku via the proxy AI router. Keeps cost ~$0.001 per pair.
    const prompt = `You are auditing two wiki pages for direct factual contradictions. Both pages exist in a knowledge base; both may contain partial truths.

Page A path: ${a.path}
Page A content (first 4000 chars):
${a.body.slice(0, 4000)}

---

Page B path: ${b.path}
Page B content (first 4000 chars):
${b.body.slice(0, 4000)}

Return STRICT JSON only. Schema:
{
  "has_conflict": boolean,
  "summary": "string — one sentence describing the specific conflict, or empty if has_conflict is false",
  "suggested_resolution": "string — concrete action: cite a third source, reconcile, mark one as superseded, etc. Or empty if no conflict."
}

A conflict exists only when both pages make claims about the same specific fact AND those claims are mutually exclusive. Differences in scope, framing, or detail are NOT conflicts. Be conservative — false positives waste reviewer time.`;

    const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.content?.[0]?.text || '';
    try {
        const cleaned = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.has_conflict && parsed.summary) {
            return {
                summary: parsed.summary,
                suggestedResolution: parsed.suggested_resolution || 'Manual review required.',
            };
        }
    } catch {
        return null;
    }
    return null;
}

async function checkConstraintEffectiveness(): Promise<LintFinding[]> {
    const findings: LintFinding[] = [];
    try {
        const effPath = 'synthesis/constraint-effectiveness.json';
        const content = await readPage(effPath);
        if (!content) return findings;
        let data: any;
        try { data = JSON.parse(content); } catch { return findings; }
        const constraints = data.constraints || [];
        for (const c of constraints) {
            if (c.applications >= 20 && c.effectiveness < 0.3) {
                findings.push({
                    category: 'constraint-retirement',
                    severity: 'warn',
                    message: `Constraint "${c.text}" has effectiveness ${(c.effectiveness * 100).toFixed(0)}% over ${c.applications} applications. Below 30% threshold.`,
                    suggestedFix: 'Retire this constraint and review what signal originally produced it.',
                    autoFixable: true,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
    } catch {
        /* effectiveness data not yet available */
    }
    return findings;
}

async function checkCoverageGaps(pages: PageRecord[]): Promise<LintFinding[]> {
    // For each active engagement, count evidence pages referenced from its
    // engagement page. Goals listed in the engagement page with zero linked
    // evidence are flagged as coverage gaps.
    const findings: LintFinding[] = [];
    const engagementPages = pages.filter(p => /^engagements\//.test(p.path));
    for (const ep of engagementPages) {
        const goalsMatch = ep.body.match(/##\s+Goals?\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        if (!goalsMatch) continue;
        const goalBlock = goalsMatch[1];
        const goalLines = goalBlock
            .split('\n')
            .filter(l => /^[-*]\s+/.test(l.trim()))
            .map(l => l.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean);
        if (goalLines.length === 0) continue;
        const linkedEvidence = ep.outboundLinks.filter(l => l.startsWith('evidence/') || pages.some(p => p.path === `evidence/${l}.md`));
        if (linkedEvidence.length < goalLines.length) {
            findings.push({
                category: 'coverage-gap',
                severity: 'info',
                page: ep.path,
                message: `Engagement has ${goalLines.length} stated goals but only ${linkedEvidence.length} linked evidence pages.`,
                suggestedFix: 'Ingest sources targeting the undersupplied goals, or link existing evidence pages.',
                autoFixable: false,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return findings;
}

// --- ORCHESTRATION ---

export interface LintOptions {
    skipContradictions?: boolean;
    writeReport?: boolean;
}

export async function runWikiLint(opts: LintOptions = {}): Promise<LintReport> {
    const startedAt = new Date();
    const runId = `lint_${startedAt.getTime()}`;
    const pages = await loadAllPages();

    // 2026-05-26 — push-spread pattern (`findings.push(...arr)`) was throwing
    // RangeError: Maximum call stack size exceeded when arr exceeded V8's
    // spread-arg limit (~125k entries). The broken-link checker had 17,775
    // findings against the current wiki, well below that ceiling, but on
    // some browsers the practical limit kicks in earlier. Replaced with an
    // append helper that uses .concat-via-loop semantics so the argcount is
    // bounded regardless of input size.
    let findings: LintFinding[] = [];
    const append = (arr: LintFinding[]) => {
        if (!arr || arr.length === 0) return;
        if (arr.length < 1000) {
            // Small batch: spread is faster and safe.
            findings.push(...arr);
        } else {
            // Large batch: concat-and-replace avoids stack-blowing spread.
            findings = findings.concat(arr);
        }
    };
    append(checkFrontmatter(pages));
    append(checkStaleness(pages));
    append(checkOrphans(pages));
    append(checkBrokenLinks(pages));
    append(checkReferenceSymmetry(pages));
    append(checkEvidenceDensity(pages));
    append(checkBenchmarkAge(pages));
    append(checkFrameworkCompleteness(pages));
    append(await checkCoverageGaps(pages));
    append(await checkConstraintEffectiveness());
    if (!opts.skipContradictions) {
        append(await checkContradictions(pages));
    }

    const finishedAt = new Date();

    const findingsByCategory: Record<LintCategory, number> = {
        'frontmatter': 0,
        'staleness': 0,
        'orphan-page': 0,
        'broken-link': 0,
        'reference-asymmetry': 0,
        'evidence-density': 0,
        'benchmark-age': 0,
        'framework-completeness': 0,
        'contradiction': 0,
        'coverage-gap': 0,
        'constraint-retirement': 0,
    };
    for (const f of findings) findingsByCategory[f.category]++;

    const summary = {
        total: findings.length,
        errors: findings.filter(f => f.severity === 'error').length,
        warnings: findings.filter(f => f.severity === 'warn').length,
        info: findings.filter(f => f.severity === 'info').length,
        autoFixable: findings.filter(f => f.autoFixable).length,
    };

    const nextDue = new Date(finishedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const report: LintReport = {
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        pagesScanned: pages.length,
        findingsByCategory,
        findings,
        summary,
        nextLintDue: nextDue,
    };

    if (opts.writeReport !== false) {
        await writeLintReport(report);
        await writeLastLintTimestamp(finishedAt);
        await appendLogEntry(report);
    }
    return report;
}

// --- REPORT WRITING ---

function findingsToMarkdown(report: LintReport): string {
    const date = report.startedAt.split('T')[0];
    const lines: string[] = [];
    lines.push('---');
    lines.push(`title: Wiki Lint Report ${date}`);
    lines.push(`type: lint-report`);
    lines.push(`created: ${date}`);
    lines.push(`updated: ${date}`);
    lines.push(`run_id: ${report.runId}`);
    lines.push(`pages_scanned: ${report.pagesScanned}`);
    lines.push(`duration_ms: ${report.durationMs}`);
    lines.push(`total_findings: ${report.summary.total}`);
    lines.push(`errors: ${report.summary.errors}`);
    lines.push(`warnings: ${report.summary.warnings}`);
    lines.push(`status: active`);
    lines.push('---');
    lines.push('');
    lines.push(`# Wiki Lint Report ${date}`);
    lines.push('');
    lines.push(`Scanned ${report.pagesScanned} wiki pages in ${(report.durationMs / 1000).toFixed(1)}s.`);
    lines.push('');
    lines.push(`Findings: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info.`);
    lines.push('');
    lines.push('## Counts by category');
    lines.push('');
    for (const [cat, count] of Object.entries(report.findingsByCategory)) {
        if (count > 0) lines.push(`- ${cat}: ${count}`);
    }
    lines.push('');
    lines.push('## Findings');
    lines.push('');
    // Group by severity then category
    const order: LintSeverity[] = ['error', 'warn', 'info'];
    for (const sev of order) {
        const sevFindings = report.findings.filter(f => f.severity === sev);
        if (sevFindings.length === 0) continue;
        lines.push(`### ${sev.toUpperCase()} (${sevFindings.length})`);
        lines.push('');
        for (const f of sevFindings) {
            const where = f.page ? ` [${f.page}${f.relatedPage ? ` -> ${f.relatedPage}` : ''}]` : '';
            lines.push(`- **${f.category}**${where}: ${f.message}`);
            if (f.suggestedFix) lines.push(`  - Fix: ${f.suggestedFix}`);
            if (f.autoFixable) lines.push(`  - Auto-fixable: yes`);
        }
        lines.push('');
    }
    lines.push('## Next steps');
    lines.push('');
    lines.push(`Next lint due: ${report.nextLintDue.split('T')[0]}`);
    lines.push('');
    return lines.join('\n');
}

async function writeLintReport(report: LintReport): Promise<boolean> {
    const date = report.startedAt.split('T')[0];
    const path = `synthesis/lint-${date}.md`;
    const content = findingsToMarkdown(report);
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

async function writeLastLintTimestamp(ts: Date): Promise<boolean> {
    const content = JSON.stringify({ last_lint: ts.toISOString() }, null, 2);
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/last-lint.json', content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

async function appendLogEntry(report: LintReport): Promise<boolean> {
    const date = report.startedAt.split('T')[0];
    const entry = `\n## [${date}] lint | Wiki health check (run ${report.runId})\n` +
        `- pages_scanned: ${report.pagesScanned}\n` +
        `- total_findings: ${report.summary.total}\n` +
        `- errors: ${report.summary.errors}\n` +
        `- warnings: ${report.summary.warnings}\n` +
        `- info: ${report.summary.info}\n` +
        `- duration_ms: ${report.durationMs}\n` +
        `- next_due: ${report.nextLintDue.split('T')[0]}\n`;
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

// --- TRIGGER HELPERS ---

export async function shouldAutoLint(): Promise<boolean> {
    try {
        const content = await readPage('synthesis/last-lint.json');
        if (!content) return true; // never run
        const parsed = JSON.parse(content);
        const last = new Date(parsed.last_lint);
        const ageDays = (Date.now() - last.getTime()) / (24 * 60 * 60 * 1000);
        return ageDays >= 7;
    } catch {
        return true;
    }
}

/**
 * Convenience: run lint if it has been >=7 days since the last run.
 * Returns the report if run, null if skipped. Safe to call on every session
 * start — only fires when due.
 */
export async function runIfDue(opts: LintOptions = {}): Promise<LintReport | null> {
    if (!await shouldAutoLint()) return null;
    return runWikiLint(opts);
}
