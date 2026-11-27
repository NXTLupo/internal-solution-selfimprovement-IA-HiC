"""Routing in code first, the model second (uplift plan 2026-11-23, WS-4).

Between 19 and 23 Nov the orchestration model misrouted five ways, each patched by a separate guard after the fact: a
report planned beside a prototype, a hashtag sent to the wrong tool, "#architecture" built as a technology audit, an
invented deck outline, and a transcription refused as a question because its link held a "?". Here the request is
read by rules before any model sees it. A confident route fills the tool's arguments from the message and goes through
the same plan gate as a model's call, so the person still gets a plan card; anything the rules cannot place, or whose
arguments need judgement (a research brief, Reddit listening), is left to the model.

`route(said)` -> {tool, kind, confidence, why} or None. `fill(r, focus, said)` -> the tool's arguments, or None when a
required argument cannot be read from the message. The hashtag tables live here; agent.py re-exports them.
"""
import re

# ---- the tables (moved from agent.py; agent re-exports them) ---------------------------------------------------------
HASHTAG_TOOLS = [(r"#(transcribe|transcript|transcription)\b", "transcribe_video"), (r"#(reddit|social)\b", "start_social_analysis"),
                 (r"#(mindmap|diagram|infographic)\b", "start_diagram"),
                 (r"#(slides|deck)\b", "start_deck"), (r"#journey\b", "start_journey_map"), (r"#themes\b", "start_themes"),
                 (r"#(datatable|table)\b", "start_datatable"), (r"#(audio|podcast)\b", "start_audio_overview"),
                 (r"#(proto|prototype)\b", "start_prototype"), (r"#(report|research)\b", "start_research_report"),
                 (r"#(quiz|faq|flashcards|studyguide|chronology|timeline|brief|prd|roadmap|strategy|personas|blueprint|"
                  r"competitive|gap|architecture|arch|org|audit|whitepaper|explainer|recs|recommendations|case-study|persona)\b", "start_artifact")]

HASHTAG_KINDS = {"quiz": "quiz", "faq": "faq", "flashcards": "flashcards", "studyguide": "studyguide", "chronology": "chronology",
                 "timeline": "chronology", "brief": "brief", "prd": "prd", "roadmap": "roadmap", "strategy": "strategy",
                 "personas": "personas", "persona": "personas", "blueprint": "blueprint", "competitive": "competitive",
                 "gap": "gap", "architecture": "arch", "arch": "arch", "org": "org", "audit": "tech-audit",
                 "whitepaper": "whitepaper", "explainer": "explainer", "recs": "recommendations",
                 "recommendations": "recommendations", "case-study": "case-study"}

# Words that name a document kind when no hashtag does ("Write a competitive gap analysis ...").
KIND_WORDS = [(r"\bgap analys[ie]s\b", "gap"), (r"\bcompetitive (analysis|landscape)\b", "competitive"),
              (r"\bpersonas?\b(?! of)", "personas"), (r"\b(technical |systems? )?architecture( map| diagram)?\b", "arch"),
              (r"\btech(nology)? audit\b", "tech-audit"), (r"\broadmap\b", "roadmap"), (r"\bservice blueprint\b", "blueprint"),
              (r"\bproduct requirements|\bprd\b", "prd"), (r"\bexecutive brief\b", "brief"), (r"\brecommendations\b", "recommendations"),
              (r"\bcase stud(y|ies)\b", "case-study"), (r"\bwhite ?paper\b", "whitepaper"), (r"\bexplainer\b", "explainer"),
              (r"\bstudy guide\b", "studyguide"), (r"\bflash ?cards\b", "flashcards"), (r"\bquiz\b", "quiz"), (r"\bfaq\b", "faq"),
              (r"\bchronology\b|\btimeline of events\b", "chronology"), (r"\bstrategy\b", "strategy")]

VIDEO_LINK = re.compile(r"https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch|shorts|live|embed)|youtu\.be/|vimeo\.com/)\S+|"
                        r"https?://\S+\.(?:mp4|mov|mkv|webm|m4a|mp3|wav)(?:\?\S*)?", re.I)
_MAKE = re.compile(r"(?i)^\W*(please\s+)?(build|make|create|draft|generate|design|produce|prepare|put together|write|draw|map|"
                   r"transcribe|give me|i need|i want)\b")


def hashtag_tool(said):
    for rx, tool in HASHTAG_TOOLS:
        m = re.search(rx, said or "", re.I)
        if m:
            return m.group(0), tool
    return None


def hashtag_kind(said):
    """(hashtag, kind) for the first document hashtag in a message, or None."""
    for m in re.finditer(r"#([a-z][a-z-]*)\b", said or "", re.I):
        k = HASHTAG_KINDS.get(m.group(1).lower())
        if k:
            return m.group(0), k
    return None


def _clean(said):
    s = str(said or "").strip().splitlines()[-1] if str(said or "").strip() else ""
    return re.sub(r"^\([^)]*\)\s*", "", s).strip()


