"""The page a locally written document is shown on (owner, 20 Nov: the documents "read as walls of text"; they must
be modern, with interactive elements that make them easier to digest).

Three layouts, all from one set of parts:
- a persona set: a tab per persona, each a research persona card (who, a verbatim quote, where they sit on the
  behavioural dimensions, goals, behaviours, frustrations, needs, a typical episode, what to design for them), and a
  side-by-side comparison;
- a competitive gap analysis: who is compared, a capability matrix whose every cell opens the reason behind its
  rating, case study cards with a verbatim quote each, and a gap table that filters by priority;
- any other document: the points to take away first, a section bar that follows the reader, and sections that fold to
  their one-sentence point and open to their prose, quotes and tables.

Everything is real text laid out by code in the brand's tokens. The page is complete without scripts (every panel and
section is open and stacked); the script only folds, switches and filters, so print and export show the whole text.
A quotation is always a <blockquote><q>..</q><cite>..</cite></blockquote>, which is what the quote check reads.
"""
import html
import re

from . import deck, pagestyle


def e(s):
    return html.escape(str(s or ""), quote=True)


def _num(titles, sid):
    seen = titles.setdefault("__order__", [])
    if sid not in seen:
        seen.append(sid)
    return seen.index(sid) + 1


def order(titles, more=()):
    """[(number, source id)] for the sources list: the order in which the page first cites them, then any quoted only."""
    for sid in more:
        if sid in titles and sid != "__order__":
            _num(titles, sid)
    return [(i, s) for i, s in enumerate(titles.get("__order__") or [], 1) if s in titles]


def cite(text, titles):
    """Prose with its [S1] marks as small footnote numbers (owner, 20 Nov: citations "look like a wall of numbers").
    A source is numbered in the order the page first cites it; neighbouring marks share one superscript ("1, 3"); the
    number names its source on hover and jumps to it in the list. The sentence's own full stop stays before the mark."""
    def group(m):
        ids = list(dict.fromkeys(re.findall(r"S\d+", m.group(0))))
        links = ", ".join(f'<a href="#src-{s}" title="{e(titles.get(s, s))}">{_num(titles, s)}</a>' for s in ids)
        return f'<sup class="fn">{links}</sup>' + (" " if m.group(0)[-1:].isspace() else "")   # the space before the next word stays
    # the sentence's full stop or comma moves in front of its marks first, so the number sits after it ("readiness.1");
    # 22 Nov: the old step after this one deleted the footnote's closing tag, and the rest of the card was drawn as
    # one unwrapped line of footnote text running across the cards beside it
    text = re.sub(r"((?:\s*\[S\d+\])+)\s*([.,;:])", lambda m: m.group(2) + m.group(1), str(text or ""))
    out = re.sub(r"\s*(?:\[S\d+\][\s,;]*)+", group, e(text))
    return out


def quote(q, titles):
    if not isinstance(q, dict) or not str(q.get("text") or "").strip():
        return ""
    return (f'<blockquote class="pull"><q>{e(q.get("text"))}</q>'
            f'<cite>{e(titles.get(q.get("source_id"), q.get("source_id")))}</cite></blockquote>')


def _ids(doc):
    found = set()

    def walk(o):
        if isinstance(o, dict):
            if o.get("source_id"):
                found.add(str(o["source_id"]))
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, str):
            found.update(re.findall(r"\[(S\d+)\]", o))
    walk(doc)
    return sorted(found, key=lambda x: (len(x), x))


def _sources(doc, titles):
    rows = "".join(f'<li id="src-{e(c)}"><b>{n}</b>{e(titles[c])}</li>' for n, c in order(titles, _ids(doc)))
    return f'<section class="block srcs" id="sources"><p class="k">Sources</p><ol>{rows}</ol></section>' if rows else ""


def _glance(points, titles, heading="The points to take away"):
    pts = [p for p in points or [] if str(p).strip()][:5]
    if not pts:
        return ""
    cards = "".join(f'<li><span class="n">{i:02d}</span><p>{cite(p, titles)}</p></li>' for i, p in enumerate(pts, 1))
    return f'<section class="block glance" aria-label="{e(heading)}"><p class="k">{e(heading)}</p><ol class="points">{cards}</ol></section>'


def _table(t, titles, ident):
    cols = [c for c in (t or {}).get("columns") or [] if str(c).strip()]
    rows = [r for r in (t or {}).get("rows") or [] if isinstance(r, list)]
    if not cols or not rows:
        return ""
    head = "".join(f"<th scope=\"col\">{e(c)}</th>" for c in cols)
    body = "".join("<tr>" + "".join(f"<td>{cite(c, titles)}</td>" for c in (list(r) + [""] * len(cols))[:len(cols)]) + "</tr>" for r in rows)
    find = (f'<label class="find"><span>Filter rows</span><input type="search" data-filter="{ident}" placeholder="Type to filter"></label>'
            if len(rows) > 4 else "")
    return f'{find}<div class="tablewrap"><table id="{ident}"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def _list(items, titles, cls=""):
    items = [i for i in items or [] if str(i).strip()]
    return f'<ul class="{cls}">' + "".join(f"<li>{cite(i, titles)}</li>" for i in items) + "</ul>" if items else ""


def _shell(doc, label, brand, titles, body, nav):
    kit = deck.brand_kit(brand)
    foot = _sources(doc, titles)                 # numbered from the body's own order, before the standfirst is drawn
    bar = "".join(f'<a href="#{e(i)}">{e(t)}</a>' for i, t in nav)
    return (f'<!doctype html><html lang="en" data-brand="{e(kit["brand"])}"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(doc.get("title"))}</title>'
            f'<style>{kit["css"]}\n{pagestyle.CSS}\n{CSS}</style></head><body><div class="page doc">'
            f'<header class="masthead"><span class="k">{e(label)}</span>{kit["mark"]}</header>'
            f'<section class="hero"><p class="kicker">{e(label)}</p><h1>{e(doc.get("title"))}</h1>'
            + (f'<p class="standfirst">{cite(doc.get("standfirst"), titles)}</p>' if str(doc.get("standfirst") or "").strip() else "")
            + f'</section><nav class="bar" aria-label="Sections">{bar}<button type="button" class="tool" data-fold hidden>Open all sections</button></nav>'
            + body + foot + f'</div><script data-fold>{JS}</script></body></html>')


