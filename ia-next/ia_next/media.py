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
import os
import time

import httpx

from . import config, control, providers, store

INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
VIDEO_MIN_SECONDS, VIDEO_MAX_SECONDS = 3, 15
VIDEO_RESOLUTIONS = ("360p", "720p", "1080p")
VIDEO_USD_PER_SECOND = 0.10
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


def generate_video(eid, prompt, seconds, ledger, resolution="360p", video_id=None):
    """One clip saved as results/videos/<id>.mp4. Returns the path. Callers must hold the person's approval:
    execute() enforces it; this function only spends."""
    seconds = int(seconds)
    if not VIDEO_MIN_SECONDS <= seconds <= VIDEO_MAX_SECONDS:
        raise ValueError(f"seconds must be {VIDEO_MIN_SECONDS} to {VIDEO_MAX_SECONDS}")
    if resolution not in VIDEO_RESOLUTIONS:
        raise ValueError(f"resolution must be one of {', '.join(VIDEO_RESOLUTIONS)}")
    if not config.GEMINI_API_KEY:
        raise providers.ProviderError("no Gemini API key is configured for video")
    est = round(seconds * VIDEO_USD_PER_SECOND, 2)
    _precheck(ledger, est)
    body = video_body(prompt, seconds, resolution)
    model = body["model"]
    t0 = time.time()
    try:
        r = httpx.post(INTERACTIONS_URL, json=body, timeout=300,
                       headers={"Content-Type": "application/json", "x-goog-api-key": config.GEMINI_API_KEY})
    except httpx.HTTPError as e:
        raise providers.ProviderError(f"video generation with {model} could not reach the Gemini API ({type(e).__name__})") from e
    try:
        payload = r.json()
    except ValueError:
        payload = None
    if r.status_code != 200:
        err = payload.get("error") if isinstance(payload, dict) else None
        err = err if isinstance(err, dict) else {}
        raise providers.ProviderError(f"video generation with {model} failed (HTTP {r.status_code} {err.get('status', '')}): "
                                      f"{str(err.get('message') or 'no error message returned')[:200]}")
    # The request was accepted, so it is charged, video or not (conservative: no published price).
    u = providers.Usage(model, 0, 0, 0, round(time.time() - t0, 2), extra_usd=est)
    if ledger is not None:
        ledger.add(u)
    video = find_video(payload)
    if not video or not video.get("data"):
        detail = "it returned a file link instead of inline video" if video else f"interaction status: {(payload or {}).get('status', 'unknown')}"
        said = _interaction_text(payload)
        raise providers.ProviderError(f"{model} returned no video ({detail})" + (f": {said[:200]}" if said else ""))
    try:
        mp4 = base64.b64decode(video["data"], validate=False)
    except (ValueError, TypeError) as e:
        raise providers.ProviderError(f"{model} returned video data that is not base64") from e
    if not mp4:
        raise providers.ProviderError(f"{model} returned an empty video")
    vid = video_id or store.new_id("vid")
    path = store.safe_path(eid, f"results/videos/{vid}.mp4")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(mp4)
    store.event("video_generated", {"id": vid, "model": model, "seconds": seconds, "resolution": resolution,
                                    "mime_type": video.get("mime_type") or "video/mp4", "path": _rel(eid, path),
                                    "usd": u.usd}, eid)
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
     "description": ("Generate one short 16:9 video clip (3 to 15 seconds, with audio) for an engagement with Gemini "
                     "Omni. Always needs the person's approval first: the first call returns a pending approval, and "
                     "the same call made again after the person approves produces the clip. A denied call is final."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["engagement_id", "prompt", "seconds"],
                      "properties": {"engagement_id": STR, "prompt": STR,
                                     "seconds": {"type": "integer", "description": "3 to 15"}}}},
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


def _video(args):
    eid, err = _check_common(args)
    if err:
        return err
    s = args.get("seconds")
    if isinstance(s, bool) or not isinstance(s, (int, float)) or int(s) != s or not VIDEO_MIN_SECONDS <= s <= VIDEO_MAX_SECONDS:
        return {"error": f"seconds must be a whole number from {VIDEO_MIN_SECONDS} to {VIDEO_MAX_SECONDS}"}
    seconds = int(s)
    st = control.status_for("generate_video", args)
    if st == "denied":
        return {"approval": "denied", "generated": False, "message": "the person denied this; do not try another way"}
    if st != "approved":
        est = seconds * VIDEO_USD_PER_SECOND
        a = control.request("spend", "generate_video", args,
                            f"Generate a {seconds}-second video with {config.SEATS['video']['primary']} "
                            f"(about {est:.2f} USD at a conservative {VIDEO_USD_PER_SECOND:.2f} USD per second)")
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
    ledger = providers.Ledger(limit_usd=round(seconds * VIDEO_USD_PER_SECOND + 0.01, 2))
    path = generate_video(eid, args["prompt"], seconds, ledger, video_id=vid)
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