def kind_from_words(said):
    for rx, kind in KIND_WORDS:
        if re.search(rx, said or "", re.I):
            return kind
    return ""


# ---- route --------------------------------------------------------------------------------------------------------------
# Plain-word outputs, in the order they are tried (a "journey map" before a "map", a "mind map" before a "diagram").
NAMED = [(r"\bjourney ?maps?\b|\bmap the journey\b", "start_journey_map"), (r"\bmind ?maps?\b", "start_diagram"),
         (r"\binfographics?\b", "start_diagram"), (r"\b(slide )?decks?\b|\bslides\b|\bpresentation\b", "start_deck"),
         (r"\bprototypes?\b", "start_prototype"), (r"\b(podcast|audio overview)\b", "start_audio_overview"),
         (r"\bdata ?table\b|\ba table (of|comparing)\b", "start_datatable"), (r"\bthemes\b", "start_themes"),
         (r"\btranscri(be|pt|ption)\b", "transcribe_video")]


def route(said):
    """The tool a request names, by rules. None when nothing names one (the model decides)."""
    from . import plan
    text = _clean(said)
    if not text:
        return None
    link = VIDEO_LINK.search(text)
    if link:
        return {"tool": "transcribe_video", "kind": "", "confidence": "high", "why": "the message holds a video or recording link"}
    tag = hashtag_tool(text)
    if tag:
        tool = tag[1]
        kind = (hashtag_kind(text) or ("", ""))[1] if tool == "start_artifact" else ""
        return {"tool": tool, "kind": kind, "confidence": "high", "why": f"the hashtag {tag[0]}"}
    if plan.is_question(text):
        return {"tool": None, "kind": "", "confidence": "high", "why": "a question that asks for nothing to be made"}
    if not _MAKE.search(text):
        return None
    for rx, tool in NAMED:
        if re.search(rx, text, re.I):
            return {"tool": tool, "kind": "", "confidence": "high", "why": f"the request names {re.search(rx, text, re.I).group(0)}"}
    kind = kind_from_words(text)
    if kind:
        return {"tool": "start_artifact", "kind": kind, "confidence": "high", "why": f"the request names a {kind} document"}
    # "Write a short report for a provost from these findings" was left to the model, which sent it to the document
    # builder: 10.8 minutes, against 2 for the report writer on the same evidence (24 Nov). A request that asks for a
    # report, and names no other kind of document above, is the research report.
    if re.search(r"\breports?\b", text, re.I):
        return {"tool": "start_research_report", "kind": "", "confidence": "high", "why": "the request asks for a report"}
    return None


# ---- fill -----------------------------------------------------------------------------------------------------------------
def brand_of(text):
    t = (text or "").lower()
    if "#deciem" in t or re.search(r"\bdeciem\b", t):
        return "deciem"
    if "#nu" in t or re.search(r"\bnortheastern\b", t):
        return "nu"
    return "nxt"


def _audience(text):
    """Who the work is for: "for the board", or the longer form "for [educators to understand AI usage]"."""
    return audience_of(re.sub(r"[\[\]]", " ", str(text or ""))) or presentation_free(text)[1]


def audience_of(text):
    m = re.search(r"\bfor (?:a |an |the |our |my )?([a-z][a-z0-9 '\-]{2,40}?)(?=\s*(?:[,.:;!?]|$| on | about | to | with | that | who | "
                  r"comparing | explaining | how | what | showing | in | of ))", text or "", re.I)
    if not m:
        return ""
    aud = m.group(1).strip()
    return "" if aud.lower() in ("me", "us", "this", "that", "it", "them", "now") else aud


def goal_of(text):
    t = VIDEO_LINK.sub(" ", text or "")
    t = re.sub(r"#[a-z][\w-]*", " ", t, flags=re.I)
    return re.sub(r"\s+", " ", t).strip(" .:-")[:600]


def persona_of(text):
    b = re.search(r"journey (?:map )?(?:of|for) (?:a |an |the )?\[([^\]]{3,90})\]", text or "", re.I)
    if b:                                          # the page's own template puts the persona in brackets
        return b.group(1).strip()
    m = re.search(r"journey (?:map )?(?:of|for) (?:a |an |the )?\[?(.{3,90}?)\]?(?=\s*(?:[,.;:]|$| from | in this| through | across ))",
                  text or "", re.I)
    return m.group(1).strip() if m else ""


def audio_format(text):
    t = (text or "").lower()
    for word, fmt in (("debate", "debate"), ("critique", "critique"), ("brief", "brief")):
        if word in t:
            return fmt
    return "deep-dive"


