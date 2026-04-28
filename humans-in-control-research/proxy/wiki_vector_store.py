"""SQLite + sqlite-vec store for chunked wiki embeddings.

Replaces the legacy single-vector-per-article `.embeddings.json` sidecar with
a per-chunk vector index. One file at hic-workspace/wiki/.vectors.db; queried
in-process by the proxy (no separate vector-DB service).

Schema:
  chunks table        — chunk metadata + text (used for keyword pre-filter +
                        retrieval response)
  chunks_vec table    — sqlite-vec virtual table, holds the float[1536]
                        embedding alongside an internal rowid that joins back
                        to chunks.chunk_rowid

Why sqlite-vec instead of an external service:
  - One file, volume-mounted with the wiki — survives Docker rebuilds.
  - In-process queries: no network hop, no second container.
  - HNSW-style approximate search via vec0 virtual table; sub-10ms at our
    scale (5K chunks today, comfortable up to ~100K).
  - Migration path to pgvector is a query rewrite away if we outgrow it.

API:
  store = VectorStore(db_path)
  store.upsert_article_chunks(article_id, chunks, embeddings, article_metadata)
  store.search(query_embedding, limit=50, where={...}) -> [{...}]
  store.delete_article(article_id)
  store.count() -> {"articles": int, "chunks": int}
  store.has_article(article_id, expected_chunk_count=N) -> bool
"""
from __future__ import annotations

import json
import sqlite3
import struct
from pathlib import Path
from typing import Any

import sqlite_vec


def _vec_to_bytes(vec: list[float]) -> bytes:
    """Pack a float vector into bytes — sqlite-vec accepts this directly."""
    return struct.pack(f"{len(vec)}f", *vec)


