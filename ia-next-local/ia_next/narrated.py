"""The video overview: the audio overview's two voices played over the engagement's own slides, as one MP4.

Gemini Notebook's Video Overview is a narrated slideshow. Its captured run of 9 Nov (5:07, "Managing Meta's Muse AI")
collapsed twelve sources into one, opened with "We are going to", and carried no attribution. The local five-second
clips (localmedia.video) are single shots, not an overview. So the overview is assembled from two things this build
already makes and checks:

- the narration is the audio overview of the engagement: every turn cited, each quotation checked and attributed aloud,
  no greeting and no talk about the show (audio.py);
- the pictures are the engagement's most recent deck, slide by slide, or its most recent picture when there is no deck.

Nothing is generated here and no model is called: the slides are shown in order for equal shares of the narration and
the sound is the voices as rendered. It is made on request, kept beside the audio, and served like any other file.
"""
import hashlib
import io
import os
import uuid
import threading
import zipfile

from . import store

W, H, FPS = 1280, 720, 8


_LOCKS = {}                          # one video made at a time for each audio overview


class NotReady(ValueError):
    """Something the video is made from does not exist yet; the message says what to make first."""


def _latest(eid, kind):
    for t in store.list_tasks(eid, limit=200):
        if t["kind"] == kind and t["status"] == "done":
            return store.get_task(t["id"])
    return None


def stills(eid):
    """(PNG bytes in order, where they came from): the newest finished deck's slides, else the newest picture."""
    from . import exporter
    deck = _latest(eid, "deck")
    if deck:
        try:
            data, name, _ = exporter.make(deck, "png")
            if name.endswith(".zip"):
                z = zipfile.ZipFile(io.BytesIO(data))
                pics = [z.read(n) for n in sorted(z.namelist()) if n.lower().endswith(".png")]
            else:
                pics = [data]
            if pics:
                return pics, f"the {len(pics)} slides of the newest deck"
        except exporter.ExportError:
            pass
    pic = _latest(eid, "diagram")
    if pic:
        try:
            data, name, _ = exporter.make(pic, "png")
            if not name.endswith(".zip"):
                return [data], "the newest picture"
        except exporter.ExportError:
            pass
    raise NotReady("make a deck or a picture in this engagement first: the video shows them while the overview plays")


PUSH = 0.05                         # each picture grows by this share while it is on screen
STEP = 3                            # frames between movements of the push-in


def encode(pngs, mp3, path=None):
    """One MP4 (H.264 and AAC): the pictures in order, each for an equal share of the sound, each pushed in slowly
    and faded into the next (20 Nov: still slides under a voice read as a slideshow). Returns bytes.
    Written to a file, the index (moov) is moved to the front (faststart): with it at the end, a browser's player had
    to fetch all twenty megabytes before it could start, and the owner saw a video that did not load (22 Nov)."""
    import av
    from PIL import Image
    with av.open(io.BytesIO(mp3)) as src:
        a_in = src.streams.audio[0]
        seconds = float(src.duration / av.time_base) if src.duration else 0.0
        frames_in = [f for f in src.decode(a_in)]
    if not frames_in or seconds <= 1:
        raise NotReady("the audio overview's voices could not be read; make the voices again")
    out = io.BytesIO()
    with av.open(out, "w", format="mp4") as c:
        v = c.add_stream("h264", rate=FPS)
        v.width, v.height, v.pix_fmt = W, H, "yuv420p"
        a = c.add_stream("aac", rate=44100)
        total = max(1, round(seconds * FPS))
        per = max(1, total // len(pngs))
        n, prev = 0, None
        for i, png in enumerate(pngs):
            im = Image.open(io.BytesIO(png)).convert("RGB")
            im.thumbnail((W, H))
            canvas = Image.new("RGB", (W, H), "white")
            canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
            count = per if i < len(pngs) - 1 else max(1, total - n)
            fade = min(FPS // 2, count // 4)                 # half a second in from the picture before
            still = None
            for k in range(count):
                if k % STEP == 0 or still is None:          # the push-in moves every few frames; the eye reads it as slow
                    z = 1.0 + PUSH * k / max(1, count - 1)
                    cw, ch = int(W / z) // 2 * 2, int(H / z) // 2 * 2
                    still = canvas.crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2)).resize((W, H), Image.BILINEAR)
                shot = Image.blend(prev, still, (k + 1) / (fade + 1)) if prev is not None and k < fade else still
                frame = av.VideoFrame.from_image(shot)
                frame.pts = n
                n += 1
                for pk in v.encode(frame):
                    c.mux(pk)
            prev = still
        for pk in v.encode():
            c.mux(pk)
        res = av.AudioResampler(format="fltp", layout="mono", rate=44100)
        for f in frames_in:
            for g in res.resample(f):
                for pk in a.encode(g):
                    c.mux(pk)
        for g in res.resample(None):
            for pk in a.encode(g):
                c.mux(pk)
        for pk in a.encode():
            c.mux(pk)
    data = faststart(out.getvalue())
    if path:
        with open(path, "wb") as fh:
            fh.write(data)
    return data


