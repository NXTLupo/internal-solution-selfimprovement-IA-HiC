#!/usr/bin/env python3
"""
Get an existing project_id from the database for testing
"""
import requests
import json

# Create a dummy search to get a project_id
search_data = {
    "subreddit": "technology",
    "query": "test",
    "limit": 1,
    "sort": "relevance",
    "time": "month",
    "user_id": "test_user",
    "project_name": "Test Project"
}

# Use the analyze-sentiment endpoint with full parameters
analysis_data = {
    "subreddit": "technology",
    "query": "ChatGPT AI",
    "limit": 2,
    "sort": "relevance",
    "time": "month",
    "application_name": "ChatGPT",
    "filter_type": "cluster",
    "keyword": "ChatGPT",
    "skip_filtering": True,
    "user_id": "test_user",
    "project_id": "test_project_123"  # Use a fixed test ID
}

print("Creating test project via analyze-sentiment endpoint...")
response = requests.post(
    "http://localhost:8081/api/llm-analyzer/analyze-sentiment",
    json=analysis_data
)

if response.status_code == 200:
    result = response.json()
    job_id = result.get('job_id')
    print(f"Job created: {job_id}")
    print(f"Use project_id: test_project_123 for testing")
else:
    print(f"Failed: {response.status_code}")
    print(response.text)