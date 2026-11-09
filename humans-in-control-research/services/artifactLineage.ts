/**
 * Artifact lineage (2026-10-31, agent-stack plan WS-C C1). Every AIR names its place in a chain: the root it
 * descends from, its revision number, its parent and why it was revised. Before this, a revised deck emitted a
 * new AIR with no link to the deck it revised, so "every version keeps its prompts and files" held for each
 * record and not for the chain between them.
 *
 * What counts as a revision is decided upstream, never by keywords here: the request plan's model reading
 * (`mode: 'edit'`), an explicit `#refine`, or a second generation call inside one turn (the depth delta).
 * Inside-turn repairs that never shipped as a separate version (the parity re-ask, the source fill) ride on
 * the shipped record as `steps`; the post-chain repair rounds already ride on `postChain`.
 *
 * The parent is the newest artifact of the same type in the same run: this tab's memory first, then the
 * proxy's AIR list (a reload loses the memory, the files stay). Resolution is serialized per run and type so
 * two emissions in one turn cannot both claim the same parent.
 */
import { proxyBase } from './proxyConfig';

export interface ArtifactLineage {
    /** The artifact this one revises; absent on a root. */
    parentArtifactId?: string;
    /** The first artifact of the chain (itself on a root). */
    rootArtifactId: string;
    /** 1 on a root; parent + 1 on a revision. */
    revision: number;
    /** Why this version exists, in the user's words when a user asked for it. */
    reason: string;
    /** Revisions inside the turn that never shipped as their own version. */
    steps?: string[];
    /** Set by POST /api/air/fork: the record this chain was copied from. */
    forkedFrom?: { runId: string; artifactId: string; revision?: number };
}

/** A caller's statement that this emission revises an earlier artifact. */
export interface RevisionRequest {
    reason: string;
    /** Name the parent when known; otherwise the newest artifact of the same type in the run. */
    parentArtifactId?: string;
}

interface Known { artifactId: string; lineage: ArtifactLineage }

const _latest = new Map<string, Known>();
const _byId = new Map<string, ArtifactLineage>();
const _queue = new Map<string, Promise<unknown>>();

const keyOf = (runId: string, artifactType: string) => `${runId}|${artifactType}`;

export type LatestLookup = (runId: string, artifactType: string) => Promise<Known | null>;
export type ByIdLookup = (runId: string, artifactId: string) => Promise<ArtifactLineage | null>;

function cleanReason(reason: string): string {
    return String(reason || '').replace(/\s+/g, ' ').replace(/—/g, ',').trim().slice(0, 160) || 'revised';
}

export function rootLineage(artifactId: string, reason = 'generated'): ArtifactLineage {
    return { rootArtifactId: artifactId, revision: 1, reason: cleanReason(reason) };
}

export function childLineage(parent: Known, reason: string): ArtifactLineage {
    return {
        parentArtifactId: parent.artifactId,
        rootArtifactId: parent.lineage?.rootArtifactId || parent.artifactId,
        revision: Math.max(1, Number(parent.lineage?.revision) || 1) + 1,
        reason: cleanReason(reason),
    };
}

async function proxyLatest(runId: string, artifactType: string): Promise<Known | null> {
    try {
        const q = new URLSearchParams({ run_id: runId, kind: artifactType, limit: '1' });
        const r = await fetch(`${proxyBase()}/api/air/list?${q.toString()}`, { signal: AbortSignal.timeout(2500) });
        if (!r.ok) return null;
        const row = (await r.json())?.artifacts?.[0];
        if (!row?.artifact_id) return null;
        return { artifactId: String(row.artifact_id), lineage: row.lineage || rootLineage(String(row.artifact_id)) };
    } catch {
        return null;
    }
}

async function proxyById(runId: string, artifactId: string): Promise<ArtifactLineage | null> {
    try {
        const q = new URLSearchParams({ run_id: runId, chain_of: artifactId, limit: '1' });
        const r = await fetch(`${proxyBase()}/api/air/list?${q.toString()}`, { signal: AbortSignal.timeout(2500) });
        if (!r.ok) return null;
        const hit = ((await r.json())?.chain || []).find((c: any) => c?.artifact_id === artifactId);
        return hit ? (hit.lineage || rootLineage(artifactId)) : null;
    } catch {
        return null;
    }
}

/**
 * Resolve the lineage of one emission and record it as the newest of its type, so the next revision in this
 * tab finds it without a network call. Serialized per run and type.
 */
export async function resolveLineage(
    air: { runId: string; artifactId: string; artifactType: string },
    revision?: RevisionRequest,
    deps: { latest?: LatestLookup; byId?: ByIdLookup } = {},
): Promise<ArtifactLineage> {
    const key = keyOf(air.runId, air.artifactType);
    const prior = _queue.get(key) || Promise.resolve();
    const job = prior.catch(() => undefined).then(async () => {
        let lineage: ArtifactLineage;
        if (!revision) {
            lineage = rootLineage(air.artifactId);
        } else {
            let parent: Known | null = null;
            if (revision.parentArtifactId) {
                const known = _byId.get(revision.parentArtifactId) || await (deps.byId || proxyById)(air.runId, revision.parentArtifactId);
                if (known) parent = { artifactId: revision.parentArtifactId, lineage: known };
            }
            if (!parent) parent = _latest.get(key) || await (deps.latest || proxyLatest)(air.runId, air.artifactType);
            // a revision of nothing recorded is honestly a root; the reason still says what was asked
            lineage = parent && parent.artifactId !== air.artifactId ? childLineage(parent, revision.reason) : rootLineage(air.artifactId, revision.reason);
        }
        _latest.set(key, { artifactId: air.artifactId, lineage });
        _byId.set(air.artifactId, lineage);
        return lineage;
    });
    _queue.set(key, job);
    return job;
}

/** The newest known lineage of a type in a run (this tab only). */
export function latestLineage(runId: string, artifactType: string): Known | null {
    return _latest.get(keyOf(runId, artifactType)) || null;
}

/** "v3 of 3, from v2: narrowed scope". `ofRevision` is the newest revision in the chain the caller knows. */
export function lineageLabel(lineage: ArtifactLineage, ofRevision?: number): string {
    const of = Math.max(lineage.revision, Number(ofRevision) || 0);
    const head = `v${lineage.revision} of ${of}`;
    if (lineage.forkedFrom) return `${head}, forked from ${lineage.forkedFrom.artifactId}`;
    if (!lineage.parentArtifactId) return head;
    return `${head}, from v${lineage.revision - 1}: ${lineage.reason}`;
}

/** Test seam. */
export function __resetLineageForTests(): void {
    _latest.clear();
    _byId.clear();
    _queue.clear();
}