def fill(r, focus, said):
    """The arguments for a confident route, read from the message; None when one it needs cannot be read."""
    text = _clean(said)
    tool, brand, goal = r.get("tool"), brand_of(text), goal_of(text)
    if not tool or not focus or not goal:
        return None
    whole = goal
    if tool not in ("transcribe_video", "start_journey_map"):
        # the subject, never the whole sentence (field test A2), and never the output's own name (QA 25 Nov: the
        # goal of an infographic read "infographic claims automation ...")
        goal = subject_of(text, focus, outputs=True) or subject_of(text, focus) or goal
    base = {"engagement_id": focus}
    if tool == "transcribe_video":
        m = VIDEO_LINK.search(text)
        return dict(base, url=m.group(0).rstrip(").,;"), brand=brand) if m else None
    if tool == "start_deck":
        return dict(base, audience=_audience(whole) or "the people this engagement serves", outline=[], brand=brand)
    if tool == "start_artifact":
        kind = r.get("kind") or kind_from_words(text)
        return dict(base, kind=kind, goal=goal, brand=brand) if kind else None
    if tool in ("start_themes", "start_datatable"):
        return dict(base, goal=goal, brand=brand)
    if tool == "start_diagram":
        mode = "infographic" if re.search(r"infographic", text, re.I) else "diagram"
        return dict(base, goal=goal, mode=mode, brand=brand)
    if tool == "start_audio_overview":
        return dict(base, goal=goal, format=audio_format(text), brand=brand)
    if tool == "start_journey_map":
        # field test S5: without a persona in the "journey of ..." form the request went to the model, which took
        # four minutes to write one; the words beside "journey map" are read, else the people the engagement is about
        persona = persona_near(text) or "the people this engagement is about"
        return dict(base, persona=persona, scope=subject_of(text, focus) or goal, brand=brand)
    if tool == "start_prototype":
        return dict(base, experience=goal, audience=_audience(whole) or "the people this engagement serves", must_include=[], brand=brand)
    if tool == "start_research_report":
        # field test S5: a #report waited five minutes while the model wrote audience, scope and structure before any
        # card appeared. The brief is written here from the request; the card shows it and the person can change it.
        return dict(base, engagement_title="", audience=audience_of(whole) or "The person who asked for this work", goal=goal,
                    scope=goal, structure="The answer first, then findings grouped by theme, each with its quoted evidence",
                    constraints="Only what the sources say; every claim carries its source", success=[], budget_usd=0,
                    new_research_confirmed=False, packs=[])
    return None                        # Reddit listening needs arguments the model reads from the request


# ---- field test 23 Nov, A1 and A2: several outputs in one request, and a goal that is the subject ---------------------
# "Now make an audio overview, a research report, a themes deck and a student journey map" was answered "All four are
# planned and ready for you to review on their cards" with no tool called and no plan anywhere. A request that names
# two or more outputs is split here, in code, into one plan card per output. And the goal each card carries is the
# subject of the work, never the person's whole sentence ("I don't see any plan cards. Start with the audio overview
# of these findings" became an audio overview's goal).
MULTI = [(r"\bjourney ?maps?\b|\bmap (?:the|a) journey\b", "start_journey_map", "a journey map"),
         (r"\bmind ?maps?\b|\binfographics?\b|\bdiagrams?\b", "start_diagram", "a diagram"),
         (r"\b(?:audio overview|podcast)\b", "start_audio_overview", "an audio overview"),
         (r"\b(?:slide )?decks?\b|\bslides\b|\bpresentation\b|\bpowerpoint\b", "start_deck", "a deck"),
         (r"\bprototypes?\b", "start_prototype", "a prototype"),
         (r"\bdata ?tables?\b", "start_datatable", "a data table"),
         (r"\b(?:research )?reports?\b|\bbriefing\b", "start_research_report", "a research report"),
         # "themes" names an output only when a verb asks for them ("find the main themes", "exhaustive themes on ...");
         # in "a deck on the main AI themes and trends" it is the subject (24 Nov: that request was split in two)
         (r"\b(?:find|extract|pull out|identify|surface|generate|produce|run|create|build|make|give me|exhaustive|comprehensive)\b"
          r"\W+(?:\w+\W+){0,3}?themes\b(?!\W+(?:\w+\W+){0,2}(?:deck|slides|presentation|powerpoint))", "start_themes", "themes")]
_MAKE_ANY = re.compile(r"(?i)\b(build|make|create|draft|generate|design|produce|prepare|put together|write|draw|map|give me|"
                       r"i need|i want|i'd like|then|next|also|and then|followed by|start with)\b")


