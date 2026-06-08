#!/usr/bin/env python
"""Batches B+C of the missing gold exemplars (NU), authored through gold_kit in the
user's design language. B (structured): meta-themes, mindmap, heuristic-ux, research-plan.
C (editorial/prose): brief, explainer, report, approaches, brief-dialog, presentation.
Manifest-grounded; representative content per the Representative-Content Firewall."""
import pathlib
import gold_kit as K

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"

COL = """
.cols{display:grid;column-gap:46px}
.num{font-family:'Lora',serif;font-size:46px;color:var(--ink);line-height:1}
h2{font-family:'Lora',serif;font-weight:600;font-size:23px;line-height:1.2;margin:8px 0 10px;min-height:54px}
.mech{font-size:15.5px;line-height:1.44;margin-bottom:12px}
.lab{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:1.8px;color:var(--grey);margin-bottom:5px;display:block}
.q{font-size:15.5px;line-height:1.4;color:var(--ink)}
.q .src{display:block;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:1px;color:var(--teal);margin-top:7px}
.evid{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:1px;color:var(--ink);border-left:4px solid var(--red);padding:6px 0 6px 14px;line-height:1.6;margin-bottom:14px}
"""

def col_card(num, name, mech, q=None, src=None, tag=None):
    h = f'<div><div class="num">{num}</div><h2>{name}</h2>'
    if tag:
        h += f'<span class="lab" style="color:var(--red)">{tag}</span>'
    h += f'<p class="mech">{mech}</p>'
    if q:
        h += f'<div class="q">&ldquo;{q}&rdquo;<span class="src">SOURCE: {src}</span></div>'
    return h + '</div>'

# ---------------- META-THEMES
def meta_themes():
    css = COL + ".cols{grid-template-columns:repeat(3,1fr)}.pp{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:1.8px;color:var(--red);margin-bottom:12px;display:block}"
    cards = [
        ("01", "Scarce expert guidance", "A single expert serving a large cohort recurs as the root constraint, whether the expert is a co-op advisor, an academic dean, or a support lead.", "RECURS ACROSS 4 ENGAGEMENTS"),
        ("02", "Volume as a coping mechanism", "When a system cannot help people target, they substitute raw volume, and the organization loses its signal of fit in the noise.", "RECURS ACROSS 3 ENGAGEMENTS"),
        ("03", "Help that cannot be reached", "Support exists but timing, format, or access put it out of reach, so the official path is routed around for an unofficial one.", "PLATFORM PATTERN, 5 ENGAGEMENTS"),
    ]
    body = '<div class="cols">' + "".join(
        f'<div><div class="num">{n}</div><span class="pp">{t}</span><h2 style="min-height:auto">{nm}</h2><p class="mech">{m}</p></div>'
        for n, nm, m, t in cards) + '</div>'
    take = ("Three patterns recur across the portfolio. <b>Help that cannot be reached is the platform pattern</b>, "
            "present in five of five engagements, and the one the scaffolding strategy is built to break.")
    return K.page("Portfolio Patterns", "PORTFOLIO PATTERNS &nbsp;·&nbsp; CROSS-ENGAGEMENT",
                  "Three themes that recur across the engagement portfolio", body, take, css)

# ---------------- MINDMAP
def mindmap():
    css = """
.hub{margin:6px 30% 0;border-top:3px solid var(--teal);padding-top:13px;text-align:center}
.hub .h{font-family:'Lora',serif;font-weight:600;font-size:24px;color:var(--ink)}
.hub .s{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:1.8px;color:var(--grey);margin-top:5px;display:block}
.bus{height:1px;background:var(--hair);margin:24px 10% 0}
.drop{display:grid;grid-template-columns:repeat(4,1fr);height:18px}
.drop i{justify-self:center;width:6px;height:18px;background:var(--hair)}
.branches{display:grid;grid-template-columns:repeat(4,1fr);column-gap:40px}
.br{border-top:3px solid var(--red);padding-top:12px}
.br .bn{font-family:'Lora',serif;font-weight:600;font-size:20px;color:var(--ink);margin-bottom:12px}
.leaf{font-size:14.5px;line-height:1.4;color:var(--ink);padding-left:14px;position:relative;margin-bottom:9px}
.leaf::before{content:"";position:absolute;left:0;top:9px;width:7px;height:1px;background:var(--red)}
"""
    branches = [
        ("Resume", ["No reachable first-draft help", "Format learned from peers", "Advisor weeks away"]),
        ("Search", ["No major-fit filter", "Bulk applications", "Rejections without pattern"]),
        ("Interview", ["Live-only prep", "Conflicts with class", "First interview, no rehearsal"]),
        ("Match", ["Rules surface in-event", "Ranking made blind", "First-gen hit hardest"]),
    ]
    body = ('<div class="hub"><span class="h">The first-year co-op search</span>'
            '<span class="s">CORPUS: r/NEU + NU STUDENT SURVEY 2025</span></div>'
            '<div class="bus"></div><div class="drop"><i></i><i></i><i></i><i></i></div><div class="branches">'
            + "".join(f'<div class="br"><div class="bn">{bn}</div>' + "".join(f'<div class="leaf">{lf}</div>' for lf in leaves) + '</div>'
                      for bn, leaves in branches) + '</div>')
    take = ("Every branch traces to one root: <b>guidance a 1-to-200 model cannot deliver</b> at the moment "
            "it is needed. Click any node in the live map to open the evidence behind it.")
    return K.page("Mind Map", "MIND MAP &nbsp;·&nbsp; CORPUS THEMES",
                  "The first-year search, branched to where it breaks", body, take, css)

