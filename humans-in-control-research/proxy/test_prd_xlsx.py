"""Tests for the #prd requirements workbook (prd_xlsx.build_prd_workbook).

The fixture is the TypeScript PrdAir fixture (services/prdAir.fixture.ts) serialized to
fixtures/prd_air_fixture.json. When the saved Northeastern session record has been replayed to JSON
(PRD_XLSX_LIVE_AIR=<path>), the same structural assertions run on it too.
"""
import io
import json
import os
import re
import sys

import pytest
from openpyxl import load_workbook

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prd_xlsx import (  # noqa: E402
    REQUIREMENT_HEADERS, SHEET_ORDER, acceptance_test_type, build_prd_workbook, clean, requirement_type,
    slug_filename, target_text,
)

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(HERE, "fixtures", "prd_air_fixture.json")
POINTER_TEXT = re.compile(r"\[[^\]]*#c\d+")
POINTER_COLUMNS = {"Evidence pointer", "Pointer", "Evidence pointers"}


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _records():
    out = [("fixture", _load(FIXTURE), "NXT")]
    live = os.environ.get("PRD_XLSX_LIVE_AIR")
    if live and os.path.exists(live):
        out.append(("live", _load(live), "NU"))
    return out


@pytest.fixture(params=_records(), ids=lambda r: r[0])
def book(request):
    _, air, brand = request.param
    data = build_prd_workbook(air, brand)
    return air, brand, load_workbook(io.BytesIO(data))


def _headers(ws, row=1):
    return [c.value for c in ws[row] if c.value is not None]


def test_sheets_in_order(book):
    _, _, wb = book
    assert wb.sheetnames == SHEET_ORDER
    assert wb.active.title == "Requirements"


def test_requirements_headers_and_one_row_per_requirement(book):
    air, _, wb = book
    ws = wb["Requirements"]
    assert _headers(ws) == REQUIREMENT_HEADERS
    ids = [ws.cell(row=r, column=1).value for r in range(2, ws.max_row + 1)]
    assert ids == [r["id"] for r in air["graph"]["requirements"]] or sorted(ids) == sorted(r["id"] for r in air["graph"]["requirements"])
    assert len(ids) == len(air["graph"]["requirements"])
    col = {h: i + 1 for i, h in enumerate(REQUIREMENT_HEADERS)}
    for r in range(2, ws.max_row + 1):
        assert ws.cell(row=r, column=col["Priority"]).value in ("Must", "Should", "Could", "Won't")
        assert ws.cell(row=r, column=col["Status"]).value == "Proposed"
        assert ws.cell(row=r, column=col["Type"]).value in ("Functional", "Non-functional", "Data", "Integration", "UX")
        assert ws.cell(row=r, column=col["Release"]).value in ("MVP", "Next", "Later", "Not planned")


def test_freeze_filter_validation_and_conditional_fill(book):
    _, _, wb = book
    ws = wb["Requirements"]
    assert ws.freeze_panes == "C2"
    assert ws.auto_filter.ref and ws.auto_filter.ref.startswith("A1:")
    formulas = sorted(dv.formula1 for dv in ws.data_validations.dataValidation)
    assert '"Must,Should,Could,Won\'t"' in formulas
    assert any(f.startswith('"Proposed,') for f in formulas)
    rules = [rule for cf in ws.conditional_formatting for rule in cf.rules]
    assert any('"Must"' in (rule.formula or [""])[0] for rule in rules)
    for name in SHEET_ORDER[1:]:
        assert wb[name].freeze_panes, name


def test_header_style_comes_from_brand_tokens(book):
    _, brand, wb = book
    tokens = _load(os.path.join(HERE, "..", "hic-workspace", "design-system", "figma-tokens.json"))
    rail = tokens[brand]["color"]["rail"].lstrip("#").upper()
    font = tokens[brand]["font"].get("table") or tokens[brand]["font"]["body"]
    h = wb["Requirements"]["A1"]
    assert h.fill.start_color.rgb.endswith(rail)
    assert h.font.bold
    assert wb["Requirements"]["B2"].font.name == font