def split(said):
    """The outputs a request names when it names two or more: [{tool, kind, words, at}] in the order written. [] for
    a request that names fewer, a question, or one with a link to transcribe."""
    from . import plan
    text = _clean(said)
    if not text or VIDEO_LINK.search(text) or plan.is_question(text):
        return []
    found = {}
    for m in re.finditer(r"#([a-z][a-z-]*)\b", text, re.I):
        hit = hashtag_tool(m.group(0))
        if hit:
            kind = HASHTAG_KINDS.get(m.group(1).lower(), "") if hit[1] == "start_artifact" else ""
            found.setdefault((hit[1], kind), {"tool": hit[1], "kind": kind, "words": m.group(0), "at": m.start()})
    if _MAKE_ANY.search(text) or found:
        plain = re.sub(r"#[a-z][\w-]*", lambda m: " " * len(m.group(0)), text, flags=re.I)
        for rx, tool, words in MULTI:
            m = re.search(rx, plain, re.I)
            if m and not any(k[0] == tool for k in found):
                found[(tool, "")] = {"tool": tool, "kind": "", "words": words, "at": m.start()}
        for rx, kind in KIND_WORDS:
            m = re.search(rx, plain, re.I)
            if m and kind not in ("strategy",) and not any(k == ("start_artifact", kind) for k in found):
                found[("start_artifact", kind)] = {"tool": "start_artifact", "kind": kind, "words": f"a {kind} document", "at": m.start()}
    out = sorted(found.values(), key=lambda r: r["at"])
    return [dict(r, confidence="high", why=f"the request names {r['words']}") for r in out] if len(out) >= 2 else []


_CHATTER = [r"(?i)^[^.?!]*\b(i (?:do not|don't|can't|cannot) see|where (?:is|are)|nothing (?:happened|shows?)|no plan cards?)\b[^.?!]*[.?!]\s*",
            r"(?i)(^|[.,;!]\s*)(please|now|next|then|also|first|finally|ok(?:ay)?|thanks?|thank you)\b[ ,]*",
            r"(?i)\bplease\b",
            r"(?i)\b(start with|begin with|go ahead and|can you|could you|i want you to|i need you to|i'd like you to|i want|i need|i'd like)\b",
            r"(?i)\b(build|make|create|draft|generate|design|produce|prepare|put together|write|draw|give me|show me)\b( me)?",
            r"(?i)\b(using|use|with|from|in|search) (?:the |both |all |my |these |those )?[\w &-]{0,60}?data ?packs?\b",
            r"(?i)\b(of|from|using|based on|out of|about) (these|those|the|this|that|our|my) (findings|results|evidence|research|sources|themes|material|engagement)\b",
            r"(?i)\b(be )?(exhaustive|comprehensive|thorough|detailed)(ly)?\b",
            # the order to research is not what is researched ("do deep research on", "collect data on", "a research run")
            r"(?i)\b(?:do|run|conduct|carry out|start|kick off)\s+(?:a\s+|some\s+)?(?:deep\s+|detailed\s+)?research(?:\s+run)?\b(?:\s+(?:on|into|about))?",
            r"(?i)\bcollect(?:ing)?\s+(?:the\s+)?(?:data|evidence|sources|articles)\b(?:\s+(?:on|about))?",
            r"(?i)\b(a|an|the|one|some|and|or|then|plus|as well as|followed by|of|for|on|about)\b(?=\W*(?:$|,|\.|\band\b))"]


# ---- the request governs (QA 25 Nov, E9) -----------------------------------------------------------------------------
# A brand is how the output looks and an audience is who it is for. Neither is what the work is about. A request for
# "a detailed deck in the Northeastern brand for faculty to understand trends in AI adoption across major US
# universities" stored the research goal "in the Northeastern brand for faculty to understand trends ...", and the
# search went looking for Northeastern University. These rules hold for any brand name and any audience: they read the
# shape of the phrase, not a list of organizations.
_BRAND_PHRASE = re.compile(
    r"(?i)\b(?:in|using|with|following|per)\s+(?:the\s+|our\s+|their\s+)?[\w&.'-]+(?:\s+[\w&.'-]+){0,3}?\s+"
    r"(?:brand(?:ing)?|house style|visual identity|brand template|brand guidelines)\b"
    r"(?!\s+(?:loyalty|awareness|strategy|equity|value|perception|image|marketing|management|positioning|trust|voice))"
    r"|\b[\w&.'-]+[- ]branded\b")
_FOR_TO = re.compile(
    r"(?i)\bfor\s+\[?\s*((?:the |a |an |our |my )?[\w' -]{2,60}?)\s+to\s+(?:better\s+|quickly\s+)?"
    r"(?:understand|see|learn(?: about)?|know|decide(?: on)?|grasp|review|explore|assess|evaluate|"
    r"get up to speed on|be briefed on|act on|plan for)\b\s*")
# "a deck for operations leaders": the people named straight after an output are who it is for (25 Nov: the goal read
# "... grocery retail and a for operations leaders"). "strategies for nursing staff" names no output and keeps its words.
# (26 Nov) the basis may sit between the output and its audience, and the audience may carry a parenthetical: "a 50
# slide deck from this research for retail leadership team (C-suite and senior retail executives)" made the audience
# the plan card's subject.
_FOR_AFTER_OUTPUT = re.compile(
    r"(?i)\b(deck|slides?|slide deck|presentation|powerpoint|report|infographic|journey map|brief|briefing|overview|"
    r"one[- ]pager|summary|document|memo|poster|diagram|mind ?map|podcast|table|prototype|analysis)"
    r"((?:\s+(?:from|using|based on|built on|drawing on)\s+(?:this|the|these|that|my|our)\s+(?:research|findings|engagement|"
    r"evidence|material|sources|report|work|analysis))?)\s+for\s+"
    r"((?:the |a |an |our |my )?[\w' -]{2,50}?(?:\s*\([^()]{2,90}\))?)"
    r"(?=\s*(?:$|[,.;]|\b(?:on|about|covering|that|which|and|then|in|using|with)\b))")