# ---------------- HEURISTIC UX
def heuristic_ux():
    css = """
.rows{margin-top:6px}
.r{display:grid;grid-template-columns:1.6fr 0.5fr 2fr;column-gap:34px;padding:15px 0;border-top:1px solid var(--hair);align-items:start}
.r:first-child{border-top:0}
.hn{font-family:'Lora',serif;font-weight:600;font-size:20px;color:var(--ink)}
.sev{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:1.5px}
.sev.crit{color:var(--red)} .sev.high{color:var(--ink)} .sev.med{color:var(--grey)}
.fnd{font-size:15.5px;line-height:1.42;color:var(--ink)}
.sys{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:1px;color:var(--grey);display:block;margin-top:5px}
"""
    rows = [
        ("Visibility of system status", "crit", "NUworks gives no signal of why a role fits or why an application was rejected.", "NUWORKS"),
        ("Match to the real world", "high", "Matching rules use language and logic students only decode inside the event itself.", "MATCHING PORTAL"),
        ("Flexibility and efficiency", "high", "No major-fit filter, so every student does the same exhaustive manual scan.", "NUWORKS"),
        ("Help and documentation", "crit", "The rules that decide the match are documented nowhere students can reach in time.", "MATCHING PORTAL"),
        ("Error prevention", "med", "Bulk applying is the only hedge the interface offers against a low response rate.", "NUWORKS"),
    ]
    body = '<div class="rows">' + "".join(
        f'<div class="r"><div class="hn">{h}<span class="sys">{sysn}</span></div>'
        f'<div><span class="sev {s}">{ {"crit":"CRITICAL","high":"HIGH","med":"MEDIUM"}[s] }</span></div>'
        f'<div class="fnd">{f}</div></div>' for h, s, f, sysn in rows) + '</div>'
    take = ("The interface violations cluster on one heuristic: <b>visibility</b>. The system never tells a "
            "student where they stand or why, so they fill the silence with volume.")
    return K.page("Heuristic UX Review", "HEURISTIC REVIEW &nbsp;·&nbsp; NIELSEN",
                  "The co-op tools fail most on telling students where they stand", body, take, css)

# ---------------- RESEARCH PLAN
def research_plan():
    css = """
.meta{display:flex;gap:54px;margin:0 0 26px;font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:1px;color:var(--grey)}
.meta b{color:var(--teal);font-weight:600}
.sq{display:grid;grid-template-columns:40px 1fr 1.3fr;column-gap:28px;padding:14px 0;border-top:1px solid var(--hair);align-items:start}
.sq:first-of-type{border-top:0}
.qn{font-family:'Lora',serif;font-size:30px;color:var(--ink);line-height:1}
.qt{font-family:'Lora',serif;font-weight:600;font-size:19px;line-height:1.3;color:var(--ink)}
.src{font-size:14.5px;line-height:1.42;color:var(--ink)}
.src .l{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:1.5px;color:var(--grey);display:block;margin-bottom:4px}
"""
    qs = [
        ("Where does the first-year search actually break?", "r/NEU deep-read, NU Student Survey 2025"),
        ("How do leading peers prepare students differently?", "Waterloo, Cincinnati, Drexel program docs"),
        ("Which systems already hold the data a fix would need?", "NU IT systems inventory, CLR Project"),
        ("What has each prior readiness intervention changed?", "Higher Ed Dive, named program evaluations"),
    ]
    body = ('<div class="meta"><span>BUDGET CAP <b>$5</b></span><span>MAX ITERATIONS <b>6</b></span>'
            '<span>REFLECTION <b>COVERED / GAP / NEW-QUESTION</b></span><span>HUMAN GATE <b>EDIT BEFORE COLLECTION</b></span></div>')
    for i, (qt, src) in enumerate(qs, 1):
        body += (f'<div class="sq"><div class="qn">{i}</div><div class="qt">{qt}</div>'
                 f'<div class="src"><span class="l">SOURCE STRATEGY</span>{src}</div></div>')
    take = ("The plan is editable before a single source is pulled. <b>The human approves the questions, "
            "the sources, and the budget</b>, then the reflect-act loop runs to the cap.")
    return K.page("Deep Research Plan", "DEEP RESEARCH &nbsp;·&nbsp; PLAN-EDIT GATE",
                  "Four sub-questions, approved before collection begins", body, take, css)

