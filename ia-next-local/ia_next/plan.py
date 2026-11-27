"""The plan before the work (owner, 2026-11-19): "show the user, for each artifact, the mandatory steps which MAY
involve research, then ask them if they want to perform each step in the workflow and the expected duration of each
step".

When the agent asks the studio for an artifact inside a conversation, nothing starts. A plan is written instead:

- what the focused engagement already holds, and whether that material covers the request (a word check against the
  findings and sources, stated as a fact, never a guess about quality);
- a research step the person can switch on or off, switched on when the material does not cover the request, using
  the data packs they chose;
- the specialist steps that make the artifact, which are required;
- an expected time for each step: the median of that specialist's finished runs on this machine when there are any,
  otherwise the figure measured when this build was set up, and the card says which.

The page shows the plan as a card. The person chooses the optional steps and starts it; start() then runs the steps
in order (research first, the artifact when research has finished) outside the chat turn. Work started by a schedule,
an approval card or a retry is not planned again: only a call made inside a conversation is.
"""
import contextvars
import json
import os
import re
import statistics
import threading
import time

from . import config, store

SCHEMA = """
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY, conversation TEXT, engagement_id TEXT, tool TEXT, args_json TEXT, turn_json TEXT,
    steps_json TEXT, status TEXT, note TEXT, research_task TEXT, task_id TEXT, created REAL, updated REAL
);
"""

# The artifact each tool makes, the specialist steps that make it (names match the task's nodes), and the seconds
# measured for each on this machine when the build was set up. A step with no measurement yet says so on the card.
RESEARCH_STEPS = [
    ("Brief Lead", "Checks the brief", 20),
    ("Research Lead", "Finds and reads sources", 240),
    ("Analyst", "Pulls findings with exact quotes", 540),
    ("Writer and Verifier", "Writes the report; a second model checks it", 400),
]
KINDS = {
    "start_research_report": ("Research report", RESEARCH_STEPS),
    "start_diagram": ("Picture", [("Information Designer (HiC renderer)", "Chooses the form, writes every label from the evidence, draws it", 95)]),
    "start_deck": ("Deck", [("Deck Composer", "Writes the slides, makes the photographs, builds the PowerPoint", 840)]),
    "start_journey_map": ("Journey map", [("Journey Cartographer", "Maps the journey stage by stage from quoted evidence", None)]),
    "start_artifact": ("Document", [("Artifact Studio (local author)", "Writes the document from the evidence", None),
                                    ("Verifier", "A second model checks it against the sources", None)]),
    "start_themes": ("Themes", [("Theme Analyst (HiC topic model)", "Groups the passages and names each theme", None)]),
    "start_datatable": ("Data table", [("Table Analyst", "Builds the table; every number carries its source", None)]),
    "start_audio_overview": ("Audio overview", [("Audio Producer", "Writes the two-voice script from the evidence", None)]),
    "start_prototype": ("Prototype", [("Prototyper", "Writes the design brief, builds the screens, reviews screenshots", None)]),
    "transcribe_video": ("Video transcript", [("Fetcher", "Fetches the video's sound with yt-dlp", None),
                                              ("Transcriber", "Whisper large-v3 writes the timestamped transcript on this machine", None),
                                              ("Writer", "Writes the TXT, Markdown, SRT, VTT and JSON downloads", None),
                                              ("Archivist", "Stores it as a source in the second brain, in chunks with manifest pointers", None)]),
    "start_social_analysis": ("Reddit listening", [("Social Collector", "Collects the posts", None),
                                                   ("Social Analyst", "Groups the posts and reads their sentiment", None)]),
}
# Tools whose artifact is built from the engagement's evidence, so research may have to come first.
NEEDS_EVIDENCE = ("start_diagram", "start_deck", "start_journey_map", "start_artifact", "start_themes", "start_datatable",
                  "start_audio_overview")

FROM_PLAN = contextvars.ContextVar("ia_next_from_plan", default=False)      # True while start() runs the real tools

STOP = set("""a an and are as at be by for from has have how in into is it its of on or that the their them this to was
what when where which who why will with would you your our about across after all also any been between both but can
could do does each more most much new not other over some such than then there these they those through under use used
using very were while within without make makes made draw draws drawn create build write show give get please want need
map mind mindmap diagram picture deck slides slide report document table themes theme journey audio overview prototype
engagement work study research analysis based usage""".split())


def _db():
    c = store.conn()
    c.executescript(SCHEMA)                 # cheap, and right after a test reset or a fresh data volume
    return c


# ---- what the engagement holds, and whether it covers the request ----------------------------------------------------
def request_words(text):
    """The content words of a request: lower-case, no hashtags, no filler, no artifact names."""
    text = re.sub(r"\([^)]*\)", " ", str(text or ""))          # context notes the page adds in brackets
    text = re.sub(r"#\w+", " ", text)
    out = []
    for w in re.findall(r"[A-Za-z][A-Za-z'-]*", text.lower()):
        w = w.strip("'-")
        if (len(w) > 2 or w == "ai") and w not in STOP and w not in out:
            out.append(w)
    return out[:12]


def subject(request, args=None):
    """The request as a title: no hashtags, no placeholder brackets, no "from this engagement", no leading verb."""
    s = str(request or "").strip().splitlines()[-1] if str(request or "").strip() else ""
    s = re.sub(r"#\w+", " ", s)
    from . import router as _router
    s, _ = _router.presentation_free(s)             # brand, audience and setting words are never the subject (E9)
    s = _router.sources_free(s)
    s = re.sub(r"[\[\]]", "", s)
    s = re.sub(r"\b(from|in|for|using|with) (this|the|my) engagement\b", " ", s, flags=re.I)
    s = re.sub(r"^\s*(please\s+)?(draw|make|create|build|map|write|give me|show me|produce|generate)\s+(me\s+)?", "", s, flags=re.I)
    s = " ".join(s.split()).strip(" .,:;")
    if not s and isinstance(args, dict):
        s = " ".join(str(args.get(k) or "") for k in ("persona", "topic", "goal", "title") if args.get(k)).strip()
    return (s[:1].upper() + s[1:])[:90] if s else "New work"


