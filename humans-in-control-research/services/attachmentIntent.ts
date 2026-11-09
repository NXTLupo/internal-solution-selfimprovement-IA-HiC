/**
 * Attachment intent (2026-10-20, owner directive: "the chat model needs to interpret the hashtags the user
 * supplies, NOT hardcode anything").
 *
 * Live failure: `create a #slides #NXT presentation from the attached deck content` produced "Analyzed 1 chat
 * attachment: 79 feature and feedback items extracted into the engagement ledger". No code read the request;
 * every attachment went through the PRD ledger extractor (reasoning-model calls) and into the engagement corpus.
 *
 * Now the model reads the user's message, hashtags included, together with a glimpse of each attachment, and
 * decides what the attachment is FOR on this turn. Code carries out the decision; it never makes it. A fast
 * model is used because this is a routing decision, not reasoning (owner rule: Flash for speed, Opus for
 * reasoning). When the call fails the attachment still grounds the turn (it is inlined into the prompt) and
 * nothing expensive or permanent happens: no corpus write, no extraction.
 */
import { callAIWithRetry } from './aiRetryClient';

export type AttachmentRole = 'content-source' | 'evidence' | 'requirements-source' | 'reference';

export interface AttachmentIntent {
    /** What the attachment is for on this turn, as the model read the request. */
    role: AttachmentRole;
    /** Write it into the engagement corpus so later turns and deliverables can cite it. */
    persistToCorpus: boolean;
    /** Run the feature / feedback ledger extraction (the #prd scope ledger) on it. */
    extractLedger: boolean;
    /** The request ALSO asks for material beyond the attachment (research, data, proof points, market context, the
     *  corpus, a section the attachment does not hold). A content-source attachment then supplies its own part of the
     *  deliverable and the research corpus grounds the rest; it never switches the corpus off for the whole turn
     *  (2026-10-26 live: "data-backed proof points from the research ... then a Work section with all the attached
     *  slides" was built from the attachment alone). */
    alsoUseResearch: boolean;
    /** One plain sentence for the chat, e.g. "The attached deck is the content for this presentation." */
    note: string;
    /** 'model' when the decision came from the model; 'fallback' when the call failed. */
    decidedBy: 'model' | 'fallback';
}

export interface AttachmentGlimpse {
    name: string;
    type?: string;
    /** The first part of the parsed text; the model needs the shape of the document, not all of it. */
    excerpt: string;
}

export type IntentGen = (prompt: string) => Promise<string>;

const ROLES: AttachmentRole[] = ['content-source', 'evidence', 'requirements-source', 'reference'];

/** The decision the system makes when the model cannot be asked: ground this turn only. */
export const FALLBACK_INTENT: AttachmentIntent = {
    role: 'reference',
    persistToCorpus: false,
    extractLedger: false,
    alsoUseResearch: true,
    note: 'The attachment is used for this reply.',
    decidedBy: 'fallback',
};

