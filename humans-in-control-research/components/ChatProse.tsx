import React from 'react';

// ChatProse - 2026-06-23
// =============================================================================
// Beautifully renders a NON-HASHTAG chat reply (Analyst Desk + Designer Desk,
// gemini-3.5-flash) as STRUCTURED prose instead of an 11px pre-wrap wall of text.
// The chat path used to FLATTEN markdown (cleanResponseText stripped `##`/`**`)
// then dump the result as plain text -> the "ugly slop" the user flagged.
//
// This parses a SAFE markdown subset (no raw HTML, no images, no links beyond the
// caller's citation hook) and renders it with NXT design tokens at readable sizes:
//   - ## / ### headings        -> section heads (Archivo, ink, kicker rule on h2)
//   - - / * bullets            -> clean list, chartreuse marker
//   - 1. 2. ordered lists      -> numbered list, mono numerals
//   - > blockquote             -> teal left-rule callout
//   - **bold** / *italic* / `code`
//   - paragraphs               -> 13px / 1.6, generous rhythm
//   - --- / *** horizontal rule
// Inline text runs are passed through the optional `renderRun` hook so the caller
// keeps its citation links + #proto chips (Analyst Desk) while Designer Desk uses
// the plain-text default.

const T = {
    ink: '#1A1A1A',
    body: '#33332E',
    grey: '#73757A',
    chartreuse: '#B8B800',
    cyan: '#00B7C3',
    teal: '#115054',
    panel: '#F4F1D6',
    hair: '#E4E4DC',
    font: "'Archivo', sans-serif",
    mono: "'IBM Plex Mono', monospace",
};

export interface ChatProseProps {
    text: string;
    /** Render a plain inline text run. Lets the caller inject citation links /
     *  #proto chips. Defaults to the raw string. */
    renderRun?: (text: string, key: string) => React.ReactNode;
    /** Base body font size (px). Default 13. */
    size?: number;
    /** Text color for body copy (user bubbles pass white). Default body ink. */
    color?: string;
    /** When the user asked for an explicit count ("10 steps"), collapse every list item in the
     *  reply into ONE consistently-numbered ordered list - regardless of whether the flaky model
     *  emitted numbers, bullets, or phase-headers. Fixes "the numbers were inconsistently applied". */
    forceOrderedList?: boolean;
}

type Block =
    | { kind: 'h2' | 'h3' | 'p' | 'quote'; text: string }
    | { kind: 'ul'; items: string[] }
    | { kind: 'ol'; items: string[] }
    | { kind: 'hr' };

