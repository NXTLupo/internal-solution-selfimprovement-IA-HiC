/**
 * HeuristicReportView - Interactive display for UX heuristic analysis results
 * Three-layer progressive disclosure: Executive Summary -> Dimension Breakdown -> Raw Data
 */

import React, { useState } from 'react';
import { HeuristicReport, HeuristicFinding, HeuristicDimensionId, HEURISTIC_DIMENSION_LABELS, SeverityScore } from '../types';
import { exportHTML, exportJSON } from '../services/resultExports';
import { orderFindingsForScreen } from '../services/auditCritiqueDeck';

interface Props {
    report: HeuristicReport;
    screenshots: string[]; // base64 data URIs for thumbnail display
    onReset: () => void;
}

const SEVERITY_COLORS: Record<SeverityScore, string> = {
    0: '#0CCE6B',
    1: '#caca20',
    2: '#fd8e2e',
    3: '#FF5A5A',
    4: '#991B1B',
};

const SEVERITY_LABELS: Record<SeverityScore, string> = {
    0: 'None',
    1: 'Cosmetic',
    2: 'Minor',
    3: 'Major',
    4: 'Catastrophe',
};

const CONFIDENCE_COLORS: Record<string, string> = {
    HIGH: '#0CCE6B',
    MEDIUM: '#fd8e2e',
    LOW: '#FF5A5A',
};

