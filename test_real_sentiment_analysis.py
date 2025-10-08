#!/usr/bin/env python3
"""
Test script to verify REAL sentiment analysis is working
"""
import requests
import json
import time
import sys
import os

# Force UTF-8 encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Backend URL
BASE_URL = "http://localhost:8081"

def test_real_sentiment_analysis():
    """Test the real sentiment analysis endpoint"""

    print("=" * 60)
    print("TESTING REAL SENTIMENT ANALYSIS")
    print("=" * 60)

    # First, create a search to get a search_id
    # Use the /api/llm-analyzer/search endpoint which exists
    search_data = {
        "subreddit": "technology",
        "query": "ChatGPT",
        "limit": 3,  # Small limit for testing
        "sort": "relevance",
        "time": "month",
        "user_id": "liheng",  # Use the default user that was created during init
        "project_name": "Real Sentiment Test"
    }

    print("\n1. Creating Reddit search...")
    print(f"   Subreddit: {search_data['subreddit']}")
    print(f"   Query: {search_data['query']}")
    print(f"   Limit: {search_data['limit']}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/llm-analyzer/search",
            json=search_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            print(f"   ❌ Search failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        search_result = response.json()
        search_id = search_result.get('search_id')
        project_id = search_result.get('project_id')

        print(f"   ✅ Search created successfully!")
        print(f"   Search ID: {search_id}")
        print(f"   Project ID: {project_id}")

    except Exception as e:
        print(f"   ❌ Error creating search: {str(e)}")
        return False

    # Now start sentiment analysis
    analysis_data = {
        "application_name": "ChatGPT",
        "filter_type": "cluster",
        "keyword": "ChatGPT",
        "merge_method": "deepseek-r1",
        "chunk_size": 40000,
        "analysis_model": "deepseek-r1",
        "max_workers": 2,
        "skip_filtering": True,  # Skip filtering for faster test
        "user_id": "liheng",  # Use the default user
        "project_id": project_id if project_id else "test_" + search_id  # Use search_id as project_id if none returned
    }

    print("\n2. Starting REAL sentiment analysis...")
    print(f"   Application: {analysis_data['application_name']}")
    print(f"   Skip filtering: {analysis_data['skip_filtering']}")
    print(f"   Analysis model: {analysis_data['analysis_model']}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/llm-analyzer/analyze-sentiment/{search_id}",
            json=analysis_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            print(f"   ❌ Analysis start failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        job_result = response.json()
        job_id = job_result.get('job_id')

        print(f"   ✅ Analysis job started!")
        print(f"   Job ID: {job_id}")

    except Exception as e:
        print(f"   ❌ Error starting analysis: {str(e)}")
        return False

    # Poll for job completion
    print("\n3. Monitoring job progress...")
    max_attempts = 60  # 5 minutes max
    attempt = 0

    while attempt < max_attempts:
        try:
            response = requests.get(
                f"{BASE_URL}/api/llm-analyzer/job-status/{job_id}",
                headers={"Content-Type": "application/json"}
            )

            if response.status_code != 200:
                print(f"   ❌ Status check failed: {response.status_code}")
                return False

            status_data = response.json()
            status = status_data.get('status')
            message = status_data.get('message', '')
            progress = status_data.get('progress', 0)

            print(f"   [{attempt+1}/{max_attempts}] Status: {status} | Progress: {progress}% | {message}")

            if status == 'completed':
                print("\n   ✅ Job completed successfully!")

                # Get the result
                result = status_data.get('result', {})

                print("\n4. Analysis Results:")
                print("=" * 60)

                # Check for REAL data structures
                merged_result = result.get('merged_result', {})
                formatted_data = result.get('formatted_data', {})

                # Verify this is REAL data, not mock
                positive = merged_result.get('positive', [])
                negative = merged_result.get('negative', [])

                print(f"\n   Positive Categories: {len(positive)}")
                for cat in positive[:3]:  # Show first 3
                    points = cat.get('points', [])
                    print(f"     - {cat.get('category')}: {len(points)} points")
                    for point in points[:2]:  # Show first 2 points
                        print(f"       • {point.get('point')}")
                        post_ids = point.get('post_ids', [])
                        if post_ids:
                            print(f"         Referenced in: {', '.join(post_ids[:3])}")

                print(f"\n   Negative Categories: {len(negative)}")
                for cat in negative[:3]:  # Show first 3
                    points = cat.get('points', [])
                    print(f"     - {cat.get('category')}: {len(points)} points")
                    for point in points[:2]:  # Show first 2 points
                        print(f"       • {point.get('point')}")
                        post_ids = point.get('post_ids', [])
                        if post_ids:
                            print(f"         Referenced in: {', '.join(post_ids[:3])}")

                # Check for real Reddit data
                if formatted_data:
                    posts = formatted_data.get('results', [])
                    print(f"\n   Reddit Posts Analyzed: {len(posts)}")
                    if posts:
                        print("   Sample post IDs:")
                        for post in posts[:3]:
                            print(f"     - {post.get('id')}: {post.get('title', 'No title')[:50]}...")

                # Check for summary
                summary = result.get('summary')
                if summary:
                    print(f"\n   AI Summary: {summary[:200]}...")

                # Verify this is NOT mock data
                is_mock = False
                if positive and positive[0].get('category') == 'Performance':
                    points = positive[0].get('points', [])
                    if points and points[0].get('point') == 'Fast and responsive':
                        post_ids = points[0].get('post_ids', [])
                        if 'mock_id_1' in post_ids:
                            is_mock = True

                if is_mock:
                    print("\n   ⚠️ WARNING: This appears to be MOCK DATA!")
                    print("   The implementation needs to be fixed to use REAL analysis.")
                    return False
                else:
                    print("\n   ✅ VERIFIED: This is REAL sentiment analysis!")
                    print("   The data contains actual Reddit posts and LLM-generated insights.")
                    return True

            elif status == 'failed':
                error = status_data.get('error', 'Unknown error')
                print(f"\n   ❌ Job failed: {error}")
                return False

        except Exception as e:
            print(f"   ❌ Error checking status: {str(e)}")
            return False

        time.sleep(5)  # Wait 5 seconds between checks
        attempt += 1

    print(f"\n   ⏱️ Timeout: Job did not complete within {max_attempts * 5} seconds")
    return False

if __name__ == "__main__":
    print("\nTesting REAL Sentiment Analysis Implementation")
    print("This will perform actual Reddit search and LLM analysis")
    print("-" * 60)

    success = test_real_sentiment_analysis()

    print("\n" + "=" * 60)
    if success:
        print("✅ TEST PASSED: Real sentiment analysis is working!")
        print("The backend is performing actual Reddit searches and LLM analysis.")
        sys.exit(0)
    else:
        print("❌ TEST FAILED: Check the implementation and logs.")
        sys.exit(1)