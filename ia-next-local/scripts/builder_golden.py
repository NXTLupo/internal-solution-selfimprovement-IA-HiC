"""Record exactly what the stepped builders send to the model (uplift plan 2026-11-23, WS-6).

Before the builders moved onto builder.py, this ran against the old code and wrote tests/fixtures/builder_golden.json:
for each stepped kind (personas, architecture, competitive, journey map) the visible steps in order, every message,
system prompt and schema the model received, and the finished document, with a deterministic stand-in for the model.
tests/test_builder.py replays the same stand-in through the new engine and requires the same record, byte for byte:
the same inputs to a model at a fixed seed give the same artifact, so a migration that passes is not a regression.

    python scripts/builder_golden.py tests/fixtures/builder_golden.json     (inside the ia-next-local image, cwd = repo)
"""
import contextlib
import json
import sys


def fake_value(schema, path, n=3):
    """A deterministic reply for a schema: every string names its path, every list holds n items."""
    t = schema.get("type")
    if "enum" in schema:
        return schema["enum"][0]
    if t == "object":
        return {k: fake_value(v, f"{path}.{k}", n) for k, v in (schema.get("properties") or {}).items()}
    if t == "array":
        return [fake_value(schema.get("items") or {"type": "string"}, f"{path}[{i}]", n) for i in range(min(n, schema.get("maxItems") or n))]
    if t == "integer":
        return 2
    if t == "number":
        return 0.5
    if t == "boolean":
        return True
    return f"{path} [S1]"


def recorder():
    calls, stages = [], []

    class Stage:
        def __init__(self, tid, name, model):
            self.name = name
            stages.append({"stage": name, "said": []})

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def say(self, text):
            stages[-1]["said"].append(text)

        def expect(self, seconds):
            pass
    return calls, stages, Stage


def capture(fail_at=0):
    """fail_at: the call number whose reply is not valid JSON (0: none), to record what a failed step leaves."""
    from ia_next import config, journeymap, localartifact, store
    out = {}
    corpus = '<source id="S1" title="Advising survey">Students say advisors are hard to reach.</source>'
    for kind in ("personas", "arch", "competitive"):
        calls, stages, Stage = recorder()

        def ask(model, system, msg, schema):
            calls.append({"system": system, "msg": msg, "schema": schema})
            if len(calls) == fail_at:
                return "not json"
            return json.dumps(fake_value(schema, f"step{len(calls)}"))
        with _patched(store, "stage", Stage):
            doc = localartifact._steps(kind, "How students find advising", corpus, config.QWEN, ask, tid="")
        out[kind] = {"calls": calls, "stages": stages, "doc": doc}
    calls, stages, Stage = recorder()

    def jask(model, msg, schema, ledger):
        calls.append({"system": journeymap.SYSTEM, "msg": msg, "schema": schema})
        if len(calls) == fail_at:
            raise ValueError("not json")
        return fake_value(schema, f"step{len(calls)}", n=4)
    with _patched(store, "stage", Stage):
        doc = journeymap.compose("A first-year student", "finding an advisor", corpus, config.QWEN, tid="", ask=jask)
    out["journey"] = {"calls": calls, "stages": stages, "doc": doc}
    return out


@contextlib.contextmanager
def _patched(obj, name, value):
    old = getattr(obj, name)
    setattr(obj, name, value)
    try:
        yield
    finally:
        setattr(obj, name, old)


if __name__ == "__main__":
    with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"clean": capture(), "step_two_fails": capture(fail_at=2)}, fh, indent=1, ensure_ascii=False, sort_keys=True)
    print("written", sys.argv[1])
