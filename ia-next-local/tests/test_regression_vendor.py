"""The regression check fails a report judged by the author's own publisher (harness WS-H19): it compared the judge with
"anthropic", which never matches on this machine, so it could not fail."""
from ia_next import config, regression


def _check(monkeypatch, judge):
    monkeypatch.setattr(regression, "_load", lambda eid, rel: {"results/sources.json": {"sources": []},
                                                               "results/verification.json": {"judge": {"judge_model": judge}},
                                                               "results/findings.json": {"findings": []}}[rel])
    monkeypatch.setattr(regression.io, "open", lambda *a, **k: __import__("io").StringIO("## A\n\nText [S1].\n"))
    return regression.check_research({"engagement_id": "e", "result_path": "r.md"})


def test_a_judge_from_the_writers_publisher_fails(monkeypatch):
    monkeypatch.setitem(config.SEATS, "artifact", dict(config.SEATS["artifact"], primary="qwen3.8:27b-q4_K_M"))
    assert "judge was the author's vendor" in _check(monkeypatch, "qwen3.5:9b")
    assert "judge was the author's vendor" not in _check(monkeypatch, "hf.co/ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF:Q4_0")
