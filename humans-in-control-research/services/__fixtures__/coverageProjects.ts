/**
 * Two-industry fixtures shared by the deliverable rule-engine generality tests (#prd and every other hashtag's
 * coverage contract): a synthetic regional-hospital intake portal and the real university engagement pages on disk.
 * Deterministic mocks for the proxy (wiki read/write, upload listing, page owners) and for ledger extraction.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ThemeInput } from '../engagementLedger';
import type { PrdPersonaInput } from '../prdCompiler';

const ROOT = path.resolve(__dirname, '..', '..');
const WIKI = path.join(ROOT, 'hic-workspace', 'wiki');

// ---- fixtures -------------------------------------------------------------------------------------------

export interface Fixture {
    name: string;
    engagement: string;
    objective: string;
    request: string;
    pages: Record<string, string>;
    boardThemes: ThemeInput[];
    persistedThemes?: any[];
    personas: PrdPersonaInput[];
    /** Synthesis pages the page-owner mock reports as another engagement's. */
    foreignSynthesis?: string[];
}

export function page(wikiPath: string, title: string, engagement: string, paragraphs: string[]): string {
    let body = `# ${title}\n\n`;
    const spans: Array<[number, number]> = [];
    for (const p of paragraphs) { const a = body.length; body += `${p}\n\n`; spans.push([a, body.length]); }
    const fm = ['---', `id: ${wikiPath}`, `title: "${title}"`, `engagement: "${engagement}"`, 'date: "2026-09-15"', `content_hash: "${title.length}${paragraphs.length}"`, 'chunks:',
        ...spans.flatMap(([a, b], i) => [`  - id: "${wikiPath}#c${i}"`, `    char_span: [${a}, ${b}]`]), '---'].join('\n');
    return `${fm}\n${body}`;
}

export function hospitalFixture(): Fixture {
    const eng = 'design-a-patient-intake-portal-for-a-regional-hospital-network';
    const P = (f: string) => `articles/client-uploads/${f}.md`;
    const pages: Record<string, string> = {
        [P('hosp001')]: page(P('hosp001'), 'Contract_A_Patient_Intake_Portal.txt', eng, [
            'Statement of Work: Patient Intake Portal. Deliverables are listed below.',
            '1. Online pre-registration form that patients complete before arrival.\n2. Insurance card capture with photo upload.\n3. Consent forms signed electronically.',
            '4. Appointment reminder messages by text and email.\n5. Staff dashboard showing which patients completed intake.',
            'Acceptance criteria: the portal meets WCAG 2.2 AA and stores data in the hospital cloud tenancy.',
        ]),
        [P('hosp002')]: page(P('hosp002'), 'Contract_B_Billing_Transparency.txt', eng, [
            'Scope of work for billing transparency. Deliverables follow.',
            'a) Cost estimate shown before the visit.\nb) Itemized statement after the visit.\nc) Payment plan enrollment online.',
            'Out of scope: provider credentialing and claims adjudication.',
        ]),
        [P('hosp003')]: page(P('hosp003'), 'Prototype Review Meeting Summary.txt', eng, [
            'Meeting Summary. Attendees: Dana Lee (Patient Access), Raj Patel (Billing). Action items follow.',
            'The prototype asks for insurance details too late in the flow. Reviewers want insurance capture moved to step one.',
            'Reviewers liked the progress bar on the intake form and want to keep it.',
            'Decision: the portal will not show clinical results in phase one.',
            'Open question: should family members be able to complete intake for a patient?',
        ]),
        [P('hosp004')]: page(P('hosp004'), 'Feedback_Memo_Patient_Advisory_Council.txt', eng, [
            'Feedback from the patient advisory council on the draft portal.',
            'Older patients struggle with small text; the council asks for a larger text setting.',
            'Spanish-speaking patients need every form available in Spanish.',
        ]),
    };
    const names = [
        'Wait times frustrate patients at check-in', 'Wait times frustrate patients at check in', 'Billing statements are hard to read',
        'Billing statements are hard to read.', 'Patients want cost estimates up front', 'Insurance verification fails late',
        'Paper forms duplicate data entry', 'Paper forms duplicate data entry for staff', 'Language access gaps in intake',
        'Caregivers manage intake for relatives', 'Text reminders reduce no-shows', 'Portal passwords are forgotten often',
        'Accessibility for low-vision patients', 'Consent forms are signed twice', 'Front desk staff lack visibility of intake status',
        'Payment plans are hard to find', 'Mobile-first expectations among younger patients', 'Privacy worries about photo uploads',
        'Rural patients have weak connectivity', 'Interpreter scheduling is manual', 'Patients distrust surprise bills',
        'Discharge paperwork is confusing', 'Pre-visit instructions arrive too late', 'Duplicate patient records cause errors',
        'Staff training on the portal', 'Kiosk check-in as an alternative', 'Self-pay patients need clear prices',
        'Insurance card photos are blurry', 'Family members need proxy access', 'Patients want to save progress on long forms',
    ];
    const boardThemes: ThemeInput[] = names.map((n, i) => ({
        id: `hosp-theme-${i + 1}`, name: n, insight: `${n}. The intake experience must address it.`, sentiment: i % 3 ? 'negative' : 'mixed', category: i % 2 ? 'Access' : 'Billing',
        quotes: i < 6 ? [{ text: `${n}, according to the advisory council notes.`, source: 'HiC Theme Synthesis', pointer: `articles/hic-theme-synthesis/hosp${i}.md#c0` }] : [],
    }));
    const personas: PrdPersonaInput[] = [{ id: 'PE1', name: 'Returning patient', role: 'Adult outpatient', primary: true, painPoints: [{ text: 'Fills the same form twice', quote: 'Reviewers want insurance capture moved to step one.', source: 'Prototype Review Meeting Summary', pointer: `${P('hosp003')}#c1` }] }];
    return { name: 'hospital intake portal (synthetic)', engagement: eng, objective: 'Specify a patient intake portal for a regional hospital network', request: 'Write the PRD for the intake portal, focusing on pre-registration, billing transparency, and language access.', pages, boardThemes, personas };
}

