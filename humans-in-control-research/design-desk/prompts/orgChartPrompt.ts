// humans-in-control-research/design-desk/prompts/orgChartPrompt.ts
import type { OrgChartArtifact } from '../schemas/orgChartArtifact';
import type { BrandHashtag } from '../services/hashtagParser';

export function buildOrgChartPrompt(args: {
    designMdRaw: string;
    corpusText: string;
    currentArtifact: OrgChartArtifact | null;
    userPrompt: string;
    brand: BrandHashtag;
}): string {
    const mode = args.currentArtifact ? 'REVISE' : 'CREATE';
    const currentBlock = args.currentArtifact
        ? `\nCURRENT ORG CHART (revise this — emit a new full object, keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    return `You are generating an ORGANIZATIONAL CHART ARTIFACT for the NXT Humans Design Desk.

DESIGN SYSTEM (authoritative — obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 60000)}

${currentBlock}
MODE: ${mode}
BRAND: ${args.brand}
USER PROMPT: ${args.userPrompt}

OUTPUT CONTRACT — respond with ONLY a single JSON object, no prose, no markdown fences:

{
  "id": "${args.currentArtifact?.id ?? 'o_<timestamp>'}",
  "type": "org",
  "brand": "${args.brand}",
  "title": "<action-title: what org or division this chart represents>",
  "nodes": [
    {
      "id": "n1",
      "name": "<person full name, or \\"VACANT\\" if the role is unfilled>",
      "title": "<role title>",
      "department": "<optional department/team>",
      "directReports": ["<child node id>"],
      "location": "<optional city/region>",
      "email": "<optional email>",
      "iconKey": "person|vacant|team|external"
    }
  ],
  "rootIds": ["<id of top-level node(s)>"],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

RULES:
- nodes[].id values MUST be unique. directReports and rootIds MUST reference ids that exist in nodes[].
- Every node's directReports is an array (possibly empty for leaf nodes).
- rootIds typically has ONE entry (a CEO/president/head) but may have multiple for federated structures.
- Use iconKey "vacant" when name is "VACANT" (an unfilled role). Use "team" for collective nodes ("Engineering Team"). Use "external" for partners/vendors/contractors. Use "person" for named individuals (default).
- Keep the hierarchy shallow when the corpus supports it — overcomplex trees hurt readability.
- Plain text only; no markdown, no asterisks, no emoji.
- Citations must reference NAMED sources from the corpus — no generic "research" or "data".`;
}
