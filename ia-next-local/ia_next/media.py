"""The Media Producer (plan 6.2 and 6.10): still images and short video for an engagement.

Images come from the image seat (gpt-image-2.6-flare) through providers.openai_image, under a small ledger,
since one image costs about 0.10 USD. Video comes from the video seat (gemini-omni-1.2-flash) through the
Gemini Interactions API, which returns the finished MP4 inline as base64 in the same response (no
long-running operation to poll). The request and the response parsing mirror generateVideoClip in
internal-solutions-consistent-character-generator/services/geminiService.ts, verified live on 2026-11-11.
There is no published price for the video model, so each second is charged at a conservative
VIDEO_USD_PER_SECOND.

Video always needs the person's approval (class `spend`, plan 6.8): the approval covers the exact call,
a denied call is final, and an approved call produces exactly one clip (the clip id is derived from the
call's hash, so repeating the approved call returns the saved clip instead of paying again).
Prompts ask for real documentary photography or clean illustration with no text in the frame.
"""
import base64
import json
import os
import time

import httpx

from . import config, control, providers, store

INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
# IA Next Local: the one tested length is five seconds (Kandinsky 6.0 Lite Distill). Other lengths are refused,
# never quietly shortened or stretched.
VIDEO_MIN_SECONDS, VIDEO_MAX_SECONDS = 5, 5
VIDEO_RESOLUTIONS = ("360p", "720p", "1080p")
VIDEO_USD_PER_SECOND = 0.0       # made on this machine
IMAGE_LEDGER_USD = 0.50
IMAGE_EST_USD = 0.10
MAX_PROMPT_CHARS = 4000

IMAGE_STYLE = ("Style: real documentary photography with natural light and real people, places and objects; if the "
               "subject is abstract, a clean flat illustration instead. No text anywhere in the image: no words, "
               "letters, numbers, captions, labels, signage, logos or watermarks. Not CGI, not futuristic.")
VIDEO_STYLE = ("Real documentary footage look, natural light, unposed, smooth motion. No on-screen text, captions, "
               "titles, logos or watermarks.")


def _view(eid, rel):
    return f"/api/engagements/{eid}/files/{rel}"


def _rel(eid, path):
    return os.path.relpath(path, os.path.realpath(store.workspace(eid))).replace(os.sep, "/")


def _precheck(ledger, est_usd):
    """Refuse before any network call when the estimate would pass the approved budget."""
    if ledger is not None and ledger.spent_usd + est_usd > ledger.limit_usd + 1e-9:
        raise providers.BudgetExceeded(ledger.spent_usd + est_usd, ledger.limit_usd)


