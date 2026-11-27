"""The second brain's personal layer (plan 6.4), with the promotion gate from 3.5.

Two capped files the person can read and edit: USER.md (who the person is, how they work) and
MEMORY.md (what the agent has learned that should outlive an engagement). Both enter the agent's
system prompt as a snapshot taken at the start of a conversation, so the cached prefix stays stable
(plan 6.7). Candidate notes accrue in notes.jsonl; a note is promoted to MEMORY.md only when it
  - scores at or above MIN_SCORE,
  - has been recalled at least MIN_RECALLS times by at least MIN_DISTINCT_QUERIES distinct queries,
  - cites the line it came from,
  - is not derived from untrusted content (a web page, an upload's embedded text),
and one consolidation pass may not remove more than MAX_LOSS of the entries already there.
The person's explicit "remember this" is promoted at once (it is their instruction, not inference);
edits and removals proposed by the system wait for the person (plan 6.4, from Hermes).

Per person (enhancement plan B5, 16 Nov audit: "someone else's preferences steer your deck; a forgotten fact
returns"): the workspace owner's memory lives in MEMORY_DIR; a person who reaches the agent through a channel (Teams,
the signed webhook) has their own files under MEMORY_DIR/people/<hash of their person key>. The current person is a
context variable the agent sets for the length of a turn. Candidates are never shown to the agent, and forgetting a
phrase also removes matching candidates and keeps the phrase, so the reviewer cannot bring it back.
"""
import contextvars
import hashlib
import io
import json
import os
import threading
import time

from . import config

USER_CAP = 4000
MEMORY_CAP = 8000
MIN_SCORE = 0.75
MIN_RECALLS = 3
MIN_DISTINCT_QUERIES = 3
MAX_LOSS = 0.25
SEP = "\n- "

_LOCK = threading.RLock()
OWNER = "owner"
_PERSON = contextvars.ContextVar("ia_next_memory_person", default=OWNER)


class as_person:
    """Read and write one person's memory for the length of a `with` block (the workspace owner by default)."""
    def __init__(self, person_key):
        self.key = str(person_key or OWNER)

    def __enter__(self):
        self.token = _PERSON.set(self.key)
        return self.key

    def __exit__(self, *exc):
        _PERSON.reset(self.token)


def current_person():
    return _PERSON.get()


def _dir():
    p = _PERSON.get()
    if p == OWNER:
        return config.MEMORY_DIR
    return os.path.join(config.MEMORY_DIR, "people", hashlib.sha256(p.encode("utf-8")).hexdigest()[:20])


def _p(name):
    config.ensure_dirs()
    d = _dir()
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, name)


def _read(name):
    try:
        return io.open(_p(name), encoding="utf-8").read()
    except FileNotFoundError:
        return ""