// --- Markdown normalizer: rebuild block boundaries from INLINE markers -------
// 2026-06-23 - Gemini 3.5 Flash (the non-hashtag chat model) emits Markdown markers
// (## , - , > , N.) WITHOUT the newlines they require, so the whole reply arrives as
// near-one-line text with "## 1. Title body..." and "- **Label:** text" glued inline.
// Relying on the model to emit line breaks failed in testing (a fresh reply came back
// with 2 newlines total). So the renderer must be robust to it: insert the missing
// breaks before block markers, split a header from its trailing body, and promote a
// run of "**Label:** ..." lead-ins into a bullet list. Conservative: only acts on
// strong, unambiguous markers so normal prose is untouched.
export function normalizeMarkdown(src: string): string {
    let t = (src || '').replace(/\r\n/g, '\n');

    // 1. A header marker not already at line start -> break onto its own line (blank line before).
    //    The preceding char must NOT be '#' (else "## " matches its own 2nd hash and splits into
    //    "#" + "# "). NOTE: the model writes "## 1. Title" numbered headers; we keep the "1." in the
    //    header and deliberately do NOT treat inline "N." as an ordered list.
    t = t.replace(/([^\n#])\s*(#{1,4}\s)/g, '$1\n\n$2');

    // 2. Split a header line "## 1. Short Title  <body...>" so the title is the header and the
    //    body drops to the next line. Title ends at the first of: a dash bullet, a bold/italic
    //    lead-in, a sentence/clause end, or ~64 chars (word boundary).
    t = t.replace(/^(#{1,4}\s+)([^\n]+)$/gm, (_full: string, marker: string, restRaw: string) => {
        // Protect a leading "N." / "N)" section number so its period is not read as a sentence end.
        const numM = restRaw.match(/^(\d+[.)]\s+)([\s\S]*)$/);
        const numPrefix = numM ? numM[1] : '';
        const rest = numM ? numM[2] : restRaw;
        // A header is a SHORT label. The model often glues the body sentence onto it with no
        // delimiter ("Standardize data models Releasing AI across colleges with incompatible CRM
        // systems causes failures..."). Find the EARLIEST sensible title boundary:
        //  - a dash bullet / bold / italic lead-in, OR
        //  - a lowercase->Capital word boundary that begins a real sentence (>=5 words follow), OR
        //  - a sentence/clause end (.:!?). Then cap at ~58 chars.
        const llCap = (() => {
            const m = rest.slice(10).match(/[a-z,)]\s+(?=[A-Z][a-z]|[A-Z]{2,})/);
            if (!m || typeof m.index !== 'number') return -1;
            const at = 10 + m.index + 1;
            const wordsAfter = rest.slice(at).trim().split(/\s+/).length;
            return wordsAfter >= 5 ? at : -1;   // only split when a real sentence follows
        })();
        const cuts = [
            rest.search(/\s[-+]\s+\S/),           // a dash bullet begins
            rest.search(/\s\d{1,2}[.)]\s+\S/),    // a NUMBERED list item begins (don't absorb "1." into the title)
            rest.search(/\s\*\*\S/),              // a bold lead-in begins
            rest.search(/\s\*[A-Za-z]/),          // an italic lead-in begins
            llCap,                                 // body sentence starts (lowercase -> Capital)
            (() => { const m = rest.match(/[.:!?]\s/); return m ? m.index! + 1 : -1; })(), // sentence end
        ].filter((i) => i > 2);
        let idx = cuts.length ? Math.min(...cuts) : rest.length;
        if (idx > 58) { const cut = rest.slice(0, 58).lastIndexOf(' '); if (cut > 16) idx = cut; }
        const title = (numPrefix + rest.slice(0, idx)).trim().replace(/[:\s]+$/, '');
        const body = rest.slice(idx).trim();
        return body ? `${marker}${title}\n\n${body}` : `${marker}${title}`;
    });

    // 3. Inline DASH bullet markers -> own line (only '-' / '+', NOT '*' which collides with
    //    italic/bold). Require the marker be followed by a bold lead-in or a Capital letter so
    //    hyphenated words / stray dashes are not split.
    t = t.replace(/([^\n])\s+([-+])\s+(?=\*\*|[A-Z])/g, '$1\n$2 ');

    // 3b. Inline NUMBERED list items "1. ... 2. ... 10. ..." -> own lines, so an explicit
    //     "10 steps" request renders as a real ordered list with CONSISTENT numerals (the user's
    //     "numbers inconsistently applied" bug: the model emitted 1..10 inline, the first number
    //     got absorbed into the heading and the rest were turned into un-numbered bullets). Guard:
    //     the char before the number is NOT '#' (numbered HEADER "## 1.") and NOT a digit (decimals
    //     like "3.5"), and the item starts with a bold lead-in / quote / Capital so prose like
    //     "by 2026. 3 trends" is not mis-split.
    t = t.replace(/([^\n#\d])\s+(\d{1,2}[.)])\s+(?=\*\*|["“]|[A-Z])/g, '$1\n$2 ');

    // 4. Promote a run of bold/italic colon lead-ins ("**Label:** ..." / "*Label:* ...") - the
    //    model's bullets when it omits the dash - into real bullets, ONLY when 2+ appear. Uses
    //    sentinels so the single-star italic pattern can never match INSIDE a double-star bold
    //    (that bug produced "- *Label**" garbage). Per block (blank-line separated).
    const B = '', I = '', E = '';
    t = t.split(/\n{2,}/).map((blk) => {
        // Already structured (header / dash bullet / blockquote / NUMBERED list) -> never convert
        // a numbered list into bold bullets (that dropped the 1..10 numbering).
        if (/^\s*(#{1,4}\s|[-+]\s|>\s|\d{1,2}[.)]\s)/.test(blk.trim())) return blk;
        // Mask bold-colon FIRST, then italic-colon - no overlap possible after masking.
        let work = blk.replace(/\*\*([^*\n]+?):\*\*/g, `${B}$1${E}`);
        work = work.replace(/(^|[^*])\*([^*\n]+?):\*(?!\*)/g, `$1${I}$2${E}`);
        const leadCount = (work.match(new RegExp(`[${B}${I}]`, 'g')) || []).length;
        if (leadCount < 2) return blk; // not a lead-in run; leave verbatim
        const parts = work.split(new RegExp(`(?=[${B}${I}])`, 'g')).map(s => s.trim()).filter(Boolean);
        const restore = (s: string) => s
            .replace(new RegExp(`${B}([^${E}]+)${E}`, 'g'), '**$1:**')
            .replace(new RegExp(`${I}([^${E}]+)${E}`, 'g'), '*$1:*');
        const out = parts.map(p => (p[0] === B || p[0] === I) ? `- ${restore(p)}` : restore(p));
        return out.join('\n');
    }).join('\n\n');

    // 5. Inline blockquote marker -> own line.
    t = t.replace(/([^\n])\s+>\s+(?=["“\w])/g, '$1\n\n> ');

    return t.replace(/\n{3,}/g, '\n\n').trim();
}

// --- Block parser: group lines into structural blocks ----------------------
export function parseBlocks(src: string): Block[] {
    const lines = normalizeMarkdown(src).split('\n');
    const blocks: Block[] = [];
    let para: string[] = [];
    const flushPara = () => {
        if (para.length) { blocks.push({ kind: 'p', text: para.join(' ').trim() }); para = []; }
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();
        if (!t) { flushPara(); continue; }
        // horizontal rule
        if (/^([-*_])\1{2,}$/.test(t)) { flushPara(); blocks.push({ kind: 'hr' }); continue; }
        // headings
        const h = t.match(/^(#{2,4})\s+(.*)$/);
        if (h) { flushPara(); blocks.push({ kind: h[1].length <= 2 ? 'h2' : 'h3', text: h[2].trim() }); continue; }
        // single leading # heading (treat as h2) - models sometimes use one
        const h1 = t.match(/^#\s+(.*)$/);
        if (h1) { flushPara(); blocks.push({ kind: 'h2', text: h1[1].trim() }); continue; }
        // bold-only line acting as a heading: **Section title** on its own line
        const boldHead = t.match(/^\*\*(.+)\*\*:?$/);
        if (boldHead && boldHead[1].length <= 60) { flushPara(); blocks.push({ kind: 'h3', text: boldHead[1].trim() }); continue; }
        // blockquote
        if (/^>\s?/.test(t)) {
            flushPara();
            const q: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i].trim())) { q.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
            i--;
            blocks.push({ kind: 'quote', text: q.join(' ') });
            continue;
        }
        // unordered list
        if (/^[-*+]\s+/.test(t)) {
            flushPara();
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*+]\s+/, '')); i++; }
            i--;
            blocks.push({ kind: 'ul', items });
            continue;
        }
        // ordered list
        if (/^\d+[.)]\s+/.test(t)) {
            flushPara();
            const items: string[] = [];
            while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+[.)]\s+/, '')); i++; }
            i--;
            blocks.push({ kind: 'ol', items });
            continue;
        }
        para.push(t);
    }
    flushPara();
    return blocks;
}

