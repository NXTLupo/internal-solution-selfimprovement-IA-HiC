"""IA Next HTTP service: the agent, the task list, memory, approvals and the workspace page.

Bound to 127.0.0.1:9400 by its compose file, on its own network. It shares nothing with the existing
Intelligence Augmentation suite except the provider keys read from the workbench's root .env.
"""
import os
import re
import threading
import time

from fastapi import FastAPI, HTTPException
from fastapi import File, Form, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
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
    from . import plan
    plan.recover()                           # a plan that was mid-sequence says so on its card
    config.ensure_dirs()
    store.conn()
    # A task left "running" by a previous process cannot still be running: say so instead of pretending.
    for t in store.list_tasks(limit=500):
        if t["status"] == "stopping":                  # the person asked it to stop; the restart finished the job
            store.finish_stopped(t["id"])
        elif t["status"] in ("queued", "running"):
            store.update_task(t["id"], status="failed", error="interrupted by a restart; start it again")
            store.event("task_failed", {"error": "interrupted by a restart"}, t["engagement_id"], t["id"])
    try:                                     # the conversation model is in memory before the first message (E8)
        from . import providers as _prov
        _prov.ready_soon("the app started", delay=8.0)
        _prov.keep_ready_watch()
    except Exception:
        pass
    from . import schedule
    schedule.start_background(agent.execute_tool)

    def _resume_media():                     # a clip the person approved before the restart is made now
        time.sleep(20)
        try:
            from . import media
            media.recover(agent.execute_tool)
        except Exception:
            pass
    if os.environ.get("IA_NEXT_KEEP_READY", "1") != "0":       # not under test: a late thread on a database being reset crashes the run
        threading.Thread(target=_resume_media, daemon=True, name="resume-media").start()


@app.get("/health")
def health():
    keys = {"anthropic": False, "google": False, "openai": False}          # this build reads no provider key
    return {"status": "healthy", "service": "ia-next-local", "version": __version__, "port": config.PORT,
            "provider_keys_present": keys, "local": True, "model_server": config.OLLAMA_URL}


@app.get("/api/lanes")
def lanes_now():
    """Who holds the studio, the card and the network lanes, and how long work has waited for each."""
    from . import lanes
    return lanes.snapshot()


@app.get("/health/deep")
def health_deep(force: int = 0):
    """Every service IA Next Local depends on, checked, with what each outage disables (uplift plan WS-3 step 1)."""
    from . import health as _health
    return _health.deep(force=bool(force))


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
    attachments: list[dict] = []          # optional: files attached in this conversation, {engagement_id, source_id, fresh} (C2)
    selected_sources: dict | None = None  # optional: the Sources panel's checked sources, {engagement_id, source_ids} (Part 6 C2)
    packs: list[str] = []                 # optional: the HiC data packs the person selected for research (2026-11-19)


@app.get("/api/packs")
def data_packs():
    """HiC's data packs for the composer's picker, read live (a pack HiC adds appears here), and how many of HiC's
    sources sit in no pack (searched on every research run). {"available": false} when the suite is not running."""
    from . import hic
    try:
        packs = hic._call("GET", "/api/source-packs", 20).get("packs") or []
    except hic.HicUnavailable as e:
        return {"available": False, "reason": str(e)[:200], "packs": []}
    return {"available": True, "general_sources": len(hic.general_source_ids()), "pack_sources": hic.pack_source_count(),
            "packs": [{k: p.get(k) for k in ("id", "name", "kind", "industries", "description", "sourceCount")}
                      for p in packs if p.get("id") in hic.PACKS or p.get("id")]}


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
        extra = {"packs": m.packs} if m.packs else {}      # the data packs the person chose, when they chose any
        said = agent.SAID.set(m.text.strip())      # what the person typed, apart from the page's context note
        try:
            return agent.turn(cid, text, attachments=m.attachments, selection=m.selected_sources, focus=m.engagement_id or "",
                              **extra)
        finally:
            agent.SAID.reset(said)
    except Exception as e:
        store.event("agent_error", {"conversation": cid, "error": str(e)[:400]})
        raise HTTPException(502, f"the agent could not answer: {str(e)[:300]}")


@app.get("/api/events")
def events(after: int = 0, engagement_id: str = None):
    return {"events": store.events_after(after, engagement_id)}


@app.get("/api/engagements")
def engagements(include_library: int = 0, include_hidden: int = 0):
    """Client engagements. The imported research library is a background store, not an engagement, so it is
    left out unless asked for; the agent and evidence search still use it. Hidden engagements (made by automated
    checks, or hidden by the person) are left out unless asked for (C6); `hidden_count` says how many."""
    from .library import LIBRARY_TITLE
    rows = store.list_engagements(include_hidden=True)
    if not include_library:
        rows = [e for e in rows if e["title"] != LIBRARY_TITLE]
    hidden = sum(1 for e in rows if e.get("hidden"))
    if not include_hidden:
        rows = [e for e in rows if not e.get("hidden")]
    return {"engagements": rows, "hidden_count": hidden}


class Hidden(BaseModel):
    hidden: bool


class LibraryAdd(BaseModel):
    ids: list[str]
    engagement_id: str


