"""The regression cases must fail on bad outputs, not only pass on good ones."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, regression, store  # noqa: E402

SRC = [{"id": "S1", "title": "t", "url": "https://x", "text": "Search firms are divided on whether AI can assess finalist candidates."}]


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _write(eid, rel, obj):
    p = store.safe_path(eid, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(obj if isinstance(obj, str) else json.dumps(obj))
    return p


def test_journey_case_fails_on_a_fabricated_quote_and_few_stages():
    eid = store.create_engagement("e", "o")
    _write(eid, "results/sources.json", {"sources": SRC})
    _write(eid, "results/journey.json", {"stages": [{"pains": [{"pain": "p", "quote": "Partners hate AI.", "source_id": "S1"}]}]})
    html = _write(eid, "results/journey.html", "<style></style><div>ok</div>")
    fails = regression.check_journey({"engagement_id": eid, "result_path": html})
    assert any("stages" in f for f in fails) and any("quote not in S1" in f for f in fails)


def test_research_case_fails_when_the_judge_shares_the_authors_vendor():
    eid = store.create_engagement("e", "o")
    _write(eid, "results/sources.json", {"sources": SRC})
    _write(eid, "results/findings.json", {"findings": []})
    _write(eid, "results/verification.json", {"judge": {"judge_model": "claude-sonnet-5-5"}})
    rep = _write(eid, "results/report.md", 'Firms disagree: "Search firms are divided on whether AI can assess finalist candidates." [S1]')
    assert "judge was the author's vendor" in regression.check_research({"engagement_id": eid, "result_path": rep})


def test_media_case_rejects_a_file_that_is_not_media():
    eid = store.create_engagement("e", "o")
    _write(eid, "results/images/fake.png", "not really a png")
    _write(eid, "results/videos/fake.mp4", "x" * 200)
    assert regression.check_media(eid, "results/images/fake.png") == ["not an image file"]
    assert regression.check_media(eid, "results/videos/fake.mp4") == ["not an MP4 with content"]


def test_an_app_with_no_outputs_is_not_absorbed():
    out = regression.run()
    assert all(not s["absorbed"] for s in out["summary"].values())
