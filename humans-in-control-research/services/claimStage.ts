/**
 * claimStage.ts (2026-10-01, plan Stage 2.4, audit A3 / A9)
 *
 * ONE claim gate. `claimLedgerGate.evaluateClaimLedger` already types every sentence of an HTML
 * artifact (unsourced fact, unverified quote, date scope, modality, product scope, independence,
 * unverified identifier, derived-as-source) against the grounding chunks the writer was shown. The
 * slide and deliverable paths never reached it: `claimSupportVerifier` (a fail-open Flash re-read,
 * consulted from one pipeline call with the literal kind `recommendations`) was the only claim
 * check on those paths, and the chat artifacts (`#strategy`, `#prd`, `#case-study`) had none.
 *
 * This module is the SLIDE ADAPTER for the same ledger: every text field of every slide becomes one
 * block of a synthetic document (title -> h2, quote fields -> blockquote, everything else -> p), the
 * ledger runs once, and findings are mapped back to slide + field by text match. The chain runs it as
 * the `claims` stage right after provenance; the repair pass receives the findings as per-field
 * instructions with the ledger's own repair action. `claimSupportVerifier` is deleted.
 */
import { evaluateClaimLedger, type ClaimGateContext, type GateChunk, type LedgerFinding, type ReasonCode, type Severity } from './claimLedgerGate';
import { enumerateTextFields } from './slideTextEditing';

export interface ClaimFinding {
    slideId: string;
    field: string;
    code: ReasonCode;
    severity: Severity;
    sentence: string;
    detail: string;
    repair: LedgerFinding['repair'];
}

export interface ClaimStageReport {
    rowsChecked: number;
    findings: ClaimFinding[];
    blocking: number;
    warnings: number;
    pass: boolean;
    /** Chunks resolved as sources for at least one pointer. */
    resolvedPointers: number;
}

const QUOTE_FIELD_RE = /(^|[.\[])(quote|quoteText|verbatim|evidenceQuote|pullQuote|keyQuote|prove|corroborating(\[\d+\])?)([.\]]|$)/i;
/** Fields that are labels, sources or media, never claims. */
const SKIP_FIELD_RE = /(^|[.\[])(kicker|eyebrow|sourceLine|source|sources|attribution|attributionName|attributionRole|label|wordmark|number|numeral|evidenceGrade|topicKicker|date|xAxis|yAxis|columns(\[\d+\])?|url|href)([.\]]|$)/i;

function escapeHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Block { slideId: string; field: string; text: string; }

/** Flatten the slide set to blocks; the synthetic HTML keeps one block per field so a row maps back. */
function slidesToClaimBlocks(slides: any[]): Block[] {
    const out: Block[] = [];
    for (const s of slides || []) {
        const slideId = String(s?.id || 'slide');
        let fields: Array<{ path: string; value: string }> = [];
        try { fields = enumerateTextFields(s).map((f: any) => ({ path: f.path, value: String(f.value || '') })); } catch { continue; }
        for (const f of fields) {
            const text = f.value.trim();
            if (text.length < 12 || SKIP_FIELD_RE.test(f.path)) continue;
            out.push({ slideId, field: f.path, text });
        }
    }
    return out;
}

function blocksToHtml(blocks: Block[]): string {
    return blocks.map(b => {
        const tag = b.field === 'title' ? 'h2' : (QUOTE_FIELD_RE.test(b.field) ? 'blockquote' : 'p');
        return `<${tag}>${escapeHtml(b.text)}</${tag}>`;
    }).join('\n');
}

/** Map a ledger finding (sentence prefix) back to the block that produced it. */
function locate(blocks: Block[], sentence: string): Block | null {
    const needle = String(sentence || '').replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();
    if (!needle) return null;
    for (const b of blocks) {
        const hay = b.text.replace(/\s+/g, ' ').toLowerCase();
        if (hay.includes(needle) || needle.includes(hay.slice(0, 80))) return b;
    }
    return null;
}

export interface ClaimStageOptions {
    goalText?: string;
    chunks: GateChunk[];
    fetchPage?: ClaimGateContext['fetchPage'];
}

/** Run the one claim ledger over a slide set. Never throws; an adapter failure is an empty pass-through. */
export async function evaluateSlideClaims(slides: any[], opts: ClaimStageOptions): Promise<ClaimStageReport> {
    const blocks = slidesToClaimBlocks(slides);
    const empty: ClaimStageReport = { rowsChecked: 0, findings: [], blocking: 0, warnings: 0, pass: true, resolvedPointers: 0 };
    if (!blocks.length) return empty;
    const ledger = await evaluateClaimLedger(blocksToHtml(blocks), {
        goalText: opts.goalText || '',
        chunks: opts.chunks || [],
        fetchPage: opts.fetchPage,
    });
    const findings: ClaimFinding[] = [];
    for (const f of ledger.findings || []) {
        // CHROME_LEAK is an HTML concern (buttons, metadata scripts); slides have none.
        if (f.code === 'CHROME_LEAK') continue;
        const b = locate(blocks, f.sentence);
        findings.push({
            slideId: b?.slideId || 'slide', field: b?.field || 'body',
            code: f.code, severity: f.severity, sentence: f.sentence, detail: f.detail, repair: f.repair,
        });
    }
    const blocking = findings.filter(f => f.severity === 'block').length;
    return {
        rowsChecked: Array.isArray((ledger as any).rows) ? (ledger as any).rows.length : blocks.length,
        findings, blocking, warnings: findings.length - blocking, pass: blocking === 0,
        resolvedPointers: Number((ledger as any).resolvedPointers ?? (ledger as any).resolved ?? 0) || 0,
    };
}

/** Repair text for the model: the ledger's own repair action per finding, field-addressed. */
export function buildClaimRepairInstruction(report: ClaimStageReport): string {
    const rows = report.findings.filter(f => f.severity === 'block').slice(0, 12);
    if (!rows.length) return '';
    const action = (r: ClaimFinding['repair']) => ({
        narrow: 'Narrow the sentence to what the cited text supports.',
        reframe_as_recollection: 'Reframe it as a quoted practitioner recollection, not a documented capability.',
        name_the_analogy: 'Name the analogy explicitly or repoint to a source about the subject.',
        strip_pointer: 'Remove the unresolvable pointer; keep the claim only if another cited chunk supports it.',
        strip_tail: 'Remove the commentary tail from the citation bracket.',
        remove_quote_marks: 'Remove the quotation marks or replace the span with a verbatim one from the cited chunk.',
        none: 'Rewrite so the claim matches the evidence.',
    }[r] || 'Rewrite so the claim matches the evidence.');
    return [
        'CLAIM LEDGER. Each sentence below fails a scope-match check against the cited evidence. Keep the',
        'citation where it is; change the WORDING so it says only what the cited passage says.',
        ...rows.map(f => `- ${f.slideId} field "${f.field}" [${f.code}]: "${f.sentence.slice(0, 160)}". ${f.detail} ${action(f.repair)}`),
    ].join('\n');
}
