import os
import json
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Function to refresh Gemini API key - useful if container was restarted
def refresh_gemini_api_key():
    # Get key from environment variables, looking in multiple locations
    key = os.getenv("GEMINI_API_KEY")
    
    if key:
        print(f"Using Gemini API Key: {key[:8]}...{key[-4:] if len(key) > 12 else ''}")
        genai.configure(api_key=key)
        return key
    return None

# Initialize the Gemini client
gemini_api_key = refresh_gemini_api_key()

def get_gemini_completion(messages: list, temperature: float = 0.3) -> str:
    """Get chat completion from Gemini 2.5 API.
    
    Args:
        messages: List of message dictionaries with 'content' keys
        temperature: Sampling temperature (0.0 to 1.0)
        require_json: If True, process the response to extract valid JSON
        
    Returns:
        String response from the model, with JSON extraction if require_json is True
    """
    # Always refresh the API key before making a call
    api_key = refresh_gemini_api_key()
    if not api_key:
        return '{"error": "GEMINI_API_KEY not found."}'
        
    max_retries = 3
    response_text = ""
    
    # Try the API call with retries
    for attempt in range(max_retries):
        try:
            # Configure with fresh key
            genai.configure(api_key=api_key)
            print(f"[gemini.py] Using API Key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else ''}")
            
            model = genai.GenerativeModel("gemini-2.5-pro")
            chat = model.start_chat(history=[])
            # Concatenate message contents for the prompt
            prompt = "\n".join([msg["content"] for msg in messages])
            response = chat.send_message(prompt, generation_config={"temperature": temperature})
            response_text = response.text
            break  # Break the loop if successful
        except Exception as e:
            print(f"[gemini.py] API call attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt == max_retries - 1:
                print(f"[gemini.py] All {max_retries} attempts to call API failed")
                return '{"error": "Failed to call Gemini API: ' + str(e).replace('"', '\'') + '"}'
    
    # Always return the raw response
    return response_text
    
    # Process the response to extract valid JSON
    for attempt in range(max_retries):
        try:
            processed_text = process_llm_response(response_text)
            json.loads(processed_text)  # Validate JSON
            return processed_text
        except json.JSONDecodeError as e:
            print(f"[gemini.py] JSON processing attempt {attempt+1}/{max_retries} failed: {str(e)}")
            if attempt == max_retries - 1:
                print(f"[gemini.py] All {max_retries} attempts failed to get valid JSON, returning raw response")
                return response_text
    
    return response_text

def process_llm_response(response_text: str) -> str:
    """Process LLM response to extract JSON content."""
    # Remove Gemini <thinking> tags if present
    if "<thinking>" in response_text and "</thinking>" in response_text:
        thinking_start = response_text.find("<thinking>")
        thinking_end = response_text.find("</thinking>", thinking_start) + len("</thinking>")
        response_text = response_text[:thinking_start] + response_text[thinking_end:]
        response_text = response_text.strip()
    
    # Remove markdown code block formatting if present
    response_text = response_text.replace("```json", "").replace("```", "").strip()
    
    # Find JSON content if it's embedded in other text
    json_start = response_text.find('{')
    json_end = response_text.rfind('}') + 1
    if json_start >= 0 and json_end > json_start:
        return response_text[json_start:json_end]
    
    return response_text

def get_gemini_json_completion(messages: list, temperature: float = 0.3) -> str:
    """Get JSON-formatted chat completion from Gemini API."""
    # Always refresh the API key before making a call
    api_key = refresh_gemini_api_key()
    if not api_key:
        return '{"error": "GEMINI_API_KEY not found."}'
    
    max_retries = 3
    response_text = ""
    
    # Make sure the last message requests JSON format
    if messages and isinstance(messages[-1], dict) and 'content' in messages[-1]:
        last_message = messages[-1]['content']
        if not last_message.strip().endswith('JSON'):
            messages[-1]['content'] = f"{last_message}\nPlease format the response as valid JSON."
    
    # Try the API call with retries
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel("gemini-2.5-pro")
            chat = model.start_chat(history=[])
            # Concatenate message contents for the prompt
            prompt = "\n".join([msg["content"] for msg in messages])
            response = chat.send_message(prompt, generation_config={"temperature": temperature})
            response_text = response.text
            break  # Break the loop if successful
        except Exception as e:
            print(f"[gemini.py] API call attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt == max_retries - 1:
                print(f"[gemini.py] All {max_retries} attempts to call API failed")
                return '{"error": "Failed to call Gemini API."}'
    
    # Process the response to extract valid JSON
    for attempt in range(max_retries):
        try:
            processed_text = process_llm_response(response_text)
            # Test if we can parse the JSON
            json.loads(processed_text)
            return processed_text
        except json.JSONDecodeError as e:
            print(f"[gemini.py] JSON processing attempt {attempt+1}/{max_retries} failed: {str(e)}")
            if attempt == max_retries - 1:
                print(f"[gemini.py] All {max_retries} attempts failed to get valid JSON, returning raw response")
                return response_text
    
    return response_text

def test_api():
    """Test the Gemini API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_gemini_completion(messages, temperature=0.3)
    print(f"Response: {response}")
    
    # Test JSON API
    json_messages = [{"role": "user", "content": "Say hello and format your response as a JSON object with a 'greeting' field."}]
    json_response = get_gemini_json_completion(json_messages, temperature=0.3)
    print(f"JSON Response: {json_response}")

if __name__ == "__main__":
    test_api()