class VectorStore:
    def __init__(self, db_path: str | Path, dim: int = 1536):
        self.db_path = str(db_path)
        self.dim = dim
        self._conn: sqlite3.Connection | None = None
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        if self._conn is not None:
            return self._conn
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        self._conn = conn
        return conn

    def _init_db(self) -> None:
        conn = self._connect()
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    article_id TEXT PRIMARY KEY,
                    wiki_path TEXT NOT NULL,
                    url TEXT,
                    title TEXT,
                    source TEXT,
                    kind TEXT,
                    tier INTEGER,
                    date TEXT,
                    chars INTEGER,
                    last_indexed_at INTEGER,
                    chunk_count INTEGER,
                    metadata_json TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chunks (
                    chunk_rowid INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_id TEXT NOT NULL,
                    chunk_idx INTEGER NOT NULL,
                    section TEXT,
                    text TEXT NOT NULL,
                    char_start INTEGER,
                    char_end INTEGER,
                    token_count INTEGER,
                    UNIQUE(article_id, chunk_idx),
                    FOREIGN KEY(article_id) REFERENCES articles(article_id) ON DELETE CASCADE
                )
            """)
            conn.execute(
                f"CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(embedding float[{self.dim}])"
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_article ON chunks(article_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_kind ON articles(kind)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_source ON articles(source)")

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def upsert_article_chunks(
        self,
        article_id: str,
        wiki_path: str,
        chunks: list[dict],
        embeddings: list[list[float]],
        article_metadata: dict | None = None,
    ) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError(f"chunks ({len(chunks)}) != embeddings ({len(embeddings)})")
        for emb in embeddings:
            if len(emb) != self.dim:
                raise ValueError(f"embedding dim {len(emb)} != expected {self.dim}")

        conn = self._connect()
        meta = article_metadata or {}
        import time
        now = int(time.time())

        with conn:
            # Replace any prior rows for this article (stale chunks from re-embeds)
            self._delete_article_inner(conn, article_id)

            conn.execute(
                """
                INSERT INTO articles (
                    article_id, wiki_path, url, title, source, kind, tier, date,
                    chars, last_indexed_at, chunk_count, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    article_id,
                    wiki_path,
                    meta.get("url", ""),
                    meta.get("title", ""),
                    meta.get("source", ""),
                    meta.get("kind", ""),
                    meta.get("tier", 0) or 0,
                    meta.get("date", ""),
                    meta.get("chars", 0) or 0,
                    now,
                    len(chunks),
                    json.dumps({k: v for k, v in meta.items() if k not in {
                        "url", "title", "source", "kind", "tier", "date", "chars"
                    }}, ensure_ascii=False),
                ),
            )

            for chunk, emb in zip(chunks, embeddings):
                cur = conn.execute(
                    """
                    INSERT INTO chunks (
                        article_id, chunk_idx, section, text, char_start, char_end, token_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        article_id,
                        int(chunk["idx"]),
                        chunk.get("section", ""),
                        chunk["text"],
                        int(chunk.get("char_start", 0)),
                        int(chunk.get("char_end", 0)),
                        int(chunk.get("token_count", 0)),
                    ),
                )
                chunk_rowid = cur.lastrowid
                conn.execute(
                    "INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)",
                    (chunk_rowid, _vec_to_bytes(emb)),
                )

    def _delete_article_inner(self, conn: sqlite3.Connection, article_id: str) -> None:
        rowids = [r[0] for r in conn.execute(
            "SELECT chunk_rowid FROM chunks WHERE article_id = ?", (article_id,)
        )]
        if rowids:
            qmarks = ",".join("?" for _ in rowids)
            conn.execute(f"DELETE FROM chunks_vec WHERE rowid IN ({qmarks})", rowids)
        conn.execute("DELETE FROM chunks WHERE article_id = ?", (article_id,))
        conn.execute("DELETE FROM articles WHERE article_id = ?", (article_id,))

    def delete_article(self, article_id: str) -> None:
        conn = self._connect()
        with conn:
            self._delete_article_inner(conn, article_id)

    def has_article(self, article_id: str, expected_chunk_count: int | None = None) -> bool:
        conn = self._connect()
        row = conn.execute(
            "SELECT chunk_count FROM articles WHERE article_id = ?", (article_id,)
        ).fetchone()
        if row is None:
            return False
        if expected_chunk_count is not None and row[0] != expected_chunk_count:
            return False
        return True

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def search(
        self,
        query_embedding: list[float],
        limit: int = 50,
        kind: str | None = None,
        source: str | None = None,
        tier_min: int | None = None,
        exclude_article_ids: list[str] | None = None,
    ) -> list[dict]:
        """Return up to `limit` best-matching chunks with article metadata.

        Filters applied in SQL: kind exact, source exact, tier >= min,
        exclude_article_ids. Distance is L2 from sqlite-vec; we convert to
        cosine-similarity-equivalent rank order (smaller L2 = better, since
        embeddings are unit-normalized by OpenAI's API).
        """
        if len(query_embedding) != self.dim:
            raise ValueError(f"query dim {len(query_embedding)} != {self.dim}")

        conn = self._connect()
        # vec0 doesn't support post-filtering directly — we over-fetch then filter
        # in app code. At our scale this is fine; switch to vec0 metadata if
        # we ever cross 100K chunks.
        overfetch = max(limit * 4, 50)
        rows = conn.execute(
            """
            SELECT
                c.chunk_rowid, c.article_id, c.chunk_idx, c.section, c.text,
                c.char_start, c.char_end, c.token_count,
                a.wiki_path, a.url, a.title, a.source, a.kind, a.tier, a.date, a.chars,
                v.distance
            FROM chunks_vec v
            JOIN chunks c ON c.chunk_rowid = v.rowid
            JOIN articles a ON a.article_id = c.article_id
            WHERE v.embedding MATCH ? AND k = ?
            ORDER BY v.distance ASC
            """,
            (_vec_to_bytes(query_embedding), overfetch),
        ).fetchall()

        exclude = set(exclude_article_ids or [])
        out: list[dict] = []
        for r in rows:
            (chunk_rowid, article_id, chunk_idx, section, text,
             char_start, char_end, token_count,
             wiki_path, url, title, source_field, kind_field, tier_field, date_field, chars_field,
             distance) = r

            if kind and kind_field != kind:
                continue
            if source and source_field != source:
                continue
            if tier_min is not None and (tier_field or 0) < tier_min:
                continue
            if article_id in exclude:
                continue

            out.append({
                "chunk_rowid": chunk_rowid,
                "article_id": article_id,
                "chunk_idx": chunk_idx,
                "section": section or "",
                "text": text,
                "char_start": char_start,
                "char_end": char_end,
                "token_count": token_count,
                "wiki_path": wiki_path,
                "url": url,
                "title": title,
                "source": source_field,
                "kind": kind_field,
                "tier": tier_field or 0,
                "date": date_field or "",
                "chars": chars_field or 0,
                "distance": distance,
                # Cosine similarity ≈ 1 - L2/2 for unit-norm vectors. OpenAI
                # embeddings are L2-normalized, so this conversion is exact.
                "score": max(0.0, 1.0 - (distance ** 2) / 2.0),
            })
            if len(out) >= limit:
                break

        return out

    def search_articles(
        self,
        query_embedding: list[float],
        limit: int = 10,
        kind: str | None = None,
        source: str | None = None,
        tier_min: int | None = None,
        chunks_per_article: int = 3,
    ) -> list[dict]:
        """Like search() but groups chunks by article and returns the top
        `chunks_per_article` chunks per article. Use this for chat retrieval —
        you get article-level results enriched with the matched passages."""
        # Over-fetch chunks then group; the absolute top-K chunks will already
        # cluster around relevant articles.
        chunks = self.search(
            query_embedding,
            limit=limit * max(chunks_per_article, 3) * 4,
            kind=kind, source=source, tier_min=tier_min,
        )

        by_article: dict[str, dict] = {}
        for c in chunks:
            aid = c["article_id"]
            if aid not in by_article:
                by_article[aid] = {
                    "article_id": aid,
                    "wiki_path": c["wiki_path"],
                    "url": c["url"],
                    "title": c["title"],
                    "source": c["source"],
                    "kind": c["kind"],
                    "tier": c["tier"],
                    "date": c["date"],
                    "chars": c["chars"],
                    "best_score": c["score"],
                    "chunks": [],
                }
            if len(by_article[aid]["chunks"]) < chunks_per_article:
                by_article[aid]["chunks"].append({
                    "idx": c["chunk_idx"],
                    "section": c["section"],
                    "text": c["text"],
                    "char_start": c["char_start"],
                    "char_end": c["char_end"],
                    "score": c["score"],
                })
            if c["score"] > by_article[aid]["best_score"]:
                by_article[aid]["best_score"] = c["score"]

        ranked = sorted(by_article.values(), key=lambda a: a["best_score"], reverse=True)
        return ranked[:limit]

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    def count(self) -> dict:
        conn = self._connect()
        articles = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        chunks = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
        by_kind = dict(conn.execute("SELECT kind, COUNT(*) FROM articles GROUP BY kind").fetchall())
        return {"articles": articles, "chunks": chunks, "by_kind": by_kind}

    def list_articles(self, limit: int = 1000) -> list[dict]:
        conn = self._connect()
        return [
            {
                "article_id": r[0], "wiki_path": r[1], "title": r[2],
                "source": r[3], "kind": r[4], "chunk_count": r[5],
            }
            for r in conn.execute(
                "SELECT article_id, wiki_path, title, source, kind, chunk_count FROM articles ORDER BY last_indexed_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        ]

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None
