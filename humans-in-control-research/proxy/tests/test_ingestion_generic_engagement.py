"""Deterministic, engagement-agnostic ingestion checks (2026-10-02 owner rule:
"these rules must be deterministically enforced and generalized for ANY RESEARCH
PROJECT"). Everything here runs against a SYNTHETIC second engagement in a
different industry (a hospital emergency-department patient-intake project), so
no rule can pass by being tuned to the engagement that exposed the failures.

Proves, with no network and no model:
  - every accepted upload type routes through /api/parse-upload to readable text,
  - chunks registered in frontmatter == chunks read back, per document,
  - duplicate copies of one document collapse to one canonical page,
  - theme synthesis owned by another engagement, or by NXT's own internal runs,
    is excluded from this engagement's admission (goal route and selection route).
"""
from __future__ import annotations

import asyncio
import ast
import base64
import io
import logging
import os
import sys
import types
import zipfile

import pytest

_PROXY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# The SPA tree these checks compare against: next to the proxy on a host checkout; inside the proxy container the
# compose file mounts the two directories read-only at HIC_SPA_ROOT (2026-10-31).
_SPA_ROOT = os.environ.get("HIC_SPA_ROOT") or os.path.join(_PROXY_DIR, "..")
if _PROXY_DIR not in sys.path:
    sys.path.insert(0, _PROXY_DIR)

import evidence_hygiene as eh  # noqa: E402

HOSPITAL = "streamline-patient-intake-for-a-regional-hospital-emergency-department-redesign"
OTHER_CLIENT = "map-member-onboarding-for-a-regional-credit-union-digital-banking-program"
NXT_INTERNAL = "produce-an-internal-capabilities-brief-for-the-nxt-humans-workbench-platform"
INTAKE_TEXT = (
    "Triage nurses re-enter the chief complaint three times between the kiosk, the EHR and the bed board. "
    "Patients wait without a status update after registration, and interpreters are booked by phone."
)


def _exec_app_functions(names, extra_ns=None):
    """Exec named top-level (async) functions from app.py with decorators stripped,
    so routes run without booting FastAPI, the vector store or background loops."""
    src = open(os.path.join(_PROXY_DIR, "app.py"), encoding="utf-8").read()
    tree = ast.parse(src)
    ns = {"logger": logging.getLogger("t"), "os": os, "json": __import__("json"),
          "_neutralize_untrusted_text": lambda t, fn="": t}
    ns.update(extra_ns or {})
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            node.decorator_list = []
            exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), ns)
    return ns


# --- fixtures: one real file per accepted type -------------------------------

def _pdf_with_text(text: str) -> bytes:
    content = f"BT /F1 11 Tf 40 740 Td ({text}) Tj ET".encode("latin-1")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + o + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def _docx(text: str) -> bytes:
    w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    xml = f'<?xml version="1.0" encoding="UTF-8"?><w:document {w}><w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml.encode("utf-8"))
    return buf.getvalue()


def _pptx(text: str) -> bytes:
    pptx = pytest.importorskip("pptx")
    prs = pptx.Presentation()
    s = prs.slides.add_slide(prs.slide_layouts[1])
    s.shapes.title.text = "ED intake current state"
    s.placeholders[1].text = text
    s.notes_slide.notes_text_frame.text = "Charge nurse interview, night shift"
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def _xlsx(text: str) -> bytes:
    openpyxl = pytest.importorskip("openpyxl")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Intake pain points"
    ws.append(["Step", "Observation"])
    ws.append(["Registration", text])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _legacy_binary(text: str) -> bytes:
    # OLE-era .doc/.xls/.ppt store body text as plain runs between binary records; a
    # real legacy document carries several paragraphs, which the best-effort regex needs.
    return b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 64 + " ".join([text] * 3).encode("ascii") + b"\x00" * 32


ACCEPTED_DOC_TYPES = {
    "intake-notes.txt": ("text/plain", INTAKE_TEXT.encode("utf-8")),
    "intake-notes.md": ("text/markdown", ("# Intake\n\n" + INTAKE_TEXT).encode("utf-8")),
    "intake-log.csv": ("text/csv", ("step,observation\nregistration," + INTAKE_TEXT.replace(",", ";")).encode("utf-8")),
    "intake.json": ("application/json", ('{"finding": "' + INTAKE_TEXT + '"}').encode("utf-8")),
    "intake.xml": ("application/xml", ("<finding>" + INTAKE_TEXT + "</finding>").encode("utf-8")),
    "intake-study.pdf": ("application/pdf", None),
    "intake-memo.docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", None),
    "intake-workshop.pptx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation", None),
    "intake-metrics.xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", None),
    "intake-legacy.doc": ("application/msword", None),
    "intake-legacy.xls": ("application/vnd.ms-excel", None),
    "intake-legacy.ppt": ("application/vnd.ms-powerpoint", None),
    "kiosk-screenshot.png": ("image/png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 64),
}


