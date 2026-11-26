"""The second brain (plan Part 2): sources archived in HiC's wiki and read back as manifest chunk pointers, whole when
they fit. No network: hic._call is replaced, and conftest points HiC at a closed port for everything else."""
import json
import os
import sys
import time
import urllib.parse

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, hic, secondbrain, store, transcripts  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _long_brief():
    paras = [f"Paragraph {i}: Annual Giving needs cohort retention for segment {i} without manual Excel joins." * 6 for i in range(40)]
    paras.append("Data architecture: Ascend, Snowflake, Cvent and Marketing Cloud feed one governed layer.")   # the end of the file
    return "\n\n".join(paras)


def test_a_long_source_is_read_whole_without_hic():
    """17 Nov: the deck composer saw the first 12,000 characters of each source; the Product Brief was 14,750."""
    eid = store.create_engagement("e", "o")
    text = _long_brief()
    assert len(text) > 14_000
    chunks, report = secondbrain.material(eid, [{"id": "S4", "title": "Product brief", "url": "", "text": text}], "data architecture")
    assert report["full_coverage"] and report["via"]["S4"] == "local" and "_reason" in report["via"]
    joined = "\n\n".join(c["text"] for c in chunks)
    assert "Ascend, Snowflake, Cvent and Marketing Cloud" in joined                  # the end of the document is there
    assert all(len(c["text"]) <= secondbrain.LOCAL_CHUNK_CHARS for c in chunks)


def _page(path, chunk_texts):
    """A wiki page as HiC writes it: frontmatter with each chunk's id and char_span into the body."""
    body, spans, pos = "", [], 0
    for t in chunk_texts:
        spans.append((pos, pos + len(t)))
        body += t + "\n\n"
        pos = len(body)
    front = "---\ntitle: x\nchunks:\n" + "".join(f'  - id: "{path}#c{i}"\n    char_span: [{a}, {b}]\n' for i, (a, b) in enumerate(spans))
    return front + "---\n" + body


def _fake_hic(calls, chunk_texts):
    def call(method, path, timeout, **kw):
        calls.append((method, path, kw.get("json")))
        if path == "/api/wiki/write-article":
            body = kw["json"]
            assert body["kind"] == "upload" and body["engagement"] and body["url"].startswith("ia-next://")
            return {"status": "ok", "wikiPath": f"uploads/{body['engagement']}/abc123.md"}
        if path.startswith("/api/wiki/read-article/"):
            ref = urllib.parse.unquote(path[len("/api/wiki/read-article/"):])
            assert "#" not in ref                                  # one read of the whole page, not one per chunk
            return {"wikiPath": ref, "content": _page(ref, chunk_texts)}
        raise AssertionError(path)                                 # no manifest selection call (it stalled HiC)
    return call


def test_sources_are_archived_once_and_read_as_manifest_chunks(monkeypatch):
    eid = store.create_engagement("e", "o")
    calls = []
    monkeypatch.setattr(hic, "_call", _fake_hic(calls, ["Annual Giving cannot see retention by cohort.", "Ascend feeds Snowflake."]))
    src = {"id": "S2", "title": "02_Solution_Vision.docx", "url": "", "text": "Annual Giving cannot see retention by cohort. Ascend feeds Snowflake."}
    chunks, report = secondbrain.material(eid, [src], "retention")
    assert [c["pointer"] for c in chunks] == [f"uploads/{eid}/abc123.md#c0", f"uploads/{eid}/abc123.md#c1"]
    assert report["via"] == {"S2": "manifest"} and report["full_coverage"]
    assert [c["text"] for c in chunks] == ["Annual Giving cannot see retention by cohort.", "Ascend feeds Snowflake."]
    assert sum(1 for _, p, _ in calls if p.startswith("/api/wiki/read-article/")) == 1
    prompt = secondbrain.as_prompt(chunks)
    assert f'<chunk pointer="uploads/{eid}/abc123.md#c1">' in prompt and '<source id="S2" title="02_Solution_Vision.docx">' in prompt
    calls.clear()
    again, _ = secondbrain.material(eid, [src], "retention")
    assert calls == [] and [c["pointer"] for c in again] == [c["pointer"] for c in chunks]   # kept here: HiC is not asked again
    mapping = json.load(open(store.safe_path(eid, secondbrain.MAP_REL), encoding="utf-8"))
    assert mapping["S2"]["wiki_path"] == f"uploads/{eid}/abc123.md"


def test_over_budget_keeps_the_chunks_that_speak_to_the_objective():
    eid = store.create_engagement("e", "o")
    filler = [{"id": f"S{i}", "title": f"t{i}", "url": "", "text": ("Catering menus and parking for the gala. " * 30)} for i in range(2, 6)]
    target = {"id": "S9", "title": "arch", "url": "", "text": "The data architecture joins Ascend, Snowflake and Cvent in one governed layer."}
    chunks, report = secondbrain.material(eid, filler + [target], "data architecture Ascend Snowflake", budget=1500)
    assert not report["full_coverage"] and any(c["source_id"] == "S9" for c in chunks)
    assert sum(len(c["text"]) for c in chunks) <= 1500


def test_new_uploads_count_as_unanalysed_until_the_analysis_has_read_them():
    """17 Nov live run: an older analysis task updated after the uploads made the time check skip three new documents."""
    eid = store.create_engagement("e", "o")
    transcripts.add_text_source(eid, "old interview", "The partner said researchers use AI to build the longlist.", "transcript")
    with open(store.safe_path(eid, "results/sources.json"), "w", encoding="utf-8") as fh:
        json.dump({"sources": [{"id": "S1", "title": "old interview", "url": "", "text": "x"}]}, fh)
    sid = transcripts.add_text_source(eid, "01_Product_Brief.docx", "Annual Giving cannot see donor retention by cohort.", "document")
    old, _ = store.create_task(eid, "transcript", {"objective": "o"}, 1.0)
    time.sleep(0.01)
    store.update_task(old, status="done")                                            # touched after the upload arrived
    assert [u["id"] for u in transcripts.unanalysed_uploads(eid)] == [sid]