# (26 Nov) "Deep research: how shoppers ... in the last 90 days, for a retail leadership team. Use the Retail data pack":
# a "for" clause set off by a comma at the end of a sentence names who the work is for, never what it is about.
_FOR_CLAUSE_END = re.compile(r"(?i),\s*for\s+((?:a |an |the |our |my )?[\w' -]{2,60}?(?:\s*\([^()]{2,90}\))?)\s*(?=[.!?](?:\s|$)|$)")


# The person's own files as the basis of the work (owner, 25 Nov, E16): "based on the uploaded files", "from my
# transcripts", "using the interviews I attached". These words name the evidence, not the subject.
_FILE_NOUN = r"(?:files?|uploads?|documents?|docs|transcripts?|recordings?|interviews?|videos?|notes|materials?|pdfs?|decks?|spreadsheets?)"
_FILES_BASIS = re.compile(
    r"(?i)\b(?:uploaded|attached)\s+" + _FILE_NOUN + r"\b"
    r"|\b(?:my|these|those|our)\s+(?:own\s+)?(?:uploaded\s+|attached\s+)?" + _FILE_NOUN + r"\b"
    r"|\b(?:the\s+)?" + _FILE_NOUN + r"\s+(?:that\s+)?I(?:'ve| have)?\s+(?:just\s+)?(?:uploaded|attached|added|shared|dropped)\b")
_FILES_PHRASE = re.compile(
    r"(?i)[,;]?\s*\b(?:based\s+(?:solely\s+|only\s+|just\s+)?on|drawn\s+from|built\s+from|from|using|out\s+of)\s+(?:only\s+|just\s+)?"
    r"(?:the\s+|my\s+|these\s+|those\s+|our\s+)?(?:own\s+)?(?:uploaded\s+|attached\s+)?" + _FILE_NOUN
    + r"(?:\s+(?:that\s+)?I(?:'ve| have)?\s+(?:just\s+)?(?:uploaded|attached|added|shared))?(?:\s+(?:only|alone))?(?:\s+in\s+this\s+engagement)?\b"
    r"|\bfrom\s+this\s+engagement\b")
_WANTS_RESEARCH = re.compile(r"(?i)\b(research|the web|web search|search the|internet|online|data ?packs?|published sources|reddit|news)\b")


def files_basis(text):
    """True when the request names the person's own files as what the work is made from."""
    return bool(_FILES_BASIS.search(str(text or "")))


def files_only(text):
    """True when the work is to rest on the person's files and nothing else was asked for."""
    t = str(text or "")
    return files_basis(t) and not _WANTS_RESEARCH.search(_FILES_PHRASE.sub(" ", t))


def _period_free(t):
    """The request without the words that only name its period ("going back 90 days", "in the last 3 months", "a
    90-day window"): the period is a choice of the work and is carried on its own (currency.window)."""
    from . import currency
    lead = r"(?:\b(?:in|over|from|within|during|for|across|with|of)\s+)?(?:\b(?:a|an|the)\s+)?"
    for rx in (currency._SPAN_LEAD, currency._SPAN_TAIL, currency._SPAN):
        t = re.sub("(?i)" + lead + rx.pattern.replace("(?i)", ""), " ", t)
    return t


_SETTING_WORDS = re.compile(
    r"(?i)\(\s*(?:detailed|standard|concise|brief|short|long|deep|fast|high|low)[\w ]*\)"
    r"|\b(?:in\s+)?(?:portrait|landscape|square)(?:\s+(?:format|orientation|shape|layout))?\b")
_DETAIL_UP = re.compile(r"(?i)\b(detailed|in[- ]depth|comprehensive|exhaustive|thorough|deep[- ]dive|deep)\b")
_DETAIL_DOWN = re.compile(r"(?i)\b(concise|brief|short|simple|quick|high[- ]level)\b")