# ---- any document -----------------------------------------------------------------------------------------------
def document(doc, label, brand, titles):
    parts, nav = [], []
    for i, s in enumerate(doc.get("sections") or [], 1):
        sid = f"s{i}"
        paras = "".join(f"<p>{cite(p, titles)}</p>" for p in s.get("paragraphs") or [] if str(p).strip())
        quotes = "".join(quote(q, titles) for q in s.get("quotes") or [])
        point = f'<span class="point">{cite(s.get("key_point"), titles)}</span>' if str(s.get("key_point") or "").strip() else ""
        parts.append(f'<details class="block sec" id="{sid}" open><summary><span class="n">{i:02d}</span>'
                     f'<span class="h"><span class="h2">{e(s.get("heading"))}</span>{point}</span></summary>'
                     f'<div class="body"><div class="prose">{paras}</div>'
                     + (f'<div class="quotes">{quotes}</div>' if quotes else "")
                     + _table(s.get("table"), titles, f"t{i}") + "</div></details>")
        nav.append((sid, f"{i:02d}"))
    return _shell(doc, label, brand, titles, _glance(doc.get("takeaways"), titles) + "".join(parts), nav)


# ---- a persona set ----------------------------------------------------------------------------------------------
def _spectrum(dims, positions):
    by = {str(p.get("dimension") or "").strip().lower(): p for p in positions or [] if isinstance(p, dict)}
    rows = ""
    for d in dims:
        p = by.get(str(d.get("name") or "").strip().lower()) or {}
        try:
            v = max(1, min(5, int(p.get("value") or 3)))
        except (TypeError, ValueError):
            v = 3
        dots = "".join(f'<i class="{"on" if k == v else ""}"></i>' for k in range(1, 6))
        rows += (f'<div class="dim"><span class="dn">{e(d.get("name"))}</span><span class="lo">{e(d.get("low"))}</span>'
                 f'<span class="track" role="img" aria-label="{e(d.get("name"))}: {v} of 5, from {e(d.get("low"))} to {e(d.get("high"))}">{dots}</span>'
                 f'<span class="hi">{e(d.get("high"))}</span></div>')
    return f'<div class="spectrum">{rows}</div>' if rows else ""


def _bars(items, name):
    """Relative strength as bars with no figure on them: how strong one drive is beside another."""
    rows = ""
    for it in items or []:
        if not isinstance(it, dict) or not str(it.get("label") or "").strip():
            continue
        try:
            v = max(1, min(5, int(it.get("strength") or 3)))
        except (TypeError, ValueError):
            v = 3
        word = ("Weak", "Modest", "Moderate", "Strong", "Very strong")[v - 1]
        rows += (f'<div class="mbar"><span>{e(it["label"])}</span><span class="meter" role="img" aria-label="{e(it["label"])}: {word}">'
                 f'<i style="width:{v * 20}%"></i></span></div>')
    return f'<div class="barset"><p class="k">{e(name)}</p>{rows}</div>' if rows else ""


