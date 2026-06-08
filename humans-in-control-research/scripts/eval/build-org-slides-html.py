#!/usr/bin/env python
"""Org-chart slide twins (NU + NXT), per the tech-arch-generator / org-illustrator
contract. A11y- and exporter-safe: a CSS-GRID reporting tree, NOT SVG with absolute
coordinates. Connectors are a hairline bus (border-top, which the measured exporter
renders) plus short filled drop-bars that terminate at box edges, never crossing a
node (graphic-collision bans). Roles are manifest-evidenced (advisor, co-op leadership,
career center, registrar); the two named stakeholders (Liz, Jen) are placed as the
co-op initiative leads. REPRESENTATIVE content: the real generator fills actual names
and reporting lines from uploaded client docs (org is evidence-sensitive)."""
import slidekit as K

# Reporting tree. L1 = program leadership; L2 = three function leads (two named
# stakeholders + employer engagement); L3 = the delivery roles under each.
L1 = dict(role="Co-op & Experiential Learning", who="Program leadership", remit="Owns the first-year co-op outcome end to end")
L2 = [
    dict(role="Co-op Advising", who="Liz", remit="Leads the advisor team that guides students through search and matching"),
    dict(role="Career Readiness", who="Jen", remit="Owns the readiness tooling and the resume and interview prep path"),
    dict(role="Employer Engagement", who="Partnerships", remit="Cultivates the employer roles students match into"),
]
L3 = [
    dict(role="Co-op advisors", who="One advisor to a large cohort", remit="The scarce human layer the strategy aims to reclaim"),
    dict(role="Readiness specialists", who="Career Center", remit="Run the workshops and the diagnostic the tool will scale"),
    dict(role="Registrar liaison", who="Registrar", remit="Connects matching rules and records to the student path"),
]
NOTE = "Two stakeholders own the fix: Liz on the advising side and Jen on readiness. The advisor layer beneath them is where scarcity bites, and where reclaimed time has to land."

CSS = """
.org{display:grid;grid-template-columns:repeat(3,1fr);gap:0 22px;margin-top:18px;}
.org-l1{grid-column:2;}
.org-box{background:#F6F6F1;border-top:3px solid var(--struct);padding:13px 16px;min-height:92px;display:flex;flex-direction:column;}
.org-box--lead{border-top-color:var(--need);}
.org-role{font-family:var(--nxt-display);font-weight:600;font-size:16px;line-height:1.15;color:var(--nxt-ink);}
.org-who{display:block;font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--need);font-weight:700;margin:5px 0 7px;}
.org-remit{display:block;font-size:11.5px;line-height:1.4;color:var(--nxt-mid);font-weight:300;}
/* connectors: a hairline bus (border-top renders in the exporter) + filled drops */
.org-drop{grid-column:2;display:flex;justify-content:center;height:16px;}
.org-drop i{width:6px;height:16px;background:var(--nxt-line);}
.org-bus{grid-column:1 / -1;border-top:1px solid var(--nxt-line);height:0;margin:0 16%;}
.org-drops{grid-column:1 / -1;display:grid;grid-template-columns:repeat(3,1fr);gap:0 22px;height:16px;}
.org-drops div{display:flex;justify-content:center;}
.org-drops i{width:6px;height:16px;background:var(--nxt-line);}
.org-rowgap{grid-column:1 / -1;height:6px;}
"""


def box(d, lead=False):
    cls = "org-box org-box--lead" if lead else "org-box"
    return f'<div class="{cls}"><span class="org-role">{d["role"]}</span><span class="org-who">{d["who"]}</span><span class="org-remit">{d["remit"]}</span></div>'


def drops3():
    return '<div class="org-drops"><div><i></i></div><div><i></i></div><div><i></i></div></div>'


def overview():
    l2 = "".join(box(d) for d in L2)
    l3 = "".join(box(d) for d in L3)
    grid = (
        f'<div class="org-l1">{box(L1, lead=True)}</div>'
        f'<div class="org-drop"><i></i></div>'
        f'<div class="org-bus"></div>{drops3()}'
        f'{l2}'
        f'<div class="org-rowgap"></div>'
        f'<div class="org-bus"></div>{drops3()}'
        f'{l3}'
    )
    return f"""<section class="nxt-slide nxt-slide--flow">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Org Chart · Co-op Program</p>
  <h2 class="nxt-slide__title ov-title">Who owns the first-year co-op outcome, and where scarcity bites</h2>
  <div class="org">{grid}</div>
  {K.gband(NOTE)}
</section>"""


def stakeholders_slide():
    return f"""<section class="nxt-slide nxt-slide--flow" style="--acc:var(--need)">{K.rail()}{K.wordmark('ink')}
  <p class="nxt-slide__kicker">Org Chart · The Named Owners</p>
  <h2 class="nxt-slide__title">The fix has two owners and one pressure point</h2>
  <div class="dt-grid">
    <p class="dt-lead">Co-op advising and career readiness are led by two distinct stakeholders, Liz and Jen. Both depend on the same layer beneath them: a co-op advising team stretched across a large cohort. The strategy reclaims that team's time by scaling the routine, so the named owners can spend it on the students who need a person.</p>
    {K.gtile_q('My advisor is helpful but I can only get a 30 minute meeting every few weeks.', 'Reddit r/NEU')}
  </div>
  <p class="dt-close">Every recommendation lands on one of these two owners; the advisor layer is the shared dependency that determines whether any of it reaches students.</p>
</section>"""


for b in ("nu", "nxt"):
    K.set_brand(b)
    K.write(f"org-{b}-slide.html", K.doc(overview(), CSS, brand=b))
    frames = [K.frame_title("Org Chart", "Who owns the first-year co-op outcome",
                            "The reporting structure behind the first-year search, the two named function leads, and the advisor layer where scarcity concentrates. Roles are evidenced; named individuals are representative pending client org data.")] \
             + [overview(), stakeholders_slide()] \
             + [K.frame_closing("Why the org matters", "Reclaimed advisor time has to land somewhere.",
                                "The structure decides whether scaled guidance frees the advisor layer or just adds another tool above it.")]
    K.write(f"org-{b}-slides.html", K.doc("\n".join(frames), CSS, brand=b))
print("[wrote] org twins: CSS-grid reporting tree + named owners, NU + NXT")
