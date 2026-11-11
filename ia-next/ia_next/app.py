"""IA Next HTTP service: the agent, the task list, memory, approvals and the workspace page.

Bound to 127.0.0.1:9400 by its compose file, on its own network. It shares nothing with the existing
Intelligence Augmentation suite except the provider keys read from the workbench's root .env.
"""
import os
import threading

from fastapi import FastAPI, HTTPException
from fastapi import File, Form, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
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
    from . import schedule
    schedule.start_background(agent.execute_tool)


@app.get("/health")
def health():
    keys = {"anthropic": bool(config.ANTHROPIC_API_KEY), "google": bool(config.GEMINI_API_KEY), "openai": bool(config.OPENAI_API_KEY)}
    return {"status": "healthy", "service": "ia-next", "version": __version__, "port": config.PORT, "provider_keys_present": keys}


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB, "index.html"), headers={"Cache-Control": "no-store"})


@app.get("/favicon.ico")
def favicon():
    from fastapi.responses import Response
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#0D0D0D"/><circle cx="8" cy="8" r="3" fill="#B8B800"/></svg>'
    return Response(svg, media_type="image/svg+xml")


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


@app.get("/api/tasks/{tid}/view")
def task_view(tid: str):
    """A finished HTML exhibit (a journey map), served as a page."""
    t = store.get_task(tid)
    if t and t["status"] == "done" and t["kind"] == "prototype":
        # A prototype is model-written code: it is served with a strict CSP and only inside a sandboxed
        # iframe without allow-same-origin, so it can run its own script and reach nothing else.
        from html import escape
        return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><title>Prototype</title>
