#!/usr/bin/env python3

"""
Direct Python test of Gemini Veo 3 video generation API
Tests the corrected REST API approach to prove video generation works
"""

import requests
import time
import json
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '')

def test_video_generation():
    print('🎬 TESTING GEMINI VEO 3 VIDEO GENERATION...')
    print(f'✅ API Key: {API_KEY[:10]}...')

    # Test prompt for a simple 8-second video
    prompt = "Create a cinematic 8-second video of a peaceful forest scene with gentle wind moving through the trees, golden sunlight filtering through leaves, and a sense of calm tranquility."

    print(f'📝 Prompt: {prompt}')
    print('\n🚀 Sending request to Veo 3 API...')

    # Request body for video generation - corrected format without unsupported resolution parameter
    request_body = {
        "instances": [{
            "prompt": prompt
        }],
        "parameters": {
            "aspectRatio": "16:9"
        }
    }

    try:
        # Make direct REST API call to predictLongRunning endpoint (correct endpoint with correct model name)
        url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning?key={API_KEY}'

        response = requests.post(
            url,
            headers={'Content-Type': 'application/json'},
            json=request_body,
            timeout=30
        )

        print(f'📊 Response status: {response.status_code}')

        if response.status_code == 200:
            response_data = response.json()
            print('✅ SUCCESS! Video generation request accepted')
            print(f'📄 Response: {json.dumps(response_data, indent=2)}')

            # Look for operation name in the predictLongRunning response
            if 'name' in response_data:
                operation_name = response_data['name']
                print(f'🆔 Operation name: {operation_name}')

                # Extract operation ID from the full operation name
                import re
                operation_match = re.search(r'operations/([a-zA-Z0-9-_]+)', operation_name)
                if operation_match:
                    operation_id = operation_match.group(1)
                    print(f'🆔 Operation ID: {operation_id}')
                    print('🔄 Video generation started! Beginning polling...')

                    # Poll for completion
                    video_url = poll_operation(operation_id)
                    if video_url:
                        print(f'\n🎉 VIDEO GENERATION COMPLETED!')
                        print(f'🔗 VIDEO URL: {video_url}')
                        return video_url
                else:
                    print('❌ Could not extract operation ID from operation name')
            else:
                print('❌ No operation name found in response')

        else:
            print(f'❌ Request failed: {response.status_code}')
            print(f'❌ Error: {response.text}')

    except Exception as e:
        print(f'❌ Exception occurred: {str(e)}')
        return None

def poll_operation(operation_id):
    """Poll the operation until completion"""
    max_attempts = 120  # 10 minutes
    attempt = 0

    while attempt < max_attempts:
        attempt += 1
        print(f'🔄 Polling attempt {attempt}/{max_attempts}')

        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/operations/{operation_id}?key={API_KEY}'
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                operation_data = response.json()

                if operation_data.get('done', False):
                    print('🎉 Operation completed!')

                    if 'error' in operation_data:
                        print(f'❌ Video generation failed: {operation_data["error"]}')
                        return None

                    # Extract video URL from the long-running operation response
                    if 'response' in operation_data:
                        response_content = operation_data['response']
                        print('🎥 Video response found:')
                        print(f'📄 Response content: {json.dumps(response_content, indent=2)}')

                        # Look for video data in different possible response structures
                        if 'predictions' in response_content and response_content['predictions']:
                            prediction = response_content['predictions'][0]
                            if 'videoData' in prediction:
                                video_data = prediction['videoData']
                                print('🎥 Video data found in predictions:')
                                print(f'   📁 File URI: {video_data.get("fileUri", "N/A")}')
                                print(f'   🔗 URL: {video_data.get("url", "N/A")}')
                                print(f'   📋 MIME Type: {video_data.get("mimeType", "N/A")}')
                                return video_data.get('url')
                            elif 'videoUri' in prediction:
                                video_uri = prediction.get('videoUri')
                                print(f'🎥 Video URI found: {video_uri}')
                                return video_uri
                        elif 'candidates' in response_content and response_content['candidates']:
                            candidates = response_content['candidates']
                            if candidates:
                                candidate = candidates[0]
                                if 'content' in candidate and 'parts' in candidate['content']:
                                    for part in candidate['content']['parts']:
                                        if 'videoData' in part:
                                            video_data = part['videoData']
                                            print('🎥 Video data found in candidates:')
                                            print(f'   📁 File URI: {video_data.get("fileUri", "N/A")}')
                                            print(f'   🔗 URL: {video_data.get("url", "N/A")}')
                                            print(f'   📋 MIME Type: {video_data.get("mimeType", "N/A")}')
                                            return video_data.get('url')

                    print('❌ No video data found in completed operation')
                    return None
                else:
                    print('⏳ Still generating...')

            else:
                print(f'❌ Polling failed: {response.status_code}')

        except Exception as e:
            print(f'❌ Polling error: {str(e)}')

        time.sleep(5)  # Wait 5 seconds between polls

    print('⏰ Polling timeout reached')
    return None

if __name__ == '__main__':
    video_url = test_video_generation()
    if video_url:
        print(f'\n🎊 SUCCESS! Video generated successfully!')
        print(f'🔗 Final video URL: {video_url}')
    else:
        print('\n❌ Video generation test failed')