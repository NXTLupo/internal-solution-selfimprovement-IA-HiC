"""The editable PowerPoint and the PDF of a visual artifact, laid out as slides (owner, 20 Nov: "keep the native output
... as you had them and only reformat the editable pptx version in a reformatted template").

The page a person reads on screen is unchanged. Its slides are the same checked data laid out again as 16:9 slides that
each do one job: a persona set gets an overview, a comparison and two slides per persona (who they are; what they do
and need), a journey an overview and one slide per phase, an architecture its zones, its connections, its weak points
and its changes, a competitive analysis its organizations, matrix, evidence, one case per slide and its gaps.

22 Nov, the owner: the persona and architecture slides were "illegible", with "text wrapping issues and illogical slide
breaks". The type was 9 to 10 points in PowerPoint and half of each slide was empty. The scale here is set for a room:
on the 1920 by 1080 stage 1 px is half a point, so body text is 28 px (14 pt), titles 60 px (30 pt), labels and table
text never under 22 px (11 pt). What goes on a slide is chosen by count and by length so it fits at that size; nothing
is cut inside a sentence, and what does not fit stays on the page. The condensed display face is used only for slide
titles; smaller headings use the body face, which PowerPoint substitutes without squeezing.

Each slide is a `section.stage`; the exporter reads it into native, editable text (the same path the decks use) and
the PDF is printed from the same slides.
"""
import html
import re

from . import deck


def e(s):
    return html.escape(re.sub(r"\s*\[S\d+\]", "", str(s or "")).strip(), quote=True)


def _clip(s, n):
    """Text that fits a budget: whole when it fits, else its leading whole sentences that fit, else its first sentence
    trimmed at a word with an ellipsis (22 Nov: a first sentence longer than the budget left a table cell or a card
    empty). A full stop after a capital ("U.S.") does not end a sentence."""
    s = " ".join(str(s or "").split())
    if len(s) <= n:
        return s
    kept = ""
    for part in re.split(r"(?<=[a-z0-9)\]'’”\"][.!?])\s+(?=[A-Z“\"])", s):
        if len(kept) + len(part) + 1 > n:
            break
        kept = (kept + " " + part).strip()
    if kept:
        return kept
    # One sentence longer than the budget. It ends at its last clause boundary inside the budget and closes as a
    # sentence; a mark of omission is never printed (24 Nov: two journey maps were marked "Needs review
    # (no_cut_sentences)" for it). With no boundary to end on it ends at a word, still without the mark.
    cut = s[:max(1, n - 1)]
    best = max((m.start() for m in re.finditer(r"[,;:]\s|\s(?:and|but|because|which|while|so that|when)\s", cut)), default=-1)
    if best >= int(n * 0.55):
        return cut[:best].rstrip(",;:- ") + "."
    cut = cut[:cut.rfind(" ")] if " " in cut else cut
    cut = re.sub(r"\s+(?:a|an|the|of|to|in|on|for|and|or|with|by|at|from|that|as)$", "", cut.rstrip(",;:- "))
    return cut + "."


def _whole(s, n):
    """Text whole when it fits n characters, else its first sentence when that fits, else "": for a line that may be
    left out rather than shown cut."""
    s = " ".join(str(s or "").split())
    if len(s) <= n:
        return s
    kept = ""                                 # the leading whole sentences that fit; "" when even the first does not
    for part in re.split(r"(?<=[a-z0-9)\]'’”\"][.!?])\s+(?=[A-Z“\"])", s):
        if len(kept) + len(part) + 1 > n:
            break
        kept = (kept + " " + part).strip()
    return kept


def _lead(s, n):
    """An optional line (a standfirst, a lead, a key point, a box's description) whole, or its leading whole sentences,
    within a little more than its budget; otherwise left out. Never cut with an ellipsis: 23 Nov, the scorecard caught
    an architecture slide whose 177-character standfirst ended "uneven learning…" against a budget of 170."""
    return _whole(s, int(n * 1.4))


def _fit(items, chars, most):
    """The leading items that fit a text budget, whole."""
    out, used = [], 0
    for it in items or []:
        s = re.sub(r"\s*\[S\d+\]", "", str(it or "")).strip()
        if not s:
            continue
        if out and (used + len(s) > chars or len(out) >= most):
            break
        if not out and len(s) > chars:
            s = _whole(s, int(chars * 1.25)) or _clip(s, chars)     # a first item a little long stays whole
        out.append(s)
        used += len(s)
    return out


