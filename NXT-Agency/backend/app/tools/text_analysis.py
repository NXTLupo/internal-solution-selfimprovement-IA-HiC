"""
Text analysis tools.

These are lightweight tools that structure text for the LLM to process.
They do not call external APIs -- the calling LLM uses the structured
result as context for its own reasoning.  Tier 2.
"""

from __future__ import annotations

import logging
from typing import Any

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.text_analysis")


class SummarizeTextTool(BaseTool):
    """Return a structured summarisation prompt for the calling LLM."""

    name = "summarize_text"
    description = (
        "Summarize a block of text. Returns a structured summary that the "
        "assistant can incorporate into its response."
    )
    parameters = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text to summarize.",
            },
            "max_length": {
                "type": "integer",
                "description": "Target maximum word count for the summary.",
                "default": 200,
            },
        },
        "required": ["text"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        text = params.get("text", "")
        if not text.strip():
            return {"error": "text parameter is required and must be non-empty"}

        max_length = max(10, min(int(params.get("max_length", 200)), 2000))
        word_count = len(text.split())

        logger.info(
            "summarize_text word_count=%d max_length=%d (session %s)",
            word_count,
            max_length,
            ctx.session_id,
        )

        return {
            "summary": (
                f"Please summarize the following text in at most {max_length} words. "
                f"Focus on the key points and main ideas:\n\n{text}"
            ),
            "original_word_count": word_count,
            "target_max_words": max_length,
        }


class AnalyzeSentimentTool(BaseTool):
    """Return a structured sentiment analysis prompt for the calling LLM."""

    name = "analyze_sentiment"
    description = (
        "Analyze the sentiment of a text passage. Returns a structured "
        "analysis with sentiment label, confidence, and explanation."
    )
    parameters = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text to analyze for sentiment.",
            },
        },
        "required": ["text"],
    }
    tier = 2

    async def execute(
        self, params: dict[str, Any], ctx: AgentContext
    ) -> dict[str, Any]:
        text = params.get("text", "")
        if not text.strip():
            return {"error": "text parameter is required and must be non-empty"}

        word_count = len(text.split())

        logger.info(
            "analyze_sentiment word_count=%d (session %s)",
            word_count,
            ctx.session_id,
        )

        return {
            "sentiment": (
                "Analyze the sentiment of the following text. "
                "Respond with a JSON object containing: "
                '"sentiment" (one of "positive", "negative", "neutral", "mixed"), '
                '"confidence" (float 0-1), and "explanation" (brief reasoning).\n\n'
                f"{text}"
            ),
            "word_count": word_count,
        }