def test_acceptance_tests_sheet_matches_record(book):
    air, _, wb = book
    ws = wb["Acceptance Tests"]
    assert _headers(ws) == ["AT ID", "Req ID", "Given", "When", "Then", "Target", "Type"]
    assert ws.max_row - 1 == len(air["graph"]["acceptanceTests"])
    req_ids = {r["id"] for r in air["graph"]["requirements"]}
    labels = [ws.cell(row=r, column=1).value for r in range(2, ws.max_row + 1)]
    assert len(set(labels)) == len(labels), "acceptance test ids must be unique in the workbook"
    for r in range(2, ws.max_row + 1):
        assert ws.cell(row=r, column=2).value in req_ids
        assert ws.cell(row=r, column=7).value in ("Happy", "Edge", "Error")


def test_other_sheet_headers(book):
    _, _, wb = book
    assert _headers(wb["Success Signals"]) == ["ID", "Signal / event", "Instrument", "Population", "Direction", "Baseline status",
                                               "Target", "Type", "Guardrail", "Rollback owner", "Linked Req IDs"]
    assert _headers(wb["Open Questions"]) == ["ID", "Question", "Owner", "Due"]
    assert _headers(wb["Sources"])[:6] == ["ID", "Name", "Type", "Date", "URL", "Pointer"]
    assert _headers(wb["NFRs"]) == ["Standard", "Characteristic", "Statement", "Target", "Verification"]
    assert _headers(wb["Traceability"])[:2] == ["Req ID", "Priority"]


def test_no_em_dash_and_no_inline_pointer_text_in_display_cells(book):
    _, _, wb = book
    for ws in wb.worksheets:
        headers = {c.column: c.value for c in ws[1]}
        for row in ws.iter_rows():
            for c in row:
                if not isinstance(c.value, str):
                    continue
                assert "—" not in c.value, f"{ws.title}!{c.coordinate}"
                if headers.get(c.column) in POINTER_COLUMNS:
                    continue
                assert not POINTER_TEXT.search(c.value), f"{ws.title}!{c.coordinate}: {c.value[:80]}"


def test_fixture_specifics():
    air = _load(FIXTURE)
    wb = load_workbook(io.BytesIO(build_prd_workbook(air, "NXT")))
    ws = wb["Requirements"]
    col = {h: i + 1 for i, h in enumerate(REQUIREMENT_HEADERS)}
    row = {ws.cell(row=r, column=1).value: r for r in range(2, ws.max_row + 1)}
    r4 = row["R-4"]
    assert ws.cell(row=r4, column=col["Type"]).value == "Non-functional"
    assert ws.cell(row=r4, column=col["Target"]).value.startswith("review latency: 2 s p95")
    assert ws.cell(row=r4, column=col["Traced competitive gaps"]).value.startswith("CG-1:")
    r1 = row["R-1"]
    assert ws.cell(row=r1, column=col["Acceptance criteria"]).value.startswith("Given a renewal is due, when the grower opens the plan")
    assert ws.cell(row=r1, column=col["Independent origins"]).value == 2
    assert ws.cell(row=r1, column=col["Evidence pointer"]).value.endswith("#c3")
    r3 = row["R-3"]
    assert "Bet:" in ws.cell(row=r3, column=col["Notes"]).value
    assert ws.cell(row=r1, column=col["Dependencies"]).value in (None, "")
    summary = {wb["Summary"].cell(row=r, column=1).value: wb["Summary"].cell(row=r, column=2).value for r in range(1, wb["Summary"].max_row + 1)}
    assert summary["Appetite"] == "6 weeks"
    assert summary["Accountable approver"] == "Head of product"


