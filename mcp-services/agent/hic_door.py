"""hic_door.py - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift: WS-A A4, WS-B B2, WS-D D2)

The platform agent's ONE way into HiC, through the research proxy:
  - MODELS: the routing authority's seats from /api/models (no model id hard-coded here); every model call goes
    through the proxy's provider routes, so the agent gets the same body normalization, cost meter, cache and
    event-sink rows as the SPA, and holds no provider key.
  - MEMORY: recall at the start of a turn and admit after a completed tool chain, through /api/memory/*.
  - SKILLS: the registry's `platform-agent` packages mounted into the system prompt, refreshed when their hash
    changes (a SkillOpt promotion lands on the next turn after the TTL).
  - TELEMETRY: one `agent_turn` row per turn in the event sink.
Everything here degrades to "no extra context" when the proxy is unreachable; model calls cannot (there is no
other route), and the turn reports the outage instead of answering from nothing.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger("agent-orchestrator.door")

PROXY_URL = os.environ.get("HIC_PROXY_URL", "http://research-proxy:5012").rstrip("/")
RUNTIME_CONFIG = os.environ.get("HIC_RUNTIME_CONFIG", "/hic-workspace/.runtime/config.json")

# Used only when /api/models cannot be read AND no model call can be made either; kept so /health can say what
# the agent would have asked for. The live values always come from the proxy.
_SEAT_FALLBACK = {"agent_chat": "gemini-3.5-flash", "agent_tool_chain": "claude-opus-5-5"}

_token_cache: Tuple[float, str] = (0.0, "")


def proxy_token() -> str:
    """PROXY_AUTH_TOKEN when pinned, else the token the proxy publishes (re-read when the file changes)."""
    global _token_cache
    env = os.environ.get("PROXY_AUTH_TOKEN", "").strip()
    if env:
        return env
    try:
        mtime = os.path.getmtime(RUNTIME_CONFIG)
        if _token_cache[0] == mtime and _token_cache[1]:
            return _token_cache[1]
        with open(RUNTIME_CONFIG, "r", encoding="utf-8") as f:
            tok = str((json.load(f) or {}).get("proxyToken") or "")
        _token_cache = (mtime, tok)
        return tok
    except Exception:
        return ""


def _headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    tok = proxy_token()
    if tok:
        h["x-proxy-token"] = tok
    return h


async def _get(path: str, params: Optional[dict] = None, timeout: float = 10.0) -> Any:
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.get(f"{PROXY_URL}{path}", params=params or {}, headers=_headers())
        r.raise_for_status()
        return r.json()


async def _post(path: str, body: dict, timeout: float = 30.0) -> Any:
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.post(f"{PROXY_URL}{path}", json=body, headers=_headers())
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------------------------------------
# Models (D2)
# ---------------------------------------------------------------------------------------------------------
class Seats:
    def __init__(self, ttl_s: float = 300.0):
        self.ttl_s = ttl_s
        self.at = 0.0
        self.seats: Dict[str, str] = {}
        self.source = "unread"

    async def refresh(self, force: bool = False) -> Dict[str, str]:
        if not force and self.seats and time.time() - self.at < self.ttl_s:
            return self.seats
        try:
            d = await _get("/api/models")
            seats = d.get("seats") if isinstance(d, dict) else None
            if isinstance(seats, dict) and seats.get("agent_chat") and seats.get("agent_tool_chain"):
                self.seats, self.at, self.source = {k: str(v) for k, v in seats.items()}, time.time(), "proxy /api/models"
                return self.seats
        except Exception as e:
            logger.warning(f"[models] /api/models unavailable: {e}")
        if not self.seats:
            self.seats, self.source = dict(_SEAT_FALLBACK), "fallback (proxy unreachable)"
        return self.seats

    async def seat(self, name: str) -> str:
        return (await self.refresh()).get(name) or _SEAT_FALLBACK[name]


def normalize_messages(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Merge consecutive same-role turns and make the conversation start with the user (both providers' rule)."""
    out: List[Dict[str, str]] = []
    for m in messages:
        role = "assistant" if m.get("role") == "assistant" else "user"
        content = str(m.get("content") or "").strip()
        if not content:
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n\n" + content
        else:
            out.append({"role": role, "content": content})
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


def _text_from_anthropic(d: dict) -> str:
    return "".join(b.get("text", "") for b in (d.get("content") or []) if isinstance(b, dict) and b.get("type") == "text").strip()


def _text_from_gemini(d: dict) -> str:
    cands = d.get("candidates") or []
    if not cands:
        return str(d.get("text") or "").strip()
    parts = ((cands[0] or {}).get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict) and not p.get("thought")).strip()


