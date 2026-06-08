/**
 * intelligenceShaping.ts - single canonical shaper for run intelligence (2026-06-02)
 *
 * WHY THIS EXISTS
 * Three surfaces consume the run's structured intelligence (themes, personas,
 * recommendations, journey, gap, competitive, strategic report):
 *   1. the staged synthesis engine (geminiService.ts → generateRecommendations, U1)
 *   2. the Analyst Desk chat (corpusChatService.ts → buildGroundingContext)
 *   3. the Designer chat (design-desk → designContext.buildCombinedEvidence)
 * Each had its OWN ad-hoc formatting (or, for the Designer, raw JSON.stringify),
 * so the three chats saw DIFFERENT shapes of the same intelligence and the
 * Designer never saw recommendations / gap / competitive / strategic at all.
 * This module is the one place that turns those objects into prompt-ready text,
 * so every surface injects the identical, pain-point-forward form.
 *
 * Each shaper returns a COMPLETE block including its `=== HEADER ===` line, or
 * '' when there is nothing to show. Callers push the returned string directly.
 *
 * buildCorpusManifest() produces the corpus-composition overview ("what is in
 * this corpus") from the same per-document metadata the wiki frontmatter
 * carries (source, date, tier) plus the user-selected source categories and
 * uploaded-document roster. It gives every chat a structural understanding of
 * the corpus instead of forcing the model to infer it from concatenated bodies.
 */

// ── structured-intelligence shapers ────────────────────────────────────────

export function shapeThemes(themes: any[]): string {
    if (!Array.isArray(themes) || !themes.length) return '';
    const lines: string[] = [`=== THEMES (${themes.length}) ===`];
    for (const t of themes) {
        const citations = (t.citations || [])
            .map((c: any) => (typeof c === 'string' ? c : (c.sourceName || c.sourceFile || '')))
            .filter(Boolean)
            .join(', ');
        lines.push(`Theme: ${t.name}\nDescription: ${t.description || ''}\nQuote: "${t.quote || ''}"\nSources: ${citations}\n`);
    }
    return lines.join('\n');
}

export function shapePersonas(personas: any[]): string {
    if (!Array.isArray(personas) || !personas.length) return '';
    const lines: string[] = [`=== PERSONAS (${personas.length}) ===`];
    for (const p of personas) {
        const pains = (Array.isArray(p.painPoints) ? p.painPoints : [])
            .map((pp: any) => `${pp.label}: "${pp.quote}" (${pp.source || pp.citation?.sourceName || ''})`)
            .join('; ');
        lines.push(`Persona: ${p.name} (${p.role || ''})\nJTBD: ${p.jtbd || ''}\nPain Points: ${pains}\nBio: ${p.bio || ''}\n`);
    }
    return lines.join('\n');
}

export function shapeRecommendations(recs: any[]): string {
    if (!Array.isArray(recs) || !recs.length) return '';
    const lines: string[] = [`=== RECOMMENDATIONS (${recs.length}) ===`];
    for (const r of recs) {
        const impact = r.impactLevel || r.priority || '';
        lines.push(`[${impact}] ${r.title}: ${r.description || ''}\nEvidence: ${r.evidenceBasis || ''}\nSources: ${(r.citations || []).join(', ')}\n`);
    }
    return lines.join('\n');
}

export function shapeJourney(stages: any[]): string {
    if (!Array.isArray(stages) || !stages.length) return '';
    const lines: string[] = [`=== SERVICE BLUEPRINT (${stages.length} stages) ===`];
    for (const s of stages) {
        lines.push(`Stage: ${s.phase} | Pain: ${s.painPoint || ''} | Emotion: ${s.emotion || ''} | Fail: ${s.fail_point || 'none'} | Sources: ${(s.citations || []).join(', ')}`);
    }
    return lines.join('\n');
}

/** Accepts the unwrapped analysis object (the `.analysis` level, holding `.gaps`). */
export function shapeGap(gapAnalysis: any): string {
    const gaps = gapAnalysis?.gaps || [];
    if (!Array.isArray(gaps) || !gaps.length) return '';
    const lines: string[] = [`=== GAP ANALYSIS ===`];
    for (const g of gaps) {
        lines.push(`[${g.severity}] ${g.capability}: ${g.currentMaturity}/5 -> ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${g.impact || ''}`);
    }
    return lines.join('\n');
}

/** Accepts the unwrapped analysis object (the `.analysis` level, holding `.peers`). */
export function shapeCompetitive(comp: any): string {
    const peers = comp?.peers || [];
    if (!Array.isArray(peers) || !peers.length) return '';
    const lines: string[] = [`=== COMPETITIVE ANALYSIS ===`];
    for (const p of peers) {
        lines.push(`${p.name}: ${p.position || ''}. Strengths: ${(p.strengths || []).join(', ')}. Weaknesses: ${(p.weaknesses || []).join(', ')}`);
    }
    return lines.join('\n');
}

/** Accepts the unwrapped report object (the `.report` level). */
export function shapeStrategic(report: any): string {
    if (!report || (!report.diagnosis && !report.guidingPolicy && !(report.sections || []).length)) return '';
    const lines: string[] = [`=== STRATEGIC REPORT ===`];
    lines.push(`Diagnosis: ${report.diagnosis || ''}`);
    lines.push(`Guiding Policy: ${report.guidingPolicy || ''}`);
    lines.push(`Pillars: ${(report.strategicPillars || []).join('; ')}`);
    for (const s of (report.sections || [])) {
        lines.push(`\nSection ${s.sectionNumber}: ${s.title}\n${(s.content || '').substring(0, 800)}`);
    }
    return lines.join('\n');
}

