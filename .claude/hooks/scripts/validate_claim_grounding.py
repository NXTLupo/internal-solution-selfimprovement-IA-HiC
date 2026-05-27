#!/usr/bin/env python3
"""
Claim Grounding Validator — Stop hook (SHADOW MODE for Phase 7).

Per the NotebookLM uplift plan, Phase 7: introduce a single consolidated
validator that does one thing — every claim-bearing sentence must map to
at least one chunk_id whose content contains the claim's key entities +
≥1 key predicate within an edit-distance threshold.

This is the eventual replacement for:
    validate_evidence.py
    validate_citations.py
    validate_citation_resolution.py
    validate_no_silent_fallback.py
    validate_evidence_recency.py

IN SHADOW MODE: runs in parallel with the 5 originals, writes its verdict
to wiki/synthesis/grounding-shadow-log.md, but does NOT block. The user
analyses the shadow log for 1-2 weeks; once false-negative rate is below
the combined floor of the originals, retire them.

Exit 0 = pass (always, in shadow mode).
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SHADOW_LOG = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "grounding-shadow-log.md"


# Same claim-verb heuristic used in evals/run_eval.py
_CLAIM_VERBS = {
    "is", "are", "was", "were", "increases", "decreases", "reduces", "lifts",
    "drives", "shows", "indicates", "found", "reported", "measured", "achieved",
    "improved", "produces", "delivers", "saves", "costs", "demonstrates",
    "raises", "lowers", "expanded", "contracted", "yielded", "generated",
}


def extract_claim_sentences(text: str) -> list[str]:
    if not isinstance(text, str) or not text.strip():
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if any(v in s.lower().split() for v in _CLAIM_VERBS) and len(s) > 30]


def extract_entities(sentence: str) -> list[str]:
    """Cheap NER — proper nouns + numbers + dollar amounts."""
    entities = []
    for tok in re.findall(
        r"\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\b|"  # multi-word proper nouns
        r"\b\d+(?:\.\d+)?%?\b|"                            # numbers / percentages
        r"\$\d+(?:\.\d+)?[KMB]?",                          # dollar amounts
        sentence,
    ):
        if tok.lower() not in {"the", "this", "that", "these", "those", "but", "and", "or", "in", "of", "to"}:
            entities.append(tok)
    return entities


def edit_distance_ratio(a: str, b: str) -> float:
    """Levenshtein ratio (1.0 = identical)."""
    if not a or not b:
        return 0.0
    a, b = a.lower(), b.lower()
    m, n = len(a), len(b)
    if m == 0:
        return 1.0 if n == 0 else 0.0
    if n == 0:
        return 0.0
    # DP
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
        prev = curr
    return 1.0 - prev[n] / max(m, n)


def entity_in_body(entity: str, body: str) -> bool:
    """Case-insensitive substring match with light fuzziness for multi-word entities."""
    if not body:
        return False
    return entity.lower() in body.lower()


def predicate_matches(sentence: str, body: str, threshold: float = 0.85) -> bool:
    """Does any subset of the sentence appear in body with edit-distance ratio ≥ threshold?"""
    if not body:
        return False
    body_l = body.lower()
    # Slide a window of 6-10 word phrases from the claim sentence and check substring presence
    words = sentence.split()
    if len(words) < 4:
        return sentence.lower() in body_l
    for window in (6, 8, 10):
        for i in range(len(words) - window + 1):
            phrase = " ".join(words[i:i + window]).lower()
            if phrase in body_l:
                return True
            # Cheap edit-distance check on the most signal-bearing 6-word window
            if i == 0 and len(body_l) > 0:
                first_phrase = " ".join(words[:window]).lower()
                # Compare against first 500 chars of body
                if edit_distance_ratio(first_phrase, body_l[:500]) >= threshold:
                    return True
    return False


def collect_chunk_source_map(data: Any) -> dict[str, str]:
    """Walk the deliverable for a chunk-source map. Supports several shapes."""
    if not isinstance(data, dict):
        return {}
    # Direct shapes
    for key in ("chunk_source_map", "chunkSourceMap", "_chunk_source_map"):
        v = data.get(key)
        if isinstance(v, dict):
            return {str(k): str(vv) for k, vv in v.items()}
    # Implicit shape: corpus items with id + body
    corpus = data.get("corpus") or data.get("items") or data.get("documents")
    if isinstance(corpus, list):
        return {str(it.get("id", "")): str(it.get("body", it.get("content", "")))
                for it in corpus if isinstance(it, dict) and it.get("id")}
    return {}


def walk_text_fields(obj: Any, path: str = "") -> list[tuple[str, str]]:
    """Yield (path, text) for every string field that might carry claims."""
    out: list[tuple[str, str]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            sub = f"{path}.{k}" if path else k
            if isinstance(v, str) and len(v) > 50:
                # Skip pure-metadata fields
                if k in ("id", "url", "source", "sourceName", "sourceFile", "centroid", "post_ids"):
                    continue
                out.append((sub, v))
            elif isinstance(v, (dict, list)):
                out.extend(walk_text_fields(v, sub))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            out.extend(walk_text_fields(item, f"{path}[{i}]"))
    return out


def find_cited_chunks(sentence: str, deliverable_context: dict) -> list[str]:
    """Look for [CHUNK_NNN] / citations[] / post_ids[] referenced in or near the sentence."""
    chunks: list[str] = []
    # Inline [CHUNK_NNN]
    for m in re.findall(r"\[CHUNK_\d+\]", sentence, flags=re.IGNORECASE):
        chunks.append(m)
    # If sentence had no inline refs, fall back to context's nearest citations array
    if not chunks:
        # The "context" should be the topic / persona / recommendation block the sentence belongs to
        # In shadow mode we accept either format
        for key in ("post_ids", "citations", "sources", "chunk_ids"):
            v = deliverable_context.get(key)
            if isinstance(v, list) and v:
                chunks.extend(str(x) for x in v[:10])
                break
    return chunks


def score_deliverable(data: Any) -> dict:
    """Compute claim_grounding_rate + structured violations."""
    chunk_source_map = collect_chunk_source_map(data)
    if not chunk_source_map:
        return {
            "score": None,
            "total_claims": 0,
            "grounded_claims": 0,
            "violations": [],
            "skipped_reason": "no chunk_source_map found",
        }

    violations: list[dict] = []
    total_claims = 0
    grounded_claims = 0

    # Walk topics + personas + recommendations
    def walk_units(obj: Any, parent_path: str = ""):
        nonlocal total_claims, grounded_claims
        if isinstance(obj, dict):
            # Treat this dict as a "unit" with a citations context
            for text_field in ("summary", "name", "description", "evidenceBasis", "key_quote", "narrative"):
                if text_field in obj and isinstance(obj[text_field], str):
                    for sentence in extract_claim_sentences(obj[text_field]):
                        total_claims += 1
                        cited = find_cited_chunks(sentence, obj)
                        if not cited:
                            violations.append({
                                "path": f"{parent_path}.{text_field}",
                                "reason": "no_cited_chunks",
                                "sentence": sentence[:200],
                            })
                            continue
                        entities = extract_entities(sentence)
                        # If no entities, accept (low-signal claim)
                        if not entities:
                            grounded_claims += 1
                            continue
                        # Check each cited chunk
                        bodies = [chunk_source_map.get(c, "") for c in cited]
                        any_match = False
                        for body in bodies:
                            if not body:
                                continue
                            entities_present = sum(1 for e in entities if entity_in_body(e, body))
                            entity_floor = max(1, len(entities) // 2)  # at least half present
                            if entities_present >= entity_floor and predicate_matches(sentence, body):
                                any_match = True
                                break
                        if any_match:
                            grounded_claims += 1
                        else:
                            violations.append({
                                "path": f"{parent_path}.{text_field}",
                                "reason": "entities_or_predicate_not_in_cited_chunks",
                                "sentence": sentence[:200],
                                "expected_entities": entities[:5],
                                "cited_chunks": cited[:5],
                            })
            # Recurse into nested
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    walk_units(v, f"{parent_path}.{k}" if parent_path else k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                walk_units(item, f"{parent_path}[{i}]")

    walk_units(data)

    return {
        "score": grounded_claims / max(total_claims, 1),
        "total_claims": total_claims,
        "grounded_claims": grounded_claims,
        "violations": violations[:50],  # cap
    }


def append_shadow_log(report: dict) -> None:
    try:
        SHADOW_LOG.parent.mkdir(parents=True, exist_ok=True)
        if not SHADOW_LOG.exists():
            SHADOW_LOG.write_text(
                "---\n"
                "title: Claim Grounding Validator — Shadow Log\n"
                "type: synthesis\n"
                "purpose: Phase 7 shadow-mode evidence for the consolidated validator. "
                "Compare against existing 5 validators before retiring them.\n"
                "---\n\n"
                "# Claim Grounding Shadow Log\n\n",
                encoding="utf-8",
            )
        entry = (
            f"## {datetime.utcnow().isoformat()}Z\n\n"
            f"- **Total claims:** {report['total_claims']}\n"
            f"- **Grounded:** {report['grounded_claims']}\n"
            f"- **Score:** {report['score']:.3f}\n" if report.get("score") is not None else
            f"- **Score:** skipped — {report.get('skipped_reason', 'unknown')}\n"
        )
        entry += f"- **Violations sample:** {len(report.get('violations', []))} flagged\n\n"
        with open(SHADOW_LOG, "a", encoding="utf-8") as f:
            f.write(entry)
    except Exception:
        pass  # shadow log is best-effort; never block on log failure


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    report = score_deliverable(data)
    append_shadow_log(report)

    # SHADOW MODE: never block. Once shadow comparison validates the approach,
    # change `sys.exit(0)` below to `sys.exit(2 if report['score'] < 0.85 else 0)`
    # and update validate_evidence_tier_distribution alongside.
    sys.exit(0)


if __name__ == "__main__":
    main()
