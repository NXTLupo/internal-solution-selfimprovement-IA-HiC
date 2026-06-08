#!/usr/bin/env python
"""System-architecture slide twins (NU + NXT), per the tech-arch-generator skill
(C4-inspired node/flow model). A11y- and exporter-safe: the landscape is a CSS-GRID
of tiers (no SVG absolute coordinates, no connectors crossing node boxes, per the
graphic-collision bans). Every node is a named system the manifest verifies exists in
the corpus; the one broken link (CLR -> NUworks fit signal) is the honest gap.
Color is purposeful: teal = active/AI, red = the missing integration."""
import slidekit as K

# Tiers top-to-bottom: who uses it -> apps -> data of record -> external.
# Each node: (label, type, role, source). Manifest-verified names only.
TIERS = [
    ("People", [
        ("First-year student", "User", "Drives the whole search: drafts, applies, ranks", "Reddit r/NEU"),
        ("Co-op advisor", "User", "One advisor to a large cohort; the scarce human layer", "Reddit r/NEU"),
        ("Employer partner", "External", "Posts roles, interviews, ranks candidates", "NU Co-op materials"),
    ]),
    ("Applications", [
        ("NUworks", "Application", "Job board and matching portal; lists every role, no major filter", "NU Co-op materials"),
        ("Readiness tool", "Application", "Scores a resume against employer expectations; emerging", "NU First-Year Readiness"),
        ("Microsoft Copilot", "AI/ML", "The AI assist layer the strategy would scaffold guidance on", "Client direction"),
    ]),
    ("Systems of record", [
        ("Banner", "Database", "Student information: major, enrollment, course history", "NU IT"),
        ("Canvas", "Database", "Coursework and learning activity", "NU IT"),
        ("CLR", "Database", "Comprehensive Learner Record: verified skills and competencies", "CLR Project"),
    ]),
]
# Flows: (from, action, to, status). status active|planned|broken.
FLOWS = [
    ("First-year student", "Uploads a resume to draft and diagnose", "Readiness tool", "active"),
    ("Banner", "Supplies major and course history for fit", "Readiness tool", "active"),
    ("Readiness tool", "Hands a prepared draft to the advisor before the meeting", "Co-op advisor", "planned"),
    ("First-year student", "Applies, often in bulk, to listed roles", "NUworks", "active"),
    ("NUworks", "Sends applications to the employer's hiring system", "Employer partner", "active"),
    ("CLR", "Should rank NUworks roles by verified skill fit", "NUworks", "broken"),
    ("Microsoft Copilot", "Would generate drafts and explain the match", "Readiness tool", "planned"),
]
OVERVIEW_INSIGHT = "The systems already exist. What is missing is the one integration that would matter most: the verified skills in the CLR never reach NUworks to rank a student's roles by fit."

CSS = """
.col-fig{font-size:34px!important;}
.ar-tier{display:grid;grid-template-columns:135px 1fr;gap:0;margin-bottom:4px;}
.ar-lab{background:#ECECE4;display:flex;align-items:center;padding:0 16px;min-height:96px;}
.ar-lab span{display:block;width:100%;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--struct);font-weight:700;line-height:1.25;}
.ar-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
.ar-card{background:#F6F6F1;padding:13px 15px;min-height:96px;display:flex;flex-direction:column;justify-content:flex-start;border-top:3px solid var(--struct);}
.ar-card--ai{border-top-color:var(--need);}
.ar-card--ext{border-top-color:var(--nxt-muted);}
.ar-name{font-family:var(--nxt-display);font-weight:600;font-size:16px;line-height:1.15;color:var(--nxt-ink);}
.ar-type{display:block;font-family:var(--nxt-mono);font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:var(--nxt-muted);font-weight:600;margin:5px 0 7px;}
.ar-role{display:block;font-size:11.5px;line-height:1.4;color:var(--nxt-mid);font-weight:300;}
.ar-src{display:block;font-family:var(--nxt-mono);font-size:8px;letter-spacing:.03em;color:var(--need);font-weight:600;margin-top:auto;padding-top:7px;}
/* flows slide */
.fl{margin-top:22px;}
.fl-row{display:grid;grid-template-columns:1fr 1.5fr 1fr 110px;gap:22px;padding:14px 0;border-top:1px solid var(--nxt-line);align-items:center;}
.fl-row:first-of-type{border-top:0;}
.fl-node{font-family:var(--nxt-display);font-weight:600;font-size:14.5px;line-height:1.25;color:var(--nxt-ink);}
.fl-act{font-size:13px;line-height:1.45;color:var(--nxt-mid);font-weight:300;}
.fl-stat{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;}
.fl-stat--active{color:var(--need);}
.fl-stat--planned{color:var(--nxt-muted);}
.fl-stat--broken{color:var(--pain);}
"""