def _image_ext(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    raise providers.ProviderError("the image model returned bytes that are not an image")


# ---- images ------------------------------------------------------------------------------------
def image_prompt(prompt):
    return f"{prompt.strip()}\n\n{IMAGE_STYLE}"


def generate_image(eid, prompt, ledger):
    """One still image saved as results/images/<id>.png (PNG is what the seat returns). Returns the path."""
    _precheck(ledger, IMAGE_EST_USD)
    model = config.SEATS["image"]["primary"]
    data, _ = providers.openai_image(model, image_prompt(prompt), ledger)
    iid = store.new_id("img")
    path = store.safe_path(eid, f"results/images/{iid}.{_image_ext(data)}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data)
    store.event("image_generated", {"id": iid, "model": model, "path": _rel(eid, path)}, eid)
    return path


# ---- video -------------------------------------------------------------------------------------
def video_body(prompt, seconds, resolution="360p"):
    """The Interactions request, as generateVideoClip sends it for a text-only prompt. Pure, so it is tested."""
    text = f"Create a {seconds}-second video. {prompt.strip().rstrip('.')}. {VIDEO_STYLE} 16:9 format."
    return {
        "model": config.SEATS["video"]["primary"],
        "input": text,
        "response_format": {"type": "video", "aspect_ratio": "16:9", "resolution": resolution, "duration": f"{seconds}s"},
        # synchronous unary generation; store=false keeps the clip out of server-side history
        "background": False,
        "store": False,
    }


def find_video(payload):
    """steps[] -> content[] -> the first part of type 'video' carrying data or uri (as in geminiService.ts)."""
    for step in (payload or {}).get("steps") or []:
        for part in (step or {}).get("content") or []:
            if isinstance(part, dict) and part.get("type") == "video" and (part.get("data") or part.get("uri")):
                return part
    return None


def _interaction_text(payload):
    return " ".join(p.get("text", "").strip() for st in (payload or {}).get("steps") or []
                    for p in (st or {}).get("content") or [] if isinstance(p, dict) and p.get("type") == "text").strip()


def generate_video(eid, prompt, seconds, ledger, resolution="360p", video_id=None, audio_caption=""):
    """One clip saved as results/videos/<id>.mp4. Returns the path. Callers must hold the person's approval:
    execute() enforces it; this function only spends."""
    seconds = int(seconds)
    if not VIDEO_MIN_SECONDS <= seconds <= VIDEO_MAX_SECONDS:
        raise ValueError(f"seconds must be {VIDEO_MIN_SECONDS} to {VIDEO_MAX_SECONDS}")
    if resolution not in VIDEO_RESOLUTIONS:
        raise ValueError(f"resolution must be one of {', '.join(VIDEO_RESOLUTIONS)}")
    # IA Next Local: the clip is made on this machine by the video seat (localmedia.video). Nothing is sent to a paid
    # video service. The file is decoded and checked for picture, sound and length before it is saved.
    from . import localmedia
    t0 = time.time()
    mp4, model, facts = localmedia.video(f"{prompt.strip().rstrip('.')}. {VIDEO_STYLE}", audio_caption or "", seed=7)
    took = round(time.time() - t0, 1)
    if ledger is not None:
        ledger.add(providers.Usage(model, 0, 0, 0, took))
    vid = video_id or store.new_id("vid")
    path = store.safe_path(eid, f"results/videos/{vid}.mp4")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".part", "wb") as fh:
        fh.write(mp4)
    os.replace(path + ".part", path)
    store.event("video_generated", {"id": vid, "model": model, "seconds": facts["seconds"], "resolution": "480p",
                                    "mime_type": "video/mp4", "path": _rel(eid, path), "usd": 0.0, "streams": facts,
                                    "made_in_s": took}, eid)
    return path


# ---- the agent tools ---------------------------------------------------------------------------
STR = {"type": "string"}
TOOLS = [
    {"name": "generate_image", "strict": True,
     "description": ("Generate one still image for an engagement (real documentary photography, or a clean illustration "
                     "for abstract subjects; never any text in the image). Costs about 0.10 USD. Returns the saved "
                     "file and a view URL."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["engagement_id", "prompt"],
                      "properties": {"engagement_id": STR, "prompt": STR}}},
    {"name": "generate_video", "strict": True,
     "description": ("Generate one five-second 16:9 video clip with sound for an engagement, on this machine (free). "
                     "prompt says what happens in the shot; sound says what it sounds like (voices, ambience). Five "
                     "seconds is the only length. Always needs the person's approval first: the first call returns a "
                     "pending approval, and the same call made again after the person approves produces the clip. "
                     "A denied call is final. A clip takes several minutes."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["engagement_id", "prompt", "seconds", "sound"],
                      "properties": {"engagement_id": STR, "prompt": STR,
                                     "seconds": {"type": "integer", "description": "5"},
                                     "sound": {"type": "string", "description": "what the shot sounds like"}}}},
]


def _check_common(args):
    eid = str(args.get("engagement_id") or "")
    if not store.get_engagement(eid):
        return None, {"error": "no such engagement; list_engagements shows the ids"}
    prompt = str(args.get("prompt") or "").strip()
    if not prompt:
        return None, {"error": "describe what the image or video should show"}
    if len(prompt) > MAX_PROMPT_CHARS:
        return None, {"error": f"the prompt is longer than {MAX_PROMPT_CHARS} characters"}
    return eid, None


def _image(args):
    eid, err = _check_common(args)
    if err:
        return err
    ledger = providers.Ledger(limit_usd=IMAGE_LEDGER_USD)
    path = generate_image(eid, args["prompt"], ledger)
    rel = _rel(eid, path)
    return {"image": rel, "view": _view(eid, rel), "model": config.SEATS["image"]["primary"], "spent_usd": ledger.spent_usd}


# ---- an approved clip is followed to its end (QA 25 Nov) --------------------------------------------------------------
# The approved call ran in a bare thread: it was not a task, nothing recorded that it had started, a restart of the app
# ended it without a word, and the page stopped looking after six minutes. The card said "being made" for ever.
_INFLIGHT = {}
RECOVER_HOURS = 24


def run_approved(aid, args, run=None):
    """Make the approved clip and record how it ended. `run` is the tool runner (agent.execute_tool)."""
    eid = str(args.get("engagement_id") or "")
    _INFLIGHT[aid] = {"approval": aid, "engagement_id": eid, "started": time.time()}
    store.event("video_started", {"approval": aid}, eid or None)
    try:
        out = run("generate_video", args) if run else _video(args)
        if not isinstance(out, dict) or not out.get("generated"):
            raise RuntimeError(str((out or {}).get("error") or (out or {}).get("message") or "no clip was made"))
        store.event("video_ready", {"approval": aid, "view": out.get("view"), "video": out.get("video")}, eid or None)
        return out
    except Exception as ex:
        store.event("video_failed", {"approval": aid, "error": f"{type(ex).__name__}: {str(ex)[:400]}"
                                     if not isinstance(ex, (RuntimeError, providers.ProviderError)) else str(ex)[:400]}, eid or None)
        return {"generated": False, "error": str(ex)[:400]}
    finally:
        _INFLIGHT.pop(aid, None)


def inflight():
    return [dict(v, minutes=round((time.time() - v["started"]) / 60, 1)) for v in _INFLIGHT.values()]


def _ended(aid, since):
    """The last recorded end of an approved clip: ("ready" | "failed", data) or (None, {})."""
    rows = store.conn().execute("SELECT kind, data FROM events WHERE kind IN ('video_ready', 'video_failed') AND ts >= ? "
                                "ORDER BY id DESC LIMIT 200", (float(since or 0),)).fetchall()
    for r in rows:
        try:
            d = json.loads(r["data"] or "{}")
        except ValueError:
            continue
        if d.get("approval") == aid:
            return r["kind"].split("_", 1)[1], d
    return None, {}


def video_state(aid):
    """Where an approved clip stands: {"state": working | ready | failed | interrupted | pending | denied, ...}."""
    row = store.conn().execute("SELECT * FROM approvals WHERE id = ?", (aid,)).fetchone()
    if not row or row["tool"] != "generate_video":
        raise KeyError(aid)
    if row["status"] != "approved":
        return {"state": row["status"]}
    args = json.loads(row["args_json"] or "{}")
    eid = str(args.get("engagement_id") or "")
    rel = "results/videos/vid_" + control.call_hash("generate_video", args)[:12] + ".mp4"
    try:
        full = store.safe_path(eid, rel)
        if os.path.isfile(full) and os.path.getsize(full) > 0:
            return {"state": "ready", "view": _view(eid, rel), "video": rel}
    except Exception:
        pass
    if aid in _INFLIGHT:
        return {"state": "working", "minutes": round((time.time() - _INFLIGHT[aid]["started"]) / 60, 1)}
    how, d = _ended(aid, row["decided"])
    if how == "failed":
        return {"state": "failed", "error": d.get("error") or "the clip could not be made"}
    return {"state": "interrupted"}


def recover(run=None, start=True):
    """Clips that were approved and never finished because the app restarted are made now. Returns their approval ids."""
    rows = store.conn().execute("SELECT id, args_json, decided FROM approvals WHERE tool = 'generate_video' AND status = 'approved' "
                                "AND decided >= ?", (time.time() - RECOVER_HOURS * 3600,)).fetchall()
    again = []
    for r in rows:
        try:
            if video_state(r["id"])["state"] != "interrupted":
                continue
            args = json.loads(r["args_json"] or "{}")
        except Exception:
            continue
        again.append(r["id"])
        store.event("video_resumed", {"approval": r["id"]}, str(args.get("engagement_id") or "") or None)
        if start:
            import threading
            threading.Thread(target=run_approved, args=(r["id"], args, run), daemon=True, name=f"video-{r['id']}").start()
    return again


def _video(args):
    eid, err = _check_common(args)
    if err:
        return err
    s = args.get("seconds")
    if isinstance(s, bool) or not isinstance(s, (int, float)) or int(s) != s or not VIDEO_MIN_SECONDS <= s <= VIDEO_MAX_SECONDS:
        return {"error": f"this build makes {VIDEO_MIN_SECONDS}-second clips only; ask for seconds={VIDEO_MIN_SECONDS}"}
    seconds = int(s)
    st = control.status_for("generate_video", args)
    if st == "denied":
        return {"approval": "denied", "generated": False, "message": "the person denied this; do not try another way"}
    if st != "approved":
        a = control.request("spend", "generate_video", args,
                            f"Generate a {seconds}-second video with sound on this machine with "
                            f"{config.SEATS['video']['primary']} (no cost; it holds the graphics card for several minutes)")
        if a["status"] == "denied":
            return {"approval": "denied", "generated": False, "message": "the person denied this; do not try another way"}
        if a["status"] != "approved":
            return {"approval": a["status"], "approval_id": a["id"], "generated": False,
                    "message": "needs the person's approval before any video is generated"}
    # Approved: exactly this call, exactly one clip. The id comes from the call hash, so a repeat is free.
    vid = "vid_" + control.call_hash("generate_video", args)[:12]
    rel = f"results/videos/{vid}.mp4"
    existing = store.safe_path(eid, rel)
    if os.path.isfile(existing) and os.path.getsize(existing) > 0:
        return {"approval": "approved", "generated": True, "reused": True, "video": rel, "view": _view(eid, rel), "spent_usd": 0.0}
    ledger = providers.Ledger(limit_usd=0.01)
    path = generate_video(eid, args["prompt"], seconds, ledger, video_id=vid, audio_caption=str(args.get("sound") or ""))
    rel = _rel(eid, path)
    return {"approval": "approved", "generated": True, "reused": False, "video": rel, "view": _view(eid, rel),
            "model": config.SEATS["video"]["primary"], "seconds": seconds, "spent_usd": ledger.spent_usd}


def execute(name, args):
    try:
        if name == "generate_image":
            return _image(args)
        if name == "generate_video":
            return _video(args)
        return {"error": f"unknown tool {name}"}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:300]}"}
