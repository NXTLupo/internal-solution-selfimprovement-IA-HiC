"""The old research system's second brain, migrated into the IA Next Library (owner, 26 Nov 2026).

"The original Humans in Control has over $1000 worth of collected data in its wiki/manifest (second brain) that is gone
from the new IA Next Local Library ... I WANT ALL PRIOR DATA IN My LIBRARY, selectable for engagements, chunked, tagged,
manifest indexed, recallable by the AI chat, usable as source material for deliverables and artifacts, browsable, cited,
and linked back to source articles and documentation. I want it all neat, tidy, organized." And: "If the full text was
never stored, I want you to use IA Next to find and restore ALL of those data", with deep crawling past doorway pages.

Read-only on the old wiki (mounted at IA_NEXT_HIC_WIKI). Rebuilt from the pages on disk, never from the old vector store
(the audit found 1,724 deleted pages, 27 JSON files and 4,832 mismatched pages in it). Three phases, each safe to run
again (a page whose text has not changed is not rewritten; a restored address is not fetched twice):

1. import: every page is read, labelled by kind (article, Reddit post, client document, transcript, HiC analysis,
   reference), cleaned (reader preambles, repeated title and source lines, link markup, damaged characters), given an ISO
   date and one publisher name, and collapsed with its duplicates (same address, or same text for documents with none);
   the best copy is stored whole in the Library with every copy's path and project kept as provenance, and cut into
   passages (chunking.py). Operational pages (engagement state, lint and compile reports, design notes) stay in HiC.
2. embed: every passage gets a vector (librarysearch.embed_pending).
3. restore: every collected article with a real address is read again with the deep reader (pagetext.py): pages capped
   at 10,000 characters, 500-character snippets, bot walls, boilerplate and doorway pages first, then the rest. The fresh
   text replaces the stored one only when it is the same document and clearly more of it (or the stored one was junk);
   the result, the document actually read and the reason for any failure are recorded per page.
"""
import hashlib
import json
import os
import re
import threading
import time
import urllib.parse

from . import currency, library, librarysearch, pagetext, store

WIKI_DIR = os.environ.get("IA_NEXT_HIC_WIKI", "/hic-wiki")
COLLECTION = "HiC library"

SKIP_PREFIX = ("engagements/", "feedback/", "user-selections/", "chunk-maps/", "eval/", "design-system/", "brand/", "exemplars/")
SKIP_FILES = ("index.md", "log.md")
SKIP_RX = re.compile(r"^synthesis/(?:lint|compile)[-_]", re.I)
ANALYSIS_PREFIX = ("articles/nxt-insight/", "articles/hic-theme-synthesis/", "articles/gemini-focused-research/", "articles/backfill-probe",
                   "synthesis/", "deep-research/", "known-gaps/", "evidence/", "industries/", "sources/")
REFERENCE_PREFIX = ("frameworks/", "methodologies/", "benchmarks/", "mentors/", "anti-patterns/", "inspiration-hub/", "presentations/",
                    "prototypes/", "sources-registry/")
UPLOAD_PREFIX = ("uploads/", "articles/client-uploads/", "articles/cached-reuse-")
REDDIT_PREFIX = ("social-intelligence/", "articles/reddit-")
EVIDENCE = ("article", "reddit", "document", "transcript", "video")

STATE = {"running": False, "phase": "", "started": 0.0, "done": {}, "error": "", "progress": "", "paused": 0.0}
_RUN = threading.Lock()


# ---- yielding to the person's work ----------------------------------------------------------------------------------
# 26 Nov: the restore phase (24 page readers, the browser reader four pages at a time, passages embedded alongside) ran
# for 21 of the 24 minutes a deep research run spent collecting; the run's own page reads waited behind it. Migration
# work is background work: it waits while a task, a plan or a model call of the person's is in flight, and says so.
_BUSY = {"at": 0.0, "busy": False}
_BUSY_LOCK = threading.Lock()


BACKGROUND_KINDS = ("dreaming", "skill_check", "model_check")    # the system's own idle work, never the person's (27 Nov:
                                                                # a skill re-check counted itself and paused after one case)


def foreground_busy(ttl=2.0):
    """A task (not the system's own background work), a running plan, or a chat turn's model call is in flight."""
    with _BUSY_LOCK:
        if time.time() - _BUSY["at"] < ttl:
            return _BUSY["busy"]
        busy = False
        try:
            busy = any(t["status"] in ("queued", "running", "stopping") and t["kind"] not in BACKGROUND_KINDS
                       for t in store.list_tasks(limit=200))
            if not busy:
                from . import plan
                busy = bool(plan._db().execute("SELECT 1 FROM plans WHERE status = 'running' LIMIT 1").fetchone())
            if not busy:
                from . import lanes
                busy = lanes.model_call_active()
        except Exception:
            busy = False
        _BUSY.update(at=time.time(), busy=busy)
        return busy


def yield_to_foreground(note=None, poll=5.0, busy=None):
    """Wait while the person's work runs; the pause shows in the migration's progress line and as an event."""
    busy = busy or foreground_busy
    if not busy():
        return 0.0
    t0 = time.time()
    with _BUSY_LOCK:
        first = not STATE.get("paused_since")
        if first:
            STATE["paused_since"] = t0
    if first:
        store.event("library_migration_paused", {"phase": STATE.get("phase"), "why": "your work is running"})
        if note:
            note("paused while your work runs; the migration continues when it finishes")
    while busy():
        time.sleep(poll)
    waited = time.time() - t0
    with _BUSY_LOCK:
        since = STATE.pop("paused_since", None)
        if since:
            STATE["paused"] = round(STATE.get("paused", 0.0) + (time.time() - since), 1)
            store.event("library_migration_resumed", {"phase": STATE.get("phase"), "paused_seconds": round(time.time() - since, 1)})
    return waited


