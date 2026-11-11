"""
Web search and URL extraction tools.

- WebSearchTool uses Gemini's built-in Google Search grounding (no extra API key).
- ExtractUrlContentTool uses httpx to fetch and extract page content.

Both tools are tier 2: available to agents that need internet access but
not code execution or filesystem access.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.web_search")


# Gemini model used for search grounding. 2026-11-11 (IA plan Phase 0, section 6.10): the routing authority's
# search seat. Its primary (gemini-4-argon) is held until grounding is tested on it, so the seat's serving model is
# used; override with NXT_AGENCY_SEARCH_MODEL.
def _search_model() -> str:
    from app.llm import seats  # pylint: disable=import-outside-toplevel
    return seats.seat_model("NXT_AGENCY_SEARCH_MODEL", ("seat_matrix", "search", "serving"),
                            seats.GEMINI_SEARCH_FALLBACK, "gemini-")


async def _gemini_search(query: str, max_results: int = 5) -> list[dict[str, str]]:
    """
    Use Gemini's built-in Google Search grounding to search the web.

    This uses the google-genai SDK which is already installed and configured.
    No extra API key beyond GEMINI_API_KEY is needed.
    """
    # pylint: disable=import-outside-toplevel
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY environment variable is required for web search."
        )

    client = genai.Client(api_key=api_key)

    response = await client.aio.models.generate_content(
        model=_search_model(),
        contents=f"Search the web and return the top {max_results} results for: {query}\n\nFor each result, provide the title, URL, and a brief content snippet.",
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.1,
        ),
    )

    # Extract grounding metadata (search results) from the response
    results: list[dict[str, str]] = []

    # Parse grounding chunks from response metadata
    if (
        response.candidates
        and response.candidates[0].grounding_metadata
        and response.candidates[0].grounding_metadata.grounding_chunks
    ):
        for chunk in response.candidates[0].grounding_metadata.grounding_chunks[:max_results]:
            web = chunk.web
            if web:
                results.append({
                    "title": web.title or "",
                    "url": web.uri or "",
                    "content": "",
                })

    # Also include the model's synthesized text as context
    synthesized_text = ""
    if response.candidates and response.candidates[0].content:
        for part in response.candidates[0].content.parts:
            if part.text:
                synthesized_text += part.text

    # If we got grounding results, add synthesized text as a summary
    if results and synthesized_text:
        results[0]["content"] = synthesized_text[:2000]
    elif synthesized_text and not results:
        # No grounding chunks but model produced text — return as a single result
        results.append({
            "title": "Search Summary",
            "url": "",
            "content": synthesized_text[:3000],
        })

    return results


class WebSearchTool(BaseTool):
    """Search the web using Gemini's built-in Google Search grounding."""

    name = "web_search"
    description = (
        "Search the web for current information. Returns a list of results "
        "with title, URL, and content snippet. Powered by Google Search."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return (1-10).",
                "default": 5,
            },
        },
        "required": ["query"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        query = params.get("query", "").strip()
        if not query:
            return {"error": "query parameter is required and must be non-empty"}

        max_results = params.get("max_results", 5)
        max_results = max(1, min(int(max_results), 10))

        logger.info(
            "web_search query=%r max_results=%d (session %s)",
            query,
            max_results,
            ctx.session_id,
        )

        try:
            results = await _gemini_search(query, max_results)
            return {"query": query, "results": results, "count": len(results)}
        except Exception as exc:
            logger.exception("web_search failed for query=%r", query)
            return {"error": f"Search failed: {exc}"}


class ExtractUrlContentTool(BaseTool):
    """Extract the main text content from a given URL using httpx."""

    name = "extract_url_content"
    description = (
        "Extract the main text content from a URL. Useful for reading "
        "articles, documentation, or web pages."
    )
    parameters = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "The URL to extract content from.",
            },
        },
        "required": ["url"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        url = params.get("url", "").strip()
        if not url:
            return {"error": "url parameter is required and must be non-empty"}

        logger.info(
            "extract_url_content url=%r (session %s)", url, ctx.session_id
        )

        try:
            # pylint: disable=import-outside-toplevel
            import httpx

            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; NXT-Agency/1.0)",
                },
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                html = resp.text

            # Strip HTML tags for a rough text extraction
            text = _strip_html(html)

            # Truncate to reasonable size
            if len(text) > 8000:
                text = text[:8000] + "\n\n[Content truncated...]"

            return {"url": url, "content": text}
        except Exception as exc:
            logger.exception("extract_url_content failed for url=%r", url)
            return {"error": f"Extraction failed: {exc}"}


def _strip_html(html: str) -> str:
    """Remove HTML tags and extract readable text content."""
    # Remove script and style blocks
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove HTML comments
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    # Remove tags
    text = re.sub(r'<[^>]+>', ' ', html)
    # Decode common HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('&quot;', '"')
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Try to add paragraph breaks back
    text = re.sub(r'\s{3,}', '\n\n', text)
    return text