def _stem(w):
    for suf in ("ing", "es", "s", "ed"):
        if len(w) > 4 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def holdings(eid):
    """The text an engagement holds (findings and source titles) and the counts the card states."""
    out = {"findings": 0, "sources": 0, "text": "", "title": ""}
    eng = store.get_engagement(eid) if eid else None
    if not eng:
        return out
    out["title"] = str(eng["title"] or "")
    parts = []
    for rel, key in (("results/findings.json", "findings"), ("results/sources.json", "sources")):
        try:
            with open(store.safe_path(eid, rel), encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        rows = data.get(key) if isinstance(data, dict) else data
        rows = rows if isinstance(rows, list) else []
        out[key] = len(rows)
        for r in rows:
            if isinstance(r, dict):
                parts.append(" ".join(str(r.get(k) or "") for k in ("claim", "finding", "quote", "title", "summary", "text"))[:4000])
    out["text"] = " ".join(parts).lower()
    return out


def coverage(eid, request):
    """Which of the request's content words the engagement's material mentions. Covered when it holds material and at
    most a third of the words are missing."""
    held = holdings(eid)
    words = request_words(request)
    have = set(re.findall(r"[a-z][a-z'-]*", held["text"]))
    stems = {_stem(w) for w in have}
    missing = [w for w in words if w not in have and _stem(w) not in stems]
    empty = not (held["findings"] or held["sources"])
    covered = (not empty) and (not words or len(missing) * 3 <= len(words))
    return {"covered": covered, "empty": empty, "missing": missing, "words": words,
            "findings": held["findings"], "sources": held["sources"], "title": held["title"]}


# ---- expected time ---------------------------------------------------------------------------------------------------
def expected(specialist, fallback, depth=None):
    """(seconds or None, how many finished runs it is the median of). Measured on this machine, never invented. The
    last three runs only (field test 23 Nov, S4: the median of nine carried week-old timings, so a card said 1 minute
    for 33 minutes of work, and after the speed fixes said 20 minutes for 2). With a depth, only runs of that depth
    (26 Nov: a deep run's card said "about 15 min" from fast runs' timings; the deep run took 58)."""
    rows = []
    if depth in ("fast", "deep"):
        rows = _db().execute(
            "SELECT n.started, n.finished FROM nodes n JOIN tasks t ON t.id = n.task_id WHERE n.specialist = ? AND n.state IN "
            "('available', 'published', 'acknowledged') AND n.finished IS NOT NULL AND "
            "COALESCE(json_extract(t.brief, '$.depth'), 'fast') = ? ORDER BY n.finished DESC LIMIT 3", (specialist, depth)).fetchall()
    if not rows:
        rows = _db().execute("SELECT started, finished FROM nodes WHERE specialist = ? AND state IN ('available', 'published', "
                             "'acknowledged') AND finished IS NOT NULL ORDER BY finished DESC LIMIT 3", (specialist,)).fetchall()
    took = [r["finished"] - r["started"] for r in rows if r["finished"] and r["started"] and r["finished"] > r["started"]]
    try:
        from . import providers
        slow = providers.slow_factor()          # the card's rate right now, against its normal rate
    except Exception:
        slow = 1.0
    if took:
        return int(statistics.median(took) * slow), len(took)
    return (int(fallback * slow) if fallback else None), 0


def deck_seconds_per_slide():
    """(seconds per slide, decks it is the median of) from the last three finished decks on this machine, or (None, 0).
    26 Nov: a 50-slide request's card showed the time of a 20-slide deck, the median of the last decks whatever their
    length."""
    from . import depthlevel as _dl
    rows = _db().execute("SELECT n.task_id, n.started, n.finished, t.result_path FROM nodes n JOIN tasks t ON t.id = n.task_id WHERE "
                         "n.specialist LIKE 'Deck Composer%' AND t.kind = 'deck' AND n.state IN ('available', 'published', "
                         "'acknowledged') AND n.finished IS NOT NULL ORDER BY n.finished DESC LIMIT 6").fetchall()
    per = []
    for r in rows:
        try:
            with open(os.path.join(os.path.dirname(r["result_path"] or ""), "deck.json"), encoding="utf-8") as fh:
                meta = json.load(fh)
        except (OSError, ValueError, TypeError):
            continue
        shipped = [x for x in meta.get("slides") or [] if not str(x.get("title") or "").strip().lower().startswith("sources")]
        # the slides written, not the slides kept: repeats left out still took their time (the 50-slide deck kept 26).
        # Recorded since 26 Nov; before that, the count the request stated.
        written = max(len(shipped), int(meta.get("slides_written") or 0) or _dl.stated_slides(_dl.task_request(r["task_id"])) or 0)
        if shipped and r["finished"] > r["started"]:
            per.append((r["finished"] - r["started"]) / written)
        if len(per) >= 3:
            break
    return (statistics.median(per), len(per)) if per else (None, 0)


def _step(key, name, does, required, seconds=None, runs=0, on=True, note=""):
    return {"key": key, "name": name, "does": does, "required": bool(required), "on": bool(on), "seconds": seconds,
            "runs": runs, "note": note}


def competitive(tool, args):
    """True for a competitive gap analysis: its comparison needs named organizations and what each has done, which an
    engagement's own material rarely holds, so a web search is part of the work (owner, 20 Nov: "with gap analyses,
    the multi-agent orchestration needs to include web search")."""
    return tool == "start_artifact" and str((args or {}).get("kind") or "").strip().lower() in ("gap", "competitive")


# ---- a subreddit the work needs, collected as a step of the same card (26 Nov, the WS-H9 skill trials) ----------------
# "Research what r/NEU says about co-op placements" planned a Reddit listening card and stopped there (one card per turn),
# or skipped Reddit and planned a report that then refused to start. The card that makes the work now carries the
# listening as its first step whenever the request names a subreddit the engagement holds no posts from.
_QUERY_STOP = {"what", "says", "say", "said", "people", "posts", "post", "reddit", "discussion", "discussions", "think",
               "thinks", "feel", "feels", "about", "the", "and", "for", "from", "with", "this", "that", "plus", "pack",
               "data", "research", "report", "deck", "make", "write", "build", "on", "of", "in", "a", "an", "to", "how",
               "their", "they", "them", "our", "my", "is", "are", "do", "does", "higher", "last", "days", "month", "week"}


def reddit_to_collect(eid, request, args):
    """The subreddits the request (or the agent's required_sources) names that the engagement holds no posts from."""
    from . import material, transcripts as _tr
    want = material.requested(request, declared=(args or {}).get("required_sources"))
    subs = sorted(want.get("reddit") or [])
    if not subs:
        return []
    held = set()
    if eid:
        try:
            srcs = list(_tr._load(eid, "results/sources.json", {}).get("sources") or []) + list(material.social(eid)[1])
            held = {str(x.get("subreddit") or material._subreddit_of(x.get("url")) or "").lower() for x in srcs if material.is_reddit(x)}
        except Exception:
            held = set()
    return [x for x in subs if x not in held]


def reddit_query(request, args=None):
    """Reddit search words for the subject: the phrase after "about" / "on" when there is one, else the subject, without
    the subreddit, the outputs and filler; at most three words."""
    from . import router
    t = re.sub(r"(?i)\br/[A-Za-z0-9_]+", " ", str(request or ""))
    m = re.search(r"(?i)\b(?:about|regarding|around|on)\s+(.+?)(?=$|[,.;]|\s+(?:plus|and then|then|with|using|from)\b)", t)
    phrase = m.group(1) if m else router.subject_of(t, (args or {}).get("engagement_id") or "", outputs=True)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z0-9'-]*", phrase) if w.lower() not in _QUERY_STOP and len(w) > 1]
    return " ".join(words[:3])


def build_steps(tool, args, turn):
    """The ordered steps for one request. Returns (steps, note)."""
    label, specialists = KINDS[tool]
    eid = str(args.get("engagement_id") or "")
    request = (turn or {}).get("request") or args.get("request") or args.get("goal") or args.get("topic") or ""
    request = str(request).strip().splitlines()[-1] if str(request).strip() else ""
    cov = coverage(eid, request)
    steps = []
    from . import studio as _studio
    depth = args.get("depth") if args.get("depth") in ("fast", "deep") else _studio.depth_of({"request": request})
    packs = [p for p in ((turn or {}).get("packs") or args.get("packs") or [])]
    from . import hic
    pack_names = [hic.PACKS[p] for p in packs if p in hic.PACKS]
    if not (turn or {}).get("packs") and not own_packs(eid):
        # picked for the person (by the agent, else in code from the request's own words); the card's "Data packs"
        # choice drops one or all of them
        choice_packs, none = hic.packs_for_choice(args.get("pack_choice") or "auto", request, args.get("packs"))
        pack_names = [hic.PACKS[p] + " (picked for you)" for p in choice_packs] if not none else []

    # owner, 25 Nov (E16): work can be made from the person's own files alone. Uploads count as what the engagement
    # holds, the card says they are read first, and research stays off when the request names the files as its basis.
    from . import router as _router, transcripts as _tr
    try:
        ups, unread = _tr.uploaded_sources(eid) if eid else [], _tr.unanalysed_uploads(eid) if eid else []
    except Exception:
        ups, unread = [], []
    from_files = bool(ups) and (_router.files_only(request) or bool(args.get("source_ids")))
    picked = [u for u in ups if u["id"] in {str(x).upper() for x in (args.get("source_ids") or [])}]
    if tool in NEEDS_EVIDENCE:
        if ups and (cov["empty"] or from_files):
            n = len(picked) or len(ups)
            note = ((f"Made from {n} of the {len(ups)} uploaded files this engagement holds" if picked and len(picked) < len(ups)
                     else f"Holds {n} uploaded file{'s' if n != 1 else ''}")
                    + (f", copied from \"{args['files_from']}\"" if args.get("files_from") else "")
                    + (f" and {cov['findings']} findings" if cov["findings"] else "") + ". "
                    + (f"{len(unread)} {'is' if len(unread) == 1 else 'are'} read first, with exact quotes pulled from "
                       f"{'it' if len(unread) == 1 else 'them'}." if unread else "They have been read and their quotes checked.")
                    + (" This work is made from your files only." if from_files else ""))
        elif cov["empty"]:
            note = "This engagement holds no findings or sources yet."
        elif cov["covered"]:
            note = f"Holds {cov['findings']} findings and {cov['sources']} sources that mention the request."
        else:
            note = (f"Holds {cov['findings']} findings and {cov['sources']} sources on \"{cov['title'][:70]}\". "
                    f"They do not mention: {', '.join(cov['missing'][:6])}.")
        # QA 25 Nov (E3, E7): evidence that is too little for the detail asked is said here, before anything is made,
        # and research is switched on to add to it
        from . import depthlevel
        level = depthlevel.of(args, request)
        thin = "" if cov["empty"] else depthlevel.thin(tool, level, cov["sources"], cov["findings"])
        if thin:
            note += " " + thin
        steps.append(_step("material", "Check what the engagement holds", note, True, 0, 0, True))
        elsewhere = not cov["covered"] and not cov["empty"]          # another topic lives here: do not mix the two
        # the research step of an artifact collects and analyses; it writes no report, so the writer's time is not in
        # its estimate (24 Nov: the card said "about 19 min" for a step that takes about 7)
        total = [expected(s, d, depth) for s, _, d in RESEARCH_STEPS[:3]]
        secs = sum(t[0] for t in total if t[0]) or None
        runs = min((t[1] for t in total), default=0)
        steps.append(_step("research", "Research the topic",
                           "Finds and reads sources, pulls findings with exact quotes. Sources: "
                           + (", ".join(pack_names) if pack_names else "general sources (no data pack chosen)"),
                           False, secs, runs, on=(not cov["covered"] or (bool(thin) and level == "detailed")) and not from_files,
                           note="Off because you asked for work from your files only. Switch it on to add published sources to them." if from_files else ("Recommended: it adds to what the engagement holds, so the " + depthlevel.WORDS.get(tool, "output")
                                 + f" has the evidence a {level} one needs. Switched off, it is made from the material above "
                                 "and marked as resting on thin evidence." if thin and level == "detailed" else "") if cov["covered"] else
                           (f"Recommended. It opens a new engagement, \"{subject(request, args)}\", so this topic is not mixed "
                            f"with \"{cov['title'][:60]}\". Switched off, the artifact is made from the material above."
                            if elsewhere else "Recommended: without it this artifact has nothing on the topic to draw from.")))
        steps[-1]["new_engagement"] = subject(request, args) if elsewhere else ""
        if competitive(tool, args):          # always searched, whatever the engagement already holds
            steps[-1].update(name="Search the web for peers and competitors", required=True, on=True,
                             does="Searches the web for named peers and competitors, what each has done and what came of it, "
                                  "reads the pages and pulls findings with exact quotes. Also reads: "
                                  + (", ".join(pack_names) if pack_names else "general sources"),
                             note="Always part of a competitive gap analysis: the comparison needs named organizations, "
                                  "what each has done, and case studies."
                                  + (f" It opens a new engagement, \"{subject(request, args)}\"." if elsewhere else ""))
    subs = reddit_to_collect(eid, request, args) if (tool in NEEDS_EVIDENCE or tool == "start_research_report") else []
    if subs:
        q = reddit_query(request, args)
        times = [expected(sp, d) for sp, _, d in KINDS["start_social_analysis"][1]]
        where = ", ".join("r/" + x for x in subs)
        steps.insert(1 if steps and steps[0]["key"] == "material" else 0, dict(_step(
            "reddit", "Collect the Reddit posts",
            f"Reads {where} in the period for posts about \"{q}\": verified quotes and sentiment per theme. The work then "
            "cites those posts as its main evidence.", True, sum(t[0] for t in times if t[0]) or None, min((t[1] for t in times), default=0),
            True, note=f"Required: the request names {where}, and this engagement holds no posts from it yet."),
            subreddits=subs, query=q))
    held = tool == "start_research_report" and reuse_evidence(eid, request)
    from . import depthlevel as _dl
    asked_slides = _dl.stated_slides(request) if tool == "start_deck" else None
    for i, (specialist, does, default) in enumerate(specialists):
        secs, runs = expected(specialist, default, depth if specialist in {r[0] for r in RESEARCH_STEPS} else None)
        if asked_slides and specialist == "Deck Composer":        # (26 Nov) the stated count sets the deck's time
            per, n = deck_seconds_per_slide()
            if per:
                try:
                    from . import providers
                    slow = providers.slow_factor()
                except Exception:
                    slow = 1.0
                secs, runs = int(per * asked_slides * slow), n
                does = f"{does}; {asked_slides} slides as asked"
        if held and specialist in ("Research Lead", "Analyst"):
            does, secs = (f"Uses the {cov['sources']} sources already collected for this engagement" if specialist == "Research Lead"
                          else f"Uses the {cov['findings']} findings already checked against their sources"), 0
        steps.append(_step(f"make{i}", specialist.split(" (")[0], does, True, secs, runs, True))
    return steps, label


# ---- the choices on the card -----------------------------------------------------------------------------------------
# Gemini Notebook opens a dialog before each output (orientation and density for an infographic, format and length for
# audio and decks). Here the same choices sit on the plan card. Only choices the tool really takes are offered: they
# are read from the tool's own argument list, so the card cannot offer something the studio would ignore.
OPTION_LABELS = {"mode": "Kind", "orientation": "Shape", "density": "Detail", "format": "Format", "length": "Length",
                 "render_mode": "Layout", "brand": "Brand", "time_window": "Period", "sort": "Order"}
VALUE_LABELS = {"nxt": "NXT", "nu": "Northeastern", "deciem": "DECIEM", "diagram": "One picture", "infographic": "Infographic",
                "deep-dive": "Deep dive", "document": "Document", "slides": "Slides", "all": "All time"}
OPTION_DEFAULTS = {"mode": "diagram", "orientation": "landscape", "density": "standard", "format": "deep-dive", "length": "default",
                   "render_mode": "document", "brand": "nxt", "time_window": "year", "sort": "relevance"}


PLAN_LABELS = {"1": "Today", "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months",
               "any": "Any date", "fast": "Fast", "deep": "Deep"}


def own_packs(eid):
    """The engagement's own default packs (its settings), which win over the code's picks."""
    return list(((store.get_engagement(eid or "") or {}).get("settings") or {}).get("packs") or [])


def _pack_option(args, request):
    """The "Data packs" choice of a plan card when the person selected none: the packs picked from the request's own
    words (all of them, or one alone), or none at all. [] when the person or the engagement already chose packs, or
    the words place no pack."""
    from . import hic
    turn = store.TURN.get() or {}
    if turn.get("packs") or own_packs(args.get("engagement_id")):
        return []                                   # the person's own choice, or the engagement's default packs
    picks = [p for p in (args.get("packs") or []) if p in hic.PACKS][:3] or hic.quick_packs(request)   # the agent's, else the code's
    if not picks:
        return []
    choices = [{"value": "auto", "label": " + ".join(hic.PACKS[p] for p in picks)}]
    if len(picks) > 1:
        choices += [{"value": f"only:{p}", "label": f"{hic.PACKS[p]} only"} for p in picks]
    choices.append({"value": "none", "label": "No data pack"})
    value = args.get("pack_choice") if args.get("pack_choice") in {c["value"] for c in choices} else "auto"
    return [{"key": "pack_choice", "label": "Data packs", "value": value, "choices": choices}]


def engagement_period(eid):
    """The plan-card period of the engagement's own research (its sources' window), or "" when it has none. 26 Nov: a deck
    asked of an engagement researched over 90 days offered "Last 30 days", the default for a request that names none."""
    try:
        from . import currency, transcripts as _tr
        w = (_tr._load(eid, "results/sources.json", {}) or {}).get("window") or {} if eid else {}
        return currency.choice_of(w) if w.get("days") else ""
    except Exception:
        return ""


def _evidence_options(tool, args, request=""):
    """The two choices every evidence-backed plan carries (field test 23 Nov, currency contract and depths): the period
    its sources must come from, and how deep the work goes. Both are decided in code from the request and shown here,
    so a person sees them before Start and can change them; neither is ever changed silently."""
    if tool not in NEEDS_EVIDENCE and tool != "start_research_report":
        return []
    from . import currency, studio
    said = request or str(args.get("goal") or args.get("scope") or "")
    # the engagement's own defaults apply when the request names no period or depth (Gap 3: project settings)
    own = (store.get_engagement(args.get("engagement_id") or "") or {}).get("settings") or {}
    w = currency.window(said)
    named = "no period" not in str(w.get("why") or "")
    period = (str(args.get("period")) if str(args.get("period") or "") in currency.PERIOD_CHOICES
              else own["period"] if own.get("period") in currency.PERIOD_CHOICES and not named
              else (not named and engagement_period(args.get("engagement_id") or "")) or currency.choice_of(w))
    depth = (args.get("depth") if args.get("depth") in ("fast", "deep")
             else own["depth"] if own.get("depth") in ("fast", "deep") and not studio._DEEP.search(said) else studio.depth_of({"request": said}))
    return _pack_option(args, said) + [{"key": "period", "label": "Evidence from", "value": period,
             "choices": [{"value": c, "label": PLAN_LABELS[c]} for c in currency.PERIOD_CHOICES]},
            {"key": "depth", "label": "Depth", "value": depth,
             "choices": [{"value": c, "label": PLAN_LABELS[c]} for c in ("fast", "deep")]}]


def _files_choices(eid):
    """The sets of files a request for "the uploaded files" can mean in this engagement: each sitting of uploads, newest
    first, and all of them. [(value, label, ids)]."""
    from . import transcripts
    try:
        groups = transcripts.sittings(eid)
    except Exception:
        return []
    every = [i for g in groups for i in g["ids"]]
    out = []
    for n, g in enumerate(groups[:4]):
        from . import currency as _cur           # the person's own time zone, not the server's
        import datetime as _dt
        when = _dt.datetime.fromtimestamp(g["at"], _cur.tz()).strftime("%d %b, %H:%M") if g["at"] else "earlier"
        k = len(g["ids"])
        out.append((f"sit{n}", (f"The {k} files" if k > 1 else "The file") + f" added {when}: "
                    + ", ".join(g["titles"][:2]) + (f" and {k - 2} more" if k > 2 else ""), g["ids"]))
    if len(groups) > 1:
        out.append(("all", f"All {len(every)} files in this engagement", every))
    return out


def _files_option(tool, args, request):
    """Which files the work is made from, as a choice on the plan card (owner, 25 Nov, E16: "the uploaded files" meant
    the most recent sitting, with no way to say another). Shown when the work rests on the person's files and the
    engagement holds more than one set."""
    from . import router
    eid = str(args.get("engagement_id") or "")
    if tool not in NEEDS_EVIDENCE or not eid or not (args.get("source_ids") or args.get("files_set") or router.files_basis(request)):
        return []
    choices = _files_choices(eid)
    if len(choices) < 2:
        return []
    mine = [str(x).upper() for x in (args.get("source_ids") or [])]
    value = (args.get("files_set") if args.get("files_set") in {c[0] for c in choices}
             else next((c[0] for c in choices if c[2] == mine), choices[0][0]))
    return [{"key": "files_set", "label": "Files", "value": value, "choices": [{"value": v, "label": lab} for v, lab, _ in choices]}]


def options_for(tool, args, request=""):
    """[{key, label, value, choices: [{value, label}]}] for the steering this tool accepts."""
    from . import agent
    spec = next((s for s in agent.TOOLS if s["name"] == tool), None)
    props = (spec or {}).get("input_schema", {}).get("properties", {})
    out = []
    for key, label in OPTION_LABELS.items():
        enum = [v for v in (props.get(key) or {}).get("enum") or [] if v]
        if len(enum) < 2:
            continue
        order = [OPTION_DEFAULTS[key]] + [v for v in enum if v != OPTION_DEFAULTS[key]] if OPTION_DEFAULTS[key] in enum else enum
        if key in ("length",):
            order = [v for v in ("short", "default", "long") if v in enum]
        if key == "density":
            order = [v for v in ("concise", "standard", "detailed") if v in enum]
        value = args.get(key) if args.get(key) in enum else (OPTION_DEFAULTS[key] if OPTION_DEFAULTS[key] in enum else enum[0])
        out.append({"key": key, "label": label, "value": value,
                    "choices": [{"value": v, "label": VALUE_LABELS.get(v) or v.replace("-", " ").capitalize()} for v in order]})
    return out + _files_option(tool, args, request) + _evidence_options(tool, args, request)


# What the studio was asked to make, in the agent's own arguments: the person reviews it before anything runs (Gemini
# Notebook's "review slide outline" and "review producer notes" steps). Only fields the tool takes are shown.
BRIEF_FIELDS = [("audience", "For"), ("persona", "Persona"), ("goal", "Goal"), ("scope", "Scope"), ("experience", "Experience"),
                ("query", "Search"), ("subreddits", "Subreddits"), ("focus", "Focus"), ("structure", "Structure"),
                ("outline", "Slides planned"), ("columns", "Columns"), ("must_include", "Must include")]


def brief_for(args):
    """[{label, value or items}] for the plan card, from the arguments the agent passed."""
    out = []
    for key, label in BRIEF_FIELDS:
        v = args.get(key)
        if isinstance(v, list):
            items = [" ".join(str((x.get("title") or x.get("heading") or "") if isinstance(x, dict) else x).split())[:160] for x in v]
            items = [i for i in items if i][:16]
            if items:
                out.append({"label": label, "items": items})
        elif isinstance(v, str) and v.strip():
            out.append({"label": label, "value": " ".join(v.split())[:260]})
    return out


def understood(tool, args, request, eid):
    """What the system took the request to mean, and what it carries over from earlier work, as rows of the plan
    card (E9): the subject apart from the audience and the brand, the engagement the work is filed in, and each thing
    that did not come from this request. The person reads it before Start and can correct it there."""
    from . import router
    last = request.splitlines()[-1] if request else ""
    subj = router.subject_of(last, eid, outputs=True) or subject(last, args)
    rows = [{"label": "Subject understood as", "value": subj[:260]}]
    aud = router.presentation_free(last)[1]
    if aud and not args.get("audience"):
        rows.append({"label": "For", "value": aud[:160]})
    eng = store.get_engagement(eid) if eid else None
    carried = []
    if eng:
        fresh = not store.list_tasks(eid, 1)
        rows.append({"label": "Filed in", "value": eng["title"] + (" (a new engagement)" if fresh else "")})
        try:
            cov = coverage(eid, last)
            if cov.get("sources"):
                carried.append(f"{cov['sources']} sources and {cov['findings']} findings this engagement already holds")
        except Exception:
            pass
        s = eng.get("settings") or {}
        names = {"packs": "data packs", "period": "evidence period", "depth": "depth", "brand": "brand", "audience": "audience"}
        mine = [names[k] for k in names if s.get(k)]
        if mine:
            carried.append("this engagement's saved defaults: " + ", ".join(mine))
        # the files this work rests on, by name (owner, 25 Nov, E16)
        try:
            from . import transcripts as _tr
            ups = _tr.uploaded_sources(eid)
            ids = [str(x).upper() for x in (args.get("source_ids") or [])]
            mine = [u for u in ups if u["id"] in ids] if ids else (ups if (args.get("files_from") or router.files_basis(last)) else [])
            if mine:
                names_ = ", ".join(str(u.get("title") or u["id"]) for u in mine[:8]) + (f" and {len(mine) - 8} more" if len(mine) > 8 else "")
                carried.insert(0, f"{len(mine)} uploaded file{'s' if len(mine) != 1 else ''}"
                               + (f", copied from \"{args['files_from']}\"" if args.get("files_from") else "") + f": {names_}")
        except Exception:
            pass
    else:
        rows.append({"label": "Filed in", "value": "A new engagement"})
    if tool in NEEDS_EVIDENCE or tool == "start_research_report":
        carried.append("pages on this subject already in the second brain, when research runs")
    if carried:
        rows.append({"label": "Carried over", "items": carried})
    return rows


def apply_options(tool, args, chosen):
    """args with the person's choices applied; a choice the tool does not take is ignored."""
    allowed = {o["key"]: {c["value"] for c in o["choices"]} for o in options_for(tool, args)}
    out = dict(args)
    for k, v in (chosen or {}).items():
        if k in allowed and v in allowed[k]:
            out[k] = v
    # the packs shown as picked on the card are the ones searched when the person leaves the choice alone (24 Nov: the
    # card named Healthcare, the choice was not touched, and the run searched with no pack)
    if "pack_choice" in allowed and "pack_choice" not in out:
        out["pack_choice"] = "auto"
    if (chosen or {}).get("files_set") in allowed.get("files_set", ()):       # the set chosen on the card is the set used
        ids = next((c[2] for c in _files_choices(str(out.get("engagement_id") or "")) if c[0] == chosen["files_set"]), None)
        if ids:
            out["source_ids"] = ids
    return out


# ---- a question is answered, not turned into work ----------------------------------------------------------------------
# 19 Nov: "why do students say their instructors cannot guide them on AI? Cite the sources." came back as a plan to draw
# a diagram. A local orchestration model reaches for a making tool too readily, so the gate checks the person's own
# words: a message that asks a question, names no output and carries no hashtag does not start or plan anything.
_ASKS = re.compile(r"(?i)^\s*(why|what|how|who|whom|when|where|which|is|are|was|were|do|does|did|can|could|should|would|will|"
                   r"tell me|explain|summari[sz]e for me|give me (a|the) (short )?(answer|summary))\b")
_MAKES = re.compile(r"(?i)#\w+|\b(make|draw|build|create|write|draft|map|generate|produce|design|prepare|compose|chart|"
                    r"visuali[sz]e|turn (this|it|that) into|put together|research|listen|analy[sz]e|prototype|record|render)\b|"
                    r"\b(deck|slides?|mind ?map|infographic|diagram|journey map|report|brief|quiz|flashcards?|study guide|faq|"
                    r"timeline|data table|audio overview|podcast|video|prototype|roadmap|personas?|blueprint)\b")


# a digest of the person's own data asked for in the chat ("summarize the transcripts", "give me the key themes from the
# interviews", "list the main takeaways from these files"): answered in the chat, not made as an artifact (26 Nov)
_DIGEST = re.compile(r"(?i)^\s*(?:please\s+)?(?:summari[sz]e|sum up|recap|outline|list|give me|show me|walk me through|pull out|"
                     r"what are|tell me)\b.{0,60}\b(?:summary|gist|themes?|key points|main points|takeaways|highlights|use cases|"
                     r"patterns|findings|concerns|worries|pain points|quotes|what (?:they|students|people) say)\b|"
                     r"^\s*(?:please\s+)?(?:summari[sz]e|sum up|recap)\b")
_DATA = re.compile(r"(?i)\b(?:uploaded|uploads?|files?|transcripts?|interviews?|recordings?|documents?|notes|data|engagement|"
                   r"research|findings|sources|evidence|responses|students said|they said|these|them)\b")


def is_data_ask(request):
    """True when the message asks about, or asks for a digest of, the person's own material and makes nothing."""
    line = str(request or "").strip().splitlines()[-1] if str(request or "").strip() else ""
    line = re.sub(r"^\([^)]*\)\s*", "", line)
    if not line or re.search(r"#\w+", line) or re.search(
            r"(?i)\b(deck|slides?|mind ?map|infographic|diagram|journey map|report|brief|quiz|flashcards?|study guide|faq|"
            r"timeline|data table|audio overview|podcast|video|prototype|roadmap|personas?|blueprint)\b", line):
        return False
    return bool(_DATA.search(line)) and (is_question(line) or bool(_DIGEST.search(line)))


def is_question(request):
    """True when the person's message asks something and asks for nothing to be made."""
    line = str(request or "").strip().splitlines()[-1] if str(request or "").strip() else ""
    line = re.sub(r"^\([^)]*\)\s*", "", line)                 # a context note the page put in front
    line = re.sub(r"(?i)\b(?:https?://|www\.)\S+", " ", line).strip()   # a link's "?" (watch?v=) is not a question (22 Nov)
    tail = line.split(": ", 1)[1] if ": " in line else line     # "From this engagement's sources: why do students ..."
    return bool(line) and bool(_ASKS.match(line) or _ASKS.match(tail) or "?" in line) and not _MAKES.search(line)


# ---- propose ---------------------------------------------------------------------------------------------------------
# The output a person names in plain words. 20 Nov: "Build a clickable prototype of a syllabus AI policy lookup ..."
# was planned as a research report AND a prototype, two cards for one request. Research is already a step on every
# artifact's plan, so a report is planned only when the person asked for one.
# The named-output and brand guards moved to router.py (uplift plan WS-4 step 4); the names stay here.
from .router import NAMED_OUTPUTS, brand_asked, named_instead_of_report  # noqa: E402,F401


def gate(tool, args, conversation):
    """Called for every tool the agent runs. Returns a plan proposal for an artifact asked for inside a conversation,
    None when the tool should simply run (not an artifact, not in a conversation, or started from a plan)."""
    if tool not in KINDS or not conversation or FROM_PLAN.get():
        return None
    if not isinstance(args, dict):
        return None
    eid = str(args.get("engagement_id") or "")
    if tool != "start_research_report" and not store.get_engagement(eid):
        return None                                   # the tool's own error says there is no such engagement
    if tool in NEEDS_EVIDENCE:                     # files attached with this message still scope the work (attachments.py)
        from . import attachments
        ids = args.get("source_ids") if isinstance(args.get("source_ids"), list) else []
        refused = attachments.unnamed_fresh(eid, ids, bool(args.get("whole_engagement")))
        if refused:
            return refused
    turn = dict(store.TURN.get() or {})
    if is_question(turn.get("request")):
        return {"error": ("The person asked a question and did not ask for anything to be made. Do not start or plan work. "
                          "Answer the question now from this engagement's evidence: use recall or read_report, then reply "
                          "in a few sentences with the source of each claim as [S#].")}
    if args.get("brand"):
        args["brand"] = brand_asked(args["brand"], turn.get("request"))
    from . import agent as _agent            # a hashtag names its tool: a plan for any other tool is refused
    want = _agent.hashtag_tool(turn.get("request") or "")
    if want and tool != want[1] and not (want[1] == "start_diagram" and tool == "start_artifact"):
        return {"error": (f"The person wrote {want[0]}, which is work for the tool {want[1]}"
                          + (f" with kind {want[0].lstrip('#').lower()}" if want[1] == "start_artifact" else "")
                          + f". Do not plan with {tool}. Call {want[1]} once.")}
    tag = _agent.hashtag_kind(turn.get("request") or "") if tool == "start_artifact" else None
    if tag and str(args.get("kind") or "").strip().lower() != tag[1]:
        return {"error": (f"The person wrote {tag[0]}, which is the document kind {tag[1]}. Do not plan kind "
                          f"{args.get('kind')}. Call start_artifact once with kind {tag[1]}.")}
    other = named_instead_of_report(tool, turn.get("request"))
    if other:
        return {"error": (f"The person asked for {other[1]}, not a research report. Do not plan a report. Call {other[0]} "
                          f"once; its plan card offers research as a step when the evidence is thin.")}
    # What the request states in its own words sets the card's choices (E9; 25 Nov: "portrait" and "detailed" were
    # written in the request and the card opened on Landscape and Standard).
    from . import agent as _ag, router as _router
    props = (next((s for s in _ag.TOOLS if s["name"] == tool), None) or {}).get("input_schema", {}).get("properties", {})
    for k, v in _router.stated(turn.get("request") or "").items():
        enum = (props.get(k) or {}).get("enum")
        if k == "depth" or (enum and v in enum):
            args[k] = v
    steps, label = build_steps(tool, args, turn)
    pid = store.new_id("plan")
    now = time.time()
    _db().execute("INSERT INTO plans VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  (pid, conversation, eid, tool, json.dumps(args, ensure_ascii=False), json.dumps(turn, ensure_ascii=False),
                   json.dumps(steps, ensure_ascii=False), "proposed", "", "", "", now, now))
    store.event("plan_proposed", {"plan": pid, "tool": tool, "label": label, "conversation": conversation}, eid or None)
    return {"plan": "proposed", "plan_id": pid, "started": False,
            "message": ("Nothing has started. A plan card now shows the person each step, which steps are required, and the "
                        "expected time. They choose the steps and start it on the card. Do not call this tool again for "
                        "this request. Tell them in one short sentence that the plan is ready for them to review.")}


