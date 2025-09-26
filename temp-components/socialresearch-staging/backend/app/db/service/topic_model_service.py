"""
Topic model database service module.

This module contains database operations related to topic modeling,
moved from api_topic_model.py to improve separation of concerns.
"""

import uuid
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from app.db.config.database import SessionLocal
from app.repositories.reddit_repository import RedditRepository


def save_posts_to_database(subreddit: str, new_posts_from_api: List[Dict]) -> str:
    """
    Saves Reddit posts to the database with a new search ID.
    
    Args:
        subreddit (str): The subreddit name these posts belong to
        new_posts_from_api (list): List of Reddit posts to save
        
    Returns:
        str: The generated search ID used to save the posts
    """
    cache_search_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        repo.save_search(
            search_id=cache_search_id,
            subreddit=subreddit,
            query=None,
            parameters={'type': 'cache', 'timestamp': datetime.utcnow().isoformat()}
        )
        
        if new_posts_from_api:
            print(f"[topic_model_service.py] Saving {len(new_posts_from_api)} posts to database with search ID: {cache_search_id}")
            for post in new_posts_from_api:
                if 'comments' in post and post['comments']:
                    _ensure_comment_ids(post['comments'])
            
            repo.save_posts(cache_search_id, new_posts_from_api)
    finally:
        db.close()
    
    return cache_search_id


def _ensure_comment_ids(comments: List[Dict]) -> None:
    """Recursively ensure all comments and replies have IDs."""
    for comment in comments:
        if 'id' not in comment:
            comment['id'] = f"c_{str(uuid.uuid4())}"
        
        if 'replies' in comment and comment['replies']:
            _ensure_comment_ids(comment['replies'])


def _parse_date_to_timestamp(date_str: Optional[str], end_of_day: bool = False) -> Optional[float]:
    """
    Converts a date string in 'YYYY-MM-DD' format to a Unix timestamp.
    If end_of_day is True, sets the time to 23:59:59.
    Returns None if date_str is None or invalid.
    """
    if not date_str:
        return None
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        if end_of_day:
            date_obj = date_obj.replace(hour=23, minute=59, second=59)
        return date_obj.timestamp()
    except ValueError as e:
        print(f"[topic_model_service.py] Invalid date format for '{date_str}': {e}")
        return None


def retrieve_posts_from_database(subreddit: str, log_dir: str, 
                                startDate: Optional[str] = None, 
                                endDate: Optional[str] = None) -> Tuple[List[Dict], set]:
    """
    Retrieves all posts for a subreddit from the database.
    
    Args:
        subreddit (str): The subreddit name to retrieve posts for
        log_dir (str): Directory to save logs
        startDate (str): Optional start date in format "YYYY-MM-DD"
        endDate (str): Optional end date in format "YYYY-MM-DD"
        
    Returns:
        tuple: (raw_reddit_data, existing_post_ids)
    """
    # Convert date strings to Unix timestamps if provided
    start_timestamp = _parse_date_to_timestamp(startDate)
    end_timestamp = _parse_date_to_timestamp(endDate, end_of_day=True)
    
    db = SessionLocal()
    try:
        repo = RedditRepository(db)
        # Get all searches for this subreddit
        searches = repo.get_searches_by_subreddit(subreddit)
        
        # Collect all post IDs from these searches
        existing_post_ids = set()
        raw_reddit_data = []
        
        for search in searches:
            posts = repo.get_posts_by_search_id(search.id)
            for post in posts:
                # Apply date filtering if timestamps are provided
                post_timestamp = post.created_utc if post.created_utc else 0
                
                # Skip posts outside the date range
                if start_timestamp and post_timestamp < start_timestamp:
                    continue
                if end_timestamp and post_timestamp > end_timestamp:
                    continue
                
                if post.id not in existing_post_ids:
                    existing_post_ids.add(post.id)
                    
                    # Convert post to dictionary format
                    post_data = {
                        'id': post.id,
                        'title': post.title,
                        'content': post.content,
                        'score': post.score,
                        'created_utc': post.created_utc,
                        'url': post.url,
                        'permalink': post.permalink,
                        'num_comments': post.num_comments,
                        'author': post.author,
                        'comments': []
                    }
                    
                    # Add comments - make sure they exist and are loaded
                    if hasattr(post, 'comments') and post.comments:
                        for comment in post.comments:
                            comment_data = {
                                'id': comment.id,
                                'body': comment.body,
                                'score': comment.score,
                                'created_utc': comment.created_utc,
                                'author': comment.author
                            }
                            post_data['comments'].append(comment_data)
                    
                    raw_reddit_data.append(post_data)
        
        # Log the number of posts and comments retrieved
        total_comments = sum(len(post.get('comments', [])) for post in raw_reddit_data)
        print(f"[topic_model_service.py] Retrieved {len(raw_reddit_data)} posts with {total_comments} comments from database")
        
        with open(os.path.join(log_dir, '1_cached_data.log'), 'w', encoding='utf-8') as f:
            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            f.write(f"Found cached data for subreddit: {subreddit}\n")
            f.write(f"Total posts in database: {len(existing_post_ids)}\n")
            f.write(f"Total comments retrieved: {total_comments}\n")
            if start_timestamp or end_timestamp:
                f.write(f"Date filtering applied: {startDate or 'none'} to {endDate or 'none'}\n")

    finally:
        db.close()
    
    return raw_reddit_data, existing_post_ids