export function universityFixture(): Fixture | null {
    const eng = 'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ';
    const dir = path.join(WIKI, 'articles', 'client-uploads');
    const themesFile = path.join(WIKI, 'engagements', eng, 'themes.json');
    if (!fs.existsSync(dir) || !fs.existsSync(themesFile)) return null;
    const pages: Record<string, string> = {};
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md'))) {
        const raw = fs.readFileSync(path.join(dir, f), 'utf8');
        if (new RegExp(`^engagement:\\s*"[^"]*${eng}`, 'm').test(raw.slice(0, 4096))) pages[`articles/client-uploads/${f}`] = raw;
    }
    if (Object.keys(pages).length < 9) return null;
    const persisted = JSON.parse(fs.readFileSync(themesFile, 'utf8'))?.data?.themes || [];
    return {
        name: 'university experiential learning hub (real pages on disk)', engagement: eng,
        objective: 'Generate a comprehensive product requirements document for the experiential learning hub',
        request: 'Ground the requirements in the provided documents, focusing on data integration, student companion features, and dashboard utility.',
        pages, boardThemes: [], persistedThemes: persisted,
        personas: [{ id: 'PE1', name: 'First-year student', primary: true, painPoints: [] }],
    };
}

// ---- deterministic mocks -------------------------------------------------------------------------------

export function mockFetch(fx: Fixture, store: Map<string, string>): typeof fetch {
    const json = (o: any, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) }) as any;
    return (async (url: string, init?: any) => {
        const u = new URL(url);
        if (u.pathname === '/api/engagement/upload-pages') return json({ pages: Object.keys(fx.pages).map(wikiPath => ({ wikiPath })) });
        if (u.pathname === '/api/wiki/read-batch') {
            const { paths } = JSON.parse(init.body);
            const out: any = {};
            for (const p of paths) out[p] = fx.pages[p] ? { exists: true, content: fx.pages[p] } : { exists: false, content: '' };
            return json({ pages: out });
        }
        if (u.pathname.startsWith('/api/wiki/read/')) {
            const p = decodeURIComponent(u.pathname.slice('/api/wiki/read/'.length));
            if (p.endsWith('/themes.json') && fx.persistedThemes) return json({ exists: true, content: JSON.stringify({ data: { themes: fx.persistedThemes } }) });
            const c = store.get(p);
            return json(c ? { exists: true, content: c, content_sha256: String(c.length) } : { exists: false, content: '' });
        }
        if (u.pathname === '/api/engagement/page-owners') {
            const { paths } = JSON.parse(init.body);
            const foreign = (paths as string[]).filter(p => (fx.foreignSynthesis || []).includes(p));
            return json({ owners: Object.fromEntries(foreign.map(p => [p, 'another-engagement'])), foreign });
        }
        if (u.pathname === '/api/wiki/write') { const b = JSON.parse(init.body); store.set(b.path, b.content); return json({ status: 'ok' }); }
        return json({}, 404);
    }) as any;
}

/** Extraction mock: one item per non-trivial line of every chunk; meeting notes and feedback documents yield feedback. */
export async function extractionGen({ user }: { user: string }): Promise<string> {
    const items: any[] = [];
    let doc = '', chunk = '', kind = '';
    for (const line of user.split('\n')) {
        const h = /^DOCUMENT ".*?"(?:.*recognized kind: ([a-z ]+))?/.exec(line);
        if (h) { kind = h[1] || ''; continue; }
        const d = /^DOC_ID: (.+)$/.exec(line);
        if (d) { doc = d[1].trim(); continue; }
        const c = /^\[(c\d+)\] (.*)$/.exec(line);
        const text = (c ? c[2] : line).trim();
        if (c) chunk = c[1];
        if (!doc || !chunk || text.length < 30 || /^#/.test(text)) continue;
        const fb = /meeting|feedback/.test(kind);
        items.push({ type: fb ? 'feedback' : 'stated', item: text.slice(0, 70), statement: `The product provides ${text.slice(0, 70).replace(/[.:;]+$/, '').toLowerCase()}.`, quote: text.slice(0, 220), chunk, doc, label: /out of scope/i.test(text) ? 'out-of-scope' : /decision/i.test(text) ? 'decision' : fb ? 'request' : 'required', disposition: fb ? 'change' : '' });
    }
    return JSON.stringify({ items });
}