# ---- read ------------------------------------------------------------------------------------------------------------
def _node_state(task, specialist):
    nodes = [n for n in (task or {}).get("nodes") or [] if n["specialist"].split(" (")[0] == specialist]
    if not nodes:
        return "failed" if task and task["status"] in ("failed", "stopped") else "waiting"
    n = nodes[-1]
    if n["state"] == "running":
        return "failed" if task["status"] in ("failed", "stopped") else "working"
    return "failed" if n["state"] == "failed" else "done"


def get(pid):
    r = _db().execute("SELECT * FROM plans WHERE id = ?", (pid,)).fetchone()
    if not r:
        return None
    p = dict(r)
    steps = json.loads(p.pop("steps_json"))
    args = json.loads(p.pop("args_json"))
    turn = json.loads(p.pop("turn_json") or "{}")
    label = KINDS.get(p["tool"], ("Work", []))[0]
    research = store.get_task(p["research_task"]) if p["research_task"] else None
    task = store.get_task(p["task_id"]) if p["task_id"] else None
    live = p["status"] in ("running", "done", "failed")
    for s in steps:
        if not live:
            s["state"] = "done" if s["key"] == "material" else "waiting"
        elif s["key"] == "material":
            s["state"] = "done"
        elif not s["on"]:
            s["state"] = "skipped"
        elif s["key"] == "reddit":                # (26 Nov) the listening this card runs first
            rt = store.get_task(s["task_id"]) if s.get("task_id") else None
            st = (rt or {}).get("status")
            s["state"] = ("done" if st == "done" else "failed" if st in ("failed", "stopped") else "working" if rt
                          else "failed" if p["status"] == "failed" else "waiting")
        elif s["key"] == "research":
            st = (research or {}).get("status")
            s["state"] = "done" if st == "done" else "failed" if st in ("failed", "stopped") else "working" if research else "waiting"
            s["task_id"] = p["research_task"] or None
        else:
            s["state"] = _node_state(task, s["name"]) if task else ("failed" if p["status"] == "failed" else "waiting")
            if task and task["status"] == "done":
                s["state"] = "done"
    request = str(turn.get("request") or args.get("request") or args.get("goal") or "").strip()
    return {"id": pid, "status": p["status"], "label": label, "tool": p["tool"], "engagement_id": p["engagement_id"],
            "options": options_for(p["tool"], args, request.splitlines()[-1] if request else ""),
            "brief": understood(p["tool"], args, request, p["engagement_id"]) + brief_for(args),
            "request": request.splitlines()[-1][:300] if request else "", "steps": steps, "note": p["note"],
            "research_task": p["research_task"] or None, "task_id": p["task_id"] or None, "created": p["created"],
            "updated": p["updated"]}


