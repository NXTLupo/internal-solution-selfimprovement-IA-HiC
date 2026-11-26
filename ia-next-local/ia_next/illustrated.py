"""The illustrated infographic: one canvas, a statement title and a one-line subtitle, four to eight nodes in one or two
groups, each node an illustration, a short label and a one-sentence caption.

The bar is Gemini Notebook's infographic, captured on 9 Nov (gemini-infographic-reference.png): "one landscape
illustrated canvas, six content-true nodes ... each with a one-sentence mechanism caption", a cohesive illustration
system, zero figures. The owner's directive: "#infographics requires images/graphics! NOT JUST GLYPHS AND ICONS".
Gemini's canvas is one flat picture with tiny baked-in captions, no citation per element and image-only export.

Here the illustrations are made on this machine by the picture engine, all in one style and with no text in them, and
everything a reader reads is real text laid out by code in the brand's tokens: so the type is legible, each node keeps
the checked passage it rests on, and the same page exports as an editable PowerPoint slide (text as text, each
illustration a picture that can be swapped). Unordered ideas are grouped, never numbered: a sequence is only drawn
when the designer chose a flow.

The words come from sections the diagram studio has already checked against the passages; this module adds no claim.
"""
import base64
import html
import json
import re

import httpx

from . import config, deck

SIZES = {"landscape": (1920, 1080), "portrait": (1080, 1620), "square": (1200, 1200)}
NODES = {"concise": 4, "standard": 6, "detailed": 8}
STYLE = ("Flat editorial spot illustration for a magazine. Recognizable people and objects drawn with simple clean "
         "shapes, the scene clear at a glance, centered on a plain off-white background. No text, no letters, no "
         "numbers, no labels, no logos, no abstract patterns.")
NEGATIVE = "text, letters, words, watermark, logo, caption, photograph, 3d render, deformed hands, extra fingers, futuristic"


