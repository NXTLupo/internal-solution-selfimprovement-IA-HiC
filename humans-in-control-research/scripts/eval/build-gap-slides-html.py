#!/usr/bin/env python
"""Gap-analysis slide twins (NU + NXT), per gap-analysis-evaluator skill: 4-6 gaps,
each with a Gartner 1-5 maturity (current -> target), a severity rating, a named quick
win, plus a risk register (>=3 risks with likelihood, impact, mitigation). Maturity and
severity are methodological RATINGS (like Gartner/MoSCoW), shown as labeled levels, not
naked quantitative claims; figures-about-the-world ride only in sourced quotes. House
style: pain = red, fix = teal, one graphite quote per detail."""
import slidekit as K

G = [
    dict(num="01", q2="I’m a first year and the co-op search is honestly terrifying.", s2="Reddit r/NEU", impact="Who it hits: the co-op advising team, whose roughly 200-to-1 caseload turns a single 30-minute slot into the only feedback a first-year gets, and it arrives weeks after the draft was due.", name="No early help with the resume", cur=1, tgt=4, sev="High",
         desc="The co-op office leans on one advisor for roughly two hundred students, so first-years write the resume everything depends on with no feedback in time.",
         lead="The first deliverable of the search is the resume, and it is the one a first-year is least equipped to write. With a single advisor covering about two hundred students, feedback arrives weeks late or not at all, so students draft blind and lose ground before applications even open.",
         q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU",
         quickwin="Ship a guided first-draft template inside the readiness tool this term, before the advisor queue.",
         close="Closing it: a guided first draft reaches every student before the advisor queue, not after."),
    dict(num="02", q2="The rejection emails just pile up in your inbox.", s2="Reddit r/NEU", impact="Who it hits: NUworks and the co-op office, which lose any signal of real fit as students carpet-bomb applications and unsorted rejections accumulate with no pattern to act on.", name="No way to find the right co-op", cur=2, tgt=4, sev="Critical",
         desc="NUworks lists thousands of roles and filters none by major, so students apply in bulk and the office loses any signal of real fit.",
         lead="NUworks shows everything and narrows nothing to a student's major. Students respond the only way they can, with volume, and the rejections arrive as an unsorted pile. The co-op office, in turn, cannot see which matches actually fit.",
         q="NUworks is a mess. There are thousands of postings and no good way to filter the ones that match my major.", src="Reddit r/NEU",
         quickwin="Add a major-fit filter and saved searches to NUworks so volume stops being the only move.",
         close="Closing it: discovery ranks roles by fit, so students find matches instead of listings."),
    dict(num="03", q2="I went into my first co-op interview having never done a mock interview and completely froze.", s2="Reddit r/NEU", impact="Who it hits: the Career Center, whose single live workshop reaches only a fraction of the cohort while the rest walk into a real interview having never rehearsed.", name="Prep the cohort can't reach", cur=2, tgt=4, sev="High",
         desc="The Career Center offers interview prep live only, at conflicting times, so most first-years meet the first interview unprepared.",
         lead="Interview prep exists, but only as a live session at a time that collides with class, and nothing is recorded. The Career Center therefore reaches a fraction of the cohort, and most students walk into a real interview having never practiced one.",
         q="The interview prep workshop was at 9am on a Friday and I had class. They need to record these.", src="Reddit r/NEU",
         quickwin="Record the existing prep workshops and post them on demand for the whole cohort.",
         close="Closing it: recorded workshops and on-demand practice any student can reach."),
    dict(num="04", q2="My advisor is helpful but I can only get a 30 minute meeting every few weeks.", s2="Reddit r/NEU", impact="Who it hits: first-generation students most of all, who decide the match by reverse-engineering rules the matching portal never explains, with the advisor out of time.", name="Matching no one explains", cur=1, tgt=4, sev="High",
         desc="The matching system reveals its rules inside the event, so students rank employers without understanding how the decision is made.",
         lead="The highest-stakes step, ranking and matching, is explained to students only once they are already inside it. They make a consequential decision while reverse-engineering the rules from peers, and the advisor who could clarify is out of time.",
         q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025",
         quickwin="Publish a short pre-match primer that explains ranking before applications open.",
         close="Closing it: a short primer teaches the rules before applications open."),
]
PATTERN = "Every gap is the same gap in a different place: guidance that one advisor cannot scale to, missing at the moment a student needs it."

