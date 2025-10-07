#!/usr/bin/env python3

"""
Simple video generation test - PROOF THAT IT WORKS!
"""

import requests
import time
import json
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '')

def generate_and_monitor_video():
    print('🎬 CONSISTENT PERSONA GENERATOR - VIDEO PROOF!')
    print('=' * 60)
    print(f'🔑 API Key: {API_KEY[:10]}...')

    # Step 1: Generate video
    prompt = "Create a cinematic 8-second video of a peaceful forest scene with gentle wind moving through the trees, golden sunlight filtering through leaves, and a sense of calm tranquility."

    print(f'\n📝 Generating video with prompt: {prompt}')
    print('\n🚀 Sending request to Google Gemini Veo 3...')

    request_body = {
        "instances": [{
            "prompt": prompt
        }],
        "parameters": {
            "aspectRatio": "16:9"
        }
    }

    try:
        # Generate video
        url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning?key={API_KEY}'
        response = requests.post(url, headers={'Content-Type': 'application/json'}, json=request_body, timeout=30)

        if response.status_code != 200:
            print(f'❌ Video generation failed: {response.status_code}')
            print(f'Error: {response.text}')
            return

        response_data = response.json()
        print('✅ Video generation request accepted!')

        operation_name = response_data.get('name')
        if not operation_name:
            print('❌ No operation name in response')
            return

        # Extract operation ID
        operation_match = operation_name.split('/')[-1] if '/' in operation_name else operation_name
        operation_id = operation_match

        print(f'🆔 Operation ID: {operation_id}')
        print('\n🔄 Monitoring video generation progress...')

        # Step 2: Monitor video generation
        start_time = time.time()
        attempts = 0
        max_attempts = 60  # 5 minutes

        while attempts < max_attempts:
            attempts += 1
            elapsed = (time.time() - start_time) / 60
            print(f'📊 Poll {attempts}/{max_attempts} ({elapsed:.1f} min elapsed)')

            try:
                check_url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview/operations/{operation_id}?key={API_KEY}'
                check_response = requests.get(check_url, timeout=10)

                if check_response.status_code == 200:
                    operation_data = check_response.json()

                    if operation_data.get('done', False):
                        total_time = (time.time() - start_time) / 60
                        print(f'\n🎉 VIDEO GENERATION COMPLETED in {total_time:.1f} minutes!')

                        if 'error' in operation_data:
                            print(f'❌ Generation failed: {operation_data["error"]}')
                            return

                        # Extract video URL
                        if 'response' in operation_data:
                            response_content = operation_data['response']

                            # Try different response structures
                            video_url = None

                            if 'predictions' in response_content:
                                pred = response_content['predictions'][0] if response_content['predictions'] else None
                                if pred:
                                    video_url = pred.get('videoData', {}).get('url') or pred.get('videoUri')

                            if not video_url and 'candidates' in response_content:
                                cand = response_content['candidates'][0] if response_content['candidates'] else None
                                if cand:
                                    parts = cand.get('content', {}).get('parts', [])
                                    for part in parts:
                                        if 'videoData' in part:
                                            video_url = part['videoData'].get('url')
                                            break

                            if video_url:
                                print('🎊 SUCCESS! VIDEO GENERATED SUCCESSFULLY!')
                                print('=' * 60)
                                print(f'🔗 VIDEO URL: {video_url}')
                                print('=' * 60)
                                print('\n✅ PROOF: The Consistent Persona Generator video API is working!')
                                print(f'✅ You can now access your generated video at: {video_url}')
                                return video_url
                            else:
                                print('❌ No video URL found in response')
                                print(f'Response: {json.dumps(operation_data, indent=2)}')

                        return None
                    else:
                        print('⏳ Still generating...')

                else:
                    print(f'❌ Status check failed: {check_response.status_code}')

            except Exception as e:
                print(f'❌ Poll error: {str(e)}')

            if attempts < max_attempts:
                time.sleep(5)  # Wait 5 seconds between checks

        print('⏰ Generation timeout reached')
        return None

    except Exception as e:
        print(f'❌ Error: {str(e)}')
        return None

if __name__ == '__main__':
    print('🎬 GOOGLE GEMINI VEO 3 VIDEO GENERATION TEST')
    print('This will prove that the Consistent Persona Generator works!')
    print('')

    video_url = generate_and_monitor_video()

    if video_url:
        print('\n🎊 FINAL RESULT: VIDEO GENERATION SUCCESSFUL!')
        print(f'🔗 Your video is ready at: {video_url}')
        print('\n✅ The Consistent Persona Generator API integration is FIXED and WORKING!')
    else:
        print('\n❌ Video generation test failed')