def _ul(items, chars=420, most=4):
    got = _fit(items, chars, most)
    return "<ul>" + "".join(f"<li>{html.escape(x)}</li>" for x in got) + "</ul>" if got else ""


def _name(title):
    """The publication's short name under a quote, whole: a long source title wraps under its panel in PowerPoint."""
    from . import illustrated
    t = " ".join(str(title or "").split())
    head = t.split(": ")[0]
    return head if ": " in t and len(head) <= 32 else illustrated._publication(t)


def _q(q, titles, chars=230, cls=""):
    if not isinstance(q, dict) or not str(q.get("text") or "").strip() or len(str(q["text"])) > chars:
        return ""
    text = " ".join(str(q["text"]).split()).strip('"' + chr(0x201c) + chr(0x201d))
    src = _name((titles or {}).get(q.get("source_id"), ""))
    return (f'<div class="quote {cls}"><p class="qt">{chr(0x201c)}{html.escape(text)}{chr(0x201d)}</p>'
            + (f'<p class="qc">{html.escape(src)}</p>' if src else "") + "</div>")


PAD = chr(0xa0) * 8                  # spare width after a label, measured into its text box


def _label(text):
    return f'<p class="k">{html.escape(text)}{PAD}</p>'


def _stage(kicker, title, body, kit, foot="", band=""):
    mark = f'<span class="mark">{kit["mark"]}</span>' if kit.get("mark") else f'<span>{html.escape(kit["name"])}</span>'
    if band:                                 # "label|text": the label is its own line, so PowerPoint keeps its bold capitals
        label, _, text = band.partition("|")
        band = f'<div class="band"><p class="bk">{label}{PAD}</p><p>{text}</p></div>' if text else f'<div class="band"><p>{label}</p></div>'
    return (f'<section class="stage"><div class="rail"><i></i></div><div class="main"><p class="kicker">{html.escape(kicker)}{PAD}</p>'
            f'<h1>{e(_clip(title, 110) or title)}</h1><div class="body">{body}</div>{band}'
            f'<div class="foot"><span>{html.escape(foot)}</span>{mark}</div></div></section>')


def _doc(title, stages, kit):
    return (f'<!doctype html><html lang="en" data-brand="{html.escape(kit["brand"])}"><head><meta charset="utf-8"><title>{e(title)}</title>'
            f'<style>{kit["fonts_css"]}\n{kit["css"]}\n{CSS}</style></head><body>{"".join(stages)}</body></html>')


def _col(name, inner, cls=""):
    return f'<div class="col {cls}">{_label(name)}{inner}</div>' if inner else ""


def _photo(p, cls=""):
    img = str((p or {}).get("image") or "")
    return f'<figure class="{cls}"><img src="{html.escape(img)}" alt=""></figure>' if img.startswith("data:image/") else ""


def _table(cols, rows, most=7, chars=150, cls="", widths=None):
    style = [f' style="width:{w}%"' for w in widths] if widths else [""] * len(cols)
    head = "".join(f"<th{style[i] if i < len(style) else ''}>{html.escape(str(c))}</th>" for i, c in enumerate(cols))
    body = ""
    for r in rows[:most]:
        cells = ""
        for c in r:
            if isinstance(c, tuple):                       # (text, class) for a coloured cell
                cells += f'<td class="{c[1]}">{_clip(e(c[0]), chars)}</td>'
            else:
                cells += f"<td>{_clip(e(c), chars)}</td>"
        body += f"<tr>{cells}</tr>"
    return f'<table class="{cls}"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


def _part(label, text, chars):
    """A labelled paragraph, or nothing when there is no text: a label with nothing under it reads as a mistake
    (22 Nov: a case study showed "What changed" over an empty space)."""
    body = _clip(e(text), chars)
    return f'{_label(label)}<p>{body}</p>' if body else ""


# ---- journey map -----------------------------------------------------------------------------------------------------
def _w(s, n):
    """Whole text, or its first sentence, or (only when even that is too long) the sentence trimmed at a word."""
    return _whole(s, n) or _clip(s, n)


