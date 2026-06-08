#!/usr/bin/env python
"""Personas slide twins, BOTH brands. Behavioral personas (Cooper): named by
defining behavior; full dimensional profile. HIGH-CONTRAST USED SPARINGLY: exactly
one graphite highlight per slide (the verbatim quote on detail, the synthesis band
on the overview). Everything else clean editorial on white, accent labels, large
readable text, generous spacing."""
import slidekit as K

P = [
    dict(num="01", life="Prove that inexperience will not cost her the co-op that defines the place.", exp="To feel prepared instead of guessing her way through.", end="A resume an employer will actually read, submitted on time.", jtbd="When I face the first resume, I want guided structure, so I can produce something employer-ready without prior experience.", name="The Blind Drafter", tag="I'll figure out the resume myself. I have to.",
         defines="Improvises the resume rather than wait weeks for help.",
         context="First-year, no professional network to borrow from",
         behaves=["Starts the resume alone rather than wait for help", "Reverse-engineers a format from peers' screenshots", "Books an advisor slot but keeps moving without it"],
         wants=["A resume an employer will actually read", "To feel she is not already falling behind"],
         driven=["Will not let inexperience be why she misses the co-op that defines the place"],
         frustrated=["No idea what an employer wants to see", "An advisor shared with ~200 students, weeks away", "Never sure her guess is right"],
         needs=["A guided first draft on demand", "Examples of what good actually looks like", "Feedback that does not wait on the advisor queue"],
         scenario="It is week one. She opens a blank document, then a second tab with three friends' resumes to copy the shape. Her advisor meeting is seventeen days out, so she guesses and submits anyway.",
         q="I have no idea how to write a resume that an employer would actually look at.", src="Reddit r/NEU"),
    dict(num="02", life="To believe the system rewards effort, not just luck or connections.", exp="To feel his effort is finally converting into something.", end="One real interview that turns into an offer.", jtbd="When I search for co-ops, I want to know which roles fit me, so I can stop trading effort for silence.", name="The Volume Applicant", tag="If I just send enough, one of them has to land.",
         defines="Applies in bulk because nothing helps him aim.",
         context="Competitive major, no way to gauge fit",
         behaves=["Applies in bulk rather than target", "Keeps a running count of rejections", "Refreshes the inbox more than the job board"],
         wants=["One real interview", "To feel the effort is finally paying off"],
         driven=["Believes effort should convert, and volume is the only effort he controls"],
         frustrated=["No filter for major-fit on the board", "Dozens of applications for a single reply", "Rejections arrive as a pile with no pattern"],
         needs=["Roles ranked by how well they fit", "A reason behind each rejection", "A way to aim instead of carpet-bomb"],
         scenario="By week five he has sent his applications in batches between classes. The replies are rejections and they blur together. He cannot name one thing he is doing wrong, so he sends more.",
         q="I applied to 60 co-ops and heard back from 4.", src="Reddit r/NEU"),
    dict(num="03", life="To prove she belongs once she is finally given the chance.", exp="To feel rehearsed and steady, not ambushed.", end="To walk into the interview having practiced, and not freeze.", jtbd="When an interview is scheduled, I want a low-stakes way to practice, so I can walk in ready.", name="The Unrehearsed Performer", tag="I'll be fine once I'm in the room. I think.",
         defines="Meets the first interview having never practiced.",
         context="Schedule collides with the only prep session",
         behaves=["Plans to prep, then cannot reach the session", "Walks in cold rather than move the interview", "Processes it afterward on Reddit, alone"],
         wants=["To not freeze in the interview", "To feel prepared, not ambushed"],
         driven=["Wants to prove she belongs once she is finally given the chance"],
         frustrated=["The only workshop is live and conflicts with class", "Nothing is recorded to catch up on", "The first real interview is the first rehearsal"],
         needs=["Practice on her own time", "Recorded sessions she can learn from", "A low-stakes rehearsal before it counts"],
         scenario="The workshop is 9am Friday and she has class, so she tells herself she will wing it. In the interview the first hard question lands, she goes blank, and replays it for hours that night.",
         q="I went into my first co-op interview having never done a mock interview and completely froze.", src="Reddit r/NEU"),
    dict(num="04", life="To navigate a system her family never did, without a costly misstep.", exp="To feel in control of a consequential choice.", end="To rank employers in a way that does not backfire.", jtbd="When matching opens, I want the rules explained first, so I can decide instead of guess.", name="The Rule-Blind Decider", tag="I didn't even know there were rules until I was in it.",
         defines="Ranks employers without knowing how matching works.",
         context="First-generation, no insider knowledge to fall back on",
         behaves=["Decides without a map of how the process works", "Reconstructs the rules from peers mid-decision", "Picks what seems safe over what seems optimal"],
         wants=["To rank in a way that does not backfire", "To feel in control of a consequential choice"],
         driven=["Carries the weight of being first in the family to do this"],
         frustrated=["Matching rules surface only inside the event", "The advisor is out of time at the decisive moment", "No family playbook to fall back on"],
         needs=["The rules explained before the match", "A plain-language primer on ranking", "Someone to sanity-check the call"],
         scenario="Matching opens and she is asked to rank employers using logic no one explained. She messages two upperclassmen, screenshots their advice, and submits a ranking she is not sure she understands.",
         q="I didn't understand how the matching process worked until I was already in it.", src="NU Student Survey 2025"),
]
SEGMENT = "They are not four people but four behaviors. Most first-years move through all four; the search breaks them wherever the scaffold is missing."

