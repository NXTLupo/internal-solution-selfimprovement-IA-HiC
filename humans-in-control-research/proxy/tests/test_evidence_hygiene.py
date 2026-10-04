"""Evidence hygiene (2026-10-02): upload extraction, mojibake repair, duplicate
collapse, and engagement scoping of generated synthesis.

Live failures these pin (session generate-a-comprehensive-product-requirements-
document-prd-for-northeastern-univ): .pptx uploads never entered; a .docx landed
with mojibake ("STUDENT" + U+00E2 U+0080 U+0099 + "S"); each SOW was admitted
twice; another engagement's theme synthesis (NXT's own product copy) was cited in
a Northeastern PRD.
"""
from __future__ import annotations

import ast
import io
import logging
import os
import sys

import pytest

_PROXY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROXY_DIR not in sys.path:
    sys.path.insert(0, _PROXY_DIR)

import evidence_hygiene as eh  # noqa: E402


def _load_app_functions(*names):
    """Exec selected top-level functions from app.py without importing the app
    (importing boots FastAPI, the vector store and background loops)."""
    src = open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read()
    tree = ast.parse(src)
    ns = {"logger": logging.getLogger("t"), "_neutralize_untrusted_text": lambda t, fn="": t}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in names:
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    return ns


# --- mojibake --------------------------------------------------------------

def test_repairs_utf8_read_as_latin1_exact_live_pattern():
    # The literal code points stored in articles/client-uploads/2a331d25dd.md.
    broken = ("ADVISOR CAN SEE ALL OF THE STUDENT\u00e2\u0080\u0099S INFORMATION. "
              "Building the new\u00c2\u00a0Co-op Student Dashboard")
    fixed = eh.repair_mojibake(broken)
    assert fixed == ("ADVISOR CAN SEE ALL OF THE STUDENT\u2019S INFORMATION. "
                     "Building the new Co-op Student Dashboard")
    assert not eh.has_mojibake(fixed)


def test_repairs_cp1252_flavoured_mojibake():
    # (U+201D is avoided only because its third byte 0x9D is undefined in cp1252,
    # so the cp1252 decode used to BUILD this fixture would fail.)
    original = "resources\u2014all \u201cquoted \u2122 \u20ac5"
    broken = original.encode("utf-8").decode("cp1252")
    assert eh.has_mojibake(broken)
    assert eh.repair_mojibake(broken) == original


def test_clean_accented_prose_is_untouched():
    for s in ["caf\u00e9 \u00e0 la carte", "na\u00efve r\u00e9sum\u00e9", "\u00c2ge", "Se\u00f1or \u00a9 2026", "plain ascii"]:
        assert eh.repair_mojibake(s) == s


def test_repair_is_idempotent():
    broken = "the student\u00e2\u0080\u0099s journey"
    once = eh.repair_mojibake(broken)
    assert eh.repair_mojibake(once) == once == "the student\u2019s journey"


def test_decode_text_bytes_prefers_utf8_and_heals_premangled_bytes():
    assert eh.decode_text_bytes("student\u2019s".encode("utf-8")) == "student\u2019s"
    assert eh.decode_text_bytes("\ufeffBOM text".encode("utf-8")) == "BOM text"
    assert eh.decode_text_bytes("caf\u00e9".encode("cp1252")) == "caf\u00e9"
    premangled = "student\u2019s".encode("utf-8").decode("latin-1").encode("utf-8")
    assert eh.decode_text_bytes(premangled) == "student\u2019s"


def test_repair_page_rechunks_so_spans_match_repaired_body():
    pytest.importorskip("tiktoken")   # wiki_chunker dependency (present in the proxy image)
    page = (
        "---\nid: articles/client-uploads/x.md\ntitle: \"Feedback\"\nsource: \"Client Uploads\"\n---\n\n"
        "# Feedback\n\nThe student\u00e2\u0080\u0099s profile is visible to the advisor in NU Works. "
        "Option 1:\u00c2\u00a0A first-year onboarding companion that needs no FERPA data.\n"
    )
    res = eh.repair_page_mojibake(page, "articles/client-uploads/x.md")
    assert res["changed"] and res["fixed_runs"] == 2
    assert "student\u2019s profile" in res["text"] and "\u00e2\u0080" not in res["text"]
    assert "chunks:" in res["text"] and res["chunk_count"] >= 1


# --- office extraction -----------------------------------------------------

def _make_docx(paragraphs, table=None) -> bytes:
    import zipfile
    w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    ps = "".join(f'<w:p><w:r><w:t xml:space="preserve">{p}</w:t></w:r></w:p>' for p in paragraphs)
    tbl = ""
    if table:
        rows = "".join("<w:tr>" + "".join(f"<w:tc><w:p><w:r><w:t>{c}</w:t></w:r></w:p></w:tc>" for c in r) + "</w:tr>"
                       for r in table)
        tbl = f"<w:tbl>{rows}</w:tbl>"
    xml = f'<?xml version="1.0" encoding="UTF-8"?><w:document {w}><w:body>{ps}{tbl}</w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml.encode("utf-8"))
    return buf.getvalue()


