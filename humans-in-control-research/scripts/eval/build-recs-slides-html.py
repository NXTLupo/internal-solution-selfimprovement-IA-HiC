#!/usr/bin/env python
"""Recommendations slide twins (NU) on slidekit. Clean + large:
- max 4 recommendations per slide, big readable text, generous whitespace
- NO metadata chrome (no horizon/owner/scope/retires tags)
- NO AI-slop micro-labels (no WHAT IT IS / WHY IT MATTERS / EVIDENCE / SO WHAT)
- human-sounding recommendation names, action-oriented plain language
- numbers ride only in verbatim sourced quotes (Quantitative Claim Rule)."""
import slidekit as K

RECS = [
    dict(num="01", steps=[("Pilot a guided first-draft template with one first-year cohort","Co-op + Readiness team","This term"),("Connect it to the student’s declared major and coursework","IT / Data services","Next term"),("Hand the finished draft to the advisor before the meeting","Co-op office","Next term"),("Roll it out to every incoming first-year","Co-op leadership","Next year")], risks=[("Students distrust another branded platform","Embed it in the readiness tool they already use, not a new system"),("Record use raises FERPA exposure","Explicit opt-in and FERPA-compliant handling")], name="Help every first-year write the first resume",
         desc="Give every student a tool that helps them write a strong first draft of their resume, before they ever get in line for an advisor. Right now how much help you get comes down to which advisor you were assigned.",
         q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU",
         out="A student writes a resume they would actually send, without waiting weeks to see someone."),
    dict(num="02", steps=[("Add a major-fit filter and saved searches to NUworks","NUworks product","This term"),("Rank roles by fit using major and coursework","NUworks + Data","Next term"),("Cluster rejections into a pattern view","NUworks product","Next term"),("Surface the fit signal to the co-op office","Co-op office","Next year")], risks=[("Employers fear filtering hides their postings","Rank, never exclude; every role stays discoverable"),("The fit model mis-ranks early","Show why a role ranked and let students override")], name="Show students the jobs that fit, not just more jobs",
         desc="Make the job board surface the co-ops that match a student's major first, and group their rejections so they can spot a pattern instead of staring at a pile. Then they stop applying to everything just to get one reply.",
         q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU",
         out="Students land interviews by applying to the right jobs, not the most jobs."),
    dict(num="03", steps=[("Record the existing prep workshops","Career Center","This term"),("Post them on demand in the co-op portal","Career Center + IT","This term"),("Add an on-demand mock interviewer","Career Center + Vendor","Next term"),("Track who has rehearsed before interviews","Career Center","Next year")], risks=[("Recorded content goes stale","Assign an owner to refresh it each term"),("The mock interviewer gives generic feedback","Tune it to the student’s target role and major")], name="Let students practice interviews on their own time",
         desc="Record the prep workshops and add a mock interview students can run anytime. A 9am Friday session leaves out anyone with class, and they end up at the real interview having never practiced once.",
         q="I went into my first co-op interview having never done a mock interview and completely froze.", src="Reddit r/NEU",
         out="No student sits down for a first interview having never done a practice run."),
    dict(num="04", steps=[("Draft a plain-language primer on ranking and matching","Co-op + Registrar","This term"),("Make it a required step before applications open","Co-op office","Next term"),("Add a worked example of a ranking decision","Co-op office","Next term"),("Measure matching literacy at intake versus today","Institutional Research","Next year")], risks=[("A required module reads as friction","Keep it short and skippable once passed"),("The rules change year to year","Version the primer and own it in the co-op office")], name="Explain how matching works before it counts",
         desc="Walk students through how ranking and matching actually work before they have to do it. Today most only piece the rules together once they are already in the middle of it.",
         q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025",
         out="Students go into matching knowing how it works, instead of guessing their way through."),
]
THROUGHLINE = "Every one of these does the same thing: it puts real help where a student used to hit a wall, and an overstretched advisor was the only option."
PROBLEM = ("First-years work hard at the co-op search. What they are missing is help. One advisor covers about two "
           "hundred students, the job board will not narrow to their major, and the only interview prep is a live "
           "session many cannot make.")