def _set(pid, **kw):
    kw["updated"] = time.time()
    cols = ", ".join(f"{k} = ?" for k in kw)
    _db().execute(f"UPDATE plans SET {cols} WHERE id = ?", (*kw.values(), pid))


# ---- start -----------------------------------------------------------------------------------------------------------
def _choice(args, request):
    """(packs, no_packs) from the card's "Data packs" choice; ([], False) when the card offered none."""
    if not args.get("pack_choice") or own_packs(args.get("engagement_id")):
        return [p for p in (args.get("packs") or [])], False
    from . import hic
    return hic.packs_for_choice(args.get("pack_choice"), request, args.get("packs"))


def _research_args(args, turn, request, label="", new_title="", rivals=False):
    # The subject of the work, never the words that ordered it (24 Nov: "Now make an audio overview, a research report
    # ... from these findings" became the research goal, with "Evidence to make a audio overview from" after it, and the
    # search went looking for "McKinsey digital audio learning ... best practices").
    from . import router
    about = router.subject_of(request, args.get("engagement_id") or "", outputs=True) or subject(request, args)
    about = re.sub(r"[\[\]]", "", about).strip()
    persona = re.sub(r"[\[\]]", "", str(args.get("persona") or "")).strip()
    if persona and not persona.lower().startswith("the people this engagement"):
        about = f"The journey of {persona}"            # a journey map's research is about that person's journey
    elif re.search(r"(?i)\bjourney (?:map )?(?:of|for)\b", str(request or "")) and about and not about.lower().startswith("the journey"):
        about = f"The journey of {about}"
    extra = "; ".join(f"{k}: {str(args.get(k))[:160]}" for k in ("scope", "topic") if args.get(k)
                      and str(args.get(k)).strip().lower() != about.strip().lower())
    goal = about + (f" ({extra})" if extra else "")
    if rivals:
        # the whole request, not its 90-character title: 20 Nov, the search was sent "...compares with named pee" and
        # looked for generic peer benchmarking, with the subject (student AI use) gone
        whole = " ".join(re.sub(r"#\w+", " ", str(request or args.get("goal") or about)).split())[:400]
        about = f"Topic: {whole}"
        goal = (f"{about}. Named peers and competitors on this topic: which organizations, programs and vendors have acted, what "
                "each did, when, and what came of it; case studies with results. Evidence for a competitive gap analysis")
        extra = (extra + "; " if extra else "") + ("named organizations and what each has done; published case studies and "
                                                   "their outcomes; comparisons between institutions or vendors")
    return {"engagement_id": "" if new_title else (args.get("engagement_id") or ""), "engagement_title": new_title,
            "audience": router.presentation_free(request)[1] or "The person who asked for this work",
            "goal": goal[:600], "scope": (extra or about)[:600], "structure": "Findings grouped by theme, each with its quoted evidence",
            "constraints": "Only what the sources say; every claim carries its source", "success": [],
            "budget_usd": config.TASK_SPEND_APPROVAL_USD, "new_research_confirmed": True, "packs": list(turn.get("packs") or []) or _choice(args, request)[0],
            "no_packs": _choice(args, request)[1],
            "evidence_only": True,              # a plan's research step feeds its artifact; a report is its own request
            "collect_only": label == "Themes",  # themes read passages, not findings: collection is all they wait for
            "period": args.get("period") or "", "depth": args.get("depth") or "",      # the plan card's choices
            "required_sources": list(turn.get("required_sources") or args.get("required_sources") or [])}