# ---------------- BRIEF (one-pager)
def brief():
    css = """
.hero{border-left:5px solid var(--red);padding:8px 0 8px 22px;margin:0 0 30px}
.hero .h{font-family:'Lora',serif;font-weight:600;font-size:30px;line-height:1.3;color:var(--ink)}
.find{display:grid;grid-template-columns:repeat(3,1fr);column-gap:46px;margin-bottom:30px}
.find .fn{font-family:'Lora',serif;font-weight:600;font-size:21px;color:var(--ink);margin-bottom:8px}
.find p{font-size:15.5px;line-height:1.45}
.foot{font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:1px;color:var(--teal);border-top:1px solid var(--hair);padding-top:14px}
"""
    body = ('<div class="hero"><div class="h">First-years are not short on effort. They are short on guidance, '
            'and they improvise around the gap.</div></div>'
            '<div class="find">'
            '<div><div class="fn">The wall is the resume</div><p>The first document of the search is written with no reachable expert reader, weeks before an advisor opens.</p></div>'
            '<div><div class="fn">Volume replaces fit</div><p>With no major-fit filter, students apply in bulk and the office loses its signal of who fits what.</p></div>'
            '<div><div class="fn">The fix already exists</div><p>Every system a scaffolded search needs is already live; the missing piece is one integration, not new software.</p></div>'
            '</div><div class="foot">COPY AS PROMPT &nbsp;·&nbsp; Refine this brief in HiC with #brief #refine</div>')
    take = ("Read in ninety seconds: <b>scaffold the routine so the human handles the exceptional</b>. "
            "The effort is already there; the guidance is what the strategy supplies.")
    return K.page("Stakeholder Brief", "STAKEHOLDER BRIEF &nbsp;·&nbsp; FIRST-YEAR CO-OP",
                  "Why first-year co-op is a guidance problem, not an effort problem", body, take, css)

# ---------------- EXPLAINER
def explainer():
    css = """
.flow{display:flex;align-items:center;gap:0;margin:6px 0 30px}
.step{flex:1;border-top:3px solid var(--teal);padding:12px 16px 0;font-size:15px;line-height:1.35}
.step .n{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:1.5px;color:var(--teal);display:block;margin-bottom:6px}
.arr{color:var(--grey);font-size:22px;padding:0 6px}
.got{border-left:5px solid var(--red);padding:6px 0 6px 18px;margin-top:8px}
.got .gl{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:1.5px;color:var(--red);display:block;margin-bottom:5px}
.got p{font-size:15.5px;line-height:1.44}
"""
    steps = [("STEP 1", "Students rank employers in order of preference."),
             ("STEP 2", "Employers rank the students who applied."),
             ("STEP 3", "An algorithm pairs the two ranked lists into matches."),
             ("STEP 4", "Unmatched students enter a second, faster round.")]
    flow = '<div class="flow">'
    for i, (n, t) in enumerate(steps):
        flow += f'<div class="step"><span class="n">{n}</span>{t}</div>'
        if i < len(steps) - 1:
            flow += '<span class="arr">&rarr;</span>'
    flow += '</div>'
    body = (flow + '<div class="got"><span class="gl">THE GOTCHA</span>'
            '<p>None of these rules are published where a first-year can find them before they rank. '
            'Most reconstruct the logic from upperclassmen in the middle of the decision, which is exactly '
            'where the search is won or lost.</p></div>')
    take = ("Matching is a stable-pairing algorithm, not a lottery. <b>The only thing hidden is the rulebook</b>, "
            "and publishing it before the event is the cheapest fix in the search.")
    return K.page("Concept Explainer", "EXPLAINER &nbsp;·&nbsp; HOW MATCHING WORKS",
                  "How co-op matching actually works, and the one thing students never see", body, take, css)