# ---- reading a page -------------------------------------------------------------------------------------------------
def parse_front(raw):
    """(top-level frontmatter fields, body). Only unindented keys are read (the old pages nest a chunk list in theirs);
    inline lists [a, b] and block lists ("- a" under a key) become lists."""
    meta, body = {}, raw
    if not raw.startswith("---"):
        return meta, body
    end = raw.find("\n---", 3)
    if end < 0:
        return meta, body
    key = None
    for line in raw[3:end].splitlines():
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m:
            key, val = m.group(1).lower(), m.group(2).strip()
            if val.startswith("[") and val.endswith("]"):
                meta[key] = [v.strip().strip("\"'") for v in val[1:-1].split(",") if v.strip()]
            else:
                meta[key] = val.strip("\"'")
            continue
        if key and re.match(r"^\s+-\s+", line) and meta.get(key) in ("", None, []):
            meta[key] = [] if meta.get(key) in ("", None) else meta[key]
            if isinstance(meta[key], list):
                meta[key].append(re.sub(r"^\s+-\s+", "", line).strip().strip("\"'"))
        elif not line.startswith((" ", "\t")):
            key = None
    return meta, raw[end + 4:]


def classify(path, meta):
    """The page's kind, or (None, why) for a page that stays in the old system."""
    if not path.endswith(".md") or path in SKIP_FILES or path.startswith(SKIP_PREFIX) or SKIP_RX.search(path):
        return None, "operational page (state, reports, design notes)"
    if meta.get("alias_of"):
        return None, "alias page (points to another page)"
    if path.startswith(ANALYSIS_PREFIX):
        return "analysis", ""
    if path.startswith(REFERENCE_PREFIX):
        return "reference", ""
    if path.startswith(UPLOAD_PREFIX):
        return "document", ""
    if path.startswith(REDDIT_PREFIX) or str(meta.get("kind") or "").lower() == "social-post":
        return "reddit", ""
    if path.startswith("transcripts/"):
        return "transcript", ""
    if path.startswith("articles/"):
        return "article", ""
    return "reference", ""


def youtube_id(url):
    from . import videotranscript
    return videotranscript.youtube_id(url)


REDDIT_POST = re.compile(r"(?i)^https?://(?:[a-z]+\.)?reddit\.com/r/([^/]+)/comments/")


_TRACKING = re.compile(r"^(utm_|fbclid|gclid|mc_|ref$|ref_|cmpid|sr_share|igshid)", re.I)


def canon_url(u):
    """One form per address: https, no www, no tracking parameters, no fragment, no trailing slash; Reddit hosts merged."""
    u = str(u or "").strip()
    if not u.lower().startswith("http"):
        return ""
    try:
        p = urllib.parse.urlsplit(u)
    except ValueError:
        return ""
    host = (p.hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    if host.endswith("reddit.com"):
        host = "reddit.com"
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True) if not _TRACKING.match(k)]
    path = re.sub(r"/+$", "", p.path) or "/"
    return f"https://{host}{path}" + ("?" + urllib.parse.urlencode(q) if q else "")


def clean_link(u):
    """The address as a reader should follow it: the site's own form (scheme, host and path untouched), without
    tracking parameters (utm_, fbclid and the like) or a fragment."""
    u = str(u or "").strip()
    try:
        p = urllib.parse.urlsplit(u)
    except ValueError:
        return u
    if not p.scheme.lower().startswith("http"):
        return u
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True) if not _TRACKING.match(k)]
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(q) if q else "", ""))


_MOJI = {"â\u0080\u0099": "’", "â\u0080\u009c": "“", "â\u0080\u009d": "”", "â\u0080\u0093": "–",
         "â\u0080\u0094": "—", "â\u0080¦": "…", "Â ": " ", "â€™": "’",
         "â€œ": "“", "â€\u009d": "”", "â€“": "–", "â€”": "—"}


def fix_mojibake(s):
    """Text decoded with the wrong code page ("donâ€™t") read back as written ("don’t"), line by line."""
    if "â" not in s and "Ã" not in s and "Â" not in s:
        return s
    out = []
    for line in s.split("\n"):
        if "â" in line or "Ã" in line or "Â" in line:
            try:
                fixed = line.encode("cp1252").decode("utf-8")
                line = fixed
            except (UnicodeEncodeError, UnicodeDecodeError):
                for bad, good in _MOJI.items():
                    line = line.replace(bad, good)
        out.append(line)
    return "\n".join(out)


_LINK = re.compile(r"\[[^\]]*\]\([^)]*\)")


def clean_body(body, title=""):
    """The page's own text: no reader preamble, no repeated title or "Source:" line, link markup to plain words."""
    b = str(body or "")
    b = re.sub(r"(?m)^(?:Title|URL Source|Published Time|Markdown Content|Warning|Number of Pages):.*$", "", b)
    b = re.sub(r"(?m)^\s*Source:\s*\[[^\]]*\]\([^)]*\)\s*$", "", b)
    b = re.sub(r"(?m)^\s*Final URL:\s*\S+\s*$", "", b)
    if title:
        b = re.sub(r"(?m)^#{1,2}\s+(.+)$", lambda m: "" if _norm(m.group(1)) == _norm(title) else m.group(0), b, count=1)
    b = library.clean(b)
    return pagetext.tidy(fix_mojibake(b))


