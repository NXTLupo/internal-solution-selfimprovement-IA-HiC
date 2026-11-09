"""
MCP Wrapper for Humans-in-Control Research (research-mcp, :8507).
Provides the JSON-RPC 2.0 interface the platform agent uses to drive HiC.

2026-10-30 (WS-6 M4, plan harness-capability-curve-uplift): the wrapper used to expose ONE tool that
printed a launch URL. It now drives the research proxy (research-proxy:5012) directly:

  launch_research_app   the browser URL for the human-in-the-loop SPA (unchanged)
  run_deliverable       queue a proxy-side generation job (/api/jobs op /api/artifact/generate) for a
                        deliverable kind from a goal and a corpus; returns the job id and, when asked to
                        wait, the finished artifact's launcher URL
  get_job               the state of a queued job (/api/jobs/{id})
  get_run_state         a session's runs (RunState records: steps, verdicts, goal) from /api/sessions/{slug}
  list_artifacts        the AIR records on disk (/api/air/list), newest first, with the chain verdict
  get_run_telemetry     one run's joined telemetry (calls, cost, verdicts, labels) from /api/telemetry/events

The proxy's auth token comes from PROXY_AUTH_TOKEN or, when the proxy generated an ephemeral one,
from the mounted hic-workspace/.runtime/config.json (read-only).
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import requests
import json
import os
import time
import logging
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Service URLs (internal Docker network)
RESEARCH_GENERATOR_URL = os.getenv("RESEARCH_GENERATOR_URL", "http://research-generator:5011")
RESEARCH_GENERATOR_CLIENT_URL = os.getenv("RESEARCH_GENERATOR_CLIENT_URL", "http://localhost:5011")
RESEARCH_PROXY_URL = os.getenv("RESEARCH_PROXY_URL", "http://research-proxy:5012")
RUNTIME_CONFIG_PATH = os.getenv("HIC_RUNTIME_CONFIG", "/hic-workspace/.runtime/config.json")
PORT = int(os.getenv("PORT", "8507"))

DELIVERABLE_KINDS = ["journey", "blueprint", "persona", "gap-analysis", "roadmap", "recommendation", "strategy-slide",
                     "org", "arch", "prd", "tech-audit", "competitive", "report"]


def _proxy_headers() -> Dict[str, str]:
    """The proxy's auth token: env first, then the ephemeral token the proxy publishes at runtime."""
    h = {"Content-Type": "application/json", "x-hic-session": "research-mcp"}
    token = os.getenv("PROXY_AUTH_TOKEN", "").strip()
    if not token:
        try:
            with open(RUNTIME_CONFIG_PATH, "r", encoding="utf-8") as f:
                token = str((json.load(f) or {}).get("proxyToken") or "").strip()
        except Exception:
            token = ""
    if token:
        h["x-proxy-token"] = token
    return h


def _proxy_get(path: str, params: Optional[dict] = None, timeout: float = 20.0) -> Any:
    r = requests.get(f"{RESEARCH_PROXY_URL}{path}", params=params or {}, headers=_proxy_headers(), timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"proxy {path} HTTP {r.status_code}: {r.text[:200]}")
    return r.json()


def _proxy_post(path: str, body: dict, timeout: float = 30.0) -> Any:
    r = requests.post(f"{RESEARCH_PROXY_URL}{path}", json=body, headers=_proxy_headers(), timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"proxy {path} HTTP {r.status_code}: {r.text[:200]}")
    return r.json()