def test_docx_extracts_paragraphs_tables_and_unicode():
    raw = _make_docx(["The student\u2019s dashboard", "Second paragraph, kept"],
                     [["Feature", "Owner"], ["Co-op search", "NU"]])
    out = eh.parse_docx_bytes(raw)
    assert out["method"] == "docx-xml"
    assert "student\u2019s dashboard" in out["text"]
    assert "Feature | Owner" in out["text"] and "Co-op search | NU" in out["text"]


def test_xlsx_extracts_every_sheet_and_row():
    openpyxl = pytest.importorskip("openpyxl")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Features"
    ws.append(["ID", "Feature", "Priority"])
    ws.append(["F1", "Co-op readiness milestones", "P0"])
    ws2 = wb.create_sheet("Feedback")
    ws2.append(["Chris", "Advisor sees the student\u2019s profile"])
    buf = io.BytesIO()
    wb.save(buf)
    out = eh.parse_xlsx_bytes(buf.getvalue())
    assert out["sheetCount"] == 2
    assert "[Sheet 1: Features]" in out["text"] and "F1 | Co-op readiness milestones | P0" in out["text"]
    assert "[Sheet 2: Feedback]" in out["text"] and "student\u2019s profile" in out["text"]


def test_pptx_extractor_reads_titles_body_tables_and_notes():
    pptx = pytest.importorskip("pptx")
    from pptx.util import Inches
    prs = pptx.Presentation()
    s = prs.slides.add_slide(prs.slide_layouts[1])
    s.shapes.title.text = "Experiential Learning Hub vision"
    s.placeholders[1].text = "One companion across the co-op journey"
    tbl = s.shapes.add_table(2, 2, Inches(1), Inches(4), Inches(4), Inches(1)).table
    tbl.cell(0, 0).text, tbl.cell(0, 1).text = "Stage", "Need"
    tbl.cell(1, 0).text, tbl.cell(1, 1).text = "Prepare", "Readiness checklist"
    s.notes_slide.notes_text_frame.text = "Speaker: advisors asked for this first"
    buf = io.BytesIO()
    prs.save(buf)
    ns = _load_app_functions("_parse_pptx_bytes", "_parse_office_bytes")
    out = ns["_parse_pptx_bytes"](buf.getvalue())
    assert out["method"] == "python-pptx" and out["slideCount"] == 1
    t = out["text"]
    assert "TITLE: Experiential Learning Hub vision" in t
    assert "One companion across the co-op journey" in t
    assert "Stage | Need" in t and "Prepare | Readiness checklist" in t
    assert "NOTES: Speaker: advisors asked for this first" in t


def test_pptx_extractor_recurses_into_group_shapes():
    pptx = pytest.importorskip("pptx")
    from pptx.util import Inches
    prs = pptx.Presentation()
    s = prs.slides.add_slide(prs.slide_layouts[6])
    grp = s.shapes.add_group_shape()
    tb = grp.shapes.add_textbox(Inches(1), Inches(1), Inches(3), Inches(1))
    tb.text_frame.text = "Jane Doe, Co-op Advisor, Session 2"
    buf = io.BytesIO()
    prs.save(buf)
    ns = _load_app_functions("_parse_pptx_bytes", "_parse_office_bytes")
    assert "Jane Doe, Co-op Advisor, Session 2" in ns["_parse_pptx_bytes"](buf.getvalue())["text"]


_REAL_DECK = r"C:\Users\JonathanLupo\Downloads\Vision-Project.pptx"


@pytest.mark.skipif(not os.path.exists(_REAL_DECK), reason="owner's real deck only exists on the dev machine")
def test_real_vision_project_deck_extracts():
    with open(_REAL_DECK, "rb") as f:   # read-only; the owner's file is never modified
        raw = f.read()
    ns = _load_app_functions("_parse_pptx_bytes", "_parse_office_bytes")
    out = ns["_parse_pptx_bytes"](raw)
    assert out["method"] == "python-pptx"
    assert out["slideCount"] >= 1 and len(out["text"]) > 200


# --- duplicate collapse ----------------------------------------------------

ENG = "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"


def test_doc_stem_equates_copies():
    assert eh.doc_stem("SOW012_NXT_Humans_NU_Dashboard_Final_REDACTED.txt") == eh.doc_stem("SOW012_NXT_Humans_NU_Dashboard_Final")
    assert eh.doc_stem("Northeastern Student 360 Product Brief (1).pdf") == eh.doc_stem("Northeastern Student 360 Product Brief (1)")
    assert eh.doc_stem("NXT_Northeastern_applyjourney_vision.pdf") != eh.doc_stem("NXT_Northeastern_applyjourney_vision_prioritization.pdf")