def _write(name, text):
    with io.open(_p(name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


# ---- versions, provenance, tiers and hash-checked writes (harness WS-H11, 26 Nov; the Anthropic Applied AI talk) -----
# Every change to USER.md or MEMORY.md is a version: who made it (the person, the promotion gate, retirement, dreaming,
# a rollback, an import), why, the turn or task it came from (the trace id) and the text before and after, so any
# change can be read back and undone. USER.md is the person's curated tier: only the person's own remember or forget,
# a rollback or an import may change it; everything the system infers waits as a candidate or a proposal. A writer
# that drafted against an older text (dreaming, a rollback) is refused when the file changed underneath it.
CURATED = "USER.md"
CURATED_REASONS = ("remember", "forget", "rollback", "import")


class Conflict(Exception):
    """The memory file changed after the writer read it."""


def text_hash(text):
    return hashlib.sha256(str(text or "").encode("utf-8")).hexdigest()[:16]


def current_hash(name):
    return text_hash(_read(name))


def _versions_table(c):
    c.execute("CREATE TABLE IF NOT EXISTS memory_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, person TEXT, name TEXT, ts REAL, "
              "author TEXT, reason TEXT, trace TEXT, before_hash TEXT, after_hash TEXT, before_text TEXT, after_text TEXT)")


def _versioned_write(name, text, reason, author="system", expected_hash=None):
    """Write USER.md or MEMORY.md as a new version. Raises PermissionError for a write to the curated tier that is not
    the person's own, and Conflict when `expected_hash` no longer matches the file."""
    if name == CURATED and reason not in CURATED_REASONS:
        raise PermissionError("USER.md is the person's own memory; the system may only propose changes to it")
    with _LOCK:
        old = _read(name)
        if expected_hash is not None and text_hash(old) != expected_hash:
            raise Conflict(f"{name} changed after it was read")
        if old == text:
            return None
        try:
            from . import store
            c = store.conn()
            with store._LOCK:
                _versions_table(c)
                cur = c.execute("INSERT INTO memory_versions (person, name, ts, author, reason, trace, before_hash, after_hash, before_text, after_text) "
                                "VALUES (?,?,?,?,?,?,?,?,?,?)", (current_person(), name, time.time(), author, reason, store.TRACE.get(),
                                                                text_hash(old), text_hash(text), old, text))
                vid = cur.lastrowid
        except Exception:
            vid = None
        _write(name, text)
        return vid


def _who():
    """The author of a person's explicit memory change: the person in the page, or the agent acting on their request."""
    try:
        from . import store
        return "the agent, at the person's request" if store.TURN.get() else "person"
    except Exception:
        return "person"


def versions(name="MEMORY.md", limit=20):
    """The changes to one memory file, newest first: [{id, ts, author, reason, trace, before_hash, after_hash}]."""
    try:
        from . import store
        c = store.conn()
        _versions_table(c)
        return [dict(r) for r in c.execute("SELECT id, ts, author, reason, trace, before_hash, after_hash FROM memory_versions "
                                           "WHERE person = ? AND name = ? ORDER BY id DESC LIMIT ?", (current_person(), name, int(limit)))]
    except Exception:
        return []


def rollback(version_id, author="person"):
    """The file back to the text it had just after version `version_id`; itself a new version. Refused when the file
    changed while this was decided is not possible here: the restore reads and writes under one lock."""
    from . import store
    c = store.conn()
    _versions_table(c)
    r = c.execute("SELECT * FROM memory_versions WHERE id = ? AND person = ?", (int(version_id), current_person())).fetchone()
    if not r:
        return {"error": "no such version"}
    vid = _versioned_write(r["name"], r["after_text"], "rollback", author)
    _audit("rollback", {"name": r["name"], "to_version": int(version_id)})
    return {"ok": True, "name": r["name"], "restored_version": int(version_id), "new_version": vid}


def export_memory():
    """This person's memory, portable: the files, candidates, forgotten phrases and the version history (metadata)."""
    return {"person": current_person(), "files": {n: _read(n) for n in ("USER.md", "MEMORY.md")}, "candidates": _notes(),
            "forgotten": _forgotten(), "versions": {n: versions(n, 200) for n in ("USER.md", "MEMORY.md")}}


def import_memory(data, author="person"):
    """Files from an export, each written as a version (the earlier text stays restorable)."""
    out = {}
    for n in ("USER.md", "MEMORY.md"):
        text = ((data or {}).get("files") or {}).get(n)
        if isinstance(text, str):
            cap = USER_CAP if n == "USER.md" else MEMORY_CAP
            out[n] = _versioned_write(n, text[:cap], "import", author)
    _audit("import", {"files": [n for n, v in out.items() if v]})
    return {"ok": True, "versions": out}


# ---- the engagement and conversation tiers (harness WS-H11, 26 Nov; the Anthropic Applied AI talk) -------------------
# Three tiers: the person's curated USER.md and MEMORY.md (above, everywhere), notes for one ENGAGEMENT (shared by
# everyone working on it: "this client says learners, not students"), and notes for one CONVERSATION (scratch: kept for
# SCRATCH_DAYS, then dropped unless the person keeps them, which moves them into MEMORY.md). Each note is one row; each
# add or removal is a version in memory_versions under the name "engagement:<id>" or "conversation:<id>".
TIERS = ("engagement", "conversation")
SCRATCH_DAYS = 7
TIER_NOTE_CAP = 400


def _tier_table(c):
    c.execute("CREATE TABLE IF NOT EXISTS memory_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, tier TEXT, scope TEXT, "
              "person TEXT, text TEXT, source TEXT, ts REAL)")


def _tier_version(tier, scope, before, after, reason):
    try:
        from . import store
        c = store.conn()
        with store._LOCK:
            _versions_table(c)
            c.execute("INSERT INTO memory_versions (person, name, ts, author, reason, trace, before_hash, after_hash, before_text, after_text) "
                      "VALUES (?,?,?,?,?,?,?,?,?,?)", (current_person(), f"{tier}:{scope}", time.time(), _who(), reason,
                                                      store.TRACE.get(), text_hash(before), text_hash(after), before, after))
    except Exception:
        pass


def remember_scoped(tier, scope, text, source):
    """A note for one engagement or one conversation. Returns {"ok", "tier", "id"} or {"error"}."""
    if tier not in TIERS:
        return {"error": f"the tiers are {', '.join(TIERS)}"}
    text = " ".join(str(text or "").split())[:TIER_NOTE_CAP]
    scope = str(scope or "").strip()
    if not scope:
        return {"error": ("no engagement is in focus; say which engagement this is for, or save it for everywhere"
                          if tier == "engagement" else "no conversation to keep this in")}
    if len(text) < 3:
        return {"error": "say a little more (at least three characters)"}
    from . import store
    c = store.conn()
    with _LOCK, store._LOCK:
        _tier_table(c)
        if any(text.lower() in (r["text"] or "").lower() for r in c.execute(
                "SELECT text FROM memory_notes WHERE tier = ? AND scope = ?", (tier, scope))):
            return {"ok": True, "tier": tier, "duplicate": True}
        cur = c.execute("INSERT INTO memory_notes (tier, scope, person, text, source, ts) VALUES (?,?,?,?,?,?)",
                        (tier, scope, current_person(), text, str(source or "")[:80], time.time()))
        nid = cur.lastrowid
    _tier_version(tier, scope, "", text, "remember")
    _audit("remember", {"kind": tier, "scope": scope, "text": text, "source": source})
    return {"ok": True, "tier": tier, "id": nid}


def scoped_notes(tier, scope, limit=20):
    """The notes for one engagement (anyone's) or one conversation (this person's), oldest first."""
    if tier not in TIERS or not scope:
        return []
    from . import store
    c = store.conn()
    _tier_table(c)
    q = "SELECT id, text, source, ts FROM memory_notes WHERE tier = ? AND scope = ?"
    args = [tier, str(scope)]
    if tier == "conversation":
        q += " AND person = ?"
        args.append(current_person())
    return [dict(r) for r in c.execute(q + " ORDER BY id DESC LIMIT ?", (*args, int(limit)))][::-1]


def _note(note_id):
    from . import store
    c = store.conn()
    _tier_table(c)
    return c.execute("SELECT * FROM memory_notes WHERE id = ?", (int(note_id),)).fetchone()


def drop_note(note_id, reason="forget"):
    from . import store
    r = _note(note_id)
    if not r:
        return {"error": "no such note"}
    with store._LOCK:
        store.conn().execute("DELETE FROM memory_notes WHERE id = ?", (int(note_id),))
    _tier_version(r["tier"], r["scope"], r["text"], "", reason)
    return {"ok": True, "removed": [r["text"]]}


def keep_note(note_id):
    """A conversation note kept: it moves into MEMORY.md (the person's explicit choice) and leaves the scratch tier."""
    r = _note(note_id)
    if not r:
        return {"error": "no such note"}
    got = remember_now(r["text"], "kept from a conversation", "memory")
    drop_note(note_id, reason="kept")
    return dict(got, kept=r["text"])


def purge_scratch(days=SCRATCH_DAYS, now=None):
    """(Idle pass) conversation notes older than `days` are dropped. Returns how many."""
    from . import store
    c = store.conn()
    _tier_table(c)
    cutoff = (now or time.time()) - days * 86400
    old = c.execute("SELECT id, scope, text FROM memory_notes WHERE tier = 'conversation' AND ts < ?", (cutoff,)).fetchall()
    for r in old:
        drop_note(r["id"], reason="expired")
    if old:
        store.event("memory_scratch_expired", {"notes": len(old), "days": days})
    return len(old)


def entries(name="MEMORY.md"):
    return [e.strip() for e in _read(name).split("\n- ") if e.strip() and not e.strip().startswith("#")]


def _render(title, items, cap):
    body = "# " + title + "\n" + "".join(SEP + i for i in items) + "\n"
    dropped = []
    while len(body) > cap and items:     # over the cap: the oldest entry leaves the file...
        dropped.append(items[0])
        items = items[1:]
        body = "# " + title + "\n" + "".join(SEP + i for i in items) + "\n"
    if dropped:                          # ...for the archive, where recall still finds it (harness WS-H11, 26 Nov:
        _archive(dropped, f"moved out of {title.lower()} when it passed its size")   # it used to be lost)
    return body, items


def _archive(items, why):
    """Append entries to MEMORY.archive.md with the date and the reason. Never raises."""
    try:
        day = time.strftime("%Y-%m-%d")
        with io.open(_p(ARCHIVE), "a", encoding="utf-8", newline="\n") as fh:
            for e in items:
                fh.write(f"- {e} ({why}, {day})\n")
    except Exception:
        pass


def archived(limit=0):
    """The archive's entries, newest last."""
    try:
        with io.open(_p(ARCHIVE), encoding="utf-8") as fh:
            rows = [ln[2:].strip() for ln in fh if ln.startswith("- ")]
    except OSError:
        rows = []
    gone = [f.lower() for f in _forgotten()]             # what the person asked to forget never comes back from here
    rows = [r for r in rows if not any(f and f in r.lower() for f in gone)]
    return rows[-limit:] if limit else rows


def relevant_archived(query, k=2):
    """(The talk: let memory grow large, and search it.) The archived entries that share the most words with the
    request, for the turn's context; [] when none share at least two."""
    words = _WORDS(query)
    scored = sorted(((len(words & _WORDS(e)), e) for e in archived()), key=lambda x: -x[0])
    return [e for sc, e in scored[:k] if sc >= 2]


def snapshot():
    """What enters the system prompt at the start of a conversation. Frozen for that conversation."""
    return {"user": _read("USER.md")[:USER_CAP], "memory": _read("MEMORY.md")[:MEMORY_CAP]}


def remember_now(text, source, kind="memory"):
    """The person's explicit instruction. Promoted immediately, with its source recorded."""
    name, title, cap = ("USER.md", "About the person", USER_CAP) if kind == "user" else ("MEMORY.md", "What the agent has learned", MEMORY_CAP)
    line = f"{text.strip()} (source: {source}, {time.strftime('%Y-%m-%d')})"
    with _LOCK:
        items = entries(name)
        if any(text.strip().lower() in i.lower() for i in items):
            return {"ok": True, "duplicate": True}
        body, kept = _render(title, items + [line], cap)
        _versioned_write(name, body, "remember", _who())
    _audit("remember", {"kind": kind, "text": text, "source": source})
    return {"ok": True, "entries": len(kept)}


def forget(match):
    """Remove every entry containing `match` (case-insensitive), and every candidate note containing it, and keep the
    phrase so the background reviewer cannot propose it again (B5: a forgotten fact used to return through the
    promotion gate). The person sees exactly what went."""
    m = " ".join(str(match or "").split()).lower()
    if len(m) < 3:
        return {"removed": [], "error": "say a little more about what to forget (at least three characters)"}
    removed = []
    with _LOCK:
        for name, title, cap in (("MEMORY.md", "What the agent has learned", MEMORY_CAP), ("USER.md", "About the person", USER_CAP)):
            items = entries(name)
            keep = [i for i in items if m not in i.lower()]
            removed += [i for i in items if m in i.lower()]
            if len(keep) != len(items):
                _versioned_write(name, _render(title, keep, cap)[0], "forget", _who())
        try:                                  # the engagement and conversation notes forget too
            from . import store
            c = store.conn()
            _tier_table(c)
            for r in c.execute("SELECT id, text FROM memory_notes").fetchall():
                if m in (r["text"] or "").lower():
                    drop_note(r["id"])
                    removed.append(r["text"])
        except Exception:
            pass
        notes = _notes()
        dropped = [n["text"] for n in notes if m in n["text"].lower()]
        if dropped:
            _save_notes([n for n in notes if m not in n["text"].lower()])
        gone = _forgotten()
        if m not in gone:
            _write("forgotten.json", json.dumps(gone + [m], ensure_ascii=False))
    _audit("forget", {"match": match, "removed": removed, "candidates_removed": dropped})
    return {"removed": removed, "candidates_removed": dropped}


def _forgotten():
    try:
        return [str(x) for x in json.loads(_read("forgotten.json") or "[]")]
    except ValueError:
        return []


# ---- candidates and the promotion gate ---------------------------------------------------------
def propose(text, score, source_line, untrusted=False):
    """A candidate note from the background reviewer. It is stored, never injected, until promoted. A note that
    contains a phrase the person asked to forget is dropped."""
    low = text.strip().lower()
    if any(f in low for f in _forgotten()):
        _audit("propose_dropped", {"text": text, "why": "the person asked to forget this"})
        return {"dropped": "forgotten", "text": text.strip()}
    rec = {"id": f"note_{int(time.time() * 1000)}", "text": text.strip(), "score": float(score), "source_line": source_line,
           "untrusted": bool(untrusted), "recalls": 0, "queries": [], "created": time.time()}
    with _LOCK, io.open(_p("notes.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return rec


def _notes():
    try:
        return [json.loads(l) for l in io.open(_p("notes.jsonl"), encoding="utf-8") if l.strip()]
    except FileNotFoundError:
        return []


def _save_notes(notes):
    with io.open(_p("notes.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        for n in notes:
            fh.write(json.dumps(n, ensure_ascii=False) + "\n")


def record_recall(note_id, query):
    with _LOCK:
        notes = _notes()
        for n in notes:
            if n["id"] == note_id:
                n["recalls"] += 1
                q = query.strip().lower()
                if q and q not in n["queries"]:
                    n["queries"].append(q)
        _save_notes(notes)


def gate(note):
    """Why a note may not be promoted, or [] when it may."""
    why = []
    if note.get("untrusted"):
        why.append("derived from untrusted content")
    if note.get("score", 0) < MIN_SCORE:
        why.append(f"score {note.get('score', 0):.2f} below {MIN_SCORE}")
    if note.get("recalls", 0) < MIN_RECALLS:
        why.append(f"recalled {note.get('recalls', 0)} times, needs {MIN_RECALLS}")
    if len(note.get("queries", [])) < MIN_DISTINCT_QUERIES:
        why.append(f"{len(note.get('queries', []))} distinct queries, needs {MIN_DISTINCT_QUERIES}")
    if not str(note.get("source_line") or "").strip():
        why.append("no source line")
    return why


def consolidate():
    """One promotion pass. Returns what was promoted and what was held, with reasons."""
    with _LOCK:
        notes = _notes()
        before = entries("MEMORY.md")
        promoted, held, remaining = [], [], []
        for n in notes:
            why = gate(n)
            if why:
                held.append({"id": n["id"], "why": why})
                remaining.append(n)
            else:
                promoted.append(f"{n['text']} (source: {n['source_line']})")
        if not promoted:
            retire()
            return {"promoted": [], "held": held}
        body, kept = _render("What the agent has learned", before + promoted, MEMORY_CAP)
        lost = len([b for b in before if b not in kept])
        if before and lost / len(before) > MAX_LOSS:
            return {"promoted": [], "held": held, "refused": f"would remove {lost} of {len(before)} existing entries"}
        _versioned_write("MEMORY.md", body, "promotion gate", "consolidate")
        _save_notes(remaining)
    _audit("consolidate", {"promoted": promoted})
    retire()                                       # WS-5 step 3: idle learned entries move to the archive file
    return {"promoted": promoted, "held": held}


def recall(query, limit=6):
    """Promoted entries that share words with the query. Candidate notes that match are counted toward the gate
    (recalls and distinct queries) but never returned: an unpromoted inference must not steer the agent (B5)."""
    words = {w for w in "".join(c.lower() if c.isalnum() else " " for c in query).split() if len(w) > 3}
    if not words:
        return []
    hits = []
    for name in ("USER.md", "MEMORY.md"):
        for e in entries(name):
            score = len(words & set("".join(c.lower() if c.isalnum() else " " for c in e).split()))
            if score:
                hits.append({"from": name, "text": e, "score": score})
    for e in archived():                 # (WS-H11) the archive is searched too: memory may grow past the files' caps
        score = len(words & set("".join(c.lower() if c.isalnum() else " " for c in e).split()))
        if score:
            hits.append({"from": "archive", "text": e, "score": score - 0.5})      # a held entry wins a tie
    for n in _notes():
        score = len(words & set("".join(c.lower() if c.isalnum() else " " for c in n["text"]).split()))
        if score:
            record_recall(n["id"], query)
    top = sorted(hits, key=lambda h: -h["score"])[:limit]
    if top:
        touch([h["text"] for h in top])           # WS-5 step 3: recency and use count, read by retire()
    return top


# ---- uplift plan WS-5 step 3: episodic memory, and recency for what was learned --------------------------------------
# Procedural memory is the governed skills (improve.py), semantic memory is USER.md, MEMORY.md and the second brain.
# Episodic memory is new: one line per finished task (what was asked, what was made, its checks, the owner's verdict),
# kept in the workspace owner's folder, read by the agent's recall tool when a new request resembles an old one.
EPISODES = "episodes.jsonl"
RETIRE_DAYS = 60
ARCHIVE = "MEMORY.archive.md"
STATS = "entry_stats.json"
_WORDS = lambda s: {w for w in "".join(c.lower() if c.isalnum() else " " for c in str(s or "")).split() if len(w) > 3}


def _owner_path(name):
    config.ensure_dirs()
    os.makedirs(config.MEMORY_DIR, exist_ok=True)
    return os.path.join(config.MEMORY_DIR, name)


def _episodes():
    try:
        return [json.loads(l) for l in io.open(_owner_path(EPISODES), encoding="utf-8") if l.strip()]
    except (FileNotFoundError, ValueError):
        return []


def episode(task, scorecard=None, verdict=None, verdict_text=""):
    """Write or update the one line for a finished task. Called when it is scored and when the owner gives a verdict."""
    with _LOCK:
        rows = {r["task_id"]: r for r in _episodes()}
        r = rows.get(task["id"]) or {"task_id": task["id"], "kind": task.get("kind") or "", "engagement_id": task.get("engagement_id") or "",
                                     "ts": task.get("updated") or time.time(), "checks": "", "verdict": ""}
        brief = task.get("brief") or {}
        brief = brief if isinstance(brief, dict) else {}
        r["ask"] = " ".join(str(brief.get("request") or brief.get("goal") or brief.get("topic") or brief.get("question") or "").split())[:300]
        r["made"] = " ".join(str(task.get("summary") or "").split())[:300]
        if scorecard is not None:
            r["checks"] = ("needs review: " + ", ".join(scorecard.get("hard_failed") or [])) if scorecard.get("hard_failed") else "passed"
        if verdict:
            r["verdict"] = "accepted" if verdict == "accept" else "rejected" + (f": {' '.join(verdict_text.split())[:200]}" if verdict_text else "")
        rows[task["id"]] = r
        with io.open(_owner_path(EPISODES), "w", encoding="utf-8", newline="\n") as fh:
            for row in sorted(rows.values(), key=lambda x: x.get("ts") or 0):
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return r


def episode_line(r):
    when = time.strftime("%Y-%m-%d", time.localtime(r.get("ts") or 0))
    return (f"{when}, {r.get('kind')} {r.get('task_id')}: asked \"{r.get('ask') or '(no words recorded)'}\"; made \"{r.get('made')}\""
            + (f"; checks {r['checks']}" if r.get("checks") else "") + (f"; the owner {r['verdict']}" if r.get("verdict") else ""))


def recall_episodes(query, engagement="", limit=3):
    """Past work that resembles the request: at least two shared words with what was asked or made, the engagement's
    own work first, then the newest."""
    words = _WORDS(query)
    if not words:
        return []
    scored = []
    for r in _episodes():
        n = len(words & (_WORDS(r.get("ask")) | _WORDS(r.get("made"))))
        if n >= 2:
            scored.append((n + (1 if engagement and r.get("engagement_id") == engagement else 0), r.get("ts") or 0, r))
    scored.sort(key=lambda x: (-x[0], -x[1]))
    return [{"task_id": r["task_id"], "line": episode_line(r)} for _, _, r in scored[:limit]]


def _key(entry):
    return hashlib.sha256(entry.encode("utf-8")).hexdigest()[:16]


def _stats():
    try:
        return json.loads(_read(STATS) or "{}")
    except ValueError:
        return {}


def touch(entries_used, now=None):
    """Count a use of each entry (a recall hit) and remember when it was last used."""
    now = now or time.time()
    with _LOCK:
        st = _stats()
        for e in entries_used:
            s = st.setdefault(_key(e), {"first_seen": now, "uses": 0, "last_used": 0})
            s["uses"] += 1
            s["last_used"] = now
        _write(STATS, json.dumps(st))


def _explicit(entry):
    """The person's own "remember this" (source conversation or workspace): kept until they say forget."""
    return "(source: conversation," in entry or "(source: workspace," in entry


def retire(now=None):
    """Move learned entries (MEMORY.md, inferred and promoted through the gate) that no recall has used for RETIRE_DAYS
    into MEMORY.archive.md, with the date. Nothing is deleted. The person's explicit instructions and USER.md stay:
    they work through the system prompt, where a use is not a recall. An entry seen for the first time starts its
    sixty days now."""
    now = now or time.time()
    with _LOCK:
        st, items = _stats(), entries("MEMORY.md")
        keep, gone = [], []
        for e in items:
            s = st.setdefault(_key(e), {"first_seen": now, "uses": 0, "last_used": 0})
            idle = now - max(s["first_seen"], s["last_used"])
            (gone if not _explicit(e) and idle > RETIRE_DAYS * 86400 else keep).append(e)
        _write(STATS, json.dumps(st))
        if gone:
            day = time.strftime("%Y-%m-%d", time.localtime(now))
            with io.open(_p(ARCHIVE), "a", encoding="utf-8", newline="\n") as fh:
                for e in gone:
                    fh.write(f"- {e} (retired {day}: not recalled in {RETIRE_DAYS} days)\n")
            _versioned_write("MEMORY.md", _render("What the agent has learned", keep, MEMORY_CAP)[0], "retired idle entries", "retire")
    if gone:
        _audit("retire", {"retired": gone})
    return {"retired": gone, "kept": len(keep)}


def _audit(kind, data):
    with io.open(_p("audit.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"ts": time.time(), "kind": kind, **data}, ensure_ascii=False) + "\n")
