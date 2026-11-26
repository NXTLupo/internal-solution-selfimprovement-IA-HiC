"""Plan Part 8, P5: each prototype screen is screenshotted by the isolated renderer and looked at by the reviewer
from another vendor; a screen the navigation cannot reach is a design check. No network: httpx.post is replaced."""
import base64
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, prototype, providers, store  # noqa: E402

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
DIRECTION = {"screens": [{"name": "Overview"}, {"name": "Cohorts"}, {"name": "Campaigns"}]}


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


class R:
    def __init__(self, status, body):
        self.status_code, self._b = status, body

    def json(self):
        return self._b


def test_screens_are_shot_by_the_renderer_and_missing_ones_are_named(monkeypatch):
    sent = {}

    def fake_post(url, json=None, timeout=None, **kw):
        sent.update(url=url, body=json)
        return R(200, {"shots": [{"screen": "first view", "png": base64.b64encode(PNG).decode()},
                                 {"screen": "Overview", "png": base64.b64encode(PNG).decode()}], "unreachable": ["Cohorts", "Campaigns"]})
    monkeypatch.setattr(prototype.httpx, "post", fake_post)
    shots, unreachable, script_errors = prototype.screenshots("<html><body>x</body></html>", DIRECTION)
    assert script_errors == []
    assert sent["url"].endswith("/shots") and sent["body"]["screens"] == ["Overview", "Cohorts", "Campaigns"]
    assert [n for n, _ in shots] == ["first view", "Overview"] and shots[0][1] == PNG and unreachable == ["Cohorts", "Campaigns"]


def test_renderer_down_means_a_source_only_review():
    assert prototype.screenshots("<html></html>", DIRECTION) is None          # conftest: the renderer is a closed port


def test_the_reviewer_sees_the_screenshots(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "k")
    seen = {}

    def fake_gemini(model, prompt, ledger, system=None, json_schema=None, max_output_tokens=0, images=None, **kw):
        seen.update(prompt=prompt, images=images)
        return '{"scores": {"concept": 4, "hierarchy": 3}, "must_fix": [{"where": "Overview", "problem": "clipped title", "fix": "wrap it"}]}', None, None
    monkeypatch.setattr(providers, "gemini_generate", fake_gemini)
    monkeypatch.setattr(prototype.verify, "judge_model_for", lambda m: "gemini-4-carbon")
    out = prototype.critique("<html></html>", DIRECTION, None, providers.Ledger(limit_usd=1), "claude-opus-5-5",
                             shots=[("first view", PNG), ("Overview", PNG)])
    assert seen["images"] == [("image/png", PNG), ("image/png", PNG)]
    assert "SCREENSHOTS follow the source" in seen["prompt"] and "first view; Overview" in seen["prompt"]
    assert out["looked_at"] == ["first view", "Overview"] and out["must_fix"][0]["fix"] == "wrap it"


def test_gemini_request_carries_images(monkeypatch):
    captured = {}

    class Resp:
        status_code = 200

        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": "{}"}]}}], "usageMetadata": {}}
    monkeypatch.setattr(providers.httpx, "post", lambda url, json=None, timeout=None, headers=None: (captured.update(body=json) or Resp()))
    providers.gemini_generate("gemini-4-carbon", "look", images=[("image/png", PNG)])
    parts = captured["body"]["contents"][0]["parts"]
    assert parts[0] == {"text": "look"} and parts[1]["inline_data"]["mime_type"] == "image/png"
    assert base64.b64decode(parts[1]["inline_data"]["data"]) == PNG


def test_a_script_error_is_shown_to_the_builder_with_the_lines_it_points_at():
    doc = "<html>\n<script>\nvar a='x'+b+\" of \"+c+\" planned</span>';\nvar ok=1;\n</script>\n</html>"
    items = prototype.script_error_items(doc, ["Uncaught SyntaxError: Invalid or unexpected token at line 3, column 30"])
    assert len(items) == 1 and "line 3: var a='x'+b+" in items[0] and "line 2: <script>" in items[0] and "same quote mark" in items[0]
    assert prototype.script_error_items(doc, ["Some error with no position"])[0].endswith("every control must work.")


def test_a_line_that_ends_inside_a_string_is_found_without_the_browser():
    doc = ("<html><body>\n<script>\nvar ok = 'fine' + \"also fine\"; // it's a comment\n"
           "card.innerHTML='<span class=\"count\">'+done+\" of \"+n+\" planned</span>';\n"
           "var t = `a template's line`;\n/* it's a block\n comment */\nvar esc = 'it\\'s fine';\n</script>\n</html>")
    found = prototype.broken_string_lines(doc)
    assert [n for n, _ in found] == [4] and "planned</span>" in found[0][1]
    items = prototype.script_error_items(doc, ["Failed to execute 'write' on 'Document': Invalid or unexpected token"])
    assert any("line 4: card.innerHTML" in i for i in items)


