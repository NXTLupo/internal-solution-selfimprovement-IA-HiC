#!/usr/bin/env python3
"""
Test script for Social Research Analytics Ask AI feature.
Tests that the AI has proper access to context and post content.
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "http://localhost:8081"

def test_rag_query():
    """Test the RAG query endpoint with a sample question."""
    print("\n" + "="*60)
    print("Testing Social Research Ask AI Feature")
    print("="*60 + "\n")

    # Sample query data
    test_data = {
        "prompt": "What are the key themes in the conversations?",
        "subreddit": "familymedicine",  # Use a subreddit that should have data
        "model": "claude",
        "topicData": {
            "topics": {
                "positive": {"topics": []},
                "neutral": {"topics": []},
                "negative": {"topics": []}
            }
        }
    }

    print("1. Testing RAG Query Endpoint")
    print(f"   URL: {BACKEND_URL}/api/rag/query")
    print(f"   Subreddit: {test_data['subreddit']}")
    print(f"   Question: {test_data['prompt']}")
    print()

    try:
        response = requests.post(
            f"{BACKEND_URL}/api/rag/query",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()

            print("[SUCCESS] RAG query returned successfully")
            print("\nAI Response:")
            print("-" * 40)

            # Handle different response formats
            if isinstance(result, dict):
                ai_answer = result.get('answer', str(result))
            else:
                ai_answer = str(result)

            if isinstance(ai_answer, str):
                # Truncate long responses for display
                if len(ai_answer) > 500:
                    print(ai_answer[:500] + "...")
                else:
                    print(ai_answer)

                # Check for the problem message
                if "don't have enough information" in ai_answer or "context section is empty" in ai_answer:
                    print("\n[WARNING] AI reports no context available!")
                    print("This means the embeddings are not populated.")
                    print("\nTo fix this:")
                    print("1. Run: cd internal-solutions-socialresearch/backend")
                    print("2. Run: python fix_embeddings.py")
                    print("3. Follow the prompts to create embeddings")
                else:
                    print("\n[OK] AI has access to context and is providing answers based on data!")
            else:
                print(json.dumps(ai_answer, indent=2))

        else:
            print(f"[ERROR] Request failed with status {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("[ERROR] Request timed out after 30 seconds")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Could not connect to backend. Is it running?")
        print(f"Make sure the backend is running at {BACKEND_URL}")
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")

def test_reddit_proxy():
    """Test the Reddit proxy endpoint for CORS handling."""
    print("\n2. Testing Reddit Proxy Endpoint (for CORS)")

    test_subreddit = "python"
    url = f"{BACKEND_URL}/api/reddit-proxy/subreddit/{test_subreddit}/icon"

    print(f"   URL: {url}")
    print(f"   Fetching icon for: r/{test_subreddit}")

    try:
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data.get('icon_url'):
                print(f"   [SUCCESS] Got icon URL: {data['icon_url'][:50]}...")
            else:
                print(f"   [OK] No icon found for r/{test_subreddit}")
        else:
            print(f"   [ERROR] Request failed with status {response.status_code}")

    except Exception as e:
        print(f"   [ERROR] {e}")

def check_embeddings():
    """Check if embeddings exist in the database."""
    print("\n3. Checking Embeddings Status")

    # This would require database access, so we'll make a simple test query
    test_data = {
        "prompt": "test",
        "subreddit": "test",
        "model": "claude"
    }

    try:
        # Make a quick query to see if we get any context
        response = requests.post(
            f"{BACKEND_URL}/api/rag/query",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            print("   [OK] RAG endpoint is accessible")
        else:
            print(f"   [WARNING] RAG endpoint returned status {response.status_code}")

    except Exception as e:
        print(f"   [ERROR] Could not check embeddings: {e}")

def main():
    """Run all tests."""
    print("\nSocial Research Analytics - AI Feature Test")
    print("Testing backend at:", BACKEND_URL)

    # Test RAG query
    test_rag_query()

    # Test Reddit proxy
    test_reddit_proxy()

    # Check embeddings
    check_embeddings()

    print("\n" + "="*60)
    print("Test Complete")
    print("="*60)
    print("\nNotes:")
    print("- If AI says 'context section is empty', run fix_embeddings.py")
    print("- CORS errors should be resolved by using the proxy endpoint")
    print("- Make sure both frontend (port 3000) and backend (port 8081) are running")

if __name__ == "__main__":
    main()