def _wait(tid, check=5.0, limit=4 * 3600):
    end = time.time() + limit
    while time.time() < end:
        t = store.get_task(tid)
        if not t or t["status"] in ("done", "failed", "stopped"):
            return t
        time.sleep(check)
    return store.get_task(tid)


# (26 Nov) a depth word may sit between: "Run new deep research" was written from the evidence already held
_FRESH = re.compile(r"(?i)\b(new|fresh|more|additional|further|updated?|refresh|re-?run|again|latest|today|this week) "
                    r"(?:(?:deep|fast|quick|full|web|desk)\s+)?(research|data|evidence|sources|search|findings)\b|\bresearch (it |this )?again\b|\bfresh\b|"
                    # an order to research, or a period only new collection can meet (24 Nov, Case 4 re-run: "Research
                    # what changed this week ..." was written from evidence collected days earlier)
                    r"^\s*(please\s+)?(research|investigate|find out|look up)\b|"
                    r"\bwhat(?:'s| has| is)? (?:changed|new|happened)\b|"
                    r"\b(this week|today|yesterday|this morning|past (?:\d+|few) (?:days|weeks))\b")


def reuse_evidence(eid, request):
    """True when a report should be written from the evidence the engagement already holds: it covers the request and
    the person did not ask for new research (field test 23 Nov, S3: "a research report from these findings" collected
    and analysed everything again, eight minutes after the themes had)."""
    if not eid or _FRESH.search(str(request or "")):
        return False
    try:
        return bool(coverage(eid, request)["covered"])
    except Exception:
        return False


