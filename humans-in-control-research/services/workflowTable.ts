// workflowTable.ts - WS-6 M3 (2026-10-30, plan harness-capability-curve-uplift; the harness talk's second design area).
//
// The two workflows HiC runs, DECLARED as node tables over the functions that already exist, so the
// run record shows WHICH node is live, the router (`goalState`) is the same for both, and a node
// name outside the table is a bug the console reports instead of a free-text stage string. The
// artifact turn's verify nodes run IN PARALLEL (submit_deck's judgeDeck: plan gate, density, pointer
// binding, layout) and the chain's independent stages run as a DAG (artifactChain.ts); both record
// their fan-out here so the trajectory in RunState shows parallel verify nodes.
//
//   artifact: plan -> generate -> verify[] -> route -> (repair -> generate | ask | ship)
//   research: decompose -> collect -> chunk -> synthesize -> checkpoint -> complete

import { setStage, recordStep, routeRun, getRun } from './runState';

export type ArtifactNode = 'plan' | 'generate' | 'verify' | 'route' | 'repair' | 'ask' | 'ship';
export type ResearchNode = 'decompose' | 'plan_review' | 'collect' | 'chunk' | 'synthesize' | 'checkpoint' | 'complete';
export type WorkflowId = 'artifact' | 'research';

export interface NodeSpec {
    id: string;
    /** What the node does, in words (the carrier function). */
    does: string;
    /** Nodes that may follow. */
    next: string[];
    /** True when the node fans out to parallel checks. */
    parallel?: boolean;
    /** The retry limit the node enforces, when it has one. */
    retryLimit?: number;
}

export const WORKFLOWS: Record<WorkflowId, { nodes: NodeSpec[] }> = {
    artifact: {
        nodes: [
            { id: 'plan', does: 'interpretRequest -> RequestPlan (requestPlan.ts); DECK MODE gate options', next: ['generate'] },
            { id: 'generate', does: 'callClaude / callGemini with the deck tools (corpusChatService.ts)', next: ['verify', 'ship'] },
            { id: 'verify', does: 'judgeDeck: deckPlanGate || density floor || pointerBinder || layout measure (deckLoop.ts); artifactChain DAG after lift', next: ['route'], parallel: true },
            { id: 'route', does: 'routeGoalState over the verdict (goalState.ts)', next: ['repair', 'ask', 'ship'] },
            { id: 'repair', does: 'submit_deck revision in the same conversation, or artifactRepair with evidence', next: ['generate', 'verify'], retryLimit: 3 },
            { id: 'ask', does: 'deckAsk card: accept as is | narrow | guide (needs_user_input)', next: ['generate', 'ship'] },
            { id: 'ship', does: 'the reply with its AIR, verdicts and run manifest', next: [] },
        ],
    },
    research: {
        nodes: [
            { id: 'decompose', does: 'ensureObjectiveDecomposition -> sub-questions (researchPlanner.ts)', next: ['plan_review', 'collect'] },
            { id: 'plan_review', does: 'ResearchPlanEditor approve / cancel (opt-in)', next: ['collect'] },
            { id: 'collect', does: 'executePlan over the selected packs, uploads and the cached second brain', next: ['chunk'], parallel: true },
            { id: 'chunk', does: 'wiki write-article + manifest chunking with provenance', next: ['synthesize'] },
            { id: 'synthesize', does: 'themes, topics, personas, recommendations (geminiService / aiRouter)', next: ['checkpoint'], parallel: true },
            { id: 'checkpoint', does: 'AnalysisCheckpoint: human review of each stage', next: ['synthesize', 'complete'] },
            { id: 'complete', does: 'session saved; ResearchRunManifest emitted', next: [] },
        ],
    },
};

const _lastNode: Record<WorkflowId, string | null> = { artifact: null, research: null };

/** Enter a node: validates it against the table, sets the run stage and records a step. Returns false on an unknown node. */
export function enterNode(workflow: WorkflowId, node: string, note?: string): boolean {
    const spec = WORKFLOWS[workflow]?.nodes.find(n => n.id === node);
    if (!spec) {
        console.warn(`[workflow] ${workflow}: unknown node "${node}" (declared: ${WORKFLOWS[workflow]?.nodes.map(n => n.id).join(', ')})`);
        return false;
    }
    const prev = _lastNode[workflow];
    const prevSpec = prev ? WORKFLOWS[workflow].nodes.find(n => n.id === prev) : null;
    if (prevSpec && prev !== node && !prevSpec.next.includes(node)) {
        // not an error: a user can jump (a new ask after ship); the record keeps the jump visible
        console.info(`[workflow] ${workflow}: ${prev} -> ${node} is not a declared edge (recorded)`);
    }
    _lastNode[workflow] = node;
    setStage(`${workflow}:${node}`);
    try { recordStep({ stage: `node:${workflow}:${node}`, note: [note, spec.parallel ? 'parallel' : ''].filter(Boolean).join('; ') || undefined }); } catch { /* never break the caller */ }
    return true;
}

/** Record a parallel fan-out inside a node (the verify checks, the chain DAG groups). */
export function recordFanOut(workflow: WorkflowId, node: string, branches: string[], wallMs?: number): void {
    try { recordStep({ stage: `node:${workflow}:${node}:fanout`, note: JSON.stringify({ branches, wall_ms: wallMs }) }); } catch { /* best-effort */ }
}

/** The route the shared router gives the run right now (the checkpoint modal and the chain read the same answer). */
export function currentRoute() { return routeRun(); }

/** The node trajectory of the current run, for the trace and for tests. */
export function nodeTrajectory(workflow?: WorkflowId): string[] {
    return getRun().steps.filter(s => s.stage.startsWith(`node:${workflow || ''}`)).map(s => s.stage.replace(/^node:/, ''));
}

export function _resetWorkflowForTests(): void { _lastNode.artifact = null; _lastNode.research = null; }
