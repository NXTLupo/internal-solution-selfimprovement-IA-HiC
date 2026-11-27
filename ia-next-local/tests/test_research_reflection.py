"""Research reflection (harness WS-H8): on a deep run, a success criterion no finding speaks to gets one more search at
fast depth with its words, and the Analyst reads only the new sources; the new findings join the old."""
from ia_next import store, studio

F1 = {"claim": "Shoppers trust assistants to compare prices", "quote": "I let the assistant compare prices for me.", "source_id": "S1"}


def test_uncovered_criteria_are_found_in_code():
    criteria = ["How shoppers use assistants to compare prices", "What retailers report about returns from agentic checkout"]
    assert studio.uncovered(criteria, [F1]) == [criteria[1]]
    assert studio.uncovered(criteria[:1], [F1]) == []


def test_one_more_round_runs_for_the_uncovered_criterion(monkeypatch):
    eid = store.create_engagement("Retail", "o")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
    brief = {"goal": "AI shopping assistants", "scope": "retail", "depth": "deep",
             "success": ["How shoppers use assistants to compare prices", "What retailers report about returns from agentic checkout"]}
    asked, analysed = [], []
    monkeypatch.setattr(studio, "research_lead", lambda e, b, l, t: asked.append((b["depth"], b["scope"])) or
                        ("p", "s", [{"id": "S1"}, {"id": "S9", "title": "Returns after agentic checkout"}]))
    monkeypatch.setattr(studio, "analyst", lambda e, b, srcs, l, t: analysed.append([s["id"] for s in srcs]) or
                        ("p", "s", [{"claim": "Retailers see more returns", "quote": "Returns rose after agentic checkout.", "source_id": "S9"}]))

    def node(name, model, fn):
        return fn()[2]
    sources, findings = studio.reflect(eid, brief, [{"id": "S1"}], [F1], None, tid, node)
    assert asked and asked[0][0] == "fast" and "returns from agentic checkout" in asked[0][1]
    assert analysed == [["S9"]] and len(findings) == 2 and {s["id"] for s in sources} == {"S1", "S9"}