def personas(doc, label, brand, titles):
    dims = [d for d in doc.get("dimensions") or [] if isinstance(d, dict) and str(d.get("name") or "").strip()][:5]
    people = [p for p in doc.get("personas") or [] if isinstance(p, dict) and str(p.get("name") or "").strip()]
    tabs = "".join(f'<button type="button" role="tab" data-tab="p{i}" aria-selected="{"true" if i == 1 else "false"}">'
                   f'<span class="n">{i:02d}</span>{e(p["name"])}</button>' for i, p in enumerate(people, 1))
    tabs += '<button type="button" role="tab" data-tab="compare" aria-selected="false">Compare them</button>' if len(people) > 1 else ""
    panels = ""
    for i, p in enumerate(people, 1):
        facets = "".join(f'<div class="facet {cls}"><p class="k">{e(name)}</p>{_list(p.get(key), titles)}</div>'
                         for key, name, cls in (("goals", "Goals", "g"), ("behaviours", "What they do", "b"),
                                                ("frustrations", "What blocks them", "f"), ("needs", "What they need", "nd"))
                         if p.get(key))
        tools = "".join(f"<span class=\"chip\">{e(t)}</span>" for t in p.get("tools") or [] if str(t).strip())
        traits = "".join(f"<span class=\"trait\">{e(t)}</span>" for t in p.get("traits") or [] if str(t).strip())
        bars = "".join(_bars(p.get(k), name) for k, name in (("motivations", "What drives them"), ("channels", "Where they turn")))
        img = str(p.get("image") or "")
        if img.startswith("data:image/"):        # the lifestyle photograph leads the card, with who they are beside it
            top = (f'<header class="who life"><figure><img src="{e(img)}" alt="A typical moment for {e(p["name"])}"></figure>'
                   f'<div><p class="k">Persona {i:02d}</p><h2>{e(p["name"])}</h2><p class="lede">{cite(p.get("who"), titles)}</p>'
                   + quote(p.get("quote"), titles) + "</div></header>")
        else:
            top = (f'<header class="who"><span class="avatar" aria-hidden="true">{i:02d}</span><div><h2>{e(p["name"])}</h2>'
                   f'<p class="lede">{cite(p.get("who"), titles)}</p></div></header>' + quote(p.get("quote"), titles))
        panels += (f'<section class="block persona" id="p{i}" role="tabpanel" data-panel="p{i}">'
                   + top + (f'<div class="traits">{traits}</div>' if traits else "") + _spectrum(dims, p.get("positions"))
                   + (f'<div class="barsets">{bars}</div>' if bars else "")
                   + f'<div class="facets">{facets}</div>'
                   + (f'<div class="episode"><p class="k">A typical episode</p><p>{cite(p.get("scenario"), titles)}</p></div>' if str(p.get("scenario") or "").strip() else "")
                   + (f'<div class="tools"><p class="k">Tools and channels</p><div class="chips">{tools}</div></div>' if tools else "")
                   + (f'<div class="design"><p class="k">Design for this persona</p>{_list(p.get("implications"), titles)}</div>' if p.get("implications") else "")
                   + "</section>")
    first = lambda v: cite((v or [""])[0], titles)
    compare = ""
    if len(people) > 1:
        head = "".join(f"<th scope=\"col\">{e(p['name'])}</th>" for p in people)
        rows = ""
        for d in dims:
            cells = ""
            for p in people:
                by = {str(x.get("dimension") or "").strip().lower(): x for x in p.get("positions") or [] if isinstance(x, dict)}
                x = by.get(str(d.get("name") or "").strip().lower()) or {}
                try:
                    v = max(1, min(5, int(x.get("value") or 3)))
                except (TypeError, ValueError):
                    v = 3
                word = (d.get("low"), "Leans " + str(d.get("low") or "").lower(), "In between", "Leans " + str(d.get("high") or "").lower(), d.get("high"))[v - 1]
                cells += f'<td><span class="track small" aria-hidden="true">{"".join(f"""<i class="{"on" if k == v else ""}"></i>""" for k in range(1, 6))}</span>{e(word)}</td>'
            rows += f'<tr><th scope="row">{e(d.get("name"))}</th>{cells}</tr>'
        for key, name in (("goals", "First goal"), ("frustrations", "Main block"), ("needs", "First need")):
            rows += f'<tr><th scope="row">{name}</th>' + "".join(f"<td>{first(p.get(key))}</td>" for p in people) + "</tr>"
        compare = (f'<section class="block persona" id="compare" role="tabpanel" data-panel="compare"><h2>The personas side by side</h2>'
                   f'<div class="tablewrap"><table class="cmp"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table></div></section>')
    how = ""
    if dims:
        how = ('<section class="block dims"><p class="k">What separates one persona from the next</p><ul class="dimlist">'
               + "".join(f'<li><b>{e(d.get("name"))}</b><span>{e(d.get("low"))} to {e(d.get("high"))}</span></li>' for d in dims) + "</ul></section>")
    close = ""
    if doc.get("closing"):
        c = doc["closing"]
        close = (f'<section class="block closing" id="closing"><h2>{e(c.get("heading"))}</h2>'
                 + "".join(f"<p>{cite(x, titles)}</p>" for x in c.get("paragraphs") or [] if str(x).strip()) + "</section>")
    body = how + f'<div class="tabs" role="tablist" aria-label="Personas">{tabs}</div>' + panels + compare + close
    return _shell(doc, label, brand, titles, body, [])


# ---- a competitive gap analysis -----------------------------------------------------------------------------------
RATINGS = {"leads": "Leads", "on par": "On par", "behind": "Behind", "no evidence": "Not shown"}