def test_duplicate_acceptance_test_ids_resolve_by_requirement():
    """A live record numbered tests per requirement (every requirement has an AT-1)."""
    air = _load(FIXTURE)
    for at in air["graph"]["acceptanceTests"]:
        at["id"] = "AT-1"
    for r in air["graph"]["requirements"]:
        r["acceptanceTestIds"] = ["AT-1"]
    wb = load_workbook(io.BytesIO(build_prd_workbook(air, "NU")))
    ws = wb["Requirements"]
    col = {h: i + 1 for i, h in enumerate(REQUIREMENT_HEADERS)}
    rows = {ws.cell(row=r, column=1).value: r for r in range(2, ws.max_row + 1)}
    assert ws.cell(row=rows["R-2"], column=col["Acceptance criteria"]).value.startswith("Given a claim closed")
    assert ws.cell(row=rows["R-2"], column=col["Acceptance test IDs"]).value == "R-2.AT-1"


def test_helpers():
    assert clean("Growers renew [articles/x.md#c3] every year — unchanged") == "Growers renew every year, unchanged"
    assert clean("=SUM(A1)") == "=SUM(A1)"
    assert target_text({"kind": "requirement_target", "metric": "uptime", "value": 99.5, "unit": "%"}) == "uptime: 99.5%"
    assert target_text({"kind": "other"}) == ""
    assert requirement_type({"kind": "functional", "text": "The Hub syncs status from the career API."}) == "Integration"
    assert requirement_type({"kind": "non-functional", "text": "anything"}) == "Non-functional"
    assert acceptance_test_type({"given": "the provider is unavailable", "when": "x", "then": "y"}) == "Error"
    assert acceptance_test_type({"given": "a student with no saved plan", "when": "x", "then": "y"}) == "Edge"
    assert slug_filename("Growers decide coverage!", "NU") == "growers-decide-coverage-requirements-nu.xlsx"


def test_formula_text_is_not_a_formula():
    air = _load(FIXTURE)
    air["graph"]["requirements"][0]["text"] = "=HYPERLINK(\"http://x\")"
    wb = load_workbook(io.BytesIO(build_prd_workbook(air, "NXT")))
    c = wb["Requirements"]["B2"]
    assert c.data_type == "s"


def _with_ledger(air):
    """The fixture plus a scope and feedback ledger: SF-1 documented by R-1 (a model pass), FB-1 documented
    only by a deterministic fallback requirement, SF-2 documented by nothing."""
    air = json.loads(json.dumps(air))
    g = air["graph"]
    q = {"id": "Q-L1", "text": "Current prototype begins too late in the journey.", "sourceId": "S-L1", "pointer": "articles/client-uploads/abc.md#c1"}
    g["sources"].append({"id": "S-L1", "name": "Client document: Meeting Summary", "kind": "client-document", "pointer": "articles/client-uploads/abc.md"})
    g["quotes"].append(q)
    g["ledger"] = [
        {"id": "SF-1", "type": "stated", "item": "Progress indicators on guided paths", "statement": "The dashboard shows progress.", "quote": "progress indicators", "sourceName": "Client document: Kickoff", "pointer": "articles/client-uploads/k.md#c2", "documentTitle": "Kickoff", "featureArea": "dashboard", "label": "required", "sources": [{"quote": "progress indicators", "sourceName": "Client document: Kickoff", "pointer": "articles/client-uploads/k.md#c2", "documentTitle": "Kickoff"}]},
        {"id": "FB-1", "type": "feedback", "item": "Prototype begins too late", "statement": "The experience starts in the first year.", "quote": q["text"], "sourceName": "Client document: Meeting Summary", "pointer": q["pointer"], "documentTitle": "Meeting Summary", "featureArea": "readiness-guidance", "label": "request", "disposition": "change", "speaker": "Christine", "date": "2026-09-30", "quoteId": "Q-L1", "sources": [{"quote": q["text"], "sourceName": "Client document: Meeting Summary", "pointer": q["pointer"], "documentTitle": "Meeting Summary"}]},
        {"id": "SF-2", "type": "stated", "item": "Uncovered item", "statement": "x", "quote": "y", "sourceName": "Client document: SOW", "pointer": "articles/client-uploads/s.md#c0", "documentTitle": "SOW", "featureArea": "program", "label": "required", "sources": []},
    ]
    g["requirements"][0]["ledgerIds"] = ["SF-1"]
    fb = json.loads(json.dumps(g["requirements"][0]))
    fb.update({"id": "R-99", "text": "The experience starts in the first year.", "ledgerIds": ["FB-1"], "painIds": [], "competitiveGapIds": [], "themeIds": [],
               "origin": "fallback", "notes": "Needs refinement: written directly from FB-1 (Meeting Summary) because no model pass documented it.", "acceptanceTestIds": []})
    g["requirements"].append(fb)
    return air