def _bytes_for(name: str, given):
    if given is not None:
        return given
    ext = name.rsplit(".", 1)[-1]
    return {
        "pdf": lambda: _pdf_with_text(INTAKE_TEXT),
        "docx": lambda: _docx(INTAKE_TEXT),
        "pptx": lambda: _pptx(INTAKE_TEXT),
        "xlsx": lambda: _xlsx(INTAKE_TEXT),
        "doc": lambda: _legacy_binary(INTAKE_TEXT),
        "xls": lambda: _legacy_binary(INTAKE_TEXT),
        "ppt": lambda: _legacy_binary(INTAKE_TEXT),
    }[ext]()


def test_upload_accept_list_matches_the_types_tested_here():
    """The SPA's single accepted-type list (ChatAttachmentDropzone.ACCEPTED_EXTS, also
    used by the research-start FileUpload) is fully covered by this test's fixtures."""
    src = open(os.path.join(_SPA_ROOT, "components", "ChatAttachmentDropzone.tsx"), encoding="utf-8").read()
    import re
    m = re.search(r"export const ACCEPTED_EXTS = '([^']+)'", src)
    assert m, "ACCEPTED_EXTS must be exported (one list for both entry points)"
    accepted = {e.strip(".").lower() for e in m.group(1).split(",")}
    tested = {n.rsplit(".", 1)[-1] for n in ACCEPTED_DOC_TYPES}
    image_exts = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}
    assert accepted - image_exts <= tested, f"untested accepted types: {sorted(accepted - image_exts - tested)}"
    fu = open(os.path.join(_SPA_ROOT, "components", "FileUpload.tsx"), encoding="utf-8").read()
    assert "UPLOAD_ACCEPT = ACCEPTED_EXTS" in fu, "research-start upload must accept the same list as chat attach"


@pytest.mark.parametrize("name", sorted(ACCEPTED_DOC_TYPES))
def test_every_accepted_type_extracts_readable_text(name):
    mime, given = ACCEPTED_DOC_TYPES[name]
    if name.endswith(".pdf"):
        pytest.importorskip("PyPDF2")   # in proxy/requirements.txt; absent on a bare host Python
    raw = _bytes_for(name, given)

    async def _fake_vision(file_bytes, m, hint=""):
        return "Kiosk screen: Check in, Reason for visit, Insurance card, Interpreter needed (yes/no)"

    ns = _exec_app_functions(
        ["parse_upload", "_parse_pdf_bytes", "_parse_pptx_bytes", "_parse_office_bytes"],
        {"_gemini_multimodal_extract": _fake_vision},
    )
    req = types.SimpleNamespace(filename=name, base64=base64.b64encode(raw).decode("ascii"), mimeType=mime)
    out = asyncio.run(ns["parse_upload"](req))
    text = out.get("text") or ""
    assert len(text.strip()) >= 40, f"{name}: {out.get('method')} {out.get('error')}"
    if not name.endswith(".png"):
        assert "chief complaint" in text, f"{name} lost its body via {out.get('method')}"
    expected_method = {
        "pdf": "pypdf", "docx": "docx-xml", "pptx": "python-pptx", "xlsx": "openpyxl", "png": "image-vision-ocr",
    }.get(name.rsplit(".", 1)[-1])
    if expected_method:
        assert out.get("method") == expected_method


def test_chunks_registered_equal_chunks_read_per_document():
    pytest.importorskip("tiktoken")
    from wiki_chunker import chunk_for_manifest, upsert_chunks_into_frontmatter, extract_chunk_spans
    for i, size in enumerate([1, 6, 40]):
        body = "\n\n".join(f"Paragraph {k}. " + INTAKE_TEXT for k in range(size))
        path = f"articles/client-uploads/hosp{i:06d}.md"
        page = f'---\nid: {path}\ntitle: "intake-{i}.pdf"\nsource: "Client Uploads"\nengagement: "{HOSPITAL}"\n---\n\n# intake-{i}.pdf\n\n{body}\n'
        chunks = chunk_for_manifest(page, path)
        written = upsert_chunks_into_frontmatter(page, chunks, page_id=path)
        assert len(extract_chunk_spans(written)) == len(chunks) > 0


