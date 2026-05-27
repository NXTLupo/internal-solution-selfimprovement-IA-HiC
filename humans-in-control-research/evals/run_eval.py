#!/usr/bin/env python3
"""
HiC eval harness — Phase 0 substrate.

Runs a golden corpus through the HiC topic-modeling pipeline and computes
the 5 KPIs from kpi_definitions.json.

Usage:
    python evals/run_eval.py --corpus corpus-v1/higher-ed-coop \\
        --pipeline-version v4.2 \\
        --output evals/runs/2026-05-24-baseline.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any

try:
    import httpx
except ImportError:
    print("This harness requires httpx: pip install httpx")
    raise SystemExit(1)


PROXY_BASE = "http://localhost:5012"


# ──────────────────────────────────────────────────────────────────────────
# KPI 1 — theme_recall@20
# ──────────────────────────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())


def _token_set_ratio(a: str, b: str) -> float:
    """Fuzzy match by token-set overlap. Cheap, deterministic."""
    ta = set(_normalize(a).split())
    tb = set(_normalize(b).split())
    if not ta or not tb:
        return 0.0
    inter = ta & tb
    return (2 * len(inter)) / (len(ta) + len(tb))


def theme_recall_at_20(generated: list[dict], expected: list[dict], threshold: float = 0.7) -> float:
    """Fraction of expected themes matched by top-20 generated."""
    if not expected:
        return 0.0
    g_names = [t.get("name", "") for t in generated[:20]]
    matched = 0
    for e in expected:
        e_name = e.get("name", "")
        if any(_token_set_ratio(e_name, gn) >= threshold for gn in g_names):
            matched += 1
    return matched / len(expected)


# ──────────────────────────────────────────────────────────────────────────
# KPI 2 — citation_grounding_rate
# ──────────────────────────────────────────────────────────────────────────

_CLAIM_VERBS = {
    "is", "are", "was", "were", "increases", "decreases", "reduces", "lifts",
    "drives", "shows", "indicates", "found", "reported", "measured", "achieved",
    "improved", "produces", "delivers", "saves", "costs", "demonstrates",
}


def _extract_claim_sentences(text: str) -> list[str]:
    """Naive sentence segmentation + claim-verb filter."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s for s in sentences if any(v in s.lower().split() for v in _CLAIM_VERBS)]


def _extract_entities(sentence: str) -> list[str]:
    """Naive NER — proper nouns + number tokens."""
    entities = []
    for tok in re.findall(r"\b[A-Z][a-zA-Z]+\b|\b\d+(?:\.\d+)?%?\b|\$\d+(?:\.\d+)?[KMB]?", sentence):
        if tok.lower() not in {"the", "this", "that", "these", "those", "but", "and", "or"}:
            entities.append(tok)
    return entities


def _entity_in_body(entity: str, body: str) -> bool:
    return entity.lower() in body.lower()


def citation_grounding_rate(deliverable: dict, chunk_source_map: dict[str, str]) -> float:
    """Fraction of claim sentences whose cited chunks contain the claim entities."""
    grounded = 0
    total = 0
    for theme in deliverable.get("topics", []):
        # Summary + name are the claim-bearing surfaces for a theme
        for text_field in (theme.get("summary", ""), theme.get("name", "")):
            for sentence in _extract_claim_sentences(text_field):
                total += 1
                cited_post_ids = theme.get("post_ids", [])
                if not cited_post_ids:
                    continue
                entities = _extract_entities(sentence)
                if not entities:
                    continue
                # Look up each cited post in the chunk_source_map; if any contain all entities, grounded
                for post_id in cited_post_ids:
                    body = chunk_source_map.get(post_id, "")
                    if not body:
                        continue
                    if all(_entity_in_body(e, body) for e in entities):
                        grounded += 1
                        break
    return grounded / max(total, 1)


# ──────────────────────────────────────────────────────────────────────────
# KPI 3 — reproducibility_drift (run-time only, requires N runs)
# ──────────────────────────────────────────────────────────────────────────

def reproducibility_drift(runs: list[list[dict]]) -> float:
    """Given N runs of theme lists from the same corpus, compute drift."""
    if len(runs) < 2:
        return 0.0
    baseline_names = {_normalize(t.get("name", "")) for t in runs[0]}
    drift_count = 0
    comparisons = 0
    for r in runs[1:]:
        run_names = {_normalize(t.get("name", "")) for t in r}
        comparisons += len(baseline_names)
        drift_count += len(baseline_names.symmetric_difference(run_names)) / 2
    return drift_count / max(comparisons, 1)


# ──────────────────────────────────────────────────────────────────────────
# Harness orchestration
# ──────────────────────────────────────────────────────────────────────────

