"""A repair rewrites only the sections a reviewer's point names (harness WS-H7, 26 Nov). A deep run rewrote all seven
sections, with two model reloads, to fix two or three sentences: 5.5 minutes. A point that names no section (about the
whole report) still writes the whole report again, as before. A fake model stands in."""
import json
from types import SimpleNamespace

import pytest

from ia_next import localwriter, providers

U = SimpleNamespace(model="fake")


def _findings(n=8):
    return [{"source_id": f"S{i}", "claim": f"Retailer {i} opened its checkout to assistants", "claim_type": "supported fact",
             "quote": f"Retailer {i} said assistants can now complete a purchase on its site."} for i in range(1, n + 1)]


class Fake:
    """Plans five sections of the eight entries and writes each section from its own entries."""
    def __init__(self):
        self.plans, self.sections = 0, []

    def __call__(self, model, system, messages, ledger, json_schema=None, **kw):
        props = (json_schema or {}).get("properties", {})
        if "evidence_ids" in json.dumps(props.get("sections", {})):
            self.plans += 1
            secs = [{"heading": "Heading " + "abcdefgh"[k - 1] * 3, "evidence_ids": ids} for k, ids in
                    enumerate([["E1", "E2"], ["E3", "E4"], ["E5"], ["E6", "E7"], ["E8"]], 1)]
            return json.dumps({"title": "T", "summary": "Retailers opened checkout to assistants.", "sections": secs}), U, None
        msg = messages[-1]["content"]
        k = int(msg.split("WRITE section ")[1].split(" ")[0])
        self.sections.append(k)
        ids = json_schema["properties"]["blocks"]["items"]["properties"]["evidence_ids"]["items"]["enum"]
        name = "abcdefgh"[k - 1] * 3                         # no digits: the writer's own prose check rejects figures
        text = ("Retailers in the bbb group report that shoppers stopped at the payment step"
                + (" when asked again" if self.sections.count(2) > 1 else "") if k == 2
                else f"Retailers in the {name} group describe what assistants changed for their stores")
        return json.dumps({"heading": f"Heading {name}", "implication": f"Store teams in the {name} group should act.",
                           "blocks": [{"text": text, "evidence_ids": ids[:1], "quote_ids": []},
                                      {"text": f"The {name} group adds a second observation", "evidence_ids": ids[-1:], "quote_ids": []}]}), U, None


@pytest.mark.report_steps
def test_only_the_named_section_is_written_again(monkeypatch):
    fake = Fake()
    monkeypatch.setattr(providers, "claude", fake)
    brief = {"goal": "g", "audience": "a", "scope": "s"}
    findings = _findings()
    localwriter.write(brief, findings, [], None)
    assert fake.plans == 1 and fake.sections == [1, 2, 3, 4, 5]
    fb = "- slop: Retailers in the bbb group report that shoppers stopped at the payment step"
    assert localwriter.locate(fb, localwriter.ledger_of(findings)) == {1}
    localwriter.write(brief, findings, [], None, feedback=fb)
    assert fake.plans == 1 and fake.sections == [1, 2, 3, 4, 5, 2]          # no new plan, one section rewritten


@pytest.mark.report_steps
def test_a_point_about_the_whole_report_writes_it_all_again(monkeypatch):
    fake = Fake()
    monkeypatch.setattr(providers, "claude", fake)
    brief = {"goal": "g", "audience": "a", "scope": "s"}
    findings = _findings()
    localwriter.write(brief, findings, [], None)
    fb = ("- naked-number: Section 2 retailers report that shoppers stopped at the payment step in pass 2\n"
          "- counter_evidence: the report never engages a source that disagrees")
    assert localwriter.locate(fb, localwriter.ledger_of(findings)) is None
    localwriter.write(brief, findings, [], None, feedback=fb)
    assert fake.plans == 2 and fake.sections[5:] == [1, 2, 3, 4, 5]
