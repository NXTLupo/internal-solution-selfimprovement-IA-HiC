"""
Reddit API proxy endpoints to handle CORS issues.
Provides backend endpoints to fetch Reddit data that the frontend cannot access directly.
"""

import requests
import logging
from flask import Blueprint, jsonify, request
from flask_cors import CORS

logger = logging.getLogger(__name__)

reddit_proxy_bp = Blueprint('reddit_proxy', __name__)
CORS(reddit_proxy_bp)

@reddit_proxy_bp.route('/subreddit/<subreddit>/icon', methods=['GET'])
def get_subreddit_icon(subreddit):
    """
    Fetch subreddit icon/logo from Reddit API.

    Args:
        subreddit: The name of the subreddit

    Returns:
        JSON with icon URL or error
    """
    try:
        # Clean the subreddit name
        clean_subreddit = subreddit.replace('r/', '').strip()

        if not clean_subreddit:
            return jsonify({"error": "Invalid subreddit name"}), 400

        # Fetch from Reddit API with proper headers
        headers = {
            'User-Agent': 'NXT-Humans-Social-Research/1.0'
        }

        response = requests.get(
            f'https://www.reddit.com/r/{clean_subreddit}/about.json',
            headers=headers,
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()

            # Try to get the community icon first
            icon_url = None
            if data.get('data'):
                # Try community_icon first
                if data['data'].get('community_icon'):
                    icon_url = data['data']['community_icon'].split('?')[0]
                # Fall back to icon_img
                elif data['data'].get('icon_img'):
                    icon_url = data['data']['icon_img'].split('?')[0]
                # Fall back to header_img
                elif data['data'].get('header_img'):
                    icon_url = data['data']['header_img'].split('?')[0]

            if icon_url:
                return jsonify({"icon_url": icon_url, "subreddit": clean_subreddit}), 200
            else:
                return jsonify({"icon_url": None, "subreddit": clean_subreddit}), 200

        elif response.status_code == 404:
            return jsonify({"error": "Subreddit not found", "subreddit": clean_subreddit}), 404
        else:
            return jsonify({"error": f"Reddit API error: {response.status_code}"}), response.status_code

    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching icon for r/{subreddit}")
        return jsonify({"error": "Request timeout"}), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching icon for r/{subreddit}: {e}")
        return jsonify({"error": "Failed to fetch subreddit icon"}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching icon for r/{subreddit}: {e}")
        return jsonify({"error": "Internal server error"}), 500

@reddit_proxy_bp.route('/subreddit/<subreddit>/about', methods=['GET'])
def get_subreddit_info(subreddit):
    """
    Fetch full subreddit information from Reddit API.

    Args:
        subreddit: The name of the subreddit

    Returns:
        JSON with subreddit data or error
    """
    try:
        # Clean the subreddit name
        clean_subreddit = subreddit.replace('r/', '').strip()

        if not clean_subreddit:
            return jsonify({"error": "Invalid subreddit name"}), 400

        # Fetch from Reddit API with proper headers
        headers = {
            'User-Agent': 'NXT-Humans-Social-Research/1.0'
        }

        response = requests.get(
            f'https://www.reddit.com/r/{clean_subreddit}/about.json',
            headers=headers,
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()

            # Extract relevant information
            if data.get('data'):
                subreddit_info = {
                    'name': data['data'].get('display_name'),
                    'title': data['data'].get('title'),
                    'description': data['data'].get('public_description'),
                    'subscribers': data['data'].get('subscribers'),
                    'icon_url': data['data'].get('community_icon') or data['data'].get('icon_img'),
                    'header_img': data['data'].get('header_img'),
                    'created_utc': data['data'].get('created_utc'),
                    'over18': data['data'].get('over18', False)
                }

                # Clean up icon URLs
                if subreddit_info['icon_url']:
                    subreddit_info['icon_url'] = subreddit_info['icon_url'].split('?')[0]
                if subreddit_info['header_img']:
                    subreddit_info['header_img'] = subreddit_info['header_img'].split('?')[0]

                return jsonify(subreddit_info), 200
            else:
                return jsonify({"error": "Invalid response from Reddit"}), 502

        elif response.status_code == 404:
            return jsonify({"error": "Subreddit not found"}), 404
        else:
            return jsonify({"error": f"Reddit API error: {response.status_code}"}), response.status_code

    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching info for r/{subreddit}")
        return jsonify({"error": "Request timeout"}), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching info for r/{subreddit}: {e}")
        return jsonify({"error": "Failed to fetch subreddit info"}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching info for r/{subreddit}: {e}")
        return jsonify({"error": "Internal server error"}), 500