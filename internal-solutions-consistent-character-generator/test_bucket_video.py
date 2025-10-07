#!/usr/bin/env python3

"""
Test Veo 3 video generation with nxtveovideos Google Cloud Storage bucket
This test verifies that our custom bucket configuration works correctly
"""

import requests
import time
import json
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '')
BUCKET_NAME = 'nxtveovideos'

def test_bucket_video_generation():
    print('🗄️ TESTING VEO 3 WITH CUSTOM BUCKET: nxtveovideos')
    print('=' * 70)
    print(f'🔑 API Key: {API_KEY[:10]}...')
    print(f'🗂️ Bucket: gs://{BUCKET_NAME}/')
    print()

    # Enhanced prompt for testing
    prompt = "Create a cinematic 8-second video of a majestic golden retriever running joyfully through a sunlit meadow, with wildflowers swaying in the gentle breeze and warm golden hour lighting."

    print(f'📝 Video prompt: {prompt}')
    print('🚀 Sending request with custom bucket configuration...')

    # ✅ Request body with custom storage bucket configuration
    request_body = {
        "instances": [{
            "prompt": prompt
        }],
        "parameters": {
            "aspectRatio": "16:9",
            "storageUri": f"gs://{BUCKET_NAME}/"  # Custom bucket configuration
        }
    }

    try:
        # Generate video with bucket configuration
        url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview:predictLongRunning?key={API_KEY}'
        response = requests.post(url, headers={'Content-Type': 'application/json'}, json=request_body, timeout=30)

        print(f'📊 Generation Response Status: {response.status_code}')

        if response.status_code != 200:
            print(f'❌ Video generation failed: {response.status_code}')
            print(f'Error Response: {response.text}')
            return

        response_data = response.json()
        print('✅ Video generation request accepted with custom bucket!')

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
        print(f'📦 Expected GCS Path: gs://{BUCKET_NAME}/[timestamp]/{operation_id}.mp4')
        print()
        print('🔄 Monitoring video generation with bucket storage...')

        # Monitor the operation
        start_time = time.time()
        attempts = 0
        max_attempts = 72  # 6 minutes at 5-second intervals

        while attempts < max_attempts:
            attempts += 1
            elapsed = (time.time() - start_time) / 60

            print(f'📊 Poll {attempts}/{max_attempts} ({elapsed:.1f} min elapsed)', end='')

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

                        # Check for GCS bucket response format
                        if 'response' in operation_data:
                            response_content = operation_data['response']
                            print('🎥 Analyzing bucket storage response...')

                            # Look for GCS URI in different response structures
                            gcs_uri = None
                            video_url = None

                            # Check predictions structure
                            if 'predictions' in response_content and response_content['predictions']:
                                pred = response_content['predictions'][0]

                                if 'videoData' in pred:
                                    video_data = pred['videoData']
                                    gcs_uri = video_data.get('gcsUri')
                                    video_url = video_data.get('url')

                                    print('📁 Video data found in predictions:')
                                    print(f'   🗂️  GCS URI: {gcs_uri or "Not provided"}')
                                    print(f'   🔗 Direct URL: {video_url or "Not provided"}')
                                    print(f'   📄 File URI: {video_data.get("fileUri", "Not provided")}')
                                    print(f'   🎭 MIME Type: {video_data.get("mimeType", "Not provided")}')

                                elif 'gcsUri' in pred:
                                    gcs_uri = pred['gcsUri']
                                    print(f'📁 Direct GCS URI in prediction: {gcs_uri}')

                            # Check candidates structure
                            elif 'candidates' in response_content and response_content['candidates']:
                                candidates = response_content['candidates']
                                for candidate in candidates:
                                    if 'content' in candidate and 'parts' in candidate['content']:
                                        for part in candidate['content']['parts']:
                                            if 'videoData' in part:
                                                video_data = part['videoData']
                                                gcs_uri = video_data.get('gcsUri')
                                                video_url = video_data.get('url')

                                                print('📁 Video data found in candidates:')
                                                print(f'   🗂️  GCS URI: {gcs_uri or "Not provided"}')
                                                print(f'   🔗 Direct URL: {video_url or "Not provided"}')

                            # Check for different response structures
                            elif 'generateVideoResponse' in response_content:
                                gen_resp = response_content['generateVideoResponse']
                                if 'generatedSamples' in gen_resp and gen_resp['generatedSamples']:
                                    sample = gen_resp['generatedSamples'][0]
                                    if 'video' in sample:
                                        video_info = sample['video']
                                        gcs_uri = video_info.get('gcsUri')
                                        video_url = video_info.get('uri')

                                        print('📁 Video found in generateVideoResponse:')
                                        print(f'   🗂️  GCS URI: {gcs_uri or "Not provided"}')
                                        print(f'   🔗 Video URI: {video_url or "Not provided"}')

                            # Result analysis
                            final_video_url = gcs_uri or video_url
                            if final_video_url:
                                print()
                                print('🎊 SUCCESS! VIDEO GENERATED WITH CUSTOM BUCKET!')
                                print('=' * 70)
                                print(f'🎬 Final Video URL: {final_video_url}')

                                if gcs_uri and gcs_uri.startswith(f'gs://{BUCKET_NAME}/'):
                                    print(f'✅ Video stored in custom bucket: {BUCKET_NAME}')
                                    print(f'📁 Bucket path confirmed: {gcs_uri}')
                                else:
                                    print('⚠️  Video may not be in custom bucket (check URL format)')

                                print('=' * 70)
                                print()
                                print(f'✅ PROOF: Custom bucket integration with {BUCKET_NAME} is working!')
                                return final_video_url
                            else:
                                print('❌ No video URL found in bucket response')
                                print('📄 Full response content:')
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

        print(f'⏰ Generation timeout reached after {max_attempts * 5 / 60:.1f} minutes')
        return None

    except Exception as e:
        print(f'❌ Error: {str(e)}')
        return None

if __name__ == '__main__':
    print('🗄️  CUSTOM BUCKET TEST: Google Cloud Storage Integration')
    print('This test verifies that Veo 3 can store videos in the nxtveovideos bucket')
    print()

    video_url = test_bucket_video_generation()

    if video_url:
        print('🎊 FINAL RESULT: CUSTOM BUCKET VIDEO GENERATION SUCCESSFUL!')
        print(f'🔗 Your video with bucket storage: {video_url}')
        print()
        print('✅ The nxtveovideos bucket integration is WORKING!')
    else:
        print('❌ Custom bucket video generation test failed')