#!/usr/bin/env python3
import requests
import json
import os
import sys

def upload_test_journey():
    file_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json"
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist")
        return False
    
    url = "http://localhost:8090/api/analyze"
    
    # Read the JSON file
    with open(file_path, 'r') as f:
        json_data = json.load(f)
    
    # Prepare data for the request
    data = {
        'title': json_data['metadata']['context']['title'],
        'description': json_data['metadata']['context']['description'],
        'llm_model': 'gpt-4o'  # Use the default OpenAI model
    }
    
    # Prepare the file for upload
    files = {'files': ('test_journey.json', open(file_path, 'rb'), 'application/json')}
    
    print(f"Uploading {file_path} to {url}...")
    
    try:
        response = requests.post(url, data=data, files=files)
        
        if response.status_code == 200:
            print("Success! Journey map generated successfully.")
            journey_id = response.json().get('journey_id')
            if journey_id:
                print(f"Journey map available at: http://localhost:8090/journey_maps/{journey_id}.html")
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