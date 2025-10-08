#!/usr/bin/env python3
"""
Simple test for REAL sentiment analysis using the unified endpoint
"""
import requests
import json
import time
import sys

# Backend URL
BASE_URL = "http://localhost:8081"

def test_real_analysis():
    """Test the real sentiment analysis with the unified endpoint"""

    print("=" * 60)
    print("TESTING REAL SENTIMENT ANALYSIS - UNIFIED ENDPOINT")
    print("=" * 60)

    # Use the unified analyze-sentiment endpoint that does both search and analysis
    data = {
        "subreddit": "technology",
        "query": "ChatGPT",
        "limit": 2,  # Small limit for faster testing
        "sort": "relevance",
        "time": "month",
        "application_name": "ChatGPT",
        "filter_type": "cluster",
        "keyword": "ChatGPT",
        "skip_filtering": True,  # Skip filtering for faster test
        "user_id": "123"  # Use the default user ID created during init
        # Note: project_id will be created automatically during the analysis
    }

    print("\n1. Starting REAL sentiment analysis...")
    print(f"   Subreddit: {data['subreddit']}")
    print(f"   Query: {data['query']}")
    print(f"   Limit: {data['limit']}")
    print(f"   Skip filtering: {data['skip_filtering']}")
    print(f"   User: {data['user_id']}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/llm-analyzer/analyze-sentiment",
            json=data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code not in [200, 202]:
            print(f"\n   FAILED: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        job_result = response.json()
        job_id = job_result.get('job_id')

        print(f"\n   SUCCESS: Analysis job started!")
        print(f"   Job ID: {job_id}")

    except Exception as e:
        print(f"\n   ERROR starting analysis: {str(e)}")
        return False

    # Poll for job completion
    print("\n2. Monitoring job progress...")
    max_attempts = 60  # 5 minutes max
    attempt = 0

    while attempt < max_attempts:
        try:
            response = requests.get(
                f"{BASE_URL}/api/llm-analyzer/job-status/{job_id}",
                headers={"Content-Type": "application/json"}
            )

            if response.status_code != 200:
                print(f"\n   Status check failed: {response.status_code}")
                return False

            status_data = response.json()
            status = status_data.get('status')
            message = status_data.get('message', '')
            progress = status_data.get('progress', 0)

            print(f"   [{attempt+1}/{max_attempts}] Status: {status} | Progress: {progress}% | {message}")

            if status == 'completed':
                print("\n   Job completed successfully!")

                # Get the result
                result = status_data.get('result', {})

                print("\n3. Analysis Results:")
                print("=" * 60)

                # Check for REAL data structures
                merged_result = result.get('merged_result', {})

                # Verify this is REAL data, not mock
                positive = merged_result.get('positive', [])
                negative = merged_result.get('negative', [])

                print(f"\n   Positive Categories: {len(positive)}")
                for i, cat in enumerate(positive[:2], 1):  # Show first 2
                    points = cat.get('points', [])
                    print(f"     {i}. {cat.get('category')}: {len(points)} points")
                    for j, point in enumerate(points[:2], 1):  # Show first 2 points
                        print(f"        - {point.get('point')}")
                        post_ids = point.get('post_ids', [])
                        if post_ids:
                            print(f"          (Referenced in posts: {', '.join(post_ids[:3])})")

                print(f"\n   Negative Categories: {len(negative)}")
                for i, cat in enumerate(negative[:2], 1):  # Show first 2
                    points = cat.get('points', [])
                    print(f"     {i}. {cat.get('category')}: {len(points)} points")
                    for j, point in enumerate(points[:2], 1):  # Show first 2 points
                        print(f"        - {point.get('point')}")
                        post_ids = point.get('post_ids', [])
                        if post_ids:
                            print(f"          (Referenced in posts: {', '.join(post_ids[:3])})")

                # Check for summary
                summary = result.get('summary')
                if summary:
                    print(f"\n   AI Summary:")
                    print(f"   {summary[:300]}...")

                # Verify this is NOT mock data
                is_mock = False
                if positive and len(positive) > 0:
                    first_cat = positive[0]
                    if first_cat.get('category') == 'Performance':
                        points = first_cat.get('points', [])
                        if points and points[0].get('point') == 'Fast and responsive':
                            post_ids = points[0].get('post_ids', [])
                            if post_ids and 'mock_id_1' in post_ids:
                                is_mock = True

                if is_mock:
                    print("\n   WARNING: This appears to be MOCK DATA!")
                    return False
                else:
                    print("\n   VERIFIED: This is REAL sentiment analysis!")
                    return True

            elif status == 'failed':
                error = status_data.get('error', 'Unknown error')
                print(f"\n   Job failed: {error}")
                return False

        except Exception as e:
            print(f"\n   Error checking status: {str(e)}")
            return False

        time.sleep(5)  # Wait 5 seconds between checks
        attempt += 1

    print(f"\n   Timeout: Job did not complete within {max_attempts * 5} seconds")
    return False

if __name__ == "__main__":
    print("\nTesting REAL Sentiment Analysis Implementation")
    print("This will perform actual Reddit search and LLM analysis")
    print("-" * 60)

    success = test_real_analysis()

    print("\n" + "=" * 60)
    if success:
        print("TEST PASSED: Real sentiment analysis is working!")
        sys.exit(0)
    else:
        print("TEST FAILED: Check the implementation and logs.")
        sys.exit(1)