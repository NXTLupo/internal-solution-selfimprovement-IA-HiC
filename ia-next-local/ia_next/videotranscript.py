"""Video and audio transcription on this machine: a YouTube link, a link to a media file, or an uploaded video.

Owner, 22 Nov: "I want the open weight/open source workflow through the IA Next (Local) chat to be able to accept
youtube links and/or uploaded video files, and use the local open weight equivalent of the model that the
Intelligence Augmentation's stand alone tool uses to transcribe video, then chunk it and store it with manifest
reference in the second brain along with giving users links to download the transcripts."

The standalone tool (internal-solutions-video-analyzer) downloads a video's sound with yt-dlp and sends it to OpenAI's
"whisper-1", which is Whisper large-v2 behind an API. Here the same steps run with open software and open weights:

  1. Fetcher      yt-dlp fetches the sound of a YouTube video (or any page yt-dlp reads); an uploaded file is read
                  where the upload saved it. A YouTube video whose sound cannot be fetched falls back to its published
                  captions (youtube-transcript-api), as the standalone tool does, and the summary says so.
  2. Transcriber  Whisper large-v3 (OpenAI's open release that follows large-v2) through faster-whisper, int8 on the
                  processor, with voice-activity filtering. Nothing leaves this machine.
  3. Writer       transcript.txt (timestamped paragraphs), .srt and .vtt (subtitles), .md, segments.json, a page.
  4. Archivist    the transcript becomes the engagement's next source (S#) and is written to the second brain (HiC's
                  wiki) as timestamped paragraphs, so each manifest chunk (path#cN) carries the times it covers;
                  chunks.json maps every pointer to its time range and, for YouTube, a link to that moment.

Every step is a node in the live view with its tool and model. Transcription runs one at a time: it uses most of the
processor for a few minutes per ten minutes of speech.
"""
import hashlib
import html
import json
import os
import re
import threading
import time

from . import config, store

WHISPER_MODEL = os.environ.get("IA_NEXT_WHISPER_MODEL", "large-v3")
WHISPER_DIR = os.environ.get("IA_NEXT_WHISPER_DIR", "/models/whisper")
THREADS = max(4, min(16, (os.cpu_count() or 8) - 4))     # leaves room for the app, the renderer and HiC
VIDEO_EXT = (".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mpeg", ".mpg", ".wmv", ".flv", ".3gp")
AUDIO_EXT = (".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac", ".opus", ".mpga", ".wma")
MAX_BYTES = 4 * 1024 ** 3                                 # one upload or download
MAX_SECONDS = 4 * 3600                                    # four hours of sound
SPEED = 3.0                                               # a first guess, corrected by the pace as it runs
BATCH = 16                                                # speech segments decoded at once (measured 22 Nov, same video: 404 s one at a time, 144 s batched, 99.5% of the words the same)
CUE_SECONDS, CUE_CHARS = 7.0, 84                          # a subtitle line: at most about two lines on screen
LOAD_SECONDS = 25                                         # the model's first load
PARAGRAPH_SECONDS = 75                                    # a timestamped paragraph: about a minute of speech
YOUTUBE = re.compile(r"(?:https?://)?(?:www\.|m\.|music\.)?(?:youtube\.com/(?:watch\?(?:[^ ]*&)?v=|shorts/|live/|embed/|v/)|"
                     r"youtu\.be/)([A-Za-z0-9_-]{11})")
URL = re.compile(r"https?://[^\s<>\"']+", re.I)
BUDGET_USD = 0.0

_MODELS = {}
_LOAD = threading.Lock()
_RUN = threading.Lock()                                   # one transcription at a time on the processor


class FetchError(ValueError):
    """The video or its sound could not be read."""


# ---- helpers --------------------------------------------------------------------------------------------------------
def youtube_id(url):
    m = YOUTUBE.search(str(url or ""))
    return m.group(1) if m else ""


def stamp(seconds, srt=False, vtt=False):
    """00:03:07 (or 00:03:07,250 for SRT and 00:03:07.250 for VTT)."""
    seconds = max(0.0, float(seconds or 0))
    h, rem = divmod(int(seconds), 3600)
    m, s = divmod(rem, 60)
    ms = int(round((seconds - int(seconds)) * 1000)) % 1000
    if srt:
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    if vtt:
        return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