def journey(j, sources, brand="nxt"):
    """An overview, then two slides per phase (what happens and how it feels; what hurts and where to act), then the
    pains that persist and where to act across the journey. 22 Nov: one slide per phase either overflowed or cut the
    sentences, because a phase carries long, quoted sentences; two slides keep every sentence whole."""
    kit = deck.brand_kit(brand)
    titles = {s["id"]: " ".join(str(s.get("title") or "").split()) for s in sources}
    per = j.get("persona") if isinstance(j.get("persona"), dict) else {}
    ph = [p for p in j.get("phases") or [] if isinstance(p, dict)][:6]
    photo = _photo(per)
    strip = "".join(
        f'<div class="ph"><p class="n">Phase {i:02d}</p><h3>{e(_w(p.get("name"), 60))}</h3><p class="w">{e(_whole(p.get("window"), 50))}</p>'
        f'<p class="feel">{e(p.get("emotion"))}</p></div>' for i, p in enumerate(ph, 1))
    first = (f'<div class="who {"life" if photo else ""}">{photo}<div>{_label("Who this journey follows")}<h3>{e(per.get("name"))}</h3>'
             f'<p>{e(_w(per.get("who"), 240))}</p>{_q(per.get("quote"), titles, 160)}</div></div>'
             f'<div class="strip" style="grid-template-columns:repeat({len(ph) or 1},minmax(0,1fr))">{strip}</div>')
    out = [_stage("Journey map", j.get("title"), first, kit, e(_whole(j.get("standfirst"), 170)))]
    for i, p in enumerate(ph, 1):
        n = f"Phase {i:02d} of {len(ph):02d}"
        touch = ", ".join(_fit(p.get("touchpoints"), 120, 6))
        lead = (f'<p class="lead">{e(_w(p.get("mindset"), 170))}</p>' if str(p.get("mindset") or "").strip() else "")             + (f'<p class="small">Touchpoints: {html.escape(touch)}</p>' if touch else "")
        feels = (f'<p class="feel">{e(p.get("emotion"))}</p><p>{e(_w(p.get("reason"), 260))}</p>'
                 + (f'{_label("Moment of truth")}<p>{e(_w(p.get("moment_of_truth"), 260))}</p>' if str(p.get("moment_of_truth") or "").strip() else ""))
        out.append(_stage(f"{n}: {_whole(p.get('window'), 60) or 'what happens'}", p.get("name"),
                          f'{lead}<div class="cols c2">{_col("What they do", _ul(p.get("actions"), 460, 4))}{_col("How it feels", feels)}</div>', kit))
        pains, quoted = "", False
        for k, x in enumerate([x for x in (p.get("pains") or []) if isinstance(x, dict) and str(x.get("pain") or "").strip()][:2]):
            freq = _whole(x.get("frequency"), 110) if k == 0 else ""       # the second pain carries its severity only
            sev = " ".join(s for s in (f'{e(str(x.get("severity") or "").capitalize())} severity.' if x.get("severity") else "", e(freq)) if s)
            pains += (f'<div class="pn"><p class="pt">{e(_w(x.get("pain"), 150))}</p>' + (f'<p class="sev">{sev}</p>' if sev else "")
                      + (qh := _q(x.get("quote"), titles, 140 if quoted else 190)) + "</div>")   # a second quote only when short
            quoted = quoted or bool(qh)
        acts = _ul(p.get("opportunities"), 420, 3)
        if pains or acts:
            out.append(_stage(f"{n}: pain points and where to act", p.get("name"),
                              f'<div class="cols c2w">{_col("Pain points", pains, "warn")}{_col("Where to act", acts)}</div>', kit))
    cut = "".join(f'<div class="card"><h3>{e(_w(x.get("pain"), 140))}</h3><p>{e(_w(x.get("why"), 220))}</p></div>'
                  for x in (j.get("overall_pains") or [])[:3] if isinstance(x, dict))
    if cut:
        out.append(_stage("Across the whole journey", "The pains that persist from phase to phase", f'<div class="stack">{cut}</div>', kit))
    opp = "".join(f'<div class="card deep"><h3>{e(_w(x.get("opportunity"), 200))}</h3><p>Owner: {e(x.get("owner"))}</p></div>'
                  for x in (j.get("opportunities") or [])[:3] if isinstance(x, dict))
    if opp:
        out.append(_stage("Across the whole journey", "Where to act, and who owns it", f'<div class="stack">{opp}</div>', kit,
                          e(_whole(j.get("takeaway"), 170))))
    return _doc(j.get("title") or "Journey map", out, kit)