def test_only_the_broken_script_lines_are_rewritten_and_put_back_in_place(monkeypatch):
    nl = chr(10)
    bad = "  card.innerHTML='<span class=" + chr(34) + "count" + chr(34) + ">'+done+" + chr(34) + " of " + chr(34) + "+n+" + chr(34) + " planned</span>';"
    doc = nl.join(["<html><body>", "<script>", "var ok = 1;", bad, "var after = 2;", "</script>", "</body></html>"])
    assert [n for n, _ in prototype.broken_string_lines(doc)] == [4]
    good = "card.innerHTML='<span class=" + chr(34) + "count" + chr(34) + ">'+done+' of '+n+' planned</span>';"
    monkeypatch.setattr(prototype.providers, "claude", lambda *a, **k: (json.dumps({"lines": [{"n": 4, "text": good}, {"n": 99, "text": "x"}]}), None, None))
    fixed = prototype.repair_script_lines(doc, None, "m")
    out = fixed.split(nl)
    assert out[3] == "  " + good and out[2] == "var ok = 1;" and out[4] == "var after = 2;" and len(out) == 7
    assert prototype.broken_string_lines(fixed) == []
    assert prototype.repair_script_lines(fixed, None, "m") is None          # nothing broken: nothing asked, nothing changed


def test_a_run_time_error_is_repaired_on_the_lines_its_message_names(monkeypatch):
    nl = chr(10)
    doc = nl.join(["<html><body>", "<script>", "function decisionScreen(){return 'a';}", "function render(){", "var self=this;",
                   "scr.innerHTML=self[self.screen]();", "}", "</script>", "</body></html>"])
    errs = ["self[self.screen] is not a function"]
    assert prototype.failing_lines(doc, errs) == [6]
    assert prototype.failing_lines(doc, ["Uncaught TypeError: x is not a function at line 4, column 2"]) == [4]
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["ask"] = messages[0]["content"]
        return json.dumps({"lines": [{"n": 6, "text": "scr.innerHTML=({decision:decisionScreen})[self.screen]();"}, {"n": 500, "text": "x"}]}), None, None
    monkeypatch.setattr(prototype.providers, "claude", fake)
    out = prototype.repair_runtime_lines(doc, errs, None, "m").split(nl)
    assert out[5] == "scr.innerHTML=({decision:decisionScreen})[self.screen]();" and len(out) == 9 and out[4] == "var self=this;"
    assert "decisionScreen, render" in seen["ask"] and "6: scr.innerHTML" in seen["ask"]


def test_a_quote_mark_inside_a_regular_expression_opens_no_string():
    nl, q = chr(10), chr(34)
    ok = "html+='<b data-d=" + q + "'+t.d.replace(/" + q + "/g," + q + "&quot;" + q + ")+'" + q + ">'+t.d.split(/['" + q + "]/)[0]+'</b>'; var r = a / b / c;"
    doc = nl.join(["<script>", ok, "var bad = 'open + x;", "</script>"])
    assert [n for n, _ in prototype.broken_string_lines(doc)] == [3]


def test_an_empty_screen_is_sent_to_repair_with_the_whole_script_when_no_line_is_named(monkeypatch):
    nl = chr(10)
    doc = nl.join(["<html><body><div id=app></div>", "<script>", "function go(){", "var main=document.createElement('main');",
                   "main.textContent='content';", "}", "go();", "</script>", "</body></html>"])
    errs = ['the screen "first view" is empty: it shows 0 characters of text outside the navigation.']
    assert prototype.failing_lines(doc, errs) == []
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["ask"] = messages[0]["content"]
        return json.dumps({"lines": [{"n": 5, "text": "main.textContent='content';document.getElementById('app').appendChild(main);"}]}), None, None
    monkeypatch.setattr(prototype.providers, "claude", fake)
    out = prototype.repair_runtime_lines(doc, errs, None, "m").split(nl)
    assert "appendChild(main)" in out[4] and "3: function go(){" in seen["ask"] and "names no line" in seen["ask"]
    assert prototype.repair_runtime_lines("<p>no script</p>", ["Something with no place"], None, "m") is None


def test_a_function_whose_brackets_do_not_pair_is_named_for_the_repair(monkeypatch):
    nl = chr(10)
    doc = nl.join(["<script>", "function a(){", "  var s='a } string'; // a } comment", "  return s.replace(/}/g,'');", "}",
                   "function b(){", "  if(x){ y(); }", "  }", "}", "function c(){", "  return 1;", "}", "</script>"])
    assert prototype.unbalanced_functions(doc) == [(6, 9, "b", -1)]
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["ask"] = messages[0]["content"]
        return json.dumps({"lines": [{"n": 8, "text": "// (stray brace removed)"}]}), None, None
    monkeypatch.setattr(prototype.providers, "claude", fake)
    out = prototype.repair_runtime_lines(doc, ["Uncaught SyntaxError: Unexpected token 'function' at line 10"], None, "m")
    assert "function b (lines 6 to 9) closes 1 more" in seen["ask"] and "2: function a" not in seen["ask"]
    assert prototype.unbalanced_functions(out) == [] and out.split(nl)[7] == "  // (stray brace removed)"