# --- dedupe + engagement scoping on a synthetic hospital engagement -------------

def _write_page(root, rel, url, title, engagement="", chunks=3):
    ap = os.path.join(root, *rel.split("/"))
    os.makedirs(os.path.dirname(ap), exist_ok=True)
    with open(ap, "w", encoding="utf-8") as f:
        f.write(f'---\nid: {rel}\nurl: "{url}"\ntitle: "{title}"\nengagement: "{engagement}"\n---\n\nbody\n')
    return {"wikiPath": rel, "type": "article", "title": "", "url": "", "engagement": "", "chunk_count": chunks, "mtime": 1.0}


@pytest.fixture()
def hospital_wiki(tmp_path):
    root = str(tmp_path)
    rec = {}
    # Two copies of the same intake SOP (upload + cached-reuse alias) and an old re-upload.
    rec["articles/client-uploads/aaaaaaaaaa.md"] = {"wikiPath": "articles/client-uploads/aaaaaaaaaa.md", "type": "article",
                                                    "title": "ED_Intake_SOP_Final_REDACTED.pdf", "url": "upload://ED_Intake_SOP_Final_REDACTED.pdf",
                                                    "engagement": HOSPITAL, "chunk_count": 12, "mtime": 5.0}
    rec["articles/cached-reuse-ed-intake-sop/bbbbbbbbbb.md"] = {"wikiPath": "articles/cached-reuse-ed-intake-sop/bbbbbbbbbb.md", "type": "article",
                                                               "title": "ED_Intake_SOP_Final", "url": "wiki://articles/client-uploads/aaaaaaaaaa.md",
                                                               "engagement": HOSPITAL, "chunk_count": 4, "mtime": 6.0}
    rec["articles/client-uploads/cccccccccc.md"] = {"wikiPath": "articles/client-uploads/cccccccccc.md", "type": "article",
                                                    "title": "ED_Intake_SOP_Final_REDACTED.pdf", "url": "upload://old-run/ED_Intake_SOP_Final_REDACTED.pdf",
                                                    "engagement": "", "chunk_count": 12, "mtime": 1.0}
    rec["articles/client-uploads/dddddddddd.md"] = {"wikiPath": "articles/client-uploads/dddddddddd.md", "type": "article",
                                                    "title": "Triage_Interview_Notes.docx", "url": "upload://Triage_Interview_Notes.docx",
                                                    "engagement": HOSPITAL, "chunk_count": 3, "mtime": 2.0}
    # Generated theme synthesis: this engagement, another client, NXT internal, and one with a
    # truncated manifest record (blank url/type "article") whose owner lives only in the page head.
    for h, owner in [("1111111111", HOSPITAL), ("2222222222", OTHER_CLIENT), ("3333333333", NXT_INTERNAL), ("4444444444", NXT_INTERNAL)]:
        rel = f"articles/hic-theme-synthesis/{h}.md"
        r = _write_page(root, rel, f"nxt://synthesis/themes/{owner}/2026-09-01T00:00:00Z", "Theme Synthesis")
        if h != "4444444444":
            r.update({"type": "synthesis", "url": f"nxt://synthesis/themes/{owner}/2026-09-01T00:00:00Z", "title": "Theme Synthesis"})
        rec[rel] = r
    rec[f"synthesis/insights/{OTHER_CLIENT}/theme/t1.md"] = {"wikiPath": f"synthesis/insights/{OTHER_CLIENT}/theme/t1.md",
                                                            "type": "insight", "chunk_count": 1, "title": "t1", "url": "nxt://insights/x"}
    rec["articles/healthcare-dive/eeeeeeeeee.md"] = {"wikiPath": "articles/healthcare-dive/eeeeeeeeee.md", "type": "article",
                                                     "title": "ED boarding hits record", "url": "https://example.org/a", "chunk_count": 5}
    return root, rec


def _filter_ns(root):
    return _exec_app_functions(["_evidence_page_info", "_evidence_admission_filter"], {"WIKI_BASE": root})