# ---- persona set -----------------------------------------------------------------------------------------------------
_LEAN = {1: "Strongly: {low}", 2: "Leans: {low}", 3: "Between the two", 4: "Leans: {high}", 5: "Strongly: {high}"}


def _where(p, d):
    """Where a persona sits on a dimension, in words."""
    for pos in p.get("positions") or []:
        if isinstance(pos, dict) and str(pos.get("dimension") or "").strip().lower() == str(d.get("name") or "").strip().lower():
            try:
                v = max(1, min(5, int(round(float(pos.get("value"))))))
            except (TypeError, ValueError):
                return ""
            return _LEAN[v].format(low=str(d.get("low") or "low"), high=str(d.get("high") or "high"))
    return ""


def personas(doc, titles, brand="nxt"):
    kit = deck.brand_kit(brand)
    dims = [d for d in doc.get("dimensions") or [] if isinstance(d, dict) and str(d.get("name") or "").strip()][:5]
    people = [p for p in doc.get("personas") or [] if isinstance(p, dict) and str(p.get("name") or "").strip()][:4]
    n = len(people)
    cards = "".join(
        f'<div class="pcard">{_photo(p, "wide")}<p class="n">Persona {i:02d}</p><h3>{e(p.get("name"))}</h3>'
        f'<p>{e(_w(p.get("who"), 190 if n <= 3 else 130))}</p>'
        + (f'<p class="traits">{", ".join(e(t) for t in (p.get("traits") or [])[:3] if str(t).strip())}</p>' if p.get("traits") else "") + "</div>"
        for i, p in enumerate(people, 1))
    lead = f'<p class="lead">{e(_w(doc.get("standfirst"), 240))}</p>' if str(doc.get("standfirst") or "").strip() else ""
    out = [_stage("Personas", doc.get("title"), f'{lead}<div class="cols" style="grid-template-columns:repeat({n or 1},minmax(0,1fr))">{cards}</div>', kit)]
    if dims and people:
        rows = [[(d.get("name"), "strong")] + [_where(p, d) or "Not shown" for p in people] for d in dims]
        out.append(_stage("What separates one persona from the next", "Where each persona sits",
                          '<p class="lead">' + html.escape(" ".join(str(d.get("name")) + ": from " + str(d.get("low")) + " to " + str(d.get("high")) + "." for d in dims[:3])) + "</p>"
                          + _table(["Dimension"] + [str(p.get("name")) for p in people], rows, 5, 90, "grid"), kit))
    for i, p in enumerate(people, 1):
        photo = _photo(p, "tall")
        traits = ", ".join(e(t) for t in (p.get("traits") or [])[:4] if str(t).strip())
        tools = ", ".join(_fit(p.get("tools"), 90, 6))
        left = (photo or "") + _q(p.get("quote"), titles, 170)
        right = (f'<p class="lead">{_lead(e(p.get("who")), 240)}</p>' + (f'<p class="traits">{traits}</p>' if traits else "")
                 + f'{_label("Goals")}{_ul(p.get("goals"), 330, 3)}' + (f'{_label("Tools they use")}<p>{html.escape(tools)}</p>' if tools else ""))
        out.append(_stage(f"Persona {i:02d} of {n:02d}: who they are", p.get("name"),
                          f'<div class="cols c2p">{f"""<div class="col plain">{left}</div>""" if left else ""}<div class="col plain">{right}</div></div>', kit))
        imp = _fit(p.get("implications"), 170, 1)
        out.append(_stage(f"Persona {i:02d} of {n:02d}: what they do and need", p.get("name"),
                          f'<div class="cols c3">{_col("What they do", _ul(p.get("behaviours"), 330, 3))}{_col("What blocks them", _ul(p.get("frustrations"), 330, 3), "warn")}'
                          f'{_col("What they need", _ul(p.get("needs"), 330, 3))}</div>', kit,
                          band=("Design for this persona|" + html.escape(imp[0])) if imp else ""))
    return _doc(doc.get("title") or "Personas", out, kit)