def _norm(s):
    return " ".join(re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).split())


def link_share(body):
    t = str(body or "")
    return sum(len(m) for m in _LINK.findall(t)) / max(1, len(t))


def iso_date(meta):
    for k in ("date", "published", "published_at", "pubdate", "created_utc"):
        d = currency.parse_date(meta.get(k)) if meta.get(k) not in (None, "", []) else ""
        if d:
            return d
    return ""


def readable_project(slug):
    """A project slug as a person reads it. IA Next once archived its own sources into the old wiki under its engagement
    ids (eng_ and 12 hex digits); those read as the engagement's title."""
    m = re.fullmatch(r"(?i)eng[_ ]([0-9a-f]{12})", str(slug or "").strip())
    if m:
        return (store.get_engagement("eng_" + m.group(1).lower()) or {}).get("title") or "An IA Next engagement"
    s = re.sub(r"[-_]+", " ", str(slug or "")).strip()
    s = re.sub(r"^\d+\s+", "", s)
    s = s[:1].upper() + s[1:]
    return (s[:70].rsplit(" ", 1)[0] + "...") if len(s) > 72 else s


def publisher_of(meta, path, url, kind):
    if kind == "reddit":
        sub = str(meta.get("subreddit") or "").strip().lstrip("r/").strip()
        if not sub:
            m = re.search(r"reddit\.com/r/([^/]+)", url or "")
            sub = m.group(1) if m else ""
        return f"Reddit r/{sub}" if sub else "Reddit"
    src = str(meta.get("source") or "").strip()
    src = re.sub(r"(?i)\s*\((?:rss|atom|feed|api)\)\s*$", "", src)
    src = re.sub(r"(?i)^reddit[- ]deep:\s*", "Reddit ", src)
    if not src or src.lower() in ("gemini", "web", "jina", "jina-reader", "article"):
        host = (urllib.parse.urlsplit(url).hostname or "") if url else ""
        src = host[4:] if host.startswith("www.") else host
    if not src and kind == "document":
        return "Client upload"
    if not src:
        src = path.split("/")[1].replace("-", " ") if path.startswith("articles/") and path.count("/") >= 2 else ""
    return src.replace("_", " ").strip()[:120]


# ---- phase 1: import ------------------------------------------------------------------------------------------------
def scan(root=WIKI_DIR):
    """One record per wiki page (no text kept): path, kind, fields, flags; and counts of what stays behind."""
    recs, skipped = [], {}
    for dp, _dn, files in os.walk(root):
        for f in files:
            if not f.endswith(".md"):
                continue
            full = os.path.join(dp, f)
            path = os.path.relpath(full, root).replace(os.sep, "/")
            early, why = classify(path, {})
            if not early:                        # operational pages are skipped before they are read (a lint report is 273 MB)
                skipped[why] = skipped.get(why, 0) + 1
                continue
            try:
                if os.path.getsize(full) > 25 * 1024 * 1024:
                    skipped["larger than 25 MB (a report, not a source)"] = skipped.get("larger than 25 MB (a report, not a source)", 0) + 1
                    continue
                raw = open(full, encoding="utf-8", errors="replace").read()
            except OSError:
                skipped["unreadable"] = skipped.get("unreadable", 0) + 1
                continue
            meta, body = parse_front(raw)
            kind, why = classify(path, meta)
            if not kind:
                skipped[why] = skipped.get(why, 0) + 1
                continue
            url = str(meta.get("url") or meta.get("source_url") or "")
            gemini = path.startswith("articles/gemini/") and ("vertexaisearch" in url or str(meta.get("source", "")).lower() == "gemini")
            if gemini:                           # a model's summary of a page: analysis until the page itself is read again
                m = re.search(r"(?im)^\s*Final URL:\s*(https?://\S+)", body)
                url = m.group(1).rstrip(").,") if m else ""
                kind = "analysis"
            url = clean_link(url) if url.lower().startswith("http") else ""
            if kind == "article" and REDDIT_POST.search(url):     # a Reddit post saved under an articles/ folder is a Reddit post
                kind = "reddit"
            video_page = kind == "article" and bool(youtube_id(url))   # a video HiC kept only as its title and description
            if kind in ("article", "transcript") and youtube_id(url):
                kind = "video"
            title = str(meta.get("title") or "").strip() or (re.search(r"(?m)^#\s+(.+)$", body).group(1).strip() if re.search(r"(?m)^#\s+(.+)$", body) else f[:-3])
            text = clean_body(body, title)
            words = len(text.split())
            flags = ["not transcribed yet"] if video_page else []
            if str(meta.get("chars") or "") == "10000" or (9900 <= len(body) <= 10100 and not re.search(r"[.!?\"')\]]\s*$", body.strip())):
                flags.append("cut at 10,000 characters")
            if kind == "article" and len(text) <= 700:
                flags.append("snippet")
            if pagetext.is_blocked(text):
                flags.append("bot wall or error page")
            if link_share(body) > 0.5:
                flags.append("navigation boilerplate")
            if words < 50:
                flags.append("near empty")
            if gemini:
                flags.append("model summary of a page")
            projects = meta.get("engagement") or ""
            projects = projects if isinstance(projects, list) else re.split(r"\s*[,;|]\s*", projects) if projects else []
            sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
            key = canon_url(url) if url else ""
            if not key or kind in ("document", "analysis", "reference"):
                key = key if (key and kind != "document") else "h:" + hashlib.sha256(_norm(text[:4000]).encode()).hexdigest()
            recs.append({"path": path, "kind": kind, "url": url, "key": key, "title": title[:300], "date": iso_date(meta),
                         "retrieved": currency.parse_date(meta.get("collected_at") or meta.get("extracted_at")) or "",
                         "publisher": publisher_of(meta, path, url, kind), "subreddit": str(meta.get("subreddit") or ""),
                         "industries": meta.get("industries") if isinstance(meta.get("industries"), list) else [],
                         "projects": [p for p in projects if p], "chars": len(text), "words": words, "flags": flags, "sha": sha,
                         "sensitive": int(kind == "document" or bool(re.search(r"(?i)\bpass(?:word|code)\s*[:=]", text)))})
    return recs, skipped


