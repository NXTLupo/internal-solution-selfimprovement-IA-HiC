"""CX Workbench agent-stack plan A4 (2026-10-31): CX tools that wrap one MCP tool take their description and schema
from the service's declaration; a tool whose MCP name the service does not declare reports it instead of failing
inside the call. The MCP services are stubbed."""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
pytest.importorskip("httpx")

from app.tools import cx_services as cx  # noqa: E402
from app.tools.base import AgentContext, ToolRegistry  # noqa: E402

DECLARED = {
    cx.REDDIT_MCP_URL: [{"name": "reddit_search", "description": "Search for posts in a subreddit with optional filtering",
                         "inputSchema": {"type": "object", "properties": {"subreddit": {"type": "string"}, "query": {"type": "string"}}, "required": ["subreddit"]}}],
    cx.VIDEO_MCP_URL: [{"name": "video_transcribe_youtube", "description": "Transcribe a YouTube video by URL",
                        "inputSchema": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}],
    cx.SOCIAL_MCP_URL: [],     # simulate a service that does not declare the tool
}


@pytest.fixture()
def stubs(monkeypatch):
    calls = []

    async def fake_list(url):
        return DECLARED.get(url, [])

    async def fake_call(url, tool, args):
        calls.append((tool, args))
        return {"job_id": "job_1", "status": "queued"}

    monkeypatch.setattr(cx, "_list_mcp_tools", fake_list)
    monkeypatch.setattr(cx, "_call_mcp", fake_call)
    return calls


def test_binding_takes_description_and_schema_from_the_service(stubs):
    reg = ToolRegistry()
    for cls in (cx.SearchRedditTool, cx.TranscribeVideoTool, cx.AnalyzeSocialDataTool):
        reg.register(cls())
    out = asyncio.run(cx.bind_cx_tools(reg))
    assert out == {"search_reddit": True, "transcribe_video": True, "analyze_social_data": False}
    reddit = reg._tools["search_reddit"]
    assert reddit.description.startswith("Search for posts in a subreddit") and "social listening" in reddit.description
    assert reddit.parameters["required"] == ["subreddit"]


def test_execute_calls_the_declared_mcp_tool_and_enforces_required_params(stubs):
    ctx = AgentContext(session_id="s1", agent_slug="a")
    t = cx.SearchRedditTool()
    assert asyncio.run(t.execute({"query": "returns"}, ctx))["error"].startswith("missing required parameter")
    assert asyncio.run(t.execute({"subreddit": "AskRetail", "query": "returns"}, ctx)) == {"job_id": "job_1", "status": "queued"}
    assert stubs[-1] == ("reddit_search", {"subreddit": "AskRetail", "query": "returns"})
    social = cx.AnalyzeSocialDataTool()
    assert "does not declare social_topic_model" in asyncio.run(social.execute({"data_source": "reddit", "search_query": "x"}, ctx))["error"]