def competitive(doc, label, brand, titles):
    subj = doc.get("subject") if isinstance(doc.get("subject"), dict) else {}
    comps = [c for c in doc.get("competitors") or [] if isinstance(c, dict) and str(c.get("name") or "").strip()][:6]
    names = [str(subj.get("name") or "The subject")] + [str(c["name"]) for c in comps]
    from .slidepage import org_summary          # an empty summary is filled from the organization's own cited evidence
    who = (f'<div class="org me"><p class="k">Whose position this is</p><h3>{e(names[0])}</h3><p>{cite(org_summary(doc, dict(subj, name=names[0])), titles)}</p></div>'
           + "".join(f'<div class="org"><p class="k">{e(c.get("kind") or "Compared with")}</p><h3>{e(c["name"])}</h3><p>{cite(org_summary(doc, c), titles)}</p></div>' for c in comps))
    head = "".join(f'<th scope="col" class="{"me" if i == 0 else ""}">{e(n)}</th>' for i, n in enumerate(names))
    rows = ""
    for r in doc.get("matrix") or []:
        if not isinstance(r, dict) or not str(r.get("capability") or "").strip():
            continue
        cells_by = {str(c.get("who") or "").strip().lower(): c for c in r.get("cells") or [] if isinstance(c, dict)}
        tds, behind = "", False
        for i, n in enumerate(names):
            c = cells_by.get(n.strip().lower()) or {}
            rating = str(c.get("rating") or "no evidence").strip().lower()
            rating = rating if rating in RATINGS else "no evidence"
            behind = behind or (i == 0 and rating == "behind")
            why = str(c.get("evidence") or "").strip()
            chip = f'<span class="rate r-{rating.replace(" ", "-")}">{RATINGS[rating]}</span>'
            tds += (f'<td class="{"me" if i == 0 else ""}"><details><summary>{chip}</summary><p>{cite(why, titles)}</p></details></td>' if why
                    else f'<td class="{"me" if i == 0 else ""}">{chip}</td>')
        rows += (f'<tr data-behind="{"1" if behind else "0"}"><th scope="row">{e(r["capability"])}'
                 + (f'<span class="why">{cite(r.get("why_it_matters"), titles)}</span>' if str(r.get("why_it_matters") or "").strip() else "") + f"</th>{tds}</tr>")
    legend = "".join(f'<span class="rate r-{k.replace(" ", "-")}">{v}</span>' for k, v in RATINGS.items())
    matrix = (f'<section class="block" id="matrix"><p class="k">Capability by capability</p><h2>{e(doc.get("matrix_heading") or "Where each one stands")}</h2>'
              f'<div class="toolrow"><span class="legend">{legend}</span>'
              '<button type="button" class="tool" data-toggle-behind aria-pressed="false" hidden>Show only where the subject is behind</button>'
              '<button type="button" class="tool" data-open-cells aria-pressed="false" hidden>Open every reason</button></div>'
              '<p class="hint">Choose a rating to read the reason behind it.</p>'
              f'<div class="tablewrap"><table class="matrix"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table></div></section>') if rows else ""
    cases = ""
    for c in doc.get("case_studies") or []:
        if isinstance(c, dict) and str(c.get("organization") or "").strip():
            cases += (f'<article class="case"><p class="k">Case study</p><h3>{e(c["organization"])}</h3>'
                      f'<dl><dt>What they did</dt><dd>{cite(c.get("what_they_did"), titles)}</dd>'
                      f'<dt>What changed</dt><dd>{cite(c.get("what_changed"), titles)}</dd>'
                      f'<dt>What transfers</dt><dd>{cite(c.get("what_transfers"), titles)}</dd></dl>{quote(c.get("quote"), titles)}</article>')
    cases = f'<section class="block" id="cases"><p class="k">Who has done it</p><h2>{e(doc.get("cases_heading") or "Case studies")}</h2><div class="cases">{cases}</div></section>' if cases else ""
    gaps = ""
    for g in doc.get("gaps") or []:
        if isinstance(g, dict) and str(g.get("gap") or "").strip():
            pr = str(g.get("priority") or "next").strip().lower()
            pr = pr if pr in ("first", "next", "later") else "next"
            gaps += (f'<tr data-priority="{pr}"><th scope="row">{cite(g["gap"], titles)}</th><td>{cite(g.get("today"), titles)}</td>'
                     f'<td>{cite(g.get("leaders_do"), titles)}</td><td>{cite(g.get("close_it_by"), titles)}</td><td><span class="prio p-{pr}">{pr.capitalize()}</span></td></tr>')
    gaps = (f'<section class="block" id="gaps"><p class="k">What to close</p><h2>{e(doc.get("gaps_heading") or "The gaps, in the order to close them")}</h2>'
            '<div class="toolrow" data-prio hidden><button type="button" class="tool" data-p="all" aria-pressed="true">All</button>'
            '<button type="button" class="tool" data-p="first" aria-pressed="false">First</button><button type="button" class="tool" data-p="next" aria-pressed="false">Next</button>'
            '<button type="button" class="tool" data-p="later" aria-pressed="false">Later</button></div>'
            '<div class="tablewrap"><table class="gaps"><thead><tr><th scope="col">Gap</th><th scope="col">Where the subject is today</th>'
            f'<th scope="col">What the leaders do</th><th scope="col">How to close it</th><th scope="col">When</th></tr></thead><tbody>{gaps}</tbody></table></div></section>') if gaps else ""
    close = ""
    if isinstance(doc.get("closing"), dict):
        c = doc["closing"]
        close = (f'<section class="block closing" id="closing"><h2>{e(c.get("heading"))}</h2>'
                 + "".join(f"<p>{cite(x, titles)}</p>" for x in c.get("paragraphs") or [] if str(x).strip()) + "</section>")
    body = (_glance(doc.get("takeaways"), titles) + f'<section class="block" id="who"><p class="k">Who is compared</p><div class="orgs">{who}</div></section>'
            + matrix + cases + gaps + close)
    nav = [(i, t) for i, t, on in (("who", "Who is compared", True), ("matrix", "Capabilities", bool(matrix)), ("cases", "Case studies", bool(cases)),
                                   ("gaps", "Gaps", bool(gaps)), ("closing", "What follows", bool(close))) if on]
    return _shell(doc, label, brand, titles, body, nav)