_PREFER = {"social-intelligence/": 3, "transcripts/": 2, "uploads/": 2}


def dedupe(recs):
    """The best copy per address (or per text, for documents with no address), with every copy's path and project."""
    groups = {}
    for r in recs:
        groups.setdefault(r["key"], []).append(r)
    winners = []
    for key, g in groups.items():
        bad = lambda r: any(f in r["flags"] for f in ("bot wall or error page", "near empty", "navigation boilerplate"))
        best = max(g, key=lambda r: (r["kind"] in EVIDENCE, not bad(r), max((v for p, v in _PREFER.items() if r["path"].startswith(p)), default=0),
                                     r["chars"]))                # a collected copy wins over a model's summary of it
        w = dict(best)
        w["copies"] = sorted(r["path"] for r in g if r is not best)
        w["projects"] = sorted({p for r in g for p in r["projects"]})
        w["industries"] = sorted({i for r in g for i in r["industries"]})
        winners.append(w)
    return winners


def _canonical_publishers(winners):
    """One spelling per publisher: the most common display form among names that differ only in case and punctuation."""
    forms = {}
    for w in winners:
        k = re.sub(r"[^a-z0-9]+", "", w["publisher"].lower())
        forms.setdefault(k, {}).setdefault(w["publisher"], 0)
        forms[k][w["publisher"]] += 1
    pick = {k: max(v.items(), key=lambda kv: (kv[1], any(ch.isupper() for ch in kv[0])))[0] for k, v in forms.items()}
    for w in winners:
        w["publisher"] = pick[re.sub(r"[^a-z0-9]+", "", w["publisher"].lower())]


def tags_for(w):
    t = list(w["industries"])
    if w["subreddit"]:
        t.append("r/" + w["subreddit"].lstrip("r/"))
    t += [readable_project(p) for p in w["projects"][:3]]
    seen, out = set(), []
    for x in t:
        k = x.lower()
        if x and k not in seen:
            seen.add(k)
            out.append(x)
    return out[:12]


def write(winners, root=WIKI_DIR, on_progress=None):
    """Each winner stored whole in the Library, its passages cut; unchanged pages are left as they are."""
    c = librarysearch.ensure_schema()
    eid = library.library_engagement()
    have = {r["wiki_path"]: (r["evidence_id"], r["sha"]) for r in c.execute("SELECT evidence_id, wiki_path, sha FROM library_meta")}
    added = updated = same = 0
    for i, w in enumerate(winners):
        old = have.get(w["path"])
        if old and old[1] == w["sha"]:
            same += 1
            continue
        raw = open(os.path.join(root, w["path"]), encoding="utf-8", errors="replace").read()
        meta, body = parse_front(raw)
        text = clean_body(body, w["title"])
        url = w["url"] if w["url"] else ""
        with store._LOCK:
            if old:
                ev = old[0]
                c.execute("UPDATE evidence SET text = ?, title = ?, url = ? WHERE id = ?", (text, w["title"], url, ev))
                updated += 1
            else:
                ev = store.new_id("ev")
                c.execute("INSERT INTO evidence VALUES (?,?,?,?,?,?,?)", (ev, eid, "L:" + w["path"], url, w["title"], text, time.time()))
                added += 1
            c.execute("INSERT OR REPLACE INTO library_meta (evidence_id, wiki_path, kind, collection, title, url, document_url, publisher, date, "
                      "retrieved, projects, copies, tags, subreddit, words, sha, flags, restored, sensitive, is_evidence, updated) "
                      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                      (ev, w["path"], w["kind"], COLLECTION, w["title"], url, "", w["publisher"], w["date"], w["retrieved"],
                       json.dumps([readable_project(p) for p in w["projects"]]), json.dumps(w["copies"]), json.dumps(tags_for(w)),
                       w["subreddit"], w["words"], w["sha"], json.dumps(w["flags"]), "", w["sensitive"], int(w["kind"] in EVIDENCE),
                       time.time()))
            c.execute("INSERT OR REPLACE INTO evidence_extra (id, date, vec, checked) VALUES (?, ?, NULL, NULL)", (ev, w["date"]))
        librarysearch.index_page(ev, w["title"], text)
        if on_progress and i % 250 == 0:
            on_progress(f"{i + 1:,} of {len(winners):,} pages written")
    return {"added": added, "updated": updated, "unchanged": same}