export function buildAttachmentIntentPrompt(message: string, attachments: AttachmentGlimpse[], objective: string): string {
    const files = attachments.map((a, i) => `--- ATTACHMENT ${i + 1}: ${a.name}${a.type ? ` (${a.type})` : ''} ---\n${a.excerpt.slice(0, 1800)}`).join('\n');
    return [
        'You read a consultant\'s chat message, including any #hashtag directives it carries, and decide what the attached file is FOR on this turn. The hashtags are the user\'s instruction: #slides / #presentation means make a deck; #prd means write requirements; #personas, #themes, #recs, #journey and the like name other deliverables; a message with no hashtag is a question or a request in plain words.',
        'Return ONLY JSON: {"role": "content-source" | "evidence" | "requirements-source" | "reference", "persistToCorpus": true|false, "extractLedger": true|false, "alsoUseResearch": true|false, "note": "<one plain sentence for the user, under 20 words, no em dash>"}',
        'Meanings:',
        '- content-source: the user wants the attachment\'s own content reshaped or reused (a deck to reformat, a document to turn into slides, text to rewrite). persistToCorpus false unless they also ask to keep it as research; extractLedger false.',
        '- evidence: the attachment is research material the user wants grounding on now and later (client documents, reports, transcripts for the engagement). persistToCorpus true; extractLedger false.',
        '- requirements-source: the user asks for requirements, a PRD, a scope or feedback ledger, or the attachment is a contract, SOW, meeting notes or feedback list they want captured as requirements. persistToCorpus true; extractLedger true.',
        '- reference: the attachment only informs this one reply (a quick question about it). persistToCorpus false; extractLedger false.',
        'alsoUseResearch: true when the message asks for ANYTHING beyond the attachment\'s own content: research, data, statistics, proof points, evidence, market or industry context, a landscape, competitors, trends, "the research", "the corpus", or a section the attachment does not contain. It is false only when the attachment is the whole subject ("reformat the attached deck", "turn this document into slides", "rewrite this"). A content-source attachment with alsoUseResearch true supplies its own section; the research grounds everything else.',
        'Decide from the MESSAGE first; the attachment\'s content only breaks ties. Never choose requirements-source because a document lists features when the message asks for something else.',
        `Engagement objective: ${(objective || '').slice(0, 400) || '(none)'}`,
        `MESSAGE: ${message.slice(0, 1200)}`,
        files,
    ].join('\n');
}

export function parseAttachmentIntent(raw: string): AttachmentIntent | null {
    const m = /\{[\s\S]*\}/.exec(String(raw || ''));
    if (!m) return null;
    let j: any;
    try { j = JSON.parse(m[0]); } catch { return null; }
    const role = ROLES.includes(j?.role) ? (j.role as AttachmentRole) : null;
    if (!role) return null;
    const note = String(j?.note || '').replace(/—/g, ',').trim();
    return {
        role,
        persistToCorpus: typeof j.persistToCorpus === 'boolean' ? j.persistToCorpus : role === 'evidence' || role === 'requirements-source',
        extractLedger: typeof j.extractLedger === 'boolean' ? j.extractLedger : role === 'requirements-source',
        // absent: research stays on for every role but a content source (the earlier reading of a content source)
        alsoUseResearch: typeof j.alsoUseResearch === 'boolean' ? j.alsoUseResearch : role !== 'content-source',
        note: note || defaultNote(role),
        decidedBy: 'model',
    };
}

function defaultNote(role: AttachmentRole): string {
    switch (role) {
        case 'content-source': return 'The attachment is the content for this deliverable.';
        case 'evidence': return 'The attachment is added to the engagement research.';
        case 'requirements-source': return 'The attachment is read for requirements and feedback.';
        default: return 'The attachment is used for this reply.';
    }
}

function flashGen(timeoutMs: number): IntentGen {
    return async (prompt: string) => {
        const data: any = await callAIWithRetry('gemini', {
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0, responseMimeType: 'application/json' },
        }, { label: 'attachment intent', maxAttempts: 1, requestTimeoutMs: timeoutMs });
        return (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
    };
}

/**
 * Ask the model what the attachments are for on this turn. One decision covers the batch: a user sends one
 * request, and the files it carries share its purpose.
 */
export async function interpretAttachmentIntent(opts: {
    message: string;
    attachments: AttachmentGlimpse[];
    objective?: string;
    gen?: IntentGen;
    /** The whole decision must fit in this; the send waits on it. */
    timeoutMs?: number;
}): Promise<AttachmentIntent> {
    if (!opts.attachments.length) return FALLBACK_INTENT;
    try {
        const raw = await (opts.gen || flashGen(opts.timeoutMs ?? 20_000))(buildAttachmentIntentPrompt(opts.message, opts.attachments, opts.objective || ''));
        const parsed = parseAttachmentIntent(raw);
        if (parsed) return parsed;
        console.warn('[attachment-intent] the model reply did not parse; grounding this turn only');
    } catch (e: any) {
        console.warn('[attachment-intent] decision failed; grounding this turn only:', e?.message || e);
    }
    return FALLBACK_INTENT;
}
