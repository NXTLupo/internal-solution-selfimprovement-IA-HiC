from flask import Flask, jsonify
import requests
import json
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/send_hi', methods=['GET'])
def send_hi():
    try:
        # Define the prompt
        prompt = "hi"
        print("prompt!!")
        print(prompt)
        
        # Make a request to the local Ollama server
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                "model": "mistral",
                "prompt": prompt
            },
            stream=False  # Ensure we're not using streaming mode
        )
        
        print("response status code:", response.status_code)
        
        # Check if the request was successful
        if response.status_code == 200:
            try:
                # Try to parse as a single JSON object first
                data = response.json()
                print("Parsed response data:", data)
                return jsonify({"response": data.get('response', '')})
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                print("Raw response:", response.text)
                
                # Handle the response as JSONL (JSON Lines)
                lines = response.text.strip().split('\n')
                if lines:
                    # Collect all response fragments
                    full_response = ""
                    for line in lines:
                        try:
                            json_obj = json.loads(line)
                            if 'response' in json_obj:
                                full_response += json_obj['response']
                        except json.JSONDecodeError:
                            continue
                    
                    return jsonify({"response": full_response})
                
                return jsonify({"error": "Invalid response format from Ollama"}), 400
        else:
            return jsonify({"error": "Failed to get response from Mistral model"}), response.status_code

    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

def query_mistral(prompt, model="mistral", timeout=300):
    """
    Query the local Ollama server with the Mistral model
    
    Args:
        prompt (str): The prompt to send to the model
        model (str): The model name to use (default: "mistral")
        timeout (int): Request timeout in seconds
        
    Returns:
        str: The model's response
        
    Raises:
        Exception: If there's an error communicating with the model
    """
    try:
        logger.info(f"Querying Mistral with prompt: {prompt[:100]}...")
        
        # Make a request to the local Ollama server
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=timeout
        )
        
        logger.info(f"Response status code: {response.status_code}")
        
        # Check if the request was successful
        if response.status_code == 200:
            try:
                # Try to parse as a single JSON object first
                data = response.json()
                return data.get('response', '')
            except json.JSONDecodeError:
                # Handle the response as JSONL (JSON Lines)
                lines = response.text.strip().split('\n')
                if lines:
                    # Collect all response fragments
                    full_response = ""
                    for line in lines:
                        try:
                            json_obj = json.loads(line)
                            if 'response' in json_obj:
                                full_response += json_obj['response']
                        except json.JSONDecodeError:
                            continue
                    
                    return full_response
                
                raise ValueError("Invalid response format from Ollama")
        else:
            raise Exception(f"Failed to get response from Mistral model: {response.text}")

    except Exception as e:
        logger.exception(f"Exception occurred: {str(e)}")
        raise

if __name__ == '__main__':
    app.run(debug=True)
