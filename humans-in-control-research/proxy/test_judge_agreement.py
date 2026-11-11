"""Pure tests for proxy/judge_agreement.py. No proxy import, no live eval store."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from judge_agreement import WHOLE_ARTIFACT, confusion_by_judge, human_index  # noqa: E402


def test_whole_artifact_verdict_meets_whole_artifact_label():
    verdicts = [{"judge_id": "chain:deckQuality", "pass": True, "artifact_id": "deck_1", "run_id": "run_a"}]
    labels = [{"artifact_id": "deck_1", "slide_id": WHOLE_ARTIFACT, "label": "rejected"}]
    assert confusion_by_judge(labels, verdicts) == {"chain:deckQuality": {"tp": 0, "fp": 1, "fn": 0, "tn": 0}}


def test_label_carrying_only_run_id_meets_verdict_by_run_id():
    verdicts = [{"judge_id": "chain:prose", "pass": False, "artifact_id": "x", "run_id": "run_b"}]
    labels = [{"run_id": "run_b", "slide_id": WHOLE_ARTIFACT, "label": "rejected"}]
    assert confusion_by_judge(labels, verdicts)["chain:prose"]["tn"] == 1


def test_slide_verdicts_still_join_on_slide():
    verdicts = [{"judge_id": "slide.density", "pass": True, "artifact_id": "deck_1", "slide_id": "s3"}]
    labels = [{"artifact_id": "deck_1", "slide_id": "s3", "label": "approved"},
              {"artifact_id": "deck_1", "slide_id": WHOLE_ARTIFACT, "label": "rejected"}]
    assert confusion_by_judge(labels, verdicts) == {"slide.density": {"tp": 1, "fp": 0, "fn": 0, "tn": 0}}


def test_human_and_unlabeled_rows_are_ignored():
    verdicts = [{"judge_id": "human.slideApproval", "pass": True, "artifact_id": "d"},
                {"judge_id": "chain:x", "pass": True, "artifact_id": "unlabeled"}]
    labels = [{"artifact_id": "d", "slide_id": WHOLE_ARTIFACT, "label": "approved"}, {"artifact_id": "d", "label": "approved"}]
    assert confusion_by_judge(labels, verdicts) == {}
    assert ("d", WHOLE_ARTIFACT) in human_index(labels)


def test_latest_label_wins():
    labels = [{"artifact_id": "d", "slide_id": WHOLE_ARTIFACT, "label": "approved"},
              {"artifact_id": "d", "slide_id": WHOLE_ARTIFACT, "label": "rejected"}]
    assert human_index(labels)[("d", WHOLE_ARTIFACT)] is False
