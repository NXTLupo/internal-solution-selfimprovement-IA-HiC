/**
 * Corpus Chat Panel — "Chat to Your Data"
 *
 * A persistent conversational interface that appears throughout the research
 * pipeline (during analysis) and in the results dashboard (after completion).
 * Grounded in the full curated research corpus.
 *
 * Features:
 * - Model selector: Claude Opus 4.6, o3-mini, Gemini 3.1 Pro
 * - Conversation history persisted across panel open/close
 * - Suggested queries based on pipeline stage
 * - Full corpus + deliverables as grounding context
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, AVAILABLE_MODELS, ChatMessage, ChatModel, ChatContext, parseChatCitations } from '../services/corpusChatService';

interface Props {
    context: ChatContext;
    getContext?: () => ChatContext;  // Lazy builder — reads refs at query time, not render time
    isOpen: boolean;
    onToggle: () => void;
}

const SUGGESTED_QUERIES = [
    "What are the top 15 themes learned across all data sources?",
    "What are the key personas across all collected data?",
    "What are the most cited pain points across all sources?",
    "Which data sources had the strongest evidence for the research goal?",
    "Summarize the competitive landscape based on collected intelligence",
    "What are the top 5 strategic recommendations and their evidence?",
    "What do Reddit users say about this topic? Quote them directly.",
    "Which academic papers are most relevant and what do they conclude?",
    "What capability gaps were identified and how severe are they?",
    "What case studies or real-world examples appear in the data?",
];

export const CorpusChatPanel: React.FC<Props> = ({ context, getContext, isOpen, onToggle }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.1-pro');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async (queryOverride?: string) => {
        const query = queryOverride || input.trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setShowSuggestions(false);

        // Use getContext() if available — reads refs at QUERY TIME, not stale render-time values
        const liveContext = getContext ? getContext() : context;
        const response = await sendChatMessage(selectedModel, query, messages, liveContext);
        setMessages(prev => [...prev, response]);
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === selectedModel);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
            background: '#FFFFFF', borderLeft: '1px solid #E0E0E0',
            zIndex: 60, display: 'flex', flexDirection: 'column',
            fontFamily: "'Archivo', sans-serif",
            boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
        }}>
            {/* Header */}
            <div style={{
                background: '#0D0D0D', padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>
                        Chat to Your Data
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        {context.sourceCount} sources | {context.articleCount} articles
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {messages.length > 0 && (
                        <button
                            onClick={() => {
                                const text = messages.map(m => `[${m.role.toUpperCase()}${m.model ? ` via ${m.model}` : ''}]\n${m.content}`).join('\n\n---\n\n');
                                const blob = new Blob([text], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = `chat-conversation-${new Date().toISOString().split('T')[0]}.txt`;
                                a.click(); URL.revokeObjectURL(url);
                            }}
                            style={{ fontSize: 8, color: '#B8B800', background: 'none', border: '1px solid #555', padding: '3px 8px', borderRadius: 2, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}
                        >Export Chat</button>
                    )}
                    <button onClick={onToggle} style={{
                        background: 'none', border: 'none', color: '#888', fontSize: 18,
                        cursor: 'pointer', padding: '4px 8px',
                    }}>X</button>
                </div>
            </div>

            {/* Model Selector */}
            <div style={{
                padding: '12px 20px', borderBottom: '1px solid #E8E8E8',
                display: 'flex', gap: 6,
            }}>
                {AVAILABLE_MODELS.map(m => (
                    <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        title={`${m.description}\n${m.contextWindow} | ${m.strengths}`}
                        style={{
                            flex: 1, padding: '8px 4px', borderRadius: 2, border: '1px solid',
                            borderColor: selectedModel === m.id ? m.color : '#E0E0E0',
                            background: selectedModel === m.id ? `${m.color}10` : '#FAFAFA',
                            cursor: 'pointer', transition: 'all 0.15s',
                            opacity: m.available ? 1 : 0.4,
                        }}
                    >
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: selectedModel === m.id ? m.color : '#888' }}>
                            {m.provider}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#333', marginTop: 2 }}>
                            {m.name.split(' ').slice(-2).join(' ')}
                        </div>
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '16px 20px',
                display: 'flex', flexDirection: 'column', gap: 12,
            }}>
                {/* Welcome message */}
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                            Ask anything about your research data
                        </div>
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5, marginBottom: 16 }}>
                            Grounded in {context.articleCount} articles from {context.sourceCount} sources.
                            {context.themes?.length ? ` ${context.themes.length} themes identified.` : ''}
                            {context.personas?.length ? ` ${context.personas.length} personas generated.` : ''}
                        </div>
                    </div>
                )}

                {/* Suggested queries */}
                {showSuggestions && messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B8B800' }}>
                            Suggested Questions
                        </div>
                        {SUGGESTED_QUERIES.slice(0, 6).map((q, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(q)}
                                style={{
                                    textAlign: 'left', padding: '10px 12px', background: '#FAFAFA',
                                    border: '1px solid #E8E8E8', borderRadius: 2, cursor: 'pointer',
                                    fontSize: 11, color: '#444', lineHeight: 1.4,
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#B8B800'; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#E8E8E8'; }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {/* Conversation messages */}
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                    }}>
                        {msg.role === 'assistant' && (
                            <div style={{
                                fontSize: 8, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                                color: AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#888',
                                marginBottom: 4,
                            }}>
                                {AVAILABLE_MODELS.find(m => m.id === msg.model)?.name || msg.model}
                                {msg.durationMs ? ` (${(msg.durationMs / 1000).toFixed(1)}s)` : ''}
                            </div>
                        )}
                        <div style={{
                            padding: '10px 14px', borderRadius: 2,
                            background: msg.role === 'user' ? '#0D0D0D' : '#F5F5F0',
                            color: msg.role === 'user' ? '#FFFFFF' : '#333',
                            fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                            borderLeft: msg.role === 'assistant' ? `3px solid ${AVAILABLE_MODELS.find(m => m.id === msg.model)?.color || '#888'}` : 'none',
                            position: 'relative',
                        }}>
                            {msg.role === 'assistant' ? (() => {
                                const { segments } = parseChatCitations(msg.content, context.sourceReferences);
                                return segments.map((seg, si) => {
                                    if (seg.type === 'citation') {
                                        return (
                                            <span key={si} style={{ display: 'inline' }}>
                                                {seg.url ? (
                                                    <a
                                                        href={seg.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={`${seg.sourceName}: ${seg.title}\nClick to visit source`}
                                                        style={{
                                                            color: '#115054', background: '#E8F4F5',
                                                            padding: '1px 6px', borderRadius: 2,
                                                            textDecoration: 'none', fontSize: 11,
                                                            fontWeight: 600, cursor: 'pointer',
                                                            borderBottom: '1px solid #00B7C3',
                                                        }}
                                                        onMouseEnter={e => { (e.target as HTMLElement).style.background = '#D0EEF0'; }}
                                                        onMouseLeave={e => { (e.target as HTMLElement).style.background = '#E8F4F5'; }}
                                                    >
                                                        {seg.sourceName}: "{seg.title?.substring(0, 50)}{(seg.title?.length || 0) > 50 ? '...' : ''}"
                                                        <span style={{ fontSize: 9, marginLeft: 3, color: '#00B7C3' }}>&#8599;</span>
                                                    </a>
                                                ) : (
                                                    <span
                                                        title={`${seg.sourceName}: ${seg.title}`}
                                                        style={{
                                                            color: '#115054', background: '#F0F0E8',
                                                            padding: '1px 6px', borderRadius: 2,
                                                            fontSize: 11, fontWeight: 600,
                                                        }}
                                                    >
                                                        {seg.sourceName}: "{seg.title?.substring(0, 50)}{(seg.title?.length || 0) > 50 ? '...' : ''}"
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    }
                                    return <span key={si}>{seg.content}</span>;
                                });
                            })() : msg.content}
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 8, borderTop: '1px solid #E0E0E0', paddingTop: 6 }}>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                        style={{ fontSize: 9, color: '#888', background: 'none', border: '1px solid #DDD', padding: '2px 8px', borderRadius: 2, cursor: 'pointer' }}
                                    >Copy</button>
                                    <button
                                        onClick={() => {
                                            const blob = new Blob([msg.content], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url; a.download = `chat-response-${msg.model}-${new Date().toISOString().split('T')[0]}.txt`;
                                            a.click(); URL.revokeObjectURL(url);
                                        }}
                                        style={{ fontSize: 9, color: '#888', background: 'none', border: '1px solid #DDD', padding: '2px 8px', borderRadius: 2, cursor: 'pointer' }}
                                    >Export</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div style={{
                        alignSelf: 'flex-start', padding: '10px 14px',
                        background: '#F5F5F0', borderRadius: 2,
                        borderLeft: `3px solid ${modelConfig?.color || '#888'}`,
                        fontSize: 11, color: '#888',
                    }}>
                        <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>
                            {modelConfig?.name} is thinking...
                        </span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '12px 20px 16px', borderTop: '1px solid #E8E8E8',
                background: '#FAFAFA',
            }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your research data..."
                        rows={2}
                        style={{
                            flex: 1, padding: '10px 12px', border: '1px solid #E0E0E0',
                            borderRadius: 2, fontSize: 12, fontFamily: "'Archivo', sans-serif",
                            resize: 'none', outline: 'none', lineHeight: 1.5,
                        }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        style={{
                            padding: '0 16px', background: isLoading ? '#CCC' : '#B8B800',
                            color: '#0D0D0D', border: 'none', borderRadius: 2,
                            fontWeight: 700, fontSize: 11, letterSpacing: '1px',
                            textTransform: 'uppercase', cursor: isLoading ? 'default' : 'pointer',
                        }}
                    >
                        Send
                    </button>
                </div>
                <div style={{ fontSize: 9, color: '#AAA', marginTop: 6 }}>
                    Shift+Enter for new line | Grounded in {context.articleCount} articles via {modelConfig?.name}
                </div>
            </div>
        </div>
    );
};

export default CorpusChatPanel;