// --- Inline parser: emphasis/code + caller text-run hook -------------------
function renderInline(text: string, keyBase: string, renderRun?: ChatProseProps['renderRun']): React.ReactNode[] {
    // Tokenize **bold**, *italic* / _italic_, `code`; everything else is a plain run.
    const out: React.ReactNode[] = [];
    // No lookbehind (a lookbehind literal SyntaxErrors at module load on older engines
    // and would blank the app). Bold is listed before italic so the engine prefers it.
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
    let last = 0; let m: RegExpExecArray | null; let n = 0;
    const plain = (s: string, k: string) => (renderRun ? renderRun(s, k) : s);
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) out.push(<React.Fragment key={`${keyBase}-t${n++}`}>{plain(text.slice(last, m.index), `${keyBase}-r${n}`)}</React.Fragment>);
        const tok = m[0];
        if (tok.startsWith('**')) out.push(<strong key={`${keyBase}-b${n++}`} style={{ fontWeight: 700, color: T.ink }}>{plain(tok.slice(2, -2), `${keyBase}-br${n}`)}</strong>);
        else if (tok.startsWith('`')) out.push(<code key={`${keyBase}-c${n++}`} style={{ fontFamily: T.mono, fontSize: '0.92em', background: '#EEEEE6', padding: '1px 5px', borderRadius: 2 }}>{tok.slice(1, -1)}</code>);
        else out.push(<em key={`${keyBase}-i${n++}`} style={{ fontStyle: 'italic' }}>{plain(tok.slice(1, -1), `${keyBase}-ir${n}`)}</em>);
        last = m.index + tok.length;
    }
    if (last < text.length) out.push(<React.Fragment key={`${keyBase}-t${n++}`}>{plain(text.slice(last), `${keyBase}-rEnd`)}</React.Fragment>);
    return out;
}

