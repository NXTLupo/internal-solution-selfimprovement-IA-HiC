"""A publisher's name is a reference, not the writer's figure (26 Nov): "> Digital Commerce 360, November 2026: [S8]"
was flagged as a naked number, set off a full rewrite of a deep report, and stayed open after it. A figure the writer
states in its own prose is still flagged."""
from ia_next import verify

SOURCES = [{"id": "S8", "title": "Digital Commerce 360: Agentic checkout goes live", "publisher": "Digital Commerce 360",
            "text": "Shopify turned on agentic checkout for eligible stores."}]


def test_a_publisher_name_with_digits_is_not_a_naked_number():
    text = ("## Agentic checkout is live\n\nShopify turned on agentic checkout for eligible stores [S8].\n\n"
            "> \"Shopify turned on agentic checkout for eligible stores.\"\n> Digital Commerce 360, November 2026: [S8]\n")
    assert [f for f in verify.deterministic(text, SOURCES) if f["rule"] == "naked-number"] == []


def test_the_writers_own_figure_is_still_flagged():
    text = "## Adoption\n\nShopify turned on agentic checkout for 4.6 million stores [S8].\n"
    assert [f["rule"] for f in verify.deterministic(text, SOURCES)].count("naked-number") == 1