def _needs_findings(eid):
    """True when the engagement holds collected sources and no findings yet (a themes plan collected them)."""
    try:
        with open(store.safe_path(eid, "results/sources.json"), encoding="utf-8") as fh:
            n_src = len(json.load(fh).get("sources") or [])
    except (OSError, ValueError):
        return False
    try:
        with open(store.safe_path(eid, "results/findings.json"), encoding="utf-8") as fh:
            n_f = len(json.load(fh).get("findings") or [])
    except (OSError, ValueError):
        n_f = 0
    return n_src > 0 and n_f == 0


def _evidence_since(eid, since):
    """True when the engagement's published findings were written after `since` (another plan's research finished)."""
    try:
        return os.path.getmtime(store.safe_path(eid, "results/findings.json")) > since
    except OSError:
        return False


def _sibling_research(eid, not_before):
    """A research run on this engagement that is under way now (started by another plan card), or None."""
    r = _db().execute("SELECT id FROM tasks WHERE engagement_id = ? AND kind = 'research_report' AND status IN ('queued', 'running') "
                      "AND created >= ? ORDER BY created DESC LIMIT 1", (eid, not_before)).fetchone()
    return r["id"] if r else None


_STUDIO = threading.Lock()         # one plan's making step at a time: the studio has one graphics card
_RESEARCH_GATE = threading.Lock()  # plans started together decide one at a time who collects, so only one does