def presentation_free(text):
    """(text without its brand, audience and setting phrases, audience named or "")."""
    t = str(text or "")
    audience = ""
    m = _FOR_TO.search(t)
    if m:
        audience = " ".join(m.group(1).split()).strip(" []")
        t = t[:m.start()] + " " + t[m.end():]
    t = _BRAND_PHRASE.sub(" ", t)
    t = _SETTING_WORDS.sub(" ", t)
    t = _period_free(t)
    t = _FILES_PHRASE.sub(" ", t)                # which files the work rests on is not what it is about
    if not audience:                             # after the brand is gone: "an infographic in the X brand for store leaders on ..."
        m = _FOR_AFTER_OUTPUT.search(t)
        if m:
            audience = " ".join(m.group(3).split()).strip(" []")
            t = t[:m.start()] + m.group(1) + m.group(2) + " " + t[m.end():]
    if not audience:
        m = _FOR_CLAUSE_END.search(t)
        if m:
            audience = " ".join(m.group(1).split()).strip(" []")
            t = t[:m.start()] + t[m.end():]
    t = re.sub(r"[\[\]]", " ", t)
    t = re.sub(r"\(\s*\)", " ", t)
    return re.sub(r"\s+", " ", t).strip(), audience


def stated(text):
    """The choices a request states in its own words, as the plan card's starting values:
    {"orientation", "density", "depth", "brand"}; only what was said."""
    t = str(text or "")
    out = {}
    m = re.search(r"(?i)\b(portrait|landscape|square)\b", t)
    if m:
        out["orientation"] = m.group(1).lower()
    if _DETAIL_UP.search(t):
        out["density"], out["depth"] = "detailed", "deep"
    elif _DETAIL_DOWN.search(t) and not re.search(r"(?i)\bshort[- ]term\b", t):
        out["density"] = "concise"
    b = brand_of(t)
    if b != "nxt" or re.search(r"(?i)#nxt\b|\bnxt (?:humans )?brand", t):
        out["brand"] = b
    return out


# Which sources to read is a choice of the work, never its subject (26 Nov: "Use the Retail data pack, YouTube and
# Reddit" left "for a retail leadership team., YouTube and Reddit" on the plan card).
_SOURCE_NAME = (r"(?:the\s+|my\s+|our\s+)?(?:[\w&-]+\s+){0,3}?(?:data\s+packs?|packs?|youtube(?:\s+videos)?|reddit(?:\s+posts)?|"
                r"sub-?reddits?|news|the\s+web|web\s+search|podcasts?|rss(?:\s+feeds)?|feeds?)")
# an instruction, not content: "Use ..."/"Draw on ..." opening a sentence, or "using ..."/"drawing on ..." anywhere but
# after a form of "be" ("How teams use Reddit" and "how teams are using Reddit" are subjects and stay whole)
_SOURCES_CLAUSE = re.compile(r"(?i)(?:(?:^|(?<=[,;.:?!]))\s*(?:please\s+)?(?:use|draw\s+on)"
                             r"|(?<=\s)(?<!\bare\s)(?<!\bis\s)(?<!\bwas\s)(?<!\bwere\s)(?<!\bbe\s)(?<!\bbeen\s)(?:using|drawing\s+on))\s+" + _SOURCE_NAME
                             + r"(?:\s*(?:,\s*(?:and\s+)?|\band\b|&)\s*" + _SOURCE_NAME + r")*\s*(?:as\s+(?:the\s+)?(?:evidence|sources?))?\s*(?=[,;.]|$)")
# (26 Nov) "Run new deep research: ..." kept its order as the plan card's subject; the label may carry a verb and "new"
_MODE_LABEL = re.compile(r"(?i)^\s*(?:(?:please\s+)?(?:run|do|start|begin)\s+(?:a\s+)?)?(?:(?:new|fresh|more)\s+)?"
                         r"(?:deep|fast|quick|full)\s+research\s*:\s*")


def sources_free(text):
    """The request without its sources clause ("Use the Retail data pack, YouTube and Reddit") and its mode label
    ("Deep research:"), with the punctuation they leave behind tidied."""
    t = _SOURCES_CLAUSE.sub(" ", _MODE_LABEL.sub("", str(text or "")))
    # a stated length is a choice of the output, not its subject ("a comprehensive, 50 slide deck" left "50", 26 Nov)
    t = re.sub(r"(?i)\b\d{1,3}[\s-]*(?:slides?|pages?|minutes?|words?)\b", " ", t)
    t = re.sub(r"\.\s*,", ",", t)
    t = re.sub(r"\s+([,;.])", r"\1", re.sub(r"\s+", " ", t))
    return re.sub(r"([,;.])\1+", r"\1", t).strip()