<style>body{{margin:0;font-family:system-ui;background:#0D0D0D;color:#fff}} header{{padding:8px 12px;font-size:12px}} iframe{{border:0;display:block;width:100%;height:calc(100vh - 34px);background:#fff}}</style></head>
<body><header>Prototype (sandboxed: it can run its own script and nothing else)</header>
<iframe sandbox="allow-scripts" referrerpolicy="no-referrer" src="/api/tasks/{escape(tid)}/prototype"></iframe></body></html>""",
                            headers={"Cache-Control": "no-store"})
    if not t or t["status"] != "done" or not (t["result_path"] or "").endswith(".html"):
        raise HTTPException(404, "no finished exhibit for this task")
    headers = {"Cache-Control": "no-store"}
    if t["kind"] == "prototype":
        try:
            from .prototype import PROTOTYPE_CSP
        except ImportError:
            PROTOTYPE_CSP = "default-src 'none'"
        headers["Content-Security-Policy"] = PROTOTYPE_CSP
    return FileResponse(t["result_path"], media_type="text/html", headers=headers)


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
    if row["status"] == "approved":
        import json
        args = json.loads(row["args_json"])                                # exactly the approved call
        if row["tool"] == "start_research_report":
            started = agent.launch_research(args)
        elif row["tool"] == "start_social_analysis":
            from . import social
            started = social.launch(args)
        elif row["tool"] == "create_schedule":
            from . import schedule
            started = schedule.create(args["tool"], args["args"], args["every_minutes"])
        elif row["tool"] in agent.MODULE_FOR_TOOL:
            threading.Thread(target=agent.execute_tool, args=(row["tool"], args), daemon=True).start()
            started = {"running": row["tool"]}
        elif row["tool"] == "evaluate_skill":
            from . import skills, studio
            threading.Thread(target=skills.evaluate, args=(args["evaluate_skill"],
                             lambda eid, brief, f, s, led, system: studio.writer(eid, brief, f, s, led, system=system)), daemon=True).start()
            started = {"running": "evaluate_skill"}
    return {"approval": row, "started": started}


# ---- engagement files (images, videos, decks, prototypes) --------------------------------------
@app.get("/api/engagements/{eid}/files/{rel:path}")
def engagement_file(eid: str, rel: str):
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    try:
        p = store.safe_path(eid, rel)
    except PermissionError:
        raise HTTPException(403, "outside the engagement workspace")
    if not os.path.isfile(p):
        raise HTTPException(404, "no such file")
    headers = {"Cache-Control": "no-store"}
    if p.endswith(".html"):
        try:
            from .prototype import PROTOTYPE_CSP
        except ImportError:
            PROTOTYPE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:"
        headers["Content-Security-Policy"] = PROTOTYPE_CSP
    return FileResponse(p, headers=headers)


@app.get("/api/tasks/{tid}/prototype")
def task_prototype(tid: str):
    """The prototype document itself, only ever loaded by the sandboxed iframe in /view."""
    from . import prototype
    t = store.get_task(tid)
    if not t or t["status"] != "done" or t["kind"] != "prototype":
        raise HTTPException(404, "no finished prototype for this task")
    return FileResponse(prototype.html_path_for_task(tid), media_type="text/html", headers=dict(prototype.PROTOTYPE_HEADERS))


class NewEngagement(BaseModel):
    title: str
    objective: str


@app.post("/api/engagements")
def create_engagement(e: NewEngagement):
    if not e.title.strip() or not e.objective.strip():
        raise HTTPException(400, "title and objective are required")
    return {"id": store.create_engagement(e.title.strip(), e.objective.strip())}


AUDIO = (".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mpeg", ".mpga", ".ogg")


@app.post("/api/engagements/{eid}/uploads")
async def upload(eid: str, file: UploadFile = File(...), title: str = Form("")):
    """A transcript, a document as text, or an audio recording (transcribed). Uploads are sources: data,
    quoted and cited, never instructions."""
    from . import providers, transcripts
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    name = (file.filename or "upload").lower()
    data = await file.read()
    if name.endswith(AUDIO):
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(413, "audio over 25 MB; split the recording")
        try:
            return transcripts.transcribe_audio(eid, file.filename, data, providers.Ledger(limit_usd=2.0))
        except Exception as ex:
            raise HTTPException(502, f"transcription failed: {str(ex)[:200]}")
    if name.endswith((".txt", ".md", ".vtt", ".srt", ".csv")):
        text = data.decode("utf-8", errors="replace")
        sid = transcripts.add_text_source(eid, title or file.filename, text, "transcript" if name.endswith((".vtt", ".srt")) else "document")
        return {"source_id": sid, "chars": len(text)}
    raise HTTPException(415, "send a text file (.txt .md .vtt .srt .csv) or audio (.mp3 .m4a .wav .webm .mp4 .ogg)")


@app.get("/api/tasks/{tid}/download")
def task_download(tid: str):
    """The editable PowerPoint of a deck task."""
    t = store.get_task(tid)
    if not t or t["status"] != "done" or t["kind"] != "deck":
        raise HTTPException(404, "no finished deck for this task")
    p = store.safe_path(t["engagement_id"], "results/deck.pptx")
    return FileResponse(p, filename="deck.pptx",
                        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")


# ---- schedules ---------------------------------------------------------------------------------
@app.get("/api/schedules")
def schedules():
    from . import schedule
    return {"schedules": schedule.list_all()}


@app.post("/api/schedules/{sid}/{action}")
def schedule_action(sid: str, action: str):
    from . import schedule
    if action not in ("pause", "resume"):
        raise HTTPException(400, "pause or resume")
    if not schedule.get(sid):
        raise HTTPException(404, "no such schedule")
    return schedule.set_status(sid, "paused" if action == "pause" else "active")


# ---- skills (self-improvement behind the held-out gate) ----------------------------------------
class Proposal(BaseModel):
    skill: str
    text: str
    reason: str


@app.get("/api/skills/{skill}")
def skill_versions(skill: str):
    from . import skills, studio
    skills.seed("writer", studio.WRITER_SYSTEM)
    return {"versions": skills.versions(skill)}


@app.post("/api/skills/proposals")
def skill_propose(p: Proposal):
    from . import skills, studio
    skills.seed("writer", studio.WRITER_SYSTEM)
    return skills.propose(p.skill, p.text, p.reason)


@app.post("/api/skills/versions/{vid}/evaluate")
def skill_evaluate(vid: str):
    from . import skills, studio
    return skills.evaluate(vid, lambda eid, brief, f, s, led, system: studio.writer(eid, brief, f, s, led, system=system))


@app.post("/api/skills/versions/{vid}/promote")
def skill_promote(vid: str):
    from . import skills
    return skills.promote(vid)


# ---- channels: one signed webhook for every non-web surface ------------------------------------
from fastapi import Request  # noqa: E402


@app.post("/api/channels/webhook")
async def channel_webhook(request: Request):
    from . import channels
    if not channels.secret():
        raise HTTPException(503, "channels are off: set IA_NEXT_CHANNEL_SECRET to enable the webhook")
    raw = await request.body()
    if not channels.verify_signature(raw, request.headers.get("x-ia-signature", "")):
        raise HTTPException(401, "bad signature")
    import json
    try:
        body = json.loads(raw)
        person, channel, text = str(body["person_key"]), str(body.get("channel") or "webhook"), str(body["text"]).strip()
    except Exception:
        raise HTTPException(400, "body needs person_key and text")
    if not text:
        raise HTTPException(400, "empty message")
    cid = channels.conversation_for(person, channel, agent.new_conversation)
    out = agent.turn(cid, text)
    return {"conversation_id": cid, "reply": out["reply"], "pending_approvals": len(control.pending())}
