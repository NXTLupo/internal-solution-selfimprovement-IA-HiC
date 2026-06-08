#!/usr/bin/env python
"""PRD slide twins (NU + NXT), per the prd-compiler skill (Cagan/SVPG). The spine of
a PRD is USER STORIES ("As [persona], I want [goal] so that [benefit]") with
Given/When/Then acceptance criteria and MoSCoW priority, each traced to a behavioral
persona and a corpus evidence quote. Overview = the user-story roster + problem
statement; each detail = one story with its acceptance criteria and success metric."""
import slidekit as K

PROBLEM = ("First-years route around the official co-op channels because each one is too slow, too broad, or "
           "too opaque to use when it matters. The product's job is to make the official path the fastest, "
           "fitted, most candid one, so students stop improvising the highest-stakes search of their degree.")

STORIES = [
    dict(num="US-1", prio="Must-have", persona="The Blind Drafter",
         story="As a first-year with no resume experience, I want a guided first draft before I can get an advisor slot, so that I am not losing ground while I wait.",
         given="Given a first-year who has never written a resume",
         when="When they open the readiness tool before any advisor meeting",
         then="Then they leave with a complete, editable, employer-shaped first draft in one sitting.",
         metric="A student reaches a sendable first draft without the multi-week advisor wait that gates it today.",
         q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU"),
    dict(num="US-2", prio="Must-have", persona="The Rule-Blind Decider",
         story="As a first-generation student, I want the matching rules explained before applications open, so that I rank employers knowing how the decision is made.",
         given="Given matching has not yet opened",
         when="When the student enters the co-op portal",
         then="Then a short required primer explains ranking and matching before any ranking can be submitted.",
         metric="Students enter matching able to explain the rules, instead of reconstructing them mid-decision as they do now.",
         q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025"),
    dict(num="US-3", prio="Should-have", persona="The Volume Applicant",
         story="As a student in a competitive major, I want roles ranked by fit to my major, so that I stop applying to everything just to get one reply.",
         given="Given a student with a declared major",
         when="When they search the job board",
         then="Then roles are ordered by major-fit and rejections are grouped into a pattern they can act on.",
         metric="Interviews come from targeted applications rather than the bulk-send volume students rely on today.",
         q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU"),
    dict(num="US-4", prio="Should-have", persona="The Unrehearsed Performer",
         story="As a student whose schedule conflicts with prep, I want on-demand interview practice, so that my first real interview is not my first rehearsal.",
         given="Given a student with a scheduled interview and a class conflict",
         when="When they open interview prep at any hour",
         then="Then a recorded workshop and an on-demand mock interview are available without a live session.",
         metric="No student walks into a first interview having never practiced, the norm under live-only prep today.",
         q="The interview prep workshop was at 9am on a Friday and I had class. They need to record these.", src="Reddit r/NEU"),
    dict(num="US-5", prio="Could-have", persona="The Blind Drafter",
         story="As a co-op advisor, I want to receive a student's AI-prepared draft ahead of our meeting, so that our limited time goes to judgment, not formatting.",
         given="Given an advisor with a 30-minute slot and a large caseload",
         when="When a student books a meeting",
         then="Then the advisor opens the student's prepared draft, not a blank page.",
         metric="Scarce advisor time shifts from routine resume fixes to the judgment only a person can give.",
         q="My advisor is helpful but I can only get a 30 minute meeting every few weeks.", src="Reddit r/NEU"),
]
NONGOALS = "Out of scope for this release: replacing the human advisor, automating the employer match decision, and any feature that ships without a verbatim student pain behind it."

# Success metrics: each names WHAT to measure, the baseline state today (qualitative,
# grounded in the corpus, no fabricated number), the target direction, and a guardrail
# that must not regress. The real PRD fills measured baselines from institutional data;
# the exemplar shows the SHAPE, never an invented figure (Quantitative Claim Rule).
SUCCESS = [
    dict(trace="US-1", measure="First-years with a sendable resume draft before their first advisor meeting",
         base="Most draft blind and wait weeks for a slot", target="Every first-year arrives with a draft in hand",
         guard="Advisor review quality holds as drafting shifts earlier"),
    dict(trace="US-3", measure="Interviews earned from fitted applications rather than bulk sends",
         base="Students mass-apply and rarely convert", target="Interviews come from fewer, fitted applications",
         guard="No employer's postings become undiscoverable"),
    dict(trace="US-2", measure="Students who can explain the matching rules before they rank",
         base="Most learn the rules mid-decision", target="Students rank knowing how the match is computed",
         guard="The primer stays short enough not to add friction"),
    dict(trace="US-4", measure="Students who complete a mock before their first real interview",
         base="Live-only prep leaves many unrehearsed", target="No first interview is the first rehearsal",
         guard="Recorded prep is refreshed each term, not left to go stale"),
    dict(trace="US-5", measure="Advisor time spent on judgment rather than routine resume fixes",
         base="Thirty-minute slots go to formatting help", target="Scarce advisor time goes to the hard cases",
         guard="Students who need a human still reach one quickly"),
]

CSS = """
.col-fig{font-size:30px!important;}
.us-prio{display:inline-block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:3px 8px;background:#ECECE4;color:var(--struct);margin:8px 0 10px;}
.us-prio--must{background:#23262E;color:#FFFFFF;}
.us-story{display:block;font-size:13px;line-height:1.5;color:var(--nxt-ink);font-weight:300;margin-bottom:10px;text-wrap:pretty;}
.us-persona{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--need);font-weight:600;}
/* detail */
.pd-story{font-family:var(--nxt-display);font-style:italic;font-size:21px;line-height:1.4;color:var(--nxt-ink);margin-top:20px;max-width:92ch;}
.pd-meta{display:flex;gap:10px;margin-top:14px;align-items:center;}
.pd-chip{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;padding:4px 10px;background:#ECECE4;color:var(--struct);}
.pd-chip--must{background:#23262E;color:#FFFFFF;}
.pd-chip--persona{background:transparent;color:var(--need);border:1px solid var(--nxt-line);}
.ac{margin-top:24px;}
.ac-h{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--struct);font-weight:600;margin-bottom:12px;}
.ac-row{display:grid;grid-template-columns:88px 1fr;gap:14px;margin-bottom:9px;align-items:baseline;}
.ac-k{font-family:var(--nxt-mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--need);font-weight:700;}
.ac-v{font-size:14.5px;line-height:1.5;color:var(--nxt-ink);font-weight:300;}
.pd-metric{margin-top:22px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.5;color:var(--need);max-width:96ch;}
/* success-metrics slide */
.sm-title{font-size:34px!important;line-height:1.12!important;}
.sm{margin-top:16px;}
.sm-head{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:24px;padding-bottom:9px;}
.sm-head span{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--nxt-muted);font-weight:600;}
.sm-row{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:24px;padding:11px 0;border-top:1px solid var(--nxt-line);align-items:start;}
.sm-measure{font-family:var(--nxt-display);font-weight:600;font-size:13.5px;line-height:1.28;color:var(--nxt-ink);}
.sm-trace{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.06em;color:var(--nxt-muted);font-weight:600;margin-top:5px;}
.sm-base{font-size:12px;line-height:1.4;color:var(--pain);font-weight:300;}
.sm-target{font-size:12px;line-height:1.4;color:var(--need);font-weight:400;}
.sm-guard{font-size:12px;line-height:1.4;color:var(--nxt-mid);font-weight:300;}
"""


def pclass(prio):
    return "--must" if prio == "Must-have" else ""


def ov_col(s, acc):
    return f"""<div class="col">
  <div class="col-fig" style="color:var(--struct)">{s['num']}</div>
  <span class="us-prio us-prio{pclass(s['prio'])}">{s['prio']}</span>
  <span class="us-story">{s['story']}</span>
  <span class="us-persona">{s['persona']}</span>
</div>"""


def overview():
    cols = "\n".join(ov_col(s, K.ACCENTS[i]) for i, s in enumerate(STORIES))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Product Requirements · User Stories</p>
  <h2 class="nxt-slide__title ov-title">Five user stories that make the official path the one students choose</h2>
  <div class="cols" style="grid-template-columns:repeat(5,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(PROBLEM, 'The problem')}
</section>"""


def metrics_slide():
    rows = ""
    for m in SUCCESS:
        rows += f"""<div class="sm-row">
      <div><span class="sm-measure">{m['measure']}</span><span class="sm-trace">Traces to {m['trace']}</span></div>
      <div class="sm-base">{m['base']}</div>
      <div class="sm-target">{m['target']}</div>
      <div class="sm-guard">{m['guard']}</div>
    </div>"""
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--need)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Product Requirements · Success Metrics</p>
  <h2 class="nxt-slide__title sm-title">What success looks like, and what must not regress to reach it</h2>
  <div class="sm">
    <div class="sm-head"><span>Measure</span><span>Where it stands today</span><span>Target</span><span>Guardrail</span></div>
    {rows}
  </div>
  {K.gband('Each measure carries a baseline from institutional data before launch; targets are set against that baseline, never asserted ahead of it.')}
</section>"""


def detail(s, acc):
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{K.STRUCT}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">{s['num']} · {s['persona']}</p>
  <h2 class="nxt-slide__title">User story</h2>
  <p class="pd-story">&ldquo;{s['story']}&rdquo;</p>
  <div class="pd-meta">
    <span class="pd-chip pd-chip{pclass(s['prio'])}">{s['prio']}</span>
    <span class="pd-chip pd-chip--persona">Persona: {s['persona']}</span>
  </div>
  <div class="ac">
    <span class="ac-h">Acceptance criteria</span>
    <div class="ac-row"><span class="ac-k">Given</span><span class="ac-v">{s['given'][6:]}.</span></div>
    <div class="ac-row"><span class="ac-k">When</span><span class="ac-v">{s['when'][5:]}.</span></div>
    <div class="ac-row"><span class="ac-k">Then</span><span class="ac-v">{s['then'][5:]}</span></div>
  </div>
  <p class="pd-metric">Success looks like: {s['metric'][0].lower() + s['metric'][1:]}</p>
  {K.gtile_q(s['q'], s['src'])}
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"prd-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Product Requirements", "Make the official co-op path the fastest, fitted, most candid one students have",
                            "Built as user stories tied to the behavioral personas, each with Given/When/Then acceptance criteria, a MoSCoW priority, and a verbatim student pain behind it.")] \
             + [overview()] + [detail(s, K.ACCENTS[i]) for i, s in enumerate(STORIES)] \
             + [metrics_slide()] \
             + [K.frame_closing("Out of scope", "Replace the wall, not the advisor.",
                                NONGOALS)]
    K.write(f"prd-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] prd twins: user stories + Given/When/Then + MoSCoW + persona trace, NU + NXT")