def _run(pid, wait=_wait):
    from . import agent
    r = _db().execute("SELECT * FROM plans WHERE id = ?", (pid,)).fetchone()
    args, turn, steps = json.loads(r["args_json"]), json.loads(r["turn_json"] or "{}"), json.loads(r["steps_json"])
    on = {s["key"] for s in steps if s["on"]}
    request = str(turn.get("request") or args.get("goal") or "").strip().splitlines()[-1:] or [""]
    from . import depthlevel
    turn = dict(turn or {})
    turn["level"] = depthlevel.of(args, turn.get("request"))          # every task this plan starts carries it (E3)
    tok_plan, tok_turn = FROM_PLAN.set(True), store.TURN.set(turn or None)
    if turn.get("trace"):                        # the plan's thread carries the trace of the turn that proposed it (WS-H3)
        store.TRACE.set(turn["trace"])
    try:
        # Field test 23 Nov (S3): every deliverable collected its own evidence (Case 3: a report re-ran research eight
        # minutes after the themes had). Plans on one engagement share one evidence base: a research run already
        # under way is waited for, and evidence that arrived since this card was made is used as it is.
        new_title = next((s.get("new_engagement") or "" for s in steps if s["key"] == "research"), "")
        eid0 = args.get("engagement_id") or ""
        shared = ""
        is_report = r["tool"] == "start_research_report"
        # a report on an engagement in focus is the same two things as every other output: the shared evidence, then
        # its own writing. So it waits for research already under way, or starts the shared research itself, and is
        # then written from that evidence (24 Nov: started beside three other plans, the report collected on its own)
        report_shares = is_report and bool(eid0) and bool(store.get_engagement(eid0)) and not reuse_evidence(eid0, request[0]) \
            and not _FRESH.search(str(request[0] or "")) and not args.get("publications")
        if report_shares:
            on = on | {"research"}
        red = next((x for x in steps if x["key"] == "reddit" and x["on"] and x.get("subreddits")), None)
        if red:                                   # (26 Nov) the subreddit the work needs, collected first, on this card
            from . import currency
            w = currency.for_choice(args.get("period")) if args.get("period") else currency.window(request[0])
            out = agent.execute_tool("start_social_analysis", {
                "engagement_id": eid0, "engagement_title": "" if eid0 else subject(request[0], args),
                "query": red.get("query") or subject(request[0], args), "subreddits": red["subreddits"],
                "objective": subject(request[0], args), "limit": 25, "budget_usd": 0,
                "brand": args.get("brand") if args.get("brand") in ("nxt", "nu", "deciem") else "nxt",
                "start_date": str(w.get("since") or "")[:10], "end_date": str(w.get("until") or "")[:10]})
            stid = (out or {}).get("task_id")
            if not stid:
                return _set(pid, status="failed", note=("Reddit listening did not start: " + str((out or {}).get("error") or
                                                                                               (out or {}).get("message") or ""))[:300])
            store.link_task(r["conversation"], stid)
            red["task_id"] = stid
            _set(pid, note="Collecting the Reddit posts first.", steps_json=json.dumps(steps, ensure_ascii=False))
            store.event("plan_step", {"plan": pid, "step": "reddit", "task_id": stid}, eid0 or None)
            if not eid0 and out.get("engagement_id"):
                eid0 = out["engagement_id"]
                args = dict(args, engagement_id=eid0)
                _set(pid, engagement_id=eid0, args_json=json.dumps(args, ensure_ascii=False))
            done = wait(stid)
            _set(pid, note="")
            if not done or done["status"] != "done":
                return _set(pid, status="failed", note="Reddit listening did not finish, so the work was not started.")
        _RESEARCH_GATE.acquire()
        gate_held = True
        if "research" in on and (not is_report or report_shares) and not new_title and not competitive(r["tool"], args) and eid0:
            sib = _sibling_research(eid0, r["created"] - 6 * 3600)
            if sib:
                _RESEARCH_GATE.release()
                gate_held = False
                _set(pid, research_task=sib, note="Using the research already running for this engagement.")
                store.event("plan_step", {"plan": pid, "step": "research", "task_id": sib, "shared": True}, eid0)
                done = wait(sib)
                if not done or done["status"] != "done":
                    return _set(pid, status="failed", note="The research this plan was waiting for did not finish, so the artifact was not started.")
                shared = sib
            elif _evidence_since(eid0, r["created"]) and coverage(eid0, request[0])["covered"]:
                shared = "evidence"
                _set(pid, note="Using the evidence collected for this engagement a moment ago; research was not run again.")
        if shared:
            if gate_held:
                _RESEARCH_GATE.release()
                gate_held = False
            for s in steps:
                if s["key"] == "research":
                    s["on"] = bool(shared != "evidence")
            _set(pid, steps_json=json.dumps(steps, ensure_ascii=False))
        elif "research" in on and (not is_report or report_shares):
            try:
                out = agent.launch_research(_research_args(args, turn, request[0], KINDS[r["tool"]][0], new_title,
                                                           rivals=competitive(r["tool"], args)))
            finally:
                if gate_held:
                    _RESEARCH_GATE.release()
                    gate_held = False
            tid = out.get("task_id")
            if not tid:
                return _set(pid, status="failed", note=str(out.get("error") or out.get("message") or "research did not start")[:300])
            store.link_task(r["conversation"], tid)
            _set(pid, research_task=tid)
            if new_title and out.get("engagement_id") and out["engagement_id"] != args.get("engagement_id"):
                # the artifact is made in the new engagement, from what the research found there, and nothing else
                args = dict(args, engagement_id=out["engagement_id"], source_ids=[], whole_engagement=True)
                _set(pid, engagement_id=out["engagement_id"], args_json=json.dumps(args, ensure_ascii=False))
            store.event("plan_step", {"plan": pid, "step": "research", "task_id": tid}, r["engagement_id"] or None)
            done = wait(tid)
            if not done or done["status"] != "done":
                return _set(pid, status="failed", note="Research did not finish, so the artifact was not started.")
        if gate_held:
            _RESEARCH_GATE.release()
            gate_held = False
        # sources collected for a themes plan carry no findings yet; every other output is written from findings
        eid1 = args.get("engagement_id") or ""
        if r["tool"] not in ("start_themes", "transcribe_video", "start_social_analysis") and eid1 and _needs_findings(eid1):
            with _RESEARCH_GATE:
                sib = _sibling_research(eid1, r["created"] - 6 * 3600)
                out = {"task_id": sib} if sib else agent.launch_research(dict(
                    _research_args(args, turn, request[0], KINDS[r["tool"]][0]), engagement_id=eid1, analyse_only=True, collect_only=False))
            if out.get("task_id"):
                _set(pid, research_task=out["task_id"], note="Pulling findings with exact quotes from the sources already collected.")
                done = wait(out["task_id"])
                _set(pid, note="")
                if not done or done["status"] != "done":
                    return _set(pid, status="failed", note="The findings could not be pulled from the collected sources, so the work was not started.")
        if r["tool"] == "start_research_report":
            args = dict(args, new_research_confirmed=True)
            if report_shares or reuse_evidence(args.get("engagement_id") or "", request[0]):
                args["from_evidence"] = True
        # the studio lane (lanes.py): two pieces of work that write with the same model are made side by side; work
        # that needs another model waits for the studio to empty
        from . import lanes
        slot = lanes.studio(lanes.family_of(r["tool"]), on_wait=lambda: _set(
            pid, note="Waiting for the studio: other work is using this machine's graphics card."), seconds=lanes.typical(r["tool"]))
        slot.__enter__()
        _set(pid, note="")
        try:
            out = agent.execute_tool(r["tool"], args)
            out = out if isinstance(out, dict) else {}
            tid = out.get("task_id")
            if not tid:
                why = out.get("error") or out.get("message") or ("it needs your approval" if out.get("approval") else "the studio did not start it")
                return _set(pid, status="failed", note=str(why)[:300])
            store.link_task(r["conversation"], tid)
            _set(pid, task_id=tid)
            store.event("plan_step", {"plan": pid, "step": "make", "task_id": tid}, r["engagement_id"] or None)
            done = wait(tid)
        finally:
            slot.__exit__(None, None, None)
        _set(pid, status="done" if done and done["status"] == "done" else "failed",
             note="" if done and done["status"] == "done" else str((done or {}).get("error") or "the work did not finish")[:300])
    except Exception as e:                                # the card must never be left saying "running" for work that died
        _set(pid, status="failed", note=f"{type(e).__name__}: {str(e)[:240]}")
    finally:
        if locals().get("gate_held"):
            _RESEARCH_GATE.release()
        store.TURN.reset(tok_turn)
        FROM_PLAN.reset(tok_plan)


