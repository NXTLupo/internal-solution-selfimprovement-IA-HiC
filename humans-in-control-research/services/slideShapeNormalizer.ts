/**
 * slideShapeNormalizer.ts (2026-10-05)
 *
 * Models sometimes emit an OLDER field shape for a slide template. The renderers (web.tsx preview, slideToStageHtml
 * export) read only the canonical shape, so the slide rendered empty. Live #journey: the model returned a complete
 * journey as `phases` + `actors[{name, role, cells}]`; the canonical shape is `stages` + `lanes[{actor, role, cells}]`,
 * and the slide shipped as "No journey stages." The fix is deterministic and runs on every parsed slide, so it holds
 * for any model and any prompt.
 */

type AnyRec = Record<string, any>;

/** Map a journey map in the older phases/actors shape onto the canonical stages/lanes shape, in place. */
function normalizeJourneyMap(jm: AnyRec | undefined | null): AnyRec | undefined | null {
    if (!jm || typeof jm !== 'object') return jm;
    if (!Array.isArray(jm.stages) || !jm.stages.length) {
        const src = Array.isArray(jm.phases) ? jm.phases : Array.isArray(jm.steps) ? jm.steps : null;
        if (src && src.length) {
            jm.stages = src.map((p: any) => (typeof p === 'string' ? { name: p } : { name: String(p?.name || p?.phase || p?.title || ''), ...(p?.critical ? { critical: true } : {}) }));
        }
    }
    if (!Array.isArray(jm.lanes) || !jm.lanes.length) {
        const src = Array.isArray(jm.actors) ? jm.actors : Array.isArray(jm.swimlanes) ? jm.swimlanes : null;
        if (src && src.length && typeof src[0] === 'object') {
            jm.lanes = src.map((a: any) => ({
                actor: String(a?.actor || a?.name || a?.title || ''),
                ...(a?.role ? { role: String(a.role) } : {}),
                cells: Array.isArray(a?.cells) ? a.cells.map((c: any) => String(c ?? '')) : Array.isArray(a?.actions) ? a.actions.map((c: any) => String(c ?? '')) : [],
            }));
            // `actors` in the canonical shape is the meta-row STRING; keep a readable one.
            jm.actors = jm.lanes.map((l: AnyRec) => l.actor).filter(Boolean).join(', ');
        }
    }
    // Every text slot the renderers .trim() is a STRING (2026-10-05 live crash: "(x || '').trim is not a function" on a
    // lane cell that arrived as an object).
    const txt = (v: any): string => (typeof v === 'string' ? v : v == null ? '' : typeof v === 'object' ? String(v.text ?? v.ctext ?? v.cell ?? v.action ?? v.label ?? v.name ?? v.description ?? '') : String(v));
    if (Array.isArray(jm.stages)) jm.stages = jm.stages.map((s: any) => (typeof s === 'string' ? s : { ...s, name: txt(s?.name ?? s) }));
    if (Array.isArray(jm.lanes)) jm.lanes = jm.lanes.map((l: any) => ({ ...l, actor: txt(l?.actor), ...(l?.role != null ? { role: txt(l.role) } : {}), cells: Array.isArray(l?.cells) ? l.cells.map(txt) : [] }));
    for (const k of ['painPoints', 'opportunities', 'personas', 'signals', 'emotions']) {
        if (Array.isArray(jm[k])) jm[k] = jm[k].map((v: any) => (Array.isArray(v) ? v.map(txt) : txt(v)));
    }
    if (jm.keyInsight != null && typeof jm.keyInsight !== 'string') jm.keyInsight = txt(jm.keyInsight);
    if (jm.actors != null && typeof jm.actors !== 'string') jm.actors = Array.isArray(jm.actors) ? jm.actors.map(txt).join(', ') : txt(jm.actors);
    return jm;
}

/** Architecture nodes: the renderers read `name`; models also emit `label` / `title` (2026-10-05 live #arch shipped
 *  boxes that showed only "USER" / "APPLICATION" type tags, the system names were in `label`). */
