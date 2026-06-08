#!/usr/bin/env python
"""Roadmap slide twins (NU + NXT), house style. A real roadmap, not three one-liners:
each horizon carries named initiatives, each with what ships, a success signal anchored
to TODAY's evidenced baseline (qualitative, no invented numbers; figures ride in quotes),
and an owner, plus sequencing logic and dependencies. One graphite highlight per slide."""
import slidekit as K

H = [
    dict(fig="Now", tf="This term", theme="Remove the first walls",
         inits=[
             dict(name="Resume co-pilot", tag="Scaled guidance", ships="A guided first-draft tool open to every first-year, before the advisor queue.",
                  when="A student reaches a usable first draft without waiting weeks for an advisor.", owner="Co-op + Readiness team"),
             dict(name="Match-literacy primer", tag="Rules before the stakes", ships="A short, required module on how ranking and matching work, before applications open.",
                  when="Students enter matching able to explain the rules, instead of learning them inside the event.", owner="Co-op + Registrar"),
         ],
         q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU",
         dep="Runs on what the institution already has; no new platform required.",
         done="No first-year drafts the resume blind, and none walks into matching uninformed."),
    dict(fig="Next", tf="Next term", theme="Replace volume with fit",
         inits=[
             dict(name="Major-fit discovery", tag="Fit over volume", ships="NUworks ranks roles by fit to a student's major and groups rejections into patterns.",
                  when="Students earn interviews from targeted applications, not bulk sends.", owner="NUworks product"),
             dict(name="On-demand practice", tag="Scaled guidance", ships="Recorded workshops plus a mock interviewer students can run anytime.",
                  when="No student's first practice interview is the real one.", owner="Career Center"),
         ],
         q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU",
         dep="Builds on the readiness habits established in Now.",
         done="Targeting replaces volume, and prep is reachable by everyone."),
    dict(fig="Later", tf="Next year", theme="Reclaim the advisor",
         inits=[
             dict(name="Advisor time reallocation", tag="Human where it counts", ships="With scaffolding carrying the routine questions, advisors concentrate on high-stakes, individual cases.",
                  when="Advisor hours shift from routine resume and process help to the cases only a person can handle.", owner="Co-op leadership"),
             dict(name="Readiness in the first-year course", tag="Scaled guidance", ships="Move resume, search, and matching literacy from optional tools into a required first-year experiential course.",
                  when="Readiness becomes a default of year one, not a scramble students opt into.", owner="Provost + Co-op"),
         ],
         q="My advisor is helpful but I can only get a 30 minute meeting every few weeks.", src="Reddit r/NEU",
         dep="Only possible once Now and Next are carrying the routine load.",
         done="The advisor is no longer the ceiling on what a first-year can get."),
]
VISION = "Every first-year reaches co-op as prepared as the reputation that recruited them."
SEQ = "Sequence by where the wall is highest: the first resume and the matching rules first, discovery and prep next, the advisor's scarce time last."

CSS = """
.col-fig{font-size:36px!important;}
.rm-vision{font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.45;color:var(--nxt-mid);margin:2px 0 14px;max-width:96ch;}
.rm-tag{display:inline-block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--need);font-weight:600;border:1px solid var(--nxt-line);padding:3px 8px;margin-bottom:9px;}
.rm-theme{font-family:var(--nxt-display);font-weight:600;font-size:17px;line-height:1.2;color:var(--nxt-ink);margin:6px 0 14px;text-wrap:balance;}
.rm-il{list-style:none;margin:0 0 18px;padding:0;}
.rm-il li{position:relative;padding:0 0 14px 16px;font-size:13.5px;line-height:1.5;color:var(--nxt-ink);font-weight:300;text-wrap:pretty;}
.rm-il li::before{content:"";position:absolute;left:0;top:10px;width:7px;height:1px;background:var(--acc);}
.rm-iname{font-weight:600;color:var(--nxt-ink);}
.rm-done-ov{display:block;border-left:3px solid var(--need);padding:5px 0 5px 16px;font-size:13.5px;line-height:1.5;color:var(--need);font-weight:400;font-style:italic;text-wrap:pretty;}
/* detail */
.rm-grid{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin-top:24px;}
.rm-name{font-family:var(--nxt-display);font-weight:600;font-size:18px;color:var(--nxt-ink);margin:0 0 9px;}
.rm-ships{display:block;font-size:15px;line-height:1.55;color:var(--nxt-ink);font-weight:300;margin-bottom:11px;}
.rm-when{display:block;font-size:13.5px;line-height:1.5;color:var(--need);font-weight:400;}
.rm-owner{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--nxt-muted);font-weight:600;margin-top:11px;}
.rm-bottom{display:grid;grid-template-columns:0.95fr 1.05fr;gap:44px;margin-top:26px;align-items:start;}
.rm-done{font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.5;color:var(--need);border-left:3px solid var(--need);padding:4px 0 4px 18px;}
.rm-dep{display:block;font-size:13px;line-height:1.5;color:var(--nxt-muted);font-weight:300;margin-top:12px;}
"""


def ov_col(h, acc):
    inits = "".join(f'<li>{i["ships"]}</li>' for i in h["inits"])
    return f"""<div class="col" style="--acc:{acc}">
  <div class="col-fig">{h['fig']}</div>
  <div class="ov-sub">{h['tf']}</div>
  <div class="rm-theme">{h['theme']}</div>
  <ul class="rm-il">{inits}</ul>
  <span class="rm-done-ov">You will know this horizon is done when {h['done'][0].lower() + h['done'][1:]}</span>
</div>"""


def overview():
    cols = "\n".join(ov_col(h, K.ACCENTS[i]) for i, h in enumerate(H))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">The Roadmap</p>
  <h2 class="nxt-slide__title ov-title">Now, next, and later, in the order the walls appear</h2>
  <p class="rm-vision">Vision: {VISION}</p>
  <div class="cols" style="grid-template-columns:repeat(3,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(SEQ)}
</section>"""


def initiative(i):
    return f"""<div>
  <span class="rm-tag">{i['tag']}</span>
  <p class="rm-name">{i['name']}</p>
  <span class="rm-ships">{i['ships']}</span>
  <span class="rm-when">You will know it is working when {i['when'][0].lower() + i['when'][1:]}</span>
  <span class="rm-owner">Owner &middot; {i['owner']}</span>
</div>"""


def detail(h, acc):
    inits = "".join(initiative(i) for i in h["inits"])
    grid_cols = "1fr 1fr" if len(h["inits"]) > 1 else "1fr"
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{acc}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">{h['tf']}</p>
  <h2 class="nxt-slide__title">{h['fig']}: {h['theme']}</h2>
  <div class="rm-grid" style="grid-template-columns:{grid_cols};">{inits}</div>
  <div class="rm-bottom">
    {K.gtile_q(h['q'], h['src'])}
    <div><p class="rm-done">{h['done']}</p><span class="rm-dep">{h['dep']}</span></div>
  </div>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"roadmap-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("The Roadmap", "Now, next, and later, in the order the walls appear",
                            "Each horizon closes a specific, evidenced gap in the first-year search, with named initiatives, an owner, and a success signal measured against today, not an invented target.")] \
             + [overview()] + [detail(h, K.ACCENTS[i]) for i, h in enumerate(H)] \
             + [K.frame_closing("Where it ends", "The advisor stops being the ceiling.", "When scaffolding carries the routine, scarce human time goes to the students who need it most.")]
    K.write(f"roadmap-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] roadmap twins: initiatives + success signals + owners + dependencies, NU + NXT")
