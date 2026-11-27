"""Papercuts (harness WS-H13, 26 Nov; Uber's log-papercut): friction is reported where it happens, by the agent's tool
or by IA Next's specialists, grouped by where plus the reason with its particulars removed, counted, and moved through
a lifecycle; a fixed papercut that recurs reopens."""
from ia_next import agent, papercuts


def test_the_same_friction_is_counted_on_one_papercut():
    a = papercuts.file("page reader", "read https://a.example/x", "the text", "the site answered 403")
    b = papercuts.file("page reader", "read https://b.example/y", "the text", "the site answered 403")
    c = papercuts.file("page reader", "read https://c.example/z", "the text", "the site showed a bot check")
    assert a == b and a != c
    rows = {r["id"]: r for r in papercuts.grouped()}
    assert rows[a]["count"] == 2 and rows[c]["count"] == 1 and rows[a]["state"] == "new"


def test_a_fixed_papercut_that_recurs_reopens():
    pid = papercuts.file("youtube", "read captions", "captions", "YouTube refused the request (IpBlocked)")
    papercuts.set_state(pid, "fixed")
    assert papercuts.file("youtube", "read captions", "captions", "YouTube refused the request (IpBlocked)") == pid
    assert {r["id"]: r for r in papercuts.grouped()}[pid]["state"] == "new"


def test_the_agent_has_the_tool_and_filing_tells_it_to_carry_on():
    assert any(t["name"] == "log_papercut" for t in agent.TOOLS)
    got = agent.execute_tool("log_papercut", {"area": "recall", "tried": "search memory", "expected": "notes on grocery",
                                              "happened": "nothing came back", "fix": "index the grocery reports"})
    assert got["filed"] and "carry on" in got["note"]
    assert any(r["area"] == "recall" and r["filed_by"] == "agent" for r in papercuts.grouped())