def test_an_em_dash_written_as_a_script_escape_is_removed_too():
    bs = chr(92)
    doc = "<script>var s = esc(a.course)+' " + bs + "u2014 '+esc(a.name); var t = 'A &mdash; B';</script>"
    out = prototype._no_em_dash(doc)
    assert "u2014" not in out and "mdash" not in out and "esc(a.course)+', '+esc(a.name)" in out and "'A, B'" in out


KIT_DIRECTION = {"product_name": "Course AI Rules", "concept": "One place where a student sees what each course allows.",
                 "shell": "topbar", "screens": [
                     {"name": "My courses", "job": "See what each course allows.", "key_interactions": ["Filter by rule"]},
                     {"name": "Ask the assistant", "job": "Ask what a rule means.", "key_interactions": ["Ask a question"]},
                     {"name": "Disclose use", "job": "Tell the instructor how AI was used.", "key_interactions": ["Send a disclosure"]}],
                 "dataset": {"entity": "Assignment", "records": 120, "fields": [{"name": "Rule", "values": "Allowed, Allowed with disclosure, Not allowed"}]}}
KIT_SPEC = {"product_name": "Course AI Rules", "tagline": "What each course allows",
            "entity": {"singular": "Assignment", "plural": "Assignments", "names": ["Essay one", "Lab report", "Problem set"]},
            "fields": [{"key": "Rule", "label": "AI rule", "kind": "category", "options": ["Allowed", "Allowed with disclosure", "Not allowed"]},
                       {"key": "course", "label": "Course", "kind": "category", "options": ["Biology", "Writing", "Statistics"]},
                       {"key": "hours", "label": "Hours", "kind": "number", "min": 2, "max": 20, "unit": "h"},
                       {"key": "due", "label": "Due", "kind": "date"}, {"key": "junk", "label": "Junk", "kind": "text", "options": []}],
            "screens": [
                {"name": "my courses", "job": "See what each course allows.", "blocks": [
                    {"type": "kpis", "fields": ["rule", "hours", "nope"]}, {"type": "chart", "group_by": "hours"},
                    {"type": "table", "fields": ["rule", "course", "due"]}, {"type": "sparkle"}]},
                {"name": "Ask the assistant", "job": "Ask.", "blocks": [{"type": "assistant", "title": "Rule helper", "prompts": [
                    {"ask": "Can I use AI to outline?", "answer": "Yes, with a note \u2014 say which tool you used.", "based_on": ["AI rule"]}]}]},
                {"name": "Disclose use", "job": "Tell.", "blocks": [
                    {"type": "form", "inputs": [{"label": "Tool", "kind": "select", "options": ["One"]}, {"label": "What it did", "kind": "textarea"}]},
                    {"type": "steps", "items": [{"title": "Only one", "body": "x"}]},
                    {"type": "cards", "items": [{"title": "See the rules", "body": "Back to the list.", "action_label": "Open", "goes_to": "MY COURSES"}]}]}]}


def test_the_kit_makes_any_specification_drawable():
    from ia_next import protokit
    spec = protokit.normalize(KIT_SPEC, KIT_DIRECTION)
    assert [s["name"] for s in spec["screens"]] == ["My courses", "Ask the assistant", "Disclose use"]
    assert [f["key"] for f in spec["fields"]] == ["rule", "course", "hours", "due"]          # the empty text field is gone
    first = spec["screens"][0]["blocks"]
    assert [b["type"] for b in first] == ["kpis", "chart", "table"]
    assert first[0]["fields"] == ["rule", "hours"] and first[1]["group_by"] == "rule"       # a chart groups by a category
    assert chr(0x2014) not in spec["screens"][1]["blocks"][0]["prompts"][0]["answer"]
    last = spec["screens"][2]["blocks"]
    assert [b["type"] for b in last] == ["form", "cards"] and last[0]["inputs"][0]["kind"] == "text"
    assert last[1]["items"][0]["goes_to"] == "My courses"
    empty = protokit.normalize({}, KIT_DIRECTION)                                            # the model returned nothing
    assert len(empty["screens"]) == 3 and all(s["blocks"] for s in empty["screens"])
    assert any(b["type"] == "table" for s in empty["screens"] for b in s["blocks"])
    assert protokit.normalize(None, None)["screens"]


def test_the_kit_page_passes_the_prototype_validator_and_design_checks():
    from ia_next import protokit
    kit = prototype.brand_kit("nxt")
    for raw in (KIT_SPEC, {}):
        spec = protokit.normalize(raw, KIT_DIRECTION)
        doc = prototype._no_em_dash(protokit.render(spec, kit))
        assert prototype.validate_html(doc) == []
        assert prototype.design_problems(doc, kit, {"screens": spec["screens"]}) == []
        assert doc.count("Sample data") == 1

