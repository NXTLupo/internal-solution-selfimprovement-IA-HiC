"""Chunked-embedding backfill orchestrator.

Walks hic-workspace/wiki/{articles,transcripts,uploads,sources}/, chunks each
markdown article, embeds chunks in batches (96 per OpenAI request), upserts
into the sqlite-vec store at hic-workspace/wiki/.vectors.db.

Skips articles already indexed with matching chunk count (idempotent —
safe to re-run after partial failure or new article writes).

Usage (CLI):
  python wiki_embed_backfill.py [--wiki PATH] [--db PATH] [--dry-run]
                                [--limit N] [--scopes articles,uploads,...]

Used at runtime by:
  /api/wiki/embed-rebuild — full or scoped corpus rebuild
  _embed_and_cache_article — single-article path on every wiki write
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Iterable

from wiki_chunker import chunk_markdown, _strip_frontmatter
from wiki_vector_store import VectorStore

EMBED_MODEL = os.environ.get("WIKI_EMBED_MODEL", "text-embedding-3-small")
EMBED_DIM = 1536 if EMBED_MODEL == "text-embedding-3-small" else 3072
EMBED_BATCH = 96
EMBED_SCOPES_DEFAULT = ("articles", "transcripts", "uploads", "sources")
WIKI_ROOT_DEFAULT = Path("/hic-workspace/wiki")  # docker volume path
DB_PATH_DEFAULT = "/hic-workspace/wiki/.vectors.db"


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(content: str) -> dict[str, Any]:
    """Light YAML-ish frontmatter parser — handles the flat key:value shape
    `_article_wiki_path()` writes. No nested objects or lists; falls back
    gracefully if the format diverges."""
    m = _FRONTMATTER_RE.match(content)
    if not m:
        return {}
    out: dict[str, Any] = {}
    for line in m.group(1).splitlines():
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        elif value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        out[key] = value
    return out


def article_id_for(frontmatter: dict, file_path: Path, wiki_root: Path | None = None) -> str:
    """Article-id := relative wiki path (slash-normalized). The url_hash alone
    is NOT unique — the same source can be ingested into multiple wiki paths
    with different parses (e.g., `articles/client-uploads/{hash}.md` vs.
    `uploads/{engagement}/{hash}.md`), and they hold non-identical content.
    Using the full path as the key keeps every distinct file addressable.
    The url_hash is still preserved in the metadata for dedup analytics."""
    if wiki_root is not None:
        try:
            return str(file_path.relative_to(wiki_root)).replace("\\", "/")
        except ValueError:
            pass
    h = frontmatter.get("url_hash") or frontmatter.get("hash")
    if h:
        return str(h).strip()
    return file_path.stem


def iter_article_files(wiki_root: Path, scopes: Iterable[str]) -> Iterable[Path]:
    for scope in scopes:
        scope_dir = wiki_root / scope
        if not scope_dir.exists():
            continue
        for md in scope_dir.rglob("*.md"):
            yield md


def embed_batch_openai(texts: list[str], api_key: str, model: str = EMBED_MODEL) -> list[list[float]]:
    """Single batched embedding call. Synchronous; the backfill is throughput-
    bound on OpenAI rate limits, not on our concurrency."""
    import httpx
    resp = httpx.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": model, "input": texts, "encoding_format": "float"},
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    # OpenAI returns sorted by `index` already; trust it.
    return [d["embedding"] for d in data]


def backfill(
    wiki_root: Path,
    db_path: str,
    api_key: str,
    scopes: Iterable[str] = EMBED_SCOPES_DEFAULT,
    limit: int | None = None,
    dry_run: bool = False,
    verbose: bool = True,
) -> dict[str, Any]:
    store = VectorStore(db_path, dim=EMBED_DIM)
    log = print if verbose else (lambda *a, **k: None)

    # Phase 1: walk + plan (no embedding yet)
    plan: list[dict] = []  # {file_path, article_id, frontmatter, chunks, wiki_path}
    skipped_existing = 0
    skipped_empty = 0

    files = list(iter_article_files(wiki_root, scopes))
    log(f"[plan] scanning {len(files)} files across {list(scopes)}")
    for fp in files:
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            log(f"  [warn] read failed: {fp}: {e}")
            continue
        fm = parse_frontmatter(content)
        article_id = article_id_for(fm, fp, wiki_root)
        chunks = chunk_markdown(content)
        if not chunks:
            skipped_empty += 1
            continue
        if store.has_article(article_id, expected_chunk_count=len(chunks)):
            skipped_existing += 1
            continue
        plan.append({
            "file_path": fp,
            "article_id": article_id,
            "frontmatter": fm,
            "chunks": chunks,
            "wiki_path": str(fp.relative_to(wiki_root)).replace("\\", "/"),
        })
        if limit is not None and len(plan) >= limit:
            break

    total_chunks = sum(len(p["chunks"]) for p in plan)
    log(f"[plan] articles to embed: {len(plan)}  chunks to embed: {total_chunks}  "
        f"skipped (existing): {skipped_existing}  skipped (empty): {skipped_empty}")

    if dry_run:
        return {
            "dry_run": True, "articles_planned": len(plan), "chunks_planned": total_chunks,
            "skipped_existing": skipped_existing, "skipped_empty": skipped_empty,
        }

    # Phase 2: build a flat queue of (plan_index, chunk_index, text) so we can
    # batch across article boundaries (smoother throughput than article-by-article).
    queue: list[tuple[int, int, str]] = []
    for pi, p in enumerate(plan):
        for ci, ch in enumerate(p["chunks"]):
            # Embed text = section header + body (boosts retrieval signal — the
            # section name is dense semantic context the embedding can use).
            section = ch.get("section", "")
            embed_text = f"{section}\n\n{ch['text']}" if section else ch["text"]
            # OpenAI rejects empty strings; guard.
            if not embed_text.strip():
                embed_text = ch.get("text") or " "
            queue.append((pi, ci, embed_text))

    # Phase 3: embed in batches, store per-article when all chunks for that
    # article have completed
    embeddings_by_plan: dict[int, dict[int, list[float]]] = {}
    t0 = time.time()
    embedded_total = 0

    for batch_start in range(0, len(queue), EMBED_BATCH):
        batch = queue[batch_start : batch_start + EMBED_BATCH]
        texts = [t for (_, _, t) in batch]
        try:
            vectors = embed_batch_openai(texts, api_key, EMBED_MODEL)
        except Exception as e:
            log(f"  [error] embed batch {batch_start}-{batch_start+len(batch)} failed: {e}")
            raise
        for (pi, ci, _), vec in zip(batch, vectors):
            embeddings_by_plan.setdefault(pi, {})[ci] = vec
        embedded_total += len(batch)
        elapsed = time.time() - t0
        rate = embedded_total / max(elapsed, 0.001)
        eta_sec = (len(queue) - embedded_total) / max(rate, 0.001)
        log(f"  [embed] {embedded_total}/{len(queue)} chunks  "
            f"({rate:.1f}/s, ETA {eta_sec:.0f}s)")

    # Phase 4: upsert per article
    upserted = 0
    for pi, p in enumerate(plan):
        per_article = embeddings_by_plan.get(pi, {})
        if len(per_article) != len(p["chunks"]):
            log(f"  [warn] missing embeddings for {p['article_id']} ({len(per_article)}/{len(p['chunks'])}) — skipping upsert")
            continue
        ordered_embs = [per_article[i] for i in range(len(p["chunks"]))]

        meta = {
            "url": p["frontmatter"].get("url", ""),
            "title": p["frontmatter"].get("title", ""),
            "source": p["frontmatter"].get("source", ""),
            "kind": p["frontmatter"].get("kind", ""),
            "tier": int(p["frontmatter"].get("tier", "0") or 0),
            "date": p["frontmatter"].get("date", ""),
            "chars": int(p["frontmatter"].get("chars", "0") or 0),
        }
        store.upsert_article_chunks(
            p["article_id"], p["wiki_path"], p["chunks"], ordered_embs, meta,
        )
        upserted += 1

    elapsed = time.time() - t0
    summary = {
        "articles_planned": len(plan),
        "articles_upserted": upserted,
        "chunks_embedded": embedded_total,
        "skipped_existing": skipped_existing,
        "skipped_empty": skipped_empty,
        "elapsed_sec": round(elapsed, 1),
        "model": EMBED_MODEL,
        "dim": EMBED_DIM,
        "store_count": store.count(),
    }
    log(f"[done] {summary}")
    store.close()
    return summary


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wiki", default=str(WIKI_ROOT_DEFAULT))
    ap.add_argument("--db", default=DB_PATH_DEFAULT)
    ap.add_argument("--scopes", default=",".join(EMBED_SCOPES_DEFAULT),
                    help="comma-separated subdirectory names")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        raise SystemExit("OPENAI_API_KEY missing in env")

    scopes = [s.strip() for s in args.scopes.split(",") if s.strip()]
    backfill(
        wiki_root=Path(args.wiki),
        db_path=args.db,
        api_key=api_key or "",
        scopes=scopes,
        limit=args.limit,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
