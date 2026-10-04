/**
 * check-template-parity.mjs - twin FIELD parity guard (E10, 2026-10-01)
 *
 * plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, finding E10 / Stage 2.5.
 *
 * The export!=preview class of bugs has a structural root cause: the two twins that
 * consume ONE SlideData contract render different subsets of it. The preview twin is
 * components/slideTemplates/web.tsx (+ goldPreviews.tsx) dispatched by
 * components/SlideCanvas.tsx; the export twin is services/slideToStageHtml.ts (the
 * 1920x1080 #stage HTML the native PPTX is captured from). The previous version of this
 * script compared SlideCanvas.tsx to the LEGACY components/slideTemplates/pptx.ts by
 * case-name only, so a field the preview showed and the export silently dropped (or the
 * reverse) was never a failure.
 *
 * This version compares the REAL twins at FIELD level. For every template id in the
 * SlideTemplate union (components/slideTemplates/types.ts):
 *   1. resolve its data contract: SlideCanvas `case 'x'` arm -> web component name ->
 *      the component's `data: XData` prop type -> the interface body in types.ts, parsed
 *      into a field tree (nested object / Array<{...}> members included);
 *   2. resolve the two renderers: the web component (plus the content sub-components it
 *      calls, e.g. QuoteStack) and the stage `renderX` the slideToStageHtml dispatch arm
 *      calls (plus the helpers it calls, e.g. renderRecommendationDense);
 *   3. extract the set of member names each renderer reads (`.field`, `?.field`,
 *      `['field']`, destructuring, and every child of a parent handed to
 *      Object.entries/values);
 *   4. report, per template, the declared fields that exactly ONE twin renders.
 *
 * Exit 0 = every declared field is rendered by both twins or by neither (a dormant field
 * is reported as info, not failure). Exit 1 = at least one field renders on exactly one
 * twin: the preview shows something the PPTX drops, or the PPTX carries something the
 * preview never showed.
 *
 * Run:  node scripts/check-template-parity.mjs
 * The same functions back services/templateFieldParity.test.ts (vitest).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const TWIN_FILES = {
    types: 'components/slideTemplates/types.ts',
    canvas: 'components/SlideCanvas.tsx',
    web: ['components/slideTemplates/web.tsx', 'components/slideTemplates/goldPreviews.tsx'],
    stage: 'services/slideToStageHtml.ts',
};

/** Shell / chrome / string utilities that read no template payload. Excluded from the call
 *  closure so a chrome prop name (GoldFrame `takeaway`, SourceFooter `sources`) can never
 *  masquerade as a rendered payload field. */
const WEB_HELPER_EXCLUDE = new Set([
    'SlideShell', 'GoldFrame', 'SourceFooter', 'Tag', 'Title', 'GeneratingOverlay',
    'resolveT', 'hex', 'webPx', 'truncate', 'smartQuoteClip', 'prepQuote', 'cleanTranscriptQuote',
    'looksLikeTranscriptSource', 'densityCaps', 'clampMin',
]);
const STAGE_HELPER_EXCLUDE = new Set([
    'esc', 'trunc', 'washHex', 'buildShell', 'brandTokens', 'computeFontsHref', 'stripDanglingTail',
    'fullBleedImageDoc', 'composeArchetypeDoc', 'slideDataToStageHtml', 'scrubCitationPointersDeep',
    'pointerFreeSourceText', 'densityCaps', 'clampMin', 'compositeIcon', 'attachViz', 'composeSlide',
]);

const readRel = (p) => {
    try { return readFileSync(resolve(ROOT, p), 'utf8'); }
    catch (e) { throw new Error(`cannot read ${p}: ${e.message}`); }
};

/** Strip block comments and whole-token line comments (a `//` preceded by whitespace or at
 *  line start; a `://` inside a URL string is left alone). */
export function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[ \t])\/\/[^\n]*/gm, '$1');
}

// ---------------------------------------------------------------------------
// Top-level declaration bodies. Every declaration in the twin files starts at column 0,
// so a body runs from its declaration line to the next column-0 declaration. This is
// deliberately NOT brace matching: nested template literals and regex literals make brace
// matching fragile, and column-0 boundaries are exact for these files.
// ---------------------------------------------------------------------------
const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?\s+(\w+)|(?:const|let|var)\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)|enum\s+(\w+))\b/gm;

