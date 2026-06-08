#!/usr/bin/env python
"""Strategy slide twins (NU + NXT), house style. Rumelt kernel: one diagnosis,
one guiding policy, a coherent set of actions that reinforce each other. One
graphite highlight per slide; large, human; numbers ride only in sourced quotes."""
import slidekit as K

DIAGNOSIS = ("The first-year co-op search fails for one reason that recurs at every step: guidance is scarce. One advisor "
             "covers about two hundred students, the job board cannot narrow to a major, and prep is offered live only. "
             "Students respond with the only lever they have, brute-force effort, and it does not convert.")
POLICY = ("Scaffold guidance with AI at every phase, choosing scaled, consistent support for every first-year over "
          "high-touch advising rationed to a few. The quality a student gets stops depending on which advisor they "
          "draw or how many applications they can send.")
TRADEOFF = ("The choice: consistent, scaled scaffolding for all first-years over scarce, high-touch advising for the "
            "few who reach it. We trade depth at first contact for reach, then spend the advisor time we reclaim "
            "where only a person will do.")
ACTIONS = [
    dict(n="01", t="Scaffold the resume", d="A guided first draft before the advisor queue, so no one starts the most important document blind."),
    dict(n="02", t="Match by fit", d="Discovery ranked to a student's major, so targeting replaces volume."),
    dict(n="03", t="Practice on demand", d="Recorded and on-demand interview prep, so the first rehearsal is not the real interview."),
    dict(n="04", t="Teach the rules first", d="A primer on ranking before matching opens, so the decisive call is informed."),
    dict(n="05", t="Reclaim the advisor", d="With the routine scaled, advisor time concentrates on the cases only a person can handle."),
]
WHY = "The actions reinforce one another: each removes a wall, and together they let the advisor stop being the ceiling. That coherence, not any single feature, is the strategy."

# Top risks to the guiding policy (Rumelt: a strategy names what could break it).
# Likelihood + impact + a mitigation that is a design decision, not a hope.
RISKS = [
    dict(r="Students treat it as one more branded NU tool and ignore it", lk="High", im="High",
         m="Embed it in the readiness tool students already open, co-design with first-years, and never wall it off as a separate login."),
    dict(r="Advisors read the scaffolding as a move to replace them", lk="Medium", im="High",
         m="Frame and measure it as advisor time reclaimed for high-stakes cases, never as headcount; advisors own every escalation the tool cannot handle."),
    dict(r="Storing resumes and records widens FERPA exposure", lk="Medium", im="High",
         m="Explicit student opt-in, FERPA-compliant handling, and minimal retention, reviewed before any cohort goes live."),
    dict(r="Employers read fit-ranking as their postings being hidden", lk="Medium", im="Medium",
         m="Rank, never exclude: every role stays discoverable, and the tool shows a student why a role ranked where it did."),
    dict(r="Automation erodes the human relationship students actually value", lk="Low", im="High",
         m="Scaffold only the routine; protect and expand human time for judgment, encouragement, and the cases a model should never decide."),
]

CSS = """
.col-fig{font-size:36px!important;}
.st-t{font-family:var(--nxt-display);font-weight:600;font-size:16px;line-height:1.2;color:var(--nxt-ink);margin:7px 0 9px;text-wrap:balance;}
.st-d{display:block;font-size:13px;line-height:1.5;color:var(--nxt-mid);font-weight:300;text-wrap:pretty;}
.kgrid{display:grid;grid-template-columns:1fr 1fr;gap:46px;margin-top:24px;}
.klab{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);font-weight:600;margin:0 0 12px;}
.kbody{font-size:17px;line-height:1.6;color:var(--nxt-ink);font-weight:300;}
.st-trade{margin-top:22px;border-left:3px solid var(--need);padding:6px 0 6px 20px;}
.st-trade span{display:block;font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.5;color:var(--need);max-width:108ch;}
/* risk slide */
.rsk{margin-top:22px;}
.rsk-row{padding:16px 0;border-top:1px solid var(--nxt-line);display:grid;grid-template-columns:1.5fr 0.5fr 1.5fr;gap:34px;align-items:start;}
.rsk-row:first-child{border-top:0;}
.rsk-r{font-family:var(--nxt-display);font-weight:600;font-size:16px;line-height:1.34;color:var(--pain);}
.rsk-meta{display:flex;flex-direction:column;gap:7px;}
.rsk-chip{font-family:var(--nxt-mono);font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--nxt-muted);font-weight:600;}
.rsk-chip--hi{color:var(--pain);}
.rsk-m{font-size:13.5px;line-height:1.5;color:var(--nxt-ink);font-weight:300;}
"""


def ov_col(a, acc):
    return f"""<div class="col" style="--acc:{acc}">
  <div class="col-fig">{a['n']}</div>
  <div class="st-t">{a['t']}</div>
  <span class="st-d">{a['d']}</span>
</div>"""


def actions_overview():
    cols = "\n".join(ov_col(a, K.ACCENTS[i]) for i, a in enumerate(ACTIONS))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">The Strategy · Coherent Actions</p>
  <h2 class="nxt-slide__title ov-title">Five actions that reinforce one guiding policy</h2>
  <div class="cols" style="grid-template-columns:repeat(5,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(WHY)}
</section>"""


def kernel():
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--nxt-teal)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">The Kernel</p>
  <h2 class="nxt-slide__title">Diagnosis and guiding policy</h2>
  <div class="kgrid">
    <div><span class="klab" style="color:var(--pain)">The challenge</span><p class="kbody">{DIAGNOSIS}</p></div>
    <div><span class="klab" style="color:var(--need)">The guiding policy</span><p class="kbody">{POLICY}</p></div>
  </div>
  <div class="st-trade"><span>{TRADEOFF}</span></div>
</section>"""


def risk_slide():
    rows = ""
    for x in RISKS:
        lk_cls = "rsk-chip rsk-chip--hi" if x["lk"] == "High" else "rsk-chip"
        im_cls = "rsk-chip rsk-chip--hi" if x["im"] == "High" else "rsk-chip"
        rows += f"""<div class="rsk-row">
      <div class="rsk-r">{x['r']}</div>
      <div class="rsk-meta"><span class="{lk_cls}">Likelihood &middot; {x['lk']}</span><span class="{im_cls}">Impact &middot; {x['im']}</span></div>
      <div class="rsk-m">{x['m']}</div>
    </div>"""
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--pain)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">The Strategy · What Could Break It</p>
  <h2 class="nxt-slide__title">Five risks this strategy has to survive</h2>
  <div class="rsk">{rows}</div>
  {K.gband('Each risk has a mitigation built into the design, not a hope: the strategy is only as good as the walls it does not create while removing the others.')}
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"strategy-{b}-slide.html", K.doc(actions_overview(), CSS, brand=b))
    frames = [K.frame_title("The Strategy", "Put humans in control of the first-year co-op search",
                            "A single guiding policy, scaled guidance at every phase, expressed as five coherent actions that reinforce one another."),
              kernel(), actions_overview(), risk_slide(),
              K.frame_closing("The bet", "Coherence is the strategy.", "No single feature wins; five reinforcing moves let the advisor stop being the ceiling.")]
    K.write(f"strategy-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] strategy twins: Rumelt kernel + coherent actions, NU + NXT")