# Tool definitions following MCP spec
RESEARCH_TOOLS = [
    {
        "name": "launch_research_app",
        "description": (
            "Launch the Humans-in-Control Research app for AI-augmented market research analysis. "
            "A browser-based tool that transforms uploaded documents (PDFs, CSVs, text) into consulting "
            "deliverables through a multi-stage pipeline with human checkpoints at every stage. "
            "Direct the user to open the app in their browser to upload files and run analysis."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "research_goal": {"type": "string", "description": "The research objective to share with the user when directing them to the app"}
            },
            "required": []
        }
    },
    {
        "name": "run_deliverable",
        "description": (
            "Generate one HiC deliverable programmatically through the research proxy's job queue. Supply the "
            "deliverable kind, the research goal and the corpus text it should be grounded on (the proxy's own "
            "evidence rules apply: every claim rests on the corpus). Returns the job id; with wait_seconds > 0 "
            "the call polls the job and returns the finished artifact's launcher URL and id."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": DELIVERABLE_KINDS, "description": "Deliverable kind"},
                "goal": {"type": "string", "description": "The research objective the deliverable answers"},
                "corpus": {"type": "string", "description": "The evidence text to ground on (articles, transcripts, uploads); the proxy chunks it"},
                "brand": {"type": "string", "enum": ["nxt", "nu", "deciem"], "description": "Brand mode (default nxt)"},
                "wait_seconds": {"type": "number", "description": "Poll the job up to this many seconds (default 0: return the job id at once; max 540)"},
                "callback_url": {"type": "string", "description": "Optional: the proxy POSTs the finished job's report (artifact id, launcher URL, verdict) here; public hosts or the owner's allow-listed internal hosts only"},
            },
            "required": ["kind", "goal", "corpus"]
        }
    },
    {
        "name": "get_job",
        "description": "The state of a queued or finished proxy job (status, result, error).",
        "inputSchema": {"type": "object", "properties": {"job_id": {"type": "string"}}, "required": ["job_id"]}
    },
    {
        "name": "get_run_state",
        "description": (
            "A HiC session's typed RunState records (steps with models and cost, judge verdicts, goal state, instruction "
            "overrides, artifacts). Pass the engagement slug; the newest run is first."
        ),
        "inputSchema": {"type": "object", "properties": {"engagement": {"type": "string", "description": "Session / engagement slug"}, "limit": {"type": "number"}}, "required": ["engagement"]}
    },
    {
        "name": "list_artifacts",
        "description": "The Artifact Intermediate Representation (AIR) records on disk, newest first, with each artifact's chain verdict and epoch.",
        "inputSchema": {"type": "object", "properties": {"engagement": {"type": "string", "description": "Optional slug filter (substring)"}, "limit": {"type": "number"}}, "required": []}
    },
    {
        "name": "get_run_telemetry",
        "description": "One run's joined telemetry from the event sink: provider calls and cost by model, judge verdicts, human labels, post-chain records.",
        "inputSchema": {"type": "object", "properties": {"run_id": {"type": "string"}, "limit": {"type": "number"}}, "required": ["run_id"]}
    },
    # 2026-10-31 (agent-stack plan WS-A A4): the skill PASSPORT. One registry generated from every SKILL.md, served by
    # the proxy; any agent (the platform agent, a Claude Code session through this server) lists and loads the same
    # versioned skill text the SPA injects.
    {
        "name": "list_skills",
        "description": "The HiC skill registry: every skill package with its id, version, status, invocation class and one-line description. Filter by surface (platform-agent, nxt-agency, claude-code) or status.",
        "inputSchema": {"type": "object", "properties": {"surface": {"type": "string"}, "status": {"type": "string", "enum": ["active", "dormant", "deprecated"]}}, "required": []}
    },
    {
        "name": "get_skill",
        "description": "One skill's full text (versioned header plus body, frontmatter stripped), the same text the HiC app injects into its prompts. Load it before doing the work the skill describes.",
        "inputSchema": {"type": "object", "properties": {"id": {"type": "string", "description": "Skill id, as list_skills names it"}}, "required": ["id"]}
    },
    # WS-B B2: the ONE memory door. A fact admitted here is recalled by the SPA, the platform agent and NXT-Agency.
    {
        "name": "recall_memory",
        "description": "Recall the long-term facts relevant to an objective (ranked by shared terms, confidence and recency) from the HiC memory every agent shares. Returns the facts and a rendered block to build on.",
        "inputSchema": {"type": "object", "properties": {
            "objective": {"type": "string", "description": "What you are working on, in a sentence"},
            "engagement": {"type": "string", "description": "Optional engagement slug; user-scoped preferences are always eligible"},
            "limit": {"type": "number"}}, "required": ["objective"]}
    },
    {
        "name": "admit_memory",
        "description": ("Admit what a completed piece of work established into the shared HiC memory. Each fact needs content, category "
                        "(preference, knowledge, context, behavior, goal, correction), scope (user or engagement), durability durable, "
                        "authority descriptive and confidence 0.7 or higher; the gate rejects anything else. Person names are redacted "
                        "unless the engagement keeps them."),
        "inputSchema": {"type": "object", "properties": {
            "facts": {"type": "array", "items": {"type": "object"}},
            "run_id": {"type": "string", "description": "Where the facts came from (a session or run id)"},
            "engagement": {"type": "string"}}, "required": ["facts", "run_id"]}
    },
    {
        "name": "get_digest",
        "description": ("The morning read-out of HiC's own state: what changed since the owner last looked (runs and their verdicts, decks "
                        "waiting on a decision, self-improvement proposals to review, a paused improvement loop, the overnight rescore, "
                        "what the second brain filed). Returns plain text to read aloud; mark_seen moves the agent's marker."),
        "inputSchema": {"type": "object", "properties": {
            "surface": {"type": "string", "enum": ["agent", "launchpad", "spa"], "description": "Whose last-seen marker to use (default agent)"},
            "mark_seen": {"type": "boolean", "description": "After reading, start the next digest from now"},
            "format": {"type": "string", "enum": ["text", "json"]}}, "required": []}
    },
]


