"""
Agent Engine -- the core agentic execution loop.

Given an agent slug and user message, the engine:
1. Resolves the agent definition (system prompt, model, tier).
2. Builds the message history and injects available tool schemas.
3. Loops: call the LLM, inspect for tool_calls, execute tools, feed
   results back, repeat -- until the LLM returns a plain text response
   or the max-turn limit is reached.

Two execution modes are supported:
    ``run()``        -- returns the complete response dict after all turns.
    ``run_stream()`` -- yields SSE-friendly event dicts, streaming only
                        the final text response.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from app.agents.registry import AgentDefinition, AgentRegistry
from app.llm import ModelRouter, LLMResponse, LLMStreamChunk
from app.tools import AgentContext, ToolRegistry

logger = logging.getLogger("agent-engine")


def _build_tool_result(
    tool_use_id: str,
    result: dict[str, Any] | None,
    error: str | None,
) -> dict[str, Any]:
    """Build a ``tool_result`` message block for the Anthropic API.

    When the result is an image (screenshot from computer use), it is
    returned as an image content block so Claude can see it.  All other
    results are JSON-serialised text.
    """
    if error:
        return {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": json.dumps({"error": error}),
            "is_error": True,
        }

    if result and result.get("type") == "image":
        # Screenshot result -- return as image content block
        return {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": [
                {
                    "type": "image",
                    "source": result["source"],
                },
            ],
        }

    return {
        "type": "tool_result",
        "tool_use_id": tool_use_id,
        "content": json.dumps(result if result else {}),
    }


ACTION_SUFFIX = """

## EXECUTION MANDATE

You are a functional AI agent with real tools — NOT just an advisor.

**Your job is to COMPLETE TASKS, not just talk about them.**

When a user asks you to do something:
1. Clarify requirements BRIEFLY if truly ambiguous (1-2 questions max).
2. Select the best approach and tools for the job.
3. EXECUTE immediately using your available tools.
4. Deliver the actual output (generated image, written file, search results, analysis, code, etc.).

**Rules:**
- Do NOT generate prompts for the user to run elsewhere. YOU run them.
- Do NOT list options and ask the user to choose unless genuinely necessary.
- Do NOT say "I would recommend..." — just DO IT.
- If you have image generation tools, USE THEM to generate the image.
- If you have web search tools, USE THEM to research.
- If you have code execution tools, USE THEM to run code.
- If you have file tools, USE THEM to create deliverables.
- After executing, present the results clearly with any files/outputs you created.
- If a tool fails, try an alternative tool or approach before giving up.

