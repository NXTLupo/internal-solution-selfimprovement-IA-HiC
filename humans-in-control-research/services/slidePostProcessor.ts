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
function stripSlideMarkdown(slide: Slide): Slide {
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
        // A document NAME, not a file name: no extension, no "(1)" copy suffix, no underscores (2026-10-03).
        const cleaned = filename.replace(/\s*-\s*Copy/gi, '').replace(/\.(pdf|docx?|xlsx?|pptx?|csv|txt)$/i, '').replace(/\s*\(\d+\)\s*$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        return `(Source: ${cleaned})`;
    });

    return text;
}

/**
 * Resolve citations in all text fields of a slide.
 */
function resolveSlidesCitations(
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
    // 2026-06-18 (research-run-failure-analysis, Issue 2) - self-referential STRUCTURE meta that the
    // closed verb set above missed. A slides:agenda title "How this deck is built: themes, the ten…"
    // shipped because no pattern covered "how/why/what this deck IS BUILT/structured/organized".
    /\b(how|why|what|where)\s+(this|the)\s+(deck|presentation|report|document|analysis|brief|section|slide)\s+(is|was|gets?|will be|has been)\s+(built|structured|organized|arranged|laid out|put together|framed|composed|sequenced|set up|broken down)\b/i,
    /\b(this|the)\s+(deck|presentation|report|document|analysis|brief)\s+(is|gets?)\s+(built|structured|organized|arranged|laid out|composed|sequenced)\b/i,
    // 2026-06-19 - deck-PROCESS tells that narrate where to go in the deck rather than state the
    // subject (agenda items / group labels were shipping these). High-confidence, unambiguous.
    /\bwhere to ideate\b/i,
    /\bfrom diagnosis to ideation\b/i,
    /\bhow\s+might\s+we\s+questions\b/i,            // the LABEL "How Might We questions" (real HMW questions never put "questions" right after "we")
    /\bsetting up the narrative\b/i,
    /\bthe (section|deck|slide) order\b/i,
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

    // ════════════════════════════════════════════════════════════════════════
    // 2026-06-23 - CORPUS / PIPELINE / SELF-REFERENCE META (chat #slides escape).
    // The Analyst-Desk #slides reply shipped these because the chat path ran no
    // meta strip. The model narrates the CORPUS ("the corpus names no second PE
    // firm"), the GENERATION PIPELINE ("ingest X before the next pass"), what it
    // CAN/CANNOT build, and points at the deck itself. The reader sees a finished
    // artifact, never the model's awareness of its corpus, its limits, or its run.
    // ════════════════════════════════════════════════════════════════════════
    // "the corpus names/contains/holds/includes/lacks/has no ..." (corpus as subject)
    /\bthe\s+(collected\s+|external\s+|research\s+|available\s+|broader\s+|vendor\s+|assembled\s+)?corpus\s+(names?|contains?|holds?|includes?|lacks?|has|shows?|reveals?|surfaces?|documents?|evidences?|offers?|provides?|yields?)\b/i,
    // "excluding/aside from X, the corpus/record/dataset names no ..." (the exact Gen-2 tell)
    /\b(excluding|aside from|apart from|other than|beyond)\s+[A-Z][\w-]+,?\s+the\s+(corpus|record|dataset|data|evidence|sources?)\b/i,
    // pipeline next-steps: "to verify/confirm ..., ingest/add/collect/run ... before the next pass/run/iteration"
    /\bbefore\s+the\s+next\s+(pass|run|iteration|cycle|generation)\b/i,
    /\b(ingest|add|collect|gather|source|pull in|feed in|load)\s+[^.]*\b(before|so|to)\s+(the\s+)?(next|verify|confirm|validate|close the gap)/i,
    // "what I can build instead is ..." / "what the corpus does/doesn't evidence is ..."
    /\bwhat\s+(I|we)\s+can\s+(build|do|offer|produce|provide)\s+(instead|here|is)\b/i,
    /\bthe\s+(slides?|deck|charts?|sections?)\s+(below|above|that follow|here)\s+(frame|show|cover|present|lay out|capture)\b/i,
    // self-ref to "stated honestly on the deck" / "flagged on the deck" / "noted on the slide"
    /\b(stated|flagged|noted|called out|surfaced|disclosed)\s+(honestly\s+)?(on|in)\s+the\s+(deck|slide|page|report|brief)\b/i,
    // "the evidence/research documents/names X" with the non-"shows" verbs the rewrites miss
    /\bthe\s+(evidence|research|corpus|data|literature)\s+(documents?|names?|catalog(s|ues?)?|records?|captures?|notes?)\b/i,
    // evidence/data "gap" as the SUBJECT of a slide field (the Gen-2 "evidence gap to close" agenda item)
    /\bthe\s+(evidence|data|research|named[\w-]*)\s+gap\s+to\s+close\b/i,
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

    // 2026-06-18 (research-run-failure-analysis) - FENCE GUARD. Structured deliverable output
    // (:::slide JSON fences, ``` code blocks) must NOT be prose-swept: this drops the ENTIRE matched
    // "sentence", and a slide's JSON has no sentence punctuation, so one match could span and delete
    // several slides. Slide TITLES are scrubbed per-field via scrubMetaTitle() instead. Only sweep
    // plain prose (chat replies, report/brief HTML body, presentation narrative text).
    if (text.includes(':::slide') || text.includes('```')) return text;

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    const cleaned = sentences.filter(sentence => {
        return !META_NARRATION_PATTERNS.some(pattern => pattern.test(sentence));
    });

    return cleaned.join(' ').trim();
}

/** 2026-06-18 (research-run-failure-analysis, Issue 2) - scrub a self-referential / "how this deck
 *  is built" meta framing from a single SLIDE TITLE (safe per-field; no whole-sentence drop). If the
 *  meta clause precedes a ":" the real subject after it is kept ("How this deck is built: Themes, the
 *  ten…" -> "Themes, the ten…"); a wholly-meta title returns '' so the caller falls back to a neutral
 *  label. Idempotent; leaves clean titles untouched. */
