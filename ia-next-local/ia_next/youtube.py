"""YouTube in deep research: videos found, transcribed, kept and cited like any other source (owner, 26 Nov 2026).

"HiC also pulls youtube videos and transcribes them! We have a transcriber in IA Next that should also transcribe
YouTube URLs. I want those as part of the deep research data packs crawlability and storage into the
library/wiki/manifest."

HiC finds videos three ways (a YouTube search source, channels registered as sources, a scheduler polling channel
feeds) and sends each one's sound to OpenAI's paid whisper-1. Here every step runs on this machine at no cost:

- search: yt-dlp's YouTube search (no key, no account); each candidate's own page is read for its upload date and
  length, so the period a run uses is honoured as it is for every other source. Shorts (under a minute), live streams
  and recordings over two hours are left out, and titles are ranked against the research goal by meaning;
- read: a video becomes its transcript. The video's published captions when it has them (about a second); otherwise
  Whisper large-v3 on this machine (videotranscript.py), when the caller has the time: a research run transcribes a
  short video itself, the Library transcribes every video in the background. The text is timestamped paragraphs, so
  every passage carries the minute it covers and a citation can open the video at that moment;
- keep: a transcript is a source like a page. pagetext.read hands a YouTube address here, so research runs, the
  Library's restore and the chat's reader all get the transcript; the Library stores it whole as a Video with its
  passages, and the second brain archives it with manifest pointers.
"""
import os
import shutil
import tempfile
import time

from . import videotranscript as vt

SEARCH_POOL = 24                 # results asked of one search; the best are read
MIN_SECONDS, MAX_SECONDS = 60, 2 * 3600
QUICK_WHISPER = 8 * 60           # a research run transcribes a video with no captions only when it runs this long or less
PROBE_WORKERS = 3                # YouTube asks a client that reads many pages at once to sign in; reads stay few and paced


def video_id(url):
    return vt.youtube_id(url)


def watch_url(vid):
    return f"https://www.youtube.com/watch?v={vid}"


def moment(vid, seconds):
    """The address that opens the video at this second."""
    return f"https://www.youtube.com/watch?v={vid}&t={int(seconds or 0)}s"


def _day(meta):
    d = str((meta or {}).get("upload_date") or "")
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 and d.isdigit() else ""


_PROBED, _COOL = {}, {"until": 0.0}
COOL_SECONDS = 600               # YouTube asked this client to sign in: no page reads for ten minutes (never a way around it)
BLOCK_SECONDS = 3600             # YouTube refuses this machine's requests (too many): nothing is asked of it for an hour
BLOCKED = ("IpBlocked", "RequestBlocked", "TooManyRequests")
REFUSED = "YouTube is refusing requests from this machine for now (too many requests); it is asked again later"


def refusing():
    """True while YouTube's refusal pause runs: no search, page read or captions read is sent."""
    return time.time() < _COOL.get("blocked_until", 0.0)


def _captions(vid):
    if refusing():
        return [], True
    segs = vt.captions(vid)
    if not segs and vt.CAPTIONS_ERROR.get("name") in BLOCKED:
        _COOL["blocked_until"] = time.time() + BLOCK_SECONDS
        _COOL["until"] = max(_COOL["until"], _COOL["blocked_until"])
        try:
            from . import papercuts
            papercuts.file("youtube", "read a video's published captions", "the captions", f"YouTube refused the request ({vt.CAPTIONS_ERROR.get('name')})",
                           "wait for the refusal to lift; keep YouTube requests few and paced")
        except Exception:
            pass
        return [], True
    return segs, False


def _probe(url):
    """yt-dlp's reading of the video's page, remembered per video. When YouTube answers with its sign-in check, page
    reads stop for COOL_SECONDS: the captions still answer, and an undated video is simply not kept by a dated run."""
    vid = video_id(url)
    if vid in _PROBED:
        return dict(_PROBED[vid])
    if time.time() < _COOL["until"] or refusing():
        return {}
    try:
        meta = vt.probe(url) or {}
    except Exception as e:
        if "sign in" in str(e).lower() or "not a bot" in str(e).lower():
            _COOL["until"] = time.time() + COOL_SECONDS
        return {}
    if vid and meta:
        if len(_PROBED) > 5000:
            _PROBED.clear()
        _PROBED[vid] = dict(meta)
    return meta


