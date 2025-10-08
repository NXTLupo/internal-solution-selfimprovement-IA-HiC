#!/usr/bin/env python3
"""
Test REAL sentiment analysis for Kuminga in NBA subreddit
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8081"

def test_nba_kuminga():
    """Test searching for Kuminga in NBA subreddit"""

    print("=" * 60)
    print("TESTING NBA SUBREDDIT - KUMINGA SEARCH")
    print("=" * 60)

    # First, perform a search in NBA subreddit
    search_data = {
        "subreddit": "nba",
        "query": "Kuminga",
        "limit": 5,
        "sort": "relevance",
        "time": "month"
    }

    print("\n1. Searching NBA subreddit for 'Kuminga'...")
    print(f"   Subreddit: {search_data['subreddit']}")
    print(f"   Query: {search_data['query']}")

    response = requests.post(
        f"{BASE_URL}/api/llm-analyzer/search",
        json=search_data
    )

    if response.status_code != 200:
        print(f"   Search failed: {response.status_code}")
        return False

    search_result = response.json()
    search_id = search_result.get('search_id')
    results = search_result.get('results', [])

    print(f"\n   Found {len(results)} posts about Kuminga in r/nba:")
    for i, post in enumerate(results[:3], 1):
        print(f"   {i}. {post.get('title', 'No title')[:80]}...")
        print(f"      Score: {post.get('score', 0)}, Comments: {post.get('num_comments', 0)}")

    if len(results) == 0:
        print("\n   WARNING: No posts found. Reddit API might be rate limited or down.")
        return False

    # Now analyze the results
    print("\n2. Starting sentiment analysis...")

    analysis_data = {
        "application_name": "Kuminga",
        "subreddit": "nba",  # EXPLICITLY pass subreddit
        "query": "Kuminga",  # EXPLICITLY pass query
        "keyword": "Kuminga",
        "filter_type": "cluster",
        "skip_filtering": True,
        "max_workers": 2,
        "user_id": "123",
        "project_id": f"nba_kuminga_{int(time.time())}"
    }

    response = requests.post(
        f"{BASE_URL}/api/llm-analyzer/analyze-sentiment/{search_id}",
        json=analysis_data
    )

    if response.status_code not in [200, 202]:
        print(f"   Failed to start analysis: {response.status_code}")
        print(f"   {response.text[:200]}")
        return False

    job_result = response.json()
    job_id = job_result.get('job_id')
    print(f"   Job created: {job_id}")

    # Monitor job
    print("\n3. Processing (this may take 30-60 seconds)...")
    for attempt in range(60):
        time.sleep(3)

        response = requests.get(
            f"{BASE_URL}/api/llm-analyzer/job-status/{job_id}"
        )

        if response.status_code != 200:
            continue

        status_data = response.json()
        status = status_data.get('status')
        progress = status_data.get('progress', 0)

        if attempt % 3 == 0:
            print(f"   Status: {status} ({progress}%)")

        if status == 'completed':
            result = status_data.get('result', {})

            # Check what subreddit was actually used
            actual_subreddit = result.get('subreddit', 'unknown')
            print(f"\n   COMPLETED! Subreddit used: {actual_subreddit}")

            if actual_subreddit != 'nba':
                print(f"   ERROR: Expected NBA subreddit but got '{actual_subreddit}'")
                return False

            merged = result.get('merged_result', {})
            positive = merged.get('positive', [])
            negative = merged.get('negative', [])

            print(f"\n4. Results:")
            print(f"   Positive categories: {len(positive)}")
            print(f"   Negative categories: {len(negative)}")

            if positive or negative:
                print("\n   SUCCESS: Real sentiment analysis completed!")
                return True
            else:
                print("\n   WARNING: Analysis completed but no sentiments found")
                print("   This might mean the posts had no clear sentiment")
                return True

        elif status == 'failed':
            error = status_data.get('error', 'Unknown')
            print(f"\n   FAILED: {error}")

            # Check parameters to debug
            params = status_data.get('parameters', {})
            print(f"   Subreddit in params: {params.get('subreddit', 'NOT SET')}")
            print(f"   Query in params: {params.get('query', 'NOT SET')}")
            return False

    print("\n   TIMEOUT")
    return False

if __name__ == "__main__":
    print("\nTesting NBA Subreddit Search for Kuminga")
    print("This should find REAL posts about Jonathan Kuminga")
    print("-" * 60)

    success = test_nba_kuminga()

    print("\n" + "=" * 60)
    if success:
        print("SUCCESS: NBA subreddit search is working!")
        sys.exit(0)
    else:
        print("FAILED: Check the implementation")
        sys.exit(1)