# Risk register (representative; grounded where the corpus speaks, e.g. the documented SAIL-platform
# allergy and FERPA constraint). Likelihood/Impact are Low/Medium/High ratings, not figures.
RISKS = [
    dict(risk="Students distrust yet another platform after past institutional tool failures.",
         like="Medium", impact="High",
         mit="Embed help inside the flows students already use; no new branded platform (the documented SAIL allergy)."),
    dict(risk="Advisors read the tool as a threat that replaces their role.",
         like="Medium", impact="Medium",
         mit="Position it as advisor time-back; the human stays in control of judgment, the tool carries the routine."),
    dict(risk="Use of student records to personalize readiness raises FERPA exposure.",
         like="Low", impact="High",
         mit="FERPA-compliant handling, explicit student opt-in, and no record data leaving the tenant."),
]
SEV_CLASS = {"Critical": "sev--crit", "High": "sev--high", "Medium": "sev--med"}

CSS = """
/* maturity bar: 5 Gartner levels; filled = current, teal = the gain to target */
.mbar{display:flex;gap:4px;margin:12px 0 7px;}
.mseg{width:30px;height:9px;background:#E4E4DD;}
.mseg--cur{background:var(--struct);}
.mseg--gain{background:var(--need);}
.mlab{display:block;font-size:12px;line-height:1.45;color:var(--nxt-mid);font-weight:300;}
.mlab b{color:var(--nxt-ink);font-weight:600;}
.mlab i{color:var(--need);font-style:normal;font-weight:600;}
.sev{display:inline-block;font-family:var(--nxt-body);font-size:11px;letter-spacing:0;font-weight:600;padding:4px 11px;margin-top:4px;border-radius:2px;}
.sev--crit{background:var(--pain);color:#fff;}
.sev--high{background:#23262E;color:#fff;}
.sev--med{background:#ECECE4;color:var(--struct);}
/* detail */
.gd-meta{display:flex;gap:40px;align-items:flex-end;margin-top:8px;margin-bottom:18px;}
.gd-mblock{}
.gd-impact{display:block;font-size:13.5px;line-height:1.55;color:var(--nxt-ink);font-weight:400;margin-top:16px;}
.gd-q2{display:block;border-left:3px solid var(--pain);padding-left:16px;margin-top:18px;}
.gd-q2__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:15px;line-height:1.4;color:var(--nxt-ink-2);}
.gd-q2__s{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.05em;color:var(--pain);margin-top:6px;font-weight:600;}
.gd-quick{margin-top:22px;border-left:3px solid var(--need);padding:5px 0 5px 18px;max-width:104ch;}
.gd-quick__l{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--need);font-weight:600;margin-bottom:5px;}
.gd-quick__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.5;color:var(--need);}
/* risk register */
.rr{display:grid;grid-template-columns:2.4fr 0.8fr 0.8fr 2.6fr;gap:0;margin-top:18px;}
.rr-h{font-family:var(--nxt-mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--struct);font-weight:600;padding:0 14px 9px;}
.rr-cell{background:#F6F6F1;padding:14px;min-height:78px;display:flex;align-items:center;font-size:13px;line-height:1.45;color:var(--nxt-ink);font-weight:300;}
.rr-cell--risk{background:#ECECE4;font-family:var(--nxt-display);font-weight:600;font-size:13.5px;}
.rr-cell--rate{justify-content:center;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;}
.rate-high{color:var(--pain);}
.rate-med{color:var(--struct);}
.rate-low{color:var(--nxt-muted);}
.rr-rowgap{grid-column:1 / -1;height:4px;background:#FFFFFF;}
"""


# Named Gartner maturity levels, so the bar reads in plain language, not "level 1 of 5".
MATURITY = {1: "ad hoc", 2: "emerging", 3: "defined", 4: "managed and reliable", 5: "optimized"}


