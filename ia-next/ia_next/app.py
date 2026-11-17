"""IA Next HTTP service: the agent, the task list, memory, approvals and the workspace page.

Bound to 127.0.0.1:9400 by its compose file, on its own network. It shares nothing with the existing
Intelligence Augmentation suite except the provider keys read from the workbench's root .env.
"""
import os
import threading

from fastapi import FastAPI, HTTPException
from fastapi import File, Form, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import __version__, agent, config, control, memory, store

app = FastAPI(title="IA Next", version=__version__)
WEB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")


class _RevalidatedStatic(StaticFiles):
    """The workspace page's CSS and JS. Browsers revalidate on every load (ETag), so a deploy is never stale."""
    def file_response(self, *args, **kwargs):
        resp = super().file_response(*args, **kwargs)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


app.mount("/static", _RevalidatedStatic(directory=WEB, check_dir=False), name="static")


@app.on_event("startup")
def _startup():
    config.ensure_dirs()
    store.conn()
    # A task left "running" by a previous process cannot still be running: say so instead of pretending.
    for t in store.list_tasks(limit=500):
        if t["status"] == "stopping":                  # the person asked it to stop; the restart finished the job
            store.finish_stopped(t["id"])
        elif t["status"] in ("queued", "running"):
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
    engagement_id: str | None = None      # optional: the engagement the person has focused in the workspace
    notes: list[str] = []                 # optional: what happened in the workspace since the last message (B6)


@app.post("/api/conversations")
def new_conversation():
    return {"id": agent.new_conversation()}


class ConvItems(BaseModel):
    items: list = []


@app.get("/api/conversations")
def conversations():
    """Past conversations, newest first, so the person can reopen one (Part 1: conversations kept on the server)."""
    return {"conversations": store.list_conversations()}


@app.get("/api/conversations/{cid}")
def conversation(cid: str):
    c = store.load_conversation(cid)
    if not c:
        raise HTTPException(404, "no such conversation")
    return c


@app.put("/api/conversations/{cid}/items")
def save_conversation_items(cid: str, body: ConvItems):
    try:
        return {"saved": store.save_conversation(cid, body.items)}
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/conversations/{cid}/messages")
def post_message(cid: str, m: NewMessage):
    if not m.text.strip():
        raise HTTPException(400, "empty message")
    text = m.text.strip()
    notes = [" ".join(str(n).split())[:300] for n in (m.notes or [])[:8] if str(n).strip()]
    if notes:
        # B6: an upload that failed, an approval decided on a card, work that finished or stopped, media made after an
        # approval. Written by the workspace page, shown to the agent as context, never as the person's request.
        text = "(Since your last message, in the workspace: " + " ".join(n.rstrip(". ") + "." for n in notes) + ")\n" + text
    eng = store.get_engagement(m.engagement_id) if m.engagement_id else None
    if eng:
        title = " ".join(str(eng["title"] or "").split())[:200]
        # B2: the focused engagement's own work rides with every message, so the agent never says it "isn't in my
        # list" and never borrows another engagement's work as evidence
        text = f"(Focused engagement: {title} [{eng['id']}]. {agent.focus_context(eng['id'])})\n{text}"
    try:
        return agent.turn(cid, text)
    except Exception as e:
        store.event("agent_error", {"conversation": cid, "error": str(e)[:400]})
        raise HTTPException(502, f"the agent could not answer: {str(e)[:300]}")


@app.get("/api/events")
def events(after: int = 0, engagement_id: str = None):
    return {"events": store.events_after(after, engagement_id)}


@app.get("/api/engagements")
def engagements(include_library: int = 0):
    """Client engagements. The imported research library is a background store, not an engagement, so it is
    left out unless asked for; the agent and evidence search still use it."""
    from .library import LIBRARY_TITLE
    rows = store.list_engagements()
    if not include_library:
        rows = [e for e in rows if e["title"] != LIBRARY_TITLE]
    return {"engagements": rows}


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
def task_view(tid: str, embed: int = 0):
    """A finished HTML exhibit (a journey map), served as a page. embed=1 drops the prototype page's top line,
    for the workspace, which frames the prototype inside its own card."""
    t = store.get_task(tid)
    if t and t["status"] == "done" and t["kind"] == "prototype":
        # A prototype is model-written code: it is served with a strict CSP and only inside a sandboxed
        # iframe without allow-same-origin, so it can run its own script and reach nothing else.
        from html import escape
        bar = "" if embed else "<header>Prototype. It runs on its own and cannot reach your data or the web.</header>"
        height = "100vh" if embed else "calc(100vh - 34px)"
        return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><title>Prototype</title>