TYPE_CLS = {"AI/ML": "ar-card--ai", "External": "ar-card--ext"}


def card(label, typ, role, src):
    cls = "ar-card " + TYPE_CLS.get(typ, "")
    return f"""<div class="{cls.strip()}">
  <span class="ar-name">{label}</span><span class="ar-type">{typ}</span>
  <span class="ar-role">{role}</span><span class="ar-src">{src}</span>
</div>"""


def overview():
    tiers = ""
    for lab, nodes in TIERS:
        cards = "".join(card(*n) for n in nodes)
        tiers += f'<div class="ar-tier"><div class="ar-lab"><span>{lab}</span></div><div class="ar-cards">{cards}</div></div>'
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">System Architecture · First-Year Co-op</p>
  <h2 class="nxt-slide__title ov-title">The systems exist; the integration that would help students does not</h2>
  {tiers}
  {K.gband(OVERVIEW_INSIGHT)}
</section>"""


def flows_slide():
    rows = ""
    for frm, act, to, stat in FLOWS:
        rows += f"""<div class="fl-row">
      <span class="fl-node">{frm}</span>
      <span class="fl-act">{act}</span>
      <span class="fl-node">{to}</span>
      <span class="fl-stat fl-stat--{stat}">{stat}</span>
    </div>"""
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--need)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">System Architecture · Data Flows</p>
  <h2 class="nxt-slide__title">What moves between the systems, and what does not</h2>
  <div class="fl">{rows}</div>
  {K.gband('Two of the flows that would change the student experience are not built: the CLR fit signal into NUworks, and the Copilot drafting layer into the readiness tool.')}
</section>"""


def gaps_slide():
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--pain)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">System Architecture · The Critical Gap</p>
  <h2 class="nxt-slide__title">The missing link is integration, not a missing system</h2>
  <div class="dt-grid">
    <p class="dt-lead">Northeastern already runs every system a fitted, scaffolded co-op search would need: a job board, a readiness diagnostic, a verified skills record, and an enterprise AI layer. The failure is between them. The CLR holds verified skills but never ranks a student's NUworks roles by fit, so the board stays a flat list and students fall back on volume.</p>
    {K.gtile_q('I applied to 60 co-ops and heard back from 4.', 'Reddit r/NEU')}
  </div>
  <p class="dt-close">The architecture priority is not new software; it is the CLR-to-NUworks fit signal and the Copilot drafting layer, the two integrations that turn existing systems into help students can reach.</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"arch-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("System Architecture", "The first-year co-op technology landscape",
                            "A C4-style map of the systems behind the first-year search, the flows between them, and the one integration whose absence forces students into volume over fit. Every system is named from the corpus.")] \
             + [overview(), flows_slide(), gaps_slide()] \
             + [K.frame_closing("The architecture bet", "Integrate what exists before buying what does not.",
                                "The CLR fit signal and the Copilot drafting layer turn four working systems into a search students can actually navigate.")]
    K.write(f"arch-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] arch twins: C4 tier map + data flows + critical-gap, NU + NXT")
