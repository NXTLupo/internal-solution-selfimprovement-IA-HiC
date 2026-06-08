#!/usr/bin/env python
"""Batch A of the missing gold exemplars (NU), authored through gold_kit to match the
user's hand-authored design language exactly. Manifest-grounded (named systems, named
peers, named stakeholders the corpus actually holds). Structured/diagram deliverables:
org, audit (systems inventory), recommendations (consensus + bets), case-study (named peers)."""
import pathlib
import gold_kit as K

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"

# shared column/typography CSS in the gold idiom (Lora numerals, IBM Plex labels)
COLS_CSS = """
.cols{display:grid;column-gap:46px}
.num{font-family:'Lora',serif;font-size:46px;color:var(--ink);line-height:1}
h2{font-family:'Lora',serif;font-weight:600;font-size:24px;line-height:1.2;margin:8px 0 12px;min-height:58px}
.mech{font-size:16px;line-height:1.45;margin-bottom:12px}
.lab{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;letter-spacing:2px;color:var(--grey);margin-bottom:5px}
.evid{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:1px;color:var(--ink);border-left:4px solid var(--red);padding:6px 0 6px 14px;line-height:1.6;margin-bottom:14px}
.q{font-size:17px;line-height:1.42;color:var(--ink)}
.q .src{display:block;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:1px;color:var(--teal);margin-top:8px}
"""

# ---------------------------------------------------------------- ORG
def org():
    css = COLS_CSS + """
.org{display:grid;grid-template-columns:repeat(3,1fr);column-gap:46px;margin-top:6px}
.l1{border-top:3px solid var(--teal);padding-top:14px;margin:0 33% 0 33%;text-align:center}
.bus{height:1px;background:var(--hair);margin:26px 16% 0}
.drop{display:grid;grid-template-columns:repeat(3,1fr);height:18px}
.drop i{justify-self:center;width:6px;height:18px;background:var(--hair)}
.node{border-top:3px solid var(--ink);padding:13px 0 0;min-height:150px}
.node.lead{border-top-color:var(--red)}
.role{font-family:'Lora',serif;font-weight:600;font-size:23px;line-height:1.1;color:var(--ink)}
.who{display:block;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:2px;color:var(--red);margin:7px 0 9px}
.remit{display:block;font-size:15px;line-height:1.42;color:var(--ink)}
"""
    body = """    <div style="margin:0 33%;text-align:center"><div class="node lead" style="border-top:3px solid var(--teal);text-align:left">
      <div class="role">Co-op &amp; Experiential Learning</div><span class="who">PROGRAM LEADERSHIP</span>
      <span class="remit">Owns the first-year co-op outcome end to end.</span></div></div>
    <div class="bus"></div><div class="drop"><i></i><i></i><i></i></div>
    <div class="org">
      <div class="node lead"><div class="role">Co-op Advising</div><span class="who">LIZ</span><span class="remit">Leads the advisor team that guides students through search and matching. The 1-to-200 layer the strategy reclaims.</span></div>
      <div class="node lead"><div class="role">Career Readiness</div><span class="who">JEN</span><span class="remit">Owns the readiness tooling and the resume and interview prep path the scaffolding scales.</span></div>
      <div class="node"><div class="role">Employer Engagement</div><span class="who">PARTNERSHIPS</span><span class="remit">Cultivates the employer roles students match into, and the demand the search depends on.</span></div>
      <div class="bus"></div><div class="bus"></div><div class="bus"></div>
      <div class="node"><div class="role">Co-op advisors</div><span class="who">DELIVERY</span><span class="remit">One advisor to a large cohort; where scarcity bites and reclaimed time must land.</span></div>
      <div class="node"><div class="role">Readiness specialists</div><span class="who">CAREER CENTER</span><span class="remit">Run the workshops and the diagnostic the tool will make reachable on demand.</span></div>
      <div class="node"><div class="role">Registrar liaison</div><span class="who">REGISTRAR</span><span class="remit">Connects matching rules and records to the student path through the search.</span></div>
    </div>"""
    take = ("Two stakeholders own the fix: <b>Liz on advising, Jen on readiness</b>. The advisor "
            "layer beneath them is the shared dependency, and where reclaimed time has to land.")
    return K.page("Org Chart, Co-op Program", "ORG CHART &nbsp;·&nbsp; FIRST-YEAR CO-OP",
                  "Who owns the first-year co-op outcome, and where scarcity bites", body, take, css)

