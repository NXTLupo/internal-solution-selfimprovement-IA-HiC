---
name: journey-illustrator
description: Journey map (CURRENT-state) illustrator. Frames stages as observed today, pain points as evidenced friction. Authoritative spec for layout — NU and NXT brand exemplars carry only color/typography differences; structural rules are identical for both brands.
---

# Journey map (current-state) illustrator

## Framing
This is the **as-is** workflow. Pain points are real, observed, evidenced from the corpus. Opportunities are noted but not yet committed. Lane labels reflect today's actors and process. Narrative is descriptive.

## Brand consistency rule (MUST READ)
The structural rules below apply IDENTICALLY to #NU and #NXT journeys. The brand exemplar (NU vs NXT) controls ONLY color palette, font family, atmospheric overlays, and seal/wordmark suppression. It does NOT control content layout. If your output's layout differs between brands, you have violated this skill.

---

## 1. Canvas, frame, and safe area

- Artboard is **1920 × 1080**, locked. Nothing may extend past those bounds.
- Safe area is **80px on every side**. No content of any kind crosses the safe area.
- Apply a **12-column grid** with **24px gutters** and **80px outer margins**. Every element snaps to columns 1–12.
- Three horizontal bands, hard boundaries:
  - **Header band** — top edge to y=240 (rows 0–240)
  - **Journey band** — y=240 to y=880 (640px tall)
  - **Synthesis band** — y=880 to y=1080 (200px tall)
- Content lives strictly inside its band. Nothing floats between bands. Nothing overlaps a band boundary.
- If any element risks overflow, shrink type within the type-role limits below before resizing the container.

---

## 2. Title and headline system

- The title sits in **columns 1–9** of the header band.
- Title type auto-sizes between **40px and 64px** to fit a maximum of **3 lines**.
- If the title cannot fit at 40px in 3 lines, the writer must shorten the title — never the layout.
- Eyebrow above title: **uppercase, tracked, 10–12px**, with type indicator (e.g. `JOURNEY MAP · CURRENT STATE`). The eyebrow self-identifies the artifact.
- Reserve **columns 10–12 exclusively** for the right-rail descriptive paragraph (see §3). Title never crosses into columns 10–12.
- Title is a **complete action-title sentence** stating a finding with data when possible. NOT a topic phrase.

---

## 3. Right-rail paragraph (the descriptive subhead)

- Container: **columns 10–12**, top-aligned to the title baseline.
- Type: **14–16px**, line-height **1.5**, max **8 lines**.
- **Line length: 45–65 characters per line.** Non-negotiable. Anything below 45 produces a vertical river that is unreadable.
- If the paragraph won't fit in 8 lines at minimum 14px:
  - **Option A**: move it below the title as a full-width subdeck spanning columns 1–9.
  - **Option B**: truncate at a clean clause boundary and link to an appendix.
  - Author chooses; never narrow the column further.

---

## 4. Negative space and visual balance

- The journey diagram occupies the **full horizontal width of the safe area** (columns 1–12) within the journey band.
- The upper-left quadrant of the canvas must hold something purposeful. Acceptable contents:
  - A key-findings callout
  - An emotion-arc preview
  - A persona summary
  - Intentional whitespace anchored by a horizontal rule that gives the eye a stopping point
- **No quadrant of the canvas may be more than 50% empty without an explicit design reason** (e.g. a deliberate breathing zone above a dense diagram, anchored by a rule).

---

## 5. Swimlane structure

- **Every persona lane runs the full width of the journey band** — even when the persona is inactive in some phases.
  - Inactive segments: 30%-opacity **dashed** line.
  - Active segments: 100%-opacity **solid** line.
  - This prevents orphaned line fragments and signals presence-vs-activity clearly.
- **Maximum 4 persona lanes.** Beyond 4, group secondary actors or split into a second map.
- **Maximum 6 phase columns.** Most journeys work at 3–5 phases.
- Phase header anatomy is identical for every phase:
  1. Eyebrow: `PHASE 0X · WK YY-ZZ` (or other time/stage marker)
  2. Phase name
  3. System callouts beneath
- **Exactly one phase may be visually emphasized** as the focal phase. Use a single signal — tinted background OR italic OR underline, not all three. Default: tinted background only. Multiple emphasized phases = error.

---

## 6. Touchpoint node system

- Touchpoint IDs (e.g. `S-01`, `A-02`, `E-01`):
  - If referenced elsewhere (appendix, research database, follow-up artifacts), they must be **legible — minimum 9px, sufficient contrast, positioned consistently below each node**.
  - If not referenced, **remove them**. Decorative IDs are noise.