def test_cached_reuse_alias_collapses_onto_engagement_tagged_original():
    pages = [
        {"path": "articles/client-uploads/d832673667.md", "title": "NXT_Humans_NU_Coop_Kickoff.pdf",
         "url": "upload://NXT_Humans_NU_Coop_Kickoff.pdf", "engagement": ENG, "chunk_count": 14, "mtime": 2.0},
        {"path": "articles/cached-reuse-nxt-humans-nu-coop-kickoff/7c74496538.md", "title": "NXT_Humans_NU_Coop_Kickoff",
         "url": "wiki://articles/client-uploads/d832673667.md", "engagement": ENG, "chunk_count": 5, "mtime": 1.0},
        {"path": "articles/riipen-blog/b909ce0016.md", "title": "Riipen Blog", "url": "https://riipen.com", "chunk_count": 3},
    ]
    assert eh.dedupe_pages(pages, ENG) == {
        "articles/cached-reuse-nxt-humans-nu-coop-kickoff/7c74496538.md": "articles/client-uploads/d832673667.md"}


def test_nine_old_reuploads_collapse_to_newest():
    pages = [{"path": f"articles/client-uploads/{i:010d}.md", "title": "NXT_Northeastern_applyjourney_vision.pdf",
              "url": f"upload://old-slug-{i}/NXT_Northeastern_applyjourney_vision.pdf", "engagement": "",
              "chunk_count": 15, "mtime": float(i)} for i in range(9)]
    pages.append({"path": "articles/client-uploads/aaaaaaaaaa.md",
                  "title": "NXT_Northeastern_applyjourney_vision_prioritization.pdf", "chunk_count": 3})
    dropped = eh.dedupe_pages(pages, ENG)
    assert len(dropped) == 8
    assert set(dropped.values()) == {"articles/client-uploads/0000000008.md"}
    assert "articles/client-uploads/aaaaaaaaaa.md" not in dropped


def test_engagement_tag_beats_recency():
    pages = [
        {"path": "articles/client-uploads/new.md", "title": "SOW013.pdf",
         "engagement": "some-other-engagement-slug-that-is-long-enough", "mtime": 9.0, "chunk_count": 4},
        {"path": "articles/client-uploads/old.md", "title": "SOW013.pdf", "engagement": ENG, "mtime": 1.0, "chunk_count": 4},
    ]
    assert eh.dedupe_pages(pages, ENG) == {"articles/client-uploads/new.md": "articles/client-uploads/old.md"}


def test_non_upload_pages_with_same_title_are_not_merged():
    pages = [
        {"path": "articles/pie-news/a.md", "title": "Weekly roundup"},
        {"path": "articles/pie-news/b.md", "title": "Weekly roundup"},
    ]
    assert eh.dedupe_pages(pages, ENG) == {}


# --- synthesis engagement scoping -----------------------------------------

def test_synthesis_engagement_from_url_insight_path_and_field():
    assert eh.synthesis_engagement(
        "articles/hic-theme-synthesis/19068873a5.md",
        "nxt://synthesis/themes/generate-a-comprehensive-product-marketing-presentation-deck/2026-06-16T01:32:01.699Z",
    ) == "generate-a-comprehensive-product-marketing-presentation-deck"
    assert eh.synthesis_engagement("synthesis/insights/my-eng/theme/t1.md") == "my-eng"
    assert eh.synthesis_engagement("articles/hic-theme-synthesis/x.md", "", "fallback-eng") == "fallback-eng"
    assert eh.synthesis_engagement("articles/hic-theme-synthesis/x.md") == ""
    assert eh.synthesis_engagement("articles/client-uploads/x.md") is None


def test_engagement_matches_tolerates_truncated_slugs():
    assert eh.engagement_matches(ENG[:60], ENG)
    assert not eh.engagement_matches("generate-a-comprehensive-product-marketing-presentation-deck", ENG)
    assert not eh.engagement_matches("", ENG)
    assert not eh.engagement_matches("short", "short-but-different")


def test_read_head_fields_recovers_blank_manifest_fields():
    head = ('---\nid: x\nurl: "nxt://synthesis/themes/abc/2026"\ntitle: "Theme Synthesis"\n'
            'engagement: "abc"\nchunks:\n  - id: "x#c0"\n')
    f = eh.read_head_fields(head)
    assert f["url"].startswith("nxt://synthesis/themes/abc") and f["title"] == "Theme Synthesis" and f["engagement"] == "abc"


# --- manifest head truncation (the mis-typed synthesis root cause) ----------

def test_manifest_upsert_head_keeps_whole_frontmatter():
    """The upsert used to record text[:8000]; a page whose chunks: block ran past
    8000 chars lost title/url/engagement and defaulted to type "article"."""
    src = open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read()
    i = src.index("def _manifest_upsert(")
    body = src[i:i + 3000]
    assert "rec = _manifest_record(rel, mtime, text[:8000])" not in body
    assert "_fm_end = text.find('\\n---\\n', 4)" in body