def subject_of(text, focus="", outputs=False):
    """What the work is about: the request without hashtags, links, the names of the outputs, the making verbs and
    the conversational text around them. When too little is left to be a subject, the engagement's objective.
    `outputs` is True for a request that lists several outputs: every output name goes. For a single request only a
    name with its article goes ("a deck on nurse staffing"), so "the main themes and trends in AI" keeps its themes."""
    t = VIDEO_LINK.sub(" ", _clean(text))
    t = re.sub(r"#[a-z][\w-]*", " ", t, flags=re.I)
    t, _ = presentation_free(t)                    # brand, audience and setting words are never the subject (E9)
    t = sources_free(t)
    if outputs:
        # A request that states its subject in one clause and orders the outputs in others ("Research what changed
        # this week in nurse staffing, write a short report, then build a prototype of a planner"): the subject is
        # the clause that names no output. Cutting the output names out of the whole sentence left "a short a of a
        # staffing planner" in the goal (24 Nov, Case 4 re-run).
        clauses = [c.strip() for c in re.split(r"\s*[,;.]\s*|\s+(?:and\s+)?then\s+", t) if c.strip()]
        plain = [c for c in clauses if not any(re.search(rx, c, flags=re.I) for rx, _, _ in MULTI)]
        if plain and len(plain) < len(clauses):
            kept = re.sub(r"(?i)^(?:please\s+)?(?:research|investigate|find out|look into|look up|study|examine)\s+", "", " ".join(plain)).strip(" .,:;-?!")
            if len([w for w in re.findall(r"[A-Za-z][A-Za-z'-]+", kept) if len(w) > 2]) >= 3:
                return kept[:600]
    for rx, tool, _ in MULTI:
        if not outputs and tool == "start_themes":
            continue                                 # "the themes in AI" is a subject, not an order for a themes page
        t = re.sub(rx if outputs else r"\b(?:a|an|the|one|this|that)\s+(?:" + rx + ")", " ", t, flags=re.I)
    if outputs:
        t = re.sub(r"(?i)\bthemes?\b(?=\W+(?:\w+\W+){0,2}(?:deck|slides|presentation|powerpoint))", " ", t)
    for rx in _CHATTER:
        t = re.sub(rx, " ", t)
    for _ in range(3):                               # connectives left dangling once the output names are gone
        t = re.sub(r"(?i)(^|[,;.])\s*(and|or|then|plus|a|an|the|of|for|on|about|to|with)\b\s*(?=$|[,;.])", r"\1", t)
        t = re.sub(r"(?i)^\W*(and|or|then|plus|of|for|on|about|to|with|a|an|the)\b\s*|\s*\b(and|or|then|plus|of|for|on|about|to|with|a|an|the)\W*$", " ", t)
    t = re.sub(r"\s*[,;:]\s*(?=[,;:.]|$)", " ", re.sub(r"\s+", " ", t))
    t = re.sub(r"\s+([?.!,;:])", r"\1", t).strip(" .,:;-?!")
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]+", t) if len(w) > 2]
    # a short subject with an acronym is still a subject ("AI usage" fell back to the engagement's title, 25 Nov)
    if len(words) >= 2 or (words and re.search(r"(?<![A-Za-z])[A-Z]{2,5}(?![A-Za-z])", t)):
        return t[:600]
    try:
        from . import store
        eng = store.get_engagement(focus) if focus else None
    except Exception:
        eng = None
    if eng:
        return " ".join(str(eng.get("objective") or eng.get("title") or "").split())[:600] or t[:600]
    return t[:600]


def persona_near(text):
    """The persona of "a student journey map" or "the journey of a transfer student": the words beside the output."""
    got = persona_of(text)
    if got:
        return got
    m = re.search(r"(?i)\b(?:a|an|the)?\s*((?:[a-z][a-z-]+\s){1,3})journey ?maps?\b", text or "")
    words = [w for w in (m.group(1).split() if m else []) if w.lower() not in
             ("a", "an", "the", "and", "then", "also", "one", "this", "that", "new", "full", "detailed", "customer", "user")
             and not re.fullmatch(r"(?i)deck|report|overview|slides|powerpoint|themes", w)]
    return " ".join(words[-2:]) if words else ""


def fill_many(routes, focus, said):
    """[(route, args)] for a request that names several outputs, each with the same subject. A report gets a brief
    written here (its plan card shows it and the person can change the request); a journey map without a named persona
    takes the people the engagement is about."""
    text = _clean(said)
    brand, about = brand_of(text), subject_of(text, focus, outputs=True)
    if not focus or not about:
        return []
    base, out = {"engagement_id": focus}, []
    for r in routes:
        tool = r["tool"]
        if tool == "start_research_report":
            args = dict(base, engagement_title="", audience="The person who asked for this work", goal=about, scope=about,
                        structure="The answer first, then findings grouped by theme, each with its quoted evidence",
                        constraints="Only what the sources say; every claim carries its source", success=[], budget_usd=0,
                        new_research_confirmed=False, packs=[])
        elif tool == "start_deck":
            args = dict(base, audience=_audience(text) or "the people this engagement serves", outline=[], brand=brand)
        elif tool == "start_artifact":
            args = dict(base, kind=r.get("kind") or "", goal=about, brand=brand)
        elif tool in ("start_themes", "start_datatable"):
            args = dict(base, goal=about, brand=brand)
        elif tool == "start_diagram":
            args = dict(base, goal=about, mode="infographic" if re.search(r"infographic", text, re.I) else "diagram", brand=brand)
        elif tool == "start_audio_overview":
            args = dict(base, goal=about, format=audio_format(text), brand=brand)
        elif tool == "start_journey_map":
            args = dict(base, persona=persona_near(text) or "the people this engagement is about", scope=about, brand=brand)
        elif tool == "start_prototype":
            args = dict(base, experience=about, audience=_audience(text) or "the people this engagement serves", must_include=[], brand=brand)
        else:
            continue
        out.append((r, args))
    return out