# ---- phase 3: restore -----------------------------------------------------------------------------------------------
def same_document(stored, fresh, title, stored_is_junk=False):
    """True when a fresh read is the page that was stored: most of the stored text's distinctive words are in it (or,
    when what was stored was junk, most of the title's words are)."""
    fw = set(re.findall(r"[a-z]{4,}", (fresh or "").lower()))
    if not fw:
        return False
    tw = [w for w in re.findall(r"[a-z]{4,}", (title or "").lower()) if w not in library.STOP]
    if stored_is_junk or len((stored or "").split()) < 60:
        return bool(tw) and sum(w in fw for w in tw) / len(tw) >= 0.6
    from collections import Counter
    words = [w for w in re.findall(r"[a-z]{5,}", (stored or "").lower()) if w not in library.STOP]
    top = [w for w, _n in Counter(words).most_common(40)]
    return bool(top) and sum(w in fw for w in top) / len(top) >= 0.55


_HOST_LOCKS, _HOST_GUARD = {}, threading.Lock()


def _host_lock(url):
    h = urllib.parse.urlsplit(url).hostname or ""
    with _HOST_GUARD:
        return _HOST_LOCKS.setdefault(h, threading.Lock())


def restore_one(ev, meta, read=pagetext.read):
    """Read one migrated article again; replace its text when the fresh read is the same document and clearly more of it."""
    c = librarysearch.ensure_schema()
    url = meta["url"]
    flags = json.loads(meta["flags"] or "[]")
    junk = any(f in flags for f in ("bot wall or error page", "navigation boilerplate", "near empty", "snippet", "model summary of a page"))
    if youtube_id(url):                          # a video is transcribed by the videos phase, not read as a page
        return "kept"
    if REDDIT_POST.search(url):                  # a Reddit page is not readable as a web page; Reddit's own reader collects posts
        with store._LOCK:
            c.execute("INSERT OR REPLACE INTO library_restore (url, status, via, document_url, chars, reason, at) VALUES (?,?,?,?,?,?,?)",
                      (url, "kept", "", "", 0, "a Reddit post: Reddit's reader collects posts, not the web page reader", time.time()))
        return "kept"
    if pagetext.is_index(url):                   # today's home page or section index is not the page that was collected
        with store._LOCK:
            c.execute("INSERT OR REPLACE INTO library_restore (url, status, via, document_url, chars, reason, at) VALUES (?,?,?,?,?,?,?)",
                      (url, "kept", "", "", 0, "a home page or section index: it changes daily, so the collected copy is kept", time.time()))
        return "kept"
    with _host_lock(url):
        got = read(url, deep=True)
        time.sleep(0.4)                          # one request at a time per site, with a pause
    row = c.execute("SELECT text FROM evidence WHERE id = ?", (ev,)).fetchone()
    stored = row["text"] if row else ""
    status, reason = "kept", ""
    if not got.get("ok"):
        status, reason = "failed", got.get("reason") or "no readable text"
    elif "model summary of a page" not in flags and not same_document(stored, got["text"], meta["title"], junk):
        # (a model's summary is checked by its address alone: its title was only the site's domain)
        status, reason = "kept", "the address now holds a different page"
    elif not junk and len(got["text"]) < max(int(len(stored) * 1.15), len(stored) + 300):
        status, reason = "kept", "the stored text was already complete"
    else:
        status = "restored"
    record = {"status": status, "via": got.get("via", ""), "document_url": got.get("url", "") if got.get("via") not in ("page", None) else "",
              "from_chars": len(stored), "to_chars": len(got.get("text") or ""), "reason": reason,
              "rendered": bool(got.get("rendered")), "gate": bool(got.get("clicked"))}
    with store._LOCK:
        c.execute("INSERT OR REPLACE INTO library_restore (url, status, via, document_url, chars, reason, at) VALUES (?,?,?,?,?,?,?)",
                  (url, status, record["via"], record["document_url"], record["to_chars"], reason, time.time()))
        if status == "restored":
            title = meta["title"] if meta["title"] and "gemini" not in meta["title"].lower() else (got.get("title") or meta["title"])
            c.execute("UPDATE evidence SET text = ?, title = ? WHERE id = ?", (got["text"], title, ev))
            date = meta["date"] or currency.parse_date(got.get("date")) or ""
            kind = "article" if meta["kind"] == "analysis" and "model summary of a page" in flags else meta["kind"]
            keep_flags = [f for f in flags if f not in ("cut at 10,000 characters", "snippet", "navigation boilerplate", "near empty",
                                                         "bot wall or error page", "model summary of a page")]
            c.execute("UPDATE library_meta SET restored = ?, document_url = ?, date = ?, title = ?, kind = ?, is_evidence = ?, flags = ?, "
                      "words = ?, updated = ? WHERE evidence_id = ?",
                      (json.dumps(record), record["document_url"], date, title, kind, int(kind in EVIDENCE), json.dumps(keep_flags),
                       len(got["text"].split()), time.time(), ev))
            c.execute("UPDATE evidence_extra SET date = ? WHERE id = ?", (date, ev))
        else:
            c.execute("UPDATE library_meta SET restored = ?, updated = ? WHERE evidence_id = ?", (json.dumps(record), time.time(), ev))
    if status == "restored":
        librarysearch.index_page(ev, meta["title"], got["text"])
    return status


