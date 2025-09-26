import os
from util.llm_models.openai import get_openai_completion
from util.llm_models.claude import get_claude_completion, get_claude_completion_with_json

# Check if the Google package is available
try:
    from util.llm_models.gemini import get_gemini_completion, get_gemini_json_completion
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    # Create stub functions
    def get_gemini_completion(*args, **kwargs):
        return '{"error": "Gemini API not available - google.generativeai package not installed"}'
        
    def get_gemini_json_completion(*args, **kwargs):
        return '{"error": "Gemini API not available - google.generativeai package not installed"}'

# Default provider is OpenAI
DEFAULT_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "openai")

def get_llm_completion(messages, provider=None, temperature=0.7, require_json=False):
    """
    Get completion from the specified LLM provider or the default provider.
    
    Args:
        messages (list): List of message dictionaries with 'role' and 'content' keys
        provider (str, optional): LLM provider to use ('openai', 'claude', 'gemini'). 
                                  Defaults to env var DEFAULT_LLM_PROVIDER or 'openai'
        temperature (float, optional): Sampling temperature. Defaults to 0.7.
        require_json (bool, optional): Whether to request JSON formatting. Defaults to False.
    
    Returns:
        str: Response from the LLM
    """
    # Use provided provider or fallback to default
    provider = provider or DEFAULT_PROVIDER
    provider = provider.lower()
    
    # Refresh API keys before checking availability
    from util.llm_models.openai import refresh_openai_api_key
    from util.llm_models.claude import refresh_claude_api_key
    
    # Try to import and refresh Gemini API key if available
    gemini_refresh = None
    if HAS_GEMINI:
        from util.llm_models.gemini import refresh_gemini_api_key
        gemini_refresh = refresh_gemini_api_key
    
    # Refresh and check if API keys are available
    openai_key = refresh_openai_api_key()
    claude_key = refresh_claude_api_key()
    gemini_key = gemini_refresh() if gemini_refresh else None
    
    print(f"[llm_provider.py] Provider requested: {provider}")
    print(f"[llm_provider.py] OpenAI key: {'✓' if openai_key else '✗'}")
    print(f"[llm_provider.py] Claude key: {'✓' if claude_key else '✗'}")
    print(f"[llm_provider.py] Gemini key: {'✓' if gemini_key else '✗'} (package: {'✓' if HAS_GEMINI else '✗'})")
    
    # Select the appropriate provider based on availability
    if provider == "claude" and claude_key:
        if require_json:
            return get_claude_completion_with_json(messages, temperature=temperature)
        return get_claude_completion(messages, temperature=temperature)
    
    elif provider == "gemini" and gemini_key and HAS_GEMINI:
        if require_json:
            return get_gemini_json_completion(messages, temperature=temperature)
        return get_gemini_completion(messages, temperature=temperature)
    
    elif provider == "openai" and openai_key:
        # OpenAI always returns JSON when require_json=True (handled in the function)
        return get_openai_completion(messages, temperature=temperature)
    
    # Fallback to any available provider
    if claude_key:
        if require_json:
            return get_claude_completion_with_json(messages, temperature=temperature)
        return get_claude_completion(messages, temperature=temperature)
    
    elif openai_key:
        return get_openai_completion(messages, temperature=temperature)
    
    elif gemini_key and HAS_GEMINI:
        if require_json:
            return get_gemini_json_completion(messages, temperature=temperature)
        return get_gemini_completion(messages, temperature=temperature)
    
    # No provider available
    return '{"error": "No LLM provider available"}'