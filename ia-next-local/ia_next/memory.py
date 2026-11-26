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


def entries(name="MEMORY.md"):
    return [e.strip() for e in _read(name).split("\n- ") if e.strip() and not e.strip().startswith("#")]


def _render(title, items, cap):
    body = "# " + title + "\n" + "".join(SEP + i for i in items) + "\n"
    while len(body) > cap and items:     # over the cap: the oldest entry goes first
        items = items[1:]
        body = "# " + title + "\n" + "".join(SEP + i for i in items) + "\n"
    return body, items


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
        _write(name, body)
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
                _write(name, _render(title, keep, cap)[0])
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
        _write("MEMORY.md", body)
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
            _write("MEMORY.md", _render("What the agent has learned", keep, MEMORY_CAP)[0])
    if gone:
        _audit("retire", {"retired": gone})
    return {"retired": gone, "kept": len(keep)}


def _audit(kind, data):
    with io.open(_p("audit.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"ts": time.time(), "kind": kind, **data}, ensure_ascii=False) + "\n")
