"""
CX Workbench service integration tools.

Connects the NXT Agency agent engine to the Intelligence Augmentation
platform services via their MCP JSON-RPC 2.0 endpoints.

Services:
    - Journey Mapper (Claude Opus 4.5) — customer journey map generation
    - Reddit/Social Data Collector — Reddit data collection
    - Social Research Analytics — topic modeling, sentiment analysis
    - Video Transcription — video/audio transcription via Whisper
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

from app.tools.base import AgentContext, BaseTool

logger = logging.getLogger("tools.cx_services")

_TIMEOUT = 1800  # 30 minutes — journey maps and social analytics can take 20-30 min


async def _call_mcp(url: str, tool_name: str, arguments: dict) -> dict[str, Any]:
    """Call an MCP service via JSON-RPC 2.0."""
    payload = {
        "jsonrpc": "2.0",
        "id": f"nxt-agency-{tool_name}",
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments,
        },
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            return {"error": f"MCP service returned {resp.status_code}: {resp.text[:500]}"}
        data = resp.json()
        if "result" in data:
            return data["result"]
        elif "error" in data:
            return {"error": data["error"]}
        return data


async def _list_mcp_tools(url: str) -> list[dict]:
    """List available tools from an MCP service."""
    payload = {
        "jsonrpc": "2.0",
        "id": "tools-list",
        "method": "tools/list",
        "params": {},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("result", {}).get("tools", [])
    except Exception as e:
        logger.warning("Failed to list tools from %s: %s", url, e)
    return []


# --- MCP service URLs (resolved from environment or Docker network) ---
JOURNEY_MCP_URL = os.environ.get("JOURNEY_MCP_URL", "http://journey-mcp:8503/mcp")
REDDIT_MCP_URL = os.environ.get("REDDIT_MCP_URL", "http://reddit-mcp:8501/mcp")
SOCIAL_MCP_URL = os.environ.get("SOCIAL_MCP_URL", "http://social-mcp:8502/mcp")
VIDEO_MCP_URL = os.environ.get("VIDEO_MCP_URL", "http://video-mcp:8504/mcp")


class GenerateJourneyMapTool(BaseTool):
    """Generate a customer journey map using the Journey Mapper service (Claude Opus 4.5)."""

    name = "generate_journey_map"
    description = (
        "MANDATORY tool for journey maps. When the user asks for a journey map, customer journey, "
        "experience map, or service blueprint, you MUST use this tool — NOT generate_prototype. "
        "This tool opens the Journey Mapper app (Claude Opus 4.5), fills in the form with the title, "
        "description, and uploaded file, refreshes the AI models, and submits. "
        "Pass file_path if the user uploaded a file (check system context for /tmp/ paths). "
        "The journey map takes 15-25 minutes to generate after submission."
    )
    parameters = {
        "type": "object",
        "properties": {
            "content": {
                "type": "string",
                "description": (
                    "The text content to analyze for journey mapping. Can be: "
                    "interview transcripts, survey responses, support tickets, "
                    "Reddit posts, or any customer experience data. "
                    "Also accepts a topic description like 'skincare routine journey'."
                ),
            },
            "title": {
                "type": "string",
                "description": "Title for the journey map.",
            },
            "description": {
                "type": "string",
                "description": "Brief description of the journey focus.",
            },
            "file_path": {
                "type": "string",
                "description": (
                    "Path to a file to upload (PDF, CSV, TXT, JSON). "
                    "If the user uploaded a file, its path is in the conversation context "
                    "(e.g. /tmp/uuid_filename.pdf). Pass it here."
                ),
            },
        },
        "required": [],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        content = params.get("content", "")
        title = params.get("title", "Customer Journey Map")
        file_path = params.get("file_path", "")
        file_paths = params.get("file_paths", [file_path] if file_path else [])

        if not content and not file_path and not file_paths:
            return {"error": "content, file_path, or file_paths parameter is required"}

        logger.info("Generating journey map: %s (session %s)", title[:50], ctx.session_id)

        journey_mapper_url = os.environ.get(
            "JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"
        )

        # Playwright browser automation — fills the Journey Mapper form via real UI clicks.
        try:
            import asyncio
            import tempfile
            import base64
            import app.tools.computer_use as _cu
            from app.tools.computer_use import _get_page

            # If we have content but no file, write it to a temp file
            if not file_path and content:
                file_path = os.path.join(tempfile.gettempdir(), f"journey_{ctx.session_id}.txt")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                logger.info("Wrote content to temp file: %s", file_path)

            # Step 0: Health-check the journey mapper BEFORE navigating.
            # If the server is blocked (processing a previous request), page.goto will hang.
            app_url = "http://journey-mapper:8000"
            try:
                async with httpx.AsyncClient(timeout=5) as hc:
                    r = await hc.get(app_url)
                    logger.info("Journey Mapper health OK (HTTP %d in <5s)", r.status_code)
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as hc_err:
                logger.warning("Journey Mapper not responding: %s. It may be processing a previous request.", hc_err)
                return {
                    "error": (
                        "The Journey Mapper is currently busy processing a previous request "
                        "(this can take 15-25 minutes). Please wait for it to finish, or "
                        "restart it with: docker compose -f docker-compose-all.yml restart journey-mapper"
                    ),
                }

            # Open a fresh browser page to avoid stale state
            if _cu._page and not _cu._page.is_closed():
                try:
                    await _cu._page.close()
                except Exception:
                    pass
                _cu._page = None
            page = await _get_page()
            await page.goto(app_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)
            logger.info("Navigated to Journey Mapper (fresh page)")

            # Step 1: Fill title
            await page.fill("#title", title)
            logger.info("Filled title: %s", title)

            # Step 2: Fill description
            description = params.get("description", content[:300] if content else title)
            await page.fill("#description", description)
            logger.info("Filled description")

            # Step 3: Click Refresh Models button (CRITICAL)
            await page.click("#refresh-models")
            await asyncio.sleep(3)
            model_text = await page.evaluate(
                '() => document.getElementById("llm_model").options[0]?.text || "none"'
            )
            logger.info("Models loaded: %s", model_text)

            # Step 4: Upload all files
            valid_paths = [p for p in file_paths if p and os.path.exists(p)]
            if valid_paths:
                # Playwright set_input_files accepts a list of paths for multi-file upload
                await page.set_input_files("#files", valid_paths)
                file_count = await page.evaluate(
                    '() => document.getElementById("files").files.length'
                )
                # Trigger change event so the UI updates
                file_names = [os.path.basename(p) for p in valid_paths]
                await page.evaluate('''(names) => {
                    const input = document.getElementById("files");
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    const dropZone = document.querySelector(".upload-area, .drop-zone, .file-upload-text");
                    if (dropZone) {
                        dropZone.textContent = names.length + " file(s) selected: " + names.join(", ");
                    }
                }''', file_names)
                await asyncio.sleep(1)
                logger.info("Uploaded %d file(s): %s", file_count, ", ".join(file_names))
            else:
                logger.warning("No valid files to upload (file_paths=%s)", file_paths)

            # Step 5: Scroll to bottom and screenshot the filled form BEFORE submitting
            await page.evaluate('() => window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(0.5)
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()
            logger.info("Pre-submit screenshot captured (scrolled to bottom)")

            # Step 6: Click the Generate button
            await page.evaluate('() => document.getElementById("submit-button").click()')
            logger.info("Clicked Generate Journey Map button")
            img_b64 = base64.standard_b64encode(img_bytes).decode()

            return {
                "status": "submitted",
                "message": (
                    f"Journey map '{title}' has been submitted to the Journey Mapper. "
                    f"Generation takes 15-25 minutes. "
                    f"I'll send you the direct link when it's ready."
                ),
                "view_url": journey_mapper_url,
                "model": model_text,
                "screenshot": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
            }

        except Exception as e:
            logger.exception("Journey Mapper form submission failed: %s", e)
            return {
                "error": f"Journey Mapper submission failed: {e}",
                "suggestion": (
                    "Try using the computer tool to navigate to "
                    "http://journey-mapper:8000 and fill the form manually."
                ),
                "journey_mapper_client_url": journey_mapper_url,
            }


class SearchRedditTool(BaseTool):
    """Search and collect Reddit data via the Social Data Collector."""

    name = "search_reddit"
    description = (
        "Search Reddit for posts and comments on a topic. Collects data from "
        "specified subreddits including post content, scores, comments, and metadata. "
        "Use this for social listening, competitive research, or customer voice analysis."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query or topic to search for on Reddit.",
            },
            "subreddit": {
                "type": "string",
                "description": "Specific subreddit to search (without r/ prefix). Optional.",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of posts to return (default: 25, max: 100).",
            },
        },
        "required": ["query"],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        query = params.get("query", "")
        if not query:
            return {"error": "query parameter is required"}

        logger.info("Searching Reddit: %s (session %s)", query[:50], ctx.session_id)

        try:
            result = await _call_mcp(REDDIT_MCP_URL, "reddit_search", {
                "query": query,
                "subreddit": params.get("subreddit", ""),
                "limit": params.get("limit", 25),
            })
            return result
        except Exception as e:
            logger.error("Reddit MCP call failed: %s", e)
            return {"error": f"Reddit service unavailable: {e}"}


class AnalyzeSocialDataTool(BaseTool):
    """Run topic modeling and sentiment analysis via the Social Research service."""

    name = "analyze_social_data"
    description = (
        "Analyze social media data using advanced topic modeling (BERTopic) and "
        "sentiment analysis (VADER + AI). Identifies themes, clusters posts by topic, "
        "and provides sentiment scores with evidence quotes. "
        "Use this for brand monitoring, customer voice analysis, or market research."
    )
    parameters = {
        "type": "object",
        "properties": {
            "data": {
                "type": "string",
                "description": "The text data to analyze (posts, comments, reviews, transcripts).",
            },
            "analysis_type": {
                "type": "string",
                "enum": ["topic_modeling", "sentiment", "both"],
                "description": "Type of analysis to run. Default: both.",
            },
        },
        "required": ["data"],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        data = params.get("data", "")
        if not data:
            return {"error": "data parameter is required"}

        logger.info("Analyzing social data (session %s)", ctx.session_id)

        try:
            result = await _call_mcp(SOCIAL_MCP_URL, "analyze_topics", {
                "content": data,
                "analysis_type": params.get("analysis_type", "both"),
            })
            return result
        except Exception as e:
            logger.error("Social MCP call failed: %s", e)
            return {"error": f"Social Research service unavailable: {e}"}


class TranscribeVideoTool(BaseTool):
    """Transcribe video or audio content via the Video Transcription service."""

    name = "transcribe_video"
    description = (
        "Transcribe video or audio content using OpenAI Whisper. "
        "Accepts YouTube URLs or references to uploaded video/audio files. "
        "Returns full transcript with timestamps."
    )
    parameters = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "YouTube URL or video file path to transcribe.",
            },
        },
        "required": ["url"],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        url = params.get("url", "")
        if not url:
            return {"error": "url parameter is required"}

        logger.info("Transcribing video: %s (session %s)", url[:50], ctx.session_id)

        try:
            result = await _call_mcp(VIDEO_MCP_URL, "transcribe_video", {
                "url": url,
            })
            return result
        except Exception as e:
            logger.error("Video MCP call failed: %s", e)
            return {"error": f"Video Transcription service unavailable: {e}"}


class CollectRedditDataTool(BaseTool):
    """Collect Reddit data via the Social Data Collector app using browser automation."""

    name = "collect_reddit_data"
    description = (
        "Collect posts and comments from a Reddit subreddit using the Social Data "
        "Collector app. Navigates the browser to the collector, fills in the form "
        "(subreddit, post count, time filter, comments per post), and submits. "
        "Returns a screenshot of the form and polls for completion with download links."
    )
    parameters = {
        "type": "object",
        "properties": {
            "subreddit": {
                "type": "string",
                "description": "Subreddit name without r/ prefix (e.g. 'nba', 'skincareaddiction').",
            },
            "count": {
                "type": "integer",
                "description": "Number of posts to collect (10-1000, default 25).",
            },
            "time_filter": {
                "type": "string",
                "enum": ["day", "week", "month", "year", "all"],
                "description": "Time range filter (default: year).",
            },
            "comments_per_post": {
                "type": "integer",
                "description": "Number of comments per post (0-50, default 5).",
            },
        },
        "required": ["subreddit"],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        subreddit = params.get("subreddit", "").strip().lstrip("r/")
        if not subreddit:
            return {"error": "subreddit parameter is required"}

        count = min(max(params.get("count", 25), 10), 1000)
        time_filter = params.get("time_filter", "year")
        comments = min(max(params.get("comments_per_post", 5), 0), 50)

        logger.info(
            "Collecting Reddit data: r/%s (%d posts, %s, %d comments) [session %s]",
            subreddit, count, time_filter, comments, ctx.session_id,
        )

        app_url = "http://reddit-ripper:5000"
        client_url = os.environ.get("REDDIT_RIPPER_CLIENT_URL", "http://localhost:5001")

        # Health-check the Reddit Ripper before navigating
        try:
            async with httpx.AsyncClient(timeout=5) as hc:
                r = await hc.get(app_url)
                logger.info("Reddit Ripper health OK (HTTP %d)", r.status_code)
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as hc_err:
            logger.warning("Reddit Ripper not responding: %s", hc_err)
            return {
                "error": (
                    "The Social Data Collector is not responding. "
                    "Try restarting it: docker compose -f docker-compose-all.yml restart reddit-ripper"
                ),
            }

        try:
            import asyncio
            import base64
            import app.tools.computer_use as _cu
            from app.tools.computer_use import _get_page

            # Open a fresh browser page to avoid stale state
            if _cu._page and not _cu._page.is_closed():
                try:
                    await _cu._page.close()
                except Exception:
                    pass
                _cu._page = None
            page = await _get_page()
            await page.goto(app_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)
            logger.info("Navigated to Reddit Ripper (fresh page)")

            # Step 1: Ensure Reddit source is selected (click the Reddit tab)
            await page.click('.source-option[data-source="reddit"]')
            await asyncio.sleep(0.5)
            logger.info("Selected Reddit source")

            # Step 2: Fill subreddit name
            await page.fill("#reddit-target", subreddit)
            logger.info("Filled subreddit: r/%s", subreddit)

            # Step 3: Fill post count
            # The HTML input has a default value of 100. page.fill() should
            # replace it, but we triple-clear first for reliability, then
            # verify the value via JS to ensure the display matches the API.
            await page.evaluate('() => document.getElementById("reddit-count").value = ""')
            await page.fill("#reddit-count", str(count))
            # Force-set via JS as belt-and-suspenders (Playwright fill can
            # fail silently on number inputs with min/max constraints)
            await page.evaluate(
                '(v) => { const el = document.getElementById("reddit-count"); el.value = v; el.dispatchEvent(new Event("input", {bubbles:true})); }',
                str(count),
            )
            logger.info("Set post count: %d", count)

            # Step 4: Select time filter by clicking the matching button.
            # The form uses a hidden input #reddit-time-filter (default "year")
            # and .filter-option buttons with .active class for visual state.
            # We must: (a) remove .active from all buttons, (b) add .active to
            # the target button, (c) update the hidden input value.
            await page.evaluate(
                '''(tf) => {
                    // Remove active from all filter buttons
                    document.querySelectorAll('.time-filter-grid .filter-option').forEach(
                        btn => btn.classList.remove('active')
                    );
                    // Add active to the target button
                    const target = document.querySelector(
                        '.time-filter-grid .filter-option[data-value="' + tf + '"]'
                    );
                    if (target) target.classList.add('active');
                    // Update the hidden input that the form actually reads
                    const hidden = document.getElementById('reddit-time-filter');
                    if (hidden) hidden.value = tf;
                }''',
                time_filter,
            )
            await asyncio.sleep(0.3)
            logger.info("Selected time filter: %s", time_filter)

            # Step 5: Fill comments per post
            await page.evaluate('() => document.getElementById("reddit-comments").value = ""')
            await page.fill("#reddit-comments", str(comments))
            await page.evaluate(
                '(v) => { const el = document.getElementById("reddit-comments"); el.value = v; el.dispatchEvent(new Event("input", {bubbles:true})); }',
                str(comments),
            )
            logger.info("Set comments per post: %d", comments)

            # Step 6: Screenshot the filled form before submitting
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()
            logger.info("Pre-submit screenshot captured")

            # Step 7: Submit the form via the API directly (more reliable than clicking)
            # This gives us the job_id immediately from the response.
            job_id = None
            try:
                api_response = await page.evaluate('''async (params) => {
                    try {
                        const resp = await fetch('/api/collect', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(params),
                        });
                        const data = await resp.json();
                        if (data.job_id) {
                            window.currentJobId = data.job_id;
                        }
                        return data;
                    } catch(e) {
                        return {error: e.message};
                    }
                }''', {
                    "source": "reddit",
                    "target": subreddit,
                    "count": count,
                    "time_filter": time_filter,
                    "comments_per_post": comments,
                })
                job_id = api_response.get("job_id") if isinstance(api_response, dict) else None
                logger.info("Collection started via API, job_id: %s", job_id)
            except Exception as api_err:
                logger.warning("API submit failed, falling back to button click: %s", api_err)
                await page.click('.nxt-btn.nxt-btn-primary.nxt-btn-block')
                await asyncio.sleep(5)
                # Try to read job_id from page JS after click
                for _ in range(10):
                    try:
                        job_id = await page.evaluate('() => window.currentJobId || null')
                        if job_id:
                            break
                    except Exception:
                        pass
                    await asyncio.sleep(1)

            # Wait a moment then screenshot the running collection
            await asyncio.sleep(3)
            # Reload page to show progress UI
            await page.reload(wait_until="domcontentloaded", timeout=10000)
            await asyncio.sleep(2)
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()
            logger.info("Collection in-progress screenshot captured, job_id=%s", job_id)

            return {
                "status": "collecting",
                "job_id": job_id,
                "message": (
                    f"Reddit data collection started for r/{subreddit} "
                    f"({count} posts, {time_filter} time filter, {comments} comments/post). "
                    f"The collection is now running in the Social Data Collector."
                ),
                "app_url": app_url,
                "client_url": client_url,
                "screenshot": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
            }

        except Exception as e:
            logger.exception("Reddit data collection failed: %s", e)
            return {
                "error": f"Reddit data collection failed: {e}",
                "suggestion": f"Try using the browser to navigate to {client_url} manually.",
            }


class TranscribeVideoComputerTool(BaseTool):
    """Transcribe video/audio via the Video Transcriber app using browser automation."""

    name = "transcribe_video_browser"
    description = (
        "Transcribe a YouTube video or uploaded video/audio file using the Video "
        "Transcriber app. Navigates the browser to the app, submits the URL or file, "
        "and returns a screenshot with job status. Supports YouTube URLs and uploaded files."
    )
    parameters = {
        "type": "object",
        "properties": {
            "youtube_url": {
                "type": "string",
                "description": "YouTube URL to transcribe.",
            },
            "file_path": {
                "type": "string",
                "description": "Path to an uploaded video/audio file.",
            },
        },
        "required": [],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        youtube_url = params.get("youtube_url", "").strip()
        file_path = params.get("file_path", "").strip()

        if not youtube_url and not file_path:
            return {"error": "Either youtube_url or file_path is required"}

        logger.info(
            "Transcribing video: %s (session %s)",
            youtube_url or file_path, ctx.session_id,
        )

        app_url = "http://video-analyzer:5000"
        client_url = os.environ.get("VIDEO_ANALYZER_CLIENT_URL", "http://localhost:5002")

        # Health-check
        try:
            async with httpx.AsyncClient(timeout=5) as hc:
                r = await hc.get(app_url)
                logger.info("Video Transcriber health OK (HTTP %d)", r.status_code)
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as hc_err:
            logger.warning("Video Transcriber not responding: %s", hc_err)
            return {"error": "The Video Transcriber is not responding. Try restarting it."}

        try:
            import asyncio
            import base64
            import app.tools.computer_use as _cu
            from app.tools.computer_use import _get_page

            if _cu._page and not _cu._page.is_closed():
                try:
                    await _cu._page.close()
                except Exception:
                    pass
                _cu._page = None
            page = await _get_page()
            await page.goto(app_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)
            logger.info("Navigated to Video Transcriber")

            job_id = None

            if youtube_url:
                # Click YouTube tab
                await page.click('.tab-btn[data-tab="youtube"]')
                await asyncio.sleep(0.5)
                # Fill URL
                await page.fill("#youtubeUrl", youtube_url)
                logger.info("Filled YouTube URL: %s", youtube_url)

                # Submit via API
                try:
                    api_resp = await page.evaluate('''async (url) => {
                        try {
                            const resp = await fetch("/analyze-youtube", {
                                method: "POST",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify({url: url}),
                            });
                            return await resp.json();
                        } catch(e) { return {error: e.message}; }
                    }''', youtube_url)
                    job_id = api_resp.get("job_id") if isinstance(api_resp, dict) else None
                    logger.info("YouTube transcription started, job_id: %s", job_id)
                except Exception:
                    # Fallback: submit the form
                    await page.click('#youtubeForm button[type="submit"]')
                    await asyncio.sleep(3)

            elif file_path and os.path.exists(file_path):
                # Click Upload tab
                await page.click('.tab-btn[data-tab="upload"]')
                await asyncio.sleep(0.5)
                # Upload file
                await page.set_input_files("#videoFile", file_path)
                logger.info("Uploaded video file: %s", file_path)

                # Submit the upload form via button click
                await page.click('#uploadForm button[type="submit"]')
                await asyncio.sleep(3)
                # Try to extract job_id from page
                try:
                    job_id = await page.evaluate('() => window.currentJobId || null')
                except Exception:
                    pass

            await asyncio.sleep(3)
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()

            return {
                "status": "transcribing",
                "job_id": job_id,
                "message": (
                    f"Video transcription started for "
                    f"{'YouTube: ' + youtube_url if youtube_url else os.path.basename(file_path)}. "
                    f"Processing takes 5-15 minutes."
                ),
                "app_url": app_url,
                "client_url": client_url,
                "screenshot": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
            }

        except Exception as e:
            logger.exception("Video transcription failed: %s", e)
            return {"error": f"Video transcription failed: {e}"}


class BuildCopilotRecipeTool(BaseTool):
    """Build a Copilot Studio recipe via the Recipe Builder app."""

    name = "build_copilot_recipe"
    description = (
        "Build a Microsoft Copilot Studio agent recipe using the Recipe Builder app. "
        "Navigates the browser to the app, selects a template or starts from scratch, "
        "and generates the recipe YAML. Returns a screenshot and the recipe content."
    )
    parameters = {
        "type": "object",
        "properties": {
            "description": {
                "type": "string",
                "description": "Description of the Copilot Studio agent to build.",
            },
            "template": {
                "type": "string",
                "description": "Template name to use (optional). Available templates fetched from API.",
            },
        },
        "required": ["description"],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        description = params.get("description", "")
        template = params.get("template", "")

        if not description:
            return {"error": "description parameter is required"}

        logger.info("Building Copilot recipe: %s (session %s)", description[:50], ctx.session_id)

        app_url = "http://copilot-recipe-generator:5013"
        client_url = os.environ.get(
            "COPILOT_RECIPE_GENERATOR_CLIENT_URL", "http://localhost:5013"
        )

        # Health-check
        try:
            async with httpx.AsyncClient(timeout=5) as hc:
                r = await hc.get(f"{app_url}/health")
                logger.info("Copilot Recipe Builder health OK (HTTP %d)", r.status_code)
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError) as hc_err:
            logger.warning("Copilot Recipe Builder not responding: %s", hc_err)
            return {"error": "The Copilot Recipe Builder is not responding. Try restarting it."}

        try:
            import asyncio
            import base64
            import app.tools.computer_use as _cu
            from app.tools.computer_use import _get_page

            if _cu._page and not _cu._page.is_closed():
                try:
                    await _cu._page.close()
                except Exception:
                    pass
                _cu._page = None
            page = await _get_page()
            await page.goto(app_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(3)
            logger.info("Navigated to Copilot Recipe Builder")

            # Fetch available templates from API
            templates = []
            try:
                async with httpx.AsyncClient(timeout=10) as hc:
                    r = await hc.get(f"{app_url}/api/templates")
                    if r.status_code == 200:
                        templates = r.json() if isinstance(r.json(), list) else r.json().get("templates", [])
            except Exception:
                pass
            logger.info("Found %d templates", len(templates))

            # Try to match a template
            matched_template = None
            if template:
                for t in templates:
                    t_name = t.get("name", "") if isinstance(t, dict) else str(t)
                    if template.lower() in t_name.lower():
                        matched_template = t
                        break
            if not matched_template and templates:
                # Try matching by description keywords
                desc_lower = description.lower()
                for t in templates:
                    t_name = (t.get("name", "") if isinstance(t, dict) else str(t)).lower()
                    t_desc = (t.get("description", "") if isinstance(t, dict) else "").lower()
                    if any(kw in t_name or kw in t_desc for kw in desc_lower.split()[:3]):
                        matched_template = t
                        break

            # Screenshot the app
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()

            # Generate the recipe via API (SSE stream)
            recipe_text = ""
            try:
                template_id = (
                    matched_template.get("id", "") if matched_template and isinstance(matched_template, dict) else ""
                )
                req_body = {
                    "agent_name": description[:60],
                    "agent_description": description,
                    "template_id": template_id,
                }
                async with httpx.AsyncClient(timeout=300) as hc:
                    async with hc.stream(
                        "POST",
                        f"{app_url}/api/generate-recipe",
                        json=req_body,
                        headers={"Accept": "text/event-stream"},
                    ) as stream:
                        async for line in stream.aiter_lines():
                            if line.startswith("data: "):
                                try:
                                    chunk = json.loads(line[6:])
                                    if chunk.get("type") == "content":
                                        recipe_text += chunk.get("text", "")
                                    elif chunk.get("type") == "done":
                                        break
                                except json.JSONDecodeError:
                                    recipe_text += line[6:]
                logger.info("Recipe generated: %d chars", len(recipe_text))
            except Exception as gen_err:
                logger.warning("SSE recipe generation failed: %s", gen_err)

            # Take final screenshot
            await asyncio.sleep(2)
            await page.reload(wait_until="domcontentloaded", timeout=10000)
            await asyncio.sleep(2)
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()

            return {
                "status": "complete" if recipe_text else "partial",
                "message": (
                    f"Copilot Studio recipe generated for: {description[:60]}. "
                    f"{'Template: ' + str(matched_template.get('name', '')) + '. ' if matched_template else ''}"
                    f"View the full recipe at: {client_url}"
                ),
                "recipe_text": recipe_text[:5000] if recipe_text else "",
                "client_url": client_url,
                "screenshot": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
            }

        except Exception as e:
            logger.exception("Copilot recipe build failed: %s", e)
            return {"error": f"Copilot recipe build failed: {e}"}


class GenerateCharacterComputerTool(BaseTool):
    """Open the Consistent Character Generator app for the user."""

    name = "generate_character_browser"
    description = (
        "Open the Character Generator app in the live browser so the user can "
        "create consistent characters, scenes, and video clips. The app uses "
        "Gemini (Imagen 3 / Veo 3.1) client-side, so the browser must render "
        "the React SPA directly. Returns a screenshot and the app URL."
    )
    parameters = {
        "type": "object",
        "properties": {
            "description": {
                "type": "string",
                "description": "Character description for context.",
            },
        },
        "required": [],
    }
    tier = 2

    async def execute(self, params: dict[str, Any], ctx: AgentContext) -> dict[str, Any]:
        description = params.get("description", "")
        char_name = params.get("character_name", description[:30] if description else "Character")
        client_url = os.environ.get(
            "CONSISTENT_CHARACTER_GENERATOR_CLIENT_URL", "http://localhost:5010"
        )
        app_url = "http://consistent-character-generator:5010"

        # Health-check
        try:
            async with httpx.AsyncClient(timeout=5) as hc:
                r = await hc.get(f"{app_url}/health")
                logger.info("Character Generator health OK (HTTP %d)", r.status_code)
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.ConnectError):
            return {"error": "The Character Generator is not responding. Try restarting it."}

        # Navigate Playwright to the app for the live browser view.
        # Use host.docker.internal to load via the host's port mapping so CDN
        # imports (aistudiocdn.com) resolve properly through Docker Desktop.
        try:
            import asyncio
            import base64
            import app.tools.computer_use as _cu
            from app.tools.computer_use import _get_page

            if _cu._page and not _cu._page.is_closed():
                try:
                    await _cu._page.close()
                except Exception:
                    pass
                _cu._page = None
            page = await _get_page()
            # Polyfill crypto.randomUUID — not available in non-secure contexts
            # (http:// with non-localhost hostname). Without this the React app crashes.
            await page.add_init_script("""
                if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
                    crypto.randomUUID = function() {
                        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                        );
                    };
                }
            """)
            await page.goto(app_url, wait_until="networkidle", timeout=45000)
            await asyncio.sleep(5)

            logger.info("Navigated to Character Generator")

            # Wait for React to render
            try:
                await page.wait_for_selector('input[type="text"]', timeout=15000)
            except Exception:
                logger.warning("React inputs not found in time")

            # Fill the character name input (short label, not the full message)
            if char_name:
                try:
                    inputs = await page.query_selector_all('input[type="text"]')
                    if inputs:
                        await inputs[0].fill(char_name)
                        logger.info("Filled character name: %s", char_name)
                except Exception as fill_err:
                    logger.warning("Could not fill description: %s", fill_err)

            # Upload reference image if provided
            ref_image = params.get("reference_image_path", "")
            if ref_image and os.path.exists(ref_image):
                try:
                    file_inputs = await page.query_selector_all('input[type="file"]')
                    if file_inputs:
                        await file_inputs[0].set_input_files(ref_image)
                        await asyncio.sleep(1)
                        logger.info("Uploaded reference image")
                except Exception:
                    pass

            # Screenshot the loaded app
            img_bytes = await page.screenshot(type="png", timeout=10000)
            img_b64 = base64.standard_b64encode(img_bytes).decode()

            # Try to click Generate
            try:
                gen_btn = await page.query_selector('button:has-text("Generate")')
                if not gen_btn:
                    gen_btn = await page.query_selector('button:has-text("GENERATE")')
                if gen_btn:
                    await gen_btn.click()
                    logger.info("Clicked Generate button")

                    # Wait for Gemini generation (30-90s)
                    # The naming modal appears after generation completes
                    for _wait in range(18):  # Up to 90s
                        await asyncio.sleep(5)
                        # Check if naming modal appeared
                        modal = await page.query_selector('.modal-backdrop')
                        if modal:
                            logger.info("Naming modal detected after %ds", (_wait + 1) * 5)
                            break

                    # Handle the naming modal: fill names and click Save
                    modal = await page.query_selector('.modal-backdrop')
                    if modal:
                        await asyncio.sleep(1)
                        # The modal has input fields with class "ia-input"
                        # Default names are "Character 1", "Character 2", etc.
                        # Give them descriptive names based on the user's description
                        name_inputs = await page.query_selector_all('.modal-entity .ia-input')
                        for i, inp in enumerate(name_inputs):
                            if len(name_inputs) == 1:
                                name = char_name
                            else:
                                name = f"{char_name} {i + 1}" if char_name else f"Character {i + 1}"
                            await inp.fill("")
                            await inp.fill(name)
                            logger.info("Named character %d: %s", i + 1, name)

                        await asyncio.sleep(0.5)
                        # Click "Save Characters" button (not the Cancel/ghost button)
                        save_btn = await page.query_selector('.modal-footer button:not(.ia-button--ghost)')
                        if save_btn:
                            await save_btn.click()
                            logger.info("Clicked Save Characters")
                            await asyncio.sleep(2)
                        else:
                            # Try finding by text
                            save_btn = await page.query_selector('button:has-text("Save")')
                            if save_btn:
                                await save_btn.click()
                                logger.info("Clicked Save (by text)")
                                await asyncio.sleep(2)

                    img_bytes = await page.screenshot(type="png", timeout=10000)
                    img_b64 = base64.standard_b64encode(img_bytes).decode()
                    logger.info("Post-generation screenshot captured")
            except Exception as gen_err:
                logger.warning("Generate click failed: %s", gen_err)

            # Extract generated character images from IndexedDB and save as files
            exported_files = []
            try:
                char_data = await page.evaluate('''() => {
                    return new Promise((resolve) => {
                        const request = indexedDB.open("ConsistentCharacterDB");
                        request.onsuccess = (event) => {
                            const db = event.target.result;
                            const tx = db.transaction("characters", "readonly");
                            const store = tx.objectStore("characters");
                            const getAll = store.getAll();
                            getAll.onsuccess = () => {
                                const chars = getAll.result || [];
                                // Return the most recent characters (last 5)
                                const recent = chars.slice(-5).map(c => ({
                                    name: c.name || "unnamed",
                                    mimeType: c.imageData?.mimeType || "image/png",
                                    base64: c.imageData?.base64 || "",
                                    description: c.description || "",
                                }));
                                resolve(recent);
                            };
                            getAll.onerror = () => resolve([]);
                        };
                        request.onerror = () => resolve([]);
                    });
                }''')

                if char_data and isinstance(char_data, list):
                    import tempfile
                    for i, ch in enumerate(char_data):
                        if not ch.get("base64"):
                            continue
                        # Determine file extension
                        mime = ch.get("mimeType", "image/png")
                        ext = ".png" if "png" in mime else ".jpg"
                        safe_name = "".join(c if c.isalnum() or c in "-_ " else "" for c in ch.get("name", f"char_{i}"))
                        fname = f"{safe_name}{ext}"
                        fpath = os.path.join(tempfile.gettempdir(), fname)
                        with open(fpath, "wb") as f:
                            f.write(base64.standard_b64decode(ch["base64"]))
                        exported_files.append({
                            "name": ch.get("name", f"Character {i+1}"),
                            "filename": fname,
                            "path": fpath,
                            "description": ch.get("description", ""),
                            "base64": ch["base64"],
                            "mimeType": mime,
                        })
                        logger.info("Exported character image: %s (%s)", fname, fpath)

            except Exception as export_err:
                logger.warning("IndexedDB export failed: %s", export_err)

            # Build message with character details
            msg_parts = [
                f"Character{'s' if len(exported_files) > 1 else ''} generated"
                f"{' for: ' + char_name if char_name else ''}!\n"
            ]
            for ef in exported_files:
                msg_parts.append(
                    f"**{ef['name']}** — {ef['description'][:100]}"
                )
            if exported_files:
                msg_parts.append(
                    f"\nView and manage characters at: {client_url}"
                )
            else:
                msg_parts.append(
                    f"View and manage characters at: {client_url}"
                )

            return {
                "status": "generated",
                "message": "\n".join(msg_parts),
                "client_url": client_url,
                "exported_characters": exported_files,
                "screenshot": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_b64,
                    },
                },
            }

        except Exception as e:
            logger.exception("Character Generator failed: %s", e)
            return {
                "error": f"Character Generator failed: {e}",
                "client_url": client_url,
            }