@app.get("/api/library/search")
def library_search(q: str = "", engagement: str = "", pack: str = "", publisher: str = "", period: str = "", limit: int = 60):
    """The Library (Gap 1): every source this machine has collected, from the local full-text index."""
    from . import libraryview
    return libraryview.search(q[:200], engagement[:40], pack[:40], publisher[:120], period[:12], max(1, min(int(limit), 200)))


@app.post("/api/library/backfill")
def library_backfill(limit: int = 200):
    """Dates and vectors for stored sources that lack them (also done on the idle pass)."""
    from . import libraryview
    return libraryview.backfill(limit=max(1, min(int(limit), 500)))


@app.get("/api/packs/index")
def pack_index():
    """What the local pack index holds, by pack."""
    from . import packindex
    rows = packindex._db().execute("SELECT pack, COUNT(*) AS n, MAX(date) AS newest FROM pack_items GROUP BY pack ORDER BY n DESC").fetchall()
    return {"items": packindex.count(), "packs": [dict(r) for r in rows]}


@app.post("/api/packs/index/probe")
def pack_index_probe(budget: int = 240):
    """Ask each suspect feed alone now: the ones that answer are cleared, the ones that hang are set aside for a week."""
    from . import hic, packindex
    return dict(packindex.probe(hic._call, owner=hic.pack_owner(), budget_seconds=max(30, min(int(budget), 540))),
                set_aside_now=sorted(packindex.set_aside()))


@app.post("/api/packs/index/ingest")
def pack_index_ingest(packs: str = ""):
    """Read more of the named packs' feeds into the local index now (comma-separated ids)."""
    from . import hic, packindex
    ids = [p for p in packs.split(",") if p in hic.PACKS][:4]
    if not ids:
        raise HTTPException(400, "name one to four data packs")
    return packindex.ingest(ids, hic._call)


@app.get("/api/library/item/{ev}")
def library_item(ev: str):
    from . import libraryview
    it = libraryview.item(ev)
    if not it:
        raise HTTPException(404, "no such source")
    return it


@app.post("/api/library/add")
def library_add(body: LibraryAdd):
    from . import libraryview
    try:
        return libraryview.add(body.ids[:40], body.engagement_id)
    except KeyError:
        raise HTTPException(404, "no such engagement")


class Rename(BaseModel):
    title: str


class EngagementEdit(BaseModel):
    title: str | None = None
    client: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    pinned: bool | None = None
    archived: bool | None = None
    settings: dict | None = None


class Merge(BaseModel):
    ids: list[str]
    into: str = ""              # an engagement to fold the others into; or leave empty and give a title for a new one
    title: str = ""
    copy_sources: bool = True


class Bulk(BaseModel):
    ids: list[str]
    archived: bool | None = None
    pinned: bool | None = None
    add_tags: list[str] = []
    remove_tags: list[str] = []


@app.get("/api/engagements/{eid}/settings")
def engagement_settings(eid: str):
    """One engagement as a project: its name, client, description, tags, defaults and what it holds (Gap 3)."""
    e = store.get_engagement(eid)
    if not e:
        raise HTTPException(404, "no such engagement")
    row = next((x for x in store.list_engagements(include_hidden=True) if x["id"] == eid), e)
    titles = {x["id"]: x["title"] for x in store.list_engagements(include_hidden=True)}
    return dict(row, description=e["description"] or e.get("objective") or "",
                merged_titles=[titles.get(x, x) for x in row.get("merged") or []],
                merged_into_title=titles.get(e["merged_into"], "") if e["merged_into"] else "")


@app.post("/api/engagements/{eid}/settings")
def edit_engagement(eid: str, body: EngagementEdit):
    """Edit an engagement: only the fields sent change (Gap 3)."""
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        e = store.update_engagement(eid, changes)
    except ValueError as err:
        raise HTTPException(400, str(err))
    if e is None:
        raise HTTPException(404, "no such engagement")
    return e


@app.post("/api/engagements/bulk")
def bulk_engagements(body: Bulk):
    """Archive, pin or tag several engagements at once (Gap 3: selecting more than one)."""
    done = []
    for eid in list(dict.fromkeys(body.ids))[:200]:
        e = store.get_engagement(eid)
        if not e:
            continue
        ch = {}
        if body.archived is not None:
            ch["archived"] = body.archived
        if body.pinned is not None:
            ch["pinned"] = body.pinned
        if body.add_tags or body.remove_tags:
            gone = {t.lower() for t in body.remove_tags}
            ch["tags"] = [t for t in e["tags"] if t.lower() not in gone] + list(body.add_tags)
        if ch:
            store.update_engagement(eid, ch)
            done.append(eid)
    return {"updated": done}


@app.post("/api/engagements/merge")
def merge_engagements(body: Merge):
    """Fold several engagements into one. Their work and chats show under the one that remains, their sources are
    copied into it (same address once), and they leave the list. Nothing is deleted; each can be separated again."""
    ids = [i for i in dict.fromkeys(body.ids) if store.get_engagement(i)]
    into = body.into
    if not into:
        title = " ".join(body.title.split())[:160]
        if not title:
            raise HTTPException(400, "choose the engagement to keep, or name a new one")
        into = store.create_engagement(title, title)
    if not store.get_engagement(into):
        raise HTTPException(404, "no such engagement")
    ids = [i for i in ids if i != into]
    if not ids:
        raise HTTPException(400, "choose at least one other engagement to merge")
    copied = 0
    if body.copy_sources:
        from . import libraryview
        for eid in ids:
            ev = [r["id"] for r in store.conn().execute("SELECT id FROM evidence WHERE engagement_id = ? ORDER BY added", (eid,))]
            for i in range(0, len(ev), 40):
                copied += len(libraryview.add(ev[i:i + 40], into)["added"])
    done = store.merge_engagements(ids, into)
    return {"into": into, "merged": done, "sources_copied": copied}