def revert(ev, why="the followed link was not this page's document"):
    """Put the original wiki text back for a page a restore should not have replaced, and say so in its record."""
    c = librarysearch.ensure_schema()
    m = c.execute("SELECT * FROM library_meta WHERE evidence_id = ?", (ev,)).fetchone()
    if not m:
        return False
    raw = open(os.path.join(WIKI_DIR, m["wiki_path"]), encoding="utf-8", errors="replace").read()
    _meta, body = parse_front(raw)
    text = clean_body(body, m["title"])
    rec = json.loads(m["restored"] or "{}")
    rec.update(status="kept", reason="reverted: " + why)
    with store._LOCK:
        c.execute("UPDATE evidence SET text = ? WHERE id = ?", (text, ev))
        c.execute("UPDATE library_meta SET restored = ?, document_url = '', words = ?, updated = ? WHERE evidence_id = ?",
                  (json.dumps(rec), len(text.split()), time.time(), ev))
        c.execute("UPDATE library_restore SET status = 'kept', reason = ? WHERE url = ?", (rec["reason"], m["url"]))
    librarysearch.index_page(ev, m["title"], text)
    return True


def revert_index_follows():
    """Every home page or section index a restore replaced (with today's page, or a page one of its links led to) goes
    back to the copy that was collected: those pages change daily."""
    c = librarysearch.ensure_schema()
    n = 0
    for r in c.execute("SELECT m.evidence_id, r.url FROM library_restore r JOIN library_meta m ON m.url = r.url "
                       "WHERE r.status = 'restored'").fetchall():
        if pagetext.is_index(r["url"]):
            n += revert(r["evidence_id"], "a home page or section index changes daily; the collected copy is kept")
    return n


def restore_candidates(c=None):
    """Migrated articles with a real address not yet read again, the damaged ones first."""
    c = c or librarysearch.ensure_schema()
    rows = c.execute("SELECT m.* FROM library_meta m WHERE m.url LIKE 'http%' AND m.kind IN ('article', 'analysis') "
                     "AND NOT EXISTS (SELECT 1 FROM library_restore r WHERE r.url = m.url)").fetchall()
    rows = [dict(r) for r in rows if (r["kind"] == "article" or "model summary of a page" in (r["flags"] or "")) and not youtube_id(r["url"])]
    damaged = lambda r: any(f in (r["flags"] or "") for f in ("cut at", "snippet", "bot wall", "boilerplate", "near empty", "model summary"))
    rows.sort(key=lambda r: (not damaged(r), (r["words"] or 0) > 450))
    return rows


def retry_candidates(c=None):
    """Articles a restore could not improve that a real browser or the stricter link check may: the site refused the
    plain fetch (not a missing page), or the doorway led to a different page. A page already tried in a browser, a
    missing page and a reverted page are not tried again."""
    c = c or librarysearch.ensure_schema()
    rows = c.execute("SELECT m.* FROM library_restore r JOIN library_meta m ON m.url = r.url WHERE "
                     "(r.status = 'failed' AND r.reason NOT LIKE 'the site answered 404%' AND r.reason NOT LIKE 'the site answered 410%' "
                     "AND r.reason NOT LIKE 'the file is larger%' AND r.reason NOT LIKE '%in a browser:%') "
                     "OR (r.status = 'kept' AND r.reason = 'the address now holds a different page')").fetchall()
    return [dict(r) for r in rows]


def video_candidates(c=None):
    """Migrated YouTube videos HiC kept only as a title and description: each is transcribed (26 Nov). A video stays a
    candidate until it has a transcript (its "not transcribed yet" flag goes only then)."""
    c = c or librarysearch.ensure_schema()
    rows = c.execute("SELECT m.* FROM library_meta m WHERE (m.url LIKE '%youtube.com/%' OR m.url LIKE '%youtu.be/%') "
                     "AND m.flags LIKE '%not transcribed yet%'").fetchall()
    return [dict(r) for r in rows if youtube_id(r["url"])]


def whisper_candidates(c=None):
    """Migrated videos whose transcript came from published captions: the Whisper pass upgrades each one."""
    c = c or librarysearch.ensure_schema()
    rows = c.execute("SELECT m.* FROM library_meta m WHERE m.kind = 'video' AND m.restored LIKE '%video transcript%' "
                     "AND m.restored LIKE '%captions%'").fetchall()
    return [dict(r) for r in rows if youtube_id(r["url"])]


