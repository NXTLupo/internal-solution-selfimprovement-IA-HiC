import os
import openai
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Function to refresh OpenAI API key - useful if container was restarted
def refresh_openai_api_key():
    # Try environment variable from multiple places
    key = os.getenv("OPENAI_API_KEY") or os.getenv("CHATGPT5_API_KEY")
    
    if key:
        openai.api_key = key
        print(f"Using OpenAI API Key: {key[:8]}...{key[-4:]}")
        return key
    return None

# Initial setup
openai_api_key = refresh_openai_api_key()
openai.api_key = openai_api_key

def get_openai_completion(messages: list, temperature: float = 0.7, json_format: bool = False) -> str:
    """Get chat completion from OpenAI."""
    # Always refresh the API key before making a call
    api_key = refresh_openai_api_key()
    if not api_key:
        return '{"error": "OPENAI_API_KEY not found."}'
    
    # Update OpenAI API key
    openai.api_key = api_key

    try:
        # Get model name from environment variable or use a default
        model_name = os.getenv("OPENAI_MODEL", "o3")
        
        # Print debug information
        print(f"[openai.py] Using model: {model_name}, API Key: {api_key[:8]}...{api_key[-4:]}")
        
        # Configure response format if requested
        response_format = { "type": "json_object" } if json_format else None
        
        # Call OpenAI API
        try:
            response = openai.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                response_format=response_format
            )
        except Exception as e:
            print(f"Error with model {model_name}: {e}, falling back to gpt-4o")
            try:
                response = openai.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    temperature=temperature,
                    response_format=response_format
                )
            except Exception as fallback_error:
                print(f"Error with fallback model gpt-4o: {fallback_error}")
                return f"Error: {str(fallback_error)}"
                
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

def test_api():
    """Test the API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_openai_completion(messages, temperature=0.3)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_api()