You are autonomous. Act like it.
"""


class AgentEngine:
    """
    Orchestrates multi-turn agent execution with tool calling.

    Parameters
    ----------
    registry : AgentRegistry
        Provides agent definitions (system prompt, model, tier, etc.).
    model_router : ModelRouter
        Routes LLM requests to the correct provider.
    tool_registry : ToolRegistry
        Holds registered tools and executes them by name.
    """

    def __init__(
        self,
        registry: AgentRegistry,
        model_router: ModelRouter,
        tool_registry: ToolRegistry,
    ) -> None:
        self.registry = registry
        self.router = model_router
        self.tools = tool_registry

    @staticmethod
    def _build_system_prompt(agent: AgentDefinition, has_tools: bool) -> str:
        """Wrap the agent's raw system prompt with action-oriented instructions."""
        base = agent.system_prompt
        if has_tools:
            return base + ACTION_SUFFIX
        return base

    # ------------------------------------------------------------------
    # Non-streaming execution
    # ------------------------------------------------------------------

    async def run(
        self,
        agent_slug: str,
        session_id: str,
        user_message: str | list[dict],
        history: list[dict] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a full agent conversation turn (blocking).

        ``user_message`` can be a plain string or a list of multimodal content
        blocks (text + image) for vision-capable models.

        Returns a dict with keys:
            response, model, turns, tool_calls, usage
        """
        agent = self.registry.get(agent_slug)
        if not agent:
            raise ValueError(f"Agent not found: {agent_slug}")

        ctx = AgentContext(session_id=session_id, agent_slug=agent_slug)
        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        tool_schemas = self.tools.get_tools(max_tier=agent.tier)
        # Include Anthropic-defined tools (computer, bash, text_editor)
        # for agents at tier 4 or above.
        if agent.tier >= 4:
            tool_schemas = tool_schemas + self.tools.get_anthropic_tools()
        tools = tool_schemas if tool_schemas else None
        system_prompt = self._build_system_prompt(agent, bool(tools))

        turns = 0
        tool_calls_log: list[dict[str, Any]] = []
        total_input_tokens = 0
        total_output_tokens = 0

        while turns < agent.max_turns:
            turns += 1

            logger.info(
                "Agent %r turn %d/%d (session %s, model %s)",
                agent_slug,
                turns,
                agent.max_turns,
                session_id,
                agent.model,
            )

            response: LLMResponse = await self.router.chat(
                model_key=agent.model,
                system=system_prompt,
                messages=messages,
                tools=tools,
                temperature=agent.temperature,
                max_tokens=agent.max_tokens,
            )
            total_input_tokens += response.input_tokens
            total_output_tokens += response.output_tokens

            # Detect truncated tool calls (max_tokens hit mid-JSON)
            if response.stop_reason == "max_tokens" and response.tool_calls:
                logger.warning(
                    "Agent %r turn %d: tool call truncated by max_tokens (%d). "
                    "Asking LLM to retry with shorter output.",
                    agent_slug, turns, agent.max_tokens,
                )
                # Tell the LLM its output was truncated and ask it to retry
                if response.text:
                    messages.append({"role": "assistant", "content": response.text})
                messages.append({
                    "role": "user",
                    "content": (
                        "Your previous tool call was truncated because it exceeded the output limit. "
                        "Please try again with a more concise version. For generate_prototype, "
                        "create a simpler prototype with fewer elements — you can always iterate "
                        "and add more detail in follow-up calls."
                    ),
                })
                continue

            # If no tool calls, the agent is done
            if not response.tool_calls:
                return {
                    "response": response.text,
                    "model": agent.model,
                    "turns": turns,
                    "tool_calls": tool_calls_log,
                    "usage": {
                        "input_tokens": total_input_tokens,
                        "output_tokens": total_output_tokens,
                    },
                }

            # Build assistant message with interleaved text + tool_use blocks
            assistant_content: list[dict[str, Any]] = []
            if response.text:
                assistant_content.append({"type": "text", "text": response.text})

            for tc in response.tool_calls:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc.id,
                    "name": tc.name,
                    "input": tc.arguments,
                })

            messages.append({"role": "assistant", "content": assistant_content})

            # Execute each tool call and collect results
            tool_results: list[dict[str, Any]] = []
            for tc in response.tool_calls:
                result, error = await self._execute_tool(tc.name, tc.arguments, ctx)
                tool_calls_log.append({
                    "name": tc.name,
                    "params": tc.arguments,
                    "result": result,
                    "error": error,
                })
                tool_results.append(
                    _build_tool_result(tc.id, result, error)
                )

            messages.append({"role": "user", "content": tool_results})

        # Max turns exhausted
        logger.warning(
            "Agent %r reached max turns (%d) for session %s",
            agent_slug,
            agent.max_turns,
            session_id,
        )
        return {
            "response": (
                "I have reached the maximum number of conversation turns for this "
                "request. Please start a new message to continue."
            ),
            "model": agent.model,
            "turns": turns,
            "tool_calls": tool_calls_log,
            "usage": {
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
            },
        }

    # ------------------------------------------------------------------
    # Streaming execution
    # ------------------------------------------------------------------

    async def run_stream(
        self,
        agent_slug: str,
        session_id: str,
        user_message: str | list[dict],
        history: list[dict] | None = None,
        extra_system: str = "",
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Execute the agent and yield SSE-compatible event dicts.

        ``user_message`` can be a plain string or a list of multimodal content
        blocks (text + image) for vision-capable models.

        Event types:
            tool_start   -- tool execution is beginning
            tool_result  -- tool execution completed
            text_delta   -- partial text from the streaming LLM response
            done         -- conversation turn is complete
            error        -- an error occurred
        """
        agent = self.registry.get(agent_slug)
        if not agent:
            yield {"type": "error", "error": f"Agent not found: {agent_slug}"}
            return

        ctx = AgentContext(session_id=session_id, agent_slug=agent_slug)
        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        tool_schemas = self.tools.get_tools(max_tier=agent.tier)
        # Include Anthropic-defined tools (computer, bash, text_editor)
        # for agents at tier 4 or above.
        if agent.tier >= 4:
            tool_schemas = tool_schemas + self.tools.get_anthropic_tools()
        tools = tool_schemas if tool_schemas else None
        system_prompt = self._build_system_prompt(agent, bool(tools))
        # 2026-10-31 (CX Workbench agent-stack plan, WS-B B2): the shared-memory facts recalled for this turn.
        if extra_system:
            system_prompt = f"{system_prompt}\n\n{extra_system}"

        turns = 0
        tool_calls_log: list[dict[str, Any]] = []
        total_input_tokens = 0
        total_output_tokens = 0

        while turns < agent.max_turns:
            turns += 1

            logger.info(
                "Agent %r stream turn %d/%d (session %s)",
                agent_slug,
                turns,
                agent.max_turns,
                session_id,
            )

            # Use non-streaming for tool-calling turns (we need the full
            # response to process tool calls).  Only stream the final
            # text-only response.
            try:
                response: LLMResponse = await self.router.chat(
                    model_key=agent.model,
                    system=system_prompt,
                    messages=messages,
                    tools=tools,
                    temperature=agent.temperature,
                    max_tokens=agent.max_tokens,
                )
            except Exception as exc:
                logger.exception(
                    "LLM call failed for agent %r turn %d: %s",
                    agent_slug, turns, exc,
                )
                yield {"type": "error", "error": f"LLM error: {exc}"}
                return
            total_input_tokens += response.input_tokens
            total_output_tokens += response.output_tokens

            # Detect truncated tool calls (max_tokens hit mid-JSON)
            if response.stop_reason == "max_tokens" and response.tool_calls:
                logger.warning(
                    "Agent %r stream turn %d: tool call truncated by max_tokens. Retrying.",
                    agent_slug, turns,
                )
                if response.text:
                    yield {"type": "text_delta", "content": response.text}
                    messages.append({"role": "assistant", "content": response.text})
                messages.append({
                    "role": "user",
                    "content": (
                        "Your previous tool call was truncated because it exceeded the output limit. "
                        "Please try again with a more concise version. For generate_prototype, "
                        "create a simpler prototype with fewer elements — you can always iterate."
                    ),
                })
                yield {
                    "type": "thinking",
                    "message": "Output was truncated, retrying with shorter content...",
                }
                continue

            if not response.tool_calls:
                # Final response — emit the text we already have
                if response.text:
                    yield {
                        "type": "text_delta",
                        "content": response.text,
                    }

                yield {
                    "type": "done",
                    "model": agent.model,
                    "turns": turns,
                    "tool_calls": tool_calls_log,
                    "usage": {
                        "input_tokens": total_input_tokens,
                        "output_tokens": total_output_tokens,
                    },
                }
                return

            # Process tool calls (non-streaming path)
            # Emit any intermediate text so the user sees the agent's reasoning
            if response.text:
                yield {"type": "text_delta", "content": response.text}

            assistant_content: list[dict[str, Any]] = []
            if response.text:
                assistant_content.append({"type": "text", "text": response.text})

            for tc in response.tool_calls:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc.id,
                    "name": tc.name,
                    "input": tc.arguments,
                })

            messages.append({"role": "assistant", "content": assistant_content})

            # Auto-navigate browser before first computer use action
            _computer_names = {"computer"}
            if any(tc.name in _computer_names for tc in response.tool_calls):
                try:
                    from app.tools.computer_use import navigate_to_app
                    _APP_URLS = {
                        "journey": "http://journey-mapper:8000",
                        "reddit": "http://reddit-ripper:5000",
                        "video": "http://video-analyzer:5000",
                        "transcri": "http://video-analyzer:5000",
                        "social": "http://social-research-frontend:5173",
                        "sentiment": "http://social-research-frontend:5173",
                        "character": "http://consistent-character-generator:5010",
                        "copilot": "http://copilot-recipe-generator:5013",
                        "recipe": "http://copilot-recipe-generator:5013",
                        "miro": "http://miro-generator:5004",
                        "research": "http://hic-research:5011",
                    }
                    for msg in reversed(messages[-6:]):
                        content = str(msg.get("content", "")).lower()
                        for kw, url in _APP_URLS.items():
                            if kw in content:
                                logger.info("Auto-nav browser to %s (keyword: %s)", url, kw)
                                await navigate_to_app(url)
                                break
                        else:
                            continue
                        break
                except Exception as nav_err:
                    logger.warning("Auto-nav failed: %s", nav_err)

            tool_results: list[dict[str, Any]] = []
            for tc in response.tool_calls:
                yield {
                    "type": "tool_start",
                    "tool": tc.name,
                    "params": tc.arguments,
                }

                # Long-running tools: emit heartbeat events while waiting
                LONG_RUNNING_TOOLS = {
                    "generate_journey_map", "analyze_social_data",
                    "transcribe_video", "search_reddit",
                }
                # 2026-10-31 (D4): a computer or shell action may pause for human review; run it as a task and
                # surface the review card to the client the moment the gate opens one.
                if tc.name in ("computer", "bash", "execute_python", "execute_javascript"):
                    import asyncio as _aio
                    from app.tools import review_gate as _rg
                    gated_task = _aio.create_task(self._execute_tool(tc.name, tc.arguments, ctx))
                    while not gated_task.done():
                        await _aio.sleep(0.5)
                        for rv in _rg.reviews.pending(ctx.session_id):
                            if not rv.get("announced"):
                                rv["announced"] = True
                                yield {"type": "review_required", "review_id": rv["id"], "proposed_action": rv["proposed_action"],
                                       "url": rv["url"], "host": rv["host"], "screenshot": rv["screenshot"]}
                    result, error = gated_task.result()
                elif tc.name in LONG_RUNNING_TOOLS:
                    # Run tool as asyncio task so we can yield heartbeats
                    import asyncio as _aio
                    tool_task = _aio.create_task(
                        self._execute_tool(tc.name, tc.arguments, ctx)
                    )
                    elapsed = 0
                    while not tool_task.done():
                        await _aio.sleep(5)
                        elapsed += 5
                        mins = elapsed // 60
                        secs = elapsed % 60
                        if mins > 0:
                            time_str = f"{mins}m {secs}s"
                        else:
                            time_str = f"{secs}s"
                        yield {
                            "type": "status",
                            "message": f"{tc.name} running... ({time_str})",
                        }
                    result, error = tool_task.result()
                else:
                    result, error = await self._execute_tool(tc.name, tc.arguments, ctx)

                tool_calls_log.append({
                    "name": tc.name,
                    "params": tc.arguments,
                    "result": result,
                    "error": error,
                })

                yield {
                    "type": "tool_result",
                    "tool": tc.name,
                    "result": result,
                    "error": error,
                }

                tool_results.append(
                    _build_tool_result(tc.id, result, error)
                )

            messages.append({"role": "user", "content": tool_results})

            # Signal to the client that we're about to call the LLM again
            yield {
                "type": "thinking",
                "message": f"Analyzing results (turn {turns}/{agent.max_turns})...",
            }

        # Max turns exhausted
        yield {
            "type": "text_delta",
            "content": (
                "I have reached the maximum number of conversation turns for this "
                "request. Please start a new message to continue."
            ),
        }
        yield {
            "type": "done",
            "model": agent.model,
            "turns": turns,
            "tool_calls": tool_calls_log,
            "usage": {
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
            },
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _execute_tool(
        self,
        name: str,
        arguments: dict[str, Any],
        ctx: AgentContext,
    ) -> tuple[dict[str, Any] | None, str | None]:
        """
        Execute a single tool call.

        Anthropic-defined tools (computer, bash, str_replace_based_edit_tool)
        are routed to their dedicated executors.  All other tools go through
        the normal ``ToolRegistry``.

        Returns ``(result_dict, None)`` on success or ``(None, error_string)``
        on failure.
        """
        try:
            # D4: the review gate attributes a paused action to this session
            from app.tools.review_gate import current_session as _review_session
            _review_session.set(ctx.session_id)
            # --- Anthropic-defined tool routing ---
            if name == "computer":
                from app.tools.computer_use import execute_computer_action
                action = arguments.get("action", "screenshot")
                result = await execute_computer_action(action, arguments)
                return result, None

            if name == "bash":
                from app.tools.computer_use import execute_bash_action
                command = arguments.get("command", "")
                result = await execute_bash_action(command)
                return result, None

            if name == "str_replace_based_edit_tool":
                from app.tools.computer_use import execute_text_editor_action
                result = await execute_text_editor_action(arguments)
                return result, None

            # --- Standard tool execution ---
            result = await self.tools.execute(name, arguments, ctx)
            return result, None
        except Exception as exc:
            error_msg = f"Tool execution error ({name}): {exc}"
            logger.exception(error_msg)
            return None, error_msg
