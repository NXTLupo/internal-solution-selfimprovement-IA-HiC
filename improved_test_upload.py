#!/usr/bin/env python3
import requests
import json
import os
import sys
import time

def upload_test_journey():
    file_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json"
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist")
        return False
    
    # First get the models available
    try:
        models_response = requests.get("http://localhost:8090/api/models")
        models_data = models_response.json()
        print(f"Available models: {models_data}")
        
        default_model = models_data.get('default', 'gpt-4o')
    except Exception as e:
        print(f"Warning: Could not get models, using default: {e}")
        default_model = 'gpt-4o'
    
    url = "http://localhost:8090/api/analyze"
    
    # Prepare data for the request
    with open(file_path, 'r') as f:
        journey_data = json.load(f)
    
    data = {
        'title': journey_data['metadata']['context']['title'],
        'description': journey_data['metadata']['context']['description'],
        'llm_model': default_model
    }
    
    # Prepare the file for upload
    files = {
        'files': ('test_journey.json', open(file_path, 'rb'), 'application/json')
    }
    
    print(f"Uploading {file_path} to {url}...")
    
    try:
        # Make the POST request with a longer timeout
        response = requests.post(url, data=data, files=files, timeout=60)
        
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        if response.status_code == 200 or response.status_code == 303:
            print("Success! Request accepted.")
            
            # If there's a redirect, follow it
            if response.status_code == 303:
                redirect_url = response.headers.get('Location')
                if redirect_url:
                    if not redirect_url.startswith('http'):
                        redirect_url = f"http://localhost:8090{redirect_url}"
                    print(f"Following redirect to {redirect_url}")
                    
                    # Give the server some time to process
                    print("Waiting for journey map generation to complete...")
                    time.sleep(5)
                    
                    journey_response = requests.get(redirect_url)
                    if journey_response.status_code == 200:
                        print(f"Journey map generated successfully: {redirect_url}")
                        # Write the response to a file
                        with open("journey_response.html", "wb") as f:
                            f.write(journey_response.content)
                        print("Journey map saved to journey_response.html")
                        return True
                    else:
                        print(f"Error getting journey map: {journey_response.status_code}")
            return True
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Error uploading file: {e}")
        return False

if __name__ == "__main__":
    success = upload_test_journey()
    sys.exit(0 if success else 1)