<style>body{{margin:0;font-family:system-ui;background:#0D0D0D;color:#fff}} header{{padding:8px 12px;font-size:12px}} iframe{{border:0;display:block;width:100%;height:{height};background:#fff}}</style></head>
<body>{bar}
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
    per_task = os.path.join(os.path.dirname(t["result_path"] or ""), "verification.json")     # B1: the task's own check
    p = per_task if t["result_path"] and os.path.isfile(per_task) else store.safe_path(t["engagement_id"], "results/verification.json")
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
        row, changed = control.decide(aid, d.approve, with_change=True)
    except KeyError:
        raise HTTPException(404, "no such approval")
    started = None
    if changed and row["status"] == "approved":      # only the click that changed pending -> approved launches (B8)
        import json
        args = json.loads(row["args_json"])                                # exactly the approved call
        if row["tool"] == "start_research_report":
            started = agent.launch_research(args)
        elif row["tool"] == "start_social_analysis":
            from . import social
            started = social.launch(args)
        elif row["tool"] == "retry_task":
            from . import lifecycle
            try:
                started = lifecycle.retry(args["task_id"], approved=True, attempt=args.get("attempt"))
            except (KeyError, ValueError) as e:
                started = {"error": str(e)}
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


MEDIA_KINDS = {"images": (".png", ".jpg", ".jpeg", ".webp", ".gif"), "videos": (".mp4", ".webm", ".mov")}


@app.get("/api/engagements/{eid}/media")
def engagement_media(eid: str):
    """The images and videos the Media Producer saved for an engagement, newest first, with their view URLs."""
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    out = {}
    for kind, exts in MEDIA_KINDS.items():
        rel_dir = f"results/{kind}"
        d = store.safe_path(eid, rel_dir)
        items = []
        if os.path.isdir(d):
            for name in os.listdir(d):
                p = os.path.join(d, name)
                if not name.lower().endswith(exts) or not os.path.isfile(p) or os.path.getsize(p) == 0:
                    continue
                rel = f"{rel_dir}/{name}"
                st = os.stat(p)
                items.append({"name": name, "path": rel, "view": f"/api/engagements/{eid}/files/{rel}",
                              "bytes": st.st_size, "modified": st.st_mtime})
        out[kind] = sorted(items, key=lambda i: -i["modified"])
    return {"engagement_id": eid, **out}


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
    per_task = os.path.join(os.path.dirname(t["result_path"] or ""), "deck.pptx")
    p = per_task if t["result_path"] and os.path.isfile(per_task) else store.safe_path(t["engagement_id"], "results/deck.pptx")
    return FileResponse(p, filename=_deck_filename(t),
                        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")


@app.post("/api/tasks/{tid}/stop")
def task_stop(tid: str):
    """Stop a running task (enhancement plan B4). The answer is the server's: 'stopping' at once, then 'stopped' once
    the step in flight returns. 409 when the work has already ended."""
    from . import lifecycle
    try:
        return lifecycle.stop(tid)
    except KeyError:
        raise HTTPException(404, "no such task")
    except ValueError as e:
        raise HTTPException(409, str(e))


@app.post("/api/tasks/{tid}/retry")
def task_retry(tid: str):
    """Try a failed or stopped task again with the same brief and budget (B4). Returns the new task id, or a pending
    approval when the budget is above the threshold."""
    from . import lifecycle
    try:
        out = lifecycle.retry(tid)
    except KeyError:
        raise HTTPException(404, "no such task")
    except ValueError as e:
        raise HTTPException(409, str(e))
    if "approval_row" in out:
        out["approval_row"] = dict(out["approval_row"])
    return out


class Rebrand(BaseModel):
    brand: str


@app.post("/api/tasks/{tid}/rebrand")
def task_rebrand(tid: str, body: Rebrand):
    """Re-render a finished deck in another brand (plan Part 7, BR3): the same slides, words, images and sources, no
    model call and no cost. Returns the updated task."""
    from . import deck
    if body.brand not in deck.BRANDS:
        raise HTTPException(400, f"brand must be one of: {', '.join(sorted(deck.BRANDS))}")
    try:
        return deck.rebrand(tid, body.brand)
    except ValueError as e:
        raise HTTPException(409, str(e))


def _deck_filename(t):
    """A download name from the deck's own title (16 Nov audit: every download was "deck.pptx", so decks overwrote
    each other in Downloads). Falls back to the task id."""
    import json
    import re
    title = ""
    try:
        meta = os.path.join(os.path.dirname(t["result_path"] or ""), "deck.json")
        title = json.load(open(meta, encoding="utf-8")).get("deck_title") or ""
    except (OSError, ValueError, TypeError):
        pass
    slug = re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-")[:70] or f"deck-{t['id'][-8:]}"
    return f"{slug}.pptx"


# ---- schedules ---------------------------------------------------------------------------------
class Label(BaseModel):
    label: str
    reason: str = ""


@app.post("/api/tasks/{tid}/label")
def label_task(tid: str, body: Label):
    """A person's thumbs up or down on a finished output (plan 6.5). It calibrates judges; it changes no prompt."""
    from . import labels
    try:
        return labels.add(tid, body.label, body.reason)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/calibration")
def calibration():
    from . import labels
    return labels.calibration()


@app.get("/api/spend")
def spend():
    """Spend by day and by model from every metered call (plan 6.7: a meter the person can read)."""
    import time as _t
    c = store.conn()
    c.execute("CREATE TABLE IF NOT EXISTS spend (ts REAL, model TEXT, input_tokens INTEGER, output_tokens INTEGER, "
              "cache_read_tokens INTEGER, usd REAL, seconds REAL)")
    day0 = _t.time() - (_t.time() % 86400)
    today = c.execute("SELECT COALESCE(SUM(usd),0) s, COUNT(*) n FROM spend WHERE ts >= ?", (day0,)).fetchone()
    week = c.execute("SELECT COALESCE(SUM(usd),0) s, COUNT(*) n FROM spend WHERE ts >= ?", (day0 - 6 * 86400,)).fetchone()
    by_model = [dict(r) for r in c.execute("SELECT model, COUNT(*) calls, ROUND(SUM(usd),4) usd, ROUND(AVG(seconds),1) avg_seconds "
                                           "FROM spend WHERE ts >= ? GROUP BY model ORDER BY usd DESC", (day0 - 6 * 86400,))]
    return {"today_usd": round(today["s"], 4), "today_calls": today["n"], "week_usd": round(week["s"], 4), "week_calls": week["n"],
            "by_model_7d": by_model, "note": "models without a published price are metered at a conservative placeholder"}


@app.get("/api/digest")
def digest():
    """Since you last looked (plan Phase 8, proactive): finished and failed work, what waits for you, spend."""
    from . import schedule
    c = store.conn()
    c.execute("CREATE TABLE IF NOT EXISTS prefs (k TEXT PRIMARY KEY, v TEXT)")
    r = c.execute("SELECT v FROM prefs WHERE k = 'digest_seen_event'").fetchone()
    seen = int(r["v"]) if r else 0
    ev = store.events_after(seen, limit=1000)
    done = [e["data"].get("summary") for e in ev if e["kind"] == "task_done"]
    failed = [e["data"].get("error") for e in ev if e["kind"] == "task_failed"]
    paused = [s for s in schedule.list_all() if s["status"] == "paused"]
    cands = sum(e["data"].get("count", 0) for e in ev if e["kind"] == "memory_candidates")
    return {"since_event": seen, "last_event": ev[-1]["id"] if ev else seen,
            "finished": done[-10:], "failed": [f for f in failed if f][-10:], "pending_approvals": len(control.pending()),
            "paused_schedules": [{"id": s["id"], "tool": s["tool"], "error": s["last_error"]} for s in paused],
            "new_memory_candidates": cands, "spend": spend()["today_usd"]}


@app.post("/api/digest/seen")
def digest_seen():
    c = store.conn()
    c.execute("CREATE TABLE IF NOT EXISTS prefs (k TEXT PRIMARY KEY, v TEXT)")
    last = c.execute("SELECT COALESCE(MAX(id), 0) m FROM events").fetchone()["m"]
    c.execute("INSERT INTO prefs VALUES ('digest_seen_event', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", (str(last),))
    return {"seen_through_event": last}


@app.get("/api/regression")
def regression_report():
    """Plan 7.6: per absorbed application, whether IA Next's real outputs pass that app's regression cases."""
    from . import regression
    return regression.run()


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


@app.post("/api/channels/teams")
async def teams_messages(request: Request):
    """Bot Framework messaging endpoint for Microsoft Teams (off until the bot's app id and secret are set)."""
    from . import channels, teams
    if not teams.enabled():
        raise HTTPException(503, "Teams is off: set MICROSOFT_APP_ID and MICROSOFT_APP_PASSWORD from the Azure Bot registration")
    try:
        activity = await request.json()
    except Exception:
        raise HTTPException(400, "not an activity")
    try:
        teams.verify_token(request.headers.get("authorization", ""), service_url=activity.get("serviceUrl"))
    except Exception:
        raise HTTPException(401, "token not valid for this bot")
    if not teams.trusted_service_url(activity.get("serviceUrl")):
        raise HTTPException(400, "untrusted serviceUrl")
    return teams.handle(activity, agent.turn, channels.conversation_for, agent.new_conversation)


@app.get("/api/channels/teams/status")
def teams_status():
    from . import teams
    c = teams.config()
    return {"enabled": teams.enabled(), "app_id_set": bool(c["app_id"]), "secret_set": bool(c["password"]),
            "tenant_set": bool(c["tenant"]), "endpoint_path": "/api/channels/teams",
            "needs": [n for n, ok in (("MICROSOFT_APP_ID", c["app_id"]), ("MICROSOFT_APP_PASSWORD", c["password"])) if not ok]}


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
