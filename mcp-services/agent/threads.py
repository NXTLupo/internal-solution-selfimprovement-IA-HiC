"""threads.py - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-D D1)

The platform agent as the coordinator the transcript shows: a THREAD REGISTRY with location markers, persistence
so a restart loses nothing, and routing of a new ask to the thread that already owns its job or engagement.

  hic-workspace/agent/threads.json             one row per thread: id, title, engagement, job ids, location,
                                               status, tools used, turns, timestamps
  hic-workspace/agent/conversations/<id>.json  the thread's messages and file/journey mappings

Placement policy (named in the thread list): work that runs in the platform's containers (the research proxy's
job store, the MCP services) is "cloud"; work that needs the user's own machine and browser (computer use, a
local browser or desktop tool) is "local". A thread's location is the placement of the tools it ran.
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

AGENT_DIR = os.environ.get("HIC_AGENT_DIR", "/hic-workspace/agent")
LOCAL_TOOL_PREFIXES = ("computer_", "browser_", "desktop_", "screen_", "local_")
_JOB_RE = re.compile(r"\bjob_[0-9]{6,}_[0-9a-f]{6,}\b")
_SAFE_ID = re.compile(r"[^A-Za-z0-9_.-]")


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _paths(base: Optional[str] = None) -> Dict[str, str]:
    b = base or AGENT_DIR
    return {"base": b, "registry": os.path.join(b, "threads.json"), "conversations": os.path.join(b, "conversations")}


def _atomic_write(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    for attempt in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.05)


def safe_id(thread_id: str) -> str:
    return _SAFE_ID.sub("_", str(thread_id or ""))[:120] or "thread"


# ---------------------------------------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------------------------------------
def load_registry(base: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    p = _paths(base)["registry"]
    try:
        with open(p, "r", encoding="utf-8") as f:
            d = json.load(f)
        threads = d.get("threads") if isinstance(d, dict) else None
        return threads if isinstance(threads, dict) else {}
    except Exception:
        return {}


def save_registry(threads: Dict[str, Dict[str, Any]], base: Optional[str] = None) -> None:
    _atomic_write(_paths(base)["registry"], {"schema": "hic.agent-threads.v1", "updated_at": _now(), "threads": threads})


def placement_for_tools(tool_names: Iterable[str]) -> str:
    names = [str(t) for t in tool_names if t]
    return "local" if any(n.startswith(LOCAL_TOOL_PREFIXES) for n in names) else "cloud"


def title_from(text: str, max_chars: int = 72) -> str:
    flat = re.sub(r"\s+", " ", str(text or "")).strip()
    return flat if len(flat) <= max_chars else flat[:max_chars - 1].rsplit(" ", 1)[0] + "..."


def extract_job_ids(obj: Any, found: Optional[List[str]] = None) -> List[str]:
    """Every job id a tool result or a message carries (job_id / jobId keys, and job_<digits>_<hex> tokens)."""
    found = found if found is not None else []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("job_id", "jobId") and isinstance(v, str) and v and v not in found:
                found.append(v)
            else:
                extract_job_ids(v, found)
    elif isinstance(obj, list):
        for v in obj:
            extract_job_ids(v, found)
    elif isinstance(obj, str):
        for m in _JOB_RE.findall(obj):
            if m not in found:
                found.append(m)
    return found


def extract_engagement(*objs: Any) -> str:
    """The engagement a tool call names (engagement / engagement_slug / slug parameters or result fields)."""
    for obj in objs:
        if isinstance(obj, dict):
            for k in ("engagement", "engagement_slug", "slug"):
                v = obj.get(k)
                if isinstance(v, str) and len(v) >= 6 and not v.startswith(("job_", "run_")):
                    return v
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    e = extract_engagement(v)
                    if e:
                        return e
        elif isinstance(obj, list):
            for v in obj:
                e = extract_engagement(v)
                if e:
                    return e
    return ""


def route_message(threads: Dict[str, Dict[str, Any]], current_id: str, text: str) -> Optional[str]:
    """The thread that OWNS what this message is about, when it is not the current one: a job id the message names,
    else an engagement slug the message names. None keeps the message in the current thread."""
    t = str(text or "")
    jobs = extract_job_ids(t)
    if jobs:
        for tid, row in threads.items():
            if tid != current_id and set(jobs) & set(row.get("job_ids") or []):
                return tid
    low = t.lower()
    best = None
    for tid, row in threads.items():
        eng = str(row.get("engagement") or "").lower()
        if tid != current_id and len(eng) >= 8 and eng in low:
            if best is None or str(row.get("updated_at") or "") > str(threads[best].get("updated_at") or ""):
                best = tid
    return best


def upsert_thread(threads: Dict[str, Dict[str, Any]], thread_id: str, *, user_message: str = "", reply: str = "",
                  tools: Optional[List[str]] = None, job_ids: Optional[List[str]] = None, engagement: str = "",
                  status: str = "active") -> Dict[str, Any]:
    row = threads.get(thread_id) or {"id": thread_id, "title": title_from(user_message) or "New thread", "created_at": _now(),
                                     "engagement": "", "job_ids": [], "tools": [], "turns": 0, "location": "cloud"}
    if engagement and not row.get("engagement"):
        row["engagement"] = engagement
    for j in job_ids or []:
        if j not in row["job_ids"]:
            row["job_ids"].append(j)
    for t in tools or []:
        if t not in row["tools"]:
            row["tools"].append(t)
    row["location"] = placement_for_tools(row["tools"])
    row["status"] = status
    row["turns"] = int(row.get("turns") or 0) + (1 if user_message else 0)
    row["updated_at"] = _now()
    if reply:
        row["last_reply"] = title_from(reply, 140)
    threads[thread_id] = row
    return row


# ---------------------------------------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------------------------------------
def load_conversation(thread_id: str, base: Optional[str] = None) -> Optional[Dict[str, Any]]:
    p = os.path.join(_paths(base)["conversations"], f"{safe_id(thread_id)}.json")
    try:
        with open(p, "r", encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else None
    except Exception:
        return None


def save_conversation(thread_id: str, data: Dict[str, Any], base: Optional[str] = None) -> None:
    _atomic_write(os.path.join(_paths(base)["conversations"], f"{safe_id(thread_id)}.json"), data)
