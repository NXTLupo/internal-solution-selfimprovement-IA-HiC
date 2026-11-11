"""The LLM merge path must never hand back empty point strings for non-empty input.

Every model call is mocked: these tests make no network request.
"""
import json

import pytest

from util.llm_models import deepseek
from util.text_processing import merge_ds


CHUNKS = [
    {
        "positive": [
            {"point": "The app is fast", "frequency": 2, "evidence": {"post1": "quote1", "post2": "quote2"}},
            {"point": "Accurate cycle tracking", "frequency": 3, "evidence": {"post17": "quote17"}},
        ],
        "negative": [
            {"point": "App keeps crashing", "frequency": 4, "evidence": {"post5": "quote5"}},
        ],
    },
    {
        "positive": [
            {"point": "Quick performance", "frequency": 1, "evidence": {"post3": "quote3"}},
        ],
        "negative": [
            {"point": "Frequent crashes during sync", "frequency": 2, "evidence": {"post6": "quote6"}},
        ],
    },
]

NESTED_REPLY = json.dumps({
    "positive": {"The app is fast": "Fast performance", "Quick performance": "Fast performance"},
    "negative": {"App keeps crashing": "App stability issues", "Frequent crashes during sync": "App stability issues"},
})

REPLIES_THAT_MUST_NOT_PRODUCE_EMPTY_POINTS = {
    "nested mapping": NESTED_REPLY,
    "nested mapping in a code fence": "```json\n" + NESTED_REPLY + "\n```",
    "flat mapping": json.dumps({"The app is fast": "Fast performance", "Quick performance": "Fast performance"}),
    "blank and non-string targets": json.dumps({
        "positive": {"The app is fast": "", "Quick performance": "   ", "Accurate cycle tracking": None},
        "negative": {"App keeps crashing": ["App stability issues"], "": "orphan"},
    }),
    "not JSON": "I could not produce a mapping.",
    "a JSON list": json.dumps(["Fast performance"]),
}


def _input_frequency(chunks):
    return sum(item["frequency"] for chunk in chunks for cat in ("positive", "negative") for item in chunk.get(cat, []))


def _assert_no_empty_points(result):
    assert set(result) == {"positive", "negative"}
    assert result["positive"] or result["negative"], "non-empty input produced no points"
    for category in ("positive", "negative"):
        for item in result[category]:
            assert isinstance(item["point"], str) and item["point"].strip(), f"empty {category} point: {item!r}"


@pytest.fixture
def mock_claude(monkeypatch):
    calls = []

    def install(reply):
        def fake(messages, *args, **kwargs):
            calls.append(messages)
            return reply
        monkeypatch.setattr(merge_ds, "get_claude_completion_with_json", fake)
        return calls

    return install


@pytest.mark.parametrize("reply", REPLIES_THAT_MUST_NOT_PRODUCE_EMPTY_POINTS.values(),
                         ids=REPLIES_THAT_MUST_NOT_PRODUCE_EMPTY_POINTS.keys())
def test_merge_never_returns_empty_points(mock_claude, reply):
    calls = mock_claude(reply)
    result = merge_ds.merge_similar_points(CHUNKS)
    assert len(calls) == 1
    _assert_no_empty_points(result)
    total = sum(item["frequency"] for cat in ("positive", "negative") for item in result[cat])
    assert total == _input_frequency(CHUNKS)


def test_nested_mapping_merges_within_each_category(mock_claude):
    mock_claude(NESTED_REPLY)
    result = merge_ds.merge_similar_points(CHUNKS)
    positive = {item["point"]: item for item in result["positive"]}
    negative = {item["point"]: item for item in result["negative"]}
    assert positive["Fast performance"]["frequency"] == 3
    assert positive["Fast performance"]["evidence"] == {"post1": "quote1", "post2": "quote2", "post3": "quote3"}
    assert positive["Accurate cycle tracking"]["frequency"] == 3
    assert negative["App stability issues"]["frequency"] == 6
    assert not set(positive) & set(negative)


def test_default_prompt_lists_the_points(mock_claude):
    calls = mock_claude(NESTED_REPLY)
    merge_ds.merge_similar_points(CHUNKS)
    prompt = calls[0][0]["content"]
    assert "The app is fast" in prompt and "Frequent crashes during sync" in prompt


@pytest.mark.parametrize("reply", ["", "   \n"])
def test_empty_model_reply_raises_instead_of_returning_nothing(mock_claude, reply):
    mock_claude(reply)
    with pytest.raises(merge_ds.LLMMergeError):
        merge_ds.merge_similar_points(CHUNKS)


def test_empty_input_skips_the_model(mock_claude):
    calls = mock_claude(NESTED_REPLY)
    assert merge_ds.merge_similar_points([]) == {"positive": [], "negative": []}
    assert calls == []


def test_merge_no_longer_routes_through_deepseek():
    assert not hasattr(merge_ds, "get_json_deepseek_completion")
    assert not hasattr(merge_ds, "get_single_deepseek_completion")


@pytest.mark.parametrize("fn", [deepseek.get_single_deepseek_completion, deepseek.get_json_deepseek_completion])
def test_deepseek_stub_raises_a_clear_error(fn):
    with pytest.raises(deepseek.DeepSeekUnavailableError, match="get_claude_completion"):
        fn(messages=[{"role": "user", "content": "hi"}], stream=True)
