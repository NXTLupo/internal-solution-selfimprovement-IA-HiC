"""Retired DeepSeek provider.

The Azure DeepSeek client that used to live here was removed, and for a while both
functions were stubs that returned "". Callers received an empty completion with no
error: 'deepseek-r1' chunk analyses came back blank and the LLM merge never got a reply.

The functions now raise DeepSeekUnavailableError so no caller can silently get nothing.
Use util.llm_models.claude (get_claude_completion / get_claude_completion_with_json),
which carries the service's current model default and fallback chain.
"""


class DeepSeekUnavailableError(RuntimeError):
    """Raised when code tries to call the retired DeepSeek provider."""


_MESSAGE = (
    "DeepSeek is not available in the Social Research backend: util/llm_models/deepseek.py "
    "is a retired stub with no client behind it. Call util.llm_models.claude."
    "get_claude_completion or get_claude_completion_with_json instead."
)


def get_single_deepseek_completion(*args, **kwargs):
    raise DeepSeekUnavailableError(_MESSAGE)


def get_json_deepseek_completion(*args, **kwargs):
    raise DeepSeekUnavailableError(_MESSAGE)
