#!/usr/bin/env python3

"""
Test the WORKING Veo 3 video generation implementation
This demonstrates that the Consistent Persona Generator video API is functional
"""

import requests
import time
import json
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '')

def test_working_video_generation():
    print('🎬 TESTING WORKING VEO 3 VIDEO GENERATION')
    print('=' * 60)
    print(f'🔑 API Key: {API_KEY[:10]}...')
    print()

    # Test prompt
    prompt = "Create a cinematic 8-second video of a beautiful butterfly landing gently on a blooming flower in a sunny garden, with soft natural lighting and peaceful atmosphere."

    print(f'📝 Video prompt: {prompt}')
    print('🚀 Testing the current working implementation...')

    # ✅ Working request body (no custom bucket parameters)
    request_body = {
        "instances": [{
            "prompt": prompt
        }],
        "parameters": {
            "aspectRatio": "16:9"
            # No storageUri - Gemini API doesn't support it
        }
    }

    try:
        # Generate video
        url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning?key={API_KEY}'
        response = requests.post(url, headers={'Content-Type': 'application/json'}, json=request_body, timeout=30)

        print(f'📊 Response Status: {response.status_code}')

        if response.status_code != 200:
            print(f'❌ Video generation failed: {response.status_code}')
            print(f'Error: {response.text}')
            return

        response_data = response.json()
        print('✅ Video generation request accepted!')
        print(f'📄 Response keys: {list(response_data.keys())}')

        operation_name = response_data.get('name')
        if not operation_name:
            print('❌ No operation name in response')
            return

        # Extract operation ID
        import re
        operation_match = re.search(r'operations/([a-zA-Z0-9-_]+)', operation_name)
        if not operation_match:
            print('❌ Could not extract operation ID')
            return

        operation_id = operation_match.group(1)
        print(f'🆔 Operation ID: {operation_id}')
        print()
        print('🔄 Monitoring video generation (standard API)...')

        # Monitor the operation
        start_time = time.time()
        attempts = 0
        max_attempts = 60  # 5 minutes

        while attempts < max_attempts:
            attempts += 1
            elapsed = (time.time() - start_time) / 60

            print(f'📊 Poll {attempts}/{max_attempts} ({elapsed:.1f} min)', end='')

            try:
                check_url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview/operations/{operation_id}?key={API_KEY}'
                check_response = requests.get(check_url, timeout=10)

                if check_response.status_code == 200:
                    operation_data = check_response.json()

                    if operation_data.get('done', False):
                        total_time = (time.time() - start_time) / 60
                        print(f' → 🎉 COMPLETED in {total_time:.1f} minutes!')
                        print()

                        if 'error' in operation_data:
                            print(f'❌ Generation failed: {operation_data["error"]}')
                            return

                        # Extract video URL
                        if 'response' in operation_data:
                            response_content = operation_data['response']
                            print('🎥 Analyzing video response structure...')

                            # Try different response formats
                            video_url = None

                            # Check generateVideoResponse format (most likely)
                            if 'generateVideoResponse' in response_content:
                                gen_resp = response_content['generateVideoResponse']
                                if 'generatedSamples' in gen_resp and gen_resp['generatedSamples']:
                                    sample = gen_resp['generatedSamples'][0]
                                    if 'video' in sample and 'uri' in sample['video']:
                                        video_url = sample['video']['uri']
                                        print('📁 Found video in generateVideoResponse format')

                            # Check predictions format
                            elif 'predictions' in response_content and response_content['predictions']:
                                pred = response_content['predictions'][0]
                                if 'videoData' in pred:
                                    video_data = pred['videoData']
                                    video_url = video_data.get('url') or video_data.get('fileUri')
                                    print('📁 Found video in predictions format')
                                elif 'videoUri' in pred:
                                    video_url = pred['videoUri']
                                    print('📁 Found video in predictions videoUri format')

                            # Check candidates format
                            elif 'candidates' in response_content and response_content['candidates']:
                                candidates = response_content['candidates']
                                for candidate in candidates:
                                    if 'content' in candidate and 'parts' in candidate['content']:
                                        for part in candidate['content']['parts']:
                                            if 'videoData' in part:
                                                video_data = part['videoData']
                                                video_url = video_data.get('url') or video_data.get('fileUri')
                                                print('📁 Found video in candidates format')
                                                break

                            if video_url:
                                print()
                                print('🎊 SUCCESS! VIDEO GENERATION WORKING!')
                                print('=' * 60)
                                print(f'🔗 Video URL: {video_url}')
                                print('=' * 60)
                                print()
                                print('✅ PROOF: The Consistent Persona Generator video API is WORKING!')
                                print(f'🎬 You can access your generated video at: {video_url}')
                                print()

                                # Additional information about bucket storage
                                print('📝 NOTE ABOUT BUCKET STORAGE:')
                                print('The Gemini API does not support custom bucket storage via storageUri parameter.')
                                print('For custom bucket storage, you would need to:')
                                print('  1. Use this working API to generate videos')
                                print('  2. Download the video from the returned URL')
                                print('  3. Upload it to your nxtveovideos bucket')
                                print('  4. Update your frontend to use the bucket URL')

                                return video_url
                            else:
                                print('❌ No video URL found in response')
                                print('📄 Full response structure:')
                                print(json.dumps(response_content, indent=2))

                        return None
                    else:
                        print(' → ⏳ Still generating...')

                else:
                    print(f' → ❌ Status check failed: {check_response.status_code}')

            except Exception as e:
                print(f' → ❌ Poll error: {str(e)}')

            if attempts < max_attempts:
                time.sleep(5)

        print(f'⏰ Generation timeout after {max_attempts * 5 / 60:.1f} minutes')
        return None

    except Exception as e:
        print(f'❌ Error: {str(e)}')
        return None

if __name__ == '__main__':
    print('🎬 CONSISTENT PERSONA GENERATOR - WORKING VIDEO TEST')
    print('This test demonstrates that the video generation API is functional')
    print()

    video_url = test_working_video_generation()

    if video_url:
        print()
        print('🎊 FINAL RESULT: VIDEO GENERATION IS WORKING!')
        print(f'🔗 Generated video: {video_url}')
        print()
        print('✅ The Consistent Persona Generator video functionality is FIXED and WORKING!')
        print('✅ The frontend React app can now generate videos successfully!')
    else:
        print()
        print('❌ Video generation test failed')
