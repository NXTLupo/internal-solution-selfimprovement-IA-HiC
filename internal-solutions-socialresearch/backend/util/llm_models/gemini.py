import os
import json
import google.generativeai as genai

# Initialize the Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_gemini_completion(messages: list, temperature: float = 0.3, require_json: bool = False) -> str:
    """Get chat completion from Gemini 2.5 API.
    
    Args:
        messages: List of message dictionaries with 'content' keys
        temperature: Sampling temperature (0.0 to 1.0)
        require_json: If True, process the response to extract valid JSON
        
    Returns:
        String response from the model, with JSON extraction if require_json is True
    """
    max_retries = 3
    response_text = ""
    
    # Try the API call with retries
    for attempt in range(max_retries):
        try:
            model = genai.GenerativeModel("gemini-1.5-pro-latest")
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
                return ""
    
    # If JSON is not required, return the raw response
    if not require_json:
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
    # Remove markdown code block formatting if present
    response_text = response_text.replace("```json", "").replace("```", "").strip()
    # Find JSON content if it's embedded in other text
    json_start = response_text.find('{')
    json_end = response_text.rfind('}') + 1
    if json_start >= 0 and json_end > json_start:
        return response_text[json_start:json_end]
    return response_text

def test_api():
    """Test the Gemini API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_gemini_completion(messages, temperature=0.3)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_api()