_CONTAINERS = {b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts", b"dinf", b"udta", b"mvex"}


def _boxes(buf, start, end):
    """(type, offset, size, header) of each box between start and end."""
    i = start
    while i + 8 <= end:
        size, typ, head = int.from_bytes(buf[i:i + 4], "big"), bytes(buf[i + 4:i + 8]), 8
        if size == 1:
            size, head = int.from_bytes(buf[i + 8:i + 16], "big"), 16
        elif size == 0:
            size = end - i
        if size < head:
            return
        yield typ, i, size, head
        i += size


def faststart(data):
    """The MP4 with its index (moov) moved in front of the media (mdat), every chunk offset moved by the index's size;
    what the qt-faststart tool does. With the index at the end a browser must fetch the whole file before playing.
    22 Nov: the encoder's own "+faststart" option, writing through PyAV, produced a file with no readable streams."""
    top = list(_boxes(data, 0, len(data)))
    kinds = [b[0] for b in top]
    if b"moov" not in kinds or b"mdat" not in kinds or kinds.index(b"moov") < kinds.index(b"mdat"):
        return data
    _, mo, ms, _ = top[kinds.index(b"moov")]
    moov = bytearray(data[mo:mo + ms])

    def shift(buf, start, end):
        for typ, i, size, head in _boxes(buf, start, end):
            if typ in _CONTAINERS:
                shift(buf, i + head, i + size)
            elif typ in (b"stco", b"co64"):
                n = int.from_bytes(buf[i + 12:i + 16], "big")
                w = 4 if typ == b"stco" else 8
                for k in range(n):
                    o = i + 16 + w * k
                    v = int.from_bytes(buf[o:o + w], "big") + ms
                    if w == 4 and v >= 2 ** 32:
                        raise ValueError("chunk offset too large for stco")
                    buf[o:o + w] = v.to_bytes(w, "big")
    shift(moov, 8, len(moov))
    first_media = top[kinds.index(b"mdat")][1]
    out = bytearray()
    for typ, i, size, _ in top:
        if i == first_media:
            out += moov
        if typ != b"moov":
            out += data[i:i + size]
    return bytes(out)


def path_of(t):
    """The file of a finished audio overview's video, made when missing. Returns (path, note)."""
    build(t)
    eid, tid = t["engagement_id"], t["id"]
    folder = store.safe_path(eid, f"results/tasks/{tid}")
    got = sorted((os.path.join(folder, f) for f in os.listdir(folder) if f.startswith("overview-") and f.endswith(".mp4")),
                 key=os.path.getmtime)
    if not got:
        raise NotReady("the video overview could not be written")
    return got[-1]


def build(t):
    """(mp4 bytes, file name, note) for a finished audio overview whose voices exist. Cached beside the audio."""
    if not t or t.get("kind") != "audio_overview" or t.get("status") != "done":
        raise NotReady("a video overview is made from a finished audio overview")
    eid, tid = t["engagement_id"], t["id"]
    mp3_path = store.safe_path(eid, f"results/tasks/{tid}/audio.mp3")
    if not os.path.isfile(mp3_path) or os.path.getsize(mp3_path) < 2000:
        raise NotReady("make the voices of this audio overview first: the video plays them over the slides")
    pngs, where = stills(eid)
    with open(mp3_path, "rb") as fh:
        mp3 = fh.read()
    key = hashlib.sha256(b"faststart2|" + mp3 + b"".join(hashlib.sha256(p).digest() for p in pngs)).hexdigest()[:20]
    path = store.safe_path(eid, f"results/tasks/{tid}/overview-{key}.mp4")
    with _LOCKS.setdefault(tid, threading.Lock()):        # 22 Nov: two requests at once wrote the same file and one failed
        if os.path.isfile(path) and os.path.getsize(path) > 10_000:
            with open(path, "rb") as fh:
                return fh.read(), "video-overview.mp4", where
        part = f"{path}.{uuid.uuid4().hex[:8]}.part.mp4"
        data = encode(pngs, mp3, part)
        os.replace(part, path)
    for old in os.listdir(os.path.dirname(path)):          # one kept video per audio overview
        if old.startswith("overview-") and old.endswith(".mp4") and old != os.path.basename(path):
            try:
                os.remove(os.path.join(os.path.dirname(path), old))
            except OSError:
                pass
    store.event("video_overview_made", {"stills": len(pngs), "from": where, "bytes": len(data)}, eid, tid)
    return data, "video-overview.mp4", where
