"""wiki_retrofit.py — One-pass backfill that walks the entire wiki and adds
manifest-pointer `chunks:` frontmatter to every page that doesn't already
carry one.

Why: the wiki_chunker has been producing chunks for embedding storage since
its inception, but those chunks were never recorded in the wiki pages
themselves. That orphaned chunks from the manifest-pointer retrieval path.
This module brings every existing wiki page in line with the 2026-06-06
manifest contract:

    Every wiki page that contains a body MUST carry a frontmatter `chunks:`
    block enumerating its addressable spans. Generators address those
    spans by pointer, not by re-injecting the whole body.

Design contract:
  - Idempotent: pages that already have a chunks: block are skipped unless
    `force=True` is passed (used when bumping the chunker version).
  - Scope: walks every file under wiki/ that is .md or .markdown (the wiki's
    canonical artifact format). Skips .json deliverable files (those carry
    their own structured shape and don't need chunk pointers).
  - Streaming progress: yields per-file status so the caller can stream
    progress via SSE. Synchronous internally; no concurrency. The chunker
    is CPU-bound (tiktoken encode); going parallel adds complexity for
    little win on a 1-1500 file corpus.
  - Safe: writes go through an atomic tmp+rename. A failure mid-pass leaves
    the wiki in a consistent state (some pages chunked, others pending).
    Re-running picks up where it left off.
  - Cap on per-page chunk count: anything that produces > 200 chunks gets
    logged and skipped (almost certainly a transcript-of-the-decade pathology
    that needs human review before chunking).

Composes with:
  - proxy/wiki_chunker.py (the underlying chunker + frontmatter writer)
  - POST /api/wiki/retrofit-chunks (HTTP entry point in proxy/app.py)
"""
from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from wiki_chunker import (
    chunk_for_manifest,
    has_chunks_frontmatter,
    upsert_chunks_into_frontmatter,
)

log = logging.getLogger("wiki_retrofit")

# Hard ceiling: pages producing more than this get flagged and skipped.
# A normal article is 1-30 chunks; a 2-hour podcast transcript is ~80-150.
MAX_CHUNKS_PER_PAGE = 200

# Extensions we chunk. Wiki uses .md throughout; .markdown is a legacy variant.
CHUNK_EXTENSIONS = (".md", ".markdown")


@dataclass
class RetrofitStats:
    """Summary of one retrofit run. Returned by the HTTP endpoint so the
    caller can show progress and verify the run touched everything."""
    started_at: float = field(default_factory=time.time)
    finished_at: float = 0.0
    walked: int = 0          # files we encountered
    chunked: int = 0         # files we wrote chunk frontmatter to
    skipped_already: int = 0  # already had chunks: frontmatter
    skipped_empty: int = 0    # body too short / empty
    skipped_oversize: int = 0  # > MAX_CHUNKS_PER_PAGE
    write_errors: int = 0
    total_chunks_added: int = 0
    error_examples: list[str] = field(default_factory=list)


def _iter_wiki_files(wiki_root: Path) -> Iterator[Path]:
    """Yield every .md / .markdown file under wiki_root, depth-first.
    Skips dot-directories so .git / .DS_Store etc. don't leak in."""
    for dirpath, dirnames, filenames in os.walk(wiki_root):
        # Prune dot-dirs in place so os.walk doesn't descend into them.
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            if not name.endswith(CHUNK_EXTENSIONS):
                continue
            yield Path(dirpath) / name


