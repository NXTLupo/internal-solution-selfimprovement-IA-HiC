/**
 * Chat prose scrub (2026-10-20, root-cause audit live verification): the slide renderer relabels internal source
 * labels and strips em dashes, but a plain-prose chat reply had neither, so answers cited "HiC Theme Synthesis:
 * Theme Synthesis (45 themes)" and "Client Uploads" as sources and let an em dash through inside a citation label.
 * Runs on the prose OUTSIDE slide fences only; fenced slide JSON is handled by the slide pipeline.
 */
import { stripEmDashes } from './slidePostProcessor';

const FENCE_RE = /:::slide[\s\S]*?\n:::\s*$/gm;

export function relabelInternalSourcesInProse(text: string): string {
    return String(text || '')
        // Model-written research prose and its roll-up labels are not sources (live: "(Source: gemini (focused
        // research))", "(Source: Synthesis of Zoomsphere, Finalroundai, Bluelinesearch +10 more)").
        .replace(/\(\s*Source:\s*(?:gemini|gpt[-\w.]*|claude[-\w.]*|openai|deepseek)\s*\((?:focused|deep|web)\s+research\)\s*\)/gi, '(engagement research synthesis)')
        .replace(/\(\s*Source:\s*Synthesis of [^)]*\)/gi, '(engagement research synthesis)')
        // Backtick-wrapped identifiers are chat chrome, never prose ("`aws_ml_blog`", "`1oetdeb`").
        .replace(/`([^`\n]{1,60})`/g, '$1')
        // Process openers: the reader never sees the corpus being surveyed.
        .replace(/\b(?:is|are) (?:extensively|well|widely) documented across the (?:research )?corpus\b/gi, 'appears across several sources')
        .replace(/(?:^|\n|(?<=[.!?])\s+)Below is (?:a|the) (?:structured )?(?:breakdown|summary|overview)[^.\n]*\.?\s*/gi, '\n')
        // "(Source: HiC Theme Synthesis: Theme Synthesis (45 themes) ...)" and bare "HiC Theme Synthesis"
        .replace(/\(\s*(?:Source:\s*)?(?:HiC\s+)?Theme\s+Synthesis\s*(?::[^()]*)?\(\d+\s+themes?\)[^)]*\)?\)?/gi, '(engagement research synthesis)')
        .replace(/\bHiC\s+Theme\s+Synthesis\b(?:\s*:\s*[^;,.)\n]*)?/gi, 'engagement research synthesis')
        .replace(/\bTopic\s+cluster:\s*[^;,.)\]\n]*/gi, 'engagement research synthesis')
        // The upload bucket is not a source name; the document is.
        .replace(/\bClient\s+Uploads?\s*:\s*/gi, 'Client document: ')
        .replace(/\(\s*Source:\s*Client\s+Uploads?\s*\)/gi, '(Source: client document)')
        .replace(/\bClient\s+Uploads\b/g, 'client document');
}

/** Relabel internal sources and strip em dashes in every non-fenced segment of a reply. */
export function scrubChatProse(text: string): string {
    const s = String(text || '');
    if (!s) return s;
    const fences: string[] = [];
    const withMarkers = s.replace(FENCE_RE, m => { fences.push(m); return `\u0000FENCE${fences.length - 1}\u0000`; });
    const scrubbed = stripEmDashes(relabelInternalSourcesInProse(withMarkers));
    return scrubbed.replace(/\u0000FENCE(\d+)\u0000/g, (_m, i) => fences[Number(i)]);
}
