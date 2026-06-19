// Per-field character budgets for slide content (single source: slideFieldBudgets.json,
// also read by .claude/hooks/scripts/validate_no_truncation.py). The no-truncation
// contract: the model summarizes each field to a COMPLETE thought within budget at
// generation time; the renderer never truncates. findOverBudgetFields() is what the
// pre-parse summarize-to-budget re-ask uses to decide which fields to compress.
import budgetsJson from './slideFieldBudgets.json';

type BudgetMap = Record<string, number>;
const RAW = budgetsJson as unknown as Record<string, any>;
const COMMON: BudgetMap = (RAW.__common || {}) as BudgetMap;

/** Resolve the char budget for a field on a given template, or null if unbudgeted. */
export function budgetFor(template: string, field: string): number | null {
    const tpl = (template || '').toLowerCase();
    const perTpl = (RAW[tpl] || {}) as BudgetMap;
    if (typeof perTpl[field] === 'number') return perTpl[field];
    if (typeof COMMON[field] === 'number') return COMMON[field];
    return null;
}

/** Total count of nested array ITEMS in a parsed slide object (tiers, nodes,
 *  stages, lanes, stats, features, content, etc.). Used by the summarize-to-budget
 *  re-ask guard: the re-ask must only SHORTEN over-budget strings, never DROP a
 *  payload array - a re-ask whose structural item count fell below the original's
 *  has gutted the slide (the 2026-06-16 "No org tiers" bug, where a budget re-ask
 *  re-emitted an org-chart without its tiers and the old guard accepted it). Pure. */
export function countStructuralItems(obj: any): number {
    let n = 0;
    const walk = (x: any) => {
        if (Array.isArray(x)) { n += x.length; x.forEach(walk); }
        else if (x && typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k]); }
    };
    walk(obj);
    return n;
}

export interface OverBudgetField {
    slideIndex: number;
    template: string;
    path: string;       // dotted path to the field, e.g. "themeCluster.themes[1].insight"
    field: string;      // leaf key
    len: number;
    budget: number;
    text: string;
}

const _norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Walk parsed slides and return every string field that exceeds its per-field budget.
 *  Pure; does not mutate. Skips identity/attribution keys that are not body content. */
const SKIP = new Set(['source', 'attribution', 'url', 'date', 'id', 'model', 'template', 'brand', 'value', 'number']);

export function findOverBudgetFields(slides: any[]): OverBudgetField[] {
    const out: OverBudgetField[] = [];
    if (!Array.isArray(slides)) return out;
    slides.forEach((slide, slideIndex) => {
        const template = String(slide?.template || '').toLowerCase();
        const visit = (node: any, path: string, key: string) => {
            if (typeof node === 'string') {
                if (SKIP.has(key)) return;
                const budget = budgetFor(template, key);
                if (budget == null) return;
                const len = _norm(node).length;
                if (len > budget) out.push({ slideIndex, template, path, field: key, len, budget, text: node });
                return;
            }
            if (Array.isArray(node)) { node.forEach((v, i) => visit(v, `${path}[${i}]`, key)); return; }
            if (node && typeof node === 'object') {
                for (const k of Object.keys(node)) visit(node[k], path ? `${path}.${k}` : k, k);
            }
        };
        visit(slide, '', 'root');
    });
    return out;
}
