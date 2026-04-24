import React, { useState, useRef, useEffect } from 'react';
import { parseHashtags } from './services/hashtagParser';
import { generateArtifact, type GenerateResult, type GenerateError } from './services/chatToArtifact';
import { useDesignDeskStore } from './store/designDeskStore';
import type { DesignTokens } from './services/designMdLoader';

interface ChatMsg {
    id: string;
    role: 'user' | 'system';
    content: string;
    timestamp: number;
}

interface Props {
    designMdRaw: string;
    tokens: DesignTokens;
    corpusText: string;
}

export const DesignDeskChat: React.FC<Props> = ({ designMdRaw, corpusText }) => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const { artifacts, activeArtifactId, addArtifact, replaceArtifact } = useDesignDeskStore();
    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            const res = await generateArtifact({
                content: active.type, brand: active.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText, currentArtifact: active,
            });
            handleResult(res);
            setBusy(false);
            return;
        }

        setBusy(true);
        for (const contentTag of parsed.content) {
            if (contentTag !== 'persona' && contentTag !== 'journey' && contentTag !== 'org') {
                setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}`, role: 'system', timestamp: Date.now(),
                    content: `#${contentTag} is out of scope for the framework pilot. Only #persona, #journey, and #org are supported in v1.` }]);
                continue;
            }
            const res = await generateArtifact({
                content: contentTag, brand: parsed.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText, currentArtifact: null,
            });
            handleResult(res, contentTag);
        }
        setBusy(false);
    };

    const handleResult = (res: GenerateResult | GenerateError, contentTag?: string) => {
        if (res.ok) {
            const isRevision = !!active && res.artifact.id === active.id;
            if (isRevision) replaceArtifact(res.artifact);
            else addArtifact(res.artifact);
            const label = (res.artifact as any).title ?? (res.artifact as any).name ?? res.artifact.type;
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                content: isRevision ? `Updated ${res.artifact.type}.` : `Created ${res.artifact.type}: ${label}`,
            }]);
        } else {
            const errMsg = (res as GenerateError).error;
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                content: `Generation failed${contentTag ? ` for #${contentTag}` : ''}: ${errMsg}`,
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
