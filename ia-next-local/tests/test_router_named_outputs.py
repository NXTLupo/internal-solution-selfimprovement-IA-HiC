"""Named outputs the 26 Nov routing comparison found the model misrouting are caught in code: a data table, a document
(brief, memo, PRD, case study, gap analysis, roadmap, personas) and Reddit listening. A subject that only mentions those
words is not an order."""
from ia_next import router


def test_named_outputs_are_caught():
    assert router.named_tool("Make a data table of retailers and the AI assistants they launched")[1] == "start_datatable"
    assert router.named_tool("Write a one-page brief on agentic checkout for the CFO")[1] == "start_artifact"
    assert router.named_tool("Draft a PRD for the shopping assistant")[1] == "start_artifact"
    assert router.named_tool("Listen to what people on Reddit say about AI shopping assistants")[1] == "start_social_analysis"


def test_questions_and_subjects_are_not_orders():
    assert router.named_tool("What is in my Library about Walmart and AI?") is None
    assert router.named_tool("Is the data table done?") is None
    assert router.named_tool("What are shoppers on Reddit saying about Walmart's assistant?") is None    # a question: the model decides
    assert router.named_tool("Make a deck about roadmaps")[1] == "start_deck"          # the deck is the output
