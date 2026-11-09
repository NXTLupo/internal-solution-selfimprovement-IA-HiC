"""hic_bridge.py - 2026-10-31 (CX Workbench agent-stack plan: WS-B B2, WS-D D1/D4)

NXT-Agency's way into the CX Workbench's shared surfaces, all through the research proxy or the platform agent:
  - MEMORY: recall the facts relevant to a turn and admit what a completed tool chain established, through the
    proxy's ONE memory door (/api/memory/recall, /api/memory/admit).
  - TELEMETRY: rows in the proxy's event sink (computer-use reviews, agent turns).
  - THREADS: each Launchpad conversation is reported into the platform agent's thread registry
    (agent:8500/api/threads/report) with its location (local once computer use ran), and persisted to disk so a
    backend restart does not lose it.
Every call is best-effort: when a surface is down the chat still answers, with less context.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("hic_bridge")

PROXY_URL = os.environ.get("HIC_PROXY_URL", "http://research-proxy:5012").rstrip("/")
AGENT_URL = os.environ.get("HIC_AGENT_URL", "http://agent:8500").rstrip("/")
RUNTIME_CONFIG = os.environ.get("HIC_RUNTIME_CONFIG", "/hic-workspace/.runtime/config.json")
CONV_DIR = os.environ.get("NXT_AGENCY_CONV_DIR", "/hic-workspace/agent/nxt-agency")
_SAFE = re.compile(r"[^A-Za-z0-9_.-]")


def _token() -> str:
    tok = os.environ.get("PROXY_AUTH_TOKEN", "").strip()
    if tok:
        return tok
    try:
        with open(RUNTIME_CONFIG, "r", encoding="utf-8") as f:
            return str((json.load(f) or {}).get("proxyToken") or "")
    except Exception:
        return ""


def _headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    t = _token()
    if t:
        h["x-proxy-token"] = t
    return h


async def telemetry(events: List[dict]) -> None:
    if not events:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            await c.post(f"{PROXY_URL}/api/telemetry/events", json={"events": events}, headers=_headers())
    except Exception as e:
        logger.debug("telemetry skipped: %s", e)


async def recall(objective: str, engagement: str = "", limit: int = 6) -> str:
    try:
        async with httpx.AsyncClient(timeout=6.0) as c:
            r = await c.get(f"{PROXY_URL}/api/memory/recall", headers=_headers(),
                            params={"objective": objective[:1500], "engagement": engagement, "limit": limit, "surface": "nxt-agency", "max_chars": 1600})
            r.raise_for_status()
            return str(r.json().get("rendered") or "")
    except Exception as e:
        logger.info("memory recall skipped: %s", e)
        return ""


def lead_of(text: str, max_chars: int = 420) -> str:
    flat = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(flat) <= max_chars:
        return flat
    cut = flat[:max_chars]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[:end + 1] if end > max_chars * 0.5 else cut).strip()


def chain_fact(question: str, answer: str, tools: List[str]) -> Optional[dict]:
    q = re.sub(r"\s+", " ", str(question or "")).strip()[:200]
    lead = lead_of(answer)
    tools = sorted({t for t in tools if t})
    if not q or len(lead) < 80 or not tools:
        return None
    return {"content": f"Q: {q} / A: {lead} (tools: {', '.join(tools[:5])})", "category": "knowledge", "confidence": 0.75,
            "scope": "engagement", "durability": "durable", "authority": "descriptive", "expectedValidDays": 120}


async def admit(facts: List[dict], run_id: str, engagement: str = "") -> Dict[str, Any]:
    if not facts:
        return {"ok": False}
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(f"{PROXY_URL}/api/memory/admit", headers=_headers(),
                             json={"facts": facts, "run_id": run_id, "engagement": engagement, "surface": "nxt-agency"})
            return r.json()
    except Exception as e:
        logger.info("memory admit skipped: %s", e)
        return {"ok": False, "error": str(e)[:160]}


async def report_thread(conversation_id: str, *, user_message: str, reply: str, tools: List[str]) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            await c.post(f"{AGENT_URL}/api/threads/report", json={"id": conversation_id, "source": "nxt-agency",
                                                                  "user_message": user_message[:500], "reply": reply[:500],
                                                                  "tools": sorted({t for t in tools if t})})
    except Exception as e:
        logger.debug("thread report skipped: %s", e)


# ---------------------------------------------------------------------------------------------------------
# Conversation persistence (D1: a backend restart loses nothing)
# ---------------------------------------------------------------------------------------------------------
def _conv_path(conversation_id: str) -> str:
    return os.path.join(CONV_DIR, f"{_SAFE.sub('_', str(conversation_id))[:120] or 'conv'}.json")


def load_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    try:
        with open(_conv_path(conversation_id), "r", encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else None
    except Exception:
        return None


def save_conversation(conversation_id: str, conv: Dict[str, Any]) -> None:
    keep = {k: v for k, v in conv.items() if not k.startswith("_") and k in ("id", "history", "files", "updated_at")}
    keep["updated_at"] = time.time()
    try:
        os.makedirs(CONV_DIR, exist_ok=True)
        p = _conv_path(conversation_id)
        tmp = f"{p}.{os.getpid()}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(keep, f, ensure_ascii=False, default=str)
        os.replace(tmp, p)
    except Exception as e:
        logger.warning("conversation persist failed for %s: %s", conversation_id, e)