# ---- an architecture diagram ------------------------------------------------------------------------------------
def architecture(doc, label, brand, titles):
    """Zones side by side, each a dashed boundary holding its components, with the flows between neighbouring zones
    drawn as arrows that run only in the gutters, so no line crosses a box (owner's exemplars, 20 Nov: zoned
    components with labelled connectors). Choosing a component brings its connections forward and labels them. Every
    flow is also a row in a table, so the diagram is complete without the drawing."""
    zones = [z for z in doc.get("zones") or [] if isinstance(z, dict) and str(z.get("name") or "").strip()][:5]
    zname = [str(z["name"]).strip() for z in zones]
    comps = [c for c in doc.get("components") or [] if isinstance(c, dict) and str(c.get("name") or "").strip()]
    low = {n.lower(): i for i, n in enumerate(zname)}
    ids, cols = {}, [[] for _ in zones]
    for c in comps:
        zi = low.get(str(c.get("zone") or "").strip().lower())
        if zi is None or str(c["name"]).strip().lower() in ids:
            continue
        ids[str(c["name"]).strip().lower()] = f"c{len(ids) + 1}"
        cols[zi].append(c)
    zhtml = ""
    for zi, z in enumerate(zones):
        boxes = "".join(
            f'<button type="button" class="comp" id="{ids[str(c["name"]).strip().lower()]}" data-zone="{zi}" aria-pressed="false">'
            f'<span class="cn">{e(c["name"])}</span><span class="cd">{cite(c.get("does"), titles)}</span>'
            + (f'<span class="ch">Holds: {e(c.get("holds"))}</span>' if str(c.get("holds") or "").strip() else "") + "</button>" for c in cols[zi])
        zhtml += (f'<div class="zone" data-zone="{zi}"><p class="zk">{e(z["name"])}</p>'
                  + (f'<p class="zr">{e(z.get("role"))}</p>' if str(z.get("role") or "").strip() else "") + f'<div class="comps">{boxes}</div></div>')
    rows, flows = "", []
    for f in doc.get("flows") or []:
        if not isinstance(f, dict):
            continue
        a, b = ids.get(str(f.get("source") or "").strip().lower()), ids.get(str(f.get("target") or "").strip().lower())
        if not a or not b or a == b:
            continue
        flows.append({"a": a, "b": b, "t": " ".join(str(f.get("carries") or "").split())[:60]})
        rows += f'<tr data-a="{a}" data-b="{b}"><th scope="row">{e(f["source"])}</th><td class="arrow" aria-hidden="true">&rarr;</td><td>{e(f["target"])}</td><td>{cite(f.get("carries"), titles)}</td></tr>'
    import json as _json
    diagram = (f'<section class="block" id="diagram"><p class="k">The systems and what moves between them</p>'
               '<div class="toolrow"><span class="hint">Choose a component to see what it connects to.</span>'
               '<button type="button" class="tool" data-all-lines aria-pressed="true" hidden>All connections</button></div>'
               f'<div class="archwrap"><div class="arch" style="grid-template-columns:repeat({len(zones) or 1},minmax(0,1fr))">{zhtml}</div>'
               '<svg class="wires" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
               '<path d="M0 0 L10 5 L0 10 z"/></marker></defs></svg></div>'
               f'<script type="application/json" id="flows">{_json.dumps(flows).replace("</", "<" + chr(92) + "/")}</script></section>') if zhtml else ""
    table = (f'<section class="block" id="flowtable"><p class="k">Every connection</p><h2>{e(doc.get("flows_heading") or "What each system sends, and to which")}</h2>'
             f'<div class="tablewrap"><table class="flows"><thead><tr><th scope="col">From</th><th></th><th scope="col">To</th><th scope="col">What moves</th></tr></thead><tbody>{rows}</tbody></table></div></section>') if rows else ""
    fails = "".join(f'<article class="case"><p class="k">{e(x.get("where"))}</p><h3>{cite(x.get("what_fails"), titles)}</h3><p>{cite(x.get("who_it_hurts"), titles)}</p>{quote(x.get("quote"), titles)}</article>'
                    for x in doc.get("failures") or [] if isinstance(x, dict) and str(x.get("what_fails") or "").strip())
    fails = f'<section class="block" id="fails"><p class="k">Where it fails the people who use it</p><h2>{e(doc.get("fails_heading") or "The weak points")}</h2><div class="cases">{fails}</div></section>' if fails else ""
    tgt = "".join(f'<tr><th scope="row">{cite(x.get("change"), titles)}</th><td>{cite(x.get("why"), titles)}</td><td>{e(x.get("owner"))}</td></tr>'
                  for x in doc.get("target") or [] if isinstance(x, dict) and str(x.get("change") or "").strip())
    tgt = (f'<section class="block" id="target"><p class="k">The target arrangement</p><h2>{e(doc.get("target_heading") or "What to change, and who owns it")}</h2>'
           f'<div class="tablewrap"><table><thead><tr><th scope="col">Change</th><th scope="col">Why</th><th scope="col">Owner</th></tr></thead><tbody>{tgt}</tbody></table></div></section>') if tgt else ""
    body = _glance(doc.get("takeaways"), titles) + diagram + table + fails + tgt
    nav = [(i, t) for i, t, on in (("diagram", "Diagram", bool(diagram)), ("flowtable", "Connections", bool(table)), ("fails", "Weak points", bool(fails)), ("target", "Target", bool(tgt))) if on]
    return _shell(doc, label, brand, titles, body, nav).replace("</style>", ARCH_CSS + "</style>", 1).replace("<script data-fold>", "<script data-fold>" + ARCH_JS, 1)


ARCH_CSS = """
.archwrap{position:relative;margin-top:10px}
.arch{display:grid;gap:120px;align-items:start}
.zone{border:1.5px dashed var(--deep);border-radius:6px;padding:14px 12px;min-width:0;background:#FFFFFF}
.zk{font:600 12px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--deep);margin:0!important}
.zr{font-size:13px!important;color:var(--muted);margin:4px 0 0!important;line-height:1.35!important}
.comps{display:grid;gap:14px;margin-top:12px}.comp{min-height:78px;align-content:start}
.comp{display:grid;gap:4px;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1.5px solid var(--line);border-left:4px solid var(--accent);border-radius:4px;padding:10px 12px;cursor:pointer;min-width:0}
.comp:hover{border-color:var(--ink)}
.comp[aria-pressed=true]{background:var(--rail);color:#FFFFFF;border-color:var(--rail);border-left-color:var(--accent)}
.comp .cn{font:600 15.5px/1.25 var(--font-display)}.comp .cd{font-size:13px;line-height:1.38}.comp .ch{font-size:12px;opacity:.8}
.comp .fn{display:none}
.js .comp.faded{opacity:.3}
.wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.wires path.w{fill:none;stroke:var(--muted);stroke-width:1.6;marker-end:url(#ah)}
.wires path.w.on{stroke:var(--rail);stroke-width:2.4}.wires path.w.off{opacity:.12}
.wires marker path{fill:var(--muted)}
.wires text{font:600 11px/1 var(--font-body);fill:var(--ink);paint-order:stroke;stroke:#FFFFFF;stroke-width:4px;stroke-linejoin:round}.wires rect{fill:#FFFFFF;stroke:var(--line)}
.flows .arrow{color:var(--deep);font-weight:600;width:24px}.js .flows tr.faded{opacity:.3}
@media(max-width:820px){.arch{grid-template-columns:1fr!important;gap:18px}.wires{display:none}}
@media print{.wires path.w.off{opacity:1}}
"""

