#!/usr/bin/env python
"""Journey slide twins (NU + NXT) on slidekit, house style:
- larger readable text, clean wrapping (no orphan last-lines)
- ONE high-contrast graphite highlight per slide (through-line band on the overview;
  the primary verbatim quote on each phase detail), everything else clean editorial
- the single #slide overview carries one strong quote per phase for readability; both
  quotes per phase appear on the #slides detail."""
import slidekit as K

PH = [
    dict(num="01", goal="Produce a resume an employer will actually read.", name="Writing the first resume", weeks="Weeks 0-1",
         ctx="A first-year writes the most important document of the search with no experience, and the one advisor who could help is weeks out.",
         q1="I have no idea how to write a resume that an employer would actually look at.", s1="Reddit r/NEU",
         q2="I'm a first year and the co-op search is honestly terrifying.", s2="Reddit r/NEU",
         lead="In the first weeks a student faces the resume that everything else depends on, with no experience writing one. The advisor who could help is shared with about two hundred students, so feedback is weeks away if it comes at all.",
         fix="Give every student a guided first draft before they ever join the advisor queue."),
    dict(num="02", goal="Know which skills to build before applications open.", name="Finding out what's missing", weeks="Weeks 1-3",
         ctx="A diagnostic tells students which skills they lack, but not how to close the gap before applications open.",
         q1="It told me what I was missing but not how I was supposed to fix it before applications opened.", s1="Reddit r/NEU",
         q2="The tool aims to democratize access to institutional resources that previously depended on which advisor a student was assigned.", s2="Higher Ed Dive",
         lead="A readiness tool now shows students the skills employers want and where they fall short. What it does not give them is a way to close those gaps in the time they have, and how far they get still tracks which advisor they drew.",
         fix="Make the same readiness help reach every student, with a plan to close the gaps, not just a list of them."),
    dict(num="03", goal="Find and apply to co-ops that genuinely fit.", name="Applying everywhere at once", weeks="Weeks 3-6",
         ctx="With no way to filter the job board for fit, students apply in bulk and watch the rejections stack up with no sense of why.",
         q1="I applied to 60 co-ops and heard back from 4.", s1="Reddit r/NEU",
         q2="NUworks is a mess. There are thousands of postings and no good way to filter the ones that match my major.", s2="Reddit r/NEU",
         lead="The job board lists thousands of roles with no way to narrow to a student's major, so they apply to everything and hope. Most hear nothing back, and the rejections arrive as a pile with no pattern to learn from.",
         fix="Surface the jobs that fit a student's major first, and group the rejections so they show a pattern."),
    dict(num="04", goal="Walk into the interview prepared, not cold.", name="The first interview", weeks="Weeks 6-9",
         ctx="The only prep is a live session many students cannot attend, so the first real interview becomes the first rehearsal.",
         q1="I went into my first co-op interview having never done a mock interview and completely froze.", s1="Reddit r/NEU",
         q2="The interview prep workshop was at 9am on a Friday and I had class. They need to record these.", s2="Reddit r/NEU",
         lead="When the interview finally comes, most students have never practiced one. The workshop that would help is offered live, at a time that collides with class, and nothing is recorded, so they walk in cold and freeze.",
         fix="Record the workshops and add a practice interview students can run on their own time."),
    dict(num="05", goal="Rank well and secure the right co-op offer.", name="Ranking and the offer", weeks="Weeks 9-11",
         ctx="Students rank employers in a process no one explained, then sign an offer weeks after they began.",
         q1="I didn't understand how the matching process worked until I was already in it.", s1="NU Student Survey 2025",
         q2="My advisor is helpful but I can only get a 30 minute meeting every few weeks.", s2="Reddit r/NEU",
         lead="At the end, students rank employers in a matching process no one walked them through, piecing the rules together as they go. The advisor who might explain it is still thin on time at the moment that matters most.",
         fix="Teach how ranking and matching work before students have to do it."),
]
THROUGHLINE = "The same thing breaks at every step: a student hits a wall, and an advisor stretched across two hundred others is the only help on offer."