function normalizeArchitectureMap(am: AnyRec | undefined | null): AnyRec | undefined | null {
    if (!am || typeof am !== 'object' || !Array.isArray(am.layers)) return am;
    for (const layer of am.layers) {
        if (layer && !layer.name && (layer.label || layer.title)) layer.name = String(layer.label || layer.title);
        for (const n of Array.isArray(layer?.nodes) ? layer.nodes : []) {
            if (n && typeof n === 'object' && !n.name && (n.label || n.title)) n.name = String(n.label || n.title);
        }
    }
    return am;
}

/** A journey written under `serviceBlueprint` (2026-10-05 live #journey: stages {name, summary, pain, emotion} on the
 *  journey-map template, rendered "No journey stages."). Lanes come from the blueprint lanes when present, else one
 *  experience lane from the stage summaries. */
function journeyFromBlueprint(sb: AnyRec): AnyRec | null {
    const st: any[] = Array.isArray(sb?.stages) ? sb.stages : [];
    if (!st.length) return null;
    const name = (s: any) => String(s?.name || s?.phase || s?.title || '');
    const laneDefs: Array<[string, string[]]> = [
        ['Customer', ['customerAction', 'action', 'actions']], ['Frontstage', ['frontstage']], ['Backstage', ['backstage']],
    ];
    const lanes = laneDefs
        .map(([actor, keys]) => ({ actor, cells: st.map(s => String(keys.map(k => s?.[k]).find(v => typeof v === 'string' && v.trim()) || 'not engaged')) }))
        .filter(l => l.cells.some(c => c !== 'not engaged'));
    if (!lanes.length) lanes.push({ actor: 'Experience', cells: st.map(s => String(s?.summary || s?.description || s?.customerAction || '')) });
    return {
        stages: st.map(s => ({ name: name(s), ...(s?.failPoint ? { critical: true } : {}) })),
        lanes,
        painPoints: st.map(s => String(s?.pain || s?.painPoint || '')),
        opportunities: st.map(s => String(s?.opportunity || s?.opportunityForImprovement || '')),
        ...(sb.keyInsight ? { keyInsight: String(sb.keyInsight) } : {}),
    };
}

/** Normalize every known older field shape on one parsed slide object, in place; returns it. `template` is the fence
 *  template when known (a blueprint-shaped payload is converted only when a journey map was asked for). */