# ---------------------------------------------------------------- AUDIT
def audit():
    css = """
.tbl{display:grid;grid-template-columns:1.5fr 1fr 1fr 2fr;margin-top:8px}
.th{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:2px;color:var(--grey);padding:0 18px 12px;border-bottom:2px solid var(--ink)}
.cell{padding:15px 18px;border-bottom:1px solid var(--hair);font-size:16px;line-height:1.35}
.sys{font-family:'Lora',serif;font-weight:600;font-size:20px;color:var(--ink)}
.st{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:1.5px}
.st.active{color:var(--teal)} .st.legacy{color:var(--grey)} .st.gap{color:var(--red)}
.risk{color:var(--ink)} .risk b{color:var(--red);font-weight:600}
.cat{font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:1px;color:var(--grey)}
"""
    rows = [
        ("NUworks", "Job board / match", "active", "Lists every role, <b>filters none by major</b>, so volume replaces fit."),
        ("CLR", "Skills record", "active", "Holds verified skills that <b>never reach NUworks</b> to rank roles."),
        ("Readiness tool", "AI diagnostic", "active", "Names skill gaps but <b>offers no path</b> to close them in time."),
        ("Microsoft Copilot", "AI assist", "gap", "The scaffolding layer the strategy needs, <b>not yet wired in</b>."),
        ("Banner", "SIS of record", "active", "Major and course history the diagnostic could use, but does not."),
        ("Canvas", "LMS", "active", "Coursework and learning activity, unconnected to the search."),
    ]
    trs = ('<div class="th">SYSTEM</div><div class="th">CATEGORY</div><div class="th">STATUS</div><div class="th">RISK IF UNADDRESSED</div>')
    for sys, cat, st, risk in rows:
        trs += (f'<div class="cell sys">{sys}</div><div class="cell cat">{cat}</div>'
                f'<div class="cell"><span class="st {st}">{st.upper()}</span></div>'
                f'<div class="cell risk">{risk}</div>')
    body = f'<div class="tbl">{trs}</div>'
    take = ("Six systems, all live, one missing wire. <b>The consolidation opportunity is integration, "
            "not procurement</b>: the CLR-to-NUworks fit signal turns existing systems into reachable help.")
    return K.page("Tech Audit, Systems Inventory", "TECH AUDIT &nbsp;·&nbsp; CO-OP SYSTEMS",
                  "Every system the first-year search needs already runs; one wire is missing", body, take, css)

# ---------------------------------------------------------------- RECOMMENDATIONS
def recommendations():
    css = COLS_CSS + """
.cols{grid-template-columns:repeat(4,1fr)}
.band{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;letter-spacing:2.5px;color:var(--grey);margin:0 0 16px}
.bet{color:var(--teal)}
.tag{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:1.5px;color:var(--red);margin-bottom:12px}
"""
    cons = [
        ("01", "Scaffold the resume", "A guided first draft before the advisor queue, so no one starts the most important document blind.",
         "GAP-01 · US-1", "I have no idea how to write a resume that an employer would actually look at.", "REDDIT r/NEU"),
        ("02", "Match by fit", "Rank NUworks roles to a student's major and explain every rejection, so targeting replaces volume.",
         "GAP-02 · US-3", "I applied to 60 co-ops and heard back from 4.", "REDDIT r/NEU"),
        ("03", "Practice on demand", "Recorded and on-demand interview prep, so the first rehearsal is never the real interview.",
         "GAP-03 · US-4", "The interview prep workshop was at 9am on a Friday and I had class.", "REDDIT r/NEU"),
        ("04", "Teach the rules first", "A plain-language primer on ranking before matching opens, so the decisive call is informed.",
         "GAP-04 · US-2", "I didn't understand how the matching process worked until I was already in it.", "NU STUDENT SURVEY 2025"),
    ]
    body = '<div class="band">DEFENSIBLE CONSENSUS &mdash; FOUR MOVES THAT REINFORCE ONE GUIDING POLICY</div><div class="cols">'
    for num, name, mech, tag, q, src in cons:
        body += (f'<div><div class="num">{num}</div><h2>{name}</h2><span class="tag">{tag}</span>'
                 f'<p class="mech">{mech}</p><div class="q">&ldquo;{q}&rdquo;<span class="src">SOURCE: {src}</span></div></div>')
    body += '</div>'
    take = ("Four moves, one guiding policy: <b>scaffold the routine so the human handles the exceptional</b>. "
            "Each removes a wall; together they let the advisor stop being the ceiling.")
    return K.page("Recommendations, First-Year Co-op", "RECOMMENDATIONS &nbsp;·&nbsp; FIRST-YEAR CO-OP",
                  "Put humans in control of the first-year co-op search", body, take, css)