def load_corpus(corpus_dir: Path) -> dict[str, Any]:
    """Load corpus.jsonl + goal.txt + expected_*.json."""
    items = []
    corpus_file = corpus_dir / "corpus.jsonl"
    if corpus_file.exists():
        with open(corpus_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    items.append(json.loads(line))
    goal = ""
    goal_file = corpus_dir / "goal.txt"
    if goal_file.exists():
        goal = goal_file.read_text(encoding="utf-8").strip()
    expected_themes = []
    et_file = corpus_dir / "expected_themes.json"
    if et_file.exists():
        expected_themes = json.loads(et_file.read_text(encoding="utf-8"))
    return {"items": items, "goal": goal, "expected_themes": expected_themes}


def corpus_hash(items: list[dict]) -> str:
    """Deterministic hash of corpus content."""
    h = hashlib.sha256()
    for item in sorted(items, key=lambda x: x.get("id", "")):
        h.update(item.get("id", "").encode("utf-8"))
        h.update(b"\x00")
        h.update(item.get("title", "").encode("utf-8"))
        h.update(b"\x00")
        h.update(item.get("body", "")[:2000].encode("utf-8"))  # first 2KB plenty for ID
        h.update(b"\x00")
    return h.hexdigest()


def run_pipeline(items: list[dict], goal: str, target_topic_count: int = 25) -> dict[str, Any]:
    """POST /api/topic-model/analyze, poll until complete."""
    t0 = time.time()
    with httpx.Client(timeout=600.0) as client:
        resp = client.post(
            f"{PROXY_BASE}/api/topic-model/analyze",
            json={
                "items": items,
                "research_goal": goal,
                "min_cluster_size": 5,
                "target_topic_count": target_topic_count,
            },
        )
        if resp.status_code != 200:
            raise RuntimeError(f"analyze HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        job_id = data["job_id"]

        first_theme_time = None
        while True:
            time.sleep(2.0)
            r = client.get(f"{PROXY_BASE}/api/topic-model/status/{job_id}")
            if r.status_code != 200:
                raise RuntimeError(f"status HTTP {r.status_code}: {r.text[:300]}")
            state = r.json()
            if state.get("status") == "completed":
                if first_theme_time is None:
                    first_theme_time = time.time() - t0
                state["_time_to_first_theme"] = first_theme_time
                state["_total_duration"] = time.time() - t0
                return state["result"] if "result" in state else state
            if state.get("status") == "failed":
                raise RuntimeError(f"job failed: {state.get('error')}")


def build_chunk_source_map(items: list[dict]) -> dict[str, str]:
    """Build id → body map for citation_grounding scoring."""
    return {item.get("id", f"item_{i}"): item.get("body", item.get("content", "")) for i, item in enumerate(items)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", required=True, help="Path to corpus directory")
    parser.add_argument("--pipeline-version", default="unknown")
    parser.add_argument("--output", required=True, help="Output JSON path")
    parser.add_argument("--reproducibility-runs", type=int, default=1,
                        help="Run N times to compute reproducibility_drift")
    args = parser.parse_args()

    corpus_dir = Path(args.corpus)
    if not corpus_dir.is_absolute():
        corpus_dir = Path(__file__).parent / args.corpus
    if not corpus_dir.exists():
        print(f"Corpus dir not found: {corpus_dir}")
        raise SystemExit(2)

    print(f"[eval] Loading corpus from {corpus_dir}")
    corpus = load_corpus(corpus_dir)
    items = corpus["items"]
    goal = corpus["goal"]
    expected_themes = corpus["expected_themes"]

    if not items:
        print(f"WARN: corpus is empty at {corpus_dir}")
    if not goal:
        print(f"WARN: goal.txt missing or empty")
    if not expected_themes:
        print(f"WARN: expected_themes.json missing — KPI 1 will be 0.0")

    print(f"[eval] corpus_hash: {corpus_hash(items)[:16]}…")
    print(f"[eval] items: {len(items)}, expected_themes: {len(expected_themes)}, goal: {goal[:80]}…")

    chunk_source_map = build_chunk_source_map(items)

    runs = []
    for i in range(args.reproducibility_runs):
        print(f"[eval] Running pipeline (run {i+1}/{args.reproducibility_runs})…")
        try:
            result = run_pipeline(items, goal)
        except Exception as e:
            print(f"[eval] Pipeline run failed: {e}")
            result = {"error": str(e), "topics": []}
        runs.append(result)

    primary = runs[0]
    topics = primary.get("topics", [])

    metrics = {
        "theme_recall_at_20": theme_recall_at_20(topics, expected_themes) if expected_themes else None,
        "citation_grounding_rate": citation_grounding_rate(primary, chunk_source_map),
        "reproducibility_drift": reproducibility_drift([r.get("topics", []) for r in runs]) if args.reproducibility_runs > 1 else None,
        "time_to_first_theme": primary.get("_time_to_first_theme"),
        "total_duration": primary.get("_total_duration"),
    }

    output = {
        "pipeline_version": args.pipeline_version,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "corpus_dir": str(corpus_dir),
        "corpus_hash": corpus_hash(items),
        "item_count": len(items),
        "expected_theme_count": len(expected_themes),
        "topics_generated": len(topics),
        "convergent_count": sum(1 for t in topics if t.get("convergent_evidence")),
        "metrics": metrics,
        "raw_run_count": len(runs),
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"[eval] Wrote {out_path}")
    print(f"[eval] metrics: {json.dumps(metrics, indent=2)}")


if __name__ == "__main__":
    main()
