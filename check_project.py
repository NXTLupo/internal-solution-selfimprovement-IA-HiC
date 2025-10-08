import requests
import json

# Check what's in the project
project_id = "aaea38b5-490b-4ed3-89f3-46e5035ac544"
response = requests.get(f"http://localhost:8081/api/llm-analyzer/project/{project_id}")

if response.status_code == 200:
    data = response.json()
    print(f"Project data:")
    print(f"  Subreddit: {data.get('subreddit', 'NOT FOUND')}")
    print(f"  Topic: {data.get('topic', 'NOT FOUND')}")
    print(f"  Created: {data.get('created_at', 'NOT FOUND')}")
    print(f"  Data keys: {list(data.keys())}")
else:
    print(f"Failed to get project: {response.status_code}")
    print(response.text[:200])