# ---------------------------------------------------------------- CASE STUDY
def case_study():
    css = COLS_CSS + """
.cols{grid-template-columns:repeat(3,1fr)}
.subj{font-family:'Lora',serif;font-weight:600;font-size:26px;color:var(--ink);margin-bottom:4px}
.where{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:1.5px;color:var(--red);margin-bottom:14px}
.row{margin-bottom:13px}
.rl{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:2px;color:var(--grey);display:block;margin-bottom:3px}
.rv{font-size:15.5px;line-height:1.42;color:var(--ink)}
.appl{border-left:4px solid var(--teal);padding:5px 0 5px 14px;font-size:15.5px;line-height:1.42;color:var(--teal)}
"""
    cases = [
        ("University of Waterloo", "THE STRUCTURED MODEL",
         "Runs the largest co-op program in the world with required, sequenced preparation before students enter the search.",
         "Students arrive at the search already prepared; readiness is a default of the program, not a scramble.",
         "Northeastern's closest rival proves the scaffolded model works at scale. The gap is preparation, not placement."),
        ("University of Cincinnati", "WHERE CO-OP BEGAN",
         "Originated cooperative education in 1906 and still threads structured employer partnership through the curriculum.",
         "A century of treating co-op as core curriculum, not an add-on students navigate alone.",
         "The oldest program institutionalizes what NU leaves to the individual: co-op as a taught sequence."),
        ("Drexel University", "THE INTEGRATED CURRICULUM",
         "Embeds co-op preparation into required coursework rather than offering it as optional, live-only sessions.",
         "Preparation reaches the whole cohort because it lives inside the degree, not beside it.",
         "Directly answers GAP-03: required, in-curriculum prep removes the timing and access problem."),
    ]
    body = '<div class="cols">'
    for subj, where, interv, outcome, appl in cases:
        body += (f'<div><div class="subj">{subj}</div><div class="where">{where}</div>'
                 f'<div class="row"><span class="rl">WHAT THEY DO</span><span class="rv">{interv}</span></div>'
                 f'<div class="row"><span class="rl">OUTCOME</span><span class="rv">{outcome}</span></div>'
                 f'<div class="appl">{appl}</div></div>')
    body += '</div>'
    take = ("The peers that lead co-op all do one thing NU does not: <b>treat preparation as required "
            "curriculum, not an optional scramble</b>. The model is proven; the gap is the first-year experience.")
    return K.page("Case Studies, Co-op Peers", "CASE STUDIES &nbsp;·&nbsp; NAMED CO-OP PEERS",
                  "Three peers that made co-op preparation a curriculum, not a scramble", body, take, css)


BUILD = {"org-nu.html": org, "audit-nu.html": audit,
         "recommendations-nu.html": recommendations, "case-study-nu.html": case_study}
for fname, fn in BUILD.items():
    (GOLD / fname).write_text(fn(), encoding="utf-8")
    print(f"  wrote {fname}")
print("[done] batch A gold exemplars (NU)")
