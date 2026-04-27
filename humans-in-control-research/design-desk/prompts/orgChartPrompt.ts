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
        ? `\nCURRENT ORG CHART (this is the live artifact you are modifying — keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    const reviseDiscipline = args.currentArtifact ? `

REVISION GUIDANCE:
You are the user's hands and brain. The CURRENT ORG CHART above is your starting point — not a sacred input. Read the user's request, infer intent, use judgment, and update the artifact intelligently. Keep id, type, and brand the same. Update updatedAt to ${Date.now()}.

Match the scope of your edit to the scope of the request. Narrow asks (rename a node, swap a layout direction, fix a typo, add one team) deserve surgical edits — keep the rest as-is. Expansive asks (re-orient around a new priority, integrate the latest findings, restructure around a different reporting model, refresh from new uploads) deserve confident, thorough revision — change whatever is necessary to make the artifact reflect the new direction.

Use the corpus actively. CLIENT UPLOADS, EXTERNAL RESEARCH CORPUS, and structured intelligence (THEMES / PERSONAS / JOURNEY) are live evidence. Pull from them when adding nodes, when grounding citations, when refreshing a section, when the user wants new findings reflected. Prefer real names and reporting lines from evidence over invention. The current artifact is one source of truth; the corpus is another. Reconcile them with judgment.

Don't churn for the sake of churn. If the user's intent doesn't touch a part of the chart and there's no compelling reason to change it, leave it alone — stability matters when the user is iterating.

Layout asks (radial, horizontal, vertical, compact, etc.): update layout.direction and OMIT layout.nodes so the renderer recomputes positions. Don't re-derive content for a layout-only ask.` : '';

    return `You are generating an ORGANIZATIONAL CHART ARTIFACT for the NXT Humans Design Desk.

DESIGN SYSTEM (authoritative — obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 200000)}

${currentBlock}${reviseDiscipline}
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
  "layout": { "direction": "<TB|LR|BT|RL|radial>" },
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

LAYOUT DIRECTION (the "layout.direction" field, optional, controls how the chart is drawn):
- "TB" — top-to-bottom hierarchy (default; root at top, reports cascade down). Use when the user asks for "vertical", "tree", "top down", "default".
- "LR" — left-to-right hierarchy. Use for "horizontal", "left to right", "lateral".
- "BT" — bottom-to-top. Use for "inverted", "upside down", "bottom up".
- "RL" — right-to-left.
- "radial" — concentric rings, root at center, levels on rings around it. Use for "radial", "circular", "concentric", "ring", "centered", "spider", "starburst".
- When the user gives a layout instruction in REVISE mode, change ONLY layout.direction and OMIT layout.nodes (so the renderer recomputes positions for the new direction).
- For CREATE mode, omit the "layout" field entirely — the renderer will default to TB.

RULES (corpus-driven, title-agnostic — works for any organization type):

STRUCTURE
- nodes[].id values MUST be unique. directReports and rootIds MUST reference ids that exist in nodes[].
- Every node's directReports is an array (possibly empty for leaf nodes).
- rootIds typically has ONE entry (the highest-ranking person/team mentioned in the corpus) but may have multiple for federated, dual-headed, or matrixed structures.
- iconKey: "person" for named individuals (default), "team" for collective nodes named without individuals, "vacant" for explicitly unfilled roles, "external" for partners/vendors/contractors/board members.

EVIDENCE-DRIVEN CONTENT — use whatever titles the corpus actually uses:
- Use the EXACT role titles, team names, department names, and reporting language from the corpus. Do not translate to a generic title taxonomy. If the corpus says "Principal Engineer" use "Principal Engineer", not "Senior Director". If it says "Chief of Staff" use "Chief of Staff", not "Manager".
- Different organization types have different title patterns: corporate (C-suite → SVP → VP → Director → Manager → IC), professional services (Partner → Principal → Senior Associate → Associate), academic/non-profit (Provost/Dean → Department Chair → Faculty), government (Secretary → Undersecretary → Director → Analyst), startup (Founder → Lead → IC), agency (Creative Director → Group Head → Specialist), military (General → Colonel → Major → Captain), etc. Match the corpus.
- Honor every reporting relationship the corpus names — direct, dotted-line (mention in title or department), or matrixed.

DEPTH — go all the way down to the leaves
- Build EVERY level the corpus describes. If the corpus says "Director X manages a team of 8 specialists across 3 sub-teams," all of those sub-teams (and their leads, and their members if named) must appear.
- A two-level chart (root + one row of reports) is almost always under-generated. The rule is: keep descending until you hit named individuals, named sub-teams, or specific unfilled roles. Stop only when the corpus stops.
- If the corpus describes function-level detail (e.g. "the team is split between data engineering and ML ops"), those splits should be modeled as "team" nodes under the manager.

BREADTH — every named report under every manager
- For each manager-level node, include EVERY direct report, sub-team, or function the corpus mentions under that manager. Missing peers is a failure mode just as bad as missing depth.

TARGET SIZE
- 15-40 nodes is typical for a division-level org chart from a rich corpus. Whole-company charts can be 50-100+. Tiny startups can be 5-10.
- If your output has fewer than 12 nodes from a corpus that names dozens of people/teams, you've under-generated — re-scan and add the missed nodes.

NODE TYPE GUIDANCE
- TEAM node: when the corpus names a collective ("the analytics team", "Squad B", "the engagement pod") without naming individual members. Emit ONE node, iconKey "team", same string for "name" and "title". Do NOT invent fake person names for teams.
- VACANT node: ONLY when the corpus EXPLICITLY says a role is unfilled, open, in-search, or vacant. Do NOT use VACANT just because you can't find a name in your context window — the corpus is large; if a role exists, the name almost certainly exists somewhere in the source documents. Search the corpus (especially the FILE: blocks and ===*=== sections) for the actual person before defaulting to VACANT. Most named-role nodes should have real person names.
- EXTERNAL node: when a partner/vendor/contractor/board member appears in the reporting structure. iconKey = "external".
- PERSON node (default): named individual.

OPTIONAL FIELDS — use them when the corpus supports them
- department — populate when the corpus places the role within a named function/division/discipline (engineering, advancement, finance, clinical, etc.)
- location — populate when the corpus mentions a city/region/office for the role
- email — only populate if a literal email appears in the corpus

WHAT TO AVOID
- Do not invent titles, roles, names, or hierarchy levels the corpus does not support.
- Do not fabricate names for unfilled roles — use VACANT.
- Do not collapse two real levels into one — preserve the chain even if intermediate levels have only one person.
- Plain text only; no markdown, no asterisks, no emoji.
- Citations must reference NAMED sources from the corpus — no generic "research" or "data".`;
}
