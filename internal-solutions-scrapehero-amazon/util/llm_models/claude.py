import os
import anthropic
import json
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Function to refresh Claude API key - useful if container was restarted
def refresh_claude_api_key():
    # Try environment variable from multiple places
    key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY") or os.getenv("CLAUDE4_API_KEY")
    if key:
        print(f"Using Claude API Key: {key[:8]}...{key[-4:]}")
        return key
    return None

# Get the current API key
api_key = refresh_claude_api_key()

# Initialize the Claude client - removed proxies parameter for older Anthropic package
client = anthropic.Anthropic(
    api_key=api_key
)

def get_claude_completion(messages: list, temperature: float = 0.7) -> str:
    """Get chat completion from Anthropic's Claude API."""
    try:
        # Always refresh the API key before making a call
        api_key = refresh_claude_api_key()
        if not api_key:
            return '{"error": "ANTHROPIC_API_KEY not found."}'
            
        # Re-initialize the client with the refreshed key
        client = anthropic.Anthropic(api_key=api_key)
        
        # Get model name from environment variable or use a default
        model_name = os.getenv("CLAUDE4_MODEL", "claude-3-sonnet-20240229") # Downgraded model for compatibility
        print(f"[claude.py] Using model: {model_name}, API Key: {api_key[:8]}...{api_key[-4:]}")
        
        # Call Claude API
        response = client.messages.create(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=4096
        )
        
        return response.content[0].text
    except Exception as e:
        print(f"Error in get_claude_completion: {e}")
        return f"Error: {str(e)}"

def get_claude_completion_with_json(messages: list, temperature: float = 0.7) -> str:
    """Get chat completion from Anthropic's Claude API with JSON processing."""
    try:
        # Always refresh the API key before making a call
        api_key = refresh_claude_api_key()
        if not api_key:
            return '{"error": "ANTHROPIC_API_KEY not found."}'
            
        # Re-initialize the client with the refreshed key
        client = anthropic.Anthropic(api_key=api_key)
        
        # Get model name from environment variable or use a default
        model_name = os.getenv("CLAUDE4_MODEL", "claude-3-sonnet-20240229") # Downgraded model for compatibility
        print(f"[claude.py] Using model: {model_name}, API Key: {api_key[:8]}...{api_key[-4:]}")
        
        # Call Claude API
        response = client.messages.create(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=4096
        )
        
        response_text = response.content[0].text
        # Process the response to extract valid JSON
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                processed_text = process_llm_response(response_text)
                # Test if we can parse the JSON
                json.loads(processed_text)
                return processed_text
            except json.JSONDecodeError as e:
                print(f"[claude.py] Attempt {attempt+1}/{max_retries}: Invalid JSON in response: {str(e)}")
                if attempt == max_retries - 1:
                    print(f"[claude.py] All {max_retries} attempts failed to get valid JSON, returning raw response")
                    return response_text
        
        return response_text
    except Exception as e:
        print(f"Error in get_claude_completion: {e}")
        return f"Error: {str(e)}"

def process_llm_response(response_text):
    """Process LLM response to extract JSON content"""
    # Remove the thinking section if present
    if "<think>" in response_text and "</think>" in response_text:
        response_text = response_text.split("</think>")[1].strip()
    
    # Remove markdown code block formatting if present
    response_text = response_text.replace("```json", "").replace("```", "").strip()
    
    # Find JSON content if it's embedded in other text
    json_start = response_text.find('{')
    json_end = response_text.rfind('}') + 1
    
    if json_start >= 0 and json_end > json_start:
        return response_text[json_start:json_end]
    
    return response_text

def test_api():
    """Test the API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_claude_completion(messages, temperature=0.3)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_api()