export const ChatProse: React.FC<ChatProseProps> = ({ text, renderRun, size = 13.5, color = T.body, forceOrderedList = false }) => {
    let blocks = React.useMemo(() => parseBlocks(text), [text]);

    // COUNT-CONSISTENCY (forceOrderedList): the user asked for an explicit count ("10 steps"),
    // but the model formats inconsistently run-to-run (sometimes numbered, sometimes bullets,
    // sometimes phase-headers). Collapse EVERY list item in the reply into ONE ordered list so
    // the count is always clear and consistently numbered. Lead paragraph (if any) is kept first.
    if (forceOrderedList) {
        const items: string[] = [];
        for (const b of blocks) if (b.kind === 'ul' || b.kind === 'ol') items.push(...b.items);
        if (items.length >= 2) {
            const lead = blocks.filter(b => b.kind === 'p').slice(0, 1);
            blocks = [...lead, { kind: 'ol', items }];
        }
    }

    const ROW = Math.round(size * 0.5);   // vertical rhythm unit (~7px)
    return (
        <div style={{ fontFamily: T.font, fontSize: size, lineHeight: 1.62, color }}>
            {blocks.map((b, i) => {
                const key = `b${i}`;
                const first = i === 0;
                switch (b.kind) {
                    case 'h2':
                        return (
                            <div key={key} style={{ margin: `${first ? 0 : ROW * 3}px 0 ${ROW * 1.5}px`, paddingLeft: 11, borderLeft: `3px solid ${T.chartreuse}` }}>
                                <span style={{ fontSize: size + 3, fontWeight: 700, color: T.ink, lineHeight: 1.3, letterSpacing: '-0.1px' }}>{renderInline(b.text, key, renderRun)}</span>
                            </div>
                        );
                    case 'h3':
                        return (
                            <div key={key} style={{ margin: `${first ? 0 : ROW * 2.2}px 0 ${ROW}px`, fontSize: size + 1, fontWeight: 700, color: T.teal, lineHeight: 1.35 }}>
                                {renderInline(b.text, key, renderRun)}
                            </div>
                        );
                    case 'p':
                        return <p key={key} style={{ margin: `0 0 ${ROW * 1.6}px` }}>{renderInline(b.text, key, renderRun)}</p>;
                    case 'quote':
                        return (
                            <div key={key} style={{ margin: `${ROW * 1.6}px 0`, padding: `${ROW}px ${ROW * 2}px`, borderLeft: `3px solid ${T.cyan}`, background: '#F0FAFB', color: T.body, fontStyle: 'italic', borderRadius: '0 2px 2px 0' }}>
                                {renderInline(b.text, key, renderRun)}
                            </div>
                        );
                    case 'ul':
                        return (
                            <ul key={key} style={{ margin: `${ROW}px 0 ${ROW * 2}px`, paddingLeft: 0, listStyle: 'none' }}>
                                {b.items.map((it, j) => (
                                    <li key={j} style={{ position: 'relative', paddingLeft: 18, margin: `${ROW}px 0`, lineHeight: 1.55 }}>
                                        <span style={{ position: 'absolute', left: 2, top: '0.6em', width: 5, height: 5, background: T.chartreuse, borderRadius: 1 }} />
                                        {renderInline(it, `${key}-${j}`, renderRun)}
                                    </li>
                                ))}
                            </ul>
                        );
                    case 'ol':
                        return (
                            <ol key={key} style={{ margin: `${ROW}px 0 ${ROW * 2}px`, paddingLeft: 0, listStyle: 'none' }}>
                                {b.items.map((it, j) => (
                                    <li key={j} style={{ position: 'relative', paddingLeft: 28, margin: `${ROW * 1.2}px 0`, lineHeight: 1.55 }}>
                                        <span style={{ position: 'absolute', left: 0, top: 1, fontFamily: T.mono, fontSize: size - 2.5, fontWeight: 700, color: T.cyan, letterSpacing: '0.5px' }}>{String(j + 1).padStart(2, '0')}</span>
                                        {renderInline(it, `${key}-${j}`, renderRun)}
                                    </li>
                                ))}
                            </ol>
                        );
                    case 'hr':
                        return <div key={key} style={{ height: 1, background: T.hair, margin: `${ROW * 2.5}px 0` }} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default ChatProse;