# JSON-RPC models
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[Dict[str, Any]] = {}


class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


def _text(payload: Any) -> dict:
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False, indent=1, default=str)
    return {"content": [{"type": "text", "text": text[:60_000]}]}


def _run_deliverable(args: dict) -> dict:
    kind = str(args.get("kind") or "").strip().lower()
    if kind not in DELIVERABLE_KINDS:
        raise ValueError(f"kind must be one of {DELIVERABLE_KINDS}")
    goal = str(args.get("goal") or "").strip()
    corpus = str(args.get("corpus") or "")
    if not goal or len(corpus) < 200:
        raise ValueError("goal and a corpus of at least 200 characters are required")
    body = {"kind": kind, "brand": str(args.get("brand") or "nxt").lower(), "goal": goal, "corpus": corpus[:2_000_000]}
    job = {"op": "/api/artifact/generate", "body": body}
    if str(args.get("callback_url") or "").strip():
        job["callback_url"] = str(args["callback_url"]).strip()   # 2026-10-31 (D3): the proxy reports back when done
    queued = _proxy_post("/api/jobs", job)
    job_id = str(queued.get("job_id") or "")
    out = {"job_id": job_id, "status": queued.get("status"), "kind": kind, "goal": goal[:200]}
    wait = max(0.0, min(float(args.get("wait_seconds") or 0), 540.0))
    if job_id and wait > 0:
        deadline = time.time() + wait
        while time.time() < deadline:
            st = _proxy_get(f"/api/jobs/{job_id}")
            out["status"] = st.get("status")
            if st.get("status") in ("done", "completed", "failed", "error", "interrupted"):
                res = st.get("result") if isinstance(st.get("result"), dict) else {}
                out.update({"artifact_id": res.get("artifact_id"), "launcher_url": res.get("launcher_url"),
                            "error": st.get("error") or res.get("error"), "html_chars": len(str(res.get("html") or ""))})
                break
            time.sleep(3)
        else:
            out["note"] = f"still running after {int(wait)} s; poll get_job"
    return out


