import React, { useState, useRef, useEffect } from 'react';
import { parseHashtags } from './services/hashtagParser';
import { generateArtifact, type GenerateResult, type GenerateError } from './services/chatToArtifact';
import { generateFreeformArtifact } from './services/chatToFreeform';
import { generateSlideSpec } from './services/chatToSlideSpec';
import type { FreeformKind } from './schemas/freeformArtifact';

const FREEFORM_KINDS: ReadonlySet<FreeformKind> = new Set(['org', 'journey', 'arch', 'roadmap', 'blueprint']);

import { useDesignDeskStore } from './store/designDeskStore';
import type { DesignTokens } from './services/designMdLoader';
import { loadDesignContext, subscribeDesignContext, buildCombinedEvidence, type DesignContext } from './services/designContext';

interface ChatMsg {
    id: string;
    role: 'user' | 'system';
    content: string;
    timestamp: number;
}

/**
 * Small chrome strip that tells the user what evidence the Designer chat
 * has access to. Critical for trust — without this the user can't tell
 * whether "add a quote about X" is grounded in real research or hallucinated.
 */
const EvidenceStatus: React.FC<{ ctx: DesignContext; corpusTextProp: string }> = ({ ctx, corpusTextProp }) => {
    const corpusKb = Math.round(Math.max(ctx.corpusText.length, corpusTextProp.length) / 1024);
    const uploadsKb = Math.round(ctx.uploadedFileContents.length / 1024);
    const hasThemes = ctx.themes.length > 100;
    const hasPersonas = ctx.personas.length > 100;
    const hasJourney = ctx.journeyStages.length > 100;
    const noEvidence = corpusKb === 0 && uploadsKb === 0 && !hasThemes && !hasPersonas && !hasJourney;
    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8,
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#666',
        }}>
            {noEvidence ? (
                <span style={{ color: '#CC6644' }}>No research corpus loaded — generations will lack evidence grounding.</span>
            ) : (
                <>
                    {corpusKb > 0 && <span style={{ background: '#F0F0E8', padding: '2px 6px' }}>CORPUS {corpusKb}KB</span>}
                    {uploadsKb > 0 && <span style={{ background: '#F0F0E8', padding: '2px 6px' }}>UPLOADS {uploadsKb}KB</span>}
                    {hasThemes && <span style={{ background: '#E8F0E8', padding: '2px 6px' }}>THEMES</span>}
                    {hasPersonas && <span style={{ background: '#E8F0E8', padding: '2px 6px' }}>PERSONAS</span>}
                    {hasJourney && <span style={{ background: '#E8F0E8', padding: '2px 6px' }}>JOURNEY</span>}
                </>
            )}
        </div>
    );
};

/**
 * Diff two artifacts of the same type and produce a human-readable summary
 * of what actually changed. Lets the user verify the AI followed their
 * instruction. Falls back to "Updated <type>" when nothing meaningful diffed
 * (which itself is a useful signal — means the model returned an unchanged
 * artifact and we should investigate why).
 */
