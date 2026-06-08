#!/usr/bin/env python
"""Service blueprint slide twins (NU + NXT), rebuilt to the standard blueprint model
(Bitner/Ostrom; NN/g): five journey phases across; lanes top-to-bottom = physical/
digital evidence, customer actions, [line of interaction], frontstage (visible),
[line of visibility], backstage (invisible), support processes. A11y-safe: dark text
on light cream lane bands and white cells, never color-only and never text-on-dark.
Lane labels are full-width blocks so they cannot break mid-word in the PPTX export.
Failure points are flagged with a filled red marker (shape, not color alone)."""
import slidekit as K

PHASES = ["Resume", "Diagnosis", "Search", "Interview", "Match"]
# lane: (label, [5 cells], pain_flags[5])  pain True = this is where the experience breaks
LANES = [
    ("Touchpoints", ["Blank doc, peer resumes", "Readiness dashboard", "NUworks listings", "Video-call link", "Ranking form"],
     [0, 0, 0, 0, 0]),
    ("Student actions", ["Drafts the resume alone", "Reviews flagged skill gaps", "Sends ~60 applications", "Sits the first interview", "Submits a ranking"],
     [0, 0, 0, 0, 0]),
    ("Frontstage", ["Advisor intake, weeks out", "Diagnostic + skill prompts", "Job board, no major filter", "Live-only prep workshop", "Matching portal, unexplained"],
     [1, 0, 1, 1, 1]),
    ("Backstage", ["Advisor reviews when free", "Model parses resume vs roles", "Postings ingested, unranked", "Career Center schedules sessions", "Algorithm computes the match"],
     [0, 0, 0, 0, 0]),
    ("Support", ["Peer screenshots, r/NEU", "Major + course records", "Email inbox, no triage", "r/NEU debriefs", "Upperclassmen explain rules"],
     [0, 0, 1, 0, 1]),
]
# emotion line (Bitner/NN/g): named emotion + intensity 1-5 per phase, grounded in the
# per-phase student quote below. 5 = delighted, 1 = most frustrated. Search is the trough
# ("60 applications, 4 replies"); every phase of the first-year search reads negative.
EMO = [
    ("Frustrated", 2),  # Resume    -- blank page, no reachable help
    ("Negative", 2),    # Diagnosis -- told the gap, not how to close it
    ("Frustrated", 1),  # Search    -- 60 sent, 4 replies (lowest point)
    ("Negative", 2),    # Interview -- froze, never practiced
    ("Negative", 2),    # Match     -- ranked without knowing the rules
]
# lines of separation, inserted after the lane at the given index
SEP_AFTER = {1: "line of interaction", 2: "line of visibility"}
INSIGHT = "Every failure marker sits in the frontstage, the one layer a student can reach. The backstage that could help stays below the line of visibility, invisible to them."

# per-phase detail content. `sentences` holds a COMPLETE SENTENCE per lane (in LANES
# order: evidence, student actions, frontstage, backstage, support) so the deep-dive
# reads as prose, not cryptic cells.
DETAIL = [
    dict(name="Resume", q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU", goal="Produce a resume an employer will actually read.",
         sentences=[
            "The student faces a blank document with only a few friends' resumes pulled up for reference.",
            "The student drafts a first resume alone, with no prior employer-facing writing to draw on.",
            "The only visible help is a co-op advisor whose next opening is weeks away.",
            "When the advisor finally has time, the review arrives too late to shape the draft.",
            "In the meantime the student leans on peer screenshots and r/NEU threads to guess the format."],
         gap="The only frontstage help, the advisor, is weeks out, so the student falls back on peer screenshots."),
    dict(name="Diagnosis", q="It told me what I was missing but not how I was supposed to fix it before applications opened.", src="Reddit r/NEU", goal="Know which skills to build before applications open.",
         sentences=[
            "The student opens a readiness dashboard that scores their resume against employer expectations.",
            "The student reviews the flagged skill gaps and tries to decide which ones to close first.",
            "The diagnostic surfaces gaps and learning prompts but offers no plan to close them in time.",
            "A model parses the resume and declared major against employer skill requirements.",
            "The student's major and course records feed the tool, but nothing connects them to a next step."],
         gap="Backstage names the gap; nothing frontstage helps the student close it in time."),
    dict(name="Search", q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU", goal="Find and apply to co-ops that actually fit.",
         sentences=[
            "The student scrolls thousands of unfiltered NUworks listings looking for a match.",
            "The student sends roughly sixty applications to compensate for a low expected response rate.",
            "The job board lists every role and cannot narrow results to the student's major.",
            "Employer postings are ingested into NUworks but are never ranked by fit.",
            "Rejections pile up in an email inbox with no triage and no pattern to learn from."],
         gap="Frontstage lists everything; no backstage logic ranks by fit, so volume becomes the only move."),
    dict(name="Interview", q="The interview prep workshop was at 9am on a Friday and I had class. They need to record these.", src="Reddit r/NEU", goal="Walk in prepared and convert the interview.",
         sentences=[
            "The student joins a video call for their first real co-op interview.",
            "The student sits the interview having never completed a single mock beforehand.",
            "The only prep workshop is live, collides with class, and is never recorded.",
            "The Career Center schedules the live sessions but offers no asynchronous option.",
            "Afterward the student debriefs informally on r/NEU instead of with the Career Center."],
         gap="The one frontstage prep channel is live-only; no backstage recording reaches the rest of the cohort."),
    dict(name="Match", q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025", goal="Rank well and secure the right offer.",
         sentences=[
            "The student is handed a ranking form inside the matching portal.",
            "The student submits a ranking without having been shown how the match is computed.",
            "The matching portal asks for a decision but never explains the rules behind it.",
            "An algorithm computes the match from the rankings, invisibly to the student.",
            "The student reconstructs the rules from upperclassmen in the middle of the decision."],
         gap="The backstage algorithm decides; no frontstage step teaches the rules before the student must act."),
]