# ---- competitive gap analysis ----------------------------------------------------------------------------------------
def org_summary(doc, org):
    """An organization's summary; when the model left it empty (22 Nov: San Jose State's card was blank), the first
    reason the matrix gives for one of its ratings, or what its case study says it did, with its citation."""
    if str(org.get("summary") or "").strip():
        return str(org["summary"])
    name = str(org.get("name") or "").strip().lower()
    for r in doc.get("matrix") or []:
        for c in (r.get("cells") or []) if isinstance(r, dict) else []:
            if isinstance(c, dict) and str(c.get("who") or "").strip().lower() == name and str(c.get("evidence") or "").strip() \
                    and str(c.get("rating") or "").lower() in ("leads", "on par", "behind"):
                return str(c["evidence"])
    for c in doc.get("case_studies") or []:
        if isinstance(c, dict) and str(c.get("organization") or "").strip().lower() == name and str(c.get("what_they_did") or "").strip():
            return str(c["what_they_did"])
    return ""


_RATE = {"leads": ("Leads", "r-lead"), "on par": ("On par", "r-par"), "behind": ("Behind", "r-behind")}   # never "lead": .lead is the standfirst style


def competitive(doc, titles, brand="nxt"):
    kit = deck.brand_kit(brand)
    subj = doc.get("subject") if isinstance(doc.get("subject"), dict) else {}
    comps = [c for c in doc.get("competitors") or [] if isinstance(c, dict) and str(c.get("name") or "").strip()][:5]
    names = [str(subj.get("name") or "The subject")] + [str(c.get("name")) for c in comps]
    out = [_stage("Competitive gap analysis", doc.get("title"),
                  (f'<p class="lead">{_lead(e(doc.get("standfirst")), 220)}</p>' if _lead(e(doc.get("standfirst")), 220) else "")
                  + _col("The points to take away", _ul(doc.get("takeaways"), 560, 4), "wide"), kit)]
    who = "".join(f'<div class="card {"deep" if i == 0 else ""}"><p class="n">{e("Whose position this is" if i == 0 else (c.get("kind") or "Compared with"))}</p>'
                  f'<h3>{e(c.get("name") or names[0])}</h3><p>{e(_w(org_summary(doc, c), 240))}</p></div>' for i, c in enumerate([subj] + comps))
    out.append(_stage("Who is compared", "The subject and the organizations it is compared with", f'<div class="grid3">{who}</div>', kit))
    rows = []
    for r in doc.get("matrix") or []:
        if isinstance(r, dict) and str(r.get("capability") or "").strip():
            by = {str(c.get("who") or "").strip().lower(): c for c in r.get("cells") or [] if isinstance(c, dict)}
            rows.append([(r["capability"], "strong")] + [_RATE.get(str((by.get(n.lower()) or {}).get("rating")).lower(), ("Not shown", "r-none")) for n in names])
    for k in range(0, len(rows), 6):
        out.append(_stage("Capability by capability", "Where each one stands", _table(["Capability"] + names, rows[k:k + 6], 6, 60, "grid matrix"), kit))
    # the matrix says who leads; this table says why, one rating to a row with what its source shows (owner, 20 Nov:
    # "Tables must be used with evidence")
    proof = []
    for r in doc.get("matrix") or []:
        for c in (r.get("cells") or []) if isinstance(r, dict) else []:
            rating = str((c or {}).get("rating") or "").lower() if isinstance(c, dict) else ""
            if rating in _RATE and str(c.get("evidence") or "").strip():
                ids = re.findall(r"\[(S\d+)\]", str(c["evidence"]))
                src = _name(titles.get(ids[0], "")) if ids and isinstance(titles, dict) else ""
                proof.append([(r.get("capability"), "strong"), c.get("who"), _RATE[rating], c["evidence"], src])
    for k in range(0, len(proof), 3):
        out.append(_stage("The evidence behind each rating", "Why each one is rated as it is",
                          _table(["Capability", "Organization", "Rating", "What the source shows", "Source"], proof[k:k + 3], 3, 340, "grid",
                                 [14, 14, 8, 43, 21]), kit))       # a web address in Source needs the room
    cases = [c for c in doc.get("case_studies") or [] if isinstance(c, dict) and str(c.get("organization") or "").strip()]
    for k, c in enumerate(cases, 1):
        left = (_part("What they did", c.get("what_they_did"), 220) + _part("What changed", c.get("what_changed"), 200)
                + _part("What transfers", c.get("what_transfers"), 200))
        quote = _q(c.get("quote"), titles, 260, "big")
        out.append(_stage(f"Case study {k:02d} of {len(cases):02d}", c["organization"],
                          f'<div class="cols {"c2w" if quote else "c1"}"><div class="col plain">{left}</div>' + (f'<div class="col plain">{quote}</div>' if quote else "") + "</div>", kit))
    gaps = [[(g.get("gap"), "strong"), g.get("today"), g.get("leaders_do"), g.get("close_it_by"), str(g.get("priority") or "").capitalize()]
            for g in doc.get("gaps") or [] if isinstance(g, dict) and str(g.get("gap") or "").strip()]
    # whole sentences: a gap's cells run long, so three rows a slide when they are short and two when any is long
    per = 3 if all(len(str(c[0] if isinstance(c, tuple) else c)) <= 170 for g in gaps for c in g) else 2
    for k in range(0, len(gaps), per):
        out.append(_stage("What to close", "The gaps, in the order to close them",
                          _table(["Gap", "Where the subject is today", "What the leaders do", "How to close it", "When"], gaps[k:k + per], per, 260, "grid",
                                 [15, 25, 25, 27, 8]), kit))
    return _doc(doc.get("title") or "Competitive gap analysis", out, kit)


