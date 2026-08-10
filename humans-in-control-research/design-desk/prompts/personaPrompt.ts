import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { BrandHashtag } from '../services/hashtagParser';

export function buildPersonaPrompt(args: {
    designMdRaw: string;
    corpusText: string;
    currentArtifact: PersonaArtifact | null;
    userPrompt: string;
    brand: BrandHashtag;
}): string {
    const mode = args.currentArtifact ? 'REVISE' : 'CREATE';
    const currentBlock = args.currentArtifact
        ? `\nCURRENT PERSONA (this is the live artifact you are modifying -- keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    const reviseDiscipline = args.currentArtifact ? `

REVISION GUIDANCE:
You are the user's hands and brain. The CURRENT PERSONA above is your starting point -- not a sacred input. Read the user's request, infer intent, use judgment, and update the artifact intelligently. Keep id, type, and brand the same. Update updatedAt to ${Date.now()}.

Match the scope of your edit to the scope of the request. Narrow asks (rename, swap a role, add one goal, fix a quote source) deserve surgical edits -- keep the rest as-is. Expansive asks (pivot this persona around a different segment, refresh from new uploads, integrate the latest research, re-cast as a different role) deserve confident, thorough revision -- change whatever is necessary to make the persona credible under the new framing.

Use the corpus actively. CLIENT UPLOADS, EXTERNAL RESEARCH CORPUS, and structured intelligence (THEMES / PERSONAS / JOURNEY) are live evidence. Pull from them when adding goals, pain points, or quotes; when grounding citations; when refreshing a section; when the user wants newer findings reflected. Prefer real verbatim quotes and named sources from evidence over invention.

Don't churn. If the user's intent doesn't touch a field and there's no compelling reason to change it, leave it. Stability matters when the user is iterating.` : '';

    return `You are generating a PERSONA ARTIFACT for the NXT Humans Design Desk, working in the lineage of Alan Cooper (goal-directed personas), Indi Young (listening sessions, mental models), and Kim Goodwin (segment sizing, primary/secondary distinction).

IMAGERY CONTRACT (binding, 2026-08-07): personas are VISUAL artifacts. Emit image-slot prompts
derived from EVIDENCE, never stereotype, using this exact shape:
"GENERATE: [photo-portrait|photo-scene] - [subject, one plain clause] - DERIVED FROM: [the
persona field this image depicts, quoted] - SOURCE ANALYSIS: [the field name + its cited
source]". (1) ONE portrait (photo-portrait): subject built ONLY from corpus-evidenced
demographics and behaviors; neutral background; natural light; no text; DERIVED FROM quotes
the demographics/role sentence. (2) 2-3 LIFESTYLE/BEHAVIOR scenes (photo-scene), each
depicting ONE evidenced behavior; DERIVED FROM quotes that exact behaviors[] sentence (if the
behavior carries a verbatim corpus quote, depict the situation in the quote); no readable
faces, no embedded text. A bare topic word ("student", "healthcare") in place of the quoted
field is a violation - the image depicts the FINDING. REUSE FIRST: the runtime lane reuses
catalog images by concept; do not invent a fresh concept when an existing field-derived one
matches. An image-free persona is a failure unless the corpus evidences no behavior at all.

DESIGN SYSTEM (authoritative -- obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 200000)}

${currentBlock}${reviseDiscipline}
MODE: ${mode}
BRAND: ${args.brand}
USER PROMPT: ${args.userPrompt}

OUTPUT CONTRACT -- respond with ONLY a single JSON object, no prose, no markdown fences:

{
  "id": "${args.currentArtifact?.id ?? 'p_<timestamp>'}",
  "type": "persona",
  "brand": "${args.brand}",
  "name": "<see NAMING DISCIPLINE below>",
  "role": "<specific role label, MAX 80 CHARACTERS; longer context belongs in citations[], never in the role field>",
  "primaryTask": "<one specific moment/task the design must anchor on, ≤ 100 chars (e.g., 'Submitting a resume between two midterms in week 6')>",
  "goals": ["<goal>", "<goal>", "<goal>"],
  "painPoints": ["<pain>", "<pain>", "<pain>"],
  "jtbd": "When <situation>, I want <motivation>, so that <outcome>.",
  "quotes": [{ "text": "<verbatim quote from corpus>", "source": "<named source>" }],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

═══════════════════════════════════════════════════════════════
NAMING DISCIPLINE (Cooper / Goodwin)
═══════════════════════════════════════════════════════════════
- If the corpus carries a named individual whose pattern the persona represents (interview participant, social-media handle, named source), derive the persona name discreetly - e.g., a role-anchored handle ("First-gen Junior Dev · CS '26") rather than inventing a plausible-sounding "Sarah Chen" who does not exist in the corpus.
- INVENTED first+last names are ONLY allowed when the persona is explicitly a composite of an anonymized population and the corpus provides no usable identifier. NEVER append "(composite)" or any other process-debug suffix to the rendered name - that is reporting-depth metadata the reader must not see.
- AUTO-REJECT: a generic Western first+last name applied to a non-Western corpus context, or a name that contradicts the corpus's demographic evidence.

═══════════════════════════════════════════════════════════════
GOAL TIERING (Cooper - goals are not flat)
═══════════════════════════════════════════════════════════════
Each entry in goals[] should fall into one of three tiers; mix tiers across the array, do NOT emit three goals at the same tier:
- LIFE goal: a multi-year ambition ("Become a tech-industry engineer after a non-CS undergrad").
- EXPERIENCE goal: how they want to FEEL during the interaction ("Feel like the application process is fair and merit-based").
- FUNCTIONAL goal: the specific task outcome ("Land at least three interviews in the spring co-op cycle").

CRITICAL: NEVER prefix goal entries with bracket-stamps like "[Life]", "[Experience]", "[Functional]". Those are reporting-depth metadata - debug chrome the reader must not see. Let the prose form of each goal communicate the tier naturally: a life-goal reads as ambition; an experience-goal reads as emotional state; a functional-goal reads as a task with a deadline.

═══════════════════════════════════════════════════════════════
PAIN POINTS - EVIDENCE-BACKED ONLY
═══════════════════════════════════════════════════════════════
- Every pain point MUST be a complete sentence with: (1) a named friction, (2) a system/event/proper-noun anchor, and (3) where possible, a frequency or severity marker pulled from the corpus.
- BAD: "Frustrated by job hunting."
- GOOD: "ATS keyword filters reject 48% of qualified applications before a human reviewer sees them (8 of 12 interviews)."
- If the corpus does not evidence a pain, OMIT it. Do not fill the array to three with weakly-evidenced items.

═══════════════════════════════════════════════════════════════
QUOTES - VERBATIM ONLY (LEARNED CONSTRAINT, NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════
- Every quote MUST be VERBATIM from the corpus - never paraphrase, never compose.
- Light truncation with ellipsis ("...") is allowed; never edit the content of the spoken sentence.
- Source is a NAMED source: "Reddit: r/cscareerquestions, 2025-04", "Interview P-04, 2025-03-12", "Higher Ed Dive: Ng 2024".
- If the corpus does not carry at least ONE usable verbatim quote for this persona, OMIT the quotes array entirely and narrow the persona's goals/painPoints to what IS evidenced. NEVER fabricate a quote. NEVER add a "Confidence: HYPOTHESIS" or similar process-status tag to the rendered output - internal evidence-confidence is a data attribute, never user-facing chrome.

═══════════════════════════════════════════════════════════════
CITATIONS[] - FACTS + SOURCES ONLY
═══════════════════════════════════════════════════════════════
The citations[] array carries FACTUAL CLAIMS with named sources. Each entry is { label: "<a factual claim>", source: "<named source>" }.
- Do NOT use citations[] as a junk drawer for process metadata (confidence levels, segment-size annotations, mental-model summaries, persona-type tags, non-goal lists, framework version stamps). The reader sees citations[] in the rendered card; it must read as evidence, not as debug metadata.
- Segment size, mental model, primary/secondary status, and non-goals - if they belong in the persona - go in the appropriate VISIBLE field (role, bio, painPoints, goals) written as natural prose. Example: instead of citations[] { label: "Segment size: ~38% of corpus" }, the role field reads "First-year junior dev - pattern observed in 38% of interview cohort".

═══════════════════════════════════════════════════════════════
JTBD - CORPUS-LED FRAMING ALLOWED
═══════════════════════════════════════════════════════════════
The default JTBD format is "When <situation>, I want <motivation>, so that <outcome>." If the corpus surfaces a more natural framing in the user's own words, USE THAT instead and quote-cite it.

═══════════════════════════════════════════════════════════════
CONTENT DISCIPLINE
═══════════════════════════════════════════════════════════════
- Goals/painPoints are complete sentences with subject + verb + outcome.
- NEVER use generic source references ("research", "studies", "sources", "data", "analysis", "findings"). Always name the source.
- NEVER use any of the banned phrases defined in the design system.
- Plain text only in all fields - no markdown, no bold, no asterisks.`;
}