CSS = """
.bp{display:grid;grid-template-columns:150px repeat(5,1fr);gap:0;margin-top:16px;border:0;}
.bp-h{font-family:var(--nxt-mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--struct);font-weight:600;padding:0 10px 9px;text-align:center;}
.bp-h.bp-corner{text-align:left;color:var(--nxt-muted);}
/* lane bands: light cream fill = structure, dark text = AA. label is a full-width block. */
.bp-lab{background:#ECECE4;display:flex;align-items:center;padding:0 14px;min-height:62px;}
.bp-lab span{display:block;width:100%;font-family:var(--nxt-mono);font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--struct);font-weight:700;line-height:1.25;}
.bp-cell{background:#F6F6F1;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px 10px;min-height:62px;font-size:11.5px;line-height:1.35;color:var(--nxt-ink);font-weight:300;position:relative;}
.bp-cell--pain{background:#FBEDED;}
.bp-pin{position:absolute;top:8px;left:8px;width:8px;height:8px;background:var(--pain);}
.bp-band{background:#FFFFFF;height:6px;}
.bp-sep{grid-column:1 / -1;background:#23262E;display:flex;align-items:center;justify-content:center;min-height:26px;}
.bp-sep span{display:block;width:100%;text-align:center;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#FFFFFF;font-weight:600;white-space:nowrap;}
.bp-rowgap{grid-column:1 / -1;height:4px;background:#FFFFFF;}
/* emotion line: named emotion + 1-5 intensity bar (shape, not color alone) */
.bp-emo{background:#F6F6F1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:10px;min-height:62px;}
.bp-emo__n{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.03em;text-transform:uppercase;color:var(--pain);font-weight:700;white-space:nowrap;}
.bp-emo__bar{display:flex;gap:3px;}
.bp-emo__bar i{display:inline-block;width:12px;height:8px;background:#D8D8CE;}
.bp-emo__bar i.on{background:var(--pain);}
/* detail */
.bd-goal{margin-top:18px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:18px;line-height:1.45;color:var(--need);}
.bd-stack{display:grid;grid-template-columns:150px 1fr;gap:0;margin-top:20px;}
.bd-lab{background:#ECECE4;display:flex;align-items:center;padding:0 14px;min-height:46px;}
.bd-lab span{display:block;width:100%;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--struct);font-weight:700;}
.bd-cell{background:#F6F6F1;display:flex;align-items:center;padding:0 18px;min-height:46px;font-size:14px;line-height:1.4;color:var(--nxt-ink);font-weight:300;position:relative;}
.bd-cell--pain{background:#FBEDED;}
.bd-pin{position:absolute;top:10px;left:8px;width:8px;height:8px;background:var(--pain);}
.bd-sep{grid-column:1 / -1;background:#23262E;display:flex;align-items:center;justify-content:center;min-height:24px;margin:0;}
.bd-sep span{display:block;width:100%;text-align:center;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#FFFFFF;font-weight:600;white-space:nowrap;}
.bd-rowgap{grid-column:1 / -1;height:4px;background:#FFFFFF;}
.bd-gap{margin-top:22px;border-left:3px solid var(--pain);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.5;color:var(--pain);max-width:96ch;}
.bd-emo{display:flex;align-items:center;gap:14px;margin-top:16px;}
.bd-emo__n{font-family:var(--nxt-mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--pain);font-weight:700;}
.bd-emo__bar{display:flex;gap:4px;}
.bd-emo__bar i{display:inline-block;width:18px;height:10px;background:#D8D8CE;}
.bd-emo__bar i.on{background:var(--pain);}
"""