const HeuristicReportView: React.FC<Props> = ({ report, screenshots, onReset }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'screens' | 'dimensions' | 'data'>('summary');
    const [expandedDimension, setExpandedDimension] = useState<HeuristicDimensionId | null>(null);
    const [severityFilter, setSeverityFilter] = useState<SeverityScore | null>(null);
    const [lightboxImage, setLightboxImage] = useState<number | null>(null);

    const { executiveSummary, findings, dimensions } = report;

    const filteredFindings = severityFilter !== null
        ? findings.filter(f => f.severity === severityFilter)
        : findings;

    const handleExportHTML = () => {
        const sections = [
            {
                heading: 'Executive Summary',
                content: `
                    <p>${executiveSummary.summary}</p>
                    <table>
                        <tr><th>Overall Score</th><th>Total Findings</th><th>Critical (3+4)</th></tr>
                        <tr><td>${executiveSummary.overallScore}/100</td><td>${executiveSummary.totalFindings}</td><td>${(executiveSummary.severityDistribution[3] || 0) + (executiveSummary.severityDistribution[4] || 0)}</td></tr>
                    </table>
                `,
            },
            ...report.dimensions.map(d => ({
                heading: HEURISTIC_DIMENSION_LABELS[d.dimension],
                content: `
                    <p>Average Severity: ${d.averageSeverity} | Findings: ${d.findingCount} | Critical: ${d.criticalCount}</p>
                    <table>
                        <tr><th>Severity</th><th>Confidence</th><th>Title</th><th>Description</th><th>Recommendation</th><th>Screenshots</th></tr>
                        ${findings.filter(f => f.dimension === d.dimension).map(f => `
                            <tr>
                                <td><span class="badge badge-${f.severity >= 3 ? 'high' : f.severity >= 2 ? 'medium' : 'low'}">${SEVERITY_LABELS[f.severity as SeverityScore]}</span></td>
                                <td>${f.confidence}</td>
                                <td><strong>${f.title}</strong></td>
                                <td>${f.description}</td>
                                <td>${f.recommendation}</td>
                                <td>${f.screenshotRefs.join(', ')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `,
            })),
        ];
        exportHTML(`UX Heuristic Analysis: ${report.brief.productName}`, sections, report);
    };

    const handleExportJSON = () => {
        exportJSON(report as any);
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--nxt-teal)]">
                        UX Heuristic Report: {report.brief.productName}
                    </h2>
                    <span className="text-xs text-[var(--text-tertiary)]">
                        {report.screenshotCount} screenshots | {report.modelUsed}
                    </span>
                </div>
                <div className="flex gap-2">
                    {/* Tab Switcher */}
                    {(['summary', 'screens', 'dimensions', 'data'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all ${
                                activeTab === tab
                                    ? 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)]'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {tab === 'summary' ? 'Executive Summary' : tab === 'screens' ? 'By Screen' : tab === 'dimensions' ? 'Dimensions' : 'Raw Data'}
                        </button>
                    ))}
                    <div className="w-px bg-[var(--border-primary)] mx-1"></div>
                    <button onClick={handleExportHTML} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)]">HTML</button>
                    <button onClick={handleExportJSON} className="bg-white border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)]">JSON</button>
                    <button onClick={onReset} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] px-3 py-2 rounded text-xs font-bold uppercase tracking-wide">New</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-5xl mx-auto">

                    {/* === EXECUTIVE SUMMARY TAB === */}
                    {activeTab === 'summary' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Score Card */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 text-center">
                                    <div className="text-4xl font-extralight text-[var(--nxt-teal)]">{executiveSummary.overallScore}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-2">Overall Score</div>
                                </div>
                                <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 text-center">
                                    <div className="text-4xl font-extralight">{executiveSummary.totalFindings}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-2">Total Findings</div>
                                </div>
                                <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 text-center">
                                    <div className="text-4xl font-extralight text-[#FF5A5A]">{(executiveSummary.severityDistribution[3] || 0) + (executiveSummary.severityDistribution[4] || 0)}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-2">Critical Issues</div>
                                </div>
                                <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6 text-center">
                                    <div className="text-4xl font-extralight">{report.dimensions.length}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-2">Dimensions</div>
                                </div>
                            </div>

                            {/* Severity Distribution Bar */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Severity Distribution</h3>
                                <div className="flex h-8 rounded overflow-hidden">
                                    {([0, 1, 2, 3, 4] as SeverityScore[]).map(s => {
                                        const count = executiveSummary.severityDistribution[s] || 0;
                                        const pct = executiveSummary.totalFindings > 0 ? (count / executiveSummary.totalFindings) * 100 : 0;
                                        return pct > 0 ? (
                                            <div
                                                key={s}
                                                style={{ width: `${pct}%`, backgroundColor: SEVERITY_COLORS[s] }}
                                                className="flex items-center justify-center text-white text-xs font-bold"
                                                title={`${SEVERITY_LABELS[s]}: ${count}`}
                                            >
                                                {count}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <div className="flex gap-4 mt-3">
                                    {([0, 1, 2, 3, 4] as SeverityScore[]).map(s => (
                                        <div key={s} className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEVERITY_COLORS[s] }}></div>
                                            {SEVERITY_LABELS[s]} ({executiveSummary.severityDistribution[s] || 0})
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Executive Summary Text */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Summary</h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed">{executiveSummary.summary}</p>
                            </div>

                            {/* Top 5 Issues */}
                            <div className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded p-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Top 5 Critical Issues</h3>
                                <div className="space-y-3">
                                    {(executiveSummary.topIssues || []).slice(0, 5).map((issue, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
                                            <div
                                                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ backgroundColor: SEVERITY_COLORS[issue.severity as SeverityScore] }}
                                            >
                                                {issue.severity}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{issue.title}</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-1">{issue.description}</div>
                                                <div className="text-xs text-[var(--nxt-teal)] mt-1">{issue.recommendation}</div>
                                            </div>
                                            <div className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
                                                {issue.screenshotRefs?.map(r => `#${r}`).join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === BY SCREEN TAB (2026-07-08 critique elevation) ===
                        Findings grouped by their PRIMARY screen with per-screen numbering that
                        matches the numbered callout discs on the critique deck slides, headed
                        by the vision pass's plain-English per-screen verdict. */}
                    {activeTab === 'screens' && (
                        <div className="space-y-6 animate-fade-in">
                            {screenshots.map((shot, idx) => {
                                const ref = idx + 1;
                                // Same reading-order numbering authority as the critique deck's
                                // baked discs (auditCritiqueDeck.orderFindingsForScreen).
                                const mine = orderFindingsForScreen(report, ref);
                                const verdict = report.screenSummaries?.find(s => s.screenshot === ref)?.verdict;
                                if (mine.length === 0) return null;
                                return (
                                    <div key={ref} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded overflow-hidden">
                                        <div className="p-4 border-b border-[var(--border-primary)]">
                                            <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Screen {String(ref).padStart(2, '0')}</div>
                                            {verdict && <div className="font-bold mt-1">{verdict}</div>}
                                        </div>
                                        <div className="flex gap-4 p-4">
                                            <button onClick={() => setLightboxImage(idx)} className="flex-shrink-0 w-56 border border-[var(--border-primary)] rounded overflow-hidden self-start hover:border-[var(--nxt-lime)] transition-colors">
                                                <img src={shot} alt={`Screen ${ref}`} className="w-full h-auto block" />
                                            </button>
                                            <div className="flex-1 space-y-3 min-w-0">
                                                {mine.map((f, i) => (
                                                    <div key={f.id || i} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded">
                                                        <div className="w-7 h-7 rounded-full bg-[var(--nxt-lime)] text-[var(--nxt-teal)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                            {String(i + 1).padStart(2, '0')}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm">{f.title}</span>
                                                                <span className="px-1.5 py-0.5 rounded-sm text-white text-[10px] font-bold" style={{ backgroundColor: SEVERITY_COLORS[f.severity as SeverityScore] }}>
                                                                    {SEVERITY_LABELS[f.severity as SeverityScore]}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-[var(--text-secondary)] mt-1">{f.description}</div>
                                                            <div className="text-xs text-[var(--nxt-teal)] mt-1">{f.recommendation}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* === DIMENSIONS TAB === */}
                    {activeTab === 'dimensions' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Severity Filter */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setSeverityFilter(null)}
                                    className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border ${severityFilter === null ? 'bg-[var(--nxt-teal)] text-white border-[var(--nxt-teal)]' : 'bg-white border-[var(--border-primary)] text-[var(--text-tertiary)]'}`}
                                >
                                    All ({findings.length})
                                </button>
                                {([4, 3, 2, 1] as SeverityScore[]).map(s => {
                                    const count = findings.filter(f => f.severity === s).length;
                                    return count > 0 ? (
                                        <button
                                            key={s}
                                            onClick={() => setSeverityFilter(s)}
                                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border ${severityFilter === s ? 'text-white' : 'bg-white text-[var(--text-tertiary)]'}`}
                                            style={severityFilter === s ? { backgroundColor: SEVERITY_COLORS[s], borderColor: SEVERITY_COLORS[s] } : { borderColor: '#e5e5e5' }}
                                        >
                                            {SEVERITY_LABELS[s]} ({count})
                                        </button>
                                    ) : null;
                                })}
                            </div>

                            {/* Dimension Accordions */}
                            {report.dimensions.map(dim => {
                                const dimFindings = filteredFindings.filter(f => f.dimension === dim.dimension);
                                if (dimFindings.length === 0 && severityFilter !== null) return null;
                                const isExpanded = expandedDimension === dim.dimension;

                                return (
                                    <div key={dim.dimension} className="bg-[var(--card-bg)] border border-[var(--border-primary)] rounded overflow-hidden">
                                        <button
                                            onClick={() => setExpandedDimension(isExpanded ? null : dim.dimension)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-bold">{HEURISTIC_DIMENSION_LABELS[dim.dimension]}</div>
                                                <div className="flex gap-1">
                                                    <span className="tag">{dim.findingCount} findings</span>
                                                    {dim.criticalCount > 0 && (
                                                        <span className="px-2 py-0.5 bg-[#FF5A5A] text-white text-xs font-bold rounded-sm">{dim.criticalCount} critical</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs text-[var(--text-tertiary)]">Avg: {dim.averageSeverity}</div>
                                                <span className="text-[var(--text-tertiary)]">{isExpanded ? '-' : '+'}</span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-[var(--border-primary)] p-4 space-y-3">
                                                {dimFindings.map((f, fi) => (
                                                    <div key={fi} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded">
                                                        <div
                                                            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                            style={{ backgroundColor: SEVERITY_COLORS[f.severity as SeverityScore] }}
                                                        >
                                                            {f.severity}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm">{f.title}</span>
                                                                {f.subcategory && <span className="tag">{f.subcategory}</span>}
                                                                <span className="text-xs font-bold" style={{ color: CONFIDENCE_COLORS[f.confidence] }}>{f.confidence}</span>
                                                            </div>
                                                            <div className="text-xs text-[var(--text-secondary)] mt-1">{f.description}</div>
                                                            <div className="text-xs text-[var(--nxt-teal)] mt-1">{f.recommendation}</div>
                                                        </div>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                            {f.screenshotRefs?.map(ref => (
                                                                <button
                                                                    key={ref}
                                                                    onClick={() => setLightboxImage(ref - 1)}
                                                                    className="w-8 h-8 rounded border border-[var(--border-primary)] overflow-hidden hover:border-[var(--nxt-lime)] transition-colors"
                                                                    title={`Screenshot ${ref}`}
                                                                >
                                                                    {screenshots[ref - 1] ? (
                                                                        <img src={screenshots[ref - 1]} alt={`#${ref}`} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-xs">#{ref}</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* === RAW DATA TAB === */}
                    {activeTab === 'data' && (
                        <div className="animate-fade-in">
                            <pre className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-6 overflow-auto text-xs font-mono max-h-[70vh]">
                                {JSON.stringify(report, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>

            {/* Screenshot Lightbox */}
            {lightboxImage !== null && screenshots[lightboxImage] && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img src={screenshots[lightboxImage]} alt={`Screenshot ${lightboxImage + 1}`} className="max-w-full max-h-[85vh] object-contain rounded" />
                        <div className="absolute top-2 right-2 bg-white rounded px-3 py-1 text-xs font-bold">
                            Screenshot {lightboxImage + 1} of {screenshots.length}
                        </div>
                        <div className="flex justify-center gap-2 mt-4">
                            {lightboxImage > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setLightboxImage(lightboxImage - 1); }} className="bg-white rounded px-4 py-2 text-xs font-bold">Previous</button>
                            )}
                            {lightboxImage < screenshots.length - 1 && (
                                <button onClick={(e) => { e.stopPropagation(); setLightboxImage(lightboxImage + 1); }} className="bg-white rounded px-4 py-2 text-xs font-bold">Next</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeuristicReportView;
