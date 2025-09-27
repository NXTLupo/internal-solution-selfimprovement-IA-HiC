# LLM Models package initialization

from .claude import get_claude_completion, get_claude_completion_with_json
from .openai import get_openai_completion
from .gemini import get_gemini_completion, get_gemini_json_completion

# LLM provider mapping
LLM_PROVIDERS = {
    'claude': {
        'name': 'Claude 4 Sonnet',
        'function': get_claude_completion,
        'json_function': get_claude_completion_with_json,
        'env_var': 'ANTHROPIC_API_KEY',
        'model': 'claude-sonnet-4-20250514'
    },
    'openai': {
        'name': 'OpenAI o3',
        'function': get_openai_completion,
        'json_function': lambda msg, temp: get_openai_completion(msg, temp, json_format=True),
        'env_var': 'OPENAI_API_KEY',
        'model': 'o3'
    },
    'gemini': {
        'name': 'Gemini 2.5 Pro',
        'function': get_gemini_completion,
        'json_function': get_gemini_json_completion,
        'env_var': 'GEMINI_API_KEY',
        'model': 'gemini-2.5-pro'
    }
}