export function normalizeSlideShape(parsed: AnyRec, template = ''): AnyRec {
    if (!parsed || typeof parsed !== 'object') return parsed;
    // A title carries the judgment; its citation lives on the slide body (2026-10-05 live titles ending in
    // "(Source: Experiential Learning 1 Meeting Summary - 09302026)" and "(Source: Client document)").
    if (typeof parsed.title === 'string') {
        parsed.title = parsed.title.replace(/\s*[([]\s*(?:Sources?|Source:|Client (?:document|uploads?))[^)\]]*[)\]]\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
    }
    const wantsJourney = /journey-map/i.test(String(template || parsed.template || ''));
    const jmEmpty = !parsed.journeyMap || (!Array.isArray(parsed.journeyMap.stages) && !Array.isArray(parsed.journeyMap.phases));
    if (wantsJourney && jmEmpty && parsed.serviceBlueprint) {
        const jm = journeyFromBlueprint(parsed.serviceBlueprint);
        if (jm) { parsed.journeyMap = jm; delete parsed.serviceBlueprint; }
    }
    if (parsed.architectureMap) normalizeArchitectureMap(parsed.architectureMap);
    // principles: canonical { items: [{ name, description }] }; models also emit a bare array and title/body
    // (2026-10-05 live #gap "Remediation principles guide the integration process" rendered blank).
    if (Array.isArray(parsed.principles)) parsed.principles = { items: parsed.principles };
    if (parsed.principles && Array.isArray(parsed.principles.items)) {
        parsed.principles.items = parsed.principles.items.map((it: any) => (typeof it === 'string'
            ? { name: it, description: '' }
            : { ...it, name: String(it?.name ?? it?.title ?? it?.principle ?? ''), description: String(it?.description ?? it?.body ?? it?.detail ?? it?.text ?? '') }));
    }
    // themeCluster themes: renderers read insight / evidence / quotes; models also emit description / quote
    // (2026-10-05 live #journey theme-detail slides: "CONVERGENT EVIDENCE" with nothing under it).
    if (parsed.themeCluster && Array.isArray(parsed.themeCluster.themes)) {
        parsed.themeCluster.themes = parsed.themeCluster.themes.map((t: any) => {
            if (!t || typeof t !== 'object') return t;
            const o = { ...t };
            if (!o.insight && (o.description || o.summary)) o.insight = String(o.description || o.summary);
            if (!o.evidence && !(Array.isArray(o.quotes) && o.quotes.length) && (o.quote || o.verbatim)) o.evidence = String(o.quote || o.verbatim);
            return o;
        });
    }
    // timeline phases: canonical { name, items[] }; models also emit description / pain / activities (live #journey and
    // #gap roadmap phases rendered with empty bodies).
    if (parsed.timeline && Array.isArray(parsed.timeline.phases)) {
        parsed.timeline.phases = parsed.timeline.phases.map((p: any) => {
            if (typeof p === 'string') return { name: p, items: [] };
            if (!p || typeof p !== 'object') return p;
            if (Array.isArray(p.items) && p.items.length) return p;
            const items = [
                ...(Array.isArray(p.activities) ? p.activities : []), ...(Array.isArray(p.milestones) ? p.milestones : []),
                p.description, p.pain ? `Friction: ${p.pain}` : '', p.outcome,
            ].map((x: any) => (typeof x === 'string' ? x : x?.name || x?.text || '')).filter((x: string) => x && x.trim());
            return { ...p, name: String(p.name || p.phase || p.title || ''), items };
        });
    }
    // competitive matrix written WITHOUT its `matrix` wrapper (round-8 live #compete rendered an empty matrix: rowsProse,
    // patternLine, rows and columns sat at the top level).
    if (!parsed.matrix && /competitive/i.test(String(template || parsed.template || ''))) {
        const keys = ['rowsProse', 'patternLine', 'rows', 'columns', 'columnDefs', 'scaleMax', 'scaleLabels', 'insight', 'subjectRow', 'peerImages'];
        if (keys.some(k => parsed[k] !== undefined) && (Array.isArray(parsed.rowsProse) || Array.isArray(parsed.rows))) {
            parsed.matrix = {};
            for (const k of keys) if (parsed[k] !== undefined) { parsed.matrix[k] = parsed[k]; delete parsed[k]; }
        }
    }
    // service blueprint stages: canonical frontstage / backstage / support; models also emit frontstageAction /
    // backstageAction / supportProcesses (round-8 live #blueprint: three lanes showed "-" in every column).
    if (parsed.serviceBlueprint && Array.isArray(parsed.serviceBlueprint.stages)) {
        parsed.serviceBlueprint.stages = parsed.serviceBlueprint.stages.map((st: any) => {
            if (!st || typeof st !== 'object') return st;
            const o = { ...st };
            if (!o.phase && (o.name || o.stage)) o.phase = String(o.name || o.stage);
            if (!o.customerAction && (o.action || o.customer)) o.customerAction = String(o.action || o.customer);
            if (!o.frontstage && (o.frontstageAction || o.frontstageActions || o.onstage)) o.frontstage = String(o.frontstageAction || o.frontstageActions || o.onstage);
            if (!o.backstage && (o.backstageAction || o.backstageActions)) o.backstage = String(o.backstageAction || o.backstageActions);
            if (!o.support && (o.supportProcesses || o.supportProcess || o.supportSystems || o.technologySystems)) o.support = String(o.supportProcesses || o.supportProcess || o.supportSystems || o.technologySystems);
            if (!o.painPoint && o.pain) o.painPoint = String(o.pain);
            return o;
        });
    }
    // Source lists: no empty entries, no duplicates (live persona footers "SOURCES: · THE CONVERSATION (RSS) · ·").
    if (Array.isArray(parsed.sources)) {
        const seenSrc = new Set<string>();
        parsed.sources = parsed.sources.map((x: any) => (typeof x === 'string' ? x.trim() : x)).filter((x: any) => {
            if (typeof x !== 'string') return !!x;
            const k = x.toLowerCase().replace(/[^a-z0-9]+/g, '');
            if (!k || seenSrc.has(k)) return false;
            seenSrc.add(k);
            return true;
        });
    }
    // org chart written WITHOUT the orgChart wrapper (round-7 live #org "No org tiers."): top-level verb tiers
    // (decides / directs / delivers / advises, each a list of { role, owner, responsibility }) or a top-level tiers[].
    if (!parsed.orgChart) {
        const VERBS = ['decides', 'directs', 'delivers', 'advises', 'informs', 'supports'];
        const verbTiers = VERBS.filter(v => Array.isArray(parsed[v]) && parsed[v].length);
        if (verbTiers.length) {
            parsed.orgChart = { tiers: verbTiers.map((v, i) => ({ label: `TIER ${i + 1} · ${v.toUpperCase()}`, roles: parsed[v].map((n: any) => (typeof n === 'string' ? { title: n } : { title: n.role || n.title || n.name, owner: n.owner, description: n.responsibility || n.description, source: n.source })) })) };
            for (const v of verbTiers) delete parsed[v];
        } else if (Array.isArray(parsed.tiers) && /org/i.test(String(template || parsed.template || ''))) {
            parsed.orgChart = { tiers: parsed.tiers };
            delete parsed.tiers;
        }
    }
    // org chart: canonical tiers[{ label, nodes[{ title, role, source }] }]; models also emit name / roles[{ title,
    // owner, description }] (live #org rendered a chart with no nodes).
    if (parsed.orgChart && Array.isArray(parsed.orgChart.tiers)) {
        parsed.orgChart.tiers = parsed.orgChart.tiers.map((t: any) => {
            if (!t || typeof t !== 'object') return t;
            const src = Array.isArray(t.nodes) && t.nodes.length ? t.nodes : Array.isArray(t.roles) ? t.roles : Array.isArray(t.members) ? t.members : [];
            return {
                ...t,
                label: String(t.label || t.name || t.tier || ''),
                nodes: src.map((n: any) => (typeof n === 'string' ? { title: n, role: '', source: '' } : {
                    ...n,
                    title: String(n.title || n.name || n.position || ''),
                    role: String(n.role || [n.owner, n.description || n.responsibility].filter(Boolean).join(': ') || ''),
                    source: String(n.source || ''),
                })),
            };
        });
    }
    // recommendation: canonical { actionTitle, rationale, supportingActions }; models also emit title/description and
    // actions/steps (live #gap recommendation slide showed only "01 02 03 04").
    // A recommendation slide written as a plural list (live #gap / #org / #journey "recommendation" slides with an
    // empty body): the slide title is the action, the list items are its supporting actions.
    if (!parsed.recommendation && Array.isArray(parsed.recommendations) && parsed.recommendations.length
        && /recommendation/i.test(String(template || parsed.template || 'recommendation'))) {
        parsed.recommendation = {
            actionTitle: String(parsed.title || ''),
            supportingActions: parsed.recommendations.map((r: any) => (typeof r === 'string' ? { name: r, description: '' }
                : { name: String(r?.title ?? r?.name ?? r?.action ?? '').replace(/^\s*\d+[.)]\s*/, ''), description: String(r?.description ?? r?.detail ?? r?.rationale ?? '') })),
        };
    }
    if (parsed.recommendation && typeof parsed.recommendation === 'object') {
        const r = parsed.recommendation;
        if (!r.actionTitle && (r.title || r.action)) r.actionTitle = String(r.title || r.action);
        if (!r.rationale && (r.description || r.why)) r.rationale = String(r.description || r.why);
        if (!Array.isArray(r.supportingActions) || !r.supportingActions.length) {
            const src = Array.isArray(r.actions) ? r.actions : Array.isArray(r.steps) ? r.steps : Array.isArray(r.supporting) ? r.supporting : null;
            if (src) r.supportingActions = src.map((a: any) => (typeof a === 'string' ? { name: a, description: '' } : { name: String(a?.name ?? a?.title ?? a?.action ?? ''), description: String(a?.description ?? a?.detail ?? '') }));
        }
        if (Array.isArray(r.supportingActions)) r.supportingActions = r.supportingActions.filter((a: any) => a && (a.name || a.description));
    }
    if (parsed.journeyMap) normalizeJourneyMap(parsed.journeyMap);
    else if (Array.isArray(parsed.phases) && Array.isArray(parsed.actors) && typeof parsed.actors[0] === 'object') {
        // A journey emitted flat (no journeyMap wrapper).
        parsed.journeyMap = normalizeJourneyMap({ phases: parsed.phases, actors: parsed.actors, painPoints: parsed.painPoints, opportunities: parsed.opportunities, personas: parsed.personas, keyInsight: parsed.keyInsight });
    }
    return parsed;
}
