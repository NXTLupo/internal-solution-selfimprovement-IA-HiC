"""Files the person attached in a conversation (plan Part 9 C2, 17 Nov owner failure).

A deck asked to use three attached documents was written from an old test interview in the same engagement: the agent
never learned which files were attached, and the builders read the whole engagement. Now:
- every message carries the conversation's attachments, checked against the engagement's stored uploads (titles come
  from the server's record, never from the page);
- the agent sees them as facts at the top of the message;
- a deck, journey map or prototype started while files attached WITH THIS MESSAGE go unnamed is refused with the
  facts, so the agent decides explicitly: pass their source ids, or say the person asked for the whole engagement.
The model interprets what the person points at; code only makes sure the choice is made, never silently skipped.
"""
import contextvars
import re

from . import store

_CURRENT = contextvars.ContextVar("ia_next_attachments", default=None)
MAX_FILES = 30


def verified(raw):
    """The page's attachment list, kept only where the engagement really holds that upload. Returns
    [{engagement_id, source_id, title}] with the server's own title."""
    from . import transcripts
    out, seen, cache = [], set(), {}
    for a in (raw or [])[:MAX_FILES]:
        if not isinstance(a, dict):
            continue
        eid, sid = str(a.get("engagement_id") or "").strip(), str(a.get("source_id") or "").strip().upper()
        if not eid or not re.fullmatch(r"S\d{1,4}", sid) or (eid, sid) in seen or not store.get_engagement(eid):
            continue
        if eid not in cache:
            cache[eid] = {u["id"]: u for u in transcripts.uploaded_sources(eid)}
        up = cache[eid].get(sid)
        if not up:
            continue
        seen.add((eid, sid))
        title = re.sub(r"[\x00-\x1f\x7f\"]+", " ", str(up.get("title") or sid)).strip()[:160]
        # fresh: attached since the person's previous message (the page knows; it survives a restart of the service)
        out.append({"engagement_id": eid, "source_id": sid, "title": title, "fresh": bool(a.get("fresh"))})
    return out


def describe(files):
    """The line the agent reads at the top of the message."""
    if not files:
        return ""
    parts = []
    for f in files:
        mark = " (attached with this message)" if f.get("fresh") else ""
        parts.append(f"\"{f['title']}\" is source {f['source_id']} in engagement {f['engagement_id']}{mark}")
    return ("(Files the person attached in this conversation: " + "; ".join(parts) + ". When they ask for work from the "
            "attached files, or from files they name, pass those source ids in source_ids so the work uses them alone.)")


class scope:
    """Holds this turn's attachments for the tool layer: `files` (all in the conversation) and `fresh` (attached with
    this message)."""

    def __init__(self, files):
        files = list(files or [])
        self.value = {"files": files, "fresh": [f for f in files if f.get("fresh")]}

    def __enter__(self):
        self._token = _CURRENT.set(self.value)
        return self.value

    def __exit__(self, *exc):
        _CURRENT.reset(self._token)
        return False


def current():
    return _CURRENT.get() or {"files": [], "fresh": []}


def unnamed_fresh(eid, source_ids, whole_engagement=False):
    """An error for the agent when files attached with this message, in this engagement, are left out of source_ids
    and the agent has not said the person asked for the whole engagement; None when the work may start."""
    if whole_engagement:
        return None
    named = set(source_ids or [])
    left = [f for f in current()["fresh"] if f["engagement_id"] == eid and f["source_id"] not in named]
    if not left:
        return None
    files = "; ".join(f"\"{f['title']}\" ({f['source_id']})" for f in left)
    return {"error": (f"The person attached files with this message: {files}. Pass their ids in source_ids to build from "
                      "them, or set whole_engagement to true only if the person asked for the whole engagement's material.")}
