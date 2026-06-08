#!/usr/bin/env python
"""Themes slide twins (NU + NXT), house style. Cross-corpus themes named in human
language, each with a thesis, the evidence behind it, and a verbatim sourced quote.
One graphite highlight per slide; numbers ride only in quotes."""
import slidekit as K

# Each theme carries the full theme-analyst dimension set: a primary lens (of the 6),
# prevalence as a QUALITATIVE band + intensity bar (never a bare number), weighted
# sentiment (named), 2-3 sub-themes, and the tension/contradiction the evidence exposes.
T = [
    dict(num="01", name="Guidance does not scale", lens="Operational & Process", prev=5, prevband="Dominant",
         where="r/NEU, 2025 NU Student Survey, Higher Ed Dive", sent="Strongly negative",
         subs=["Advisor-to-student ratio", "Help that arrives too late", "Fallback to peers"],
         tension="Students rate their advisor highly as a person; the model still fails them. The constraint is capacity, not competence.",
         thesis="The single advisor model cannot reach a first-year cohort at the moment each student needs help.",
         lead="Across every account, the bottleneck is the same: one advisor, hundreds of students, and help that arrives too late to matter. Students describe drafting blind, waiting weeks, and falling back on peers for what the institution was meant to provide.",
         q="My advisor is helpful but I can only get a 30 minute meeting every few weeks.", src="Reddit r/NEU",
         close="Where it shows up: the resume, the skill diagnosis, and the matching decision all stall on advisor scarcity."),
    dict(num="02", name="Effort substitutes for aim", lens="Operational & Process", prev=5, prevband="Dominant",
         where="r/NEU, 2025 NU Student Survey", sent="Negative, eroding to defeated",
         subs=["Bulk applications", "Patternless rejection", "Volume read as progress"],
         tension="Students read low conversion as personal failure, though the cause is the absence of any fit signal to aim by.",
         thesis="When the system cannot help students target, they compensate with raw volume that does not convert.",
         lead="With no way to filter for fit, students apply in bulk and treat the count as progress. The rejections arrive without pattern, so effort rises while learning does not, and confidence erodes with each silent reply.",
         q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU",
         close="Where it shows up: mass application, inbox-watching, and the search backlog that pushes co-op semesters."),
    dict(num="03", name="Help exists but is unreachable", lens="Operational & Process", prev=4, prevband="Recurring",
         where="r/NEU, Career Center materials", sent="Frustrated",
         subs=["Live-only timing", "Diagnosis without a path", "Nothing recorded to return to"],
         tension="The institution can list every service as offered; students experience the same services as effectively absent.",
         thesis="The institution offers support, but timing and format put it out of reach for much of the cohort.",
         lead="Prep workshops, diagnostics, and advisors all exist. What fails is access: live-only sessions that conflict with class, tools that name a gap without a path to close it, and nothing recorded to return to.",
         q="The interview prep workshop was at 9am on a Friday and I had class. They need to record these.", src="Reddit r/NEU",
         close="Where it shows up: missed workshops, the unrehearsed first interview, and self-service debriefs on Reddit."),
    dict(num="04", name="The rules are revealed too late", lens="Stakeholder & Human", prev=4, prevband="Recurring",
         where="2025 NU Student Survey, r/NEU", sent="Anxious, then resigned",
         subs=["Opaque matching", "First-generation disadvantage", "Rules learned mid-decision"],
         tension="The highest-stakes decision gets the least preparation; insider knowledge substitutes for instruction the institution never gives.",
         thesis="Students make consequential decisions before anyone explains how the process actually works.",
         lead="The highest-stakes step, ranking and matching, is taught inside the event rather than before it. First-generation students with no insider knowledge are hit hardest, reconstructing the rules from peers mid-decision.",
         q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025",
         close="Where it shows up: the opaque match, guesswork rankings, and decisions made without informed consent."),
]
META = "All four themes are one story: students supply the effort, and the institution supplies a process that assumes help it cannot scale to deliver."
# 6-lens scan: the student-voice corpus concentrates on Operational & Process and
# Stakeholder & Human. Policy, Financial, Technology, and Strategic surfaced as context,
# not as standalone themes, so they are named here rather than forced into thin themes.
LENS_NOTE = "Six-lens scan: themes concentrate in Operational & Process and Stakeholder & Human, where the student-voice corpus is thickest. Policy, Financial, Technology, and Strategic signals appear as context, not as themes the evidence can carry alone."