def emo_bar(level, cls="bp-emo__bar"):
    segs = "".join(f'<i class="on"></i>' if k < level else '<i></i>' for k in range(5))
    return f'<span class="{cls}">{segs}</span>'


def overview():
    cells = ['<div class="bp-h bp-corner">Service layer</div>']
    cells += [f'<div class="bp-h">{p}</div>' for p in PHASES]
    grid = "".join(cells)
    # emotion line first (canonical NN/g placement, just under the phase headers)
    grid += '<div class="bp-lab"><span>Student emotion</span></div>'
    for name, lvl in EMO:
        grid += f'<div class="bp-emo"><span class="bp-emo__n">{name}</span>{emo_bar(lvl)}</div>'
    grid += '<div class="bp-rowgap"></div>'
    for li, (lane, vals, pains) in enumerate(LANES):
        grid += f'<div class="bp-lab"><span>{lane}</span></div>'
        for ci, v in enumerate(vals):
            pin = '<div class="bp-pin"></div>' if pains[ci] else ''
            cls = "bp-cell bp-cell--pain" if pains[ci] else "bp-cell"
            grid += f'<div class="{cls}">{pin}{v}</div>'
        if li in SEP_AFTER:
            grid += f'<div class="bp-sep"><span>{SEP_AFTER[li]}</span></div>'
        else:
            grid += '<div class="bp-rowgap"></div>'
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Service Blueprint · First-Year Co-op</p>
  <h2 class="nxt-slide__title ov-title">What the student reaches, and what stays hidden, at every phase</h2>
  <div class="bp">{grid}</div>
  {K.gband(INSIGHT)}
</section>"""


def detail(d, idx, acc):
    grid = ""
    for li, (lane, vals, pains) in enumerate(LANES):
        pain = pains[idx]
        cls = "bd-cell bd-cell--pain" if pain else "bd-cell"
        grid += f'<div class="bd-lab"><span>{lane}</span></div><div class="{cls}">{d["sentences"][li]}</div>'
        if li in SEP_AFTER:
            grid += f'<div class="bd-sep"><span>{SEP_AFTER[li]}</span></div>'
        else:
            grid += '<div class="bd-rowgap"></div>'
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{K.STRUCT}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Phase · {d['name']}</p>
  <h2 class="nxt-slide__title">{d['name']}: what happens at every service layer</h2>
  <p class="bd-goal">The student's goal in this phase: {d['goal'].lower()[:-1]}.</p>
  <div class="bd-emo"><span class="bd-emo__n">Emotional state &middot; {EMO[idx][0]}</span>{emo_bar(EMO[idx][1], "bd-emo__bar")}</div>
  <div class="bd-stack">{grid}</div>
  <p class="bd-gap">Where it breaks: {d['gap'][0].lower() + d['gap'][1:]}</p>
  {K.gtile_q(d['q'], d['src'])}
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"blueprint-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Service Blueprint", "What the student reaches, and what stays hidden, across the first-year co-op search",
                            "Five phases across; service layers top to bottom, split by the lines of interaction and visibility. Failure markers show where the experience breaks, grounded in student voice and the 2025 NU Student Survey.")] \
             + [overview()] + [detail(d, i, K.ACCENTS[i]) for i, d in enumerate(DETAIL)] \
             + [K.frame_closing("What the blueprint shows", "The reachable frontstage breaks; the helpful backstage stays invisible.",
                                "Every fix moves capability from the hidden backstage up to a frontstage students can actually reach.")]
    K.write(f"blueprint-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] blueprint twins: standard 5-lane model, A11y dark-on-cream, pain markers, goals, NU + NXT")
