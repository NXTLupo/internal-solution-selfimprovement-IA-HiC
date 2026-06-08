#!/usr/bin/env python
"""Wire the GOLD visual language into every deliverable skill (#2 of the unification goal).
Appends a uniform '## Visual Output (GOLD design language)' section to each skill that
points at the shared spec (gold-visual-language.md) + the skill's specific gold twin(s) +
2-3 deliverable-specific layout notes. Idempotent: skips a skill that already has the section."""
import pathlib

SKILLS = pathlib.Path(__file__).resolve().parents[3] / ".claude/skills"
MARKER = "## Visual Output (GOLD design language)"
SPEC = "hic-workspace/wiki/design-system/gold-visual-language.md"

# skill -> (gold bases, layout notes)
MAP = {
    "persona-architect": (["personas", "persona-detail"],
        "Roster slide: column per behavior (num + name + phase line + colored frustration/need blocks, "
        "color carries pain vs need, NO eyebrow labels) + a journey strip showing where each peaks. "
        "Detail slide: A DAY IN THE LIFE, GOALS (COOPER HIERARCHY), behaviors, frustration block."),
    "theme-analyst": (["themes"],
        "Column per theme: num + name + thesis + prevalence (DOMINANT/RECURRING) + sentiment + sub-themes + "
        "verbatim quote with SOURCE. Tension line per theme. Six-lens scan note."),
    "strategy-author": (["strategy"],
        "Kernel band: THE DIAGNOSIS (accent) + THE GUIDING POLICY (cool) as an explicit X-over-Y trade-off. "
        "Five coherent-action columns: num + name + mechanism + GAP/US trace + proof point (cool left-border)."),
    "competitive-analyst": (["competitive"],
        "Named-peer benchmark matrix (dimensions x NAMED peers); qualitative cells (LEADER cool, STRONG, "
        "PARTIAL, NONE, GAP accent, 'No signal' italic). Gap-summary takeaway names the real competitive gap."),
    "gap-analysis-evaluator": (["gap"],
        "Column per gap: GAP-id + num + title + severity chip (HIGH/CRITICAL) + sevwhy + maturity track "
        "(AD HOC..OPTIMIZED, TODAY square + TARGET square by %) + mechanism + evid box + quote with SOURCE."),
    "roadmap-builder": (["roadmap"],
        "Vision line under h1. Three horizon columns (NOW/NEXT/LATER); >=2 initiatives each with mechanism, "
        "GAP/US trace + WEEKS, owner, and a proof/success signal. Sequencing in the takeaway."),
    "prd-compiler": (["prd", "prd-detail"],
        "Overview: user-story columns (num + story + persona + ACCEPTANCE + SUCCESS METRIC, those two labels "
        "KEPT). Detail: one story with Given/When/Then, MoSCoW, success metric table (baseline/target/guardrail)."),
    "recommendation-architect": (["recommendations"],
        "DEFENSIBLE CONSENSUS row then NON-OBVIOUS BETS row; columns: num + name + mechanism + GAP/US trace + "
        "verbatim quote with SOURCE. Bets visually distinct (cool top-border)."),
    "service-blueprint-mapper": (["blueprint", "journey"],
        "5-lane Bitner grid x phases (TOUCHPOINTS/STUDENT ACTIONS/FRONTSTAGE/BACKSTAGE/SUPPORT lanes KEPT, "
        "lines of interaction/visibility as dark bands); SVG emotion curve row with named emotions; fail cells "
        "(fail tint + accent why with square marker). Journey: per-phase goal + 2 pains + throughline."),
    "deck-narrative-composer": (["presentation"],
        "Deck cover + narrative-arc agenda: column/grid of the 8-move story, each a finding-title block. "
        "Every slide in the deck is itself a GOLD slide; the deck reads from titles alone."),
    "tech-audit-inspector": (["audit"],
        "Systems inventory table: SYSTEM (serif) | CATEGORY | STATUS (ACTIVE cool / GAP accent) | RISK "
        "(accent-bold on the failure phrase). Takeaway names the consolidation opportunity."),
    "tech-arch-generator": (["arch", "org"],
        "Arch: CSS-grid C4 tiers (People/Applications/Systems of record) with named nodes, flow connectors "
        "routed around boxes, the missing edge in accent-dashed. Org: CSS-grid reporting tree (hairline bus + "
        "drop connectors, terminate at box edges); NEVER SVG absolute coords."),
    "mind-map-architect": (["mindmap"],
        "Central hub (cool top-border) + hairline bus + drops to 4-5 branch nodes (accent top-border), each "
        "with 3 leaf items. Click-to-chat note in takeaway. CSS grid, no SVG absolute coords."),
    "strategic-report-writer": (["report"],
        "Multi-panel structure (DIAGNOSIS / FINDINGS / RECOMMENDATIONS / NEXT STEPS), each a top-bordered "
        "panel with a titled list. First panel accent border, last panel cool border."),
    "meta-themes": (["meta-themes"],
        "Column per portfolio pattern: num + recurrence tag (RECURS ACROSS N ENGAGEMENTS / PLATFORM PATTERN) + "
        "name + mechanism. Takeaway names the platform pattern."),
    "brief-dialog": (["brief-dialog"],
        "Two-voice transcript: SKEPTICAL PARTNER (accent) vs CURIOUS STRATEGIST (cool), turns on hairline "
        "rows, embedded verbatim quote in mono. Takeaway states the concession + final stance."),
    "html-deliverable-composer": (["brief", "explainer", "approaches"],
        "Brief: hero finding (accent left-border) + 3 supporting findings + copy-as-prompt footer. "
        "Explainer: horizontal flow steps (cool top-borders) + the gotcha (accent left-border). "
        "Approaches: CONSENSUS row + BETS row of pick-when cards."),
    "research-planner": (["research-plan"],
        "Plan meta row (budget cap, max iterations, reflection, human gate). Sub-question rows: big numeral + "
        "question (serif) + source strategy. Takeaway states the human-in-control plan-edit gate."),
}

SECTION = """

{marker}

Render to the canonical GOLD visual language. Full spec: `{spec}`.
Your reference twin(s): {twins} in `hic-workspace/wiki/design-system/gold/`.

Layout: {notes}

Invariants (from the spec): 1920x1080 stage, brand rail + 3x3 dot mark, IBM Plex Mono kicker,
serif(NU)/Archivo(NXT) action-title h1, dark takeaway band with exactly one accent-bold phrase.
Color is meaning (accent = pain/critical/diagnosis; cool = need/target/fix/source; neutral = structure).
NO eyebrow microlabels that color/position already convey (WHAT FRUSTRATES THEM, WHAT THEY NEED,
DESIGN RESPONSE, PROOF IT WORKED, PEAKS). NO em-dash. Content is data-dependent; the language is fixed.
"""

done = 0
for skill, (bases, notes) in MAP.items():
    p = SKILLS / skill / "SKILL.md"
    if not p.exists():
        print(f"  MISSING skill: {skill}")
        continue
    text = p.read_text(encoding="utf-8")
    if MARKER in text:
        print(f"  skip (already wired): {skill}")
        continue
    twins = ", ".join(f"`{b}-nu.html` / `{b}-nxt.html`" for b in bases)
    p.write_text(text.rstrip() + SECTION.format(marker=MARKER, spec=SPEC, twins=twins, notes=notes),
                 encoding="utf-8")
    print(f"  wired: {skill} -> {', '.join(bases)}")
    done += 1
print(f"[done] wired GOLD visual language into {done} skills")
