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

    return `You are generating a PERSONA ARTIFACT for the NXT Humans Design Desk.

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
  "name": "<specific first + last name>",
  "role": "<specific role; include seniority if relevant>",
  "goals": ["<goal>", "<goal>", "<goal>"],
  "painPoints": ["<pain>", "<pain>", "<pain>"],
  "jtbd": "When <situation>, I want <motivation>, so that <outcome>.",
  "quotes": [{ "text": "<verbatim quote from corpus>", "source": "<named source>" }],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

CITATION RULES:
- Every quote MUST have a real named source (e.g., "Reddit: r/cscareerquestions", "Higher Ed Dive, 2025")
- Never use generic references ("research", "studies", "sources", "data")
- Prefer corpus-grounded quotes over fabricated ones; if none exist, emit zero quotes

CONTENT RULES:
- goals/painPoints are complete sentences with data where possible
- Do NOT use any of the banned phrases defined in the design system
- Plain text only in all fields -- no markdown, no bold, no asterisks`;
}
