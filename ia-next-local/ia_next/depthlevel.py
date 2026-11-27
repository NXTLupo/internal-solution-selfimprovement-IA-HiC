"""The detail a piece of work was asked for, carried to every builder (QA 25 Nov, E3 and E7).

The "Detailed" and "Deep" choices changed what research collected and nothing else: a deck had about ten slides and a
journey map four to six phases whatever was asked, so detailed work read as shallow. One level is decided here from
the plan card's choices and the request's own words, written into the task's brief, and read by each builder for its
shape, and by the plan for how much evidence that shape needs. Nothing here is about one subject, pack or brand.
"""
import contextvars
import json
import re

LEVELS = ("concise", "standard", "detailed")
CURRENT = contextvars.ContextVar("ia_next_depth_level", default="standard")

# What a builder makes at each level.
DECK_SLIDES = {"concise": (6, 8), "standard": (10, 13), "detailed": (16, 20)}          # slides, cover included
DECK_CASES = {"concise": 0, "standard": 1, "detailed": 3}                              # slides about one named organization
JOURNEY_PHASES = {"concise": ("three to four", 4), "standard": ("four to six", 6), "detailed": ("six to eight", 8)}
JOURNEY_QUOTES = {"concise": ("one more verbatim quote", 1), "standard": ("one or two more verbatim quotes", 2),
                  "detailed": ("two or three more verbatim quotes", 3)}
DOC_SECTIONS = {"concise": ("three to four", 3, 4), "standard": ("four to seven", 4, 7), "detailed": ("seven to ten", 7, 10)}
DOC_PARAGRAPHS = {"concise": "one or two paragraphs", "standard": "two to four paragraphs", "detailed": "three to five paragraphs"}

# The least evidence each kind of output rests on at each level: (sources, findings). A judgment, kept in one table
# so it can be tuned: a detailed deck of sixteen slides that each cite one to three sources needs about thirty.
_BAR = {"concise": (4, 6), "standard": (10, 14), "detailed": (30, 40)}
BAR = {"start_deck": _BAR, "start_artifact": _BAR,
       "start_journey_map": {"concise": (4, 6), "standard": (8, 12), "detailed": (20, 30)},
       "start_diagram": {"concise": (3, 4), "standard": (6, 8), "detailed": (15, 20)},
       "start_audio_overview": {"concise": (4, 6), "standard": (8, 12), "detailed": (15, 20)},
       "start_datatable": {"concise": (4, 6), "standard": (8, 12), "detailed": (15, 20)},
       "start_themes": {"concise": (6, 0), "standard": (12, 0), "detailed": (30, 0)}}
WORDS = {"start_deck": "deck", "start_artifact": "document", "start_journey_map": "journey map", "start_diagram": "picture",
         "start_audio_overview": "audio overview", "start_datatable": "data table", "start_themes": "set of themes"}


def of(brief, request=None):
    """concise, standard or detailed: the level already decided, else the card's choices, else the request's words."""
    b = brief if isinstance(brief, dict) else {}
    if b.get("level") in LEVELS:
        return b["level"]
    dens, depth = str(b.get("density") or "").lower(), str(b.get("depth") or "").lower()
    said = {}
    try:
        from . import router
        said = router.stated(request if request is not None else b.get("request") or "")
    except Exception:
        pass
    if dens == "detailed" or depth == "deep" or said.get("density") == "detailed":
        return "detailed"
    if dens == "concise" or said.get("density") == "concise":
        return "concise"
    return "standard"


# (26 Nov, owner: "I asked for a 50 slide deck, but the system says it is only making a 20 slide deck") A count the
# person states is the count: the level's range is only the default. Bounded so a typo cannot ask for a thousand.
_COUNT = re.compile(r"(?i)\b(\d{1,3})[\s-]*(?:-?\s*)(slides?|pages?)\b")
MAX_STATED_SLIDES = 80


def stated_slides(text):
    """The number of slides the person asked for in their own words ("a 50 slide deck", "40-slide", "30 slides"), or
    None. Bounded to 3..MAX_STATED_SLIDES."""
    m = _COUNT.search(str(text or ""))
    if not m:
        return None
    n = int(m.group(1))
    return max(3, min(MAX_STATED_SLIDES, n)) if n >= 3 else None


def task_request(tid):
    """The person's own words for a task (brief request, else goal), or ""."""
    try:
        from . import store
        t = store.get_task(tid) if tid else None
        brief = (t or {}).get("brief") or {}
        if isinstance(brief, str):
            brief = json.loads(brief)
        return str(brief.get("request") or brief.get("goal") or "")
    except Exception:
        return ""


def for_task(tid):
    """The level of a task, read from its brief; standard when it cannot be read."""
    try:
        from . import store
        t = store.get_task(tid) if tid else None
        brief = (t or {}).get("brief")
        if isinstance(brief, str):
            brief = json.loads(brief)
        return of(brief or {})
    except Exception:
        return "standard"


def need(tool, level):
    """(sources, findings) the output rests on at least, at this level; (0, 0) for a kind with no bar."""
    return (BAR.get(tool) or {}).get(level, (0, 0))


def thin(tool, level, sources, findings):
    """A sentence saying the held evidence is too little for this output at this level, or ""."""
    ns, nf = need(tool, level)
    if not ns or (sources >= ns and findings >= nf):
        return ""
    what = WORDS.get(tool, "output")
    held = f"{findings} findings from {sources} sources" if nf else f"{sources} sources"
    bar = f"at least {nf} findings from {ns} sources" if nf else f"at least {ns} sources"
    return f"That is thin for a {level} {what} ({held} held; a {level} {what} rests on {bar})."