def _call_tool(tool_name: str, arguments: dict) -> dict:
    if tool_name == "launch_research_app":
        research_goal = arguments.get("research_goal", "")
        message = (
            f"The Humans-in-Control Research app is available at: {RESEARCH_GENERATOR_CLIENT_URL}\n\n"
            "This browser-based tool lets you:\n"
            "1. Upload research documents (PDF, CSV, text files)\n"
            "2. Run AI-powered analysis with human checkpoints at every stage\n"
            "3. Generate deliverables: personas, strategy decks, journey maps, PRDs, roadmaps, tech architecture, and strategic recommendations\n"
            "4. Export results as PDF, PowerPoint, or JSON\n"
        )
        if research_goal:
            message += f"\nResearch objective: {research_goal}"
        return _text(message)
    if tool_name == "run_deliverable":
        return _text(_run_deliverable(arguments))
    if tool_name == "get_job":
        return _text(_proxy_get(f"/api/jobs/{str(arguments.get('job_id') or '').strip()}"))
    if tool_name == "get_run_state":
        slug = str(arguments.get("engagement") or "").strip()
        if not slug:
            raise ValueError("engagement required")
        sess = _proxy_get(f"/api/sessions/{slug}")
        runs = sess.get("runs") if isinstance(sess, dict) and isinstance(sess.get("runs"), list) else []
        runs = sorted(runs, key=lambda r: (r or {}).get("updated_at") or 0, reverse=True)
        limit = int(arguments.get("limit") or 3)
        return _text({"engagement": slug, "runs": runs[:limit], "run_count": len(runs),
                      "goal": (runs[0] or {}).get("goal") if runs else None})
    if tool_name == "list_artifacts":
        return _text(_proxy_get("/api/air/list", {"engagement": arguments.get("engagement") or "", "limit": int(arguments.get("limit") or 50)}))
    if tool_name == "get_run_telemetry":
        return _text(_proxy_get("/api/telemetry/events", {"run_id": str(arguments.get("run_id") or ""), "limit": int(arguments.get("limit") or 200)}))
    if tool_name == "list_skills":
        reg = _proxy_get("/api/skills/registry", {"surface": arguments.get("surface") or "", "status": arguments.get("status") or ""})
        rows = [{k: s.get(k) for k in ("id", "version", "status", "invocation", "description", "surfaces") if s.get(k) is not None}
                for s in reg.get("skills") or []]
        return _text({"count": len(rows), "skills": rows})
    if tool_name == "get_skill":
        sid = str(arguments.get("id") or "").strip()
        if not sid:
            raise ValueError("id required")
        d = _proxy_get(f"/api/skills/{sid}")
        _proxy_post("/api/telemetry/events", {"events": [{"kind": "skill", "skill_id": sid, "version": (d.get("skill") or {}).get("version", ""),
                                                          "via": "get_skill", "surface": "research-mcp"}]}, timeout=5.0)
        return _text(d.get("body") or "")
    if tool_name == "recall_memory":
        objective = str(arguments.get("objective") or "").strip()
        if not objective:
            raise ValueError("objective required")
        return _text(_proxy_get("/api/memory/recall", {"objective": objective, "engagement": arguments.get("engagement") or "",
                                                         "limit": int(arguments.get("limit") or 8), "surface": "research-mcp"}))
    if tool_name == "admit_memory":
        facts = arguments.get("facts") if isinstance(arguments.get("facts"), list) else []
        run_id = str(arguments.get("run_id") or "").strip()
        if not facts or not run_id:
            raise ValueError("facts[] and run_id required")
        return _text(_proxy_post("/api/memory/admit", {"facts": facts, "run_id": run_id, "engagement": arguments.get("engagement") or "",
                                                       "surface": "research-mcp"}))
    if tool_name == "get_digest":
        # 2026-10-31 (agent-stack plan WS-E E3)
        surface = str(arguments.get("surface") or "agent")
        fmt = "json" if arguments.get("format") == "json" else "text"
        r = requests.get(f"{RESEARCH_PROXY_URL}/api/digest", params={"surface": surface, "format": fmt}, headers=_proxy_headers(), timeout=30)
        if r.status_code >= 400:
            raise RuntimeError(f"proxy /api/digest HTTP {r.status_code}: {r.text[:200]}")
        out = r.json() if fmt == "json" else r.text
        if arguments.get("mark_seen"):
            _proxy_post("/api/digest/seen", {"surface": surface}, timeout=10.0)
        return _text(out)
    raise KeyError(tool_name)


@app.get("/health")
async def health_check():
    """Health check: the SPA and the proxy are reachable."""
    try:
        response = requests.get(f"{RESEARCH_GENERATOR_URL}/", timeout=5)
        research_healthy = response.status_code == 200
    except Exception:
        research_healthy = False
    try:
        proxy_healthy = requests.get(f"{RESEARCH_PROXY_URL}/health", timeout=5).status_code == 200
    except Exception:
        proxy_healthy = False
    return {
        "status": "healthy" if (research_healthy and proxy_healthy) else "degraded",
        "service": "research-mcp",
        "research_generator_status": "connected" if research_healthy else "disconnected",
        "research_proxy_status": "connected" if proxy_healthy else "disconnected",
        "tools": [t["name"] for t in RESEARCH_TOOLS],
    }


@app.post("/mcp", response_model=JSONRPCResponse)
async def handle_mcp_request(request: JSONRPCRequest):
    """Handle MCP JSON-RPC 2.0 requests"""
    logger.info(f"Received MCP request: method={request.method}")

    if request.method == "tools/list":
        return JSONRPCResponse(jsonrpc="2.0", id=request.id, result={"tools": RESEARCH_TOOLS})

    elif request.method == "tools/call":
        tool_name = request.params.get("name")
        arguments = request.params.get("arguments", {}) or {}
        logger.info(f"Executing tool: {tool_name}")
        try:
            return JSONRPCResponse(jsonrpc="2.0", id=request.id, result=_call_tool(str(tool_name), arguments))
        except KeyError:
            return JSONRPCResponse(jsonrpc="2.0", id=request.id, error={"code": -32601, "message": f"Unknown tool: {tool_name}"})
        except ValueError as e:
            return JSONRPCResponse(jsonrpc="2.0", id=request.id, error={"code": -32602, "message": str(e)})
        except Exception as e:
            logger.warning(f"tool {tool_name} failed: {e}")
            return JSONRPCResponse(jsonrpc="2.0", id=request.id, error={"code": -32000, "message": str(e)[:300]})

    else:
        return JSONRPCResponse(jsonrpc="2.0", id=request.id, error={"code": -32601, "message": f"Method not found: {request.method}"})
