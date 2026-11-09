#!/usr/bin/env python
"""validate_manifest_chunk_parity.py - Enhancement E (manifest integrity).

Offline audit (run on a weekly /loop cadence, NOT a per-request Stop hook -
reading 13K page heads is too slow for the hot path). Detects manifest drift:
a record whose `chunk_count` no longer matches the page's actual `chunks:`
frontmatter block length. When chunk_count > actual, the manifest emits
`{wp}#c{i}` pointers that fail to resolve (notFound); when <, real chunks are
unreachable. Both starve generation silently.

The merge-authority / write-article path keeps the count accurate at WRITE
time (_manifest_record counts from the body). Drift comes from out-of-band
edits or interrupted journal compaction. This audit surfaces it.

Usage:
    python validate_manifest_chunk_parity.py [--limit N] [--report PATH]

Exit codes:
    0 - audit ran (parity OK or drift reported to the report file)
    1 - could not read the manifest

The audit samples up to --limit pages with chunk_count > 0 (default 800) so a
weekly run stays well under a minute on a 13K-page wiki.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
WIKI_BASE = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki"
MANIFEST_FILE = WIKI_BASE / ".manifest.json"
MANIFEST_JOURNAL = WIKI_BASE / ".manifest.journal.jsonl"

_CHUNK_ID_RE = re.compile(r"^\s*- id:\s", re.MULTILINE)


def _load_records() -> dict:
    """Base manifest + journal replay (last write per wikiPath wins)."""
    records: dict = {}
    try:
        base = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        records = dict(base.get("records") or {})
    except Exception:
        records = {}
    if MANIFEST_JOURNAL.is_file():
        try:
            for line in MANIFEST_JOURNAL.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                wp = rec.get("wikiPath") or rec.get("path")
                if wp:
                    records[wp] = rec
        except Exception:
            pass
    return records


def _actual_chunk_count(wiki_path: str) -> int | None:
    p = WIKI_BASE / wiki_path
    if not p.is_file():
        return None
    try:
        text = p.read_text(encoding="utf-8", errors="replace")[:300000]
    except Exception:
        return None
    # 2026-06-11 parity fix (mirrors proxy _manifest_record): scope the count
    # to the FRONTMATTER and to chunk-pointer-shaped ids ("...#cN"). The old
    # 20K head-cap truncated 32-47KB chunks blocks (false drift), and the
    # unanchored `- id:` count picked up body pointer lists (lint reports,
    # theme-synthesis pages).
    if text.startswith("---"):
        fm_end = text.find("\n---\n", 4)
        if fm_end > 0:
            text = text[:fm_end]
    if "\nchunks:" not in text and not text.startswith("chunks:"):
        return 0
    return len(re.findall(r'^\s*- id:\s*"[^"\n]*#c\d+"', text, re.MULTILINE))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=800)
    ap.add_argument("--report", type=str, default="")
    args = ap.parse_args()

    records = _load_records()
    if not records:
        sys.stderr.write("[manifest-parity] could not read manifest\n")
        return 1

    candidates = [(wp, int(rec.get("chunk_count") or 0))
                  for wp, rec in records.items()
                  if int(rec.get("chunk_count") or 0) > 0]
    # Deterministic sample: sorted, take first --limit (no randomness so the
    # report is reproducible run-to-run).
    candidates.sort(key=lambda x: x[0])
    sample = candidates[: args.limit]

    checked = 0
    missing_page = 0
    drift = []  # (wikiPath, manifest_count, actual_count)
    for wp, mcount in sample:
        actual = _actual_chunk_count(wp)
        if actual is None:
            missing_page += 1
            drift.append((wp, mcount, -1))
            continue
        checked += 1
        if actual != mcount:
            drift.append((wp, mcount, actual))

    # 2026-06-08 PATH UNIFICATION (Layer 5): untagged-corpus audit. A chunked
    # article/social-post/transcript record with engagement=='' is INVISIBLE to
    # tier-1 retrieval (/api/manifest/chunks?engagement=<slug>), which forces the
    # run onto the raw-blob fallback that repetition-collapses Gemini. This is the
    # regression signal if collection ever stops stamping `engagement`. We report
    # it (not fail) since the legacy backlog is large and untagged shared-corpus
    # articles are still reachable via the KL-selection union; what matters is that
    # NEW collected articles carry the tag. A spike here run-over-run = regression.
    _CORPUS_TYPES = {"article", "social-post", "transcript"}
    untagged = 0
    tagged = 0
    untagged_samples = []
    for wp, rec in records.items():
        if int(rec.get("chunk_count") or 0) <= 0:
            continue
        if rec.get("type") not in _CORPUS_TYPES:
            continue
        if str(rec.get("engagement") or "").strip():
            tagged += 1
        else:
            untagged += 1
            if len(untagged_samples) < 25:
                untagged_samples.append(wp)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        f"# Manifest chunk-parity audit ({ts})",
        "",
        f"- records with chunk_count>0: {len(candidates)}",
        f"- sampled: {len(sample)} (limit {args.limit})",
        f"- pages checked: {checked}",
        f"- pages missing on disk: {missing_page}",
        f"- parity mismatches: {len([d for d in drift if d[2] >= 0])}",
        "",
        "## Engagement-tag coverage (path-unification, Layer 5)",
        f"- chunked corpus records (article/social-post/transcript): {tagged + untagged}",
        f"- tagged with engagement (tier-1 retrievable): {tagged}",
        f"- UNTAGGED (engagement==''; tier-1 invisible): {untagged}",
        "",
    ]
    if untagged_samples:
        lines.append("### Untagged corpus sample (first 25)")
        for wp in untagged_samples:
            lines.append(f"- {wp}")
        lines.append("")
    if drift:
        lines.append("## Drift (wikiPath | manifest_count | actual)")
        for wp, mc, ac in drift[:200]:
            lines.append(f"- {wp} | {mc} | {'MISSING' if ac < 0 else ac}")
    else:
        lines.append("All sampled pages: manifest chunk_count matches the page chunks: block.")
    report = "\n".join(lines) + "\n"

    if args.report:
        out = Path(args.report)
    else:
        out = WIKI_BASE / "synthesis" / f"manifest-parity-{ts}.md"
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        sys.stderr.write(f"[manifest-parity] {len(drift)} drift item(s); report -> {out}\n")
    except Exception as e:
        sys.stderr.write(f"[manifest-parity] report write failed: {e}\n{report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