def _colour_word(hex6):
    """A plain colour name a picture engine understands, from a brand token ("B8B800" gives "olive yellow-green")."""
    import colorsys
    try:
        r, g, b = (int(str(hex6).lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    except (ValueError, IndexError):
        return ""
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.14:
        return "black" if l < 0.12 else "charcoal" if l < 0.35 else "grey" if l < 0.8 else "white"
    hue = next(name for limit, name in ((14, "red"), (40, "orange"), (56, "yellow"), (80, "yellow-green"), (160, "green"),
                                        (188, "teal"), (205, "cyan"), (255, "blue"), (290, "purple"), (335, "pink"),
                                        (361, "red")) if h * 360 < limit)
    tone = "deep " if l < 0.3 else "olive " if l < 0.42 and hue in ("yellow", "yellow-green") else "bright " if s > 0.75 and l > 0.45 else ""
    return tone + hue


def style(brand="nxt"):
    """The one style every illustration of a canvas is made in. The palette is the brand's own (owner, 25 Nov: the
    pictures of a DECIEM or Northeastern poster were drawn in NXT's teal and chartreuse)."""
    kit = deck.brand_kit(brand)
    found = dict(re.findall(r"--(accent|deep|cool|rail)\s*:\s*#([0-9A-Fa-f]{6})", str(kit.get("css") or "")))
    words = list(dict.fromkeys(w for w in (_colour_word(found.get(k, "")) for k in ("accent", "deep", "cool")) if w and w not in ("white", "black")))
    palette = ", ".join(words + ["charcoal", "warm grey"])
    return f"{STYLE} Limited palette of {palette}."
SUBJECT_SCHEMA = {"type": "object", "required": ["scenes"], "properties": {"scenes": {"type": "array", "items": {
    "type": "object", "required": ["n", "who", "doing", "where"],
    "properties": {"n": {"type": "integer"}, "who": {"type": "string"}, "doing": {"type": "string"}, "where": {"type": "string"}}}}}}

# QA 25 Nov (E6): the poster's type was one size of heading over a grid of equal cards, and at the detailed setting it
# shrank to fit. The hierarchy is now typographic and comes from the brand's own tokens: a headline sized to its length,
# the point of the page as a full-width band in the accent colour, a lead idea across the full width, a numeral on
# every idea, and some ideas led by their quotation. A detailed portrait poster grows taller; its type never shrinks.
_CSS = """
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#FFFFFF}
#stage{position:relative;overflow:hidden;background:var(--paper);display:grid;grid-template-columns:minmax(0,33fr) minmax(0,67fr);
  font-family:var(--font-body);color:var(--ink)}
#stage.portrait,#stage.square{grid-template-columns:1fr;grid-template-rows:auto auto minmax(0,1fr)}
.lead{background:var(--rail);color:#FFFFFF;display:grid;grid-template-rows:1fr auto;gap:30px;padding:60px 48px 34px;min-height:0;min-width:0}
.portrait .lead,.square .lead{padding:58px 60px 34px;gap:26px}
.kicker{font:500 15px/1 ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.18em;text-transform:uppercase;
  color:var(--accent);margin:0 0 22px}
h1{font:600 var(--h1,64px)/.98 var(--font-display);letter-spacing:-.01em;margin:0;color:#FFFFFF;text-transform:var(--title-transform);text-wrap:balance}
.sub{font:400 23px/1.4 var(--font-body);color:#FFFFFF;opacity:.84;margin:22px 0 0;max-width:34em}
.point{background:var(--accent);color:var(--on-accent);padding:26px 60px 28px;display:grid;gap:8px;min-width:0}
.landscape .point{grid-column:1;padding:26px 48px 28px}
.point .k,.tag{font:500 12.5px/1.3 ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;margin:0}
.point p.say{font:600 var(--point,34px)/1.14 var(--font-display);margin:0;text-wrap:balance}
.landscape .side{display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0;min-width:0}
.foot{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;font:400 12.5px/1.35 var(--font-body);color:#FFFFFF}
.foot ul{list-style:none;margin:0;padding:0;display:grid;gap:3px;opacity:.72}
.foot .mm-mark{height:24px;width:auto;color:#FFFFFF;flex:0 0 auto;display:inline-flex}
.foot .mm-mark svg{height:24px;width:auto}
.grid{display:grid;gap:14px;padding:14px;min-height:0;min-width:0}
.card{position:relative;display:grid;grid-template-rows:auto auto auto minmax(0,1fr);align-content:start;gap:12px;padding:26px 26px 22px;border-radius:3px;min-width:0;min-height:0;overflow:hidden}
.num{font:600 60px/.82 var(--font-display);letter-spacing:-.02em;opacity:.9;margin:0}
.f-panel .num,.f-tint .num{color:var(--deep)}
.f-deep .num,.f-rail .num{color:var(--accent)}
.top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
.pic{width:168px;height:168px;border-radius:50%;overflow:hidden;background:#FFFFFF;border:5px solid #FFFFFF;flex:none}
.landscape .pic{width:118px;height:118px;border-width:4px}
.pic img{display:block;width:100%;height:100%;object-fit:cover}
.card h2{font:600 32px/1.06 var(--font-display);margin:0;text-transform:var(--title-transform);text-wrap:balance}
.cap{font:400 19px/1.42 var(--font-body);margin:0}
.proof{align-self:end;margin:0;padding:10px 12px;border-radius:3px;font:400 15.5px/1.4 var(--font-body);background:color-mix(in srgb,#FFFFFF 80%,transparent);color:var(--ink)}
.proof q,.say q{quotes:"\\201C" "\\201D"}
.proof q{font-style:italic}
.proof cite,.big cite{display:block;font-style:normal;font-size:13px;margin-top:6px;opacity:.78}
.hero{grid-column:1/-1;grid-template-rows:none;grid-template-columns:minmax(0,1fr);gap:30px;align-items:center;padding:30px 34px}
.hero.haspic{grid-template-columns:auto minmax(0,1fr)}
.hero.hasq{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
.hero.haspic.hasq{grid-template-columns:auto minmax(0,1.2fr) minmax(0,1fr)}
.hero .say{display:grid;grid-template-columns:auto minmax(0,1fr);gap:22px;align-items:center;min-width:0}
.hero .num{font-size:128px}
.hero h2{font-size:46px;line-height:1.02}
.hero .cap{font-size:21px;margin-top:12px}
.hero .proof{align-self:center;font-size:17px;padding:14px 16px}
.hero .pic{width:250px;height:250px;border-width:6px}
.landscape .hero .pic{width:170px;height:170px}
.portrait .hero.haspic.hasq{grid-template-columns:auto minmax(0,1fr)}
.portrait .hero.haspic.hasq .proof{grid-column:1/-1}
.plain{grid-template-rows:auto auto auto;align-content:center;gap:16px}
.plain h2{font-size:40px}.plain .cap{font-size:22px;max-width:30em}
.landscape .plain h2{font-size:34px}.landscape .plain .cap{font-size:19px}
.caps h1{font-size:calc(var(--h1,64px)*.8);line-height:1.02}
.caps .card h2{font-size:25px;line-height:1.12}.caps .plain h2{font-size:30px}.caps .hero h2{font-size:36px}
.caps .big{font-size:20px;line-height:1.3}.caps .num{font-size:52px}.caps .hero .num{font-size:104px}
.caps.landscape .card h2{font-size:22px}.caps.landscape .plain h2{font-size:26px}.caps.landscape .hero h2{font-size:32px}
.caps .point p.say{font-size:calc(var(--point,34px)*.86)}
.qled{grid-template-rows:auto minmax(0,1fr) auto}
.qled[style]{grid-template-rows:auto auto auto;align-content:center;gap:22px}.qled[style] .big{font-size:34px}
.qled[style] .top{grid-template-columns:auto auto;justify-content:space-between}
.big{margin:0;font:500 25px/1.24 var(--font-display);align-self:center}
.big q{quotes:"\\201C" "\\201D"}
.big cite{font:400 13px/1.3 var(--font-body)}
.qled h2{font-size:21px;line-height:1.15;opacity:.92}
.f-accent{background:var(--accent);color:var(--on-accent)}
.f-deep{background:var(--deep);color:#FFFFFF}
.f-rail{background:var(--rail);color:#FFFFFF}
.f-panel{background:var(--panel);color:var(--ink)}
.f-tint{background:color-mix(in srgb,var(--cool) 22%,#FFFFFF);color:var(--ink)}
.f-panel .proof,.f-tint .proof{background:#FFFFFF}
.landscape .card h2{font-size:28px}.landscape .cap{font-size:17.5px}.landscape .hero h2{font-size:40px}.landscape .hero .num{font-size:104px}
.landscape .num{font-size:50px}.landscape .big{font-size:21px}.landscape .proof{font-size:14.5px}
"""


def _headline_px(title, wide):
    """The headline's size from its length: short headlines are set very large, long ones still lead the page."""
    n = len(str(title or ""))
    steps = ((28, 76), (46, 64), (70, 54), (999, 44)) if wide else ((30, 112), (48, 92), (72, 74), (999, 60))
    return next(px for limit, px in steps if n <= limit)


def _caps(kit):
    """True when the brand sets its titles in capitals: such a face runs wide and needs more room for the same words."""
    import re as _re
    return bool(_re.search(r"--title-transform\s*:\s*uppercase", str(kit.get("css") or "")))


def canvas(orientation, n, caps=False):
    """The canvas for n ideas: a portrait poster with many ideas grows taller, so its type stays large; a brand that
    sets titles in capitals gets more room again."""
    w, h = SIZES.get(orientation, SIZES["landscape"])
    if orientation == "portrait":
        rows = -(-max(0, n - 1) // 2) if n > 3 else max(0, n - 1)
        h = max(h, (760 if caps else 700) + (430 if caps else 400) + rows * (500 if caps else 460))
    return w, h


def pick(sections, density):
    """The nodes of the canvas from the checked sections: up to the density's count, at most two groups, a label of at
    most six words and one caption sentence each. A node keeps the evidence it was checked against."""
    limit = NODES.get(density, 6)
    groups = []
    for sec in sections:
        items = [it for it in sec.get("items") or [] if it.get("label")]
        if not items:
            continue
        named = [g for g in dict.fromkeys(it.get("group") or "" for it in items) if g]
        buckets = [(g, [it for it in items if (it.get("group") or "") == g]) for g in named] if len(named) == 2 else [(sec.get("heading") or "", items)]
        for heading, its in buckets:
            nodes = [{"label": " ".join(str(it["label"]).split()[:7]), "caption": _one_sentence(it.get("detail") or ""),
                      "evidence": it.get("evidence") or [], "proof": proof(it.get("evidence") or [])} for it in its]
            # an infographic states patterns: an idea that carries a figure, in digits or in words, is left off the canvas
            groups.append({"heading": heading, "nodes": [n for n in nodes if len(n["caption"].split()) >= 6
                                                          and not _has_figure(n["label"] + " " + n["caption"])]})
    groups = [g for g in groups if g["nodes"]][:(2 if limit <= 4 else 4)] if len(groups) > 1 else groups
    total, out = 0, []
    per = max(2, -(-limit // max(1, len(groups))))
    for g in groups:
        nodes = g["nodes"][:min(per, limit - total)]
        if nodes:
            out.append({"heading": g["heading"], "nodes": nodes})
            total += len(nodes)
    for g, o in zip(groups, out):                # room left by a short group goes to the groups that hold more
        extra = g["nodes"][len(o["nodes"]):limit - total + len(o["nodes"])] if total < limit else []
        o["nodes"] += extra
        total += len(extra)
    return out


PROOF_CHARS = 170


def _publication(title):
    """A short name for where a quote comes from: the part of a source title that names the publication."""
    t = " ".join(str(title or "").replace(chr(0x2014), ", ").replace(" ,", ",").split())      # a source's own dash is not printed
    parts = [p.strip() for p in re.split(r"\s[-|\u2013]\s|:\s", t) if p.strip()]
    named = [p for p in parts if len(p) <= 38 and not re.search(r"\.(edu|org|com|net|gov)$", p)]
    if len(parts) > 1 and named:
        return min(named, key=len) if len(parts[0]) > 38 else named[0]
    return t if len(t) <= 44 else t[:44].rsplit(" ", 1)[0]


def proof(evidence):
    """The line of evidence shown under an idea: a checked quote from its passages, word for word, with where it is
    from. 20 Nov, beside a fresh Gemini Notebook infographic: Gemini's canvas carries statistics and the local one
    carried none, because an infographic here may state no figure of its own. A figure a source states can be shown
    in that source's words, so a quote that carries one is preferred. A long quote gives its first whole sentence
    (still the source's words); a quote that cannot be shown whole and short is left out, never trimmed mid-sentence."""
    best = None
    for ev in evidence or []:
        q = " ".join(str(ev.get("quote") or "").split()).strip("\"\u201c\u201d ")
        if len(q) > PROOF_CHARS:
            m = re.search(r"(?<![A-Z])(?<!\b[A-Za-z])[.!?](?=\s+[A-Z])", q)
            q = q[:m.start() + 1] if m and 40 <= m.start() + 1 <= PROOF_CHARS else ""
        if len(q) < 30 or "|" in q:
            continue
        from . import evidencequality as _eq
        # speech is shown as a clean, complete sentence or not at all; so is anything from a recording
        if _eq.filler_hits(q) or (_eq.spoken_title(ev.get("title")) and not _eq.is_clean_sentence(q)):
            q = _eq.clean_spoken(q)
            if not q:
                continue
        cand = {"quote": q, "source": _publication(ev.get("title")), "pointer": ev.get("pointer") or ""}
        if re.search(r"\d", q):
            return cand
        best = best or cand
    return best


def _one_sentence(text):
    """The first sentence of a detail, whole. An abbreviation's full stop ("U.S.") does not end it."""
    t = " ".join(str(text or "").split()).split("; ")[0]
    m = re.search(r"(?<![A-Z])(?<!\b[A-Za-z])[.!?]\s+(?=[A-Z])", t)
    cut = t[:m.start() + 1] if m and m.start() >= 24 else t
    return (cut.rstrip(".") + ".") if cut else ""


def _has_figure(text):
    from . import studiokit
    return bool([n for n in studiokit.numbers(text) if not re.fullmatch(r"(19|20)\d\d", n)])


def _echo(subject, node):
    """True when a "subject" only repeats the node's own words: that is the idea again, not something to draw."""
    words = lambda s: {w for w in "".join(c.lower() if c.isalnum() else " " for c in str(s)).split() if len(w) > 3}
    sw, nw = words(subject), words(node["label"] + " " + node["caption"])
    return not sw or len(sw & nw) / len(sw) >= 0.6


def subjects(groups, goal, ledger=None):
    """What each node's illustration shows: one concrete scene a person can picture, with no words in it (19 Nov: the
    first canvas got six near-identical abstract heads, because each "subject" was the idea's own sentence). One model
    call names a scene per idea; a scene that only repeats the idea is asked for once more, alone. A node the model
    still gives no scene for gets a plain one built from its label."""
    from . import providers
    flat = [n for g in groups for n in g["nodes"]]
    system = ("You are an art director briefing an illustrator. For each idea you name ONE physical scene to draw: who "
              "or what is in it, what they are doing, and where. Use things a camera could see: people, rooms, desks, "
              "books, laptops, buildings, doors, paper. Never restate the idea, never use the words 'AI', 'concept', "
              "'symbol' or 'represents', and put no writing in the scene. Every scene is different from the others. "
              "The people, the clothes and the place belong to the subject of the infographic. "
              "Example. Idea: Managers meet their teams late in the quarter. Scene: A manager and an employee sit across "
              "a desk with a wall calendar behind them, most of its days crossed out.")

    def ask(nodes):
        lines = "\n".join(f"{i}. {n['label']}: {n['caption']}" for i, n in nodes)
        msg = (f"Subject of the infographic: {goal}\n\nIdeas:\n{lines}\n\nFor each idea, by its number, describe the scene in "
               "three parts. who: the people or objects in the picture (for example 'a nurse and a patient', 'a row of "
               "empty desks'). doing: what they are physically doing ('compare a printed report with an open "
               "laptop'). where: the place ('at a table by a window'). Each part is three to ten words.")
        try:
            text, _, _ = providers.claude(config.SEATS["analysis"]["primary"], system, [{"role": "user", "content": msg}], ledger,
                                          max_tokens=2000, effort="medium", json_schema=SUBJECT_SCHEMA)
            out = {}
            for s in providers.parse_json(text).get("scenes") or []:
                if isinstance(s, dict) and all(str(s.get(k) or "").strip() for k in ("who", "doing", "where")):
                    out[int(s["n"])] = " ".join(f"{s['who']} {s['doing']} {s['where']}".split())[:260]
            return out
        except (ValueError, KeyError, TypeError, providers.ProviderError):
            return {}
    got = ask(list(enumerate(flat, 1)))
    again = [(i, n) for i, n in enumerate(flat, 1) if _echo(got.get(i, ""), n)]
    if again:
        got.update({i: s for i, s in ask(again).items() if not _echo(s, flat[i - 1])})
    for i, n in enumerate(flat, 1):
        s = got.get(i, "")
        # a plain scene in the subject's own setting, whatever the subject is (it named a university for every request)
        n["subject"] = s if not _echo(s, n) else (f"Two people at a table, one showing the other a sheet of paper, in a place that "
                                                  f"belongs to this subject: {' '.join(str(goal or '').split())[:110]}. They are talking about: {n['label']}")
    return groups


def illustrate(groups, check_stop=lambda: None, brand="nxt"):
    """An illustration for every node, in one style and the brand's palette. Raises ProviderError when the picture
    engine is not running: an infographic without its pictures is not this artifact."""
    from . import localmedia
    look = style(brand)
    for g in groups:
        for n in g["nodes"]:
            check_stop()
            png, engine = localmedia.image(f"{n['subject'].rstrip('.')}. {look}", "768x768", negative=NEGATIVE)
            n["image"] = "data:image/png;base64," + base64.b64encode(png).decode("ascii")
            n["engine"] = engine
    return groups


def _proof_html(n):
    p = n.get("proof")
    if not p:
        return ""
    return (f'<blockquote class="proof"><q>{html.escape(p["quote"])}</q>'
            + (f'<cite>{html.escape(p["source"])}</cite>' if p.get("source") else "") + "</blockquote>")


def page(spec, brand, orientation="landscape"):
    """The canvas as one #stage document. spec: {title, subtitle, groups: [{heading, nodes: [{label, caption, image,
    proof}]}], takeaway, sources}.

    A poster with a typographic order a reader takes in from across a room: the headline, the point of the page on a
    band in the accent colour, the lead idea across the full width, then the other ideas, each with its numeral, some
    led by the quotation that carries them. All of it is text laid out by code in the brand's own faces and colours."""
    e = html.escape
    kit = deck.brand_kit(brand)
    groups = spec.get("groups") or []
    nodes = [dict(n, group=g.get("heading") or "") for g in groups for n in g["nodes"]]
    n = len(nodes) or 1
    caps = _caps(kit)
    w, h = canvas(orientation, n, caps)
    wide = orientation == "landscape"
    rest = max(0, n - 1)
    cols = (3 if rest > 4 else 2) if wide else (2 if rest > 2 else 1)
    rows = -(-rest // cols) if rest else 0
    fills = ("panel", "deep", "tint", "rail", "panel", "tint", "deep")
    cards = ""
    for i, nd in enumerate(nodes):
        pr = nd.get("proof")
        num = f'<p class="num">{i + 1:02d}</p>'
        pic = f'<div class="pic"><img src="{nd["image"]}" alt="{e(nd.get("subject") or "")}"></div>' if nd.get("image") else ""
        tag = f'<p class="tag">{e(nd["group"])}</p>' if nd.get("group") and len(groups) > 1 else ""
        quote = (f'<q>{e(pr["quote"])}</q>' + (f'<cite>{e(pr["source"])}</cite>' if pr.get("source") else "")) if pr else ""
        if i == 0:                               # the lead idea, across the full width
            # owner, 25 Nov: an illustration always accompanies an idea. The lead idea showed its quotation in place
            # of its picture; it now shows the picture first and the quotation beside the text.
            cards += (f'<div class="card hero f-accent{" haspic" if pic else ""}{" hasq" if quote else ""}">{pic}'
                      f'<div class="say">{num}<div>{tag}<h2>{e(nd["label"])}</h2><p class="cap">{e(nd["caption"])}</p></div></div>'
                      + (f'<blockquote class="proof">{quote}</blockquote>' if quote else "") + "</div>")
            continue
        fill = fills[(i - 1 + ((i - 1) // cols if cols % 2 == 0 else 0)) % len(fills)]
        # no empty cell: the last idea takes what is left of its row
        left = cols - ((rest - 1) % cols + 1) if i == n - 1 else 0
        span = f' style="grid-column:span {left + 1}"' if left else ""
        # a landscape card holds its picture, its words and a quotation only when there is room for all three: a brand
        # that sets titles in capitals runs longer, and its caption was covered by the quotation (preview, 25 Nov)
        shown = bool(quote) and (not wide or rows <= (1 if caps else 2))
        if quote and i % 3 == 0:                 # led by its quotation: the source's words are the largest thing on the card
            cards += (f'<div class="card qled f-{fill}"{span}><div class="top">{num}{pic}</div>'
                      f'<blockquote class="big">{quote}</blockquote><h2>{e(nd["label"])}</h2></div>')
        else:
            cards += (f'<div class="card f-{fill}{"" if shown else " plain"}"{span}><div class="top">{num}{pic}</div><div>{tag}<h2>{e(nd["label"])}</h2></div>'
                      f'<p class="cap">{e(nd["caption"])}</p>' + (f'<blockquote class="proof">{quote}</blockquote>' if shown else "") + "</div>")
    # the publications by name, each once (a cut-off article title was printed here)
    srcs = list(dict.fromkeys(_publication(s) for s in spec.get("sources") or [] if s))[:5]
    src = "".join(f"<li>{e(s)}</li>" for s in srcs)
    mark = f'<span class="mm-mark">{kit["mark"]}</span>' if kit.get("mark") else f'<span>{e(kit["name"])}</span>'
    same = "".join(c for c in str(spec.get("subtitle") or "").lower() if c.isalnum()) == "".join(c for c in str(spec.get("title") or "").lower() if c.isalnum())
    sub = f'<p class="sub">{e(spec["subtitle"])}</p>' if spec.get("subtitle") and not same else ""
    kick = next((g.get("heading") for g in groups if g.get("heading")), "") if len(groups) == 1 else ""
    kicker = f'<p class="kicker">{e(kick)}</p>' if kick and kick.lower() not in ("diagram", "infographic", "themes", "overview") else ""
    take = str(spec.get("takeaway") or "").strip()
    tpx = (34 if len(take) <= 110 else 28) if not wide else (27 if len(take) <= 110 else 23)
    point = f'<div class="point" style="--point:{tpx}px"><p class="k">The point</p><p class="say">{e(take)}</p></div>' if take else ""
    lead = (f'<div class="lead" style="--h1:{_headline_px(spec.get("title"), wide)}px"><div>{kicker}<h1>{e(spec.get("title") or "")}</h1>{sub}</div>'
            f'<div class="foot">{f"<ul>{src}</ul>" if src else "<span></span>"}{mark}</div></div>')
    grid = (f'<div class="grid" style="grid-template-columns:repeat({cols},minmax(0,1fr));'
            f'grid-template-rows:{"auto" if rows else "minmax(0,1fr)"}{f" repeat({rows},minmax(0,1fr))" if rows else ""}">{cards}</div>')
    inner = f'<div class="side">{lead}{point}</div>{grid}' if wide else f"{lead}{point}{grid}"
    return (f'<!doctype html><html lang="en" data-brand="{e(kit["brand"])}"><head><meta charset="utf-8">'
            f'<title>{e(spec.get("title") or "Infographic")}</title><style>{kit["fonts_css"]}\n{kit["css"]}\n{_CSS}</style></head>'
            f'<body><div id="stage" class="{e(orientation)} n{n}{" caps" if caps else ""}" style="width:{w}px;height:{h}px">{inner}</div></body></html>')


def draw(spec, brand, orientation="landscape"):
    """(png bytes at twice the layout size, the page as drawn for the PowerPoint exporter) or raises RuntimeError."""
    n = sum(len(g["nodes"]) for g in spec.get("groups") or []) or 1
    w, h = canvas(orientation, n, _caps(deck.brand_kit(brand)))
    doc = page(spec, brand, orientation)
    try:
        r = httpx.post(config.RENDER_URL.rstrip("/") + "/pages", timeout=240,
                       json={"html": doc, "mode": "slides", "selector": "#stage", "width": w, "height": h,
                             "out_width": w * 2 if w <= 1200 else 2560, "want": ["png", "dom"], "max_pages": 1})
    except httpx.HTTPError as ex:
        raise RuntimeError(f"the renderer could not be reached ({type(ex).__name__})")
    if r.status_code != 200:
        raise RuntimeError(f"the renderer could not draw the infographic (HTTP {r.status_code}: {r.text[:160]})")
    d = r.json()
    if not d.get("pages"):
        raise RuntimeError("the renderer returned no picture of the infographic")
    return base64.b64decode(d["pages"][0]), d.get("dom") or doc


def record(groups):
    """The nodes without their picture bytes, for the saved data."""
    return json.loads(json.dumps([{"heading": g["heading"], "nodes": [{k: v for k, v in n.items() if k != "image"} for n in g["nodes"]]} for g in groups]))