def reply_many(made, missed):
    """What the agent says after planning several outputs in code: only what the tool results back."""
    names = [r["words"] for r, out in made]
    n = len(names)
    count = {2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six"}.get(n, str(n))
    listed = (", ".join(names[:-1]) + " and " + names[-1]) if n > 1 else (names[0] if names else "")
    msg = (f"{count} plans are ready for you to review, one card each: {listed}. Each card shows its steps and expected "
           "time, and you start it there. They share one set of evidence, so research runs once.") if n > 1 else \
          f"The plan for {listed} is ready for you to review on its card."
    if missed:
        msg += " Not planned: " + "; ".join(f"{r['words']} ({why})" for r, why in missed) + "."
    return msg


def reply(r, out):
    """What the agent says after a route made in code."""
    if isinstance(out, dict) and out.get("plan_id"):
        return "The plan is ready for you to review: its steps and expected time are on the card, and you start it there."
    if isinstance(out, dict) and out.get("task_id"):
        return "Started: the work has its own card and updates as it goes."
    return str((out or {}).get("error") or (out or {}).get("message") or "That could not be started.")


# ---- the guards that check a model's choice (moved from plan.py and agent.py, uplift plan WS-4 step 4) ---------------
# route() places a request before any model sees it; these run after the model chose, for what route() left to it.
NAMED_OUTPUTS = [(r"\bprototypes?\b", "start_prototype", "a prototype"), (r"\b(decks?|slides?|presentation)\b", "start_deck", "a deck"),
                 (r"\b(mind ?maps?|infographics?|diagrams?)\b", "start_diagram", "a diagram"),
                 (r"\bjourney ?maps?\b", "start_journey_map", "a journey map"),
                 (r"\b(podcast|audio overview)\b", "start_audio_overview", "an audio overview"),
                 (r"\b(quiz|flashcards?|study guide|faq)\b", "start_artifact", "a study page"),
                 # 26 Nov routing comparison: these named outputs reached the model's own choice, which misrouted them
                 (r"\bdata ?tables?\b|\bcomparison tables?\b", "start_datatable", "a data table"),
                 (r"\b(one[- ]pager|one[- ]page (brief|memo|summary)|brief(ing)? (note|memo)|memo|prd|case stud(y|ies)|gap analysis|"
                  r"roadmap|personas?)\b", "start_artifact", "a document")]
_REDDIT_LISTEN = re.compile(r"(?i)\b(listen(ing)? to|social listening)\b[^.?!]{0,60}\breddit\b|\breddit listening\b|"
                            r"\bwhat (people|users|shoppers|students|customers) (on reddit )?(say|are saying|think)\b[^.?!]{0,40}\breddit\b|"
                            r"\bwhat (people|users|shoppers|students|customers) on reddit (say|are saying|think)\b")
_ASKS_REPORT = re.compile(r"(?i)\b(reports?|research|briefing|white ?paper)\b")


def named_instead_of_report(tool, said):
    """(tool, words) when a research report is being planned for a request that names another output and no report."""
    if tool != "start_research_report" or not said or _ASKS_REPORT.search(said):
        return None
    for rx, named, words in NAMED_OUTPUTS:
        if re.search(rx, said, re.I):
            return named, words
    return None


# A brand other than the house one is used only when the person named it. 20 Nov: recommendations for a dean came back
# in the DECIEM brand because the orchestration model filled the argument on its own.
_BRAND_NAMED = {"deciem": r"(?i:deciem)", "nu": r"(?i:#nu\b|northeastern)|\bNU\b"}


def brand_asked(brand, said):
    """The brand to use: the one given when the person's words name it, else the house brand."""
    b = str(brand or "").strip().lower()
    if b in _BRAND_NAMED and not re.search(_BRAND_NAMED[b], said or ""):
        return "nxt"
    return brand


_MAKE_NUDGE = re.compile(r"(?i)^\W*(please\s+)?(build|make|create|draft|write|generate|design|produce|prepare|put together)\b")


def named_tool(said):
    """(words, tool) when the person's message opens with a making verb and names an output in plain words ("Build a
    clickable prototype of ..."). 20 Nov: such a request was answered by reading old tasks, with no plan made."""
    from . import plan
    if said and _REDDIT_LISTEN.search(said):        # "listen to what people on Reddit say about ..." is Reddit listening
        return "Reddit listening", "start_social_analysis"
    if not said or not _MAKE_NUDGE.search(said) or plan.is_question(said):
        return None
    for rx, tool, words in NAMED_OUTPUTS:
        if re.search(rx, said, re.I):
            return words, tool
    return None