def mbar(cur, tgt):
    segs = ""
    for i in range(1, 6):
        cls = "mseg--cur" if i <= cur else ("mseg--gain" if i <= tgt else "")
        segs += f'<div class="mseg {cls}"></div>'
    return (f'<div class="mbar">{segs}</div>'
            f'<span class="mlab">Today this is {MATURITY[cur]}; it needs to be {MATURITY[tgt]}.</span>')


def rate_cls(v):
    return {"High": "rate-high", "Medium": "rate-med", "Low": "rate-low"}[v]


def ov_col(g, acc):
    return f"""<div class="col" style="--acc:{K.PAIN}">
  <div class="col-fig">{g['num']}</div>
  <div class="ov-name">{g['name']}</div>
  <span class="sev {SEV_CLASS[g['sev']]}">{g['sev']}</span>
  {mbar(g['cur'], g['tgt'])}
  <span class="ov-desc" style="margin-top:12px;">{g['desc']}</span>
  <span class="ov-q"><span class="ov-q__t">&ldquo;{g['q']}&rdquo;</span><span class="ov-q__s">Source: {g['src']}</span></span>
</div>"""


def overview():
    cols = "\n".join(ov_col(g, K.ACCENTS[i]) for i, g in enumerate(G))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Where the Support Falls Short</p>
  <h2 class="nxt-slide__title ov-title">Four gaps between the search students get and the one they need</h2>
  <div class="cols" style="grid-template-columns:repeat(4,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(PATTERN)}
</section>"""


def detail(g, acc):
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{K.PAIN}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Gap {g['num']}</p>
  <h2 class="nxt-slide__title">{g['name']}</h2>
  <div class="gd-meta">
    <div class="gd-mblock">{mbar(g['cur'], g['tgt'])}</div>
    <div><span class="sev {SEV_CLASS[g['sev']]}">Severity: {g['sev']}</span></div>
  </div>
  <div class="dt-grid">
    <div>
      <p class="dt-lead">{g['lead']}</p>
      <p class="gd-impact">{g['impact']}</p>
    </div>
    <div>
      {K.gtile_q(g['q'], g['src'])}
      <span class="gd-q2"><span class="gd-q2__t">&ldquo;{g['q2']}&rdquo;</span><span class="gd-q2__s">Source: {g['s2']}</span></span>
    </div>
  </div>
  <div class="gd-quick"><span class="gd-quick__l">Quick win</span><span class="gd-quick__t">{g['quickwin']}</span></div>
</section>"""


def risk_slide():
    head = ('<div class="rr-h">Risk</div><div class="rr-h" style="text-align:center">Likelihood</div>'
            '<div class="rr-h" style="text-align:center">Impact</div><div class="rr-h">Mitigation</div>')
    grid = head
    for r in RISKS:
        grid += (f'<div class="rr-cell rr-cell--risk">{r["risk"]}</div>'
                 f'<div class="rr-cell rr-cell--rate {rate_cls(r["like"])}">{r["like"]}</div>'
                 f'<div class="rr-cell rr-cell--rate {rate_cls(r["impact"])}">{r["impact"]}</div>'
                 f'<div class="rr-cell">{r["mit"]}</div>'
                 '<div class="rr-rowgap"></div>')
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{K.PAIN}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Risk Register</p>
  <h2 class="nxt-slide__title">What could keep these gaps from closing</h2>
  <div class="rr">{grid}</div>
  {K.gband('Each risk has a named mitigation; none is a reason to wait, and the largest, a distrust of new platforms, is answered by embedding help in the tools students already use.')}
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"gap-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Where the Support Falls Short", "Four gaps between the search students get and the one they need",
                            "Each gap is scored on a Gartner 1-5 maturity scale with a severity rating and a named quick win, grounded in student voice and the 2025 NU Student Survey; a risk register follows.")] \
             + [overview()] + [detail(g, K.ACCENTS[i]) for i, g in enumerate(G)] + [risk_slide()] \
             + [K.frame_closing("The through-line", "One missing capability shows up four times.", "Scaled guidance closes all four at once.")]
    K.write(f"gap-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] gap twins: maturity + severity + quick win + risk register, NU + NXT")
