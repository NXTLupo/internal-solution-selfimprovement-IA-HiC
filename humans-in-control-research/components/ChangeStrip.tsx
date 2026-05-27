/**
 * ChangeStrip — Session-header surface that tells users what improved
 * since their last session.
 *
 * Sources data from:
 *   - /api/skill/list-versions (skill version bumps with last_improved >= since)
 *   - wiki/synthesis/learned-constraints.md (constraint additions)
 *   - wiki/anti-patterns/* (recent AP-LEARNED entries)
 *   - wiki/frameworks/_pending/* (pending framework updates)
 *   - wiki/synthesis/lint-<latest>.md (most recent lint summary)
 *
 * Dismissible per session. Created 2026-05-22 as part of Phase 6.
 */

import React, { useEffect, useState } from 'react';
import { getRecentImprovements } from '../services/learningEngine';

const PROXY_BASE = 'http://127.0.0.1:5012';
const STORAGE_KEY = 'hic_change_strip_last_seen';

interface ChangeData {
    sinceISO: string;
    skillsBumped: Array<{ name: string; version: string; date: string }>;
    constraintsAdded: number;
    frameworkUpdatesPending: number;
    antiPatternsAdded: Array<{ type: string; name: string; date: string }>;
    latestLintFindings: number | null;
    latestLintDate: string | null;
}

async function loadLatestLintSummary(): Promise<{ findings: number; date: string } | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/synthesis`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const lintFiles = (data.files || []).filter((f: string) => /^lint-\d{4}-\d{2}-\d{2}\.md$/.test(f));
        if (lintFiles.length === 0) return null;
        lintFiles.sort();
        const latest = lintFiles[lintFiles.length - 1];
        const dateMatch = latest.match(/lint-(\d{4}-\d{2}-\d{2})\.md/);
        const date = dateMatch ? dateMatch[1] : '';
        const fileResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/${latest}`);
        if (!fileResp.ok) return { findings: 0, date };
        const fileData = await fileResp.json();
        const m = (fileData.content || '').match(/total_findings:\s*(\d+)/);
        const findings = m ? parseInt(m[1], 10) : 0;
        return { findings, date };
    } catch {
        return null;
    }
}

export const ChangeStrip: React.FC = () => {
    const [data, setData] = useState<ChangeData | null>(null);
    const [dismissed, setDismissed] = useState<boolean>(false);

    useEffect(() => {
        // Read last-seen timestamp from localStorage; default 14 days ago
        const lastSeenRaw = localStorage.getItem(STORAGE_KEY);
        const sinceISO = lastSeenRaw || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        (async () => {
            const improvements = await getRecentImprovements(sinceISO);
            const lint = await loadLatestLintSummary();
            setData({
                sinceISO,
                skillsBumped: improvements.skillsBumped,
                constraintsAdded: improvements.constraintsAdded,
                frameworkUpdatesPending: improvements.frameworkUpdatesPending,
                antiPatternsAdded: improvements.antiPatternsAdded,
                latestLintFindings: lint?.findings ?? null,
                latestLintDate: lint?.date ?? null,
            });
        })();
    }, []);

    if (dismissed || !data) return null;

    // Don't render if there's literally nothing to report
    const totalCount =
        data.skillsBumped.length +
        data.antiPatternsAdded.length +
        (data.constraintsAdded > 0 ? 1 : 0) +
        (data.frameworkUpdatesPending > 0 ? 1 : 0) +
        (data.latestLintFindings !== null ? 1 : 0);
    if (totalCount === 0) return null;

    const sinceLabel = formatSince(data.sinceISO);

    return (
        <div style={styles.container} data-testid="change-strip">
            <div style={styles.header}>
                <span style={styles.title}>Since your last session ({sinceLabel}):</span>
                <button
                    style={styles.dismissBtn}
                    onClick={() => {
                        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
                        setDismissed(true);
                    }}
                    aria-label="Dismiss"
                >
                    Dismiss
                </button>
            </div>
            <div style={styles.body}>
                {data.skillsBumped.length > 0 && (
                    <div style={styles.row}>
                        <span style={styles.chip}>
                            {data.skillsBumped.length} skill version{data.skillsBumped.length === 1 ? '' : 's'} improved
                        </span>
                        <span style={styles.detail}>
                            {data.skillsBumped.slice(0, 5).map(s => `${s.name} -> v${s.version}`).join(', ')}
                            {data.skillsBumped.length > 5 && ` +${data.skillsBumped.length - 5} more`}
                        </span>
                    </div>
                )}
                {data.antiPatternsAdded.length > 0 && (
                    <div style={styles.row}>
                        <span style={styles.chip}>
                            {data.antiPatternsAdded.length} new anti-pattern{data.antiPatternsAdded.length === 1 ? '' : 's'}
                        </span>
                    </div>
                )}
                {data.constraintsAdded > 0 && (
                    <div style={styles.row}>
                        <span style={styles.chip}>
                            {data.constraintsAdded} constraint{data.constraintsAdded === 1 ? '' : 's'} active
                        </span>
                    </div>
                )}
                {data.frameworkUpdatesPending > 0 && (
                    <div style={styles.row}>
                        <span style={{ ...styles.chip, ...styles.chipReview }}>
                            {data.frameworkUpdatesPending} framework update{data.frameworkUpdatesPending === 1 ? '' : 's'} awaiting your review
                        </span>
                    </div>
                )}
                {data.latestLintFindings !== null && data.latestLintDate && (
                    <div style={styles.row}>
                        <span style={styles.chipMuted}>
                            Last lint ({data.latestLintDate}): {data.latestLintFindings} findings
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

function formatSince(iso: string): string {
    try {
        const d = new Date(iso);
        const diffMs = Date.now() - d.getTime();
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 30) return `${days} days ago`;
        const months = Math.floor(days / 30);
        return `${months} month${months === 1 ? '' : 's'} ago`;
    } catch {
        return 'recently';
    }
}

const NXT = {
    teal: '#115054',
    cyan: '#00B7C3',
    chartreuse: '#B8B800',
    rust: '#CC6644',
    border: '#E0E0E0',
    text: '#333333',
    muted: '#666666',
    bg: '#FAFAFA',
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '8px 16px',
        background: NXT.bg,
        borderBottom: `1px solid ${NXT.border}`,
        borderLeft: `3px solid ${NXT.cyan}`,
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
        fontSize: 12,
        color: NXT.text,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Bebas Neue, Oswald, sans-serif',
        fontSize: 13,
        color: NXT.teal,
        letterSpacing: 0.8,
    },
    dismissBtn: {
        background: 'transparent',
        border: 'none',
        color: NXT.muted,
        fontSize: 10,
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: 'JetBrains Mono, monospace',
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    row: {
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        flexWrap: 'wrap',
    },
    chip: {
        background: NXT.chartreuse,
        color: '#0D0D0D',
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        fontFamily: 'JetBrains Mono, monospace',
    },
    chipReview: {
        background: NXT.rust,
        color: '#FFFFFF',
    },
    chipMuted: {
        background: 'transparent',
        color: NXT.muted,
        padding: '1px 0',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: 0.3,
    },
    detail: {
        fontSize: 11,
        color: NXT.muted,
        fontFamily: 'JetBrains Mono, monospace',
    },
};

export default ChangeStrip;