_MARK = re.compile(r"\[(?:(\d+):)?(\d{1,2}):(\d{2})\]")


def mark_seconds(m):
    h, mi, s = m.group(1), m.group(2), m.group(3)
    return int(h or 0) * 3600 + int(mi) * 60 + int(s)


def paragraphs(segments, target=PARAGRAPH_SECONDS):
    """Segments grouped into paragraphs of about `target` seconds, broken after a sentence ends when one is near.
    [{start, end, text}]."""
    out, cur = [], []
    for s in segments:
        if not str(s.get("text") or "").strip():
            continue
        cur.append(s)
        span = cur[-1]["end"] - cur[0]["start"]
        ends = cur[-1]["text"].rstrip().endswith((".", "?", "!"))
        if span >= target * 1.6 or (span >= target and ends):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [{"start": p[0]["start"], "end": p[-1]["end"], "text": " ".join(x["text"].strip() for x in p)} for p in out]


# ---- 1. fetch ---------------------------------------------------------------------------------------------------------
def probe(url):
    """What yt-dlp knows about a link before anything is downloaded: {id, title, channel, duration, ...}."""
    import yt_dlp
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "noplaylist": True, "skip_download": True,
                           "socket_timeout": 30}) as y:
        info = y.extract_info(url, download=False)
    return {k: info.get(k) for k in ("id", "title", "channel", "uploader", "upload_date", "duration", "webpage_url",
                                     "is_live", "extractor_key")}


def fetch(url, folder):
    """The sound of the video at `url`, saved in `folder`. Returns (path, meta)."""
    import yt_dlp
    meta = probe(url)
    if meta.get("is_live"):
        raise FetchError("that video is a live stream; transcribe it once the stream has ended")
    if meta.get("duration") and meta["duration"] > MAX_SECONDS:
        raise FetchError(f"that video runs {stamp(meta['duration'])}; the limit here is {stamp(MAX_SECONDS)}")
    opts = {"format": "bestaudio[ext=m4a]/bestaudio/best[height<=480]/best", "outtmpl": os.path.join(folder, "source.%(ext)s"),
            "quiet": True, "no_warnings": True, "noplaylist": True, "restrictfilenames": True, "max_filesize": MAX_BYTES,
            "socket_timeout": 30, "retries": 3, "overwrites": True}
    with yt_dlp.YoutubeDL(opts) as y:
        info = y.extract_info(url, download=True)
        path = y.prepare_filename(info)
    if not os.path.isfile(path):
        got = [f for f in os.listdir(folder) if f.startswith("source.")]
        path = os.path.join(folder, got[0]) if got else ""
    if not path or os.path.getsize(path) < 1000:
        raise FetchError("the video's sound could not be downloaded")
    return path, meta


CAPTIONS_ERROR = {"name": ""}              # why the last captions read found none ("IpBlocked": YouTube refuses this machine)


def captions(video_id):
    """A YouTube video's published captions as segments, or [] (youtube-transcript-api, no key). When there are none,
    CAPTIONS_ERROR["name"] says why (the library's exception name, e.g. TranscriptsDisabled or IpBlocked)."""
    CAPTIONS_ERROR["name"] = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return []
    langs = ["en", "en-US", "en-GB"]
    try:
        if hasattr(YouTubeTranscriptApi, "fetch") and not hasattr(YouTubeTranscriptApi, "get_transcript"):
            rows = [{"start": s.start, "duration": s.duration, "text": s.text} for s in YouTubeTranscriptApi().fetch(video_id, languages=langs)]
        else:
            rows = YouTubeTranscriptApi.get_transcript(video_id, languages=langs)
    except Exception as first:
        if type(first).__name__ in ("IpBlocked", "RequestBlocked", "TooManyRequests"):
            CAPTIONS_ERROR["name"] = type(first).__name__
            return []
        try:
            api = YouTubeTranscriptApi()
            rows = [{"start": s.start, "duration": s.duration, "text": s.text} for s in api.fetch(video_id)]
        except Exception as e:
            CAPTIONS_ERROR["name"] = type(e).__name__
            return []
    return [{"start": round(float(r["start"]), 2), "end": round(float(r["start"]) + float(r.get("duration") or 0), 2),
             "text": re.sub(r"\s+", " ", str(r["text"])).strip()} for r in rows if str(r.get("text") or "").strip()]