def transcript(url, whisper="auto", whisper_limit=QUICK_WHISPER, known=None):
    """A YouTube video as its transcript: {ok, url, video_id, title, channel, date, duration, text, method, reason}.
    whisper: "never" (captions only), "auto" (captions, else Whisper when the video runs whisper_limit seconds or less),
    "always" (Whisper first, the captions only when the sound cannot be fetched)."""
    vid = video_id(url)
    out = {"ok": False, "url": watch_url(vid) if vid else url, "video_id": vid, "title": "", "channel": "", "date": "",
           "duration": 0.0, "text": "", "method": "", "reason": ""}
    if not vid:
        out["reason"] = "not a YouTube video address"
        return out
    if refusing():
        out.update(reason=REFUSED, refused=True)
        return out
    meta = _probe(out["url"]) or dict(known or {})
    if meta.get("is_live"):
        out["reason"] = "a live stream; it can be transcribed once the stream has ended"
        return out
    duration = float(meta.get("duration") or 0)
    if duration > vt.MAX_SECONDS:
        out["reason"] = f"the video runs {vt.stamp(duration)}, longer than the {vt.stamp(vt.MAX_SECONDS)} the transcriber takes"
        return out
    segments, method, why = [], "", ""
    if whisper != "always":
        segments, refused = _captions(vid)
        if refused:
            out.update(reason=REFUSED, refused=True)
            return out
        method = "the video's published captions" if segments else ""
    may_listen = whisper == "always" or (whisper == "auto" and duration and duration <= whisper_limit)
    if not segments and may_listen:
        if not vt.model_ready():
            why = "the Whisper weights are not on this machine"
        else:
            folder = tempfile.mkdtemp(prefix="yt-")
            try:
                path, fetched = vt.fetch(out["url"], folder)
                meta = meta or fetched
                segments, info = vt.transcribe(path)
                method = info.get("model") or f"Whisper {vt.WHISPER_MODEL} on this machine"
                duration = duration or float(info.get("duration") or 0)
            except Exception as e:
                why = f"its sound could not be transcribed ({str(e)[:120]})"
                segments = []
            finally:
                shutil.rmtree(folder, ignore_errors=True)
        if not segments and whisper == "always":
            segments, refused = _captions(vid)
            if refused:
                out.update(reason=REFUSED, refused=True)
                return out
            method = "the video's published captions (its sound could not be transcribed)" if segments else ""
    if not segments:
        if why:
            out["reason"] = f"the video has no published captions and {why}"
        elif whisper == "never" or not duration or duration > whisper_limit:
            out["reason"] = "the video has no published captions" + (
                f", and at {vt.stamp(duration)} it is too long to transcribe within this run" if duration and whisper == "auto" else "")
        else:
            out["reason"] = "no speech was found in the video"
        return out
    info = {"title": meta.get("title") or f"YouTube video {vid}", "channel": meta.get("channel") or meta.get("uploader") or "",
            "youtube_id": vid, "published": _day(meta)}
    paras = vt.paragraphs(segments)
    out.update(ok=True, title=info["title"], channel=info["channel"], date=info["published"],
               duration=round(duration or segments[-1]["end"], 1), text=vt.source_text(info, paras), method=method)
    return out


def as_page(url, whisper="auto", whisper_limit=QUICK_WHISPER):
    """transcript() in the shape pagetext.read returns, so every reader of pages reads videos too."""
    t = transcript(url, whisper=whisper, whisper_limit=whisper_limit)
    return {"ok": t["ok"], "url": t["url"], "landing": url, "via": "video transcript", "kind": "video", "text": t["text"], "refused": bool(t.get("refused")),
            "title": t["title"], "date": t["date"], "author": t["channel"], "sitename": "YouTube", "raw": "", "headers": {},
            "status": 200 if t["ok"] else 0, "reason": t["reason"], "followed": [], "rendered": False, "clicked": [],
            "method": t["method"], "duration": t["duration"], "channel": t["channel"]}


def _search_entries(query, n):
    """yt-dlp's YouTube search: [{id, title, channel, duration}] (no dates: a search result does not carry one)."""
    import yt_dlp
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "extract_flat": True, "skip_download": True,
                           "playlistend": n, "socket_timeout": 20}) as y:
        info = y.extract_info(f"ytsearch{n}:{query}", download=False)
    return [{"id": e.get("id"), "title": e.get("title") or "", "channel": e.get("channel") or e.get("uploader") or "",
             "duration": float(e.get("duration") or 0)} for e in (info.get("entries") or []) if e and e.get("id")]