# ---- architecture ----------------------------------------------------------------------------------------------------
def architecture(doc, titles, brand="nxt"):
    kit = deck.brand_kit(brand)
    zones = [z for z in doc.get("zones") or [] if isinstance(z, dict) and str(z.get("name") or "").strip()][:5]
    comps = [c for c in doc.get("components") or [] if isinstance(c, dict) and str(c.get("name") or "").strip()]
    zhtml = ""
    for z in zones:
        mine = [c for c in comps if str(c.get("zone") or "").strip().lower() == str(z["name"]).strip().lower()][:5]
        brief = len(mine) > 3 or len(zones) > 4               # many boxes: names only, so every box stays readable
        boxes = "".join(f'<div class="box"><h3>{e(c.get("name"))}</h3>' + ("" if brief or not _lead(e(c.get("does")), 70) else f'<p>{_lead(e(c.get("does")), 70)}</p>') + "</div>" for c in mine)
        role = _whole(z.get("role"), 120)
        zhtml += f'<div class="zone"><p class="n">{e(z["name"])}</p>' + (f'<p class="w">{e(role)}</p>' if role else "") + f'<div class="stack">{boxes}</div></div>'
    out = [_stage("Architecture", doc.get("title"), f'<div class="zones" style="grid-template-columns:repeat({len(zones) or 1},minmax(0,1fr))">{zhtml}</div>', kit,
                  _lead(e(doc.get("standfirst")), 170))]
    flows = [[(f.get("source"), "strong"), f.get("target"), f.get("carries")] for f in doc.get("flows") or [] if isinstance(f, dict) and str(f.get("source") or "").strip()]
    for k in range(0, len(flows), 9):
        out.append(_stage(f"Every connection{f' ({k // 9 + 1} of {(len(flows) + 8) // 9})' if len(flows) > 9 else ''}", "What each system sends, and to which",
                          _table(["From", "To", "What moves"], flows[k:k + 9], 9, 90, "grid", [30, 30, 40]), kit))
    fails = "".join(f'<div class="col warn">{_label("Weak point")}' + (f'<p class="small where">{e(_whole(x.get("where"), 110))}</p>' if _whole(x.get("where"), 110) else "")
                    + f'<h3>{e(_w(x.get("what_fails"), 170))}</h3>'
                    + (f'<p><b>Who it hurts:</b> {e(_whole(x.get("who_it_hurts"), 170))}</p>' if _whole(x.get("who_it_hurts"), 170) else "")
                    + f'{_q(x.get("quote"), titles, 230)}</div>' for x in (doc.get("failures") or [])[:3] if isinstance(x, dict))
    if fails:
        out.append(_stage("Where it fails the people who use it", "The weak points", f'<div class="cols c3">{fails}</div>', kit))
    tgt = "".join(f'<div class="card deep"><h3>{e(_w(x.get("change"), 200))}</h3><p>Owner: {e(x.get("owner"))}</p></div>' for x in (doc.get("target") or [])[:4] if isinstance(x, dict))
    if tgt:
        out.append(_stage("What to change, and who owns it", "The changes to make", f'<div class="grid2">{tgt}</div>', kit))
    return _doc(doc.get("title") or "Architecture", out, kit)


