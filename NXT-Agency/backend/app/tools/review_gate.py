"""review_gate.py - 2026-10-31 (CX Workbench agent-stack plan, WS-D D4; owner decision 7: review for everything outbound)

Computer use ends in REVIEW, never in an unreviewed publish. Any state-changing browser action (a click, a drag, an
Enter key, typed text that submits) on a page OUTSIDE the platform's own services, and any shell command that
reaches the network, pauses as a `review_required` record: a screenshot, the proposed action and the page. The
agent waits for the human's decision (POST /api/reviews/{id}/decision, surfaced on the Launchpad as a review card);
an approved action runs, a rejected or expired one never does. Each review lands in the research proxy's event sink
(kind computer_use).

Reading is never gated: screenshots, scrolling, zooming, navigating and typing that does not submit run freely,
and so does everything on the platform's own services (the CX apps the agent drives to do its work).
"""
from __future__ import annotations

import asyncio
import contextvars
import logging
import os
import re
import time
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional
from urllib.parse import urlparse

logger = logging.getLogger("tools.review_gate")

# The platform's own services (docker service names on nxt-humans-network, and the host's loopback for the
# published ports). Anything else is OUTBOUND.
PLATFORM_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal",
    "journey-mapper", "reddit-ripper", "video-analyzer", "social-research-frontend", "social-research-backend",
    "consistent-character-generator", "copilot-recipe-generator", "miro-generator", "hic-research", "research-generator",
    "research-proxy", "launchpad", "agent", "nxt-agency-backend", "nxt-agency-launchpad", "presentation-renderer",
}
_EXTRA = {h.strip().lower() for h in os.environ.get("REVIEW_PLATFORM_HOSTS", "").split(",") if h.strip()}
STATE_CHANGING_ACTIONS = {"left_click", "right_click", "middle_click", "double_click", "triple_click", "left_click_drag",
                          "left_mouse_down", "left_mouse_up", "click", "upload_file"}
SUBMIT_KEYS = re.compile(r"^(?:ctrl\+|cmd\+|meta\+)?(?:return|enter|kp_enter)$", re.I)
NETWORK_COMMAND = re.compile(r"\b(curl|wget|ssh|scp|sftp|rsync|nc|ncat|telnet|ftp|git\s+push|npm\s+publish|twine\s+upload|"
                             r"gh\s+(?:pr|release|issue)|aws\s|gcloud\s|az\s|mail|sendmail|smtp)\b", re.I)
REVIEW_TIMEOUT_S = float(os.environ.get("REVIEW_TIMEOUT_S", "600"))

current_session: contextvars.ContextVar[str] = contextvars.ContextVar("review_session", default="")


def is_outbound(url: str) -> bool:
    if not url or url.startswith(("about:", "data:", "blob:", "file:", "chrome:")):
        return False
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return True
    return bool(host) and host not in PLATFORM_HOSTS and host not in _EXTRA


def needs_review(action: str, params: Dict[str, Any], page_url: str) -> bool:
    """A computer action needs review when it can CHANGE something on a page outside the platform."""
    if not is_outbound(page_url):
        return False
    a = str(action or "").lower()
    if a in STATE_CHANGING_ACTIONS:
        return True
    if a == "key" and SUBMIT_KEYS.match(str(params.get("text") or params.get("key") or "").strip()):
        return True
    if a == "type" and "\n" in str(params.get("text") or ""):
        return True
    return False


def command_needs_review(command: str) -> bool:
    return bool(NETWORK_COMMAND.search(str(command or "")))


# 2026-10-31 (live check): the agent asked to click a link on an external page wrote Python instead of driving the
# browser, and code execution was not gated. Code that SENDS something out (an HTTP write, mail, a raw socket, a
# scripted browser click or submit, a network shell command) waits for review like a computer action; code that only
# reads (GET requests, page fetches) runs freely, the same rule as the browser.
OUTBOUND_CODE = re.compile(
    r"(?:\.(?:post|put|patch|delete)\s*\("                                  # requests / httpx / aiohttp / axios writes
    r"|method\s*[=:]\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]"                  # explicit write methods (urllib, fetch)
    r"|urlopen\s*\([^)]*\bdata\s*="                                          # urllib POST via data=
    r"|Request\s*\([^)]*\bdata\s*="
    r"|\bsmtplib\b|\bftplib\b|\bparamiko\b|\bnodemailer\b|\btelnetlib\b"
    r"|\bsocket\.(?:socket|create_connection)\b|\bnet\.connect\b|\bhttp\.request\s*\("
    r"|\.(?:click|fill|press|submit|check|set_input_files|send_keys)\s*\("     # playwright / selenium / puppeteer
    r")",
    re.I,
)


def code_needs_review(code: str) -> bool:
    c = str(code or "")
    return bool(OUTBOUND_CODE.search(c) or NETWORK_COMMAND.search(" ".join(re.findall(r"(?:system|run|Popen|check_output|exec)\s*\(([^)]*)\)", c))))


