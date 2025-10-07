#!/usr/bin/env python3

"""
Monitor the existing video generation operation
"""

import requests
import time
import json
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '')
OPERATION_ID = 'bif4or1661qx'  # From the curl test

def monitor_operation():
    print('🔄 MONITORING VIDEO GENERATION...')
    print(f'🆔 Operation ID: {OPERATION_ID}')

    max_attempts = 60  # 5 minutes
    attempt = 0

    while attempt < max_attempts:
        attempt += 1
        elapsed_minutes = (attempt * 5) / 60
        print(f'🔄 Poll {attempt}/{max_attempts} ({elapsed_minutes:.1f} min)')

        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-preview/operations/{OPERATION_ID}?key={API_KEY}'
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                operation_data = response.json()
                print(f'📊 Response: {json.dumps(operation_data, indent=2)}')

                if operation_data.get('done', False):
                    print('🎉 Operation completed!')

                    if 'error' in operation_data:
                        print(f'❌ Video generation failed: {operation_data["error"]}')
                        return None

                    # Extract video URL
                    if 'response' in operation_data:
                        response_content = operation_data['response']
                        print('🎥 Video response found!')

                        # Look for video data in different possible response structures
                        if 'predictions' in response_content and response_content['predictions']:
                            prediction = response_content['predictions'][0]
                            if 'videoData' in prediction:
                                video_data = prediction['videoData']
                                video_url = video_data.get('url')
                                print(f'🎥 VIDEO URL: {video_url}')
                                return video_url
                            elif 'videoUri' in prediction:
                                video_uri = prediction.get('videoUri')
                                print(f'🎥 VIDEO URI: {video_uri}')
                                return video_uri

                    print('❌ No video data found in completed operation')
                    return None
                else:
                    print('⏳ Still generating...')

            else:
                print(f'❌ Polling failed: {response.status_code}')
                print(f'❌ Error: {response.text}')

        except Exception as e:
            print(f'❌ Polling error: {str(e)}')

        time.sleep(5)  # Wait 5 seconds between polls

    print('⏰ Polling timeout reached')
    return None

if __name__ == '__main__':
    video_url = monitor_operation()
    if video_url:
        print(f'\n🎊 SUCCESS! Video generated successfully!')
        print(f'🔗 Final video URL: {video_url}')
        print('\nYOU CAN NOW ACCESS THE VIDEO AT THIS URL!')
    else:
        print('\n❌ Video generation monitoring failed')