CSS = """
.rk-name{font-family:var(--nxt-display);font-weight:600;font-size:17px;line-height:1.22;color:var(--nxt-ink);margin:8px 0 13px;min-height:44px;}
.rk-desc{display:block;font-size:13px;line-height:1.55;color:var(--nxt-ink);font-weight:300;margin-bottom:16px;}
.rk-q{display:block;border-left:2px solid var(--acc);padding-left:11px;}
.rk-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:12.5px;line-height:1.4;color:var(--nxt-ink-2);}
.rk-q__src{display:block;font-family:var(--nxt-mono);font-style:normal;font-size:9px;letter-spacing:.04em;color:var(--acc);margin-top:6px;font-weight:600;}
.col-fig{font-size:40px!important;}
.band{margin-top:24px;border-left:3px solid var(--nxt-teal);padding:6px 0 6px 20px;}
.band span{display:block;font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.45;color:var(--nxt-ink);}
.rd-grid{display:grid;grid-template-columns:1.05fr 0.95fr;gap:48px;margin-top:20px;align-items:start;}
.rd-lead{font-size:16px;line-height:1.6;color:var(--nxt-ink);font-weight:300;}
.rd-q{display:block;border-left:3px solid var(--acc);padding-left:18px;}
.rd-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:18px;line-height:1.36;color:var(--nxt-ink-2);}
.rd-q__src{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.05em;color:var(--acc);margin-top:10px;font-weight:600;}
.rd-depth{display:grid;grid-template-columns:1.25fr 0.95fr;gap:48px;margin-top:24px;align-items:start;}
.rd-h{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--struct);margin:0 0 12px;}
.rd-h--pain{color:var(--pain);}
.rd-steps{list-style:none;margin:0;padding:0;counter-reset:st;}
.rd-steps li{position:relative;padding:0 0 12px 26px;font-size:13px;line-height:1.4;color:var(--nxt-ink);font-weight:300;}
.rd-steps li::before{counter-increment:st;content:counter(st);position:absolute;left:0;top:0;font-family:var(--nxt-mono);font-size:11px;font-weight:700;color:var(--need);}
.rd-step__t{display:block;}
.rd-owner{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--nxt-muted);margin-top:3px;}
.rd-risk{margin-bottom:12px;}
.rd-risk__r{display:block;font-size:12.5px;line-height:1.4;color:var(--pain);font-weight:400;}
.rd-risk__m{display:block;font-size:12px;line-height:1.4;color:var(--nxt-mid);font-weight:300;margin-top:2px;}
.rd-out{margin-top:22px;border-left:3px solid var(--need);padding:4px 0 4px 18px;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.5;color:var(--need);font-weight:400;max-width:104ch;}
"""


def ov_col(r, acc):
    return f"""<div class="col" style="--acc:{acc}">
  <div class="col-fig">{r['num']}</div>
  <div class="rk-name">{r['name']}</div>
  <span class="rk-desc">{r['desc']}</span>
  <span class="rk-q"><span class="rk-q__t">&ldquo;{r['q']}&rdquo;</span><span class="rk-q__src">Source: {r['src']}</span></span>
</div>"""


def overview():
    cols = "\n".join(ov_col(r, K.ACCENTS[i]) for i, r in enumerate(RECS))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Recommendations</p>
  <h2 class="nxt-slide__title ov-title">Four moves to put humans in control of the first-year co-op search</h2>
  <div class="cols" style="grid-template-columns:repeat(4,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(THROUGHLINE)}
</section>"""


def detail(r, acc):
    steps = "".join(f'<li><span class="rd-step__t">{st}</span><span class="rd-owner">{owner} &middot; {eff}</span></li>' for st, owner, eff in r['steps'])
    risks = "".join(f'<div class="rd-risk"><span class="rd-risk__r">{rk}</span><span class="rd-risk__m">Mitigation: {mit}</span></div>' for rk, mit in r['risks'])
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{acc}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Recommendation {r['num']}</p>
  <h2 class="nxt-slide__title">{r['name']}</h2>
  <div class="rd-grid">
    <p class="rd-lead">{r['desc']}</p>
    {K.gtile_q(r['q'], r['src'])}
  </div>
  <div class="rd-depth">
    <div><span class="rd-h">How it ships</span><ul class="rd-steps">{steps}</ul></div>
    <div><span class="rd-h rd-h--pain">Risks to manage</span>{risks}</div>
  </div>
  <p class="rd-out">{r['out']}</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"recs-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Recommendations · First-Year Co-op", "Four moves to put humans in control of the first-year co-op search",
                            PROBLEM + " The answer is one guiding policy expressed as four reinforcing moves."),
              overview()] + [detail(r, K.ACCENTS[i]) for i, r in enumerate(RECS)] + \
             [K.frame_closing("What's next", "Start where guidance is scarcest: the first resume and the matching rules.",
                              "Resume coaching and match literacy ship first; major-fit discovery and on-demand prep follow.")]
    K.write(f"recs-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] recs twins: graphite highlights, NU + NXT")
