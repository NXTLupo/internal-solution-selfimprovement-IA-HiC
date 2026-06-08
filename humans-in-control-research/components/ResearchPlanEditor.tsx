// components/ResearchPlanEditor.tsx
// 2026-05-26 - Plan editor modal for HiC Deep Research.
// Opens when the user clicks a research-plan FreeformArtifact. Lets the
// operator review and amend the planner's output BEFORE collection runs.
// Approve fires the plan-act-reflect runner (services/researchPlanRunner.ts).
//
// This is the "human checkpoint" piece of the Humans in Control framing.
// NotebookLM has Deep Research; only HiC has it with a deliberate user
// gate at the planning stage.

import React, { useState, useCallback } from 'react';
import type { ResearchPlan, SubQuestion, SourceStrategyEntry } from '../services/researchPlanner';

export interface ResearchPlanEditorProps {
    plan: ResearchPlan;
    onApprove: (editedPlan: ResearchPlan) => void;
    onCancel: () => void;
    /** Optional: surface live runner status while the iteration is firing. */
    runnerStatus?: {
        iteration: number;
        maxIterations: number;
        spendUsd: number;
        currentSubQuestion?: string;
        verdict?: string;
    } | null;
}

const ANGLE_LABELS: Record<SubQuestion['angle'], string> = {
    definition: 'Definition',
    mechanism: 'Mechanism',
    evidence: 'Evidence',
    counter_evidence: 'Counter-evidence',
    second_order: 'Second-order',
    named_entities: 'Named entities',
};

const ANGLE_COLORS: Record<SubQuestion['angle'], string> = {
    definition: '#00B7C3',
    mechanism: '#B8B800',
    evidence: '#0CCE6B',
    counter_evidence: '#CC6644',
    second_order: '#115054',
    named_entities: '#0D0D0D',
};

