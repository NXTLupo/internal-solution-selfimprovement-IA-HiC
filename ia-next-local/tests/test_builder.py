"""The one builder engine (uplift plan 2026-11-23, WS-6): each stepped kind, moved onto builder.py, must send the model
exactly what its own loop sent before the move (tests/fixtures/builder_golden.json, recorded from the old loops by
scripts/builder_golden.py) and leave exactly the same document, for a clean run and for one whose second step fails."""
import importlib.util
import json
import os

import pytest

from ia_next import builder, providers, store

HERE = os.path.dirname(os.path.abspath(__file__))
GOLDEN = json.load(open(os.path.join(HERE, "fixtures", "builder_golden.json"), encoding="utf-8"))


def _capture_module():
    spec = importlib.util.spec_from_file_location("builder_golden", os.path.join(HERE, "..", "scripts", "builder_golden.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def now():
    mod = _capture_module()
    return {"clean": mod.capture(), "step_two_fails": mod.capture(fail_at=2)}


@pytest.mark.parametrize("scenario", ["clean", "step_two_fails"])
@pytest.mark.parametrize("kind", ["personas", "arch", "competitive", "journey"])
def test_the_engine_sends_what_the_old_loop_sent(now, scenario, kind):
    old, new = GOLDEN[scenario][kind], json.loads(json.dumps(now[scenario][kind], sort_keys=True))
    assert [s["stage"] for s in new["stages"]] == [s["stage"] for s in old["stages"]]
    assert [s["said"] for s in new["stages"]] == [s["said"] for s in old["stages"]]
    assert len(new["calls"]) == len(old["calls"])
    for a, b in zip(new["calls"], old["calls"]):
        assert a["system"] == b["system"] and a["msg"] == b["msg"] and a["schema"] == b["schema"]
    assert new["doc"] == old["doc"]


def test_a_required_step_that_fails_fails_the_build_and_an_optional_one_leaves_empty_lists(monkeypatch):
    class Stage:
        def __init__(self, *a):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def say(self, text):
            pass
    monkeypatch.setattr(store, "stage", Stage)
    spec = builder.Spec("t", steps=[builder.Step("one", "first", {}, fresh=True, required=True),
                                    builder.Step("two", "second", {}, defaults=("flows",))])

    def ask(system, msg, schema):
        if msg.endswith("second"):
            raise ValueError("not json")
        return {"title": "x"}
    assert builder.run(spec, "head ", ask, "m") == {"title": "x", "flows": []}

    def broken(system, msg, schema):
        raise providers.ProviderError("down")
    with pytest.raises(providers.ProviderError):
        builder.run(spec, "head ", broken, "m")