# ---- any other document ----------------------------------------------------------------------------------------------
def document(doc, label, titles, brand="nxt"):
    kit = deck.brand_kit(brand)
    out = [_stage(label, doc.get("title"), (f'<p class="lead">{_lead(e(doc.get("standfirst")), 220)}</p>' if _lead(e(doc.get("standfirst")), 220) else "")
                  + _col("The points to take away", _ul(doc.get("takeaways"), 560, 4), "wide"), kit)]
    for i, s in enumerate(doc.get("sections") or [], 1):
        if not isinstance(s, dict):
            continue
        quotes = "".join(_q(q, titles, 240, "big") for q in (s.get("quotes") or [])[:1])
        paras = "".join(f"<p>{html.escape(x)}</p>" for x in _fit(s.get("paragraphs"), 560 if quotes else 820, 3))
        key = f'<p class="lead">{_lead(e(s.get("key_point")), 170)}</p>' if _lead(e(s.get("key_point")), 170) else ""
        out.append(_stage(f"{label} {i:02d}", s.get("heading"), key + f'<div class="cols {"c2w" if quotes else "c1"}"><div class="col plain">{paras}</div>'
                          + (f'<div class="col plain">{quotes}</div>' if quotes else "") + "</div>", kit))
        t = s.get("table") or {}
        cols = [c for c in t.get("columns") or [] if str(c).strip()][:5]
        rows = [list(r)[:len(cols)] for r in t.get("rows") or [] if isinstance(r, list)]
        for k in range(0, len(rows) if cols else 0, 6):
            out.append(_stage(f"{label} {i:02d}", s.get("heading"), _table(cols, rows[k:k + 6], 6, 120, "grid"), kit))
    return _doc(doc.get("title") or label, out, kit)


