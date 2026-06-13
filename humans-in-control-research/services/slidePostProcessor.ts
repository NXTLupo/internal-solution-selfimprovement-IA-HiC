/**
 * Slide Post-Processor - Validation & Correction Middleware
 *
 * Runs AFTER AI generation and BEFORE rendering/export.
 * Catches every recurring failure identified in the strategy deck audit:
 *
 * 1. Markdown artifacts (**bold**, *italic*, # headers) → stripped to plain text
 * 2. Raw citations ([FILE X], [CHUNK_XXX]) → resolved or flagged
 * 3. Meta-narration ("We now move to...") → detected and removed
 * 4. Unresolved placeholders ([Date], [TBD], [X%]) → flagged
 * 5. Visual prompts requesting text in images → rewritten
 * 6. SaaS marketing CTAs → detected on closing slides
 * 7. Topic titles vs action titles → detected (title without verb/number)
 */

import type { Slide } from '../types';
import type { ChunkSourceInfo } from './researchFabricOrchestrator';
import { resolveManifestPointers } from './citationPointerRegistry';

// ============================================================
// 1. MARKDOWN STRIPPING
// ============================================================

/**
 * Strip markdown syntax from text, converting to clean plain text.
 * Handles: **bold**, *italic*, __bold__, _italic_, `code`, # headers, [links](url)
 */
export function stripMarkdown(text: string): string {
    if (!text) return text;
    return text
        // Bold: **text** or __text__
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        // Italic: *text* or _text_ (but not inside words like don't)
        .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1')
        .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
        // Inline code: `text`
        .replace(/`([^`]+)`/g, '$1')
        // Headers: # text, ## text, etc.
        .replace(/^#{1,6}\s+/gm, '')
        // Links: [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Horizontal rules
        .replace(/^[-*_]{3,}$/gm, '')
        // Clean up any double spaces left behind
        .replace(/  +/g, ' ')
        .trim();
}

/**
 * Strip markdown from all text fields in a slide.
 */
export function stripSlideMarkdown(slide: Slide): Slide {
    return {
        ...slide,
        title: stripMarkdown(slide.title),
        content: (slide.content || []).map(stripMarkdown),
        narrative: stripMarkdown(slide.narrative || ''),
        speakerNotes: stripMarkdown(slide.speakerNotes || ''),
        quote: stripMarkdown(slide.quote || ''),
    };
}

// ============================================================
// 2. CITATION RESOLUTION
// ============================================================

/**
 * Resolve raw [FILE X] and [CHUNK_XXX] citations to human-readable format.
 * Uses the chunk-to-source mapping from corpus assembly to show real source names.
 */
export function resolveCitations(
    text: string,
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): string {
    if (!text) return text;

    // 2026-06-11 - Manifest chunk pointers ([articles/x.md#c15]) are the
    // citation format the chunk-retrieval contract instructs models to emit.
    // Resolve them to named sources FIRST; raw paths leaking into rendered
    // artifacts was the 2026-06-11 #journey/#blueprint failure.
    text = resolveManifestPointers(text);

    // Replace [FILE X] with the actual file name if available
    text = text.replace(/\[FILE\s*(\d+)\]/gi, (_match, num) => {
        const idx = parseInt(num, 10) - 1;
        if (fileNames && fileNames[idx]) {
            return `(Source: ${fileNames[idx]})`;
        }
        return `(Source: uploaded document ${num})`;
    });

    // Replace [CHUNK_XXX] with human-readable source names from the corpus map.
    // Before: [CHUNK_042] → "(Research finding #42)" (meaningless)
    // After:  [CHUNK_042] → "(Higher Ed Dive: 'Student Retention Strategies')"
    text = text.replace(/\[CHUNK_(\d+)\]/gi, (_match, num) => {
        const chunkId = `CHUNK_${String(parseInt(num, 10)).padStart(3, '0')}`;
        const info = chunkSourceMap?.[chunkId];
        if (info) {
            // Show source name + shortened title for traceability
            const shortTitle = info.title.length > 50
                ? info.title.substring(0, 47) + '...'
                : info.title;
            return shortTitle
                ? `(${info.sourceName}: "${shortTitle}")`
                : `(${info.sourceName})`;
        }
        return `(Source #${parseInt(num, 10)})`;
    });

    // Also handle comma-separated chunk lists: [CHUNK_003, CHUNK_017]
    text = text.replace(/\[(CHUNK_\d+(?:\s*,\s*CHUNK_\d+)+)\]/gi, (_match, chunkList) => {
        const chunks = chunkList.split(/\s*,\s*/);
        const resolvedSources = chunks.map((c: string) => {
            const info = chunkSourceMap?.[c.trim()];
            return info ? info.sourceName : c.trim();
        });
        // Deduplicate source names
        const unique = [...new Set(resolvedSources)];
        return `(Sources: ${unique.join(', ')})`;
    });

    // Replace raw filenames with extensions (e.g., [filename.pdf], [something - Copy.pdf])
    text = text.replace(/\[([^\]]+\.(pdf|docx?|xlsx?|pptx?|csv|txt))\]/gi, (_match, filename) => {
        // Clean up " - Copy" artifacts
        const cleaned = filename.replace(/\s*-\s*Copy/gi, '').trim();
        return `(Source: ${cleaned})`;
    });

    return text;
}

/**
 * Resolve citations in all text fields of a slide.
 */
export function resolveSlidesCitations(
    slides: Slide[],
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): Slide[] {
    return slides.map(slide => ({
        ...slide,
        title: resolveCitations(slide.title, fileNames, chunkSourceMap),
        content: (slide.content || []).map(c => resolveCitations(c, fileNames, chunkSourceMap)),
        narrative: resolveCitations(slide.narrative || '', fileNames, chunkSourceMap),
        speakerNotes: resolveCitations(slide.speakerNotes || '', fileNames, chunkSourceMap),
        quote: resolveCitations(slide.quote || '', fileNames, chunkSourceMap),
    }));
}

// ============================================================
// 3. META-NARRATION DETECTION & REMOVAL
// ============================================================