- Node states (vocabulary the template provides — author chooses one per node):
  - **Standard**: open circle
  - **Friction point**: filled rust/warning fill
  - **Moment of truth**: filled accent, larger
  - **Handoff**: split circle between lanes
- Touchpoint labels: **max 2 lines, max ~50 characters, 11–12px**. Anything longer goes into an appendix.
- Activity labels are **complete sentences with subject + verb** — never gerund fragments.
  - GOOD: "Students learn about co-op through peer referrals and faculty advising."
  - BAD: "Hears about co-op", "Browses NUworks"
- All activity labels sit **above** their corresponding timeline dot. Never below. Never alternating. Position at `band_top + 14px` consistently.

---

## 7. Emotion, pain, and opportunity layers

These three optional annotation layers must use predefined treatments — never reinvented per map.

- **Emotion arc**: a single thin curve threaded across the phase columns at a fixed y-offset. Color signals valence (negative=rust, neutral=mute, positive=accent).
- **Pain-point markers**: small icons or flags attached to specific touchpoints with a 1-line description. Visually distinct from neutral touchpoints (filled vs open, or color difference).
- **Opportunity markers**: brand-accent treatment at points where the team has identified intervention possibilities. Distinct from pain markers.

Whatever combination of these layers is used, the visual treatment is consistent across NU and NXT exemplars.

---

## 8. Voice-of-user row

- Locked to the **bottom of the journey band**, above the synthesis band.
- **One quote per phase, maximum.** Some phases may have none.
- Anatomy:
  - Eyebrow: `VOICE OF [PERSONA]` (small, uppercase, tracked, 10px)
  - Participant code in **monospace** (e.g. `S-01-04`)
  - Quote body in **italic serif**, 14px, line-height 1.4
  - Max **4 lines**, max **~140 characters**

---

## 9. Synthesis and metric row (bottom band, y=880 to y=1080)

- **Synthesis paragraph**: columns 1–4, 14px, line-height 1.5, max 5 lines. Treat it as content, not filler.
- **Metric tiles**: columns 5–12, **exactly 3 or 4 tiles**, all the same size, all the same visual weight by default.
- **One tile may receive inverted treatment** (dark background, white text) ONLY when it is the headline finding. Eyebrow on the inverted tile reads `KEY FINDING`. Maximum one emphasized tile per map.
- Metric tile anatomy:
  - Icon: 24px
  - Numeral: 48–64px
  - Label: uppercase tracked, 10px
  - Supporting line: 12px, max ~50 characters

---

## 10. Typographic system (exactly five roles)

Every text element on the canvas maps to one of these five roles. No exceptions.

| Role | Use | Spec |
|---|---|---|
| **Display** | Title | Bold sans, 40–64px, line-height 1.05 |
| **Body** | Right-rail paragraph, synthesis | Regular sans, 14–16px, line-height 1.5 |
| **Label** | Persona, phase, system, eyebrow | Uppercase tracked sans, 10–12px |
| **Quote** | Voice-of-user body | Italic serif, 14px, line-height 1.4 |
| **Data** | Metric numerals, participant codes | Bold sans for numerals, monospace for codes |

---

## Density tiers (existing rule, retained)

- **LOW** (≤15 milestones): full element treatment with rich detail.
- **MEDIUM** (15–40): standard exemplar layout.
- **HIGH** (40–100): activate band-card grouping. Replace ≥6 same-tier siblings with one band card "{N} {category} — Lead: {name} + {N−1} directs".
- **EXTREME** (100+): emit AT MOST a top-N + "see appendix" footnote. Never cram.

---

## Truncation rules

- Verbatim quotes capped at 140 chars (per §8); longer quotes truncated at a clean clause boundary, never with a mid-sentence ellipsis.
- Lede capped at 280 chars.
- Action title capped at 100 chars and MUST be a complete sentence.
- Stage labels capped at 24 chars.

---

## Anti-patterns (auto-reject)

- ANY text overlapping ANY non-text element (line, arrow, divider, box edge).
- ANY label exceeding its allocated rectangle.
- ANY element extending past the 1920×1080 frame OR the 80px safe area.
- Headline overrunning into the right-rail paragraph zone (columns 10–12).
- Right-rail paragraph set narrower than 45 chars per line.
- Inactive persona-lane segments rendered as solid lines (must be 30% dashed).
- More than one visually emphasized phase.
- More than one inverted metric tile.
- Mixing layout decisions between NU and NXT exemplars (structure must be identical).
- Inheriting the exemplar's exact coordinate values when YOUR content has different lengths than the exemplar's content. RECOMPUTE Y offsets when label height changes.
- Proposing future-state designs in a journey artifact — that belongs in a blueprint.
- Quotes that aren't verbatim from the corpus and aren't attributed.
