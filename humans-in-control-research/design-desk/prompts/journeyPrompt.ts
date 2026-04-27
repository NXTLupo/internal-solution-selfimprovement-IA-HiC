import type { JourneyArtifact } from '../schemas/journeyArtifact';
import type { BrandHashtag } from '../services/hashtagParser';

export function buildJourneyPrompt(args: {
    designMdRaw: string;
    corpusText: string;
    currentArtifact: JourneyArtifact | null;
    userPrompt: string;
    brand: BrandHashtag;
}): string {
    const mode = args.currentArtifact ? 'REVISE' : 'CREATE';
    const currentBlock = args.currentArtifact
        ? `\nCURRENT JOURNEY (this is the live artifact you are modifying -- keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    const reviseDiscipline = args.currentArtifact ? `

REVISION GUIDANCE:
You are the user's hands and brain. The CURRENT JOURNEY above is your starting point -- not a sacred input. Read the user's request, infer intent, use judgment, and update the artifact intelligently. Keep id, type, and brand the same. Update updatedAt to ${Date.now()}.

Match the scope of your edit to the scope of the request. Narrow asks (rename a stage, add one pain point, swap an emotion, reorder two stages) deserve surgical edits -- keep the rest as-is. Expansive asks (pivot the journey around a different segment, refresh with new survey data, restructure around a different lifecycle, integrate the latest findings) deserve confident, thorough revision -- change whatever is necessary to make the journey reflect the new framing.

Use the corpus actively. CLIENT UPLOADS, EXTERNAL RESEARCH CORPUS, and structured intelligence (THEMES / PERSONAS / JOURNEY) are live evidence. Pull from them when adding stages, pain points, opportunities, or quotes; when grounding citations; when refreshing a section; when the user wants newer findings reflected. Prefer real verbatim quotes and named sources from evidence over invention.

Don't churn. If the user's intent doesn't touch a stage and there's no compelling reason to change it, leave it. Stability matters when the user is iterating.` : '';

    return `You are generating a JOURNEY ARTIFACT for the NXT Humans Design Desk.

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
  "id": "${args.currentArtifact?.id ?? 'j_<timestamp>'}",
  "type": "journey",
  "brand": "${args.brand}",
  "title": "<action-title: conclusion with data>",
  "stages": [
    {
      "id": "s1",
      "label": "<stage name>",
      "emotion": "positive|neutral|negative",
      "touchpoints": ["<touchpoint>"],
      "painPoints": ["<pain>"],
      "opportunities": ["<opportunity>"]
    }
  ],
  "connections": [{ "from": "s1", "to": "s2", "label": "<optional transition>" }],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

RULES:
- 4-9 stages typical. Every stage.id is referenced by at least one connection unless it is the terminal stage.
- connections.from and connections.to MUST reference stage ids that exist in stages[].
- Every painPoint/opportunity is a complete sentence where possible.
- citations reference NAMED sources from the corpus -- no generic "research" or "data".
- Plain text only; no markdown, no asterisks, no bold.`;
}