def _atomic_write(path: Path, text: str) -> None:
    """Write text to path via tmp+rename so partial writes can't corrupt
    the page on disk."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def _wiki_pointer(wiki_root: Path, file_path: Path) -> str:
    """Convert an absolute file path under wiki_root into the wiki POINTER
    (posix relative path). Used as the chunk-id stem so pointers are stable
    across machines / OS path separators."""
    rel = file_path.relative_to(wiki_root)
    return rel.as_posix()


def retrofit_wiki(
    wiki_root: Path | str,
    *,
    force: bool = False,
    progress_every: int = 50,
) -> Iterator[dict]:
    """Walk wiki_root and add chunks: frontmatter to every page that needs
    it. Yields a dict per file:

        {
            "type": "file",
            "path": "articles/...",
            "action": "chunked" | "skipped_already" | "skipped_empty" |
                      "skipped_oversize" | "error",
            "chunks_added": int,
            "error": str | None,
        }

    Plus one terminal:

        {"type": "summary", "stats": <RetrofitStats asdict>}

    `force=True` re-chunks pages that already have a chunks: block (useful
    when bumping the chunker version). `progress_every` controls how often
    a progress log line is emitted."""
    wiki_root = Path(wiki_root).resolve()
    if not wiki_root.is_dir():
        yield {
            "type": "summary",
            "error": f"wiki_root does not exist: {wiki_root}",
            "stats": RetrofitStats().__dict__,
        }
        return

    stats = RetrofitStats()
    log.info(f"[retrofit] start at {wiki_root} (force={force})")

    for file_path in _iter_wiki_files(wiki_root):
        stats.walked += 1
        rel_pointer = _wiki_pointer(wiki_root, file_path)

        try:
            page_text = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            stats.write_errors += 1
            if len(stats.error_examples) < 10:
                stats.error_examples.append(f"read:{rel_pointer}:{e}")
            yield {"type": "file", "path": rel_pointer, "action": "error",
                   "chunks_added": 0, "error": f"read failed: {e}"}
            continue

        if not page_text or len(page_text.strip()) < 50:
            stats.skipped_empty += 1
            yield {"type": "file", "path": rel_pointer, "action": "skipped_empty",
                   "chunks_added": 0, "error": None}
            continue

        if has_chunks_frontmatter(page_text) and not force:
            stats.skipped_already += 1
            if stats.walked % progress_every == 0:
                log.info(f"[retrofit] progress walked={stats.walked} chunked={stats.chunked} "
                         f"skip_already={stats.skipped_already}")
            yield {"type": "file", "path": rel_pointer, "action": "skipped_already",
                   "chunks_added": 0, "error": None}
            continue

        try:
            chunks = chunk_for_manifest(page_text, rel_pointer)
        except Exception as e:
            stats.write_errors += 1
            if len(stats.error_examples) < 10:
                stats.error_examples.append(f"chunk:{rel_pointer}:{e}")
            yield {"type": "file", "path": rel_pointer, "action": "error",
                   "chunks_added": 0, "error": f"chunker failed: {e}"}
            continue

        if not chunks:
            stats.skipped_empty += 1
            yield {"type": "file", "path": rel_pointer, "action": "skipped_empty",
                   "chunks_added": 0, "error": None}
            continue

        if len(chunks) > MAX_CHUNKS_PER_PAGE:
            stats.skipped_oversize += 1
            log.warning(f"[retrofit] skipping oversize page {rel_pointer}: "
                        f"{len(chunks)} chunks > {MAX_CHUNKS_PER_PAGE}")
            yield {"type": "file", "path": rel_pointer, "action": "skipped_oversize",
                   "chunks_added": len(chunks),
                   "error": f"{len(chunks)} chunks exceeds {MAX_CHUNKS_PER_PAGE}"}
            continue

        try:
            new_text = upsert_chunks_into_frontmatter(
                page_text, chunks, page_id=rel_pointer,
            )
            _atomic_write(file_path, new_text)
        except Exception as e:
            stats.write_errors += 1
            if len(stats.error_examples) < 10:
                stats.error_examples.append(f"write:{rel_pointer}:{e}")
            yield {"type": "file", "path": rel_pointer, "action": "error",
                   "chunks_added": 0, "error": f"write failed: {e}"}
            continue

        stats.chunked += 1
        stats.total_chunks_added += len(chunks)
        if stats.walked % progress_every == 0:
            log.info(f"[retrofit] progress walked={stats.walked} chunked={stats.chunked} "
                     f"skip_already={stats.skipped_already} chunks_added={stats.total_chunks_added}")
        yield {"type": "file", "path": rel_pointer, "action": "chunked",
               "chunks_added": len(chunks), "error": None}

    stats.finished_at = time.time()
    log.info(f"[retrofit] complete walked={stats.walked} chunked={stats.chunked} "
             f"skip_already={stats.skipped_already} skip_empty={stats.skipped_empty} "
             f"skip_oversize={stats.skipped_oversize} errors={stats.write_errors} "
             f"chunks_added={stats.total_chunks_added} "
             f"duration={stats.finished_at - stats.started_at:.1f}s")
    yield {"type": "summary", "stats": stats.__dict__}


def retrofit_wiki_sync(wiki_root: Path | str, force: bool = False) -> dict:
    """Convenience: drains the generator and returns the final summary.
    Used by the HTTP endpoint when SSE streaming isn't desired."""
    final = {"type": "summary", "stats": RetrofitStats().__dict__}
    for event in retrofit_wiki(wiki_root, force=force):
        if event.get("type") == "summary":
            final = event
    return final


__all__ = [
    "retrofit_wiki",
    "retrofit_wiki_sync",
    "RetrofitStats",
    "MAX_CHUNKS_PER_PAGE",
]