def describe(action: str, params: Dict[str, Any]) -> str:
    a = str(action or "")
    if a == "bash":
        return f"Run shell command: {str(params.get('command') or '')[:240]}"
    if a in STATE_CHANGING_ACTIONS:
        coord = params.get("coordinate") or [params.get("x"), params.get("y")]
        return f"{a.replace('_', ' ')} at {coord}"
    if a == "key":
        return f"press {params.get('text') or params.get('key')}"
    if a == "type":
        return f"type and submit: {str(params.get('text') or '')[:160]!r}"
    if a in ("python", "javascript"):
        code = str(params.get("code") or "")
        m = OUTBOUND_CODE.search(code)
        line = code[max(0, code.rfind("\n", 0, m.start()) + 1): (code.find("\n", m.end()) if code.find("\n", m.end()) >= 0 else len(code))] if m else code[:160]
        return f"run {a} that sends data out: {line.strip()[:200]}"
    return a


class ReviewStore:
    def __init__(self) -> None:
        self._reviews: Dict[str, Dict[str, Any]] = {}
        self._events: Dict[str, asyncio.Event] = {}

    def create(self, *, session_id: str, action: str, params: Dict[str, Any], url: str, screenshot_b64: str = "") -> Dict[str, Any]:
        rid = f"rv_{uuid.uuid4().hex[:12]}"
        rec = {"id": rid, "status": "pending", "created_at": time.time(), "session_id": session_id, "action": action,
               "proposed_action": describe(action, params), "url": url, "host": (urlparse(url).hostname or "") if url else "",
               "screenshot": screenshot_b64, "decided_at": None, "reviewer": None, "announced": False}
        self._reviews[rid] = rec
        self._events[rid] = asyncio.Event()
        return rec

    def get(self, rid: str) -> Optional[Dict[str, Any]]:
        return self._reviews.get(rid)

    def pending(self, session_id: str = "") -> List[Dict[str, Any]]:
        return [r for r in self._reviews.values() if r["status"] == "pending" and (not session_id or r["session_id"] == session_id)]

    def decide(self, rid: str, decision: str, reviewer: str = "owner") -> Optional[Dict[str, Any]]:
        rec = self._reviews.get(rid)
        if not rec or rec["status"] != "pending" or decision not in ("approved", "rejected"):
            return None
        rec.update({"status": decision, "decided_at": time.time(), "reviewer": reviewer})
        ev = self._events.get(rid)
        if ev:
            ev.set()
        return rec

    async def wait(self, rid: str, timeout_s: Optional[float] = None) -> str:
        ev = self._events.get(rid)
        if ev is None:
            return "missing"
        try:
            # read at call time (a default argument would freeze the value at import)
            await asyncio.wait_for(ev.wait(), timeout=REVIEW_TIMEOUT_S if timeout_s is None else timeout_s)
        except asyncio.TimeoutError:
            rec = self._reviews.get(rid)
            if rec and rec["status"] == "pending":
                rec.update({"status": "expired", "decided_at": time.time()})
            return "expired"
        return self._reviews[rid]["status"]


reviews = ReviewStore()


async def gate(action: str, params: Dict[str, Any], url: str, run: Callable[[], Awaitable[Dict[str, Any]]],
               screenshot: Optional[Callable[[], Awaitable[str]]] = None) -> Dict[str, Any]:
    """Run `run()` unless the action needs review; when it does, open a review, wait for the human, and run only on
    approval. Returns the action's result, or a review outcome the model reads instead."""
    if action == "bash":
        outbound = command_needs_review(str(params.get("command") or ""))
    elif action in ("python", "javascript"):
        outbound = code_needs_review(str(params.get("code") or ""))
    else:
        outbound = needs_review(action, params, url)
    if not outbound:
        return await run()
    shot = ""
    if screenshot is not None:
        try:
            shot = await screenshot()
        except Exception:
            shot = ""
    rec = reviews.create(session_id=current_session.get(), action=action, params=params, url=url, screenshot_b64=shot)
    logger.info("review required %s: %s on %s", rec["id"], rec["proposed_action"], rec["host"] or "shell")
    await _sink(rec, "review_required")
    outcome = await reviews.wait(rec["id"])
    await _sink(rec, outcome)
    if outcome == "approved":
        result = await run()
        if isinstance(result, dict):
            result = {**result, "review_id": rec["id"], "review": "approved"}
        return result
    return {"status": f"review_{outcome}", "review_id": rec["id"], "proposed_action": rec["proposed_action"], "url": url,
            "message": ("The reviewer rejected this outbound action; it was NOT performed. Ask the user how to proceed."
                        if outcome == "rejected" else
                        "No reviewer decided in time; the outbound action was NOT performed. Tell the user it is waiting for review.")}


async def _sink(rec: Dict[str, Any], stage: str) -> None:
    try:
        from app.hic_bridge import telemetry
        await telemetry([{"kind": "computer_use", "surface": "nxt-agency", "review_id": rec["id"], "stage": stage,
                          "action": rec["action"], "proposed_action": rec["proposed_action"], "host": rec["host"],
                          "session_id": rec["session_id"], "status": rec["status"]}])
    except Exception:
        pass