function summarizeRevision(before: any, after: any): string {
    const changes: string[] = [];
    const type = after.type;

    // Top-level common fields
    for (const field of ['title', 'name', 'role', 'jtbd']) {
        if (before[field] !== undefined && after[field] !== undefined && before[field] !== after[field]) {
            const beforeStr = String(before[field]).slice(0, 60);
            const afterStr = String(after[field]).slice(0, 60);
            changes.push(`${field}: "${beforeStr}" -> "${afterStr}"`);
        }
    }

    if (type === 'org') {
        const beforeDir = before.layout?.direction ?? 'TB';
        const afterDir = after.layout?.direction ?? 'TB';
        if (beforeDir !== afterDir) changes.push(`layout: ${beforeDir} -> ${afterDir}`);

        const beforeIds = new Set((before.nodes ?? []).map((n: any) => n.id));
        const afterIds = new Set((after.nodes ?? []).map((n: any) => n.id));
        const added = [...afterIds].filter(id => !beforeIds.has(id));
        const removed = [...beforeIds].filter(id => !afterIds.has(id));
        if (added.length) changes.push(`added ${added.length} node${added.length > 1 ? 's' : ''}`);
        if (removed.length) changes.push(`removed ${removed.length} node${removed.length > 1 ? 's' : ''}`);

        // Renames within shared ids
        const renames: string[] = [];
        for (const node of after.nodes ?? []) {
            const old = (before.nodes ?? []).find((n: any) => n.id === node.id);
            if (old && old.name !== node.name) renames.push(`${old.name} -> ${node.name}`);
        }
        if (renames.length) changes.push(`renamed: ${renames.slice(0, 3).join(', ')}${renames.length > 3 ? ` +${renames.length - 3} more` : ''}`);
    }

    if (type === 'journey') {
        const beforeIds = new Set((before.stages ?? []).map((s: any) => s.id));
        const afterIds = new Set((after.stages ?? []).map((s: any) => s.id));
        const added = [...afterIds].filter(id => !beforeIds.has(id));
        const removed = [...beforeIds].filter(id => !afterIds.has(id));
        if (added.length) changes.push(`added ${added.length} stage${added.length > 1 ? 's' : ''}`);
        if (removed.length) changes.push(`removed ${removed.length} stage${removed.length > 1 ? 's' : ''}`);
        for (const stage of after.stages ?? []) {
            const old = (before.stages ?? []).find((s: any) => s.id === stage.id);
            if (old && old.label !== stage.label) changes.push(`stage "${old.label}" -> "${stage.label}"`);
            if (old && old.emotion !== stage.emotion) changes.push(`${stage.label}: ${old.emotion} -> ${stage.emotion}`);
        }
    }

    if (type === 'persona') {
        const arrFields: ('goals' | 'painPoints')[] = ['goals', 'painPoints'];
        for (const f of arrFields) {
            const a: string[] = before[f] ?? [];
            const b: string[] = after[f] ?? [];
            if (a.length !== b.length) changes.push(`${f}: ${a.length} -> ${b.length}`);
        }
        const beforeQuotes = (before.quotes ?? []).length;
        const afterQuotes = (after.quotes ?? []).length;
        if (beforeQuotes !== afterQuotes) changes.push(`quotes: ${beforeQuotes} -> ${afterQuotes}`);
    }

    if (changes.length === 0) return `Updated ${type} (no detectable changes — the model may not have followed the instruction; try rephrasing).`;
    return `Updated ${type}: ${changes.join('; ')}`;
}

interface Props {
    designMdRaw: string;
    tokens: DesignTokens;
    corpusText: string;
}

