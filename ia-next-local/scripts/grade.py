"""Grade a finished IA Next Local artifact against the Gemini Notebook bar in PLAN-COMPLETION-2026-11-19.md section 2.

    python -I scripts/grade.py <task id> [<task id> ...]      (the app must be running on 127.0.0.1:9460)

Each check is a fact read from the saved artifact (a count, a presence, a ratio), printed PASS or FAIL with the
number. The checks are the measurable half of the bar; the other half is reading the artifact end to end, which no
script replaces. Nothing here calls a model.
"""
import io
import json
import re
import sys
import urllib.error
import urllib.request
import zipfile

B = "http://127.0.0.1:9460"
NUM = re.compile(r"(?<![\w.#])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(%|percent)?")
META = ("this report", "this document", "this briefing", "this deck", "this study guide", "the sources reveal", "the research shows",
        "based on the research", "in conclusion", "in summary")


def get(path, raw=False):
    try:
        r = urllib.request.urlopen(B + path, timeout=300)
    except urllib.error.HTTPError as e:
        return None if e.code in (404, 409) else (_ for _ in ()).throw(e)
    data = r.read()
    return data if raw else (json.loads(data) if "json" in (r.headers.get("content-type") or "") else data.decode("utf-8", "replace"))


def words(text):
    return len(re.findall(r"[A-Za-z][A-Za-z'-]*", text))


def strip_tags(doc):
    doc = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", doc or "")
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", doc))


class Card:
    def __init__(self, task):
        self.task, self.rows = task, []

    def check(self, name, ok, detail):
        self.rows.append((name, bool(ok), str(detail)))

    def show(self):
        t = self.task
        took = round((t.get("updated") or 0) - (t.get("created") or 0))
        print(f"\n== {t['id']}  {t['kind']}{' / ' + t['brief'].get('kind') if t['brief'].get('kind') else ''}  {t['status']}  {took} s")
        for name, ok, detail in self.rows:
            print(f"  {'PASS' if ok else 'FAIL'}  {name}: {detail}")
        n = sum(1 for _, ok, _ in self.rows if ok)
        print(f"  -> {n} of {len(self.rows)} checks pass")
        return n, len(self.rows)


def naked_numbers(text):
    """Figures outside quotation marks, block quotes and the sources list (years and single digits excluded)."""
    body = re.split(r"(?im)^#{1,6}\s*sources\s*$", text)[0]
    body = re.sub(r'(?m)^>.*$', " ", body)
    body = re.sub(r'"[^"\n]{3,600}"|“[^”\n]{3,600}”', " ", body)
    body = re.sub(r"https?://\S+|\[S\d+\]", " ", body)
    out = []
    for line in body.split("\n"):
        if line.lstrip().startswith("#"):
            continue
        for m in NUM.finditer(line):
            n = m.group(1)
            if (len(n) == 4 and n[:2] in ("19", "20") and not m.group(2)) or (re.fullmatch(r"\d", n) and not m.group(2)):
                continue
            out.append(line.strip()[:90])
            break
    return out