CSS = """
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#FFFFFF}
.stage{width:1920px;height:1080px;overflow:hidden;display:grid;grid-template-columns:46px 1fr;font-family:var(--font-body);color:var(--ink);background:#FFFFFF;page-break-after:always;break-after:page}
.rail{background:var(--rail);position:relative}.rail i{position:absolute;left:14px;top:62px;width:18px;height:18px;background:var(--accent)}
.main{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto;padding:52px 84px 34px 74px;min-height:0;min-width:0}
/* 1 px here is half a point in PowerPoint. Labels are one short line; every block keeps room beneath it, so a line that
   wraps a little wider in PowerPoint's substitute face lands in space and not on the next block. */
.kicker{margin-bottom:30px!important}
.kicker,.k,.n{font:600 20px/1.3 var(--font-body);letter-spacing:.06em;text-transform:uppercase;color:var(--deep);margin:0 0 14px;white-space:nowrap;display:block;width:100%}
h1{font:600 60px/1.14 var(--font-display);margin:0;max-width:1640px;text-transform:var(--title-transform)}
h3{font:600 30px/1.22 var(--font-body);margin:0 0 12px;padding-right:4%}
p{font:400 28px/1.38 var(--font-body);margin:0 0 22px;padding-right:5%}
.body{min-height:0;padding-top:34px;display:grid;align-content:start;gap:26px}
.lead{font-size:30px;line-height:1.36;color:var(--muted);max-width:1560px;margin:0}
.small{font-size:22px;color:var(--muted);margin:0}
.cols{display:grid;gap:40px;min-height:0;align-items:start}.c2{grid-template-columns:repeat(2,minmax(0,1fr))}.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.c1{grid-template-columns:minmax(0,1400px)}.c2w{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}.c2p{grid-template-columns:600px minmax(0,1fr);gap:56px}
.col{border-top:5px solid var(--deep);padding-top:18px;min-width:0}.col.warn{border-top-color:var(--warn)}.col.plain{border-top:0;padding-top:0}.col.wide{max-width:1500px}
ul{margin:0 0 26px;padding-left:30px;display:grid;gap:18px}li{font:400 28px/1.36 var(--font-body);padding-right:5%}
.quote{margin:6px 0 0;padding:18px 22px;background:var(--panel);border-left:6px solid var(--cool)}
.quote .qt{font:italic 400 26px/1.4 var(--font-body);margin:0 0 18px;padding-right:6%}
.quote.big .qt{font-size:32px;line-height:1.36}
.quote .qc{font:400 20px/1.3 var(--font-body);color:var(--muted);margin:0;white-space:nowrap}
.stack{display:grid;gap:16px}.grid2{display:grid;gap:22px;grid-template-columns:repeat(2,minmax(0,1fr))}.grid3{display:grid;gap:22px;grid-template-columns:repeat(3,minmax(0,1fr))}
.card{border:2px solid var(--line);border-left:7px solid var(--accent);padding:18px 22px;border-radius:3px;min-width:0}.card.deep{border-left-color:var(--deep)}
.card p{font-size:26px;margin:0 0 6px}.card h3{font-size:28px}
.pcard{min-width:0}.pcard h3{font-size:32px}.pcard p{font-size:26px;margin-bottom:14px}
figure{margin:0 0 18px;border-radius:4px;overflow:hidden;border-bottom:6px solid var(--accent)}figure img{display:block;width:100%;height:100%;object-fit:cover}
figure.wide{aspect-ratio:16/9}figure.tall{aspect-ratio:4/3}
.traits{font-weight:600;color:var(--deep)}
.sev{font-size:22px;color:var(--muted);margin:0 0 10px}.feel{font:600 32px/1.2 var(--font-body);color:var(--deep);margin:0 0 10px}.pt{font-weight:600;margin:0 0 6px}
.pn+.pn{margin-top:18px;padding-top:16px;border-top:2px dashed var(--line)}
.who{display:grid;grid-template-columns:minmax(0,1fr);gap:36px;align-items:center}.who.life{grid-template-columns:400px minmax(0,1fr)}.who figure{aspect-ratio:3/2;margin:0}
.strip{display:grid;gap:16px}.ph{background:var(--rail);color:#FFFFFF;border-top:6px solid var(--accent);padding:18px 20px;border-radius:3px;min-width:0}
.ph .n{color:var(--accent);margin-bottom:10px}.ph h3{font-size:26px;color:#FFFFFF}.ph p{font-size:22px;margin:0 0 10px;color:#FFFFFF}.ph .w{opacity:.8}.ph .feel{font-size:26px;color:var(--accent);margin:0}
.zones{display:grid;gap:28px;min-height:0;align-items:start}.zone .n{white-space:normal}.where{margin-bottom:12px}.zone{border:3px dashed var(--deep);border-radius:6px;padding:18px;min-width:0}.zone .w{font-size:22px;color:var(--muted);margin-bottom:16px}
.box{background:#FFFFFF;border:2px solid var(--line);border-left:7px solid var(--accent);padding:12px 16px;border-radius:3px}.box h3{font-size:26px;margin:0 0 6px}.box p{font-size:24px;margin:0}
table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{overflow-wrap:break-word;word-break:break-word;font:400 24px/1.32 var(--font-body);text-align:left;vertical-align:top;padding:14px 16px;border-bottom:2px solid var(--line)}
th{font-weight:600;font-size:22px;background:var(--panel)}td.strong{font-weight:600}
td.r-lead{color:var(--deep);font-weight:600}td.r-behind{color:var(--warn);font-weight:600}td.r-par{color:var(--ink)}td.r-none{color:var(--muted)}
.band{margin-top:22px;background:var(--accent);padding:20px 28px;border-radius:3px}.band p{font:400 26px/1.35 var(--font-body);color:var(--on-accent,var(--ink));margin:0}.band .bk{font:600 20px/1.3 var(--font-body);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px;white-space:nowrap}
.foot{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-top:16px;font:400 20px/1.3 var(--font-body);color:var(--muted)}
.foot .mark{height:26px;display:inline-flex;color:var(--ink);flex:none}.foot .mark svg{height:26px;width:auto}
"""
