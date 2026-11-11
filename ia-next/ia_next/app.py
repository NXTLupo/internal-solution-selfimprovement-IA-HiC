"""IA Next HTTP service: the agent, the task list, memory, approvals and the workspace page.

Bound to 127.0.0.1:9400 by its compose file, on its own network. It shares nothing with the existing
Intelligence Augmentation suite except the provider keys read from the workbench's root .env.
"""
import os
import threading

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from . import __version__, agent, config, control, memory, store

app = FastAPI(title="IA Next", version=__version__)
WEB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


@app.on_event("startup")
def _startup():
    config.ensure_dirs()
    store.conn()
    # A task left "running" by a previous process cannot still be running: say so instead of pretending.
    for t in store.list_tasks(limit=500):
        if t["status"] in ("queued", "running"):
            store.update_task(t["id"], status="failed", error="interrupted by a restart; start it again")
            store.event("task_failed", {"error": "interrupted by a restart"}, t["engagement_id"], t["id"])


@app.get("/health")
def health():
    keys = {"anthropic": bool(config.ANTHROPIC_API_KEY), "google": bool(config.GEMINI_API_KEY), "openai": bool(config.OPENAI_API_KEY)}
    return {"status": "healthy", "service": "ia-next", "version": __version__, "port": config.PORT, "provider_keys_present": keys}


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB, "index.html"))


@app.get("/api/seats")
def seats():
    return {"seats": config.SEATS, "task_spend_approval_usd": config.TASK_SPEND_APPROVAL_USD}


class NewMessage(BaseModel):
    text: str


@app.post("/api/conversations")
def new_conversation():
    return {"id": agent.new_conversation()}


@app.post("/api/conversations/{cid}/messages")
def post_message(cid: str, m: NewMessage):
    if not m.text.strip():
        raise HTTPException(400, "empty message")
    try:
        return agent.turn(cid, m.text.strip())
    except Exception as e:
        store.event("agent_error", {"conversation": cid, "error": str(e)[:400]})
        raise HTTPException(502, f"the agent could not answer: {str(e)[:300]}")


@app.get("/api/events")
def events(after: int = 0, engagement_id: str = None):
    return {"events": store.events_after(after, engagement_id)}


@app.get("/api/engagements")
def engagements():
    return {"engagements": store.list_engagements()}


@app.get("/api/tasks")
def tasks(engagement_id: str = None):
    return {"tasks": store.list_tasks(engagement_id)}


@app.get("/api/tasks/{tid}")
def task(tid: str):
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    return t


@app.get("/api/tasks/{tid}/report", response_class=PlainTextResponse)
def task_report(tid: str):
    t = store.get_task(tid)
    if not t or t["status"] != "done" or not t["result_path"]:
        raise HTTPException(404, "no finished report for this task")
    with open(t["result_path"], encoding="utf-8") as fh:
        return fh.read()


@app.get("/api/tasks/{tid}/verification")
def task_verification(tid: str):
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    p = store.safe_path(t["engagement_id"], "results/verification.json")
    if not os.path.isfile(p):
        raise HTTPException(404, "not verified yet")
    import json
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/api/memory")
def get_memory():
    snap = memory.snapshot()
    return {"user": snap["user"], "memory": snap["memory"]}


class Remember(BaseModel):
    text: str
    kind: str = "memory"


@app.post("/api/memory/remember")
def remember(r: Remember):
    return memory.remember_now(r.text, "workspace", "user" if r.kind == "user" else "memory")


class Forget(BaseModel):
    match: str


@app.post("/api/memory/forget")
def forget(f: Forget):
    if len(f.match.strip()) < 3:
        raise HTTPException(400, "give at least three characters to match")
    return memory.forget(f.match.strip())


@app.get("/api/approvals")
def approvals():
    return {"pending": control.pending()}


class Decision(BaseModel):
    approve: bool


@app.post("/api/approvals/{aid}")
def decide(aid: str, d: Decision):
    try:
        row = control.decide(aid, d.approve)
    except KeyError:
        raise HTTPException(404, "no such approval")
    started = None
    if row["status"] == "approved" and row["tool"] == "start_research_report":
        import json
        started = agent.launch_research(json.loads(row["args_json"]))     # exactly the approved call
    return {"approval": row, "started": started}