# ---------------- REPORT (long-form structure)
def report():
    css = """
.panels{display:grid;grid-template-columns:repeat(4,1fr);column-gap:32px;margin-top:6px}
.pn{border-top:3px solid var(--ink);padding-top:13px}
.pn:nth-child(1){border-top-color:var(--red)}
.pn:nth-child(4){border-top-color:var(--teal)}
.pn .t{font-family:'Lora',serif;font-weight:600;font-size:21px;color:var(--ink);margin-bottom:6px}
.pn .s{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:1.5px;color:var(--grey);display:block;margin-bottom:12px}
.pn li{font-size:14.5px;line-height:1.4;color:var(--ink);list-style:none;padding-left:14px;position:relative;margin-bottom:9px}
.pn li::before{content:"";position:absolute;left:0;top:9px;width:7px;height:1px;background:var(--grey)}
"""
    panels = [
        ("The challenge", "01 DIAGNOSIS", ["Guidance does not scale", "Effort substitutes for aim", "Help cannot be reached", "Rules revealed too late"]),
        ("What the corpus shows", "02 FINDINGS", ["Four behaviors the search breaks", "All trace to one constraint", "Peers solve it with curriculum", "Systems already hold the data"]),
        ("What to do", "03 RECOMMENDATIONS", ["Scaffold the resume", "Match by fit", "Practice on demand", "Teach the rules first"]),
        ("How it sequences", "04 NEXT STEPS", ["Now: resume + rules", "Next: fit + practice", "Later: reclaim the advisor", "Measured against today"]),
    ]
    body = '<div class="panels">' + "".join(
        f'<div class="pn"><div class="t">{t}</div><span class="s">{s}</span><ul>' + "".join(f'<li>{x}</li>' for x in items) + '</ul></div>'
        for t, s, items in panels) + '</div>'
    take = ("The full report navigates, it does not march: <b>diagnosis, findings, recommendations, sequence</b>, "
            "each section anchored to verbatim student evidence and named peer programs.")
    return K.page("Strategic Report", "STRATEGIC REPORT &nbsp;·&nbsp; STATE OF THE SEARCH",
                  "The first-year co-op search, end to end", body, take, css)

# ---------------- APPROACHES
def approaches():
    css = COL + """
.cols{grid-template-columns:repeat(3,1fr);row-gap:26px}
.row-lab{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;letter-spacing:2.5px;margin:0 0 14px;display:block}
.row-lab.con{color:var(--grey)} .row-lab.bet{color:var(--teal)}
.ac{border-top:3px solid var(--ink);padding-top:12px}
.ac.b{border-top-color:var(--teal)}
.ac h2{min-height:auto;font-size:21px;margin:0 0 8px}
.pro{font-size:14px;line-height:1.4;color:var(--ink);margin-bottom:5px}
.when{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:1px;color:var(--grey);margin-top:9px}
"""
    con = [("Cohort pilot", "Run the scaffold with one first-year cohort, then scale.", "When you need proof before budget."),
           ("Embed in the course", "Move readiness into a required first-year experiential course.", "When curriculum change is on the table."),
           ("Advisor-led rollout", "Train advisors to deploy the tool in their existing meetings.", "When trust must come from a person.")]
    bet = [("Student-built", "Hand the scaffold to students as an open tool they shape.", "When adoption matters more than control."),
           ("Employer-funded", "Partners sponsor readiness in exchange for fitted candidates.", "When the budget has to come from outside."),
           ("Reverse the default", "Make co-op prep opt-out, not opt-in, from week one.", "When the cohort, not the eager few, is the goal.")]
    body = '<div class="row-lab con">DEFENSIBLE CONSENSUS</div><div class="cols">'
    body += "".join(f'<div class="ac"><h2>{n}</h2><div class="pro">{p}</div><div class="when">PICK WHEN, {w}</div></div>' for n, p, w in con)
    body += '</div><div class="row-lab bet" style="margin-top:24px">NON-OBVIOUS BETS</div><div class="cols">'
    body += "".join(f'<div class="ac b"><h2>{n}</h2><div class="pro">{p}</div><div class="when">PICK WHEN, {w}</div></div>' for n, p, w in bet)
    body += '</div>'
    take = ("Six ways to roll out the scaffold, three safe and three contrarian. <b>The reverse-default bet "
            "is the highest-leverage</b>: it reaches the whole cohort, not the students who would have found help anyway.")
    return K.page("Approach Picker", "APPROACHES &nbsp;·&nbsp; HOW TO ROLL OUT THE SCAFFOLD",
                  "Six ways to launch the scaffold, three conventional and three not", body, take, css)

