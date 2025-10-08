#!/usr/bin/env python3
"""
Test the WORKING sentiment analysis endpoint that's already proven to work
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8081"

def test_working_endpoint():
    """Test the original working analyze-sentiment endpoint"""

    print("=" * 60)
    print("TESTING ORIGINAL WORKING SENTIMENT ANALYSIS")
    print("=" * 60)

    # Use the original working endpoint with all required params
    data = {
        "subreddit": "technology",
        "query": "ChatGPT pros and cons",
        "limit": 1,  # Very small for quick test
        "sort": "relevance",
        "time": "week",
        "application_name": "ChatGPT",
        "filter_type": "cluster",
        "keyword": "ChatGPT",
        "merge_method": "deepseek-r1",
        "chunk_size": 40000,
        "analysis_model": "deepseek-r1",
        "max_workers": 2,
        "skip_filtering": False,  # Use full pipeline
        "user_id": "123"
        # No project_id - let it be created automatically
    }

    print("\n1. Starting sentiment analysis with proven endpoint...")
    print(f"   Subreddit: {data['subreddit']}")
    print(f"   Query: {data['query']}")
    print(f"   Limit: {data['limit']} posts")

    try:
        response = requests.post(
            f"{BASE_URL}/api/llm-analyzer/analyze-sentiment",
            json=data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code not in [200, 202]:
            print(f"\n   FAILED to start: {response.status_code}")
            print(f"   {response.text}")
            return False

        result = response.json()
        job_id = result.get('job_id')

        print(f"\n   SUCCESS: Job created!")
        print(f"   Job ID: {job_id}")

    except Exception as e:
        print(f"\n   ERROR: {str(e)}")
        return False

    # Monitor job
    print("\n2. Monitoring job (this may take 1-2 minutes)...")
    max_attempts = 120  # 10 minutes max

    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"{BASE_URL}/api/llm-analyzer/job-status/{job_id}"
            )

            if response.status_code != 200:
                print(f"\n   Failed to get status: {response.status_code}")
                return False

            status_data = response.json()
            status = status_data.get('status')
            progress = status_data.get('progress', 0)
            message = status_data.get('message', '')

            # Show progress updates
            if attempt % 5 == 0:  # Every 25 seconds
                print(f"   [{attempt+1}/{max_attempts}] {status} | {progress}% | {message}")

            if status == 'completed':
                print(f"\n   JOB COMPLETED!")

                result = status_data.get('result', {})

                # Check for real data
                merged = result.get('merged_result', {})
                positive = merged.get('positive', [])
                negative = merged.get('negative', [])

                print(f"\n3. REAL Analysis Results:")
                print("=" * 60)

                if positive:
                    print(f"\n   Positive Categories: {len(positive)}")
                    for cat in positive[:2]:
                        points = cat.get('points', [])
                        print(f"   • {cat.get('category')}: {len(points)} points")
                        for p in points[:1]:
                            print(f"     - {p.get('point')}")

                if negative:
                    print(f"\n   Negative Categories: {len(negative)}")
                    for cat in negative[:2]:
                        points = cat.get('points', [])
                        print(f"   • {cat.get('category')}: {len(points)} points")
                        for p in points[:1]:
                            print(f"     - {p.get('point')}")

                # Check if it's real data
                if positive or negative:
                    print("\n   ✓ VERIFIED: Real sentiment analysis with LLM insights!")
                    return True
                else:
                    print("\n   WARNING: No sentiment data found")
                    return False

            elif status == 'failed':
                error = status_data.get('error', 'Unknown')
                print(f"\n   JOB FAILED: {error}")

                # Also check message for more details
                if message:
                    print(f"   Details: {message}")

                return False

        except Exception as e:
            print(f"\n   Error checking status: {str(e)}")
            return False

        time.sleep(5)

    print("\n   TIMEOUT: Job didn't complete in 10 minutes")
    return False

if __name__ == "__main__":
    print("\nTesting WORKING Sentiment Analysis Endpoint")
    print("Using the original proven endpoint with full pipeline")
    print("-" * 60)

    success = test_working_endpoint()

    print("\n" + "=" * 60)
    if success:
        print("✓ SUCCESS: Real sentiment analysis is WORKING!")
        print("The backend successfully:")
        print("  - Fetched Reddit posts")
        print("  - Processed with NLP pipeline")
        print("  - Analyzed with LLM")
        print("  - Generated categorized insights")
        sys.exit(0)
    else:
        print("✗ FAILED: Check logs for details")
        sys.exit(1)