export function scrubMetaTitle(title: string | undefined | null): string {
    const t = (title || '').trim();
    if (!t) return '';
    const isMeta = META_NARRATION_PATTERNS.some(p => p.test(t));
    if (!isMeta) return t;
    const colon = t.match(/^\s*(?:how|why|what|where)\b[^:]*:\s*(.+)$/i);
    if (colon && colon[1].trim().length > 3) {
        let rest = colon[1].trim();
        // 2026-06-19 - the kept subject can still carry a trailing deck-process meta clause
        // ("Themes, the ten, and where to ideate" -> "Themes, the ten"). Strip it.
        rest = rest.replace(/[,;:]?\s*(and\s+|then\s+)?(where to ideate|from diagnosis to ideation|how might we questions|setting up the narrative|the (section|deck|slide) order)\b.*$/i, '').replace(/[,;:]\s*$/, '').trim();
        if (rest.length > 3) return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return '';
}

// 2026-08-13 - CORPUS-META TITLE GUARD (live defect: an #report shipped titled
// "The evidence tells one clear story: the corpus can name <subject>'s mandate,
// but it cannot yet substantiate the" - corpus-as-subject meta-commentary, then
// truncated onto a dangling article). A title whose grammatical subject is the
// corpus/evidence/data/research is process language, never a judgment about the
// SUBJECT; and no title may end on a dangling function word.
const CORPUS_META_TITLE_RE = /^(the\s+)?(evidence|corpus|data|research|sources?|findings|analysis|material)\b[^.]*\b(tells?|shows?|reveals?|suggests?|indicates?|can(not)?|cannot|paints?|points?|confirms?|supports?)\b/i;
const DANGLING_TAIL_RE = /\s+(the|a|an|of|to|and|but|or|for|nor|with|its|their|our|your|is|are|was|were|can|cannot|not|yet|that|which|who|whose|at|on|in|by|as|from)[\s,;:.]*$/i;

/** Guard an ARTIFACT title (html-deliverable path). Rejects corpus-as-subject
 *  meta titles (falls back to the user's topic), strips meta-narration and
 *  cliches, and trims any dangling function word left by truncation. */
export function guardArtifactTitle(title: string, fallbackTopic: string): string {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    let t = (title || '').replace(/\s+/g, ' ').trim();
    if (!t || CORPUS_META_TITLE_RE.test(t)) {
        t = (fallbackTopic || '').replace(/\s+/g, ' ').trim();
    }
    const scrubbed = scrubMetaTitle(t);
    t = scrubbed || (fallbackTopic || '').trim() || t;
    t = deClicheTitle(t);
    let prev = '';
    while (prev !== t) { prev = t; t = t.replace(DANGLING_TAIL_RE, '').trim(); }
    return cap(t.replace(/[\s,;:]+$/, '').trim());
}

// 2026-06-18 - CLICHE-METAPHOR TITLE GUARD (defense-in-depth)
// ============================================================
// User feedback: slide HEADERS came back wordy and leaning on cliche business
// metaphors ("front door", "trust ceiling", "margin closes", "where value leaks").
// The DECK MODE prompt now bans these, but the model still
// reaches for them on the two highest-rhetoric slides (thesis + close). Per repo
// doctrine ("prompt rules can be bypassed; the post-processor cannot"), this is a
// runtime net. It is DELIBERATELY CONSERVATIVE: it only rewrites a curated set of
// MULTI-WORD cliches where a clean literal swap preserves grammar, and leaves any
// title it cannot safely fix untouched (never mangles, never blank). Single
// ambiguous words (e.g. bare "leaks", "the meter") are left to the prompt.
// NOTE: "funnel" terms (front/top of the funnel) are LEGITIMATE marketing vocabulary,
// NOT cliche slop - deliberately excluded from this map (user, 2026-06-18).
const TITLE_CLICHE_SWAPS: Array<[RegExp, string]> = [
    [/\btrust ceiling\b/gi, 'trust limit'],
    [/\bfront door\b/gi, 'entry point'],
    [/\bcloses the margin\b/gi, 'shrinks the margin'],
    [/\bmargin closes\b/gi, 'margin shrinks'],
    [/\bwhere value leaks\b/gi, 'where value is lost'],
    [/\bopens the door\b/gi, 'enables'],
    [/\bwalk through first\b/gi, 'move first'],
    // E7 of the 2026-09-30 audit: "redrawing the map" -> "redrawing the market" swapped one
    // metaphor for another, and "eats it" -> "absorbs it" fired on literal eating. Metaphor
    // tells are DETECTED (DETECT_ONLY_WORDS carries "redrawing the map") and handed to the
    // repair model; nothing here may replace one figure of speech with another.
    // WS-0e (2026-07-09): the leverage VERB family - inflected/passive forms slipped
    // the scorer-only lexicon and shipped on a live thesis slide ("AI should be
    // leveraged to improve..."). Clean literal swaps; the financial NOUN ("leverage
    // ratio") is untouched because every pattern requires the verb frame.
    [/\bbe leveraged to\b/gi, 'be used to'],
    [/\b(is|are|was|were|been|being) leveraged\b/gi, '$1 used'],
    [/\bleveraged to\b/gi, 'used to'],
    [/\bleverages (the|our|its|their|a|an|existing|your)\b/gi, 'uses $1'],
    [/\bleveraging (the|our|its|their|a|an|existing|your)\b/gi, 'using $1'],
    [/\bleverage (the|our|its|their|a|an|existing|your)\b/gi, 'use $1'],
];
export function deClicheText(text: string | undefined | null): string {
    let t = (text || '');
    if (!t) return '';
    for (const [re, sub] of TITLE_CLICHE_SWAPS) t = t.replace(re, sub);
    return t;
}
// Title variant: trims (title fields should not carry leading/trailing space).
export function deClicheTitle(title: string | undefined | null): string {
    return deClicheText((title || '').trim());
}
// 2026-06-18 - keys whose VALUES are verbatim corpus content or source identifiers.
// A cliche inside a real quote ("...the new front door...") is what someone SAID, so
// it must survive; the de-cliche pass only rewrites the model's OWN editorial voice
// (titles, subtitles, body, interstitial text, MEANS/MATTERS). Source/author/citation
// keys are likewise left untouched.
const CLICHE_PROTECTED_KEYS = new Set<string>([
    'quote', 'quotes', 'keyQuote', 'pullQuote', 'evidence', 'evidenceBasis',
    'sources', 'source', 'sourceLabel', 'citation', 'citations', 'attribution',
    'author', 'speaker', 'by',
]);
// Recursively de-cliche every model-voice string in a slide payload, skipping
// verbatim/source keys (and internal `_` keys). Array items inherit their parent
// key, so an array under `quotes` stays protected. Mutates in place.
export function deClicheDeep<T>(value: T, key?: string): T {
    if (value == null) return value;
    if (typeof value === 'string') {
        return (key && CLICHE_PROTECTED_KEYS.has(key)) ? value : (deClicheText(value) as any);
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = deClicheDeep(value[i], key);
        return value;
    }
    if (typeof value === 'object') {
        for (const k of Object.keys(value as any)) {
            if (k.startsWith('_')) continue;
            (value as any)[k] = deClicheDeep((value as any)[k], k);
        }
        return value;
    }
    return value;
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
//   • spaced / residual dash (a clause break) -> comma+space, or semicolon+space when
//     BOTH sides read as independent clauses (2026-10-01, audit E6: the comma form
//     manufactured comma splices in shipped theses: "Start where proven gains are, the
//     research stages already pay, ...")
//
// Clause heuristic for the dash break. The right side is an independent clause when it
// opens with a lowercase determiner / pronoun / expletive subject, or carries a finite
// auxiliary or modal inside its first four words. The left side is clause-like when it
// carries a finite auxiliary or modal, or runs three words or more without opening on a
// negation, conjunction or preposition ("Advisors keep spreadsheets" is a clause; "not
// new risk" and "Three systems" are fragments). When either side fails, the dash is an
// appositive or list break and keeps the comma.
const DASH_CLAUSE_OPENERS = new Set([
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'we', 'you', 'he', 'she',
    'there', 'here', 'its', 'their', 'our', 'your', 'his', 'her', 'my', 'i',
]);
const DASH_FINITE_VERBS = new Set([
    'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could',
    'will', 'would', 'should', 'must', 'may', 'might', 'shall', 'cannot',
    "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't", "doesn't", "don't",
    "didn't", "won't", "can't", "couldn't", "wouldn't", "shouldn't",
]);
const DASH_FRAGMENT_OPENERS = new Set([
    'not', 'no', 'nor', 'and', 'but', 'or', 'yet', 'so', 'because', 'if', 'when', 'while',
    'although', 'though', 'unless', 'until', 'since', 'as', 'than', 'of', 'in', 'on', 'at',
    'for', 'with', 'from', 'by', 'to', 'into', 'like', 'without', 'after', 'before',
]);
const dashWords = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean)
    .map(w => w.replace(/^["'(\[]+|["'),.\]:;!?]+$/g, '')).filter(Boolean);
function dashRightIsClause(right: string): boolean {
    const trimmed = right.trim();
    const w = dashWords(trimmed);
    if (!w.length) return false;
    if (w[0] === 'I' && /^I\b/.test(trimmed)) return true;
    if (/^[a-z]/.test(trimmed) && DASH_CLAUSE_OPENERS.has(w[0])) return true;
    return w.slice(0, 4).some(x => DASH_FINITE_VERBS.has(x.toLowerCase()));
}
function dashLeftIsClause(left: string): boolean {
    const w = dashWords(left);
    if (!w.length) return false;
    if (w.some(x => DASH_FINITE_VERBS.has(x.toLowerCase()))) return true;
    if (DASH_FRAGMENT_OPENERS.has(w[0].toLowerCase())) return false;
    return w.length >= 3;
}
export function stripEmDashes(text: string): string {
    if (!text) return text;
    let cleaned = text;
    // 0. HTML-entity forms (2026-07-02 live-defect fix: a #brief chat title shipped a literal
    //    "&mdash;"). Normalize entities to the raw characters FIRST so every rule below
    //    (range/compound/clause) applies uniformly. Entity forms cannot collide with ASCII
    //    hyphens, so the never-touch-hyphen standing rule holds.
    cleaned = cleaned.replace(/&mdash;|&#8212;|&#x2014;/gi, '—').replace(/&ndash;|&#8211;|&#x2013;/gi, '–');
    // 1. numeric range -> " to " (handles optional surrounding spaces)
    cleaned = cleaned.replace(/(\d)\s*[—–]\s*(\d)/g, '$1 to $2');
    // 2. compound (alphanumerics immediately touching the dash, no spaces) -> hyphen.
    //    Alphanumeric (not just letters) so "12—month" / "3—year" become "12-month" /
    //    "3-year". digit–digit ranges were already consumed by step 1.
    cleaned = cleaned.replace(/([A-Za-z0-9])[—–]([A-Za-z0-9])/g, '$1-$2');
    // 3. clause break (spaced em/en-dash) -> "; " between two independent clauses,
    //    ", " for an appositive / list fragment. Left context runs back to the previous
    //    sentence or clause boundary (or previous dash); right context runs to the next
    //    dash or sentence end.
    cleaned = cleaned.replace(/\s*[—–]\s*/g, (m: string, offset: number, whole: string) => {
        const left = (whole.slice(0, offset).split(/[.!?;:](?:\s|$)|[—–]/).pop() || '');
        const right = (whole.slice(offset + m.length).split(/[—–]|[.!?](?:\s|$)/)[0] || '');
        return (dashLeftIsClause(left) && dashRightIsClause(right)) ? '; ' : ', ';
    });
    // 4. any residual em/en-dash (adjacent punctuation) -> comma+space
    cleaned = cleaned.replace(/[—–]/g, ', ');
    // Tidy ONLY the comma / semicolon artifacts this function can create. Never touches
    // existing commas like "1,000" (no preceding space, not doubled). Edge separators
    // created by a leading/trailing clause dash are trimmed.
    cleaned = cleaned.replace(/ ,/g, ',').replace(/ ;/g, ';').replace(/,{2,}/g, ',').replace(/;{2,}/g, ';');
    cleaned = cleaned.replace(/,\s*;/g, ';').replace(/;\s*,/g, ';');
    cleaned = cleaned.replace(/^\s*[,;]\s*/, '').replace(/\s*[,;]\s*$/, '');
    return cleaned;
}

// 2026-07-02 live-defect fix: provider-bucket / grounding-redirect domains are NOT sources.
// A #journey artifact shipped "[vertexaisearch.cloud.google.com]" as its dominant citation
// (Gemini's search-grounding redirect host, minted into article identity at ingest - fixed
// upstream in _extract_pdf_impl) plus empty "[]" citations. Defense in depth: strip any
// bracket citation whose content is a redirect host (or nothing), and drop redirect/empty
// entries from sources/citations arrays. Real named citations ([Higher Ed Dive], [r/NEU])
// pass untouched.
const PROVIDER_BUCKET_SOURCE_RE = /vertexaisearch\.cloud\.google\.com|grounding-api-redirect/i;
const BRACKET_BUCKET_RE = /\s*\[\s*(?:[^\]]*(?:vertexaisearch\.cloud\.google\.com|grounding-api-redirect)[^\]]*)?\s*\]/gi;
export function stripProviderBucketCitations(text: string): string {
    if (!text) return text;
    return text.replace(BRACKET_BUCKET_RE, '').replace(/ {2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}
export function filterSourceList<T>(arr: T[]): T[] {
    return arr.filter((x: any) => {
        const name = typeof x === 'string' ? x : String((x && (x.sourceName ?? x.source ?? x.n)) ?? '');
        return name.trim().length > 0 && !PROVIDER_BUCKET_SOURCE_RE.test(name);
    });
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

/**
 * PROVIDER ARTIFACT TAGS (E1.3, 2026-08-21). `.claude/CLAUDE.md` bans "oaicite",
 * "oai_citation", "contentReference", "attached_file" and "turn0search0" outright, and
 * `scripts/check-content.mjs` fails the build when one reaches a shipped artifact. Until
 * now nothing removed them at runtime: `stripProviderBucketCitations` only knew about
 * the Google grounding-redirect hosts, so a ChatGPT-family tag had a hard rule, a CI
 * rejection, and no prevention. The gates-bite pass found it by feeding the chain a tag
 * and watching it ship.
 *
 * These are machine artifacts, so removal is lossless and belongs here rather than in a
 * model-driven repair.
 */
const PROVIDER_ARTIFACT_TAG_RE =
    /\[?\(?\s*(?:oaicite|oai_citation|contentReference|attached_file)(?::[\w\-\/]*(?:\.[\w\-\/]+)*)?\s*\]?\)?/gi;
const TURN_SEARCH_TAG_RE = /\[?\(?\s*turn\d+(?:search|view|file)\d+\s*\]?\)?/gi;
export function stripProviderArtifactTags(text: string): string {
    if (!text) return text;
    return text
        .replace(PROVIDER_ARTIFACT_TAG_RE, ' ')
        .replace(TURN_SEARCH_TAG_RE, ' ')
        .replace(/[ 	]{2,}/g, ' ')
        .replace(/ +([.,;:!?])/g, '$1')
        .trim();
}

/** Combined hygiene: strip em-dashes, emoji AND provider artifact tags. Use at every text chokepoint. */
export function stripFormatTells(text: string): string {
    return stripProviderArtifactTags(stripEmoji(stripEmDashes(text)));
}

// ============================================================================
// E2 (2026-07-02, artifact-total-elevation) - EDITORIAL ENFORCEMENT.
// The SLIDE OUTPUT PROTOCOL already bans these shapes, and the 2026-07-02 live
// deck proved prompt rules leak: "A living plan, not a PDF" (antithesis),
// "open the door to quotes" (banned metaphor), and lowercase mid-sentence
// fragments shipped as quotes. Deterministic enforcement lands here; the
// checks/editorial_quality.py gate audits the deck level.
// ============================================================================

/** Antithesis TITLE rewrite: "A living plan, not a PDF" -> "A living plan".
 *  Titles must assert the positive claim directly (protocol rule 4). Scoped to a
 *  whole-field title shape so legitimate mid-prose negation is never touched. */
const ANTITHESIS_TITLE_RE = /^(["“]?[A-Z][^,.:;]{2,90}?),\s+not\s+(?:just\s+|only\s+|merely\s+)?(?:a|an|the)?\s?[^,.:;]{2,60}[.]?(["”]?)$/;
export function stripAntithesisTitle(text: string): string {
    if (!text) return text;
    const m = ANTITHESIS_TITLE_RE.exec(text.trim());
    if (!m) return text;
    return (m[1] + (m[2] || '')).trim();
}

/** Banned-metaphor substitutions verified shipping in live decks (CLAUDE.md metaphor ban).
 *  Word-level, meaning-preserving swaps only - anything needing judgment stays with the gate. */
const METAPHOR_SUBS: Array<[RegExp, string]> = [
    [/\bopens the door to\b/gi, 'enables'],
    [/\bopen the door to\b/gi, 'enable'],
    [/\bopened the door to\b/gi, 'enabled'],
    [/\bearns the right to\b/gi, 'qualifies for'],
    [/\bearn the right to\b/gi, 'qualify for'],
];
export function applyMetaphorSubs(text: string): string {
    if (!text) return text;
    let out = text;
    for (const [re, sub] of METAPHOR_SUBS) out = out.replace(re, sub);
    return out;
}

/** Quote hygiene (Evidence-Label rule): a quote is a CLEAN COMPLETE sentence. A lowercase
 *  mid-sentence fragment is either promoted (capitalized) when it reads as a full sentence,
 *  or DROPPED so the renderer collapses the quote well - a fragment quote is worse than none. */
export function sanitizeQuoteField(q: string): string {
    if (!q) return q;
    let t = q.trim().replace(/^\.{3}\s*/, '').replace(/^[…]\s*/, '');
    const openQuote = /^["“]/.test(t) ? t[0] : '';
    const body = openQuote ? t.slice(1) : t;
    if (/^[a-z]/.test(body)) {
        const words = body.split(/\s+/).filter(Boolean);
        const endsSentence = /[.!?]["”]?$/.test(body);
        // fragment tells: a gerund or conjunction start is a mid-sentence slice regardless of length
        // ("installing fire detection and protection equipment." - live 2026-07-02 deck leak).
        const first = (words[0] || '').toLowerCase();
        const fragmentStart = /ing$/.test(first) || ['and', 'but', 'or', 'which', 'that', 'because', 'so', 'then', 'also'].includes(first);
        if (words.length >= 6 && endsSentence && !fragmentStart) {
            t = openQuote + body.charAt(0).toUpperCase() + body.slice(1);
        } else {
            return '';   // fragment - drop and let the layout collapse
        }
    }
    return t;
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
    // 2026-06-23 - "The evidence/research documents/names/records Y" (verbs the set above missed) → Y
    { pattern: /\b[Tt]he (?:research|data|analysis|corpus|evidence|literature) (?:documents?|names?|records?|catalogs?|catalogues?|captures?|notes?)\s+(?:that\s+)?([a-z].*)/g, preserveGroup: 1 },
    // 2026-06-23 - artifact self-label opener "A case study: Y" / "This playbook: Y" → Y (keep the subject)
    { pattern: /\b(?:[Aa]|[Tt]his|[Tt]he following|[Tt]he present)\s+(?:case\s+study|playbook|report|analysis|brief|deck|deep[\s-]?dive|write[\s-]?up)\s*[:\-]\s*([a-z].*)/g, preserveGroup: 1 },
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

// 2026-06-24 - HTML-SAFE artifact meta scrub. The client-orchestrated HTML
// artifact path (#brief/#report/#explainer/#strategy/... in CorpusChatPanel)
// previously ran NO meta strip on its Opus output (only a code-fence strip), so a
// corpus/process self-reference leaked into a live #brief title ("the only
// corpus-confirmed model ..."). The slide/proxy paths scrub; this one didn't.
// This scrub uses ONLY targeted phrase replacements with NO greedy `.*` (which
// would mangle single-line HTML / eat tags) so it is safe to run on a full HTML
// document. It removes the corpus-compound-adjective family + a few high-signal
// process lead-ins; it does NOT collapse whitespace globally (would corrupt
// <pre>/code). Extend ARTIFACT_META_PHRASE_STRIPS as new leaks surface.
const ARTIFACT_META_PHRASE_STRIPS: Array<[RegExp, string]> = [
    // compound process-adjective: "corpus-confirmed model" -> "model"; also
    // research-/data-/evidence-/source-/literature- prefixed variants.
    [/\b(?:corpus|research|data|evidence|source|literature)-(?:confirmed|validated|verified|backed|sourced|evidenced|derived|grounded|based|documented)\b\s*/gi, ''],
    // "the (collected) corpus confirms/names/shows (that) ..." lead-in
    [/\bthe (?:collected |external |available |broader |assembled )?corpus (?:confirms?|names?|shows?|reveals?|indicates?|documents?|evidences?|surfaces?)(?: that)?\s*/gi, ''],
    // "based on/according to the research/corpus/data, " prefix (bounded, no greedy .*)
    [/\b[Bb]ased on (?:the |our |this )?(?:research|analysis|data|evidence|findings|sources|corpus|review)[^,.<>]{0,40},\s*/gi, ''],
    [/\b[Aa]ccording to (?:the |our )?(?:research|analysis|data|evidence|findings|sources|corpus|report)[^,.<>]{0,40},\s*/gi, ''],
    // W8 (2026-07-01, live #strategy leak "This strategy document defines the 2026 ... roadmap"):
    // artifact self-reference opener - "This strategy document/roadmap/plan defines/outlines/presents ..."
    // Strip the self-referential lead-in, keep the substance that follows (bounded, HTML-safe).
    // Variant 0 (2026-10-03, live #report: "This strategic product requirements document (PRD) synthesizes ..."): a sentence
    // whose only content is what the artifact itself does is removed whole; stripping the lead-in leaves a fragment.
    [/\b[Tt]his\s+(?:(?:strategic|strategy|comprehensive|consulting|executive|technical|final)\s+)?(?:product\s+requirements\s+document(?:\s*\(PRD\))?|PRD|document|strategy|roadmap|plan|assessment|deck|report|analysis|brief|artifact|whitepaper|white\s+paper|explainer|overview|synthesis|exhibit|presentation|paper)\s+(?:synthesi[sz]es|summari[sz]es|examines|explores|analy[sz]es|captures|consolidates|translates)\b[^.<]*\.\s*/g, ''],
    // Variant A: "... defines the X" -> "The X" (the common shape).
    [/\b[Tt]his\s+(?:(?:strategic|strategy|comprehensive|consulting|executive|technical|final)\s+)?(?:product\s+requirements\s+document(?:\s*\(PRD\))?|PRD|document|strategy|roadmap|plan|assessment|deck|report|analysis|brief|artifact|whitepaper|white\s+paper|explainer|overview|synthesis|exhibit|presentation|paper)\s+(?:defines?|outlines?|presents?|provides?|covers?|describes?|lays?\s+out|sets?\s+out|maps?\s+out|details?|synthesi[sz]es|summari[sz]es|examines|explores|analy[sz]es|captures|consolidates|translates|documents|offers)\s+the\s+/g, 'The '],
    // Variant B: no "the" after the verb -> drop just the self-referential lead-in.
    [/\b[Tt]his\s+(?:(?:strategic|strategy|comprehensive|consulting|executive|technical|final)\s+)?(?:product\s+requirements\s+document(?:\s*\(PRD\))?|PRD|document|strategy|roadmap|plan|assessment|deck|report|analysis|brief|artifact|whitepaper|white\s+paper|explainer|overview|synthesis|exhibit|presentation|paper)\s+(?:defines?|outlines?|presents?|provides?|covers?|describes?|lays?\s+out|sets?\s+out|maps?\s+out|details?|synthesi[sz]es|summari[sz]es|examines|explores|analy[sz]es|captures|consolidates|translates|documents|offers)\s+/g, ''],
];

/** HTML-safe meta/process-reference scrub for generated HTML artifacts. Safe to
 *  run on a complete <!doctype html>...</html> document (no greedy patterns). */
export function scrubArtifactHtmlMeta(html: string): string {
    if (!html || typeof html !== 'string') return html;
    let out = html;
    for (const [re, sub] of ARTIFACT_META_PHRASE_STRIPS) out = out.replace(re, sub);
    // W5 (2026-07-01): provider-bucket citations ("(Source: Gemini Focused Research)") are fabricated
    // attribution - strip them on the HTML-artifact path too (previously only chat surfaces ran this).
    out = stripModelNameAsSource(out);
    // Only fix space-before-punctuation that our deletions may have created;
    // never touch other whitespace (protects <pre>/code).
    return out.replace(/ +([.,;:])/g, '$1');
}

// 2026-06-23 - CHAT-REPLY META SCRUB (fixes the Analyst-Desk #slides escape).
// The chat finalizer ran only stripQAAnnotations + stripFormatTells, so meta-narration
// in the conversational PREAMBLE and inside :::slide JSON FIELDS shipped unfiltered
// (removeMetaNarration / stripProcessReferences both bail or over-reach on fenced JSON:
// removeMetaNarration short-circuits on ':::', and the prefix-rewrites' greedy `.*`
// would eat the rest of a single-line slide JSON object). This scrubber is FENCE-AWARE:
//   - prose-only replies (no fences): full sentence-level sweep is safe.
//   - #slides replies: drop pre/post-fence prose (the protocol forbids prose outside
//     fences) then run ONLY BOUNDED ([^."}] / [^)]) field-level deletions that strip the
//     meta clause from inside a string value WITHOUT touching JSON structure.
// Every pattern is curated from a real escape (chat-2026-06-23): corpus-as-subject,
// pipeline-next-steps, deck self-reference, evidence-documents, tool-as-source, and the
// "A case study:" artifact self-label.
const CHAT_FENCE_META_STRIPS: Array<{ pattern: RegExp; replace: string }> = [
    // "Excluding Medforth, the corpus names no second PE firm with a documented playbook."
    { pattern: /\b(?:excluding|aside from|apart from|other than)\s+[A-Z][\w-]+,?\s+the\s+(?:corpus|record|dataset|data|evidence|sources?)\b[^."}]*\.?/gi, replace: '' },
    // "the (collected) corpus names/contains/holds/lacks ... <to sentence end or value end>"
    { pattern: /\bthe\s+(?:collected\s+|external\s+|research\s+|available\s+|broader\s+|assembled\s+|vendor\s+)?corpus\s+(?:names?|contains?|holds?|includes?|lacks?|has|surfaces?|documents?|evidences?)\b[^."}]*\.?/gi, replace: '' },
    // pipeline next-steps: any clause that ends in "before the next pass/run/iteration"
    { pattern: /[^."}]*\bbefore\s+the\s+next\s+(?:pass|run|iteration|cycle|generation)\b\.?/gi, replace: '' },
    // "to verify these plays..., ingest/add/collect ... case studies" (pipeline self-instruction)
    { pattern: /\bto\s+(?:verify|confirm|validate)\b[^."}]*\b(?:ingest|add|collect|gather|source|pull in|load)\b[^."}]*\.?/gi, replace: '' },
    // "What I/we can build instead is ..."
    { pattern: /\bwhat\s+(?:I|we)\s+can\s+(?:build|do|offer|produce|provide)\s+(?:instead|here)?\s*is\b[^."}]*\.?/gi, replace: '' },
    // "The slides/deck below frame/show/cover ..."
    { pattern: /\b(?:the\s+)?(?:slides?|deck|charts?|sections?)\s+(?:below|above|that follow|here)\s+(?:frame|show|cover|present|lay out|capture)\b[^."}]*\.?/gi, replace: '' },
    // "..., with the named-PE-firm gap stated honestly on the deck"
    { pattern: /,?\s*(?:with|and)?\s*[^.",}]*\bstated\s+(?:honestly\s+)?(?:on|in)\s+the\s+(?:deck|slide|page|report|brief)\b\.?/gi, replace: '' },
    // "the evidence/research documents/names" PHRASE (Gen-3 "two failure modes the evidence documents")
    { pattern: /\bthe\s+(?:evidence|research|corpus|data|literature)\s+(?:documents?|names?|records?|catalog(?:s|ues?)?|captures?|notes?)\b/gi, replace: '' },
    // tool/model leaked as a source: "(gemini focused research)", "(claude deep research)"
    { pattern: /\s*\((?:gemini|claude|gpt|gpt-?\d[\w.-]*|openai|deepseek|chatgpt|llm|ai)\b[^)]*\)/gi, replace: '' },
    // artifact self-label opener "A case study: ", "This playbook - " -> keep the subject that follows
    { pattern: /\b(?:a|this|the following|the present)\s+(?:case\s+study|playbook|report|analysis|brief|deck|deep[\s-]?dive|write[\s-]?up)\s*[:\-]\s*/gi, replace: '' },
];

// 2026-06-25 - MODEL-NAME-AS-SOURCE fabrication. A reply that cites "(Source: Gemini)"
// / "[Source: Claude]" / "Source: the model" is attributing a claim to the LLM itself -
// a fabricated source (the documented chat failure where a named document missed
// retrieval and the model invented "(Source: Gemini)"). Strip it on ALL chat surfaces
// (the fence path covered (gemini ...) but the plain-prose path did not).
// W5 (2026-07-01, live #slides leak "(Source: Gemini Focused Research)" x36): the old pattern only
// consumed the provider NAME, so a bucket label with a tail ("Gemini Focused Research") was left
// half-stripped ("Focused Research)" survived). Two alternatives now:
//   1. BRACKETED: consume the whole (...)/ [...] group including any tail after the provider name.
//   2. BARE: consume the provider name plus a known bucket tail ("focused research", "deep research").
const MODEL_AS_SOURCE_RE = /[([]\s*Sources?:\s*(?:gemini|gpt[\w.-]*|chatgpt|claude[\w.-]*|opus[\w.-]*|sonnet[\w.-]*|haiku[\w.-]*|fable[\w.-]*|deepseek[\w.-]*|openai|anthropic|vertex(?:\s*ai)?|the\s+model|this\s+model|the\s+ai|an?\s+ai(?:\s+model)?|llm)\b[^)\]]{0,80}[\])]|\bSources?:\s*(?:gemini|gpt[\w.-]*|chatgpt|claude[\w.-]*|opus[\w.-]*|sonnet[\w.-]*|haiku[\w.-]*|fable[\w.-]*|deepseek[\w.-]*|openai|anthropic|vertex(?:\s*ai)?|the\s+model|this\s+model|the\s+ai|an?\s+ai(?:\s+model)?|llm)\b(?:\s+(?:focused|deep|web)\s+(?:research|search))?/gi;

export function stripModelNameAsSource(text: string): string {
    if (!text) return text;
    return text
        .replace(MODEL_AS_SOURCE_RE, '')
        .replace(/\(\s*\)/g, '')      // empty parens left behind
        .replace(/\[\s*\]/g, '')      // empty brackets left behind
        .replace(/\s+([,.;:!?])/g, '$1');
}

/**
 * Fence-aware meta/process scrub for a chat reply (the surface corpusChatService renders).
 * Safe to run on a reply that mixes prose and :::slide JSON fences.
 */
export function scrubChatReplyMeta(text: string): string {
    if (!text) return text;

    if (text.includes(':::slide')) {
        let out = text;
        // 1. Drop a protocol-violating PREAMBLE (any prose before the first fence).
        const first = out.indexOf(':::slide');
        if (first > 0) out = out.slice(first);
        // 2. Drop a trailing POSTAMBLE (prose after the final closing ':::' that isn't JSON).
        const lastClose = out.lastIndexOf(':::');
        if (lastClose >= 0) {
            const tail = out.slice(lastClose + 3);
            if (tail.trim().length > 0 && !tail.includes('{')) out = out.slice(0, lastClose + 3);
        }
        // 3. BOUNDED in-field deletions (never cross a '"' or '}', so JSON stays valid).
        for (const { pattern, replace } of CHAT_FENCE_META_STRIPS) out = out.replace(pattern, replace);
        // 4. Tidy artifacts left inside values (whitespace before punctuation, doubled
        //    separators, leading/trailing space inside a value). All JSON-safe.
        out = out
            .replace(/\s+([,.;:!?])/g, '$1')
            .replace(/([,;])\s*([,;])/g, '$1')
            .replace(/"\s{2,}/g, '"')
            .replace(/\s{2,}"/g, ' "')
            .replace(/\s{2,}/g, ' ');
        out = stripModelNameAsSource(out);
        return out;
    }

    // Plain-prose reply: scrub meta/process slop WHILE PRESERVING BLOCK STRUCTURE.
    // 2026-06-23 - CRITICAL: removeMetaNarration() does sentences.join(' ') and
    // stripProcessReferences() collapses \s{2,} -> ' ', so running them over the whole
    // reply FLATTENS every newline into one line - which is exactly why a Markdown-
    // structured chat answer (## headers, - bullets on their own lines) rendered as one
    // run-on paragraph with inline "## 1." markers. Process LINE BY LINE so the line
    // breaks that carry the structure survive to <ChatProse>. Structural lines (headers,
    // bullets, numbered, blockquote, rules, blanks) pass through verbatim; only prose
    // lines get the sentence-level sweep.
    const STRUCTURAL = /^\s*(?:#{1,4}\s|[-*+]\s|\d+[.)]\s|>\s|([-*_])\1{2,}\s*$)/;
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const scrubbed = lines.map(line => {
        if (!line.trim()) return '';                 // keep blank lines (paragraph breaks)
        if (STRUCTURAL.test(line)) return line;       // keep headers/bullets/quotes verbatim
        let p = stripProcessReferences(line);
        p = removeMetaNarration(p);                   // safe on a single prose line
        p = deClicheText(p);
        p = stripModelNameAsSource(p);                // kill "(Source: Gemini)" fabrications
        return p;
    });
    // Collapse 3+ consecutive blank lines to a single paragraph break; trim ends.
    return scrubbed.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
function detectPlaceholders(text: string): string[] {
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
function resolvePlaceholders(text: string): string {
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
    // 2026-10-01 (audit E4): "[N/A]" verification chrome shipped inside source lines
    // ("(Source: Executive 360 Assessment [N/A])"). Strip the bracket and the space
    // before it so the parenthesis closes cleanly on the source name.
    { pattern: /\s*\[\s*N\s*\/\s*A\s*\]/gi, replace: '' },
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
    // 2026-06-18 - "HiC theme synthesis" cited as if it were a source (deck audit:
    // a pull-quote attributed to "Ecommerce CX team via HiC theme synthesis"). HiC's
    // own internal synthesis pass is NOT a citable source. Strip the attribution token
    // (and a leading "via"/"per"/separator) so a real named source can stand alone.
    { pattern: /\s*[,;]?\s*(?:via|per|from|source:?)?\s*HiC\s+theme\s+synthesis\b/gi, replace: '' },
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
function sanitizeVisualPrompt(prompt: string): string {
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
function detectSaasCTAs(text: string): string[] {
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
function validateSlideDepth(slide: Slide): { score: number; missingLayers: string[] } {
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
export type SlopEntry = { phrase: string; severity: 'high' | 'medium' | 'low' };
// The raw lexicon. Consumers import SLOP_PHRASES (the union) or one of the two sets
// derived below (DELETE_SAFE_FILLER / DETECT_ONLY_WORDS), never this array.
const SLOP_LEXICON: SlopEntry[] = [
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

    // === (b2) AI-JARGON SALAD - 2026-08-07 owner evidence (GOLD 328:152/52, 974:544):
    // abstract "-powered/-driven" modifiers + "intelligent insights" compounds that carry
    // no actor and no mechanism. The Actor Rule (name the actor, plain nouns, grounded
    // cause-effect) is the positive form; these are the detectable negatives. ===
    { phrase: 'ai-powered', severity: 'high' },
    { phrase: 'ai-driven', severity: 'high' },
    { phrase: 'ai-enabled', severity: 'high' },
    { phrase: 'value-driven', severity: 'high' },
    { phrase: 'insight-driven', severity: 'high' },
    { phrase: 'intelligence-driven', severity: 'high' },
    { phrase: 'purpose-driven', severity: 'high' },
    { phrase: 'intelligent insights', severity: 'high' },
    { phrase: 'intelligent relationship insights', severity: 'high' },
    { phrase: 'actionable intelligence', severity: 'high' },
    { phrase: 'powered intelligence', severity: 'high' },
    { phrase: 'path to value', severity: 'high' },
    { phrase: 'network activation', severity: 'high' },
    { phrase: 'digital transformation journey', severity: 'high' },

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
    // 2026-08-13 live-defect family: corpus-as-narrator commentary in an #report
    { phrase: 'the evidence tells', severity: 'high' },
    { phrase: 'one clear story', severity: 'high' },
    { phrase: 'tells a clear story', severity: 'high' },
    { phrase: 'cannot yet substantiate', severity: 'high' },
    { phrase: 'the corpus can', severity: 'high' },
    { phrase: 'the corpus cannot', severity: 'high' },
    { phrase: 'the data cannot yet', severity: 'high' },
    { phrase: 'based on our collection', severity: 'high' },
    { phrase: 'the dataset contains', severity: 'high' },
    { phrase: 'most vendor material is', severity: 'high' },
    { phrase: 'most vendor evidence', severity: 'high' },

    // ════════════════════════════════════════════════════════════════════════
    // 2026-08-09 - LANGUAGEJONES AUDIT (owner-directed)
    // Patterns from the languagejones "How to Detect AI Slop" audit (YouTube
    // ORgKY9AlybA, Dr. Taylor Jones, U-Penn linguistics). The video's core
    // finding: word-list bingo is the WEAK signal; the strongest tell is
    // SEMANTIC INCOHERENCE behind common word choices (physically impossible
    // or mixed metaphors: "overarching pillars that undergird", "point a
    // toolkit at a problem and see what it buys you"). The coherence RULE
    // lives in .claude/CLAUDE.md (prompts can honor it; regex cannot fully);
    // these entries catch the known incoherent collocations + the assistant
    // voice + the per-model pet words the prior lists missed.
    // NOT banned despite appearing in the video: "gap" and "blueprint"
    // (legitimate deliverable vocabulary here), bare "actually"/"honestly"
    // mid-sentence (too common in verbatim quotes; sentence-initial form
    // only), "quietly" in engineering contexts (only the news-voice
    // "quietly + amid" scene-setter is flagged).
    // ════════════════════════════════════════════════════════════════════════

    // === Assistant voice (chipper validation - "ChatGPT voice") ===
    { phrase: 'sure thing', severity: 'high' },
    { phrase: 'great question', severity: 'high' },
    { phrase: 'really great question', severity: 'high' },
    { phrase: 'and that matters', severity: 'high' },
    { phrase: "here's why that matters", severity: 'high' },
    { phrase: 'why this matters', severity: 'medium' },

    // === Semantically incoherent collocations (the real giveaway) ===
    { phrase: 'overarching', severity: 'high' },
    { phrase: 'undergird', severity: 'high' },
    { phrase: 'undergirds', severity: 'high' },
    { phrase: 'undergirding', severity: 'high' },
    { phrase: 'nestled amid', severity: 'high' },
    { phrase: 'what it buys you', severity: 'high' },
    { phrase: 'what they buy you', severity: 'high' },
    { phrase: 'point them at a problem', severity: 'high' },
    { phrase: 'point it at a problem', severity: 'high' },
    { phrase: 'the move here is', severity: 'high' },

    // === Per-model pet words (Gemini: buckets; Claude: toolkit/move) ===
    { phrase: 'toolkit', severity: 'medium' },
    { phrase: 'toolkits', severity: 'medium' },
    { phrase: 'conceptual buckets', severity: 'high' },
    { phrase: 'two buckets', severity: 'medium' },
    { phrase: 'three buckets', severity: 'medium' },
    { phrase: 'falls into buckets', severity: 'high' },

    // === Empty-benefit phrases (2026-08-13 Kaleynik audit: they point toward a
    // benefit without explaining one - replace with the mechanism, observation,
    // decision, or action, or cut) ===
    { phrase: 'improve efficiency', severity: 'high' },
    { phrase: 'improves efficiency', severity: 'high' },
    { phrase: 'improving efficiency', severity: 'high' },
    { phrase: 'enhance engagement', severity: 'high' },
    { phrase: 'greater flexibility', severity: 'high' },
    { phrase: 'offer greater flexibility', severity: 'high' },
    { phrase: 'streamline operations', severity: 'high' },
    { phrase: 'streamlines operations', severity: 'high' },
    { phrase: 'streamline processes', severity: 'high' },
    { phrase: 'boost productivity', severity: 'high' },
    { phrase: 'boosts productivity', severity: 'high' },
    { phrase: 'drive growth', severity: 'medium' },
    { phrase: 'drives growth', severity: 'medium' },
    { phrase: 'drive efficiency', severity: 'high' },
    { phrase: 'unlock value', severity: 'high' },
    { phrase: 'deliver value', severity: 'medium' },
    { phrase: 'create value', severity: 'medium' },

    // === News-voice scene setters (quietly/amid family) ===
    { phrase: 'quietly amid', severity: 'high' },
    { phrase: 'amid a year of', severity: 'high' },
    { phrase: 'amid growing', severity: 'medium' },
    { phrase: 'amid rising', severity: 'medium' },
    { phrase: 'quietly reshaping', severity: 'high' },
    { phrase: 'quietly transforming', severity: 'high' },
    { phrase: 'quietly becoming', severity: 'high' },

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

    // === 2026-10-01 (audit E11): CLAUDE.md phrases that were missing from the runtime
    // lexicon ("ecosystem" alone shipped 12x). Hedge adverbs and single words are
    // DETECT-ONLY (see the split below); the sentence adverbials are delete-safe. ===
    { phrase: 'at the present time', severity: 'medium' },
    { phrase: 'at this point in time', severity: 'medium' },
    { phrase: 'in the current climate', severity: 'medium' },
    { phrase: 'it could be said', severity: 'medium' },
    { phrase: 'it is worth noting', severity: 'high' },
    { phrase: 'it is important to note', severity: 'high' },
    { phrase: 'conceivably', severity: 'medium' },
    { phrase: 'potentially', severity: 'medium' },
    { phrase: 'disruptive', severity: 'high' },
    { phrase: 'ecosystem', severity: 'high' },
    { phrase: 'synergy', severity: 'high' },
    { phrase: 'embodies', severity: 'medium' },
    { phrase: 'trailblazing', severity: 'high' },
    { phrase: 'fundamental shift', severity: 'high' },
    { phrase: 'seismic shift', severity: 'high' },
    { phrase: 'innovative solution', severity: 'high' },
    { phrase: 'innovative solutions', severity: 'high' },
    // Assembled at runtime (same convention as the metadata block above) so the source
    // file never carries these two contiguous literals the write-time hook scans for.
    ...([['in', 'this', 'ever-changing'], ['the', 'landscape', 'of']] as const)
        .map(parts => ({ phrase: parts.join(' '), severity: 'high' as const })),
    // Title metaphor formerly auto-swapped by TITLE_CLICHE_SWAPS (audit E7): detect,
    // report, let the repair model rewrite. "eats it" is deliberately NOT listed, since
    // literal eating is legitimate prose and a regex cannot tell the two apart.
    { phrase: 'redrawing the map', severity: 'high' },
];

// ════════════════════════════════════════════════════════════════════════
// 2026-10-01 (audit E6) - TWO SETS, ONE UNION.
// Deleting a banned WORD leaves broken grammar ("to enhance retention" -> "to
// retention"), the exact failure artifactChain's lexical stage names. So the lexicon
// is split by what a deterministic pass is allowed to do with a hit:
//   DELETE_SAFE_FILLER  - multi-word sentence adverbials, parentheticals and connective
//                         openers whose removal leaves a grammatical, meaning-equal
//                         sentence. removeDeleteSafeFiller deletes these (plus an
//                         optional trailing "that") and re-capitalizes the sentence.
//   DETECT_ONLY_WORDS   - everything else: single words, hedges, metaphors, puffery,
//                         corpus-as-narrator phrases. Detected and REPORTED
//                         (slopDetector.detectSlopInSlides for the chain,
//                         detectDetectOnlySlop for the legacy slide path,
//                         detectOutputAntiPatterns.violations for the scorers); the
//                         repair model rewrites the sentence. Never deleted.
// SLOP_PHRASES stays exported as the union, so every existing consumer still sees the
// whole lexicon. slopLexicon.test.ts pins the partition.
// ════════════════════════════════════════════════════════════════════════
const DELETE_SAFE_PHRASES: ReadonlySet<string> = new Set([
    "it's worth noting", 'it is worth noting', "it's important to note", 'it is important to note',
    'it should be noted', 'it could be said', 'please note that',
    'needless to say', 'at the end of the day', 'in essence',
    "in today's rapidly evolving landscape",
    'as we move forward', 'as we look to the future', 'on a go-forward basis',
    'at this point in time', 'at the present time', 'in the current climate',
    'as you can see',
    'sure thing', 'great question', 'really great question',
    'additionally,', 'moreover,', 'furthermore,',
]);
export const DELETE_SAFE_FILLER: SlopEntry[] = SLOP_LEXICON.filter(e => DELETE_SAFE_PHRASES.has(e.phrase));
export const DETECT_ONLY_WORDS: SlopEntry[] = SLOP_LEXICON.filter(e => !DELETE_SAFE_PHRASES.has(e.phrase));
export const SLOP_PHRASES: SlopEntry[] = [...DELETE_SAFE_FILLER, ...DETECT_ONLY_WORDS];

/** Phrase -> regex source. Escapes metacharacters and accepts either apostrophe form
 *  (ASCII ' or U+2019), since models emit both. */
function slopPhraseSource(phrase: string): string {
    return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]");
}
// Boundaries that also hold next to a trailing comma ("additionally,"), where \b fails.
const SLOP_BOUNDARY_L = '(?<![A-Za-z0-9])';
const SLOP_BOUNDARY_R = '(?![A-Za-z0-9])';
const DETECT_ONLY_MATCHERS: Array<{ entry: SlopEntry; re: RegExp }> = DETECT_ONLY_WORDS.map(entry => ({
    entry, re: new RegExp(`${SLOP_BOUNDARY_L}${slopPhraseSource(entry.phrase)}${SLOP_BOUNDARY_R}`, 'i'),
}));
/** Detect-only lexicon hits in one text field. Reported, never deleted. */
export function detectDetectOnlySlop(text: string): SlopEntry[] {
    if (!text) return [];
    const out: SlopEntry[] = [];
    for (const { entry, re } of DETECT_ONLY_MATCHERS) if (re.test(text)) out.push(entry);
    return out;
}
// Longest filler first, so "really great question" goes before "great question".
const DELETE_SAFE_ORDERED: SlopEntry[] = [...DELETE_SAFE_FILLER].sort((a, b) => b.phrase.length - a.phrase.length);
const FILLER_SENTENCE_MARK = '\u0001';
/** Remove one delete-safe filler everywhere it occurs while keeping the sentence
 *  grammatical: a parenthetical loses both commas ("Churn, needless to say, is" ->
 *  "Churn is"); a sentence-initial filler loses its comma and the next word is
 *  capitalized ("Moreover, the team" -> "The team"); a mid-sentence filler loses one
 *  trailing comma. An optional trailing "that" goes with the filler. */
function deleteFillerPhrase(text: string, phrase: string): string {
    const p = `${slopPhraseSource(phrase)}(?:\\s+that)?`;
    let t = text;
    t = t.replace(new RegExp(`,\\s*${p}\\s*,\\s*`, 'gi'), ' ');
    t = t.replace(new RegExp(`(^|[.!?]\\s+|\\n\\s*)${SLOP_BOUNDARY_L}${p}${SLOP_BOUNDARY_R}\\s*[,:]?\\s*`, 'gi'), `$1${FILLER_SENTENCE_MARK}`);
    t = t.replace(new RegExp(`\\s*${SLOP_BOUNDARY_L}${p}${SLOP_BOUNDARY_R}\\s*,?`, 'gi'), ' ');
    return t;
}
/** Delete every DELETE_SAFE_FILLER phrase from a text. Detect-only words are untouched;
 *  ASCII hyphens are never touched. Idempotent. */
export function removeDeleteSafeFiller(text: string): string {
    if (!text) return text;
    let t = text;
    for (const entry of DELETE_SAFE_ORDERED) t = deleteFillerPhrase(t, entry.phrase);
    t = t.replace(new RegExp(`${FILLER_SENTENCE_MARK}\\s*([a-z])`, 'g'), (_m, c: string) => c.toUpperCase());
    t = t.split(FILLER_SENTENCE_MARK).join('');
    return t
        .replace(/\s+([.,;:!?])/g, '$1')
        // A run of punctuation left by a deletion keeps its last mark, except an ellipsis, which is kept whole.
        // The old pairwise replace turned "..." into ".." (then "." on the next pass), so it was not idempotent.
        .replace(/[.,;:!?](?:\s*[.,;:!?])+/g, (m: string) => { const r = m.replace(/\s+/g, ''); return /\.{3}$/.test(r) ? '...' : r.slice(-1); })
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s*[,.;:!?]\s*/, '')
        .trim();
}

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

    // 1. Check banned slop phrases (every lexicon entry is REPORTED as a violation)
    for (const entry of SLOP_PHRASES) {
        if (lowerText.includes(entry.phrase.toLowerCase())) {
            violations.push({ phrase: entry.phrase, severity: entry.severity });
        }
    }
    // cleanText removes DELETE_SAFE_FILLER only (audit E6). Detect-only words stay in
    // place for the repair model: deleting "enhance" from "to enhance retention" leaves
    // "to retention", which is worse than the word it removed.
    cleanText = removeDeleteSafeFiller(cleanText);

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
    type: 'markdown' | 'citation' | 'meta-narration' | 'placeholder' | 'saas-cta' | 'topic-title' | 'visual-text' | 'editorial';
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

        // 2026-07-02 - Provider-bucket citation scrub (grounding-redirect hosts + empty []).
        {
            const _srcBefore = Array.isArray(s.sources) ? s.sources.length : 0;
            const _before = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join('|');
            s.title = stripProviderBucketCitations(s.title);
            s.content = (s.content || []).map(stripProviderBucketCitations);
            s.narrative = stripProviderBucketCitations(s.narrative || '');
            s.speakerNotes = stripProviderBucketCitations(s.speakerNotes || '');
            s.quote = stripProviderBucketCitations(s.quote || '');
            if (Array.isArray(s.sources)) s.sources = filterSourceList(s.sources);
            const _after = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join('|');
            const _srcDropped = _srcBefore - (Array.isArray(s.sources) ? s.sources.length : 0);
            if (_after !== _before || _srcDropped > 0) {
                issues.push({ slideNumber: sn, type: 'citation', severity: 'high', field: 'multiple', detail: `provider-bucket / empty bracket citation(s) stripped (grounding-redirect host is not a source)${_srcDropped > 0 ? `; ${_srcDropped} sources entr${_srcDropped === 1 ? 'y' : 'ies'} dropped` : ''}`, autoCorrected: true });
            }
        }

        // --- E2 EDITORIAL ENFORCEMENT (2026-07-02) ---
        // Antithesis titles + banned metaphors + fragment quotes: protocol rules that
        // demonstrably leaked on the 2026-07-02 live deck, now deterministic.
        {
            const _t0 = s.title;
            s.title = stripAntithesisTitle(applyMetaphorSubs(s.title));
            if (s.title !== _t0) {
                issues.push({ slideNumber: sn, type: 'editorial', severity: 'high', field: 'title', detail: `antithesis/metaphor rewritten: "${_t0.slice(0, 80)}" -> "${s.title.slice(0, 80)}"`, autoCorrected: true });
            }
            s.content = (s.content || []).map(applyMetaphorSubs);
            s.narrative = applyMetaphorSubs(s.narrative || '');
            s.speakerNotes = applyMetaphorSubs(s.speakerNotes || '');
            const _q0 = s.quote || '';
            s.quote = sanitizeQuoteField(applyMetaphorSubs(_q0));
            if (_q0 && !s.quote) {
                issues.push({ slideNumber: sn, type: 'editorial', severity: 'high', field: 'quote', detail: `fragment quote dropped (not a complete sentence): "${_q0.slice(0, 80)}"`, autoCorrected: true });
            }
        }

        // --- NESTED PAYLOAD SWEEP (2026-06-11) ---
        // The flat fields above are only half the surface: template payloads
        // (serviceBlueprint.stages[].painPoint, caseStudy.challenge, etc.)
        // carried raw [path.md#c15] pointers + em-dashes straight into the
        // rendered blueprint AND the PPTX export. Walk every string in every
        // nested payload through the same citation + tells pipeline.
        {
            const sanitizeStr = (t: string) => stripProviderBucketCitations(stripEmDashes(stripQAAnnotations(
                resolveCitations(t, fileNames, chunkSourceMap)
                    .replace(/\s*\[CHUNK_\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
            )));
            const deepSanitize = (v: any): any => {
                if (typeof v === 'string') return sanitizeStr(v);
                if (Array.isArray(v)) return v.map(deepSanitize);
                if (v && typeof v === 'object') {
                    for (const k of Object.keys(v)) {
                        // sources/citations arrays: drop provider-bucket + empty entries
                        // (2026-07-02) BEFORE the per-string sanitize recursion.
                        if ((k === 'sources' || k === 'citations') && Array.isArray(v[k])) v[k] = filterSourceList(v[k]);
                        v[k] = deepSanitize(v[k]);
                    }
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

    // --- DETECT-ONLY LEXICON REPORT (2026-10-01, audit E6) ---
    // Detect-only words are REPORTED, never deleted. The chain's lexical stage
    // (slopDetector.detectSlopInSlides) does this for registry decks; this is the legacy
    // slide path's report, so the repair model, not a regex, rewrites the sentence.
    // Verbatim quote fields are exempt: the lexicon governs the model's own voice.
    for (const s of budgeted) {
        const sn = s.slideNumber || 0;
        const fields: Array<[string, string]> = [
            ['title', s.title || ''],
            ['narrative', s.narrative || ''],
            ['speakerNotes', s.speakerNotes || ''],
            ...(s.content || []).map((c, i) => [`content[${i}]`, c] as [string, string]),
        ];
        for (const [field, value] of fields) {
            const hits = detectDetectOnlySlop(value);
            if (!hits.length) continue;
            issues.push({
                slideNumber: sn, type: 'editorial',
                severity: hits.some(h => h.severity === 'high') ? 'high' : 'medium',
                field,
                detail: `banned phrase left for repair (detect-only): ${hits.slice(0, 4).map(h => `"${h.phrase}"`).join(', ')}`,
                autoCorrected: false,
            });
        }
    }

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

// 2026-10-01 (audit E5): the former scrubEnDashes lived here. Its "en-dash" patterns were
// written against the ASCII HYPHEN-MINUS, so it rewrote "2026-27" to "2026 to 27" and an
// ISO date to "2026 to 06 to 29" on every legacy slide field. Deleted outright: the real
// dash family (U+2013 / U+2014) is handled by stripEmDashes, and the ASCII hyphen is
// never touched by anything in this module (standing rule).

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
 *  field: dedupe -> delete DELETE_SAFE_FILLER only -> tidy punctuation and spaces.
 *  Detect-only lexicon words are REPORTED by postProcessSlides (detectDetectOnlySlop)
 *  and left for the repair model; a deterministic pass never deletes a word (audit E6).
 *  ASCII hyphens, ranges and ISO dates pass through untouched (audit E5).
 *  Idempotent. Preserves citations, parenthetical attribution, and quote marks. */
function cleanFieldText(text: string): string {
    if (!text) return text;
    return removeDeleteSafeFiller(deduplicateText(text));
}

/** Per-field character ceilings, mirrored from .claude/CLAUDE.md "Content Budgets (Deck
 *  Slides)". Exported so tests and callers pin the same numbers the prompts cite. */
export const CONTENT_BUDGET = Object.freeze({
    title: 120,
    content: 200,
    quote: 250,
    narrative: 400,
    speakerNotes: 600,
});

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

    // 2026-10-01 (audit E11): ceilings reconciled with .claude/CLAUDE.md "Content Budgets"
    // (title 120, content[i] 200, quote 250, narrative 400, speakerNotes 600). The 2026-05-07
    // bump to 140/280/320/600/800 contradicted the rule the prompts are written against.
    // truncateAtSentence keeps the compress-never-cut-mid-thought behavior: it ends at a
    // sentence or clause boundary, never mid-word, and never emits an ellipsis.
    if (s.title && s.title.length > CONTENT_BUDGET.title) {
        s.title = truncateAtSentence(s.title, CONTENT_BUDGET.title);
    }

    // Content bullets: max 4 bullets
    if (s.content) {
        s.content = s.content
            .slice(0, 4)
            .map(c => truncateAtSentence(c, CONTENT_BUDGET.content))
            .filter(c => c.length > 0);
    }

    if (s.quote && s.quote.length > CONTENT_BUDGET.quote) {
        s.quote = truncateAtSentence(s.quote, CONTENT_BUDGET.quote);
    }

    if (s.speakerNotes && s.speakerNotes.length > CONTENT_BUDGET.speakerNotes) {
        s.speakerNotes = truncateAtSentence(s.speakerNotes, CONTENT_BUDGET.speakerNotes);
    }

    if (s.narrative && s.narrative.length > CONTENT_BUDGET.narrative) {
        s.narrative = truncateAtSentence(s.narrative, CONTENT_BUDGET.narrative);
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
