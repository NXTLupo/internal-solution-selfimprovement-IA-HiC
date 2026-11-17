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
            return {"promoted": [], "held": held}
        body, kept = _render("What the agent has learned", before + promoted, MEMORY_CAP)
        lost = len([b for b in before if b not in kept])
        if before and lost / len(before) > MAX_LOSS:
            return {"promoted": [], "held": held, "refused": f"would remove {lost} of {len(before)} existing entries"}
        _write("MEMORY.md", body)
        _save_notes(remaining)
    _audit("consolidate", {"promoted": promoted})
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
    return sorted(hits, key=lambda h: -h["score"])[:limit]


def _audit(kind, data):
    with io.open(_p("audit.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"ts": time.time(), "kind": kind, **data}, ensure_ascii=False) + "\n")