export function topLevelDeclarations(src) {
    const out = new Map(); // name -> body text (declaration line through the line before the next declaration)
    const marks = [];
    for (const m of src.matchAll(DECL_RE)) {
        const name = m[1] || m[2] || m[3] || m[4] || m[5] || m[6];
        marks.push({ name, start: m.index });
    }
    for (let i = 0; i < marks.length; i++) {
        const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
        const body = src.slice(marks[i].start, end);
        if (!out.has(marks[i].name)) out.set(marks[i].name, body);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Interface field tree. `interface XData { a: string; b?: Array<{ c: string; d?: { e: number } }> }`
// -> [{name:'a',children:[]}, {name:'b',children:[{name:'c',children:[]},{name:'d',children:[{name:'e'}]}]}]
// ---------------------------------------------------------------------------
function balancedBraces(text, open) {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        const c = text[i];
        if (c === "'" || c === '"') { // skip string literal (union members like 'critical')
            const q = c; i++;
            while (i < text.length && text[i] !== q) { if (text[i] === '\\') i++; i++; }
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return text.slice(open, i + 1); }
    }
    return text.slice(open);
}

export function parseFieldTree(bodyInsideBraces) {
    const fields = [];
    const text = bodyInsideBraces;
    let i = 0;
    while (i < text.length) {
        // skip whitespace
        while (i < text.length && /\s/.test(text[i])) i++;
        if (i >= text.length) break;
        const head = /^(?:readonly\s+)?(\w+)\??\s*:/.exec(text.slice(i));
        if (!head) {
            // not a property start (a union continuation line, a stray token): skip the line
            const nl = text.indexOf('\n', i);
            i = nl < 0 ? text.length : nl + 1;
            continue;
        }
        const name = head[1];
        i += head[0].length;
        // read the type until a depth-0 ';' or depth-0 newline
        let depth = 0; let typeText = '';
        while (i < text.length) {
            const c = text[i];
            if (c === "'" || c === '"') {
                const q = c; let j = i + 1;
                while (j < text.length && text[j] !== q) { if (text[j] === '\\') j++; j++; }
                typeText += text.slice(i, j + 1); i = j + 1; continue;
            }
            if (c === '{' || c === '<' || c === '(' || c === '[') depth++;
            else if (c === '}' || c === '>' || c === ')' || c === ']') depth--;
            if (depth <= 0 && (c === ';' || c === '\n')) { i++; break; }
            typeText += c; i++;
        }
        const children = [];
        let cursor = 0;
        while (true) {
            const open = typeText.indexOf('{', cursor);
            if (open < 0) break;
            const block = balancedBraces(typeText, open);
            children.push(...parseFieldTree(block.slice(1, -1)));
            cursor = open + block.length;
        }
        fields.push({ name, children });
    }
    return fields;
}

export function flattenFieldNames(tree, out = new Set()) {
    for (const f of tree) { out.add(f.name); flattenFieldNames(f.children, out); }
    return out;
}

function childNamesByParent(tree, out = new Map()) {
    for (const f of tree) {
        if (f.children.length) out.set(f.name, flattenFieldNames(f.children));
        childNamesByParent(f.children, out);
    }
    return out;
}

/** The interface body (inside the braces) for `export interface Name` in a source string. */
export function interfaceBody(typesSrc, name) {
    const re = new RegExp(`export\\s+interface\\s+${name}\\b[^{]*\\{`);
    const m = re.exec(typesSrc);
    if (!m) return null;
    const open = m.index + m[0].length - 1;
    const block = balancedBraces(typesSrc, open);
    return block.slice(1, -1);
}

// ---------------------------------------------------------------------------
// Member names a renderer body reads.
// ---------------------------------------------------------------------------
export function memberNamesRead(body) {
    const ids = new Set();
    // x.field / x).field / x].field  (a leading identifier, paren or bracket; CSS `.class` has none)
    for (const m of body.matchAll(/(?<=[\w)\]])\s*\.\s*([A-Za-z_]\w*)/g)) ids.add(m[1]);
    // x?.field
    for (const m of body.matchAll(/\?\.\s*([A-Za-z_]\w*)/g)) ids.add(m[1]);
    // x['field']
    for (const m of body.matchAll(/\[\s*['"]([A-Za-z_]\w*)['"]\s*\]/g)) ids.add(m[1]);
    // const { a, b: c, d = x } = obj
    for (const m of body.matchAll(/\{([^{}]*)\}\s*=\s*[\w.?!()]+/g)) {
        for (const part of m[1].split(',')) {
            const n = part.trim().split(/[\s:=]/)[0];
            if (/^[A-Za-z_]\w*$/.test(n)) ids.add(n);
        }
    }
    return ids;
}

/** Parents whose every child counts as rendered: Object.entries(x.parent) / Object.values(x.parent). */
export function spreadParents(body) {
    const out = new Set();
    for (const m of body.matchAll(/Object\.(?:entries|values)\(\s*[\w.?!()\s]*?\.\s*([A-Za-z_]\w*)\s*\)/g)) out.add(m[1]);
    return out;
}

/** Transitive body: the entry declaration plus every same-pool declaration it references
 *  (content sub-components and render helpers), minus the chrome/utility exclusions. */
export function closureBody(decls, entryName, exclude) {
    const seen = new Set();
    const queue = [entryName];
    let text = '';
    while (queue.length) {
        const name = queue.shift();
        if (seen.has(name) || exclude.has(name) || !decls.has(name)) continue;
        seen.add(name);
        const body = decls.get(name);
        text += '\n' + body;
        for (const m of body.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
            const id = m[1];
            if (id !== name && decls.has(id) && !seen.has(id) && !exclude.has(id)) queue.push(id);
        }
    }
    return { text, names: [...seen] };
}

/** The stage dispatch (slideDataToStageHtml) reads per-template CHROME fields outside renderX:
 *  `if (template === 'case-study') { kicker = ... c.subject ...; takeaway = c.takeaway ... }`.
 *  Those blocks are part of the export twin for that template, so they join its body. */
export function dispatchChromeBlocks(dispatchBody, template) {
    let out = '';
    const re = /if\s*\(([^)]*template\s*===\s*'[a-z0-9-]+'[^)]*)\)\s*\{/g;
    let m;
    while ((m = re.exec(dispatchBody)) !== null) {
        const labels = [...m[1].matchAll(/template\s*===\s*'([a-z0-9-]+)'/g)].map(x => x[1]);
        if (!labels.includes(template)) continue;
        const open = m.index + m[0].length - 1;
        out += '\n' + balancedBraces(dispatchBody, open);
    }
    return out;
}

export function renderedFieldNames(body, tree) {
    const declared = flattenFieldNames(tree);
    const read = memberNamesRead(body);
    const spread = spreadParents(body);
    const byParent = childNamesByParent(tree);
    const rendered = new Set();
    for (const name of declared) {
        if (read.has(name)) rendered.add(name);
    }
    for (const parent of spread) {
        for (const child of byParent.get(parent) || []) rendered.add(child);
    }
    return rendered;
}

/** Pure diff for one template: which declared fields does exactly one twin render. */
export function diffTwinFields(tree, webBody, stageBody) {
    const declared = [...flattenFieldNames(tree)];
    const web = renderedFieldNames(webBody, tree);
    const stage = renderedFieldNames(stageBody, tree);
    return {
        declared,
        webOnly: declared.filter(f => web.has(f) && !stage.has(f)),      // preview shows it, PPTX drops it
        stageOnly: declared.filter(f => stage.has(f) && !web.has(f)),    // PPTX carries it, preview never showed it
        neither: declared.filter(f => !web.has(f) && !stage.has(f)),
        both: declared.filter(f => web.has(f) && stage.has(f)),
    };
}

// ---------------------------------------------------------------------------
// Repo wiring: union -> canvas arm -> web component -> data interface; dispatch arm -> renderX.
// ---------------------------------------------------------------------------
export function canonicalTemplates(typesSrc) {
    const unionBlock = (typesSrc.match(/export type SlideTemplate\s*=([\s\S]*?);/) || [, ''])[1];
    return [...stripComments(unionBlock).matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
}

/** `case 'x': ... <Component data={slide.key}` arms in SlideCanvas.tsx -> { template: {component, key} }. */
export function canvasArms(canvasSrc) {
    const out = {};
    const src = stripComments(canvasSrc);
    const re = /case\s*'([a-z0-9-]+)'\s*:/g;
    let m;
    const marks = [];
    while ((m = re.exec(src)) !== null) marks.push({ template: m[1], start: m.index });
    for (let i = 0; i < marks.length; i++) {
        const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
        const arm = src.slice(marks[i].start, end);
        const comp = /<([A-Z]\w+)\b[^>]*\bdata=\{slide\.(\w+)\}/.exec(arm);
        if (comp) out[marks[i].template] = { component: comp[1], key: comp[2] };
    }
    return out;
}

/** `case 'x': body = renderX(slide, T)` arms in slideToStageHtml.ts -> { template: fn }. */
export function stageArms(stageSrc) {
    const out = {};
    const src = stripComments(stageSrc);
    const re = /case\s*'([a-z0-9-]+)'\s*:\s*(?:case\s*'[a-z0-9-]+'\s*:\s*)*body\s*=\s*(\w+)\(/g;
    let m;
    while ((m = re.exec(src)) !== null) out[m[1]] = m[2];
    // fall-through groups: `case 'a': case 'b': body = renderX(` - credit every label in the group
    const groupRe = /((?:case\s*'[a-z0-9-]+'\s*:\s*)+)body\s*=\s*(\w+)\(/g;
    while ((m = groupRe.exec(src)) !== null) {
        for (const c of m[1].matchAll(/case\s*'([a-z0-9-]+)'/g)) out[c[1]] = m[2];
    }
    return out;
}

/** The web component's `data: XData` prop type name. */
export function webDataInterface(webDecls, component) {
    const body = webDecls.get(component);
    if (!body) return null;
    const m = /\bdata\??\s*:\s*([A-Z]\w*)/.exec(body.split('=>')[0] || body);
    return m ? m[1] : null;
}

export function computeTemplateFieldParity(root = ROOT) {
    const read = (p) => readFileSync(resolve(root, p), 'utf8');
    const typesSrc = read(TWIN_FILES.types);
    const typesClean = stripComments(typesSrc);
    const canvasSrc = read(TWIN_FILES.canvas);
    const webSrc = TWIN_FILES.web.map(read).join('\n');
    const stageSrc = read(TWIN_FILES.stage);

    const webDecls = topLevelDeclarations(stripComments(webSrc));
    const stageDecls = topLevelDeclarations(stripComments(stageSrc));
    const arms = canvasArms(canvasSrc);
    const stageFns = stageArms(stageSrc);
    const templates = canonicalTemplates(typesSrc);

    const results = [];
    for (const template of templates) {
        const arm = arms[template];
        const stageFn = stageFns[template];
        const info = { template, component: arm?.component || null, stageFn: stageFn || null, dataInterface: null, status: 'ok' };
        if (!arm) { results.push({ ...info, status: 'no-web-arm' }); continue; }
        if (!stageFn) { results.push({ ...info, status: 'no-stage-arm' }); continue; }
        const iface = webDataInterface(webDecls, arm.component);
        info.dataInterface = iface;
        const ifaceBody = iface ? interfaceBody(typesClean, iface) : null;
        if (!ifaceBody) { results.push({ ...info, status: 'no-types-contract' }); continue; }
        const tree = parseFieldTree(ifaceBody);
        const web = closureBody(webDecls, arm.component, WEB_HELPER_EXCLUDE);
        const stage = closureBody(stageDecls, stageFn, STAGE_HELPER_EXCLUDE);
        const chrome = dispatchChromeBlocks(stageDecls.get('slideDataToStageHtml') || '', template);
        const diff = diffTwinFields(tree, web.text, stage.text + chrome);
        results.push({ ...info, webClosure: web.names, stageClosure: stage.names, ...diff });
    }
    const failures = results.filter(r => (r.webOnly && r.webOnly.length) || (r.stageOnly && r.stageOnly.length));
    return { results, failures, pass: failures.length === 0 };
}

export function formatReport({ results, failures, pass }) {
    const lines = [];
    const contracts = results.filter(r => r.status === 'ok').length;
    lines.push(`[template-parity] templates=${results.length} contracts=${contracts} web=${TWIN_FILES.web.join(' + ')} stage=${TWIN_FILES.stage}`);
    for (const r of results) {
        if (r.status === 'no-web-arm') { lines.push(`  ${r.template}: INFO no SlideCanvas arm (not previewed as a slide)`); continue; }
        if (r.status === 'no-stage-arm') { lines.push(`  ${r.template}: INFO no slideToStageHtml dispatch arm (web ${r.component}; exported by a dedicated path or the generic fallback)`); continue; }
        if (r.status === 'no-types-contract') { lines.push(`  ${r.template}: INFO data contract ${r.dataInterface || '?'} is not declared in types.ts (skipped)`); continue; }
        const flag = (r.webOnly.length || r.stageOnly.length) ? 'DRIFT' : 'ok';
        lines.push(`  ${r.template} [${flag}] web=${r.component} stage=${r.stageFn} contract=${r.dataInterface}`);
        if (r.webOnly.length) lines.push(`      preview renders, EXPORT DROPS (fix in slideToStageHtml.ts): ${r.webOnly.join(', ')}`);
        if (r.stageOnly.length) lines.push(`      export renders, PREVIEW DROPS (fix in web.tsx): ${r.stageOnly.join(', ')}`);
        if (r.neither.length) lines.push(`      declared, rendered by neither twin (info): ${r.neither.join(', ')}`);
    }
    lines.push(pass
        ? '[template-parity] PASS - every declared field renders on both twins or on neither.'
        : `[template-parity] FAIL - ${failures.length} template(s) render a declared field on exactly one twin: ${failures.map(f => f.template).join(', ')}`);
    return lines.join('\n');
}

const invokedDirectly = (() => {
    if (!process.argv[1]) return false;
    const a = pathToFileURL(resolve(process.argv[1])).href.toLowerCase();
    return a === import.meta.url.toLowerCase();
})();

if (invokedDirectly) {
    let report;
    try { report = computeTemplateFieldParity(); }
    catch (e) { console.error(`! ${e.message}`); process.exit(2); }
    const text = formatReport(report);
    if (report.pass) { console.log(text); process.exit(0); }
    console.error(text);
    process.exit(1);
}