@app.post("/api/engagements/{eid}/unmerge")
def unmerge_engagement(eid: str):
    if not store.unmerge_engagement(eid):
        raise HTTPException(404, "that engagement is not merged into another")
    return {"id": eid}


@app.post("/api/engagements/{eid}/rename")
def rename_engagement(eid: str, r: Rename):
    """Rename an engagement (Gap 3). Nothing else about it changes."""
    try:
        title = store.rename_engagement(eid, r.title)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if title is None:
        raise HTTPException(404, "no such engagement")
    return {"id": eid, "title": title}


@app.post("/api/engagements/{eid}/hidden")
def hide_engagement(eid: str, h: Hidden):
    """Hide an engagement from the list, or show it again (C6). Nothing is deleted."""
    if not store.set_hidden(eid, h.hidden):
        raise HTTPException(404, "no such engagement")
    return {"id": eid, "hidden": h.hidden}


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
    if t and t["status"] == "done" and t["kind"] == "artifact":
        # HiC's artifact is model-written HTML from untrusted sources: the same sandbox and CSP as a prototype
        from html import escape
        return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><title>Artifact</title>
<style>body{{margin:0;background:#fff}} iframe{{border:0;display:block;width:100%;height:100vh;background:#fff}}</style></head>
<body><iframe sandbox="allow-scripts" referrerpolicy="no-referrer" src="/api/tasks/{escape(tid)}/artifact"></iframe>
<script>addEventListener('message',function(e){{var d=e.data;if(d&&d.ianext==='ask'&&typeof d.text==='string'&&parent!==window)parent.postMessage({{ianext:'ask',text:d.text.slice(0,400)}},location.origin);}});</script>
</body></html>""",
                            headers={"Cache-Control": "no-store"})
    if t and t["status"] == "done" and t["kind"] == "prototype":
        # A prototype is model-written code: it is served with a strict CSP and only inside a sandboxed
        # iframe without allow-same-origin, so it can run its own script and reach nothing else.
        from html import escape
        # Part 8 (P4): no text strip above the prototype in either view; the protection is the sandbox and the CSP,
        # unchanged. The page title names the product when the build recorded one.
        bar, height = "", "100vh"
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
    if t["kind"] == "social":
        from . import social
        return HTMLResponse(social.labelled_page(t), headers=headers)
    if t["kind"] == "journey_map":            # its own script may run; the policy lets it reach nothing
        from . import artifacts as _art
        headers = dict(headers, **_art.ARTIFACT_HEADERS)
    return FileResponse(t["result_path"], media_type="text/html", headers=headers)


@app.get("/api/tasks/{tid}/mindmap")
def task_mindmap(tid: str):
    """A finished mind map as data: the subject, each branch with its sentences and the checked passages behind it.
    The workspace draws its interactive tree from this (the picture page is framed without scripts)."""
    import json as _json
    t = store.get_task(tid)
    if not t or t["status"] != "done" or t["kind"] != "diagram":
        raise HTTPException(404, "no finished mind map for this task")
    try:
        with open(os.path.join(os.path.dirname(t["result_path"]), "diagram.json"), encoding="utf-8") as fh:
            d = _json.load(fh)
    except (OSError, ValueError):
        raise HTTPException(404, "this picture has no saved data")
    sec = (d.get("sections") or [{}])[0]
    if sec.get("family") != "mindmap":
        raise HTTPException(404, "this picture is not a mind map")
    from .diagram import branch_points
    names = {s.get("id"): s.get("title") or s.get("id") for s in d.get("sources") or [] if isinstance(s, dict)}
    branches = []
    for it in sec.get("items") or []:
        ev = [{"quote": e.get("quote"), "source_id": e.get("source_id"), "pointer": e.get("pointer"),
               "source": e.get("title") or names.get(e.get("source_id")) or e.get("source_id") or ""} for e in it.get("evidence") or []]
        branches.append({"label": it.get("label"), "points": branch_points(it.get("label"), it.get("detail")), "evidence": ev,
                         "group": " ".join(str(it.get("group") or "").split())})
    # the areas the branches sit under, in the order they first appear; shown only when they really divide the map
    names_ = list(dict.fromkeys(b["group"] for b in branches if b["group"]))
    areas = ([{"label": g, "branches": [b for b in branches if b["group"] == g]} for g in names_]
             if 2 <= len(names_) <= 6 and all(b["group"] for b in branches) else [])
    return {"title": d.get("title"), "hub": sec.get("hub") or sec.get("heading") or d.get("title"), "takeaway": sec.get("takeaway"),
            "engagement_id": t["engagement_id"], "branches": branches, "areas": areas,
            "nodes": 1 + len(areas) + len(branches) + sum(len(b["points"]) for b in branches)}


@app.get("/api/tasks/{tid}/verification")
def task_verification(tid: str):
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    per_task = os.path.join(os.path.dirname(t["result_path"] or ""), "verification.json")     # B1: the task's own check
    p = per_task if t["result_path"] and os.path.isfile(per_task) else store.safe_path(t["engagement_id"], "results/verification.json")
    if not os.path.isfile(p):
        return {"verified": False}            # older work has no check record; not an error the browser should log
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


class PlanStart(BaseModel):
    skip: list[str] = []
    options: dict[str, str] = {}


@app.get("/api/plans/{pid}")
def plan_get(pid: str):
    from . import plan
    p = plan.get(pid)
    if not p:
        raise HTTPException(404, "no such plan")
    return p


@app.post("/api/plans/{pid}/start")
def plan_start(pid: str, body: PlanStart):
    from . import plan
    try:
        return plan.start(pid, [str(k)[:40] for k in body.skip[:12]],
                          options={str(k)[:40]: str(v)[:40] for k, v in list(body.options.items())[:12]})
    except KeyError:
        raise HTTPException(404, "no such plan")


@app.post("/api/plans/{pid}/dismiss")
def plan_dismiss(pid: str):
    from . import plan
    try:
        return plan.dismiss(pid)
    except KeyError:
        raise HTTPException(404, "no such plan")


@app.get("/api/approvals/{aid}/video")
def approved_video(aid: str):
    """Where an approved clip stands, for its card: working, ready (with its view), failed (with the reason)."""
    from . import media
    try:
        return media.video_state(aid)
    except KeyError:
        raise HTTPException(404, "no such video approval")


@app.get("/api/files")
def files_library():
    """Every file the person has uploaded, whichever engagement it was uploaded in (E16: files are not locked to one)."""
    from . import transcripts
    return {"files": transcripts.library()}


class RemoveFile(BaseModel):
    removed: bool = True


@app.post("/api/engagements/{eid}/files/{sid}/remove")
def file_remove(eid: str, sid: str, body: RemoveFile):
    """Take a file out of the person's library, or put it back (removed: false). The click on the page is the person's
    own decision; the engagement keeps the file so finished work still resolves its citations."""
    from . import transcripts
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    try:
        return transcripts.set_removed(eid, sid, body.removed)
    except KeyError:
        raise HTTPException(404, "no such file in this engagement")


class UseFiles(BaseModel):
    files: list[dict]


@app.post("/api/engagements/{eid}/files/use")
def files_use(eid: str, body: UseFiles):
    """Make files from the library present in this engagement (copies; the engagement they came from keeps them)."""
    from . import transcripts
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    mapping = {}
    for f in body.files[:60]:
        src, sid = str(f.get("engagement_id") or ""), str(f.get("id") or "").upper()
        u = next((x for x in transcripts.uploaded_sources(src) if x["id"] == sid), None) if store.get_engagement(src) else None
        if u:
            mapping.update({f"{src}:{k}": v for k, v in (transcripts.copy_uploads(src, [u], eid) if src != eid else {sid: sid}).items()})
    return {"engagement_id": eid, "source_ids": mapping}


@app.get("/api/busy")
def busy():
    """Everything in flight that a restart would end: tasks, plans, and approved media that is not a task. A rebuild
    waits until this is empty (25 Nov: a rebuild checked only the task list and ended a video the person had approved)."""
    from . import media
    tasks = [{"id": t["id"], "kind": t["kind"], "status": t["status"]} for t in store.list_tasks(limit=500) if t["status"] in ("queued", "running", "stopping")]
    from . import plan
    plans = [r["id"] for r in plan._db().execute("SELECT id FROM plans WHERE status = 'running'").fetchall()]
    vids = media.inflight()
    return {"busy": bool(tasks or plans or vids), "tasks": tasks, "plans": plans, "media": vids}


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
        elif row["tool"] in agent.MODULE_FOR_TOOL and row["tool"].startswith("start_"):
            # a start_ tool only queues its task and returns at once, so the card gets the task id and shows the work
            # running (17 Nov: an approved HiC document started with no card to follow)
            started = agent.execute_tool(row["tool"], args)
        elif row["tool"] == "generate_video":
            # followed to its end: started, ready or failed is recorded, and a restart makes it again (media.recover)
            from . import media
            threading.Thread(target=media.run_approved, args=(row["id"], args, agent.execute_tool), daemon=True,
                             name=f"video-{row['id']}").start()
            started = {"running": row["tool"], "approval_id": row["id"]}
        elif row["tool"] in agent.MODULE_FOR_TOOL:
            threading.Thread(target=agent.execute_tool, args=(row["tool"], args), daemon=True).start()
            started = {"running": row["tool"]}
        elif row["tool"] == "evaluate_skill":
            from . import skills, studio
            threading.Thread(target=skills.evaluate, args=(args["evaluate_skill"],
                             lambda eid, brief, f, s, led, system: studio.writer(eid, brief, f, s, led, system=system)), daemon=True).start()
            started = {"running": "evaluate_skill"}
    return {"approval": row, "started": started}


@app.get("/api/tasks/{tid}/posts.csv")
def task_posts_csv(tid: str):
    """Part 4 step 4: every post a social analysis read, with its sentiment and the themes that quote it, as CSV. Served
    from the run's own file, or rebuilt from the saved analysis for runs made before posts were exported."""
    from fastapi.responses import Response
    from . import social
    t = store.get_task(tid)
    if not t or t["kind"] != "social" or t["status"] != "done":
        raise HTTPException(404, "no finished social analysis for this task")
    eid = t["engagement_id"]
    for rel in (f"results/tasks/{tid}/posts.csv",):
        p = store.safe_path(eid, rel)
        if os.path.isfile(p):
            return FileResponse(p, media_type="text/csv", filename="reddit-posts.csv")
    try:
        result = social._load(eid, "results/social.json")
        sources = (social._load(eid, "results/social_sources.json").get("sources") or [])[:social.MAX_POSTS]
    except (FileNotFoundError, ValueError):
        raise HTTPException(404, "this analysis has no saved posts")
    body = social.posts_csv(sources, result.get("post_labels") or {}, result.get("themes") or [])
    return Response(body, media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="reddit-posts.csv"'})


# ---- the Sources panel and the passage behind a citation (plan Part 6 N1, C1, C2) -------------------------------
@app.get("/api/engagements/{eid}/sources")
def engagement_sources(eid: str):
    """Every source with its origin (upload, pack, named, reused, web, library), whether it is in the second brain, and
    its guide (summary, key topics, suggested questions), which is made on add with no button."""
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    from . import secondbrain
    return {"sources": secondbrain.overview(eid), "coverage": secondbrain.coverage(eid)}


@app.post("/api/engagements/{eid}/sources/{sid}/guide")
def engagement_source_guide(eid: str, sid: str):
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    from . import secondbrain
    try:
        return secondbrain.guide(eid, sid.upper(), force=True)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.get("/api/engagements/{eid}/passage")
def engagement_passage(eid: str, pointer: str = "", source: str = ""):
    """C1: a citation chip opens the exact passage. pointer: a manifest pointer from this engagement's sources;
    source: a source id (its details and the verified quotes taken from it, each with its pointer)."""
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    if not pointer and not source:
        raise HTTPException(400, "pointer or source required")
    from . import hic, secondbrain
    try:
        return secondbrain.passage(eid, pointer=pointer.strip(), source_id=source.strip().upper())
    except ValueError as e:
        raise HTTPException(404, str(e))
    except hic.HicUnavailable as e:
        raise HTTPException(503, str(e))


# ---- reading while work runs (QA 25 Nov, E1): the whole source, where a subject is mentioned, and a question ----------
class Ask(BaseModel):
    question: str
    source_ids: list[str] = []
    subject: str = ""


_JOINING = set("the of and to a in is that for it as with was on are by this be at from or an have not they their has but were which who when than".split())


def _sentence(x):
    """True for a sentence a person wrote, False for a run of menu words and headings."""
    words = re.findall(r"[A-Za-z']+", x.lower())
    return len(words) >= 6 and sum(1 for w in words if w in _JOINING) / len(words) >= 0.2 and "skip to" not in x.lower()


def _held_rows(eid):
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    return store.evidence_for(eid)


@app.get("/api/engagements/{eid}/reading")
def engagement_reading(eid: str, source: str):
    """One source in full, as held: readable the moment a running task has read it."""
    rows = [r for r in _held_rows(eid) if str(r["source_id"]).upper() == source.strip().upper()]
    if not rows:
        raise HTTPException(404, "this engagement holds no source with that number")
    r = rows[-1]
    from . import secondbrain
    meta = next((s for s in secondbrain.all_sources(eid) if s["id"] == r["source_id"]), {})
    return {"source_id": r["source_id"], "title": r["title"], "url": r["url"] or "", "publisher": meta.get("publisher") or "",
            "date": str(meta.get("date") or "")[:10], "text": str(r["text"] or "")[:120000], "chars": len(r["text"] or "")}


@app.get("/api/engagements/{eid}/mentions")
def engagement_mentions(eid: str, subject: str):
    """Where the held sources mention a subject: each source with up to three of its sentences that name it."""
    sub = " ".join(subject.lower().split())
    if len(sub) < 3:
        raise HTTPException(400, "subject required")
    out = []
    for r in _held_rows(eid):
        text = str(r["text"] or "")
        if sub not in " ".join(text.lower().split()):
            continue
        hits = [" ".join(x.split()) for x in re.split(r"(?<=[.!?])\s+|\n+", text)
                if sub in " ".join(x.lower().split()) and 30 <= len(x) <= 420 and _sentence(x)]
        if not hits:
            continue
        out.append({"source_id": r["source_id"], "title": r["title"], "url": r["url"] or "", "sentences": hits[:3], "count": len(hits)})
    out.sort(key=lambda x: -x["count"])
    return {"subject": subject, "sources": out[:40]}


@app.post("/api/engagements/{eid}/ask")
def engagement_ask(eid: str, a: Ask):
    """A question about the open source, subject or theme. Running work is never stopped: the answer takes the next
    turn on the card, or runs on the processor."""
    _held_rows(eid)
    q = " ".join(a.question.split())[:600]
    if len(q) < 3:
        raise HTTPException(400, "question required")
    from . import answers, providers
    try:
        got = answers.ask(eid, q, [s for s in a.source_ids if s][:12], a.subject.strip()[:120])
    except (providers.ProviderError, ValueError) as e:
        raise HTTPException(503, f"The question could not be answered just now: {str(e)[:200]}")
    if not got:
        return {"reply": "Nothing is held on that yet.", "points": 0, "sources": []}
    return got


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
    path = prototype.html_path_for_task(tid)
    with open(path, encoding="utf-8") as fh:
        doc = fh.read()
    try:                                       # Part 8: the brand faces, embedded at serve time (never in the model's file)
        import json as _json
        from . import deck
        with open(os.path.join(os.path.dirname(path), "prototype.json"), encoding="utf-8") as fh:
            brand = _json.load(fh).get("brand") or "nxt"
        faces = deck.brand_kit(brand)["fonts_css"]
    except (OSError, ValueError):
        faces = ""
    if faces:
        style = f"<style>{faces}</style>"
        m = re.search(r"(?i)<head[^>]*>", doc)
        doc = doc[:m.end()] + style + doc[m.end():] if m else style + doc
    return HTMLResponse(doc, headers=dict(prototype.PROTOTYPE_HEADERS))


def _artifact_doc(tid):
    from . import artifacts
    t = store.get_task(tid)
    if not t or t["status"] != "done" or t["kind"] != "artifact":
        raise HTTPException(404, "no finished artifact for this task")
    with open(artifacts.html_path_for_task(tid), encoding="utf-8") as fh:
        return t, fh.read()


@app.get("/api/tasks/{tid}/artifact")
def task_artifact(tid: str):
    """HiC's artifact itself, only ever loaded by the sandboxed iframe in /view, with the brand faces embedded."""
    from . import artifacts, exporter
    t, doc = _artifact_doc(tid)
    # HiC links Google Fonts; the sandbox's policy refuses them (a console error per page) and the faces are embedded
    # here, so the links are dropped rather than left to fail
    doc = exporter.with_faces(doc, t["brief"].get("brand") or "nxt")
    return HTMLResponse(doc, headers=dict(artifacts.ARTIFACT_HEADERS))


@app.get("/api/tasks/{tid}/artifact/download")
def task_artifact_download(tid: str):
    from . import artifacts
    t, doc = _artifact_doc(tid)
    name = re.sub(r"[^A-Za-z0-9 _-]+", "", f"{artifacts.label(t['brief'].get('kind', ''))} {t['id']}").strip().replace(" ", "_")
    return HTMLResponse(doc, headers={"Content-Disposition": f'attachment; filename="{name or "artifact"}.html"',
                                      **artifacts.ARTIFACT_HEADERS})


class NewEngagement(BaseModel):
    title: str
    objective: str
    test: bool = False          # made by an automated check: kept, but hidden from the person's list (C6)


@app.post("/api/engagements")
def create_engagement(e: NewEngagement):
    if not e.title.strip() or not e.objective.strip():
        raise HTTPException(400, "title and objective are required")
    return {"id": store.create_engagement(e.title.strip(), e.objective.strip(), hidden=e.test)}


class NewHome(BaseModel):
    source_ids: list[str]
    title: str = ""


@app.post("/api/engagements/{eid}/uploads/new-engagement")
def uploads_to_new_engagement(eid: str, n: NewHome):
    """C4: files dropped into an engagement that is about something else get an engagement of their own. The files are
    copied (the first engagement keeps them, so nothing built from them breaks) and the new engagement is returned with
    the new source ids, so the conversation's attachment list can point at them."""
    from . import secondbrain, transcripts
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    ups = {u["id"]: u for u in transcripts.uploaded_sources(eid)}
    picked = [ups[s] for s in dict.fromkeys(str(x).strip().upper() for x in n.source_ids) if s in ups]
    if not picked:
        raise HTTPException(400, "none of those files are uploads of this engagement")
    title = (n.title or "").strip() or re.sub(r"[_-]+", " ", re.sub(r"\.[A-Za-z0-9]+$", "", picked[0]["title"])).strip()[:80]
    names = ", ".join(u["title"] for u in picked)
    new = store.create_engagement(title or "Uploaded files", f"Find what matters in the uploaded files: {names}"[:500])
    mapping = {}
    for u in picked:
        sid = transcripts.add_text_source(new, u["title"], u["text"], u.get("kind") or "document", origin=u.get("origin") or "upload")
        mapping[u["id"]] = sid
        secondbrain.archive_upload_later(new, sid)
    store.event("uploads_rehomed", {"from": eid, "files": len(mapping)}, new)
    return {"engagement_id": new, "title": title, "source_ids": mapping}


AUDIO = (".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mpeg", ".mpga", ".ogg")


@app.post("/api/engagements/{eid}/uploads")
async def upload(eid: str, file: UploadFile = File(...), title: str = Form(""), conversation: str = Form("")):
    """A transcript, a document as text, or an audio recording (transcribed). Uploads are sources: data,
    quoted and cited, never instructions."""
    from . import providers, secondbrain, transcripts
    if not store.get_engagement(eid):
        raise HTTPException(404, "no such engagement")
    name = (file.filename or "upload").lower()
    from . import videotranscript
    big_audio = name.endswith(AUDIO) and (file.size or 0) > 25 * 1024 * 1024
    if name.endswith(videotranscript.VIDEO_EXT + videotranscript.AUDIO_EXT) and (big_audio or not name.endswith(AUDIO) or name.endswith(videotranscript.VIDEO_EXT)):
        # 22 Nov (owner): uploaded videos are transcribed by Whisper large-v3 here, kept in the second brain and
        # downloadable. The file is streamed to disk (videos run to gigabytes) and a task does the work.
        if not videotranscript.model_ready():
            raise HTTPException(503, "the Whisper large-v3 weights are not on this machine yet")
        folder = store.safe_path(eid, "uploads/videos")
        os.makedirs(folder, exist_ok=True)
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(file.filename or "video"))[:120]
        dest = os.path.join(folder, f"{int(time.time())}-{safe}")
        size = 0
        with open(dest, "wb") as fh:
            while True:
                block = await file.read(1 << 20)
                if not block:
                    break
                size += len(block)
                if size > videotranscript.MAX_BYTES:
                    fh.close()
                    os.remove(dest)
                    raise HTTPException(413, "files over 4 GB cannot be transcribed here")
                fh.write(block)
        # a file that did not arrive whole is refused now, with the reason (25 Nov: a 54 MB part of a 900 MB recording
        # failed half a minute later with "Invalid data found when processing input")
        wrong = videotranscript.container_problem(dest)
        if wrong:
            os.remove(dest)
            raise HTTPException(422, wrong)
        title_ = (title or os.path.splitext(os.path.basename(file.filename or "video"))[0])[:180]
        tid, _ = videotranscript.start(eid, {"upload_path": dest, "title": title_, "brand": "nxt"})
        # the transcript belongs to the conversation the file was attached in: its card is drawn there and the
        # assistant knows this work is that conversation's (QA 25 Nov, E15)
        store.link_task(str(conversation or "")[:80], tid)
        return {"task_id": tid, "kind": "video_transcript", "transcribing": True, "bytes": size, "title": title_,
                "message": "uploaded; Whisper large-v3 is transcribing it on this machine"}
    data = await file.read()
    if name.endswith(AUDIO):
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(413, "audio over 25 MB; split the recording")
        try:
            out = transcripts.transcribe_audio(eid, file.filename, data, providers.Ledger(limit_usd=2.0))
        except Exception as ex:
            raise HTTPException(502, f"transcription failed: {str(ex)[:200]}")
        if isinstance(out, dict) and out.get("source_id"):
            secondbrain.archive_upload_later(eid, out["source_id"])
        return out
    if name.endswith((".txt", ".md", ".vtt", ".srt", ".csv")):
        text = data.decode("utf-8", errors="replace")
        sid = transcripts.add_text_source(eid, title or file.filename, text, "transcript" if name.endswith((".vtt", ".srt")) else "document")
        secondbrain.archive_upload_later(eid, sid)          # into the second brain (plan Part 2)
        return {"source_id": sid, "chars": len(text)}
    from . import hic
    if name.endswith(hic.DOC_EXT):
        # Part 2 (owner decision 17 Nov): HiC reads PDF (scanned ones too), Word, PowerPoint, Excel and images
        try:
            got = hic.parse_upload(file.filename, data, file.content_type or "")
        except hic.HicUnavailable as ex:
            raise HTTPException(503, f"{ex}. Text, subtitle, CSV and audio files still work without it.")
        except ValueError as ex:
            raise HTTPException(422, f"nothing readable in {file.filename}: {str(ex)[:160]}")
        sid = transcripts.add_text_source(eid, title or file.filename, got["text"], "document")
        secondbrain.archive_upload_later(eid, sid)          # into the second brain (plan Part 2)
        return {"source_id": sid, "chars": len(got["text"]), "read_by": "HiC", "method": got["method"]}
    raise HTTPException(415, "send a document (.pdf .docx .pptx .xlsx), an image, a text file (.txt .md .vtt .srt .csv) "
                             "or audio (.mp3 .m4a .wav .webm .mp4 .ogg)")


class Feedback(BaseModel):
    verdict: str
    text: str = ""


@app.post("/api/tasks/{tid}/feedback")
def task_feedback(tid: str, f: Feedback):
    """The owner's verdict on finished work (uplift plan WS-1 step 3): accept, or reject with what is wrong. A rejection
    and the task's scorecard are a labelled failure case for the improvement loop (improve.py)."""
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    verdict = f.verdict.strip().lower()
    if verdict not in ("accept", "reject"):
        raise HTTPException(400, "verdict is accept or reject")
    store.event("task_feedback", {"verdict": verdict, "text": f.text.strip()[:2000], "kind": t["kind"]}, t["engagement_id"], tid)
    memory.episode(t, verdict=verdict, verdict_text=f.text.strip())          # WS-5 step 3: the verdict joins its line
    return {"recorded": True, "verdict": verdict}


@app.post("/api/tasks/{tid}/score")
def task_score(tid: str):
    """Score a finished task again with today's checks (uplift plan WS-1)."""
    from . import scorecard
    t = store.get_task(tid)
    if not t or t["status"] != "done":
        raise HTTPException(404, "no finished task with that id")
    return scorecard.run(tid) or {}


@app.post("/api/improve/run")
def improve_run():
    """One pass of the improvement loop now (it also runs by itself every ten scored tasks)."""
    from . import improve
    return improve.run()


@app.get("/api/tasks/{tid}/telemetry")
def task_telemetry(tid: str):
    """How the local models served one task (plan WS-2 step 1): calls, loads, prompt tokens sent and evaluated."""
    from . import providers
    if not store.get_task(tid):
        raise HTTPException(404, "no such task")
    return providers.cache_report(tid)


@app.api_route("/api/tasks/{tid}/video", methods=["GET", "HEAD"])
def task_video(tid: str):
    """The video overview of an audio overview: its voices over the engagement's slides, as one MP4 (narrated.py)."""
    from . import narrated
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    try:
        path = narrated.path_of(t)
    except narrated.NotReady as ex:
        raise HTTPException(409, str(ex))
    # served as a file a player can stream: inline, with byte ranges (a browser's video player asks for parts of the
    # file and showed nothing when every answer was the whole file as a download, 22 Nov)
    return FileResponse(path, media_type="video/mp4", filename="video-overview.mp4", content_disposition_type="inline",
                        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@app.get("/api/tasks/{tid}/export/{fmt}")
def task_export(tid: str, fmt: str):
    """Any finished artifact as pictures (png, or a zip of 16:9 pages), a PDF or 16:9 PowerPoint slides (pptx)."""
    from urllib.parse import quote
    from . import exporter
    t = store.get_task(tid)
    if not t:
        raise HTTPException(404, "no such task")
    try:
        data, name, media = exporter.make(t, fmt)
    except exporter.ExportError as ex:
        raise HTTPException(409 if t.get("status") != "done" else 422, str(ex))
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "-", name) or f"export.{fmt}"
    return Response(data, media_type=media, headers={
        "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}",
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


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


@app.post("/api/tasks/{tid}/audio")
def task_audio(tid: str):
    """Render the voices of a finished audio overview script (plan Part 6, S1): a pending approval with the price on
    the first press; the render itself once the person has approved that exact call."""
    from . import audio
    out = audio.request_voices(tid, by_person=True)       # the card's own button: the person is asking
    if out.get("error") and not out.get("task_id"):
        raise HTTPException(409, out["error"])
    return out


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
    from . import providers
    c = store.conn()
    providers._spend_table(c)
    day0 = _t.time() - (_t.time() % 86400)
    week0 = day0 - 6 * 86400
    today = c.execute("SELECT COALESCE(SUM(usd),0) s, COUNT(*) n FROM spend WHERE ts >= ?", (day0,)).fetchone()
    week = c.execute("SELECT COALESCE(SUM(usd),0) s, COUNT(*) n FROM spend WHERE ts >= ?", (week0,)).fetchone()
    by_model = [dict(r) for r in c.execute("SELECT model, COUNT(*) calls, ROUND(SUM(usd),4) usd, ROUND(AVG(seconds),1) avg_seconds "
                                           "FROM spend WHERE ts >= ? GROUP BY model ORDER BY usd DESC", (week0,))]
    # prompt caching at work: of the input the models read today, how much came from the cache (17 Nov)
    cache = c.execute("SELECT COALESCE(SUM(input_tokens),0) fresh, COALESCE(SUM(cache_read_tokens),0) cached, "
                      "COALESCE(SUM(cache_write_tokens),0) written FROM spend WHERE ts >= ?", (day0,)).fetchone()
    total_in = cache["fresh"] + cache["cached"] + cache["written"]
    agent = c.execute("SELECT COALESCE(SUM(usd),0) s, COUNT(*) n FROM spend WHERE ts >= ? AND label LIKE 'agent%'", (day0,)).fetchone()
    return {"today_usd": round(today["s"], 4), "today_calls": today["n"], "week_usd": round(week["s"], 4), "week_calls": week["n"],
            "by_model_7d": by_model,
            "today_cache": {"input_tokens": total_in, "read_from_cache": cache["cached"], "written_to_cache": cache["written"],
                            "share_from_cache": round(cache["cached"] / total_in, 3) if total_in else 0.0},
            "today_agent_turns": {"usd": round(agent["s"], 4), "calls": agent["n"]},
            "note": "models without a published price are metered at a conservative placeholder"}


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
    attention = [e["data"] for e in ev if e["kind"] == "attention_item"][-10:]          # code fixes the loop asks for
    proposals = sum(1 for e in ev if e["kind"] == "skill_candidate")
    return {"since_event": seen, "last_event": ev[-1]["id"] if ev else seen,
            "finished": done[-10:], "failed": [f for f in failed if f][-10:], "pending_approvals": len(control.pending()),
            "paused_schedules": [{"id": s["id"], "tool": s["tool"], "error": s["last_error"]} for s in paused],
            "new_memory_candidates": cands, "spend": spend()["today_usd"],
            "needs_attention": [{"kind": a.get("kind"), "check": a.get("check"), "tasks": len(a.get("tasks") or []),
                                 "examples": (a.get("examples") or [])[:2]} for a in attention],
            "skill_proposals": proposals}


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


@app.get("/api/skills")
def skills_list():
    """Every creator's governed skill (plan P7): the active version, and how many candidates wait."""
    from . import skills
    skills.seed_all()
    out = []
    for name in sorted(skills.REGISTRY):
        vs = skills.versions(name)
        active = next((v for v in reversed(vs) if v["status"] == "active"), None)
        out.append({"skill": name, "active_version": active["version"] if active else None,
                    "candidates": sum(1 for v in vs if v["status"] == "candidate"), "versions": len(vs),
                    "held_out_cases": len(skills.prompt_cases(name)) if name != "writer" else len(skills.held_out_cases())})
    return {"skills": out}


@app.get("/api/skills/{skill}")
def skill_versions(skill: str):
    from . import skills
    skills.seed_all()
    return {"versions": skills.versions(skill)}


@app.post("/api/skills/proposals")
def skill_propose(p: Proposal):
    from . import skills
    skills.seed_all()
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