CSS = """
.pcol-fig{font-family:var(--nxt-display);font-size:40px;line-height:1;color:var(--struct);margin:8px 0 6px;}
.ov-name{font-family:var(--nxt-display);font-weight:600;font-size:17px;line-height:1.2;color:var(--nxt-ink);min-height:48px;margin-bottom:8px;text-wrap:balance;}
.ov-def{display:block;font-size:13.5px;line-height:1.5;color:var(--nxt-ink);font-weight:300;margin-bottom:18px;text-wrap:pretty;}
/* color-spined blocks: a 4px filled spine anchors each block AND encodes meaning
   (red = pain, teal = need). The spine is a filled element so it renders in PPTX. */
.ablock{display:grid;grid-template-columns:6px 1fr;column-gap:14px;margin-bottom:18px;}
.ablock .spine{min-height:100%;}
.ab-pain .spine{background:var(--pain);}
.ab-need .spine{background:var(--need);}
.alab{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;margin:0 0 8px;white-space:nowrap;}
.ab-pain .alab{color:var(--pain);}
.ab-need .alab{color:var(--need);}
.alist{list-style:none;margin:0;padding:0;}
.alist li{position:relative;padding:0 0 9px 0;font-size:12.5px;line-height:1.45;font-weight:300;}
.alist li:last-child{padding-bottom:0;}
.ab-pain .alist li{color:var(--pain);}
.ab-need .alist li{color:var(--need);}
.ov-q{display:block;margin-top:4px;}
.ov-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:13px;line-height:1.4;color:var(--nxt-ink-2);}
.ov-q__s{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.04em;color:var(--nxt-muted);margin-top:5px;font-weight:600;}
/* detail — full Cooper profile */
.pf-tag{font-family:var(--nxt-display);font-style:italic;font-size:21px;line-height:1.3;color:var(--struct);margin:2px 0 0;}
.pf-jtbd{margin-top:16px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.45;color:var(--need);max-width:104ch;}
.pf-cols{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:24px;align-items:start;}
.pf-h{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--struct);margin:0 0 11px;}
.pf-h--pain{color:var(--pain);}
.pf-h--mt{margin-top:22px;}
.pf-scn2{font-size:14px;line-height:1.6;color:var(--nxt-mid);font-weight:300;margin-bottom:6px;}
.goal{margin-bottom:13px;}
.goal__k{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--need);font-weight:600;margin-bottom:2px;}
.goal__t{display:block;font-size:13.5px;line-height:1.45;color:var(--nxt-ink);font-weight:300;}
.plist{list-style:none;margin:0;padding:0;}
.plist li{position:relative;padding:0 0 8px 14px;font-size:13.5px;line-height:1.45;color:var(--nxt-ink);font-weight:300;}
.plist li:last-child{padding-bottom:0;}
.plist li::before{content:"";position:absolute;left:0;top:9px;width:6px;height:1px;background:var(--struct);}
.plist--pain li{color:var(--pain);}
.plist--pain li::before{background:var(--pain);}
.pf-need{margin-top:22px;border-left:3px solid var(--need);padding:5px 0 5px 18px;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.5;color:var(--need);max-width:104ch;}
"""


