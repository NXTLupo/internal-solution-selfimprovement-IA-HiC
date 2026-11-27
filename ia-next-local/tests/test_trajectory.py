"""Trajectory grading (harness WS-H15, Uber): recorded turns graded in code on the right tools in the right order."""
from ia_next import memory, store, trajectory


def _turn(tr, said, steps, exit_="answered"):
    store.save_transcript(tr, "conv_t", memory.OWNER, said, steps, "reply", exit_, 3.0)


def test_each_rule_is_graded():
    _turn("tr_t00000000001", "Make a deck on AI shopping assistants", [{"tool": "start_deck", "input": {"x": 1}}])
    _turn("tr_t00000000002", "Make a deck on AI shopping assistants", [{"tool": "recall", "input": {"q": "a"}}])
    _turn("tr_t00000000003", "What is in my Library about Walmart?", [{"tool": "start_deck", "input": {}}])
    _turn("tr_t00000000004", "list my engagements", [{"tool": "list_engagements", "input": {}}, {"tool": "list_engagements", "input": {}}],
          exit_="repeat_stopped")
    r = trajectory.report(since=0)
    by = {f["trace"]: f["problems"] for f in r["failures"]}
    assert "tr_t00000000001" not in by
    assert any("start_deck was never called" in p for p in by["tr_t00000000002"])
    assert "a question started work" in by["tr_t00000000003"]
    assert "ended with repeat_stopped" in by["tr_t00000000004"] and "the same tool call was made twice" in by["tr_t00000000004"]
    assert r["graded"] >= 4 and r["rate"] is not None
