/**
 * themeEvidenceGate.ts (2026-10-01, plan Stage 1.8, audit B5)
 *
 * Themes had no evidence gate: the thick-evidence floor was removed in 2026-06 (relevance is the
 * only axis that may DROP a theme, by owner rule), and the hedge check lived only on the report
 * path. This gate does not drop anything. It TYPES each theme's evidence so downstream
 * deliverables consume only what clears the bar, and the Research Browser still shows the set:
 *
 *   thick          >= 2 distinct ORIGINS (canonical URL, or normalized name) among its citations
 *   single_source  one origin
 *   hedged         the theme's own description or name states as fact something its evidence only
 *                  hedges ("or something", "I think", "maybe") or that no quoted span supports
 *
 * `hedged` and `unverified_identifier` are the claim-ledger checks (claimLedgerGate.ts) applied to
 * the theme's prose against the theme's own quoted evidence; a flagged theme stays visible but is
 * excluded from `withinDeliverableCap`, so a deck or persona never inherits a promoted hedge.
 */
import { HEDGE_RE } from './claimLedgerGate';

export type ThemeEvidenceFlag = 'hedged' | 'unverified_identifier' | 'no_quoted_evidence';

export interface ThemeEvidenceVerdict {
    distinctOrigins: number;
    tier: 'thick' | 'single_source' | 'none';
    flags: ThemeEvidenceFlag[];
    /** Short, model-facing reasons (also logged). */
    details: string[];
    /** False when a blocking flag (hedged, unverified_identifier) is present. */
    deliverable: boolean;
}

export interface ThemeEvidenceReport {
    checked: number;
    thick: number;
    singleSource: number;
    flagged: number;
    excludedFromDeliverables: number;
}

/** Proper-noun phrases (two capitalized tokens, or one capitalized token with a digit or a dotted name). */
const IDENT_RE = /\b(?:[A-Z][a-zA-Z0-9]+(?:[ -][A-Z][a-zA-Z0-9]+)+|[A-Z][a-zA-Z]*\d[\w.]*|[A-Z][a-z]+\.[a-z]{2,})\b/g;
/** Sentence-initial capitals and common title words are not identifiers. */
const IDENT_STOP = new Set(['The', 'This', 'These', 'Those', 'When', 'Where', 'While', 'Because', 'Students', 'Teams', 'Firms', 'Users', 'Buyers', 'Customers', 'Employees', 'Advisors', 'Alumni', 'Donors']);