ARCH_JS = r"""
(function () {
  var d = document, wrap = d.querySelector(".archwrap"), svg = d.querySelector(".wires"), data = d.getElementById("flows");
  if (!wrap || !svg || !data) return;
  var flows = JSON.parse(data.textContent), NS = "http://www.w3.org/2000/svg", picked = null, showAll = true;
  function all(s) { return [].slice.call(d.querySelectorAll(s)); }
  function draw() {
    all(".wires .w, .wires .lab").forEach(function (n) { n.parentNode.removeChild(n); });
    if (getComputedStyle(svg).display === "none") return;
    var W = wrap.getBoundingClientRect(), gut = {}, port = {};
    var adj = flows.filter(function (f) {
      var a = d.getElementById(f.a), b = d.getElementById(f.b);
      return a && b && Math.abs(+a.getAttribute("data-zone") - +b.getAttribute("data-zone")) === 1;
    });
    adj.forEach(function (f) { var a = d.getElementById(f.a), b = d.getElementById(f.b); var g = Math.min(+a.getAttribute("data-zone"), +b.getAttribute("data-zone")); (gut[g] = gut[g] || []).push(f); });
    Object.keys(gut).forEach(function (g) {
      var list = gut[g];
      list.forEach(function (f, k) {
        var a = d.getElementById(f.a).getBoundingClientRect(), b = d.getElementById(f.b).getBoundingClientRect();
        var right = a.left < b.left, x1 = (right ? a.right : a.left) - W.left, x2 = (right ? b.left : b.right) - W.left;
        var pa = (port[f.a] = (port[f.a] || 0) + 1), pb = (port[f.b] = (port[f.b] || 0) + 1);
        var y1 = a.top - W.top + Math.min(a.height - 8, 4 + pa * 17), y2 = b.top - W.top + Math.min(b.height - 8, 4 + pb * 17);
        var lo = Math.min(x1, x2), hi = Math.max(x1, x2), xm = lo + (hi - lo) * (k + 1) / (list.length + 1);
        var on = picked && (f.a === picked || f.b === picked);
        if (!showAll && !on) return;
        var p = d.createElementNS(NS, "path");
        p.setAttribute("d", "M" + x1 + " " + y1 + " H" + xm + " V" + y2 + " H" + (x2 + (right ? -2 : 2)));
        p.setAttribute("class", "w" + (on ? " on" : picked ? " off" : ""));
        svg.appendChild(p);
        if (on && f.t) {
          var t = d.createElementNS(NS, "text"); t.textContent = f.t.length > 26 ? f.t.slice(0, 25).replace(/\s+\S*$/, "") : f.t;
          t.setAttribute("class", "lab"); t.setAttribute("text-anchor", right ? "end" : "start"); t.setAttribute("x", x2 + (right ? -12 : 12)); t.setAttribute("y", y2 - 4);
          svg.appendChild(t);
        }
      });
    });
  }
  function pick(id) {
    picked = picked === id ? null : id;
    var near = {};
    flows.forEach(function (f) { if (f.a === picked || f.b === picked) { near[f.a] = near[f.b] = 1; } });
    all(".comp").forEach(function (c) { c.setAttribute("aria-pressed", c.id === picked ? "true" : "false"); c.classList.toggle("faded", !!picked && !near[c.id] && c.id !== picked); });
    all(".flows tbody tr").forEach(function (r) { r.classList.toggle("faded", !!picked && r.getAttribute("data-a") !== picked && r.getAttribute("data-b") !== picked); });
    draw();
  }
  all(".comp").forEach(function (c) { c.addEventListener("click", function () { pick(c.id); }); });
  var tog = d.querySelector("[data-all-lines]");
  if (tog) { tog.hidden = false; tog.addEventListener("click", function () { showAll = !showAll; tog.setAttribute("aria-pressed", showAll ? "true" : "false"); draw(); }); }
  window.addEventListener("resize", draw);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(draw);
  draw();
})();
"""