def test_scope_and_feedback_ledger_sheet_and_coverage():
    air = _with_ledger(_load(FIXTURE))
    wb = load_workbook(io.BytesIO(build_prd_workbook(air, "NXT")))
    assert wb.sheetnames.index("Coverage Ledger") == wb.sheetnames.index("Requirements") + 1
    ws = wb["Coverage Ledger"]
    hdr = _headers(ws)
    col = {h: i + 1 for i, h in enumerate(hdr)}
    rows = {ws.cell(row=r, column=1).value: r for r in range(2, ws.max_row + 1)}
    assert set(rows) == {"SF-1", "FB-1", "SF-2"}
    assert ws.cell(row=rows["SF-1"], column=col["Coverage status"]).value == "Covered"
    assert ws.cell(row=rows["SF-1"], column=col["Covering requirement IDs"]).value == "R-1"
    assert ws.cell(row=rows["FB-1"], column=col["Coverage status"]).value == "Covered (needs refinement)"
    assert ws.cell(row=rows["FB-1"], column=col["Speaker / owner"]).value == "Christine"
    assert ws.cell(row=rows["FB-1"], column=col["Disposition"]).value == "change"
    assert ws.cell(row=rows["SF-2"], column=col["Coverage status"]).value == "Not covered"
    req = wb["Requirements"]
    rcol = {h: i + 1 for i, h in enumerate(REQUIREMENT_HEADERS)}
    rrow = {req.cell(row=r, column=1).value: r for r in range(2, req.max_row + 1)}
    assert "Stated" in req.cell(row=rrow["R-1"], column=rcol["Root type"]).value
    assert req.cell(row=rrow["R-1"], column=rcol["Ledger IDs"]).value == "SF-1"
    assert req.cell(row=rrow["R-99"], column=rcol["Root type"]).value == "Feedback"
    assert req.cell(row=rrow["R-99"], column=rcol["Evidence quote"]).value == "Current prototype begins too late in the journey."
    assert "Needs refinement" in req.cell(row=rrow["R-99"], column=rcol["Notes"]).value
    tr = wb["Traceability"]
    assert _headers(tr)[2:4] == ["Ledger roots", "Root type"]
    summary = {wb["Summary"].cell(row=r, column=1).value: wb["Summary"].cell(row=r, column=2).value for r in range(1, wb["Summary"].max_row + 1)}
    line = summary["Scope and feedback coverage"]
    assert "3 ledger items (2 stated features, 1 feedback items); 2 covered by requirements (66.7%)" in line
    assert "1 written directly from the item" in line


def test_record_without_ledger_still_builds():
    wb = load_workbook(io.BytesIO(build_prd_workbook(_load(FIXTURE), "NXT")))
    assert wb["Coverage Ledger"].max_row == 1