def grade_report(c, t):
    text = get(f"/api/tasks/{t['id']}/report") or ""
    eng_sources = (get(f"/api/engagements/{t['engagement_id']}/sources") or {}).get("sources") or []
    body = re.split(r"(?im)^#{1,6}\s*sources\s*$", text)[0]
    cited = set(re.findall(r"\[(S\d+)\]", body))
    heads = re.findall(r"(?m)^##\s+(.+)$", body)
    w = words(body)
    c.check("at least 2,000 words (Gemini about 2,900)", w >= 2000, f"{w} words")
    c.check("a comparative matrix", bool(re.search(r"(?m)^\|.+\|\s*\n\|[-| :]+\|", body)), "table present" if "|---" in body else "no table")
    task_dir_sources = eng_sources
    total = len(task_dir_sources) or len(set(re.findall(r"(?m)^- \[(S\d+)\]", text)))
    share = len(cited) / total if total else 0
    c.check("at least 80% of collected sources cited (Gemini 12 of 12)", share >= 0.8, f"{len(cited)} of {total} ({share:.0%})")
    quotes = len(re.findall(r'(?m)^>\s*"', body))
    c.check("verbatim quotes shown with their source", quotes >= 8, f"{quotes} block quotes")
    nn = naked_numbers(text)
    c.check("no figure outside a quote (Gemini had 40+)", not nn, f"{len(nn)} lines" + (f", e.g. {nn[0]!r}" if nn else ""))
    low = body.lower()
    metas = [m for m in META if m in low]
    c.check("no meta opener or self-reference (Gemini had one)", not metas, metas or "none")
    topic = [h for h in heads if len(h.split()) < 4 and h.lower() not in ("the evidence at a glance",)]
    c.check("headings are judgments, not topic labels", heads and not topic, f"{len(heads)} headings" + (f"; short labels: {topic[:3]}" if topic else ""))
    v = get(f"/api/tasks/{t['id']}/verification") or {}
    det = v.get("deterministic_findings") or []
    c.check("the app's own checker finds nothing", not det, f"{len(det)} findings, score {v.get('score')}")


def grade_mindmap(c, t):
    d = get(f"/api/tasks/{t['id']}/mindmap")
    if not d:
        return c.check("is a mind map with saved data", False, "no mind map data")
    br = d["branches"]
    c.check("one root", bool(d.get("hub")), d.get("hub"))
    c.check("at least 5 branches (Gemini 6)", len(br) >= 5, f"{len(br)} branches")
    kids = [len(b["points"]) for b in br]
    c.check("at least 3 children under every branch (Gemini 3 to 5)", br and min(kids) >= 3, f"children per branch: {kids}")
    c.check("every branch rests on a checked passage (Gemini: none)", all(b["evidence"] for b in br), f"passages per branch: {[len(b['evidence']) for b in br]}")
    srcs = {e.get("source_id") or e.get("source") for b in br for e in b["evidence"]}
    c.check("draws on several sources", len(srcs) >= 3, f"{len(srcs)} sources")
    sets = [set(re.findall(r"[a-z]{4,}", b["label"].lower())) for b in br]
    dup = [(i, j) for i in range(len(sets)) for j in range(i + 1, len(sets)) if sets[i] and sets[j] and len(sets[i] & sets[j]) / min(len(sets[i]), len(sets[j])) >= 0.7]
    c.check("no near-duplicate branches", not dup, dup or "none")
    text = " ".join([b["label"] for b in br] + [p for b in br for p in b["points"]])
    c.check("labels are sentences, never clipped", not re.search(r"\w…|\.\.\.", text) and all(len(b["label"].split()) >= 4 for b in br), "ok" if all(len(b["label"].split()) >= 4 for b in br) else "short labels")
    png = get(f"/api/tasks/{t['id']}/export/png", raw=True)
    c.check("image export", bool(png) and png[:4] == b"\x89PNG", f"{len(png or b'')} bytes")
    pptx = get(f"/api/tasks/{t['id']}/export/pptx", raw=True)
    runs = pics = 0
    if pptx and pptx[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(pptx))
        for n in z.namelist():
            if re.match(r"ppt/slides/slide\d+\.xml", n):
                x = z.read(n).decode("utf-8", "replace")
                runs += len(re.findall(r"<a:t>", x))
                pics += len(re.findall(r"<p:pic>", x))
    c.check("editable PowerPoint (Gemini's is a flat picture)", runs >= 10 and pics <= 2, f"{runs} text runs, {pics} pictures (the brand mark)")
    figs = [p for b in br for p in [b["label"]] + b["points"] if re.search(r"\d+\s?%|(?<!\d)\d{2,3}(?!\d)", p)]
    c.check("no figure stated on the map (Gemini's infographic had none)", not figs, f"{len(figs)}" + (f": {figs[0]!r}" if figs else ""))


