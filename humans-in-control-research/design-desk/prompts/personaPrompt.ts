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
        ? `\nCURRENT PERSONA (revise this -- emit a new full object, keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    return `You are generating a PERSONA ARTIFACT for the NXT Humans Design Desk.

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
