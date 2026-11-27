"""A research run whose subject the Library already holds (26 Nov): the Library page joins with its passages and the
web search's results are still read. The page's passages once overwrote the web results' variable, and every such run
failed with "'tuple' object has no attribute 'get'"."""
from ia_next import providers, store, studio


def test_a_library_page_and_the_web_results_both_join_the_run(monkeypatch):
    raw = {"candidates": [{"groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://www.retaildive.com/ai-assistants", "title": "retaildive.com"}}]}}]}
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, raw))
    monkeypatch.setattr(studio, "_fetch", lambda uri: ("Retailers are adding AI assistants to customer service desks. " * 20, uri, "AI assistants at retailers"))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)
    lib = {"url": "https://www.grocerydive.com/news/ai-shopping", "title": "Grocery Dive: AI shopping assistants",
           "text": "Grocers said shoppers used AI assistants to plan baskets. " * 20, "library": "L:articles/grocery-dive/a1.md",
           "publisher": "Grocery Dive", "date": "2026-11-10"}
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [dict(lib)])
    monkeypatch.setattr("ia_next.librarysearch.page_chunks", lambda ev: [("lib/articles/grocery-dive/a1.md#c0", "Grocers said shoppers used AI.")])
    adopted = []
    monkeypatch.setattr("ia_next.secondbrain.adopt", lambda eid, src, path, chunks: adopted.append((path, chunks)))
    eid = store.create_engagement("Retail AI", "o")
    store.add_evidence(eid, "L1", lib["url"], lib["title"], lib["text"])
    store.conn().execute("UPDATE evidence SET source_id = ? WHERE engagement_id = ? AND source_id = 'L1'", (lib["library"], eid))
    brief = {"goal": "AI shopping assistants in retail", "scope": "", "audience": "leadership", "window": {"since": "", "until": "", "label": "any time"}}
    _, _summary, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1.0))
    urls = {s["url"] for s in sources}
    assert lib["url"] in urls and "https://www.retaildive.com/ai-assistants" in urls          # both joined, nothing crashed
    assert adopted and adopted[0][0] == "lib/articles/grocery-dive/a1.md"