# ---------------- BRIEF-DIALOG
def brief_dialog():
    css = """
.turn{display:grid;grid-template-columns:200px 1fr;column-gap:30px;padding:15px 0;border-top:1px solid var(--hair);align-items:start}
.turn:first-of-type{border-top:0}
.who{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;letter-spacing:1.5px}
.who.p{color:var(--red)} .who.s{color:var(--teal)}
.who span{display:block;font-family:'Archivo',sans-serif;font-weight:400;font-size:12px;letter-spacing:0;color:var(--grey);margin-top:4px;text-transform:none}
.say{font-family:'Lora',serif;font-size:18px;line-height:1.42;color:var(--ink)}
.say .src{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:1px;color:var(--teal)}
"""
    turns = [
        ("p", "SKEPTICAL PARTNER", "We have funded readiness tools before and engagement died in a semester. Why is another tool different?"),
        ("s", "CURIOUS STRATEGIST", "Because this is not a tool students opt into. It meets them at the blank page, before the advisor queue, where they are already stuck."),
        ("p", "SKEPTICAL PARTNER", "Students still ignored the last thing we embedded. What makes the wall the right place?"),
        ("s", "CURIOUS STRATEGIST", "The corpus does: a student told us plainly, <span class=\"src\">&ldquo;I have no idea how to write a resume an employer would look at.&rdquo;</span> The demand is already there."),
        ("p", "SKEPTICAL PARTNER", "Fair. If it lives at the moment of need and not in a portal nobody opens, that is a different bet. I will grant that."),
    ]
    body = "".join(f'<div class="turn"><div class="who {c}">{w}</div><div class="say">{t}</div></div>' for c, w, t in turns)
    take = ("The Partner concedes one point: <b>placement at the moment of need is the real difference</b>. "
            "Final stance, qualified support, contingent on the scaffold living at the wall, not in a portal.")
    return K.page("Brief Dialogue", "BRIEF DIALOGUE &nbsp;·&nbsp; PRESSURE-TEST",
                  "Two voices pressure-test the readiness thesis", body, take, css)

# ---------------- PRESENTATION (deck cover + arc)
def presentation():
    css = """
.arc{display:grid;grid-template-columns:repeat(4,1fr);column-gap:26px;row-gap:22px;margin-top:8px}
.sl{border-top:3px solid var(--ink);padding-top:12px}
.sl:nth-child(1),.sl:nth-child(5){border-top-color:var(--red)}
.sl:nth-child(4),.sl:nth-child(8){border-top-color:var(--teal)}
.sl .n{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:1.5px;color:var(--grey)}
.sl .t{font-family:'Lora',serif;font-weight:600;font-size:18px;line-height:1.25;color:var(--ink);margin-top:6px}
"""
    arc = [
        ("01 OPEN", "First-years are short on guidance, not effort"),
        ("02 THEMES", "Four behaviors the search breaks"),
        ("03 PERSONAS", "Who the search breaks, in order"),
        ("04 JOURNEY", "Where it breaks across eleven weeks"),
        ("05 GAPS", "Four gaps between the search they get and need"),
        ("06 STRATEGY", "One kernel, five coherent actions"),
        ("07 ROADMAP", "Now, next, and later"),
        ("08 CLOSE", "Scaffold the routine; reclaim the human"),
    ]
    body = '<div class="arc">' + "".join(f'<div class="sl"><span class="n">{n}</span><div class="t">{t}</div></div>' for n, t in arc) + '</div>'
    take = ("The deck is one argument in eight moves: <b>diagnose the guidance gap, then close it</b>. "
            "Each slide carries a finding title, so the story reads from the titles alone.")
    return K.page("Strategic Presentation", "PRESENTATION &nbsp;·&nbsp; FIRST-YEAR CO-OP",
                  "The first-year co-op strategy, in eight moves", body, take, css)


BUILD = {
    "meta-themes-nu.html": meta_themes, "mindmap-nu.html": mindmap,
    "heuristic-ux-nu.html": heuristic_ux, "research-plan-nu.html": research_plan,
    "brief-nu.html": brief, "explainer-nu.html": explainer, "report-nu.html": report,
    "approaches-nu.html": approaches, "brief-dialog-nu.html": brief_dialog,
    "presentation-nu.html": presentation,
}
for fname, fn in BUILD.items():
    (GOLD / fname).write_text(fn(), encoding="utf-8")
    print(f"  wrote {fname}")
print("[done] batches B+C gold exemplars (NU)")
