/**
 * E1.2 (2026-08-21). THE INLINE CITATION CHIP.
 *
 * The 2026-08-21 verification run found that a researcher could not reach the evidence
 * behind a claim: theme cards printed raw `[articles/x.md#c1]` as body text while the
 * card's own wiki control stayed hidden. The immediate fix stripped the pointer from
 * card prose and routed it to the quote's control, which removed the machine text but
 * left a gap: prose sentences no longer say which passage they came from.
 *
 * This is the missing piece. A small chip sits where the citation was, carries the chunk
 * number rather than a file path, and opens the passage on click. The reader sees a
 * citation; nobody sees an address.
 *
 * Colors and spacing come from design-system tokens, per the never-hardcoded rule.
 */
import React from 'react';
import { splitProseWithPointers, prettifyPagePath } from '../services/citationPointerRegistry';

export interface CiteChipProps {
    pointer: string;
    wikiPath: string | null;
    onOpen: (wikiPath: string, pointer: string) => void;
}

/** The chunk label, e.g. `c1`. Never the path: that is the thing we stopped showing. */
const chunkLabel = (pointer: string): string => {
    const m = /#(c\d+)$/i.exec(pointer);
    return m ? m[1] : 'src';
};

export const CiteChip: React.FC<CiteChipProps> = ({ pointer, wikiPath, onOpen }) => {
    // Without a page to open, a chip would be a control that does nothing. Render the
    // label as plain text instead of offering a dead affordance.
    if (!wikiPath) {
        return (
            <sup style={{
                fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                fontSize: 9, color: 'var(--text-tertiary, #737373)', marginLeft: 2,
            }}>{chunkLabel(pointer)}</sup>
        );
    }
    const title = prettifyPagePath(wikiPath) || wikiPath;
    return (
        <sup>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpen(wikiPath, pointer); }}
                title={`Open source: ${title}`}
                aria-label={`Open the cited passage in ${title}`}
                style={{
                    fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                    fontSize: 9,
                    lineHeight: 1,
                    padding: '1px 3px',
                    marginLeft: 2,
                    border: '1px solid var(--border-secondary, #D4D4D4)',
                    borderRadius: 2,
                    background: 'var(--bg-primary, #FFFFFF)',
                    color: 'var(--nxt-teal, #115054)',
                    cursor: 'pointer',
                    verticalAlign: 'super',
                }}
            >{chunkLabel(pointer)}</button>
        </sup>
    );
};

export interface CitedProseProps {
    text: string;
    onOpenWiki: (wikiPath: string, pointer?: string) => void;
    style?: React.CSSProperties;
    className?: string;
}

/**
 * Prose with its citations rendered as chips in place. Use this anywhere a card or a
 * panel shows model-authored prose that may carry pointers, so the sentence stays clean
 * and the source stays reachable from that exact sentence.
 */
export const CitedProse: React.FC<CitedProseProps> = ({ text, onOpenWiki, style, className }) => {
    const segments = React.useMemo(() => splitProseWithPointers(text), [text]);
    return (
        <p style={style} className={className}>
            {segments.map((seg, i) => seg.kind === 'text'
                ? <React.Fragment key={i}>{seg.value}</React.Fragment>
                : <CiteChip key={i} pointer={seg.pointer} wikiPath={seg.wikiPath} onOpen={onOpenWiki} />)}
        </p>
    );
};