# ---- (harness WS-H17, Harness Engineering R9) autonomy modes ----------------------------------------------------------
# ask: every artifact waits on its card for Start (the default, as before). auto-research: research and Reddit listening
# start at once. auto: every artifact starts at once. No mode touches the approval floor: sending, deleting, spending,
# dreaming's memory proposals and the person's curated memory always ask (control.py), because those are approval cards,
# not plan cards.
AUTONOMY_FILE = os.path.join(config.DATA_DIR, "autonomy.json")
MODES = ("ask", "auto-research", "auto")
AUTO_RESEARCH_TOOLS = ("start_research_report", "start_social_analysis")


def autonomy():
    try:
        with open(AUTONOMY_FILE, encoding="utf-8") as fh:
            m = str((json.load(fh) or {}).get("mode") or "ask")
    except (OSError, ValueError):
        m = "ask"
    return m if m in MODES else "ask"


def set_autonomy(mode):
    if mode not in MODES:
        raise ValueError(f"mode is one of {', '.join(MODES)}")
    os.makedirs(os.path.dirname(AUTONOMY_FILE), exist_ok=True)
    with open(AUTONOMY_FILE, "w", encoding="utf-8") as fh:
        json.dump({"mode": mode}, fh)
    store.event("autonomy_set", {"mode": mode})
    return {"mode": mode}


def autostart(tool, proposed):
    """A proposed plan starts at once when the autonomy mode allows it; the card still shows every step as it runs."""
    if not isinstance(proposed, dict) or proposed.get("plan") != "proposed" or not proposed.get("plan_id"):
        return proposed
    mode = autonomy()
    if mode == "ask" or (mode == "auto-research" and tool not in AUTO_RESEARCH_TOOLS):
        return proposed
    start(proposed["plan_id"])
    store.event("plan_autostarted", {"plan": proposed["plan_id"], "tool": tool, "mode": mode,
                                     "conversation": (store.TURN.get() or {}).get("conversation")})
    return dict(proposed, plan="started", started=True,
                message=(f"Started without waiting for the card (autonomy mode: {mode}); the card shows each step as it runs. "
                         "Tell the person in one short sentence that the work has started."))


def start(pid, skip=(), background=True, wait=_wait, options=None):
    """The person pressed Start. `skip` names the optional steps they switched off; required steps cannot be skipped.
    Only a proposed plan starts, so a second click does nothing."""
    r = _db().execute("SELECT * FROM plans WHERE id = ?", (pid,)).fetchone()
    if not r:
        raise KeyError(pid)
    if r["status"] != "proposed":
        return get(pid)
    steps = json.loads(r["steps_json"])
    skip = set(skip or ())
    for s in steps:
        s["on"] = True if s["required"] else s["key"] not in skip
    args = apply_options(r["tool"], json.loads(r["args_json"]), options)
    # a plan with nothing to build from is not started as a failure (25 Nov: research was switched off on an engagement
    # that held nothing, and the deck failed two minutes later): research stays on and the card says why
    if r["tool"] in NEEDS_EVIDENCE and getattr(config, "KEEP_RESEARCH_WHEN_EMPTY", True):
        try:
            from . import transcripts as _tr
            eid0 = str(args.get("engagement_id") or r["engagement_id"] or "")
            held = holdings(eid0)
            if not (held["findings"] or held["sources"] or _tr.uploaded_sources(eid0)):
                for s in steps:
                    if s["key"] == "research" and not s["on"]:
                        s["on"] = True
                        s["note"] = ("Kept on: this engagement holds no files, sources or findings, so there is nothing else "
                                     "to make this from. Attach files to work from them alone.")
        except Exception:
            pass
    _set(pid, steps_json=json.dumps(steps, ensure_ascii=False), args_json=json.dumps(args, ensure_ascii=False), status="running")
    store.event("plan_started", {"plan": pid, "skipped": sorted(k for k in skip if any(s["key"] == k and not s["required"] for s in steps))},
                r["engagement_id"] or None)
    if background:
        threading.Thread(target=_run, args=(pid, wait), daemon=True, name=f"plan-{pid}").start()
    else:
        _run(pid, wait)
    return get(pid)


def dismiss(pid):
    r = _db().execute("SELECT status FROM plans WHERE id = ?", (pid,)).fetchone()
    if not r:
        raise KeyError(pid)
    if r["status"] == "proposed":
        _set(pid, status="dismissed")
    return get(pid)


def recover():
    """At start-up: a plan that was running when the app stopped cannot continue its sequence; say so on its card."""
    try:
        _db().execute("UPDATE plans SET status = 'failed', note = 'The app restarted while this plan was running. "
                      "Work already started is on its own card; ask again to continue.', updated = ? WHERE status = 'running'",
                      (time.time(),))
    except Exception:
        pass