export const DesignDeskChat: React.FC<Props> = ({ designMdRaw, corpusText: corpusTextProp }) => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [ctx, setCtx] = useState<DesignContext>(() => loadDesignContext());
    const endRef = useRef<HTMLDivElement>(null);
    const { artifacts, activeArtifactId, addArtifact, replaceArtifact } = useDesignDeskStore();
    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Subscribe to cross-window design-context updates. The Designer popup
    // runs in a separate window; when App.tsx in the main tab refreshes the
    // corpus or uploads, we pick it up here without a full reload.
    useEffect(() => {
        const unsub = subscribeDesignContext(setCtx);
        return unsub;
    }, []);

    // Reload from localStorage on mount (handles popup window opening AFTER
    // App.tsx has already populated context — no storage event would fire).
    useEffect(() => {
        const refresh = () => setCtx(loadDesignContext());
        refresh();
        window.addEventListener('focus', refresh);
        return () => window.removeEventListener('focus', refresh);
    }, []);

    /**
     * Combine all available evidence for the model:
     *   - corpusText prop (in-tab usage where the parent passes it directly)
     *   - localStorage-persisted corpus + uploads + themes/personas/journey
     * Whichever is bigger wins for the corpusText slot; uploads + structured
     * intelligence are always layered in if present.
     */
    const buildPromptCorpus = (): string => {
        const fromStore = buildCombinedEvidence(ctx);
        if (fromStore.length > corpusTextProp.length) return fromStore;
        // Fallback: use prop and decorate with structured intelligence from store
        const decoratedParts: string[] = [];
        if (corpusTextProp) decoratedParts.push('=== EXTERNAL RESEARCH CORPUS ===\n' + corpusTextProp);
        if (ctx.uploadedFileContents && ctx.uploadedFileContents.length > 40) decoratedParts.push('=== CLIENT UPLOADS ===\n' + ctx.uploadedFileContents);
        if (ctx.themes) decoratedParts.push('=== THEMES ===\n' + ctx.themes);
        if (ctx.personas) decoratedParts.push('=== PERSONAS ===\n' + ctx.personas);
        if (ctx.journeyStages) decoratedParts.push('=== JOURNEY ===\n' + ctx.journeyStages);
        return decoratedParts.join('\n\n');
    };

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;

        const parsed = parseHashtags(text);
        const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // No content hashtags -> revise the active artifact (if any)
        if (parsed.content.length === 0) {
            if (!active) {
                setMessages(prev => [...prev, { id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                    content: 'No active artifact. Start one with a content hashtag: #persona, #journey, or #org.' }]);
                return;
            }
            setBusy(true);
            const corpus = buildPromptCorpus();
            // Revision path — route by active artifact's type. Freeform artifacts
            // (org/journey/arch/roadmap/blueprint) go through chatToFreeform; persona
            // remains on the legacy structured pipeline.
            // SlideSpec revision path (feature-flagged)
            if ((active as any).type === 'slide') {
                const ss = await generateSlideSpec({
                    kind: (active as any).kind as FreeformKind,
                    brand: active.brand,
                    userPrompt: parsed.cleanPrompt,
                    corpus,
                    currentArtifact: active as any,
                    model: 'gemini-3.1-pro-preview',
                });
                if (ss.ok) {
                    replaceArtifact(ss.artifact as any);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                        content: `Updated ${ss.artifact.kind}: ${ss.artifact.title}` }]);
                } else {
                    const ssErr = ss as { ok: false; error: string; rawResponse?: string };
                    if (ssErr.rawResponse) console.warn(`[SlideSpec] revision failed:`, ssErr.error, '\nRaw:', ssErr.rawResponse);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                        content: `SlideSpec revision failed: ${ssErr.error}\n(See browser console for raw output.)` }]);
                }
                setBusy(false);
                return;
            }
            if ((active as any).type === 'freeform') {
                const ff = await generateFreeformArtifact({
                    kind: (active as any).kind as FreeformKind,
                    brand: active.brand,
                    userPrompt: parsed.cleanPrompt,
                    corpus,
                    currentArtifact: active as any,
                    // Designer revisions need to re-emit the FULL body content
                    // with edits applied. Gemini 2.5 Flash truncates dense
                    // diagrams mid-element ("INCOMPLETE BODY CONTENT: 17 divs
                    // opened, 12 closed"). Gemini 3.1 Pro has 1-2M context
                    // and much higher output token capacity, so revisions
                    // complete even on architecture diagrams with 30+ boxes.
                    // (2026-05-03: was claude-opus-4-7 before Anthropic
                    // elimination on this branch.)
                    model: 'gemini-3.1-pro-preview',
                });
                if (ff.ok) {
                    replaceArtifact(ff.artifact as any);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                        content: `Updated ${(ff.artifact as any).kind}: ${ff.artifact.title}` }]);
                } else {
                    const ffErr = ff as { ok: false; error: string; rawResponse?: string };
                    if (ffErr.rawResponse) console.warn(`[Freeform] revision failed:`, ffErr.error, '\nRaw:', ffErr.rawResponse);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                        content: `Revision failed: ${ffErr.error}\n(See browser console for raw output.)` }]);
                }
                setBusy(false);
                return;
            }
            const res = await generateArtifact({
                content: active.type, brand: active.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText: corpus, currentArtifact: active as any,
            });
            handleResult(res);
            setBusy(false);
            return;
        }

        setBusy(true);
        const corpus = buildPromptCorpus();
        for (const contentTag of parsed.content) {
            // Diagram kinds → freeform pipeline. Persona → legacy structured pipeline.
            if (FREEFORM_KINDS.has(contentTag as FreeformKind)) {
                const ff = await generateFreeformArtifact({
                    kind: contentTag as FreeformKind,
                    brand: parsed.brand,
                    userPrompt: parsed.cleanPrompt,
                    corpus,
                    currentArtifact: null,
                    model: 'gemini-3.1-pro-preview',
                });
                if (ff.ok) {
                    addArtifact(ff.artifact as any);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}_gen`, role: 'system', timestamp: Date.now(),
                        content: `Created ${(ff.artifact as any).kind} (${ff.artifact.brand.toUpperCase()}): ${ff.artifact.title}` }]);
                } else {
                    const ffErr = ff as { ok: false; error: string; rawResponse?: string };
                    if (ffErr.rawResponse) console.warn(`[Freeform] ${contentTag} failed:`, ffErr.error, '\nRaw:', ffErr.rawResponse);
                    setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}_err`, role: 'system', timestamp: Date.now(),
                        content: `Generation failed for #${contentTag}: ${ffErr.error}\n(See browser console for raw output.)` }]);
                }
                continue;
            }
            if (contentTag !== 'persona') {
                setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}`, role: 'system', timestamp: Date.now(),
                    content: `#${contentTag} is out of scope. Supported: #persona, #org, #journey, #arch, #roadmap, #blueprint.` }]);
                continue;
            }
            // Persona via legacy structured pipeline
            const res = await generateArtifact({
                content: contentTag, brand: parsed.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText: corpus, currentArtifact: null,
            });
            handleResult(res, contentTag);
        }
        setBusy(false);
    };

    const handleResult = (res: GenerateResult | GenerateError, contentTag?: string) => {
        if (res.ok) {
            const isRevision = !!active && res.artifact.id === active.id;
            const before = active;
            if (isRevision) replaceArtifact(res.artifact);
            else addArtifact(res.artifact);
            const label = (res.artifact as any).title ?? (res.artifact as any).name ?? res.artifact.type;
            const summary = isRevision && before
                ? summarizeRevision(before, res.artifact)
                : `Created ${res.artifact.type}: ${label}`;
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                content: summary,
            }]);
        } else {
            const errMsg = (res as GenerateError).error;
            const raw = (res as GenerateError).rawResponse;
            // Console-log the full raw response so the dev tools have it for diagnosis.
            // The chat shows a short readable message; the console has the full payload.
            if (raw) {
                console.warn(`[DesignDesk] generation failed${contentTag ? ` for #${contentTag}` : ''}:`, errMsg, '\nRaw model output:', raw);
            }
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                content: `Generation failed${contentTag ? ` for #${contentTag}` : ''}: ${errMsg}\n(See browser console for raw model output.)`,
            }]);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA', borderRight: '1px solid #E0E0E0', width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0E0E0', background: '#0D0D0D' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#B8B800' }}>Design Desk</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    Chat-driven artifact generation &mdash; persona + journey + org pilots
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 12 }}>
                        Try: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>#persona #NU junior dev from first-gen background</code>
                        <br/>or: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>#journey #NXT application to enrollment</code>
                        <br/>or: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>#org #NU advancement division</code>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%', padding: '8px 12px', fontSize: 13, lineHeight: 1.5,
                        background: m.role === 'user' ? '#0D0D0D' : '#FFFFFF',
                        color: m.role === 'user' ? '#FFFFFF' : '#333',
                        border: m.role === 'system' ? '1px solid #E0E0E0' : 'none',
                        whiteSpace: 'pre-wrap',
                    }}>{m.content}</div>
                ))}
                {busy && (
                    <div style={{ alignSelf: 'flex-start', padding: '8px 12px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>Generating&hellip;</div>
                )}
                <div ref={endRef} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #E0E0E0', background: '#FFFFFF' }}>
                <EvidenceStatus ctx={ctx} corpusTextProp={corpusTextProp} />
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Start with a hashtag: #persona, #journey, #org"
                    rows={2}
                    style={{ width: '100%', padding: 8, border: '1px solid #DDD', fontFamily: "'Archivo', sans-serif", fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button onClick={send} disabled={busy || !input.trim()}
                        style={{ padding: '6px 16px', background: '#0D0D0D', color: '#FFFFFF', border: 'none',
                            fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