def li(items):
    return "".join(f"<li>{x}</li>" for x in items)


def ov_col(p, acc):
    return f"""<div class="col">
  <div class="pcol-fig">{p['num']}</div>
  <div class="ov-name">{p['name']}</div>
  <span class="ov-def">{p['defines']}</span>
  <div class="ablock ab-pain"><div class="spine"></div><div><span class="alab">What frustrates them</span><ul class="alist">{li(p['frustrated'][:2])}</ul></div></div>
  <div class="ablock ab-need"><div class="spine"></div><div><span class="alab">What they need</span><ul class="alist">{li(p['needs'][:2])}</ul></div></div>
  <span class="ov-q"><span class="ov-q__t">&ldquo;{p['q']}&rdquo;</span><span class="ov-q__s">Source: {p['src']}</span></span>
</div>"""


def overview():
    cols = "\n".join(ov_col(p, K.ACCENTS[i]) for i, p in enumerate(P))
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Behavioral Personas</p>
  <h2 class="nxt-slide__title ov-title">Four behaviors the co-op search breaks</h2>
  <div class="cols" style="grid-template-columns:repeat(4,minmax(0,1fr));">
{cols}
  </div>
  {K.gband(SEGMENT)}
</section>"""


def goal(k, t):
    return f'<div class="goal"><span class="goal__k">{k}</span><span class="goal__t">{t}</span></div>'


def detail(p, acc):
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:{acc}">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">{p['context']}</p>
  <h2 class="nxt-slide__title">{p['name']}</h2>
  <p class="pf-tag">&ldquo;{p['tag']}&rdquo;</p>
  <p class="pf-jtbd">{p['jtbd']}</p>
  <div class="pf-cols">
    <div>
      <span class="pf-h">A day in the life</span>
      <p class="pf-scn2">{p['scenario']}</p>
      <span class="pf-h pf-h--mt">Goals (Cooper hierarchy)</span>
      {goal('End goal', p['end'])}
      {goal('Experience goal', p['exp'])}
      {goal('Life goal', p['life'])}
    </div>
    <div>
      {K.gtile_q(p['q'], p['src'])}
      <span class="pf-h pf-h--mt">How they behave</span>
      <ul class="plist">{li(p['behaves'])}</ul>
      <span class="pf-h pf-h--pain pf-h--mt">What frustrates them</span>
      <ul class="plist plist--pain">{li(p['frustrated'])}</ul>
    </div>
  </div>
  <p class="pf-need">What would help: {'; '.join(x[0].lower() + x[1:] for x in p['needs'])}.</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"personas-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Behavioral Personas", "Four behaviors the first-year co-op search breaks",
                            "Named by what each student does, not who they are. Most first-years pass through all four; the search fails them wherever the scaffold is missing.")] \
             + [overview()] + [detail(p, K.ACCENTS[i]) for i, p in enumerate(P)] \
             + [K.frame_closing("What it means", "Fix the behavior the scaffold fails, not the student.",
                                "Each behavior is rational given what students are handed. Change the support and the behavior changes with it.")]
    K.write(f"personas-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] personas: one graphite highlight per slide (quote/band), rest clean, NU + NXT")
