from app.db.config.database import get_db
from app.repositories.reddit_repository import RedditRepository
from sqlalchemy import func, desc, distinct
from app.db.models.reddit_models import RedditPost, RedditComment, RedditAnalysisResult
from datetime import datetime
from typing import Dict, List, Any


def get_subreddit_statistics(subreddit):
    """
    Get statistics about posts and comments for a specific subreddit by counting from the actual posts and comments tables.
    Args:
        subreddit (str): The subreddit name
    Returns:
        dict: Dictionary containing post_count and total_comments
    """
    subreddit = subreddit.lower() if subreddit else ""
    db = next(get_db())
    
    try:
        # Count posts directly from reddit_posts table
        total_posts = db.query(func.count(RedditPost.id)).filter(
            func.lower(RedditPost.subreddit) == subreddit
        ).scalar() or 0
        
        # Count comments by joining posts and comments tables
        total_comments = db.query(func.count(RedditComment.id)).join(
            RedditPost, RedditComment.post_id == RedditPost.id
        ).filter(
            func.lower(RedditPost.subreddit) == subreddit
        ).scalar() or 0
        
        return {
            "total_posts": int(total_posts),
            "total_comments": int(total_comments)
        }
        
    except Exception as e:
        print(f"Error getting subreddit statistics for {subreddit}: {e}")
        return {
            "total_posts": 0,
            "total_comments": 0
        }
    finally:
        db.close()


def get_subreddit_detail(subreddit_name: str) -> Dict[str, Any]:
    """
    Get detailed information about a subreddit including all posts and comments.
    Args:
        subreddit_name (str): The subreddit name
    Returns:
        dict: Dictionary containing subreddit details, posts, and comments
    """
    db = next(get_db())
    
    try:
        # Use the repository for optimized database access
        repository = RedditRepository(db)
        return repository.get_subreddit_with_posts_and_comments(subreddit_name)
        
    except Exception as e:
        print(f"Error getting subreddit detail for {subreddit_name}: {e}")
        raise e
    finally:
        db.close()


def get_all_subreddit_statistics():
    """
    Get statistics for all subreddits by counting posts directly from the reddit_posts table.
    Returns a list of dictionaries containing subreddit name, post count, and comment count.
    """
    db = next(get_db())
    
    try:
        # Get all unique subreddits and their post counts from reddit_posts table
        subreddits_query = db.query(
            RedditPost.subreddit,
            func.count(RedditPost.id).label('total_posts'),
            func.min(RedditPost.created_utc).label('earliest_post'),
            func.max(RedditPost.created_utc).label('latest_post')
        ).filter(
            RedditPost.subreddit.isnot(None)
        ).group_by(
            RedditPost.subreddit
        ).all()
        
        # Format results and get comment counts
        results = []
        for subreddit_row in subreddits_query:
            subreddit_name = subreddit_row.subreddit
            
            # Get total comments for this subreddit by counting from posts and comments tables
            total_comments = db.query(func.count(RedditComment.id)).join(
                RedditPost, RedditComment.post_id == RedditPost.id
            ).filter(
                func.lower(RedditPost.subreddit) == func.lower(subreddit_name)
            ).scalar() or 0
            
            # Convert timestamps to datetime objects if they exist
            created_at = None
            updated_at = None
            if subreddit_row.earliest_post:
                created_at = datetime.fromtimestamp(subreddit_row.earliest_post)
            if subreddit_row.latest_post:
                updated_at = datetime.fromtimestamp(subreddit_row.latest_post)
            
            results.append({
                'subreddit': subreddit_name,
                'total_posts': int(subreddit_row.total_posts),
                'total_comments': int(total_comments),
                'created_at': created_at,
                'updated_at': updated_at
            })
        
        # Sort by total posts descending
        results.sort(key=lambda x: x['total_posts'], reverse=True)
        
        return results
        
    except Exception as e:
        print(f"Error getting subreddit statistics: {e}")
        return []
    finally:
        db.close()