# ---- 2. transcribe ------------------------------------------------------------------------------------------------------
def container_problem(path):
    """"" when a recording's file is whole, else one sentence a person can act on. MP4, MOV and M4A files are a chain of
    blocks that each state their size: a block that states more than the file holds, or a file with no index block
    ("moov"), is a download, export or copy that stopped early. Other formats are not judged here."""
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:
            head = fh.read(12)
            if len(head) < 12 or head[4:8] not in (b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip"):
                return ""
            pos, seen = 0, []
            while pos + 8 <= size and len(seen) < 64:
                fh.seek(pos)
                h8 = fh.read(8)
                n, kind = int.from_bytes(h8[:4], "big"), h8[4:8]
                if n == 1:
                    n = int.from_bytes(fh.read(8), "big")
                elif n == 0:
                    n = size - pos
                if n < 8:
                    break
                seen.append(kind)
                if pos + n > size:
                    return (f"this file is incomplete: it holds {size / 1e6:.1f} MB of a recording of about {(pos + n) / 1e6:.0f} MB, "
                            "so it cannot be played or transcribed. The download, export or copy stopped early; get the "
                            "whole file and upload it again.")
                pos += n
            if b"moov" not in seen:
                return ("this file is incomplete: the part that describes the recording is missing, so it cannot be played "
                        "or transcribed. Export or download it again and upload the whole file.")
    except OSError:
        return ""
    return ""


def duration_of(path):
    """A recording's length in seconds, read from its container (PyAV), or 0."""
    try:
        import av
        with av.open(path) as c:
            return float(c.duration / 1e6) if c.duration else 0.0
    except Exception:
        return 0.0


def model_path():
    return os.path.join(WHISPER_DIR, f"faster-whisper-{WHISPER_MODEL}")


def model_ready():
    return os.path.isfile(os.path.join(model_path(), "model.bin"))


def _model():
    if not model_ready():
        raise RuntimeError(f"the Whisper {WHISPER_MODEL} weights are not on this machine (expected in {model_path()}); "
                           "see LOCAL.md for the one-time download")
    with _LOAD:
        if "m" not in _MODELS:
            from faster_whisper import WhisperModel
            _MODELS["m"] = WhisperModel(model_path(), device="cpu", compute_type="int8", cpu_threads=THREADS)
        return _MODELS["m"]


def cues(words, seconds=CUE_SECONDS, chars=CUE_CHARS):
    """Word timings cut into subtitle lines: a line ends after a sentence once it holds a second and a half of speech,
    or when it reaches `seconds` or `chars`. Each word has .start, .end and .word (with its leading space)."""
    out, cur = [], []

    def close():
        text = "".join(w.word for w in cur).strip()
        if text:
            out.append({"start": round(cur[0].start, 2), "end": round(cur[-1].end, 2), "text": text})
    for w in words:
        cur.append(w)
        span = cur[-1].end - cur[0].start
        size = len("".join(x.word for x in cur).strip())
        if (w.word.strip().endswith((".", "?", "!")) and span >= 1.5) or span >= seconds or size >= chars:
            close()
            cur = []
    if cur:
        close()
    return out


def transcribe(path, on_progress=None):
    """([{start, end, text}], {language, language_probability, duration, model}) for an audio or video file.
    Speech segments found by the voice-activity filter are decoded BATCH at a time (faster-whisper's batched
    pipeline), with word timings cut into subtitle lines."""
    with _RUN:
        m = _model()
        from faster_whisper import BatchedInferencePipeline
        with _LOAD:
            pipe = _MODELS.get("batched") or _MODELS.setdefault("batched", BatchedInferencePipeline(model=m))
        segs, info = pipe.transcribe(path, batch_size=BATCH, beam_size=5, word_timestamps=True)
        out, last = [], 0.0
        for s in segs:
            words = list(getattr(s, "words", None) or [])
            if words:
                out += cues(words)
            elif s.text.strip():
                out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
            if on_progress and time.time() - last > 8:
                on_progress(s.end, info.duration)
                last = time.time()
    return out, {"language": info.language, "language_probability": round(float(info.language_probability or 0), 2),
                 "duration": round(float(info.duration or 0), 1),
                 "model": f"Whisper {WHISPER_MODEL} (faster-whisper, int8, batched, on this machine)"}


# ---- 3. write -----------------------------------------------------------------------------------------------------------
def files(folder, meta, segments, paras, info):
    """Writes transcript.txt, .srt, .vtt, .md and segments.json. Returns {name: path}."""
    title = meta.get("title") or "Transcript"
    head = [title]
    if meta.get("channel"):
        head.append(f"Channel: {meta['channel']}")
    if meta.get("webpage_url"):
        head.append(f"Source: {meta['webpage_url']}")
    if meta.get("upload_date"):
        d = str(meta["upload_date"])
        head.append(f"Published: {d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 else f"Published: {d}")
    head.append(f"Length: {stamp(info.get('duration') or (segments[-1]['end'] if segments else 0))}; language: {info.get('language') or 'unknown'}")
    head.append(f"Transcribed by: {info.get('model')}")
    out = {}
    txt = "\n".join(head) + "\n\n" + "\n\n".join(f"[{stamp(p['start'])}] {p['text']}" for p in paras) + "\n"
    srt = "\n".join(f"{i}\n{stamp(s['start'], srt=True)} --> {stamp(s['end'], srt=True)}\n{s['text']}\n" for i, s in enumerate(segments, 1))
    vtt = "WEBVTT\n\n" + "\n".join(f"{stamp(s['start'], vtt=True)} --> {stamp(s['end'], vtt=True)}\n{s['text']}\n" for s in segments)
    md = (f"# {title}\n\n" + "\n".join(f"- {h}" for h in head[1:]) + "\n\n"
          + "\n\n".join(f"**[{stamp(p['start'])} to {stamp(p['end'])}]** {p['text']}" for p in paras) + "\n")
    for name, body in (("transcript.txt", txt), ("transcript.srt", srt), ("transcript.vtt", vtt), ("transcript.md", md)):
        p = os.path.join(folder, name)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(body)
        out[name] = p
    with open(os.path.join(folder, "segments.json"), "w", encoding="utf-8") as fh:
        json.dump({"meta": meta, "info": info, "segments": segments}, fh, ensure_ascii=False, indent=1)
    out["segments.json"] = os.path.join(folder, "segments.json")
    return out


def source_text(meta, paras):
    """The text kept as the source and written to the second brain: one timestamped paragraph per block, so each
    manifest chunk carries the times it covers."""
    who = ", ".join(x for x in (meta.get("channel"), "YouTube" if meta.get("youtube_id") else "", meta.get("published")) if x)
    first = f"Transcript of {meta.get('title') or 'a recording'}" + (f" ({who})" if who else "") + "."
    return first + "\n\n" + "\n\n".join(f"[{stamp(p['start'])}] {p['text']}" for p in paras)


def chunk_times(chunks, duration, youtube=""):
    """Each manifest chunk's time range, read from the timestamp marks inside it: [{n, pointer, start, end, link, chars}]."""
    rows = []
    for i, c in enumerate(chunks, 1):
        marks = [mark_seconds(m) for m in _MARK.finditer(c["text"])]
        rows.append({"n": i, "pointer": c["pointer"], "start": marks[0] if marks else None, "chars": len(c["text"])})
    last = None
    for r in rows:                                 # a chunk with no mark of its own continues the one before it
        if r["start"] is None:
            r["start"] = last if last is not None else 0
        last = r["start"]
    for i, r in enumerate(rows):
        r["end"] = rows[i + 1]["start"] if i + 1 < len(rows) else round(duration or r["start"])
        r["link"] = f"https://www.youtube.com/watch?v={youtube}&t={int(r['start'])}s" if youtube else ""
    return rows


# ---- the page -------------------------------------------------------------------------------------------------------------
def page(eid, tid, meta, info, paras, chunks, sid, archived, brand="nxt"):
    from . import deck
    kit = deck.brand_kit(brand)
    base = f"/api/engagements/{eid}/files/results/tasks/{tid}/"
    yt = meta.get("youtube_id") or ""
    links = "".join(f'<a class="dl" href="{base}{n}" download>{label}</a>' for n, label in
                    (("transcript.txt", "Transcript (TXT)"), ("transcript.md", "Transcript (Markdown)"),
                     ("transcript.srt", "Subtitles (SRT)"), ("transcript.vtt", "Subtitles (VTT)"), ("segments.json", "Segments (JSON)")))
    facts = [("Length", stamp(info.get("duration") or 0)), ("Language", (info.get("language") or "unknown").upper()),
             ("Transcribed by", info.get("model") or ""), ("Source in this engagement", sid)]
    if meta.get("channel"):
        facts.insert(0, ("Channel", meta["channel"]))
    if meta.get("published"):
        facts.insert(1, ("Published", meta["published"]))
    fact_html = "".join(f"<div><dt>{html.escape(k)}</dt><dd>{html.escape(str(v))}</dd></div>" for k, v in facts if v)
    src = (f'<a href="{html.escape(meta["webpage_url"])}" rel="noopener noreferrer" target="_blank">{html.escape(meta["webpage_url"])}</a>'
           if meta.get("webpage_url") else html.escape(meta.get("file") or ""))

    def at(sec):
        label = html.escape(stamp(sec))
        return (f'<a class="t" href="https://www.youtube.com/watch?v={yt}&amp;t={int(sec)}s" target="_blank" rel="noopener noreferrer">{label}</a>'
                if yt else f'<span class="t">{label}</span>')
    body = "".join(f'<p class="para">{at(p["start"])} {html.escape(p["text"])}</p>' for p in paras)
    if chunks:
        rows = "".join(f'<tr><td>{c["n"]}</td><td>{at(c["start"])} to {html.escape(stamp(c["end"]))}</td><td><code>{html.escape(c["pointer"])}</code></td></tr>'
                       for c in chunks)
        brain = (f'<section><h2>In the second brain</h2><p class="note">{len(chunks)} manifest chunks, each cited by its pointer; '
                 f'every deck, report and chat answer that uses this transcript cites these.</p>'
                 f'<table><thead><tr><th>Chunk</th><th>Covers</th><th>Manifest pointer</th></tr></thead><tbody>{rows}</tbody></table></section>')
    else:
        brain = f'<section><h2>In the second brain</h2><p class="note">{html.escape(archived)}</p></section>'
    return f"""<!doctype html><html lang="en" data-brand="{html.escape(kit['brand'])}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(meta.get('title') or 'Transcript')}</title>
<style>{kit['fonts_css']}
{kit['css']}
body{{margin:0;background:#fff;color:var(--ink);font-family:var(--font-body)}}main{{max-width:880px;margin:0 auto;padding:48px 24px 80px}}
.k{{font:600 12px/1.3 var(--font-body);letter-spacing:.08em;text-transform:uppercase;color:var(--deep);margin:0 0 10px}}
h1{{font:600 40px/1.1 var(--font-display);margin:0 0 12px;text-transform:var(--title-transform)}}h2{{font:600 22px/1.2 var(--font-body);margin:40px 0 12px}}
.src{{color:var(--muted);font-size:15px;margin:0 0 20px;word-break:break-all}}dl{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:0 0 24px}}
dt{{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}}dd{{margin:2px 0 0;font-weight:600}}
.dls{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}}.dl{{border:1.5px solid var(--ink);border-radius:3px;padding:8px 12px;color:var(--ink);text-decoration:none;font-size:14px;font-weight:600}}
.dl:hover{{background:var(--panel)}}.para{{font-size:17px;line-height:1.6;margin:0 0 16px}}.t{{font:600 13px/1 var(--font-mono,monospace);color:var(--deep);margin-right:8px;text-decoration:none}}
a.t:hover{{text-decoration:underline}}.note{{color:var(--muted);font-size:15px}}table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}}th{{background:var(--panel)}}code{{font-size:12px;word-break:break-all}}
</style></head><body><main>
<p class="k">Video transcript</p><h1>{html.escape(meta.get('title') or 'Transcript')}</h1><p class="src">{src}</p>
<dl>{fact_html}</dl><div class="dls">{links}</div>
<section><h2>Transcript</h2>{body}</section>{brain}
</main></body></html>"""


def slides(meta, info, paras, brand="nxt"):
    """The transcript as 16:9 slides for the PowerPoint and PDF downloads: a title slide, then the paragraphs a slide at
    a time with the times they cover (owner: every artifact that is not video or audio downloads as slides)."""
    from . import deck, slidepage
    kit = deck.brand_kit(brand)
    e = slidepage.e
    facts = " ".join(x for x in (meta.get("channel"), meta.get("published"), f"Length {stamp(info.get('duration') or 0)}") if x)
    out = [slidepage._stage("Video transcript", meta.get("title") or "Transcript",
                            f'<p class="lead">{e(facts)}</p><p>{e(meta.get("webpage_url") or meta.get("file") or "")}</p>'
                            f'<p class="small">Transcribed on this machine by {e(info.get("model") or "")}.</p>', kit)]
    page_, used, start = [], 0, None
    groups = []
    for p in paras:
        if page_ and used + len(p["text"]) > 900:
            groups.append(page_)
            page_, used = [], 0
        page_.append(p)
        used += len(p["text"])
    if page_:
        groups.append(page_)
    for i, g in enumerate(groups[:58], 1):
        body = "".join(f'<p><b>{e(stamp(p["start"]))}</b>  {e(p["text"])}</p>' for p in g)
        out.append(slidepage._stage(f"Transcript {i:02d} of {min(len(groups), 58):02d}", f"{stamp(g[0]['start'])} to {stamp(g[-1]['end'])}",
                                    f'<div class="cols c1"><div class="col plain">{body}</div></div>', kit))
    return slidepage._doc(meta.get("title") or "Transcript", out, kit)


# ---- the task -------------------------------------------------------------------------------------------------------------
def run(tid):
    from . import hic, secondbrain, transcripts
    t = store.get_task(tid)
    eid, brief = t["engagement_id"], t["brief"]
    folder = store.safe_path(eid, f"results/tasks/{tid}")
    os.makedirs(folder, exist_ok=True)
    store.update_task(tid, status="running")
    store.event("task_running", {}, eid, tid)
    try:
        url, upload = str(brief.get("url") or "").strip(), str(brief.get("upload_path") or "").strip()
        meta, used_captions, segments, info = {}, False, None, {}
        if url:
            yid = youtube_id(url)
            with store.stage(tid, "Fetcher: the video's sound", "yt-dlp (no model)") as st:
                try:
                    path, meta = fetch(url, folder)
                    st.say(f"{meta.get('title') or 'video'}: {stamp(meta.get('duration') or 0)} of sound fetched")
                except Exception as ex:
                    if not yid:
                        raise FetchError(f"the link could not be read: {str(ex)[:200]}")
                    path = ""
                    segments = captions(yid)
                    if not segments:
                        raise FetchError(f"the video's sound could not be fetched ({str(ex)[:160]}) and it has no captions to read")
                    used_captions = True
                    try:
                        meta = probe(url)
                    except Exception:
                        meta = {"title": f"YouTube video {yid}", "webpage_url": f"https://www.youtube.com/watch?v={yid}"}
                    st.say(f"the sound could not be fetched; {len(segments)} lines of the video's published captions used instead")
            meta["youtube_id"] = yid
        else:
            with store.stage(tid, "Fetcher: the video's sound", "upload (no model)") as st:
                path = upload
                if not path or not os.path.isfile(path):
                    raise FetchError("the uploaded file is no longer there; upload it again")
                wrong = container_problem(path)
                if wrong:
                    raise FetchError(wrong[0].upper() + wrong[1:])
                meta = {"title": brief.get("title") or os.path.splitext(os.path.basename(path))[0], "file": os.path.basename(path),
                        "duration": duration_of(path)}
                st.say(f"{meta['file']}: {os.path.getsize(path) / 1e6:.1f} MB, {stamp(meta['duration'])} of sound")
        d = str(meta.get("upload_date") or "")
        meta["published"] = f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 else ""
        meta["channel"] = meta.get("channel") or meta.get("uploader") or ""
        if not used_captions:
            with store.stage(tid, f"Transcriber: Whisper {WHISPER_MODEL} on this machine", f"whisper-{WHISPER_MODEL} (faster-whisper)") as st:
                length = float(meta.get("duration") or 0) or duration_of(path)
                if length:
                    st.expect(length / SPEED + (0 if "m" in _MODELS else LOAD_SECONDS))
                if _RUN.locked():                # several recordings were attached: they are heard one at a time
                    st.say("in line behind another recording; recordings are transcribed one at a time")
                    with _RUN:
                        pass
                    if length:
                        st.expect(length / SPEED)
                st.say(f"loading the model and listening to {stamp(length)} of sound" if length else "loading the model and listening")
                t0 = time.time()

                def progress(done, total):
                    st.say(f"{stamp(done)} of {stamp(total)} transcribed")
                    if done > 30:                     # the expected time follows the pace this recording is going at
                        st.expect((time.time() - t0) * total / done)
                segments, info = transcribe(path, progress)
                st.say(f"{len(segments)} segments, {stamp(info['duration'])} of sound, language {info['language']}")
        else:
            info = {"language": "en", "duration": segments[-1]["end"] if segments else 0,
                    "model": "the video's published YouTube captions (its sound could not be fetched)"}
        if not segments:
            raise FetchError("no speech was found in the recording")
        paras = paragraphs(segments)
        with store.stage(tid, "Writer: transcript files", "code (no model)") as st:
            got = files(folder, meta, segments, paras, info)
            st.say(f"{len(paras)} timestamped paragraphs; TXT, SRT, VTT, Markdown and JSON written")
        text = source_text(meta, paras)
        title = (meta.get("title") or "Recording")[:180]
        extra = {"publisher": f"YouTube: {meta['channel']}" if meta.get("youtube_id") and meta.get("channel") else ("YouTube" if meta.get("youtube_id") else ""),
                 "date": meta.get("published") or "", "author": meta.get("channel") or "", "duration_s": info.get("duration")}
        sid = transcripts.add_text_source(eid, title, text, "transcript", origin=f"video:{'youtube:' + meta['youtube_id'] if meta.get('youtube_id') else 'upload'}",
                                          url=meta.get("webpage_url") or "", extra=extra)
        chunks, archived = [], ""
        with store.stage(tid, "Archivist: chunks into the second brain", "HiC wiki and manifest (no model)") as st:
            src = next((u for u in transcripts.uploaded_sources(eid) if u["id"] == sid), None)
            try:
                found = secondbrain._manifest_chunks(eid, src) if src else []
                chunks = chunk_times(found, info.get("duration"), meta.get("youtube_id") or "")
                with open(os.path.join(folder, "chunks.json"), "w", encoding="utf-8") as fh:
                    json.dump({"source_id": sid, "chunks": chunks}, fh, ensure_ascii=False, indent=1)
                archived = f"{len(chunks)} manifest chunks"
                st.say(f"stored as {sid}; {len(chunks)} manifest chunks with their pointers and times")
            except hic.HicUnavailable as ex:
                archived = (f"Stored as {sid} in this engagement. The second brain (HiC) was not running, so it was not archived "
                            f"yet; it is archived the next time work is built from it. ({str(ex)[:120]})")
                st.say(archived)
            try:
                secondbrain.guide_later(eid, sid)
            except Exception:
                pass
        brand = brief.get("brand") or "nxt"
        hp = os.path.join(folder, "transcript.html")
        with open(hp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(page(eid, tid, meta, info, paras, chunks, sid, archived, brand))
        with open(os.path.join(folder, "slides.html"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(slides(meta, info, paras, brand))
        how = "from its published captions" if used_captions else f"by Whisper {WHISPER_MODEL} on this machine at no cost"
        summary = (f"Transcript ready: {meta.get('title') or 'recording'} ({stamp(info.get('duration') or 0)}), {len(segments)} segments in "
                   f"{len(paras)} paragraphs, {how}; stored as {sid}" + (f" with {len(chunks)} manifest chunks in the second brain" if chunks else "")
                   + "; downloads: TXT, Markdown, SRT, VTT, JSON")
        store.update_task(tid, status="done", result_path=hp, summary=summary, spent_usd=0.0)
        store.event("task_done", {"summary": summary, "source_id": sid}, eid, tid)
        try:                                     # the assistant's own memory knows the recording exists and where it is
            from . import memory
            eng = store.get_engagement(eid) or {}
            memory.remember_now(f"The recording \"{title[:90]}\" ({stamp(info.get('duration') or 0)}) is transcribed and held in the "
                                f"engagement \"{str(eng.get('title') or '')[:80]}\" as source {sid}", "video transcript")
        except Exception:
            pass
    except Exception as ex:
        msg = str(ex)[:500] if isinstance(ex, (FetchError, RuntimeError)) else f"{type(ex).__name__}: {str(ex)[:400]}"
        store.update_task(tid, status="failed", error=msg)
        store.event("task_failed", {"error": msg}, eid, tid)
    finally:
        up = str(brief.get("upload_path") or "")
        for f in os.listdir(folder) if os.path.isdir(folder) else []:     # the fetched sound is not kept; the transcript is
            if f.startswith("source."):
                try:
                    os.remove(os.path.join(folder, f))
                except OSError:
                    pass
        if up and os.path.isfile(up) and brief.get("delete_upload", True):
            try:
                os.remove(up)
            except OSError:
                pass


def start(eid, brief, idem_key=None):
    tid, created = store.create_task(eid, "video_transcript", brief, BUDGET_USD, idem_key)
    if created:
        threading.Thread(target=run, args=(tid,), daemon=True, name=f"task-{tid}").start()
    return tid, created


STR = {"type": "string"}
TOOLS = [
    {"name": "transcribe_video", "strict": False,
     "description": ("Start a background task that transcribes a video or recording on this machine and keeps the transcript: "
                     "a YouTube link (youtube.com or youtu.be) or a link to a video or audio page or file. Whisper large-v3 "
                     "(open weights) writes a timestamped transcript; it becomes the engagement's next source, is stored "
                     "in the second brain in chunks with manifest pointers, and can be downloaded as TXT, Markdown, SRT, VTT "
                     "and JSON. Use it whenever the person gives a video link or asks for a transcript (#transcribe). A video "
                     "file the person uploads is transcribed by the upload itself; do not call this for an upload. url: the "
                     "link exactly as given. title: optional. No cost; a few minutes per ten minutes of speech."),
     "input_schema": {"type": "object", "additionalProperties": False, "required": ["engagement_id", "url"],
                      "properties": {"engagement_id": STR, "url": STR, "title": STR,
                                     "brand": {"type": "string", "enum": ["deciem", "nu", "nxt"]}}}},
]


def execute(name, args):
    try:
        if name != "transcribe_video":
            return {"error": f"unknown tool {name}"}
        eid = str(args.get("engagement_id") or "")
        if not store.get_engagement(eid):
            return {"error": "no such engagement; list_engagements shows the ids"}
        m = URL.search(str(args.get("url") or ""))
        if not m:
            return {"error": "give the video's link (a YouTube link or a link to a video or audio file)"}
        url = m.group(0).rstrip(").,;")
        if not model_ready():
            return {"error": f"the Whisper {WHISPER_MODEL} weights are not on this machine yet, so nothing can be transcribed"}
        from . import deck
        brief = {"url": url, "title": str(args.get("title") or "").strip()[:180], "brand": deck.brand_id(args.get("brand"))}
        idem = hashlib.sha256(f"{eid}|{url}".encode()).hexdigest()
        row = store.conn().execute("SELECT status FROM tasks WHERE idem_key = ?", (idem,)).fetchone()
        if row and row["status"] in ("failed", "stopped"):
            idem = hashlib.sha256(f"{eid}|{url}|{time.time()}".encode()).hexdigest()
        tid, created = start(eid, brief, idem)
        return {"task_id": tid, "engagement_id": eid, "started": created,
                "message": ("started: the transcript appears as its own card, with download links, when it is done"
                            if created else "this link was already transcribed in this engagement; reporting that task")}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {str(e)[:300]}"}