function originKeyOf(c: any): string {
    const url = String(c?.url || c?.sourceUrl || '').trim();
    if (url) {
        try {
            const u = new URL(url);
            return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '') || '/'}`;
        } catch { /* fall through */ }
    }
    return String(c?.sourceName || c?.sourceFile || c?.source || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function quotedEvidenceOf(theme: any): string {
    const parts: string[] = [];
    for (const c of (Array.isArray(theme?.citations) ? theme.citations : [])) {
        for (const k of ['quote', 'text', 'excerpt', 'snippet', 'evidence']) if (typeof c?.[k] === 'string') parts.push(c[k]);
    }
    for (const k of ['evidenceBasis', 'evidence_basis', 'keyQuotes', 'key_quotes', 'quotes', 'representativeQuotes']) {
        const v = theme?.[k];
        if (typeof v === 'string') parts.push(v);
        else if (Array.isArray(v)) for (const q of v) parts.push(typeof q === 'string' ? q : String(q?.quote || q?.text || ''));
    }
    return parts.filter(Boolean).join('\n');
}

export function evaluateThemeEvidence(theme: any): ThemeEvidenceVerdict {
    const origins = new Set((Array.isArray(theme?.citations) ? theme.citations : []).map(originKeyOf).filter(Boolean));
    const distinctOrigins = origins.size;
    const tier: ThemeEvidenceVerdict['tier'] = distinctOrigins >= 2 ? 'thick' : (distinctOrigins === 1 ? 'single_source' : 'none');
    const flags: ThemeEvidenceFlag[] = [];
    const details: string[] = [];
    const prose = `${String(theme?.name || theme?.title || '')}. ${String(theme?.description || theme?.summary || '')}`.trim();
    const evidence = quotedEvidenceOf(theme);
    const evidenceLower = evidence.toLowerCase();

    // A hedge inside the theme's OWN voice is a promotion: the theme states what a source only guessed.
    const hedge = prose.match(HEDGE_RE);
    if (hedge) {
        flags.push('hedged');
        details.push(`theme prose carries the hedge "${hedge[0]}"; a finding states what the evidence shows, or quotes the recollection as a recollection`);
    } else if (evidence && HEDGE_RE.test(evidence)) {
        // The evidence hedges and the prose does not: check whether the prose asserts the hedged thing
        // as a capability (an identifier present in both, stated declaratively in the prose).
        const idents = Array.from(new Set((prose.match(IDENT_RE) || []).filter(t => !IDENT_STOP.has(t))));
        const promoted = idents.filter(id => {
            const idx = evidenceLower.indexOf(id.toLowerCase());
            if (idx < 0) return false;
            return HEDGE_RE.test(evidence.slice(Math.max(0, idx - 90), idx + id.length + 90));
        });
        if (promoted.length) {
            flags.push('hedged');
            details.push(`"${promoted[0]}" is only hedged in the cited evidence but stated as fact in the theme`);
        }
    }

    // Identifiers the theme names must appear somewhere in its own quoted evidence.
    if (evidence) {
        const idents = Array.from(new Set((prose.match(IDENT_RE) || []).filter(t => !IDENT_STOP.has(t))));
        const missing = idents.filter(id => !evidenceLower.includes(id.toLowerCase()));
        // Tolerate one stray capitalized phrase (a sector or program name the model normalized);
        // two or more unverified identifiers is a pattern, not a slip.
        if (missing.length >= 2) {
            flags.push('unverified_identifier');
            details.push(`identifiers absent from every quoted span: ${missing.slice(0, 3).map(m => `"${m}"`).join(', ')}`);
        }
    } else if (distinctOrigins > 0) {
        flags.push('no_quoted_evidence');
        details.push('citations carry no quoted span, so the theme prose cannot be checked against its evidence');
    }

    const deliverable = !flags.includes('hedged') && !flags.includes('unverified_identifier');
    return { distinctOrigins, tier, flags, details, deliverable };
}

/**
 * Apply the gate to a theme set IN PLACE: writes `distinct_source_count`, `evidence_tier`,
 * `evidence_flags`, `evidence_notes`, and clears `withinDeliverableCap` on blocked themes. Returns
 * the report. Never removes a theme.
 */
export function applyThemeEvidenceGate(themes: any[]): ThemeEvidenceReport {
    const report: ThemeEvidenceReport = { checked: 0, thick: 0, singleSource: 0, flagged: 0, excludedFromDeliverables: 0 };
    for (const t of themes || []) {
        if (!t || typeof t !== 'object') continue;
        report.checked++;
        const v = evaluateThemeEvidence(t);
        t.distinct_source_count = v.distinctOrigins;
        t.evidence_tier = v.tier === 'thick' ? 'thick' : 'single_source';
        if (v.flags.length) {
            t.evidence_flags = v.flags;
            t.evidence_notes = v.details;
            report.flagged++;
        } else {
            delete t.evidence_flags;
            delete t.evidence_notes;
        }
        if (v.tier === 'thick') report.thick++; else report.singleSource++;
        if (!v.deliverable && t.withinDeliverableCap) {
            t.withinDeliverableCap = false;
            t.withinDeliverableCapReason = `evidence gate: ${v.flags.join(', ')}`;
            report.excludedFromDeliverables++;
        }
    }
    return report;
}