CSS = """
.doc{max-width:1120px}
.doc h1{max-width:36ch}
.doc .hero{padding-bottom:0}
.doc h2,.doc .h2{font:600 26px/1.15 var(--font-display);margin:0;text-transform:var(--title-transform)}
.doc h3{font:600 18px/1.25 var(--font-body);margin:0 0 6px}
.doc p{font-size:16.5px;line-height:1.6;margin:0 0 12px;max-width:72ch}
.block{margin-top:28px}
.bar{position:sticky;top:0;z-index:3;display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:#FFFFFF;border-bottom:1px solid var(--line);padding:10px 0;margin-top:18px}
.bar:empty{display:none}
.bar a{font:500 13px/1 var(--font-body);color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:99px;padding:7px 12px}
.bar a:hover,.bar a.on{border-color:var(--ink);background:var(--panel)}
.tool{font:500 13px/1 var(--font-body);color:var(--ink);background:#FFFFFF;border:1px solid var(--line);border-radius:99px;padding:7px 12px;cursor:pointer}
.tool:hover{border-color:var(--ink)}.tool[aria-pressed=true]{background:var(--rail);border-color:var(--rail);color:#FFFFFF}
.bar .tool{margin-left:auto}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.fn{font-size:.68em;line-height:0;vertical-align:super;margin-left:1px;white-space:nowrap}.fn a{color:var(--deep);text-decoration:none;font-weight:600}.fn a:hover{text-decoration:underline}
.points{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.points li{border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:var(--radius);padding:14px 16px;min-width:0}
.points .n,.sec .n,.tabs .n{font:500 12px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--deep)}
.points p{font-size:16px;line-height:1.45;margin:8px 0 0}
.sec{border:1px solid var(--line);border-radius:var(--radius);margin-top:14px;scroll-margin-top:64px}
.sec>summary{list-style:none;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:start;padding:18px 20px;cursor:pointer}
.sec>summary::-webkit-details-marker{display:none}
.sec>summary::after{content:"+";font:400 24px/1 var(--font-body);color:var(--deep)}
.sec[open]>summary::after{content:"\\2212"}
.sec .h{display:grid;gap:6px}
.sec .point{color:var(--muted);font-size:16px;line-height:1.45;max-width:70ch}
.sec .body{padding:0 20px 20px 20px;display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@media(min-width:900px){.sec .body:has(.quotes){grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}.sec .body>.tablewrap,.sec .body>.find{grid-column:1/-1}}
.pull{margin:0 0 12px;padding:14px 16px;background:var(--panel);border-left:3px solid var(--cool);border-radius:var(--radius)}
.pull q{display:block;font-size:16.5px;line-height:1.5;font-style:italic;quotes:"\\201C" "\\201D"}
.pull cite{display:block;font-style:normal;font-size:13px;color:var(--muted);margin-top:8px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius)}
.doc table{border-collapse:collapse;width:100%;font-size:15px}
.doc th,.doc td{padding:10px 12px;text-align:left;vertical-align:top;line-height:1.45;border-bottom:1px solid var(--line)}
.doc thead th{background:var(--panel);font-weight:600;position:sticky;top:0}
.doc tbody tr:last-child>*{border-bottom:0}
.find{display:grid;gap:4px;font-size:12px;color:var(--muted);max-width:280px}
.find input{font:inherit;font-size:14px;color:var(--ink);border:1px solid var(--line);border-radius:var(--radius);padding:7px 10px}
.srcs ol{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;font-size:14px;color:var(--muted)}
.srcs li{scroll-margin-top:70px;padding:2px 4px;border-radius:3px}.srcs li:target{background:var(--panel);color:var(--ink)}
.srcs b{font:500 12px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--deep);margin-right:8px}
.dimlist{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px 24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.dimlist li{border-top:1px solid var(--line);padding-top:8px;display:grid;gap:2px}.dimlist span{color:var(--muted);font-size:14px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:28px;position:sticky;top:0;background:#FFFFFF;padding:10px 0;z-index:3;border-bottom:1px solid var(--line)}
.tabs button{display:flex;gap:8px;align-items:baseline;font:600 14px/1.2 var(--font-body);color:var(--ink);background:#FFFFFF;border:1px solid var(--line);border-radius:var(--radius);padding:10px 14px;cursor:pointer;text-align:left}
.tabs button:hover{border-color:var(--ink)}
.tabs button[aria-selected=true]{background:var(--rail);border-color:var(--rail);color:#FFFFFF}
.tabs button[aria-selected=true] .n{color:var(--accent)}
.persona{border:1px solid var(--line);border-radius:var(--radius);padding:24px;scroll-margin-top:70px}
.who{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;margin-bottom:16px}
.avatar{width:64px;height:64px;border-radius:50%;background:var(--rail);color:var(--accent);display:grid;place-items:center;font:600 22px/1 var(--font-display)}
.lede{color:var(--muted);margin:6px 0 0!important}
.traits{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 4px}.trait{background:var(--rail);color:#FFFFFF;border-radius:99px;padding:4px 14px;font:600 13px/1.3 var(--font-body)}
.barsets{display:grid;gap:14px 28px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin:4px 0 18px}
.mbar{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:12px;align-items:center;font-size:14px;margin-top:8px}  /* never "bar": that is the section menu (22 Nov: the menu was drawn as this two-column grid) */
.meter{display:block;height:10px;background:var(--panel);border-radius:2px;overflow:hidden}.meter i{display:block;height:100%;background:var(--accent)}
.barset:nth-child(2) .meter i{background:var(--cool)}
.who.life{grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:24px;align-items:stretch}
.who.life figure{margin:0;border-radius:var(--radius);overflow:hidden;background:var(--panel);aspect-ratio:3/2;border-bottom:4px solid var(--accent)}
.who.life img{display:block;width:100%;height:100%;object-fit:cover}
.who.life>div{display:grid;align-content:center;gap:4px}.who.life .pull{margin:14px 0 0}
@media(max-width:760px){.who.life{grid-template-columns:1fr}}
.spectrum{display:grid;gap:10px;margin:18px 0;padding:16px;border:1px solid var(--line);border-radius:var(--radius)}
.dim{display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr) 150px minmax(0,1fr);gap:12px;align-items:center;font-size:14px}
.dim .dn{font-weight:600}.dim .lo{text-align:right;color:var(--muted)}.dim .hi{color:var(--muted)}
.track{display:grid;grid-template-columns:repeat(5,1fr);align-items:center;height:14px;position:relative}
.track::before{content:"";position:absolute;left:8%;right:8%;top:50%;height:2px;background:var(--line)}
.track i{position:relative;justify-self:center;width:8px;height:8px;border-radius:50%;background:var(--line)}
.track i.on{width:14px;height:14px;background:var(--accent);box-shadow:0 0 0 2px var(--rail)}
.track.small{width:90px;margin-bottom:4px}
@media(max-width:760px){.dim{grid-template-columns:1fr 1fr;}.dim .dn{grid-column:1/-1}.dim .track{grid-column:1/-1;order:3}.dim .lo{text-align:left}.dim .hi{text-align:right}}
.facets{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.facet{border:1px solid var(--line);border-top:3px solid var(--deep);border-radius:var(--radius);padding:14px 16px;min-width:0}
.facet.f{border-top-color:var(--warn)}.facet.nd{border-top-color:var(--accent)}.facet.b{border-top-color:var(--cool)}
.doc ul{margin:8px 0 0;padding-left:18px;display:grid;gap:8px}.doc li{line-height:1.45;font-size:15.5px}
.episode,.tools,.design{margin-top:16px}.episode p:last-child{margin:6px 0 0}
.episode{background:var(--panel);border-radius:var(--radius);padding:16px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.chip{border:1px solid var(--line);border-radius:99px;padding:4px 12px;font-size:14px}
.design{border-left:3px solid var(--accent);padding-left:16px}
.cmp .track{display:grid}
.orgs{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));margin-top:12px}
.org{border:1px solid var(--line);border-radius:var(--radius);padding:16px;min-width:0}.org p:last-child{margin:0;font-size:15px}
.org.me{border-color:var(--rail);box-shadow:inset 0 3px 0 var(--accent)}
.toolrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 8px}.legend{display:flex;gap:6px;flex-wrap:wrap;margin-right:auto}
.hint{color:var(--muted);font-size:14px!important;margin:0 0 10px!important}
.rate,.prio{display:inline-block;font:600 12.5px/1 var(--font-body);border-radius:99px;padding:5px 10px;border:1px solid var(--line);white-space:nowrap}
.r-leads{background:var(--rail);color:#FFFFFF;border-color:var(--rail)}
.r-on-par{background:var(--panel)}
.r-behind{background:color-mix(in srgb,var(--warn) 16%,#FFFFFF);border-color:var(--warn)}
.r-no-evidence{color:var(--muted);border-style:dashed}
.matrix th[scope=row]{min-width:200px}.matrix .why{display:block;font-weight:400;color:var(--muted);font-size:13.5px;margin-top:4px}
.matrix td.me,.matrix th.me{background:color-mix(in srgb,var(--accent) 9%,#FFFFFF)}
.matrix summary{list-style:none;cursor:pointer}.matrix summary::-webkit-details-marker{display:none}
.matrix summary .rate::after{content:" +";font-weight:400}.matrix details[open] summary .rate::after{content:" \\2212"}
.matrix details p{font-size:14px;line-height:1.45;margin:8px 0 0;min-width:180px}
.cases{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:12px}
.case{border:1px solid var(--line);border-radius:var(--radius);padding:18px;min-width:0}
.case dl{margin:8px 0 12px;display:grid;gap:4px}.case dt{font:500 11px/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:8px}
.case dd{margin:0;font-size:15.5px;line-height:1.5}
.p-first{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}.p-next{background:var(--panel)}.p-later{color:var(--muted)}
.closing{border-top:1px solid var(--line);padding-top:24px}.closing h2{margin-bottom:12px}
.js .persona[hidden]{display:none}
@media print{.bar,.tabs,.tool,.find,.hint{display:none!important}.sec>summary::after{content:""}}
"""