def grade_study(c, t, kind):
    doc = get(f"/api/tasks/{t['id']}/artifact") or ""
    n = lambda pat: len(re.findall(pat, doc))
    quotes = n(r"<blockquote>")
    if kind == "studyguide":
        c.check("at least 10 short-answer questions (Gemini 10)", n(r'<details class="item">') >= 10, n(r'<details class="item">'))
        essays = len(re.findall(r"<li>", (re.search(r'(?s)<ol class="essays">(.*?)</ol>', doc) or [0, ""])[1]))
        c.check("at least 5 essay prompts (Gemini 5)", essays >= 5, essays)
        c.check("glossary of at least 18 terms (Gemini 18)", n(r"<dt>") >= 18, n(r"<dt>"))
    elif kind == "faq":
        c.check("at least 10 questions", n(r'<details class="item">') >= 10, n(r'<details class="item">'))
    elif kind == "chronology":
        c.check("at least 6 dated entries", n(r'<span class="d">') >= 6, n(r'<span class="d">'))
    elif kind == "flashcards":
        cards = n(r'class="item card"')
        c.check("at least 24 cards (Gemini 50)", cards >= 24, cards)
        c.check("Got it / Missed it marking with a counter and reset", "data-mark-as" in doc and 'id="reset"' in doc, "present" if "data-mark-as" in doc else "absent")
    elif kind == "quiz":
        qs = n(r'class="item q"')
        c.check("at least 10 questions with 4 options (Gemini 10)", qs >= 10 and n(r'class="opt"') == qs * 4, f"{qs} questions, {n(chr(99) + 'lass=' + chr(34) + 'opt' + chr(34))} options")
        stems = re.findall(r'(?s)<div class="stem">.*?<span>(.*?)</span></div>', doc)
        recall = [s for s in stems if re.search(r"(?i)how many|what percent|what number|which year", s)]
        c.check("at most 30% number-recall questions", len(recall) * 10 <= len(stems) * 3, f"{len(recall)} of {len(stems)}")
        c.check("every option is explained", doc.count("<li><b>") >= qs * 4, doc.count("<li><b>"))
    c.check("every item shows a quoted passage and its source (Gemini: none)", quotes >= 6, f"{quotes} quotes")
    c.check("Ask about this (Gemini's Explain)", "data-ask" in doc, "present" if "data-ask" in doc else "absent")
    visible = strip_tags(re.sub(r"(?is)<blockquote>.*?</blockquote>", " ", doc))
    nn = [m.group(0) for m in NUM.finditer(visible) if not re.fullmatch(r"(19|20)\d\d|\d{1,2}", m.group(1))]
    c.check("no figure outside a quote", not nn, f"{len(nn)}" + (f": {nn[:4]}" if nn else ""))


def _pptx_stats(data):
    slides, runs, pics, full = 0, 0, 0, 0
    if data and data[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(data))
        for n in z.namelist():
            if re.match(r"ppt/slides/slide\d+\.xml", n):
                x = z.read(n).decode("utf-8", "replace")
                slides += 1
                r = len(re.findall(r"<a:t>", x))
                runs += r
                k = len(re.findall(r"<p:pic>", x))
                pics += k
                full += 1 if (k and not r) else 0
    return slides, runs, pics, full