def transcribe_one(ev, meta, whisper="always", transcript=None, upgrade=False):
    """One migrated video read as its transcript: whisper "never" reads its published captions (seconds); "always" has
    Whisper large-v3 on this machine listen to it (the captions when its sound cannot be fetched). A description is
    replaced only by a real transcript; with upgrade, a captions transcript is replaced only by Whisper's."""
    from . import youtube
    c = librarysearch.ensure_schema()
    t = (transcript or youtube.transcript)(meta["url"], whisper=whisper)
    if t.get("refused"):                     # YouTube is refusing this machine for now: nothing recorded, the video stays queued
        return "refused"
    row = c.execute("SELECT text FROM evidence WHERE id = ?", (ev,)).fetchone()
    stored = row["text"] if row else ""
    if upgrade:
        heard = t.get("ok") and "whisper" in str(t.get("method") or "").lower()
        status = "restored" if heard else "kept"
        reason = "" if heard else (t.get("reason") or "its sound could not be transcribed; the captions transcript is kept")
        if not heard:                        # the captions transcript stays exactly as it is
            store.event("library_video_kept", {"url": meta["url"], "reason": reason[:200]})
            return "kept"
    else:
        status = "restored" if t.get("ok") and len(t.get("text") or "") > len(stored) else ("kept" if t.get("ok") else "failed")
        reason = "" if status == "restored" else (t.get("reason") or "the transcript was not longer than the description")
    record = {"status": status, "via": "video transcript", "document_url": t.get("url") or meta["url"], "from_chars": len(stored),
              "to_chars": len(t.get("text") or ""), "reason": reason, "method": t.get("method") or "", "duration": t.get("duration") or 0}
    flags = [f for f in json.loads(meta.get("flags") or "[]") if f != "not transcribed yet"] if status == "restored" else json.loads(meta.get("flags") or "[]")
    with store._LOCK:
        c.execute("INSERT OR REPLACE INTO library_restore (url, status, via, document_url, chars, reason, at) VALUES (?,?,?,?,?,?,?)",
                  (meta["url"], status, "video transcript", record["document_url"], record["to_chars"], reason, time.time()))
        if status == "restored":
            title = t.get("title") or meta["title"]
            date = meta.get("date") or t.get("date") or ""
            publisher = f"YouTube: {t['channel']}" if t.get("channel") else (meta.get("publisher") or "YouTube")
            c.execute("UPDATE evidence SET text = ?, title = ? WHERE id = ?", (t["text"], title, ev))
            c.execute("UPDATE library_meta SET restored = ?, document_url = ?, date = ?, title = ?, kind = 'video', is_evidence = 1, "
                      "flags = ?, publisher = ?, words = ?, updated = ? WHERE evidence_id = ?",
                      (json.dumps(record), record["document_url"], date, title, json.dumps(flags), publisher,
                       len(t["text"].split()), time.time(), ev))
            c.execute("UPDATE evidence_extra SET date = ? WHERE id = ?", (date, ev))
        else:
            c.execute("UPDATE library_meta SET restored = ?, updated = ? WHERE evidence_id = ?", (json.dumps(record), time.time(), ev))
    if status == "restored":
        librarysearch.index_page(ev, t.get("title") or meta["title"], t["text"])
    return status


def transcribe_videos(on_progress=None, whisper="never", limit=None, upgrade=False, pause=2.0):
    """Migrated videos one at a time: first every description-only video from its published captions (whisper "never"),
    then, with upgrade, every captions transcript replaced by Whisper large-v3's (whisper "always"; the transcriber uses
    most of the processor, and one video at a time keeps the requests to YouTube paced)."""
    rows = (whisper_candidates() if upgrade else video_candidates())[: limit or None]
    counts = {"restored": 0, "kept": 0, "failed": 0}
    for i, r in enumerate(rows):
        yield_to_foreground(on_progress)
        try:
            got = transcribe_one(r["evidence_id"], r, whisper=whisper, upgrade=upgrade)
        except Exception as e:
            store.event("library_video_error", {"url": r["url"], "error": str(e)[:200]})
            got = "failed"
        if got == "refused":                 # stop at once; the rest wait for the next pass
            counts["refused_at"] = i
            counts["left"] = len(rows) - i
            if on_progress:
                on_progress(f"YouTube is refusing requests from this machine for now; {len(rows) - i} videos wait for the next pass")
            break
        counts[got] += 1
        if on_progress:
            what = "videos heard by Whisper" if upgrade else "videos transcribed from their captions"
            on_progress(f"{i + 1:,} of {len(rows):,} {what}: {counts['restored']:,} done")
        time.sleep(pause)
    return counts


def restore(workers=24, limit=None, on_progress=None, read=pagetext.read, rows=None, label="articles read again"):
    from concurrent.futures import ThreadPoolExecutor
    rows = (restore_candidates() if rows is None else rows)[: limit or None]
    counts = {"restored": 0, "kept": 0, "failed": 0}

    def one(r):
        yield_to_foreground(on_progress)
        try:
            return restore_one(r["evidence_id"], r, read=read)
        except Exception as e:
            store.event("library_restore_error", {"url": r["url"], "error": str(e)[:200]})
            return "failed"
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, s in enumerate(ex.map(one, rows)):
            counts[s] = counts.get(s, 0) + 1
            if on_progress and i % 50 == 0:
                on_progress(f"{i + 1:,} of {len(rows):,} {label}: {counts['restored']:,} restored")
    return counts