CSS = """
.col-fig{font-size:36px!important;}
.th-name{font-family:var(--nxt-display);font-weight:600;font-size:17px;line-height:1.2;color:var(--nxt-ink);margin:7px 0 9px;text-wrap:balance;}
.th-thesis{display:block;font-size:13.5px;line-height:1.5;color:var(--nxt-ink);font-weight:300;margin-bottom:14px;text-wrap:pretty;}
.th-q{display:block;border-left:2px solid var(--acc);padding-left:12px;}
.th-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:12.5px;line-height:1.4;color:var(--nxt-ink-2);}
.th-q__s{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.04em;color:var(--acc);margin-top:5px;font-weight:600;}
.th-lens{display:inline-block;font-family:var(--nxt-mono);font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:var(--need);font-weight:600;border:1px solid var(--nxt-line);padding:2px 7px;margin-bottom:2px;}
.th-ps{display:flex;align-items:center;gap:10px;margin:11px 0 13px;}
.th-bar{display:flex;gap:3px;}
.th-bar i{display:inline-block;width:9px;height:8px;background:#D8D8CE;}
.th-bar i.on{background:var(--struct);}
.th-sent{font-family:var(--nxt-mono);font-size:8px;letter-spacing:.03em;text-transform:uppercase;color:var(--pain);font-weight:700;white-space:nowrap;}
/* detail dimensional panel */
.th-dims{display:grid;grid-template-columns:0.85fr 0.85fr 1.3fr;gap:34px;margin-top:26px;border-top:1px solid var(--nxt-line);padding-top:20px;}
.th-dim__l{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--nxt-muted);font-weight:600;margin-bottom:9px;}
.th-dim__v{display:block;font-size:13.5px;line-height:1.45;color:var(--nxt-ink);font-weight:300;}
.th-dim__where{display:block;font-size:11.5px;line-height:1.4;color:var(--nxt-mid);font-weight:300;margin-top:6px;}
.th-prevrow{display:flex;align-items:center;gap:10px;}
.th-sub{list-style:none;margin:0;padding:0;}
.th-sub li{font-size:13px;line-height:1.5;color:var(--nxt-ink);font-weight:300;padding-left:13px;position:relative;}
.th-sub li::before{content:"";position:absolute;left:0;top:9px;width:7px;height:1px;background:var(--acc);}
.th-tension{margin-top:22px;border-left:3px solid var(--pain);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:15px;line-height:1.5;color:var(--pain);max-width:106ch;}
.th-lensnote{margin-top:18px;font-size:12px;line-height:1.5;color:var(--nxt-muted);font-weight:300;font-style:italic;max-width:108ch;}
"""


def prev_bar(level):
    return '<span class="th-bar">' + "".join('<i class="on"></i>' if k < level else '<i></i>' for k in range(5)) + '</span>'


def ov_col(t, acc):
    return f"""<div class="col" style="--acc:{acc}">
  <div class="col-fig">{t['num']}</div>
  <span class="th-lens">{t['lens']}</span>
  <div class="th-name">{t['name']}</div>
  <span class="th-thesis">{t['thesis']}</span>
  <div class="th-ps">{prev_bar(t['prev'])}<span class="th-sent">{t['prevband']}</span></div>
  <span class="th-q"><span class="th-q__t">&ldquo;{t['q']}&rdquo;</span><span class="th-q__s">Source: {t['src']}</span></span>
</div>"""


def overview():
    cols = "\n".join(ov_col(t, K.ACCENTS[i]) for i, t in enumerate(T))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">What the Corpus Says</p>
  <h2 class="nxt-slide__title ov-title">Four themes that run through every account</h2>
  <div class="cols" style="grid-template-columns:repeat(4,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(META)}
  <p class="th-lensnote">{LENS_NOTE}</p>
</section>"""


def detail(t, acc):
    subs = "".join(f"<li>{s}</li>" for s in t['subs'])
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{acc}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Theme {t['num']} &middot; {t['lens']}</p>
  <h2 class="nxt-slide__title">{t['name']}</h2>
  <div class="dt-grid">
    <p class="dt-lead">{t['lead']}</p>
    {K.gtile_q(t['q'], t['src'])}
  </div>
  <div class="th-dims">
    <div><span class="th-dim__l">Prevalence</span><span class="th-prevrow">{prev_bar(t['prev'])}<span class="th-dim__v">{t['prevband']}</span></span><span class="th-dim__where">{t['where']}</span></div>
    <div><span class="th-dim__l">Sentiment</span><span class="th-dim__v">{t['sent']}</span></div>
    <div><span class="th-dim__l">Sub-themes</span><ul class="th-sub">{subs}</ul></div>
  </div>
  <p class="th-tension">The tension: {t['tension'][0].lower() + t['tension'][1:]}</p>
  <p class="dt-close">{t['close']}</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"themes-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("What the Corpus Says", "Four themes that run through every account of the first-year co-op search",
                            "Synthesized from student voice on r/NEU, the 2025 NU Student Survey, and Higher Ed Dive.")] \
             + [overview()] + [detail(t, K.ACCENTS[i]) for i, t in enumerate(T)] \
             + [K.frame_closing("The meta-theme", "Effort is not the gap. Scalable guidance is.",
                                "Every theme converges on the same root: a process that assumes help it cannot scale to deliver.")]
    K.write(f"themes-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] themes twins: human-named, evidence-backed, NU + NXT")