/**
 * Terse upstream-analysis block for the RECOMMENDATIONS stage (U1 cognitive
 * chain). Distinct from shapeThemes/shapePersonas: recommendations need a
 * compact "map every rec to one of these" index (theme name + short desc,
 * persona pain label + short quote), not the full evidence blocks. Centralized
 * here so the staged engine, not just the chats, shares one shaper. Returns ''
 * when there is no upstream analysis (standalone call).
 */
export function shapeUpstreamForRecs(themes: any[], personas: any[]): string {
    const themeLines = (Array.isArray(themes) ? themes : []).slice(0, 30).map((t: any) => {
        const name = (t?.name || '').toString().trim();
        if (!name) return '';
        const desc = (t?.description || '').toString().replace(/\s+/g, ' ').trim().slice(0, 160);
        return `  - THEME: ${name}${desc ? ` - ${desc}` : ''}`;
    }).filter(Boolean);
    const painLines: string[] = [];
    (Array.isArray(personas) ? personas : []).slice(0, 12).forEach((p: any) => {
        const pname = (p?.name || 'Persona').toString().trim();
        (Array.isArray(p?.painPoints) ? p.painPoints : []).slice(0, 4).forEach((pp: any) => {
            const label = (pp?.label || '').toString().trim();
            if (!label) return;
            const q = (pp?.quote || '').toString().replace(/\s+/g, ' ').trim().slice(0, 140);
            painLines.push(`  - PAIN (${pname}): ${label}${q ? ` - "${q}"` : ''}`);
        });
    });
    if (!themeLines.length && !painLines.length) return '';
    return `=== UPSTREAM ANALYSIS FROM THIS RUN (map every recommendation to one of these) ===\n`
        + (themeLines.length ? `THEMES (${themeLines.length}):\n${themeLines.join('\n')}\n` : '')
        + (painLines.length ? `PERSONA PAIN POINTS (${painLines.length}):\n${painLines.join('\n')}\n` : '')
        + `Each recommendation MUST solve one of the named themes or pain points above; reference it by name. Do NOT introduce problems that are not in this list or the evidence catalog.\n=== END UPSTREAM ANALYSIS ===\n\n`;
}

// ── corpus manifest overview ────────────────────────────────────────────────

export interface CorpusManifestInput {
    researchGoal?: string;
    brand?: string;
    sourceReferences?: Array<{ sourceName?: string; title?: string; tier?: number; date?: string }>;
    activeCategories?: Array<{ name: string; sourceCount?: number; itemCount?: number }>;
    uploadedFiles?: Array<{ name?: string }>;
    sourceCount?: number;
    articleCount?: number;
}

/**
 * Compact, structural overview of the corpus the chat is grounded in. Built
 * from the same metadata the per-document wiki frontmatter carries (source,
 * date, tier) so the model understands corpus COMPOSITION (source mix, recency,
 * tier quality, category coverage, uploaded docs) without inferring it from raw
 * concatenated bodies. Returns '' when there is nothing meaningful to report.
 */
export function buildCorpusManifest(input: CorpusManifestInput): string {
    const refs = input.sourceReferences || [];
    const uploads = (input.uploadedFiles || []).map(f => f && f.name).filter(Boolean) as string[];
    const cats = input.activeCategories || [];
    const haveAny = refs.length || uploads.length || cats.length || input.researchGoal;
    if (!haveAny) return '';

    const lines: string[] = [`=== CORPUS MANIFEST (what this corpus contains - ground every claim in it) ===`];
    if (input.researchGoal) lines.push(`Research goal: ${input.researchGoal.trim()}`);
    if (input.brand) lines.push(`Brand: ${input.brand}`);
    lines.push(`Scale: ${input.sourceCount ?? refs.length} sources, ${input.articleCount ?? 0} articles/items.`);

    if (refs.length) {
        const byName: Record<string, { n: number; dates: string[]; tiers: Set<number> }> = {};
        for (const r of refs) {
            const k = r.sourceName || '(unnamed)';
            (byName[k] ||= { n: 0, dates: [], tiers: new Set() });
            byName[k].n++;
            if (r.date) byName[k].dates.push(r.date);
            if (r.tier) byName[k].tiers.add(r.tier);
        }
        const names = Object.keys(byName);
        const top = Object.entries(byName).sort((a, b) => b[1].n - a[1].n).slice(0, 40);
        lines.push(`Source mix (${names.length} named sources):`);
        for (const [name, info] of top) {
            const ds = info.dates.filter(Boolean).sort();
            const span = ds.length ? ` ${ds[0].slice(0, 10)}..${ds[ds.length - 1].slice(0, 10)}` : '';
            const tiers = info.tiers.size ? ` T${[...info.tiers].sort().join('/')}` : '';
            lines.push(`  - ${name}: ${info.n}${tiers}${span}`);
        }
        if (names.length > 40) lines.push(`  ...(+${names.length - 40} more sources)`);
        const allDates = (refs.map(r => r.date).filter(Boolean) as string[]).sort();
        if (allDates.length) lines.push(`Date range: ${allDates[0].slice(0, 10)} -> ${allDates[allDates.length - 1].slice(0, 10)}`);
    }

    if (cats.length) {
        lines.push(`Source categories the user selected (each MUST be represented in any synthesis): ${cats.map(c => `${c.name} (${c.itemCount || 0})`).join(', ')}`);
    }
    if (uploads.length) {
        lines.push(`Uploaded client documents (${uploads.length}): ${uploads.join('; ')}`);
    }
    lines.push(`=== END CORPUS MANIFEST ===`);
    return lines.join('\n');
}