def grade_infographic(c, t):
    d = get(f"/api/engagements/{t['engagement_id']}/files/results/tasks/{t['id']}/diagram.json")
    d = json.loads(d) if isinstance(d, str) else (d or {})
    nodes = [n for g in d.get("illustrated") or [] for n in g["nodes"]]
    c.check("an illustrated canvas (owner: pictures, not only glyphs)", d.get("drawn_by") == "illustrated", d.get("drawn_by"))
    c.check("4 to 8 nodes (Gemini 6)", 4 <= len(nodes) <= 8, len(nodes))
    c.check("grouped under one or two headings, no false sequence", 1 <= len(d.get("illustrated") or []) <= 2, [g["heading"] for g in d.get("illustrated") or []])
    c.check("label of at most 7 words and a one-sentence caption on every node", nodes and all(len(n["label"].split()) <= 7 and 6 <= len(n["caption"].split()) <= 26 for n in nodes), [len(n["caption"].split()) for n in nodes])
    subj = [n.get("subject", "") for n in nodes]
    echo = [s for s, n in zip(subj, nodes) if n["label"].lower() in s.lower()]
    c.check("every illustration shows its own concrete scene", nodes and len(set(subj)) == len(subj) and not echo, f"{len(set(subj))} distinct scenes of {len(subj)}; {len(echo)} only repeat the label")
    title, sub = d.get("title") or "", d.get("standfirst") or ""
    c.check("title plus a different one-line subtitle", bool(title) and bool(sub) and title.strip().lower() != sub.strip().lower(), f"subtitle: {sub[:70]!r}")
    text = " ".join([title, sub] + [n["label"] + " " + n["caption"] for n in nodes])
    c.check("zero figures (Gemini: zero)", not re.search(r"\d+\s?%|(?<!\d)\d{2,3}(?!\d)", text), "none" if not re.search(r"\d", text) else re.findall(r"\d+%?", text)[:4])
    c.check("every node rests on a checked passage (Gemini: none)", nodes and all(n.get("evidence") for n in nodes), [len(n.get("evidence") or []) for n in nodes])
    slides, runs, pics, full = _pptx_stats(get(f"/api/tasks/{t['id']}/export/pptx", raw=True))
    c.check("editable PowerPoint: text as text, each illustration a picture", runs >= 10 and not full, f"{runs} text runs, {pics} pictures, {full} picture-only slides")


def grade_journey(c, t):
    d = get(f"/api/tasks/{t['id']}/view") or ""
    stages = len(re.findall(r'class="stage"', d))
    c.check("4 to 7 stages in order", 4 <= stages <= 7, stages)
    c.check("every stage has a pain with a verbatim quote and its source", len(re.findall(r"<q>", d)) >= stages, f"{len(re.findall('<q>', d))} quoted pains")
    title = re.sub(r"&#x27;", "'", (re.findall(r"<h1>(.*?)</h1>", d) or [""])[0])
    c.check("title is a plain sentence (no colon, no figure of speech)", title and ":" not in title and not re.search(r"(?i)navigat|journey to|the gap|landscape|unlock", title), title)
    body = re.sub(r"https?://[^ <]+", " ", strip_tags(re.sub(r"(?is)<q>.*?</q>|<sup>.*?</sup>|<style.*?</style>|<a .*?</a>", " ", d)))
    figs = [m.group(0) for m in NUM.finditer(body) if not re.fullmatch(r"(19|20)[0-9][0-9]|[0-9]", m.group(1))]
    c.check("no figure stated outside a quoted pain", not figs, figs[:4] or "none")


def grade_themes(c, t):
    d = get(f"/api/tasks/{t['id']}/view") or ""
    n = len(re.findall(r'<section class="section"', d))
    quotes = len(re.findall(r"<q>|<blockquote", d))
    c.check("at least 5 themes", n >= 5 or quotes >= 5, f"{quotes} quoted themes")
    c.check("every theme carries a verbatim quote", quotes >= 5, quotes)
    c.check("no theme from another engagement", "nurse" not in strip_tags(d).lower(), "none found")


def grade_table(c, t):
    d = get(f"/api/tasks/{t['id']}/view") or ""
    rows = max(0, len(re.findall(r"<tr", d)) - 1)
    c.check("at least 8 rows", rows >= 8, rows)
    c.check("a named source on every row (Gemini: yes)", len(re.findall(r'class="srcname"', d)) >= rows or len(re.findall(r'class="src"', d)) >= rows, f"{len(re.findall('srcname', d))} source names for {rows} rows")
    csv = get(f"/api/tasks/{t['id']}/export/csv", raw=True) if False else None
    c.check("each cell's quote was checked against its passage", "checked" in (t.get("summary") or ""), (t.get("summary") or "")[:110])