CSS = """
.col-fig{font-size:42px!important;}
.jname{font-family:var(--nxt-display);font-weight:600;font-size:17px;line-height:1.2;color:var(--nxt-ink);margin:8px 0 2px;min-height:46px;text-wrap:balance;}
.jweek{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--nxt-muted);margin-bottom:11px;}
.jgoal{display:grid;grid-template-columns:6px 1fr;column-gap:11px;margin-bottom:13px;}
.jgoal .gs{background:var(--need);}
.jgoal__l{display:block;font-family:var(--nxt-mono);font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--need);font-weight:600;margin-bottom:3px;}
.jgoal__t{display:block;font-size:12.5px;line-height:1.4;color:var(--need);font-weight:400;text-wrap:pretty;}
.jctx{display:block;font-size:13px;line-height:1.5;color:var(--nxt-mid);font-weight:300;margin-bottom:16px;text-wrap:pretty;}
.jd-goal{margin-top:18px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:18px;line-height:1.45;color:var(--need);}
.jq{display:block;border-left:2px solid var(--acc);padding-left:12px;}
.jq__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:13.5px;line-height:1.4;color:var(--nxt-ink-2);}
.jq__s{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.04em;color:var(--acc);margin-top:6px;font-weight:600;}
.jd-top{display:grid;grid-template-columns:1.05fr 0.95fr;gap:46px;margin-top:22px;align-items:start;}
.jd-lead{font-size:18px;line-height:1.62;color:var(--nxt-ink);font-weight:300;}
.jd-q2{display:block;border-left:3px solid var(--acc);padding-left:18px;margin-top:26px;max-width:60ch;}
.jd-q2__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.4;color:var(--nxt-ink-2);}
.jd-q2__s{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.05em;color:var(--acc);margin-top:8px;font-weight:600;}
.jd-fix{margin-top:26px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:18px;line-height:1.5;color:var(--need);max-width:88ch;}
"""


def ov_col(p, acc):
    return f"""<div class="col" style="--acc:{acc}">
  <div class="col-fig">{p['num']}</div>
  <div class="jname">{p['name']}</div>
  <div class="jweek">{p['weeks']}</div>
  <div class="jgoal"><div class="gs"></div><div><span class="jgoal__l">Goal</span><span class="jgoal__t">{p['goal']}</span></div></div>
  <span class="jctx">{p['ctx']}</span>
  <span class="jq"><span class="jq__t">&ldquo;{p['q1']}&rdquo;</span><span class="jq__s">Source: {p['s1']}</span></span>
</div>"""


def overview():
    cols = "\n".join(ov_col(p, K.ACCENTS[i]) for i, p in enumerate(PH))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">The First-Year Co-op Journey</p>
  <h2 class="nxt-slide__title ov-title">Eleven weeks from the first resume to a signed offer</h2>
  <div class="cols" style="grid-template-columns:repeat(5,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(THROUGHLINE)}
</section>"""


def detail(p, acc):
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{acc}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">{p['weeks']}</p>
  <h2 class="nxt-slide__title">{p['name']}</h2>
  <p class="jd-goal">The student's goal: {p['goal'][0].lower() + p['goal'][1:]}</p>
  <div class="jd-top">
    <p class="jd-lead">{p['lead']}</p>
    {K.gtile_q(p['q1'], p['s1'])}
  </div>
  <span class="jd-q2"><span class="jd-q2__t">&ldquo;{p['q2']}&rdquo;</span><span class="jd-q2__s">Source: {p['s2']}</span></span>
  <p class="jd-fix">{p['fix']}</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"journey-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("The First-Year Co-op Journey", "Eleven weeks from the first resume to a signed offer, in a first-year's own words",
                            "Five steps, reconstructed from what students actually said on r/NEU, the 2025 NU Student Survey, and Higher Ed Dive.")] \
             + [overview()] + [detail(p, K.ACCENTS[i]) for i, p in enumerate(PH)] \
             + [K.frame_closing("What it adds up to", "Students are not the problem. The missing help is.",
                                "At every step the effort is there; what is missing is guidance a single advisor cannot scale to.")]
    K.write(f"journey-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] journey twins retrofit: one graphite highlight/slide, larger text, clean, NU + NXT")
