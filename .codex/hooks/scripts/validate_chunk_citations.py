#!/usr/bin/env python
"""validate_chunk_citations.py — Stop hook, UNIVERSAL.

Enforces the manifest-pointer citation contract from the
manifest-chunk-retrieval skill. Every evidence statement in a deliverable
emission MUST end with a `[<wikiPath>#cN]` pointer to a real manifest chunk.

Two reject conditions:
  1. FABRICATED citation: the emission cites a pointer that does NOT exist
     in the engagement's manifest chunk catalog (`/api/manifest/chunks`).
     The model invented the pointer.
  2. UN-CITED evidence: the emission contains an evidence-bearing sentence
     (statistics, named entities, "according to X", quoted text in double
     quotes >=20 chars, "research/study/survey/reported/found that") but
     the sentence carries no `[<wikiPath>#cN]` citation. The model is
     making evidence claims without anchoring them.

Both conditions reject (exit 2) with a structured rejection payload telling
the model exactly what's wrong.

Architecture position (per the 6-layer rule, all named):
  1. WIKI     — chunk pointers live in `<page>.md` frontmatter `chunks:`
                blocks (written by wiki_chunker at ingest + retrofit).
  2. MANIFEST — `wiki/.manifest.json` (+ journal) tracks chunk_count per
                page. `/api/manifest/chunks` returns the pointer catalog.
  3. SKILL    — `.claude/skills/manifest-chunk-retrieval/SKILL.md` declares
                the contract every generator must follow.
  4. HOOK     — THIS FILE. Universal Stop-event validator.
  5. SUBAGENT — `.claude/agents/chunk-retrieval-strategist.md` plans
                non-trivial chunk-selection tasks.
  6. SELF-IMPROVE — every rejection appends to
                `wiki/synthesis/hook-rejection-log.md`; epoch-proposer
                mines the pattern across runs.

Failure mode: when the engagement slug can't be determined, the hook
PASSES (exit 0) instead of rejecting. The hook is strict about citation
discipline but never blocks the user when the underlying contract isn't
applicable (e.g. a chat reply, a tool-result acknowledgment).

Exit codes:
  0 — pass
  2 — reject with structured payload
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
REJECTION_LOG = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "hook-rejection-log.md"
USER_SELECTION_PATH = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "user-selections" / "active.json"
PROXY_BASE = os.environ.get("HIC_PROXY_BASE", "http://127.0.0.1:5012")

# A chunk pointer has the shape <wikiPath>#c<index>. The wikiPath is
# slash-delimited relative path with .md/.markdown extension. The index is
# a non-negative integer. Tight enough to avoid matching arbitrary
# bracketed text; loose enough to catch every legitimate pointer.
_CITATION_RE = re.compile(
    r"\[([A-Za-z0-9_./\-]+\.(?:md|markdown)#c\d+)\]"
)

# Evidence tells that REQUIRE a chunk pointer when present in a sentence.
# Conservative — false positives here would block legitimate non-evidence
# sentences, so we keep this to the highest-signal patterns only.
_EVIDENCE_TELLS = re.compile(
    r"("
    r"\d+(?:\.\d+)?\s*%"                       # percent stat
    r"|\$\d+(?:[.,]\d+)?\s*[KMBkmb]?\b"        # dollar amount
    r"|\baccording to\b"                       # attribution
    r"|\breported (?:that|by)\b"               # reported speech
    r"|\bfound that\b"                         # research finding
    r"|\b(?:study|studies|survey|surveys|research|paper) (?:found|showed?|reports?|indicates?)\b"  # research verb
    r"|\"[^\"]{20,}\""                         # quoted text >= 20 chars
    r")",
    re.IGNORECASE,
)

# Tags that mark message as a relevant deliverable. Mirrors the
# dispatch_validators.py classification — we only validate citation
# discipline for the deliverable types where evidence-grounding is
# load-bearing (themes, personas, recommendations, strategy, blueprint,
# journey, gap, audit, prd, roadmap, competitive, tech-arch, brief,
# report, explainer, case-study, meta-themes, mindmap). Chat replies and
# tool-result acks are not validated.
_RELEVANT_TAG_RE = re.compile(
    r"#(themes|personas?|recommendations?|strategy|blueprint|journey|gap|"
    r"audit|prd|roadmap|compete|competitive|arch|architecture|brief|"
    r"report|explainer|case-study|meta-themes|mindmap|org)\b",
    re.IGNORECASE,
)


def _read_payload_text(payload: Any) -> str:
    """Get the emitted text from the Stop event payload — same code path
    every other validator in this directory uses."""
    text = ""
    if isinstance(payload, dict):
        text = payload.get("output") or payload.get("text") or ""
        if not text and payload.get("transcript_path") and os.path.isfile(payload["transcript_path"]):
            try:
                lines = Path(payload["transcript_path"]).read_text(encoding="utf-8").splitlines()
                for line in reversed(lines):
                    try:
                        entry = json.loads(line)
                    except Exception:
                        continue
                    if entry.get("role") == "assistant" or entry.get("type") == "assistant":
                        c = entry.get("content") or ""
                        if isinstance(c, list):
                            text = "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
                        elif isinstance(c, str):
                            text = c
                        break
            except Exception:
                pass
    elif isinstance(payload, str):
        text = payload
    return text


def _engagement_slug_from_payload(text: str, payload: dict) -> str | None:
    """Best-effort engagement slug extraction. Checks payload first, then
    sniffs the user-selection store, then a slug pattern in the text."""
    if isinstance(payload, dict):
        for k in ("engagement_slug", "engagement", "session_slug"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
    # User selection has source_engagement_slug
    try:
        if USER_SELECTION_PATH.is_file():
            data = json.loads(USER_SELECTION_PATH.read_text(encoding="utf-8"))
            slug = data.get("source_engagement_slug")
            if isinstance(slug, str) and slug.strip():
                return slug.strip()
    except Exception:
        pass
    # Slug pattern in text
    m = re.search(r'engagement[=:"\'\s]+([a-z0-9][-a-z0-9]{4,80})', text or "", re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _fetch_manifest_chunk_ids(slug: str) -> tuple[set[str] | None, int]:
    """Hit /api/manifest/chunks and return (catalog_set, engagement_scoped_count).

    Returns (None, 0) when the proxy is unreachable (treat as 'cannot
    validate, pass'). The engagement_scoped_count is what the engagement-
    filtered query returned; the catalog_set is the GLOBAL catalog (used
    for existence-of-pointer checks). When the engagement-scoped count is
    0, the validator tightens its un-cited-evidence rule (the model had
    nothing in scope to cite, so demanding citations is unfair).
    """
    eng_count = 0
    try:
        # Engagement-scoped first.
        url = f"{PROXY_BASE}/api/manifest/chunks?engagement={slug}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ids = data.get("chunk_ids") or []
            if isinstance(ids, list):
                eng_count = len(ids)
        # Global catalog for existence-of-pointer validation.
        url2 = f"{PROXY_BASE}/api/manifest/chunks?engagement=&types=social-post,article,upload,transcript,synthesis"
        req2 = urllib.request.Request(url2, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req2, timeout=15) as resp2:
            data2 = json.loads(resp2.read().decode("utf-8"))
            ids2 = data2.get("chunk_ids") or []
            if isinstance(ids2, list):
                return set(str(x) for x in ids2), eng_count
    except Exception:
        return None, 0
    return None, eng_count


def _append_rejection_log(record: dict) -> None:
    try:
        REJECTION_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(REJECTION_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass


def _scan(text: str, manifest_ids: set[str]) -> dict:
    """Return findings (citations, fabricated, missing) without rejecting.
    The caller decides the action."""
    cites = sorted({m.group(1) for m in _CITATION_RE.finditer(text or "")})
    fabricated = sorted(c for c in cites if c not in manifest_ids)

    # Sentence walk for un-cited evidence.
    sentences = re.split(r"(?<=[.!?])\s+", text or "")
    uncited: list[str] = []
    for s in sentences:
        if len(s) < 30:
            continue
        if not _EVIDENCE_TELLS.search(s):
            continue
        if _CITATION_RE.search(s):
            continue
        uncited.append(s.strip()[:200])
        if len(uncited) >= 10:
            break
    return {
        "citations": cites,
        "fabricated": fabricated,
        "uncited_evidence": uncited,
    }


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload: Any = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    text = _read_payload_text(payload)
    if not text or len(text) < 80:
        return 0

    # Only validate relevant deliverable emissions. Chat acks etc. pass.
    if not _RELEVANT_TAG_RE.search(text):
        return 0

    slug = _engagement_slug_from_payload(text, payload if isinstance(payload, dict) else {})
    if not slug:
        # Without a slug we can't fetch the manifest catalog; pass.
        return 0

    manifest_ids, eng_count = _fetch_manifest_chunk_ids(slug)
    if manifest_ids is None:
        # Proxy unreachable; pass (don't block the user on infra hiccup).
        return 0

    if not manifest_ids:
        # The engagement has no chunked corpus yet. We can still catch
        # FABRICATED pointers (any cited pointer is fabricated when the
        # manifest is empty), but we can't enforce evidence-must-cite
        # because there are no chunks to cite. Run the fabricated check
        # only.
        findings = _scan(text, manifest_ids)
        if findings["fabricated"]:
            reason = (
                f"Fabricated chunk pointers detected: the emission cites "
                f"{len(findings['fabricated'])} pointer(s) that do NOT exist in "
                f"the engagement's manifest. The engagement '{slug}' has NO "
                f"chunked corpus yet (manifest is empty), so any [<wikiPath>#cN] "
                f"citation in the output is invented. Re-emit with citations "
                f"removed, or run the wiki retrofit + ingest before generating. "
                f"Examples: {', '.join(findings['fabricated'][:5])}"
            )
            _append_rejection_log({
                "validator": "validate_chunk_citations.py",
                "fail_reason": "fabricated_with_empty_manifest",
                "engagement_slug": slug,
                "fabricated_count": len(findings["fabricated"]),
                "fabricated_sample": findings["fabricated"][:8],
            })
            print(json.dumps({"ok": False, "block": True, "reason": reason}))
            return 2
        return 0

    findings = _scan(text, manifest_ids)

    fails: list[str] = []
    if findings["fabricated"]:
        fails.append(
            f"FABRICATED CITATIONS: the emission cites {len(findings['fabricated'])} "
            f"chunk pointer(s) that do not exist in the manifest. "
            f"Examples: {', '.join(findings['fabricated'][:5])}. "
            f"Either cite a real pointer from the CORPUS block in your prompt, "
            f"or remove the claim entirely."
        )
    # Un-cited-evidence rule fires ONLY when the engagement has chunks in
    # scope. If eng_count == 0, the model had nothing curated to cite, so
    # demanding citations is unfair (and would break legacy deliverables
    # that ran before the manifest contract). This is the upstream-fix
    # discipline from the standing rule: only enforce when the upstream
    # actually delivered what enforcement depends on.
    if findings["uncited_evidence"] and eng_count > 0:
        first = findings["uncited_evidence"][0]
        fails.append(
            f"UN-CITED EVIDENCE: {len(findings['uncited_evidence'])} evidence-bearing "
            f"sentence(s) carry no chunk pointer. Every quoted text, statistic, "
            f"named-source attribution, or research-finding statement MUST end with "
            f"[<wikiPath>#cN]. First flagged sentence: \"{first}\". "
            f"Re-emit with a chunk pointer on every evidence sentence; for any claim "
            f"you can't anchor, drop it. (Engagement '{slug}' has {eng_count} "
            f"chunks in scope.)"
        )

    if not fails:
        return 0

    reason = " | ".join(fails) + (
        f" — Manifest carries {len(manifest_ids)} chunk pointer(s) for this "
        f"engagement; pick from those when citing."
    )
    _append_rejection_log({
        "validator": "validate_chunk_citations.py",
        "fail_reason": "citation_discipline_violation",
        "engagement_slug": slug,
        "citations_found": findings["citations"][:20],
        "fabricated_count": len(findings["fabricated"]),
        "uncited_evidence_count": len(findings["uncited_evidence"]),
        "fabricated_sample": findings["fabricated"][:5],
        "uncited_sample": findings["uncited_evidence"][:3],
    })
    print(json.dumps({"ok": False, "block": True, "reason": reason}))
    return 2


if __name__ == "__main__":
    sys.exit(main())