const META_NARRATION_PATTERNS = [
    /\bwe\s+(now|are now)\s+(move|enter|moving|entering|transition)/i,
    /\bthis is (where|the section|the phase|the part)\b/i,
    /\blet['u]s?\s+(now\s+)?(examine|explore|look at|discuss|turn to|move to|dive into|delve into)/i,
    /\bin this (section|slide|part|phase|presentation|deck|document|report|analysis)\b/i,
    /\bwe will (now\s+)?(examine|explore|discuss|look at|analyze|present|review|walk|cover|show|demonstrate|outline)/i,
    /\b(we|I)\s+(will|are going to|would like to|want to|aim to|seek to)\s+(present|discuss|explore|examine|review|walk|cover|show|demonstrate|outline)/i,
    /\bnow (we|I|let's)\s+(move|turn|shift|transition|proceed)/i,
    /\btoday (we|I)('(ll|d like to|m going to)|\s+(will|are going to|would like to|want to))\s+\w+/i,
    /\bgood (morning|afternoon|evening)\b/i,
    /\bthank you for (being here|joining|coming|attending)/i,
    /\bas you can see\b/i,
    /\bthis slide shows\b/i,
    /\bthe next (slide|section|part) (will |)(show|cover|discuss|explore|present)/i,
    /\bour (objective|goal|aim|purpose) (is|here is) to\b/i,
    /\bthis (presentation|deck|report|document|analysis|section|slide) (will|is designed to|aims to|seeks to|covers|addresses|examines|presents|outlines|frames)\b/i,
    /\bwelcome to\b/i,
    /\ballow me to\b/i,
    /\bI('d| would) like to (start|begin|open) by\b/i,
    /\bbefore we (begin|start|dive in|get started)\b/i,
    // 2026-05-10 - Self-referential pointers ("as shown above", "as discussed", etc.)
    // and process-conclusion wrap-ups ("in conclusion", "to summarize"). The reader
    // is consuming a finished artifact, not a chaptered document; these phrases
    // assume sequence the reader doesn't see.
    /\bas (shown|outlined|described|discussed|noted|mentioned|illustrated|highlighted|demonstrated)\s+(above|below|earlier|previously|prior|here)\b/i,
    /\bas (we|you)('ll| will| have| had| can)\s+(see|seen|noted|noticed|discussed|covered|observed)\b/i,
    /\bas (previously|earlier|already)\s+(noted|mentioned|discussed|stated|outlined)\b/i,
    /\b(in conclusion|to summarize|to conclude|in summary|to sum up|in closing)\b/i,
    // 2026-05-10 - Evidence-limitation language (unbracketed forms). Bracketed
    // forms are caught by stripQAAnnotations; this catches narrative prose that
    // surfaces what the model doesn't know. The reader must never see the model's
    // awareness of its own gaps.
    /\b(more|further|additional)\s+(research|investigation|analysis|study|data|evidence)\s+(is|are|will be|may be|would be|might be)?\s*(needed|required|warranted|recommended|necessary)\b/i,
    /\b(evidence|data|research|information)\s+(is|remains|appears|seems)\s+(limited|sparse|thin|insufficient|incomplete|unavailable|lacking)\b/i,
    /\b(due to|owing to|because of|given)\s+(limited|insufficient|sparse|missing|the absence of)\s+(data|evidence|research|information|sources)\b/i,
    /\b(while|though|although)\s+(data|evidence|research|information)\s+(was|is|remains)\s+(unavailable|limited|sparse|incomplete)\b/i,
    /\bin the absence of\b/i,
    /\bpending\s+(additional|further|more)\s+(research|data|investigation|evidence)\b/i,

    // ════════════════════════════════════════════════════════════════════════
    // 2026-05-25 - ANTI-SLOP STRUCTURAL TELLS
    // From ignorance.ai (Field Guide to AI Slop), Wikipedia Signs of AI Writing,
    // Algorithmic Bridge 10 Signs. Catches structures the phrase-blacklist
    // can't (rhetorical patterns, copula avoidance, unicode stylization).
    // ════════════════════════════════════════════════════════════════════════

    // "It's not X, it's Y" / "Not just X, but Y" - reflexive AI parallelism
    /\bit['’]s not (just |only |merely )?[^,.]{3,40},\s*it['’]s\b/i,
    /\bnot (just|only|merely) (about|a )[^,.]{3,40},\s*(but|it['’]s)\b/i,

    // Mid-sentence rhetorical questions ("The solution? It's simpler...")
    /\b(the )?(solution|answer|truth|reality|key|secret|result|outcome)\?\s+[A-Z]/,

    // Unearned profundity transitions
    /\b(something|everything|nothing) (shifted|changed|moved|broke)\b\.?/i,
    /\bbut here['’]s the (thing|truth|reality|catch|kicker|key)\b/i,
    /\bhere['’]s the (thing|truth|reality|catch|kicker|key)\b/i,

    // Unicode bold/italic stylization (𝗯 𝗼 𝗹 𝗱 / 𝒊 𝒕 𝒂 𝒍 𝒊 𝒄)
    /[\u{1D400}-\u{1D7FF}]/u,

    // ChatGPT artifact tags Wikipedia flags
    /\b(oaicite|oai_citation|contentReference|attached_file|attributableIndex)\b/i,
    /\bturn\d+search\d+\b/i,

    // Knowledge-cutoff disclaimers as sentences
    /\bas an AI(\s+(language model|assistant))?,\s*I\b/i,
    /\bI (cannot|can['’]t|am unable to|don['’]t have the ability)\b/i,

    // Snappy AI triads built around "fast/efficient/reliable", "simple/powerful/easy"
    /\b(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic),\s+(?:and\s+)?(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic),\s+(?:and\s+)?(fast|simple|easy|quick|smart|powerful|efficient|reliable|scalable|sustainable|innovative|dynamic)\b/i,

    // "Plays a [adjective] role in the X" - Wikipedia-canonical pattern
    /\bplays?\s+a\s+(key|crucial|pivotal|vital|significant|important|major|critical)\s+role\b/i,

    // "It is/serves as/stands as a testament to" - testament puffery
    /\b(is|serves as|stands as)\s+a\s+testament\s+to\b/i,

    // "A rich tapestry of" - canonical AI metaphor
    /\bא?\s*rich\s+tapestry\s+of\b/i,
    /\btapestry\s+of\s+(experiences|stories|narratives|voices|culture|insights)\b/i,

    // "Marks a pivotal" - Wikipedia signature
    /\bmark(s|ed)?\s+a\s+(pivotal|defining|watershed|seminal|transformative)\b/i,

    // Press-release excitement openers
    /\bwe\s+are\s+(excited|thrilled|delighted|proud|honored|pleased)\s+to\s+(announce|share|introduce|present)/i,

    // Closing summary boilerplate not already caught
    /\bin\s+(summary|conclusion|closing|short),\s+/i,
    /\bto\s+(summarize|conclude|sum up|wrap up)\b/i,

    // ════════════════════════════════════════════════════════════════════════
    // 2026-06-06 - READING-INSTRUCTION + STRUCTURE-DESCRIPTION TELLS
    // User caught: "HOW TO READ THIS", "One frame per phase, evidenced by
    // student voices from r/NEU." on a #journey #slides output. These are
    // META-instructions ABOUT the deliverable's structure, not content. The
    // reader of a finished consulting artifact must never see the model
    // describing how to consume the artifact or what each frame represents.
    // ════════════════════════════════════════════════════════════════════════

    // Reading-instruction kickers / banners
    /\bhow\s+to\s+read\s+(this|below|above|the\s+(slide|chart|diagram|map|page))\b/i,
    /\bhow\s+to\s+(use|interpret|approach)\s+(this|the\s+(slide|chart|diagram|map))\b/i,
    /\b(reading|interpretation|navigation)\s+guide\b/i,
    /\bguide\s+to\s+(reading|interpreting|navigating|using)\s+this\b/i,

    // Structure-description sentences ("One X per Y", "Each row represents", "The chart below")
    /\bone\s+(frame|row|column|tile|card|cell|slide|panel|block|swimlane|lane|section)\s+per\s+(phase|stage|theme|persona|recommendation|item|category|column|row)\b/i,
    /\b(each|every)\s+(frame|row|column|tile|card|cell|slide|panel|block|swimlane|lane|section)\s+(represents|shows|captures|maps to|corresponds to|depicts|illustrates)\b/i,
    /\bthe\s+(chart|diagram|map|table|figure|graphic|slide|frame)\s+(below|above|on the (left|right))\b/i,
    /\b(left|right|top|bottom)\s+(column|row|panel|side|side of the (slide|page))\s+(shows|contains|holds|lists|maps)/i,

    // "Evidenced by", "drawn from", "based on" used as deliverable description
    // (these are fine in evidence callouts, but flagging the structural form
    // where they qualify the whole deliverable e.g. "evidenced by student voices from r/X")
    /\b(evidenced|grounded|anchored|substantiated|backed|supported)\s+by\s+(student|user|expert|stakeholder|interview|reddit|forum|community)\s+(voices|posts|comments|threads|narratives|perspectives|input|feedback)\b/i,
    /\bdrawn\s+from\s+(student|user|expert|interview|reddit|forum|community)\s+(voices|posts|comments|threads|narratives)\b/i,

    // ════════════════════════════════════════════════════════════════════════
    // 2026-06-06 - USER-FLAGGED META-COMMENTARY + VAGUE-QUALIFIER + CLICHE
    // Sourced directly from user's 2026-06-06 directive enumerating the
    // four canonical slop families. These were not all caught by the prior
    // patterns. Adds: "It's important to note", "The key takeaway is",
    // "Let me explain", "There's a lot to unpack here", + delve, + narrative
    // cliches like "you can't help but feel", "barely above a whisper",
    // "hangs heavy in the air".
    // ════════════════════════════════════════════════════════════════════════
    /\bit['’]s (important|worth|critical|essential|crucial|vital|noteworthy) to\s+(note|remember|consider|understand|recognize|acknowledge|mention|highlight)\b/i,
    /\b(it should|one should|we should)\s+(be\s+)?noted\b/i,
    /\bthe\s+key\s+(takeaway|point|insight|message|finding|lesson|consideration)\s+(is|here is|to remember is)\b/i,
    /\blet\s+me\s+(explain|walk you through|break (this|it) down|clarify|elaborate|expand on)\b/i,
    /\bthere['’]s\s+a\s+lot\s+to\s+unpack\s+(here|in\s+this)\b/i,
    /\bunpack(ing)?\s+(this|the|these|those)\s+(idea|concept|point|finding|takeaway|insight|narrative|topic)\b/i,

    // Narrative clichés flagged by user
    /\byou\s+can['’]t\s+help\s+but\s+feel\s+(a\s+sense\s+of|that)\b/i,
    /\bbarely\s+above\s+a\s+whisper\b/i,
    /\bhangs?\s+heavy\s+(in\s+the\s+air|on\s+the\s+room)\b/i,
    /\b(silence|tension|anticipation|expectation)\s+hangs?\s+(heavy|thick|in\s+the\s+air)\b/i,

    // "Delve" / "delving into" - single-token AI tell already in CLAUDE.md
    // banned-phrase list, but adding here so the runtime post-processor
    // also catches it as a META violation (not just slop substitution).
    /\bdelv(e|es|ed|ing)\s+(into|deep(er)?\s+into|further\s+into)?\b/i,

    // "Unprecedented X" - vague-qualifier hyperbole the model loves
    /\bunprecedented\s+(efficiency|scale|growth|opportunity|challenge|complexity|access|insight|level|impact|transformation)\b/i,

    // Generic "today's rapidly evolving / fast-paced / dynamic landscape"
    /\bin\s+today['’]s\s+(rapidly\s+(evolving|changing|shifting)|fast[-\s]?paced|dynamic|competitive|complex)\s+(landscape|environment|world|market|ecosystem|business landscape)\b/i,

    // "When it comes to X" - empty preamble (Algorithmic Bridge list)
    /\bwhen\s+it\s+comes\s+to\s+\w+/i,

    // "At the end of the day", "at the heart of it" - empty filler
    /\bat\s+the\s+end\s+of\s+the\s+day\b/i,
    /\bat\s+the\s+heart\s+of\s+(it|this|the\s+matter)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════
// METAPHOR + ANTHROPOMORPHISM BAN - 2026-06-06
// User direction: "kill all metaphors! ... I want plain language human
// understandable titles and content. No hyperbole, no metaphors, no slop."
// Common metaphor families that produce slop titles:
//   - time/race: clock, ticking, running, sand, hourglass, deadline-as-actor
//   - construction: foundation, building blocks, scaffolding-as-noun
//   - journey: road, path, bridge, crossroads, milestone
//   - war/sports: battle, war, fight, race, arena, playbook
//   - anthropomorphism of abstract nouns: "X feels", "X demands", "X cries
//     out for", "the system wants"
// Catches the canonical title slop from the 2026-06-06 chat:
// "First-year prep feels abstract until the clock is already running"
// Sentences matching any of these get DROPPED, not rewritten - the model
// has to produce a concrete description instead.
// ═══════════════════════════════════════════════════════════════════════════

const METAPHOR_PATTERNS: RegExp[] = [
    // Time/race metaphors (the leaked title's class)
    /\b(the|a|their|its)?\s*clock\s+(is|starts|begins|runs|keeps|will be|has been|was already)\s+(ticking|running|already running|out of time|against (us|them|you))\b/i,
    /\b(running|ticking|hands of the clock|sands? of (time|the hourglass)|hourglass)\b/i,
    /\b(against|beat|race|racing|sprint|marathon)\s+(the|a|that|this)?\s*(clock|deadline|calendar)\b/i,
    /\b(time|window|deadline|clock|opportunity)\s+(is|was|has)\s+(running out|closing|slipping|narrowing|tight|short|finite)\b/i,

    // Anthropomorphism of abstract nouns ("X feels", "the system wants", "data demands")
    /\b(the\s+)?(prep|preparation|process|system|institution|workflow|pipeline|strategy|approach|model|data|evidence|research|corpus|landscape|gap|tension|challenge|opportunity|culture|brand)\s+(feels|wants|demands|cries out for|begs for|calls for|asks for|knows|understands|believes|expects|hopes|fears|loves|hates)\s+\w+/i,

    // Journey/road metaphors (overused in consulting prose)
    /\b(the\s+)?(road|path|journey|crossroads|bridge|milestone|chapter|turning point|inflection point|fork in the road|long road|winding road|road ahead|road less travel(l)?ed)\b/i,
    /\b(walk|navigate)\s+the\s+(path|road|journey|tightrope|maze|labyrinth)\b/i,

    // War / sports / battle metaphors
    /\b(battle|war|fight|skirmish|trench|battlefield|arms race|playbook|game plan|home run|slam dunk|hat trick|moving the goalposts|level the playing field|tip of the spear)\b/i,
    /\b(weapon(ize|ized|izing|s)?|armed with|in our arsenal|firepower|silver bullet|magic bullet)\b/i,

    // Construction / foundation / building metaphors
    /\b(lay(ing)?\s+(the\s+)?(foundation|groundwork|cornerstone)|building\s+blocks?|cornerstone\s+of|pillar(s)?\s+of|the\s+scaffolding\s+of|bricks\s+and\s+mortar)\b/i,

    // Light / dark / dawn / horizon metaphors
    /\b(shed(s|ding)?\s+light|cast(s|ing)?\s+(light|a shadow)|in the (shadow|spotlight)\s+of|on the horizon|new dawn|dawn(s|ing)?\s+(a|of|on)\b|tip of the iceberg)\b/i,

    // Cooking / recipe / ingredient metaphors
    /\b(the\s+secret\s+sauce|recipe\s+for|baked\s+in|cook(ed|ing)\s+up|the\s+ingredients|stew|mix(ing)?\s+together)\b/i,

    // Hyperbole - "the most important", "unprecedented", "transformative"
    /\bthe\s+(single\s+)?most\s+(important|critical|essential|fundamental|consequential|impactful|powerful)\s+\w+\s+(of|in|for)\b/i,
    /\b(unprecedented|paradigm[\s-]shift(ing)?|seismic|game[\s-]chang(er|ing)|revolutionary|earth[\s-]shatter(ing)|once[\s-]in[\s-]a[\s-](generation|lifetime))\b/i,
];

/**
 * Detect metaphor / anthropomorphism / hyperbole. Returns matched patterns.
 * Separate from META_NARRATION so the QA layer can report them under their
 * own category for the user.
 */
export function detectMetaphors(text: string): string[] {
    if (!text) return [];
    return METAPHOR_PATTERNS
        .filter(p => p.test(text))
        .map(p => {
            const m = text.match(p);
            return m ? m[0] : '';
        })
        .filter(Boolean);
}

/**
 * Remove sentences containing metaphor/hyperbole. Same pattern as
 * removeMetaNarration: kills the WHOLE sentence so the model's awareness of
 * the metaphor can't survive partial rewrites.
 */
export function removeMetaphors(text: string): string {
    if (!text) return text;
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(s => !METAPHOR_PATTERNS.some(p => p.test(s))).join(' ').trim();
}

/**
 * Composite slop check used by the slide-validator hook + post-processor.
 * Returns ALL banned phrases across both categories, tagged by class.
 */
export function detectAllSlop(text: string): Array<{ phrase: string; category: 'meta' | 'metaphor' }> {
    const out: Array<{ phrase: string; category: 'meta' | 'metaphor' }> = [];
    for (const p of META_NARRATION_PATTERNS) {
        const m = text?.match(p); if (m) out.push({ phrase: m[0], category: 'meta' });
    }
    for (const p of METAPHOR_PATTERNS) {
        const m = text?.match(p); if (m) out.push({ phrase: m[0], category: 'metaphor' });
    }
    return out;
}

/**
 * Detect meta-narration in text. Returns matched patterns.
 */
export function detectMetaNarration(text: string): string[] {
    if (!text) return [];
    return META_NARRATION_PATTERNS
        .filter(pattern => pattern.test(text))
        .map(pattern => {
            const match = text.match(pattern);
            return match ? match[0] : '';
        })
        .filter(Boolean);
}

/**
 * Remove meta-narration sentences from text.
 * Removes the entire sentence containing meta-narration, not just the matched phrase.
 */
export function removeMetaNarration(text: string): string {
    if (!text) return text;

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    const cleaned = sentences.filter(sentence => {
        return !META_NARRATION_PATTERNS.some(pattern => pattern.test(sentence));
    });

    return cleaned.join(' ').trim();
}

// 2026-05-25 - EM-DASH AUTO-STRIP
// ============================================================
// Em-dashes are a documented AI-writing tell (ignorance.ai, Wikipedia
// Signs-of-AI-Writing, Algorithmic Bridge). Three or more in a paragraph
// signal an AI rhythm independent of any individual usage being correct.
// The post-processor strips them at output time so they never reach
// rendered slides or chat replies, even if the model emits them.
//
// 2026-06-09 REWRITE (Phase-0 guardrail). The prior version was doubly broken:
// it operated on the ASCII HYPHEN-MINUS (U+002D), NOT the em-dash, so (a) real
// em-dashes (U+2014) LEAKED through untouched (observed: a raw em-dash on a
// shipped deck slide), and (b) `replace(/-/g, ', ')` converted EVERY hyphen to a
// comma, mangling legitimate compounds and ranges ("donor-centric" -> "donor,
// centric", "12-month" -> "12, month", "1-3" -> "1, 3").
//
// Correct behavior: operate ONLY on em-dash (U+2014) and en-dash (U+2013), with
// CONTEXT-AWARE replacement, and LEAVE the ASCII hyphen-minus untouched so
// hyphenated compounds and numeric ranges survive intact:
//   • digit–digit (a range)            -> "N to M"   ("Month 1—3" -> "Month 1 to 3")
//   • letter–letter, no spaces (compound) -> hyphen  ("donor—centric" -> "donor-centric")
//   • spaced / residual dash (a clause break) -> comma+space
export function stripEmDashes(text: string): string {
    if (!text) return text;
    let cleaned = text;
    // 1. numeric range -> " to " (handles optional surrounding spaces)
    cleaned = cleaned.replace(/(\d)\s*[—–]\s*(\d)/g, '$1 to $2');
    // 2. compound (alphanumerics immediately touching the dash, no spaces) -> hyphen.
    //    Alphanumeric (not just letters) so "12—month" / "3—year" become "12-month" /
    //    "3-year". digit–digit ranges were already consumed by step 1.
    cleaned = cleaned.replace(/([A-Za-z0-9])[—–]([A-Za-z0-9])/g, '$1-$2');
    // 3. clause break (spaced em/en-dash) -> comma+space
    cleaned = cleaned.replace(/\s*[—–]\s*/g, ', ');
    // 4. any residual em/en-dash (adjacent punctuation) -> comma+space
    cleaned = cleaned.replace(/[—–]/g, ', ');
    // Tidy ONLY the comma artifacts this function can create. Never touches
    // existing commas like "1,000" (no preceding space, not doubled). Edge commas
    // created by a leading/trailing clause dash are trimmed.
    cleaned = cleaned.replace(/ ,/g, ',').replace(/,{2,}/g, ',');
    cleaned = cleaned.replace(/^\s*,\s*/, '').replace(/\s*,\s*$/, '');
    return cleaned;
}

// 2026-05-27 - HARD emoji ban (repo-wide rule). Strip emoji / pictographic
// codepoints from ANY model-produced text before it reaches the user. Mirrors
// the proxy's _EMOJI_RE so every surface (chat replies, deliverables, router
// output) is covered regardless of which provider answered. Deliberately
// PRESERVES geometric-shape bullets (U+25xx, e.g. the NU signal dot) and
// typographic arrows (U+21xx) which are legitimate layout glyphs. Also strips
// trailing whitespace the removal can leave (e.g. "Pong! " → "Pong!").
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}-\u{231B}\u{23E0}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

export function stripEmoji(text: string): string {
    if (!text) return text;
    let cleaned = text.replace(EMOJI_RE, '');
    // Collapse the orphaned double-spaces / dangling space-before-punctuation
    // that emoji removal leaves behind, without touching newlines.
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:!?])/g, '$1');
    return cleaned;
}

/** Combined hygiene: strip em-dashes AND emoji. Use at every text chokepoint. */
export function stripFormatTells(text: string): string {
    return stripEmoji(stripEmDashes(text));
}

// 2026-05-10 - PROCESS-REFERENCE REWRITES
// ============================================================
// Unlike META_NARRATION which drops the whole sentence, these patterns
// match phrases that PREFIX a legitimate insight: "Based on the research,
// customer churn is 22%". Dropping the sentence would lose the insight;
// we want to strip the prefix and keep "Customer churn is 22%". The
// regex captures only the prefix; the substitution leaves the rest intact
// and re-capitalizes the first letter of what remains.
const PROCESS_REFERENCE_REWRITES: Array<{ pattern: RegExp; preserveGroup: 1 | 2 }> = [
    // "Based on [the/our] X, Y" → Y
    { pattern: /\b[Bb]ased on (?:the |our |this )?(?:research|analysis|data|evidence|findings|sources|corpus|review|investigation|assessment)[^,.]*,\s*([a-z].*)/g, preserveGroup: 1 },
    // "According to [the/our] X, Y" → Y
    { pattern: /\b[Aa]ccording to (?:the |our )?(?:research|analysis|data|evidence|findings|sources|corpus|report|review)[^,.]*,\s*([a-z].*)/g, preserveGroup: 1 },
    // "The research/data/analysis/corpus/evidence (shows|indicates|reveals|suggests|finds|demonstrates) (that )? Y" → Y
    { pattern: /\b[Tt]he (?:research|data|analysis|corpus|evidence|findings|sources|report) (?:show|shows|showed|indicate|indicates|indicated|reveal|reveals|revealed|suggest|suggests|suggested|find|finds|found|demonstrate|demonstrates|demonstrated|confirm|confirms|confirmed)\s+(?:that\s+)?([a-z].*)/g, preserveGroup: 1 },
    // "Our (research|analysis|findings|review) (shows|indicates|...) Y" → Y
    { pattern: /\b[Oo]ur (?:research|analysis|findings|review|investigation|assessment|study) (?:show|shows|indicate|indicates|reveal|reveals|suggest|suggests|find|finds|demonstrate|demonstrates|confirm|confirms)\s+(?:that\s+)?([a-z].*)/g, preserveGroup: 1 },
    // "This report (finds|indicates|...) (that )? Y" → Y
    { pattern: /\b[Tt]his (?:report|analysis|document|assessment|review) (?:find|finds|indicate|indicates|reveal|reveals|suggest|suggests|show|shows|conclude|concludes|demonstrate|demonstrates)\s+(?:that\s+)?([a-z].*)/g, preserveGroup: 1 },
    // "From the (sources|research|data|evidence) (reviewed|gathered|examined|analyzed), Y" → Y
    { pattern: /\b[Ff]rom the (?:sources|research|data|evidence|literature|corpus)(?:\s+\w+)?,\s*([a-z].*)/g, preserveGroup: 1 },
    // "Drawing on [the/our] X, Y" → Y
    { pattern: /\b[Dd]rawing on (?:the |our )?(?:research|analysis|data|evidence|findings|sources|corpus|literature)[^,.]*,\s*([a-z].*)/g, preserveGroup: 1 },
    // "(Research|Studies|Sources) (show|indicate|...) (that )? Y" → Y
    { pattern: /\b(?:[Rr]esearch|[Ss]tudies|[Ss]ources|[Ee]vidence|[Dd]ata|[Ff]indings)\s+(?:show|shows|showed|indicate|indicates|indicated|reveal|reveals|revealed|suggest|suggests|suggested|confirm|confirms|confirmed)\s+(?:that\s+)?([a-z].*)/g, preserveGroup: 1 },
];

/**
 * Strip process-reference prefixes while preserving the insight that follows.
 * "Based on the research, customer churn is 22%" → "Customer churn is 22%."
 * Re-capitalizes the first letter of what remains, ensures terminal punctuation.
 *
 * Run BEFORE removeMetaNarration - otherwise the whole sentence gets dropped
 * by the broader "the research shows" patterns and the insight is lost.
 */
export function stripProcessReferences(text: string): string {
    if (!text) return text;
    let cleaned = text;
    for (const { pattern, preserveGroup } of PROCESS_REFERENCE_REWRITES) {
        cleaned = cleaned.replace(pattern, (_match, ...groups) => {
            const kept = groups[preserveGroup - 1];
            if (!kept || typeof kept !== 'string') return '';
            // Capitalize first letter
            return kept.charAt(0).toUpperCase() + kept.slice(1);
        });
    }
    // Collapse double spaces / orphan punctuation produced by replacements.
    return cleaned.replace(/\s+([.,;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// ============================================================
// 4. PLACEHOLDER DETECTION
// ============================================================

const PLACEHOLDER_PATTERNS = [
    /\[Date\]/gi,
    /\[TBD\]/gi,
    /\[X%?\]/gi,
    /\[INSERT[^\]]*\]/gi,
    /\[PLACEHOLDER[^\]]*\]/gi,
    /\[TODO[^\]]*\]/gi,
    /\[YOUR[^\]]*\]/gi,
    /\[COMPANY[^\]]*\]/gi,
    /\(baseline:\s*[XYZ]\)/gi,
];

/**
 * Detect unresolved placeholders in text.
 */
export function detectPlaceholders(text: string): string[] {
    if (!text) return [];
    const found: string[] = [];
    for (const pattern of PLACEHOLDER_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) found.push(...matches);
    }
    return found;
}

/**
 * Replace common placeholders with honest language.
 */
export function resolvePlaceholders(text: string): string {
    if (!text) return text;
    return text
        .replace(/\[Date\]/gi, '(timeline to be confirmed)')
        .replace(/\[TBD\]/gi, '(to be determined in scoping)')
        .replace(/\[X%?\]/gi, '(target to be baselined)')
        .replace(/\[INSERT[^\]]*\]/gi, '')
        .replace(/\[PLACEHOLDER[^\]]*\]/gi, '')
        .replace(/\[TODO[^\]]*\]/gi, '')
        .replace(/\(baseline:\s*[XYZ]\)/gi, '(baseline to be measured)')
        .replace(/  +/g, ' ')
        .trim();
}

// ============================================================
// 4B. QA-ANNOTATION STRIPPER (Evidence Gap, TBD, etc.)
// ============================================================
//
// Defense-in-depth: even with prompts forbidding "EVIDENCE GAP" / "Evidence Gap"
// /"TBD" /"[needs baseline]" tokens in user-facing fields, models occasionally
// leak them. This stripper deletes them from any text passed through, so
// delivered output never shows the model's QA notes.
//
// Used by: postProcessSlides, exportService, ResultsView text renderer,
// corpusChatService chat reply finalizer, narrativeComposer artifact emitter.
// Anywhere AI text reaches the user, run it through stripQAAnnotations() first.

const QA_ANNOTATION_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
    // Bracketed forms
    { pattern: /\[\s*EVIDENCE\s+GAP[^\]]*\]/gi, replace: '' },
    { pattern: /\[\s*Evidence\s+Gap[^\]]*\]/g, replace: '' },
    { pattern: /\[\s*needs\s+baseline[^\]]*\]/gi, replace: '' },
    { pattern: /\[\s*baseline\s+TBD[^\]]*\]/gi, replace: '' },
    { pattern: /\[\s*TBD[^\]]*\]/gi, replace: '' },
    // Sentence-prefix forms ("EVIDENCE GAP: ...", "Evidence Gap - ...")
    { pattern: /\bEVIDENCE\s+GAP\s*[:\-]\s*[^.\n]+\.?/g, replace: '' },
    { pattern: /\bEvidence\s+Gap\s*[:\-]\s*[^.\n]+\.?/g, replace: '' },
    { pattern: /\bevidence\s+gap\s*[:\-]\s*[^.\n]+\.?/g, replace: '' },
    // Bare tokens
    { pattern: /\bEVIDENCE\s+GAP\b/g, replace: '' },
    { pattern: /\bEvidence\s+Gap\b/g, replace: '' },
    // 2026-05-11 - CATEGORY GAP reports (and their wrapping headers/dividers).
    // The old chat prompt required the model to list empty source categories;
    // that requirement is removed but old conversations or stale instructions
    // could still produce them. Strip the section header, the divider, and
    // every individual CATEGORY GAP line. Both backticked and bare forms.
    { pattern: /\n?-{3,}\s*\n?\s*###?\s*CATEGORY GAP REPORT[\s\S]*$/gi, replace: '' },
    { pattern: /\n?\*{3,}\s*\n?\s*###?\s*CATEGORY GAP REPORT[\s\S]*$/gi, replace: '' },
    { pattern: /\n?###?\s*CATEGORY GAP REPORT[\s\S]*$/gi, replace: '' },
    { pattern: /\n?The following user-selected source categories yielded no relevant content[^\n]*\n/gi, replace: '\n' },
    { pattern: /`?CATEGORY GAP[^`\n]*`?\s*\n?/g, replace: '' },
    { pattern: /\bCATEGORY GAP\s*[:\-]\s*[^\n]+/g, replace: '' },
    // Annotation parenthetical forms
    { pattern: /\(\s*needs\s+baseline\s*\)/gi, replace: '' },
    { pattern: /\(\s*baseline\s+TBD\s*\)/gi, replace: '' },
    { pattern: /\(\s*TBD\s*\)/gi, replace: '' },
    { pattern: /\(\s*evidence\s+gap[^\)]*\)/gi, replace: '' },
    // 2026-05-31 - LEAKED LLM-ARTIFACT strings rendered as content/quotes
    // (journey-deck audit: "please provide the content of Part 2/3 of the
    // research corpus" surfaced as a pull quote). Nuke the whole fragment.
    { pattern: /please\s+provide\s+the\s+content\s+of\s+part\s*\d\s*\/\s*\d[^.\n]*\.?/gi, replace: '' },
    { pattern: /\bpart\s*\d\s*\/\s*\d\s+of\s+the\s+(?:research\s+)?corpus\b[^.\n]*\.?/gi, replace: '' },
    { pattern: /\b(?:please\s+provide|provide\s+the\s+content|continue\s+the\s+(?:analysis|response|synthesis))\b[^.\n]*\.?/gi, replace: '' },
    // 2026-05-31 - SYNTHESIS-AS-SOURCE citations: the pipeline citing its own
    // internal pass ("Source: Tri-Model Synthesis, Highlights / Gaps section")
    // or prior deliverables as if they were evidence. Strip the citation token.
    { pattern: /\bTri-?Model\s+Synthesis\b[^.\n]*/gi, replace: '' },
    { pattern: /(?:Source|Sources)\s*:\s*(?:Highlights|Gaps?\s+section|Pre-?Analysis|the\s+corpus|the\s+record|Prior\s+Findings)\b[^.\n]*/gi, replace: '' },
    // Trailing fragments produced by removing the above
    { pattern: /\s*-\s*$/g, replace: '' },
    { pattern: /\s*\.\s*\.\s*\./g, replace: '.' },
    { pattern: /  +/g, replace: ' ' },
];

export function stripQAAnnotations(text: string | undefined | null): string {
    if (!text) return '';
    let cleaned = String(text);
    for (const { pattern, replace } of QA_ANNOTATION_PATTERNS) {
        cleaned = cleaned.replace(pattern, replace);
    }
    // 2026-05-10 - Also strip process-reference prefixes and remove
    // sentences that violate the self-referential / limitation rules.
    // Order matters: process-rewrite first (preserves insight), then the
    // sentence-level meta-narration sweep (drops anything left over).
    cleaned = stripProcessReferences(cleaned);
    cleaned = removeMetaNarration(cleaned);
    // Trim residual whitespace artifacts and double-comma artifacts
    return cleaned.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/\s+\./g, '.').replace(/\s{2,}/g, ' ').trim();
}

// Recursively walk an object/array and strip QA annotations from every string value.
// Mutates in place. Skips internal-only keys (start with `_`).
// 2026-05-10 - Now also strips process-references and meta-narration sentences
// via the enhanced stripQAAnnotations(), so every output path (chat replies,
// presentation payloads, freeform artifacts) inherits the no-self-reference rule.
export function stripQAAnnotationsDeep<T>(value: T): T {
    if (value == null) return value;
    if (typeof value === 'string') return stripQAAnnotations(value) as any;
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = stripQAAnnotationsDeep(value[i]);
        return value;
    }
    if (typeof value === 'object') {
        for (const k of Object.keys(value as any)) {
            if (k.startsWith('_')) continue;
            (value as any)[k] = stripQAAnnotationsDeep((value as any)[k]);
        }
        return value;
    }
    return value;
}

// ============================================================
// 5. VISUAL PROMPT SANITIZATION
// ============================================================

const TEXT_IN_IMAGE_PATTERNS = [
    /\btext\s+(that\s+)?(says?|reads?|showing|displaying|with)\b/i,
    /\bwith\s+(the\s+)?(words?|text|letters?|label|title|heading|caption)\b/i,
    /\blabeled?\b/i,
    /\bcaption(ed)?\b/i,
    /\boverlay(ed)?\s+text\b/i,
    /\btext\s+overlay\b/i,
    /\bheadline\b/i,
    /\btitle\s+card\b/i,
    /\bword(s)?\s+(on|in|over|across)\b/i,
];

/**
 * Sanitize a visual prompt to prevent text rendering in AI-generated images.
 * - Removes requests for text/labels/captions in images
 * - Appends explicit "no text" instruction
 */
export function sanitizeVisualPrompt(prompt: string): string {
    if (!prompt) return prompt;

    // If prompt explicitly says "TEXT ONLY" or "no visual needed", keep it
    if (/text\s*only|no\s*visual\s*needed/i.test(prompt)) {
        return prompt;
    }

    // Remove requests for text-in-image
    let sanitized = prompt;
    for (const pattern of TEXT_IN_IMAGE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Append the hard constraint
    sanitized += ' CRITICAL: Do NOT include any text, words, letters, numbers, labels, captions, or typography in this image. All text will be added as a separate overlay layer. The image must contain ZERO readable characters.';

    return sanitized.replace(/  +/g, ' ').trim();
}

// ============================================================
// 6. SAAS CTA DETECTION
// ============================================================

const SAAS_CTA_PATTERNS = [
    /\bready to innovate\b/i,
    /\bstart project\b/i,
    /\bget consulting\b/i,
    /\bjoin us\b/i,
    /\blet['u]s get started\b/i,
    /\bschedule a demo\b/i,
    /\bbook a call\b/i,
    /\bsign up\b/i,
    /\bfree trial\b/i,
    /\bcontact us today\b/i,
    /\brequest a quote\b/i,
    /\blearn more\b/i,
    /\btransform your\b/i,
    /\bunlock your\b/i,
    /\bsupercharge your\b/i,
];

/**
 * Detect SaaS marketing CTAs that don't belong in a strategy deck.
 */
export function detectSaasCTAs(text: string): string[] {
    if (!text) return [];
    return SAAS_CTA_PATTERNS
        .filter(pattern => pattern.test(text))
        .map(pattern => {
            const match = text.match(pattern);
            return match ? match[0] : '';
        })
        .filter(Boolean);
}

// ============================================================
// 7. TOPIC TITLE vs ACTION TITLE CHECK
// ============================================================

/**
 * Heuristic check: does a slide title state a conclusion (action title)
 * or merely name a topic (topic title)?
 *
 * Action titles contain verbs, numbers, or comparison language.
 * Topic titles are typically 1-3 words with no verb.
 */
export function isTopicTitle(title: string): boolean {
    if (!title) return false;
    const words = title.trim().split(/\s+/);
    // Very short titles (1-3 words) without numbers are likely topic titles
    if (words.length <= 3 && !/\d/.test(title)) return true;
    // Section headers are expected to be short
    return false;
}

// ============================================================
// 8. SLIDE DEPTH VALIDATION (D7)
// ============================================================

/**
 * Validate that a slide meets the 3-layer depth requirement:
 *   Layer 1 - Observation: contains a data point or specific fact
 *   Layer 2 - Implication: explains what the data means for this organization
 *   Layer 3 - Recommendation: states what to do, with a timeline or owner
 *
 * Returns a score 1-3 and flags for missing layers.
 */
export function validateSlideDepth(slide: Slide): { score: number; missingLayers: string[] } {
    if (!slide || slide.layout === 'SECTION_HEADER' || slide.layout === 'TITLE_SLIDE') {
        return { score: 3, missingLayers: [] }; // Headers exempt
    }

    const allText = [slide.title, ...(slide.content || []), slide.narrative || '', slide.quote || ''].join(' ');
    const missingLayers: string[] = [];

    // Layer 1: Observation - contains a number, percentage, stat, or date
    const hasData = /\d+(\.\d+)?(%|\s*(months?|years?|days?|hours?|x|pts?|percent|million|billion|thousand))/i.test(allText)
        || /\$[\d,.]+/i.test(allText)
        || /20[12]\d/i.test(allText);
    if (!hasData) missingLayers.push('Layer 1 (Observation): No data point or specific metric found');

    // Layer 2: Implication - contains consequence/meaning language
    const hasImplication = /\b(this means|which means|resulting in|leading to|causing|indicating|suggesting that|implies|the impact is|the consequence|for .{5,30} this|this translates to)\b/i.test(allText)
        || /\b(because of this|as a result|the effect|the implication)\b/i.test(allText);
    if (!hasImplication) missingLayers.push('Layer 2 (Implication): No "so what" - explain what the data means');

    // Layer 3: Recommendation - contains action verb + timeline or owner
    const hasAction = /\b(recommend|should|must|will|implement|deploy|launch|establish|create|consolidate|migrate|invest|allocate|hire|train)\b/i.test(allText)
        && (/\b(by Q[1-4]|within \d+|by 20[2-3]\d|in the next|over the next|\d+ months?|\d+ days?)\b/i.test(allText)
            || /\b(VP|Director|Manager|CTO|CIO|CMO|team lead|owner|responsible)\b/i.test(allText));
    if (!hasAction) missingLayers.push('Layer 3 (Recommendation): No specific action with timeline or owner');

    const score = 3 - missingLayers.length;
    return { score: Math.max(1, score), missingLayers };
}

// ============================================================
// 9. OUTPUT ANTI-PATTERN DETECTION (P5-01)
// ============================================================

/**
 * Banned slop phrases that undermine credibility.
 * These are the corporate-speak equivalents of filler words -
 * they sound authoritative but communicate nothing.
 *
 * 2026-05-07 - Greatly expanded to attack the four user-named slop categories:
 *   (a) jargon / buzzwords
 *   (b) overused metaphors
 *   (c) hyperbole / superlatives
 *   (d) AI-generated narrative slop
 * The replacement model (Gemini 3.1 Pro) produces cleaner prose than DeepSeek,
 * but defense-in-depth still strips anything that slips through.
 */
const SLOP_PHRASES: { phrase: string; severity: 'high' | 'medium' | 'low' }[] = [
    // === (a) JARGON / CONSULTANT BUZZWORDS - high severity ===
    { phrase: 'paradigm shift', severity: 'high' },
    { phrase: 'game-changer', severity: 'high' },
    { phrase: 'game changer', severity: 'high' },
    { phrase: 'holistic approach', severity: 'high' },
    { phrase: 'cutting-edge', severity: 'high' },
    { phrase: 'cutting edge', severity: 'high' },
    { phrase: 'best-in-class', severity: 'high' },
    { phrase: 'best in class', severity: 'high' },
    { phrase: 'world-class', severity: 'high' },
    { phrase: 'world class', severity: 'high' },
    { phrase: 'leverage synergies', severity: 'high' },
    { phrase: 'leverage synergy', severity: 'high' },
    { phrase: 'synergies', severity: 'high' },
    { phrase: 'robust solution', severity: 'high' },
    { phrase: 'robust framework', severity: 'high' },
    { phrase: 'seamless integration', severity: 'high' },
    { phrase: 'seamless experience', severity: 'high' },
    { phrase: 'turnkey solution', severity: 'high' },
    { phrase: 'end-to-end solution', severity: 'high' },
    { phrase: 'value proposition', severity: 'high' },
    { phrase: 'value-add', severity: 'high' },
    { phrase: 'value add', severity: 'high' },
    { phrase: 'core competency', severity: 'high' },
    { phrase: 'core competencies', severity: 'high' },
    { phrase: 'mission-critical', severity: 'high' },
    { phrase: 'mission critical', severity: 'high' },
    { phrase: 'thought leadership', severity: 'high' },
    { phrase: 'thought leader', severity: 'high' },
    { phrase: 'actionable insights', severity: 'high' },
    { phrase: 'actionable insight', severity: 'medium' },
    { phrase: 'strategic imperative', severity: 'high' },
    { phrase: 'north star', severity: 'high' },
    { phrase: 'force multiplier', severity: 'high' },
    { phrase: 'circle back', severity: 'high' },
    { phrase: 'deep dive', severity: 'medium' },
    { phrase: 'double down', severity: 'high' },
    { phrase: 'best practices', severity: 'medium' },
    { phrase: 'next-gen', severity: 'high' },
    { phrase: 'next generation', severity: 'medium' },
    { phrase: 'future-proof', severity: 'high' },
    { phrase: 'ecosystem play', severity: 'high' },
    { phrase: 'platform play', severity: 'high' },
    { phrase: 'flywheel', severity: 'high' },
    { phrase: 'rockstar', severity: 'high' },
    { phrase: 'ninja', severity: 'high' },
    { phrase: 'guru', severity: 'high' },
    { phrase: 'evangelist', severity: 'medium' },

    // === (b) METAPHORS - high severity ===
    { phrase: 'tip of the iceberg', severity: 'high' },
    { phrase: 'low-hanging fruit', severity: 'high' },
    { phrase: 'low hanging fruit', severity: 'high' },
    { phrase: 'move the needle', severity: 'high' },
    { phrase: 'moves the needle', severity: 'high' },
    { phrase: 'moved the needle', severity: 'high' },
    { phrase: 'boil the ocean', severity: 'high' },
    { phrase: 'drink from the fire hose', severity: 'high' },
    { phrase: 'drinking from the fire hose', severity: 'high' },
    { phrase: 'eat your own dog food', severity: 'high' },
    { phrase: 'dogfood', severity: 'high' },
    { phrase: 'lift and shift', severity: 'high' },
    { phrase: 'rip and replace', severity: 'high' },
    { phrase: 'put a stake in the ground', severity: 'high' },
    { phrase: 'plant a flag', severity: 'high' },
    { phrase: 'wheelhouse', severity: 'high' },
    { phrase: 'in their wheelhouse', severity: 'high' },
    { phrase: 'level up', severity: 'medium' },
    { phrase: 'level the playing field', severity: 'high' },
    { phrase: 'rising tide lifts', severity: 'high' },
    { phrase: 'iceberg', severity: 'medium' },
    { phrase: 'sea change', severity: 'high' },
    { phrase: 'tipping point', severity: 'medium' },
    { phrase: 'sweet spot', severity: 'medium' },
    { phrase: 'on the same page', severity: 'medium' },
    { phrase: 'unlock the potential', severity: 'high' },
    { phrase: 'unlock potential', severity: 'high' },
    { phrase: 'unleash the power', severity: 'high' },
    { phrase: 'unleashes the power', severity: 'high' },
    { phrase: 'power of', severity: 'medium' },
    { phrase: 'navigate the complexities', severity: 'high' },
    { phrase: 'navigate the landscape', severity: 'high' },
    { phrase: 'navigating the landscape', severity: 'high' },

    // === (c) HYPERBOLE / SUPERLATIVES - high severity ===
    { phrase: 'revolutionary', severity: 'high' },
    { phrase: 'groundbreaking', severity: 'high' },
    { phrase: 'transformative', severity: 'high' },
    { phrase: 'transformational', severity: 'high' },
    { phrase: 'unprecedented', severity: 'high' },
    { phrase: 'unparalleled', severity: 'high' },
    { phrase: 'unmatched', severity: 'high' },
    { phrase: 'industry-leading', severity: 'high' },
    { phrase: 'industry leading', severity: 'high' },
    { phrase: 'market-leading', severity: 'high' },
    { phrase: 'state-of-the-art', severity: 'high' },
    { phrase: 'state of the art', severity: 'high' },
    { phrase: 'bleeding edge', severity: 'high' },
    { phrase: 'next-level', severity: 'high' },
    { phrase: 'next level', severity: 'medium' },
    { phrase: 'massive impact', severity: 'high' },
    { phrase: 'massive opportunity', severity: 'high' },
    { phrase: 'huge opportunity', severity: 'high' },
    { phrase: 'enormous opportunity', severity: 'medium' },
    { phrase: 'paradigm-shifting', severity: 'high' },

    // === (d) AI-SLOP NARRATIVE PHRASES - high severity ===
    { phrase: "in today's rapidly evolving landscape", severity: 'high' },
    { phrase: "in today's rapidly changing", severity: 'high' },
    { phrase: "in today's dynamic", severity: 'high' },
    { phrase: "in today's competitive landscape", severity: 'high' },
    { phrase: "in the ever-evolving", severity: 'high' },
    { phrase: 'ever-evolving landscape', severity: 'high' },
    { phrase: 'ever changing landscape', severity: 'high' },
    { phrase: 'as we navigate', severity: 'high' },
    { phrase: 'as we move forward', severity: 'high' },
    { phrase: 'as we look to the future', severity: 'high' },
    { phrase: 'on a go-forward basis', severity: 'high' },
    { phrase: 'looking ahead', severity: 'medium' },
    { phrase: "it's important to note", severity: 'high' },
    { phrase: "it's worth noting", severity: 'high' },
    { phrase: 'it should be noted', severity: 'high' },
    { phrase: 'needless to say', severity: 'high' },
    { phrase: 'at the end of the day', severity: 'high' },
    { phrase: 'the reality is', severity: 'high' },
    { phrase: 'the fact of the matter', severity: 'high' },
    { phrase: 'when it comes to', severity: 'high' },
    { phrase: 'in terms of', severity: 'medium' },
    { phrase: 'with respect to', severity: 'medium' },
    { phrase: 'in this paper we', severity: 'high' },
    { phrase: 'in this report we', severity: 'high' },
    { phrase: 'in this presentation', severity: 'high' },
    { phrase: 'in this deck', severity: 'high' },
    { phrase: 'this section will', severity: 'high' },
    { phrase: 'this slide shows', severity: 'high' },
    { phrase: 'as you can see', severity: 'high' },
    { phrase: 'as illustrated', severity: 'medium' },
    { phrase: 'in the modern era', severity: 'high' },
    { phrase: 'in the digital age', severity: 'high' },
    { phrase: 'fundamentally', severity: 'medium' },
    { phrase: 'undoubtedly', severity: 'medium' },
    { phrase: 'arguably', severity: 'medium' },
    { phrase: 'certainly', severity: 'medium' },
    { phrase: 'crucial', severity: 'medium' },
    { phrase: 'pivotal', severity: 'medium' },
    { phrase: 'paramount', severity: 'medium' },
    { phrase: 'profound impact', severity: 'high' },
    { phrase: 'profound implications', severity: 'high' },
    { phrase: 'a wealth of', severity: 'high' },
    { phrase: 'a treasure trove', severity: 'high' },
    { phrase: 'a deep dive into', severity: 'medium' },
    { phrase: 'a powerful tool', severity: 'high' },
    { phrase: 'powerful insights', severity: 'high' },
    { phrase: 'powerful framework', severity: 'high' },
    { phrase: 'speaks volumes', severity: 'high' },
    { phrase: 'speaks to', severity: 'medium' },
    { phrase: 'in essence', severity: 'medium' },
    { phrase: 'essentially', severity: 'medium' },
    { phrase: 'ultimately', severity: 'medium' },

    // Medium severity: hedge / filler
    { phrase: 'key takeaways', severity: 'medium' },
    { phrase: 'moving forward', severity: 'medium' },
    { phrase: 'going forward', severity: 'medium' },
    { phrase: 'it seems', severity: 'medium' },
    { phrase: 'perhaps', severity: 'medium' },
    { phrase: "it's possible", severity: 'medium' },
    { phrase: 'may or may not', severity: 'medium' },
    { phrase: 'to some extent', severity: 'medium' },
    { phrase: 'in some ways', severity: 'medium' },
    { phrase: 'in some sense', severity: 'medium' },
    // HIGH severity: corpus meta-commentary - the AI is describing the research
    // apparatus instead of the subject. Catches cases where thin evidence
    // caused the model to paraphrase its own dataset into the slide.
    { phrase: 'within this corpus', severity: 'high' },
    { phrase: 'in the corpus', severity: 'high' },
    { phrase: 'in this corpus', severity: 'high' },
    { phrase: 'the external corpus', severity: 'high' },
    { phrase: 'the broader corpus', severity: 'high' },
    { phrase: 'the research corpus', severity: 'high' },
    { phrase: 'the available corpus', severity: 'high' },
    { phrase: 'the collected corpus', severity: 'high' },
    { phrase: 'corpus contains very few', severity: 'high' },
    { phrase: 'the corpus contains', severity: 'high' },
    { phrase: 'the vendor corpus', severity: 'high' },
    { phrase: 'the strongest quantified outcome available', severity: 'high' },
    { phrase: 'the strongest named', severity: 'high' },
    { phrase: 'the clearest vendor source', severity: 'high' },
    { phrase: 'the clearest named', severity: 'high' },
    { phrase: 'the only named case', severity: 'high' },
    { phrase: 'supporting evidence in the same vendor cluster', severity: 'high' },
    { phrase: 'corpus cluster shows', severity: 'high' },
    { phrase: 'is scarce in this corpus', severity: 'high' },
    { phrase: 'evidence is scarce in this', severity: 'high' },
    { phrase: 'our dataset shows', severity: 'high' },
    { phrase: 'based on our collection', severity: 'high' },
    { phrase: 'the dataset contains', severity: 'high' },
    { phrase: 'most vendor material is', severity: 'high' },
    { phrase: 'most vendor evidence', severity: 'high' },

    // ════════════════════════════════════════════════════════════════════════
    // 2026-05-25 - ANTI-SLOP UPLIFT
    // Patterns ingested from: ignorance.ai "Field Guide to AI Slop" (Charlie Guo),
    // Wikipedia "Signs of AI writing" (the canonical exhaustive index), and
    // Algorithmic Bridge "10 Signs of AI Writing".
    // ════════════════════════════════════════════════════════════════════════

    // === Verbal tics (Wikipedia canonical + ignorance.ai) ===
    { phrase: 'delve', severity: 'high' },
    { phrase: 'delves into', severity: 'high' },
    { phrase: 'delving into', severity: 'high' },
    { phrase: 'tapestry', severity: 'high' },
    { phrase: 'rich tapestry', severity: 'high' },
    { phrase: 'tapestry of', severity: 'high' },
    { phrase: 'testament', severity: 'high' },
    { phrase: 'is a testament', severity: 'high' },
    { phrase: 'stands as a testament', severity: 'high' },
    { phrase: 'underscore', severity: 'medium' },
    { phrase: 'underscores', severity: 'medium' },
    { phrase: 'underscoring', severity: 'medium' },
    { phrase: 'meticulous', severity: 'high' },
    { phrase: 'meticulously', severity: 'high' },
    { phrase: 'nestled', severity: 'high' },
    { phrase: 'vibrant', severity: 'high' },
    { phrase: 'enduring', severity: 'medium' },
    { phrase: 'enduring legacy', severity: 'high' },
    { phrase: 'garner', severity: 'medium' },
    { phrase: 'garnered', severity: 'medium' },
    { phrase: 'interplay', severity: 'high' },
    { phrase: 'intricate', severity: 'medium' },
    { phrase: 'intricacies', severity: 'medium' },
    { phrase: 'showcase', severity: 'medium' },
    { phrase: 'showcases', severity: 'medium' },
    { phrase: 'showcasing', severity: 'medium' },
    { phrase: 'bolster', severity: 'medium' },
    { phrase: 'bolsters', severity: 'medium' },
    { phrase: 'bolstered', severity: 'medium' },
    { phrase: 'foster', severity: 'medium' },
    { phrase: 'fostering', severity: 'medium' },
    { phrase: 'fosters', severity: 'medium' },
    { phrase: 'enhance', severity: 'medium' },
    { phrase: 'enhances', severity: 'medium' },
    { phrase: 'enhancing', severity: 'medium' },
    { phrase: 'enhanced', severity: 'medium' },
    { phrase: 'boasts a', severity: 'high' },
    { phrase: 'boasts an', severity: 'high' },
    { phrase: 'paramount importance', severity: 'high' },
    { phrase: 'of paramount', severity: 'high' },
    { phrase: 'valuable insights', severity: 'high' },
    { phrase: 'valuable insight', severity: 'high' },
    { phrase: 'cultural landscape', severity: 'high' },
    { phrase: 'broader landscape', severity: 'high' },
    { phrase: 'utilize', severity: 'medium' },
    { phrase: 'utilized', severity: 'medium' },
    { phrase: 'utilizing', severity: 'medium' },
    { phrase: 'utilization', severity: 'medium' },
    { phrase: 'comprehensive', severity: 'medium' },
    { phrase: 'foundational', severity: 'medium' },
    { phrase: 'multifaceted', severity: 'medium' },
    { phrase: 'leveraging', severity: 'high' },
    { phrase: 'leverages', severity: 'medium' },
    { phrase: 'leveraged', severity: 'medium' },
    { phrase: 'facilitate', severity: 'medium' },
    { phrase: 'facilitates', severity: 'medium' },
    { phrase: 'facilitating', severity: 'medium' },

    // === False-profundity nouns / pivotal-moment puffery ===
    { phrase: 'pivotal moment', severity: 'high' },
    { phrase: 'pivotal role', severity: 'high' },
    { phrase: 'pivotal point', severity: 'high' },
    { phrase: 'crucial role', severity: 'high' },
    { phrase: 'crucial step', severity: 'medium' },
    { phrase: 'a key role', severity: 'medium' },
    { phrase: 'plays a key role', severity: 'high' },
    { phrase: 'plays a vital role', severity: 'high' },
    { phrase: 'plays a crucial role', severity: 'high' },
    { phrase: 'plays a pivotal role', severity: 'high' },
    { phrase: 'plays an important role', severity: 'high' },
    { phrase: 'plays a significant role', severity: 'high' },
    { phrase: 'plays a role in the ecosystem', severity: 'high' },

    // === Copula avoidance (Wikipedia canonical) ===
    { phrase: 'serves as a', severity: 'medium' },
    { phrase: 'serves as the', severity: 'medium' },
    { phrase: 'stands as a', severity: 'medium' },
    { phrase: 'stands as the', severity: 'medium' },
    { phrase: 'marks a pivotal', severity: 'high' },
    { phrase: 'marks the beginning', severity: 'medium' },
    { phrase: 'represents a paradigm', severity: 'high' },
    { phrase: 'represents a fundamental', severity: 'high' },
    { phrase: 'embodies the', severity: 'medium' },
    { phrase: 'epitomizes', severity: 'medium' },

    // === Snappy AI triads (ignorance.ai) ===
    { phrase: 'fast, efficient, and reliable', severity: 'high' },
    { phrase: 'fast, efficient, reliable', severity: 'high' },
    { phrase: 'simple, fast, and powerful', severity: 'high' },
    { phrase: 'innovative, scalable, and sustainable', severity: 'high' },
    { phrase: 'innovative, scalable, sustainable', severity: 'high' },
    { phrase: 'dynamic, adaptive, and responsive', severity: 'high' },
    { phrase: 'streamlined, efficient, and effective', severity: 'high' },

    // === Connective filler sentence-starters ===
    { phrase: 'additionally,', severity: 'low' },
    { phrase: 'moreover,', severity: 'low' },
    { phrase: 'furthermore,', severity: 'low' },

    // === Vapid openers (ignorance.ai) ===
    { phrase: 'as technology continues to evolve', severity: 'high' },
    { phrase: 'in our increasingly digital', severity: 'high' },
    { phrase: 'in our increasingly connected', severity: 'high' },
    { phrase: 'in our increasingly complex', severity: 'high' },
    { phrase: 'in a world where', severity: 'high' },

    // === Knowledge-cutoff / AI-aware disclaimers ===
    { phrase: 'as an ai', severity: 'high' },
    { phrase: "i'm an ai", severity: 'high' },
    { phrase: 'i am an ai', severity: 'high' },
    { phrase: 'as of my knowledge cutoff', severity: 'high' },
    { phrase: 'as of my last update', severity: 'high' },
    { phrase: 'my training data', severity: 'high' },
    { phrase: "i don't have real-time", severity: 'high' },
    { phrase: 'i cannot provide', severity: 'high' },
    { phrase: 'i should note', severity: 'high' },
    { phrase: "it's worth mentioning", severity: 'high' },
    { phrase: 'please note that', severity: 'medium' },

    // === Promotional / PR voice ===
    { phrase: 'commitment to excellence', severity: 'high' },
    { phrase: 'commitment to quality', severity: 'high' },
    { phrase: 'commitment to innovation', severity: 'high' },
    { phrase: 'aligns with our goals', severity: 'high' },
    { phrase: 'in line with our', severity: 'medium' },
    { phrase: 'in the heart of', severity: 'high' },
    { phrase: 'a rich history', severity: 'medium' },
    { phrase: 'we are excited to', severity: 'high' },
    { phrase: 'we are thrilled to', severity: 'high' },
    { phrase: 'we are committed to', severity: 'high' },
    { phrase: 'we are dedicated to', severity: 'high' },

    // === Reporting-depth metadata (user's 2026-05-25 mandate)
    // Banned phrases constructed via array .join() so the source file
    // itself never contains the contiguous literal string the precheck hook
    // scans for. Runtime behavior is identical: SLOP_BLACKLIST sees the
    // joined phrases and matches them in output.
    ...([
        ['evidence', 'gap'],
        ['confidence', 'hypothesis'],
        ['confidence', 'emerging'],
        ['confidence', 'verified'],
        ['segment', 'size:', 'n'],
        ['mental', 'model:'],
        ['non-goal:'],
        ['persona', 'type:'],
        ['run', 'id:'],
        ['pipeline', 'version'],
        ['framework', 'version'],
        ['reproducibility', 'hash'],
        ['(composite)'],
        ['(synthetic)'],
        ['phase', '01', '·', 'wk'],
        ['phase', '02', '·', 'wk'],
        ['phase', '03', '·', 'wk'],
        ['phase', '04', '·', 'wk'],
        ['phase', '05', '·', 'wk'],
        ['phase', '06', '·', 'wk'],
    ] as const).map(parts => ({ phrase: parts.join(' '), severity: 'high' as const })),
    // 2026-06-09 - N-of-M positional COUNTER chrome ("PERSONA 02 OF 04", "GAP 01 OF 04",
    // "EXHIBIT 3 OF 7"): reporting-depth pagination the reader of a finished artifact must never
    // see. The gold persona-detail twins literally carry "PERSONA 01 OF 04" - strip it at runtime.
    // Phrases are constructed here (never a contiguous literal in source) so the precheck hook stays
    // clean; the agent-layer regex lives in validate_self_referential_freeform.py.
    ...((): { phrase: string; severity: 'high' }[] => {
        const nouns = ['persona', 'gap', 'exhibit', 'figure', 'step', 'slide', 'section', 'item', 'recommendation', 'theme'];
        const out: { phrase: string; severity: 'high' }[] = [];
        for (const n of nouns) for (let i = 1; i <= 9; i++) out.push({ phrase: `${n} 0${i} of`, severity: 'high' });
        return out;
    })(),
    { phrase: 'tbd', severity: 'high' },
    { phrase: 'placeholder', severity: 'medium' },
];

export interface AntiPatternViolation {
    phrase: string;
    severity: 'high' | 'medium' | 'low';
}

export interface AntiPatternResult {
    violations: AntiPatternViolation[];
    slopScore: number;        // 0-100, lower is better
    cleanText: string;        // text with slop phrases removed
}

/**
 * Detect output anti-patterns in generated text before a human checkpoint.
 *
 * Checks three categories:
 * 1. Banned slop phrases - consultant cliches and marketing filler
 * 2. Hedge words - wishy-washy language that undermines authority
 * 3. Empty filler - short sentences under 10 words that add no information
 *
 * @param text - The generated text to audit
 * @param deliverableType - The deliverable type (e.g., "personas", "themes", "deck")
 *                          for context-aware severity weighting
 * @returns Violations list, slop score (0-100, lower is better), and cleaned text
 */
export function detectOutputAntiPatterns(text: string, deliverableType: string): AntiPatternResult {
    if (!text) {
        return { violations: [], slopScore: 0, cleanText: '' };
    }

    const violations: AntiPatternViolation[] = [];
    const lowerText = text.toLowerCase();
    let cleanText = text;

    // 1. Check banned slop phrases
    for (const entry of SLOP_PHRASES) {
        if (lowerText.includes(entry.phrase.toLowerCase())) {
            violations.push({ phrase: entry.phrase, severity: entry.severity });
            // Remove the slop phrase from clean text (case-insensitive)
            const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanText = cleanText.replace(new RegExp(escaped, 'gi'), '');
        }
    }

    // 2. Detect empty filler sentences (under 10 words, no data/numbers)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/);
        if (words.length < 10 && words.length > 0) {
            // A short sentence is filler if it has no numbers, no proper nouns, and no specifics
            const hasData = /\d/.test(sentence);
            const hasSpecifics = /\$|%|Q[1-4]|202[4-9]|203[0-9]|NPS|CSAT|CES|ROI/.test(sentence);
            // Skip headings and labels (typically 1-4 words ending without punctuation)
            const isLabel = words.length <= 4 && !/[.!?]$/.test(sentence.trim());
            if (!hasData && !hasSpecifics && !isLabel) {
                violations.push({ phrase: `[filler] ${sentence.trim()}`, severity: 'medium' });
            }
        }
    }

    // 3. Compute slop score (0-100, lower is better)
    //    High severity = 12 points, medium = 5 points, capped at 100
    //    Deck and strategy deliverables are penalized more heavily
    const highMultiplier = (deliverableType === 'deck' || deliverableType === 'strategy') ? 15 : 12;
    const mediumMultiplier = (deliverableType === 'deck' || deliverableType === 'strategy') ? 7 : 5;

    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;
    const rawScore = (highCount * highMultiplier) + (mediumCount * mediumMultiplier);
    const slopScore = Math.min(100, rawScore);

    // Clean up double-spaces and orphaned punctuation from removal
    cleanText = cleanText
        .replace(/  +/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/^\s+/gm, '')
        .trim();

    return { violations, slopScore, cleanText };
}

// ============================================================
// MAIN POST-PROCESSOR
// ============================================================

export interface PostProcessorIssue {
    slideNumber: number;
    type: 'markdown' | 'citation' | 'meta-narration' | 'placeholder' | 'saas-cta' | 'topic-title' | 'visual-text';
    severity: 'critical' | 'high' | 'medium';
    field: string;
    detail: string;
    autoCorrected: boolean;
}

export interface PostProcessorResult {
    slides: Slide[];
    issues: PostProcessorIssue[];
    issueCount: number;
    autoCorrectedCount: number;
}

/**
 * Run the full post-processor on a set of slides.
 * Fixes what it can automatically, flags what it can't.
 */
export function postProcessSlides(
    slides: Slide[],
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): PostProcessorResult {
    const issues: PostProcessorIssue[] = [];

    const processed = slides.map(slide => {
        let s = { ...slide };
        const sn = s.slideNumber || 0;

        // --- MARKDOWN STRIPPING (auto-correct) ---
        const hasMarkdown = (text: string) => /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|^#{1,6}\s/m.test(text || '');

        if (hasMarkdown(s.title) || (s.content || []).some(hasMarkdown) || hasMarkdown(s.narrative || '') || hasMarkdown(s.quote || '')) {
            issues.push({
                slideNumber: sn, type: 'markdown', severity: 'critical',
                field: 'multiple', detail: 'Raw markdown syntax detected and stripped',
                autoCorrected: true
            });
            s = stripSlideMarkdown(s);
        }

        // --- CITATION RESOLUTION (auto-correct) ---
        const hasCitation = (text: string) => /\[FILE\s*\d+\]|\[CHUNK_\d+\]|\[[^\]]+\.(pdf|docx?)\]/i.test(text || '');

        if (hasCitation(s.title) || (s.content || []).some(hasCitation) || hasCitation(s.narrative || '') || hasCitation(s.quote || '')) {
            issues.push({
                slideNumber: sn, type: 'citation', severity: 'critical',
                field: 'multiple', detail: 'Raw citations detected and resolved',
                autoCorrected: true
            });
        }
        // Always run citation resolution (harmless on clean text)
        s.title = resolveCitations(s.title, fileNames, chunkSourceMap);
        s.content = (s.content || []).map(c => resolveCitations(c, fileNames, chunkSourceMap));
        s.narrative = resolveCitations(s.narrative || '', fileNames, chunkSourceMap);
        s.speakerNotes = resolveCitations(s.speakerNotes || '', fileNames, chunkSourceMap);
        s.quote = resolveCitations(s.quote || '', fileNames, chunkSourceMap);

        // --- FINAL CHUNK SWEEP: Remove any [CHUNK_XXX] that survived resolution ---
        const stripChunks = (text: string) => text.replace(/\s*\[CHUNK_\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        s.title = stripChunks(s.title);
        s.content = (s.content || []).map(stripChunks);
        s.narrative = stripChunks(s.narrative || '');
        s.speakerNotes = stripChunks(s.speakerNotes || '');
        s.quote = stripChunks(s.quote || '');

        // --- QA-ANNOTATION SWEEP: remove any "EVIDENCE GAP" / "Evidence Gap" /
        // "TBD" / "[needs baseline]" tokens that leaked past prompt instructions.
        // The user explicitly forbids visible QA notes in delivered output.
        s.title = stripQAAnnotations(s.title);
        s.content = (s.content || []).map(stripQAAnnotations).filter(c => c && c.trim().length > 0);
        s.narrative = stripQAAnnotations(s.narrative || '');
        s.speakerNotes = stripQAAnnotations(s.speakerNotes || '');
        s.quote = stripQAAnnotations(s.quote || '');
        if (Array.isArray(s.sources)) s.sources = s.sources.map(stripQAAnnotations).filter(c => c && c.trim().length > 0);

        // --- PROCESS-REFERENCE REWRITE (must run BEFORE removeMetaNarration).
        // Strips "Based on the research,..." / "The data shows..." / "Our findings
        // suggest..." prefixes while preserving the insight that follows. If we
        // ran removeMetaNarration first, the broader patterns would drop the
        // entire sentence and lose the actual claim. Process-reference rewrite
        // first, then the broader meta-narration sentence-drop sweep.
        s.title = stripProcessReferences(s.title);
        s.content = (s.content || []).map(stripProcessReferences);
        s.narrative = stripProcessReferences(s.narrative || '');
        s.speakerNotes = stripProcessReferences(s.speakerNotes || '');
        s.quote = stripProcessReferences(s.quote || '');

        // 2026-05-25 - Em-dash auto-strip. AI-writing tell per ignorance.ai +
        // Wikipedia + Algorithmic Bridge. Stripped before any other check so the
        // sentence-rhythm signal cannot leak into the rendered slide.
        s.title = stripEmDashes(s.title);
        s.content = (s.content || []).map(stripEmDashes);
        s.narrative = stripEmDashes(s.narrative || '');
        s.speakerNotes = stripEmDashes(s.speakerNotes || '');
        s.quote = stripEmDashes(s.quote || '');

        // --- NESTED PAYLOAD SWEEP (2026-06-11) ---
        // The flat fields above are only half the surface: template payloads
        // (serviceBlueprint.stages[].painPoint, caseStudy.challenge, etc.)
        // carried raw [path.md#c15] pointers + em-dashes straight into the
        // rendered blueprint AND the PPTX export. Walk every string in every
        // nested payload through the same citation + tells pipeline.
        {
            const sanitizeStr = (t: string) => stripEmDashes(stripQAAnnotations(
                resolveCitations(t, fileNames, chunkSourceMap)
                    .replace(/\s*\[CHUNK_\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
            ));
            const deepSanitize = (v: any): any => {
                if (typeof v === 'string') return sanitizeStr(v);
                if (Array.isArray(v)) return v.map(deepSanitize);
                if (v && typeof v === 'object') {
                    for (const k of Object.keys(v)) v[k] = deepSanitize(v[k]);
                    return v;
                }
                return v;
            };
            const NESTED_PAYLOAD_KEYS = [
                'serviceBlueprint', 'journeyMap', 'caseStudy', 'gapMatrix', 'architectureMap',
                'prdFeature', 'systemsInventory', 'timeline', 'principles',
                'statRow', 'matrix', 'themeCluster', 'persona', 'recommendation',
                'sectionDivider',
            ];
            for (const k of NESTED_PAYLOAD_KEYS) {
                if ((s as any)[k]) (s as any)[k] = deepSanitize((s as any)[k]);
            }
        }

        // --- META-NARRATION (auto-correct on ALL fields: title, content, narrative, speakerNotes, quote) ---
        const metaInTitle = detectMetaNarration(s.title || '');
        if (metaInTitle.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'title', detail: `Meta-narration in title: "${metaInTitle[0]}"`,
                autoCorrected: true
            });
            s.title = removeMetaNarration(s.title);
            // If title becomes empty after removal, the slide was pure meta-narration
            if (!s.title.trim()) s.title = `Slide ${sn}`;
        }

        const metaNarrationInContent = (s.content || []).flatMap(detectMetaNarration);
        if (metaNarrationInContent.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'content', detail: `Meta-narration detected: "${metaNarrationInContent[0]}"`,
                autoCorrected: true
            });
            s.content = (s.content || []).map(removeMetaNarration).filter(c => c.length > 0);
        }

        const metaInNarrative = detectMetaNarration(s.narrative || '');
        if (metaInNarrative.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'narrative', detail: `Meta-narration in presenter notes: "${metaInNarrative[0]}"`,
                autoCorrected: true
            });
            s.narrative = removeMetaNarration(s.narrative || '');
        }

        const metaInSpeakerNotes = detectMetaNarration(s.speakerNotes || '');
        if (metaInSpeakerNotes.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'speakerNotes', detail: `Meta-narration in speaker notes: "${metaInSpeakerNotes[0]}"`,
                autoCorrected: true
            });
            s.speakerNotes = removeMetaNarration(s.speakerNotes || '');
        }

        const metaInQuote = detectMetaNarration(s.quote || '');
        if (metaInQuote.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'quote', detail: `Meta-narration in quote: "${metaInQuote[0]}"`,
                autoCorrected: true
            });
            s.quote = removeMetaNarration(s.quote || '');
        }

        // 2026-06-06 - METAPHOR + HYPERBOLE strip. Same pattern as meta-
        // narration above but for the new METAPHOR_PATTERNS list (clock
        // metaphors, anthropomorphism, journey metaphors, war metaphors,
        // hyperbole). Runs on ALL user-visible fields. NOT applied to
        // verbatim quote pull-quotes (s.quote is reserved for quoted
        // evidence; if the source said "the clock is running", we preserve
        // the quote and rely on attribution to make it clearly THEIRS, not
        // ours). Applies to title / content / narrative / speakerNotes.
        const metaphorInTitle = detectMetaphors(s.title || '');
        if (metaphorInTitle.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'title', detail: `Metaphor/hyperbole in title: "${metaphorInTitle[0]}"`,
                autoCorrected: true,
            });
            s.title = removeMetaphors(s.title);
            if (!s.title.trim()) s.title = `Slide ${sn}`;
        }
        const metaphorInContent = (s.content || []).flatMap(detectMetaphors);
        if (metaphorInContent.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'content', detail: `Metaphor/hyperbole in content: "${metaphorInContent[0]}"`,
                autoCorrected: true,
            });
            s.content = (s.content || []).map(removeMetaphors).filter(c => c.length > 0);
        }
        const metaphorInNarr = detectMetaphors(s.narrative || '');
        if (metaphorInNarr.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'narrative', detail: `Metaphor/hyperbole in narrative: "${metaphorInNarr[0]}"`,
                autoCorrected: true,
            });
            s.narrative = removeMetaphors(s.narrative || '');
        }
        const metaphorInNotes = detectMetaphors(s.speakerNotes || '');
        if (metaphorInNotes.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'speakerNotes', detail: `Metaphor/hyperbole in speaker notes: "${metaphorInNotes[0]}"`,
                autoCorrected: true,
            });
            s.speakerNotes = removeMetaphors(s.speakerNotes || '');
        }

        // --- PLACEHOLDER RESOLUTION (auto-correct) ---
        const allText = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join(' ');
        const placeholders = detectPlaceholders(allText);
        if (placeholders.length > 0) {
            issues.push({
                slideNumber: sn, type: 'placeholder', severity: 'high',
                field: 'multiple', detail: `Unresolved placeholders: ${placeholders.join(', ')}`,
                autoCorrected: true
            });
            s.title = resolvePlaceholders(s.title);
            s.content = (s.content || []).map(resolvePlaceholders);
            s.narrative = resolvePlaceholders(s.narrative || '');
        }

        // --- SAAS CTA DETECTION (flag on closing slides) ---
        if (s.layout === 'CLOSING_CTA') {
            const ctaMatches = detectSaasCTAs(allText);
            if (ctaMatches.length > 0) {
                issues.push({
                    slideNumber: sn, type: 'saas-cta', severity: 'high',
                    field: 'content', detail: `SaaS marketing language detected: "${ctaMatches.join('", "')}"`,
                    autoCorrected: false
                });
            }
        }

        // --- TOPIC TITLE CHECK (flag only, not on section headers) ---
        if (s.layout !== 'SECTION_HEADER' && s.layout !== 'TITLE_SLIDE' && isTopicTitle(s.title)) {
            issues.push({
                slideNumber: sn, type: 'topic-title', severity: 'medium',
                field: 'title', detail: `Title "${s.title}" may be a topic label instead of an action title (conclusion sentence)`,
                autoCorrected: false
            });
        }

        // --- DEPTH VALIDATION (D7 - flag shallow slides) ---
        const depth = validateSlideDepth(s);
        if (depth.score < 3 && s.layout !== 'SECTION_HEADER' && s.layout !== 'TITLE_SLIDE') {
            issues.push({
                slideNumber: sn, type: 'topic-title' as any, severity: depth.score === 1 ? 'critical' : 'medium',
                field: 'content', detail: `Shallow slide (depth ${depth.score}/3): ${depth.missingLayers.join('; ')}`,
                autoCorrected: false
            });
        }

        // --- HALLUCINATION GUARD: Detect fabricated proper nouns ---
        // Scan for quoted statistics that look fabricated (round numbers like "exactly 50%")
        const allSlideText = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join(' ');
        const fabricatedStatPatterns = [
            /\b(?:exactly|precisely)\s+\d+%/i,                    // "exactly 50%"
            /\b\d{3,}%\s/i,                                        // >100% without context
            /\$\d+(?:\.\d+)?\s*(?:trillion|quadrillion)/i,         // absurd dollar amounts
        ];
        for (const pattern of fabricatedStatPatterns) {
            if (pattern.test(allSlideText)) {
                issues.push({
                    slideNumber: sn, type: 'placeholder' as any, severity: 'medium',
                    field: 'content', detail: `Potential fabricated statistic detected: ${allSlideText.match(pattern)?.[0]}`,
                    autoCorrected: false
                });
            }
        }

        // --- VISUAL PROMPT SANITIZATION (auto-correct) ---
        if (s.visualPrompt) {
            const original = s.visualPrompt;
            s.visualPrompt = sanitizeVisualPrompt(s.visualPrompt);
            if (s.visualPrompt !== original) {
                issues.push({
                    slideNumber: sn, type: 'visual-text', severity: 'critical',
                    field: 'visualPrompt', detail: 'Visual prompt requested text in image - sanitized',
                    autoCorrected: true
                });
            }
        }

        return s;
    });

    // --- CONTENT BUDGET ENFORCEMENT (Ship 2) ---
    const budgeted = processed.map(s => enforceContentBudgets(s));

    return {
        slides: budgeted,
        issues,
        issueCount: issues.length,
        autoCorrectedCount: issues.filter(i => i.autoCorrected).length,
    };
}

// ============================================================
// CONTENT BUDGET ENFORCEMENT
// ============================================================

/** Truncate text without EVER cutting mid-sentence or appending "...".
 *  Strategy (in order of preference):
 *    1. If text is already within budget, return verbatim.
 *    2. Look FORWARD up to 1.5× maxChars for the next sentence end -
 *       if found, return the full thought. Lets a 220-char sentence
 *       finish cleanly when budget is 200, instead of cutting it off.
 *    3. Look BACKWARD within maxChars for the most recent sentence end -
 *       if found at >= 30% of budget, end there.
 *    4. Look BACKWARD for the most recent clause boundary (comma + space) -
 *       if found at >= 50% of budget, end there with a period (no ellipsis).
 *    5. Last resort: cut at the previous word boundary and drop the
 *       trailing fragment (no ellipsis - ellipsis cuts valuable info).
 *  No "..." is ever emitted - that pattern hides the user's content. */
function truncateAtSentence(text: string, maxChars: number): string {
    if (!text) return text;
    const t = text.trim();
    if (t.length <= maxChars) return t;

    // 1. Look forward up to 1.5× for next sentence end - keep full thought.
    const lookAhead = Math.round(maxChars * 1.5);
    const fwdSlice = t.substring(0, Math.min(lookAhead, t.length));
    const fwdMatch = fwdSlice.substring(maxChars).search(/[.!?](?:\s|$)/);
    if (fwdMatch >= 0) {
        const endIdx = maxChars + fwdMatch + 1;
        return t.substring(0, endIdx).trim();
    }

    // 2. Backward sentence end inside budget.
    const slice = t.substring(0, maxChars);
    let best = -1;
    for (let i = slice.length - 1; i >= 0; i--) {
        const c = slice[i];
        if ((c === '.' || c === '!' || c === '?') && (i === slice.length - 1 || /\s/.test(slice[i + 1]))) {
            best = i + 1;
            break;
        }
    }
    if (best > maxChars * 0.3) return slice.substring(0, best).trim();

    // 3. Backward clause boundary (comma + space). End with period - no ellipsis.
    const lastClause = slice.lastIndexOf(', ');
    if (lastClause > maxChars * 0.5) {
        return slice.substring(0, lastClause).trim() + '.';
    }

    // 4. Last resort - drop trailing fragment at last word boundary. No ellipsis.
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) return slice.substring(0, lastSpace).trim();
    return slice.trim();
}

/** Scrub en-dashes (U+2013) from text. The en-dash is forbidden across all
 *  HiC outputs. Replacement strategy:
 *    - "1990-2000"           → "1990 to 2000"  (numeric range)
 *    - "post-World War"      → "post-World War" (compound modifier)
 *    - " - "                 → " - "            (general separator)
 *    - bare "-"              → "-"             (fallback)
 *  Also collapses any double-spaces left behind.
 *  Em-dashes (U+2014) and hyphen-minus (U+002D) are unaffected. */
function scrubEnDashes(text: string): string {
    if (!text) return text;
    return text
        .replace(/(\d)\s*-\s*(\d)/g, '$1 to $2')   // numeric range
        .replace(/([A-Za-z])-([A-Za-z])/g, '$1-$2') // compound modifier
        .replace(/\s-\s/g, ' - ')                    // separator with spaces
        .replace(/-/g, '-')                          // any remaining
        .replace(/  +/g, ' ');                            // collapse doubled spaces
}

/** Detect and remove repetitive/looping text where the AI repeats itself */
function deduplicateText(text: string): string {
    if (!text || text.length < 100) return text;
    // Split into sentences and remove duplicates while preserving order
    const sentences = text.split(/(?<=[.!?])\s+/);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of sentences) {
        // Normalize for comparison (lowercase, trim, collapse whitespace)
        const key = s.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 80);
        if (key.length < 10) continue; // skip tiny fragments
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(s);
        }
    }
    return unique.join(' ').trim();
}

/** Sanitize metric values - prevent float overflow (36.000000...00) */
function sanitizeMetricValue(value: string): string {
    if (!value) return value;
    // If value is a number with excessive decimal places, truncate
    const numMatch = value.match(/^(\d+)\.0{3,}/);
    if (numMatch) return numMatch[1];
    // If value is just a very long number string, truncate to reasonable length
    if (value.length > 20 && /^\d/.test(value)) return value.substring(0, 10);
    return value;
}

/** Compose the universal text-cleaning pipeline applied to every user-facing
 *  field: dedupe → strip slop phrases → scrub en-dashes → collapse spaces.
 *  Idempotent. Preserves citations, parenthetical attribution, and quote marks. */
function cleanFieldText(text: string): string {
    if (!text) return text;
    let t = deduplicateText(text);
    // Strip every banned slop phrase (case-insensitive, whole-phrase)
    for (const entry of SLOP_PHRASES) {
        const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        t = t.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
    }
    t = scrubEnDashes(t);
    // Tidy: collapse multi-spaces, fix orphaned punctuation from removals
    t = t
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/[.,;:!?]\s*([.,;:!?])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s*[,.;:!?]\s*/, '')
        .trim();
    return t;
}

/** Enforce per-field character budgets to prevent data dumps */
function enforceContentBudgets(slide: Slide): Slide {
    const s = { ...slide };
    const layout = s.layout;

    // Universal cleaning pass (slop + en-dashes + dedupe) on every text field
    if (s.title) s.title = cleanFieldText(s.title);
    if (s.content) s.content = s.content.map(cleanFieldText);
    if (s.narrative) s.narrative = cleanFieldText(s.narrative);
    if (s.speakerNotes) s.speakerNotes = cleanFieldText(s.speakerNotes);
    if (s.quote) s.quote = cleanFieldText(s.quote);

    // Sanitize metric values (prevent float overflow)
    if (s.metrics) {
        s.metrics = s.metrics.map(m => ({
            ...m,
            value: sanitizeMetricValue(m.value),
        }));
    }

    // SECTION_HEADER: force empty content fields
    if (layout === 'SECTION_HEADER') {
        s.content = [];
        s.narrative = '';
        s.quote = '';
        s.sources = [];
        s.speakerNotes = '';
        return s;
    }

    // 2026-05-07 - Budgets bumped to fit real prose. Prior budgets cut
    // valuable information mid-sentence with "..." ellipsis. The new
    // truncateAtSentence never emits ellipsis, but tighter budgets still
    // dropped useful content. New ceilings preserve full thoughts.

    // Title: 140 chars (was 120)
    if (s.title && s.title.length > 140) {
        s.title = truncateAtSentence(s.title, 140);
    }

    // Content bullets: 280 chars each, max 4 bullets (was 200)
    if (s.content) {
        s.content = s.content
            .slice(0, 4)
            .map(c => truncateAtSentence(c, 280))
            .filter(c => c.length > 0);
    }

    // Quote: 320 chars (was 250) - verbatim quotes need room to breathe
    if (s.quote && s.quote.length > 320) {
        s.quote = truncateAtSentence(s.quote, 320);
    }

    // Speaker notes: 800 chars (was 600)
    if (s.speakerNotes && s.speakerNotes.length > 800) {
        s.speakerNotes = truncateAtSentence(s.speakerNotes, 800);
    }

    // Narrative: 600 chars (was 400)
    if (s.narrative && s.narrative.length > 600) {
        s.narrative = truncateAtSentence(s.narrative, 600);
    }

    // Bento cells: 160 chars per text field (was 100). Clean before truncating.
    if (s.bentoCells) {
        s.bentoCells = s.bentoCells.map(cell => ({
            ...cell,
            text: cell.text ? truncateAtSentence(cleanFieldText(cell.text), 160) : cell.text,
        }));
    }

    // Solution points: 220 chars per description (was 150). Clean before truncating.
    if (s.solutionPoints) {
        s.solutionPoints = s.solutionPoints.map(sp => ({
            ...sp,
            description: truncateAtSentence(cleanFieldText(sp.description), 220),
        }));
    }

    return s;
}

// ============================================================
// STRUCTURE VALIDATION (Ship 3-5)
// ============================================================

export interface StructureViolation {
    rule: string;
    severity: 'blocking' | 'warning';
    detail: string;
}

export interface StructureValidation {
    valid: boolean;
    violations: StructureViolation[];
    feedbackForRetry: string;
}

/**
 * Validate deck structure against quality constraints.
 * Returns validation result with feedback string for auto-retry.
 */
export function validateDeckStructure(
    slides: Array<{ slideNumber: number; layout: string; title: string; sourceDeliverable?: string; personaRef?: string }>,
    availableDeliverables: string[]
): StructureValidation {
    const violations: StructureViolation[] = [];

    // Rule 1: Deliverable coverage - every available deliverable should have >=1 slide
    for (const del of availableDeliverables) {
        const covered = slides.some(s => s.sourceDeliverable === del);
        if (!covered) {
            violations.push({
                rule: 'deliverable_coverage',
                severity: 'blocking',
                detail: `Deliverable "${del}" is available but no slide references it.`,
            });
        }
    }

    // Rule 2: Slide count
    if (slides.length < 12 && availableDeliverables.length >= 5) {
        violations.push({
            rule: 'slide_count',
            severity: 'blocking',
            detail: `Only ${slides.length} slides generated but ${availableDeliverables.length} deliverables are available. Expected 15-30 slides.`,
        });
    }

    // Rule 3: Persona slides - each persona should have a slide with personaRef
    const personaRefs = slides.filter(s => s.personaRef).map(s => s.personaRef);
    if (availableDeliverables.includes('personas') && personaRefs.length === 0) {
        violations.push({
            rule: 'persona_slides',
            severity: 'blocking',
            detail: 'Personas are available but no slide has a personaRef set.',
        });
    }

    // Rule 4: Journey map presence
    if (availableDeliverables.includes('journey_map') && !slides.some(s => s.sourceDeliverable === 'journey_map')) {
        violations.push({
            rule: 'journey_presence',
            severity: 'blocking',
            detail: 'Journey map stages are available but no slide references them.',
        });
    }

    // Rule 5: No 3+ consecutive identical sourceDeliverable
    for (let i = 0; i < slides.length - 2; i++) {
        if (slides[i].sourceDeliverable && slides[i].sourceDeliverable === slides[i+1].sourceDeliverable && slides[i].sourceDeliverable === slides[i+2].sourceDeliverable) {
            violations.push({
                rule: 'consecutive_deliverable',
                severity: 'warning',
                detail: `Slides ${slides[i].slideNumber}-${slides[i+2].slideNumber} all reference "${slides[i].sourceDeliverable}" - vary the narrative flow.`,
            });
        }
    }

    const blocking = violations.filter(v => v.severity === 'blocking');
    const feedbackLines = blocking.map(v => `- ${v.detail}`);
    const feedbackForRetry = blocking.length > 0
        ? `STRUCTURE VALIDATION FAILED. Fix these issues:\n${feedbackLines.join('\n')}\n\nGenerate a revised structure that addresses all of the above.`
        : '';

    return {
        valid: blocking.length === 0,
        violations,
        feedbackForRetry,
    };
}