async def complete(model: str, system: str, messages: List[Dict[str, str]], max_tokens: int = 8000) -> str:
    """One model call through the proxy's provider route for the seat's model family."""
    msgs = normalize_messages(messages)
    if not msgs:
        raise ValueError("no user message to answer")
    if model.startswith("claude"):
        d = await _post("/api/ai/anthropic", {"model": model, "system": system, "messages": msgs,
                                             "max_tokens": max(4000, int(max_tokens))}, timeout=600.0)
        return _text_from_anthropic(d)
    if model.startswith("gemini"):
        contents = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]} for m in msgs]
        d = await _post("/api/ai/gemini", {"model": model, "systemInstruction": {"parts": [{"text": system}]},
                                          "contents": contents, "generationConfig": {"maxOutputTokens": int(max_tokens)}}, timeout=300.0)
        return _text_from_gemini(d)
    raise ValueError(f"no proxy route for model '{model}'")


# ---------------------------------------------------------------------------------------------------------
# Memory (B2)
# ---------------------------------------------------------------------------------------------------------
async def recall(objective: str, engagement: str = "", limit: int = 6) -> Dict[str, Any]:
    try:
        d = await _get("/api/memory/recall", {"objective": objective[:2000], "engagement": engagement, "limit": limit,
                                              "surface": "platform-agent", "max_chars": 1800}, timeout=8.0)
        return {"rendered": str(d.get("rendered") or ""), "ids": [f.get("id") for f in d.get("facts") or []]}
    except Exception as e:
        logger.info(f"[memory] recall skipped: {e}")
        return {"rendered": "", "ids": []}


def lead_of(text: str, max_chars: int = 420) -> str:
    flat = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(flat) <= max_chars:
        return flat
    cut = flat[:max_chars]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[:end + 1] if end > max_chars * 0.5 else cut).strip()


def tool_chain_fact(question: str, answer: str, tools: List[str]) -> Optional[dict]:
    """What a completed tool chain established, as ONE typed fact (the insightFact shape, plus the tools used)."""
    q = re.sub(r"\s+", " ", str(question or "")).strip()[:200]
    lead = lead_of(answer)
    if not q or len(lead) < 80 or not tools:
        return None
    return {"content": f"Q: {q} / A: {lead} (tools: {', '.join(sorted(set(tools))[:5])})", "category": "knowledge",
            "confidence": 0.75, "scope": "engagement", "durability": "durable", "authority": "descriptive",
            "expectedValidDays": 120}


async def admit(facts: List[dict], run_id: str, engagement: str = "") -> Dict[str, Any]:
    if not facts:
        return {"ok": False, "reason": "nothing to admit"}
    try:
        return await _post("/api/memory/admit", {"facts": facts, "run_id": run_id, "engagement": engagement,
                                                 "surface": "platform-agent"}, timeout=15.0)
    except Exception as e:
        logger.info(f"[memory] admit skipped: {e}")
        return {"ok": False, "reason": str(e)[:160]}


# ---------------------------------------------------------------------------------------------------------
# Skills (A4)
# ---------------------------------------------------------------------------------------------------------
class SkillMount:
    """The registry's platform-agent packages as system-prompt text, re-fetched only when a sha changes."""

    def __init__(self, surface: str = "platform-agent", ttl_s: float = 60.0):
        self.surface = surface
        self.ttl_s = ttl_s
        self.at = 0.0
        self.skills: Dict[str, Dict[str, str]] = {}   # id -> {version, sha, body}
        self.error: Optional[str] = None

    async def refresh(self, force: bool = False) -> Dict[str, Dict[str, str]]:
        if not force and time.time() - self.at < self.ttl_s:
            return self.skills
        try:
            reg = await _get("/api/skills/registry", {"surface": self.surface, "status": "active"})
            wanted = {s["id"]: s for s in reg.get("skills") or [] if s.get("id")}
            nxt: Dict[str, Dict[str, str]] = {}
            for sid, entry in wanted.items():
                cur = self.skills.get(sid)
                if cur and cur.get("sha") == entry.get("sha"):
                    nxt[sid] = cur
                    continue
                g = await _get(f"/api/skills/{sid}")
                nxt[sid] = {"version": str(entry.get("version") or ""), "sha": str(entry.get("sha") or ""), "body": str(g.get("body") or "")}
                logger.info(f"[skills] mounted {sid}@{nxt[sid]['version']} ({len(nxt[sid]['body'])} chars)")
            self.skills, self.at, self.error = nxt, time.time(), None
        except Exception as e:
            self.error = str(e)[:160]
            self.at = time.time()
            logger.warning(f"[skills] registry unavailable, keeping {len(self.skills)} mounted package(s): {e}")
        return self.skills

    def block(self) -> str:
        if not self.skills:
            return ""
        parts = ["SKILL PACKAGES (mounted from the HiC skill registry; follow them):"]
        for sid in sorted(self.skills):
            parts.append(f"\n<skill id=\"{sid}\" version=\"{self.skills[sid]['version']}\">\n{self.skills[sid]['body']}\n</skill>")
        return "\n".join(parts)

    def versions(self) -> Dict[str, str]:
        return {sid: s["version"] for sid, s in self.skills.items()}


# ---------------------------------------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------------------------------------
async def telemetry(events: List[dict]) -> None:
    if not events:
        return
    try:
        await _post("/api/telemetry/events", {"events": events}, timeout=5.0)
    except Exception as e:
        logger.debug(f"[telemetry] skipped: {e}")