def search(query, window=None, limit=3, objective="", known=(), say=None, whisper_limit=0, scores=None):
    """Videos about the query, inside the period, as transcripts: [{url, video_id, title, channel, date, duration, text,
    method}], best first, at most `limit`. A video with no captions is transcribed by Whisper only when it runs
    whisper_limit seconds or less (0: captions only, the default for a research run's general search).
    Returns (videos, report) where report counts what was found and why the rest were left out."""
    from . import currency
    report = {"query": query, "found": 0, "too_short_or_long": 0, "off_subject": 0, "older": 0, "undated": 0,
              "no_transcript": 0, "kept": 0}
    if refusing():
        report["error"] = REFUSED
        return [], report
    try:
        cands = _search_entries(query, SEARCH_POOL)
    except Exception as e:
        report["error"] = f"{type(e).__name__}: {str(e)[:160]}"
        return [], report
    report["found"] = len(cands)
    known = set(known or ())
    fit = [c for c in cands if MIN_SECONDS <= c["duration"] <= MAX_SECONDS and watch_url(c["id"]) not in known]
    report["too_short_or_long"] = len(cands) - len(fit)
    if objective and fit:
        if scores is None:
            from . import localrank
            scores = localrank.scores
        sc = scores(objective, [f"{c['title']} ({c['channel']})" for c in fit])
        if sc:
            for c, s in zip(fit, sc):
                c["meaning"] = s
            best = max(sc)
            line = max(0.3, best * 0.8)                   # titles are short: keep those near the best, never far below it
            kept = [c for c in fit if c["meaning"] >= line]
            report["off_subject"] = len(fit) - len(kept)
            fit = sorted(kept, key=lambda c: -c["meaning"])
    fit = fit[: max(limit * 2, limit)]
    if say and fit:
        say(f"reading {len(fit)} YouTube videos about \"{query}\"")
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=PROBE_WORKERS) as pool:
        metas = list(pool.map(lambda c: _probe(watch_url(c["id"])), fit))
    dated = []
    for c, m in zip(fit, metas):
        c["meta"] = m
        when = _day(m)
        if window and window.get("since"):
            if not when:
                report["undated"] += 1
                continue
            if not currency.inside(when, window):
                report["older"] += 1
                continue
        dated.append(c)
    out = []
    for c in dated:
        if len(out) >= limit:
            break
        t = transcript(watch_url(c["id"]), whisper="auto" if whisper_limit else "never", whisper_limit=whisper_limit or QUICK_WHISPER,
                       known=dict(c.get("meta") or {}, title=c["title"], channel=c["channel"], duration=c["duration"]))
        if t.get("refused"):
            report["error"] = REFUSED
            break
        if not t["ok"] or len(t["text"]) < 400:
            report["no_transcript"] += 1
            continue
        out.append(dict(t, meaning=c.get("meaning")))
    report["kept"] = len(out)
    return out, report


PACK_WORDS = {"fundraising": "fundraising philanthropy", "agriculture": "agriculture", "energy": "energy utilities",
              "executive_search": "executive search leadership", "financial_services": "financial services",
              "government": "government policy", "healthcare": "healthcare", "higher_ed": "higher education",
              "insurance": "insurance", "retail": "retail", "social_clubs": "membership clubs", "travel_tourism": "travel tourism",
              "workforce": "workforce careers", "ai_trends": "AI", "academic": "research", "creative_ai": "creative AI design",
              "social_listening": ""}


def pack_query(pack_id, pack_name, query):
    """The YouTube search for one data pack: the run's keywords in the pack's industry ("retail AI shopping assistants")."""
    words = PACK_WORDS.get(pack_id)
    if words is None:
        words = " ".join(w for w in str(pack_name or pack_id).replace("&", " ").replace("_", " ").split()
                         if w.lower() not in ("and", "the"))
    lead = str(words or "").lower()
    q = str(query or "").strip()
    return q if not lead or lead in q.lower() else f"{lead} {q}".strip()


def search_packs(packs, query, window=None, per_pack=2, general=2, objective="", known=(), say=None, whisper_limit=0, names=None):
    """YouTube for a run: one search in the subject at large and one in each selected pack's industry, two at a time.
    Returns ([video dict with "pack": id or "general"], {pack: report})."""
    from concurrent.futures import ThreadPoolExecutor
    jobs = [("general", query, general)] + [(p, pack_query(p, (names or {}).get(p, p), query), per_pack) for p in packs]
    jobs = [j for j in jobs if j[2] > 0 and j[1]]

    def one(job):
        pid, q, n = job
        return pid, search(q, window, limit=n, objective=objective, known=known, say=say, whisper_limit=whisper_limit)
    with ThreadPoolExecutor(max_workers=2) as pool:
        got = list(pool.map(one, jobs))
    seen, out, reports = set(known or ()), [], {}
    for pid, (vids, rep_) in got:
        reports[pid] = rep_
        for v in vids:
            if v["url"] in seen:
                continue
            seen.add(v["url"])
            out.append(dict(v, pack=pid))
    return out, reports