def log_data_collection_complete(log_dir: str, subreddit: str, new_posts_from_api: List[Dict], 
                                raw_reddit_data: List[Dict], startDate: Optional[str] = None, 
                                endDate: Optional[str] = None) -> None:
    """
    Logs information about completed data collection.
    
    Args:
        log_dir (str): Directory to save logs
        subreddit (str): The subreddit name
        new_posts_from_api (list): List of newly fetched posts
        raw_reddit_data (list): List of all posts from database
        startDate (str): Optional start date filter that was applied
        endDate (str): Optional end date filter that was applied
    """
    with open(os.path.join(log_dir, '2_data_collection_complete.log'), 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now().isoformat()}\n")
        f.write(f"Completed data collection for subreddit: {subreddit}\n")
        f.write(f"Fresh posts fetched: {len(new_posts_from_api)}\n")
        f.write(f"Total posts in database: {len(raw_reddit_data)}\n")
        f.write(f"Posts that will be analyzed: {len(raw_reddit_data)}\n")
        if startDate or endDate:
            f.write(f"Date range filter: {startDate or 'none'} to {endDate or 'none'}\n")
        f.write("\n")


def log_post_samples(log_dir: str, post_data: List[Dict], documents: List[str]) -> None:
    """
    Logs sample post data and documents.
    
    Args:
        log_dir (str): Directory to save logs
        post_data (list): List of processed post data
        documents (list): List of document texts
    """    
    import json
    
    # Save full documents data
    with open(os.path.join(log_dir, '2_1_full_documents.json'), 'w', encoding='utf-8') as f:
        json.dump({
            'documents_count': len(documents),
            'sample_documents': documents[:20]  # Only save a few samples to keep file size reasonable
        }, f, indent=2)
    
    # Create a dictionary with post_id as key and document text as value
    # This is the format needed for the main function
    data_topic_model = {}
    for i, post in enumerate(post_data):
        if i < len(documents):
            data_topic_model[post['id']] = documents[i]
    
    # Save the data in the format needed for the main function
    with open(os.path.join(log_dir, 'data_topic_model.json'), 'w', encoding='utf-8') as f:
        json.dump(data_topic_model, f, indent=2)
        
    # Also save full post data for reference
    with open(os.path.join(log_dir, 'full_post_data.json'), 'w', encoding='utf-8') as f:
        json.dump(post_data, f, indent=2) 