def test_hospital_duplicates_collapse_to_engagement_tagged_original(hospital_wiki):
    root, rec = hospital_wiki
    ns = _filter_ns(root)
    res = ns["_evidence_admission_filter"](set(rec.keys()), rec, HOSPITAL, False)
    assert res["duplicates"] == {
        "articles/cached-reuse-ed-intake-sop/bbbbbbbbbb.md": "articles/client-uploads/aaaaaaaaaa.md",
        "articles/client-uploads/cccccccccc.md": "articles/client-uploads/aaaaaaaaaa.md",
    }
    assert "articles/client-uploads/dddddddddd.md" not in res["duplicates"]
    assert "articles/healthcare-dive/eeeeeeeeee.md" not in res["duplicates"]


def test_hospital_excludes_other_engagement_and_nxt_internal_synthesis(hospital_wiki):
    root, rec = hospital_wiki
    ns = _filter_ns(root)
    # Evidence request (goal route default): every generated synthesis page is refused,
    # including the mis-typed page whose owner is recovered from its head.
    ev = ns["_evidence_admission_filter"](set(rec.keys()), rec, HOSPITAL, False)["synthesis_blocked"]
    assert set(ev) == {f"articles/hic-theme-synthesis/{h}.md" for h in ("1111111111", "2222222222", "3333333333", "4444444444")} | {
        f"synthesis/insights/{OTHER_CLIENT}/theme/t1.md"}
    assert ev["articles/hic-theme-synthesis/4444444444.md"] == NXT_INTERNAL
    # Memory request (selection route): only this engagement's own synthesis survives.
    mem = ns["_evidence_admission_filter"](set(rec.keys()), rec, HOSPITAL, True)["synthesis_blocked"]
    assert "articles/hic-theme-synthesis/1111111111.md" not in mem
    assert {"articles/hic-theme-synthesis/2222222222.md", "articles/hic-theme-synthesis/3333333333.md",
            "articles/hic-theme-synthesis/4444444444.md"} <= set(mem)


def test_alias_synthesis_is_owned_by_its_canonical_page_not_its_retag(hospital_wiki):
    """A content-duplicate synthesis page is an alias (url = canonical wiki path) and the
    write path re-tags `engagement:` with whoever reused it last. Ownership must follow
    the alias to the canonical page's nxt:// url, never trust the retag."""
    root, rec = hospital_wiki
    rel = "articles/hic-theme-synthesis/5555555555.md"
    r = _write_page(root, rel, "articles/hic-theme-synthesis/2222222222.md", "Theme Synthesis (27 themes) -", engagement=HOSPITAL)
    r.update({"type": "synthesis", "url": "articles/hic-theme-synthesis/2222222222.md", "engagement": HOSPITAL, "title": "Theme Synthesis"})
    rec[rel] = r
    ns = _filter_ns(root)
    mem = ns["_evidence_admission_filter"](set(rec.keys()), rec, HOSPITAL, True)
    assert mem["synthesis_blocked"].get(rel) == OTHER_CLIENT
    assert eh.synthesis_engagement(rel, "articles/hic-theme-synthesis/2222222222.md", HOSPITAL) == ""


def test_the_same_rules_hold_when_the_engagements_swap(hospital_wiki):
    """Nothing is keyed to one slug: from the credit-union engagement's side, the
    hospital's synthesis is the foreign one."""
    root, rec = hospital_wiki
    ns = _filter_ns(root)
    mem = ns["_evidence_admission_filter"](set(rec.keys()), rec, OTHER_CLIENT, True)["synthesis_blocked"]
    assert "articles/hic-theme-synthesis/2222222222.md" not in mem
    assert "articles/hic-theme-synthesis/1111111111.md" in mem


def test_no_engagement_literals_in_non_test_ingestion_code():
    """Generalization guard: the shared ingestion / hygiene code names no client,
    engagement slug or wiki page id."""
    import re
    root = _SPA_ROOT
    files = [os.path.join(_PROXY_DIR, "evidence_hygiene.py")] + [
        os.path.join(root, p) for p in ("services/chunkRetrieval.ts", "components/FileUpload.tsx", "components/ChatAttachmentDropzone.tsx")]
    banned = re.compile(r"northeastern|\bNU\b|chris|boland|sow01\d|[0-9a-f]{10}\.md|generate-a-comprehensive", re.I)
    for f in files:
        txt = open(f, encoding="utf-8").read()
        hits = [h for h in banned.findall(txt) if h.lower() != "aa11bb22cc.md"]  # documented placeholder id
        assert not hits, f"{os.path.basename(f)} carries engagement-specific literals: {hits[:5]}"
