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
        ? `\nCURRENT JOURNEY (revise this -- emit a new full object, keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    return `You are generating a JOURNEY ARTIFACT for the NXT Humans Design Desk.

DESIGN SYSTEM (authoritative -- obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 60000)}

${currentBlock}
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
