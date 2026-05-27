# # Research Artifacts Framework

## Overview
This framework provides elegant, content-dense templates for core CX and market research deliverables. Each artifact priorit

_Started 2026-05-23 12:16 UTC_

---

## User

Act as an experienced CX and market researcher and create improved versions of these minimal research artifacts, adding content density, removing extraneous metadata elements, maximizing real estate, and maintaining elegance. Generate example templates for each research artifact and a comprehensive markdown file that describes how to create and modify elements across each: "

## Assistant

_[tool: questions_v2]_

Before I dive in, let me lock down the scope — you're asking for 13 artifact templates plus a comprehensive style guide, which is a lot of surface area. A few focused questions will save us a rebuild.

## User

Questions timed out; go with defaults

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: set_project_title]_

_[tool: update_todos]_

_[tool: copy_files]_

_[tool: write_file]_

_[tool: write_file]_

Now the index page that ties everything together:

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: write_file]_

Now let me build the artifacts. Starting with **personas** — the most-used artifact:

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

You're right — those tiny `ID · status` stamps above headings are decorative noise. Let me sweep them out across every artifact, then wire up tweaks on the audit page.

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

Cleaning up sloppy micro-labels across artifacts. Now the strip pass:

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: read_file]_

Now let me add the tweaks panel to `tech-audit.html`:

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: write_file]_

Tweaks panel works. Now the remaining three artifacts:

_[tool: write_file]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Delivered the full library — **fourteen templates** (13 artifact templates + 1 living style guide) plus a comprehensive markdown spec, all built on Northeastern Advancement tokens.

**Open `index.html`** for the gallery. Highlights:

- Every artifact is **single-canvas, dense by default** — no methodology blurbs, no slide numbers on documents, no per-page source strips. One masthead, inline citation chips, one consolidated source index at the foot.
- `tech-audit.html` is wired with **Tweaks** (toggle from the toolbar): density, sunset emphasis, vendor sublines on/off, maturity column on/off, health columns on/off, row hover on/off — saved via the host's `EDITMODE-BEGIN/END` block.
- Micro-slop swept across artifacts: `C-03 · sunset 2027-Q1`-style mini stamps gone; `· primary archetype` suffixes gone; `PILLAR 01` decorations gone; roadmap `I-01 · R-04` collapsed to `I-01`.
- `style-guide.html` is the visual reference — anatomy of the masthead, eyebrow + finding, citation chips, pills, signal dots, stats, maturity bars, dense tables, plus a "thirteen don'ts" gallery.
- `GUIDE.md` is the markdown spec — token map, density rules, element catalog, per-artifact anatomy, nine modification recipes, and the Tweaks protocol.

Next steps if useful: replicate the Tweaks pattern onto other artifacts (e.g. PRD's TOC density, roadmap horizon visibility), wire a real source-index linkage (chip ↔ footer `<ol>` anchors), or branch into a second institutional palette to prove the rebrand recipe.

