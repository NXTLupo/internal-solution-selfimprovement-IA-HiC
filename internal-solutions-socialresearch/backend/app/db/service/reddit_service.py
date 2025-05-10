from app.db.config.database import get_db
from app.repositories.reddit_repository import RedditRepository
from sqlalchemy import func
from app.db.models.reddit_models import RedditPost, RedditComment


def get_subreddit_statistics(subreddit):
    """
    Get statistics about posts and comments for a specific subreddit
    
    Args:
        subreddit (str): The subreddit name
        
    Returns:
        dict: Dictionary containing total_posts and total_comments
    """
    # Convert subreddit to lowercase to ensure case-insensitive matching
    subreddit = subreddit.lower() if subreddit else ""
    
    db = next(get_db())
    
    # Count total posts for the subreddit
    total_posts = db.query(func.count(RedditPost.id)).filter(
        func.lower(RedditPost.subreddit) == subreddit
    ).scalar() or 0
    
    # Count total comments for posts in the subreddit
    total_comments = db.query(func.count(RedditComment.id)).join(
        RedditPost, RedditComment.post_id == RedditPost.id
    ).filter(
        func.lower(RedditPost.subreddit) == subreddit
    ).scalar() or 0
    
    return {
        "total_posts": total_posts,
        "total_comments": total_comments
    }