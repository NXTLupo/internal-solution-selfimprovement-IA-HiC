# endpoint file for reddit
from flask import Blueprint, jsonify, request
from app.db.service.reddit_service import get_all_subreddit_statistics, get_subreddit_detail
from datetime import datetime
from flask_cors import CORS
reddit_bp = Blueprint('reddit', __name__)
CORS(reddit_bp)

@reddit_bp.route('/subreddits', methods=['GET'])
def get_subreddits():
    """
    Get all subreddits from the database with their post and comment counts.
    Returns a list of subreddits with statistics.
    """
    try:
        subreddits = get_all_subreddit_statistics()
        
        # Format the response to match the frontend interface
        formatted_subreddits = []
        for subreddit_data in subreddits:
            formatted_subreddits.append({
                'id': str(hash(subreddit_data['subreddit'])),  # Generate a simple ID
                'name': subreddit_data['subreddit'],
                'postCount': subreddit_data['total_posts'],
                'commentCount': subreddit_data['total_comments'],
                'createdAt': subreddit_data['created_at'].isoformat() if subreddit_data['created_at'] else datetime.utcnow().isoformat(),
                'updatedAt': subreddit_data['updated_at'].isoformat() if subreddit_data['updated_at'] else datetime.utcnow().isoformat()
            })
        
        return jsonify(formatted_subreddits), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch subreddits',
            'message': str(e)
        }), 500


@reddit_bp.route('/subreddit/<string:subreddit_name>', methods=['GET'])
def get_subreddit_details(subreddit_name):
    """
    Get detailed information about a specific subreddit including all posts and comments.
    
    Args:
        subreddit_name (str): The name of the subreddit to retrieve
        
    Returns:
        JSON response containing subreddit details, posts, and hierarchical comments
    """
    try:
        # Validate subreddit name
        if not subreddit_name or not subreddit_name.strip():
            return jsonify({
                'error': 'Invalid subreddit name',
                'message': 'Subreddit name cannot be empty'
            }), 400
        
        # Clean the subreddit name (remove any r/ prefix if present)
        clean_subreddit_name = subreddit_name.lower().strip()
        if clean_subreddit_name.startswith('r/'):
            clean_subreddit_name = clean_subreddit_name[2:]
        
        # Get all subreddit details
        subreddit_detail = get_subreddit_detail(clean_subreddit_name)
        
        # Check if subreddit exists (has any posts)
        if subreddit_detail['totalPosts'] == 0:
            return jsonify({
                'error': 'Subreddit not found',
                'message': f'No data found for subreddit: r/{clean_subreddit_name}'
            }), 404
        
        return jsonify(subreddit_detail), 200
    
    except Exception as e:
        print(f"Error in get_subreddit_details: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch subreddit details',
            'message': str(e)
        }), 500