JS = r"""
(function () {
  var d = document, root = d.documentElement;
  if (window.matchMedia && window.matchMedia("print").matches) return;
  root.classList.add("js");
  function all(s, n) { return [].slice.call((n || d).querySelectorAll(s)); }
  // sections fold to their point; the first stays open
  var secs = all("details.sec"), fold = d.querySelector("[data-fold]");
  if (secs.length > 2) {
    secs.forEach(function (s, i) { if (i) s.open = false; });
    if (fold) {
      fold.hidden = false;
      fold.addEventListener("click", function () {
        var open = secs.some(function (s) { return !s.open; });
        secs.forEach(function (s) { s.open = open; });
        fold.textContent = open ? "Fold all sections" : "Open all sections";
      });
    }
  }
  // a link to a folded section opens it
  function reveal() {
    var t = location.hash && d.getElementById(location.hash.slice(1));
    if (t && t.tagName === "DETAILS") t.open = true;
    var tab = t && t.getAttribute("data-panel");
    if (tab) pick(tab);
  }
  // the section bar marks where the reader is
  var links = all(".bar a");
  if (links.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    links.forEach(function (a) { var t = d.getElementById(a.getAttribute("href").slice(1)); if (t) io.observe(t); });
  }
  // persona tabs
  var tabs = all(".tabs [data-tab]"), panels = all("[data-panel]");
  function pick(name) {
    tabs.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-tab") === name ? "true" : "false"); });
    panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
  }
  if (tabs.length) {
    pick(tabs[0].getAttribute("data-tab"));
    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { pick(b.getAttribute("data-tab")); });
      b.addEventListener("keydown", function (ev) {
        var step = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        var n = tabs[(i + step + tabs.length) % tabs.length];
        n.focus(); pick(n.getAttribute("data-tab"));
      });
    });
  }
  // tables filter as the reader types
  all("input[data-filter]").forEach(function (inp) {
    var rows = all("#" + inp.getAttribute("data-filter") + " tbody tr");
    inp.addEventListener("input", function () {
      var q = inp.value.toLowerCase();
      rows.forEach(function (r) { r.hidden = q && r.textContent.toLowerCase().indexOf(q) < 0; });
    });
  });
  // the capability matrix
  var behind = d.querySelector("[data-toggle-behind]"), cells = d.querySelector("[data-open-cells]");
  if (behind) {
    behind.hidden = !all('.matrix tr[data-behind="1"]').length;
    behind.addEventListener("click", function () {
      var on = behind.getAttribute("aria-pressed") !== "true";
      behind.setAttribute("aria-pressed", on ? "true" : "false");
      all(".matrix tbody tr").forEach(function (r) { r.hidden = on && r.getAttribute("data-behind") !== "1"; });
    });
  }
  if (cells) {
    cells.hidden = !all(".matrix details").length;
    cells.addEventListener("click", function () {
      var on = cells.getAttribute("aria-pressed") !== "true";
      cells.setAttribute("aria-pressed", on ? "true" : "false");
      cells.textContent = on ? "Close every reason" : "Open every reason";
      all(".matrix details").forEach(function (x) { x.open = on; });
    });
  }
  // gaps by priority
  var prio = d.querySelector("[data-prio]");
  if (prio) {
    prio.hidden = false;
    all("[data-p]", prio).forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-p");
        all("[data-p]", prio).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        all(".gaps tbody tr").forEach(function (r) { r.hidden = p !== "all" && r.getAttribute("data-priority") !== p; });
      });
    });
  }
  window.addEventListener("hashchange", reveal);
  reveal();
})();
"""


def for_export(doc):
    """The page as an export shows it: every section, persona and reason open, and no controls. The folding is done by
    the page's script, so without the script the whole text is there; the controls are hidden because they do nothing
    on paper."""
    doc = re.sub(r"(?is)<script data-fold>.*?</script>", "", doc)
    doc = re.sub(r"(?i)<details(\b[^>]*?)(?<! open)>", r"<details\1 open>", doc)
    return doc.replace("</head>", "<style>.bar,.tabs,.toolrow,.find,.hint{display:none!important}.persona,.sec{break-inside:avoid}</style></head>", 1)