# ---- running it -----------------------------------------------------------------------------------------------------
def run(phases=("import", "embed", "restore", "embed"), root=WIKI_DIR):
    """All phases in order, in this thread. Progress in STATE; a summary event per phase."""
    if not _RUN.acquire(blocking=False):
        return {"error": "a migration is already running"}
    STATE.update(running=True, started=time.time(), error="", done={}, paused=0.0)
    note = lambda p: STATE.update(progress=p)
    try:
        for ph in phases:
            STATE["phase"] = ph
            t0 = time.time()
            if ph == "import":
                note("reading the old wiki")
                recs, skipped = scan(root)
                winners = dedupe(recs)
                _canonical_publishers(winners)
                got = write(winners, root, note)
                got.update(pages_read=len(recs), duplicates_collapsed=len(recs) - len(winners), stayed_in_hic=skipped,
                           kinds={k: sum(1 for w in winners if w["kind"] == k) for k in ("article", "reddit", "document", "transcript", "analysis", "reference")})
            elif ph == "embed":
                n = 0
                while True:
                    yield_to_foreground(note)
                    got_n = librarysearch.embed_pending(640)
                    if not got_n:
                        break
                    n += got_n
                    note(f"{n:,} passages embedded")
                got = {"embedded": n}
            elif ph == "restore":
                # passages are embedded alongside the restore: one uses the graphics card, the other the network
                stop, emb = threading.Event(), {"n": 0}

                def embed_alongside():
                    while not stop.is_set():
                        yield_to_foreground()
                        try:
                            got_n = librarysearch.embed_pending(1280)
                        except Exception:
                            got_n = 0
                        emb["n"] += got_n
                        if not got_n and stop.wait(15):
                            break
                worker = threading.Thread(target=embed_alongside, daemon=True, name="library-embed")
                worker.start()
                got = restore(on_progress=note)
                stop.set()
                worker.join(timeout=3600)
                got["embedded_alongside"] = emb["n"]
            elif ph == "videos":
                got = transcribe_videos(on_progress=note, whisper="never")
            elif ph == "videos-whisper":
                got = transcribe_videos(on_progress=note, whisper="always", upgrade=True)
            elif ph == "retry":
                # the browser reader takes four pages at a time, so fewer workers
                got = restore(workers=8, on_progress=note, rows=retry_candidates(), label="refused or redirected articles tried again")
            elif ph == "tidy":
                got = tidy()
                got["reverted"] = revert_index_follows()
            else:
                continue
            got["seconds"] = round(time.time() - t0, 1)
            STATE["done"][ph] = got
            store.event("library_migration", {"phase": ph, **{k: v for k, v in got.items() if k != "stayed_in_hic"}})
        return dict(STATE["done"])
    except Exception as e:
        STATE["error"] = f"{type(e).__name__}: {str(e)[:300]}"
        store.event("library_migration_error", {"phase": STATE["phase"], "error": STATE["error"]})
        raise
    finally:
        STATE["running"] = False
        _RUN.release()


def tidy():
    """Rows already written are brought up to the current import: tags lose the stemmed title words the first import
    added, links lose tracking parameters (with their restore record, so nothing is fetched twice), and projects named
    by an IA Next engagement id read as that engagement's title, and Reddit posts filed as articles become Reddit posts
    (26 Nov)."""
    c = librarysearch.ensure_schema()
    fixed = relinked = renamed = rekinded = videos = 0
    for r in c.execute("SELECT evidence_id, title, tags, url, projects, kind FROM library_meta").fetchall():
        tags = json.loads(r["tags"] or "[]")
        drop = set(library.key_terms(r["title"] or ""))
        keep = [t for t in tags if t not in drop]
        if keep != tags:
            with store._LOCK:
                c.execute("UPDATE library_meta SET tags = ?, updated = ? WHERE evidence_id = ?", (json.dumps(keep), time.time(), r["evidence_id"]))
            fixed += 1
        projects = json.loads(r["projects"] or "[]")
        named = [readable_project(p) if re.fullmatch(r"(?i)eng[_ ][0-9a-f]{12}", p) else p for p in projects]
        if named != projects:
            with store._LOCK:
                c.execute("UPDATE library_meta SET projects = ?, updated = ? WHERE evidence_id = ?", (json.dumps(named), time.time(), r["evidence_id"]))
            renamed += 1
        if r["kind"] in ("article", "transcript") and youtube_id(r["url"] or ""):
            with store._LOCK:
                if r["kind"] == "article":       # HiC kept only its title and description: the videos phase transcribes it
                    c.execute("UPDATE library_meta SET kind = 'video', flags = json_insert(COALESCE(flags, '[]'), '$[#]', 'not transcribed yet'), "
                              "updated = ? WHERE evidence_id = ? AND COALESCE(flags, '') NOT LIKE '%not transcribed yet%'", (time.time(), r["evidence_id"]))
                c.execute("UPDATE library_meta SET kind = 'video', updated = ? WHERE evidence_id = ?", (time.time(), r["evidence_id"]))
            videos += 1
        post = REDDIT_POST.search(r["url"] or "")
        if post and r["kind"] == "article":
            sub = post.group(1)
            with store._LOCK:
                c.execute("UPDATE library_meta SET kind = 'reddit', subreddit = ?, publisher = ?, is_evidence = 1, updated = ? WHERE evidence_id = ?",
                          (sub, f"Reddit r/{sub}", time.time(), r["evidence_id"]))
            rekinded += 1
        link = clean_link(r["url"]) if r["url"] else r["url"]
        if link != r["url"]:
            with store._LOCK:
                c.execute("UPDATE library_meta SET url = ?, updated = ? WHERE evidence_id = ?", (link, time.time(), r["evidence_id"]))
                c.execute("UPDATE evidence SET url = ? WHERE id = ?", (link, r["evidence_id"]))
                if not c.execute("SELECT 1 FROM library_restore WHERE url = ?", (link,)).fetchone():
                    c.execute("UPDATE library_restore SET url = ? WHERE url = ?", (link, r["url"]))
            relinked += 1
    return {"retagged": fixed, "relinked": relinked, "projects_named": renamed, "reddit_posts_refiled": rekinded, "videos_filed": videos}


def start(phases=("import", "embed", "restore", "embed")):
    if STATE["running"]:
        return {"running": True}
    threading.Thread(target=lambda: _quiet(run, phases), daemon=True, name="library-migration").start()
    return {"running": True, "phases": list(phases)}


def _quiet(fn, *a):
    try:
        fn(*a)
    except Exception:
        pass


def status():
    s = dict(STATE)
    try:
        s["library"] = librarysearch.stats()
    except Exception:
        pass
    return s