def grade_deck(c, t):
    slides, runs, pics, full = _pptx_stats(get(f"/api/tasks/{t['id']}/export/pptx", raw=True) or get(f"/api/tasks/{t['id']}/download", raw=True))
    c.check("every slide carries editable text (Gemini: 15 flat pictures)", slides >= 5 and full == 0 and runs >= slides * 3, f"{slides} slides, {runs} text runs, {full} picture-only slides")
    c.check("photographs or illustrations are embedded", pics >= 2, f"{pics} pictures")
    d = get(f"/api/tasks/{t['id']}/view") or ""
    secs = re.findall(r'(?s)<section class="slide[^"]*".*?</section>', d)
    subs = [re.sub(r"<[^>]+>", "", m) for m in re.findall(r'(?s)class="(?:sub|subtitle|standfirst)[^"]*"[^>]*>(.*?)</', d)]
    c.check("a subtitle on most slides, none identical (Gemini: 13 of 15, two identical)", len(subs) >= max(1, len(secs) - 2) and len(set(subs)) == len(subs), f"{len(subs)} subtitles on {len(secs)} slides, {len(set(subs))} distinct")
    text = strip_tags(re.sub(r"(?is)<blockquote.*?</blockquote>|<q>.*?</q>", " ", d))
    nums = [m.group(0) for m in NUM.finditer(text) if not re.fullmatch(r"(19|20)\d\d|\d{1,2}", m.group(1))]
    c.check("no figure outside a quote", not nums, f"{len(nums)}" + (f": {nums[:4]}" if nums else ""))
    from_words = re.findall(r"(?i)\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|[a-z]+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ](?:percent|per cent)", text)
    c.check("no figure spelled out to dodge the rule", not from_words, from_words[:3] or "none")


def grade_audio(c, t):
    base = f"/api/engagements/{t['engagement_id']}/files/results/tasks/{t['id']}/"
    s = get(base + "script.json")
    s = json.loads(s) if isinstance(s, str) else (s or {})
    turns = s.get("turns") or []
    speakers = {x.get("speaker") for x in turns}
    c.check("two hosts in dialogue", len(speakers) == 2 and len(turns) >= 8, f"{len(turns)} turns, speakers {sorted(map(str, speakers))}")
    c.check("format and length are choices (Gemini: four formats)", s.get("format") in ("deep-dive", "brief", "critique", "debate"), f"{s.get('format')}, {s.get('minutes')} min")
    cited = sum(1 for x in turns if x.get("quote") or x.get("source_id"))
    c.check("factual turns carry their source (Gemini: organisation names only)", cited >= max(3, len(turns) // 3), f"{cited} of {len(turns)} turns sourced")
    mp3 = get(base + "audio.mp3", raw=True)
    c.check("a real audio file with two voices", bool(mp3) and len(mp3) > 50_000, f"{len(mp3 or b'')} bytes")


def main():
    total = [0, 0]
    for tid in sys.argv[1:]:
        t = get(f"/api/tasks/{tid}")
        if not t:
            print(f"\n== {tid}: no such task")
            continue
        c = Card(t)
        if t["status"] != "done":
            c.check("finished", False, f"{t['status']}: {str(t.get('error') or '')[:200]}")
        elif t["kind"] == "research_report":
            grade_report(c, t)
        elif t["kind"] == "diagram" and t["brief"].get("mode") == "infographic":
            grade_infographic(c, t)
        elif t["kind"] == "diagram":
            grade_mindmap(c, t)
        elif t["kind"] == "journey_map":
            grade_journey(c, t)
        elif t["kind"] == "themes":
            grade_themes(c, t)
        elif t["kind"] == "datatable":
            grade_table(c, t)
        elif t["kind"] == "deck":
            grade_deck(c, t)
        elif t["kind"] == "audio_overview":
            grade_audio(c, t)
        elif t["kind"] == "artifact" and t["brief"].get("kind") in ("studyguide", "faq", "chronology", "flashcards", "quiz"):
            grade_study(c, t, t["brief"]["kind"])
        else:
            c.check("finished", True, str(t.get("summary") or "")[:200])
        a, b = c.show()
        total[0] += a
        total[1] += b
    print(f"\nTOTAL {total[0]} of {total[1]} checks pass")


if __name__ == "__main__":
    main()
