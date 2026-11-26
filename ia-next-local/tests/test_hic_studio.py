"""Plan Part 2: HiC's artifact studio, themes from HiC's topic model, and recall from the second brain. No network:
hic._call is replaced (conftest points HiC at a closed port for everything else)."""
import json
import os
import sys
from types import SimpleNamespace
import urllib.parse

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import (agent, app as app_module, artifacts, attachments, config, hic, providers, secondbrain,  # noqa: E402
                     store, themes, transcripts, verify)

BRIEF = "Annual Giving cannot see donor retention by cohort without manual Excel joins."
VISION = "One governed layer joins Ascend, Snowflake and Cvent so Annual Giving acts on trusted numbers."


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _engagement_with_material():
    eid = store.create_engagement("Farmers demo", "o")
    for name, data in (("findings.json", {"findings": [
            {"claim": "Retention is invisible", "quote": "cannot see donor retention by cohort", "source_id": "S1", "claim_type": "SUPPORTED_FACT"}]}),
            ("sources.json", {"sources": [{"id": "S1", "title": "Product brief", "url": "", "text": BRIEF},
                                          {"id": "S2", "title": "Solution vision", "url": "", "text": VISION}]})):
        with open(store.safe_path(eid, f"results/{name}"), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
    return eid


def test_an_artifact_is_made_in_hic_checked_here_and_served_in_a_sandbox(monkeypatch):
    eid = _engagement_with_material()
    calls = []

    def fake(method, path, timeout, **kw):
        calls.append(path)
        if path == "/api/jobs":
            assert kw["json"]["op"] == "/api/artifact/generate" and kw["json"]["body"]["kind"] == "prd"
            assert BRIEF in kw["json"]["body"]["corpus"] and kw["json"]["body"]["brand"] == "nu"
            return {"job_id": "job_1", "status": "queued"}
        if path == "/api/jobs/job_1":
            return {"status": "done", "result": {"html": (
                "<html><head><title>PRD</title><script>var x=1</script></head><body><h1>Retention by cohort</h1>"
                "<p>The brief says “cannot see donor retention by cohort without manual Excel joins”.</p>"
                "<p>It also says \"every campaign doubles its response rate within a month\".</p></body></html>"),
                "artifact_id": "a1", "run_status": "ok"}}
        raise hic.HicUnavailable("not in this test")                 # the second brain falls back to local chunks
    monkeypatch.setattr(hic, "_call", fake)
    monkeypatch.setattr(verify, "judge", lambda text, brief, sources, author, ledger: {"judge_model": "gemini-x", "items": [], "score": 0.8})
    tid, created = artifacts.start_artifact_task(eid, "prd", "What must the product do for Annual Giving?", "nu", idem_key="k")
    import time as _t
    for _ in range(100):
        if store.get_task(tid)["status"] in ("done", "failed"):
            break
        _t.sleep(0.05)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert [n["specialist"] for n in t["nodes"]] == ["Artifact Studio (HiC)", "Verifier"]
    assert "0 quoted passages not found" in t["summary"] and "reviewer score 0.80" in t["summary"]
    meta = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/artifact.json"), encoding="utf-8"))
    assert meta["quotes_first_draft"] == ["every campaign doubles its response rate within a month"]
    assert meta["quotes_unquoted"] == 1 and meta["quotes_not_in_sources"] == []      # no longer shown as a quote
    assert t["spent_usd"] == pytest.approx(artifacts.ESTIMATE_USD) and "estimated" in t["summary"]   # telemetry unreadable here
    assert "/api/jobs" in calls
    doc_text = open(store.safe_path(eid, f"results/tasks/{tid}/artifact.html"), encoding="utf-8").read()
    assert "\"every campaign doubles" not in doc_text and "every campaign doubles its response rate" in doc_text
    c = TestClient(app_module.app)
    wrapper = c.get(f"/api/tasks/{tid}/view").text
    assert f'sandbox="allow-scripts"' in wrapper and f"/api/tasks/{tid}/artifact" in wrapper
    doc = c.get(f"/api/tasks/{tid}/artifact")
    assert "default-src 'none'" in doc.headers["content-security-policy"] and "connect-src 'none'" in doc.headers["content-security-policy"]
    assert "@font-face" in doc.text and "Retention by cohort" in doc.text
    dl = c.get(f"/api/tasks/{tid}/artifact/download")
    assert "attachment" in dl.headers["content-disposition"] and dl.headers["content-security-policy"]


def test_hics_real_cost_is_metered_from_its_telemetry_by_run_id(monkeypatch):
    seen = {}

    def fake(method, path, timeout, **kw):
        if path == "/api/jobs":
            seen["headers"] = kw.get("headers")
            return {"job_id": "job_9"}
        if path == "/api/jobs/job_9":
            return {"status": "done", "result": {"html": "<html><body>ok</body></html>"}}
        if path == "/api/telemetry/events":
            seen["params"] = kw.get("params")
            return {"rows": [{"cost_usd": 1.25}, {"cost_usd": 1.85}]}
        raise AssertionError(path)
    monkeypatch.setattr(hic, "_call", fake)
    artifacts.generate("prd", "nu", "g", "corpus", "document", run_id="ia-next-task_x")
    assert seen["headers"] == {"x-hic-run-id": "ia-next-task_x", "x-hic-session": "ia-next"}
    assert artifacts.hic_cost("ia-next-task_x") == (3.1, 2)
    assert seen["params"]["run_id"] == "ia-next-task_x" and seen["params"]["kind"] == "ai_call"


def test_quotes_are_checked_per_text_run_and_close_ones_restored():
    sources = [{"id": "S1", "text": "Annual Giving cannot see donor retention by cohort without manual Excel joins. Another sentence here."}]
    doc = ("<table><tr><td>\"Owner</td><td>Phase 3\"</td></tr></table>"                 # marks across cells: not a quote
           "<p>The brief says “Annual Giving can't see donor retention by cohort without manual Excel joins”.</p>"   # a changed word (a space alone now passes)
           "<blockquote>Every gift officer calls each donor weekly without fail.</blockquote>")
    found = artifacts.quoted_passages(doc)
    assert "Owner</td><td>Phase 3" not in " ".join(found) and len(found) == 2
    missing = artifacts.unverified_quotes(doc, sources)
    fixed, restored, unquoted = artifacts.repair_quotes(doc, sources, missing)
    assert restored == 1 and "“Annual Giving cannot see donor retention by cohort without manual Excel joins.”" in fixed


def test_a_document_from_hic_needs_spend_approval():
    from ia_next import control
    eid = _engagement_with_material()
    args = {"engagement_id": eid, "kind": "prd", "goal": "What must the product do?", "brand": "nu"}
    first = artifacts.execute("start_artifact", dict(args))
    assert first["approval"] == "pending" and "HiC's own meter" in control.pending()[0]["reason"]
    assert not store.list_tasks(eid)


def test_hic_logo_files_become_the_brand_mark_inside_the_sandbox():
    doc = ("<style>.a{background:url('assets/nxt-logo-black.png')} .b{background-image:url(\"assets/nxt-logo-white.png\")}"
           " .c{background:url(assets/texture.jpg)}</style><img src=\"assets/nxt-logo-black.png\">")
    out = artifacts.inline_brand_assets(doc, "nxt")
    assert "assets/" not in out and out.count("data:image/svg+xml;base64,") == 3 and "data:image/gif" in out
    import base64 as b64
    white = out.split('url("')[1].split('"')[0]
    assert 'fill="#FFFFFF"' in b64.b64decode(white.split(",", 1)[1]).decode()


def test_artifact_tool_checks_kind_goal_and_attached_files():
    eid = _engagement_with_material()
    sid = transcripts.add_text_source(eid, "02_vision.docx", VISION + " More text here.", "document")
    assert "kind must be one of" in artifacts.execute("start_artifact", {"engagement_id": eid, "kind": "poem", "goal": "g", "brand": "nxt"})["error"]
    assert "goal" in artifacts.execute("start_artifact", {"engagement_id": eid, "kind": "prd", "goal": " ", "brand": "nxt"})["error"]
    files = attachments.verified([{"engagement_id": eid, "source_id": sid, "fresh": True}])
    assert files, sid
    with attachments.scope(files):
        refused = artifacts.execute("start_artifact", {"engagement_id": eid, "kind": "prd", "goal": "g", "brand": "nxt"})
    assert "02_vision.docx" in refused["error"]
    assert "start_artifact" in agent.MODULE_FOR_TOOL and "start_themes" in agent.MODULE_FOR_TOOL


def test_themes_come_from_hics_topic_model_and_quotes_are_checked(monkeypatch):
    eid = _engagement_with_material()
    passages = [{"source_id": f"S{1 + i % 2}", "title": "Product brief" if i % 2 == 0 else "Solution vision",
                 "pointer": f"uploads/{eid}/p{i // 2}.md#c{i}", "text": (BRIEF if i % 2 == 0 else VISION) + f" Passage {i}."} for i in range(10)]
    monkeypatch.setattr(secondbrain, "material", lambda eid_, sources, objective, budget=0: (passages, {"via": {"S1": "manifest"}}))

    def fake_hic(method, path, timeout, **kw):
        if path == "/api/topic-model/analyze":
            assert len(kw["json"]["items"]) == 10
            return {"job_id": "tm_1", "status": "queued"}
        if path == "/api/topic-model/status/tm_1":
            return {"status": "completed", "result": {"doc_count": 10, "noise_count": 0, "pipeline_version": "v2", "topics": [
                {"id": 0, "name": "Cluster 0", "post_ids": [p["pointer"] for p in passages if p["source_id"] == "S1"], "top_terms": [["retention", 0.3]]},
                {"id": 1, "name": "Cluster 1", "post_ids": [p["pointer"] for p in passages if p["source_id"] == "S2"], "top_terms": [["snowflake", 0.3]]}]}}
        raise AssertionError(path)
    monkeypatch.setattr(hic, "_call", fake_hic)

    def fake_claude(model, system, messages, ledger, **kw):
        assert kw["json_schema"] is themes.NAME_SCHEMA and "<passage pointer=" in messages[0]["content"]
        return json.dumps({"themes": [
            {"id": 0, "name": "Annual Giving cannot see retention by cohort", "insight": "The Annual Giving team joins files by hand.",
             "quote": "cannot see donor retention by cohort", "pointer": passages[0]["pointer"]},
            {"id": 1, "name": "A governed layer would join the systems", "insight": "ITS would run one layer.",
             "quote": "a sentence that is in no passage at all", "pointer": passages[1]["pointer"]}]}), None, None
    monkeypatch.setattr(providers, "claude", fake_claude)
    tid, _ = store.create_task(eid, "themes", {"goal": "What blocks Annual Giving?", "brand": "nu"}, 1.0)
    themes.run_themes_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert "2 themes in 1 group, from 10 passages" in t["summary"] and "1 with a verbatim quote" in t["summary"]
    out = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/themes.json"), encoding="utf-8"))
    quoted = {x["name"]: x["quote"] for x in out["themes"]}
    assert quoted["Annual Giving cannot see retention by cohort"] == "cannot see donor retention by cohort"
    assert quoted["A governed layer would join the systems"] == ""              # its quote was not in any passage
    page = open(t["result_path"], encoding="utf-8").read()
    assert "Themes: Farmers demo" in page and "@font-face" in page


def test_recall_reads_the_second_brain_with_pointers(monkeypatch):
    def fake(method, path, timeout, **kw):
        if path == "/api/manifest/chunks-by-goal":
            assert kw["params"]["goal"] == "donor retention by cohort"
            return {"chunk_ids": ["articles/x/a.md#c2", "articles/x/b.md#c0"], "pages": {"articles/x/a.md": {"title": "Chronicle: retention"}}}
        if path.startswith("/api/wiki/read-article/"):
            ref = urllib.parse.unquote(path[len("/api/wiki/read-article/"):])
            return {"chunk": f"Passage at {ref}."}
        raise AssertionError(path)
    monkeypatch.setattr(hic, "_call", fake)
    got = agent._recall({"query": "donor retention by cohort"})
    assert got["second_brain"][0] == {"pointer": "articles/x/a.md#c2", "title": "Chronicle: retention", "excerpt": "Passage at articles/x/a.md#c2."}
    assert len(got["second_brain"]) == 2


def test_recall_still_works_when_hic_is_down():
    got = agent._recall({"query": "anything"})
    assert got["second_brain"] == [] and "memory" in got


def test_a_quote_across_a_table_row_keeps_its_longest_cell():
    """17 Nov themes page: "Production readiness | ITS can name a source owner ..." came from a Word table row."""
    q = "Production readiness | ITS can name a source owner, join key, access path, and remediation owner for every required feed."
    assert verify.narrow_table_quote(q) == "ITS can name a source owner, join key, access path, and remediation owner for every required feed"
    assert verify.narrow_table_quote("Owner | Phase 3") == ""                 # no cell long enough to stand as a quote
    assert verify.narrow_table_quote("No table here, just a sentence.") == "No table here, just a sentence."
    found, dropped, _ = transcripts.check_findings(
        [{"claim": "c", "quote": q, "source_id": "S1", "claim_type": "SUPPORTED_FACT"}],
        [{"id": "S1", "text": "TABLE: Gate | Proof\n" + q}])
    assert not dropped and "|" not in found[0]["quote"]


def test_approving_a_document_on_its_card_returns_the_task_to_follow(monkeypatch):
    from ia_next import control
    eid = _engagement_with_material()
    started = []
    monkeypatch.setattr(artifacts.threading, "Thread", lambda *a, **k: SimpleNamespace(start=lambda: started.append(k.get("args"))))
    args = {"engagement_id": eid, "kind": "prd", "goal": "What must the product do?", "brand": "nu"}
    pending = artifacts.execute("start_artifact", dict(args))
    r = TestClient(app_module.app).post(f"/api/approvals/{pending['approval_id']}", json={"approve": True}).json()
    assert r["approval"]["status"] == "approved" and r["started"]["task_id"].startswith("task_")
    assert store.get_task(r["started"]["task_id"])["kind"] == "artifact" and started


def test_css_and_scripts_are_not_counted_as_quotes():
    """17 Nov PRD: CSS attribute selectors inside <style> were reported as three quoted passages not in the sources."""
    doc = ("<style>[data-role=\"title\"] { font-family: 'Lato', sans-serif !important; color: #16233C !important; }</style>"
           "<script>var s = \"a long string inside a script that is not a quotation at all\";</script><p>Plain text.</p>")
    assert artifacts.quoted_passages(doc) == []