def test_themes_sheet_receipt_and_independent_checks():
    from prd_xlsx import build_prd_workbook_with_checks, checks_header
    air = _with_ledger(_load(FIXTURE))
    g = air["graph"]
    g["areas"] = [{"id": "AREA-1", "label": "Intake and Forms", "items": 2}]
    g["ledger"][0]["featureArea"] = "AREA-1"
    g["ledger"].append({"id": "TH-1", "type": "theme", "item": "Wait times frustrate patients", "statement": "x", "quote": "", "sourceName": "Research Assembly Board",
                        "pointer": "", "documentTitle": "Research Assembly Board", "featureArea": "AREA-1", "label": "unspecified", "sources": [],
                        "themeIds": ["t1", "t2"], "themeMembers": [{"id": "t1", "name": "Wait times frustrate patients", "sentiment": "negative", "category": "Access"},
                                                                    {"id": "t2", "name": "Wait times frustrate patients.", "sentiment": "negative", "category": "Access"}]})
    g["requirements"][1]["ledgerIds"] = ["TH-1"]
    air["receipt"] = {"deliverable": "prd", "at": "2026-10-02", "pass": True, "rules": [
        {"ruleId": "coverage", "title": "Every stated item, feedback item and theme is covered by the PRD", "checked": 6, "pass": True, "violations": [], "found": 1, "repaired": 0, "filled": 1}]}
    data, checks = build_prd_workbook_with_checks(air, "NXT")
    wb = load_workbook(io.BytesIO(data))
    ws = wb["Themes"]
    hdr = _headers(ws)
    rows = {ws.cell(row=r, column=1).value: [ws.cell(row=r, column=c).value for c in range(1, len(hdr) + 1)] for r in range(2, ws.max_row + 1)}
    assert set(rows) == {"t1", "t2"}
    assert rows["t1"][hdr.index("Theme group")] == "TH-1"
    assert rows["t1"][hdr.index("Covering requirement IDs")] == g["requirements"][1]["id"]
    assert rows["t2"][hdr.index("Coverage status")] == "Covered"
    led = wb["Coverage Ledger"]
    lrows = {led.cell(row=r, column=1).value: r for r in range(2, led.max_row + 1)}
    assert led.cell(row=lrows["SF-1"], column=3).value == "Intake and Forms"
    summary = {wb["Summary"].cell(row=r, column=1).value: wb["Summary"].cell(row=r, column=2).value for r in range(1, wb["Summary"].max_row + 1)}
    assert "2 board themes in 1 groups; 2 covered by requirements (100.0%)" in summary["Theme coverage"]
    assert summary["Rule receipt"].startswith("Every stated item, feedback item and theme is covered by the PRD: pass (6 checked, 1 found, 1 filled).")
    # SF-2 is covered by nothing: the independent export check fails coverage, and the workbook still ships.
    cov = next(c for c in checks if c["check"].startswith("Coverage"))
    assert cov["pass"] is False and cov["failures"] == ["SF-2"]
    assert checks_header(checks).startswith("fail: Coverage (1)")
    ck = wb["Checks"]
    assert ck.cell(row=2, column=2).value == "Fail"


def test_engagement_requirement_typing():
    """2026-10-02: the delivery party's own obligations (a contract item whose subject is a party the contract's
    title names) are typed Engagement; product requirements from the same contract are not."""
    from prd_xlsx import requirement_type
    ledger = {
        "SF-1": {"id": "SF-1", "documentKind": "contract", "documentTitle": "SOW014 Acme Partners Client Portal Final"},
        "SF-2": {"id": "SF-2", "documentKind": "deck", "documentTitle": "Acme Partners Kickoff"},
    }
    vendor = {"text": "Acme Partners staffs the engagement with a program manager and two developers.", "ledgerIds": ["SF-1"]}
    product = {"text": "The portal shows each applicant the status of every submitted form.", "ledgerIds": ["SF-1"]}
    from_deck = {"text": "Acme Partners runs a weekly status meeting.", "ledgerIds": ["SF-2"]}
    assert requirement_type(vendor, ledger) == "Engagement"
    assert requirement_type(product, ledger) != "Engagement"
    assert requirement_type(from_deck, ledger) != "Engagement"
    assert requirement_type(vendor) != "Engagement"  # no ledger: the old behavior
