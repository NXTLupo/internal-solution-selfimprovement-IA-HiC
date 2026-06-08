#!/usr/bin/env python
"""validate_insight_provenance.py — Stop hook.

Catches the failure mode where persistInsightAsChunk writes an insight to
the wiki but the insight's `generation_provenance.source_chunks` cites
chunk pointers that do not exist in the manifest. That's a drift signal:
the model thought it was citing real evidence but the pointers were
fabricated or stale.

Pairs with validate_chunk_citations.py (which checks LIVE emissions) — this
hook checks the PERSISTED record after the emit-wrapper writes it back to
the wiki. If a freshly-persisted insight has invalid provenance, we log
the rejection (the user gets a structured warning) and the epoch-proposer
mines the pattern.

Architecture position (6-layer trace, all named):
  1. WIKI     — insight pages live at `wiki/synthesis/insights/<slug>/<kind>/<id>.md`
  2. MANIFEST — every insight page contributes its own chunks to the manifest
                via wiki_chunker on write. The provenance is recorded in
                the page's `<!-- nxt:provenance ... -->` HTML comment block.
  3. SKILL    — manifest-chunk-retrieval skill declares the persistence
                contract; the model knows insights become first-class chunks.
  4. HOOK     — THIS FILE. Validates persisted insights' provenance.
  5. SUBAGENT — chunk-retrieval-strategist plans which chunks to inject
                BEFORE generation; this validator catches what got persisted
                AFTER generation.
  6. SELF-IMPROVE — rejections feed the epoch-proposer; recurring
                provenance failures suggest the pre-rank ranker needs work.

Behavior:
  - PASSES quietly when no insights were persisted in this turn.
  - PASSES when all insights' provenance source_chunks resolve in the manifest.
  - WARNS (logs rejection but exits 0) when some pointers are stale: the
    insight already shipped to disk; rejecting at this stage just confuses
    the user. The epoch-proposer mines the warning rate to suggest fixes.
  - REJECTS (exit 2) ONLY when EVERY source_chunk on a persisted insight
    is invalid — that's a clear "model invented all its evidence" signal
    that needs immediate visibility.

Exit codes:
  0 — pass (no insights persisted, or provenance OK, or warning-only)
  2 — reject (every source_chunk in at least one persisted insight is fake)
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
INSIGHTS_DIR = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "insights"
REJECTION_LOG = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "hook-rejection-log.md"
PROXY_BASE = os.environ.get("HIC_PROXY_BASE", "http://127.0.0.1:5012")

# Match the HTML-comment provenance block the persistInsightAsChunk helper
# embeds: <!-- nxt:provenance {...json...} -->
_PROVENANCE_RE = re.compile(r"<!--\s*nxt:provenance\s+(\{.*?\})\s*-->", re.DOTALL)

# How far back (seconds) to consider an insight "freshly persisted" for
# this Stop turn. Any insight whose file mtime is within this window is
# treated as in-scope for validation.
FRESH_WINDOW_S = 120


def _engagement_slug_from_payload(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    for k in ("engagement_slug", "engagement", "session_slug"):
        v = payload.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    try:
        sel = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "user-selections" / "active.json"
        if sel.is_file():
            data = json.loads(sel.read_text(encoding="utf-8"))
            slug = data.get("source_engagement_slug")
            if isinstance(slug, str) and slug.strip():
                return slug.strip()
    except Exception:
        pass
    return None


def _fetch_manifest_chunk_ids(slug: str) -> set[str] | None:
    try:
        url = f"{PROXY_BASE}/api/manifest/chunks?engagement={slug}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ids = data.get("chunk_ids") or []
            if isinstance(ids, list):
                return set(str(x) for x in ids)
    except Exception:
        return None
    return None


def _iter_fresh_insight_files(slug: str, now: float) -> list[Path]:
    """Walk wiki/synthesis/insights/<slug>/<kind>/*.md and return the files
    whose mtime is within the FRESH_WINDOW_S. Returns [] when the slug dir
    doesn't exist."""
    base = INSIGHTS_DIR / slug
    if not base.is_dir():
        return []
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(base):
        for fn in filenames:
            if not fn.endswith(".md"):
                continue
            p = Path(dirpath) / fn
            try:
                mt = p.stat().st_mtime
            except OSError:
                continue
            if now - mt <= FRESH_WINDOW_S:
                out.append(p)
    return out


def _extract_provenance(page_text: str) -> dict | None:
    if not page_text:
        return None
    m = _PROVENANCE_RE.search(page_text)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _append_rejection_log(record: dict) -> None:
    try:
        REJECTION_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(REJECTION_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload: Any = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    slug = _engagement_slug_from_payload(payload)
    if not slug:
        return 0

    now = time.time()
    files = _iter_fresh_insight_files(slug, now)
    if not files:
        return 0

    manifest_ids = _fetch_manifest_chunk_ids(slug)
    if manifest_ids is None:
        # Proxy unreachable; can't validate, pass.
        return 0

    fully_invalid: list[dict] = []
    partially_invalid: list[dict] = []
    valid: int = 0
    for f in files:
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        prov = _extract_provenance(text)
        if not prov:
            continue
        gen_prov = (prov.get("generation_provenance") or {})
        src = gen_prov.get("source_chunks") or []
        if not isinstance(src, list):
            continue
        if not src:
            continue
        bad = [s for s in src if isinstance(s, str) and s not in manifest_ids]
        good = [s for s in src if isinstance(s, str) and s in manifest_ids]
        if not good and bad:
            fully_invalid.append({
                "path": str(f.relative_to(REPO_ROOT)),
                "insight_id": prov.get("insight_id"),
                "kind": prov.get("kind"),
                "bad_count": len(bad),
                "bad_sample": bad[:5],
            })
        elif bad:
            partially_invalid.append({
                "path": str(f.relative_to(REPO_ROOT)),
                "insight_id": prov.get("insight_id"),
                "bad_count": len(bad),
                "good_count": len(good),
                "bad_sample": bad[:3],
            })
        else:
            valid += 1

    # Log warnings for partial invalidity (epoch-proposer mines this).
    for entry in partially_invalid:
        _append_rejection_log({
            "validator": "validate_insight_provenance.py",
            "fail_reason": "partial_provenance_invalid_warning",
            "engagement_slug": slug,
            **entry,
        })

    if fully_invalid:
        reason = (
            f"Persisted insights with FULLY INVALID provenance detected: "
            f"{len(fully_invalid)} insight(s) cite source chunks that do not "
            f"exist in the manifest for engagement '{slug}'. Every "
            f"source_chunk on these insights was fabricated. "
            f"Examples: {', '.join(e['insight_id'] or e['path'] for e in fully_invalid[:5])}. "
            f"Investigate: (1) is the manifest stale? Run /api/wiki/retrofit-chunks "
            f"to refresh. (2) did the generator skip the chunkRetrieval pre-rank? "
            f"Check the trace for missing pickChunksForPrompt + assembleChunkCorpus "
            f"calls. Other validation: {valid} valid, {len(partially_invalid)} "
            f"partial-invalid (warning-only)."
        )
        _append_rejection_log({
            "validator": "validate_insight_provenance.py",
            "fail_reason": "fully_invalid_provenance",
            "engagement_slug": slug,
            "fully_invalid": fully_invalid[:10],
            "partial_count": len(partially_invalid),
            "valid_count": valid,
        })
        print(json.dumps({"ok": False, "block": True, "reason": reason}))
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