export const ResearchPlanEditor: React.FC<ResearchPlanEditorProps> = ({ plan, onApprove, onCancel, runnerStatus }) => {
    const [edited, setEdited] = useState<ResearchPlan>(plan);
    const [activeTab, setActiveTab] = useState<'questions' | 'sources' | 'budget'>('questions');

    const updateSubQuestion = useCallback((id: string, patch: Partial<SubQuestion>) => {
        setEdited(prev => ({
            ...prev,
            sub_questions: prev.sub_questions.map(sq => sq.id === id ? { ...sq, ...patch } : sq),
        }));
    }, []);

    const removeSubQuestion = useCallback((id: string) => {
        setEdited(prev => ({
            ...prev,
            sub_questions: prev.sub_questions.filter(sq => sq.id !== id),
        }));
    }, []);

    const addSubQuestion = useCallback(() => {
        const newId = `sq_${Date.now()}`;
        setEdited(prev => ({
            ...prev,
            sub_questions: [
                ...prev.sub_questions,
                {
                    id: newId,
                    question: '',
                    angle: 'evidence',
                    expected_evidence_types: ['academic', 'news'],
                    expected_named_entities: [],
                    priority: 'medium',
                },
            ],
        }));
    }, []);

    const updateSourceStrategy = useCallback((idx: number, patch: Partial<SourceStrategyEntry>) => {
        setEdited(prev => ({
            ...prev,
            source_strategy: prev.source_strategy.map((s, i) => i === idx ? { ...s, ...patch } : s),
        }));
    }, []);

    const isRunning = !!runnerStatus;
    const canApprove = !isRunning && edited.sub_questions.length > 0 && edited.sub_questions.every(sq => sq.question.trim().length > 0);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,13,13,0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'Archivo, sans-serif',
        }}>
            <div style={{
                background: '#FFFFFF',
                width: 'min(1200px, 96vw)',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
                border: '1px solid #0D0D0D',
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    background: '#0D0D0D',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    borderBottom: '4px solid #B8B800',
                }}>
                    <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#B8B800', textTransform: 'uppercase' }}>
                            HUMANS IN CONTROL {String.fromCharCode(0x00B7)} DEEP RESEARCH PLAN
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1.5, marginTop: 4 }}>
                            {edited.goal.slice(0, 100) || 'Untitled research'}
                        </div>
                    </div>
                    <button onClick={onCancel} aria-label="Close" style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                        color: '#FFF', cursor: 'pointer', width: 32, height: 32,
                        fontSize: 16, lineHeight: '30px', borderRadius: 2,
                    }}>{String.fromCharCode(0x00D7)}</button>
                </div>

                {/* Runner status banner (when active) */}
                {runnerStatus && (
                    <div style={{
                        padding: '10px 24px',
                        background: '#115054',
                        color: '#FFFFFF',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        display: 'flex',
                        gap: 18,
                        alignItems: 'center',
                    }}>
                        <span style={{ color: '#B8B800', fontWeight: 700 }}>RUNNING</span>
                        <span>Iteration {runnerStatus.iteration}/{runnerStatus.maxIterations}</span>
                        <span>Spend: ${runnerStatus.spendUsd.toFixed(2)} / ${edited.budget_usd}</span>
                        {runnerStatus.currentSubQuestion && <span style={{ flex: 1, opacity: 0.85 }}>Now: {runnerStatus.currentSubQuestion.slice(0, 80)}</span>}
                        {runnerStatus.verdict && <span style={{ color: '#0CCE6B' }}>{runnerStatus.verdict}</span>}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E0E0E0', padding: '0 24px', background: '#FAFAF7' }}>
                    {(['questions', 'sources', 'budget'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '14px 18px',
                                cursor: 'pointer',
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 13,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                color: activeTab === t ? '#0D0D0D' : '#888',
                                borderBottom: activeTab === t ? '3px solid #B8B800' : '3px solid transparent',
                            }}
                        >
                            {t === 'questions' && `Sub-questions (${edited.sub_questions.length})`}
                            {t === 'sources' && `Source strategy (${edited.source_strategy.length})`}
                            {t === 'budget' && 'Budget + Iteration'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {activeTab === 'questions' && (
                        <div>
                            <div style={{ marginBottom: 14, fontSize: 11, color: '#525252', fontFamily: "'JetBrains Mono', monospace" }}>
                                The planner emitted {plan.sub_questions.length} sub-questions spanning {Array.from(new Set(plan.sub_questions.map(s => s.angle))).length} angles. Add, remove, or refine before the iteration runs.
                            </div>
                            {edited.sub_questions.map((sq) => (
                                <div key={sq.id} style={{
                                    border: '1px solid #E0E0E0',
                                    borderLeft: `4px solid ${ANGLE_COLORS[sq.angle]}`,
                                    padding: 12,
                                    marginBottom: 10,
                                    background: '#FFFFFF',
                                }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <textarea
                                            value={sq.question}
                                            onChange={e => updateSubQuestion(sq.id, { question: e.target.value })}
                                            rows={2}
                                            disabled={isRunning}
                                            style={{
                                                flex: 1, padding: 8, border: '1px solid #E0E0E0', borderRadius: 2,
                                                fontFamily: 'Archivo, sans-serif', fontSize: 13, resize: 'vertical',
                                            }}
                                            placeholder="Sub-question..."
                                        />
                                        <button
                                            onClick={() => removeSubQuestion(sq.id)}
                                            disabled={isRunning}
                                            aria-label="Remove sub-question"
                                            style={{
                                                background: 'transparent', border: '1px solid #CC6644',
                                                color: '#CC6644', cursor: isRunning ? 'default' : 'pointer',
                                                width: 32, height: 32, fontSize: 14, borderRadius: 2,
                                            }}
                                        >{String.fromCharCode(0x00D7)}</button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                                        <label>
                                            ANGLE&nbsp;
                                            <select
                                                value={sq.angle}
                                                onChange={e => updateSubQuestion(sq.id, { angle: e.target.value as SubQuestion['angle'] })}
                                                disabled={isRunning}
                                                style={{ padding: 4, fontFamily: 'inherit', fontSize: 10 }}
                                            >
                                                {Object.keys(ANGLE_LABELS).map(a => (
                                                    <option key={a} value={a}>{ANGLE_LABELS[a as SubQuestion['angle']]}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            PRIORITY&nbsp;
                                            <select
                                                value={sq.priority}
                                                onChange={e => updateSubQuestion(sq.id, { priority: e.target.value as SubQuestion['priority'] })}
                                                disabled={isRunning}
                                                style={{ padding: 4, fontFamily: 'inherit', fontSize: 10 }}
                                            >
                                                <option value="high">HIGH</option>
                                                <option value="medium">MEDIUM</option>
                                                <option value="low">LOW</option>
                                            </select>
                                        </label>
                                        <span style={{ color: '#888' }}>
                                            Evidence types: {sq.expected_evidence_types.join(', ') || '(none)'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addSubQuestion}
                                disabled={isRunning}
                                style={{
                                    marginTop: 8, padding: '8px 16px',
                                    background: '#FAFAF7', border: '1px dashed #888',
                                    color: '#0D0D0D', cursor: isRunning ? 'default' : 'pointer',
                                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: 1.5,
                                }}
                            >+ ADD SUB-QUESTION</button>
                        </div>
                    )}

                    {activeTab === 'sources' && (
                        <div>
                            <div style={{ marginBottom: 14, fontSize: 11, color: '#525252', fontFamily: "'JetBrains Mono', monospace" }}>
                                Connector families wired to each sub-question. Edit expected yield based on prior engagements.
                            </div>
                            {edited.source_strategy.map((src, idx) => (
                                <div key={idx} style={{
                                    border: '1px solid #E0E0E0', padding: 12, marginBottom: 8,
                                    display: 'flex', gap: 12, alignItems: 'center', background: '#FFFFFF',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1 }}>{src.source_id}</div>
                                        <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>{src.rationale}</div>
                                        <div style={{ fontSize: 10, color: '#888', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                                            → {src.sub_question_ids.join(', ')}
                                        </div>
                                    </div>
                                    <label style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                                        EXPECTED YIELD&nbsp;
                                        <input
                                            type="number"
                                            min={0}
                                            max={200}
                                            value={src.expected_yield}
                                            onChange={e => updateSourceStrategy(idx, { expected_yield: parseInt(e.target.value, 10) || 0 })}
                                            disabled={isRunning}
                                            style={{ width: 60, padding: 4, fontFamily: 'inherit', fontSize: 10 }}
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'budget' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Budget cap (USD)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        step={1}
                                        value={edited.budget_usd}
                                        onChange={e => setEdited(prev => ({ ...prev, budget_usd: parseFloat(e.target.value) || 5 }))}
                                        disabled={isRunning}
                                        style={{ width: '100%', padding: 10, border: '1px solid #0D0D0D', fontSize: 18, fontFamily: 'inherit' }}
                                    />
                                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Hard ceiling. The runner aborts when spend exceeds this.</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Max iterations
                                    </label>
                                    <input
                                        type="number"
                                        min={3}
                                        max={10}
                                        step={1}
                                        value={edited.max_iterations}
                                        onChange={e => setEdited(prev => ({ ...prev, max_iterations: parseInt(e.target.value, 10) || 6 }))}
                                        disabled={isRunning}
                                        style={{ width: '100%', padding: 10, border: '1px solid #0D0D0D', fontSize: 18, fontFamily: 'inherit' }}
                                    />
                                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Reflector loop max. Lower for tighter scope.</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Reflection threshold ({(edited.reflection_threshold * 100).toFixed(0)}%)
                                    </label>
                                    <input
                                        type="range"
                                        min={0.5}
                                        max={0.95}
                                        step={0.05}
                                        value={edited.reflection_threshold}
                                        onChange={e => setEdited(prev => ({ ...prev, reflection_threshold: parseFloat(e.target.value) }))}
                                        disabled={isRunning}
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Coverage % at which reflector exits early.</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Expected themes
                                    </label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={50}
                                        step={1}
                                        value={edited.expected_themes_count}
                                        onChange={e => setEdited(prev => ({ ...prev, expected_themes_count: parseInt(e.target.value, 10) || 12 }))}
                                        disabled={isRunning}
                                        style={{ width: '100%', padding: 10, border: '1px solid #0D0D0D', fontSize: 18, fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>
                            {edited.named_institutions.length > 0 && (
                                <div style={{ marginTop: 18 }}>
                                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Named institutions
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {edited.named_institutions.map((inst, i) => (
                                            <span key={i} style={{
                                                background: '#0D0D0D', color: '#B8B800',
                                                padding: '4px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                                            }}>{inst}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #E0E0E0',
                    background: '#FAFAF7',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 22px',
                            background: 'transparent', border: '1px solid #0D0D0D',
                            color: '#0D0D0D', cursor: 'pointer',
                            fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
                        }}
                    >Cancel</button>
                    <button
                        onClick={() => onApprove(edited)}
                        disabled={!canApprove}
                        style={{
                            padding: '10px 22px',
                            background: canApprove ? '#B8B800' : '#CCC',
                            border: 'none',
                            color: '#0D0D0D', cursor: canApprove ? 'pointer' : 'default',
                            fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
                        }}
                    >{isRunning ? 'Running...' : `Approve + Run (${edited.sub_questions.length} questions)`}</button>
                </div>
            </div>
        </div>
    );
};

export default ResearchPlanEditor;
